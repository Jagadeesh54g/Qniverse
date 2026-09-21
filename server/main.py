"""Qniverse runner service:  POST /run {backend, code} -> {ok, circuit | error}.
   uvicorn main:app --port 8000
Env: ALLOWED_ORIGINS (comma separated, default "*"), MAX_PARALLEL (default 4)."""
import asyncio
import json
import os
import subprocess
import sys
import tempfile

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

HERE = os.path.dirname(os.path.abspath(__file__))
app = FastAPI(title="Qniverse runner")
origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["POST", "GET"], allow_headers=["*"])
gate = asyncio.Semaphore(int(os.environ.get("MAX_PARALLEL", "4")))


class Job(BaseModel):
    backend: str
    code: str


def run_job(job: Job):
    if job.backend not in ("qiskit", "cirq", "pennylane"):
        return {"ok": False, "kind": "error", "error": f"Unknown backend {job.backend!r}"}
    if len(job.code) > 20000:
        return {"ok": False, "kind": "error", "error": "Code is too long (limit 20,000 characters)."}
    with tempfile.TemporaryDirectory() as tmp:
        try:
            p = subprocess.run(
                [sys.executable, "-I", os.path.join(HERE, "execute.py")],
                input=json.dumps(job.dict()), capture_output=True, text=True, timeout=15, cwd=tmp,
                env={"PATH": os.environ.get("PATH", ""), "PYTHONPATH": HERE, "HOME": tmp, "MPLBACKEND": "Agg"},
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "kind": "error", "error": "Your code took too long (limit 15 s). Check for infinite loops."}
    try:
        return json.loads(p.stdout)
    except Exception:
        if p.returncode < 0:  # killed by a signal: SIGXCPU/SIGKILL from the CPU limit, or the memory limit
            return {"ok": False, "kind": "error",
                    "error": "Your code used too much CPU time or memory (limits: 10 s CPU, 3 GB). Check for infinite loops."}
        return {"ok": False, "kind": "error", "error": "The runner crashed unexpectedly."}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/run")
async def run(job: Job):
    async with gate:
        return await asyncio.get_running_loop().run_in_executor(None, run_job, job)
