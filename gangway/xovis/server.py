#!/usr/bin/env python3
"""
Web Server to receive XOVIS-Events and forward them to listening threads
"""

import collections
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Lock, Thread
from typing import Callable, Dict, List, Optional, Tuple

from ..config import Point
from .homographic_projection import apply_transform
from .model import DeleteTrack, Event, EventObject, create_events_from_json


def create_xovis_request_handler(server: "XOVISServer"):
    class RequestHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            content_length = int(self.headers["Content-Length"])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data)
                server._notify(data)
                self.send_response(200)
                self.end_headers()
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()

        def log_message(self, format, *args):
            # Suppress logging
            return

    return RequestHandler


class XOVISServer:
    _subscribers: List[Tuple[Callable[[Event], None], Optional[List[Event]]]]
    _subscribers_position: List[Callable[[List[Point]], None]]
    _host: str
    _port: int

    _objects: Dict[int, EventObject]
    _timestamps: Dict[int, int]
    _update_times: collections.deque

    def __init__(self, host: str = "0.0.0.0", port: int = 8081) -> None:
        self._host = host
        self._port = port
        self._subscribers = list()
        self._subscribers_position = list()
        self._objects = dict()
        self._timestamps = dict()
        self._update_times = collections.deque(maxlen=100)
        self._lock = Lock()

    def subscribe(
        self, callback: Callable[[Event], None], filter: Optional[List[Event]]
    ) -> None:
        self._subscribers.append((callback, filter))

    def subscribe_position(self, callback: Callable[[List[Point]], None]) -> None:
        self._subscribers_position.append(callback)

    @property
    def ups(self) -> int:
        now = time.time()
        with self._lock:
            while len(self._update_times) > 0 and self._update_times[0] < now - 1.0:
                self._update_times.popleft()
            return len(self._update_times)

    def _notify(self, data) -> None:
        now = time.time()
        with self._lock:
            self._update_times.append(now)
            while len(self._update_times) > 0 and self._update_times[0] < now - 1.0:
                self._update_times.popleft()

        events = create_events_from_json(data)

        self._notify_event(events)
        self._notify_position(events)

    def _notify_event(self, events) -> None:
        for event in events:
            for callback, event_filter in self._subscribers:
                if event_filter is None or type(event) in event_filter:
                    callback(event)

    def _notify_position(self, events) -> None:
        for event in events:
            if isinstance(event, DeleteTrack) and event.object.id in self._objects:
                self._objects.pop(event.object.id)
            elif (
                event.object.id not in self._objects
                or event.timestamp > self._timestamps[event.object.id]
            ):
                self._objects[event.object.id] = event.object
                self._timestamps[event.object.id] = event.timestamp

        if len(self._objects) == 0:
            for callback in self._subscribers_position:
                callback([])
            return

        points = [(object.x, object.y) for object in self._objects.values()]
        mapped_points = [Point(r[0], r[1]) for r in apply_transform(points)]

        for callback in self._subscribers_position:
            callback(mapped_points)

    def start_server(self) -> HTTPServer:
        handler = create_xovis_request_handler(self)
        http_server = HTTPServer((self._host, self._port), handler)
        thread = Thread(target=http_server.serve_forever)
        thread.daemon = True
        thread.start()
        print(f"XOVIS callback server receiver running on {self._host}:{self._port}")
        return http_server
