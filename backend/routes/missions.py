"""
Mission System API Routes
Flask API endpoints for mission management
Following docs/mission_spec.md section 3.3 API specifications
"""

import logging
from flask import Blueprint, jsonify, request, current_app
from typing import Dict, List, Any, Optional

from backend.mission_system import MissionManager, Mission, MissionState, Objective
from backend.mission_integration import MissionIntegration
from backend.game_state import GameStateManager
from backend.auth import require_admin_key
from backend import limiter
from backend.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_ADMIN
from backend.validation import (
    ValidationError, handle_validation_errors,
    validate_mission_id, validate_string, validate_int, validate_dict,
    validate_enum, validate_float, validate_cargo_type, validate_enemy_type,
    validate_location, validate_entity_id, validate_quantity, validate_integrity,
    validate_cargo_value, TEMPLATE_ID_PATTERN
)

logger = logging.getLogger(__name__)

# Create blueprint for mission routes
missions_bp = Blueprint('missions', __name__)


# ================== Decorators ==================

def require_mission_manager(f):
    """
    Decorator to check mission_manager is initialized.
    Replaces repetitive guard clause: if not mission_manager: return error
    """
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not mission_manager:
            return jsonify({'status': 'error', 'message': 'Mission system not initialized'}), 503
        return f(*args, **kwargs)
    return decorated


def require_mission_integration(f):
    """
    Decorator to check mission_integration is initialized.
    For endpoints that use the mission integration system.
    """
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not mission_integration:
            return jsonify({'status': 'error', 'message': 'Mission integration not initialized'}), 503
        return f(*args, **kwargs)
    return decorated


# ================== Standard Response Utilities ==================

def success_response(data=None, message=None, **kwargs):
    """
    Standard success response format.
    Returns: {'status': 'success', 'data': ..., 'message': ...}
    """
    response = {'status': 'success'}
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
    response.update(kwargs)
    return jsonify(response)


def error_response(message, code=400, field=None):
    """
    Standard error response format.
    Returns: {'status': 'error', 'message': ..., 'field': ...}
    """
    response = {'status': 'error', 'message': message}
    if field:
        response['field'] = field
    return jsonify(response), code


def list_response(items, total=None, page=None, per_page=None, **kwargs):
    """
    Standard list response format with optional pagination.
    Returns: {'status': 'success', 'data': [...], 'count': N, 'total': N}
    """
    response = {
        'status': 'success',
        'data': items,
        'count': len(items)
    }
    if total is not None:
        response['total'] = total
    if page is not None:
        response['page'] = page
        response['per_page'] = per_page
    response.update(kwargs)
    return jsonify(response)

# Global mission system instances (will be initialized in app factory)
mission_manager: Optional[MissionManager] = None
game_state_manager: Optional[GameStateManager] = None
mission_integration: Optional[MissionIntegration] = None


def init_mission_system(app, config: Dict[str, Any] = None):
    """Initialize mission system with Flask app"""
    global mission_manager, game_state_manager, mission_integration

    # Get mission configuration from app config
    mission_config = config or {
        'data_directory': app.config.get('MISSION_DATA_DIR', 'missions'),
        'expected_mission_count': app.config.get('EXPECTED_MISSION_COUNT', 25),
        'sqlite_path': app.config.get('MISSION_SQLITE_PATH', 'missions.db')
    }

    # Initialize mission manager
    mission_manager = MissionManager(
        data_directory=mission_config['data_directory'],
        config=mission_config
    )

    # Initialize game state manager
    universe_seed = app.config.get('UNIVERSE_SEED', 20299999)
    player_id = app.config.get('PLAYER_ID', 'default_player')
    game_state_manager = GameStateManager(universe_seed, player_id)

    # Initialize mission integration
    mission_integration = MissionIntegration(game_state_manager, mission_manager)

    logger.info(f"🎯 Mission system initialized with {len(mission_manager.missions)} missions")
    logger.info(f"📊 Game state manager initialized for player: {player_id}")
    logger.info(f"🔗 Mission integration active")


@missions_bp.errorhandler(404)
def mission_not_found(error):
    """Handle mission not found errors"""
    return jsonify({'error': 'Mission not found'}), 404


@missions_bp.errorhandler(400)
def bad_request(error):
    """Handle bad request errors"""
    return jsonify({'error': 'Bad request'}), 400


@missions_bp.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    return jsonify({'error': 'Internal server error'}), 500


# API Endpoints as specified in mission spec section 3.3

@missions_bp.route('/api/missions', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def get_available_missions():
    """
    Get available missions for player at current location
    Query parameters:
    - location: Current location (optional)
    - faction_standings: JSON object of faction standings (optional)
    - page: Page number (default: 1, max: 1000)
    - per_page: Items per page (default: 50, max: 100)
    """
    try:
        location = request.args.get('location')
        faction_standings_str = request.args.get('faction_standings')

        # Pagination parameters with validation
        page = validate_int(request.args.get('page', 1), 'page', min_val=1, max_val=1000)
        per_page = validate_int(request.args.get('per_page', 50), 'per_page', min_val=1, max_val=100)

        faction_standings = None
        if faction_standings_str:
            import json
            try:
                faction_standings = json.loads(faction_standings_str)
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid faction_standings JSON: {e}")
                return error_response('Invalid faction_standings JSON format', 400)

        available_missions = mission_manager.get_available_missions(
            location=location,
            faction_standing=faction_standings
        )

        # Get total count before pagination
        total = len(available_missions)

        # Apply pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_missions = available_missions[start:end]

        # Convert missions to dict format for JSON response
        missions_data = [mission.to_dict() for mission in paginated_missions]

        return list_response(
            missions_data,
            total=total,
            page=page,
            per_page=per_page,
            location=location
        )

    except ValidationError as e:
        return error_response(str(e), 400, field=e.field)
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Get available missions failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/active', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def get_active_missions():
    """
    Get active/accepted missions for the player
    Query parameters:
    - page: Page number (default: 1, max: 1000)
    - per_page: Items per page (default: 50, max: 100)
    """
    try:
        # Pagination parameters with validation
        page = validate_int(request.args.get('page', 1), 'page', min_val=1, max_val=1000)
        per_page = validate_int(request.args.get('per_page', 50), 'per_page', min_val=1, max_val=100)

        # Get player context from request if needed
        player_context = {}

        active_missions = mission_manager.get_active_missions(player_context)

        # Get total count before pagination
        total = len(active_missions)

        # Apply pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_missions = active_missions[start:end]

        # Convert missions to dict format for JSON response
        missions_data = [mission.to_dict() for mission in paginated_missions]

        return list_response(
            missions_data,
            total=total,
            page=page,
            per_page=per_page
        )

    except ValidationError as e:
        return error_response(str(e), 400, field=e.field)
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Get active missions failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/active/clear', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def clear_active_missions():
    """
    Clear all active missions (useful for new game sessions)
    """
    try:
        # Get player context from request if needed
        player_context = {}

        cleared_count = mission_manager.clear_active_missions(player_context)

        return success_response(
            message=f'Cleared {cleared_count} active missions',
            cleared_count=cleared_count
        )

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Clear active missions failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
@handle_validation_errors
def get_mission_details(mission_id: str):
    """
    Get detailed information about a specific mission
    From spec: GET /get_mission_state/{mission_id}
    """
    try:
        # Validate mission_id format
        validated_id = validate_mission_id(mission_id)

        mission = mission_manager.get_mission(validated_id)
        if not mission:
            return error_response(f'Mission not found: {validated_id}', 404)

        return success_response(
            mission=mission.to_dict(),
            state=mission.get_state(),
            progress=mission.get_progress()
        )

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Get mission details failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/accept_legacy', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def accept_mission_legacy(mission_id: str):
    """
    Accept a mission (change state to ACCEPTED) - Legacy endpoint
    From spec: POST /set_mission_state/{mission_id} with new_state: 'Accepted'
    """
    try:
        # Get player context from request
        player_context = request.get_json() or {}

        success = mission_manager.accept_mission(mission_id, player_context)

        if success:
            mission = mission_manager.get_mission(mission_id)

            # Fire triggers and get response hooks
            hooks = mission_manager.trigger_system.fire_trigger(
                'mission_accepted', mission, player_context
            )

            return success_response(
                mission=mission.to_dict(),
                hooks=hooks,
                message=f'Mission accepted: {mission.title}'
            )
        else:
            return error_response('Failed to accept mission', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Accept mission failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/progress', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def update_mission_progress(mission_id: str):
    """
    Update mission progress (achieve objectives or advance state)
    From spec: POST /set_mission_state/{mission_id} with objective_id
    """
    try:
        data = request.get_json() or {}
        objective_id = data.get('objective_id')
        event_data = data.get('event_data', {})

        updated_mission = mission_manager.update_mission_progress(
            mission_id=mission_id,
            objective_id=objective_id,
            event_data=event_data
        )

        if updated_mission:
            # Fire appropriate triggers
            if objective_id:
                hooks = mission_manager.trigger_system.fire_trigger(
                    'objective_completed', updated_mission, {
                        'objective_id': objective_id,
                        'event_data': event_data
                    }
                )
            else:
                hooks = []

            # Check if mission was completed
            if updated_mission.state == MissionState.COMPLETED:
                completion_hooks = mission_manager.trigger_system.fire_trigger(
                    'mission_completed', updated_mission, event_data
                )
                hooks.extend(completion_hooks)

            return success_response(
                mission=updated_mission.to_dict(),
                progress=updated_mission.get_progress(),
                hooks=hooks,
                objective_achieved=objective_id if objective_id else None
            )
        else:
            return error_response('Failed to update mission progress', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Update mission progress failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/botch', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def botch_mission(mission_id: str):
    """
    Botch a mission (mark as failed)
    From spec: POST /botch_mission/{mission_id}
    """
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Unknown failure')
        context = data.get('context', {})

        success = mission_manager.botch_mission(mission_id, reason, context)

        if success:
            mission = mission_manager.get_mission(mission_id)

            # Fire botch triggers
            hooks = mission_manager.trigger_system.fire_trigger(
                'mission_botched', mission, {
                    'reason': reason,
                    'context': context
                }
            )

            return success_response(
                mission=mission.to_dict(),
                hooks=hooks,
                reason=reason
            )
        else:
            return error_response('Failed to botch mission', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Botch mission failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/unbotch', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def unbotch_mission(mission_id: str):
    """
    Remove botched flag from mission (redemption arc)
    From spec: POST /unbotch_mission/{mission_id}
    """
    try:
        mission = mission_manager.get_mission(mission_id)
        if not mission:
            return error_response(f'Mission not found: {mission_id}', 404)

        success = mission.unbotch()

        if success:
            mission_manager.save_mission(mission)

            return success_response(
                mission=mission.to_dict(),
                message='Mission unbotched - redemption arc available'
            )
        else:
            return error_response('Mission was not botched or cannot be unbotched', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Unbotch mission failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/abandon', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def abandon_mission(mission_id: str):
    """Allow player to abandon accepted mission"""
    
    try:
        data = request.get_json() or {}
        player_context = data.get('player_context', {})

        success = mission_manager.abandon_mission(mission_id, player_context)

        if success:
            mission = mission_manager.get_mission(mission_id)

            return success_response(
                mission=mission.to_dict(),
                message=f'Mission abandoned: {mission.title}'
            )
        else:
            return error_response('Failed to abandon mission', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Abandon mission failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/generate', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
@handle_validation_errors
def generate_mission():
    """
    Generate a procedural mission from template
    From spec: Dynamic generation capability
    """
    try:
        data = request.get_json() or {}

        # Validate template_id
        template_id = validate_string(
            data.get('template_id'),
            'template_id',
            max_length=50,
            pattern=TEMPLATE_ID_PATTERN
        )

        # Validate optional fields
        player_data = validate_dict(data.get('player_data', {}), 'player_data', required=False) or {}
        location = validate_string(data.get('location', 'unknown'), 'location', max_length=100, required=False) or 'unknown'

        # Safety: validate template exists before attempting generation
        if template_id not in mission_manager.templates:
            available = sorted(list(mission_manager.templates.keys()))
            return error_response(
                f"Unknown template_id '{template_id}'", 400,
            )

        mission = mission_manager.generate_procedural_mission(
            template_id=template_id,
            player_data=player_data,
            location=location
        )

        if mission:
            return success_response(
                mission=mission.to_dict(),
                message=f'Generated mission: {mission.title}'
            )
        else:
            return error_response(f"Failed to generate mission from template '{template_id}'", 400)

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError, RuntimeError) as e:
        logger.error(f"❌ Generate mission failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/templates', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def get_mission_templates():
    """
    Get available mission templates
    Query parameters:
    - page: Page number (default: 1, max: 1000)
    - per_page: Items per page (default: 50, max: 100)
    """
    try:
        # Pagination parameters with validation
        page = validate_int(request.args.get('page', 1), 'page', min_val=1, max_val=1000)
        per_page = validate_int(request.args.get('per_page', 50), 'per_page', min_val=1, max_val=100)

        templates = list(mission_manager.templates.keys())

        # Get total count before pagination
        total = len(templates)

        # Apply pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_templates = templates[start:end]

        return list_response(
            paginated_templates,
            total=total,
            page=page,
            per_page=per_page
        )

    except ValidationError as e:
        return error_response(str(e), 400, field=e.field)
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Get mission templates failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/stats', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
def get_mission_stats():
    """Get mission system statistics"""
    try:
        stats = mission_manager.get_stats()

        # Add storage performance stats
        storage_stats = mission_manager.storage_manager.get_performance_stats()

        # Add cascade system stats
        cascade_stats = mission_manager.cascade_handler.get_cascade_stats()

        return success_response(
            mission_stats=stats,
            storage_stats=storage_stats,
            cascade_stats=cascade_stats
        )

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Get mission stats failed: {e}")
        return error_response('Internal server error', 500)


# Game Event Endpoints (for mission progress integration)

@missions_bp.route('/api/missions/events/enemy_destroyed', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
@handle_validation_errors
def handle_enemy_destroyed():
    """Handle enemy destroyed events for mission progress"""

    try:
        data = request.get_json() or {}

        # Validate all input parameters
        enemy_type = validate_enemy_type(data.get('enemy_type'), required=True)
        enemy_id = validate_entity_id(data.get('enemy_id'), 'enemy_id', required=False)
        location = validate_location(data.get('location'), required=False)
        player_context = validate_dict(data.get('player_context'), 'player_context', required=False) or {}
        
        # Check active elimination missions (O(1) lookup via index)
        updated_missions = []

        for mission in mission_manager.get_active_missions_by_type('elimination'):
            # Check if this enemy type matches mission requirements
            target_enemy = mission.custom_fields.get('target_enemy_type')
            if enemy_type == target_enemy:
                updated_mission = mission_manager.update_mission_progress(
                    mission.id,
                    event_data={
                        'type': 'enemy_destroyed',
                        'enemy_type': enemy_type,
                        'enemy_id': enemy_id,
                        'location': location
                    }
                )

                if updated_mission:
                    updated_missions.append(updated_mission.to_dict())
        
        return success_response(updated_missions=updated_missions, count=len(updated_missions))

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Handle enemy destroyed failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/events/location_reached', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
@handle_validation_errors
def handle_location_reached():
    """Handle location reached events for mission progress"""

    try:
        data = request.get_json() or {}

        # Validate all input parameters
        location = validate_location(data.get('location'), required=True)
        coordinates = validate_dict(data.get('coordinates'), 'coordinates', required=False) or {}
        player_context = validate_dict(data.get('player_context'), 'player_context', required=False) or {}
        
        # Check active exploration and reconnaissance missions (O(1) lookup via index)
        updated_missions = []

        # Query both mission types
        active_missions = (
            mission_manager.get_active_missions_by_type('exploration') +
            mission_manager.get_active_missions_by_type('reconnaissance')
        )

        for mission in active_missions:
            # Check if this location matches mission requirements
            target_location = mission.custom_fields.get('target_location')
            if location == target_location:
                updated_mission = mission_manager.update_mission_progress(
                    mission.id,
                    event_data={
                        'type': 'location_reached',
                        'location': location,
                        'coordinates': coordinates
                    }
                )

                if updated_mission:
                    updated_missions.append(updated_mission.to_dict())

        return success_response(updated_missions=updated_missions, count=len(updated_missions))

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Handle location reached failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/events/cargo_delivered', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
@handle_validation_errors
def handle_cargo_delivered():
    """Handle cargo delivery events for mission progress"""

    try:
        data = request.get_json() or {}

        # Validate all input parameters
        cargo_type = validate_cargo_type(data.get('cargo_type'), required=True)
        delivery_location = validate_location(data.get('delivery_location'), required=True)
        cargo_value = validate_cargo_value(data.get('cargo_value'), required=False) or 0
        quantity = validate_quantity(data.get('quantity'), required=False) or 0
        integrity = validate_integrity(data.get('integrity'), required=False) or 1.0
        source = validate_string(data.get('source'), 'source', max_length=100, required=False) or 'unknown'
        destination_station = validate_string(data.get('destination_station'), 'destination_station', max_length=100, required=False)
        mission_id = validate_mission_id(data.get('mission_id')) if data.get('mission_id') else None
        player_context = validate_dict(data.get('player_context'), 'player_context', required=False) or {}
        
        # Check active delivery missions (O(1) lookup via index)
        # Include both ACCEPTED and ACHIEVED states for delivery tracking
        updated_missions = []

        active_delivery_missions = mission_manager.get_missions_by_type_and_states(
            'delivery', [MissionState.ACCEPTED, MissionState.ACHIEVED]
        )

        for mission in active_delivery_missions:
            # Check if cargo and location match mission requirements
            target_cargo = mission.custom_fields.get('cargo_type')
            target_location = mission.custom_fields.get('destination')  # Use 'destination' not 'delivery_location'

            logger.info(f"🚛 Checking mission {mission.id}: cargo={target_cargo}, destination={target_location}")
            logger.info(f"🚛 Event: cargo={cargo_type}, delivery_location={delivery_location}, source={source}")
            logger.info(f"🚛 Mission delivery_type: {mission.custom_fields.get('delivery_type', 'auto_delivery')}")

            if cargo_type == target_cargo and delivery_location == target_location:
                updated_mission = mission_manager.update_mission_progress(
                    mission.id,
                    event_data={
                        'type': 'cargo_delivered',
                        'cargo_type': cargo_type,
                        'delivery_location': delivery_location,
                        'location': delivery_location,
                        'quantity': quantity,
                        'integrity': integrity,
                        'source': source,
                        'cargo_value': cargo_value
                    }
                )

                if updated_mission:
                    updated_missions.append(updated_mission.to_dict())

        return success_response(updated_missions=updated_missions, count=len(updated_missions))

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Handle cargo delivered failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/events/cargo_loaded', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_manager
@handle_validation_errors
def handle_cargo_loaded():
    """Handle cargo loaded events for mission progress"""

    try:
        data = request.get_json() or {}

        # Validate all input parameters
        cargo_type = validate_cargo_type(data.get('cargo_type'), required=True)
        quantity = validate_quantity(data.get('quantity'), required=False) or 0
        location = validate_location(data.get('location'), required=False)
        cargo_id = validate_entity_id(data.get('cargo_id'), 'cargo_id', required=False)
        player_context = validate_dict(data.get('player_context'), 'player_context', required=False) or {}
        
        logger.info(f"🚛 Cargo loaded event: cargo={cargo_type}, quantity={quantity}, location={location}")

        # Check active delivery missions (O(1) lookup via index)
        updated_missions = []

        for mission in mission_manager.get_active_missions_by_type('delivery'):
            logger.info(f"🚛 Checking delivery mission {mission.id}: {mission.title}")
            target_cargo = mission.custom_fields.get('cargo_type')
            logger.info(f"🚛 Mission expects cargo: {target_cargo}, event has: {cargo_type}")

            updated_mission = mission_manager.update_mission_progress(
                mission.id,
                event_data={
                    'type': 'cargo_loaded',
                    'cargo_type': cargo_type,
                    'quantity': quantity,
                    'location': location
                }
            )

            if updated_mission:
                updated_missions.append(updated_mission.to_dict())

        return success_response(updated_missions=updated_missions, count=len(updated_missions))

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Handle cargo loaded failed: {e}")
        return error_response('Internal server error', 500)


# Admin/Debug Endpoints

@missions_bp.route('/api/missions/admin/cleanup', methods=['POST'])
@limiter.limit(RATE_LIMIT_ADMIN)
@require_admin_key
@require_mission_manager
@handle_validation_errors
def cleanup_old_missions():
    """Cleanup old completed missions (admin endpoint, requires authentication)"""
    try:
        data = request.get_json() or {}

        # Validate days_old (must be positive, max 365 days)
        days_old = validate_int(data.get('days_old', 30), 'days_old', min_val=1, max_val=365, required=False) or 30

        archived_count = mission_manager.cleanup_old_missions(days_old)

        return success_response(
            archived_count=archived_count,
            message=f'Archived {archived_count} missions older than {days_old} days'
        )

    except ValidationError:
        raise
    except (TypeError, KeyError, AttributeError, RuntimeError) as e:
        logger.error(f"❌ Cleanup old missions failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/admin/migrate_storage', methods=['POST'])
@limiter.limit(RATE_LIMIT_ADMIN)
@require_admin_key
@require_mission_manager
def migrate_storage():
    """Migrate mission storage to database (admin endpoint, requires authentication)"""
    try:
        success = mission_manager.storage_manager.migrate_to_database()

        if success:
            return success_response(message='Storage migration completed successfully')
        else:
            return error_response('Storage migration failed', 500)

    except (IOError, OSError, RuntimeError) as e:
        logger.error(f"❌ Storage migration failed: {e}")
        return error_response('Internal server error', 500)


# Phase 4: Mission System Integration with GameStateManager
# ==========================================================

@missions_bp.route('/api/missions/discovery/update', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def update_mission_discovery():
    """Update mission discovery based on current game state"""
    try:
        newly_discovered = mission_integration.update_mission_discovery()

        return success_response(
            newly_discovered=newly_discovered,
            total_discovered=len(mission_integration.get_discovered_missions())
        )

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Mission discovery update failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/discovery/status', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def get_mission_discovery_status():
    """Get current mission discovery status"""
    try:
        stats = mission_integration.get_mission_statistics()

        return success_response(
            discovered_missions=mission_integration.get_discovered_missions(),
            available_missions=mission_integration.get_available_missions(),
            active_missions=mission_integration.get_active_missions(),
            completed_missions=mission_integration.get_completed_missions(),
            statistics=stats
        )

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Mission discovery status failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/discover', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def discover_mission(mission_id):
    """Mark a mission as discovered"""
    try:
        data = request.get_json() or {}
        discovery_method = data.get('discovery_method', 'manual')

        mission_integration.mark_mission_discovered(mission_id, discovery_method)

        return success_response(
            mission_id=mission_id,
            discovery_method=discovery_method
        )

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Mission discovery failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/make_available', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def make_mission_available(mission_id):
    """Make a mission available for acceptance"""
    try:
        mission_integration.make_mission_available(mission_id)

        return success_response(mission_id=mission_id)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Make mission available failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/accept', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def accept_mission(mission_id):
    """Accept a mission"""
    try:
        success = mission_integration.accept_mission(mission_id)

        if success:
            return success_response(
                mission_id=mission_id,
                message='Mission accepted successfully'
            )
        else:
            return error_response('Mission not available for acceptance', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Mission acceptance failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/<mission_id>/complete', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def complete_mission(mission_id):
    """Complete a mission"""
    try:
        data = request.get_json() or {}
        success = data.get('success', True)

        completion_success = mission_integration.complete_mission(mission_id, success)

        if completion_success:
            return success_response(
                mission_id=mission_id,
                mission_success=success,
                message=f'Mission {"completed successfully" if success else "failed"}'
            )
        else:
            return error_response('Mission could not be completed', 400)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Mission completion failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/state/<mission_id>', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def get_mission_state(mission_id):
    """Get the current state of a mission from GameStateManager"""

    try:
        state = mission_integration.get_mission_state(mission_id)

        if state:
            return success_response(
                mission_id=mission_id,
                state=state
            )
        else:
            return error_response('Mission state not found', 404)

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Get mission state failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/state/<mission_id>', methods=['PUT'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def update_mission_state(mission_id):
    """Update mission state in GameStateManager"""

    try:
        data = request.get_json()
        if not data:
            return error_response('No update data provided', 400)

        mission_integration.update_mission_state(mission_id, data)

        return success_response(
            mission_id=mission_id,
            updates=data
        )

    except (TypeError, KeyError, AttributeError) as e:
        logger.error(f"❌ Update mission state failed: {e}")
        return error_response('Internal server error', 500)


@missions_bp.route('/api/missions/templates/generate', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@require_mission_integration
def generate_mission_from_template():
    """Generate a mission from a template with dynamic state"""
    try:
        data = request.get_json()
        if not data or 'template_id' not in data:
            return error_response('Template ID required', 400)

        template_id = data['template_id']
        context = data.get('context', {})

        new_mission_id = mission_integration.generate_mission_from_template(
            template_id, context
        )

        if new_mission_id:
            return success_response(
                mission_id=new_mission_id,
                template_id=template_id
            )
        else:
            return error_response('Mission generation failed', 500)

    except (TypeError, KeyError, AttributeError, RuntimeError) as e:
        logger.error(f"❌ Mission generation failed: {e}")
        return error_response('Internal server error', 500)
