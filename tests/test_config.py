import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch

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

# Import after mocking
from gangway.config import GANGWAYConfig

SAMPLE_CONFIG_YAML = """
projection:
  src_points: [[0, 0], [100, 0], [100, 100], [0, 100]]
  dst_points: [[0, 0], [10, 0], [10, 10], [0, 10]]
  cutout: [[1, 1], [9, 9]]
  floor: [0, 0, 10, 10]

leds:
  target_weight: 0.5
  offset_x: 10
  offset_y: 20

strips:
  - index: 0
    len: 5
    start: [0, 0]
    end: [0, 5]

animation:
  r: 255
  g: 0
  b: 0
  ww: 0
  cw: 0

mqtt:
  host: "test.mosquitto.org"
  port: 1883
  topic_prefix: "test_gangway"
"""

import yaml

CONFIG_DICT = yaml.safe_load(SAMPLE_CONFIG_YAML)


class TestConfig(unittest.TestCase):
    def setUp(self):
        self.config_path = Path("/tmp/test_config.yaml")

    @patch("builtins.open", new_callable=mock_open, read_data=SAMPLE_CONFIG_YAML)
    @patch("gangway.config.yaml.safe_load")
    def test_load_config(self, mock_yaml_load, mock_file):
        # We must return the dictionary that yaml.safe_load would return
        mock_yaml_load.return_value = CONFIG_DICT

        cfg = GANGWAYConfig(self.config_path)

        # Check projection
        self.assertEqual(len(cfg.SRC_POINTS), 4)
        self.assertEqual(cfg.SRC_POINTS[0], (0, 0))
        self.assertEqual(cfg.FLOOR.p1.x, 0)
        self.assertEqual(cfg.FLOOR.p2.x, 10)

        # Check LEDs config
        self.assertEqual(cfg.TARGET_WEIGHT, 0.5)
        self.assertEqual(cfg.OFFSET_X, 10)
        self.assertEqual(cfg.OFFSET_Y, 20)

        # Check Strips
        self.assertEqual(len(cfg.STRIPS), 1)
        strip = cfg.STRIPS[0]
        self.assertEqual(strip.index, 0)
        self.assertEqual(strip.len, 5)
        # Check offset application on strip points
        # Strip start [0,0] + offset [10,20] -> [10,20]
        self.assertEqual(strip.start.x, 10)
        self.assertEqual(strip.start.y, 20)

        # Check LED generation
        self.assertEqual(len(cfg.LEDS), 5)
        self.assertEqual(cfg.LEDS[0].index, 0)

        # Check MQTT
        self.assertEqual(cfg.MQTT_HOST, "test.mosquitto.org")
        self.assertEqual(cfg.MQTT_TOPIC_PREFIX, "test_gangway")

    @patch("builtins.open", new_callable=mock_open, read_data=SAMPLE_CONFIG_YAML)
    @patch("gangway.config.yaml.safe_load")
    @patch("gangway.config.yaml.dump")
    def test_save_config(self, mock_yaml_dump, mock_yaml_load, mock_file):
        mock_yaml_load.return_value = CONFIG_DICT

        cfg = GANGWAYConfig(self.config_path)
        cfg.save()

        # Check that yaml.dump was called
        mock_yaml_dump.assert_called_once()
        args, _ = mock_yaml_dump.call_args
        self.assertEqual(args[0], CONFIG_DICT)


if __name__ == "__main__":
    unittest.main()
