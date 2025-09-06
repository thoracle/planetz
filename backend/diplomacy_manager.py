"""
Diplomacy Manager
================

This module manages faction relationships and diplomacy states in the game universe.
It provides a framework for tracking alliances, hostilities, and diplomatic changes
between different factions.

Key Features:
- Diplomacy matrix for all faction pairs
- Relationship state tracking
- Diplomatic event handling
- Trade and interaction modifiers
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from backend.game_time import get_game_time

logger = logging.getLogger(__name__)


class DiplomacyManager:
    """
    Manages diplomacy relationships between factions.

    Provides a complete diplomacy system including:
    - Faction relationship tracking
    - Diplomatic state transitions
    - Trade and interaction modifiers
    - Diplomatic event processing
    """

    def __init__(self):
        """Initialize the diplomacy manager with default faction relationships."""
        # Define available factions
        self.factions = ['friendly', 'neutral', 'enemy', 'unknown']

        # Define diplomacy states
        self.diplomacy_states = {
            'allied': {
                'description': 'Full cooperation and mutual support',
                'trade_modifier': 1.5,
                'hostility_level': 0,
                'can_dock': True,
                'can_trade': True,
                'can_attack': False,
                'color': '#44ff44'
            },
            'friendly': {
                'description': 'Positive relations with cooperation',
                'trade_modifier': 1.2,
                'hostility_level': 0,
                'can_dock': True,
                'can_trade': True,
                'can_attack': False,
                'color': '#88ff88'
            },
            'neutral': {
                'description': 'Standard diplomatic relations',
                'trade_modifier': 1.0,
                'hostility_level': 1,
                'can_dock': True,
                'can_trade': True,
                'can_attack': True,
                'color': '#ffff44'
            },
            'hostile': {
                'description': 'Aggressive relations with potential conflict',
                'trade_modifier': 0.5,
                'hostility_level': 2,
                'can_dock': False,
                'can_trade': False,
                'can_attack': True,
                'color': '#ff8844'
            },
            'war': {
                'description': 'Active conflict and combat operations',
                'trade_modifier': 0.0,
                'hostility_level': 3,
                'can_dock': False,
                'can_trade': False,
                'can_attack': True,
                'color': '#ff4444'
            }
        }

        # Initialize diplomacy matrix with default relationships
        self.diplomacy_matrix: Dict[str, Dict[str, str]] = {}
        self._initialize_diplomacy_matrix()

        # Track diplomatic events and changes
        self.diplomacy_events: List[Dict[str, Any]] = []
        self.relationship_history: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}

        # Advanced diplomacy features
        self.treaties: Dict[str, Dict[str, Any]] = {}  # Active treaties
        self.diplomatic_missions: Dict[str, Dict[str, Any]] = {}  # Diplomatic missions
        self.faction_reputations: Dict[str, Dict[str, float]] = {}  # Faction reputations
        self.trade_agreements: Dict[str, Dict[str, Any]] = {}  # Trade agreements

    def _initialize_diplomacy_matrix(self) -> None:
        """Initialize the diplomacy matrix with default relationships."""
        for faction_a in self.factions:
            self.diplomacy_matrix[faction_a] = {}
            for faction_b in self.factions:
                if faction_a == faction_b:
                    # Factions are allied with themselves
                    self.diplomacy_matrix[faction_a][faction_b] = 'allied'
                else:
                    # Default relationships
                    if faction_a == 'friendly' and faction_b == 'enemy':
                        self.diplomacy_matrix[faction_a][faction_b] = 'hostile'
                    elif faction_a == 'enemy' and faction_b == 'friendly':
                        self.diplomacy_matrix[faction_a][faction_b] = 'hostile'
                    else:
                        self.diplomacy_matrix[faction_a][faction_b] = 'neutral'

    def get_diplomacy(self, faction_a: str, faction_b: str) -> str:
        """
        Get the current diplomacy state between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction

        Returns:
            str: Diplomacy state (allied, friendly, neutral, hostile, war)
        """
        if faction_a not in self.diplomacy_matrix:
            return 'neutral'
        if faction_b not in self.diplomacy_matrix[faction_a]:
            return 'neutral'

        return self.diplomacy_matrix[faction_a][faction_b]

    def set_diplomacy(self, faction_a: str, faction_b: str, state: str) -> bool:
        """
        Set the diplomacy state between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction
            state (str): New diplomacy state

        Returns:
            bool: True if state was set successfully, False otherwise
        """
        if state not in self.diplomacy_states:
            print(f"❌ Invalid diplomacy state: {state}")
            return False

        if faction_a not in self.diplomacy_matrix:
            self.diplomacy_matrix[faction_a] = {}
        if faction_b not in self.diplomacy_matrix:
            self.diplomacy_matrix[faction_b] = {}

        old_state = self.diplomacy_matrix[faction_a].get(faction_b, 'neutral')

        # Update both directions (diplomacy is mutual)
        self.diplomacy_matrix[faction_a][faction_b] = state
        self.diplomacy_matrix[faction_b][faction_a] = state

        # Record the change
        self._record_diplomacy_change(faction_a, faction_b, old_state, state)

        print(f"📜 Diplomacy updated: {faction_a} ↔ {faction_b} = {state}")
        return True

    def _record_diplomacy_change(self, faction_a: str, faction_b: str,
                                old_state: str, new_state: str) -> None:
        """
        Record a diplomacy change in the event history.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction
            old_state (str): Previous diplomacy state
            new_state (str): New diplomacy state
        """
        event = {
            'timestamp': get_game_time(),
            'faction_a': faction_a,
            'faction_b': faction_b,
            'old_state': old_state,
            'new_state': new_state,
            'type': 'diplomacy_change'
        }

        self.diplomacy_events.append(event)

        # Update relationship history
        relationship_key = tuple(sorted([faction_a, faction_b]))
        if relationship_key not in self.relationship_history:
            self.relationship_history[relationship_key] = []

        self.relationship_history[relationship_key].append(event)

    def get_diplomacy_info(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a diplomacy state.

        Args:
            state (str): Diplomacy state

        Returns:
            dict or None: State information if found
        """
        return self.diplomacy_states.get(state)

    def can_interact(self, faction_a: str, faction_b: str,
                    interaction_type: str) -> bool:
        """
        Check if two factions can perform a specific interaction.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction
            interaction_type (str): Type of interaction (dock, trade, attack)

        Returns:
            bool: True if interaction is allowed
        """
        state = self.get_diplomacy(faction_a, faction_b)
        state_info = self.get_diplomacy_info(state)

        if not state_info:
            return False

        interaction_key = f'can_{interaction_type}'
        return state_info.get(interaction_key, False)

    def get_trade_modifier(self, faction_a: str, faction_b: str) -> float:
        """
        Get the trade modifier between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction

        Returns:
            float: Trade modifier (multiplier)
        """
        state = self.get_diplomacy(faction_a, faction_b)
        state_info = self.get_diplomacy_info(state)

        if not state_info:
            return 1.0

        return state_info.get('trade_modifier', 1.0)

    def get_hostility_level(self, faction_a: str, faction_b: str) -> int:
        """
        Get the hostility level between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction

        Returns:
            int: Hostility level (0-3, higher = more hostile)
        """
        state = self.get_diplomacy(faction_a, faction_b)
        state_info = self.get_diplomacy_info(state)

        if not state_info:
            return 1  # Default neutral level

        return state_info.get('hostility_level', 1)

    def get_relationship_history(self, faction_a: str, faction_b: str) -> List[Dict[str, Any]]:
        """
        Get the diplomatic relationship history between two factions.

        Args:
            faction_a (str): First faction
            faction_b (str): Second faction

        Returns:
            list: List of diplomatic events
        """
        relationship_key = tuple(sorted([faction_a, faction_b]))
        return self.relationship_history.get(relationship_key, [])

    def get_recent_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the most recent diplomatic events.

        Args:
            limit (int): Maximum number of events to return

        Returns:
            list: Recent diplomatic events
        """
        return self.diplomacy_events[-limit:] if self.diplomacy_events else []

    def process_diplomatic_event(self, event_type: str, faction_a: str,
                               faction_b: str, **kwargs) -> bool:
        """
        Process a diplomatic event that may change relationships.

        Args:
            event_type (str): Type of diplomatic event
            faction_a (str): First faction involved
            faction_b (str): Second faction involved
            **kwargs: Additional event parameters

        Returns:
            bool: True if event was processed successfully
        """
        # Define event effects on diplomacy
        event_effects = {
            'trade_agreement': {'state_change': 1, 'description': 'Trade agreement signed'},
            'successful_mission': {'state_change': 1, 'description': 'Mission completed successfully'},
            'failed_mission': {'state_change': -1, 'description': 'Mission failed'},
            'combat_engagement': {'state_change': -2, 'description': 'Combat engagement occurred'},
            'espionage_detected': {'state_change': -3, 'description': 'Espionage activities detected'},
            'alliance_formed': {'state_change': 2, 'description': 'Alliance formed'},
            'treaty_broken': {'state_change': -3, 'description': 'Treaty broken'}
        }

        if event_type not in event_effects:
            print(f"⚠️ Unknown diplomatic event type: {event_type}")
            return False

        effect = event_effects[event_type]

        # Record the event
        event = {
            'timestamp': get_game_time(),
            'type': event_type,
            'faction_a': faction_a,
            'faction_b': faction_b,
            'description': effect['description'],
            'state_change': effect['state_change']
        }

        self.diplomacy_events.append(event)

        # Apply state change if significant
        if abs(effect['state_change']) >= 2:
            current_state = self.get_diplomacy(faction_a, faction_b)
            new_state = self._calculate_new_state(current_state, effect['state_change'])
            if new_state != current_state:
                self.set_diplomacy(faction_a, faction_b, new_state)

        print(f"📜 Diplomatic event: {effect['description']} ({faction_a} ↔ {faction_b})")
        return True

    def _calculate_new_state(self, current_state: str, change: int) -> str:
        """
        Calculate new diplomacy state based on change value.

        Args:
            current_state (str): Current diplomacy state
            change (int): Change value (-3 to +3)

        Returns:
            str: New diplomacy state
        """
        states = ['war', 'hostile', 'neutral', 'friendly', 'allied']
        current_index = states.index(current_state) if current_state in states else 2

        new_index = max(0, min(len(states) - 1, current_index + change))
        return states[new_index]

    def get_diplomacy_matrix(self) -> Dict[str, Dict[str, str]]:
        """
        Get the complete diplomacy matrix.

        Returns:
            dict: Complete diplomacy matrix
        """
        return self.diplomacy_matrix.copy()

    def get_faction_summary(self, faction: str) -> Dict[str, Any]:
        """
        Get a summary of a faction's diplomatic relationships.

        Args:
            faction (str): Faction to summarize

        Returns:
            dict: Faction diplomacy summary
        """
        if faction not in self.diplomacy_matrix:
            return {'error': f'Faction not found: {faction}'}

        relationships = self.diplomacy_matrix[faction]
        summary = {
            'faction': faction,
            'allies': [],
            'neutrals': [],
            'hostiles': [],
            'enemies': []
        }

        for other_faction, state in relationships.items():
            if state == 'allied':
                summary['allies'].append(other_faction)
            elif state == 'friendly':
                summary['allies'].append(other_faction)
            elif state == 'neutral':
                summary['neutrals'].append(other_faction)
            elif state == 'hostile':
                summary['hostiles'].append(other_faction)
            elif state == 'war':
                summary['enemies'].append(other_faction)

        return summary

    def create_treaty(self, treaty_id: str, faction_a: str, faction_b: str,
                     treaty_type: str, terms: Dict[str, Any],
                     duration_days: Optional[int] = None) -> bool:
        """
        Create a diplomatic treaty between two factions.

        Args:
            treaty_id: Unique treaty identifier
            faction_a: First faction
            faction_b: Second faction
            treaty_type: Type of treaty (alliance, trade, peace, etc.)
            terms: Treaty terms and conditions
            duration_days: Treaty duration in days (None = permanent)

        Returns:
            bool: True if treaty was created successfully
        """
        if treaty_id in self.treaties:
            logger.warning(f"❌ Treaty {treaty_id} already exists")
            return False

        treaty = {
            'id': treaty_id,
            'faction_a': faction_a,
            'faction_b': faction_b,
            'type': treaty_type,
            'terms': terms,
            'created_at': get_game_time(),
            'duration_days': duration_days,
            'expires_at': duration_days if duration_days else None,
            'status': 'active'
        }

        self.treaties[treaty_id] = treaty

        # Record the event
        self.diplomacy_events.append({
            'timestamp': get_game_time(),
            'type': 'treaty_created',
            'treaty_id': treaty_id,
            'faction_a': faction_a,
            'faction_b': faction_b,
            'treaty_type': treaty_type
        })

        logger.info(f"📜 Treaty created: {treaty_type} between {faction_a} and {faction_b}")
        return True

    def break_treaty(self, treaty_id: str, broken_by: str) -> bool:
        """
        Break an existing treaty.

        Args:
            treaty_id: Treaty ID to break
            broken_by: Faction breaking the treaty

        Returns:
            bool: True if treaty was broken successfully
        """
        if treaty_id not in self.treaties:
            logger.warning(f"❌ Treaty {treaty_id} does not exist")
            return False

        treaty = self.treaties[treaty_id]
        treaty['status'] = 'broken'
        treaty['broken_at'] = get_game_time()
        treaty['broken_by'] = broken_by

        # Record the event
        self.diplomacy_events.append({
            'timestamp': get_game_time(),
            'type': 'treaty_broken',
            'treaty_id': treaty_id,
            'broken_by': broken_by,
            'faction_a': treaty['faction_a'],
            'faction_b': treaty['faction_b']
        })

        # Worsen diplomatic relations
        self.process_diplomatic_event('treaty_broken', treaty['faction_a'], treaty['faction_b'])

        logger.info(f"💔 Treaty broken: {treaty_id} by {broken_by}")
        return True

    def create_trade_agreement(self, agreement_id: str, faction_a: str, faction_b: str,
                              trade_terms: Dict[str, Any]) -> bool:
        """
        Create a trade agreement between two factions.

        Args:
            agreement_id: Unique agreement identifier
            faction_a: First faction
            faction_b: Second faction
            trade_terms: Trade terms and conditions

        Returns:
            bool: True if agreement was created successfully
        """
        if agreement_id in self.trade_agreements:
            logger.warning(f"❌ Trade agreement {agreement_id} already exists")
            return False

        agreement = {
            'id': agreement_id,
            'faction_a': faction_a,
            'faction_b': faction_b,
            'terms': trade_terms,
            'created_at': get_game_time(),
            'status': 'active'
        }

        self.trade_agreements[agreement_id] = agreement

        # Improve diplomatic relations
        self.process_diplomatic_event('trade_agreement', faction_a, faction_b)

        logger.info(f"🤝 Trade agreement created: {agreement_id} between {faction_a} and {faction_b}")
        return True

    def get_faction_reputation(self, observer_faction: str, target_faction: str) -> float:
        """
        Get the reputation of one faction as seen by another.

        Args:
            observer_faction: Faction observing the reputation
            target_faction: Faction whose reputation is being observed

        Returns:
            float: Reputation value (-1.0 to 1.0)
        """
        if observer_faction not in self.faction_reputations:
            self.faction_reputations[observer_faction] = {}

        return self.faction_reputations[observer_faction].get(target_faction, 0.0)

    def modify_faction_reputation(self, observer_faction: str, target_faction: str,
                                 change: float) -> None:
        """
        Modify the reputation of one faction as seen by another.

        Args:
            observer_faction: Faction observing the reputation
            target_faction: Faction whose reputation is being modified
            change: Reputation change (-1.0 to 1.0)
        """
        if observer_faction not in self.faction_reputations:
            self.faction_reputations[observer_faction] = {}

        current_rep = self.faction_reputations[observer_faction].get(target_faction, 0.0)
        new_rep = max(-1.0, min(1.0, current_rep + change))

        self.faction_reputations[observer_faction][target_faction] = new_rep

        logger.info(f"📊 Reputation change: {target_faction} reputation with {observer_faction} "
                   f"changed by {change:.2f} to {new_rep:.2f}")

    def create_diplomatic_mission(self, mission_id: str, sending_faction: str,
                                 target_faction: str, mission_type: str,
                                 objectives: List[str]) -> bool:
        """
        Create a diplomatic mission.

        Args:
            mission_id: Unique mission identifier
            sending_faction: Faction sending the mission
            target_faction: Target faction
            mission_type: Type of diplomatic mission
            objectives: Mission objectives

        Returns:
            bool: True if mission was created successfully
        """
        if mission_id in self.diplomatic_missions:
            logger.warning(f"❌ Diplomatic mission {mission_id} already exists")
            return False

        mission = {
            'id': mission_id,
            'sending_faction': sending_faction,
            'target_faction': target_faction,
            'type': mission_type,
            'objectives': objectives,
            'created_at': get_game_time(),
            'status': 'active',
            'progress': 0.0
        }

        self.diplomatic_missions[mission_id] = mission

        logger.info(f"🎯 Diplomatic mission created: {mission_type} from {sending_faction} to {target_faction}")
        return True

    def update_diplomatic_mission(self, mission_id: str, progress: float,
                                 status: Optional[str] = None) -> bool:
        """
        Update a diplomatic mission's progress and status.

        Args:
            mission_id: Mission ID
            progress: Progress (0.0 to 1.0)
            status: New status (optional)

        Returns:
            bool: True if mission was updated successfully
        """
        if mission_id not in self.diplomatic_missions:
            logger.warning(f"❌ Diplomatic mission {mission_id} does not exist")
            return False

        mission = self.diplomatic_missions[mission_id]
        mission['progress'] = max(0.0, min(1.0, progress))

        if status:
            old_status = mission['status']
            mission['status'] = status

            # Process mission completion effects
            if status == 'completed' and old_status != 'completed':
                self._process_mission_completion(mission)

        mission['last_updated'] = get_game_time()

        logger.info(f"📈 Diplomatic mission updated: {mission_id} progress {progress:.1%}")
        return True

    def _process_mission_completion(self, mission: Dict[str, Any]) -> None:
        """
        Process the effects of completing a diplomatic mission.

        Args:
            mission: Completed mission data
        """
        sending = mission['sending_faction']
        target = mission['target_faction']
        mission_type = mission['type']

        # Apply reputation and diplomacy changes based on mission type
        if mission_type == 'peace_negotiation':
            self.modify_faction_reputation(sending, target, 0.3)
            self.modify_faction_reputation(target, sending, 0.2)
            self.set_diplomacy(sending, target, 'neutral')

        elif mission_type == 'alliance_formation':
            self.modify_faction_reputation(sending, target, 0.5)
            self.modify_faction_reputation(target, sending, 0.5)
            self.set_diplomacy(sending, target, 'friendly')

        elif mission_type == 'trade_negotiation':
            self.modify_faction_reputation(sending, target, 0.2)
            self.modify_faction_reputation(target, sending, 0.2)
            # Could create trade agreement here

        logger.info(f"✅ Diplomatic mission completed: {mission['id']} ({mission_type})")

    def get_active_treaties(self, faction: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all active treaties, optionally filtered by faction.

        Args:
            faction: Optional faction to filter by

        Returns:
            list: Active treaties
        """
        active_treaties = [
            treaty for treaty in self.treaties.values()
            if treaty['status'] == 'active'
        ]

        if faction:
            active_treaties = [
                treaty for treaty in active_treaties
                if faction in [treaty['faction_a'], treaty['faction_b']]
            ]

        return active_treaties

    def get_active_trade_agreements(self, faction: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all active trade agreements, optionally filtered by faction.

        Args:
            faction: Optional faction to filter by

        Returns:
            list: Active trade agreements
        """
        active_agreements = [
            agreement for agreement in self.trade_agreements.values()
            if agreement['status'] == 'active'
        ]

        if faction:
            active_agreements = [
                agreement for agreement in active_agreements
                if faction in [agreement['faction_a'], agreement['faction_b']]
            ]

        return active_agreements

    def get_diplomatic_missions(self, faction: Optional[str] = None,
                               status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get diplomatic missions, optionally filtered by faction and status.

        Args:
            faction: Optional faction to filter by
            status: Optional status to filter by

        Returns:
            list: Diplomatic missions
        """
        missions = list(self.diplomatic_missions.values())

        if faction:
            missions = [
                mission for mission in missions
                if faction in [mission['sending_faction'], mission['target_faction']]
            ]

        if status:
            missions = [mission for mission in missions if mission['status'] == status]

        return missions

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the diplomacy system.

        Returns:
            dict: Diplomacy system statistics
        """
        total_relationships = sum(len(relations) for relations in self.diplomacy_matrix.values())
        active_treaties = len(self.get_active_treaties())
        active_trade_agreements = len(self.get_active_trade_agreements())
        active_diplomatic_missions = len(self.get_diplomatic_missions(status='active'))

        return {
            'total_factions': len(self.factions),
            'total_relationships': total_relationships,
            'total_events': len(self.diplomacy_events),
            'diplomacy_states': list(self.diplomacy_states.keys()),
            'relationship_history_entries': len(self.relationship_history),
            'active_treaties': active_treaties,
            'active_trade_agreements': active_trade_agreements,
            'active_diplomatic_missions': active_diplomatic_missions,
            'total_treaties': len(self.treaties),
            'total_trade_agreements': len(self.trade_agreements),
            'total_diplomatic_missions': len(self.diplomatic_missions)
        }
