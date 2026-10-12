# The module binds the Node binary; the function shadows it with a name. Scope
# decides, so this is a violation even though a conforming `node` exists above.
import shutil
import subprocess
node = shutil.which("node")
def drive():
    node = "npx"
    return subprocess.run([node, "tsx", "x.ts"])
