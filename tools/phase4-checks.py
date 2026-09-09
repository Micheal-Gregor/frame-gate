#!/usr/bin/env python3
"""
phase4-checks — the four gates buildable today, against Phase 4 instruments
whose columns are already fixed. No S3 parsing required.

  rosters   Governance copies in the repo match the authoritative skill rosters.
            Catches the stale-template class: repo copies missing RD-9..16 and
            A-1..A-4 while CLAUDE.md instructs every session to read them.
  modules   CC-1, for real. Every module in object-model-and-parameters.md has
            its File on disk, and every source file is claimed by a module.
  tags      Every k7-pass-N tag has a verdict whose reviewed.tree_sha equals the
            tree that tag points at. Makes tags evidence instead of assertion.
  scaffold  RD-14: no scaffold markers survive into committed artifacts.

Usage:
    phase4-checks.py [--root .] [--json] [rosters modules tags scaffold]
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
DEFAULT_EXEMPT = [".metaframework/", "tools/",
                  "governance/S2-S3-emission-contract.md",
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


CHECKS = {"rosters": check_rosters, "modules": check_modules,
          "tags": check_tags, "scaffold": check_scaffold}


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
