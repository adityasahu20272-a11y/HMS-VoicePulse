#!/usr/bin/env bash
# ==============================================================================
# HMS VoicePulse - Server Stop Script
# ==============================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
PID_FILE="$PROJECT_ROOT/logs/voicepulse.pid"

cd "$PROJECT_ROOT"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found at $PID_FILE. HMS VoicePulse may not be running."
    exit 0
fi

PID=$(cat "$PID_FILE")

if [ -z "$PID" ]; then
    echo "Empty PID file. Removing."
    rm -f "$PID_FILE"
    exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping HMS VoicePulse (PID: $PID)..."
    kill "$PID" 2>/dev/null || true

    # Wait gracefully for up to 5 seconds
    COUNT=0
    while kill -0 "$PID" 2>/dev/null && [ $COUNT -lt 10 ]; do
        sleep 0.5
        COUNT=$((COUNT + 1))
    done

    # Force kill if still lingering
    if kill -0 "$PID" 2>/dev/null; then
        echo "Process did not terminate gracefully, sending SIGKILL..."
        kill -9 "$PID" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"
    echo "HMS VoicePulse stopped cleanly."
else
    echo "Process $PID is not running. Removing stale PID file."
    rm -f "$PID_FILE"
fi
