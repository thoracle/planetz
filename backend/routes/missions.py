"""
Mission System API Routes
Flask API endpoints for mission management
Following docs/mission_spec.md section 3.3 API specifications
"""

import logging
from flask import Blueprint, jsonify, request, current_app
from typing import Dict, List, Any, Optional

from backend.mission_system import MissionManager, Mission, MissionState, Objective

logger = logging.getLogger(__name__)

# Create blueprint for mission routes
missions_bp = Blueprint('missions', __name__)

# Global mission manager instance (will be initialized in app factory)
mission_manager: Optional[MissionManager] = None


def init_mission_system(app, config: Dict[str, Any] = None):
    """Initialize mission system with Flask app"""
    global mission_manager
    
    # Get mission configuration from app config
    mission_config = config or {
        'data_directory': app.config.get('MISSION_DATA_DIR', 'missions'),
        'expected_mission_count': app.config.get('EXPECTED_MISSION_COUNT', 25),
        'sqlite_path': app.config.get('MISSION_SQLITE_PATH', 'missions.db')
    }
    
    mission_manager = MissionManager(
        data_directory=mission_config['data_directory'],
        config=mission_config
    )
    
    logger.info(f"🎯 Mission system initialized with {len(mission_manager.missions)} missions")


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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/active', methods=['GET'])
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/<mission_id>', methods=['GET'])
def get_mission_details(mission_id: str):
    """
    Get detailed information about a specific mission
    From spec: GET /get_mission_state/{mission_id}
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        mission = mission_manager.get_mission(mission_id)
        if not mission:
            return jsonify({'error': f'Mission not found: {mission_id}'}), 404
        
        return jsonify({
            'mission': mission.to_dict(),
            'state': mission.get_state(),
            'progress': mission.get_progress()
        })
        
    except Exception as e:
        logger.error(f"❌ Get mission details failed: {e}")
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/<mission_id>/accept', methods=['POST'])
def accept_mission(mission_id: str):
    """
    Accept a mission (change state to ACCEPTED)
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/<mission_id>/progress', methods=['POST'])
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/<mission_id>/botch', methods=['POST'])
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/<mission_id>/unbotch', methods=['POST'])
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/<mission_id>/abandon', methods=['POST'])
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/generate', methods=['POST'])
def generate_mission():
    """
    Generate a procedural mission from template
    From spec: Dynamic generation capability
    """
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        template_id = data.get('template_id')
        player_data = data.get('player_data', {})
        location = data.get('location', 'unknown')
        
        if not template_id:
            return jsonify({'error': 'template_id is required'}), 400

        # Safety: validate template exists before attempting generation
        if mission_manager and template_id not in mission_manager.templates:
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
        
    except Exception as e:
        logger.error(f"❌ Generate mission failed: {e}")
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/templates', methods=['GET'])
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
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/stats', methods=['GET'])
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
        return jsonify({'error': str(e)}), 500


# Game Event Endpoints (for mission progress integration)

@missions_bp.route('/api/missions/events/enemy_destroyed', methods=['POST'])
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
                        updated_missions.append(mission.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle enemy destroyed failed: {e}")
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/events/location_reached', methods=['POST'])
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
                        updated_missions.append(mission.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle location reached failed: {e}")
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/events/cargo_delivered', methods=['POST'])
def handle_cargo_delivered():
    """Handle cargo delivery events for mission progress"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        cargo_type = data.get('cargo_type')
        delivery_location = data.get('delivery_location')
        cargo_value = data.get('cargo_value', 0)
        player_context = data.get('player_context', {})
        
        # Check all active missions for delivery objectives
        updated_missions = []
        
        for mission in mission_manager.missions.values():
            if (mission.state == MissionState.ACCEPTED and 
                mission.mission_type == 'delivery'):
                
                # Check if cargo and location match mission requirements
                target_cargo = mission.custom_fields.get('cargo_type')
                target_location = mission.custom_fields.get('delivery_location')
                
                if cargo_type == target_cargo and delivery_location == target_location:
                    success = mission_manager.update_mission_progress(
                        mission.id,
                        event_data={
                            'type': 'cargo_delivered',
                            'cargo_type': cargo_type,
                            'delivery_location': delivery_location,
                            'cargo_value': cargo_value
                        }
                    )
                    
                    if success:
                        updated_missions.append(mission.to_dict())
        
        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
        
    except Exception as e:
        logger.error(f"❌ Handle cargo delivered failed: {e}")
        return jsonify({'error': str(e)}), 500


# Admin/Debug Endpoints

@missions_bp.route('/api/missions/admin/cleanup', methods=['POST'])
def cleanup_old_missions():
    """Cleanup old completed missions (admin endpoint)"""
    if not mission_manager:
        return jsonify({'error': 'Mission system not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        days_old = data.get('days_old', 30)
        
        archived_count = mission_manager.cleanup_old_missions(days_old)
        
        return jsonify({
            'success': True,
            'archived_count': archived_count,
            'message': f'Archived {archived_count} missions older than {days_old} days'
        })
        
    except Exception as e:
        logger.error(f"❌ Cleanup old missions failed: {e}")
        return jsonify({'error': str(e)}), 500


@missions_bp.route('/api/missions/admin/migrate_storage', methods=['POST'])
def migrate_storage():
    """Migrate mission storage to database (admin endpoint)"""
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
        return jsonify({'error': str(e)}), 500
