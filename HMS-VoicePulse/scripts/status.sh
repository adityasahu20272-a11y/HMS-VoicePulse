#!/usr/bin/env bash
# ==============================================================================
# HMS VoicePulse - Server Status & Diagnostic Script
# ==============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
PID_FILE="$PROJECT_ROOT/logs/voicepulse.pid"
LOG_FILE="$PROJECT_ROOT/logs/voicepulse.log"
DB_FILE="$PROJECT_ROOT/data/hospital.db"

echo "=========================================================="
echo "  HMS VoicePulse — Status Inspection"
echo "=========================================================="
echo "Project Path: $PROJECT_ROOT"

# 1. Process Status
PROCESS_RUNNING=0
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[RUNNING] Process PID: $PID"
        PROCESS_RUNNING=1
    else
        echo "[STOPPED] Stale or inactive PID ($PID)"
    fi
else
    echo "[STOPPED] No PID file found"
fi

# 2. HTTP Health Endpoint Check
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:8000/api/health 2>/dev/null || echo "")
if [ -n "$HEALTH_RESPONSE" ]; then
    echo "[OK] Health Endpoint: Responding at http://127.0.0.1:8000/api/health"
    echo "     Details: $HEALTH_RESPONSE"
else
    echo "[FAIL] Health Endpoint: Not responding on 127.0.0.1:8000"
fi

# 3. Database Status
if [ -f "$DB_FILE" ]; then
    SIZE=$(ls -lh "$DB_FILE" | awk '{print $5}')
    echo "[OK] SQLite Database: Exists ($DB_FILE, size: $SIZE)"
else
    echo "[WARNING] SQLite Database: $DB_FILE does not exist yet (created on first run)"
fi

# 4. Logs
if [ -f "$LOG_FILE" ]; then
    echo "[INFO] Recent Application Logs (last 5 lines):"
    tail -n 5 "$LOG_FILE" | sed 's/^/       /'
else
    echo "[INFO] No log file created yet at $LOG_FILE"
fi

echo "=========================================================="
