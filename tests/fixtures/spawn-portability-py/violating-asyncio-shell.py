# K7 round 5 (DR-15): a command string for the platform shell, via asyncio.
import asyncio
async def drive():
    return await asyncio.create_subprocess_shell("node x.mjs")
