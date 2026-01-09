"""Configuration settings for the Flask application."""
import os
import secrets
from pathlib import Path

def _get_secret_key():
    """Get SECRET_KEY from environment or generate a random one for development."""
    key = os.getenv('SECRET_KEY')
    if key:
        return key
    # Generate a random key for development (changes each restart)
    import logging
    logging.getLogger(__name__).warning(
        "SECRET_KEY not set - using randomly generated key. "
        "Set SECRET_KEY environment variable for persistent sessions."
    )
    return secrets.token_hex(32)

class Config:
    """Base configuration."""
    # Flask settings - use env var or generate random key
    SECRET_KEY = _get_secret_key()
    STATIC_FOLDER = str(Path(__file__).parent.parent / 'frontend' / 'static')
    PORT = 5001  # Set default port to 5001

    # Admin API key for protected endpoints
    # Set via ADMIN_API_KEY environment variable
    ADMIN_API_KEY = os.getenv('ADMIN_API_KEY')

    # Logging settings
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

    # API settings
    API_PREFIX = '/api/v1'
    
    # Mission system settings  
    MISSION_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'missions')
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
        # Require security keys in production
        assert os.getenv('SECRET_KEY'), 'SECRET_KEY environment variable is required in production'
        assert os.getenv('ADMIN_API_KEY'), 'ADMIN_API_KEY environment variable is required in production'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,  # Add testing configuration
    'default': DevelopmentConfig
} 