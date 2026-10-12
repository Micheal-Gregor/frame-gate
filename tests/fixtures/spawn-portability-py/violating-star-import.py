# K7 round 7 (WI-04): a star import makes `run` a bare name the sweep never bound.
from subprocess import *
run(["npx", "tsx", "x.ts"], check=True)
