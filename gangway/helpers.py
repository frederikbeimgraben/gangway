#!/usr/bin/env python3
"""
Helper Functions
"""

import inspect
from typing import Any, Callable, Dict, Optional, Set, Union

from rpi_ws2805 import RGBCCT

from .types import Point


def sign(x: float, use_sign: bool) -> int:
    if not use_sign:
        return 0

    return 0 if x == 0 else (-1 if x < 0 else 1)


def interpolate_rgbcct(
    color_a: RGBCCT, color_b: RGBCCT, weight_a: float, use_sign: bool = True
) -> RGBCCT:
    return RGBCCT(
        r=int(color_a.r * weight_a + color_b.r * (1 - weight_a))
        - sign(color_b.r - color_a.r, use_sign),
        g=int(color_a.g * weight_a + color_b.g * (1 - weight_a))
        - sign(color_b.g - color_a.g, use_sign),
        b=int(color_a.b * weight_a + color_b.b * (1 - weight_a))
        - sign(color_b.b - color_a.b, use_sign),
        ww=int(color_a.ww * weight_a + color_b.ww * (1 - weight_a))
        - sign(color_b.ww - color_a.ww, use_sign),
        cw=int(color_a.cw * weight_a + color_b.cw * (1 - weight_a))
        - sign(color_b.cw - color_a.cw, use_sign),
    )


def interpolate_points(p1: Point, p2: Point, num, index):
    return (p1 - p2) / num * (index + 0.5) + p1


def to_hex(color: RGBCCT) -> str:
    return f"#{color.r:02x}{color.g:02x}{color.b:02x}"


def parse_animation(
    anim_config: Any,
    animation_functions: Dict[str, Callable],
    visited_presets: Optional[Set[str]] = None,
) -> Union[Callable, RGBCCT]:
    if not isinstance(anim_config, dict):
        return anim_config

    if "r" in anim_config and "g" in anim_config and "b" in anim_config:
        return RGBCCT(**anim_config)

    anim_name = list(anim_config.keys())[0]
    anim_args = list(anim_config.values())[0]

    anim_func = animation_functions.get(anim_name)
    if not anim_func:
        raise ValueError(f"Unknown animation function: {anim_name}")

    sig = inspect.signature(anim_func)

    parsed_args = {}
    var_args = []

    if isinstance(anim_args, dict):
        # Check for unexpected arguments
        valid_param_names = {p.name for p in sig.parameters.values()}
        for arg_name in anim_args.keys():
            if arg_name not in valid_param_names:
                raise ValueError(
                    f"Unknown parameter '{arg_name}' for animation '{anim_name}'"
                )

        for param in sig.parameters.values():
            if param.kind == inspect.Parameter.VAR_POSITIONAL:
                if param.name in anim_args:
                    for arg in anim_args[param.name]:
                        var_args.append(
                            parse_animation(arg, animation_functions, visited_presets)
                        )
                continue

            if param.name in anim_args:
                arg_value = anim_args[param.name]
                if isinstance(arg_value, dict):
                    parsed_args[param.name] = parse_animation(
                        arg_value, animation_functions, visited_presets
                    )
                elif isinstance(arg_value, list):
                    parsed_args[param.name] = [
                        parse_animation(v, animation_functions, visited_presets)
                        for v in arg_value
                    ]
                else:
                    parsed_args[param.name] = arg_value
            elif param.default is not inspect.Parameter.empty:
                parsed_args[param.name] = param.default
    else:
        # anim_args is a scalar or list (not dict), map to first parameter
        params = [
            p
            for p in sig.parameters.values()
            if p.name != "visited_presets"
            and p.kind
            in (
                inspect.Parameter.POSITIONAL_ONLY,
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
            )
        ]
        if params:
            first_param = params[0]
            parsed_args[first_param.name] = anim_args

        # Apply defaults for other parameters
        for param in sig.parameters.values():
            if (
                param.name not in parsed_args
                and param.default is not inspect.Parameter.empty
            ):
                parsed_args[param.name] = param.default

    if "visited_presets" in sig.parameters:
        parsed_args["visited_presets"] = visited_presets

    return anim_func(*var_args, **parsed_args)
