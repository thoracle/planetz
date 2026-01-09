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
from backend.validation import (
    ValidationError, handle_validation_errors,
    validate_mission_id, validate_string, validate_int, validate_dict,
    validate_enum, TEMPLATE_ID_PATTERN
)

logger = logging.getLogger(__name__)

# Create blueprint for mission routes
missions_bp = Blueprint('missions', __name__)

# Rate limit configurations
RATE_LIMIT_STANDARD = "30 per minute"  # Standard API calls
RATE_LIMIT_ADMIN = "5 per minute"  # Admin endpoints

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
def get_available_missions():
    """
    Get available missions for player at current location
    Query parameters:
    - location: Current location (optional)
    - faction_standings: JSON object of faction standings (optional)
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        location = request.args.get('location')
        faction_standings_str = request.args.get('faction_standings')
        
        faction_standings = None
        if faction_standings_str:
            import json
            faction_standings = json.loads(faction_standings_str)
        
        available_missions = mission_manager.get_available_missions(
            location=location,
            faction_standing=faction_standings
        )
        
        # Convert missions to dict format for JSON response
        missions_data = [mission.to_dict() for mission in available_missions]
        
        return jsonify({
            'missions': missions_data,
            'count': len(missions_data),
            'location': location
        })
        
    except Exception as e:
        logger.error(f"❌ Get available missions failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/active', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
def get_active_missions():
    """
    Get active/accepted missions for the player
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        # Get player context from request if needed
        player_context = {}
        
        active_missions = mission_manager.get_active_missions(player_context)
        
        # Convert missions to dict format for JSON response
        missions_data = [mission.to_dict() for mission in active_missions]
        
        return jsonify({
            'missions': missions_data,
            'count': len(missions_data)
        })
        
    except Exception as e:
        logger.error(f"❌ Get active missions failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/active/clear', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def clear_active_missions():
    """
    Clear all active missions (useful for new game sessions)
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        # Get player context from request if needed
        player_context = {}
        
        cleared_count = mission_manager.clear_active_missions(player_context)
        
        return jsonify({
            'success': True,
            'cleared_count': cleared_count,
            'message': f'Cleared {cleared_count} active missions'
        })
        
    except Exception as e:
        logger.error(f"❌ Clear active missions failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
@handle_validation_errors
def get_mission_details(mission_id: str):
    """
    Get detailed information about a specific mission
    From spec: GET /get_mission_state/{mission_id}
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500

    try:
        # Validate mission_id format
        validated_id = validate_mission_id(mission_id)

        mission = mission_manager.get_mission(validated_id)
        if not mission:
            return jsonify({'error': f'Mission not found: {validated_id}'}), 404

        return jsonify({
            'mission': mission.to_dict(),
            'state': mission.get_state(),
            'progress': mission.get_progress()
        })

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"❌ Get mission details failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/accept_legacy', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def accept_mission_legacy(mission_id: str):
    """
    Accept a mission (change state to ACCEPTED) - Legacy endpoint
    From spec: POST /set_mission_state/{mission_id} with new_state: 'Accepted'
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
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
            
            return jsonify({
                'success': True,
                'mission': mission.to_dict(),
                'hooks': hooks,  # Frontend effect hooks
                'message': f'Mission accepted: {mission.title}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to accept mission'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Accept mission failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/progress', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def update_mission_progress(mission_id: str):
    """
    Update mission progress (achieve objectives or advance state)
    From spec: POST /set_mission_state/{mission_id} with objective_id
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        objective_id = data.get('objective_id')
        event_data = data.get('event_data', {})
        
        success = mission_manager.update_mission_progress(
            mission_id=mission_id,
            objective_id=objective_id,
            event_data=event_data
        )
        
        if success:
            mission = mission_manager.get_mission(mission_id)
            
            # Fire appropriate triggers
            if objective_id:
                hooks = mission_manager.trigger_system.fire_trigger(
                    'objective_completed', mission, {
                        'objective_id': objective_id,
                        'event_data': event_data
                    }
                )
            else:
                hooks = []
            
            # Check if mission was completed
            if mission.state == MissionState.COMPLETED:
                completion_hooks = mission_manager.trigger_system.fire_trigger(
                    'mission_completed', mission, event_data
                )
                hooks.extend(completion_hooks)
            
            return jsonify({
                'success': True,
                'mission': mission.to_dict(),
                'progress': mission.get_progress(),
                'hooks': hooks,
                'objective_achieved': objective_id if objective_id else None
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update mission progress'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Update mission progress failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/botch', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def botch_mission(mission_id: str):
    """
    Botch a mission (mark as failed)
    From spec: POST /botch_mission/{mission_id}
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
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
            
            return jsonify({
                'success': True,
                'mission': mission.to_dict(),
                'hooks': hooks,
                'reason': reason
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to botch mission'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Botch mission failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/unbotch', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def unbotch_mission(mission_id: str):
    """
    Remove botched flag from mission (redemption arc)
    From spec: POST /unbotch_mission/{mission_id}
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        mission = mission_manager.get_mission(mission_id)
        if not mission:
            return jsonify({'error': f'Mission not found: {mission_id}'}), 404
        
        success = mission.unbotch()
        
        if success:
            mission_manager.save_mission(mission)
            
            return jsonify({
                'success': True,
                'mission': mission.to_dict(),
                'message': 'Mission unbotched - redemption arc available'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Mission was not botched or cannot be unbotched'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Unbotch mission failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/abandon', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def abandon_mission(mission_id: str):
    """Allow player to abandon accepted mission"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        player_context = data.get('player_context', {})
        
        success = mission_manager.abandon_mission(mission_id, player_context)
        
        if success:
            mission = mission_manager.get_mission(mission_id)
            
            return jsonify({
                'success': True,
                'mission': mission.to_dict(),
                'message': f'Mission abandoned: {mission.title}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to abandon mission'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ Abandon mission failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/generate', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
@handle_validation_errors
def generate_mission():
    """
    Generate a procedural mission from template
    From spec: Dynamic generation capability
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500

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
            return jsonify({
                'error': f"Unknown template_id '{template_id}'",
                'available_templates': available
            }), 400

        mission = mission_manager.generate_procedural_mission(
            template_id=template_id,
            player_data=player_data,
            location=location
        )

        if mission:
            return jsonify({
                'success': True,
                'mission': mission.to_dict(),
                'message': f'Generated mission: {mission.title}'
            })
        else:
            available = sorted(list(mission_manager.templates.keys()))
            return jsonify({
                'success': False,
                'error': f"Failed to generate mission from template '{template_id}'",
                'available_templates': available
            }), 400

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"❌ Generate mission failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/templates', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
def get_mission_templates():
    """Get available mission templates"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        templates = list(mission_manager.templates.keys())
        
        return jsonify({
            'templates': templates,
            'count': len(templates)
        })
        
    except Exception as e:
        logger.error(f"❌ Get mission templates failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/stats', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
def get_mission_stats():
    """Get mission system statistics"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        stats = mission_manager.get_stats()
        
        # Add storage performance stats
        storage_stats = mission_manager.storage_manager.get_performance_stats()
        
        # Add cascade system stats
        cascade_stats = mission_manager.cascade_handler.get_cascade_stats()
        
        return jsonify({
            'mission_stats': stats,
            'storage_stats': storage_stats,
            'cascade_stats': cascade_stats
        })
        
    except Exception as e:
        logger.error(f"❌ Get mission stats failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# Game Event Endpoints (for mission progress integration)

@missions_bp.route('/api/missions/events/enemy_destroyed', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def handle_enemy_destroyed():
    """Handle enemy destroyed events for mission progress"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        enemy_type = data.get('enemy_type')
        enemy_id = data.get('enemy_id')
        location = data.get('location')
        player_context = data.get('player_context', {})
        
        # Check all active missions for elimination objectives
        updated_missions = []
        
        for mission in mission_manager.missions.values():
            if (mission.state == MissionState.ACCEPTED and 
                mission.mission_type == 'elimination'):
                
                # Check if this enemy type matches mission requirements
                target_enemy = mission.custom_fields.get('target_enemy_type')
                if enemy_type == target_enemy:
                    success = mission_manager.update_mission_progress(
                        mission.id,
                        event_data={
                            'type': 'enemy_destroyed',
                            'enemy_type': enemy_type,
                            'enemy_id': enemy_id,
                            'location': location
                        }
                    )
                    
                if success:
                    # Get the latest state of the mission after update
                    updated_mission_obj = mission_manager.get_mission(mission.id)
                    updated_missions.append(updated_mission_obj.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle enemy destroyed failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/events/location_reached', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def handle_location_reached():
    """Handle location reached events for mission progress"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        location = data.get('location')
        coordinates = data.get('coordinates', {})
        player_context = data.get('player_context', {})
        
        # Check all active missions for exploration objectives
        updated_missions = []
        
        for mission in mission_manager.missions.values():
            if (mission.state == MissionState.ACCEPTED and 
                mission.mission_type in ['exploration', 'reconnaissance']):
                
                # Check if this location matches mission requirements
                target_location = mission.custom_fields.get('target_location')
                if location == target_location:
                    success = mission_manager.update_mission_progress(
                        mission.id,
                        event_data={
                            'type': 'location_reached',
                            'location': location,
                            'coordinates': coordinates
                        }
                    )
                    
                    if success:
                        # Get the latest state of the mission after update
                        updated_mission_obj = mission_manager.get_mission(mission.id)
                        updated_missions.append(updated_mission_obj.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle location reached failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/events/cargo_delivered', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def handle_cargo_delivered():
    """Handle cargo delivery events for mission progress"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        cargo_type = data.get('cargo_type')
        delivery_location = data.get('delivery_location')
        cargo_value = data.get('cargo_value', 0)
        quantity = data.get('quantity', 0)
        integrity = data.get('integrity', 1.0)
        source = data.get('source', 'unknown')
        player_context = data.get('player_context', {})
        
        # Check all active missions for delivery objectives
        updated_missions = []
        
        for mission in mission_manager.missions.values():
            if (mission.state in [MissionState.ACCEPTED, MissionState.ACHIEVED] and 
                mission.mission_type == 'delivery'):
                
                # Check if cargo and location match mission requirements
                target_cargo = mission.custom_fields.get('cargo_type')
                target_location = mission.custom_fields.get('destination')  # Use 'destination' not 'delivery_location'
                
                logger.info(f"🚛 Checking mission {mission.id}: cargo={target_cargo}, destination={target_location}")
                logger.info(f"🚛 Event: cargo={cargo_type}, delivery_location={delivery_location}, source={source}")
                logger.info(f"🚛 Mission delivery_type: {mission.custom_fields.get('delivery_type', 'auto_delivery')}")
                
                if cargo_type == target_cargo and delivery_location == target_location:
                    success = mission_manager.update_mission_progress(
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
                    
                    if success:
                        # Get the latest state of the mission after update
                        updated_mission_obj = mission_manager.get_mission(mission.id)
                        updated_missions.append(updated_mission_obj.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle cargo delivered failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/events/cargo_loaded', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def handle_cargo_loaded():
    """Handle cargo loaded events for mission progress"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        cargo_type = data.get('cargo_type')
        quantity = data.get('quantity', 0)
        location = data.get('location')
        player_context = data.get('player_context', {})
        
        logger.info(f"🚛 Cargo loaded event: cargo={cargo_type}, quantity={quantity}, location={location}")
        
        # Check all active missions for loading objectives
        updated_missions = []
        
        for mission in mission_manager.missions.values():
            if (mission.state == MissionState.ACCEPTED and 
                mission.mission_type == 'delivery'):
                
                logger.info(f"🚛 Checking delivery mission {mission.id}: {mission.title}")
                target_cargo = mission.custom_fields.get('cargo_type')
                logger.info(f"🚛 Mission expects cargo: {target_cargo}, event has: {cargo_type}")
                
                success = mission_manager.update_mission_progress(
                    mission.id,
                    event_data={
                        'type': 'cargo_loaded',
                        'cargo_type': cargo_type,
                        'quantity': quantity,
                        'location': location
                    }
                )
                
                if success:
                    # Get the latest state of the mission after update
                    updated_mission_obj = mission_manager.get_mission(mission.id)
                    updated_missions.append(updated_mission_obj.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle cargo loaded failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# Admin/Debug Endpoints

@missions_bp.route('/api/missions/admin/cleanup', methods=['POST'])
@limiter.limit(RATE_LIMIT_ADMIN)
@require_admin_key
@handle_validation_errors
def cleanup_old_missions():
    """Cleanup old completed missions (admin endpoint, requires authentication)"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500

    try:
        data = request.get_json() or {}

        # Validate days_old (must be positive, max 365 days)
        days_old = validate_int(data.get('days_old', 30), 'days_old', min_val=1, max_val=365, required=False) or 30

        archived_count = mission_manager.cleanup_old_missions(days_old)

        return jsonify({
            'success': True,
            'archived_count': archived_count,
            'message': f'Archived {archived_count} missions older than {days_old} days'
        })

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"❌ Cleanup old missions failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/admin/migrate_storage', methods=['POST'])
@limiter.limit(RATE_LIMIT_ADMIN)
@require_admin_key
def migrate_storage():
    """Migrate mission storage to database (admin endpoint, requires authentication)"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        success = mission_manager.storage_manager.migrate_to_database()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Storage migration completed successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Storage migration failed'
            }), 500
        
    except Exception as e:
        logger.error(f"❌ Storage migration failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# Phase 4: Mission System Integration with GameStateManager
# ==========================================================

@missions_bp.route('/api/missions/discovery/update', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def update_mission_discovery():
    """Update mission discovery based on current game state"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        newly_discovered = mission_integration.update_mission_discovery()

        return jsonify({
            'success': True,
            'newly_discovered': newly_discovered,
            'total_discovered': len(mission_integration.get_discovered_missions())
        })

    except Exception as e:
        logger.error(f"❌ Mission discovery update failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/discovery/status', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
def get_mission_discovery_status():
    """Get current mission discovery status"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        stats = mission_integration.get_mission_statistics()

        return jsonify({
            'success': True,
            'discovered_missions': mission_integration.get_discovered_missions(),
            'available_missions': mission_integration.get_available_missions(),
            'active_missions': mission_integration.get_active_missions(),
            'completed_missions': mission_integration.get_completed_missions(),
            'statistics': stats
        })

    except Exception as e:
        logger.error(f"❌ Mission discovery status failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/discover', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def discover_mission(mission_id):
    """Mark a mission as discovered"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        data = request.get_json() or {}
        discovery_method = data.get('discovery_method', 'manual')

        mission_integration.mark_mission_discovered(mission_id, discovery_method)

        return jsonify({
            'success': True,
            'mission_id': mission_id,
            'discovery_method': discovery_method
        })

    except Exception as e:
        logger.error(f"❌ Mission discovery failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/make_available', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def make_mission_available(mission_id):
    """Make a mission available for acceptance"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        mission_integration.make_mission_available(mission_id)

        return jsonify({
            'success': True,
            'mission_id': mission_id
        })

    except Exception as e:
        logger.error(f"❌ Make mission available failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/accept', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def accept_mission(mission_id):
    """Accept a mission"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        success = mission_integration.accept_mission(mission_id)

        if success:
            return jsonify({
                'success': True,
                'mission_id': mission_id,
                'message': 'Mission accepted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Mission not available for acceptance'
            }), 400

    except Exception as e:
        logger.error(f"❌ Mission acceptance failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/<mission_id>/complete', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def complete_mission(mission_id):
    """Complete a mission"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        data = request.get_json() or {}
        success = data.get('success', True)

        completion_success = mission_integration.complete_mission(mission_id, success)

        if completion_success:
            return jsonify({
                'success': True,
                'mission_id': mission_id,
                'mission_success': success,
                'message': f'Mission {"completed successfully" if success else "failed"}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Mission could not be completed'
            }), 400

    except Exception as e:
        logger.error(f"❌ Mission completion failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/state/<mission_id>', methods=['GET'])
@limiter.limit(RATE_LIMIT_STANDARD)
def get_mission_state(mission_id):
    """Get the current state of a mission from GameStateManager"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        state = mission_integration.get_mission_state(mission_id)

        if state:
            return jsonify({
                'success': True,
                'mission_id': mission_id,
                'state': state
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Mission state not found'
            }), 404

    except Exception as e:
        logger.error(f"❌ Get mission state failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/state/<mission_id>', methods=['PUT'])
@limiter.limit(RATE_LIMIT_STANDARD)
def update_mission_state(mission_id):
    """Update mission state in GameStateManager"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No update data provided'}), 400

        mission_integration.update_mission_state(mission_id, data)

        return jsonify({
            'success': True,
            'mission_id': mission_id,
            'updates': data
        })

    except Exception as e:
        logger.error(f"❌ Update mission state failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@missions_bp.route('/api/missions/templates/generate', methods=['POST'])
@limiter.limit(RATE_LIMIT_STANDARD)
def generate_mission_from_template():
    """Generate a mission from a template with dynamic state"""
    if not mission_integration:
        return jsonify({'error': 'Mission integration not initialized'}), 500

    try:
        data = request.get_json()
        if not data or 'template_id' not in data:
            return jsonify({'error': 'Template ID required'}), 400

        template_id = data['template_id']
        context = data.get('context', {})

        new_mission_id = mission_integration.generate_mission_from_template(
            template_id, context
        )

        if new_mission_id:
            return jsonify({
                'success': True,
                'mission_id': new_mission_id,
                'template_id': template_id
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Mission generation failed'
            }), 500

    except Exception as e:
        logger.error(f"❌ Mission generation failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500
