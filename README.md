# Planetz

A web application for generating and customizing 3D spherical planets using procedural generation with real-time visual feedback in a Three.js scene.

## Features

- Interactive 3D planet generation using Marching Cubes algorithm
- Real-time parameter customization with sliders and color pickers
- Procedural terrain generation using WebAssembly-optimized noise functions
- Efficient chunk-based rendering for optimal performance
- Height-based terrain coloring with custom shaders

## Technical Stack

### Backend
- Python3/Flask for static file serving and future API endpoints

### Frontend
- Three.js for 3D rendering
- WebAssembly (WASM) for performance-critical computations
- JavaScript/ES6+ for UI and scene management

## Getting Started

### Backend Setup

1. Create and activate a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory:
```
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
```

4. Start the development server:
```bash
./run-server.sh
```

The server will start at http://localhost:5000

### Frontend Setup

(Coming soon)

## Architecture

The project combines design elements from Sebastian Lague's Terraforming and technical optimizations from DanielEsteban's softxels:

### Core Components

1. **Density Field Generation**
   - Formula: `density(position) = ||position - center|| - planet_radius + noise(position)`
   - 3D grid (64x64x64 or 128x128x128)
   - WASM-optimized noise functions

2. **Mesh Generation**
   - Marching Cubes algorithm implemented in WebAssembly
   - Chunk-based processing (16x16x16 chunks)
   - Web Worker offloading for smooth performance

3. **Rendering**
   - Three.js scene with orbit controls
   - Directional and ambient lighting
   - Custom shaders for height-based coloring

4. **User Interface**
   - Interactive parameter sliders (noise scale, octaves, persistence)
   - Terrain height controls
   - Color gradient pickers
   - Real-time updates with performance optimization
   - Galactic Chart that shows all of the solar systems on a grid

## Impulse Engines
   - Press 0-9 keys to change Velocity
Key	Velocity (metros per second)
0	   0
1	   0.25
2	   0.50
3	   1
4	   3
5	   6
6	   12
7	   25
8	   37
9	   43

Your current Velocity in shown on the Control Panel Display (V represents velocity or metrons per seconds). Your ship always moves forward based on your velocity. The best cruising speed is key 6 (V = 12). The Zylon warships have a maximum speed of approximately 7 (V = 25). 

## UI Views
The app features multiple perspectives, each rendered using Three.js:

1. **Front View**
   - Main combat view showing space ahead of the starship.
   - Displays stars, planets, moons, enemy ships, meteors, and starbases in 3D.
   - Default view during gameplay.
   - Press F key (except in Edit-Mode) to switch to Front view
   - Indicated by a + cross hair

2. **Aft View**
   - Shows space behind the starship.
   - Similar rendering to Front View but oriented backward.
   - Press A key (except in Edit-Mode) to switch to Front view
   - Indicated by a -- -- cross hair

3. **Galactic Chart**
   - A 2D overlay map of the galaxy, divided into solar systems.
   - Shown as a 2d grid with cells labeled 0-9 on the horizonal and A-Z on the vertical
   - Includes a vertical scroll bar if needed
   - Activated via G key (except in Edit-Mode) modal that takes over the screen for navigation.
   - Dismissed with A, F, G keys or X button in upper right corner of modal.

4. **Long Range Scanner**
   - A top-down tactical view of the current solar system.
   - Shows all celestial bodies (star, planets, moons) with their orbits.
   - Color-coded based on diplomacy status:
     - Red: Enemy/Hostile
     - Yellow: Neutral
     - Green: Friendly
   - Click on any celestial body to view detailed information.
   - Draggable map for easy navigation.
   - Activated via L key (except in Edit-Mode).
   - Dismissed with L key or X button in upper right corner.

### Prerequisites
- Python 3.x
- Modern web browser with WebAssembly support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Credits

This project draws inspiration from:
- [Sebastian Lague's Terraforming](https://github.com/SebLague/Terraforming) - For procedural terrain generation concepts
- [DanielEsteban's softxels](https://github.com/danielesteban/softxels) - For WebAssembly and chunk-based rendering optimizations

## License


## Controls

### Edit Mode
- **Ctrl+E** (or **Cmd+E** on Mac): Toggle Edit Mode
- **Ctrl+D** (or **Cmd+D** on Mac): Toggle FPS Display

### Terraforming (in Edit Mode)
- **Click + Drag**: Raise terrain
- **Shift + Click + Drag**: Lower terrain

### Camera Controls (in Edit Mode)
- Hold **Option** (⌥) or **Command** (⌘) key, then:
  - **Hold Control + Drag**: Rotate camera
  - **Hold Option + Drag**: Orbit camera
  - **Hold Command + Drag**: Pan camera
  - Two-finger drag: Zoom camera


### GUI Controls
- Planet Type: Select different planet presets
- Terrain Height: Adjust overall terrain elevation
- Noise Scale: Change the scale of terrain features
- Noise Octaves: Control terrain detail levels
- Noise Persistence: Adjust feature prominence
- Noise Lacunarity: Control feature frequency
- New Seed: Generate new random terrain

### Terraforming Brush Settings
- Brush Size: Adjust the area of effect
- Brush Strength: Control the intensity of changes
- Brush Falloff: Adjust how the effect fades at edges 