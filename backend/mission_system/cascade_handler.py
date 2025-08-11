"""
Mission Cascade Handler
Handles cascade effects when missions are botched
Following spec section 4.2 - Botch Handling Variations
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class MissionCascadeHandler:
    """
    Handles cascade effects when missions are botched
    From spec: "Botching can cascade (e.g., botch one mission affects others)"
    """
    
    def __init__(self, mission_manager):
        self.mission_manager = mission_manager
        self.cascade_rules: Dict[str, List[Dict[str, Any]]] = {}
        self.shared_data: Dict[str, Any] = {}
        
        # Register default cascade rules
        self._register_default_cascade_rules()
    
    def register_cascade_rule(self, mission_id: str, rule: Dict[str, Any]):
        """Register a cascade effect rule for a mission"""
        if mission_id not in self.cascade_rules:
            self.cascade_rules[mission_id] = []
        
        self.cascade_rules[mission_id].append(rule)
        logger.debug(f"🌊 Registered cascade rule for mission {mission_id}: {rule['type']}")
    
    def handle_mission_botched(self, mission_id: str, context: Dict[str, Any]):
        """Handle cascade effects when a mission is botched"""
        rules = self.cascade_rules.get(mission_id, [])
        
        logger.info(f"🌊 Processing {len(rules)} cascade rules for botched mission {mission_id}")
        
        for rule in rules:
            effect_type = rule['type']
            effect_data = rule['data']
            
            try:
                if effect_type == 'botch_related_missions':
                    self._botch_related_missions(effect_data['mission_ids'], 
                                               effect_data.get('reason', 'Related mission failed'))
                
                elif effect_type == 'modify_faction_standing':
                    self._modify_faction_standing(effect_data['faction'], 
                                                 effect_data['change'],
                                                 effect_data.get('reason', 'Mission failure'))
                
                elif effect_type == 'update_shared_data':
                    self._update_shared_data(effect_data['key'], effect_data['value'])
                
                elif effect_type == 'unlock_alternative':
                    self._unlock_alternative_mission(effect_data['alternative_mission_id'])
                
                elif effect_type == 'lock_location':
                    self._lock_location(effect_data['location'], 
                                       effect_data.get('duration', 3600))  # 1 hour default
                
                elif effect_type == 'affect_npc_status':
                    self._affect_npc_status(effect_data['npc_id'], effect_data['status'])
                
                elif effect_type == 'trigger_event':
                    self._trigger_world_event(effect_data['event_type'], effect_data.get('event_data', {}))
                
            except Exception as e:
                logger.error(f"❌ Failed to execute cascade rule {effect_type}: {e}")
    
    def _botch_related_missions(self, mission_ids: List[str], reason: str):
        """Botch a list of related missions"""
        for related_id in mission_ids:
            related_mission = self.mission_manager.get_mission(related_id)
            if related_mission and not related_mission.is_botched:
                success = related_mission.botch()
                if success:
                    self.mission_manager.save_mission(related_mission)
                    logger.warning(f"💥 Cascade botched mission: {related_mission.title} ({reason})")
    
    def _modify_faction_standing(self, faction: str, change: float, reason: str):
        """Modify faction standing due to mission failure"""
        current_standing = self.shared_data.get('faction_standings', {})
        if faction not in current_standing:
            current_standing[faction] = 0.0
        
        current_standing[faction] += change
        current_standing[faction] = max(-100, min(100, current_standing[faction]))  # Clamp to [-100, 100]
        
        self.shared_data['faction_standings'] = current_standing
        
        standing_change = "increased" if change > 0 else "decreased"
        logger.info(f"📊 Faction standing {standing_change}: {faction} {change:+.1f} ({reason})")
    
    def _update_shared_data(self, key: str, value: Any):
        """Update shared world state data"""
        self.shared_data[key] = value
        logger.debug(f"🔄 Updated shared data: {key} = {value}")
    
    def _unlock_alternative_mission(self, alternative_mission_id: str):
        """Unlock alternative mission path"""
        alternative_mission = self.mission_manager.get_mission(alternative_mission_id)
        if alternative_mission and alternative_mission.state.value == "Unknown":
            alternative_mission.set_state("Mentioned")
            self.mission_manager.save_mission(alternative_mission)
            logger.info(f"🔓 Unlocked alternative mission: {alternative_mission.title}")
    
    def _lock_location(self, location: str, duration: int):
        """Lock a location due to mission failure"""
        import time
        unlock_time = time.time() + duration
        
        locked_locations = self.shared_data.get('locked_locations', {})
        locked_locations[location] = unlock_time
        self.shared_data['locked_locations'] = locked_locations
        
        logger.warning(f"🔒 Location locked: {location} (for {duration} seconds)")
    
    def _affect_npc_status(self, npc_id: str, status: str):
        """Affect NPC status due to mission failure"""
        npc_statuses = self.shared_data.get('npc_statuses', {})
        npc_statuses[npc_id] = status
        self.shared_data['npc_statuses'] = npc_statuses
        
        logger.info(f"👤 NPC status changed: {npc_id} → {status}")
    
    def _trigger_world_event(self, event_type: str, event_data: Dict[str, Any]):
        """Trigger a world event due to mission failure"""
        world_events = self.shared_data.get('triggered_events', [])
        world_events.append({
            'type': event_type,
            'data': event_data,
            'timestamp': logger.info(f"🌍 World event triggered: {event_type}")
        })
        self.shared_data['triggered_events'] = world_events
        
        logger.info(f"🌍 World event triggered: {event_type}")
    
    def _register_default_cascade_rules(self):
        """Register default cascade rules for common mission types"""
        
        # Federation escort mission cascade
        self.register_cascade_rule('federation_escort_001', {
            'type': 'botch_related_missions',
            'data': {
                'mission_ids': ['federation_patrol_001', 'federation_supply_run_002'],
                'reason': 'convoy_destroyed'
            }
        })
        
        self.register_cascade_rule('federation_escort_001', {
            'type': 'modify_faction_standing',
            'data': {
                'faction': 'federation',
                'change': -25,
                'reason': 'failed_convoy_escort'
            }
        })
        
        # Trader guild delivery cascade
        self.register_cascade_rule('trader_delivery_001', {
            'type': 'modify_faction_standing',
            'data': {
                'faction': 'traders_guild',
                'change': -15,
                'reason': 'failed_delivery_contract'
            }
        })
        
        self.register_cascade_rule('trader_delivery_001', {
            'type': 'unlock_alternative',
            'data': {
                'alternative_mission_id': 'salvage_recovery_001'
            }
        })
        
        # Pirate elimination cascade
        self.register_cascade_rule('pirate_elimination_001', {
            'type': 'update_shared_data',
            'data': {
                'key': 'pirate_threat_level',
                'value': 'high'
            }
        })
        
        self.register_cascade_rule('pirate_elimination_001', {
            'type': 'trigger_event',
            'data': {
                'event_type': 'increased_pirate_activity',
                'event_data': {
                    'threat_multiplier': 1.5,
                    'duration': 7200  # 2 hours
                }
            }
        })
        
        # VIP rescue mission cascade
        self.register_cascade_rule('vip_rescue_001', {
            'type': 'affect_npc_status',
            'data': {
                'npc_id': 'ambassador_chen',
                'status': 'captured'
            }
        })
        
        self.register_cascade_rule('vip_rescue_001', {
            'type': 'lock_location',
            'data': {
                'location': 'diplomatic_station',
                'duration': 10800  # 3 hours
            }
        })
        
        # Research mission cascade
        self.register_cascade_rule('research_data_001', {
            'type': 'update_shared_data',
            'data': {
                'key': 'research_progress',
                'value': 'setback'
            }
        })
        
        self.register_cascade_rule('research_data_001', {
            'type': 'modify_faction_standing',
            'data': {
                'faction': 'scientists_consortium',
                'change': -20,
                'reason': 'lost_research_data'
            }
        })
    
    def get_shared_data(self, key: str) -> Any:
        """Get shared world state data"""
        return self.shared_data.get(key)
    
    def is_location_locked(self, location: str) -> bool:
        """Check if location is currently locked"""
        import time
        locked_locations = self.shared_data.get('locked_locations', {})
        
        if location not in locked_locations:
            return False
        
        unlock_time = locked_locations[location]
        if time.time() > unlock_time:
            # Location should be unlocked now
            del locked_locations[location]
            self.shared_data['locked_locations'] = locked_locations
            return False
        
        return True
    
    def get_faction_standing(self, faction: str) -> float:
        """Get current faction standing"""
        return self.shared_data.get('faction_standings', {}).get(faction, 0.0)
    
    def get_npc_status(self, npc_id: str) -> Optional[str]:
        """Get current NPC status"""
        return self.shared_data.get('npc_statuses', {}).get(npc_id)
    
    def get_cascade_stats(self) -> Dict[str, Any]:
        """Get cascade system statistics"""
        return {
            'registered_rules': len(self.cascade_rules),
            'total_rule_count': sum(len(rules) for rules in self.cascade_rules.values()),
            'shared_data_keys': len(self.shared_data),
            'faction_standings': self.shared_data.get('faction_standings', {}),
            'locked_locations': list(self.shared_data.get('locked_locations', {}).keys()),
            'active_world_events': len(self.shared_data.get('triggered_events', []))
        }
