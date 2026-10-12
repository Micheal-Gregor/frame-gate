# K7 round 5 (DR-15): asyncio starts a process as surely as subprocess does.
import asyncio
async def drive():
    return await asyncio.create_subprocess_exec("npx", "tsx", "x.ts")
