"""
Core Mission Classes
Implementation of Mission, MissionState, and Objective classes
Following docs/mission_spec.md specification exactly
"""

import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Any, Optional, Union
import logging

logger = logging.getLogger(__name__)


def parse_iso_datetime(date_string: str) -> datetime:
    """
    Parse ISO datetime string with proper timezone handling.
    Handles both 'Z' suffix (UTC) and standard ISO format.
    """
    if date_string.endswith('Z'):
        # Replace 'Z' with '+00:00' for proper UTC parsing
        date_string = date_string[:-1] + '+00:00'
    return datetime.fromisoformat(date_string)


class MissionState(Enum):
    """Mission state enumeration - forward progression only"""
    UNKNOWN = "Unknown"
    MENTIONED = "Mentioned"
    ACCEPTED = "Accepted"
    ACHIEVED = "Achieved"
    COMPLETED = "Completed"
    
    def __lt__(self, other):
        """Enable state comparison for forward progression validation"""
        if not isinstance(other, MissionState):
            return NotImplemented
        
        order = [
            MissionState.UNKNOWN,
            MissionState.MENTIONED,
            MissionState.ACCEPTED,
            MissionState.ACHIEVED,
            MissionState.COMPLETED
        ]
        return order.index(self) < order.index(other)


class Objective:
    """Individual mission objective"""
    
    def __init__(self, id: Union[str, int], description: str, 
                 is_optional: bool = False, is_ordered: bool = False):
        self.id = str(id)
        self.description = description
        self.is_achieved = False
        self.is_optional = is_optional
        self.is_ordered = is_ordered
        self.achieved_at = None
        
    def achieve(self):
        """Mark objective as achieved"""
        if not self.is_achieved:
            self.is_achieved = True
            self.achieved_at = datetime.now(timezone.utc)
            logger.info(f"📋 Objective achieved: {self.description}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert objective to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'description': self.description,
            'is_achieved': self.is_achieved,
            'is_optional': self.is_optional,
            'is_ordered': self.is_ordered,
            'achieved_at': self.achieved_at.isoformat() if self.achieved_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Objective':
        """Create objective from dictionary"""
        obj = cls(
            id=data['id'],
            description=data['description'],
            is_optional=data.get('is_optional', False),
            is_ordered=data.get('is_ordered', False)
        )
        obj.is_achieved = data.get('is_achieved', False)
        if data.get('achieved_at'):
            obj.achieved_at = parse_iso_datetime(data['achieved_at'])
        return obj


class Mission:
    """Core Mission class following specification exactly"""
    
    def __init__(self, mission_id: str, title: str, description: str, 
                 mission_type: str = "exploration", location: str = "unknown",
                 faction: str = "neutral", reward_package_id: int = 1):
        self.id = mission_id
        self.title = title
        self.description = description
        self.mission_type = mission_type
        self.location = location
        self.faction = faction
        self.reward_package_id = reward_package_id
        
        # Core state management (from spec)
        self.state = MissionState.UNKNOWN
        self.is_botched = False
        
        # Objectives system
        self.objectives: List[Objective] = []
        
        # Metadata
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
        
        # Custom fields for extensibility (spec section 4.3)
        self.custom_fields: Dict[str, Any] = {}
        
        # Trigger data for event system
        self.triggers: Dict[str, Any] = {}
        
    def set_state(self, new_state: Union[str, MissionState], objective_id: Optional[str] = None) -> bool:
        """
        Advance mission state (forward progression only)
        From spec: set_state(new_state, optional_objective_id)
        """
        if isinstance(new_state, str):
            try:
                new_state = MissionState(new_state)
            except ValueError:
                logger.error(f"❌ Invalid mission state: {new_state}")
                return False
        
        # Validation: can't change completed missions
        if self.state == MissionState.COMPLETED:
            logger.warning(f"⚠️ Cannot change state of completed mission: {self.id}")
            return False
            
        # Validation: can't change botched missions (unless unbotching first)
        if self.is_botched and new_state != self.state:
            logger.warning(f"⚠️ Cannot change state of botched mission: {self.id}")
            return False
        
        # Validation: forward progression only
        if new_state < self.state:
            logger.warning(f"⚠️ Cannot regress mission state from {self.state.value} to {new_state.value}")
            return False
        
        # Special handling for ACHIEVED state with objectives
        if new_state == MissionState.ACHIEVED and objective_id:
            if not self.can_achieve_objective(objective_id):
                logger.warning(f"⚠️ Cannot achieve objective {objective_id} for mission {self.id}")
                return False
            
            # Achieve the objective
            for obj in self.objectives:
                if obj.id == objective_id:
                    obj.achieve()
                    break
        
        # Update state
        old_state = self.state
        self.state = new_state
        self.updated_at = datetime.now(timezone.utc)
        
        logger.info(f"📋 Mission {self.id} state: {old_state.value} → {new_state.value}")
        
        # Auto-check for completion
        if new_state == MissionState.ACHIEVED:
            if self.check_completion():
                self.state = MissionState.COMPLETED
                logger.info(f"🎉 Mission {self.id} auto-completed!")
        
        return True
    
    def get_state(self) -> str:
        """
        Get current state string
        From spec: Returns "Botched" if isBotched is true and state != "Unknown"/"Completed"
        """
        if self.is_botched and self.state not in [MissionState.UNKNOWN, MissionState.COMPLETED]:
            return "Botched"
        return self.state.value
    
    def botch(self) -> bool:
        """
        Mark mission as botched (failure state)
        From spec: botch() - Sets isBotched to true if state != "Completed"
        """
        if self.state == MissionState.COMPLETED:
            logger.warning(f"⚠️ Cannot botch completed mission: {self.id}")
            return False
        
        self.is_botched = True
        self.updated_at = datetime.now(timezone.utc)
        logger.warning(f"💥 Mission {self.id} botched!")
        return True
    
    def unbotch(self) -> bool:
        """
        Remove botched flag (for redemption arcs)
        From spec: unbotch() - Sets isBotched to false
        """
        if self.is_botched:
            self.is_botched = False
            self.updated_at = datetime.now(timezone.utc)
            logger.info(f"🔄 Mission {self.id} unbotched (redemption arc)")
            return True
        return False
    
    def can_achieve_objective(self, objective_id: str) -> bool:
        """
        Check if objective can be achieved (ordered objectives validation)
        """
        target_obj = None
        for obj in self.objectives:
            if obj.id == objective_id:
                target_obj = obj
                break
        
        if not target_obj:
            return False
            
        if target_obj.is_achieved:
            return False  # Already achieved
        
        # Check ordered objectives - must complete previous ordered objectives first
        if target_obj.is_ordered:
            for obj in self.objectives:
                if (obj.is_ordered and 
                    int(obj.id) < int(target_obj.id) and 
                    not obj.is_achieved):
                    logger.warning(f"⚠️ Cannot achieve {objective_id} - prerequisite {obj.id} not completed")
                    return False
        
        return True
    
    def is_objective_achieved(self, objective_id: str) -> bool:
        """
        Check if specific objective is achieved
        From spec: is_objective_achieved(objective_id)
        """
        for obj in self.objectives:
            if obj.id == objective_id:
                return obj.is_achieved
        return False
    
    def check_completion(self) -> bool:
        """
        Check if mission can be auto-advanced to completed
        From spec: check_completion() - Auto-advance if all non-optional objectives achieved
        """
        if not self.objectives:
            return True  # No objectives means completion depends on state only
        
        required_objectives = [obj for obj in self.objectives if not obj.is_optional]
        if not required_objectives:
            return True  # Only optional objectives
        
        return all(obj.is_achieved for obj in required_objectives)
    
    def add_objective(self, objective: Objective):
        """Add objective to mission"""
        self.objectives.append(objective)
        self.updated_at = datetime.now(timezone.utc)
        logger.debug(f"📋 Added objective to mission {self.id}: {objective.description}")
    
    def get_progress(self) -> Dict[str, Any]:
        """Get mission progress summary"""
        total_objectives = len(self.objectives)
        achieved_objectives = len([obj for obj in self.objectives if obj.is_achieved])
        required_objectives = len([obj for obj in self.objectives if not obj.is_optional])
        achieved_required = len([obj for obj in self.objectives 
                                if obj.is_achieved and not obj.is_optional])
        
        return {
            'state': self.get_state(),
            'is_botched': self.is_botched,
            'total_objectives': total_objectives,
            'achieved_objectives': achieved_objectives,
            'required_objectives': required_objectives,
            'achieved_required': achieved_required,
            'completion_percentage': (achieved_required / required_objectives * 100) if required_objectives > 0 else 100
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert mission to dictionary for JSON serialization
        From spec: Mission JSON structure
        """
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'mission_type': self.mission_type,
            'location': self.location,
            'faction': self.faction,
            'reward_package_id': self.reward_package_id,
            'state': self.state.value,
            'is_botched': self.is_botched,
            'objectives': [obj.to_dict() for obj in self.objectives],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'custom_fields': self.custom_fields,
            'triggers': self.triggers,
            'progress': self.get_progress()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Mission':
        """Create mission from dictionary (loading from JSON)"""
        mission = cls(
            mission_id=data['id'],
            title=data['title'],
            description=data['description'],
            mission_type=data.get('mission_type', 'exploration'),
            location=data.get('location', 'unknown'),
            faction=data.get('faction', 'neutral'),
            reward_package_id=data.get('reward_package_id', 1)
        )
        
        # Restore state
        mission.state = MissionState(data.get('state', 'Unknown'))
        mission.is_botched = data.get('is_botched', False)
        
        # Restore objectives
        mission.objectives = [
            Objective.from_dict(obj_data) 
            for obj_data in data.get('objectives', [])
        ]
        
        # Restore metadata
        if data.get('created_at'):
            mission.created_at = parse_iso_datetime(data['created_at'])
        if data.get('updated_at'):
            mission.updated_at = parse_iso_datetime(data['updated_at'])
        
        # Restore custom fields and triggers
        mission.custom_fields = data.get('custom_fields', {})
        mission.triggers = data.get('triggers', {})
        
        return mission
    
    def save_to_file(self, directory: str) -> str:
        """Save mission to JSON file (one mission per file as per spec)"""
        import os
        os.makedirs(directory, exist_ok=True)
        
        filepath = os.path.join(directory, f"{self.id}.json")
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
        
        logger.debug(f"💾 Mission {self.id} saved to {filepath}")
        return filepath
    
    @classmethod
    def load_from_file(cls, filepath: str) -> 'Mission':
        """Load mission from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        mission = cls.from_dict(data)
        logger.debug(f"📂 Mission {mission.id} loaded from {filepath}")
        return mission
