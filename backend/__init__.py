"""Initialize the backend package."""
from flask import Flask
from backend.config import config
import os

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
    
    # Register blueprints
    from backend.routes.main import bp as main_blueprint
    app.register_blueprint(main_blueprint)
    
    return app 