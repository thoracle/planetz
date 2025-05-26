# Planetz

A 3D web-based spaceship simulation game featuring intergalactic exploration, trading, and combat. The game combines classic space simulation elements inspired by Elite, Privateer, and Star Raiders with modern web technologies and procedural universe generation.

## Features

### Core Spaceship Systems
- **Five Ship Classes**: Scout, Light Fighter, Heavy Fighter, Light Freighter, Heavy Freighter
- **Modular Ship Systems**: Engines, weapons, shields, scanners, and support systems
- **Damage & Repair System**: Real-time system damage with repair mechanics
- **Energy Management**: Simplified energy pool system with per-system consumption
- **Gear-Based Progression**: Ship stats derived from installed equipment

### Navigation & Exploration
- **Multiple View Modes**: Front view, aft view, galactic chart, long-range scanner
- **Warp Drive System**: Energy-based faster-than-light travel between sectors
- **Target Computer**: Advanced targeting with sub-system targeting capabilities
- **Docking System**: Station interaction and orbital mechanics

### Interactive 3D Universe
- **Procedural Star Systems**: Generated solar systems with planets, moons, and stations
- **Real-time 3D Rendering**: Three.js-powered space environment
- **Dynamic Starfield**: High-density star rendering with parallax effects
- **Atmospheric Effects**: Planet atmospheres and visual effects

### Advanced Combat Features
- **Weapon Systems**: Laser weapons and missile tubes with cooldown mechanics
- **Shield Management**: Deflector shields with energy consumption
- **Sub-System Targeting**: Target specific enemy ship components (Level 3+ targeting computer)
- **Damage Control Interface**: Real-time system status and repair management

## Technical Stack

### Frontend
- **Three.js** for 3D rendering and scene management
- **JavaScript/ES6+** with modular architecture
- **WebAssembly (WASM)** for performance-critical computations (planet generation)
- **HTML5/CSS3** for UI components

### Backend
- **Python3/Flask** for API server and static file serving
- **Procedural Generation** algorithms for universe creation
- **RESTful API** design for client-server communication

## Getting Started

### Prerequisites
- Python 3.x
- Modern web browser with WebGL support
- Node.js (for development tools)

### Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the development server:
```bash
python run.py
```

The server will start at http://localhost:5001

### Frontend Setup

The frontend is served as static files by the Flask backend. Simply navigate to http://localhost:5001 after starting the backend server.

For development with live reload:
```bash
python3 -m http.server 8080 --directory frontend/static
```

## Game Controls

### Ship Movement
- **0-9 Keys**: Set impulse engine speed (0 = stop, 9 = maximum)
- **Arrow Keys**: Rotate ship (pitch and yaw)

### View Controls
- **F Key**: Switch to Front View (forward-facing camera with + crosshair)
- **A Key**: Switch to Aft View (rear-facing camera with -- crosshair)
- **G Key**: Open Galactic Chart (2D galaxy map for navigation)
- **L Key**: Open Long Range Scanner (tactical system view)

### System Controls
- **S Key**: Toggle shields on/off (blue screen tint when active)
- **D Key**: Toggle Damage Control interface
- **T Key**: Toggle target computer
- **Space Bar**: Fire weapons
- **Tab**: Cycle through targets
- **< / > Keys**: Cycle through sub-targets (Level 3+ targeting computer)

### Special Modes
- **Ctrl+E** (or **Cmd+E** on Mac): Toggle Edit Mode for planet terraforming
- **Ctrl+D** (or **Cmd+D** on Mac): Toggle FPS Display

### Docking
- **Dock Button**: Dock with nearby stations (when in range)
- **Undock Button**: Leave station and resume flight

## Ship Systems

### Core Systems
1. **Impulse Engines**: Sublight propulsion and maneuvering
2. **Warp Drive**: Faster-than-light travel between star systems
3. **Deflector Shields**: Energy-based damage protection
4. **Weapons**: Laser cannons and missile tubes
5. **Long Range Scanner**: System-wide object detection
6. **Subspace Radio**: Galactic chart updates and communications
7. **Target Computer**: Enemy detection and sub-system targeting
8. **Hull Plating**: Physical damage resistance
9. **Energy Reactor**: Power generation and storage
10. **Cargo Hold**: Storage capacity for trading

### Damage & Repair
- **System Health**: 0-100% effectiveness based on damage
- **Repair Kits**: Consumable items for in-space repairs
- **Station Repairs**: Full restoration available at docked stations
- **Critical Damage**: Systems become inoperable at 100% damage

### Energy Management
- **Simplified Energy Pool**: All systems draw from central energy supply
- **Active Consumption**: Systems consume energy only when in use
- **Energy Efficiency**: Higher-level systems are more energy efficient

## Ship Classes

### Scout
- **Role**: Fast reconnaissance and exploration
- **Strengths**: High speed, advanced sensors, energy efficiency
- **Weaknesses**: Light armor, minimal cargo, limited firepower

### Light Fighter
- **Role**: Agile combat vessel for dogfighting
- **Strengths**: Balanced speed and firepower, good maneuverability
- **Weaknesses**: Moderate armor, limited cargo capacity

### Heavy Fighter
- **Role**: Durable combat ship for sustained engagements
- **Strengths**: Heavy armor, high firepower, robust systems
- **Weaknesses**: Lower speed, limited cargo space

### Light Freighter
- **Role**: Versatile trading vessel with defensive capability
- **Strengths**: Good cargo capacity, balanced systems
- **Weaknesses**: Moderate combat effectiveness

### Heavy Freighter
- **Role**: Maximum cargo capacity for bulk trading
- **Strengths**: Massive cargo hold, heavy armor
- **Weaknesses**: Slow speed, minimal combat capability

## Architecture

### Frontend Components
1. **Ship System**: Modular ship class with configurable systems
2. **View Manager**: Handles different camera perspectives and UI modes
3. **Starfield Manager**: Manages 3D space environment and effects
4. **System Managers**: Individual managers for warp, docking, targeting
5. **UI Components**: Damage control, targeting, navigation interfaces

### Backend Components
1. **Universe Generation**: Procedural star system and galaxy creation
2. **API Endpoints**: RESTful services for game state and universe data
3. **Configuration System**: Ship types, system specifications, game balance

## Development

### Project Structure
```
planetz/
├── frontend/
│   └── static/
│       ├── js/
│       │   ├── ship/          # Ship systems and configuration
│       │   ├── views/         # View managers and UI
│       │   ├── ui/            # Interface components
│       │   └── workers/       # Web workers for performance
│       ├── css/               # Stylesheets
│       ├── audio/             # Sound effects
│       └── lib/               # Third-party libraries
├── backend/
│   ├── routes/                # API endpoints
│   ├── config.py              # Configuration management
│   └── verse.py               # Universe generation
└── docs/                      # Documentation
```

### Testing
The project includes extensive test files for individual systems:
- Ship system integration tests
- Individual component tests (weapons, shields, engines)
- UI component tests
- Damage control system tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style and architecture
4. Add tests for new features
5. Submit a pull request

## Credits

This project draws inspiration from:
- **Elite** series - Trading and exploration mechanics
- **Wing Commander: Privateer** - Ship customization and universe design
- **Star Raiders** - Combat and navigation systems
- [Sebastian Lague's Terraforming](https://github.com/SebLague/Terraforming) - Procedural terrain generation
- [DanielEsteban's softxels](https://github.com/danielesteban/softxels) - WebAssembly optimization techniques

## License

[License information to be added] 