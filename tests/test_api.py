import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch

try:
    from fastapi.testclient import TestClient
except ImportError:
    TestClient = None

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Mock rpi_ws2805
if "rpi_ws2805" not in sys.modules:
    mock_rpi = MagicMock()

    class RGBCCT:
        def __init__(self, r=0, g=0, b=0, ww=0, cw=0, value=None):
            pass

    mock_rpi.RGBCCT = RGBCCT
    sys.modules["rpi_ws2805"] = mock_rpi

# We need to set the environment variable for API Key before importing api
os.environ["API_KEY"] = "test-secret-key"

try:
    from gangway.api import app
except ImportError:
    app = None

# Mock config content
SAMPLE_CONFIG_YAML = """
projection:
  src_points: [[0, 0], [10, 0], [10, 10], [0, 10]]
  dst_points: [[0, 0], [10, 0], [10, 10], [0, 10]]
  floor: [0, 0, 10, 10]
  cutout: []

leds:
  target_weight: 0.5
  offset_x: 0
  offset_y: 0

strips:
  - index: 0
    len: 10
    start: [0, 0]
    end: [0, 10]

animation:
  static:
    color: {r: 255, g: 0, b: 0}
"""


class TestAPI(unittest.TestCase):
    def setUp(self):
        if TestClient is None or app is None:
            self.skipTest("fastapi or dependencies not installed")
        self.client = TestClient(app)
        self.api_headers = {"X-API-Key": "test-secret-key"}

    def test_auth_missing_key(self):
        response = self.client.get("/config/")
        self.assertEqual(response.status_code, 403)

    def test_auth_invalid_key(self):
        response = self.client.get("/config/", headers={"X-API-Key": "wrong"})
        self.assertEqual(response.status_code, 403)

    @patch("builtins.open", new_callable=mock_open, read_data=SAMPLE_CONFIG_YAML)
    @patch("gangway.config.yaml.safe_load")
    def test_get_config(self, mock_yaml_load, mock_file):
        mock_yaml_load.return_value = {
            "projection": {
                "src_points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "dst_points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "floor": [0, 0, 10, 10],
                "cutout": [],
            },
            "leds": {
                "target_weight": 0.5,
                "offset_x": 0,
                "offset_y": 0,
            },
            "strips": [
                {"index": 0, "len": 10, "start": [0, 0], "end": [0, 10]},
            ],
            "animation": {
                "static": {"color": {"r": 255, "g": 0, "b": 0, "cw": 0, "ww": 0}}
            },
        }

        # We need to patch CONFIG.path because the endpoint opens it
        with patch("gangway.config.CONFIG.path", Path("/tmp/test_config.yaml")):
            response = self.client.get("/config/", headers=self.api_headers)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["leds"]["target_weight"], 0.5)

    @patch("builtins.open", new_callable=mock_open, read_data=SAMPLE_CONFIG_YAML)
    @patch("gangway.config.yaml.safe_load")
    @patch("gangway.config.yaml.dump")
    @patch("gangway.state.STATE.led_controller")
    @patch("gangway.config.CONFIG.load")
    def test_update_config(
        self,
        mock_config_load,
        mock_led_controller,
        mock_yaml_dump,
        mock_yaml_load,
        mock_file,
    ):
        config_data = {
            "projection": {
                "src_points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "dst_points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "floor": [0, 0, 10, 10],
                "cutout": [],
            },
            "leds": {
                "target_weight": 0.5,
                "offset_x": 0,
                "offset_y": 0,
            },
            "strips": [
                {"index": 0, "len": 10, "start": [0, 0], "end": [0, 10]},
            ],
            "animation": {
                "static": {"color": {"r": 255, "g": 0, "b": 0, "cw": 0, "ww": 0}}
            },
        }
        mock_yaml_load.return_value = config_data

        new_config = config_data.copy()
        new_config["animation"] = {
            "static": {"color": {"r": 0, "g": 255, "b": 0, "cw": 0, "ww": 0}}
        }

        with patch("gangway.config.CONFIG.path", Path("/tmp/test_config.yaml")):
            response = self.client.put(
                "/config/", json=new_config, headers=self.api_headers
            )

        self.assertEqual(response.status_code, 200)

        # Check that dump was called
        mock_yaml_dump.assert_called()

        # Check that CONFIG.load was called
        mock_config_load.assert_called()

        # Check that LEDController.reload_config was called
        mock_led_controller.reload_config.assert_called()

    @patch("builtins.open", new_callable=mock_open, read_data=SAMPLE_CONFIG_YAML)
    @patch("gangway.config.yaml.safe_load")
    @patch("gangway.config.yaml.dump")
    @patch("gangway.state.STATE.led_controller")
    @patch("gangway.config.CONFIG.load")
    def test_update_config_by_strip(
        self,
        mock_config_load,
        mock_led_controller,
        mock_yaml_dump,
        mock_yaml_load,
        mock_file,
    ):
        config_data = {
            "projection": {
                "src_points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "dst_points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "floor": [0, 0, 10, 10],
                "cutout": [],
            },
            "leds": {
                "target_weight": 0.5,
                "offset_x": 0,
                "offset_y": 0,
            },
            "strips": [
                {"index": 0, "len": 10, "start": [0, 0], "end": [0, 10]},
            ],
            "animation": {
                "static": {"color": {"r": 255, "g": 0, "b": 0, "cw": 0, "ww": 0}}
            },
        }
        mock_yaml_load.return_value = config_data

        new_config = config_data.copy()
        new_config["animation"] = {
            "by_strip": {
                "assignments": [
                    {
                        "strip_assignment": {
                            "strip": 1,
                            "animation": {
                                "static": {
                                    "color": {
                                        "r": 255,
                                        "g": 0,
                                        "b": 0,
                                        "cw": 0,
                                        "ww": 0,
                                    }
                                }
                            },
                        }
                    }
                ],
                "default": {
                    "static": {"color": {"r": 0, "g": 255, "b": 0, "cw": 0, "ww": 0}}
                },
            }
        }

        with patch("gangway.config.CONFIG.path", Path("/tmp/test_config.yaml")):
            response = self.client.put(
                "/config/", json=new_config, headers=self.api_headers
            )

        if response.status_code != 200:
            print(f"DEBUG: Response content: {response.content}")

        self.assertEqual(response.status_code, 200)

        # Check that dump was called
        mock_yaml_dump.assert_called()


if __name__ == "__main__":
    unittest.main()
