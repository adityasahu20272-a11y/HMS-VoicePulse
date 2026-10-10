import unittest
import sys
import struct
import math
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.audio_processor import AudioBuffer

class TestWebSocketAudioPipeline(unittest.TestCase):
    def test_audio_buffer_pcm_accumulation(self):
        """Test accumulating PCM16 samples and duration tracking."""
        buffer = AudioBuffer(sample_rate=16000)
        self.assertEqual(buffer.get_duration_seconds(), 0.0)

        # 16000 samples of 16-bit PCM = 32000 bytes = 1.0 second
        one_second_pcm = bytes(32000)
        buffer.add_pcm16_chunk(one_second_pcm)

        self.assertAlmostEqual(buffer.get_duration_seconds(), 1.0, places=2)
        buffer.clear()
        self.assertEqual(buffer.get_duration_seconds(), 0.0)

    def test_rms_energy_calculation(self):
        """Test calculating audio energy to distinguish silence from speech."""
        buffer = AudioBuffer(sample_rate=16000)
        
        # Pure silence (all zeros)
        silence_bytes = bytes(3200)
        buffer.add_pcm16_chunk(silence_bytes)
        silence_rms = buffer.calculate_rms_energy()
        self.assertEqual(silence_rms, 0.0)

        # Non-silent wave (simulated speech audio wave)
        buffer.clear()
        sample_count = 1600
        # Generate 1600 samples with amplitude 10000
        speech_samples = [int(10000 * math.sin(i * 0.1)) for i in range(sample_count)]
        speech_bytes = struct.pack(f"<{sample_count}h", *speech_samples)
        buffer.add_pcm16_chunk(speech_bytes)

        speech_rms = buffer.calculate_rms_energy()
        self.assertGreater(speech_rms, 0.1)

    def test_sliding_window_recent_samples(self):
        """Test slicing sliding window for real-time interim speech recognition."""
        buffer = AudioBuffer(sample_rate=16000)
        # Add 5 seconds of audio
        five_seconds_bytes = bytes(16000 * 2 * 5)
        buffer.add_pcm16_chunk(five_seconds_bytes)

        # Ask for recent 2.0 seconds window
        recent_window = buffer.get_recent_window(window_seconds=2.0)
        expected_samples = 16000 * 2
        self.assertEqual(len(recent_window), expected_samples)

if __name__ == "__main__":
    unittest.main()
