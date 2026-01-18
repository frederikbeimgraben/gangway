from typing import List

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import CONFIG
from ..state import STATE
from .models import AnimationModel

router = APIRouter()

# --- Pydantic Models ---


class ProjectionModel(BaseModel):
    src_points: List[List[float]]
    dst_points: List[List[float]]
    floor: List[float]
    cutout: List[List[float]] = []


class LedsModel(BaseModel):
    target_weight: float
    offset_x: float
    offset_y: float


class StripModel(BaseModel):
    index: int
    len: int
    start: List[float]
    end: List[float]


class ConfigModel(BaseModel):
    projection: ProjectionModel
    leds: LedsModel
    strips: List[StripModel]
    animation: AnimationModel


# --- Endpoints ---


@router.get("/", response_model=ConfigModel)
def get_config():
    """
    Returns the current configuration loaded from the YAML file.
    """
    try:
        with open(CONFIG.path, "r") as f:
            raw_config = yaml.safe_load(f)
        return ConfigModel(**raw_config)
    except Exception as e:
        # Catches file errors and Pydantic validation errors
        raise HTTPException(
            status_code=500, detail=f"Failed to load or validate config: {e}"
        )


@router.put("/")
def update_config(new_config: ConfigModel):
    """
    Updates the configuration, saves it to disk, and reloads the system.
    """
    try:
        with open(CONFIG.path, "r") as f:
            raw_config = yaml.safe_load(f)
        old_config = ConfigModel(**raw_config)

        # Apply only animation changes for security reasons
        old_config.animation = new_config.animation

        config_dict = old_config.model_dump()

        # Save to file
        with open(CONFIG.path, "w") as f:
            yaml.dump(config_dict, f, sort_keys=False)

        # Reload global config object
        CONFIG.load()

        # Reload LED Controller if active
        if STATE.led_controller:
            STATE.led_controller.reload_config()

        return {"message": "Config updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config: {e}")
