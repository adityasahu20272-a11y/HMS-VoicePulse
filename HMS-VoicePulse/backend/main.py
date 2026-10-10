import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .database import init_db
from .routes import doctors, patients, consultations, settings as settings_routes
from .websocket_manager import ws_manager

# Configure logging to console and logs/voicepulse.log
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(settings.LOG_FILE, encoding="utf-8")
    ]
)
logger = logging.getLogger("hms.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} on {settings.APP_HOST}:{settings.APP_PORT}")
    # Initialize SQLite database and tables
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME} cleanly.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Local Clinical Voice Documentation & Hospital Management System for macOS",
    lifespan=lifespan
)

# CORS: strictly bound to localhost for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://127.0.0.1:{settings.APP_PORT}",
        f"http://localhost:{settings.APP_PORT}",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(settings_routes.router)
app.include_router(doctors.router)
app.include_router(patients.router)
app.include_router(consultations.router)

# WebSocket streaming endpoint for microphone audio capture
@app.websocket("/ws/transcribe")
async def websocket_transcription_endpoint(websocket: WebSocket):
    session = await ws_manager.connect(websocket, language=settings.DEFAULT_LANGUAGE)
    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                # Binary raw PCM audio chunks from Web Audio API
                await session.handle_audio_bytes(message["bytes"])
            elif "text" in message and message["text"]:
                import json
                try:
                    payload = json.loads(message["text"])
                    cmd = payload.get("command")
                    if cmd == "stop":
                        await session.finish()
                    elif cmd == "set_language":
                        session.language = payload.get("language", "en")
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        logger.info("Client disconnected from transcription session.")
    except Exception as e:
        logger.error(f"WebSocket session error: {e}")
    finally:
        ws_manager.disconnect(websocket)

# Mount frontend directory for static serving
FRONTEND_DIR = settings.PROJECT_ROOT / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/style.css")
    async def serve_css():
        return FileResponse(FRONTEND_DIR / "style.css")

    @app.get("/app.js")
    async def serve_app_js():
        return FileResponse(FRONTEND_DIR / "app.js")

    @app.get("/voicepulse.js")
    async def serve_voicepulse_js():
        return FileResponse(FRONTEND_DIR / "voicepulse.js")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=False
    )
