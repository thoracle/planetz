"""Configuration settings for the Flask application."""
import os
from pathlib import Path

class Config:
    """Base configuration."""
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'planetz-game-secret-key-2024')
    STATIC_FOLDER = str(Path(__file__).parent.parent / 'frontend' / 'static')
    PORT = 5001  # Set default port to 5001
    
    # Logging settings
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # API settings
    API_PREFIX = '/api/v1'
    
    @staticmethod
    def init_app(app):
        """Initialize the application with this configuration."""
        # Create static directory if it doesn't exist
        static_dir = Path(app.static_folder)
        static_dir.mkdir(parents=True, exist_ok=True)
        
        # Log static folder path for debugging
        app.logger.info(f"Static folder path: {app.static_folder}")
        app.logger.info(f"Static folder exists: {static_dir.exists()}")
        if static_dir.exists():
            app.logger.info(f"Static folder contents: {list(static_dir.iterdir())}")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    # Use a different port for testing to avoid conflicts
    PORT = 5002
    # Use an in-memory database if applicable
    # DATABASE_URI = 'sqlite:///:memory:'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'planetz-game-production-key-2024-change-me')
    PORT = 80  # Standard web port for production
    
    @classmethod
    def init_app(cls, app):
        """Production-specific initialization."""
        Config.init_app(app)
        # Production-specific logging
        import logging
        from logging.handlers import RotatingFileHandler
        
        # Set up file logging for production
        if not app.debug:
            file_handler = RotatingFileHandler('logs/planetz.log', maxBytes=10240, backupCount=10)
            file_handler.setFormatter(logging.Formatter(cls.LOG_FORMAT))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Planetz game startup in production mode')


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': ProductionConfig  # Default to production for deployment
} 