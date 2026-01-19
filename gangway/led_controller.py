#!/usr/bin/env python3
"""
Controller Thread for Animations
"""

import collections
import time
from threading import Thread
from typing import Dict, List, Tuple

from rpi_ws2805 import RGBCCT, PixelStrip

from . import config
from .config import CONFIG, GANGWAYConfig
from .defaults import (
    LED_BRIGHTNESS,
    LED_CHANNEL,
    LED_DMA,
    LED_FREQ_HZ,
    LED_INVERT,
    LED_PIN,
    WS2805_STRIP,
)
from .types import LED, Animation, Point, Rectangle, SceneContext


class LEDController(Thread):
    """
    Controller Thread for LED-Strips. Can be updated with object positions to use in animations.
    """

    # Config
    leds: List[LED]
    running: bool = True
    strip: PixelStrip
    floor: Rectangle
    animation: Animation | RGBCCT

    config: GANGWAYConfig

    # State
    current_colors: Dict[int, RGBCCT]
    last_objects: List[Point]  # An object is equivalent to a detected person

    # Time counters
    init_time: float

    # Stats
    fps: float = 0.0
    tpf_min: float = 0.0
    tpf_max: float = 0.0
    tpf_avg: float = 0.0
    _frame_times: collections.deque

    def __init__(self, gangway_config: GANGWAYConfig = CONFIG) -> None:
        super().__init__()

        self.init_time = time.time()
        self.config = gangway_config
        self.last_objects = []
        self._frame_times = collections.deque(maxlen=100)

        self.reload_config()

        self.__init_strip()

    def __init_strip(self) -> None:
        self.strip = PixelStrip(
            len(self.leds),
            LED_PIN,
            LED_FREQ_HZ,
            LED_DMA,
            LED_INVERT,
            LED_BRIGHTNESS,
            LED_CHANNEL,
            strip_type=WS2805_STRIP,
        )
        self.strip.begin()

    def reload_config(self) -> None:
        self.leds = self.config.LEDS
        self.animation = self.config.ANIMATION
        self.floor = self.config.FLOOR

        if isinstance(self.animation, RGBCCT):
            self.current_colors = {led.index: self.animation for led in self.leds}
        else:
            self.current_colors = {led.index: RGBCCT(cw=255) for led in self.leds}

    @property
    def time(self) -> float:
        return time.time() - self.init_time

    def stop(self) -> None:
        self.running = False
        self.join()

    def update_objects(self, objects: List[Point] = []) -> None:
        """
        Inform the Thread of new objects to render.
        Will switch the thread to idle animation if called without parameters or empty list.
        """

        self.last_objects = objects

    def color_of(self, led: LED) -> RGBCCT:
        """
        Get the current color of an LED
        """

        return RGBCCT(
            value=self.current_colors[led.index] & 0xFFFFFFFFFF,
        )

    def apply_colors(self, colors: Dict[int, RGBCCT]) -> None:
        self.current_colors = colors

        _ = [
            self.strip.setPixelColor(led.index, (c := self.color_of(led))) or c
            for led in self.leds
        ]  # Use Generator cause it is more efficient in python

        self.strip.show()

    @property
    def context(self):
        return SceneContext(
            self.floor,
            self.leds,
        )

    @property
    def animate(self):
        """
        Infinite iterator of colors
        """

        while True:
            yield {
                led.index: self.animation
                if isinstance(self.animation, RGBCCT)
                else self.animation(
                    self.time,
                    self.context,
                    led,
                    self.last_objects,
                )
                for led in self.leds
            }

    def run(self) -> None:
        """
        Main animation loop
        """

        self.init_time = time.time()
        last_frame_start = time.perf_counter()

        for colors in self.animate:
            # Measure time since last frame start (Total Frame Time)
            now = time.perf_counter()
            dt = now - last_frame_start
            last_frame_start = now

            if dt > 0:
                self._frame_times.append(dt)

            if len(self._frame_times) > 0:
                self.fps = 1.0 / (sum(self._frame_times) / len(self._frame_times))
                self.tpf_min = min(self._frame_times)
                self.tpf_max = max(self._frame_times)
                self.tpf_avg = sum(self._frame_times) / len(self._frame_times)

            self.apply_colors(colors)

            if not self.running:
                break
