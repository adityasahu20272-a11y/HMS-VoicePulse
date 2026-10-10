"""
HMS VoicePulse - Audio Stream Processor
Handles incoming browser audio buffers, PCM normalization,
sliding window slicing, and silence detection.
"""

import io
import math
import struct
from typing import List, Tuple, Optional

# Attempt numpy import; provide fallback if numpy isn't present in minimal test env
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

class AudioBuffer:
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.raw_bytes = bytearray()
        self.total_samples_received = 0
        self.last_speech_time = 0.0

    def add_pcm16_chunk(self, chunk: bytes):
        """Append raw 16-bit signed PCM audio bytes."""
        self.raw_bytes.extend(chunk)
        self.total_samples_received += len(chunk) // 2

    def clear(self):
        """Reset audio buffer."""
        self.raw_bytes.clear()
        self.total_samples_received = 0

    def get_duration_seconds(self) -> float:
        """Return total seconds of audio collected in buffer."""
        return self.total_samples_received / float(self.sample_rate)

    def to_float32_array(self):
        """Convert accumulated PCM16 bytes into float32 array in range [-1.0, 1.0]."""
        if not self.raw_bytes:
            if HAS_NUMPY:
                return np.zeros(0, dtype=np.float32)
            return []

        # Ensure byte count is even
        length = len(self.raw_bytes) - (len(self.raw_bytes) % 2)
        valid_bytes = self.raw_bytes[:length]

        if HAS_NUMPY:
            int16_arr = np.frombuffer(valid_bytes, dtype=np.int16)
            return (int16_arr.astype(np.float32) / 32768.0)
        else:
            # Fallback pure python array
            count = length // 2
            format_str = f"<{count}h"
            ints = struct.unpack(format_str, valid_bytes)
            return [x / 32768.0 for x in ints]

    def calculate_rms_energy(self, window_bytes: Optional[bytes] = None) -> float:
        """Calculate Root Mean Square (RMS) energy to detect speech presence."""
        data = window_bytes if window_bytes is not None else self.raw_bytes
        if not data or len(data) < 2:
            return 0.0

        length = len(data) - (len(data) % 2)
        count = length // 2
        if count == 0:
            return 0.0

        try:
            format_str = f"<{count}h"
            samples = struct.unpack(format_str, data[:length])
            sum_squares = sum(s * s for s in samples)
            rms = math.sqrt(sum_squares / count)
            return rms / 32768.0  # Normalized 0.0 to 1.0
        except Exception:
            return 0.0

    def get_recent_window(self, window_seconds: float = 3.0):
        """Get the most recent window of audio for interim real-time transcription."""
        bytes_needed = int(self.sample_rate * 2 * window_seconds)
        if len(self.raw_bytes) <= bytes_needed:
            return self.to_float32_array()

        tail_bytes = bytes(self.raw_bytes[-bytes_needed:])
        if HAS_NUMPY:
            int16_arr = np.frombuffer(tail_bytes, dtype=np.int16)
            return (int16_arr.astype(np.float32) / 32768.0)
        else:
            count = len(tail_bytes) // 2
            format_str = f"<{count}h"
            samples = struct.unpack(format_str, tail_bytes)
            return [x / 32768.0 for x in samples]
