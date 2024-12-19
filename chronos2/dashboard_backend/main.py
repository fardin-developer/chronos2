from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any
import os

app = FastAPI()


class BoilerState(BaseModel):
    chronos_status: bool
    message: str


def get_chronos_status() -> bool:
    """
    Check if the Chronos process is running.
    """
    chronos_status = True
    try:
        with open("/var/run/chronos.pid") as pid_file:
            pid = int(pid_file.readline())
    except IOError:
        chronos_status = False
    else:
        chronos_status = os.path.exists(f"/proc/{pid}")
    return chronos_status


@app.get("/", response_model=BoilerState)
def read_root():
    """
    Root endpoint to get boiler state.
    """
    chronos_status = get_chronos_status()
    return {
        "chronos_status": chronos_status,
        "message": "Boiler state fetched successfully",
    }
