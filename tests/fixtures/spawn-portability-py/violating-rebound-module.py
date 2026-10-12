# K7 round 5 (DR-15): the module rebound to a local name, then used through it.
import subprocess
launcher = subprocess
launcher.run(["npx", "tsx", "x.ts"], check=True)
