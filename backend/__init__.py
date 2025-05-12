"""Initialize the Flask application."""
from flask import Flask
from flask.logging import create_logger
import logging
from .config import config

def create_app(config_name='default'):
    """Create and configure the Flask application."""
    app = Flask(__name__, static_folder=config[config_name].STATIC_FOLDER)
    
    # Load configuration
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Set up logging
    logging.basicConfig(
        level=app.config['LOG_LEVEL'],
        format=app.config['LOG_FORMAT']
    )
    logger = create_logger(app)
    
    # Register blueprints
    from .routes import main_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix=app.config['API_PREFIX'])
    
    return app 