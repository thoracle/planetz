"""
Mission System Package
Comprehensive mission/quest system for PlanetZ space shooter game.
Based on docs/mission_spec.md and docs/mission_system_implementation_plan_updated.md
"""

from .mission import Mission, MissionState, Objective
from .mission_manager import MissionManager
from .triggers import MissionTriggerSystem
from .cascade_handler import MissionCascadeHandler
from .storage_manager import MissionStorageManager

__all__ = [
    'Mission',
    'MissionState', 
    'Objective',
    'MissionManager',
    'MissionTriggerSystem',
    'MissionCascadeHandler',
    'MissionStorageManager'
]

__version__ = '1.0.0'
