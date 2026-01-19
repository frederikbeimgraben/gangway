from typing import Any, List, Optional

from .led_controller import LEDController
from .types import Point


class State:
    led_controller: Optional[LEDController] = None
    xovis_server: Any = None
    objects: List[Point] = []


STATE = State()
