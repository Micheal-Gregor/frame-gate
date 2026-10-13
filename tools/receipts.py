#!/usr/bin/env python3
"""
receipts — Phase 4's gates as PipelineGate receipts (RD-28; the F1/F6 design, stage 2).

Each module's content manifest (tools/manifests.py) is a PipelineGate artifact. Three points on its line:
  battery       battery_complete@1, mechanical: the builder's battery record covers this content (RD-10, RD-26)
  k7            k7_verdict@1, judged by the K7 reviewer pinned by its charter's digest: PASS on this content
  owner-triage  owner_triage@1, judged by the owner: a gate closed on this content
Standing is read from the line on every call and stored nowhere. Credited review counts a module as concluded when its
standing at k7 or owner-triage is ACCEPT; k7-run.py will not hand the reviewer a module whose standing at battery is
not ACCEPT; gate.py refuses a closed-by-owner tag without the owner's receipts.

The store is the repo's own (`.pipelinegate/`, its *.jsonl committed). The engine is the plugin's pipelinegate skill,
called through `pipelinegate_command` in .metaframework/project.json, e.g.
    "pipelinegate_command": "python \"<plugin>/skills/pipelinegate/scripts/pg.py\" --store .pipelinegate"
Undeclared, the build runs credited review from the verdict files alone (RD-27) and none of this applies.

    python tools/receipts.py setup --signer P          print the owner's signing commands (never runs them)
    python tools/receipts.py manifest MOD-NN           the content's digest a battery record names
    python tools/receipts.py battery --module MOD-NN --record FILE
    python tools/receipts.py owner-close --round N --person P   only on the owner's explicit, live word
    python tools/receipts.py standing [--modules MOD-01,...]
Exit: 0 answered; 1 refused, or a gate not met; 2 a bad call or no pipelinegate_command.
"""

import argparse
import hashlib
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import manifests as mf                                       # noqa: E402

AUTHOR = "builder"                     # the artifact's author: never a decider at k7 or owner-triage (AUTHOR_IS_JUDGE)
REVIEWER = "k7-reviewer"
# full-review: the seal's backstop as a receipt. The reviewer's PASS on a FULL review, or the owner's close of a round
# that reviewed the module in full, appends ACCEPT here too, so an edited verdict file cannot claim a full review.
POINTS = ("battery", "k7", "owner-triage", "full-review")
RUBRICS = {"battery": ("battery_complete", 1), "k7": ("k7_verdict", 1), "owner-triage": ("owner_triage", 1)}
BATTERY_REFUSALS = "NOT_THIS_CONTENT,EMPTY_BATTERY,UNNAMED_CLAIM,SURVIVOR,RESTORE_UNVERIFIED,BUILD_ONLY_KILL"


class PgError(Exception):
    pass


def load_cfg(root: Path) -> dict:
    try:
        return json.loads((root / ".metaframework" / "project.json").read_bytes().decode("utf-8"))
    except (OSError, ValueError):
        return {}


def enabled(cfg: dict) -> bool:
    return bool(cfg.get("pipelinegate_command"))


def pg(root: Path, cfg: dict, *args: str) -> dict:
    """One call to the engine's tool face; its JSON answer package."""
    cmd = shlex.split(cfg["pipelinegate_command"]) + list(args)
    d = subprocess.run(cmd, capture_output=True, cwd=str(root))
    try:
        out = json.loads(d.stdout.decode("utf-8"))
    except ValueError:
        raise PgError(f"pipelinegate answered no JSON (exit {d.returncode}): {(d.stderr or d.stdout).decode('utf-8', 'replace')[-300:]}")
    if d.returncode != 0:
        raise PgError(out.get("error") or out.get("usage") or f"exit {d.returncode}")
    return out


def h_of(manifest: dict) -> str:
    """The engine's digest of a manifest's canonical bytes: the artifact's h, and its line."""
    return "sha256:" + hashlib.sha256(mf.canonical(manifest)).hexdigest()


def text_of(manifest: dict) -> str:
    return mf.canonical(manifest).decode("utf-8")


def standing(root: Path, cfg: dict, h: str, point: str) -> str:
    return pg(root, cfg, "standing", "--h", h, "--p", point)["returned"]


def concluded(root: Path, cfg: dict, h: str) -> bool:
    return any(standing(root, cfg, h, p) == "ACCEPT" for p in ("k7", "owner-triage"))


def charter(root: Path, cfg: dict) -> str:
    """The digest of the charter this repo runs the reviewer with: the agent_def the k7 rubric pins."""
    path = cfg.get("reviewer_agent") or ".claude/agents/k7-reviewer.md"
    return pg(root, cfg, "digest", "--file", path)["returned"]


def evaluate(root: Path, cfg: dict, manifest: dict, point: str, *decider: str, refs=(), returned=None, rubric=None) -> dict:
    rid, v = rubric or RUBRICS[point]
    args = ["evaluate", "--author", AUTHOR, "--text", text_of(manifest), "--p", point, "--r", rid, "--v", str(v), *decider]
    for r in refs:
        args += ["--ref", r]
    if returned:
        args += ["--returned", returned]
    return pg(root, cfg, *args)


def k7(root: Path, cfg: dict, manifest: dict, agent_def: str, transcript: str | None = None, returned: str | None = None,
       point: str = "k7") -> dict:
    """The reviewer's receipt at k7 (or, for a full review's PASS, at full-review): judged by k7_verdict@1."""
    who = ["--agent", REVIEWER, "--agent-def", agent_def] + (["--transcript", transcript] if transcript else [])
    return evaluate(root, cfg, manifest, point, *who, returned=returned, rubric=RUBRICS["k7"])


def fully_reviewed(root: Path, cfg: dict, h: str) -> bool:
    return standing(root, cfg, h, "full-review") == "ACCEPT"


def nu(ans: dict) -> str:
    return (ans.get("returned") or {}).get("nu", "") if isinstance(ans.get("returned"), dict) else str(ans.get("returned"))


def setup_commands(root: Path, cfg: dict, signer: str) -> list[str]:
    """The owner's signing acts for this repo's store, as commands. Printed for the owner; never run by the executor."""
    base = cfg["pipelinegate_command"]
    store = re.search(r"--store\s+(\"[^\"]+\"|\S+)", base)
    lines = []
    if store and not (root / store.group(1).strip('"') / "pipelinegate.json").exists():
        chain = cfg.get("concept") or root.name
        lines.append(f"{base} init --chain {shlex.quote(chain)}")
    agent_def = charter(root, cfg)
    owner_spec = pg(root, cfg, "digest", "--text", signer)["returned"]
    lines += [f"{base} bootstrap --signer {shlex.quote(signer)}",
              f"{base} admit --signer {shlex.quote(signer)} --id battery_complete --v 1 "
              f"--body governance/rubrics/battery_complete.py --refusals {BATTERY_REFUSALS}",
              f"{base} admit --signer {shlex.quote(signer)} --id k7_verdict --v 1 "
              f"--spec governance/rubrics/k7_verdict.md --decider-spec {agent_def}",
              f"{base} admit --signer {shlex.quote(signer)} --id owner_triage --v 1 "
              f"--spec governance/rubrics/owner_triage.md --decider-spec {owner_spec}"]
    return lines


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.strip().split("\n\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="command", required=True)
    s = sub.add_parser("setup"); s.add_argument("--signer", required=True)
    s = sub.add_parser("manifest"); s.add_argument("module")
    s = sub.add_parser("battery"); s.add_argument("--module", required=True); s.add_argument("--record", required=True)
    s = sub.add_parser("owner-close"); s.add_argument("--round", required=True, type=int); s.add_argument("--person", required=True)
    s = sub.add_parser("standing"); s.add_argument("--modules", default="")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    cfg = load_cfg(root)
    if not enabled(cfg):
        print("receipts: pipelinegate_command is not declared in .metaframework/project.json; this build runs credited "
              "review from its verdict files alone (RD-27)", file=sys.stderr)
        return 2
    try:
        built = mf.build(root, cfg)
        if a.command == "setup":
            print("# The owner's signing acts for this repo's store (RD-28). Run them yourself, or say so to the "
                  "session; the executor never signs.")
            print("\n".join(setup_commands(root, cfg, a.signer)))
            return 0
        if a.command == "manifest":
            if a.module not in built:
                print(f"receipts: {a.module} is not in the object model", file=sys.stderr)
                return 2
            print(h_of(built[a.module]["manifest"]))
            return 0
        if a.command == "battery":
            if a.module not in built:
                print(f"receipts: {a.module} is not in the object model", file=sys.stderr)
                return 2
            ans = evaluate(root, cfg, built[a.module]["manifest"], "battery", refs=[a.record])
            verdict = nu(ans)
            print(f"receipts: {a.module} battery: {verdict}  (line {h_of(built[a.module]['manifest'])[:19]}…, "
                  f"receipt {(ans.get('trace') or {}).get('addr', '?')[:19]}…)")
            return 0 if verdict == "ACCEPT" else 1
        if a.command == "owner-close":
            vf = root / "INSTRUMENTS" / f"k7-verdict-{a.round}.json"
            v = json.loads(vf.read_bytes().decode("utf-8"))
            scope = (v.get("reviewed") or {}).get("scope", [])
            mods = [s["module"] for s in scope] or [m for m in (v.get("reviewed") or {}).get("modules", []) if m in built]
            full = {s["module"] for s in scope if s.get("mode") == "full"}
            bad = 0
            for m in mods:
                ans = evaluate(root, cfg, built[m]["manifest"], "owner-triage", "--person", a.person, returned="ACCEPT")
                bad += nu(ans) != "ACCEPT"
                line = f"receipts: {m} owner-triage: {nu(ans)}"
                if m in full and nu(ans) == "ACCEPT":      # the owner closes a round that reviewed this module in full
                    f = evaluate(root, cfg, built[m]["manifest"], "full-review", "--person", a.person, returned="ACCEPT",
                                 rubric=RUBRICS["owner-triage"])
                    bad += nu(f) != "ACCEPT"
                    line += f"; full-review: {nu(f)}"
                print(line)
            return 1 if bad else 0
        mods = [m for m in a.modules.split(",") if m] or sorted(built)
        print(f"{'module':8} {'content':14} " + " ".join(f"{p:14}" for p in POINTS))
        for m in mods:
            h = h_of(built[m]["manifest"])
            print(f"{m:8} {h[7:19]:14} " + " ".join(f"{standing(root, cfg, h, p):14}" for p in POINTS))
        return 0
    except PgError as e:
        print(f"receipts: the engine refused or failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
