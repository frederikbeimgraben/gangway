from typing import Any, List, Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import CONFIG
from ..state import STATE
from .models import AnimationModel

router = APIRouter()

# Ensure presets directory exists
PRESETS_DIR = CONFIG.path.parent / "presets"
PRESETS_DIR.mkdir(exist_ok=True)


def find_preset_usage(data: Any, target_name: str) -> bool:
    if isinstance(data, dict):
        if "preset" in data:
            val = data["preset"]
            if val == target_name:
                return True
            if isinstance(val, dict) and val.get("name") == target_name:
                return True

        for value in data.values():
            if find_preset_usage(value, target_name):
                return True

    elif isinstance(data, list):
        for item in data:
            if find_preset_usage(item, target_name):
                return True

    return False


class PresetModel(BaseModel):
    name: str
    animation: AnimationModel


@router.get("/", response_model=List[str])
def list_presets():
    """List all available presets."""
    return [p.stem for p in PRESETS_DIR.glob("*.yaml")]


@router.get("/{name}", response_model=PresetModel)
def get_preset(name: str):
    """Get the configuration of a specific preset."""
    preset_path = PRESETS_DIR / f"{name}.yaml"
    if not preset_path.exists():
        raise HTTPException(status_code=404, detail="Preset not found")

    try:
        with open(preset_path, "r") as f:
            animation_data = yaml.safe_load(f)
        return PresetModel(name=name, animation=animation_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load preset: {e}")


@router.post("/{name}")
def save_preset(name: str, animation: Optional[AnimationModel] = None):
    """
    Save a preset.
    If animation data is provided, it saves that.
    If no body is provided, it saves the currently active animation configuration.
    """
    if animation is None:
        try:
            # Read current configuration from disk to get the active animation
            with open(CONFIG.path, "r") as f:
                current_config = yaml.safe_load(f)
                animation_data = current_config.get("animation")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to read current config: {e}"
            )
    else:
        animation_data = animation.model_dump()

    preset_path = PRESETS_DIR / f"{name}.yaml"
    try:
        with open(preset_path, "w") as f:
            yaml.dump(animation_data, f, sort_keys=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save preset: {e}")

    return {"message": f"Preset '{name}' saved"}


@router.post("/{name}/load")
def load_preset(name: str):
    """Load a preset into the active configuration."""
    preset_path = PRESETS_DIR / f"{name}.yaml"
    if not preset_path.exists():
        raise HTTPException(status_code=404, detail="Preset not found")

    try:
        with open(preset_path, "r") as f:
            animation_data = yaml.safe_load(f)

        # Update the main configuration file
        with open(CONFIG.path, "r") as f:
            config_data = yaml.safe_load(f)

        config_data["animation"] = animation_data

        with open(CONFIG.path, "w") as f:
            yaml.dump(config_data, f, sort_keys=False)

        # Reload the system configuration
        CONFIG.load()

        # Reload LED Controller if active
        if STATE.led_controller:
            STATE.led_controller.reload_config()

        return {"message": f"Preset '{name}' loaded"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load/apply preset: {e}")


@router.delete("/{name}")
def delete_preset(name: str):
    """Delete a preset."""
    # Check if used in active configuration
    if find_preset_usage(CONFIG.data.get("animation"), name):
        raise HTTPException(
            status_code=400,
            detail=f"Preset '{name}' is currently in use in the active configuration.",
        )

    # Check if used in other presets
    for p in PRESETS_DIR.glob("*.yaml"):
        if p.stem == name:
            continue

        try:
            with open(p, "r") as f:
                content = yaml.safe_load(f)
            if find_preset_usage(content, name):
                raise HTTPException(
                    status_code=400,
                    detail=f"Preset '{name}' is used by another preset '{p.stem}'.",
                )
        except HTTPException:
            raise
        except Exception:
            continue

    preset_path = PRESETS_DIR / f"{name}.yaml"
    if preset_path.exists():
        try:
            preset_path.unlink()
            return {"message": f"Preset '{name}' deleted"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete preset: {e}")
    else:
        raise HTTPException(status_code=404, detail="Preset not found")
