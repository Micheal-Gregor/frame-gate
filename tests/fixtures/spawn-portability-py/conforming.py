# The Node binary, resolved explicitly: through a name every assignment of which
# is shutil.which("node"), and directly through an aliased import of which.
import shutil
import subprocess
from shutil import which as find
def drive(args):
    node = shutil.which("node")
    if node is None:
        raise SystemExit("node not found")
    subprocess.run([node, *args], check=True)
    subprocess.run([find("node"), "y.mjs"], check=True)
