import asyncio
import json
import logging
from pathlib import Path
from typing import List, Optional

import aiomqtt
import yaml

from .config import CONFIG
from .state import STATE

logger = logging.getLogger(__name__)

PRESETS_DIR = CONFIG.path.parent / "presets"


class MQTTHandler:
    def __init__(self):
        self.connected = False
        self.client: Optional[aiomqtt.Client] = None

    async def start(self):
        """Start the MQTT handler loop."""
        if not CONFIG.MQTT_HOST:
            logger.info("MQTT host not configured, skipping MQTT start.")
            return

        logger.info(
            f"Starting MQTT Handler connecting to {CONFIG.MQTT_HOST}:{CONFIG.MQTT_PORT}"
        )

        while True:
            try:
                async with aiomqtt.Client(
                    hostname=CONFIG.MQTT_HOST,
                    port=CONFIG.MQTT_PORT,
                    username=CONFIG.MQTT_USERNAME,
                    password=CONFIG.MQTT_PASSWORD,
                ) as client:
                    self.client = client
                    self.connected = True
                    logger.info("Connected to MQTT Broker")

                    await self._publish_discovery()
                    await self._subscribe_command()

                    # Publish availability
                    await self.client.publish(
                        f"{CONFIG.MQTT_TOPIC_PREFIX}/status",
                        "online",
                        retain=True,
                    )

                    async for message in self.client.messages:
                        await self._handle_message(message)

            except aiomqtt.MqttError as e:
                logger.error(f"MQTT Error: {e}")
                self.connected = False
            except Exception as e:
                logger.error(f"Unexpected error in MQTT loop: {e}")
                self.connected = False

            logger.info("MQTT Disconnected. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

    async def _publish_discovery(self):
        """Publish Home Assistant Discovery message."""
        presets = self._get_presets()
        device_info = {
            "identifiers": ["gangway_led_controller"],
            "name": "Gangway LED Controller",
            "manufacturer": "FSI",
            "model": "Raspberry Pi WS2805",
        }

        # Select Entity for Presets
        config_payload = {
            "name": "Animation Preset",
            "unique_id": "gangway_animation_preset",
            "command_topic": f"{CONFIG.MQTT_TOPIC_PREFIX}/preset/set",
            "state_topic": f"{CONFIG.MQTT_TOPIC_PREFIX}/preset/state",
            "options": presets,
            "device": device_info,
            "availability_topic": f"{CONFIG.MQTT_TOPIC_PREFIX}/status",
        }

        # Node ID in discovery topic should be unique per device
        node_id = CONFIG.MQTT_TOPIC_PREFIX
        await self.client.publish(
            f"homeassistant/select/{node_id}/preset/config",
            json.dumps(config_payload),
            retain=True,
        )

    async def _subscribe_command(self):
        await self.client.subscribe(f"{CONFIG.MQTT_TOPIC_PREFIX}/preset/set")

    async def _handle_message(self, message):
        topic = message.topic
        payload = message.payload.decode()

        if topic.matches(f"{CONFIG.MQTT_TOPIC_PREFIX}/preset/set"):
            logger.info(f"Received preset switch request: {payload}")
            if await self._load_preset(payload):
                await self.client.publish(
                    f"{CONFIG.MQTT_TOPIC_PREFIX}/preset/state",
                    payload,
                    retain=True,
                )

    def _get_presets(self) -> List[str]:
        PRESETS_DIR.mkdir(exist_ok=True)
        return [p.stem for p in PRESETS_DIR.glob("*.yaml")]

    async def _load_preset(self, name: str) -> bool:
        """Load a preset. Returns True if successful."""
        preset_path = PRESETS_DIR / f"{name}.yaml"
        if not preset_path.exists():
            logger.error(f"Preset {name} not found")
            return False

        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._apply_preset_sync, preset_path)
            return True
        except Exception as e:
            logger.error(f"Failed to load preset {name}: {e}")
            return False

    def _apply_preset_sync(self, preset_path: Path):
        """Synchronous part of applying preset."""
        with open(preset_path, "r") as f:
            animation_data = yaml.safe_load(f)

        # Update the main configuration file
        # We need to read it first to preserve other fields
        with open(CONFIG.path, "r") as f:
            config_data = yaml.safe_load(f)

        config_data["animation"] = animation_data

        with open(CONFIG.path, "w") as f:
            yaml.dump(config_data, f, sort_keys=False)

        # Reload the system configuration
        CONFIG.load()

        # Reload LED Controller if active
        if STATE.led_controller:
            STATE.led_controller.reload_config()
