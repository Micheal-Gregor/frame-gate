#!/usr/bin/env python3
"""
gate — PreToolUse hook. The wall.

Reads the hook payload on stdin and denies three things:

  1. Any write to governance/S3/, including via Bash. The existing
     protect-s3.sh inspects tool_input.file_path only, so `cat > governance/
     S3/x` passes untouched and Phase 4 leans on Bash. This closes that.
  2. `git tag k7-pass-N` without a PASS verdict N whose reviewed.tree_sha
     equals the tree being tagged. Tags become evidence, not assertion.
  3. `git merge` without a PASS verdict covering HEAD's tree and a drift score
     at or above threshold. This is the drift-teeth rule, which the framework
     calls merge-blocking and currently enforces nowhere.

FAILS CLOSED. Any error — unreadable payload, missing python, malformed
verdict, absent config — denies. The framework's own doctrine is that UNKNOWN
fails safe toward HALT; protect-s3.sh violates it by redirecting stderr to
/dev/null and treating an empty parse as permission to proceed.

Install in .claude/settings.json:

    {"hooks": {"PreToolUse": [
      {"matcher": "Bash|Write|Edit|NotebookEdit",
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
PROTECTED_PATH = re.compile(r"(^|/)governance/S3/")
PROTECTED_CMD = re.compile(r"(?<![\w.\-])governance/S3/")


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

    if tool != "Bash":
        return decide(True)

    cmd = ti.get("command", "")
    if not isinstance(cmd, str):
        return decide(False, "Bash call carried no readable command; failing closed.")

    norm = cmd.replace("\\", "/")
    if PROTECTED_CMD.search(norm) and re.search(
            r"(>|>>|\btee\b|\bcp\b|\bmv\b|\brm\b|\bsed\b\s+-i|\btruncate\b|"
            r"\bdd\b|\bln\b|\bchmod\b|\bgit\s+checkout\b)", norm):
        return decide(False, "this command writes inside governance/S3/, which is "
                             "frozen at the anchor. Supersede, never edit.")

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
