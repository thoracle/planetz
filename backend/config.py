"""Configuration settings for the Flask application."""
import os
from pathlib import Path

class Config:
    """Base configuration."""
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-please-change-in-production')
    STATIC_FOLDER = str(Path(__file__).parent.parent / 'frontend' / 'static')
    
    # Logging settings
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # API settings
    API_PREFIX = '/api/v1'
    
    @staticmethod
    def init_app(app):
        """Initialize the application with this configuration."""
        # Create frontend dist directory if it doesn't exist
        static_dir = Path(app.static_folder)
        static_dir.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


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
    'default': DevelopmentConfig
} 