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

## Getting Started

(Coming soon: Installation and setup instructions)

## Development

### Prerequisites
- Flask
- Python 3.10
- Modern web browser with WebAssembly support

### Setup Instructions
(Coming soon)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Credits

This project draws inspiration from:
- [Sebastian Lague's Terraforming](https://github.com/SebLague/Terraforming) - For procedural terrain generation concepts
- [DanielEsteban's softxels](https://github.com/danielesteban/softxels) - For WebAssembly and chunk-based rendering optimizations

## License

(Coming soon) 