#!/usr/bin/env python3
"""
rederive — CC-5, mechanically.

Recomputes each golden vector's output from the implementation and compares it
to the pinned value. A vector that cannot be recomputed, or that recomputes to
something else, is a CC-5 failure. A vector whose impl_sha does not match the
implementation file it claims to derive from was hand-written, which is the
specific thing CC-5 exists to catch.

Language-agnostic by construction. The only project-specific knowledge is one
declared command in .metaframework/project.json:

    "rederive_invoke": "node {entry} {input_file}"
    "rederive_invoke": "python3 {entry} {input_file}"
    "rederive_invoke": "cargo run --quiet --bin {module} -- {input_file}"

Placeholders: {entry} (the module's File from the object model), {module},
{input_file} (a temp file holding the vector's encoded input), {vector_id}.
The command must write only the encoded output to stdout.

Usage:
    rederive.py <VEC-ID> [...]        one or more vectors
    rederive.py --all                 every COMPUTED vector
    rederive.py --all --json
Exit: 0 all pass, 1 any fail, 2 usage / configuration error.
"""

import argparse
import hashlib
import json
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path


def die(msg: str, code: int = 2) -> int:
    print(f"rederive: {msg}", file=sys.stderr)
    return code


def md_rows(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    for i in range(len(lines) - 1):
        if lines[i].strip().startswith("|") and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            cols = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows, j = [], i + 2
            while j < len(lines) and lines[j].strip().startswith("|"):
                vals = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                if len(vals) == len(cols):
                    rows.append(dict(zip(cols, vals)))
                j += 1
            return rows
    return []


def normalise(text: str, encoding: str) -> str:
    """Comparison is by declared encoding, never by raw string equality."""
    t = text.strip()
    if encoding in ("utf8-json", "json"):
        try:
            return json.dumps(json.loads(t), sort_keys=True, separators=(",", ":"))
        except json.JSONDecodeError:
            return t
    if encoding in ("hex", "sha256"):
        return t.lower()
    return t


def check_one(root: Path, vec: dict, entries: dict, invoke: str,
              vid: str, refresh_provenance: bool = False) -> tuple[bool, str]:
    if vec.get("state") == "DEFERRED":
        return True, "DEFERRED — skipped, not counted as a pass"

    module = vec.get("module", "")
    entry = entries.get(module)
    if not entry:
        return False, f"module {module} has no File in the object model"
    entry_path = root / entry
    if not entry_path.is_file():
        return False, f"{module} entry {entry} is not on disk"

    claimed = vec.get("impl_sha", "")
    actual = hashlib.sha256(entry_path.read_bytes()).hexdigest()
    provenance = ""
    if not claimed:
        provenance = ("no impl_sha recorded; the emission contract requires it and "
                      "without it the vector cannot be shown to be computed rather "
                      "than hand-written")
    elif claimed != actual:
        provenance = (f"impl_sha {claimed[:12]} != current {actual[:12]}: the "
                      f"implementation moved after this vector was pinned, so the "
                      f"record asserts something untrue. Re-pin with "
                      f"--refresh-provenance once the value re-derives.")

    enc = vec.get("encoding", "utf8-json")
    with tempfile.NamedTemporaryFile("w", suffix=".in", delete=False,
                                     encoding="utf-8") as tf:
        tf.write(vec.get("input", ""))
        in_file = tf.name
    try:
        cmd = shlex.split(invoke.format(entry=entry, module=module,
                                        input_file=in_file, vector_id=vid))
        try:
            r = subprocess.run(cmd, capture_output=True, text=True,
                               timeout=120, cwd=str(root))
        except FileNotFoundError:
            return False, f"rederive_invoke command not found: {cmd[0]}"
        except subprocess.TimeoutExpired:
            return False, "recomputation exceeded 120s"
    finally:
        Path(in_file).unlink(missing_ok=True)

    if r.returncode != 0:
        return False, f"implementation exited {r.returncode}: {r.stderr.strip()[:160]}"

    got = normalise(r.stdout, enc)
    want = normalise(vec.get("output", ""), enc)
    if got != want:
        return False, (f"recomputed {got[:60]!r} but the pinned value is "
                       f"{want[:60]!r}")
    if provenance:
        # The value is proven; the provenance record is not. CC-5 requires both,
        # so this fails — a record that asserts a false impl_sha is a false record.
        if refresh_provenance:
            vec["impl_sha"] = actual
            (root / "vectors" / f"{vid}.json").write_text(
                json.dumps(vec, indent=2) + "\n", encoding="utf-8")
            return True, f"re-derived; impl_sha re-pinned to {actual[:12]}"
        return False, provenance
    return True, "re-derived"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("vectors", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--refresh-provenance", action="store_true",
                    help="re-pin impl_sha for vectors whose value re-derives")
    args = ap.parse_args()

    if not args.all and not args.vectors:
        return die("name at least one VEC-ID, or pass --all")

    root = Path(args.root).resolve()
    try:
        cfg = json.loads((root / ".metaframework" / "project.json")
                         .read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return die(f"cannot read .metaframework/project.json: {e}")

    invoke = cfg.get("rederive_invoke")
    if not invoke:
        return die("project.json declares no rederive_invoke. CC-5 cannot be "
                   "mechanical without it; see the emission contract §5.")

    entries = {r.get("Module", ""): r.get("File", "")
               for r in md_rows(root / "INSTRUMENTS" / "object-model-and-parameters.md")}
    if not entries:
        return die("INSTRUMENTS/object-model-and-parameters.md has no parseable "
                   "table; vectors cannot be bound to implementations")

    vdir = root / "vectors"
    if args.all:
        paths = sorted(vdir.glob("VEC-*.json"))
        if not paths:
            return die(f"no vectors found in {vdir}")
    else:
        paths = [vdir / f"{v}.json" for v in args.vectors]

    results, failed = [], 0
    for p in paths:
        vid = p.stem
        try:
            vec = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            results.append({"vector": vid, "ok": False, "detail": f"unreadable: {e}"})
            failed += 1
            continue
        ok, detail = check_one(root, vec, entries, invoke, vid,
                               args.refresh_provenance)
        results.append({"vector": vid, "module": vec.get("module", ""),
                        "state": vec.get("state", ""), "ok": ok, "detail": detail})
        failed += 0 if ok else 1

    if args.json:
        print(json.dumps({"status": "fail" if failed else "pass",
                          "checked": len(results), "failed": failed,
                          "results": results}, indent=2))
    else:
        for r in results:
            mark = "ok  " if r["ok"] else "FAIL"
            print(f"{mark} {r['vector']:<10} {r.get('module',''):<10} {r['detail']}")
        print(f"\n{len(results)} vector(s), {failed} failed."
              if failed else f"\n{len(results)} vector(s), all re-derived.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
