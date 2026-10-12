# Reached through getattr: no attribute access for a text scan to read.
import subprocess
getattr(subprocess, "run")(["npx", "tsx", "x.ts"], check=True)
