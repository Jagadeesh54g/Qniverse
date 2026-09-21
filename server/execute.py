"""Sandboxed entry point: reads {"backend","code"} on stdin, prints one JSON line on stdout.
Started as a subprocess by main.py with CPU/memory limits. Not a security boundary on its own -
run the whole service in a container without network access (see README)."""
import contextlib
import io
import json
import os
import sys
import traceback

try:
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
    resource.setrlimit(resource.RLIMIT_AS, (3 * 1024 ** 3, 3 * 1024 ** 3))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
except Exception:  # pragma: no cover - non-POSIX
    pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import warnings  # noqa: E402
warnings.filterwarnings("ignore")
from translate import Unsupported, translate  # noqa: E402


def main():
    req = json.loads(sys.stdin.read())
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            circuit = translate(req["backend"], req["code"])
        res = {"ok": True, "circuit": circuit, "stdout": out.getvalue()[:4000]}
    except Unsupported as e:
        res = {"ok": False, "kind": "unsupported", "error": str(e)}
    except SyntaxError as e:
        res = {"ok": False, "kind": "error", "error": f"Line {e.lineno}: SyntaxError: {e.msg}"}
    except BaseException as e:  # noqa: BLE001
        line = None
        for fs in traceback.extract_tb(e.__traceback__):
            if fs.filename == "<solution>":
                line = fs.lineno
        where = f"Line {line}: " if line else ""
        res = {"ok": False, "kind": "error", "error": f"{where}{type(e).__name__}: {e}", "stdout": out.getvalue()[:4000]}
    sys.__stdout__.write(json.dumps(res))


main()
