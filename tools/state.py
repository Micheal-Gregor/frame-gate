#!/usr/bin/env python3
"""
state — the session's memory, on disk.

STATE.json holds what a fresh session needs to know and cannot reconstruct:
phase, branch, current module, K7 round, last gate tag, next action, blocker.
Nothing here is derived at read time. Derivation is where variance enters; this
file is read, never re-inferred.

Subcommands:
    show                      print STATE.json
    render                    human-readable block (what the hooks inject)
    refresh                   update git-derived fields, preserve intent fields
    set k=v [k=v ...]         set intent fields (next_action, blocked_on, ...)
    hook-session-start        SessionStart hook: inject state into the session
    hook-precompact           PreCompact hook: checkpoint before context loss

Install in .claude/settings.json:

    {"hooks": {
      "SessionStart": [{"hooks": [{"type": "command",
        "command": "python3 tools/state.py hook-session-start"}]}],
      "PreCompact":   [{"hooks": [{"type": "command",
        "command": "python3 tools/state.py hook-precompact"}]}]}}

Checkpoint and re-read. Never re-derive.
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

GIT_FIELDS = ("branch", "head", "tree", "dirty", "k7_round", "last_gate_tag")
INTENT_FIELDS = ("phase", "concept", "current_module", "next_action", "blocked_on")

TEMPLATE = {
    "schema_version": "1.0", "concept": "", "phase": 4,
    "branch": "", "head": "", "tree": "", "dirty": False,
    "current_module": "", "k7_round": 0, "last_gate_tag": "",
    "next_action": "", "blocked_on": None,
    "updated_at": "", "updated_by": "",
}


def git(root: Path, *a: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(root), *a],
                           capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def load(root: Path) -> dict:
    p = root / "STATE.json"
    try:
        return {**TEMPLATE, **json.loads(p.read_text(encoding="utf-8"))}
    except (OSError, json.JSONDecodeError):
        return dict(TEMPLATE)


def save(root: Path, st: dict, by: str) -> None:
    st["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    st["updated_by"] = by
    (root / "STATE.json").write_text(json.dumps(st, indent=2) + "\n",
                                     encoding="utf-8")


def refresh(root: Path, st: dict) -> dict:
    """Update only what git knows. Intent fields are never guessed."""
    st["branch"] = git(root, "rev-parse", "--abbrev-ref", "HEAD")
    st["head"] = git(root, "rev-parse", "HEAD")
    st["tree"] = git(root, "rev-parse", "HEAD^{tree}")
    st["dirty"] = git(root, "status", "--porcelain") != ""

    rounds = [int(m.group(1)) for p in (root / "INSTRUMENTS").glob("k7-verdict-*.json")
              if (m := re.search(r"k7-verdict-(\d+)\.json$", p.name))]
    st["k7_round"] = max(rounds) if rounds else 0

    tags = git(root, "tag", "--sort=-creatordate", "-l",
               "k7-pass-*", "resolution-run-*", "k8-pass-*", "closed-by-owner")
    st["last_gate_tag"] = tags.splitlines()[0] if tags else ""
    return st


def render(st: dict) -> str:
    b = st.get("blocked_on")
    lines = [
        "=== PROJECT STATE (read from STATE.json — do not re-derive) ===",
        f"concept        {st.get('concept') or '(unset)'}",
        f"phase          {st.get('phase')}",
        f"branch         {st.get('branch') or '(unknown)'}"
        + ("   [WORKING TREE DIRTY]" if st.get("dirty") else ""),
        f"HEAD           {(st.get('head') or '')[:12] or '(unknown)'}",
        f"current module {st.get('current_module') or '(unset)'}",
        f"K7 round       {st.get('k7_round')}",
        f"last gate tag  {st.get('last_gate_tag') or '(none)'}",
        f"NEXT ACTION    {st.get('next_action') or '(unset — set it before working)'}",
    ]
    if b:
        lines.append(f"BLOCKED ON     {b}")
    lines += [
        "",
        "Before acting: read governance/ for the frozen S3 and the emission",
        "contract. Do not reconstruct project position from memory or from this",
        "conversation — STATE.json is authoritative and was written by a tool.",
        "=" * 62,
    ]
    return "\n".join(lines)


def emit_hook(event: str, context: str) -> None:
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": context}}))


def main() -> int:
    argv = sys.argv[1:]
    if not argv:
        print(__doc__)
        return 2
    cmd, rest = argv[0], argv[1:]

    root = Path(".").resolve()
    for i, a in enumerate(rest):
        if a == "--root" and i + 1 < len(rest):
            root = Path(rest[i + 1]).resolve()

    # Hooks receive a payload on stdin; cwd is authoritative when present.
    if cmd.startswith("hook-"):
        try:
            payload = json.load(sys.stdin)
            root = Path(payload.get("cwd") or root).resolve()
        except (json.JSONDecodeError, OSError):
            payload = {}

    st = load(root)

    if cmd == "show":
        print(json.dumps(st, indent=2))
        return 0

    if cmd == "render":
        print(render(st))
        return 0

    if cmd == "refresh":
        save(root, refresh(root, st), "refresh")
        print(render(load(root)))
        return 0

    if cmd == "set":
        pairs = [a for a in rest if "=" in a and not a.startswith("--")]
        if not pairs:
            return print("state: nothing to set (expected k=v)", file=sys.stderr) or 2
        for pair in pairs:
            k, _, val = pair.partition("=")
            if k not in INTENT_FIELDS:
                print(f"state: '{k}' is git-derived or unknown; settable fields are "
                      f"{', '.join(INTENT_FIELDS)}", file=sys.stderr)
                return 2
            st[k] = (None if val in ("", "none", "null")
                     else int(val) if k == "phase" and val.isdigit() else val)
        save(root, st, "manual")
        print(render(st))
        return 0

    if cmd == "hook-session-start":
        # Refresh mechanically, then inject. A resumed or post-compaction
        # session gets the same block a fresh one does.
        st = refresh(root, st)
        save(root, st, f"session-start:{payload.get('source', 'unknown')}")
        emit_hook("SessionStart", render(st))
        return 0

    if cmd == "hook-precompact":
        st = refresh(root, st)
        save(root, st, f"precompact:{payload.get('trigger', 'unknown')}")
        log = root / "INSTRUMENTS" / "state-log.jsonl"
        try:
            log.parent.mkdir(exist_ok=True)
            with log.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps({"event": "precompact", **st}) + "\n")
        except OSError:
            pass
        emit_hook("PreCompact",
                  "Context is about to be compacted. STATE.json has been "
                  "checkpointed to disk.\n\n" + render(st) +
                  "\n\nWhen compacting, preserve verbatim: the NEXT ACTION line, "
                  "the current module, any BLOCKED ON entry, the list of files "
                  "modified this session, and the exact text of any failing "
                  "check. Distinctions are lost before conclusions are — keep "
                  "the ones above even at the cost of narrative.")
        return 0

    print(f"state: unknown subcommand '{cmd}'", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
