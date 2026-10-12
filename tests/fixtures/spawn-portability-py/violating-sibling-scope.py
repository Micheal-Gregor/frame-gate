# `node` is bound to the Node binary only inside setup(). drive() reads a GLOBAL
# `node` that does not exist. A sweep that merges function scopes - as ast.walk
# does, since it cannot prune - would see setup's binding and admit drive's launch.
import shutil
import subprocess
def setup():
    node = shutil.which("node")
    return node
def drive():
    return subprocess.run([node, "x.mjs"])
