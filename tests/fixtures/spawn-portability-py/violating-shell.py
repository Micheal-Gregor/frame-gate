# A command STRING handed to a shell.
import subprocess
subprocess.run("node x.mjs", shell=True, check=True)
