/**
 * HMS VoicePulse - Browser Microphone Capture & Real-time WebSocket Audio Streamer
 * Captures genuine microphone audio via Web Audio API,
 * drives real-time audio amplitude visualizer, and streams 16kHz PCM to FastAPI backend.
 */

class VoicePulseAudioEngine {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || `ws://${window.location.host}/ws/transcribe`;
    this.onInterimTranscript = options.onInterimTranscript || (() => {});
    this.onFinalTranscript = options.onFinalTranscript || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});

    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.processorNode = null;
    this.websocket = null;

    this.isRecording = false;
    this.isPaused = false;
    this.recordingStartTime = null;
    this.timerInterval = null;
    this.animationFrameId = null;

    this.visualizerCanvas = options.visualizerCanvas || document.getElementById('audioVisualizerCanvas');
    this.canvasCtx = this.visualizerCanvas ? this.visualizerCanvas.getContext('2d') : null;
  }

  async start() {
    if (this.isRecording) return;

    this.onStatusChange('requesting_permission', 'Requesting microphone permission...');
    
    try {
      // 1. Request actual microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // 2. Initialize Web Audio Context
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtxClass({ sampleRate: 16000 });
      
      // Ensure context is running (browsers can start suspended)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;

      // 3. Script processor to extract raw PCM audio chunks
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // 4. Connect WebSocket to backend
      this.initWebSocket();

      // 5. Hook audio process callback to send binary PCM16 chunks
      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording || this.isPaused) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        // Convert Float32 [-1.0, 1.0] to Int16 PCM bytes
        const pcm16Buffer = this.floatTo16BitPCM(inputChannelData);

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.send(pcm16Buffer);
        }
      };

      // 6. Start UI timer and real waveform visualizer
      this.isRecording = true;
      this.isPaused = false;
      this.recordingStartTime = Date.now();
      this.startTimer();
      this.startVisualizer();
      this.onStatusChange('listening', 'Microphone active — capturing live speech...');

    } catch (err) {
      console.error('Microphone acquisition error:', err);
      let errorMsg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone permission was denied. Please allow microphone access in Chrome site settings and macOS System Settings > Privacy & Security > Microphone.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone input device found. Check macOS System Settings > Sound > Input.';
      }
      this.cleanup();
      this.onError(errorMsg);
      this.onStatusChange('mic_error', errorMsg);
    }
  }

  initWebSocket() {
    try {
      this.websocket = new WebSocket(this.wsUrl);
      this.websocket.binaryType = 'arraybuffer';

      this.websocket.onopen = () => {
        this.onStatusChange('connected', 'Live transcription pipeline connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'interim') {
            this.onInterimTranscript(data.text, data.language);
          } else if (data.type === 'final') {
            this.onFinalTranscript(data.text, data.language, data.draft_notes);
          } else if (data.type === 'error') {
            this.onError(data.message);
          }
        } catch (e) {
          console.warn('Non-JSON message received:', event.data);
        }
      };

      this.websocket.onerror = (e) => {
        console.warn('WebSocket connection error:', e);
        this.onError('Local transcription WebSocket error. Ensure backend is running at http://127.0.0.1:8000');
      };

      this.websocket.onclose = () => {
        if (this.isRecording) {
          this.onStatusChange('disconnected', 'WebSocket disconnected');
        }
      };
    } catch (err) {
      this.onError('Failed to open WebSocket to ' + this.wsUrl);
    }
  }

  floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  pause() {
    if (!this.isRecording) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.onStatusChange('paused', 'Recording paused');
    } else {
      this.onStatusChange('listening', 'Microphone active — capturing live speech...');
    }
  }

  async stop() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.isPaused = false;

    this.onStatusChange('processing', 'Finalizing speech transcription...');

    // Notify backend WebSocket that stream ended
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ command: 'stop' }));
      // Give 300ms for final message
      setTimeout(() => {
        if (this.websocket) this.websocket.close();
      }, 500);
    }

    this.cleanup();
    this.onStatusChange('stopped', 'Recording stopped');
  }

  cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop all microphone tracks to release microphone hardware safely
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.clearVisualizer();
  }

  startTimer() {
    const timerEl = document.getElementById('recordingTimer');
    this.timerInterval = setInterval(() => {
      if (this.isRecording && !this.isPaused && this.recordingStartTime) {
        const elapsedSec = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  startVisualizer() {
    if (!this.visualizerCanvas || !this.analyserNode) return;
    const canvas = this.visualizerCanvas;
    const ctx = this.canvasCtx;
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRecording) {
        this.clearVisualizer();
        return;
      }
      this.animationFrameId = requestAnimationFrame(draw);

      if (this.isPaused) {
        this.clearVisualizer();
        return;
      }

      // Real audio amplitude from microphone
      this.analyserNode.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0d6efd';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }

  clearVisualizer() {
    if (!this.visualizerCanvas || !this.canvasCtx) return;
    const canvas = this.visualizerCanvas;
    const ctx = this.canvasCtx;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw flat center line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
}

window.VoicePulseAudioEngine = VoicePulseAudioEngine;
