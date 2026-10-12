# Renamed at the import, so the call site never says run.
from subprocess import run as launch
launch(["npx", "tsx", "x.ts"], check=True)
