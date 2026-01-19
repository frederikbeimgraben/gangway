#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Go to the project root
cd "$SCRIPT_DIR"

# Add current directory to PYTHONPATH so that 'gangway' module can be imported
export PYTHONPATH=$PYTHONPATH:.

# Run tests
python3 -m unittest discover tests
