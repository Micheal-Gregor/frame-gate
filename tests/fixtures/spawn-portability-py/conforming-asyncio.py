# The Node binary through asyncio's exec launcher: portable.
import asyncio
import shutil
async def drive():
    node = shutil.which("node")
    return await asyncio.create_subprocess_exec(node, "x.mjs")
