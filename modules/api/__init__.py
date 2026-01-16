from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import animations, config, data, presets, visualization
from .security import get_api_key

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dependencies = [Depends(get_api_key)]

app.include_router(
    visualization.router, prefix="/visualization", dependencies=dependencies
)
app.include_router(config.router, prefix="/config", dependencies=dependencies)
app.include_router(data.router, prefix="/data", dependencies=dependencies)
app.include_router(animations.router, prefix="/animations", dependencies=dependencies)
app.include_router(presets.router, prefix="/presets", dependencies=dependencies)
