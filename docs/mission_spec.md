RPG Mission System Design Specification
1. Introduction
1.1 Purpose
This design specification based on youtube video from Tim Cain outlines a robust and flexible mission (quest) system for role-playing games (RPGs). The system is inspired by proven implementations in titles such as Fallout, Arcanum, Temple of Elemental Evil, Vampire: The Masquerade - Bloodlines, WildStar, and The Outer Worlds. It focuses on managing mission states, handling failures, supporting multiple objectives, and ensuring scalability for both simple and complex narratives.The primary goals are:To provide a structured way to track player progress through missions.

To allow narrative and level designers flexibility in defining and generating missions.
To maintain forward progression while accommodating failure states without reverting progress.
To support saving/loading of mission data for persistent gameplay.

1.2 Scope
This system covers:Core mission states and transitions.
Mission data structure and handling.
A central manager for handling multiple missions.
Extensions for multi-objective missions.
Basic integration with game events (e.g., for triggers like NPC interactions or item pickups via backend API calls).

Out of scope:UI/UX details (e.g., journal display, notifications).
Specific frontend rendering (e.g., Three.js scene integration).
Advanced AI or full procedural generation logic (assumes basic dynamic generation hooks).

1.3 Assumptions
The game is data-driven, with missions defined or generated as JSON files (one per mission).

Missions can be predefined by designers through authoring JSON files or dynamically generated at runtime (e.g., via procedural algorithms on the backend).

The system is implemented using Flask (Python backend for data management and API) and Three.js (JavaScript frontend for client-side interactions), with mission data handled server-side and synced to clients via API.

2. Overview
The mission system revolves around a Mission Data Structure that encapsulates the state and behavior of individual missions, managed by a Mission Manager on the Flask backend. Each mission progresses through a series of states in a forward-only manner, with an optional "botched" flag for failure scenarios.Key principles:Forward Progression: States advance sequentially (e.g., from "Mentioned" to "Accepted"), but cannot regress.

Failure Handling: 
A botched flag can mark missions as failed without altering the core state, allowing for narrative flexibility.

Extensibility: 
Supports single or multiple objectives, with options for ordering and optionality.
Data Integration: Mission data is loaded from or generated as JSON files; state changes are triggered via API endpoints called from frontend events (e.g., Three.js interactions).

3. Core Mechanics
3.1 Mission States
Missions use an enumeration for states, ensuring clear and predictable progression. The states are:Unknown: The player has no knowledge of the mission. Default starting state.

Mentioned: The mission has been referenced (e.g., via overheard dialogue or rumor), but the player has not committed.

Accepted: The player has explicitly agreed to undertake the mission.

Achieved: The mission's objective(s) are completed, but not yet turned in (e.g., item retrieved but not delivered). For some missions, this may merge with Completed if no turn-in is required.

Completed: All objectives are fulfilled, turned in (if applicable), and rewards issued. End state; no further changes allowed.

Botched: Not a standalone state, but a flag that can overlay any state except Completed. Indicates failure (e.g., quest giver killed, time limit exceeded). The effective state becomes "Botched" for querying purposes, unless design hides it (e.g., for Unknown state).

State transitions are unidirectional:
Unknown → Mentioned → Accepted → Achieved → Completed

Botched flag can be set/unset on non-Completed states.

3.2 Mission Data Structure
Each mission is represented as a JSON object (loaded from file or generated dynamically), containing:Fields:state: String (representing the enum as defined in 3.1). Default: "Unknown".

isBotched: Boolean flag. Default: false.

objectives: Array of objective objects (for multi-objective support; see Section 4).
Each objective includes: id (unique string or integer), isAchieved (bool), isOptional (bool), isOrdered (bool, for sequencing).

Additional fields for dynamic/predefined data: e.g., description (string), rewards (array), triggers (object mapping events to state changes).

For predefined missions, designers author JSON files manually or via tools. For dynamic generation, backend code (e.g., a Flask route) procedurally creates the JSON structure (e.g., based on player level, world state) and saves it as a file or holds it in memory/database.

Operations (Backend Methods):Implemented as Python functions in Flask:set_state(new_state, optional_objective_id): Advances the state if valid (forward progression only). Ignores if current state is Completed or Botched (unless unbotching first). For Achieved, accepts an optional objective ID.Validation: new_state must be greater than current (e.g., Accepted > Mentioned).

Example: set_state("Accepted") from "Mentioned" succeeds; from "Achieved" fails.

get_state(): Returns the current state string. If isBotched is true and state != "Unknown"/"Completed", returns "Botched" (or a combined value if extended).
botch(): Sets isBotched to true if state != "Completed". 

May trigger notifications via API response.
unbotch(): Sets isBotched to false. Used rarely, e.g., for redemption arcs.

is_objective_achieved(objective_id): (For multi-objective) Checks if a specific objective is done.
check_completion(): Internal function to auto-advance to "Completed" if all non-optional objectives are achieved.

Mission JSON is serialized/deserialized for persistence (e.g., using Python's json module).

3.3 Mission Manager
A backend component in Flask (e.g., a class or module) that handles all missions:Responsibilities:Maintains a collection (e.g., dictionary) of mission data, keyed by unique mission ID (string). Loads from JSON files on startup or on-demand.

Supports dynamic generation: e.g., a /generate_mission API endpoint that creates a new JSON structure, saves it as a file, and adds to the collection.
Saves/loads mission data (states, botch flags, objectives) to/from JSON files or a database for persistence.

Exposes API endpoints for frontend (Three.js) interactions:POST /set_mission_state/{mission_id}: Body includes new_state and optional objective_id.
GET /get_mission_state/{mission_id}.
POST /botch_mission/{mission_id}.
POST /unbotch_mission/{mission_id}.

Handles edge cases, like querying non-existent missions (returns "Unknown") or generating new ones on-the-fly.

Integration:
API calls from frontend: E.g., in Three.js event handler (e.g., on NPC interaction): fetch(/set_mission_state/FetchCrown, {method: 'POST', body: JSON.stringify({new_state: 'Accepted'})}).
Ensures data consistency, e.g., via Flask's session or a database for multiplayer.

4. Advanced Features
4.1 Multiple Objectives
Extend the mission JSON with an array of objectives.
Ordered Objectives: Flag prevents advancing to B until A is achieved. Enforced in set_state("Achieved", objective_id).

Optional Objectives: 
Non-mandatory goals (e.g., side tasks for bonus rewards). Completion requires all required objectives, ignoring optionals.

Auto-Completion: After setting an objective to achieved, check if the mission can advance to "Completed".

4.2 Botch Handling Variations
Flexibility: For Botched missions, options include:
Mark as failed in API responses for frontend journal.
Hide from queries if "Unknown".
Allow partial rewards or alternative paths via custom JSON fields.

Narrative Impact: Botching can cascade (e.g., botch one mission affects others via shared data).

4.3 Extensibility Points
Custom Fields: Add mission-specific JSON data (e.g., timers, counters).
Events/Callbacks: API responses can include hooks for frontend (e.g., trigger Three.js animations on state change).
Localization: Mission IDs link to localized text via separate JSON.

4.4 Reward Packages
Intead of defining the rewards for a completed mission on a one to one basis we associate a reward package id with each mission.  The reward package is used by the system to determine what rewards to give the player when he completes the mission.

ex: 
Reward Package: 1
Min Credits: 50 # if zero then don't randomize the credits awarded just give out the max credits.
Max Credits: 150  
Min XP: 1000 # if zero then don't randomize the credits awarded just give out the max XP.
Max XP: 2000
Min Cards: 1 # if zero then don't randomize the cards awarded just give out the max cards.
Max Cards: 3
Min Card Tier: 2 # if zero then don't randomize the card tiers just give out only max tier cards.
Max Card Tier: 5

5. Examples
5.1 Simple Mission: "Fetch the Crown"
JSON Structure (predefined or generated):
{
  "state": "Unknown",
  "isBotched": false,
  "description": "Retrieve a diamond crown from a cave and return it to the quest giver.",
  "objectives": [...]  // Simplified for single objective
}
Progression:Player overhears rumor → API call to set_state("Mentioned").
Player agrees → set_state("Accepted").
Player picks up crown → set_state("Achieved").
Player returns → set_state("Completed"); issue reward via API.

Failure: Kill quest giver → botch(); mission marked failed, no reward.

5.2 Multi-Objective Mission: "Village Rescue"
JSON Objectives:
[
  {"id":1, "isAchieved":false, "isOptional":false, "isOrdered":true, "description":"Rescue Villager A"},
  {"id":2, "isAchieved":false, "isOptional":false, "isOrdered":true, "description":"Rescue Villager B"},
  {"id":3, "isAchieved":false, "isOptional":true, "description":"Collect supplies"}
]
Progression:Accept mission.
Achieve id:1 → Partial progress.
Attempt id:2 without id:1 → Blocked via API validation.
Achieve id:2 (and optionally id:3) → Auto-set to "Completed" if all required done.

6. Implementation Notes
6.1 Technical Considerations
State Enum: Use Python strings or enums for states.

Serialization: Use json.dumps/loads for JSON handling; save files per mission (e.g., missions/{id}.json).
Performance: For large games (100+ missions), use a database (e.g., SQLite via Flask) instead of files.
Testing: Unit tests for state transitions, botching, and multi-objectives. Integration tests with mock API calls.

6.2 Design Trade-offs
Simplicity vs. Complexity: Core system is lightweight; dynamic generation adds procedural flexibility.
Designer Empowerment: JSON authoring handles "what" for missions; backend generation for "how" dynamic ones are created.

Player Experience: Forward-only progression prevents exploits; botch flag adds realism without frustration.

