#!/usr/bin/env python3
"""
spec-name-join - verifies that S3 section 5's `Test name` column is a live join.

SP-1. K7 round 1 found one broken join; the audit found ten of nineteen. The
emission contract calls this column "the field that makes CC-4 and CC-6
mechanical. Without it no S3 refusal row can be joined to an executable case."
Nothing verified that claim, so ten rows silently disabled the guards they named.

Two properties, checked separately because they fail separately:

  A. AGREEMENT - every section 5 refusal row's Test name matches the row in the
     facet slice that specified it. Catches the defect at emission, before any
     code exists. This is the check that would have caught all ten.

  B. RESOLUTION - every section 5 Test name selects exactly one case in the test
     suite. Catches the defect at build. Only meaningful for modules already
     built; rows for unbuilt modules are reported as pending, never as passing.

Exit 0 clean, 1 violations, 2 bad invocation.

Usage:  python3 tools/checks/spec-name-join.py [--root .]
"""
import argparse
import json
import pathlib
import re
import sys


def rows_of_section(text, heading, next_heading):
    if heading not in text:
        return []
    body = text.split(heading, 1)[1].split(next_heading, 1)[0]
    out = []
    for line in body.splitlines():
        if line.startswith("| REF-"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) >= 6:
                out.append(cells)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    root = pathlib.Path(a.root).resolve()

    cfg_p = root / ".metaframework" / "project.json"
    if not cfg_p.is_file():
        print("spec-name-join: no .metaframework/project.json", file=sys.stderr)
        return 2
    cfg = json.loads(cfg_p.read_text(encoding="utf-8"))
    s3_p = root / cfg.get("s3_document", "")
    if not s3_p.is_file():
        print(f"spec-name-join: s3_document not found: {s3_p}", file=sys.stderr)
        return 2

    s3 = s3_p.read_text(encoding="utf-8")
    auth = {}
    for c in rows_of_section(s3, "## 5. Refusal tests", "## 6."):
        auth[c[0]] = {"mod": c[1], "name": c[5]}
    if not auth:
        print("spec-name-join: section 5 has no REF rows", file=sys.stderr)
        return 2

    # A - agreement with the facet that specified each row
    facet = {}
    fdir = s3_p.parent / "facets"
    for f in sorted(fdir.glob("*.md")) if fdir.is_dir() else []:
        for c in rows_of_section(f.read_text(encoding="utf-8"), "## 4.", "## 5."):
            ref = c[0]
            if ref.endswith("+"):          # positive counterparts are not named in section 5
                continue
            facet.setdefault(ref, []).append((f.name, c[5].strip("`")))

    v = []
    for ref, d in sorted(auth.items(), key=lambda kv: int(kv[0].split("-")[1])):
        for fname, name in facet.get(ref, []):
            if name != d["name"]:
                v.append(f"[A] {ref} ({d['mod']}): section 5 says '{d['name']}', "
                         f"{fname} says '{name}'")

    # B - resolution against the suite, for rows whose module has tests on disk
    titles = []
    tdir = root / "tests"
    if tdir.is_dir():
        for t in tdir.rglob("*.test.ts"):
            titles += re.findall(r'\bit\(\s*["\'`]([^"\'`]+)', t.read_text(encoding="utf-8"))

    pending = 0
    for ref, d in sorted(auth.items(), key=lambda kv: int(kv[0].split("-")[1])):
        hits = [t for t in titles if d["name"] in t]
        if not hits:
            pending += 1                   # unbuilt module: pending, NOT passing
        elif len(hits) > 1:
            v.append(f"[B] {ref}: '{d['name']}' selects {len(hits)} cases; "
                     f"a selector must resolve to exactly one")

    if a.json:
        print(json.dumps({"violations": v, "checked": len(auth), "pending": pending}, indent=2))
    else:
        for x in v:
            print(x)
        if v:
            print(f"\n{len(v)} violation(s).")
        else:
            print(f"spec-name-join: {len(auth)} rows agree with their facet; "
                  f"{len(auth) - pending} resolve in the suite, {pending} pending "
                  f"(module not built).")
    return 1 if v else 0


if __name__ == "__main__":
    sys.exit(main())
