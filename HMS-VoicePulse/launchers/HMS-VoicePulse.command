#!/usr/bin/env bash
# ==============================================================================
# HMS VoicePulse — macOS Finder Double-Click Launcher
# ==============================================================================
# When double-clicked in Finder, this script starts the local server if needed,
# checks health, and opens http://127.0.0.1:8000 in your default browser.
# ==============================================================================

# Find project directory reliably regardless of where script was invoked
LAUNCHER_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$LAUNCHER_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "=========================================================="
echo "  Starting HMS VoicePulse Desktop App..."
echo "  Project: $PROJECT_ROOT"
echo "=========================================================="

# Check if server is already running and healthy
if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
    echo "Server is already running and healthy."
else
    echo "Starting background server..."
    if [ -f "$PROJECT_ROOT/scripts/start.sh" ]; then
        bash "$PROJECT_ROOT/scripts/start.sh"
    else
        # Fallback start
        if [ -d "$PROJECT_ROOT/venv" ]; then
            source "$PROJECT_ROOT/venv/bin/activate"
        fi
        nohup python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 > "$PROJECT_ROOT/logs/voicepulse.log" 2>&1 &
        echo $! > "$PROJECT_ROOT/logs/voicepulse.pid"
    fi
fi

# Poll for health
COUNT=0
READY=0
while [ $COUNT -lt 15 ]; do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 0.5
    COUNT=$((COUNT + 1))
done

if [ $READY -eq 1 ]; then
    echo "Opening HMS VoicePulse in your default browser..."
    open "http://127.0.0.1:8000"
    echo "Success! You may keep this terminal window open or close it."
else
    echo "ERROR: Failed to connect to http://127.0.0.1:8000/api/health"
    echo "Please check logs/voicepulse.log for details."
    read -p "Press Enter to exit..."
    exit 1
fi
