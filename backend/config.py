"""Configuration settings for the Flask application."""
import os
from pathlib import Path

class Config:
    """Base configuration."""
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-please-change-in-production')
    STATIC_FOLDER = str(Path(__file__).parent.parent / 'frontend' / 'static')
    PORT = 5001  # Set default port to 5001
    
    # Logging settings
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # API settings
    API_PREFIX = '/api/v1'
    
    # Mission system settings
    MISSION_DATA_DIR = 'missions'
    EXPECTED_MISSION_COUNT = 25
    MISSION_SQLITE_PATH = 'missions.db'
    
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
    
    @classmethod
    def init_app(cls, app):
        """Production-specific initialization."""
        Config.init_app(app)
        # Set production-specific settings here
        assert os.getenv('SECRET_KEY'), 'SECRET_KEY environment variable is required in production'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,  # Add testing configuration
    'default': DevelopmentConfig
} 