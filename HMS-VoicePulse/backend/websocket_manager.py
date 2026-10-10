"""
HMS VoicePulse - WebSocket Audio & Transcription Session Manager
Maintains live browser-to-backend streaming pipelines,
processes audio chunks asynchronously, and sends incremental transcription.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

from .audio_processor import AudioBuffer
from .whisper_engine import whisper_engine
from .nlp_processor import extract_clinical_notes

logger = logging.getLogger("hms.websocket")

class TranscriptionSession:
    def __init__(self, websocket: WebSocket, language: str = "en"):
        self.websocket = websocket
        self.language = language
        self.audio_buffer = AudioBuffer(sample_rate=16000)
        self.accumulated_text: str = ""
        self.last_interim: str = ""
        self.is_active: bool = True
        self.chunk_counter: int = 0
        self.processing_lock = asyncio.Lock()

    async def send_json(self, data: Dict[str, Any]):
        if not self.is_active:
            return
        try:
            await self.websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.warning(f"Failed to send websocket message: {e}")
            self.is_active = False

    async def handle_audio_bytes(self, chunk: bytes):
        """Append raw PCM16 chunk and periodically trigger speech inference."""
        self.audio_buffer.add_pcm16_chunk(chunk)
        self.chunk_counter += 1

        # Every ~10-15 chunks (~1.0s to 1.5s of speech audio), process transcription asynchronously
        if self.chunk_counter % 12 == 0:
            asyncio.create_task(self.transcribe_current_stream())

    async def transcribe_current_stream(self, is_final: bool = False):
        """Run Whisper transcription on threadpool without blocking event loop."""
        if self.processing_lock.locked():
            return

        async with self.processing_lock:
            if self.audio_buffer.get_duration_seconds() < 0.5:
                return

            # Extract recent float32 audio
            if is_final:
                audio_array = self.audio_buffer.to_float32_array()
            else:
                audio_array = self.audio_buffer.get_recent_window(window_seconds=4.0)

            if len(audio_array) == 0:
                return

            # Offload heavy faster-whisper inference to thread
            text, detected_lang, prob = await asyncio.to_thread(
                whisper_engine.transcribe_audio_array,
                audio_array,
                self.language
            )

            text = text.strip()
            if not text:
                return

            if is_final:
                # Append finalized transcript
                if text not in self.accumulated_text:
                    if self.accumulated_text:
                        self.accumulated_text += " " + text
                    else:
                        self.accumulated_text = text

                # Also automatically generate draft clinical note
                draft_notes = extract_clinical_notes(self.accumulated_text)

                await self.send_json({
                    "type": "final",
                    "text": self.accumulated_text,
                    "language": detected_lang,
                    "draft_notes": draft_notes
                })
            else:
                # Send interim live text update
                if text != self.last_interim:
                    self.last_interim = text
                    await self.send_json({
                        "type": "interim",
                        "text": text,
                        "accumulated": self.accumulated_text,
                        "language": detected_lang
                    })

    async def finish(self):
        """Finalize recording session and return full transcript."""
        self.is_active = False
        await self.transcribe_current_stream(is_final=True)
        return self.accumulated_text

class ConnectionManager:
    def __init__(self):
        self.active_sessions: Dict[WebSocket, TranscriptionSession] = {}

    async def connect(self, websocket: WebSocket, language: str = "en") -> TranscriptionSession:
        await websocket.accept()
        session = TranscriptionSession(websocket, language=language)
        self.active_sessions[websocket] = session
        logger.info(f"WebSocket client connected. Active sessions: {len(self.active_sessions)}")
        await session.send_json({"type": "status", "state": "connected", "message": "Ready to receive audio"})
        return session

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_sessions:
            session = self.active_sessions.pop(websocket)
            session.is_active = False
            session.audio_buffer.clear()
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_sessions)}")

ws_manager = ConnectionManager()
