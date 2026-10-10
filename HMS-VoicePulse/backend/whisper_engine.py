"""
HMS VoicePulse - Whisper Speech Recognition Engine
Wraps faster-whisper for fast local offline inference on macOS.
Includes lazy loading, model caching, and segment deduplication.
"""

import os
import logging
from typing import Tuple, List, Dict, Any, Optional
from .config import settings

logger = logging.getLogger("hms.whisper")

class WhisperEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WhisperEngine, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.is_loaded = False
            cls._instance.model_name = settings.WHISPER_MODEL
            cls._instance.device = settings.DEVICE
            cls._instance.compute_type = settings.COMPUTE_TYPE
            cls._instance.download_error = None
        return cls._instance

    def load_model(self) -> bool:
        """Load faster-whisper model from local cache or download on first run."""
        if self.is_loaded and self.model is not None:
            return True

        try:
            from faster_whisper import WhisperModel

            logger.info(
                f"Loading faster-whisper model '{self.model_name}' on device='{self.device}', "
                f"compute_type='{self.compute_type}' (download_root: {settings.MODELS_DIR})"
            )
            
            # download_root caches weights in the local project data/models directory
            self.model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
                download_root=str(settings.MODELS_DIR),
                local_files_only=False
            )
            self.is_loaded = True
            self.download_error = None
            logger.info(f"faster-whisper model '{self.model_name}' successfully loaded into memory.")
            return True

        except ImportError:
            msg = "faster-whisper library is not installed. Install via: pip install faster-whisper"
            logger.warning(msg)
            self.download_error = msg
            self.is_loaded = False
            return False
        except Exception as e:
            msg = f"Failed to initialize faster-whisper model: {str(e)}"
            logger.error(msg)
            self.download_error = msg
            self.is_loaded = False
            return False

    def transcribe_audio_array(
        self,
        audio_array,
        language: Optional[str] = None,
        beam_size: int = 2
    ) -> Tuple[str, str, float]:
        """
        Transcribe a float32 numpy audio array.
        Returns: (transcription_text, detected_language, probability)
        """
        if not self.is_loaded:
            success = self.load_model()
            if not success:
                return ("", language or settings.DEFAULT_LANGUAGE, 0.0)

        try:
            segments, info = self.model.transcribe(
                audio_array,
                beam_size=beam_size,
                language=language or settings.DEFAULT_LANGUAGE,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            detected_lang = info.language if hasattr(info, "language") else (language or "en")
            prob = info.language_probability if hasattr(info, "language_probability") else 1.0

            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())

            full_text = " ".join(text_parts).strip()
            return (full_text, detected_lang, prob)

        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            return ("", language or settings.DEFAULT_LANGUAGE, 0.0)

    def get_status(self) -> Dict[str, Any]:
        """Return diagnostic status of speech recognition engine."""
        return {
            "loaded": self.is_loaded,
            "model_name": self.model_name,
            "device": self.device,
            "compute_type": self.compute_type,
            "cache_dir": str(settings.MODELS_DIR),
            "error": self.download_error
        }

whisper_engine = WhisperEngine()
