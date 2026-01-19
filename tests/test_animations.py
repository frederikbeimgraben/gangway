import math
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add the project root to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Mock rpi_ws2805 if not available
if "rpi_ws2805" not in sys.modules:
    mock_rpi = MagicMock()

    class RGBCCT:
        def __init__(self, r=0, g=0, b=0, ww=0, cw=0, value=None):
            if value is not None:
                # Approximate recreating from int value if needed,
                # but for tests we mostly use named args
                self.r = (value >> 32) & 0xFF
                self.g = (value >> 24) & 0xFF
                self.b = (value >> 16) & 0xFF
                self.cw = (value >> 8) & 0xFF
                self.ww = value & 0xFF
            else:
                self.r = int(r)
                self.g = int(g)
                self.b = int(b)
                self.ww = int(ww)
                self.cw = int(cw)

        def __eq__(self, other):
            if not isinstance(other, RGBCCT):
                return False
            return (
                self.r == other.r
                and self.g == other.g
                and self.b == other.b
                and self.ww == other.ww
                and self.cw == other.cw
            )

        def __repr__(self):
            return f"RGBCCT(r={self.r}, g={self.g}, b={self.b}, ww={self.ww}, cw={self.cw})"

    mock_rpi.RGBCCT = RGBCCT
    sys.modules["rpi_ws2805"] = mock_rpi

from rpi_ws2805 import RGBCCT

from gangway.animations.idle import (
    fire,
    idle,
    linear_rainbow,
    rainbow,
    sparkle,
    static,
    wave,
)
from gangway.types import LED, Point, Rectangle, SceneContext


class TestAnimations(unittest.TestCase):
    def setUp(self):
        self.p1 = Point(0, 0)
        self.p2 = Point(100, 100)
        self.floor = Rectangle(self.p1, self.p2)
        self.led = LED(index=0, p=Point(50, 50))
        self.ctx = SceneContext(floor=self.floor, leds=[self.led])
        self.time = 0.0

    def test_static(self):
        color = RGBCCT(255, 0, 0)
        anim_func = static(color)

        # Calling the animation function should return the color
        res = anim_func(self.time, self.ctx, self.led, [])
        self.assertEqual(res, color)

    def test_rainbow(self):
        # Center of floor is 50,50. LED is at 50,50.
        # x_norm = (50 - 0) / (100 - 0) = 0.5
        # hue = (0.5 * spread + time * speed) % 1.0

        # Test with spread 2.0, speed 0.1 at time 0
        anim_func = rainbow(speed=0.1, spread=2.0)

        # hue = 0.5 * 2.0 + 0 = 1.0 -> 0.0 (Red)
        res = anim_func(0.0, self.ctx, self.led, [])
        # Red in RGB is 255, 0, 0
        self.assertEqual(res.r, 255)
        self.assertEqual(res.g, 0)
        self.assertEqual(res.b, 0)

    def test_linear_rainbow_x(self):
        # direction x
        anim_func = linear_rainbow(direction="x", speed=0.0, spread=1.0)

        # LED at x=50, range 0-100. Norm position = 0.5.
        # Hue = 0.5. HSV(0.5, 1, 1) is Cyan (0, 255, 255)
        res = anim_func(0.0, self.ctx, self.led, [])

        self.assertEqual(res.r, 0)
        self.assertEqual(res.g, 255)
        self.assertEqual(res.b, 255)

    def test_linear_rainbow_y(self):
        # direction y
        anim_func = linear_rainbow(direction="y", speed=0.0, spread=1.0)

        # LED at y=50, range 0-100. Norm position = 0.5.
        # Hue = 0.5. Cyan.
        res = anim_func(0.0, self.ctx, self.led, [])
        self.assertEqual(res.r, 0)
        self.assertEqual(res.g, 255)
        self.assertEqual(res.b, 255)

    def test_idle_animation_switching(self):
        idle_color = RGBCCT(10, 10, 10)
        active_color = RGBCCT(255, 255, 255)

        anim_func = idle(static(idle_color), static(active_color))

        # No objects -> idle color
        res_idle = anim_func(0.0, self.ctx, self.led, [])
        self.assertEqual(res_idle, idle_color)

        # With objects -> active color
        objects = [Point(10, 10)]
        res_active = anim_func(0.0, self.ctx, self.led, objects)
        self.assertEqual(res_active, active_color)

    def test_fire(self):
        # Fire uses random based on hash of position and time bucket
        anim_func = fire(base_color=RGBCCT(200, 100, 0), flicker_speed=0.1)

        res = anim_func(0.0, self.ctx, self.led, [])

        # Result should be dimmed version of base color
        self.assertLessEqual(res.r, 200)
        self.assertLessEqual(res.g, 100)
        self.assertEqual(res.b, 0)

        # It should not be completely black (statistically unlikely with default intensity 0.5)
        # but let's just ensure it returns a valid RGBCCT
        self.assertIsInstance(res, RGBCCT)

    def test_sparkle(self):
        # Sparkle uses random based on seed
        anim_func = sparkle(density=0.5, speed=1.0)
        res = anim_func(0.0, self.ctx, self.led, [])
        self.assertIsInstance(res, RGBCCT)

    def test_wave(self):
        # Wave animation involves math.sin and multiple waves
        anim_func = wave(colors=[RGBCCT(255, 0, 0)], n_waves=1)
        res = anim_func(0.0, self.ctx, self.led, [])
        self.assertIsInstance(res, RGBCCT)
        # Check that we got some red component (or black if phase/pos aligns to 0)
        # 0 <= r <= 255
        self.assertTrue(0 <= res.r <= 255)
        self.assertEqual(res.g, 0)
        self.assertEqual(res.b, 0)


if __name__ == "__main__":
    unittest.main()
