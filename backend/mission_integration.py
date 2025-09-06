"""
Mission System Integration with GameStateManager
===============================================

This module provides integration between the existing mission system
and the new GameStateManager from Phase 3. It bridges the gap between
the legacy mission system and the unified data architecture.

Key Features:
- Mission state synchronization with GameStateManager
- Discovery integration for mission availability
- Mission completion logic with state updates
- Template-based mission generation with dynamic state
"""

import json
import logging
from typing import Dict, List, Optional, Any, Set
from datetime import datetime

from backend.game_state import GameStateManager
from backend.id_generator import ObjectIDGenerator
from backend.mission_system import MissionManager, Mission, MissionState, Objective
from backend.game_time import get_game_time

logger = logging.getLogger(__name__)


class MissionIntegration:
    """
    Integration layer between Mission System and GameStateManager.

    Provides:
    - Mission state synchronization
    - Discovery-based mission availability
    - Mission completion logic
    - Template-based mission generation
    """

    def __init__(self, game_state_manager: GameStateManager,
                 mission_manager: MissionManager):
        """
        Initialize mission integration.

        Args:
            game_state_manager: The GameStateManager instance
            mission_manager: The existing MissionManager instance
        """
        self.game_state = game_state_manager
        self.mission_manager = mission_manager

        # Mission discovery tracking
        self.discovered_missions: Set[str] = set()
        self.available_missions: Set[str] = set()

        # Load existing mission state
        self._load_mission_state()

    def _load_mission_state(self) -> None:
        """Load mission state from GameStateManager."""
        # Load discovered missions
        for mission_id, state in self.game_state.mission_states.items():
            if state.get('discovered', False):
                self.discovered_missions.add(mission_id)

        # Load available missions (missions that can be accepted)
        for mission_id, state in self.game_state.mission_states.items():
            if state.get('available', False):
                self.available_missions.add(mission_id)

        logger.info(f"📋 Loaded mission state: {len(self.discovered_missions)} discovered, "
                   f"{len(self.available_missions)} available")

    def get_mission_state(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current state of a mission from GameStateManager.

        Args:
            mission_id: Mission ID

        Returns:
            Mission state dictionary or None
        """
        return self.game_state.get_mission_state(mission_id)

    def update_mission_state(self, mission_id: str, updates: Dict[str, Any]) -> None:
        """
        Update mission state in GameStateManager.

        Args:
            mission_id: Mission ID
            updates: State updates to apply
        """
        self.game_state.update_mission_state(mission_id, updates)

        # Update local tracking
        if updates.get('discovered', False):
            self.discovered_missions.add(mission_id)
        if updates.get('available', False):
            self.available_missions.add(mission_id)

        logger.info(f"📝 Updated mission state: {mission_id}")

    def mark_mission_discovered(self, mission_id: str,
                               discovery_method: str = 'proximity') -> None:
        """
        Mark a mission as discovered by the player.

        Args:
            mission_id: Mission ID
            discovery_method: How the mission was discovered
        """
        if mission_id not in self.discovered_missions:
            self.update_mission_state(mission_id, {
                'discovered': True,
                'discovery_method': discovery_method,
                'discovered_at': get_game_time()
            })
            logger.info(f"🗺️ Mission discovered: {mission_id}")

    def make_mission_available(self, mission_id: str) -> None:
        """
        Make a mission available for acceptance.

        Args:
            mission_id: Mission ID
        """
        if mission_id not in self.available_missions:
            self.update_mission_state(mission_id, {
                'available': True,
                'available_at': get_game_time()
            })
            self.available_missions.add(mission_id)
            logger.info(f"🎯 Mission available: {mission_id}")

    def accept_mission(self, mission_id: str) -> bool:
        """
        Accept a mission and update its state.

        Args:
            mission_id: Mission ID

        Returns:
            True if mission was accepted successfully
        """
        if mission_id not in self.available_missions:
            logger.warning(f"❌ Cannot accept mission {mission_id}: not available")
            return False

        self.update_mission_state(mission_id, {
            'accepted': True,
            'status': 'active',
            'accepted_at': get_game_time()
        })

        # Remove from available missions list
        if mission_id in self.available_missions:
            self.available_missions.remove(mission_id)

        logger.info(f"✅ Mission accepted: {mission_id}")
        return True

    def complete_mission(self, mission_id: str, success: bool = True) -> bool:
        """
        Complete a mission and handle rewards/consequences.

        Args:
            mission_id: Mission ID
            success: Whether the mission was completed successfully

        Returns:
            True if mission was completed successfully
        """
        mission_state = self.get_mission_state(mission_id)
        if not mission_state or not mission_state.get('accepted', False):
            logger.warning(f"❌ Cannot complete mission {mission_id}: not accepted")
            return False

        completion_data = {
            'completed': True,
            'success': success,
            'completed_at': get_game_time(),
            'status': 'completed' if success else 'failed'
        }

        self.update_mission_state(mission_id, completion_data)

        # Handle mission rewards/consequences
        self._process_mission_completion(mission_id, success)

        logger.info(f"🏆 Mission {'completed' if success else 'failed'}: {mission_id}")
        return True

    def _process_mission_completion(self, mission_id: str, success: bool) -> None:
        """
        Process mission completion rewards and consequences.

        Args:
            mission_id: Mission ID
            success: Whether mission was successful
        """
        # Get mission details from the mission manager
        mission = self.mission_manager.get_mission(mission_id)
        if not mission:
            return

        # Process rewards/consequences based on mission template
        if success and hasattr(mission, 'rewards'):
            self._apply_mission_rewards(mission_id, mission.rewards)
        elif not success and hasattr(mission, 'consequences'):
            self._apply_mission_consequences(mission_id, mission.consequences)

    def _apply_mission_rewards(self, mission_id: str, rewards: Dict[str, Any]) -> None:
        """
        Apply mission completion rewards.

        Args:
            mission_id: Mission ID
            rewards: Reward data
        """
        # This would integrate with the game's reward system
        # For now, just log the rewards
        logger.info(f"🎁 Mission rewards for {mission_id}: {rewards}")

    def _apply_mission_consequences(self, mission_id: str, consequences: Dict[str, Any]) -> None:
        """
        Apply mission failure consequences.

        Args:
            mission_id: Mission ID
            consequences: Consequence data
        """
        # This would integrate with the game's consequence system
        logger.info(f"⚠️ Mission consequences for {mission_id}: {consequences}")

    def get_discovered_missions(self) -> List[str]:
        """
        Get list of discovered mission IDs.

        Returns:
            List of discovered mission IDs
        """
        return list(self.discovered_missions)

    def get_available_missions(self) -> List[str]:
        """
        Get list of available mission IDs.

        Returns:
            List of available mission IDs
        """
        return list(self.available_missions)

    def get_active_missions(self) -> List[str]:
        """
        Get list of active (accepted but not completed) mission IDs.

        Returns:
            List of active mission IDs
        """
        active = []
        for mission_id, state in self.game_state.mission_states.items():
            if (state.get('accepted', False) and
                not state.get('completed', False)):
                active.append(mission_id)
        return active

    def get_completed_missions(self) -> List[str]:
        """
        Get list of completed mission IDs.

        Returns:
            List of completed mission IDs
        """
        completed = []
        for mission_id, state in self.game_state.mission_states.items():
            if state.get('completed', False):
                completed.append(mission_id)
        return completed

    def check_mission_discovery_requirements(self, mission_id: str) -> bool:
        """
        Check if a mission's discovery requirements are met.

        Args:
            mission_id: Mission ID

        Returns:
            True if requirements are met
        """
        mission = self.mission_manager.get_mission(mission_id)
        if not mission:
            return False

        # Check discovery requirements (this would be more complex in practice)
        # For now, just check if required objects are discovered
        if hasattr(mission, 'discovery_requirements'):
            for req in mission.discovery_requirements:
                if req.get('type') == 'object_discovered':
                    object_id = req.get('object_id')
                    if object_id and not self.game_state.is_discovered(object_id):
                        return False

        return True

    def update_mission_discovery(self) -> List[str]:
        """
        Update mission discovery based on current game state.

        Returns:
            List of newly discovered mission IDs
        """
        newly_discovered = []

        # Check all missions for discovery requirements
        for mission_id in self.mission_manager.missions.keys():
            if (mission_id not in self.discovered_missions and
                self.check_mission_discovery_requirements(mission_id)):

                self.mark_mission_discovered(mission_id)
                newly_discovered.append(mission_id)

        return newly_discovered

    def generate_mission_from_template(self, template_id: str,
                                     context: Dict[str, Any] = None) -> Optional[str]:
        """
        Generate a mission from a template with dynamic state.

        Args:
            template_id: Template ID
            context: Generation context data

        Returns:
            New mission ID if successful, None otherwise
        """
        # This would integrate with the existing mission template system
        # For now, just log the request
        logger.info(f"🎯 Generate mission from template: {template_id}")
        return None

    def get_mission_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about mission integration.

        Returns:
            Mission statistics
        """
        return {
            'discovered_missions': len(self.discovered_missions),
            'available_missions': len(self.available_missions),
            'active_missions': len(self.get_active_missions()),
            'completed_missions': len(self.get_completed_missions()),
            'total_missions': len(self.mission_manager.missions)
        }
