#!/usr/bin/env python3
"""
spawn-portability (Python half) - IR-20 for the .py files the declared commands reach.

The rule is the TypeScript half's (tools/checks/spawn-resolve.mjs), restated for
Python: a child process is started only as an argv list whose program is the Node
binary. A command NAME is resolved by the host and the hosts disagree (PATHEXT, .cmd
shims, the Store's python3 stub); a command STRING is parsed by cmd.exe on one host
and sh on another.

Why it exists (K7 round 4, CC-6 / DR-07). IR-20 claimed a tree-wide rule while the
detector never read a .py file, and tools/rederive.py - the driver behind the
declared rederive_all command - launched `npx tsx` by name through subprocess with no
shell: the exact defect IR-20 was written for, at the first vector-bearing rung
(MOD-04), in the one file the TypeScript sweep could not see.

Resolution, not names (RD-13): a call is a launch when the expression it calls
RESOLVES, through this module's import bindings and simple aliases, to a launching
function of `subprocess` or `os` - `import subprocess as sp`, `from subprocess import
run as r`, `getattr(subprocess, "run")`, `f = subprocess.run` all resolve. The
program is the Node binary when it resolves to `shutil.which("node")`, directly or
through a name every assignment of which is that call.

Scope (RD-12): the .py files named by the commands declared in
.metaframework/project.json, and the repo-local modules they import - discovered from
the declaration, never listed here.

Usage:
    spawn-portability.py --declared [--root .]     the files the declared commands reach
    spawn-portability.py <file-or-dir> ...         explicit targets (fixtures)
Output: JSON {"files": [...], "violations": [{file, line, callee, defect}]}. Exit 0
unless the invocation is bad (2); the test decides what a violation means.
"""
import argparse
import ast
import json
import shlex
import sys
from pathlib import Path

LAUNCHERS = {
    "subprocess": {"run", "Popen", "call", "check_call", "check_output",
                   "getoutput", "getstatusoutput"},
    # K7 round 5 (DR-15): the asyncio launchers start processes as surely as
    # subprocess does.
    "asyncio": {"create_subprocess_exec", "create_subprocess_shell"},
    "os": {"system", "popen", "startfile", "posix_spawn", "posix_spawnp",
           "execl", "execle", "execlp", "execlpe", "execv", "execve", "execvp", "execvpe",
           "spawnl", "spawnle", "spawnlp", "spawnlpe", "spawnv", "spawnve", "spawnvp",
           "spawnvpe"},
}
# Take a command string for a shell. Never portable.
SHELL = {("os", "system"), ("os", "popen"), ("subprocess", "getoutput"),
         ("subprocess", "getstatusoutput"), ("asyncio", "create_subprocess_shell")}
# Where the PROGRAM sits, for launchers that do not take an argv list first.
PROGRAM_ARG = {"posix_spawn": 0, "posix_spawnp": 0, "create_subprocess_exec": 0}
PROGRAM_ARG.update({f: 0 for f in LAUNCHERS["os"] if f.startswith("exec")})
PROGRAM_ARG.update({f: 1 for f in LAUNCHERS["os"] if f.startswith("spawn")})


class Bindings(ast.NodeVisitor):
    """Module-level import bindings and simple aliases, flow-insensitive."""

    def __init__(self):
        self.modules = {}    # local name -> module ("sp" -> "subprocess")
        self.functions = {}  # local name -> (module, function)

    def visit_Import(self, node):
        for a in node.names:
            self.modules[a.asname or a.name] = a.name

    def visit_ImportFrom(self, node):
        for a in node.names:
            self.functions[a.asname or a.name] = (node.module or "", a.name)

    def module_of(self, expr):
        """The module an expression evaluates to, or None."""
        if isinstance(expr, ast.Name):
            return self.modules.get(expr.id)
        if (isinstance(expr, ast.Call) and len(expr.args) == 1
                and isinstance(expr.args[0], ast.Constant) and isinstance(expr.args[0].value, str)):
            f = expr.func
            if isinstance(f, ast.Name) and f.id == "__import__":
                return expr.args[0].value
            if self.target(f) == ("importlib", "import_module"):
                return expr.args[0].value
        return None

    def target(self, expr):
        """(module, function) an expression resolves to, or None."""
        if isinstance(expr, ast.Name):
            return self.functions.get(expr.id)
        if isinstance(expr, ast.Attribute) and isinstance(expr.value, ast.Name):
            mod = self.modules.get(expr.value.id)
            return (mod, expr.attr) if mod else None
        if (isinstance(expr, ast.Call) and isinstance(expr.func, ast.Name)
                and expr.func.id == "getattr" and len(expr.args) >= 2
                and isinstance(expr.args[0], ast.Name)
                and isinstance(expr.args[1], ast.Constant)
                and isinstance(expr.args[1].value, str)):
            mod = self.modules.get(expr.args[0].id)
            return (mod, expr.args[1].value) if mod else None
        return None


FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)


def own_nodes(scope):
    """The nodes of one scope. A nested function is yielded but not entered: its
    names are its own, and ast.walk - which cannot prune - would resolve a call
    inside it against the enclosing scope's bindings."""
    stack = list(ast.iter_child_nodes(scope))
    while stack:
        node = stack.pop()
        yield node
        if not isinstance(node, FUNCTIONS):
            stack.extend(ast.iter_child_nodes(node))


def assignments(scope):
    """name -> [value expressions], for one function body (or a module)."""
    out = {}
    for node in own_nodes(scope):
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    out.setdefault(t.id, []).append(node.value)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.value:
            out.setdefault(node.target.id, []).append(node.value)
    return out


def is_node_binary(expr, binds, local, module_level, depth=0):
    """True when expr resolves to shutil.which("node") - by binding, not spelling."""
    if isinstance(expr, ast.Call):
        return (binds.target(expr.func) == ("shutil", "which") and len(expr.args) == 1
                and isinstance(expr.args[0], ast.Constant) and expr.args[0].value == "node")
    if isinstance(expr, ast.Name) and depth < 3:
        values = local.get(expr.id) or module_level.get(expr.id) or []
        return bool(values) and all(
            is_node_binary(v, binds, local, module_level, depth + 1) for v in values)
    return False


def check_file(path):
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    binds = Bindings()
    binds.visit(tree)
    # `run = subprocess.run` makes `run` resolve too; so does rebinding a MODULE
    # (`sp = subprocess`, `sp = __import__("subprocess")`,
    # `sp = importlib.import_module("subprocess")`) - K7 round 5, DR-15. Repeated
    # until nothing new binds, so a chain of rebindings resolves. Bounded: a name
    # assigned two different modules (`x = subprocess; x = os`) flips on every
    # pass of a flow-insensitive scan and would never settle.
    for _ in range(16):
        changed = False
        for name, values in assignments(tree).items():
            for v in values:
                mod = binds.module_of(v)
                if mod and binds.modules.get(name) != mod:
                    binds.modules[name] = mod
                    changed = True
                t = binds.target(v)
                if t and binds.functions.get(name) != t:
                    binds.functions[name] = t
                    changed = True
        if not changed:
            break
    module_level = assignments(tree)
    found = []

    def scan(scope, local):
        for node in own_nodes(scope):
            if isinstance(node, FUNCTIONS):
                scan(node, assignments(node))
                continue
            if not isinstance(node, ast.Call):
                continue
            t = binds.target(node.func)
            if not t or t[1] not in LAUNCHERS.get(t[0], set()):
                continue
            mod, fn = t
            shell = any(k.arg == "shell" and not (isinstance(k.value, ast.Constant)
                                                  and k.value.value is False)
                        for k in node.keywords)
            if t in SHELL or shell:
                found.append({"file": str(path), "line": node.lineno, "callee": f"{mod}.{fn}",
                              "defect": "shell-command-string"})
                continue
            if fn in PROGRAM_ARG:
                i = PROGRAM_ARG[fn]
                program = node.args[i] if len(node.args) > i else None
            else:
                argv = node.args[0] if node.args else next(
                    (k.value for k in node.keywords if k.arg == "args"), None)
                program = (argv.elts[0] if isinstance(argv, (ast.List, ast.Tuple)) and argv.elts
                           and not isinstance(argv.elts[0], ast.Starred) else None)
            if program is None or not is_node_binary(program, binds, local, module_level):
                found.append({"file": str(path), "line": node.lineno, "callee": f"{mod}.{fn}",
                              "defect": "command-is-not-the-node-binary"})

    # Module-level code, and each function in its own scope (scan recurses).
    scan(tree, module_level)
    return sorted(found, key=lambda v: v["line"])


def declared_files(root):
    cfg = json.loads((root / ".metaframework" / "project.json").read_text(encoding="utf-8"))
    files = []
    for key, value in cfg.items():
        if key.startswith("_") or not isinstance(value, str):
            continue
        try:
            tokens = shlex.split(value)
        except ValueError:
            continue
        for tok in tokens:
            if tok.endswith(".py") and (root / tok).is_file():
                files.append((root / tok).resolve())
    # Follow repo-local imports one level: a module beside the script, imported by name.
    for f in list(files):
        for node in ast.walk(ast.parse(f.read_text(encoding="utf-8"))):
            names = ([a.name for a in node.names] if isinstance(node, ast.Import)
                     else [node.module] if isinstance(node, ast.ImportFrom) and node.module
                     else [])
            for n in names:
                local = f.parent / (n.replace(".", "/") + ".py")
                if local.is_file():
                    files.append(local.resolve())
    return sorted(set(files))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*")
    ap.add_argument("--declared", action="store_true")
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    if args.declared == bool(args.targets):
        print("spawn-portability.py: give --declared or targets, not both or neither",
              file=sys.stderr)
        return 2
    if args.declared:
        files = declared_files(root)
    else:
        files = []
        for t in args.targets:
            p = Path(t).resolve()
            files += sorted(p.rglob("*.py")) if p.is_dir() else [p]
    violations = [v for f in files for v in check_file(f)]
    print(json.dumps({"files": [str(f) for f in files], "violations": violations}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
