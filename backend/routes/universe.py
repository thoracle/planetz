from flask import Blueprint, jsonify, request
from backend.verse import generate_star_system, generate_universe
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

universe_bp = Blueprint('universe', __name__)

@universe_bp.route('/generate_star_system')
def generate_star_system_route():
    try:
        seed = request.args.get('seed')
        # Try to convert seed to integer if provided
        if seed:
            try:
                seed = int(seed)
            except ValueError:
                # If conversion fails, use the string as is
                pass
        
        star_system = generate_star_system(seed)
        return jsonify(star_system)
    except Exception as e:
        logging.error(f"Error generating star system: {str(e)}")
        return jsonify({'error': str(e)}), 500

@universe_bp.route('/generate_universe')
def generate_universe_route():
    try:
        # Use environment seed by default, fallback to request seed if provided
        env_seed = os.getenv('UNIVERSE_SEED')
        seed = request.args.get('seed', env_seed)
        num_systems = request.args.get('num_systems', default=90, type=int)  # Default to 90 systems (9x10 grid)
        
        if seed:
            try:
                seed = int(seed)
            except ValueError:
                return jsonify({'error': 'Invalid seed value'}), 400
        
        universe = generate_universe(num_systems, seed)
        return jsonify(universe)
    except Exception as e:
        logging.error(f"Error generating universe: {str(e)}")
        return jsonify({'error': str(e)}), 500 