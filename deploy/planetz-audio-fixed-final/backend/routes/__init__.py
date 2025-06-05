"""Routes package initialization."""
from .main import bp as main_bp
from .api import api_bp

__all__ = ['main_bp', 'api_bp'] 