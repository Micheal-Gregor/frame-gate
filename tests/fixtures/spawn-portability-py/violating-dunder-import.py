# The module obtained at runtime by name, then used.
import importlib
sp = __import__("subprocess")
sp.run(["npx", "tsx", "x.ts"], check=True)
other = importlib.import_module("subprocess")
other.call(["npx", "tsx", "y.ts"])
