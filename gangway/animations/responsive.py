#!/usr/bin/env python3
"""
Object Animation Definitions
"""

from typing import Iterable, List, Tuple

from rpi_ws2805 import RGBCCT

from ..helpers import interpolate_rgbcct
from ..types import LED, Animation, Point, SceneContext
from .idle import wave


def exponential(
    primary: RGBCCT | Animation = RGBCCT(r=255),
    secondary: RGBCCT | Animation = RGBCCT(g=255),
    radius: float = 150,
) -> Animation:
    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
    ) -> RGBCCT:
        objects = list(objects)
        intensity = (
            max(2 ** (-(led.p - object).length / radius) for object in objects)
            if len(objects) != 0
            else 0
        )

        primary_rgbcct: RGBCCT

        if isinstance(primary, RGBCCT):
            primary_rgbcct = primary
        else:
            primary_rgbcct = primary(time, ctx, led, objects)

        if isinstance(secondary, RGBCCT):
            secondary_rgbcct = secondary
        else:
            secondary_rgbcct = secondary(time, ctx, led, objects)

        return interpolate_rgbcct(
            primary_rgbcct, secondary_rgbcct, intensity, use_sign=False
        )

    return animation


def dot(
    primary: RGBCCT | Animation = wave([RGBCCT(r=255)]),
    secondary: RGBCCT | Animation = wave([RGBCCT(g=255)]),
    radius: float = 150,
) -> Animation:
    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
    ) -> RGBCCT:
        primary_rgbcct: RGBCCT

        if isinstance(primary, RGBCCT):
            primary_rgbcct = primary
        else:
            primary_rgbcct = primary(time, ctx, led, objects)

        if isinstance(secondary, RGBCCT):
            secondary_rgbcct = secondary
        else:
            secondary_rgbcct = secondary(time, ctx, led, objects)

        return (
            primary_rgbcct
            if any((led.p - object).length < radius for object in objects)
            else secondary_rgbcct
        )

    return animation


def paint(
    primary: RGBCCT | Animation = RGBCCT(r=255, g=0, b=0),
    secondary: RGBCCT | Animation = RGBCCT(r=0, g=0, b=0),
    radius: float = 150,
    persistence: float = 2.0,
) -> Animation:
    """
    Like dot() but persists object-locations for n seconds.
    """
    # History stores (x, y, timestamp)
    history: List[Tuple[float, float, float]] = []
    last_frame_time = -1.0
    last_sample_time = -1.0
    active_points: List[Tuple[float, float]] = []

    # Parameters for optimization
    sample_rate = 0.05  # 20 Hz
    radius_sq = radius**2

    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
    ) -> RGBCCT:
        nonlocal history, last_frame_time, last_sample_time, active_points

        # Update history once per frame
        # We assume 'time' is monotonic and strictly increasing per frame
        if time > last_frame_time:
            cutoff = time - persistence
            # 1. Prune history (x, y, t)
            history = [h for h in history if h[2] > cutoff]

            # 2. Sample new points if interval elapsed
            if time - last_sample_time >= sample_rate:
                for obj in objects:
                    history.append((obj.x, obj.y, time))
                last_sample_time = time

            # 3. Prepare active points for this frame: History + Current Objects
            active_points = [(x, y) for x, y, _ in history]
            # Add current objects to ensure immediate responsiveness
            active_points.extend((obj.x, obj.y) for obj in objects)

            last_frame_time = time

        primary_rgbcct: RGBCCT
        if isinstance(primary, RGBCCT):
            primary_rgbcct = primary
        else:
            primary_rgbcct = primary(time, ctx, led, objects)

        if isinstance(secondary, RGBCCT):
            secondary_rgbcct = secondary
        else:
            secondary_rgbcct = secondary(time, ctx, led, objects)

        # Check against active_points using squared distance
        led_x = led.p.x
        led_y = led.p.y
        hit = False
        for px, py in active_points:
            dist_sq = (led_x - px) ** 2 + (led_y - py) ** 2
            if dist_sq < radius_sq:
                hit = True
                break

        return primary_rgbcct if hit else secondary_rgbcct

    return animation


def off() -> Animation:
    """
    A simple animation that turns LEDs off.
    """

    def animation(
        *_args,
        **_kwargs,
    ) -> RGBCCT:
        return RGBCCT()

    return animation
