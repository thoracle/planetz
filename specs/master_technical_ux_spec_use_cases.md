# Master Technical UX Specification - Use Cases

This document provides a comprehensive specification of keyboard use cases for the Planetz game, organized by functional groups matching the in-game help screen. Each use case describes the user action and expected system response.

## BASIC NAVIGATION

**User presses F key and switches to forward view** - Changes the camera view to show the front of the ship (disabled while docked)

**User presses A key and switches to aft view** - Changes the camera view to show the rear of the ship (disabled while docked)

**User presses H key and toggles the technical manual** - Opens or closes the ship systems help screen with detailed control information

**User presses D key and opens damage control interface** - Displays the ship's damage status and repair options

## IMPULSE PROPULSION

**User presses 0-9 keys and sets impulse speed** - Sets the ship's impulse engine speed from 0 (full stop) to 9 (maximum speed), clamped to engine capability (disabled while docked)

**User presses \ key and initiates emergency stop** - Immediately brings the ship to a full stop

**User presses arrow keys and controls ship attitude** - Rotates the ship using left/right/up/down arrow keys for precise maneuvering

## SHIP SYSTEMS

**User presses S key and toggles shield control** - Activates or deactivates the ship's defensive shield system (requires shields system to be installed, disabled while docked)

**User presses L key and toggles long range scanner** - Opens or closes the long range scanner interface for detecting distant objects (requires long range scanner system)

**User presses C key and opens star charts navigation** - Displays the star charts system for navigation and discovery (requires star charts system)

**User presses R key and toggles subspace radio** - Turns the subspace radio on or off to receive/ignore communications (requires subspace radio system)

**User presses P key and toggles proximity detector** - Activates or deactivates the radar system for nearby object detection (requires proximity detector/radar system, disabled while docked)

**User presses +/= keys and zooms proximity detector in** - Increases zoom level on the proximity detector for closer inspection (when proximity detector is active)

**User presses -/_ keys and zooms proximity detector out** - Decreases zoom level on the proximity detector for wider view (when proximity detector is active)

**User presses \ key and toggles proximity detector view mode** - Switches between 3D and top-down view modes in the proximity detector (when proximity detector is active)

**User presses G key and opens galactic chart** - Displays the galactic chart for long-range navigation planning (requires galactic chart system)

**User presses T key and toggles target computer** - Activates or deactivates the target computer system (requires target computer system)

**User presses I key and displays intel information** - Shows detailed intelligence data for the currently targeted object (requires target computer and scanner systems)

## COMBAT SYSTEMS

**User presses Tab key and cycles to next target** - Selects the next available target in the target computer

**User presses Shift+Tab keys and cycles to previous target** - Selects the previous available target in the target computer

**User presses Space key and fires active weapon** - Launches the currently selected weapon at the targeted object (disabled while docked)

**User presses , key and selects previous weapon** - Cycles to the previous weapon in the ship's arsenal (disabled while docked)

**User presses . key and selects next weapon** - Cycles to the next weapon in the ship's arsenal (disabled while docked)

**User presses / key and toggles weapon autofire** - Enables or disables automatic weapon firing mode (disabled while docked)

**User presses Z key and selects previous sub-system target** - Cycles targeting to the previous sub-system on the enemy ship

**User presses X key and selects next sub-system target** - Cycles targeting to the next sub-system on the enemy ship

## ADVANCED OPERATIONS

**User presses Q key and creates training targets** - Spawns dummy ships for weapons practice and testing

**User presses Ctrl+Shift+B keys and performs emergency repair** - Instantly repairs all damaged ship systems (development/testing feature)

## DEBUG & DEVELOPER

**User presses Ctrl+U keys and toggles debug mode** - Enables or disables debug display showing FPS and system information

**User presses Ctrl+O keys and toggles weapon debug** - Shows or hides weapon hit detection spheres for debugging

**User presses Ctrl+E keys and enters edit mode** - Activates development editing capabilities

**User presses Ctrl+W keys and enters warp control mode** - Enables manual warp drive control for testing

## AI DEBUG CONTROLS

**User presses Cmd+Shift+A keys and toggles AI debug mode** - Enables or disables AI behavior debugging display

**User presses Cmd+Shift+E keys and forces all AIs to engage** - Commands all AI ships to enter combat engagement state

**User presses Cmd+Shift+I keys and forces all AIs to idle** - Commands all AI ships to enter idle/passive state

**User presses Cmd+Shift+S keys and displays AI statistics** - Shows detailed AI performance and behavior statistics in console

**User presses Cmd+Shift+F keys and forces all AIs to flee** - Commands all AI ships to enter flee/escape state

**User presses Cmd+Shift+V keys and creates V-formation** - Arranges all AI ships into a V-shaped flight formation

**User presses Cmd+Shift+C keys and creates column formation** - Arranges all AI ships into a column formation

**User presses Cmd+Shift+L keys and creates line abreast formation** - Arranges all AI ships into a line abreast formation

**User presses Cmd+Shift+B keys and shows flocking statistics** - Displays detailed flocking behavior data for AI ships

**User presses Cmd+Shift+T keys and shows combat statistics** - Displays real-time combat performance data for all AI ships

**User presses Cmd+Shift+W keys and shows weapon targeting debug** - Displays AI weapon targeting calculations and firing solutions

**User presses Cmd+Shift+X keys and forces AIs to target player** - Commands all AI ships to target and engage the player

**User presses Cmd+Shift+P keys and shows performance statistics** - Displays AI system performance metrics and timing data

**User presses Cmd+Shift+D keys and toggles debug visualization** - Enables or disables 3D debug overlays for AI behavior visualization

## MISSION & COMMUNICATION

**User presses N key and toggles communication HUD** - Opens or closes the communication interface for NPC interactions

**User presses M key and toggles mission status** - Displays or hides the mission status and objectives screen

---

*Note: Some controls may require specific ship systems or cards to be installed and operational. AI debug controls are primarily for development and testing purposes.*
