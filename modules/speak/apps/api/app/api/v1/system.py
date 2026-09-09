import os
import subprocess
import sys
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.logging import logger

router = APIRouter(prefix="/system", tags=["system"])


class SwitchModeRequest(BaseModel):
    target: Literal["write", "speak", "immersion"] = Field(..., description="Target mode to switch to")


class SwitchModeResponse(BaseModel):
    status: str
    target: str
    redirect_url: str
    message: str


@router.post("/switch-mode", response_model=SwitchModeResponse)
async def switch_mode(request: SwitchModeRequest):
    """Gracefully shutdown JapSpeak processes (freeing RAM & CPU) and start JapWrite or JapImmersion."""
    target = request.target
    if target == "write":
        redirect_url = "http://localhost:5173"
    elif target == "immersion":
        redirect_url = "http://localhost:3002/immersion"
    else:
        raise HTTPException(status_code=400, detail=f"JapSpeak only supports switching to 'write' or 'immersion', got: {target}")

    # Find switch.bat upwards towards repository root
    curr = os.path.dirname(os.path.abspath(__file__))
    switch_bat = None
    for _ in range(8):
        candidate = os.path.join(curr, "switch.bat")
        if os.path.isfile(candidate):
            switch_bat = candidate
            break
        curr = os.path.dirname(curr)

    if not switch_bat or not os.path.isfile(switch_bat):
        switch_bat = r"E:\JapStudio\switch.bat"

    logger.info("Triggering mode switch to '%s' via %s...", target, switch_bat)

    # Detached process on Windows so it survives when this process port is killed
    detached_flags = 0
    if sys.platform == "win32":
        detached_flags = 0x00000008 | 0x00000200

    cmd = f'cmd.exe /c "ping -n 2 127.0.0.1 >nul & call \"{switch_bat}\" {target}"'
    try:
        subprocess.Popen(
            cmd,
            shell=True,
            creationflags=detached_flags,
            close_fds=True,
        )
    except Exception as e:
        logger.error("Failed to spawn switch process: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to trigger switch: {str(e)}")

    return SwitchModeResponse(
        status="switching",
        target=target,
        redirect_url=redirect_url,
        message="Switch triggered successfully. Old ports are terminating and new ports are starting.",
    )
