#!/usr/bin/env python3
"""
manifests — what a module's content is, and what review it has already been credited (credited review, the F1 design,
stage 1). Shared by k7-run.py (which modules a round reviews, and how) and seal.py (the full-review backstop).

A module (MOD-NN) is its object-model rows: their File cells. Its MANIFEST is canonical JSON of
  module      the MOD id
  s3          the S3 anchor tag's commit
  rows        the digest of its object-model rows (an edited row is a changed module)
  files       its files, the internal files they import that belong to no module, and the test files that import any
              of them: each {path, sha256}
  closure     every module its files import, directly or transitively: each {module, content}
  unresolved  internal imports that could not be resolved, its own and its closure's
The manifest's digest is the module's fingerprint. Imports are RESOLVED to tracked files (RD-13), in TypeScript /
JavaScript and Python. A specifier that is neither resolved nor plainly external (a package, a builtin) is recorded as
unresolved, never guessed, and a module with any unresolved import is never credited: a missed dependency can only cost
a review, never skip one. Links made by injection (OS-3) are not imports; the reviewer follows them (see k7-run.py).

A round is CONCLUDED when its verdict is PASS, or a closing tag (k7-pass-*, closed-by-owner*, seal-*) sits at or after
its reviewed commit. For each module:
  credited  its current fingerprint was in scope of a concluded round, and nothing is unresolved: not reviewed again
  diff      it was in scope of a concluded round on other content: reviewed on what changed since that round's
            reviewed commit (the base: the newest such round), and the code that change depends on
  full      never concluded, or asked for (--full)
The seal's backstop: every module's final fingerprint was reviewed in FULL in a concluded round.

    python manifests.py [--root .] [--json] [manifest | scope [--modules MOD-01,..] [--full] | backstop]
Exit: 0 answered; 1 the backstop is not met; 2 a bad call.
"""

import argparse
import ast
import hashlib
import json
import posixpath
import re
import subprocess
import sys
from pathlib import Path

JS_EXT = (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs")
CODE_EXT = JS_EXT + (".py",)
# LOCAL FIX (Frame Gate, IR-102): anchored to STATEMENTS. The template's pattern took any `from` before a
# quote, so a string literal such as "context-and-from" in test code read as a specifier, and every module
# whose closure held such a test was "unresolved" - never creditable (RD-27). Now: `import`/`export ... from`
# at a statement start (spanning lines, never past `;` or a quote), a side-effect `import "x"`,
# `import("x")` and `require("x")`.
JS_SPEC = re.compile(r"""(?:^[ \t]*(?:import|export)\b[^;'"]*?\bfrom\s*|^[ \t]*import\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1""", re.M)
NODE_BUILTINS = {"assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants", "crypto", "dgram",
                 "dns", "events", "fs", "http", "http2", "https", "inspector", "module", "net", "os", "path",
                 "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
                 "timers", "tls", "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib"}
CLOSING = ("k7-pass-*", "closed-by-owner*", "seal-*")


def git(root: Path, *a: str) -> str:
    r = subprocess.run(["git", "-C", str(root), *a], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def cells(line: str) -> list[str]:
    """A markdown table row's cells; a pipe inside backticks does not split."""
    out, cur, tick = [], [], False
    for ch in line.strip().strip("|"):
        if ch == "`":
            tick = not tick
        if ch == "|" and not tick:
            out.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    out.append("".join(cur).strip())
    return out


def object_model(root: Path, tracked: set[str]) -> dict[str, dict]:
    """{MOD-id: {"files": [...], "rows": [row text, ...]}} from INSTRUMENTS/object-model-and-parameters.md."""
    om = root / "INSTRUMENTS" / "object-model-and-parameters.md"
    mods: dict[str, dict] = {}
    if not om.is_file():
        return mods
    in_table = False
    for line in om.read_bytes().decode("utf-8").splitlines():
        if line.startswith("| Module | File |"):
            in_table = True
            continue
        if not line.startswith("|"):
            in_table = False
            continue
        if not in_table or re.match(r"^\|\s*-", line):
            continue
        c = cells(line)
        m = re.match(r"\s*(MOD-\d+)", c[0]) if c else None
        if not m or len(c) < 2:
            continue
        entry = mods.setdefault(m.group(1), {"files": [], "rows": []})
        entry["rows"].append(" ".join(line.split()))
        for path in re.findall(r"[\w.\-/]+\.[A-Za-z]+", c[1].replace("`", " ")):
            if path in tracked and path not in entry["files"]:
                entry["files"].append(path)
    return mods


class Resolver:
    """Resolves import specifiers to tracked files: ('file', path), ('external', spec) or ('unresolved', spec)."""

    def __init__(self, root: Path, tracked: set[str], cfg: dict):
        self.root, self.tracked = root, tracked
        pkg = {}
        try:
            pkg = json.loads((root / "package.json").read_bytes().decode("utf-8"))
        except (OSError, ValueError):
            pass
        self.packages = {k for sec in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies")
                         for k in (pkg.get(sec) or {})}
        roots = [""] + [r.strip("/") for r in (cfg.get("python_roots") or []) if r]
        glob = (cfg.get("source_glob") or "").split("*")[0].strip("/")
        if glob and glob not in roots:
            roots.append(glob)
        if "tests" not in roots:
            roots.append("tests")
        self.py_roots = roots

    def _first(self, cands: list[str]):
        for c in cands:
            c = posixpath.normpath(c)
            if c in self.tracked:
                return c
        return None

    def js(self, frm: str, spec: str):
        if spec.startswith("node:") or spec.split("/")[0] in NODE_BUILTINS:
            return ("external", spec)
        if spec.startswith("."):
            base = posixpath.normpath(posixpath.join(posixpath.dirname(frm), spec))
            stem, ext = posixpath.splitext(base)
            cands = [base] + [base + e for e in JS_EXT + (".json",)]
            if ext in (".js", ".jsx", ".mjs", ".cjs"):
                cands += [stem + e for e in (".ts", ".tsx", ".mts", ".cts")]
            cands += [posixpath.join(base, "index" + e) for e in JS_EXT]
            hit = self._first(cands)
            return ("file", hit) if hit else ("unresolved", spec)
        name = "/".join(spec.split("/")[:2]) if spec.startswith("@") else spec.split("/")[0]
        if name in self.packages or (self.root / "node_modules" / name).is_dir():
            return ("external", spec)
        return ("unresolved", spec)

    def py(self, frm: str, module: str | None, level: int, names: list[str]) -> list[tuple[str, str]]:
        out = []
        if level:
            base = posixpath.dirname(frm)
            for _ in range(level - 1):
                base = posixpath.dirname(base)
            parts = module.split(".") if module else []
            targets = [posixpath.join(base, *parts)] if parts else []
            targets += [posixpath.join(base, *parts, n) for n in names]
            found = [h for t in targets if (h := self._first([t + ".py", posixpath.join(t, "__init__.py")]))]
            return [("file", f) for f in found] or [("unresolved", "." * level + (module or ""))]
        top = module.split(".")[0]
        if top in sys.stdlib_module_names:
            return [("external", module)]
        for r in self.py_roots:
            stem = posixpath.join(r, *module.split(".")) if r else posixpath.join(*module.split("."))
            hit = self._first([stem + ".py", posixpath.join(stem, "__init__.py")])
            if hit:
                out.append(("file", hit))
                out += [("file", s) for n in names if (s := self._first([posixpath.join(stem, n) + ".py",
                                                                          posixpath.join(stem, n, "__init__.py")]))]
                return out
        # not in the repo and not the standard library: a third-party package, or something unseen
        return [("external", module)] if self._installed(top) else [("unresolved", module)]

    def _installed(self, top: str) -> bool:
        import importlib.util
        try:
            spec = importlib.util.find_spec(top)
        except (ImportError, ValueError):
            return False
        origin = getattr(spec, "origin", None) if spec else None
        return bool(spec) and not (origin and Path(origin).resolve().is_relative_to(self.root.resolve()))

    def imports(self, path: str) -> list[tuple[str, str]]:
        data = (self.root / path).read_bytes().decode("utf-8", "replace")
        if path.endswith(".py"):
            try:
                tree = ast.parse(data)
            except SyntaxError:
                return [("unresolved", f"(unparseable {path})")]
            out = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for a in node.names:
                        out += self.py(path, a.name, 0, [])
                elif isinstance(node, ast.ImportFrom):
                    out += self.py(path, node.module, node.level, [a.name for a in node.names if a.name != "*"])
            return out
        return [self.js(path, m.group(2)) for m in JS_SPEC.finditer(data)]


def build(root: Path, cfg: dict) -> dict[str, dict]:
    """Every module's manifest and fingerprint: {MOD: {"manifest", "digest", "deps", "importers"}}."""
    tracked = set(git(root, "ls-files").splitlines())
    mods = object_model(root, tracked)
    res = Resolver(root, tracked, cfg)
    owner = {f: m for m, e in mods.items() for f in e["files"]}
    anchor = sorted(git(root, "tag", "-l", "s3-anchor-*").splitlines())
    s3 = git(root, "rev-list", "-n", "1", anchor[-1]) if anchor else ""
    edges: dict[str, list[tuple[str, str]]] = {}

    def imports(f):
        if f not in edges:
            edges[f] = res.imports(f) if f.endswith(CODE_EXT) else []
        return edges[f]

    content, deps, unresolved, files_of = {}, {}, {}, {}
    for m, e in mods.items():
        files, seen, todo, dep, unres = set(e["files"]), set(), list(e["files"]), set(), set()
        while todo:                      # own files, and loose internal files they reach that belong to no module
            f = todo.pop()
            if f in seen:
                continue
            seen.add(f)
            for kind, x in imports(f):
                if kind == "unresolved":
                    unres.add(f"{f}: {x}")
                elif kind == "file":
                    if owner.get(x, m) != m:
                        dep.add(owner[x])
                    elif x not in files:
                        files.add(x)
                        todo.append(x)
        files_of[m], deps[m], unresolved[m] = files, dep, unres
    # LOCAL FIX (Frame Gate, IR-101): a test belongs to every module whose files it imports - TRANSITIVELY,
    # through shared support files, which join a module before the tests importing them can. The template walked
    # `tracked` (a set) once, so attribution - and every digest - followed Python's per-process hash seed. Now:
    # sorted, and walked to a fixed point.
    tests = sorted(f for f in tracked if f.startswith("tests/") and f.endswith(CODE_EXT))
    grew = True
    while grew:
        grew = False
        for t in tests:
            for kind, x in imports(t):
                if kind != "file":
                    continue
                for m in sorted(mods):
                    if x in files_of[m] and t not in files_of[m]:
                        files_of[m].add(t)
                        grew = True
    for t in tests:
        for kind, x in imports(t):
            if kind == "unresolved":
                for m in sorted(mods):
                    if t in files_of[m]:
                        unresolved[m].add(f"{t}: {x}")
    for m in mods:
        listed = [{"path": f, "sha256": sha((root / f).read_bytes())} for f in sorted(files_of[m])]
        content[m] = sha(canonical({"files": listed, "rows": sha("\n".join(mods[m]["rows"]).encode("utf-8"))}))
    out = {}
    for m in mods:
        closure, todo = set(), list(deps[m])
        while todo:
            d = todo.pop()
            if d not in closure and d != m:
                closure.add(d)
                todo += list(deps[d])
        unres = set(unresolved[m]) | {f"{d} · {u}" for d in closure for u in unresolved[d]}
        manifest = {"module": m, "s3": s3, "rows": sha("\n".join(mods[m]["rows"]).encode("utf-8")),
                    "files": [{"path": f, "sha256": sha((root / f).read_bytes())} for f in sorted(files_of[m])],
                    "closure": [{"module": d, "content": content[d]} for d in sorted(closure)],
                    "unresolved": sorted(unres)}
        out[m] = {"manifest": manifest, "digest": sha(canonical(manifest)), "deps": sorted(deps[m]),
                  "importers": sorted(x for x in mods if m in deps[x])}
    return out


def history(root: Path, inst: Path) -> dict:
    """From the verdict files: for each module, the fingerprints concluded rounds credited (and which were full), and
    the base: the reviewed commit of the newest concluded round that had the module in scope."""
    closing = [c for p in CLOSING for t in git(root, "tag", "-l", p).splitlines() if (c := git(root, "rev-list", "-n", "1", t))]
    rounds = []
    for p in inst.glob("k7-verdict-*.json"):
        m = re.search(r"k7-verdict-(\d+)\.json$", p.name)
        if m:
            try:
                rounds.append((int(m.group(1)), json.loads(p.read_bytes().decode("utf-8"))))
            except (OSError, ValueError):
                continue
    credited: dict[str, dict] = {}
    full: dict[str, dict] = {}
    base: dict[str, tuple[str, int]] = {}
    for n, v in sorted(rounds, key=lambda r: r[0]):
        rv = v.get("reviewed") or {}
        commit = rv.get("commit_sha", "")
        concluded = v.get("verdict") == "PASS" or any(
            subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", commit, c], capture_output=True).returncode == 0
            for c in closing) if commit else False
        if not concluded:
            continue
        scope = rv.get("scope")
        if scope is None:            # a verdict written before credited review: its modules list, no fingerprints
            scope = [{"module": m, "mode": "full"} for m in rv.get("modules", [])]
        for s in scope:
            mod = s.get("module")
            if s.get("manifest"):
                credited.setdefault(mod, {})[s["manifest"]] = n
                if s.get("mode") == "full":
                    full.setdefault(mod, {})[s["manifest"]] = n
            if s.get("mode") in ("full", "diff") and commit:
                base[mod] = (commit, n)
        if "(all)" in rv.get("modules", []) and rv.get("scope") is None and commit:
            base["(all)"] = (commit, n)
    return {"credited": credited, "full": full, "base": base}


def receipted(cfg: dict) -> bool:
    """RD-28: credit is read from PipelineGate receipts when the repo declares its store."""
    return bool(cfg.get("pipelinegate_command"))


def scope(root: Path, cfg: dict, inst: Path, modules: list[str], force_full: bool = False) -> list[dict]:
    built, h = build(root, cfg), history(root, inst)
    if receipted(cfg):
        import receipts                                  # lazily: receipts imports this module
    out = []
    for m in modules:
        b = built[m]
        digest, unres = b["digest"], b["manifest"]["unresolved"]
        entry = {"module": m, "manifest": digest, "base": None, "base_round": None, "credit_round": None,
                 "unresolved": unres, "deps": b["deps"], "importers": b["importers"],
                 "files": [f["path"] for f in b["manifest"]["files"]], "credit": None}
        base = h["base"].get(m) or h["base"].get("(all)")
        if receipted(cfg):     # the receipts decide credit; the verdict files only give the base
            credited = not unres and receipts.concluded(root, cfg, receipts.h_of(b["manifest"]))
        else:
            credited = digest in h["credited"].get(m, {}) and not unres
        if not force_full and credited:
            entry |= {"mode": "credited", "credit_round": h["credited"].get(m, {}).get(digest),
                      "credit": "receipt" if receipted(cfg) else "verdict"}
        elif not force_full and base:
            entry |= {"mode": "diff", "base": base[0], "base_round": base[1]}
        else:
            entry["mode"] = "full"
        out.append(entry)
    return out


def backstop(root: Path, cfg: dict, inst: Path) -> list[str]:
    """Modules whose final fingerprint has not been reviewed in full in a concluded round."""
    built, h = build(root, cfg), history(root, inst)
    if receipted(cfg):
        import receipts
    gaps = []
    for m, b in sorted(built.items()):
        if receipted(cfg):     # RD-28: only a receipt at full-review counts; the verdict file's mode is not evidence
            if not receipts.fully_reviewed(root, cfg, receipts.h_of(b["manifest"])):
                gaps.append(f"{m}: its final content has no ACCEPT receipt at full-review")
            continue
        full = b["digest"] in h["full"].get(m, {})
        if not full:
            last = max(h["credited"].get(m, {}).values(), default=None)
            gaps.append(f"{m}: its final content has had no full review" +
                        (f" (last concluded review: round {last})" if last else " (no concluded review records its content)"))
    return gaps


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.strip().split("\n\n")[0])
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("command", nargs="?", default="manifest", choices=["manifest", "scope", "backstop"])
    ap.add_argument("--modules", default="")
    ap.add_argument("--full", action="store_true")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        cfg = {}
    inst = root / "INSTRUMENTS"
    if a.command == "manifest":
        res = build(root, cfg)
    elif a.command == "scope":
        mods = [m for m in a.modules.split(",") if m] or sorted(build(root, cfg))
        res = scope(root, cfg, inst, mods, a.full)
    else:
        res = backstop(root, cfg, inst)
    if a.json:
        sys.stdout.buffer.write((json.dumps(res, indent=2) + "\n").encode("utf-8"))
    elif a.command == "manifest":
        for m, b in sorted(res.items()):
            print(f"{m}  {b['digest'][:12]}  files {len(b['manifest']['files'])}  deps {','.join(b['deps']) or '-'}"
                  + (f"  UNRESOLVED {len(b['manifest']['unresolved'])}" if b["manifest"]["unresolved"] else ""))
    elif a.command == "scope":
        for e in res:
            print(f"{e['module']}  {e['mode']:9}" + (f"  base {e['base'][:7]} (round {e['base_round']})" if e["base"] else "")
                  + (f"  credited by round {e['credit_round']}" if e["credit_round"] else "")
                  + (f"  unresolved {len(e['unresolved'])}" if e["unresolved"] else ""))
    else:
        print("\n".join(res) or "backstop met: every module's final content has had a full review")
    return 1 if a.command == "backstop" and res else 0


if __name__ == "__main__":
    sys.exit(main())
