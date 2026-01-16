#!/usr/bin/env python3
import argparse
import asyncio
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

from modules import config
from modules.api import app
from modules.led_controller import LEDController
from modules.mqtt import MQTTHandler
from modules.state import STATE
from modules.xovis.server import XOVISServer


async def main():
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, help="Path to config.yaml")
    args = parser.parse_args()

    if args.config:
        config.CONFIG.path = args.config
        config.CONFIG.load()

    print("Starting components...")

    # 1. LED Controller
    STATE.led_controller = LEDController()
    STATE.led_controller.start()

    # 2. Xovis Server
    xovis_server = XOVISServer()
    STATE.xovis_server = xovis_server
    xovis_server.subscribe_position(STATE.led_controller.update_objects)

    def update_api_objects(new_objects):
        STATE.objects = new_objects

    xovis_server.subscribe_position(update_api_objects)

    xovis_http_server = xovis_server.start_server()

    # Start MQTT Handler
    mqtt_handler = MQTTHandler()
    mqtt_task = asyncio.create_task(mqtt_handler.start())

    # --- Start Uvicorn (Blocking Mode) ---
    # We let Uvicorn control the loop. It handles Ctrl+C automatically.
    config_uvicorn = uvicorn.Config(app, host="0.0.0.0", port=8082, log_level="info")
    server = uvicorn.Server(config_uvicorn)

    try:
        # This will block here until Ctrl+C is pressed.
        # Uvicorn catches the signal, shuts down gracefully, and then this returns.
        await server.serve()
    except asyncio.CancelledError:
        # Occurs if the outer loop is cancelled
        pass
    finally:
        # --- Cleanup Sequence ---
        # This block runs ALWAYS after Uvicorn finishes (or crashes)
        print("\nShutting down background components...")

        try:
            xovis_http_server.shutdown()
            print("XOVIS callback handler stopped.")
        except Exception as e:
            print(f"Error stopping Xovis: {e}")

        try:
            mqtt_task.cancel()
            print("MQTT Handler stopped.")
        except Exception as e:
            print(f"Error stopping MQTT Handler: {e}")

        try:
            STATE.led_controller.stop()
            print("LED Controller stopped.")
        except Exception as e:
            print(f"Error stopping LED Controller: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # Catch any lingering interrupts that Uvicorn missed
        pass
