#!/usr/bin/env bash
# ==============================================================================
# HMS VoicePulse - Local macOS Installation Script
# ==============================================================================
set -e

# Resolve project root directory reliably
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "=========================================================="
echo "  HMS VoicePulse — macOS Setup & Environment Installation"
echo "=========================================================="
echo "Project Location: $PROJECT_ROOT"

# 1. Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 could not be found. Please install Python 3.9+ using Homebrew or python.org."
    exit 1
fi

PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Detected Python: $PY_VERSION"

# 2. Create project directories
echo "Creating data and log directories..."
mkdir -p "$PROJECT_ROOT/data/models"
mkdir -p "$PROJECT_ROOT/logs"

# 3. Create virtual environment if not present
if [ ! -d "$PROJECT_ROOT/venv" ]; then
    echo "Creating Python virtual environment in venv/..."
    python3 -m venv "$PROJECT_ROOT/venv"
else
    echo "Virtual environment already exists in venv/."
fi

# 4. Activate virtual environment
echo "Activating virtual environment..."
source "$PROJECT_ROOT/venv/bin/activate"

# 5. Upgrade pip and install dependencies
echo "Installing required Python packages from requirements.txt..."
pip install --upgrade pip
pip install -r "$PROJECT_ROOT/requirements.txt"

# 6. Setup .env from .env.example without overwriting existing
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "Creating .env from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
else
    echo "Preserving existing .env configuration."
fi

# 7. Initialize SQLite Database
echo "Initializing SQLite database schema..."
python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from backend.database import init_db
init_db()
print('SQLite database tables initialized successfully.')
"

# 8. Check faster-whisper model
echo "Checking faster-whisper model configuration..."
python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from backend.whisper_engine import whisper_engine
print('Whisper engine configured model:', whisper_engine.model_name)
"

echo "=========================================================="
echo "  Installation Complete!"
echo "  Run ./scripts/start.sh to launch the server,"
echo "  or double-click launchers/HMS-VoicePulse.command."
echo "=========================================================="
