from flask import Blueprint, jsonify, request
from verse import generate_star_system
import logging

universe_bp = Blueprint('universe', __name__)

@universe_bp.route('/generate_star_system')
def generate_star_system_route():
    try:
        seed = request.args.get('seed')
        if seed:
            try:
                seed = int(seed)
            except ValueError:
                return jsonify({'error': 'Invalid seed value'}), 400
        
        star_system = generate_star_system(seed)
        return jsonify(star_system)
    except Exception as e:
        logging.error(f"Error generating star system: {str(e)}")
        return jsonify({'error': str(e)}), 500 