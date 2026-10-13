#!/usr/bin/env python3
"""
new-object — scaffold a class that already satisfies the Object Writing Standard.

The compliant path has to be the cheap path. Writing `import { decider }` costs three
tokens and solves the call in front of you; threading a dependency through a constructor,
a wiring point and a test costs thirty and solves a scenario that does not exist yet. A
model optimises the visible problem. So this generator makes the correct shape cost one
command: the class with its declared inputs, the isolation test that proves it needs
nothing else, and the object-model row that makes it legal to write.

Usage:
    new-object.py <Module> --file src/<name>.<ext> --inputs clock,standingIn
                  [--decides yes|no] [--traces MOD-07] [--purpose "..."] [--root .]

Exit: 0 written, 1 refused (bad name, file exists, bucket name), 2 bad invocation.
"""

import argparse
import json
import re
import sys
from pathlib import Path

BUCKETS = {"helpers", "helper", "utils", "util", "common", "misc", "shared", "stuff", "lib"}

HEADER = """{c} {Module} — Object Writing Standard
{c} OS-1  every dependency arrives at construction (below). Nothing is reached for.
{c} OS-2  no env, clock, randomness, globals, singletons, module-level mutable state.
{c} OS-4  the constructor validates and refuses; no half-built instance exists.
{c} OS-5  state is private; expose commands, not setters.
{c} OS-6  every refusal is typed and named in the interface contract.
"""

JS = """{header}
export class {Module} {{
  constructor({{ {params} }}) {{
{checks}
{assigns}
    Object.freeze(this);
  }}

  // operations go here. Anything an operation needs that is not above is its own parameter.
}}
"""

PY = """{header}

class {Module}:
    def __init__(self, *, {params}):
{checks}
{assigns}

    # operations go here. Anything an operation needs that is not above is its own parameter.
"""

JS_OP = """
  it('{op} answers differently when {varied} differs', () => {{
    const a = new {Module}({{ ...deps() }}).{op}(/* input A */);
    const b = new {Module}({{ ...deps({{ {varied}: other.{varied} }}) }}).{op}(/* input B */);
    expect(a).not.toEqual(b);   // if they are equal, the answer came from somewhere undeclared
  }});
"""

PY_OP = """

def test_{op}_answers_differently_when_{varied}_differs():
    a = {Module}(**deps()).{op}()           # input A
    b = {Module}(**deps({varied}=other_{varied}())).{op}()   # input B
    assert a != b   # if equal, the answer came from somewhere undeclared
"""

JS_TEST = """{c} Isolation test (OS-12) — construct {Module} with its declared inputs and nothing
{c} else, then exercise every public operation. Run it with the environment cleared and the
{c} clock frozen: anything this class reaches for outside its inputs fails here.
import {{ {Module} }} from '{import_path}';

describe('{Module} in isolation', () => {{
  const deps = (over) => ({{ {stubs}, ...over }});
  const other = {{ {others} }};

  it('refuses to construct when an input is missing', () => {{
    expect(() => new {Module}({{}})).toThrow();
  }});
{op_blocks}
  {c} Construct-and-assert is a failure, not a pass: every public operation is called, and
  {c} for each declared input two calls differ in only that input and the answers differ.
}});
"""

PY_TEST = """{c} Isolation test (OS-12) — construct {Module} with its declared inputs and nothing
{c} else, then exercise every public operation. Run it with the environment cleared and the
{c} clock frozen: anything this class reaches for outside its inputs fails here.
import pytest

from {import_path} import {Module}


def deps(**over):
    base = dict({stubs})
    base.update(over)
    return base

{others}

def test_refuses_to_construct_when_an_input_is_missing():
    with pytest.raises(Exception):
        {Module}()
{op_blocks}
# Construct-and-assert is a failure, not a pass: every public operation is called, and for
# each declared input two calls differ in only that input and the answers differ.
"""


def write_text_kept(path: Path, text: str) -> None:
    """Write text as UTF-8 bytes. Text mode would turn every \\n into \\r\\n on Windows (F7, the Frame Gate trial),
    so this writes LF, or CRLF only where the file being rewritten already uses it."""
    crlf = path.is_file() and b"\r\n" in path.read_bytes()
    path.write_bytes(text.replace("\r\n", "\n").replace("\n", "\r\n" if crlf else "\n").encode("utf-8"))


def die(msg: str, code: int = 1) -> int:
    print(f"new-object: {msg}", file=sys.stderr)
    return code


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("module")
    ap.add_argument("--file", required=True)
    ap.add_argument("--inputs", default="", help="comma-separated declared inputs (OS-1)")
    ap.add_argument("--no-inputs", action="store_true",
                    help="this class truly needs nothing handed in — state it explicitly")
    ap.add_argument("--operations", default="",
                    help="comma-separated public operations; each gets a two-call isolation test")
    ap.add_argument("--decides", choices=["yes", "no"], default="no")
    ap.add_argument("--traces", default="")
    ap.add_argument("--purpose", default="")
    ap.add_argument("--root", default=".")
    a = ap.parse_args()

    root = Path(a.root).resolve()
    rel = a.file.lstrip("/")
    target = root / rel
    name = a.module
    if not re.match(r"^[A-Z][A-Za-z0-9]*$", name):
        return die(f"'{name}' must be PascalCase — a module's name states what it owns")
    if target.stem.lower() in BUCKETS or any(f"/{b}/" in "/" + rel.lower() for b in BUCKETS):
        return die(f"'{rel}' is a bucket (OS-9). A bucket has no owner and no contract, which "
                   f"is exactly how a decider ends up imported by name. Name it for what it owns.")
    if target.exists():
        return die(f"{rel} already exists; this command creates, it never overwrites")

    inputs = [i.strip() for i in a.inputs.split(",") if i.strip()]
    if not inputs and not a.no_inputs:
        return die("--inputs is required (OS-1). Everything the class needs — a clock, a config "
                   "value, another module's decision — arrives at construction. If it truly "
                   "needs nothing, say so with --no-inputs; a forgotten flag must not succeed "
                   "silently.", 2)
    if inputs and a.no_inputs:
        return die("--inputs and --no-inputs contradict each other", 2)
    ops = [o.strip() for o in a.operations.split(",") if o.strip()]

    py = target.suffix == ".py"
    c = "#" if py else "//"
    header = HEADER.format(c=c, Module=name)
    if a.purpose:
        header += f"{c} {a.purpose}\n"

    if py:
        checks = "\n".join(f"        if {i} is None:\n            raise ValueError"
                           f"('{name} requires {i}')" for i in inputs) or "        pass"
        assigns = "\n".join(f"        self._{i} = {i}" for i in inputs)
        body = PY.format(header=header, Module=name, params=", ".join(inputs) or "**_",
                         checks=checks, assigns=assigns or "        pass")
        import_path = rel.replace("/", ".").removesuffix(".py")
        test_rel = f"tests/{target.stem}.isolation.test.py"
        varied = inputs[0] if inputs else "nothing"
        blocks = "".join(PY_OP.format(Module=name, op=o, varied=varied) for o in ops)
        test = PY_TEST.format(c=c, Module=name, import_path=import_path,
                              stubs=", ".join(f"{i}=object()" for i in inputs),
                              others="\n".join(f"def other_{i}():\n    return object()"
                                               for i in inputs),
                              op_blocks=blocks or "\n# one block per public operation — two "
                                                 "calls differing in one input, answers differ\n")
    else:
        checks = "\n".join(f"    if ({i} === undefined) throw new Error"
                           f"('{name} requires {i}');" for i in inputs) or "    // no inputs"
        assigns = "\n".join(f"    this.#{i} = {i};" for i in inputs)
        fields = "\n".join(f"  #{i};" for i in inputs)
        body = JS.format(header=header, Module=name, params=", ".join(inputs),
                         checks=checks, assigns=assigns)
        if fields:
            body = body.replace("export class %s {\n" % name,
                                "export class %s {\n%s\n" % (name, fields))
        depth = rel.count("/")
        import_path = "../" * max(depth, 1) + rel.removesuffix(".js").removesuffix(".ts")
        test_rel = f"tests/{target.stem}.isolation.test{target.suffix}"
        varied = inputs[0] if inputs else "nothing"
        blocks = "".join(JS_OP.format(Module=name, op=o, varied=varied) for o in ops)
        test = JS_TEST.format(c=c, Module=name, import_path=import_path,
                              stubs=", ".join(f"{i}: {{}}" for i in inputs),
                              others=", ".join(f"{i}: {{}}" for i in inputs),
                              op_blocks=blocks or "\n  // one block per public operation — two "
                                                  "calls differing in one input, answers differ\n")

    target.parent.mkdir(parents=True, exist_ok=True)
    write_text_kept(target, body)
    tp = root / test_rel
    tp.parent.mkdir(parents=True, exist_ok=True)
    if not tp.exists():
        write_text_kept(tp, test)

    om = root / "INSTRUMENTS" / "object-model-and-parameters.md"
    row = (f"| {name} | {rel} | {a.traces or '(trace me)'} | {a.purpose or '(one line)'} | "
           f"{', '.join(inputs) or '—'} | {a.decides.upper()} | NOT_STARTED |")
    if om.is_file():
        lines = om.read_text(encoding="utf-8").splitlines()
        for i, ln in enumerate(lines):
            if ln.startswith("| Module | File |"):
                j = i + 2
                while j < len(lines) and lines[j].startswith("|"):
                    j += 1
                lines.insert(j, row)
                write_text_kept(om, "\n".join(lines) + "\n")
                break

    print(f"new-object: wrote {rel} and {test_rel}, and added the object-model row.\n"
          f"  Declared inputs: {', '.join(inputs) or '(none)'}\n"
          f"  Decides: {a.decides.upper()}"
          + ("  — every seam into this module must be INJECTED (OS-3)."
             if a.decides == "yes" else "")
          + "\nNext: fill the operations, give the isolation test one case per operation, and "
            "add the module's entry to the interface contract (operation, inputs, returns, "
            "refusals, side effects, determinism).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
