# Qniverse runner (optional "Server" runtime)

Runs learner code with the real Qiskit / Cirq / PennyLane and returns the circuit it built; the browser grades it.

```
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
ALLOWED_ORIGINS=https://your-site.com uvicorn main:app --host 0.0.0.0 --port 8000
```
Then set `NEXT_PUBLIC_QNIVERSE_RUNNER_URL=https://<your-runner>` in the Next.js app and rebuild.

`POST /run  {"backend": "qiskit"|"cirq"|"pennylane", "code": "..."}` → `{"ok": true, "circuit": {...}}` or `{"ok": false, "error": "..."}`. `GET /health`.

## Security — please read

Each request runs in a fresh subprocess with a 10 s CPU limit, 3 GB address-space limit, 1 MB file-size limit, a 15 s wall-clock
timeout, a 20 000-character code limit and limited parallelism (`MAX_PARALLEL`, default 4).
**That is not a sandbox.** Learner code is arbitrary Python: it can read files, use the network, and write to disk
(this was verified, not assumed). Only deploy it inside a locked-down container or VM:

* non-root user, read-only root filesystem (tmpfs for `/tmp`), no secrets or credentials in the environment or image
* **no outbound network access**, no access to your internal network / cloud metadata endpoint
* container CPU, memory and pids limits; restart on failure
* CORS `ALLOWED_ORIGINS` set to your site (the default `*` is for local development)

If you can't provide that, leave `NEXT_PUBLIC_QNIVERSE_RUNNER_URL` unset: the Browser runtime runs inside the visitor's own browser tab.
