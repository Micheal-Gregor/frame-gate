#!/usr/bin/env python3
"""
k7-run — spawns the K7 review as a SUBPROCESS and writes a schema-valid verdict.

The separation is the point. The reviewer runs in its own process with its own
context and a read-only tool allowlist; the only channel between builder and
reviewer is the filesystem. This is the two-session workflow with the courier
automated, which is what worked before it was collapsed into an in-session agent.

The runner owns every field that asserts independence — reviewed.*, reviewer.*,
preflight.*, progress. The reviewer supplies only checks, drift_score, verdict,
blocking, next_action. Anything the reviewer says about the other fields is
discarded, because a party cannot certify its own independence.

Usage:
    k7-run.py [--root .] [--modules MOD-01,MOD-02] [--timeout 1800] [--dry-run]
Exit: 0 verdict written (any verdict), 1 preflight/validation failure, 2 usage.
"""

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

RUNNER_OWNED = ("reviewed", "reviewer", "preflight", "progress", "schema_version")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def git(root: Path, *a: str) -> str:
    r = subprocess.run(["git", "-C", str(root), *a],
                       capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def die(msg: str, code: int = 1) -> int:
    print(f"k7-run: {msg}", file=sys.stderr)
    return code


def run_tool(root: Path, script: str, *args: str) -> dict:
    """Run a checker with --json and return its result object."""
    p = root / "tools" / script
    if not p.is_file():
        return {"status": "fail", "violations": [
            {"file": script, "rule": "checker_absent",
             "detail": f"tools/{script} not found; preflight cannot run"}]}
    r = subprocess.run([sys.executable, str(p), *args, "--json"],
                       capture_output=True, text=True, cwd=str(root))
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"status": "fail", "violations": [
            {"file": script, "rule": "checker_unparseable",
             "detail": (r.stderr or r.stdout or "no output")[:300]}]}


def next_round(inst: Path) -> int:
    ns = [int(m.group(1)) for p in inst.glob("k7-verdict-*.json")
          if (m := re.search(r"k7-verdict-(\d+)\.json$", p.name))]
    return max(ns) + 1 if ns else 1


def load_prior(inst: Path, rnd: int) -> dict | None:
    if rnd <= 1:
        return None
    p = inst / f"k7-verdict-{rnd - 1}.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def failing(verdict: dict) -> list[str]:
    return sorted(k for k, v in (verdict.get("checks") or {}).items()
                  if v.get("status") == "fail")


PROMPT = """\
You are the K7 conformance reviewer. You are running in a separate process from
the builder. You have not seen the builder's conversation and must not ask for it.

Repository root: {root}
Frozen S3:       {s3}
Round:           {rnd}
Modules in scope: {modules}

Run the CC-1..CC-7 battery defined in your agent file against the working tree.
Use only the declared commands:
  full suite:      {test_command}
  single test:     {test_select}
  re-derive all:   {rederive_all}

Leave the working tree byte-identical. Restore anything you mutate and verify
with `git diff --quiet`.

Return ONE JSON object and nothing else, with exactly these keys:
  checks       object; one entry per check id. Each: {{"status": "pass"|"fail"|
               "not_applicable", "mechanical": bool, and either "evidence":
               {{"command": str, "exit_code": int}} when mechanical is true, or
               "rationale": str when it is false}}
  drift_score  {{"value": 1-10, "basis": [{{"check_id", "finding", "deduction"}}]}}
               A bare number is rejected. Every deduction names a check and a
               specific finding. deduction is a POSITIVE MAGNITUDE, integer 0-9 -
               the number of points removed, not a signed adjustment. Write 1,
               never -1.
  verdict      "PASS" | "RETURN" | "HALT"
  blocking     array of {{"check_id", "module", "required_change"}}; required
               non-empty unless verdict is PASS
  next_action  one imperative sentence

Do not emit reviewed, reviewer, preflight, progress, or schema_version. The
runner computes those and will discard yours.
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--modules", default="")
    ap.add_argument("--timeout", type=int, default=1800)
    ap.add_argument("--dry-run", action="store_true",
                    help="run preflight and print the prompt; spawn nothing")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not (root / ".git").exists():
        return die(f"{root} is not a git repository", 2)

    try:
        import jsonschema
    except ImportError:
        return die("jsonschema not installed (pip install jsonschema). A gate "
                   "that cannot validate its own output is not a gate.", 2)

    cfg_path = root / ".metaframework" / "project.json"
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return die(f"cannot read {cfg_path}: {e}", 2)

    schema_path = root / "governance" / "k7-verdict.schema.json"
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return die(f"cannot read {schema_path}: {e}", 2)

    inst = root / "INSTRUMENTS"
    inst.mkdir(exist_ok=True)

    # ---- preflight -------------------------------------------------------
    # STATE.json is excluded: the SessionStart hook rewrites it on every session,
    # so counting it would make the tree permanently dirty and block every review.
    # It is session bookkeeping, not reviewed content.
    def worktree_clean() -> bool:
        return git(root, "status", "--porcelain", "--",
                   ".", ":(exclude)STATE.json") == ""

    clean_before = worktree_clean()
    struct = run_tool(root, "structure-check.py", "--root", str(root))
    s3_doc = cfg.get("s3_document") or ""
    p2_doc = cfg.get("s2_document") or ""
    if s3_doc:
        em = run_tool(root, "emission-check.py", s3_doc,
                      *(["--phase2", p2_doc] if p2_doc else []))
        struct = {"status": "fail" if "fail" in (struct["status"], em["status"]) else "pass",
                  "violations": struct["violations"] + em["violations"]}

    if not clean_before:
        return die("working tree is dirty; K7 reviews a committed tree only")
    if struct["status"] == "fail":
        for v in struct["violations"][:10]:
            print(f"  {v.get('file','')}: {v.get('rule')}: {v.get('detail')}",
                  file=sys.stderr)
        return die(f"preflight failed with {len(struct['violations'])} violation(s); "
                   f"K7 not spawned")

    tree = git(root, "rev-parse", "HEAD^{tree}")
    commit = git(root, "rev-parse", "HEAD")
    anchor = git(root, "tag", "-l", "s3-anchor-*").splitlines()
    rnd = next_round(inst)
    prior = load_prior(inst, rnd)
    modules = [m for m in args.modules.split(",") if m] or ["(all)"]

    prompt = PROMPT.format(
        root=root, s3=s3_doc or "(governance/S3)", rnd=rnd,
        modules=", ".join(modules),
        test_command=cfg.get("test_command") or "(undeclared)",
        test_select=cfg.get("test_select") or "(undeclared)",
        rederive_all=cfg.get("rederive_all") or "(undeclared)")

    if args.dry_run:
        print(prompt)
        return 0

    agent = cfg.get("reviewer_agent") or ".claude/agents/k7-reviewer.md"
    # `or` not a get() default: an explicit null means "use the default".
    cmd_t = (cfg.get("reviewer_command")
             or "claude -p --agent-file {agent_file} --output-format json")
    cmd = shlex.split(cmd_t.format(agent_file=agent))

    started = now()
    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                              timeout=args.timeout, cwd=str(root),
                              env={**os.environ, "CLAUDE_NO_RESUME": "1"})
    except FileNotFoundError:
        return die(f"reviewer command not found: {cmd[0]}. Set reviewer_command "
                   f"in project.json.", 2)
    except subprocess.TimeoutExpired:
        return die(f"reviewer exceeded {args.timeout}s; no verdict written")
    completed = now()

    raw = proc.stdout.strip()
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        return die(f"reviewer emitted no JSON object.\n--- stdout ---\n{raw[:600]}\n"
                   f"--- stderr ---\n{proc.stderr[:400]}")
    try:
        supplied = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return die(f"reviewer JSON unparseable: {e}")

    # The reviewer does not get to certify its own independence.
    for k in RUNNER_OWNED:
        supplied.pop(k, None)

    clean_after = worktree_clean()

    verdict = {
        "schema_version": "1.0",
        "concept": cfg.get("concept") or root.name,
        "round": rnd,
        "reviewed": {
            "tree_sha": tree, "commit_sha": commit,
            "s3_anchor_tag": anchor[-1] if anchor else "s3-anchor-v1.0",
            "modules": modules,
        },
        "reviewer": {
            "agent": "k7-reviewer", "invocation": "subprocess",
            "builder_transcript_seen": False,
            "started_at": started, "completed_at": completed,
        },
        "preflight": {
            "structure_check": struct,
            "worktree_clean_before": clean_before,
            "worktree_clean_after": clean_after,
        },
        "progress": None if prior is None else {
            "prior_round": prior.get("round", rnd - 1),
            "prior_tree_sha": (prior.get("reviewed") or {}).get("tree_sha", "0" * 40),
            "prior_failing_checks": failing(prior),
            "changed": not ((prior.get("reviewed") or {}).get("tree_sha") == tree
                            and failing(prior) == failing(supplied)),
        },
        **supplied,
    }

    if verdict.get("progress") and not verdict["progress"]["changed"]:
        verdict["verdict"] = "HALT"          # schema requires it; make it so
        verdict.setdefault("blocking", [])
        if not verdict["blocking"]:
            verdict["blocking"] = [{
                "check_id": "progress", "module": "(all)",
                "required_change": "Round changed neither the tree nor the failing "
                                   "set. Loop is not converging; owner triage."}]

    try:
        jsonschema.validate(verdict, schema)
    except jsonschema.ValidationError as e:
        raw_out = inst / f"k7-raw-{rnd}.json"; raw_out.write_text(m.group(0), encoding="utf-8")
        return die(f"verdict failed schema at {path}: {e.message}\n"
                   f"No verdict written. The reviewer's output was non-conforming.\n"
                   f"Raw output preserved at {raw_out}.")

    out = inst / f"k7-verdict-{rnd}.json"
    with tempfile.NamedTemporaryFile("w", dir=str(inst), delete=False,
                                     encoding="utf-8") as tmp:
        json.dump(verdict, tmp, indent=2)
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_name = tmp.name
    os.replace(tmp_name, out)

    print(f"k7-run: round {rnd} -> {verdict['verdict']} "
          f"(drift {verdict['drift_score']['value']}) written to {out.name}")
    if not clean_after:
        print("k7-run: WARNING reviewer left the tree dirty; verdict records it",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
