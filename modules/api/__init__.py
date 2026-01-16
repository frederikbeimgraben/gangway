from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import animations, config, data, presets, visualization

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(visualization.router, prefix="/visualization")
app.include_router(config.router, prefix="/config")
app.include_router(data.router, prefix="/data")
app.include_router(animations.router, prefix="/animations")
app.include_router(presets.router, prefix="/presets")
