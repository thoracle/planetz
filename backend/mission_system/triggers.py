"""
Mission Trigger System
Event-driven mission updates with frontend hooks
Following spec section 4.3 - Events/Callbacks
"""

import logging
from typing import Dict, List, Any, Callable, Optional

logger = logging.getLogger(__name__)


class MissionTriggerSystem:
    """
    Mission event trigger system for game integration
    Handles mission state changes, objective completion, and frontend notifications
    """
    
    def __init__(self):
        self.triggers: Dict[str, List[Callable]] = {}
        self._register_default_triggers()
    
    def register_trigger(self, event_type: str, callback: Callable):
        """
        Register a callback for a specific mission event
        From spec: Events/Callbacks system for frontend integration
        """
        if event_type not in self.triggers:
            self.triggers[event_type] = []
        
        self.triggers[event_type].append(callback)
        logger.debug(f"🔗 Registered trigger for event: {event_type}")
    
    def fire_trigger(self, event_type: str, mission_data: Any, 
                    context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Fire all callbacks for an event type
        Returns list of hook data for API responses
        """
        callbacks = self.triggers.get(event_type, [])
        response_hooks = []
        
        for callback in callbacks:
            try:
                hook_data = callback(mission_data, context)
                if hook_data:
                    response_hooks.append(hook_data)
            except (TypeError, KeyError, AttributeError, ValueError) as e:
                logger.error(f"❌ Trigger callback failed for {event_type}: {e}")
        
        if response_hooks:
            logger.debug(f"🔥 Fired {len(callbacks)} triggers for {event_type}")
        
        return response_hooks
    
    def _register_default_triggers(self):
        """Register default triggers for common events"""
        
        # Mission state change triggers
        self.register_trigger('mission_accepted', self._on_mission_accepted)
        self.register_trigger('mission_completed', self._on_mission_completed)
        self.register_trigger('mission_botched', self._on_mission_botched)
        
        # Objective triggers
        self.register_trigger('objective_completed', self._on_objective_completed)
        
        # Game event triggers
        self.register_trigger('enemy_destroyed', self._on_enemy_destroyed)
        self.register_trigger('location_reached', self._on_location_reached)
        self.register_trigger('cargo_delivered', self._on_cargo_delivered)
    
    def _on_mission_accepted(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger when mission is accepted"""
        mission = mission_data
        
        # Check if mission requires spawning enemies
        if 'enemy_spawn' in mission.custom_fields:
            return {
                'type': 'spawn_enemies',
                'data': {
                    'mission_id': mission.id,
                    'enemy_types': mission.custom_fields['enemy_spawn'],
                    'location': mission.location,
                    'spawn_count': mission.custom_fields.get('enemy_count', 3)
                }
            }
        
        # Audio feedback for mission acceptance
        return {
            'type': 'play_audio',
            'data': {
                'sound': 'mission_accepted.wav',
                'volume': 0.7
            }
        }
    
    def _on_mission_completed(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger when mission is completed"""
        mission = mission_data
        
        return {
            'type': 'mission_complete_effects',
            'data': {
                'mission_id': mission.id,
                'title': mission.title,
                'reward_package_id': mission.reward_package_id,
                'experience_bonus': mission.custom_fields.get('experience_bonus', 100),
                'effects': [
                    {
                        'type': 'play_audio',
                        'sound': 'mission_complete.wav',
                        'volume': 0.8
                    },
                    {
                        'type': 'show_notification',
                        'message': f"Mission Completed: {mission.title}",
                        'duration': 5000
                    },
                    {
                        'type': 'award_rewards',
                        'reward_package_id': mission.reward_package_id
                    }
                ]
            }
        }
    
    def _on_mission_botched(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger when mission is botched"""
        mission = mission_data
        reason = context.get('reason', 'Unknown')
        
        return {
            'type': 'mission_failed_effects',
            'data': {
                'mission_id': mission.id,
                'title': mission.title,
                'reason': reason,
                'effects': [
                    {
                        'type': 'play_audio',
                        'sound': 'mission_failed.wav',
                        'volume': 0.6
                    },
                    {
                        'type': 'show_notification',
                        'message': f"Mission Failed: {mission.title}",
                        'duration': 3000,
                        'style': 'error'
                    }
                ]
            }
        }
    
    def _on_objective_completed(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger when objective is completed"""
        mission = mission_data
        objective_id = context.get('objective_id')
        
        # Find the completed objective
        completed_objective = None
        for obj in mission.objectives:
            if obj.id == objective_id:
                completed_objective = obj
                break
        
        if not completed_objective:
            return None
        
        return {
            'type': 'objective_complete_effects',
            'data': {
                'mission_id': mission.id,
                'objective_id': objective_id,
                'objective_description': completed_objective.description,
                'effects': [
                    {
                        'type': 'play_audio',
                        'sound': 'objective_complete.wav',
                        'volume': 0.7
                    },
                    {
                        'type': 'show_notification',
                        'message': f"Objective Complete: {completed_objective.description}",
                        'duration': 3000,
                        'style': 'success'
                    },
                    {
                        'type': 'update_mission_ui',
                        'mission_id': mission.id
                    }
                ]
            }
        }
    
    def _on_enemy_destroyed(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle enemy destruction events for mission progress"""
        # This would be called from game when enemy is destroyed
        # Returns hook data for mission progress updates
        
        enemy_type = context.get('enemy_type')
        enemy_id = context.get('enemy_id')
        location = context.get('location')
        
        return {
            'type': 'check_elimination_missions',
            'data': {
                'enemy_type': enemy_type,
                'enemy_id': enemy_id,
                'location': location,
                'event': 'enemy_destroyed'
            }
        }
    
    def _on_location_reached(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle location reached events for mission progress"""
        location = context.get('location')
        coordinates = context.get('coordinates', {})
        
        return {
            'type': 'check_exploration_missions',
            'data': {
                'location': location,
                'coordinates': coordinates,
                'event': 'location_reached'
            }
        }
    
    def _on_cargo_delivered(self, mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cargo delivery events for mission progress"""
        cargo_type = context.get('cargo_type')
        delivery_location = context.get('delivery_location')
        cargo_value = context.get('cargo_value', 0)
        
        return {
            'type': 'check_delivery_missions',
            'data': {
                'cargo_type': cargo_type,
                'delivery_location': delivery_location,
                'cargo_value': cargo_value,
                'event': 'cargo_delivered'
            }
        }


# Predefined trigger functions for common mission events
def on_mission_accepted(mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
    """Default mission acceptance trigger"""
    mission = mission_data
    return {
        'type': 'spawn_enemies',
        'data': {
            'mission_id': mission.id,
            'enemy_types': mission.custom_fields.get('enemy_spawn', []),
            'location': mission.location
        }
    }


def on_objective_complete(mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
    """Default objective completion trigger"""
    return {
        'type': 'play_audio',
        'data': {
            'sound': 'objective_complete.wav',
            'volume': 0.7
        }
    }


def on_enemy_elimination(mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
    """Trigger for enemy elimination missions"""
    enemy_type = context.get('enemy_type')
    
    return {
        'type': 'elimination_progress',
        'data': {
            'mission_id': mission_data.id,
            'enemy_type': enemy_type,
            'progress_update': True
        }
    }


def on_exploration_complete(mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
    """Trigger for exploration mission completion"""
    location = context.get('location')
    
    return {
        'type': 'exploration_complete',
        'data': {
            'mission_id': mission_data.id,
            'location': location,
            'effects': [
                {
                    'type': 'unlock_location',
                    'location': location
                },
                {
                    'type': 'grant_exploration_bonus',
                    'bonus_credits': 500
                }
            ]
        }
    }


def on_trading_mission_complete(mission_data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
    """Trigger for trading mission completion"""
    cargo_value = context.get('cargo_value', 0)
    trade_bonus = cargo_value * 0.1  # 10% bonus
    
    return {
        'type': 'trading_complete',
        'data': {
            'mission_id': mission_data.id,
            'trade_bonus': trade_bonus,
            'reputation_gain': mission_data.custom_fields.get('reputation_gain', 10)
        }
    }
