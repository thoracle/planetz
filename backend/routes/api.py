"""API routes for the application."""
from flask import Blueprint, jsonify, request
import logging
from backend.PlanetTypes import PLANET_CLASSES
from backend.verse import generate_planet, calculate_checksum
import hashlib
import numpy as np
from backend.planetGenerator import PlanetGenerator

api_bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

@api_bp.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Not found'}), 404

@api_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f'Server Error: {error}')
    return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/health')
def health_check():
    """API health check endpoint."""
    return jsonify({'status': 'healthy'})

@api_bp.route('/api/planet-types', methods=['GET'])
def get_planet_types():
    """Get available planet types and their parameters."""
    try:
        return jsonify({
            'status': 'success',
            'data': PLANET_CLASSES
        })
    except Exception as e:
        logger.error(f"Error getting planet types: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get planet types'
        }), 500

@api_bp.route('/api/planet-config', methods=['POST'])
def update_planet_config():
    """Update planet generation parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400

        # Validate required fields
        required_fields = ['planetType', 'parameters']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400

        # Validate planet type
        if data['planetType'] not in PLANET_CLASSES:
            return jsonify({
                'status': 'error',
                'message': 'Invalid planet type'
            }), 400

        # Validate parameters
        required_params = ['noiseScale', 'octaves', 'persistence', 'lacunarity', 'terrainHeight']
        if not all(param in data['parameters'] for param in required_params):
            return jsonify({
                'status': 'error',
                'message': 'Missing required parameters'
            }), 400

        # Here you would typically update the planet configuration
        # For now, we'll just return success
        return jsonify({
            'status': 'success',
            'message': 'Planet configuration updated',
            'data': {
                'planetType': data['planetType'],
                'parameters': data['parameters']
            }
        })

    except Exception as e:
        logger.error(f"Error updating planet config: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update planet configuration'
        }), 500

@api_bp.route('/api/generate-planet', methods=['POST'])
def generate_planet_endpoint():
    """Generate a new planet with the given parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400

        # Validate required fields
        required_fields = ['planetType', 'parameters']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400

        # Generate a seed from the parameters
        param_str = str(data['parameters'])
        seed = int(hashlib.sha256(param_str.encode()).hexdigest(), 16) % (2**32)

        # Generate the planet
        planet = generate_planet(random_seed=seed)
        
        # Calculate checksum for verification
        checksum = calculate_checksum([planet])

        return jsonify({
            'status': 'success',
            'message': 'Planet generated successfully',
            'data': {
                'planet': planet,
                'checksum': checksum,
                'seed': seed
            }
        })

    except Exception as e:
        logger.error(f"Error generating planet: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate planet'
        }), 500

@api_bp.route('/api/chunk-data', methods=['GET'])
def get_chunk_data():
    try:
        # Get chunk coordinates from query parameters
        x = int(request.args.get('x', 0))
        y = int(request.args.get('y', 0))
        z = int(request.args.get('z', 0))
        
        # Get planet parameters from query parameters
        planet_type = request.args.get('planetType', 'Class-M')
        seed = int(request.args.get('seed', 0))
        
        # Validate planet type
        if planet_type not in PLANET_CLASSES:
            return jsonify({'error': 'Invalid planet type'}), 400
        
        # Get planet parameters
        params = PLANET_CLASSES[planet_type]
        
        # Create planet generator with parameters
        generator = PlanetGenerator(
            noise_scale=params['noise_scale'],
            octaves=params['octaves'],
            persistence=params['persistence'],
            lacunarity=params['lacunarity'],
            terrain_height=params['terrain_height'],
            seed=seed
        )
        
        # Generate chunk data
        chunk_size = 16  # Must match frontend chunk size
        density_field = generator.generate_chunk_density_field(x, y, z, chunk_size)
        
        # Convert to list for JSON serialization
        density_field_list = density_field.tolist()
        
        return jsonify({
            'densityField': density_field_list,
            'x': x,
            'y': y,
            'z': z
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 