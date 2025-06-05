#!/usr/bin/env python3
"""
Bluehost Python/Flask Entry Point for Planetz Backend
"""
import os
import sys

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import the Flask app factory
try:
    from backend import create_app
    
    # Create the Flask application
    app = create_app('production')
    
    # For Bluehost, we might need to handle different configurations
    if __name__ == '__main__':
        # Development/testing mode
        app.run(debug=False, host='127.0.0.1', port=5000)
    else:
        # Production mode (called by Bluehost)
        # The app object will be used by the WSGI server
        application = app

except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure all required modules are installed")
    sys.exit(1)
except Exception as e:
    print(f"Application startup error: {e}")
    sys.exit(1) 