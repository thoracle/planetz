#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PORT=5001

echo -e "${YELLOW}Setting up PlanetZ server...${NC}"

# Function to kill process using port
kill_port_process() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -ti:${port})
        if [ ! -z "$pid" ]; then
            echo -e "${RED}Found process(es) using port ${port}. Killing process(es) ${pid}...${NC}"
            kill -9 $pid 2>/dev/null || true
            sleep 1  # Give the system time to free up the port
        else
            echo -e "${GREEN}No process found using port ${port}${NC}"
        fi
    fi
}

# Kill any Python processes that might be running our server
echo -e "${YELLOW}Cleaning up any existing Python processes...${NC}"
pkill -f "python.*run.py" 2>/dev/null || true
sleep 1

# Kill any process using our port
echo -e "${YELLOW}Checking for processes using port ${PORT}...${NC}"
kill_port_process $PORT

# Double check the port is actually free
if command -v nc >/dev/null 2>&1; then
    if nc -z localhost $PORT 2>/dev/null; then
        echo -e "${RED}Port ${PORT} is still in use. Please check manually.${NC}"
        exit 1
    fi
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}Creating necessary directories...${NC}"
mkdir -p frontend/static/css
mkdir -p frontend/static/js

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate

# Install/upgrade pip
echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip --quiet

# Install requirements
echo -e "${YELLOW}Installing requirements...${NC}"
pip install -r requirements.txt --quiet

# Install additional required packages
echo -e "${YELLOW}Installing additional packages...${NC}"
pip install flask numpy noise --quiet

# Install the package in development mode
echo -e "${YELLOW}Installing package in development mode...${NC}"
pip install -e . --quiet

# Run the server from the root directory
echo -e "${GREEN}Starting server...${NC}"
FLASK_APP=run.py FLASK_ENV=development FLASK_DEBUG=1 PYTHONPATH=$PYTHONPATH:$(pwd):$(pwd)/backend UNIVERSE_SEED=20299999 python3 run.py