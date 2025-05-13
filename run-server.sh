#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up PlanetZ server...${NC}"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 first."
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
PYTHONPATH=$PYTHONPATH:$(pwd) python3 backend/app.py