#!/usr/bin/env python3
"""
Models for HTTP-Received Event-Types
"""

from dataclasses import dataclass
from typing import List


@dataclass(kw_only=True)
class EventObject:
    id: int
    x: int
    y: int
    height: int


@dataclass(kw_only=True)
class EventCountItem:
    id: int
    name: str


@dataclass(kw_only=True)
class Event:
    timestamp: int
    object: EventObject


@dataclass(kw_only=True)
class CountEvent(Event):
    count_item: EventCountItem


@dataclass(kw_only=True)
class CreateTrack(Event):
    type: str = "CreateTrack"


@dataclass(kw_only=True)
class DeleteTrack(Event):
    type: str = "DeleteTrack"


@dataclass(kw_only=True)
class ZoneExit(CountEvent):
    type: str = "ZoneExit"


@dataclass(kw_only=True)
class ZoneEntry(CountEvent):
    type: str = "ZoneEntry"


@dataclass(kw_only=True)
class ZoneDwellTime(CountEvent):
    dwell_time: int
    last_exit_time: int
    created_inside: bool
    deleted_inside: bool
    type: str = "ZoneDwellTime"


@dataclass(kw_only=True)
class LineCrossing(CountEvent):
    direction: str
    type: str = "LineCrossing"


@dataclass(kw_only=True)
class LineCount(CountEvent):
    direction: str
    type: str = "LineCount"


def create_events_from_json(json_data: List[dict]) -> List[Event]:
    events = []
    for item in json_data:
        event_type = item.get("type")
        if event_type == "CreateTrack":
            events.append(
                CreateTrack(
                    timestamp=item["timestamp"], object=EventObject(**item["object"])
                )
            )
        elif event_type == "DeleteTrack":
            events.append(
                DeleteTrack(
                    timestamp=item["timestamp"], object=EventObject(**item["object"])
                )
            )
        elif event_type == "ZoneEntry":
            events.append(
                ZoneEntry(
                    timestamp=item["timestamp"],
                    object=EventObject(**item["object"]),
                    count_item=EventCountItem(**item["countItem"]),
                )
            )
        elif event_type == "ZoneExit":
            events.append(
                ZoneExit(
                    timestamp=item["timestamp"],
                    object=EventObject(**item["object"]),
                    count_item=EventCountItem(**item["countItem"]),
                )
            )
        elif event_type == "ZoneDwellTime":
            events.append(
                ZoneDwellTime(
                    timestamp=item["timestamp"],
                    object=EventObject(**item["object"]),
                    count_item=EventCountItem(**item["countItem"]),
                    dwell_time=item["dwellTime"],
                    last_exit_time=item["lastExitTime"],
                    created_inside=item["createdInside"],
                    deleted_inside=item["deletedInside"],
                )
            )
        elif event_type == "LineCrossing":
            events.append(
                LineCrossing(
                    timestamp=item["timestamp"],
                    direction=item["direction"],
                    object=EventObject(**item["object"]),
                    count_item=EventCountItem(**item["countItem"]),
                )
            )
        elif event_type == "LineCount":
            events.append(
                LineCount(
                    timestamp=item["timestamp"],
                    direction=item["direction"],
                    object=EventObject(**item["object"]),
                    count_item=EventCountItem(**item["countItem"]),
                )
            )
    return events
