import cv2
import numpy as np
import requests
from fastapi import APIRouter
from fastapi.responses import Response

from .. import config
from ..helpers import to_hex
from ..state import STATE
from ..xovis.homographic_projection import get_homography

router = APIRouter()


@router.get("/objects", response_class=Response)
def get_objects():
    if not STATE.led_controller:
        return Response(status_code=503, content="LED Controller not ready")

    svg_elements = [
        f'<circle cx="{p.x}" cy="{p.y}" r="5" fill="red" />' for p in STATE.objects
    ]

    content = f'<svg width="{STATE.led_controller.floor.p2.x}" height="{STATE.led_controller.floor.p2.y}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="transparent" stroke="black"/>{"".join(svg_elements)}</svg>'
    return Response(content=content, media_type="image/svg+xml")


@router.get("/strips", response_class=Response)
def get_strips():
    if not STATE.led_controller:
        return Response(status_code=503, content="LED Controller not ready")

    svg_elements = [
        f'<line x1="{s.start.x}" y1="{s.start.y}" x2="{s.end.x}" y2="{s.end.y}" stroke="black" stroke-width="5" />'
        for s in config.CONFIG.STRIPS
    ]

    content = f'<svg width="{STATE.led_controller.floor.p2.x}" height="{STATE.led_controller.floor.p2.y}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="transparent" stroke="black"/>{"".join(svg_elements)}</svg>'
    return Response(content=content, media_type="image/svg+xml")


@router.get("/state", response_class=Response)
def get_state():
    if not STATE.led_controller:
        return Response(status_code=503, content="LED Controller not ready")

    defs = []
    svg_elements = []

    for i, strip in enumerate(config.CONFIG.STRIPS):
        gradient_id = f"gradient{i}"
        stops = []
        for j in range(strip.len):
            led_index = strip.index + j
            led = next(
                (led for led in STATE.led_controller.leds if led.index == led_index),
                None,
            )
            if led:
                color = STATE.led_controller.color_of(led)
                hex_color = to_hex(color)
                offset = j / (strip.len - 1)
                stops.append(f'<stop offset="{offset}" stop-color="{hex_color}" />')
        defs.append(
            f'<linearGradient id="{gradient_id}" x1="{strip.start.x}" y1="{strip.start.y}" x2="{strip.end.x}" y2="{strip.end.y}" gradientUnits="userSpaceOnUse">{"".join(stops)}</linearGradient>'
        )
        svg_elements.append(
            f'<line x1="{strip.start.x}" y1="{strip.start.y}" x2="{strip.end.x}" y2="{strip.end.y}" stroke="black" stroke-width="7" />'
        )
        svg_elements.append(
            f'<line x1="{strip.start.x}" y1="{strip.start.y}" x2="{strip.end.x}" y2="{strip.end.y}" stroke="url(#{gradient_id})" stroke-width="5" />'
        )

    content = f'<svg width="{STATE.led_controller.floor.p2.x}" height="{STATE.led_controller.floor.p2.y}" xmlns="http://www.w3.org/2000/svg"><defs>{"".join(defs)}</defs><rect width="100%" height="100%" fill="transparent" stroke="black"/>{"".join(svg_elements)}</svg>'
    return Response(content=content, media_type="image/svg+xml")


@router.get("/live", response_class=Response)
def get_live():
    try:
        response = requests.get("http://localhost:80/live", verify=False)
        response.raise_for_status()

        image_array = np.frombuffer(response.content, np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            return Response(status_code=502, content="Failed to decode upstream image")

        img = cv2.flip(img, -1)

        is_success, buffer = cv2.imencode(".jpg", img)
        if not is_success:
            return Response(status_code=500, content="Failed to encode image")

        return Response(content=buffer.tobytes(), media_type="image/jpeg")

    except Exception as e:
        print(f"Error in /live: {e}")
        return Response(status_code=500, content=str(e))


@router.get("/homography")
def get_homography_data():
    M = get_homography(src=config.CONFIG.CUTOUT)
    return {"matrix": M.tolist()}


@router.get("/live_mapped", response_class=Response)
def get_live_mapped():
    if not STATE.led_controller:
        return Response(status_code=503, content="LED Controller not ready")

    try:
        response = requests.get("http://localhost:80/live", verify=False)
        response.raise_for_status()

        image_array = np.frombuffer(response.content, np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            return Response(status_code=502, content="Failed to decode upstream image")

        M = get_homography(src=config.CONFIG.CUTOUT)

        width = int(STATE.led_controller.floor.p2.x)
        height = int(STATE.led_controller.floor.p2.y)

        img = cv2.flip(img, -1)
        warped_img = cv2.warpPerspective(img, M, (width, height))
        warped_img = cv2.flip(warped_img, 0)

        is_success, buffer = cv2.imencode(".jpg", warped_img)
        if not is_success:
            return Response(status_code=500, content="Failed to encode image")

        return Response(content=buffer.tobytes(), media_type="image/jpeg")

    except Exception as e:
        print(f"Error in /live: {e}")
        return Response(status_code=500, content=str(e))
