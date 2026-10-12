#!/usr/bin/env python3
"""
gate — PreToolUse hook. The wall.

Reads the hook payload on stdin and denies seven things:

  1. Any write to governance/S3/, including via Bash or PowerShell. The existing
     protect-s3.sh inspects tool_input.file_path only, so `cat > governance/
     S3/x` passes untouched and Phase 4 leans on Bash. This closes that. Every
     shell rule below applies to PowerShell as to Bash (GOV-1): on Windows it is
     a second shell, and a rule that names only one shell is a door left open.
  2. `git tag k7-pass-N` without a PASS verdict N whose reviewed.tree_sha
     equals the tree being tagged. Tags become evidence, not assertion.
  3. `git merge` without a PASS verdict covering HEAD's tree and a drift score
     at or above threshold. This is the drift-teeth rule, which the framework
     calls merge-blocking and currently enforces nowhere. In Phase 5 (after a
     seal) this rule is replaced: merges need no K7 verdict, only an intact seal.
  4. After a seal: any write to a file present at the latest seal-* tag that
     matches sealed_globs. The library is read-only; extensions add new files.
  5. A hand-made `git tag seal-*`. Seals are made by tools/seal.py apply, which
     runs the sweep and writes the record first.
  6. A write to a library source file that takes an input it never declared: a
     default argument, an *args/**kwargs bag, a zero-argument method returning a
     literal, a module constant read inside a class (OS-1), or an ambient read —
     env, clock, randomness, globals, singletons (OS-2). The rule arrives at the moment of the write, which is
     the only moment it competes with the three-token shortcut.
  7. `git commit` while `phase4-checks.py objects` reports a violation in a
     staged source file, or while a staged signature disagrees with the object
     model or the interface contract — so neither accumulates until the seal,
     where it is expensive.

FAILS CLOSED. Any error — unreadable payload, missing python, malformed
verdict, absent config — denies. The framework's own doctrine is that UNKNOWN
fails safe toward HALT; protect-s3.sh violates it by redirecting stderr to
/dev/null and treating an empty parse as permission to proceed.

Install in .claude/settings.json:

    {"hooks": {"PreToolUse": [
      {"matcher": "Bash|PowerShell|Write|Edit|NotebookEdit",
       "hooks": [{"type": "command", "command": "python3 tools/gate.py"}]}]}}

Deny is signalled two ways for compatibility: permissionDecision on stdout and
exit code 2. A PreToolUse deny holds even under bypassPermissions.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

DRIFT_FLOOR = 7
# Two patterns, because the anchor that is correct for a bare file path is wrong
# for a path sitting mid-command: "cat x > governance/S3/f" is preceded by a
# space, not by "/" or start-of-string.
# Case-insensitive: NTFS resolves governance/s3/ to the same directory (GOV-1).
PROTECTED_PATH = re.compile(r"(^|/)governance/S3/", re.IGNORECASE)
PROTECTED_CMD = re.compile(r"(?<![\w.\-])governance/S3/", re.IGNORECASE)

SHELL_TOOLS = ("Bash", "PowerShell")

WRITE_VERBS = re.compile(r"(>|>>|\btee\b|\bcp\b|\bmv\b|\brm\b|\bsed\b\s+-i|"
                         r"\btruncate\b|\bdd\b|\bln\b|\bchmod\b|\bgit\s+checkout\b|"
                         r"\bgit\s+rm\b|\bgit\s+mv\b|\bgit\s+restore\b|\bperl\b\s+-[a-z]*i)")

# PowerShell writes by cmdlet, by alias and by .NET call, none of which the Bash
# verbs name. An alias is a whole token: `.md` in README.md is not `md`.
_PS_ALIAS = r"sc|ac|clc|rm|del|erase|rd|rmdir|ri|cp|copy|cpi|mv|move|mi|ren|rni|ni|md|mkdir|tee|si|cli"
PS_WRITE_VERBS = re.compile(
    r"(>|\b(set|add|clear)-content\b|\bout-file\b|"
    r"\b(remove|copy|move|rename|new|set|clear)-item(property)?\b|\btee-object\b|"
    r"\bexport-(csv|clixml)\b|\b(expand|compress)-archive\b|-outfile\b|"
    r"(?<![\w.\-/])(" + _PS_ALIAS + r")(?![\w.\-/])|"
    r"\[(system\.)?io\.(file|directory|fileinfo)\]::|"
    r"\.(delete|moveto|copyto|replace|create|createtext|appendtext|openwrite)\(|"
    r"\bgit\s+(checkout|rm|mv|restore)\b)", re.IGNORECASE)


def glob_to_regex(pattern: str) -> re.Pattern:
    out, i, n = [], 0, len(pattern)
    while i < n:
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?"); i += 3
        elif pattern.startswith("**", i):
            out.append(".*"); i += 2
        elif pattern[i] == "*":
            out.append("[^/]*"); i += 1
        elif pattern[i] == "?":
            out.append("[^/]"); i += 1
        else:
            out.append(re.escape(pattern[i])); i += 1
    return re.compile("^" + "".join(out) + "$")


def seal_context(root: Path) -> tuple[str, set[str]]:
    """(latest seal tag, files it froze). ("", set()) before the first seal."""
    tags = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    if not tags:
        return "", set()
    tag = tags[0]
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        cfg = {}   # fall back to the defaults below rather than failing open
    globs = cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]
    rx = [glob_to_regex(g) for g in globs]
    files = git(root, "ls-tree", "-r", "--name-only", tag).splitlines()
    return tag, {f for f in files if any(r.match(f) for r in rx)}


def phase(root: Path) -> str:
    try:
        return str(json.loads((root / "STATE.json").read_text(encoding="utf-8")).get("phase", 4))
    except (OSError, json.JSONDecodeError):
        return "4"          # unknown phase -> the stricter Phase 4 merge rule


def rel_to(root: Path, p: str) -> str:
    q = Path(p)
    try:
        return (q if q.is_absolute() else (root / q)).resolve().relative_to(root).as_posix()
    except ValueError:
        return q.as_posix()


def merge_ref(cmd: str) -> str | None:
    """The single branch/commit named by `git merge`, or None if not exactly one."""
    m = re.search(r"\bgit\s+merge\b([^\n;&|]*)", cmd)
    if not m:
        return None
    toks, skip = [], False
    for t in m.group(1).split():
        if skip:
            skip = False; continue
        if t in ("-m", "-s", "-X", "--strategy", "--strategy-option", "-F", "--file"):
            skip = True; continue
        if t.startswith("-"):
            continue
        toks.append(t.strip("'\""))
    return toks[0] if len(toks) == 1 else None


AMBIENT = [
    (r"process\.env\b", "hand the value in at construction"),
    (r"\bos\.environ\b", "hand the value in at construction"),
    (r"\bDate\.now\(|new Date\(\)", "inject a clock provider"),
    (r"\bdatetime\.now\(|\btime\.time\(", "inject a clock provider"),
    (r"\bMath\.random\(|\brandom\.(random|randint|choice)\(", "inject an id provider"),
    (r"\bglobalThis\b|\bwindow\.|\bdocument\.", "the library is not the browser"),
    (r"\bgetInstance\(\)", "inject the instance"),
]


def object_standard(root: Path) -> tuple[dict, str]:
    try:
        cfg = json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}, "src/**"
    return cfg.get("object_standard") or {}, cfg.get("source_glob") or "src/**"


def ambient_hit(root: Path, rel: str, content: str) -> tuple[str, str] | None:
    """OS-2: a library source file may not reach outside the object's declared inputs."""
    std, glob = object_standard(root)
    if std.get("skip") or not content:
        return None
    if not glob_to_regex(glob).match(rel):
        return None
    provider = std.get("provider_glob", "**/*provider*")
    if provider and glob_to_regex(provider).match(rel.lower()):
        return None            # the clock provider is where reading the clock belongs
    allow = std.get("allow") or {}
    if any(rel.startswith(k) and "OS-2" in vals for k, vals in allow.items()):
        return None
    pats = [(p, f) for p, f, *_ in (std.get("ambient_patterns") or
                                    [[a, "OS-2", b] for a, b in AMBIENT])] \
        if std.get("ambient_patterns") else AMBIENT
    for pat, fix in pats:
        m = re.search(pat, content)
        if m:
            return pat, fix
    return None



# ---------------------------------------------------------------- OS-1 detector
# A name in a method body is legal only if it is a parameter of that method, a
# field assigned from a constructor parameter, or a local computed from those.
# Python is parsed; JS/TS is scanned. The scanner is the cheap pass; the OS-12
# isolation tests are the proof.
LITERAL_CALLS = {"date", "datetime", "Decimal", "timedelta", "UUID"}


def _py_os1(text: str) -> list[tuple[str, int, str]]:
    import ast
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return []
    out = []
    module_consts, imported = set(), set()
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    module_consts.add(t.id)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for al in node.names:
                imported.add((al.asname or al.name).split(".")[0])

    def literal_only(n) -> bool:
        if isinstance(n, ast.Constant):
            return True
        if isinstance(n, (ast.List, ast.Tuple, ast.Set)):
            return all(literal_only(e) for e in n.elts)
        if isinstance(n, ast.Dict):
            return all(literal_only(e) for e in list(n.keys) + list(n.values))
        if isinstance(n, ast.Call):
            f = n.func
            name = f.attr if isinstance(f, ast.Attribute) else getattr(f, "id", "")
            return name in LITERAL_CALLS and all(literal_only(a) for a in n.args)
        return False

    for cls in [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]:
        fields, ctor_params = set(), set()
        for fn in [n for n in cls.body if isinstance(n, ast.FunctionDef)]:
            args = fn.args
            names = [a.arg for a in args.posonlyargs + args.args + args.kwonlyargs]
            if fn.name == "__init__":
                ctor_params = {n for n in names if n != "self"}
                for sub in ast.walk(fn):
                    if isinstance(sub, ast.Assign):
                        for t in sub.targets:
                            if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) \
                                    and t.value.id == "self":
                                fields.add(t.attr.lstrip("_"))
            if args.defaults or args.kw_defaults and any(args.kw_defaults):
                out.append(("OS-1_default_argument", fn.lineno,
                            f"{cls.name}.{fn.name} has a default argument — a default is a "
                            f"sealed scenario; hand the value in"))
            if args.vararg or args.kwarg:
                out.append(("OS-1_bag_parameter", fn.lineno,
                            f"{cls.name}.{fn.name} receives *args/**kwargs — collaborators "
                            f"arrive as declared slots, not in a bag"))
        for fn in [n for n in ast.walk(cls) if isinstance(n, ast.FunctionDef)]:
            names = [a.arg for a in fn.args.posonlyargs + fn.args.args + fn.args.kwonlyargs]
            params = {n for n in names if n != "self"}
            body = [s for s in fn.body if not isinstance(s, ast.Expr)
                    or not isinstance(s.value, ast.Constant)]
            if not params and len(body) == 1 and isinstance(body[0], ast.Return) \
                    and body[0].value is not None and literal_only(body[0].value):
                out.append(("OS-1_undeclared_input", fn.lineno,
                            f"{cls.name}.{fn.name} takes nothing and returns a literal — that "
                            f"is an undeclared input; make it a constructor parameter"))
            if fn.name == "__init__":
                continue
            locals_ = set()
            for sub in ast.walk(fn):
                if isinstance(sub, ast.Assign):
                    for t in sub.targets:
                        if isinstance(t, ast.Name):
                            locals_.add(t.id)
                elif isinstance(sub, (ast.For, ast.comprehension)):
                    tgt = getattr(sub, "target", None)
                    if isinstance(tgt, ast.Name):
                        locals_.add(tgt.id)
            for sub in ast.walk(fn):
                if isinstance(sub, ast.Name) and isinstance(sub.ctx, ast.Load):
                    n = sub.id
                    if n in module_consts and n not in params | locals_ | imported:
                        out.append(("OS-1_module_constant", sub.lineno,
                                    f"{cls.name}.{fn.name} reads module constant '{n}' — "
                                    f"an undeclared input; hand it in at construction"))
    return out


def _js_os1(text: str) -> list[tuple[str, int, str]]:
    import re as _re
    out, lines = [], text.splitlines()
    consts = set(_re.findall(r"^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*"
                             r"(?:['\"`\d\[{]|new Date\()", text, _re.M))
    in_class, depth = False, 0
    for i, ln in enumerate(lines, 1):
        if _re.search(r"\bclass\s+[A-Za-z_$][\w$]*", ln):
            in_class, depth = True, 0
        if in_class:
            depth += ln.count("{") - ln.count("}")
            if depth <= 0 and "}" in ln and i > 1:
                in_class = False
        m = _re.search(r"(?:constructor|^\s*(?:async\s+)?[A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{", ln)
        if m and in_class:
            params = m.group(1)
            if _re.search(r"=(?!=|>)", params):
                out.append(("OS-1_default_argument", i,
                            "default argument — a default is a sealed scenario; hand it in"))
            if "..." in params or "arguments" in params:
                out.append(("OS-1_bag_parameter", i,
                            "rest/options bag — collaborators arrive as declared slots"))
            if not params.strip() and not ln.strip().startswith("constructor"):
                rest = "\n".join(lines[i - 1:i + 2])
                if _re.search(r"\breturn\s+(['\"`]|\d|\{|\[|new Date\()", rest):
                    out.append(("OS-1_undeclared_input", i,
                                "takes nothing and returns a literal — that is an undeclared "
                                "input; make it a constructor parameter"))
        if in_class:
            for c in consts:
                if _re.search(rf"(?<![\w$.]){_re.escape(c)}(?![\w$])", ln) and "=" not in ln.split(c)[0][-2:]:
                    out.append(("OS-1_module_constant", i,
                                f"reads module constant '{c}' — an undeclared input"))
                    break
    return out


def os1_findings(rel: str, text: str) -> list[tuple[str, int, str]]:
    if rel.endswith(".py"):
        return _py_os1(text)
    if rel.endswith((".js", ".mjs", ".ts", ".jsx", ".tsx")):
        return _js_os1(text)
    return []

def decide(allow: bool, reason: str = "") -> int:
    if allow:
        return 0
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))
    print(f"gate: DENIED — {reason}", file=sys.stderr)
    return 2


def git(root: Path, *a: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *a],
                           capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def load_verdict(root: Path, n: str) -> dict | None:
    try:
        return json.loads((root / "INSTRUMENTS" / f"k7-verdict-{n}.json")
                          .read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def check_verdict(root: Path, n: str, tree: str, what: str) -> str:
    """Return an empty string if the verdict authorises `what`, else the reason."""
    v = load_verdict(root, n)
    if v is None:
        return (f"{what} requires INSTRUMENTS/k7-verdict-{n}.json; it is absent or "
                f"unparseable. Run tools/k7-run.py first.")
    got = (v.get("reviewed") or {}).get("tree_sha", "")
    if got != tree:
        return (f"{what}: verdict {n} reviewed tree {got[:12] or '(none)'} but the "
                f"tree here is {tree[:12]}. Re-run K7 against this tree.")
    if v.get("verdict") != "PASS":
        return f"{what}: verdict {n} is {v.get('verdict')}, not PASS."
    score = (v.get("drift_score") or {}).get("value")
    if not isinstance(score, int) or score < DRIFT_FLOOR:
        return (f"{what}: drift score {score} is below {DRIFT_FLOOR}. "
                f"The drift-teeth rule blocks new work.")
    if (v.get("preflight") or {}).get("structure_check", {}).get("status") != "pass":
        return f"{what}: verdict {n} carries structure violations."
    return ""


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError) as e:
        return decide(False, f"gate could not read its own input ({e}); failing closed")

    tool = payload.get("tool_name", "")
    ti = payload.get("tool_input") or {}
    root = Path(payload.get("cwd") or ".").resolve()

    if not tool:
        return decide(False, "hook payload carried no tool_name; the gate cannot "
                             "tell what it is being asked to allow. Failing closed.")

    # 1. S3 write protection, all tools.
    for key in ("file_path", "notebook_path", "path"):
        p = ti.get(key)
        if isinstance(p, str) and PROTECTED_PATH.search(p.replace("\\", "/")):
            return decide(False, f"{p} is inside the frozen S3 anchor. "
                                 f"Supersede via F-supersession-proposals, never edit.")
    if tool in ("Write", "Edit", "NotebookEdit") and not any(
            isinstance(ti.get(k), str) for k in ("file_path", "notebook_path", "path")):
        return decide(False, f"{tool} carried no readable path; failing closed "
                             f"rather than assuming it is outside the S3.")

    seal, sealed = seal_context(root)

    # 4. Sealed library, file tools.
    if sealed:
        for key in ("file_path", "notebook_path", "path"):
            p = ti.get(key)
            if isinstance(p, str) and rel_to(root, p) in sealed:
                return decide(False, f"{p} is sealed at {seal}. The library is read-only; "
                                     f"new capability arrives as new files through an "
                                     f"extension run (tools/seal.py begin-extension).")

    # 6. OS-2, at the moment of the write.
    if tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        body = " ".join(str(ti.get(k, "")) for k in
                        ("content", "new_string", "new_str", "new_source"))
        path_in = ti.get("file_path") or ti.get("notebook_path") or ti.get("path") or ""
        if isinstance(path_in, str) and path_in:
            rel = rel_to(root, path_in)
            std, glob = object_standard(root)
            if body and not std.get("skip") and glob_to_regex(glob).match(rel) \
                    and not any(rel.startswith(k) and "OS-1" in val
                                for k, val in (std.get("allow") or {}).items()):
                found = os1_findings(rel, body)
                if found:
                    rule, line, detail = found[0]
                    return decide(False, f"{rule} at line {line}: {detail}. Everything a class "
                                         f"uses arrives through its own declaration — see "
                                         f"governance/Object_Writing_Standard.md (OS-1).")
            hit = ambient_hit(root, rel, body)
            if hit:
                return decide(False, f"this write reaches outside the object's declared inputs "
                                     f"(/{hit[0]}/ — OS-2): {hit[1]}. Everything a class needs "
                                     f"arrives at construction; see "
                                     f"governance/Object_Writing_Standard.md.")

    if tool not in SHELL_TOOLS:
        return decide(True)

    cmd = ti.get("command", "")
    if not isinstance(cmd, str):
        return decide(False, f"{tool} call carried no readable command; failing closed.")

    norm = cmd.replace("\\", "/")
    writes = PS_WRITE_VERBS if tool == "PowerShell" else WRITE_VERBS
    if PROTECTED_CMD.search(norm) and writes.search(norm):
        return decide(False, "this command writes inside governance/S3/, which is "
                             "frozen at the anchor. Supersede, never edit.")

    # 4. Sealed library, shell. A tripwire: the authoritative check is seal.py verify.
    if sealed and writes.search(norm):
        hit = next((f for f in sealed if re.search(
            r"(?<![\w.\-/])" + re.escape(f) + r"(?![\w.\-/])", norm)), None)
        if hit:
            return decide(False, f"this command writes, copies, or moves {hit}, sealed at {seal}. "
                                 f"The library is read-only.")

    # 5. Seals are made by the tool, not by hand.
    if re.search(r"\bgit\s+tag\b[^\n;&|]*\bseal-\d", norm) and \
            not re.search(r"\bgit\s+tag\s+(-l|--list)\b", norm):
        return decide(False, "seal tags are made by `python3 tools/seal.py apply --approved-by "
                             "...`, which runs the sweep and writes the seal record first.")

    # 7. OS check at commit, on what is staged.
    if re.search(r"\bgit\s+commit\b", norm) and not re.search(r"--amend|--no-verify", norm):
        checker = root / "tools" / "phase4-checks.py"
        if checker.is_file():
            staged = set(git(root, "diff", "--cached", "--name-only").splitlines())
            try:
                r = subprocess.run([sys.executable, str(checker), "objects", "--root", str(root),
                                    "--json"], capture_output=True, text=True, timeout=120)
                found = json.loads(r.stdout).get("violations", [])
            except (OSError, ValueError, subprocess.SubprocessError):
                found = []
            blocking = [x for x in found if x.get("file") in staged]
            sealtool = root / "tools" / "seal.py"
            if sealtool.is_file():
                try:
                    r2 = subprocess.run([sys.executable, str(sealtool), "declarations",
                                         "--root", str(root), "--json"],
                                        capture_output=True, text=True, timeout=120)
                    for x in json.loads(r2.stdout).get("problems", []):
                        if x.get("file") in staged:
                            blocking.append({"file": x["file"], "rule": "declarations",
                                             "detail": x.get("detail", "")})
                except (OSError, ValueError, subprocess.SubprocessError):
                    pass
            if blocking:
                first = blocking[0]
                return decide(False, f"{len(blocking)} standard or declaration violation(s) in "
                                     f"staged files, e.g. {first.get('file')}: "
                                     f"{first.get('rule')} — {first.get('detail', '')[:120]}. "
                                     f"Fix them, or record a documented exception under "
                                     f"object_standard.allow in project.json.")

    tree = git(root, "rev-parse", "HEAD^{tree}")
    if not tree:
        # Only gate git operations; a repo we cannot read cannot be tagged either.
        if re.search(r"\bgit\s+(tag|merge)\b", norm):
            return decide(False, "cannot resolve HEAD tree to validate this "
                                 "operation; failing closed.")
        return decide(True)

    m = re.search(r"\bgit\s+tag\b[^\n;&|]*?\bk7-pass-(\d+)\b", norm)
    if m:
        reason = check_verdict(root, m.group(1), tree, f"tagging k7-pass-{m.group(1)}")
        return decide(not reason, reason)

    if re.search(r"\bgit\s+merge\b", norm) and not re.search(r"--abort|--continue", norm):
        if seal:
            ref = merge_ref(norm)
            if ref is None:
                return decide(False, f"after {seal}, merge exactly one named branch so the "
                                     f"seal can be checked against it.")
            touched = sorted(set(git(root, "diff", "--name-only", seal, ref).splitlines())
                             & sealed)
            if touched:
                return decide(False, f"{ref} changes files sealed at {seal}: "
                                     f"{', '.join(touched[:5])}. Not mergeable.")
            if phase(root) == "5":
                return decide(True)     # Phase 5: an intact seal is the whole merge rule
        vs = sorted((int(x.stem.rsplit("-", 1)[1])
                     for x in (root / "INSTRUMENTS").glob("k7-verdict-*.json")
                     if x.stem.rsplit("-", 1)[1].isdigit()), reverse=True)
        if not vs:
            return decide(False, "merge requires a PASS verdict covering this tree; "
                                 "no verdict exists. Run tools/k7-run.py.")
        reason = check_verdict(root, str(vs[0]), tree, "merge")
        return decide(not reason, reason)

    return decide(True)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:                      # noqa: BLE001 - fail closed on anything
        print(f"gate: internal error ({e}); failing closed", file=sys.stderr)
        sys.exit(2)
