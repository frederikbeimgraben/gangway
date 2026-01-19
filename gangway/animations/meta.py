#!/usr/bin/env python3
"""
Meta-Animation Definitions
"""

import datetime
from pathlib import Path
from typing import Dict, Iterable, Literal, Optional, Set, Tuple

import yaml
from rpi_ws2805 import RGBCCT

from ..helpers import interpolate_rgbcct, parse_animation
from ..types import LED, Animation, Point, SceneContext


def alternate(
    *animations: Animation | RGBCCT,
    length: float = 10,
) -> Animation:
    if len(animations) == 0:
        return lambda *args, **kwargs: RGBCCT()

    def animation(
        time: float,
        _ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *_args,
        **_kwargs,
    ) -> RGBCCT:
        return (
            anim
            if isinstance(
                (anim := animations[int(time / length) % len(animations)]), RGBCCT
            )
            else anim(time, _ctx, led, objects)
        )

    return animation


def blend(
    *animations: Animation | RGBCCT, mode: Literal["average", "max"] = "average"
) -> Animation:
    def animation(
        time: float,
        _ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *_args,
        **_kwargs,
    ) -> RGBCCT:
        colors_list = [
            anim if isinstance(anim, RGBCCT) else anim(time, _ctx, led, objects)
            for anim in animations
        ]

        if not colors_list:
            return RGBCCT()

        tuples = (
            (color.r, color.g, color.b, color.cw, color.ww) for color in colors_list
        )
        zipped = zip(*tuples)

        if mode == "max":
            result = tuple(max(values) for values in zipped)
        else:
            result = tuple(int(sum(values) / len(colors_list)) for values in zipped)

        return RGBCCT(r=result[0], g=result[1], b=result[2], cw=result[3], ww=result[4])

    return animation


def schedule(
    primary: Animation | RGBCCT,
    secondary: Animation | RGBCCT,
    start: str = "18:00",
    end: str = "06:00",
) -> Animation:
    """
    Activates the primary animation only between specific hours.
    Otherwise returns secondary animation.
    """

    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        now = datetime.datetime.now().time()
        try:
            start_t = datetime.time.fromisoformat(start)
            end_t = datetime.time.fromisoformat(end)
        except ValueError:
            # Fallback if time format is invalid
            start_t = datetime.time(18, 0)
            end_t = datetime.time(6, 0)

        is_active = False
        if start_t <= end_t:
            is_active = start_t <= now <= end_t
        else:  # crosses midnight
            is_active = now >= start_t or now <= end_t

        target = primary if is_active else secondary

        if isinstance(target, RGBCCT):
            return target

        return target(time, ctx, led, objects, *args, **kwargs)

    return animation


def smooth(
    animation: Animation | RGBCCT,
    smoothing: float = 0.5,
) -> Animation:
    """
    Smooths the input animation over time using an exponential moving average.
    smoothing: 0.0 = no smoothing (instant), 1.0 = infinite smoothing (no change).
    """
    # Store state as floats to prevent quantization artifacts
    last_colors: Dict[int, tuple] = {}

    def func(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        nonlocal last_colors

        target: RGBCCT
        if isinstance(animation, RGBCCT):
            target = animation
        else:
            target = animation(time, ctx, led, objects, *args, **kwargs)

        current = last_colors.get(led.index)

        if current is None:
            # First frame, jump to target
            current = (
                float(target.r),
                float(target.g),
                float(target.b),
                float(target.cw),
                float(target.ww),
            )
            last_colors[led.index] = current
            return target

        # Interpolate using floats
        # next = current * smoothing + target * (1 - smoothing)
        weight = 1.0 - smoothing
        next_r = current[0] * smoothing + target.r * weight
        next_g = current[1] * smoothing + target.g * weight
        next_b = current[2] * smoothing + target.b * weight
        next_cw = current[3] * smoothing + target.cw * weight
        next_ww = current[4] * smoothing + target.ww * weight

        last_colors[led.index] = (next_r, next_g, next_b, next_cw, next_ww)

        return RGBCCT(
            r=int(next_r),
            g=int(next_g),
            b=int(next_b),
            cw=int(next_cw),
            ww=int(next_ww),
        )

    return func


def persist(
    animation: Animation,
    duration: float = 2.0,
) -> Animation:
    """
    Keeps objects "alive" for the sub-animation for a few seconds
    after they are no longer detected.
    """
    # {object_id: (Point, last_seen_time)}
    persisted_objects: Dict[int, Tuple[Point, float]] = {}
    last_frame_time = -1.0

    def func(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        nonlocal persisted_objects, last_frame_time

        # --- This logic should only run once per frame ---
        if time > last_frame_time:
            # Update last_seen_time for currently visible objects
            # Note: We don't have a stable object ID from the Xovis data,
            # so we'll use the Point's hash as a pseudo-ID. This is not
            # perfect but works for transient objects.
            current_ids = {hash(o.tuple) for o in objects}
            for obj in objects:
                persisted_objects[hash(obj.tuple)] = (obj, time)

            # Prune old objects
            expired_ids = []
            for obj_id, (point, last_seen) in persisted_objects.items():
                if time - last_seen > duration:
                    expired_ids.append(obj_id)
                # Also prune if a "current" object is no longer detected
                elif obj_id not in current_ids and time - last_seen > 0.1:
                    expired_ids.append(obj_id)

            for obj_id in expired_ids:
                if obj_id in persisted_objects:
                    del persisted_objects[obj_id]

            last_frame_time = time
        # --- End of per-frame logic ---

        # Pass the combined list of current and persisted objects to the sub-animation
        all_objects = [p for p, t in persisted_objects.values()]
        return animation(time, ctx, led, all_objects, *args, **kwargs)

    return func


def proximity(
    primary: Animation | RGBCCT,
    secondary: Animation | RGBCCT,
    x: float = 0.0,
    y: float = 0.0,
    radius: float = 200.0,
) -> Animation:
    """
    Blends between primary and secondary based on the closest object's
    distance to a target point.
    """
    target_point = Point(x=x, y=y)

    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        # Evaluate the base colors from the animations for this LED
        primary_color = (
            primary
            if isinstance(primary, RGBCCT)
            else primary(time, ctx, led, objects, *args, **kwargs)
        )
        secondary_color = (
            secondary
            if isinstance(secondary, RGBCCT)
            else secondary(time, ctx, led, objects, *args, **kwargs)
        )

        object_list = list(objects)
        if not object_list:
            return secondary_color

        # Find the distance of the closest object to the target point
        min_dist = min((obj - target_point).length for obj in object_list)

        # Calculate intensity (0 to 1)
        intensity = 1.0 - (min_dist / radius)
        if intensity < 0:
            intensity = 0
        if intensity > 1:
            intensity = 1

        # Interpolate between secondary (intensity 0) and primary (intensity 1)
        return interpolate_rgbcct(
            primary_color, secondary_color, intensity, use_sign=False
        )

    return animation


last_time: Dict[
    Tuple[
        Tuple[float, float],
        Literal["speed up", "slow down"],
        float,
        float,
        float,
        float,
    ],
    float,
] = {}
real_last_time: Dict[
    Tuple[
        Tuple[float, float],
        Literal["speed up", "slow down"],
        float,
        float,
        float,
        float,
    ],
    float,
] = {}


def proximity_speed(
    animation: Animation | RGBCCT,
    x: float = 0.0,
    y: float = 0.0,
    radius: float = 200.0,
    multiplier: float = 1.0,
    mode: Literal["speed up", "slow down"] = "speed up",
    proximity_factor: float = 0.5,
) -> Animation:
    """
    Increases the speed of the animation based on the distance to the target point.
    """

    target_point = Point(x=x, y=y)

    def _animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        key = (target_point.tuple, mode, x, y, radius, multiplier)

        if last_time.get(key) is None:
            last_time[key] = time
            real_last_time[key] = time

        object_list = list(objects)
        if not object_list:
            last_time[key] += time - real_last_time[key]
            real_last_time[key] = time

            return (
                animation
                if isinstance(animation, RGBCCT)
                else animation(last_time[key], ctx, led, objects, *args, **kwargs)
            )

        # Find the distance of the closest object to the target point
        min_dist = min((obj - target_point).length for obj in object_list)

        # Calculate intensity (0 to 1)
        intensity = (1.0 - (min_dist / radius)) * max(min(proximity_factor, 1), 0)
        if intensity < 0:
            intensity = 0
        if intensity > 1:
            intensity = 1

        t_diff = time - real_last_time[key]
        real_last_time[key] = time

        if mode == "speed up":
            last_time[key] = last_time[key] + t_diff / (1 - intensity) * multiplier
        elif mode == "slow down":
            last_time[key] = last_time[key] + t_diff / (1 + intensity) * multiplier
        else:
            raise ValueError("Invalid mode")

        # Interpolate between secondary (intensity 0) and primary (intensity 1)
        return (
            animation
            if isinstance(animation, RGBCCT)
            else animation(last_time[key], ctx, led, objects, *args, **kwargs)
        )

    return _animation


def preset(name: str, visited_presets: Optional[Set[str]] = None) -> Animation | RGBCCT:
    from ..config import ANIMATION_FUNCTIONS

    if visited_presets is None:
        visited_presets = set()

    if name in visited_presets:
        return RGBCCT()

    new_visited = visited_presets.copy()
    new_visited.add(name)

    presets_dir = Path(__file__).parent.parent.parent / "presets"
    preset_path = presets_dir / f"{name}.yaml"

    if not preset_path.exists():
        return RGBCCT()

    with open(preset_path, "r") as f:
        anim_config = yaml.safe_load(f)

    if anim_config is None:
        return RGBCCT()

    return parse_animation(
        anim_config, ANIMATION_FUNCTIONS, visited_presets=new_visited
    )


def day_of_week(
    monday: Animation | RGBCCT = RGBCCT(),
    tuesday: Animation | RGBCCT = RGBCCT(),
    wednesday: Animation | RGBCCT = RGBCCT(),
    thursday: Animation | RGBCCT = RGBCCT(),
    friday: Animation | RGBCCT = RGBCCT(),
    saturday: Animation | RGBCCT = RGBCCT(),
    sunday: Animation | RGBCCT = RGBCCT(),
) -> Animation:
    days = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]

    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        # 0 = Monday, 6 = Sunday
        weekday = datetime.datetime.now().weekday()
        anim = days[weekday]

        if isinstance(anim, RGBCCT):
            return anim
        return anim(time, ctx, led, objects, *args, **kwargs)

    return animation


def exponential_at(
    primary: RGBCCT | Animation = RGBCCT(r=255),
    secondary: RGBCCT | Animation = RGBCCT(g=255),
    x: float = 0.0,
    y: float = 0.0,
    radius: float = 150,
) -> Animation:
    """
    Like exponential, but based on a fixed point instead of objects.
    """
    target_point = Point(x=x, y=y)

    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        intensity = 2 ** (-(led.p - target_point).length / radius)

        primary_color = (
            primary
            if isinstance(primary, RGBCCT)
            else primary(time, ctx, led, objects, *args, **kwargs)
        )
        secondary_color = (
            secondary
            if isinstance(secondary, RGBCCT)
            else secondary(time, ctx, led, objects, *args, **kwargs)
        )

        return interpolate_rgbcct(
            primary_color, secondary_color, intensity, use_sign=False
        )

    return animation


def strip_assignment(
    strip: int,
    animation: Animation | RGBCCT,
) -> Tuple[int, Animation | RGBCCT]:
    return strip, animation


def by_strip(
    assignments: Iterable[Tuple[int, Animation | RGBCCT]] | None = None,
    default: Animation | RGBCCT = RGBCCT(),
) -> Animation:
    if assignments is None:
        mapping = {}
    else:
        mapping = dict(assignments)

    def animation(
        time: float,
        ctx: SceneContext,
        led: LED,
        objects: Iterable[Point],
        *args,
        **kwargs,
    ) -> RGBCCT:
        idx = getattr(led, "strip_index", -1)
        anim = mapping.get(idx, default)

        if isinstance(anim, RGBCCT):
            return anim
        return anim(time, ctx, led, objects, *args, **kwargs)

    return animation
