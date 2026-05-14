import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import TITLE, VERSION, DESCRIPTION, HOST, PORT
from routers import (
    yield_router,
    price_router,
    crop_router,
    fertilizer_router,
    pesticide_router,
    disease_router,
    ndvi_router,
    protection_router,
)

app = FastAPI(
    title=TITLE,
    version=VERSION,
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

_CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    (
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
        "http://localhost:3000,http://localhost:8080,http://localhost:8081,http://localhost:8082,"
        "http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"
    )
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    allow_credentials=False,
)

app.include_router(yield_router.router)
app.include_router(price_router.router)
app.include_router(crop_router.router)
app.include_router(fertilizer_router.router)
app.include_router(pesticide_router.router)
app.include_router(disease_router.router)
app.include_router(ndvi_router.router)
app.include_router(protection_router.router)


@app.get("/health", tags=["Service"])
def health():
    from config import get_models_dir
    try:
        models_dir = str(get_models_dir())
        models_ok = True
    except FileNotFoundError as e:
        models_dir = str(e)
        models_ok = False

    return {
        "status": "ok" if models_ok else "degraded",
        "version": VERSION,
        "models_dir": models_dir,
        "models_loaded": models_ok,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
