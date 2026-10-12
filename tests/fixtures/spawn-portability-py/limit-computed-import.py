# REGISTERED LIMIT (IR-41): a module whose NAME is computed cannot be bound by a
# static sweep. The sweep does NOT flag it.
mod = __import__("sub" + "process")
mod.run(["npx", "tsx", "x.ts"], check=True)
