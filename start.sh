#!/usr/bin/env bash

# Get the script's absolute directory to avoid path issues
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

# Redirect all output from this script to the log file for better debugging
exec >> "$SCRIPT_DIR/output.log" 2>&1

echo "--- Starting Gangway Service ---"

# Start the frontend in the background from the correct directory
echo "Starting frontend..."
(cd "$SCRIPT_DIR/frontend" && npm run start) &

# Start the backend in the foreground
echo "Starting backend..."
"$SCRIPT_DIR/venv/bin/python3" "$SCRIPT_DIR/main.py"
