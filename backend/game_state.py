"""
Game State Manager
==================

This module provides a lightweight game state management system for the
unified data architecture. It handles dynamic game state that changes
during gameplay, including object states, discovery, and diplomacy.

Key Features:
- Dynamic object state management
- Discovery state integration
- Diplomacy matrix handling
- Persistent state storage
- Event-driven state updates
"""

import json
import os
from typing import Dict, List, Optional, Any, Set
from backend.id_generator import ObjectIDGenerator
from backend.diplomacy_manager import DiplomacyManager
from backend.game_time import get_game_time


class GameStateManager:
    """
    Lightweight game state manager for dynamic game data.

    Manages runtime state that changes during gameplay, including:
    - Object states (damage, faction changes, destruction)
    - Player discovery state
    - Diplomacy relationships
    - Mission state
    - Temporary game effects
    """

    def __init__(self, universe_seed: int, player_id: str = "player"):
        """
        Initialize the game state manager.

        Args:
            universe_seed (int): Universe seed for consistent state
            player_id (str): Player identifier
        """
        self.universe_seed = universe_seed
        self.player_id = player_id

        # Core state storage
        self.object_states: Dict[str, Dict[str, Any]] = {}  # Dynamic object states
        self.player_discoveries: Set[str] = set()  # Discovered object IDs
        self.diplomacy_manager = DiplomacyManager()  # Faction relationships

        # Runtime state
        self.mission_states: Dict[str, Dict[str, Any]] = {}  # Active mission states
        self.temporary_effects: Dict[str, Dict[str, Any]] = {}  # Temporary effects

        # Persistence
        self.state_file = f"game_state_{player_id}.json"
        self.auto_save_enabled = True
        self.last_save_time = get_game_time()

        # Load existing state
        self.load_state()

    def get_object_current_state(self, object_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current dynamic state of an object.

        Args:
            object_id (str): Object ID to query

        Returns:
            dict or None: Current object state, or None if no dynamic state
        """
        return self.object_states.get(object_id)

    def update_object_state(self, object_id: str, updates: Dict[str, Any]) -> None:
        """
        Update the dynamic state of an object.

        Args:
            object_id (str): Object ID to update
            updates (dict): State updates to apply
        """
        if object_id not in self.object_states:
            self.object_states[object_id] = {}

        # Add timestamp to updates
        updates['last_updated'] = get_game_time()

        # Apply updates
        self.object_states[object_id].update(updates)

        # Auto-save if enabled
        if self.auto_save_enabled:
            self.save_state()

        print(f"📝 Updated state for {object_id}: {list(updates.keys())}")

    def destroy_object(self, object_id: str, destroyed_by: Optional[str] = None) -> None:
        """
        Mark an object as destroyed.

        Args:
            object_id (str): Object ID to destroy
            destroyed_by (str, optional): Who/what destroyed the object
        """
        self.update_object_state(object_id, {
            'state': 'destroyed',
            'destroyed_by': destroyed_by or 'unknown',
            'destroyed_at': get_game_time()
        })

    def change_object_faction(self, object_id: str, new_faction: str,
                            changed_by: Optional[str] = None) -> None:
        """
        Change the faction control of an object.

        Args:
            object_id (str): Object ID to update
            new_faction (str): New faction controlling the object
            changed_by (str, optional): Who/what changed the faction
        """
        self.update_object_state(object_id, {
            'faction': new_faction,
            'faction_changed_by': changed_by or 'unknown',
            'faction_changed_at': get_game_time()
        })

    def is_discovered(self, object_id: str) -> bool:
        """
        Check if an object has been discovered by the player.

        Args:
            object_id (str): Object ID to check

        Returns:
            bool: True if discovered, False otherwise
        """
        return object_id in self.player_discoveries

    def mark_discovered(self, object_id: str, discovery_method: str = 'proximity') -> None:
        """
        Mark an object as discovered by the player.

        Args:
            object_id (str): Object ID to mark as discovered
            discovery_method (str): How the object was discovered
        """
        if object_id not in self.player_discoveries:
            self.player_discoveries.add(object_id)

            # Add discovery metadata
            self.update_object_state(object_id, {
                'discovered': True,
                'discovery_method': discovery_method,
                'discovered_at': get_game_time()
            })

            print(f"🗺️ Marked as discovered: {object_id}")

    def get_diplomacy(self, faction_a: str, faction_b: str) -> str:
        """
        Get the current diplomacy state between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction

        Returns:
            str: Diplomacy state (allied, neutral, hostile, war)
        """
        return self.diplomacy_manager.get_diplomacy(faction_a, faction_b)

    def set_diplomacy(self, faction_a: str, faction_b: str, state: str) -> None:
        """
        Set the diplomacy state between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction
            state (str): New diplomacy state
        """
        # This would be implemented when we have a full diplomacy system
        print(f"📜 Diplomacy updated: {faction_a} vs {faction_b} = {state}")

    def get_mission_state(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the state of a mission.

        Args:
            mission_id (str): Mission ID

        Returns:
            dict or None: Mission state if found
        """
        return self.mission_states.get(mission_id)

    def update_mission_state(self, mission_id: str, updates: Dict[str, Any]) -> None:
        """
        Update the state of a mission.

        Args:
            mission_id (str): Mission ID
            updates (dict): State updates
        """
        if mission_id not in self.mission_states:
            self.mission_states[mission_id] = {}

        updates['last_updated'] = get_game_time()
        self.mission_states[mission_id].update(updates)

        if self.auto_save_enabled:
            self.save_state()

    def add_temporary_effect(self, effect_id: str, effect_data: Dict[str, Any],
                           duration: Optional[float] = None) -> None:
        """
        Add a temporary effect to the game state.

        Args:
            effect_id (str): Unique effect identifier
            effect_data (dict): Effect data
            duration (float, optional): Effect duration in seconds
        """
        effect_data['created_at'] = get_game_time()
        if duration:
            effect_data['expires_at'] = duration

        self.temporary_effects[effect_id] = effect_data

    def remove_temporary_effect(self, effect_id: str) -> None:
        """
        Remove a temporary effect.

        Args:
            effect_id (str): Effect ID to remove
        """
        if effect_id in self.temporary_effects:
            del self.temporary_effects[effect_id]

    def cleanup_expired_effects(self) -> List[str]:
        """
        Clean up expired temporary effects.

        Returns:
            list: List of expired effect IDs that were removed
        """
        import time
        current_time = time.time()
        expired = []

        for effect_id, effect_data in list(self.temporary_effects.items()):
            if 'expires_at' in effect_data:
                # expires_at is stored as duration in seconds from creation
                created_time = effect_data.get('created_at', current_time)
                # created_at is an ISO timestamp, convert to seconds since epoch
                try:
                    import datetime
                    created_dt = datetime.datetime.fromisoformat(created_time.replace('Z', '+00:00'))
                    created_seconds = created_dt.timestamp()
                    time_alive = current_time - created_seconds
                    if time_alive >= effect_data['expires_at']:
                        expired.append(effect_id)
                        del self.temporary_effects[effect_id]
                except (ValueError, AttributeError):
                    # Fallback: if created_at is not a valid timestamp, assume it should expire
                    expired.append(effect_id)
                    del self.temporary_effects[effect_id]

        return expired

    def save_state(self) -> None:
        """
        Save the current game state to persistent storage.
        """
        try:
            state_data = {
                'universe_seed': self.universe_seed,
                'player_id': self.player_id,
                'object_states': self.object_states,
                'player_discoveries': list(self.player_discoveries),
                'mission_states': self.mission_states,
                'temporary_effects': self.temporary_effects,
                'last_save_time': get_game_time(),
                'version': '1.0'
            }

            with open(self.state_file, 'w') as f:
                json.dump(state_data, f, indent=2)

            self.last_save_time = get_game_time()
            print(f"💾 Game state saved to {self.state_file}")

        except Exception as e:
            print(f"❌ Failed to save game state: {e}")

    def load_state(self) -> None:
        """
        Load game state from persistent storage.
        """
        try:
            if not os.path.exists(self.state_file):
                print(f"📄 No existing game state file found: {self.state_file}")
                return

            with open(self.state_file, 'r') as f:
                state_data = json.load(f)

            # Validate version compatibility
            if state_data.get('version') != '1.0':
                print(f"⚠️ Game state version mismatch: {state_data.get('version')}")
                return

            # Load state data
            self.object_states = state_data.get('object_states', {})
            self.player_discoveries = set(state_data.get('player_discoveries', []))
            self.mission_states = state_data.get('mission_states', {})
            self.temporary_effects = state_data.get('temporary_effects', {})

            self.last_save_time = state_data.get('last_save_time', get_game_time())

            print(f"📂 Game state loaded from {self.state_file}")
            print(f"   - Object states: {len(self.object_states)}")
            print(f"   - Discoveries: {len(self.player_discoveries)}")
            print(f"   - Missions: {len(self.mission_states)}")

        except Exception as e:
            print(f"❌ Failed to load game state: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the current game state.

        Returns:
            dict: State statistics
        """
        return {
            'object_states': len(self.object_states),
            'player_discoveries': len(self.player_discoveries),
            'mission_states': len(self.mission_states),
            'temporary_effects': len(self.temporary_effects),
            'last_save_time': self.last_save_time,
            'auto_save_enabled': self.auto_save_enabled
        }

    def reset_state(self) -> None:
        """
        Reset all game state to initial values.
        """
        self.object_states.clear()
        self.player_discoveries.clear()
        self.mission_states.clear()
        self.temporary_effects.clear()

        # Remove state file
        if os.path.exists(self.state_file):
            os.remove(self.state_file)

        print("🔄 Game state reset to initial values")
