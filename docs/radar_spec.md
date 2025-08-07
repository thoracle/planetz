Updated 3D Proximity Detector Specification

Overview
The Proximity Detector is a 3D spatial visualization system for our retro space shooter, drawing inspiration from the original Elite game (1984) as well as the newer Elite Dangerous game, while offering a dynamic, immersive 3D design. It features a tilted 3D galactic plane as a grid, with celestial bodies (e.g., planets, stars, stations) and spaceships moving across it and positioned at varying altitudes above and below the plane. Objects are shown as color-coded blips with vertical lines for altitude, avoiding a flat minimap appearance. The detector is located in the lower center of the screen, styled with a retro wireframe aesthetic.

Screen Position
Location: Lower center of the screen, occupying approximately 20-25% of the width and height for a compact, unobtrusive HUD element.

Size: Adjustable based on your game’s resolution, fitting the retro cockpit design without dominating the main view.

3D Galactic Plane Design
Purpose: 
Represents the X-Z plane (galactic plane) where celestial bodies are primarily located, tilted to emphasize 3D depth and distinguish it from a top-down minimap.

Visual Representation:
The galactic plane is a tilted 3D grid (e.g., 5x5 or 7x7), rendered with perspective projection to create a sense of receding depth.
Grid lines are drawn in a retro wireframe style (e.g., pixelated or glowing lines) to reflect Elite’s 1980s aesthetic.

The grid is centered on the player’s position, with the forward direction (Z-axis) aligned with the player’s ship orientation, tilting upward or downward on the screen to enhance the 3D effect.

Depth Cues:
Grid lines converge slightly toward a horizon to simulate perspective. Fading or dimming of lines and objects at the grid’s edges reinforces distance.
A subtle glow or shadow effect can suggest a holographic display, maintaining retro simplicity.

Dynamic Orientation:
The grid rotates with the player’s ship orientation, ensuring the forward direction (pointed by the player marker) remains “up” on the detector.

Player Marker
Representation: A triangle centered on the grid, serving as the player’s marker.The triangle’s point indicates the direction the player’s ship is facing (forward along the Z-axis), providing a clear visual cue for orientation.
The base of the triangle anchors the player’s position at the grid’s center, with the galactic plane defined at the player’s Y-coordinate (altitude = 0).

Style: 
Use our retro 70's terminal style with retro pixelated edge to stand out against the grid and blips.

Function: As the player rotates or moves, the triangle adjusts its direction, and the grid tilts accordingly, maintaining an intuitive 3D perspective.

Object RepresentationObjects Included: Celestial bodies (planets, stars, stations) and spaceships within the detector’s range.

Position on the 3D Grid:Objects are plotted based on relative X-Z coordinates:X = Object’s X - Player’s X
Z = Object’s Z - Player’s Z

Blips (e.g., small dots or retro sprites) appear on the tilted grid at their (X, Z) positions.

Altitude Display:
A vertical line extends perpendicularly from the grid at each object’s (X, Z) position, representing its altitude (Y = Object’s Y - Player’s Y).

The blip moves along this line: above the grid for positive Y (higher altitude) and below for negative Y (lower altitude).

Lines taper or fade with height to enhance the 3D effect, with blips scaling slightly to reflect distance from the plane.

Faction Color Coding: Blips are colored per your standard existing faction color rules.

Vertical lines may use a faint neutral color (e.g., grey) or match the blip’s color, depending on visual clarity preferences.

Celestial Bodies:Positioned on or near the galactic plane (Y ≈ 0), appearing as blips on the grid with minimal vertical offset unless specified.

Spaceships move freely above or below, with their blips sliding along vertical lines to reflect altitude changes.

Range and Scale
Detection Range: Fixed spherical range (e.g., 10,000 units), with objects outside this range excluded.

Grid Scale: 
Each grid square represents a fixed distance (e.g., 1000 units), with perspective making closer squares larger and farther ones smaller.

Vertical Scale: Vertical lines span a fixed height range (e.g., ±5000 units). Blips beyond this are clamped to the top or bottom, possibly with a subtle indicator (e.g., an arrow).

Visual and Functional Notes
3D Aesthetic:The tilted grid and perspective projection ensure a 3D plane look, avoiding a flat minimap. A slight curve or horizon line can enhance the holographic feel.
Retro effects like scanlines or a CRT glow tie into the Elite-inspired style.

The triangle marker’s directional cue reinforces the 3D orientation as the grid rotates with the player.

Dynamic Updates:
Blips move smoothly across the grid and along vertical lines as objects shift relative to the player.
The grid and triangle adjust in real-time with the player’s orientation.

Retro Constraints:
Keep visuals simple (wireframe grid, basic blips) to mimic 1980s hardware limits.
Limit the color palette to your faction colors plus grid accents (e.g., white or grey).


Example Visualization
Picture the Proximity Detector in the lower center:A tilted 5x5 grid with converging lines, centered on a white triangle pointing upward (player’s forward direction).

A red blip (enemy) moves right on the grid, sliding up a vertical line above the plane.
A yellow blip (neutral station) sits on the grid, near the plane, with a short vertical line.
A green blip (friendly) shifts left, sliding down a line below the grid.

As the player turns his ship, the triangle stays pointing north, and the grid rotates, keeping the 3D perspective intact.

As the player moves his ship, the grid scrolls keeping the player in the center while the positions of other celstial objects and ships is updated relative to the player's position.

As the player raises above or drops below the galactic plane the height of his vertical line changes to match, going above or below the galactic plan.  Moving Enemy Ships will allow demostrate this same behavior.

Benefits of the Triangle Marker
Directionality: The triangle’s point clearly shows the player’s facing direction, aiding navigation and combat targeting.

Orientation: Its alignment with the grid’s rotation ensures the player always knows their heading in 3D space.
Retro Fit: A simple, geometric shape like a triangle fits the 1980s wireframe aesthetic, enhancing the Elite homage.


Must be compatible with our gear based card system with the proximity detector fitting in an utility slot.

Starter ship should have a proximity detector card installed for testing.

Space stations should have proximity detector cards available to drag and drop to ships.

Should map to the P key to toggle the proximity detector on and off.  Should use the hud message system to tell the user when the system is unavailable (no card sloted) or destroyed.  Should world like other utility systems cards.  See: Galactic Chart, Long Range Scanner and Subspace Radio for reference.