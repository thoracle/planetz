from flask import Blueprint, jsonify, request
from backend.verse import generate_star_system, generate_universe
from backend.positioning_enhancement import PositioningEnhancement
from backend import limiter
from backend.validation import (
    ValidationError, handle_validation_errors,
    validate_seed, validate_num_systems
)
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)
universe_bp = Blueprint('universe', __name__)

# Rate limit configurations - expensive generation operations
RATE_LIMIT_EXPENSIVE = "10 per minute"

@universe_bp.route('/generate_star_system')
@limiter.limit(RATE_LIMIT_EXPENSIVE)
@handle_validation_errors
def generate_star_system_route():
    try:
        # Validate seed if provided
        seed_param = request.args.get('seed')
        seed = None
        if seed_param:
            seed = validate_seed(seed_param, required=False)

        # Generate base star system
        star_system = generate_star_system(seed)

        # Enhance with positioning data for better gameplay
        enhancer = PositioningEnhancement()
        enhanced_system = enhancer.enhance_star_system(star_system)

        return jsonify(enhanced_system)
    except ValidationError:
        raise
    except (TypeError, ValueError) as e:
        logger.error(f"Invalid parameter for star system generation: {e}")
        return jsonify({'error': 'Invalid generation parameters'}), 400
    except (KeyError, AttributeError) as e:
        logger.error(f"Data error generating star system: {e}")
        return jsonify({'error': 'Failed to generate star system'}), 500
    except RuntimeError as e:
        logger.error(f"Runtime error generating star system: {e}")
        return jsonify({'error': 'Generation failed'}), 500

@universe_bp.route('/generate_universe')
@limiter.limit(RATE_LIMIT_EXPENSIVE)
@handle_validation_errors
def generate_universe_route():
    try:
        # Use environment seed by default, fallback to request seed if provided
        env_seed = os.getenv('UNIVERSE_SEED')
        seed_param = request.args.get('seed', env_seed)

        # Validate and convert seed
        seed = None
        if seed_param:
            try:
                seed = validate_seed(seed_param, required=False)
            except ValidationError:
                # If seed is not a valid integer, use hash of the string
                seed = hash(str(seed_param)) & 0xFFFFFFFF

        # Validate num_systems (with bounds to prevent DoS)
        num_systems_param = request.args.get('num_systems', 90)
        num_systems = validate_num_systems(num_systems_param)

        universe = generate_universe(num_systems, seed)
        return jsonify(universe)
    except ValidationError:
        raise
    except (TypeError, ValueError) as e:
        logger.error(f"Invalid parameter for universe generation: {e}")
        return jsonify({'error': 'Invalid generation parameters'}), 400
    except (KeyError, AttributeError) as e:
        logger.error(f"Data error generating universe: {e}")
        return jsonify({'error': 'Failed to generate universe'}), 500
    except RuntimeError as e:
        logger.error(f"Runtime error generating universe: {e}")
        return jsonify({'error': 'Generation failed'}), 500