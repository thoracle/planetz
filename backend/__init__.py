"""Initialize the backend package."""
from flask import Flask
from backend.config import config
import os
import logging
from logging import StreamHandler
import sys

# ANSI color codes
class Colors:
    YELLOW = '\033[93m'
    RESET = '\033[0m'

class ColoredStreamHandler(StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            # Check if it's a reload message
            if "Detected change in" in msg or "Reloading" in msg:
                msg = f"{Colors.YELLOW}{msg}{Colors.RESET}"
            self.stream.write(msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)

def create_app(config_name):
    """Create and configure the Flask application."""
    # Get the absolute path to the frontend static directory
    static_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'static'))
    
    app = Flask(__name__, 
                static_folder=static_dir,
                static_url_path='')
    
    # Load configuration
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Configure custom logging
    handler = ColoredStreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)
    
    # Register blueprints
    from backend.routes.main import bp as main_blueprint
    from backend.routes.universe import universe_bp
    from backend.routes.api import api_bp
    app.register_blueprint(main_blueprint)
    app.register_blueprint(universe_bp, url_prefix='/api')
    app.register_blueprint(api_bp)
    
    return app 