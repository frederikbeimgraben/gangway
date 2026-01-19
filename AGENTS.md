# Gangway Project Overview

Gangway is a Python-based lighting control system for an interactive art installation. It uses a Raspberry Pi 4B to drive WS2805 LED strips, reacting to people moving through the space using a Xovis PC2-L person counter.

## Key Components

### 1. Core Logic (`gangway/gangway/`)
- **`main.py`**: Application entry point. Initializes config, LED controller, and Xovis server.
- **`led_controller.py`**: Runs the main render loop. It holds the current state, manages the `PixelStrip`, and calls the active animation function for every LED.
- **`types.py`**: Defines core data structures like `Point`, `Rectangle`, `LED`, `SceneContext`, and the `Animation` callable signature.
- **`config.py`**: Manages configuration loading from `config.yaml`.

### 2. Input Handling (`gangway/gangway/xovis/`)
- **`server.py`**: Runs a simple HTTP server to receive JSON events from the Xovis sensor (Webhooks).
- **`model.py`**: Pydantic-style dataclasses for parsing Xovis events (ZoneEntry, ZoneExit, specific object coordinates).
- **`homographic_projection.py`**: Maps the camera coordinates from Xovis to the physical floor plan coordinates using a homography matrix.

### 3. Animation System (`gangway/gangway/animations/`)
- **Procedural Approach**: Animations are functions that take `(time, context, led, objects)` and return a color (`RGBCCT`).
- **Meta-Animations (`meta.py`)**: High-order functions that compose other animations. Examples include `blend`, `schedule`, `alternate`, and `proximity`.
- **Responsive**: Animations receive a list of detected objects (`Point`s) to react to presence.

### 4. Hardware Driver
- Uses a custom `rpi_ws2805` library (located in `gangway/rpi-ws2805-python`) to communicate with the LED strips via GPIO.

## Data Flow
1. **Sensor**: Xovis detects a person -> HTTP POST to `server.py`.
2. **Server**: Parses JSON -> Updates internal state -> Projects coordinates to floor space.
3. **Controller**: `LEDController` pulls updated object positions.
4. **Render**: In the loop, `LEDController` calls the current `Animation` function.
5. **Output**: Resulting colors are sent to the LED strip.