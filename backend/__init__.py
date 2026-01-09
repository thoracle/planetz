"""Initialize the backend package."""
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from backend.config import config
import os
import logging
from logging import StreamHandler
import sys

# Initialize rate limiter (will be attached to app in create_app)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

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
        except (IOError, OSError, ValueError):
            self.handleError(record)

def create_app(config_name):
    """Create and configure the Flask application."""
    # Get the absolute path to the frontend static directory
    static_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'static'))
    
    app = Flask(__name__, 
                static_folder=static_dir,
                static_url_path='/static')
    
    # Load configuration
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # Initialize rate limiter
    limiter.init_app(app)

    # Configure CORS
    # In production, restrict to same origin; in development, allow localhost
    cors_origins = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []
    if app.debug:
        # Allow localhost origins in development
        cors_origins.extend(['http://localhost:5001', 'http://127.0.0.1:5001'])

    CORS(app,
         origins=cors_origins if cors_origins else None,  # None = same-origin only
         supports_credentials=True,
         expose_headers=['Content-Type', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'])

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
    from backend.routes.missions import missions_bp, init_mission_system
    
    app.register_blueprint(main_blueprint)
    app.register_blueprint(universe_bp, url_prefix='/api')
    app.register_blueprint(api_bp)
    app.register_blueprint(missions_bp)
    
    # Initialize mission system
    with app.app_context():
        init_mission_system(app)

    # Add security headers to all responses
    @app.after_request
    def add_security_headers(response):
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'

        # XSS protection (legacy but still useful for older browsers)
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # Control referrer information
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Restrict browser features
        response.headers['Permissions-Policy'] = (
            'accelerometer=(), camera=(), geolocation=(), gyroscope=(), '
            'magnetometer=(), microphone=(), payment=(), usb=()'
        )

        # Content Security Policy
        # Allow self for most resources, with specific exceptions for Three.js/WebGL
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Three.js needs eval for shaders
            "style-src 'self' 'unsafe-inline'",  # Allow inline styles
            "img-src 'self' data: blob:",  # Allow data URIs and blobs for textures
            "font-src 'self'",
            "connect-src 'self'",  # API calls
            "media-src 'self' blob:",  # Audio/video
            "object-src 'none'",  # Block plugins
            "frame-ancestors 'self'",  # Prevent embedding
            "base-uri 'self'",
            "form-action 'self'",
            "worker-src 'self' blob:",  # Web workers
        ]
        response.headers['Content-Security-Policy'] = '; '.join(csp_directives)

        # HSTS - only enable in production with HTTPS
        if not app.debug and os.getenv('ENABLE_HSTS', 'false').lower() == 'true':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        return response

    return app 