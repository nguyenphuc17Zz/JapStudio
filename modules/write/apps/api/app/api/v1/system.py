import logging
import os
import subprocess
import sys
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("app.system")

router = APIRouter(prefix="/system", tags=["system"])


class SwitchModeRequest(BaseModel):
    target: Literal["speak", "write", "immersion"] = Field(..., description="Target mode to switch to")


class SwitchModeResponse(BaseModel):
    status: str
    target: str
    redirect_url: str
    message: str


@router.post("/switch-mode", response_model=SwitchModeResponse)
async def switch_mode(request: SwitchModeRequest):
    """Gracefully shutdown JapWrite processes (freeing RAM & CPU) and start JapSpeak or JapImmersion."""
    target = request.target
    if target == "speak":
        redirect_url = "http://localhost:3000/dashboard"
    elif target == "immersion":
        redirect_url = "http://localhost:3002/immersion"
    else:
        raise HTTPException(status_code=400, detail=f"JapWrite only supports switching to 'speak' or 'immersion', got: {target}")

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

    # Detached process so it lives past this process being killed
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
