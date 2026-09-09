#!/usr/bin/env python3
"""
emission-check — validates S2/S3 documents against the Emission Contract v1.0.

Fails on a renamed heading, a missing or reordered section, a wrong column set,
a malformed or duplicated ID, an unknown cross-reference, a status outside the
enum, a DEFERRED vector with no discharge condition, an orphaned object or
module, or an object mapped to more than one module.

Usage:
    emission-check.py CLAUDE_Foo_Phase2.md
    emission-check.py CLAUDE_Foo_Phase3.md --phase2 CLAUDE_Foo_Phase2.md
    emission-check.py <doc> [--phase2 <doc>] [--json]

Cross-document checks (every OBJ mapped exactly once) require --phase2 when
validating a Phase 3 document; without it those checks are skipped and reported.

Exit codes: 0 pass, 1 violations, 2 bad invocation.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ID_RE = re.compile(r"^[A-Z]+-[0-9]{2,}$")
ENTITY_STATUS = {"PROPOSED", "ACTIVE", "DEFERRED", "DISCHARGED", "SUPERSEDED", "REFUSED"}
READINESS = {"NOT_STARTED", "BUILT", "COMPLETE", "BLOCKED"}
VECTOR_STATE = {"COMPUTED", "DEFERRED"}

PHASE2 = {
    "name": "Phase 2",
    "filename": re.compile(r"^CLAUDE_.+_Phase2\.md$"),
    "headings": [
        "1. Concept and S1 provenance",
        "2. Expressed Object Model",
        "3. Admitted family",
        "4. Refused edges and abstractions",
        "5. Admitted exceptions",
        "6. Carried judgment for Phase 3",
        "7. Open questions",
    ],
    "tables": {
        "2. Expressed Object Model": {
            "columns": ["ID", "Node", "Kind", "Tag", "Traces to", "Status"],
            "id_prefix": "OBJ", "status_col": "Status", "status_enum": ENTITY_STATUS,
        },
        "4. Refused edges and abstractions": {
            "columns": ["ID", "Refused item", "Kind", "Reason", "Preserved as"],
            "id_prefix": None,
        },
        "5. Admitted exceptions": {
            "columns": ["ID", "Exception", "Scope", "Justification", "Status"],
            "id_prefix": "AE", "status_col": "Status", "status_enum": ENTITY_STATUS,
        },
    },
}

PHASE3 = {
    "name": "Phase 3",
    "filename": re.compile(r"^CLAUDE_.+_Phase3\.md$"),
    "headings": [
        "1. Disambiguation header",
        "2. Resolved partition",
        "3. Object-to-module map",
        "4. Seam contracts",
        "5. Refusal tests (CT-4)",
        "6. Golden vectors (CT-5)",
        "7. Hook manifest (CT-6)",
        "8. Production concerns",
        "9. Open decision gates",
        "10. Build order",
        "11. Module completion checklist",
    ],
    "tables": {
        "2. Resolved partition": {
            "columns": ["ID", "Module", "File", "Owns OBJ", "Status"],
            "id_prefix": "MOD", "status_col": "Status", "status_enum": ENTITY_STATUS,
        },
        "3. Object-to-module map": {
            "columns": ["OBJ", "MOD", "Role"], "id_prefix": None,
        },
        "4. Seam contracts": {
            "columns": ["ID", "Source MOD", "Target MOD", "Transferred value",
                        "Dependency requirement", "Validation rule"],
            "id_prefix": "SEAM",
        },
        "5. Refusal tests (CT-4)": {
            "columns": ["ID", "MOD", "Invariant", "Forbidden input",
                        "Expected rejection", "Test name"],
            "id_prefix": "REF",
        },
        "6. Golden vectors (CT-5)": {
            "columns": ["ID", "MOD", "Pinned value", "Rule", "Input", "Output",
                        "Encoding", "State", "Discharge condition"],
            "id_prefix": "VEC", "status_col": "State", "status_enum": VECTOR_STATE,
        },
        "7. Hook manifest (CT-6)": {
            "columns": ["ID", "MOD", "Trigger", "Condition", "Block action",
                        "Registered at"],
            "id_prefix": "HOOK",
        },
        "8. Production concerns": {
            "columns": ["ID", "MOD", "Concern", "Class", "Owner", "Discharge target"],
            "id_prefix": "PC",
        },
        "11. Module completion checklist": {
            "columns": ["MOD", "CT-1", "CT-2", "CT-3", "CT-4", "CT-5", "CT-6",
                        "PC enum", "Readiness"],
            "id_prefix": None, "status_col": "Readiness", "status_enum": READINESS,
        },
    },
}


def parse(path: Path) -> tuple[list[str], dict[str, list[dict]]]:
    """Return (ordered level-2 headings, {heading: [row dicts]})."""
    headings: list[str] = []
    tables: dict[str, list[dict]] = {}
    current = None
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if line.startswith("## "):
            current = line[3:].strip()
            headings.append(current)
            i += 1
            continue
        if line.startswith("|") and i + 1 < len(lines) and \
                re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            cols = [c.strip() for c in line.strip().strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                vals = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if len(vals) == len(cols):
                    rows.append(dict(zip(cols, vals)))
                i += 1
            if current is not None:
                tables.setdefault(current, []).append({"__columns__": cols,
                                                       "__rows__": rows})
            continue
        i += 1
    return headings, tables


def v(f, rule, detail):
    return {"file": f, "rule": rule, "detail": detail}


def check(path: Path, spec: dict, phase2_path: Path | None) -> list[dict]:
    f = path.name
    out: list[dict] = []

    if not spec["filename"].match(f):
        out.append(v(f, "filename", f"expected {spec['filename'].pattern}"))

    headings, tables = parse(path)
    got = [h for h in headings if h in spec["headings"]]
    for want in spec["headings"]:
        if want not in headings:
            out.append(v(f, "heading_missing", f"'## {want}'"))
    if got != [h for h in spec["headings"] if h in got]:
        out.append(v(f, "heading_order",
                     "sections out of contract order; numbering is load-bearing "
                     "(completion-ledger cites S3 §11)"))

    seen_ids: dict[str, str] = {}
    data: dict[str, list[dict]] = {}

    for section, tspec in spec["tables"].items():
        blocks = tables.get(section)
        if not blocks:
            out.append(v(f, "table_missing", f"no table under '## {section}'"))
            continue
        block = blocks[0]
        if block["__columns__"] != tspec["columns"]:
            out.append(v(f, "column_mismatch",
                         f"'{section}' has {block['__columns__']}, "
                         f"contract requires {tspec['columns']}"))
            continue
        rows = block["__rows__"]
        data[section] = rows

        for n, row in enumerate(rows, 1):
            if tspec.get("id_prefix"):
                rid = row.get("ID", "")
                if not ID_RE.match(rid):
                    out.append(v(f, "id_format", f"'{section}' row {n}: '{rid}'"))
                elif not rid.startswith(tspec["id_prefix"] + "-"):
                    out.append(v(f, "id_format", f"'{section}' row {n}: '{rid}' "
                                                 f"must use prefix {tspec['id_prefix']}-"))
                elif rid in seen_ids:
                    first = seen_ids[rid]
                    where = (f"twice in '{section}' (rows {first[1]} and {n})"
                             if first[0] == section
                             else f"in '{first[0]}' row {first[1]} and '{section}' row {n}")
                    out.append(v(f, "id_duplicate", f"'{rid}' appears {where}; "
                                                    f"IDs are never reused"))
                else:
                    seen_ids[rid] = (section, n)
            sc = tspec.get("status_col")
            if sc and row.get(sc, "") not in tspec["status_enum"]:
                out.append(v(f, "enum_value", f"'{section}' row {n}: {sc}="
                                              f"'{row.get(sc, '')}' not in "
                                              f"{sorted(tspec['status_enum'])}"))

    if spec is not PHASE3:
        return out

    mods = {r["ID"] for r in data.get("2. Resolved partition", []) if "ID" in r}

    def ref(section, col, universe, label):
        for n, row in enumerate(data.get(section, []), 1):
            val = row.get(col, "")
            if val and val not in universe:
                out.append(v(f, "id_unknown_reference",
                             f"'{section}' row {n}: {col}='{val}' is not a {label}"))

    for sec in ["5. Refusal tests (CT-4)", "6. Golden vectors (CT-5)",
                "7. Hook manifest (CT-6)", "8. Production concerns",
                "3. Object-to-module map"]:
        ref(sec, "MOD", mods, "module in §2")
    for col in ("Source MOD", "Target MOD"):
        ref("4. Seam contracts", col, mods, "module in §2")
    ref("11. Module completion checklist", "MOD", mods, "module in §2")

    for n, row in enumerate(data.get("6. Golden vectors (CT-5)", []), 1):
        if row.get("State") == "DEFERRED" and not row.get("Discharge condition"):
            out.append(v(f, "deferred_without_discharge",
                         f"§6 row {n} ({row.get('ID')}): a deferred vector with no "
                         f"discharge condition is an omission, not a deferral"))

    seamed = set()
    for row in data.get("4. Seam contracts", []):
        seamed.update({row.get("Source MOD", ""), row.get("Target MOD", "")})
    for m in sorted(mods - seamed):
        out.append(v(f, "orphan_module", f"{m} is neither source nor target of any seam"))

    mapped = [r.get("OBJ", "") for r in data.get("3. Object-to-module map", [])]
    for o in sorted({o for o in mapped if mapped.count(o) > 1}):
        out.append(v(f, "object_mapped_twice",
                     f"{o} appears {mapped.count(o)}x in §3; the invariant is "
                     f"'exactly one Phase 3 destination'"))

    if phase2_path is None:
        out.append(v(f, "cross_document_skipped",
                     "--phase2 not supplied; 'every OBJ mapped exactly once' unverified"))
    else:
        _, p2t = parse(phase2_path)
        blocks = p2t.get("2. Expressed Object Model")
        objs = {r["ID"] for r in blocks[0]["__rows__"]} if blocks else set()
        for o in sorted(objs - set(mapped)):
            out.append(v(f, "orphan_object", f"{o} from Phase 2 §2 is not mapped in §3"))
        for o in sorted(set(mapped) - objs - {""}):
            out.append(v(f, "id_unknown_reference",
                         f"§3 maps '{o}', which is not an object in Phase 2 §2"))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("document")
    ap.add_argument("--phase2", help="Phase 2 doc, for cross-document checks")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    path = Path(args.document)
    if not path.is_file():
        print(f"emission-check: no such file: {path}", file=sys.stderr)
        return 2

    spec = PHASE3 if "Phase3" in path.name else PHASE2 if "Phase2" in path.name else None
    if spec is None:
        print("emission-check: cannot infer phase; filename must contain "
              "Phase2 or Phase3", file=sys.stderr)
        return 2

    p2 = Path(args.phase2) if args.phase2 else None
    if p2 and not p2.is_file():
        print(f"emission-check: no such file: {p2}", file=sys.stderr)
        return 2

    violations = check(path, spec, p2)
    result = {"status": "fail" if violations else "pass", "violations": violations}

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for x in violations:
            print(f"{x['file']}: [{x['rule']}] {x['detail']}")
        print(f"\n{len(violations)} violation(s)." if violations
              else f"emission-check: {spec['name']} document conforms.")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
