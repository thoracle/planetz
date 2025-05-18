"""Main routes for serving the frontend application."""
from flask import Blueprint, send_from_directory, current_app, jsonify
import logging
import mimetypes
import os

bp = Blueprint('main', __name__)
logger = logging.getLogger(__name__)

# Configure additional MIME types
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')

def get_mime_type(path):
    """Get MIME type for a file path."""
    if path.endswith('.js'):
        return 'text/javascript'
    if path.endswith('.css'):
        return 'text/css'
    return mimetypes.guess_type(path)[0] or 'application/octet-stream'

@bp.route('/')
def index():
    """Serve the main page."""
    try:
        logger.info("Serving index.html")
        return send_from_directory(current_app.static_folder, 'index.html', mimetype='text/html')
    except Exception as e:
        logger.error(f"Error serving index.html: {str(e)}")
        return "Error serving frontend application", 500

@bp.route('/<path:path>')
def serve_static(path):
    """Serve static files with proper MIME types."""
    try:
        logger.info(f"Serving static file: {path}")
        
        # Handle CSS, JS, and other static files
        if path.startswith(('css/', 'js/', 'assets/', 'lib/')):
            mime_type = get_mime_type(path)
            response = send_from_directory(
                current_app.static_folder,
                path,
                mimetype=mime_type
            )
            # Add headers for JavaScript files
            if path.endswith('.js'):
                response.headers['Content-Type'] = 'text/javascript'
            
            # Add cache control headers
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            
            logger.info(f"Successfully served file: {path}")
            return response
        
        # For all other paths, serve index.html (for client-side routing)
        return send_from_directory(current_app.static_folder, 'index.html', mimetype='text/html')
    except Exception as e:
        logger.error(f"Error serving file {path}: {str(e)}")
        return f"Error serving file: {path}", 404

@bp.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}) 