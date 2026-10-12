# The shape tools/rederive.py had before DR-07: the program is whatever a config
# string splits to, so nothing static can say it is the Node binary.
import shlex
import subprocess
def drive(invoke):
    cmd = shlex.split(invoke)
    return subprocess.run(cmd, capture_output=True, text=True)
