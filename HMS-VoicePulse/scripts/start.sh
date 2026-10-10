#!/usr/bin/env bash
# ==============================================================================
# HMS VoicePulse - Server Start Script
# ==============================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
PID_FILE="$PROJECT_ROOT/logs/voicepulse.pid"
LOG_FILE="$PROJECT_ROOT/logs/voicepulse.log"

cd "$PROJECT_ROOT"

mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/data"

# Check if already running via PID file
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "HMS VoicePulse is already running (PID: $PID) at http://127.0.0.1:8000"
        exit 0
    else
        # Stale PID file
        rm -f "$PID_FILE"
    fi
fi

# Check if port 8000 is occupied by something else
if lsof -i :8000 2>/dev/null | grep -q LISTEN; then
    echo "WARNING: Port 8000 appears to be in use. Checking if it's VoicePulse..."
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo "HMS VoicePulse is already responding on http://127.0.0.1:8000"
        exit 0
    else
        echo "ERROR: Port 8000 is occupied by an unrelated process. Please stop that process or change APP_PORT in .env."
        exit 1
    fi
fi

# Activate virtual environment if present
if [ -d "$PROJECT_ROOT/venv" ]; then
    source "$PROJECT_ROOT/venv/bin/activate"
fi

echo "Starting HMS VoicePulse on http://127.0.0.1:8000..."

# Launch FastAPI uvicorn server in background
nohup python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

echo "Server process launched with PID: $SERVER_PID"
echo "Waiting for server to become healthy..."

# Poll health check
MAX_RETRIES=20
COUNT=0
HEALTHY=0

while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        HEALTHY=1
        break
    fi
    sleep 0.5
    COUNT=$((COUNT + 1))
done

if [ $HEALTHY -eq 1 ]; then
    echo "=========================================================="
    echo "  HMS VoicePulse is live and healthy!"
    echo "  URL: http://127.0.0.1:8000"
    echo "  Logs: $LOG_FILE"
    echo "=========================================================="
else
    echo "ERROR: Server failed to start within expected time. Check recent logs:"
    tail -n 20 "$LOG_FILE"
    exit 1
fi
