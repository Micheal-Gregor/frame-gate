#!/usr/bin/env python3
"""
seal — ends Phase 4 with one sweep and a lock, and hands the repo to Phase 5.

The failure this exists to prevent: review with no end goal. Once the library is
built and reviewed, re-reviewing it produces relative verdicts, and every pass
generates documentation that the next pass audits. The seal replaces that with
one mechanical sweep, one owner decision, and a tag. After the tag, files present
at the seal are frozen (tools/gate.py refuses writes to them); new capability
arrives as NEW files through an extension run.

Subcommands:
    check                      the sweep: one pass of mechanical checks, no judgment
    apply --approved-by WHO    lock it: seal record, Phase 5 contract, ui/ skeleton, tag
          [--accept-failures]  seal with failing checks the owner triaged as known issues
    verify [--ref REF]         sealed files unchanged (working tree, or REF)
    list                       print the sealed file set
    begin-extension --s3 P [--s2 P]
                               hand a sealed repo back to Phase 4 for an extension build

Usage:
    seal.py <subcommand> [--root .] [--json]
Exit: 0 pass/done, 1 violations/refused, 2 bad invocation.

Nothing here asks a model to assess itself. Every step compares an artifact to
another artifact, or an exit code to zero.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

CLOSING_TAGS = ("k7-pass-*", "closed-by-owner*")
PHASE4_MARK = "## Phase 4 process contract"

GAPS_TEMPLATE = """\
# Gap log

Engine gaps found while surfacing the library. The test: does the feature need the engine to
decide, record, or enforce something it doesn't already? If it only changes how something is
shown, it is not a gap — build it in the view.

A claim needs evidence, not absence of memory: name the interface-contract entries checked and
the compositions tried, and why each fails. States: `noticed` → `withdrawn` (it existed; name
the operation) or `shaped` → `ready`. An entry is `ready` when all three hold: no composition of
existing operations covers it; it came up in more than one walk, or it blocks a chosen job; the
owner agrees the shaped behaviour is the real need. Ready entries go to a Phase 1–4 extension
run, batched with related entries.

| ID | User job | Engine must decide / record / enforce | Walk it came from | Lookup evidence | State |
|---|---|---|---|---|---|

## Shaped detail

(For each `shaped` or `ready` entry: inputs, outputs, rules, and a worked example taken from the
simulation. Describe the need, not a class design — Phase 1 derives the component.)
"""

CONTRACT_TEMPLATE = """\
# Interface contract

One page. What the sealed library offers a UI or an agent caller, in the terms a caller needs.
Phase 5 reads this FIRST, every session — it is the cheap answer to "can the library already
do this?", and it exists so no session ever guesses instead. Written at the seal from the
object model and the modules' public signatures; regenerated only at a re-seal. Keep it a
listing, not an explanation. NOT-YET-WRITTEN

## Objects

| Object | What it represents | Read-only to the user |
|---|---|---|

## Actions

Copied from the signatures, never written from memory of the happy path. Every cell is
required: an operation whose refusals are unwritten cannot be called safely, because a caller
cannot tell a correct refusal from a break. `Invariant to` lists any declared input the
operation legitimately ignores — the only way an OS-12 two-call test may return equal answers.

| Operation | Module | What it does | Inputs | Returns | Refusals | Side effects | Determinism | Invariant to |
|---|---|---|---|---|---|---|---|---|

## Error states

| Error | Raised by | What the user should see |
|---|---|---|
"""

SURFACE_TEMPLATE = """\
# Surface map

What the UI surfaces today. Read this instead of the codebase when simulating. Updated at the
end of every build. The utilization audit compares the operations listed here against the
library's public operations.

| View | User job | Library operations called | Faces | Built in batch |
|---|---|---|---|---|
"""


# --------------------------------------------------------------------------- helpers

def git(root: Path, *a: str, check: bool = False) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *a],
                           capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return ""
    if check and r.returncode != 0:
        raise RuntimeError(f"git {' '.join(a)} failed: {r.stderr.strip()}")
    return r.stdout.strip() if r.returncode == 0 else ""


def git_ok(root: Path, *a: str) -> bool:
    try:
        return subprocess.run(["git", "-C", str(root), *a], capture_output=True,
                              timeout=60).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


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


def load_cfg(root: Path) -> dict:
    try:
        return json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def sealed_globs(cfg: dict) -> list[str]:
    return cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]


def latest_seal(root: Path) -> str:
    tags = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    return tags[0] if tags else ""


def sealed_files(root: Path, tag: str, cfg: dict) -> set[str]:
    rx = [glob_to_regex(g) for g in sealed_globs(cfg)]
    files = git(root, "ls-tree", "-r", "--name-only", tag).splitlines()
    return {f for f in files if any(r.match(f) for r in rx)}


def changed_sealed(root: Path, tag: str, cfg: dict, ref: str | None = None) -> list[str]:
    sealed = sealed_files(root, tag, cfg)
    args = ["diff", "--name-only", tag] + ([ref] if ref else [])
    changed = set(git(root, *args).splitlines())
    if ref is None:  # working tree: also catch deletions of sealed files not yet staged
        changed |= {f for f in sealed if not (root / f).exists()}
    return sorted(changed & sealed)


def worktree_clean(root: Path) -> bool:
    return git(root, "status", "--porcelain", "--", ".", ":(exclude)STATE.json") == ""


def load_state(root: Path) -> dict:
    try:
        return json.loads((root / "STATE.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def run_shell(root: Path, cmd: str, timeout: int = 3600) -> tuple[int, str]:
    try:
        r = subprocess.run(cmd, shell=True, cwd=str(root), capture_output=True,
                           text=True, timeout=timeout)
        tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-8:])
        return r.returncode, tail
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s"


def run_tool(root: Path, script: str, *args: str) -> dict:
    p = root / "tools" / script
    if not p.is_file():
        return {"status": "fail", "violations": [{"detail": f"tools/{script} not found"}]}
    r = subprocess.run([sys.executable, str(p), *args, "--json"],
                       capture_output=True, text=True, cwd=str(root))
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"status": "fail", "violations": [{"detail": (r.stderr or r.stdout)[:300]}]}


def md_tables(path: Path) -> dict[str, list[dict]]:
    """{level-2 heading: rows of the first table under it}."""
    tables, current = {}, None
    if not path.is_file():
        return tables
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if ln.startswith("## "):
            current = ln[3:].strip(); i += 1; continue
        if ln.startswith("|") and i + 1 < len(lines) and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            cols = [c.strip() for c in ln.strip().strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                vals = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if len(vals) == len(cols):
                    rows.append(dict(zip(cols, vals)))
                i += 1
            key = current if current is not None else ""
            if key not in tables:
                tables[key] = rows
            continue
        i += 1
    return tables


def first_table(path: Path) -> list[dict]:
    t = md_tables(path)
    return next(iter(t.values()), []) if t else []


def step(name: str, ok: bool, detail: str = "") -> dict:
    return {"step": name, "status": "pass" if ok else "fail", "detail": detail}



def signatures(rel: str, text: str) -> dict:
    """{class: {"__init__"/"constructor": [params], "<public op>": [params]}}."""
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
                ops[fn.name] = [x.arg for x in a.posonlyargs + a.args + a.kwonlyargs
                                if x.arg != "self"]
            out[cls.name] = ops
        return out
    if rel.endswith((".js", ".mjs", ".ts", ".jsx", ".tsx")):
        c = re.search(r"\bclass\s+([A-Za-z_$][\w$]*)", text)
        if not c:
            return out
        ops = {}
        for m in re.finditer(r"^\s{2,}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{",
                             text, re.M):
            if m.group(1) in ("if", "for", "while", "switch", "catch"):
                continue
            names = []
            for part in re.sub(r"[{}]", "", m.group(2)).split(","):
                part = part.strip().split("=")[0].strip().lstrip(".")
                if re.match(r"^[A-Za-z_$][\w$]*$", part):
                    names.append(part)
            ops[m.group(1)] = names
        out[c.group(1)] = ops
    return out


REQUIRED_CELLS = ("Refusals", "Side effects", "Determinism")


def check_declarations(root: Path, cfg: dict) -> list[dict]:
    """The contract is copied from the signatures, not written from memory of the happy
    path. Every constructor parameter appears in the object-model 'Declared inputs' cell;
    every operation's parameter names appear in that operation's 'Inputs' cell."""
    problems: list[dict] = []

    def bad(rel_file: str, detail: str) -> None:
        problems.append({"file": rel_file, "detail": detail})

    om_rows = first_table(root / "INSTRUMENTS" / "object-model-and-parameters.md")
    contract_rows = md_tables(root / (cfg.get("ui_root") or "ui") / "interface-contract.md") \
        .get("Actions", [])
    by_file = {r.get("File", ""): r for r in om_rows if r.get("File")}
    if not om_rows:
        bad("INSTRUMENTS/object-model-and-parameters.md", "no readable module rows — a row whose "
            "cell count does not match the header is skipped, so this check would otherwise "
            "pass by default")
    if not contract_rows:
        bad("ui/interface-contract.md", "no readable '## Actions' table")
    elif not all(c in contract_rows[0] for c in REQUIRED_CELLS):
        bad("ui/interface-contract.md", f"the Actions table is missing "
            f"{[c for c in REQUIRED_CELLS if c not in contract_rows[0]]} — OS-6/7/8 have no "
            f"home, and a caller cannot tell a correct refusal from a break")
    for rel, row in by_file.items():
        f = root / rel
        if not f.is_file():
            continue
        try:
            sig = signatures(rel, f.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError):
            continue
        cell = next((val for key, val in row.items()
                     if key.lower().startswith("declared inputs")), "")
        declared = {x.strip() for x in re.split(r"[,/]", cell)
                    if x.strip() and x.strip() not in ("—", "-", "none")}
        for cls, members in sig.items():
            ctor = set(members.get("__init__", members.get("constructor", [])))
            missing, extra = ctor - declared, declared - ctor
            if missing:
                bad(rel, f"{cls}: constructor takes {sorted(missing)}, absent from the "
                         f"object-model Declared inputs cell")
            if extra:
                bad(rel, f"{cls}: object model declares {sorted(extra)}, not in the "
                         f"constructor signature")
            for op, params in members.items():
                if op in ("__init__", "constructor"):
                    continue
                # GOV-9: a class operation is matched to its own `Class.op` row; a bare-name row
                # (no class) is the fallback; another class's row of the same name never matches.
                cells = [(r.get("Operation", "").split("(")[0].strip(), r) for r in contract_rows]
                row_c = next((r for name, r in cells if name == f"{cls}.{op}"), None) or \
                    next((r for name, r in cells if name == op), None)
                if row_c is None:
                    bad(rel, f"{cls}.{op}: no row in ui/interface-contract.md (rows are matched by "
                             f"Class.operation, GOV-9)")
                    continue
                for col in REQUIRED_CELLS:
                    if col in row_c and not row_c.get(col, "").strip():
                        bad(rel, f"{cls}.{op}: the contract's {col} cell is empty — "
                                 f"'none' is an answer and must be written")
                cell = row_c.get("Inputs", "")
                named = {x for x in re.findall(r"[A-Za-z_$][\w$]*", cell)}
                for pname in params:
                    if pname not in named:
                        bad(rel, f"{cls}.{op}: parameter '{pname}' is not in its contract "
                                 f"Inputs cell")
                for n in named - set(params) - {"none", "None", "—"}:
                    if n.lower() not in ("int", "str", "float", "bool", "number", "string",
                                         "object", "list", "dict", "array", "date", "null"):
                        bad(rel, f"{cls}.{op}: contract lists '{n}', which is not a parameter "
                                 f"of the signature")
    return problems

# --------------------------------------------------------------------------- check

def s3_missing(root: Path, tables: dict) -> list[str]:
    """The S3 section-2 rows (ACTIVE or PROPOSED) whose File cell names a path that is not a file under root.

    A cell names its files as code spans, several separated by commas (GOV-10); a cell with no code span is
    read as comma-separated bare paths. A cell that names nothing fails its row, and so does any one
    missing file of several."""
    out = []
    for r in tables.get("2. Resolved partition", []):
        if r.get("Status") not in ("ACTIVE", "PROPOSED"):
            continue
        cell = r.get("File", "")
        paths = re.findall(r"`([^`]+)`", cell) or [x.strip() for x in cell.split(",") if x.strip()]
        gone = [x for x in paths if not (root / x).is_file()]
        if not paths or gone:
            out.append(f"{r.get('ID')} → {', '.join(gone) if gone else 'no file named'}")
    return out


def sweep(root: Path, cfg: dict) -> tuple[list[dict], list[str]]:
    steps: list[dict] = []

    steps.append(step("worktree-clean", worktree_clean(root),
                      "" if worktree_clean(root) else "commit or stash first; a seal covers a committed tree"))

    # The library was reviewed: the nearest closing tag covers the code being sealed.
    pats = []
    for p in CLOSING_TAGS:
        pats += ["--match", p]
    nearest = git(root, "describe", "--tags", "--abbrev=0", *pats, "HEAD")
    if not nearest:
        steps.append(step("reviewed", False,
                          "no k7-pass-* or closed-by-owner* tag reachable from HEAD; "
                          "close the last K7 gate (PASS, or owner triage) first"))
    else:
        rx = [glob_to_regex(g) for g in sealed_globs(cfg)]
        drift = [f for f in git(root, "diff", "--name-only", nearest, "HEAD").splitlines()
                 if any(r.match(f) for r in rx)]
        steps.append(step("reviewed", not drift,
                          f"covered by {nearest}" if not drift else
                          f"code changed after {nearest}: {', '.join(drift[:6])}"))

    for key, name in (("test_command", "full-suite"), ("rederive_all", "rederive-all")):
        cmd = cfg.get(key)
        if not cmd:
            steps.append(step(name, False, f"{key} undeclared in project.json"))
            continue
        code, tail = run_shell(root, cmd)
        steps.append(step(name, code == 0, f"exit {code}" + (f": {tail}" if code else "")))

    iso = cfg.get("isolation_test_command")
    if not iso:
        steps.append(step("isolation-tests", False,
                          "isolation_test_command undeclared — OS-12 is what proves a class "
                          "takes nothing it did not declare; a seal cannot stand without it"))
    else:
        code, tail = run_shell(root, iso)
        steps.append(step("isolation-tests", code == 0,
                          f"exit {code}" + (f": {tail}" if code else " (OS-12, env cleared)")))

    p4 = run_tool(root, "phase4-checks.py", "--root", str(root))
    steps.append(step("phase4-checks", p4.get("status") == "pass",
                      "; ".join(f"{x.get('check', '')}:{x.get('rule', '')} {x.get('file', '')}"
                                for x in p4.get("violations", [])[:6])))
    sc = run_tool(root, "structure-check.py", "--root", str(root))
    steps.append(step("structure-check", sc.get("status") == "pass",
                      "; ".join(f"{x.get('file', '')}:{x.get('rule', '')}"
                                for x in sc.get("violations", [])[:6])))

    s3 = cfg.get("s3_document") or ""
    s2 = cfg.get("s2_document") or ""
    if not s3:
        steps.append(step("emission-check", False, "s3_document undeclared in project.json"))
        steps.append(step("s3-coverage", False, "s3_document undeclared"))
        tables = {}
    else:
        em = run_tool(root, "emission-check.py", s3, *(["--phase2", s2] if s2 else []))
        steps.append(step("emission-check", em.get("status") == "pass",
                          "; ".join(x.get("rule", "") for x in em.get("violations", [])[:6])))
        tables = md_tables(root / s3)
        missing = s3_missing(root, tables)
        steps.append(step("s3-coverage", not missing,
                          "every specified module is built" if not missing else
                          "specified but not on disk: " + ", ".join(missing[:8])))

    contract = root / (cfg.get("ui_root") or "ui") / "interface-contract.md"
    written = contract.is_file() and "NOT-YET" + "-WRITTEN" not in contract.read_text(encoding="utf-8")
    steps.append(step("interface-contract", written,
                      "written" if written else
                      "missing or still unwritten — Phase 5 reads it first, and a caller who "
                      "cannot see an operation's refusals reports a correct refusal as a "
                      "missing object"))
    problems = check_declarations(root, cfg) if written else []
    steps.append(step("declarations-match", not problems,
                      "signatures, object model and contract agree" if not problems else
                      "; ".join(x["detail"] for x in problems[:4]) + (f" (+{len(problems) - 4} more)"
                                                 if len(problems) > 4 else "")))

    prior = latest_seal(root)
    if prior:
        broken = changed_sealed(root, prior, cfg)
        steps.append(step("prior-seal-intact", not broken,
                          f"{prior} intact" if not broken else
                          f"files sealed at {prior} changed: {', '.join(broken[:6])}"))

    carried: list[str] = []
    for r in tables.get("8. Production concerns", []):
        carried.append(f"{r.get('ID')} ({r.get('MOD')}) production concern — {r.get('Concern')} "
                       f"[{r.get('Class')}; owner {r.get('Owner')}; target {r.get('Discharge target')}]")
    for r in tables.get("6. Golden vectors (CT-5)", []):
        if r.get("State") == "DEFERRED":
            carried.append(f"{r.get('ID')} ({r.get('MOD')}) deferred vector — discharge: "
                           f"{r.get('Discharge condition')}")
    for r in tables.get("2. Resolved partition", []):
        if r.get("Status") == "DEFERRED":
            carried.append(f"{r.get('ID')} deferred module — {r.get('Module')}")
    for r in first_table(root / "INSTRUMENTS" / "completion-ledger.md"):
        st = r.get("Status", "")
        if st and st.upper() != "COMPLETE" and not st.startswith("—"):
            carried.append(f"{r.get('Module')} completion status {st}")
    return steps, carried


def print_sweep(steps: list[dict], carried: list[str]) -> None:
    for s in steps:
        mark = "PASS" if s["status"] == "pass" else "FAIL"
        print(f"  [{mark}] {s['step']:<18} {s['detail']}")
    print("\n  Carried forward (input to Phase 5's latency / scale / security review):")
    for c in carried or ["(nothing)"]:
        print(f"    - {c}")


# --------------------------------------------------------------------------- apply

def cmd_apply(root: Path, cfg: dict, approved_by: str, accept_failures: bool) -> int:
    st = load_state(root)
    if str(st.get("phase", 4)) == "5":
        print("seal: STATE.json says phase 5 — the library is already sealed. An extension "
              "build starts with `seal.py begin-extension`.", file=sys.stderr)
        return 1
    contract = root / "governance" / "contracts" / "CLAUDE-phase5.md"
    if not contract.is_file():
        print(f"seal: {contract.relative_to(root)} missing; the Phase 5 contract is what "
              f"replaces the Phase 4 one. Install it from the phase4-build template.",
              file=sys.stderr)
        return 1

    steps, carried = sweep(root, cfg)
    failed = [s for s in steps if s["status"] == "fail"]
    hard = [s for s in failed if s["step"] in ("worktree-clean", "prior-seal-intact")]
    if hard:
        print_sweep(steps, carried)
        print("\nseal: refused — a dirty tree or a broken prior seal cannot be accepted "
              "as a known issue.", file=sys.stderr)
        return 1
    if failed and not accept_failures:
        print_sweep(steps, carried)
        print("\nseal: refused — checks failed. Owner triage: fix now (one round), or record "
              "them as known issues in RESOLUTION_RECORD.md and re-run with --accept-failures.",
              file=sys.stderr)
        return 1

    n = int(latest_seal(root).split("-")[-1]) + 1 if latest_seal(root) else 1
    tag = f"seal-{n}"
    today = datetime.now(timezone.utc).date().isoformat()
    concept = st.get("concept") or cfg.get("concept") or root.name

    # 1. Seal record (appended; INSTRUMENTS/ is ledger).
    rec = root / "INSTRUMENTS" / "seal-record.md"
    head = "" if rec.is_file() else (
        "# Seal record\n\nOne section per seal. Each lists the sweep result, what the owner "
        "accepted, and what is carried forward to Phase 5's latency / scale / security review.\n")
    sec = [f"\n## {tag} — {today} — approved by {approved_by}\n",
           f"Sealed paths: files matching {', '.join(sealed_globs(cfg))} present at this tag.\n",
           "| Step | Result | Detail |", "|---|---|---|"]
    sec += [f"| {s['step']} | {s['status']} | {s['detail'].replace('|', '/')[:160]} |" for s in steps]
    if failed:
        sec += ["", "**Accepted as known issues (owner triage, see RESOLUTION_RECORD.md):** "
                + ", ".join(s["step"] for s in failed)]
    sec += ["", "**Carried forward:**", ""] + [f"- {c}" for c in carried or ["(nothing)"]]
    rec.parent.mkdir(exist_ok=True)
    rec.write_text((rec.read_text(encoding="utf-8") if rec.is_file() else head)
                   + "\n".join(sec) + "\n", encoding="utf-8")

    # 2. Retire the Phase 4 resident contract; install the Phase 5 one.
    claude = root / "CLAUDE.md"
    archive = root / "governance" / "archive" / f"CLAUDE-{tag}.md"
    archive.parent.mkdir(parents=True, exist_ok=True)
    if claude.is_file():
        archive.write_text(claude.read_text(encoding="utf-8"), encoding="utf-8")
    claude.write_text(f"# {concept} — Phase 5 (library sealed at `{tag}`)\n\n"
                      f"The engine build instruction is archived at "
                      f"`governance/archive/CLAUDE-{tag}.md`. Read it only to find operation "
                      f"names.\n\n" + contract.read_text(encoding="utf-8"), encoding="utf-8")

    # 3. The UI tree's working files, if this is the first seal.
    ui = root / (cfg.get("ui_root") or "ui")
    ui.mkdir(exist_ok=True)
    for name, body in (("gaps.md", GAPS_TEMPLATE), ("surface-map.md", SURFACE_TEMPLATE),
                       ("interface-contract.md", CONTRACT_TEMPLATE)):
        if not (ui / name).exists():
            (ui / name).write_text(body, encoding="utf-8")

    # 4. State, commit, tag.
    subprocess.run([sys.executable, str(root / "tools" / "state.py"), "set", "phase=5",
                    "current_module=",
                    "next_action=Phase 5 — Simulate: propose candidate features from ui/surface-map.md",
                    "--root", str(root)], capture_output=True, text=True)
    git(root, "add", "-A", "--", "CLAUDE.md", "governance/archive", "INSTRUMENTS/seal-record.md",
        str(ui.relative_to(root)), "STATE.json", check=True)
    git(root, "commit", "-m", f"{tag}: library sealed ({approved_by}); Phase 5 contract installed",
        check=True)
    git(root, "tag", "-a", tag, "-m", f"Library sealed {today}, approved by {approved_by}",
        check=True)
    subprocess.run([sys.executable, str(root / "tools" / "state.py"), "refresh",
                    "--root", str(root)], capture_output=True, text=True)
    files = sealed_files(root, tag, cfg)
    print(f"seal: {tag} applied — {len(files)} files frozen. Phase 5 contract installed; "
          f"STATE phase=5. Carried forward: {len(carried)} item(s), see INSTRUMENTS/seal-record.md.")
    return 0


# --------------------------------------------------------------------------- extension

def cmd_begin_extension(root: Path, cfg: dict, s3: str, s2: str | None) -> int:
    tag = latest_seal(root)
    if not tag:
        print("seal: no seal-* tag; there is nothing to extend. Seal first.", file=sys.stderr)
        return 1
    if not worktree_clean(root):
        print("seal: working tree dirty; commit first.", file=sys.stderr)
        return 1
    for label, p in (("--s3", s3), ("--s2", s2)):
        if p is None:
            continue
        if not p.startswith("governance/S3/") or not git_ok(root, "ls-files", "--error-unmatch", p):
            print(f"seal: {label} {p} must be committed under governance/S3/ (the owner commits "
                  f"and tags the extension's Phase 3 export, as at the first anchor).",
                  file=sys.stderr)
            return 1
    contract = root / "governance" / "contracts" / "phase4-contract.md"
    if not contract.is_file():
        print(f"seal: {contract.relative_to(root)} missing.", file=sys.stderr)
        return 1

    (root / "CLAUDE.md").write_text(
        (root / s3).read_text(encoding="utf-8").rstrip("\n") + "\n\n---\n\n"
        + f"> Extension build over `{tag}`. Files present at `{tag}` are frozen (gate.py); "
        f"build new modules only.\n\n" + contract.read_text(encoding="utf-8"), encoding="utf-8")

    pj = root / ".metaframework" / "project.json"
    data = load_cfg(root)
    data["s3_document"] = s3
    if s2:
        data["s2_document"] = s2
    pj.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    subprocess.run([sys.executable, str(root / "tools" / "state.py"), "set", "phase=4",
                    "current_module=", f"next_action=Extension build over {tag}: run the C4 anchor on {s3}",
                    "--root", str(root)], capture_output=True, text=True)
    git(root, "add", "-A", "--", "CLAUDE.md", ".metaframework/project.json", "STATE.json", check=True)
    git(root, "commit", "-m", f"begin extension over {tag}: {s3}", check=True)
    print(f"seal: extension started over {tag}. CLAUDE.md now carries {s3} plus the Phase 4 "
          f"contract; STATE phase=4. Next: the C4 anchor.")
    return 0


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["check", "apply", "verify", "list", "begin-extension",
                                    "declarations"])
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--approved-by")
    ap.add_argument("--accept-failures", action="store_true")
    ap.add_argument("--ref")
    ap.add_argument("--s3")
    ap.add_argument("--s2")
    a = ap.parse_args()

    root = Path(a.root).resolve()
    if not (root / ".git").exists():
        print(f"seal: {root} is not a git repository", file=sys.stderr)
        return 2
    cfg = load_cfg(root)

    if a.cmd == "declarations":
        problems = check_declarations(root, cfg)
        if a.json:
            print(json.dumps({"status": "fail" if problems else "pass",
                              "problems": problems}, indent=2))
        else:
            for x in problems:
                print(f"{x['file']}: {x['detail']}")
        return 1 if problems else 0

    if a.cmd == "check":
        steps, carried = sweep(root, cfg)
        ok = all(s["status"] == "pass" for s in steps)
        if a.json:
            print(json.dumps({"status": "pass" if ok else "fail", "steps": steps,
                              "carried": carried}, indent=2))
        else:
            print_sweep(steps, carried)
            print("\nseal check: " + ("pass — ready for the owner's seal decision" if ok else
                  "fail — owner triage: fix now (one round), or known issue"))
        return 0 if ok else 1

    if a.cmd == "apply":
        if not a.approved_by:
            print("seal: --approved-by is required. The seal is the owner's decision, "
                  "recorded with their name and the date.", file=sys.stderr)
            return 2
        return cmd_apply(root, cfg, a.approved_by, a.accept_failures)

    if a.cmd == "begin-extension":
        if not a.s3:
            print("seal: begin-extension needs --s3 governance/S3/<...>_Phase3.md", file=sys.stderr)
            return 2
        return cmd_begin_extension(root, cfg, a.s3, a.s2)

    tag = latest_seal(root)
    if not tag:
        print("seal: no seal-* tag yet." if not a.json else json.dumps({"status": "pass", "seal": None}))
        return 0
    if a.cmd == "list":
        print("\n".join(sorted(sealed_files(root, tag, cfg))))
        return 0

    broken = changed_sealed(root, tag, cfg, a.ref)
    if a.json:
        print(json.dumps({"status": "fail" if broken else "pass", "seal": tag, "changed": broken}))
    else:
        print(f"seal verify: {tag} intact" if not broken else
              f"seal verify: {tag} BROKEN — sealed files changed:\n  " + "\n  ".join(broken))
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
