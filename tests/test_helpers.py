import os
import sys
import unittest
from unittest.mock import MagicMock

# Add the project root to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Mock rpi_ws2805 if not available
if "rpi_ws2805" not in sys.modules:
    mock_rpi = MagicMock()

    class RGBCCT:
        def __init__(self, r=0, g=0, b=0, ww=0, cw=0):
            self.r = r
            self.g = g
            self.b = b
            self.ww = ww
            self.cw = cw

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

from gangway.helpers import (
    interpolate_points,
    interpolate_rgbcct,
    parse_animation,
    sign,
    to_hex,
)

# We need to import Point after adding sys.path
from gangway.types import Point


class TestHelpers(unittest.TestCase):
    def test_sign(self):
        self.assertEqual(sign(5, True), 1)
        self.assertEqual(sign(-5, True), -1)
        self.assertEqual(sign(0, True), 0)
        self.assertEqual(sign(5, False), 0)
        self.assertEqual(sign(-5, False), 0)

    def test_interpolate_rgbcct(self):
        c1 = RGBCCT(0, 0, 0, 0, 0)
        c2 = RGBCCT(100, 100, 100, 100, 100)

        # 50% interpolation with use_sign=False
        res = interpolate_rgbcct(c1, c2, 0.5, use_sign=False)
        self.assertEqual(res.r, 50)
        self.assertEqual(res.g, 50)

        # Test with use_sign=True (default)
        # diff (c2-c1) is 100 (positive), so sign is 1. result = 50 - 1 = 49
        res = interpolate_rgbcct(c1, c2, 0.5, use_sign=True)
        self.assertEqual(res.r, 49)

        # Test reverse
        # diff (c1-c2) is -100 (negative), so sign is -1. result = 50 - (-1) = 51
        res = interpolate_rgbcct(c2, c1, 0.5, use_sign=True)
        self.assertEqual(res.r, 51)

    def test_interpolate_points(self):
        # Assuming Point works with basic arithmetic operations
        p1 = Point(0, 0)
        p2 = Point(10, 10)

        # The formula in helpers is: (p1 - p2) / num * (index + 0.5) + p1
        # Case: num=10, index=0
        # Point.__sub__ is implemented as other - self, so p1 - p2 is p2 - p1
        # (0,0) - (10,10) = (10, 10)
        # / 10 = (1, 1)
        # * 0.5 = (0.5, 0.5)
        # + (0,0) = (0.5, 0.5)
        res = interpolate_points(p1, p2, 10, 0)
        self.assertAlmostEqual(res.x, 0.5)
        self.assertAlmostEqual(res.y, 0.5)

    def test_to_hex(self):
        c = RGBCCT(255, 0, 128, 0, 0)
        self.assertEqual(to_hex(c), "#ff0080")

        c2 = RGBCCT(10, 20, 30, 0, 0)
        self.assertEqual(to_hex(c2), "#0a141e")

    def test_parse_animation_simple_color(self):
        config = {"r": 255, "g": 0, "b": 0, "ww": 0, "cw": 0}
        funcs = {}
        res = parse_animation(config, funcs)
        self.assertIsInstance(res, RGBCCT)
        self.assertEqual(res.r, 255)

    def test_parse_animation_function(self):
        def my_anim(color, brightness=1.0):
            return f"anim-{color}-{brightness}"

        funcs = {"my_anim": my_anim}

        # Case 1: scalar arg (maps to first positional)
        config = {"my_anim": "red"}
        res = parse_animation(config, funcs)
        self.assertEqual(res, "anim-red-1.0")

        # Case 2: dict args
        config = {"my_anim": {"color": "blue", "brightness": 0.5}}
        res = parse_animation(config, funcs)
        self.assertEqual(res, "anim-blue-0.5")

        # Case 3: nested animation
        config = {"my_anim": {"color": {"r": 10, "g": 10, "b": 10}, "brightness": 0.5}}
        res = parse_animation(config, funcs)
        # The result will contain the string representation of RGBCCT
        self.assertTrue("anim-RGBCCT" in str(res))

    def test_parse_animation_unknown_function(self):
        config = {"unknown": {}}
        funcs = {}
        with self.assertRaises(ValueError):
            parse_animation(config, funcs)

    def test_parse_animation_unknown_param(self):
        def my_anim(val):
            return val

        funcs = {"my_anim": my_anim}
        config = {"my_anim": {"invalid_param": 1}}
        with self.assertRaises(ValueError):
            parse_animation(config, funcs)

    def test_parse_animation_var_positional(self):
        def my_seq(*args):
            return list(args)

        funcs = {"seq": my_seq}
        # The helper looks for the parameter name in the config
        # For *args, the parameter name is 'args'
        config = {"seq": {"args": ["a", "b"]}}

        res = parse_animation(config, funcs)
        self.assertEqual(res, ["a", "b"])


if __name__ == "__main__":
    unittest.main()
