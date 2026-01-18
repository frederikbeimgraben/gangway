from dataclasses import dataclass
from typing import Callable, Iterable, List, Tuple, Union

from rpi_ws2805 import RGBCCT


@dataclass
class Point:
    x: Union[float, int]
    y: Union[float, int]

    def __sub__(self, other: "Point") -> "Point":
        return Point(x=other.x - self.x, y=other.y - self.y)

    def __add__(self, other: "Point") -> "Point":
        return Point(x=self.x + other.x, y=self.y + other.y)

    def __mul__(self, other: Union[float, int]) -> "Point":
        return Point(x=self.x * other, y=self.y * other)

    def __truediv__(self, other: Union[float, int]) -> "Point":
        return Point(x=self.x / other, y=self.y / other)

    @property
    def tuple(self) -> Tuple:
        return (self.x, self.y)

    @property
    def length(self) -> float:
        return (self.x**2 + self.y**2) ** 0.5

    @classmethod
    def from_tuple(cls, tuple: Tuple[float, float]) -> "Point":
        return Point(tuple[0], tuple[1])


@dataclass
class Rectangle:
    p1: Point
    p2: Point

    @property
    def width(self) -> float:
        return abs(self.p2.x - self.p1.x)

    @property
    def height(self) -> float:
        return abs(self.p2.y - self.p1.y)

    @property
    def center(self) -> Point:
        return Point(
            x=(self.p1.x + self.p2.x) / 2,
            y=(self.p1.y + self.p2.y) / 2,
        )


@dataclass
class Strip:
    index: int
    len: int
    start: Point
    end: Point


@dataclass
class LED:
    index: int
    p: Point


@dataclass
class SceneContext:
    floor: Rectangle
    leds: List[LED]


Animation = Callable[
    [
        float,  # Time since start in seconds
        SceneContext,  # Floor profile and other LEDs
        LED,  # LED to generate color for
        Iterable[Point],  # Detected objects (persons as coordinates)
    ],
    RGBCCT,
]
