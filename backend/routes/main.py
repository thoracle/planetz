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
        return 'application/javascript'  # ES6 modules require application/javascript
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

@bp.route('/frontend/static/<path:path>')
def serve_static_files(path):
    """Serve static files with proper MIME types."""
    try:
        logger.info(f"Serving static file: {path}")
        
        mime_type = get_mime_type(path)
        response = send_from_directory(
            current_app.static_folder,
            path,
            mimetype=mime_type
        )
        
        # Add headers for JavaScript files
        if path.endswith('.js'):
            response.headers['Content-Type'] = 'application/javascript'
        
        # Add cache control headers for development
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        logger.info(f"Successfully served static file: {path}")
        return response
    except Exception as e:
        logger.error(f"Error serving static file {path}: {str(e)}")
        return f"Error serving static file: {path}", 404

@bp.route('/<path:path>')
def serve_frontend_routes(path):
    """Handle frontend routing - serve index.html for non-API routes."""
    try:
        # Skip API routes
        if path.startswith('api/'):
            return "API endpoint not found", 404
            
        # Skip static file routes - these should be handled by serve_static_files
        if path.startswith('frontend/static/'):
            return "Static file not found", 404
            
        # For all other paths, serve index.html (for client-side routing)
        logger.info(f"Serving index.html for route: {path}")
        return send_from_directory(current_app.static_folder, 'index.html', mimetype='text/html')
    except Exception as e:
        logger.error(f"Error serving file {path}: {str(e)}")
        return f"Error serving file: {path}", 404 

@bp.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy"})

@bp.route('/test/<path:filename>')
def serve_test_files(filename):
    """Serve test files from the test directory."""
    try:
        test_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'test'))
        logger.info(f"Serving test file: {filename} from {test_dir}")
        
        mime_type = get_mime_type(filename)
        response = send_from_directory(
            test_dir,
            filename,
            mimetype=mime_type
        )
        
        # Add no-cache headers for test files
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        logger.info(f"Successfully served test file: {filename}")
        return response
    except Exception as e:
        logger.error(f"Error serving test file {filename}: {str(e)}")
        return f"Error serving test file: {filename}", 404 