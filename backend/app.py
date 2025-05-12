"""Main application entry point."""
import os
import sys

# Add the parent directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from backend import create_app

app = create_app('development')

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001) 