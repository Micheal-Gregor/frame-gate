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

Round cap (RD-9, enforced here): PASS, or ONE fix round + ONE re-check, then
owner triage. The runner refuses a third consecutive non-PASS round unless a
closing tag (k7-pass-*, closed-by-owner*, seal-*) has been placed at or after
the last reviewed commit. The no-progress HALT below still applies inside the cap.

After a seal: K7 reviews extension modules only (--modules is required), the
sealed files must be unchanged, and in Phase 5 the runner refuses outright —
Phase 5 does not run K7.

Credited review (the F1 design, stage 1; tools/manifests.py). Each module in
scope gets a mode, written into the verdict's reviewed.scope:
  credited  its content's fingerprint was in scope of a concluded round:
            not reviewed again
  diff      reviewed on what changed since its base (the reviewed commit of
            the newest concluded round that had it in scope) and the
            unchanged code that change depends on or that calls it
  full      never concluded, or --full
A round whose modules are all credited is not spent: nothing is spawned and
no verdict is written. The seal's backstop (seal.py) asks for one full review
of every module's final content.

PORTED, not copied (MetaFramework 2.6.5 adoption, R-66; earlier R-03, MF-16). This is the 2.6.5
template runner with this repo's local rulings re-applied: IR-22 (name the dirty files), R-07 (a
scratch worktree is the reviewer's only writable place; a dirty-after verdict is refused), IR-67
(the verdict read robustly, and raw output kept on any parse or schema failure - the template's
greedy brace regex is MF-33), R-15's detector-scope paragraph, and the positive-magnitude deduction
wording.

Usage:
    k7-run.py [--root .] [--modules MOD-01,MOD-02] [--full] [--timeout 1800] [--dry-run]
Exit: 0 verdict written (any verdict), or nothing to review; 1 preflight/validation
failure, 2 usage.
"""

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import manifests as mf                                       # noqa: E402  credited review
import receipts as rc                                        # noqa: E402  the gates as receipts (RD-28)

RUNNER_OWNED = ("reviewed", "reviewer", "preflight", "progress", "schema_version")


# R-07: the reviewer's only writable place. Gitignored, inside the repo so that
# node_modules resolves from the copy exactly as it does from the original.
SCRATCH = ".k7/wt"


def scratch_up(root: Path, commit: str) -> None:
    scratch_down(root)
    subprocess.run(["git", "-C", str(root), "worktree", "add", "--detach", SCRATCH, commit],
                   capture_output=True, text=True, check=True)


def scratch_down(root: Path) -> None:
    subprocess.run(["git", "-C", str(root), "worktree", "remove", "--force", SCRATCH],
                   capture_output=True, text=True)
    subprocess.run(["git", "-C", str(root), "worktree", "prune"], capture_output=True, text=True)


def extract_verdict(raw: str) -> dict | None:
    """The reviewer's verdict object out of its stdout (IR-67, MF-33).

    A greedy brace regex runs from the FIRST brace in the output to the last, so prose that merely
    mentions a set - `{}`, `{c1}` - makes it parse the wrong span and fail, discarding the whole
    review. Now: the whole output if it is one JSON object; otherwise every `{` from the LAST
    backwards, decoded with raw_decode, and the first verdict-shaped dict wins."""
    try:
        whole = json.loads(raw)
        if isinstance(whole, dict):
            return whole
    except json.JSONDecodeError:
        pass
    decoder = json.JSONDecoder()
    for i in reversed([k for k, ch in enumerate(raw) if ch == "{"]):
        try:
            obj, _ = decoder.raw_decode(raw, i)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and "verdict" in obj and "checks" in obj:
            return obj
    return None


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


def is_ancestor(root: Path, a: str, b: str) -> bool:
    return subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", a, b],
                          capture_output=True).returncode == 0


def non_pass_streak(root: Path, inst: Path) -> int:
    """Consecutive non-PASS rounds not yet closed by a gate-closing tag."""
    closing = []
    for pat in ("k7-pass-*", "closed-by-owner*", "seal-*"):
        for t in git(root, "tag", "-l", pat).splitlines():
            c = git(root, "rev-list", "-n", "1", t)
            if c:
                closing.append(c)
    rounds = []
    for p in inst.glob("k7-verdict-*.json"):
        m = re.search(r"k7-verdict-(\d+)\.json$", p.name)
        if not m:
            continue
        try:
            rounds.append((int(m.group(1)), json.loads(p.read_text(encoding="utf-8"))))
        except (OSError, json.JSONDecodeError):
            continue
    streak = 0
    for _, v in sorted(rounds, key=lambda r: r[0]):
        streak = 0 if v.get("verdict") == "PASS" else streak + 1
        reviewed = (v.get("reviewed") or {}).get("commit_sha", "")
        if reviewed and any(is_ancestor(root, reviewed, c) for c in closing):
            streak = 0
    return streak


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

{scope_text}
Run the CC-1..CC-7 battery defined in your agent file against the working tree.
Use only the declared commands:
  full suite:      {test_command}
  single test:     {test_select}
  re-derive all:   {rederive_all}

{seal_note}A throwaway worktree of the reviewed commit is at {scratch}. It is the ONLY
place you may write (R-07): run mutation experiments there, never in the
repository. Run the declared commands against it by pointing them at it:
  npx tsc --noEmit -p {scratch}
  npx vitest run --root {scratch} -t "<test name>"
The runner deletes it after this round. The repository itself must be left
byte-identical: a verdict that leaves it dirty is refused, not recorded.

Detectors are scored against their stated scope (R-15). Each load-bearing
detector's header carries a SCOPE (R-15) block: the forms it DECIDES and the
LIMITS it registers, each limit pinned by a limit- fixture it must not flag.
An evasion inside a stated DECIDES rule is a defect of that detector. An
evasion of a form the statement does not claim is reported as a known-issue
candidate and does not by itself fail CC-6. A statement that claims a form
the detector does not decide, or omits a limit it has, is a CC-3 defect.

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


def scope_text(root: Path, scope: list[dict], om: dict) -> str:
    """The prompt's scope section: each module's mode, what it is given, and the diff-mode rules."""
    lines = ["Scope of this round (computed by the runner from each module's content; credited review):"]
    for e in scope:
        m = e["module"]
        # Injection seams (OS-3) are not imports. The object model names them: "injected into MOD-05" on MOD-12's row
        # sends MOD-12's reviewer to MOD-05's call path (the DR-37 case), so both directions are listed.
        names = sorted(x for x in om if x != m and any(re.search(rf"\b{x}\b", r) for r in om[m]["rows"]))
        named_by = sorted(x for x, rec in om.items() if x != m and any(re.search(rf"\b{m}\b", r) for r in rec["rows"]))
        if e["mode"] == "credited":
            how = (f"has an ACCEPT receipt at k7 or owner-triage" if e.get("credit") == "receipt"
                   else f"was reviewed in concluded round {e['credit_round']}")
            lines.append(f"  {m}  CREDITED: its content (manifest {e['manifest'][:12]}) {how}. Do not review it on its own.")
            continue
        if e["mode"] == "full":
            lines.append(f"  {m}  FULL: review the whole module.")
        else:
            changed = git(root, "diff", "--stat", e["base"], "HEAD", "--",
                          *e["files"]) or "(no change in its own files: a dependency or its object-model row changed)"
            lines.append(f"  {m}  DIFF from base {e['base'][:7]} (round {e['base_round']}, concluded). Changed:")
            lines += [f"        {ln}" for ln in changed.splitlines()]
        rel = []
        if e["deps"]:
            rel.append(f"it imports {', '.join(e['deps'])}")
        if e["importers"]:
            rel.append(f"imported by {', '.join(e['importers'])}")
        if names:
            rel.append(f"its object-model rows name {', '.join(names)} (an injection seam, OS-3: read the code it is handed to)")
        if named_by:
            rel.append(f"named in the object model by {', '.join(named_by)} (an injection seam, OS-3)")
        if rel:
            lines.append(f"        Related: {'; '.join(rel)}.")
        if e["unresolved"]:
            lines.append(f"        Imports the runner could not resolve (read them yourself): {'; '.join(e['unresolved'][:6])}")
    lines += [
        "",
        "Rules for this scope:",
        "- A DIFF module is reviewed on its changes since its base AND the unchanged code those changes depend on",
        "  or that calls them, following imports and injection seams (the object model names what each class is",
        "  handed). Read that code in full. A defect found there is a finding against the module whose code holds it.",
        "- Mechanical checks run as declared, the full suite included. A judgement check that passed at the base is",
        "  re-assessed only where the changes touch what it reads; say which checks you carried and why.",
        "- A CREDITED module is out of scope unless the scope above leads you into its code.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--modules", default="")
    ap.add_argument("--full", action="store_true",
                    help="review every module in scope in full (the owner's call, or the seal's backstop)")
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

    # ---- phase, seal, and round-cap guards ---------------------------------
    try:
        phase = str(json.loads((root / "STATE.json").read_text(encoding="utf-8")).get("phase", 4))
    except (OSError, json.JSONDecodeError):
        phase = "4"
    if phase == "5":
        return die("STATE.json says phase 5. Phase 5 does not run K7: the library is sealed "
                   "and the UI is not a library module. An engine gap goes to ui/gaps.md and, "
                   "when ready, to an extension run (tools/seal.py begin-extension).")

    seals = git(root, "tag", "-l", "seal-*", "--sort=-v:refname").splitlines()
    seal_note = ""
    if seals:
        seal = seals[0]
        if not args.modules:
            return die(f"the library is sealed at {seal}; K7 reviews extension modules only. "
                       f"Pass --modules with the new MOD ids.")
        globs = cfg.get("sealed_globs") or [cfg.get("source_glob") or "src/**", "tests/**"]
        rx = [glob_to_regex(g) for g in globs]
        sealed = {f for f in git(root, "ls-tree", "-r", "--name-only", seal).splitlines()
                  if any(r.match(f) for r in rx)}
        broken = sorted(set(git(root, "diff", "--name-only", seal).splitlines()) & sealed)
        if broken:
            return die(f"files sealed at {seal} have changed ({', '.join(broken[:5])}); an "
                       f"extension may not modify sealed code. K7 not spawned.")
        seal_note = (f"Sealed library: {seal}. Files present at that tag are frozen, verified\n"
                     f"unchanged by the runner, and OUT OF SCOPE. Review only the modules listed\n"
                     f"above and their seams into the sealed library.\n\n")

    streak = non_pass_streak(root, inst)
    if streak >= 2:
        return die("RD-9 round cap: this gate has had its fix round and its re-check. "
                   "Everything still open goes to the OWNER as a triage list (fix now / known "
                   "issue / won't-fix), recorded in RESOLUTION_RECORD.md; close the gate with "
                   "a `closed-by-owner-<n>` tag. No round 3.")

    # ---- preflight -------------------------------------------------------
    # STATE.json is excluded: the SessionStart hook rewrites it on every session,
    # so counting it would make the tree permanently dirty and block every review.
    # It is session bookkeeping, not reviewed content.
    # The PipelineGate store (RD-28) is excluded likewise: it is append-only and verified by its own chain, and the
    # runner itself appends the pending k7 receipts before the reviewer starts.
    store = re.search(r"--store\s+(\"[^\"]+\"|'[^']+'|\S+)", cfg.get("pipelinegate_command") or "")
    store_rel = store.group(1).strip("\"'") if store else ".pipelinegate"

    def worktree_clean() -> bool:
        return git(root, "status", "--porcelain", "--",
                   ".", ":(exclude)STATE.json", f":(exclude){store_rel}") == ""

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
        # IR-22: name it - an unnamed refusal sends the reader to STATE.json, which is excluded
        # and therefore never the answer.
        for line in git(root, "status", "--porcelain", "--", ".", ":(exclude)STATE.json", f":(exclude){store_rel}").splitlines()[:20]:
            print(f"  {line}", file=sys.stderr)
        return die("working tree is dirty; K7 reviews a committed tree only. Commit the lines above "
                   "(a prior verdict is evidence and belongs in the tree) or discard them, then re-run.")
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

    # ---- credited review: each module's mode ------------------------------
    tracked = set(git(root, "ls-files").splitlines())
    om = mf.object_model(root, tracked)
    modules = [m for m in args.modules.split(",") if m] or sorted(om)
    unknown = [m for m in modules if m not in om]
    if unknown:
        return die(f"{', '.join(unknown)} not in INSTRUMENTS/object-model-and-parameters.md (with a File "
                   f"the repo tracks); a module enters the object model before it is reviewed")
    scope = mf.scope(root, cfg, inst, modules, args.full)
    if all(e["mode"] == "credited" for e in scope):
        print("k7-run: every module in scope is credited (its content was reviewed in a concluded round): "
              + ", ".join(f"{e['module']} by " + (f"round {e['credit_round']}" if e.get("credit") == "verdict" else "its receipts")
                          for e in scope)
              + ". Nothing to review; no round spent. Pass --full to review anyway.")
        return 0

    # ---- RD-28: the gates as receipts (when the repo declares its PipelineGate store) ---------------------------
    reviewing = [e for e in scope if e["mode"] != "credited"]
    built = mf.build(root, cfg) if rc.enabled(cfg) else {}
    agent_def = ""
    if rc.enabled(cfg):
        try:
            no_battery = [e["module"] for e in reviewing
                          if rc.standing(root, cfg, rc.h_of(built[e["module"]]["manifest"]), "battery") != "ACCEPT"]
            agent_def = rc.charter(root, cfg)
        except rc.PgError as exc:
            return die(f"the PipelineGate store could not answer: {exc}")
        if no_battery:
            return die("RD-10/RD-28: no battery ACCEPT receipt for this content of "
                       + ", ".join(no_battery) + ". Run the battery, then `python tools/receipts.py battery --module "
                       "MOD-NN --record <its record>` for each. K7 not spawned.")

    prompt = PROMPT.format(
        root=root, s3=s3_doc or "(governance/S3)", rnd=rnd,
        modules=", ".join(modules),
        scope_text=scope_text(root, scope, om),
        test_command=cfg.get("test_command") or "(undeclared)",
        test_select=cfg.get("test_select") or "(undeclared)",
        rederive_all=cfg.get("rederive_all") or "(undeclared)",
        seal_note=seal_note, scratch=SCRATCH)

    if args.dry_run:
        print(prompt)
        return 0

    # The pending receipts: one per module handed to the reviewer. The engine refuses a reviewer whose charter is not
    # the one k7_verdict@1 pins (DECIDER_NOT_IN_RUBRIC): caught here, before a round is spent.
    if rc.enabled(cfg):
        for e in reviewing:
            try:
                ans = rc.k7(root, cfg, built[e["module"]]["manifest"], agent_def)
            except rc.PgError as exc:
                return die(f"the k7 receipt for {e['module']} could not be appended: {exc}")
            if rc.nu(ans) != "LATENT":
                return die(f"the engine answered {rc.nu(ans)} for {e['module']} at k7, not a pending review. A charter "
                           f"whose digest ({agent_def[:19]}…) is not the one k7_verdict@1 pins refuses as "
                           f"DECIDER_NOT_IN_RUBRIC: the owner admits a new version (tools/receipts.py setup). K7 not spawned.")

    agent = cfg.get("reviewer_agent") or ".claude/agents/k7-reviewer.md"
    # `or` not a get() default: an explicit null means "use the default".
    cmd_t = (cfg.get("reviewer_command")
             or "claude -p --agent-file {agent_file} --output-format json")
    cmd = shlex.split(cmd_t.format(agent_file=agent))

    started = now()
    scratch_up(root, commit)
    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                              timeout=args.timeout, cwd=str(root),
                              env={**os.environ, "CLAUDE_NO_RESUME": "1"})
    except FileNotFoundError:
        return die(f"reviewer command not found: {cmd[0]}. Set reviewer_command "
                   f"in project.json.", 2)
    except subprocess.TimeoutExpired:
        return die(f"reviewer exceeded {args.timeout}s; no verdict written")
    finally:
        scratch_down(root)
    completed = now()

    raw = proc.stdout.strip()
    supplied = extract_verdict(raw)
    if supplied is None:
        # IR-67: never discard a review. The raw output is evidence for the owner, written
        # BEFORE refusing, so an unreadable verdict costs a re-read, not a re-review.
        kept = inst / f"k7-unparsed-{rnd}.txt"
        kept.write_bytes(f"--- stdout ---\n{proc.stdout}\n--- stderr ---\n{proc.stderr}".encode("utf-8"))
        return die(f"reviewer emitted no readable verdict object; raw output preserved at {kept}")
    verdict_text = json.dumps(supplied, indent=2)

    # The reviewer does not get to certify its own independence.
    for k in RUNNER_OWNED:
        supplied.pop(k, None)

    clean_after = worktree_clean()
    if not clean_after:
        # R-07: the reviewer can write, so a dirty tree after review is a reviewer that changed what
        # it reviewed - not a warning to record. The output is kept for the owner; no verdict.
        raw_out = inst / f"k7-raw-{rnd}.json"
        raw_out.write_bytes(verdict_text.encode("utf-8"))
        for line in git(root, "status", "--porcelain", "--", ".", ":(exclude)STATE.json", f":(exclude){store_rel}").splitlines()[:20]:
            print(f"  {line}", file=sys.stderr)
        return die(f"the reviewer left the repository dirty (lines above); verdict REFUSED (R-07). Raw output preserved at {raw_out}.")

    verdict = {
        "schema_version": "1.0",
        "concept": cfg.get("concept") or root.name,
        "round": rnd,
        "reviewed": {
            "tree_sha": tree, "commit_sha": commit,
            "s3_anchor_tag": anchor[-1] if anchor else "s3-anchor-v1.0",
            "modules": modules,
            "scope": [{k: e[k] for k in ("module", "mode", "manifest", "base", "base_round", "credit_round",
                                         "unresolved", "deps", "importers")} for e in scope],
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
        path = "/".join(str(p) for p in e.absolute_path) or "(root)"
        raw_out = inst / f"k7-raw-{rnd}.json"
        raw_out.write_bytes(verdict_text.encode("utf-8"))
        return die(f"verdict failed schema at {path}: {e.message}\n"
                   f"No verdict written. The reviewer's output was non-conforming.\n"
                   f"Raw output preserved at {raw_out}.")

    out = inst / f"k7-verdict-{rnd}.json"
    # Bytes: a text-mode write turns every \n into \r\n on Windows (F7, the Frame Gate trial).
    with tempfile.NamedTemporaryFile("wb", dir=str(inst), delete=False) as tmp:
        tmp.write((json.dumps(verdict, indent=2) + "\n").encode("utf-8"))
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_name = tmp.name
    os.replace(tmp_name, out)

    print(f"k7-run: round {rnd} -> {verdict['verdict']} "
          f"(drift {verdict['drift_score']['value']}) written to {out.name}")
    if rc.enabled(cfg) and verdict["verdict"] == "PASS":
        transcript = "sha256:" + hashlib.sha256(proc.stdout.encode("utf-8")).hexdigest()
        for e in reviewing:
            try:
                ans = rc.k7(root, cfg, built[e["module"]]["manifest"], agent_def, transcript, "ACCEPT")
                print(f"k7-run: {e['module']} k7 receipt: {rc.nu(ans)}")
                if e["mode"] == "full":       # the seal's backstop, as a receipt the verdict file cannot fake
                    ans = rc.k7(root, cfg, built[e["module"]]["manifest"], agent_def, transcript, "ACCEPT", "full-review")
                    print(f"k7-run: {e['module']} full-review receipt: {rc.nu(ans)}")
            except rc.PgError as exc:          # the verdict stands; without the receipt the module is simply not credited
                print(f"k7-run: WARNING the k7 ACCEPT for {e['module']} was not appended ({exc}); it will be reviewed "
                      f"again rather than credited", file=sys.stderr)
    if not clean_after:
        print("k7-run: WARNING reviewer left the tree dirty; verdict records it",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
