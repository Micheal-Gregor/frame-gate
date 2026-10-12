#!/usr/bin/env python3
"""
phase4-checks — the five gates buildable today, against Phase 4 instruments
whose columns are already fixed. No S3 parsing required.

  rosters   Governance copies in the repo match the authoritative skill rosters.
            Catches the stale-template class: repo copies missing RD-9..16 and
            A-1..A-4 while CLAUDE.md instructs every session to read them.
  modules   CC-1, for real. Every module in object-model-and-parameters.md has
            its File on disk, and every source file is claimed by a module.
  tags      Every k7-pass-N tag has a verdict whose reviewed.tree_sha equals the
            tree that tag points at. Makes tags evidence instead of assertion.
  scaffold  RD-14: no scaffold markers survive into committed artifacts.
  seal      After a seal: files present at the latest seal-* tag are unchanged,
            and the seal has its section in INSTRUMENTS/seal-record.md.
  objects   Object Writing Standard OS-1..OS-12, statically: no ambient reads
            inside the library (OS-2), no decider imported where the seam says
            INJECTED (OS-3), no bucket module names (OS-9), an isolation test per
            module (OS-12). A scanner, not a proof — OS-12's test is the proof.

Usage:
    phase4-checks.py [--root .] [--json] [rosters modules tags scaffold seal objects]
Exit codes: 0 pass, 1 violations, 2 bad invocation.
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

# Assembled at runtime rather than written literally: this file would otherwise
# match its own patterns. Any tool that scans for markers must not contain them.
DEFAULT_MARKERS = [
    r"<!--\s*SET" + r"UP", r"DELETE" + r" THIS", r"TODO\(scaff" + r"old\)",
    r"<Con" + r"cept>", r"repo-" + r"template", r"XXX-PLACE" + r"HOLDER",
]

# The checker cannot audit itself. Tooling lives here and is excluded by default.
# The emission contract is also exempt: its job is to document filename patterns
# like CLAUDE_<Concept>_Phase3.md, so the placeholder is content, not leakage.
# governance/S3/ is NOT exempt — an unsubstituted placeholder there is a real bug.
# IMPLEMENTATION_GUIDE.md and the emission contract are exempt for the same reason:
# their job is to DESCRIBE the templates ("copy this into <concept>-build/"), so the
# placeholder is subject matter, not leakage. SETUP.md is exempt because it is the
# scaffold and is deleted at C4 rather than substituted.
# The roster copy is exempt for the same reason, and cannot be substituted anyway:
# its digest is pinned by roster-manifest.json.
DEFAULT_EXEMPT = [".metaframework/", "tools/",
                  "governance/S2-S3-emission-contract.md",
                  "governance/Phase4_Conformance_Build_Roster.md",
                  "IMPLEMENTATION_GUIDE.md", "SETUP.md", "HARNESS.md"]


def glob_to_regex(pattern: str) -> re.Pattern:
    """Correct ** semantics. Neither fnmatch nor git pathspec provides them:
    'src/**/*.ts' fails to match 'src/orphan.ts' under both."""
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


def git(root: Path, *args: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *args],
                           capture_output=True, text=True, check=True)
        return r.stdout
    except (OSError, subprocess.CalledProcessError):
        return ""


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def v(rule: str, detail: str, file: str = "") -> dict:
    return {"file": file, "rule": rule, "detail": detail}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def md_rows(path: Path, section: str | None = None) -> list[dict]:
    """Rows of the first markdown table in a file (optionally after a heading)."""
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    start = 0
    if section:
        for i, ln in enumerate(lines):
            if ln.strip().startswith("## ") and section in ln:
                start = i
                break
    for i in range(start, len(lines) - 1):
        if lines[i].strip().startswith("|") and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            cols = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows = []
            j = i + 2
            while j < len(lines) and lines[j].strip().startswith("|"):
                vals = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                if len(vals) == len(cols):
                    rows.append(dict(zip(cols, vals)))
                j += 1
            return rows
    return []


# --------------------------------------------------------------------------- #

def check_rosters(root: Path, cfg: dict) -> list[dict]:
    """Compare governance copies against recorded authoritative digests."""
    manifest = load_json(root / ".metaframework" / "roster-manifest.json")
    if manifest is None:
        return [v("roster_manifest_missing",
                  ".metaframework/roster-manifest.json absent. Without it a stale "
                  "governance copy is undetectable — this is the defect that let "
                  "pre-amendment rosters ship in the repo template.")]
    out = []
    for rel, expected in manifest.items():
        p = root / rel
        if not p.is_file():
            out.append(v("roster_missing", f"declared in manifest, absent on disk", rel))
        elif sha256(p) != expected:
            out.append(v("roster_stale",
                         f"sha256 {sha256(p)[:12]} != expected {expected[:12]}; "
                         f"repo copy has diverged from the authoritative roster", rel))
    return out


def check_modules(root: Path, cfg: dict) -> list[dict]:
    """CC-1: module <-> source tree, both directions."""
    inst = root / "INSTRUMENTS" / "object-model-and-parameters.md"
    rows = md_rows(inst)
    if not rows:
        return [v("object_model_unreadable",
                  "INSTRUMENTS/object-model-and-parameters.md has no parseable "
                  "table; CC-1 cannot run", str(inst.name))]

    out, declared = [], set()
    for n, row in enumerate(rows, 1):
        f = row.get("File", "").strip()
        mod = row.get("Module", f"row {n}")
        if not f or f.startswith("—"):
            out.append(v("module_without_file", f"{mod}: File column empty"))
            continue
        declared.add(f)
        if not (root / f).is_file():
            out.append(v("module_file_absent", f"{mod} declares {f}, not on disk"))

    glob = cfg.get("source_glob")
    if not glob:
        out.append(v("source_glob_undeclared",
                     "project.json has no source_glob; the reverse direction of "
                     "CC-1 (source not claimed by any module) cannot run"))
        return out

    rx = glob_to_regex(glob)
    tracked = [p for p in git(root, "ls-files").splitlines() if p.strip() and rx.match(p)]
    for p in sorted(set(tracked) - declared):
        out.append(v("unclaimed_source",
                     f"{p} is tracked but claimed by no module; "
                     f"'module not in Object Model -> build fails'"))
    return out


def check_tags(root: Path, cfg: dict) -> list[dict]:
    out = []
    tags = [t for t in git(root, "tag", "-l", "k7-pass-*").splitlines() if t.strip()]
    if not tags:
        return out
    for tag in tags:
        m = re.search(r"k7-pass-(\d+)$", tag)
        if not m:
            out.append(v("tag_malformed", f"{tag} does not match k7-pass-<N>"))
            continue
        tree = git(root, "rev-parse", f"{tag}^{{tree}}").strip()
        verdict_path = root / "INSTRUMENTS" / f"k7-verdict-{m.group(1)}.json"
        verdict = load_json(verdict_path)
        if verdict is None:
            out.append(v("tag_without_verdict",
                         f"{tag} exists but {verdict_path.name} is absent or unreadable; "
                         f"the tag asserts a review that cannot be produced"))
            continue
        claimed = (verdict.get("reviewed") or {}).get("tree_sha", "")
        if claimed != tree:
            out.append(v("tag_verdict_mismatch",
                         f"{tag} points at tree {tree[:12]} but "
                         f"{verdict_path.name} reviewed {claimed[:12] or '(absent)'}"))
    return out


def check_scaffold(root: Path, cfg: dict) -> list[dict]:
    # `or` not `get(k, default)`: an explicit null in project.json means "use the
    # defaults", and get() would hand back None because the key does exist.
    markers = [re.compile(p, re.I) for p in (cfg.get("scaffold_markers") or DEFAULT_MARKERS)]
    exempt = cfg.get("scaffold_exempt") or DEFAULT_EXEMPT
    out = []
    for rel in git(root, "ls-files").splitlines():
        if not rel.strip() or any(rel.startswith(e) for e in exempt):
            continue
        p = root / rel
        try:
            text = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for i, line in enumerate(text.splitlines(), 1):
            for rx in markers:
                if rx.search(line):
                    out.append(v("scaffold_marker",
                                 f"line {i} matches /{rx.pattern}/ — RD-14: a scaffold "
                                 f"banner must not survive into the artifact", rel))
                    break
    return out


def check_seal(root: Path, cfg: dict) -> list[dict]:
    tags = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").split()
    if not tags:
        return []
    tag = tags[0]
    globs = cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]
    rx = [glob_to_regex(g) for g in globs]
    sealed = {f for f in git(root, "ls-tree", "-r", "--name-only", tag).splitlines()
              if any(r.match(f) for r in rx)}
    changed = set(git(root, "diff", "--name-only", tag).splitlines())
    changed |= {f for f in sealed if not (root / f).exists()}
    out = [v("sealed_file_changed", f"sealed at {tag}; the library is read-only", f)
           for f in sorted(changed & sealed)]
    rec = root / "INSTRUMENTS" / "seal-record.md"
    text = rec.read_text(encoding="utf-8") if rec.is_file() else ""
    for t in tags:
        if f"## {t} " not in text and f"## {t}\n" not in text:
            out.append(v("seal_without_record", f"{t} has no section in seal-record.md; "
                         f"seal with tools/seal.py apply, never by hand", "INSTRUMENTS/seal-record.md"))
    return out


AMBIENT = [
    # (regex, rule, what to do instead) — tune per language in project.json.
    (r"process\.env\b", "OS-2", "hand the value in at construction"),
    (r"\bos\.environ\b", "OS-2", "hand the value in at construction"),
    (r"\bDate\.now\(|new Date\(\)", "OS-2", "inject a clock provider"),
    (r"\bdatetime\.now\(|\btime\.time\(", "OS-2", "inject a clock provider"),
    (r"\bMath\.random\(|\brandom\.(random|randint|choice)\(", "OS-2",
     "inject an id or randomness provider"),
    (r"\bglobalThis\b|\bwindow\.|\bdocument\.", "OS-2", "the library is not the browser"),
    (r"\bgetInstance\(\)|\bsingleton\b", "OS-2", "inject the instance"),
    (r"^\s*(let|var)\s+\w+\s*=", "OS-2", "module-level mutable state — make it an input"),
]
BUCKETS = ["helpers", "helper", "utils", "util", "common", "misc", "shared", "stuff"]



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


def _ts_os1(rel: str, text: str) -> list[tuple[str, int, str]]:
    """IR-40 (framework trial MF-26): OS-1 for TS/JS, PARSED. `_js_os1` above is the
    template's line-regex version, kept for reference and no longer called: it read
    `if (x === null) {` as a method named `if` with a default argument."""
    import json as _json
    import subprocess as _sp
    import tempfile as _tf
    with _tf.NamedTemporaryFile("w", suffix=Path(rel).suffix, delete=False, encoding="utf-8") as tf:
        tf.write(text)
        tmp = tf.name
    try:
        tool = Path(__file__).resolve().parent / "checks" / "ts-os1.mjs"
        r = _sp.run(["node", str(tool), tmp], capture_output=True, text=True)
    finally:
        Path(tmp).unlink(missing_ok=True)
    if r.returncode != 0:
        raise RuntimeError(f"ts-os1 failed on {rel}: {r.stderr.strip()[:200]}")
    return [tuple(x) for x in _json.loads(r.stdout or "[]")]


def os1_findings(rel: str, text: str) -> list[tuple[str, int, str]]:
    if rel.endswith(".py"):
        return _py_os1(text)
    if rel.endswith((".js", ".mjs", ".ts", ".jsx", ".tsx")):
        return _ts_os1(rel, text)
    return []

# --------------------------------------------------------- signature extraction
def signatures(rel: str, text: str) -> dict:
    """{class: {"__init__": [params], "<public op>": [params]}} for .py / .js / .ts."""
    out: dict = {}
    if rel.endswith(".py"):
        import ast
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return out
        for cls in [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]:
            ops = {}
            for fn in [n for n in cls.body if isinstance(n, ast.FunctionDef)]:
                if fn.name.startswith("_") and fn.name != "__init__":
                    continue
                a = fn.args
                ops[fn.name] = [p.arg for p in a.posonlyargs + a.args + a.kwonlyargs
                                if p.arg != "self"]
            out[cls.name] = ops
        return out
    if rel.endswith((".js", ".mjs", ".ts", ".jsx", ".tsx")):
        # IR-34 (framework trial MF-24): PARSED by the TypeScript compiler, not guessed.
        # The template's regex took the first "class <word>" anywhere (comments
        # included), read one class per file, and could not see a method with a
        # return-type annotation or a typed / destructured constructor parameter -
        # so for TypeScript the declaration comparison was blind.
        import json as _json
        import subprocess as _sp
        import tempfile as _tf
        with _tf.NamedTemporaryFile("w", suffix=Path(rel).suffix, delete=False,
                                    encoding="utf-8") as tf:
            tf.write(text)
            tmp = tf.name
        try:
            tool = Path(__file__).resolve().parent / "checks" / "ts-signatures.mjs"
            r = _sp.run(["node", str(tool), tmp], capture_output=True, text=True)
        finally:
            Path(tmp).unlink(missing_ok=True)
        if r.returncode != 0:
            raise RuntimeError(f"ts-signatures failed on {rel}: {r.stderr.strip()[:200]}")
        return _json.loads(r.stdout or "{}")
    return out

def _public_ops(rel: str, text: str) -> dict:
    sigs = signatures(rel, text)
    ops = {}
    for cls, members in sigs.items():
        for name, params in members.items():
            if name not in ("__init__", "constructor"):
                ops[name] = params
    return ops


def _contract_invariants(root: Path, cfg: dict) -> dict:
    """{operation: {inputs it legitimately ignores}} from ui/interface-contract.md."""
    f = root / (cfg.get("ui_root") or "ui") / "interface-contract.md"
    if not f.is_file():
        return {}
    try:
        lines = f.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return {}
    out, cols = {}, None
    for ln in lines:
        if not ln.startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if cols is None:
            if "Operation" in cells:
                cols = cells
            continue
        if len(cells) != len(cols) or set("".join(cells)) <= set("-: "):
            continue
        row = dict(zip(cols, cells))
        op = row.get("Operation", "").split("(")[0].strip().split(".")[-1]
        inv = row.get("Invariant to", "")
        if op and inv:
            out[op] = {x for x in re.findall(r"[A-Za-z_$][\w$]*", inv)}
    return out


def check_isolation_tests(root: Path, cfg: dict, files: list, std: dict) -> list[dict]:
    """OS-12: the test must CALL every public operation, and prove an input changes the
    answer. A construct-and-assert test is a failure, not a pass."""
    pat = std.get("isolation_test_pattern", "tests/**/*{stem}*.isolation.*")
    if not pat:
        return []
    out, tests = [], git(root, "ls-files", "tests").splitlines()
    invariant = _contract_invariants(root, cfg)
    differs = re.compile(r"not\.toBe|not\.toEqual|notEqual|assertNotEqual|!==|\bassert[^\n]*!=")
    for rel in files:
        stem = Path(rel).stem
        if stem.lower() in ("index", "types"):
            continue
        try:
            text = (root / rel).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        ops = _public_ops(rel, text)
        if not ops:
            continue
        rx = glob_to_regex(pat.replace("{stem}", stem))
        matched = [t for t in tests if rx.match(t)]
        if not matched:
            out.append(v("OS-12_no_isolation_test", "construct it with its declared inputs and "
                         "nothing else, then call every public operation", rel))
            continue
        body = ""
        for t in matched:
            try:
                body += (root / t).read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                pass
        for op, params in ops.items():
            calls = len(re.findall(rf"\.{re.escape(op)}\s*\(|\b{re.escape(op)}\s*\(", body))
            if calls == 0:
                out.append(v("OS-12_operation_untested", f"'{op}' is never called by the "
                             f"isolation test — construct-and-assert is a failure, not a pass",
                             matched[0]))
            elif params and calls < 2 and not (
                    invariant.get(op) and
                    (set(params) <= invariant[op] or "all" in invariant[op])):
                out.append(v("OS-12_input_not_varied", f"'{op}' is called once; call it twice, "
                             f"differing in one declared input, and assert the answers differ",
                             matched[0]))
        all_invariant = all(invariant.get(o) and
                            (set(p) <= invariant[o] or "all" in invariant[o])
                            for o, p in ops.items() if p)
        if ops and not all_invariant and not differs.search(body):
            out.append(v("OS-12_no_difference_assertion", "no assertion that two calls differing "
                         "in one input return different answers — that assertion is what proves "
                         "the input is declared, not hidden", matched[0]))
    return out

def check_objects(root: Path, cfg: dict) -> list[dict]:
    """OS-2, OS-3, OS-9, OS-12, as far as a scanner can see."""
    std = cfg.get("object_standard") or {}
    if std.get("skip"):
        return []
    ambient = [(re.compile(p, re.M), rule, fix) for p, rule, fix
               in (std.get("ambient_patterns") or AMBIENT)]
    buckets = std.get("bucket_names") or BUCKETS
    allow = std.get("allow") or {}          # {path_prefix: [rule, ...]}
    src_rx = glob_to_regex(cfg.get("source_glob") or "src/**")
    # IR-40: tracked AND untracked (not ignored) source. `ls-files` alone saw only
    # tracked files, so a builder running this before committing a new class got a
    # vacuous pass - MOD-03's first "objects: pass" was exactly that.
    files = [f for f in git(root, "ls-files", "--cached", "--others", "--exclude-standard").splitlines()
             if src_rx.match(f)]
    out = []

    def allowed(rel, rule):
        return any(rel.startswith(k) and rule in vals for k, vals in allow.items())

    for rel in files:
        stem = Path(rel).stem.lower()
        if stem in buckets or any(f"/{b}/" in "/" + rel.lower() for b in buckets):
            if not allowed(rel, "OS-9"):
                out.append(v("OS-9_bucket_module", "a bucket module has no owner and no "
                             "contract; name the module for what it owns", rel))
        try:
            text = (root / rel).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for rx, rule, fix in ambient:
            m = rx.search(text)
            if m and not allowed(rel, rule):
                line = text[:m.start()].count("\n") + 1
                out.append(v(f"{rule}_ambient_read", f"line {line}: /{rx.pattern}/ — an object "
                             f"may not reach outside its declared inputs; {fix}", rel))

    # OS-3: a seam declared INJECTED must not be a direct import.
    s3 = root / (cfg.get("s3_document") or "")
    if s3.is_file():
        text = s3.read_text(encoding="utf-8")
        mods, seams = {}, []
        for line in text.splitlines():
            if not line.startswith("|"):
                continue
            c = [x.strip() for x in line.strip().strip("|").split("|")]
            if len(c) >= 5 and c[0].startswith("MOD-"):
                mods[c[0]] = c[2]
            if len(c) >= 7 and c[0].startswith("SEAM-"):
                seams.append((c[0], c[1], c[2], c[6]))
        for sid, src_mod, tgt_mod, binding in seams:
            if binding.upper() != "INJECTED":
                continue
            sfile, tfile = mods.get(src_mod), mods.get(tgt_mod)
            if not sfile or not tfile or not (root / sfile).is_file():
                continue
            tstem = Path(tfile).stem
            body = (root / sfile).read_text(encoding="utf-8", errors="ignore")
            if re.search(rf"(import|require|from)\b[^\n]*\b{re.escape(tstem)}\b", body) \
                    and not allowed(sfile, "OS-3"):
                out.append(v("OS-3_decider_imported", f"{sid} declares {tgt_mod} INJECTED, but "
                             f"this file imports {tstem} directly — hand it in", sfile))

    # OS-1: nothing a method uses may arrive undeclared.
    for rel in files:
        if allowed(rel, "OS-1"):
            continue
        try:
            text = (root / rel).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for rule, line, detail in os1_findings(rel, text):
            out.append(v(rule, f"line {line}: {detail}", rel))

    # OS-12: the isolation test must call every operation and vary a declared input.
    out.extend(check_isolation_tests(root, cfg, [f for f in files if not allowed(f, "OS-12")], std))
    return out


CHECKS = {"rosters": check_rosters, "modules": check_modules,
          "tags": check_tags, "scaffold": check_scaffold, "seal": check_seal,
          "objects": check_objects}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("checks", nargs="*",
                    help=f"one or more of: {', '.join(CHECKS)} (default: all)")
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    unknown = [c for c in args.checks if c not in CHECKS]
    if unknown:
        print(f"phase4-checks: unknown check(s): {', '.join(unknown)}; "
              f"choose from {', '.join(CHECKS)}", file=sys.stderr)
        return 2

    root = Path(args.root).resolve()
    if not (root / ".git").exists():
        print(f"phase4-checks: {root} is not a git repository", file=sys.stderr)
        return 2

    cfg = load_json(root / ".metaframework" / "project.json") or {}
    selected = args.checks or list(CHECKS)

    violations = []
    for name in selected:
        violations.extend({**x, "check": name} for x in CHECKS[name](root, cfg))

    result = {"status": "fail" if violations else "pass",
              "checks_run": selected, "violations": violations}

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for x in violations:
            loc = f"{x['file']}: " if x["file"] else ""
            print(f"[{x['check']}] {loc}{x['rule']}: {x['detail']}")
        print(f"\n{len(violations)} violation(s)." if violations
              else f"phase4-checks: {', '.join(selected)} — pass")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
