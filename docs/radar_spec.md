3D Radar SpecificationOverviewThe 3D radar provides a clear, retro-style representation of the player's surroundings in a 3D space environment. It displays a galactic plane as a grid, with celestial objects (e.g., planets, stars, stations) and spaceships shown relative to the player's position. Objects move across the grid and up or down on vertical lines to indicate their 3D positions, with colors reflecting their faction affiliation.Screen PositionLocation: The radar is displayed in the lower center of the screen, maintaining a compact and unobtrusive presence consistent with classic space shooter aesthetics.

Grid DesignPurpose: Represents the galactic plane, specifically the X-Z plane, centered on the player's current position.
Structure: A square grid with a fixed number of lines (e.g., 5x5), where each line represents equal distances in the game world.
Orientation: Aligned with the player's ship orientation:Forward (Z-axis): Matches the direction the player's ship is facing.
Left-Right (X-axis): Corresponds to the player's lateral movement.

Plane Reference: The grid lies at the player's Y (altitude) position, so all object positions are shown relative to the player.

Player IndicatorRepresentation: A unique symbol (e.g., a crosshair, triangle, or dot) is placed at the center of the grid, representing the player's ship.
Altitude: Since the grid is defined at the player's Y position, the player's altitude is implicitly zero on the radar, requiring no vertical line.

Object RepresentationObjects Included: Both spaceships and celestial objects (e.g., planets, stars, stations) within the radar's range are displayed.
Position on Grid: Each object appears on the grid at its relative (X, Z) coordinates, calculated as:X = Object's X - Player's X
Z = Object's Z - Player's Z

Altitude Display: A vertical line extends perpendicularly from the grid at the object's (X, Z) position.
A blip (e.g., a small dot or marker) slides up or down this line to show the object's relative Y position (Y = Object's Y - Player's Y).
If the object is above the player, the blip is above the grid; if below, it is below the grid.

Color Coding: Each blip is colored according to the faction color standard:Red: Enemies
Green: Friendlies
Yellow: Neutral
Grey: Unknown

Vertical Line Style: The vertical line may share the blip's faction color or use a faint, neutral color (e.g., grey) to reduce visual clutter, with the blip remaining the primary focus.

Range and ScaleDetection Range: The radar has a fixed range (e.g., a set distance in game units), and objects beyond this range are not displayed.
Grid Scale: The grid lines represent consistent intervals (e.g., every 1000 units), though exact values depend on your game's scale.  The radar's range should be large enough to show a planet, it's moons and the solar objects around it.  As the player moves through the solar system it will need to scroll to show other objects in range.

Vertical Scale: The vertical lines have a fixed height range. If an object's relative Y exceeds this range, the blip is clamped to the top (for high altitudes) or bottom (for low altitudes) of the line.

Visual and Functional NotesSimplicity: The design prioritizes readability, with a straightforward grid and vertical line system inspired by Elite's minimalist radar, adapted for 3D.
Object Uniformity: All objects (spaceships and celestial bodies) are represented as blips for consistency, though you could later extend this with distinct icons (e.g., larger dots for planets) if desired.
Dynamic Orientation: As the player rotates their ship, the grid and object positions rotate accordingly, keeping the radar intuitive and relative to the player's perspective.

Example VisualizationImagine the radar as a small panel in the lower center of your screen:A 5x5 grid with the player's symbol (e.g., a white triangle) at the center.
An enemy ship ahead and above the player has a red blip on a vertical line extending upward from a grid point forward of the center.
A neutral planet to the right and below has a yellow blip on a line extending downward from a grid point to the right.
The grid rotates as the player turns, and blips slide up or down their lines as altitudes change.

