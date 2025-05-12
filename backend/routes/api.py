"""API routes for the application."""
from flask import Blueprint, jsonify
import logging

bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

@bp.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Not found'}), 404

@bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f'Server Error: {error}')
    return jsonify({'error': 'Internal server error'}), 500

@bp.route('/health')
def health_check():
    """API health check endpoint."""
    return jsonify({'status': 'healthy'}) 