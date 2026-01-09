"""
Mission Manager - Central mission management system
Handles mission loading, saving, state management, and API operations
Following docs/mission_spec.md section 3.3 exactly
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from .mission import Mission, MissionState, Objective
from .triggers import MissionTriggerSystem
from .cascade_handler import MissionCascadeHandler
from .storage_manager import MissionStorageManager

logger = logging.getLogger(__name__)


class MissionManager:
    """
    Central mission manager following spec section 3.3
    Responsibilities:
    - Maintains collection of missions keyed by ID
    - Loads from JSON files on startup or on-demand
    - Supports dynamic generation via templates
    - Saves/loads mission data for persistence
    - Exposes API operations for frontend
    """
    
    def __init__(self, data_directory: str = "missions", 
                 config: Optional[Dict[str, Any]] = None):
        self.data_directory = data_directory
        self.config = config or {}
        
        # Mission collection (keyed by mission ID)
        self.missions: Dict[str, Mission] = {}
        
        # Initialize subsystems
        self.trigger_system = MissionTriggerSystem()
        self.cascade_handler = MissionCascadeHandler(self)
        self.storage_manager = MissionStorageManager(self.config)
        
        # Mission templates for generation (will be loaded)
        self.templates: Dict[str, Any] = {}
        
        # Performance tracking
        self.stats = {
            'missions_loaded': 0,
            'missions_generated': 0,
            'state_changes': 0,
            'objectives_completed': 0,
            'missions_botched': 0
        }
        
        # Ensure directory structure exists
        self._create_directory_structure()
        
        # Load existing missions
        self.load_missions()
        
        logger.info(f"🎯 MissionManager initialized with {len(self.missions)} missions")
    
    def _create_directory_structure(self):
        """Create mission directory structure as per spec"""
        directories = [
            self.data_directory,
            os.path.join(self.data_directory, 'active'),
            os.path.join(self.data_directory, 'templates'),
            os.path.join(self.data_directory, 'completed'),
            os.path.join(self.data_directory, 'archived')
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            logger.debug(f"📁 Created directory: {directory}")
    
    def load_missions(self) -> int:
        """
        Load missions from JSON files
        From spec: "Loads from JSON files on startup or on-demand"
        """
        loaded_count = 0
        
        # Load active missions
        active_dir = os.path.join(self.data_directory, 'active')
        if os.path.exists(active_dir):
            for filename in os.listdir(active_dir):
                if filename.endswith('.json'):
                    try:
                        filepath = os.path.join(active_dir, filename)
                        mission = Mission.load_from_file(filepath)
                        self.missions[mission.id] = mission
                        loaded_count += 1
                    except (IOError, OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
                        logger.error(f"❌ Failed to load mission from {filename}: {e}")
        
        # Load templates
        self._load_templates()
        
        self.stats['missions_loaded'] = loaded_count
        logger.info(f"📂 Loaded {loaded_count} missions from storage")
        return loaded_count
    
    def _load_templates(self):
        """Load mission templates for generation"""
        templates_dir = os.path.join(self.data_directory, 'templates')
        if os.path.exists(templates_dir):
            for filename in os.listdir(templates_dir):
                if filename.endswith('_template.json'):
                    try:
                        filepath = os.path.join(templates_dir, filename)
                        with open(filepath, 'r') as f:
                            template_data = json.load(f)

                        template_id = filename.replace('_template.json', '')
                        self.templates[template_id] = template_data
                        logger.debug(f"📋 Loaded template: {template_id}")
                    except (IOError, OSError, json.JSONDecodeError) as e:
                        logger.error(f"❌ Failed to load template {filename}: {e}")
    
    def save_mission(self, mission: Mission) -> bool:
        """
        Save mission to appropriate directory based on state
        From spec: "Saves mission data to JSON files for persistence"
        """
        try:
            # Determine target directory based on mission state
            if mission.state == MissionState.COMPLETED:
                target_dir = os.path.join(self.data_directory, 'completed')
            else:
                target_dir = os.path.join(self.data_directory, 'active')
            
            # Save mission
            mission.save_to_file(target_dir)
            
            # Update in memory collection
            self.missions[mission.id] = mission
            
            logger.debug(f"💾 Mission {mission.id} saved successfully")
            return True

        except (IOError, OSError, TypeError) as e:
            logger.error(f"❌ Failed to save mission {mission.id}: {e}")
            return False
    
    def get_mission(self, mission_id: str) -> Optional[Mission]:
        """Get mission by ID"""
        return self.missions.get(mission_id)
    
    def get_available_missions(self, location: str = None, 
                             faction_standing: Dict[str, float] = None) -> List[Mission]:
        """
        Get missions available to player at current location/faction standing
        From spec: "getAvailableMissions(location, factionStanding)"
        """
        available = []
        
        for mission in self.missions.values():
            # Skip completed, botched, or already accepted missions
            if (mission.state in [MissionState.COMPLETED, MissionState.ACCEPTED] or 
                mission.is_botched):
                continue
            
            # Location filter
            if location and mission.location not in [location, 'any', 'unknown']:
                continue
            
            # Faction standing filter (basic implementation)
            if faction_standing and mission.faction in faction_standing:
                required_standing = mission.custom_fields.get('required_faction_standing', 0)
                if faction_standing[mission.faction] < required_standing:
                    continue
            
            available.append(mission)
        
        logger.debug(f"🎯 Found {len(available)} available missions at {location}")
        return available
    
    def get_active_missions(self, player_context: Dict[str, Any] = None) -> List[Mission]:
        """
        Get missions that are currently active/accepted by the player
        """
        active = []
        
        for mission in self.missions.values():
            # Include both accepted and achieved missions that aren't botched
            if mission.state in [MissionState.ACCEPTED, MissionState.ACHIEVED] and not mission.is_botched:
                active.append(mission)
        
        logger.debug(f"🎯 Found {len(active)} active missions")
        return active
    
    def clear_active_missions(self, player_context: Dict[str, Any] = None) -> int:
        """
        Clear all active missions (useful for new game sessions)
        Marks active missions as completed to clear them from active list
        Returns the number of missions cleared
        """
        cleared_count = 0
        
        for mission in self.missions.values():
            if mission.state == MissionState.ACCEPTED and not mission.is_botched:
                # Mark as completed to remove from active missions
                # Since mission states can only progress forward, we complete them
                mission.set_state(MissionState.COMPLETED)
                # Save the updated mission
                self.save_mission(mission)
                cleared_count += 1
        
        logger.info(f"🎯 Cleared {cleared_count} active missions by marking them completed")
        return cleared_count
    
    def accept_mission(self, mission_id: str, player_context: Dict[str, Any] = None) -> bool:
        """
        Accept a mission (change state to ACCEPTED)
        From spec: API endpoint for mission acceptance
        """
        mission = self.get_mission(mission_id)
        if not mission:
            logger.error(f"❌ Mission not found: {mission_id}")
            return False
        
        if mission.state != MissionState.MENTIONED:
            logger.warning(f"⚠️ Mission {mission_id} cannot be accepted (state: {mission.state.value})")
            return False
        
        # Accept mission
        success = mission.set_state(MissionState.ACCEPTED)
        if success:
            # Fire triggers for mission acceptance
            hooks = self.trigger_system.fire_trigger('mission_accepted', mission, player_context)
            
            # Save mission
            self.save_mission(mission)
            
            self.stats['state_changes'] += 1
            logger.info(f"✅ Mission accepted: {mission.title}")
            
            return True
        
        return False
    
    def update_mission_progress(self, mission_id: str, objective_id: str = None, 
                              event_data: Dict[str, Any] = None) -> bool:
        """
        Update mission progress (achieve objectives or advance state)
        From spec: API endpoint for progress updates
        """
        mission = self.get_mission(mission_id)
        if not mission:
            logger.error(f"❌ Mission not found: {mission_id}")
            return False
        
        # If specific objective provided, try to achieve it
        if objective_id:
            if mission.can_achieve_objective(objective_id):
                old_state = mission.state
                success = mission.set_state(MissionState.ACHIEVED, objective_id)
                
                if success:
                    # Fire triggers for objective completion
                    hooks = self.trigger_system.fire_trigger('objective_completed', mission, {
                        'objective_id': objective_id,
                        'event_data': event_data
                    })
                    
                    # Save mission
                    self.save_mission(mission)
                    
                    self.stats['objectives_completed'] += 1
                    if mission.state == MissionState.COMPLETED and old_state != MissionState.COMPLETED:
                        logger.info(f"🎉 Mission completed: {mission.title}")
                    
                    return True
        
        # General progress update based on event data
        elif event_data:
            # This would contain game-specific logic for updating missions
            # based on events like enemy_destroyed, location_reached, etc.
            return self._process_game_event(mission, event_data)
        
        return False
    
    def _process_game_event(self, mission: Mission, event_data: Dict[str, Any]) -> bool:
        """Process game events for mission progress"""
        event_type = event_data.get('type')
        
        # Example mission progress logic
        if event_type == 'enemy_destroyed':
            return self._handle_enemy_destroyed(mission, event_data)
        elif event_type == 'location_reached':
            return self._handle_location_reached(mission, event_data)
        elif event_type == 'cargo_delivered':
            return self._handle_cargo_delivered(mission, event_data)
        elif event_type == 'cargo_loaded':
            return self._handle_cargo_loaded(mission, event_data)
        
        return False
    
    def _handle_enemy_destroyed(self, mission: Mission, event_data: Dict[str, Any]) -> bool:
        """Handle enemy destruction for elimination missions"""
        if mission.mission_type != 'elimination':
            return False
        
        enemy_type = event_data.get('enemy_type')
        target_enemy = mission.custom_fields.get('target_enemy_type')
        
        if enemy_type == target_enemy:
            # Track kill count in mission custom fields
            kill_count = mission.custom_fields.get('kills_made', 0) + 1
            mission.custom_fields['kills_made'] = kill_count
            
            required_kills = mission.custom_fields.get('enemy_count', 1)
            
            logger.info(f"🎯 Mission {mission.id}: Kill progress {kill_count}/{required_kills}")
            
            # Find elimination objective and update progress
            for obj in mission.objectives:
                if 'eliminate' in obj.description.lower() and not obj.is_achieved:
                    # Update objective progress
                    obj.progress = min(kill_count / required_kills, 1.0)
                    
                    # Check if objective is complete
                    if kill_count >= required_kills:
                        success = mission.set_state(MissionState.ACHIEVED, obj.id)
                        if success:
                            logger.info(f"🎉 Elimination objective completed: {kill_count}/{required_kills} enemies defeated")
                        return success
                    else:
                        # Save progress update
                        self.save_mission(mission)
                        return True
        
        return False
    
    def _handle_location_reached(self, mission: Mission, event_data: Dict[str, Any]) -> bool:
        """Handle location reached for exploration missions"""
        if mission.mission_type not in ['exploration', 'reconnaissance']:
            return False
        
        location = event_data.get('location')
        target_location = mission.custom_fields.get('target_location')
        
        if location == target_location:
            # Find exploration objective
            for obj in mission.objectives:
                if 'explore' in obj.description.lower() and not obj.is_achieved:
                    return mission.set_state(MissionState.ACHIEVED, obj.id)
        
        return False
    
    def _handle_cargo_delivered(self, mission: Mission, event_data: Dict[str, Any]) -> bool:
        """Handle cargo delivery for delivery missions"""
        if mission.mission_type != 'delivery':
            return False
        
        # Check delivery type - only process if it matches the mission's delivery method
        delivery_type = mission.custom_fields.get('delivery_type', 'auto_delivery')
        event_source = event_data.get('source', 'unknown')
        
        # Skip if delivery type doesn't match event source
        if delivery_type == 'auto_delivery' and event_source != 'docking':
            return False
        if delivery_type == 'market_sale' and event_source != 'market':
            return False
        
        cargo_type = event_data.get('cargo_type')
        delivery_location = event_data.get('delivery_location') or event_data.get('location')
        delivered_quantity = event_data.get('quantity', 0)
        cargo_integrity = event_data.get('integrity', 1.0)
        
        # DEBUG: Check if quantity is being passed correctly
        if delivered_quantity == 0:
            logger.warning(f"🚛 No quantity in cargo delivery event data: {event_data}")
            # For delivery completion, assume full cargo amount if no quantity specified
            delivered_quantity = event_data.get('cargo_amount', 50)
        
        logger.info(f"🚛 _handle_cargo_delivered: cargo={cargo_type}, location={delivery_location}, quantity={delivered_quantity}, delivery_type={delivery_type}, source={event_source}")
        
        target_cargo = mission.custom_fields.get('cargo_type')
        target_location = mission.custom_fields.get('destination')  # Changed from delivery_location
        required_quantity = mission.custom_fields.get('cargo_amount', 1)
        min_integrity = mission.custom_fields.get('min_integrity', 90) / 100.0
        
        logger.info(f"🚛 Mission {mission.id} requirements: cargo={target_cargo}, destination={target_location}, quantity={required_quantity}")
        
        # Check if this is the right cargo and destination
        if cargo_type == target_cargo and delivery_location == target_location:
            # Track delivery progress
            delivered_so_far = mission.custom_fields.get('cargo_delivered', 0) + delivered_quantity
            mission.custom_fields['cargo_delivered'] = delivered_so_far
            
            logger.info(f"🚛 Mission {mission.id}: Cargo delivery progress {delivered_so_far}/{required_quantity}")
            
            # Check integrity requirement for bonus objective
            if cargo_integrity >= min_integrity:
                mission.custom_fields['integrity_maintained'] = True
                logger.info(f"🚛 Mission {mission.id}: Cargo integrity maintained ({cargo_integrity:.1%})")
            else:
                mission.custom_fields['integrity_maintained'] = False
                logger.info(f"🚛 Mission {mission.id}: Cargo integrity compromised ({cargo_integrity:.1%})")
            
            # Find delivery objective and update progress
            logger.info(f"🚛 Looking for delivery objective in {len(mission.objectives)} objectives")
            for i, obj in enumerate(mission.objectives):
                logger.info(f"🚛 Objective {i+1}: '{obj.description}' (achieved: {obj.is_achieved})")
                if 'deliver' in obj.description.lower() and not obj.is_achieved:
                    logger.info(f"🚛 Found delivery objective: '{obj.description}'")
                    # Update objective progress
                    obj.progress = min(delivered_so_far / required_quantity, 1.0)
                    
                    # Check if delivery is complete
                    if delivered_so_far >= required_quantity:
                        logger.info(f"🚛 Delivery complete: {delivered_so_far} >= {required_quantity}, marking objective {obj.id} as achieved")
                        
                        # Achieve the objective without changing mission state
                        obj.achieve()
                        mission.updated_at = datetime.now(timezone.utc)
                        
                        # Save mission with achieved objective
                        self.save_mission(mission)
                        
                        logger.info(f"🎉 Delivery objective completed: {delivered_so_far}/{required_quantity} units delivered")
                        
                        # Check if mission should advance to ACHIEVED (all objectives done)
                        if mission.check_completion():
                            if mission.state == MissionState.ACCEPTED:
                                mission.set_state(MissionState.ACHIEVED)
                                logger.info(f"🎯 Mission {mission.id} achieved (all objectives completed)!")
                                
                                # Auto-advance to completed for now (can add special processing later)
                                mission.set_state(MissionState.COMPLETED)
                                logger.info(f"🎉 Mission {mission.id} auto-completed!")
                        
                        return True
                    else:
                        # Save progress update
                        logger.info(f"🚛 Partial delivery: {delivered_so_far}/{required_quantity}, saving progress")
                        self.save_mission(mission)
                        return True
            
            logger.warning(f"🚛 No matching delivery objective found for mission {mission.id}")
        
        return False
    
    def _handle_cargo_loaded(self, mission: Mission, event_data: Dict[str, Any]) -> bool:
        """Handle cargo loading for delivery missions"""
        if mission.mission_type != 'delivery':
            return False
        
        cargo_type = event_data.get('cargo_type')
        loading_location = event_data.get('location')
        loaded_quantity = event_data.get('quantity', 0)
        
        target_cargo = mission.custom_fields.get('cargo_type')
        pickup_location = mission.custom_fields.get('pickup_location')
        required_quantity = mission.custom_fields.get('cargo_amount', 1)
        
        # Check if this is the right cargo and pickup location
        if cargo_type == target_cargo and (not pickup_location or loading_location == pickup_location):
            # Track loading progress
            loaded_so_far = mission.custom_fields.get('cargo_loaded', 0) + loaded_quantity
            mission.custom_fields['cargo_loaded'] = loaded_so_far
            
            logger.info(f"🚛 Mission {mission.id}: Cargo loading progress {loaded_so_far}/{required_quantity}")
            
            # Find loading objective and update progress
            for obj in mission.objectives:
                if 'load' in obj.description.lower() and not obj.is_achieved:
                    # Update objective progress
                    obj.progress = min(loaded_so_far / required_quantity, 1.0)
                    
                    # Check if loading is complete
                    if loaded_so_far >= required_quantity:
                        # Achieve the objective without changing mission state
                        obj.achieve()
                        mission.updated_at = datetime.now(timezone.utc)
                        
                        # Save mission with achieved objective
                        self.save_mission(mission)
                        
                        logger.info(f"🎉 Loading objective completed: {loaded_so_far}/{required_quantity} units loaded")
                        
                        # Check if mission should advance to ACHIEVED (all objectives done)
                        if mission.check_completion():
                            if mission.state == MissionState.ACCEPTED:
                                mission.set_state(MissionState.ACHIEVED)
                                logger.info(f"🎯 Mission {mission.id} achieved (all objectives completed)!")
                                
                                # Auto-advance to completed for now (can add special processing later)
                                mission.set_state(MissionState.COMPLETED)
                                logger.info(f"🎉 Mission {mission.id} auto-completed!")
                        
                        return True
                    else:
                        # Save progress update
                        self.save_mission(mission)
                        return True
        
        return False
    
    def botch_mission(self, mission_id: str, reason: str = None, 
                     context: Dict[str, Any] = None) -> bool:
        """
        Botch a mission (mark as failed)
        From spec: API endpoint for mission botching
        """
        mission = self.get_mission(mission_id)
        if not mission:
            logger.error(f"❌ Mission not found: {mission_id}")
            return False
        
        success = mission.botch()
        if success:
            # Handle cascade effects
            self.cascade_handler.handle_mission_botched(mission_id, context or {})
            
            # Fire triggers for mission botched
            hooks = self.trigger_system.fire_trigger('mission_botched', mission, {
                'reason': reason,
                'context': context
            })
            
            # Save mission
            self.save_mission(mission)
            
            self.stats['missions_botched'] += 1
            logger.warning(f"💥 Mission botched: {mission.title} (Reason: {reason})")
            
            return True
        
        return False
    
    def abandon_mission(self, mission_id: str, player_context: Dict[str, Any] = None) -> bool:
        """Allow player to abandon accepted mission"""
        mission = self.get_mission(mission_id)
        if not mission:
            return False
        
        if mission.state != MissionState.ACCEPTED:
            return False
        
        # Set back to mentioned state (or remove entirely)
        success = mission.set_state(MissionState.MENTIONED)
        if success:
            self.save_mission(mission)
            logger.info(f"🚪 Mission abandoned: {mission.title}")
            return True
        
        return False
    
    def generate_procedural_mission(self, template_id: str, player_data: Dict[str, Any], 
                                  location: str) -> Optional[Mission]:
        """
        Generate procedural mission from template
        From spec: "dynamic generation via procedural algorithms"
        """
        template = self.templates.get(template_id)
        if not template:
            logger.error(f"❌ Mission template not found: {template_id}")
            return None
        
        try:
            # Generate unique mission ID
            mission_id = f"{template_id}_{int(datetime.now().timestamp())}"
            
            # Apply template with procedural generation
            mission_data = self._apply_template(template, player_data, location)
            
            # Create mission
            mission = Mission(
                mission_id=mission_id,
                title=mission_data['title'],
                description=mission_data['description'],
                mission_type=mission_data['mission_type'],
                location=location,
                faction=mission_data.get('faction', 'neutral'),
                reward_package_id=mission_data.get('reward_package_id', 1),
                client=mission_data.get('client', 'Mission Control')
            )
            
            # Add objectives
            for obj_data in mission_data.get('objectives', []):
                objective = Objective(
                    id=obj_data['id'],
                    description=obj_data['description'],
                    is_optional=obj_data.get('is_optional', False),
                    is_ordered=obj_data.get('is_ordered', False)
                )
                mission.add_objective(objective)
            
            # Set custom fields
            mission.custom_fields = mission_data.get('custom_fields', {})
            mission.triggers = mission_data.get('triggers', {})
            
            # Set to mentioned state (player can choose to accept)
            mission.set_state(MissionState.MENTIONED)
            
            # Save mission
            self.save_mission(mission)
            
            self.stats['missions_generated'] += 1
            logger.info(f"🎲 Generated procedural mission: {mission.title}")
            
            return mission

        except (TypeError, KeyError, ValueError) as e:
            logger.error(f"❌ Failed to generate mission from template {template_id}: {e}")
            return None
    
    def _apply_template(self, template: Dict[str, Any], player_data: Dict[str, Any], 
                       location: str) -> Dict[str, Any]:
        """Apply template with procedural generation logic"""
        import random
        
        # Basic template application (can be enhanced with more sophisticated logic)
        mission_data = template.copy()
        
        # Apply location-specific variations
        if 'location_variants' in template:
            location_variant = template['location_variants'].get(location, {})
            mission_data.update(location_variant)
        
        # Apply player-level scaling
        player_level = player_data.get('level', 1)
        if 'level_scaling' in template:
            scaling = template['level_scaling']
            
            # Scale reward package
            base_reward = mission_data.get('reward_package_id', 1)
            mission_data['reward_package_id'] = base_reward + (player_level // 5)
            
            # Scale enemy difficulty in custom fields
            if 'enemy_types' in mission_data.get('custom_fields', {}):
                enemy_types = mission_data['custom_fields']['enemy_types']
                # Add higher-tier enemies for higher level players
                if player_level > 10:
                    enemy_types.extend(['enemy_gunship', 'enemy_destroyer'])
        
        # Apply randomization
        if 'random_elements' in template:
            for element_key, options in template['random_elements'].items():
                if element_key in mission_data:
                    mission_data[element_key] = random.choice(options)
        
        # Process template placeholders in objectives and descriptions
        mission_data = self._process_template_placeholders(mission_data)
        
        # Add client/issuer information
        mission_data = self._add_mission_client(mission_data, location)
        
        return mission_data
    
    def _process_template_placeholders(self, mission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Replace template placeholders like {enemy_count} with actual values from custom_fields"""
        custom_fields = mission_data.get('custom_fields', {})
        
        # Process mission title
        if 'title' in mission_data:
            mission_data['title'] = self._replace_placeholders(mission_data['title'], custom_fields)
        
        # Process mission description
        if 'description' in mission_data:
            mission_data['description'] = self._replace_placeholders(mission_data['description'], custom_fields)
        
        # Process objectives
        if 'objectives' in mission_data:
            for objective in mission_data['objectives']:
                if 'description' in objective:
                    objective['description'] = self._replace_placeholders(objective['description'], custom_fields)
        
        return mission_data
    
    def _replace_placeholders(self, text: str, custom_fields: Dict[str, Any]) -> str:
        """Replace placeholders in text with values from custom_fields"""
        if not text or not custom_fields:
            return text
        
        result = text
        for key, value in custom_fields.items():
            placeholder = f"{{{key}}}"
            if placeholder in result:
                result = result.replace(placeholder, str(value))
        
        return result
    
    def _add_mission_client(self, mission_data: Dict[str, Any], location: str) -> Dict[str, Any]:
        """Add client/issuer information based on faction and location"""
        faction = mission_data.get('faction', 'neutral')
        mission_type = mission_data.get('mission_type', 'exploration')
        
        # Station-based clients
        station_clients = {
            'terra_prime': 'Terra Prime Command',
            'europa_station': 'Europa Research Division',
            'ceres_outpost': 'Ceres Trade Authority',
            'mars_base': 'Mars Defense Force',
            'luna_port': 'Luna Commerce Guild',
            'asteroid_mining_platform': 'Mining Operations Center'
        }
        
        # Faction-based clients as fallback
        faction_clients = {
            'terran_republic_alliance': 'Republic Fleet Command',
            'scientists_consortium': 'Research Consortium',
            'traders_guild': 'Traders Guild Representative',
            'miners_union': 'Miners Union Local',
            'free_trader_consortium': 'Independent Contractor'
        }
        
        # Mission type specific clients
        type_clients = {
            'elimination': 'Security Chief',
            'escort': 'Transport Coordinator',
            'delivery': 'Logistics Officer',
            'exploration': 'Survey Director'
        }
        
        # Priority: Station > Faction > Mission Type > Default
        client = (station_clients.get(location) or 
                 faction_clients.get(faction) or 
                 type_clients.get(mission_type) or 
                 'Mission Control')
        
        mission_data['client'] = client
        mission_data['issuer'] = client  # Also add issuer for compatibility
        
        return mission_data
    
    def get_stats(self) -> Dict[str, Any]:
        """Get mission system statistics"""
        active_missions = len([m for m in self.missions.values() 
                              if m.state == MissionState.ACCEPTED])
        completed_missions = len([m for m in self.missions.values() 
                                 if m.state == MissionState.COMPLETED])
        botched_missions = len([m for m in self.missions.values() if m.is_botched])
        
        return {
            'total_missions': len(self.missions),
            'active_missions': active_missions,
            'completed_missions': completed_missions,
            'botched_missions': botched_missions,
            'templates_loaded': len(self.templates),
            **self.stats
        }
    
    def cleanup_old_missions(self, days_old: int = 30):
        """Archive old completed missions"""
        from datetime import timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        archived_count = 0
        
        for mission_id, mission in list(self.missions.items()):
            if (mission.state == MissionState.COMPLETED and 
                mission.updated_at < cutoff_date):
                
                # Move to archived directory
                archived_dir = os.path.join(self.data_directory, 'archived')
                mission.save_to_file(archived_dir)
                
                # Remove from active collection
                del self.missions[mission_id]
                
                # Remove from active directory
                active_file = os.path.join(self.data_directory, 'active', f"{mission_id}.json")
                if os.path.exists(active_file):
                    os.remove(active_file)
                
                archived_count += 1
        
        logger.info(f"🗄️ Archived {archived_count} old completed missions")
        return archived_count
