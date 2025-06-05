"""Main application entry point."""
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend import create_app

app = create_app('development')

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001) 