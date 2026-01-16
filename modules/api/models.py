"""
This file contains the Pydantic models for validating animation configurations.
"""

from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field

# --- Base Models ---


class RGBCCTModel(BaseModel):
    """Represents an RGBCCT color."""

    r: int = Field(0, ge=0, le=255)
    g: int = Field(0, ge=0, le=255)
    b: int = Field(0, ge=0, le=255)
    cw: int = Field(0, ge=0, le=255)
    ww: int = Field(0, ge=0, le=255)


# This will be updated later with all the specific animation models.
# AnyAnimationModel = Literal["AnyAnimationModel"]

# --- Parameter Models for each Animation ---


class AlternateParams(BaseModel):
    """Parameters for the alternate animation."""

    animations: List["AnimationModel"] = Field(default_factory=list)
    length: float = Field(default=10, ge=0)


class FireParams(BaseModel):
    """Parameters for the fire animation."""

    base_color: RGBCCTModel = Field(default=RGBCCTModel(r=255, g=140, b=0, cw=0, ww=0))
    flicker_speed: float = Field(default=0.1, ge=0)
    flicker_intensity: float = Field(default=0.5, ge=0, le=1)


class RainbowParams(BaseModel):
    """Parameters for the rainbow animation."""

    speed: float = Field(default=0.1, ge=0)
    spread: float = Field(default=3.0, ge=0)


class StaticParams(BaseModel):
    """Parameters for the static animation."""

    color: RGBCCTModel = Field(default=RGBCCTModel(r=255, g=255, b=255, cw=0, ww=0))


class StroboParams(BaseModel):
    """Parameters for the strobo animation."""

    colors: List[RGBCCTModel] = Field(
        default=[
            RGBCCTModel(r=255, g=255, b=255, cw=255, ww=255),
            RGBCCTModel(r=0, g=0, b=0, cw=0, ww=0),
            RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0),
            RGBCCTModel(r=0, g=0, b=0, cw=0, ww=0),
            RGBCCTModel(r=0, g=0, b=255, cw=0, ww=0),
        ]
    )
    frequency: int = Field(default=100, ge=0)


class SwingParams(BaseModel):
    """Parameters for the swing animation."""

    color: RGBCCTModel = Field(default=RGBCCTModel(r=255, g=255, b=255, cw=255, ww=0))
    direction: Literal["x", "y"] = "y"
    wavelength: int = Field(default=50, ge=0)
    speed: float = Field(default=10, ge=0)


class Theater_chaseParams(BaseModel):
    """Parameters for the theater_chase animation."""

    color: RGBCCTModel = Field(default=RGBCCTModel(r=255, g=255, b=255, cw=0, ww=0))
    speed: float = Field(default=1.0, ge=0)
    spacing: int = Field(default=4, ge=0)


class WaveParams(BaseModel):
    """Parameters for the wave animation."""

    colors: List[RGBCCTModel] = Field(default_factory=list)
    n_waves: int = Field(default=3, ge=0)
    speed: float = Field(default=50.0, ge=0)
    wavelength: float = Field(default=200.0, ge=0)


class DotParams(BaseModel):
    """Parameters for the dot animation."""

    primary: Optional[Union["AnimationModel", RGBCCTModel]] = None
    secondary: Optional[Union["AnimationModel", RGBCCTModel]] = None
    radius: float = Field(default=150, ge=0)


class ExponentialParams(BaseModel):
    """Parameters for the exponential animation."""

    primary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0)
    )
    secondary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=0, g=255, b=0, cw=0, ww=0)
    )
    radius: float = Field(default=150, ge=0)


class OffParams(BaseModel):
    """Parameters for the off animation."""

    pass


class IdleParams(BaseModel):
    """Parameters for the idle animation."""

    idle_animation: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0)
    )
    active_animation: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=0, g=255, b=0, cw=0, ww=0)
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class BlendParams(BaseModel):
    """Parameters for the blend animation."""

    animations: List["AnimationModel"] = Field(default_factory=list)
    mode: Literal["average", "max"] = "average"


class RaveParams(BaseModel):
    """Parameters for the rave animation."""

    pass


class ScheduleParams(BaseModel):
    """Parameters for the schedule animation."""

    start: str = Field(default="18:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end: str = Field(default="06:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    primary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0)
    )
    secondary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=0, g=255, b=0, cw=0, ww=0)
    )


class PaintParams(BaseModel):
    """Parameters for the paint animation."""

    primary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0)
    )
    secondary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=0, g=0, b=0, cw=0, ww=0)
    )
    radius: float = Field(default=150, ge=0)
    persistence: float = Field(default=2.0, ge=0)


class LinearRainbowParams(BaseModel):
    """Parameters for the linear_rainbow animation."""

    direction: Literal["x", "y"] = "x"
    speed: float = Field(default=0.1, ge=0)
    spread: float = Field(default=3.0, ge=0)


class SmoothParams(BaseModel):
    """Parameters for the smooth animation."""

    animation: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0)
    )
    smoothing: float = Field(default=0.5, ge=0.0, le=1.0)


class PlasmaParams(BaseModel):
    """Parameters for the plasma animation."""

    speed: float = Field(default=0.5, ge=0)
    scale: float = Field(default=0.05, ge=0)


class ProximityParams(BaseModel):
    """Parameters for the proximity animation."""

    primary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=255, b=255, cw=0, ww=0)
    )
    secondary: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=0, g=0, b=0, cw=0, ww=0)
    )
    x: float = 0.0
    y: float = 0.0
    radius: float = Field(default=200.0, ge=0)


class ProximitySpeedParams(BaseModel):
    """Parameters for the proximity animation."""

    animation: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=255, b=255, cw=0, ww=0)
    )
    x: float = 0.0
    y: float = 0.0
    radius: float = Field(default=200.0, ge=0)
    multiplier: float = Field(default=1.0, ge=0)
    mode: Literal["speed up", "slow down"] = "speed up"
    proximity_factor: float = Field(default=0.5, ge=0.0, le=1.0)


class SparkleParams(BaseModel):
    """Parameters for the sparkle animation."""

    density: float = Field(default=0.1, ge=0.0, le=1.0)
    speed: float = Field(default=20.0, ge=0.0)


class PersistParams(BaseModel):
    """Parameters for the persist animation."""

    animation: Union["AnimationModel", RGBCCTModel] = Field(
        default=RGBCCTModel(r=255, g=0, b=0, cw=0, ww=0)
    )
    duration: float = Field(default=2.0, ge=0.0)


class PresetParams(BaseModel):
    """Parameters for the preset animation."""

    name: str = Field(..., description="Name of the preset to load.")


# --- Animation Wrapper Models (to enforce {'name': params} structure) ---


class AlternateAnimation(BaseModel):
    """Wrapper for the alternate animation."""

    alternate: AlternateParams = Field(
        ...,
        title="Alternate",
        description="Alternates between multiple animations over time.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class FireAnimation(BaseModel):
    """Wrapper for the fire animation."""

    fire: FireParams = Field(
        ..., title="Fire", description="Simulates a flickering fire effect."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class RainbowAnimation(BaseModel):
    """Wrapper for the rainbow animation."""

    rainbow: RainbowParams = Field(
        ..., title="Rainbow", description="A moving rainbow gradient across the floor."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class StaticAnimation(BaseModel):
    """Wrapper for the static animation."""

    static: StaticParams = Field(
        ..., title="Static Color", description="Displays a single static color."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class StroboAnimation(BaseModel):
    """Wrapper for the strobo animation."""

    strobo: StroboParams = Field(
        ..., title="Stroboscope", description="Flashes colors rapidly."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class SwingAnimation(BaseModel):
    """Wrapper for the swing animation."""

    swing: SwingParams = Field(
        ...,
        title="Swing",
        description="A smooth swinging movement back and forth along an axis.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class Theater_chaseAnimation(BaseModel):
    """Wrapper for the theater_chase animation."""

    theater_chase: Theater_chaseParams = Field(
        ...,
        title="Theater Chase",
        description="A classic theater-style chasing lights effect.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class WaveAnimation(BaseModel):
    """Wrapper for the wave animation."""

    wave: WaveParams = Field(
        ...,
        title="Wave",
        description="Multiple sine waves interfering with each other.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class DotAnimation(BaseModel):
    """Wrapper for the dot animation."""

    dot: DotParams = Field(
        ..., title="Dot", description="Lights up area around detected objects."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class ExponentialAnimation(BaseModel):
    """Wrapper for the exponential animation."""

    exponential: ExponentialParams = Field(
        ...,
        title="Exponential",
        description="Exponential falloff brightness based on object proximity.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class OffAnimation(BaseModel):
    """Wrapper for the off animation."""

    off: OffParams = Field(..., title="Off", description="Turns all LEDs off.")

    class Config:
        extra = "forbid"  # Disallow other keys


class IdleAnimation(BaseModel):
    """Wrapper for the idle animation."""

    idle: IdleParams = Field(
        ...,
        title="Idle Switch",
        description="Switches between idle and active animations based on presence.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class BlendAnimation(BaseModel):
    """Wrapper for the blend animation."""

    blend: BlendParams = Field(
        ..., title="Blend", description="Blends multiple animations together."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class RaveAnimation(BaseModel):
    """Wrapper for the rave animation."""

    rave: RaveParams = Field(
        ..., title="Rave", description="High-energy intense light show."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class ScheduleAnimation(BaseModel):
    """Wrapper for the schedule animation."""

    schedule: ScheduleParams = Field(
        ...,
        title="Schedule",
        description="Runs different animations based on the time of day.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class PaintAnimation(BaseModel):
    """Wrapper for the paint animation."""

    paint: PaintParams = Field(
        ...,
        title="Paint",
        description="Draws trails that persist behind moving objects.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class LinearRainbowAnimation(BaseModel):
    """Wrapper for the linear_rainbow animation."""

    linear_rainbow: LinearRainbowParams = Field(
        ..., title="Linear Rainbow", description="A rainbow moving in a straight line."
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class SmoothAnimation(BaseModel):
    """Wrapper for the smooth animation."""

    smooth: SmoothParams = Field(
        ...,
        title="Smooth",
        description="Smooths the output of another animation over time.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class PlasmaAnimation(BaseModel):
    """Wrapper for the plasma animation."""

    plasma: PlasmaParams = Field(
        ...,
        title="Plasma",
        description="Generates a classic, smoothly shifting plasma effect.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class ProximityAnimation(BaseModel):
    """Wrapper for the proximity animation."""

    proximity: ProximityParams = Field(
        ...,
        title="Proximity to Intensity",
        description="Blends animations based on object distance to a point.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class ProximitySpeedAnimation(BaseModel):
    """Parameters for the proximity speed animation."""

    proximity_speed: ProximitySpeedParams = Field(
        ...,
        title="Proximity to Speed",
        description="Increases the speed of the animation based on the distance to the target point.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class SparkleAnimation(BaseModel):
    """Wrapper for the sparkle animation."""

    sparkle: SparkleParams = Field(
        ...,
        title="Sparkle",
        description="Creates a field of randomly twinkling colored pixels.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class PersistAnimation(BaseModel):
    """Wrapper for the persist animation."""

    persist: PersistParams = Field(
        ...,
        title="Persist",
        description="Keeps objects alive for a sub-animation after they disappear.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


class PresetAnimation(BaseModel):
    """Wrapper for the preset animation."""

    preset: Union[PresetParams, str] = Field(
        ...,
        title="Preset",
        description="Loads an existing preset.",
    )

    class Config:
        extra = "forbid"  # Disallow other keys


# --- Union of All Animation Models ---
AnimationModel = Union[
    AlternateAnimation,
    FireAnimation,
    RainbowAnimation,
    StaticAnimation,
    StroboAnimation,
    SwingAnimation,
    Theater_chaseAnimation,
    WaveAnimation,
    DotAnimation,
    ExponentialAnimation,
    OffAnimation,
    IdleAnimation,
    BlendAnimation,
    RaveAnimation,
    ScheduleAnimation,
    PaintAnimation,
    LinearRainbowAnimation,
    SmoothAnimation,
    PlasmaAnimation,
    SparkleAnimation,
    ProximityAnimation,
    ProximitySpeedAnimation,
    PersistAnimation,
    PresetAnimation,
]

# --- Rebuild Models to Resolve Forward References ---
AlternateParams.model_rebuild()
FireParams.model_rebuild()
RainbowParams.model_rebuild()
StaticParams.model_rebuild()
StroboParams.model_rebuild()
SwingParams.model_rebuild()
Theater_chaseParams.model_rebuild()
WaveParams.model_rebuild()
DotParams.model_rebuild()
ExponentialParams.model_rebuild()
OffParams.model_rebuild()
IdleParams.model_rebuild()
BlendParams.model_rebuild()
RaveParams.model_rebuild()
ScheduleParams.model_rebuild()
PaintParams.model_rebuild()
LinearRainbowParams.model_rebuild()
SmoothParams.model_rebuild()
PlasmaParams.model_rebuild()
ProximityParams.model_rebuild()
ProximitySpeedParams.model_rebuild()
SparkleParams.model_rebuild()
PersistParams.model_rebuild()
PresetParams.model_rebuild()
