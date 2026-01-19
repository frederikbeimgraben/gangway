from fastapi import APIRouter

from ..state import STATE

router = APIRouter()


@router.get("/objects")
def get_objects():
    if not STATE.led_controller:
        return []

    return [{"x": p.x, "y": p.y} for p in STATE.objects]


@router.get("/leds")
def get_leds():
    if not STATE.led_controller:
        return {}

    leds_data = {}
    for led in STATE.led_controller.leds:
        color = STATE.led_controller.color_of(led)
        leds_data[led.index] = {
            "r": color.r,
            "g": color.g,
            "b": color.b,
            "cw": color.cw,
            "ww": color.ww,
        }
    return leds_data


@router.get("/fps")
def get_fps():
    if not STATE.led_controller:
        return {"fps": 0, "tpf_min": 0, "tpf_max": 0, "tpf_avg": 0, "ups": 0}

    ups = 0
    if STATE.xovis_server:
        ups = STATE.xovis_server.ups

    return {
        "fps": round(STATE.led_controller.fps, 2),
        "tpf_min": round(STATE.led_controller.tpf_min * 1000, 2),  # ms
        "tpf_max": round(STATE.led_controller.tpf_max * 1000, 2),  # ms
        "tpf_avg": round(STATE.led_controller.tpf_avg * 1000, 2),  # ms
        "ups": round(ups, 2),
    }
