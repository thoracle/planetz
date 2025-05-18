# Technical Design Document

## Core Use Cases

### 1. Star System Generation and Management
- Generate a deterministic universe using Lehmer32 random number generator:
  - Initialize Lehmer32 with a seed value
  - Generate 90 star systems (9x10 grid)
  - Each star system has:
    - Star type (red dwarf, yellow dwarf, blue giant, white dwarf)
    - Unique star name using syllable combinations (e.g., "Corusctaf")
    - 0-9 planets (randomly determined)
  - Each planet has:
    - Planet class (Class-M through Class-Y)
    - Unique name using syllable combinations
    - Faction (Friendly, Neutral, Enemy, Unknown)
    - Government (Dictatorship, Democracy, Theocracy, Monarchy, Anarchy)
    - Economy (Agricultural, Industrial, Technological, Commercial, Mining, Research, Tourism)
    - Population (ranging from 200,000 to 10 billion)
    - Atmosphere and cloud properties
    - Terrain parameters (noise scale, octaves, persistence, lacunarity)
    - 0-5 moons
  - Each moon has:
    - Moon type (rocky, ice, desert)
    - Unique name using syllable combinations
    - Size parameters

- Maintain deterministic generation:
  - Use Lehmer32 for all random choices
  - Handle both numeric and string seeds
  - Calculate universe checksum for verification
  - Ensure reproducible results across sessions

- Apply realistic orbital mechanics using Kepler's laws
- Handle gravitational interactions between bodies
- Manage spatial partitioning for efficient physics calculations

### 2. Celestial Body Data Structure
Each celestial body type has specific properties:

#### Star System
```json
{
    "star_type": "red dwarf | yellow dwarf | blue giant | white dwarf",
    "star_name": "String (e.g., 'Corusctaf')",
    "star_size": "Float (default: 2.0)",
    "planets": [Planet]
}
```

#### Planet
```json
{
    "planet_type": "Class-M | Class-L | Class-H | Class-D | Class-J | Class-K | Class-N | Class-Y",
    "planet_name": "String (e.g., 'Tatoomus')",
    "planet_size": "Float (0.8 to 2.8)",
    "has_atmosphere": "Boolean",
    "has_clouds": "Boolean",
    "faction": "String (Friendly, Neutral, Enemy, Unknown)",
    "government": "String (Dictatorship, Democracy, Theocracy, Monarchy, Anarchy)",
    "economy": "String (Agricultural, Industrial, Technological, Commercial, Mining, Research, Tourism)",
    "population": "String (200,000 to 10 billion)",
    "params": {
        "noise_scale": "Float",
        "octaves": "Integer",
        "persistence": "Float",
        "lacunarity": "Float",
        "terrain_height": "Float",
        "seed": "Integer"
    },
    "moons": [Moon]
}
```

#### Moon
```json
{
    "moon_type": "rocky | ice | desert",
    "moon_name": "String (e.g., 'Phobos')",
    "moon_size": "Float (0.2 to 0.8)"
}
```

### 3. Planet Classes
Each planet class has specific characteristics:
- **Class-M**: Earth-like planets capable of supporting humanoid life
- **Class-L**: Marginally habitable with harsh conditions
- **Class-H**: Hot, arid worlds with little surface water
- **Class-D**: Toxic atmosphere, uninhabitable
- **Class-J**: Gas giants similar to Jupiter
- **Class-K**: Barren, rocky worlds with limited water
- **Class-N**: Planets with rings similar to Saturn
- **Class-Y**: Extremely inhospitable with lethal conditions

### 4. Celestial Body Visualization
- Render star with appropriate color and light emission
- Generate and render planets with procedural terrain
- Create and render moons with appropriate properties
- Apply atmospheric effects to planets
- Add cloud layers to planets
- Implement ocean rendering with wave effects

### 5. Camera and View Controls
- Free camera movement in normal mode
- Orbit controls for focused viewing
- Camera roll functionality (Option+Command+Drag)
- Zoom controls with mouse wheel
- Touch controls for mobile devices

### 6. Debug and Edit Modes

#### 6.1 Debug Mode (CTRL+D)
- Toggle debug information display
- Show FPS counter
- Display celestial body statistics
- Show debug helpers (axes, grid)
- Update debug panel in real-time

#### 6.2 Edit Mode (CTRL+E)
- Toggle edit panel
- Initialize GUI container
- Create property controls
- Add terraforming tools
- Handle input validation
- Update visual feedback
- Manage camera controls
- Handle touch interactions

#### 6.3 Tab Cycling in Edit Mode
- Cycle through celestial bodies in current solar system using Tab key
- Clear existing GUI controls before switching
- Update property controls based on body type:
  - Star: temperature and radius controls
  - Planet: radius, rotation speed, and orbit speed controls
  - Moon: radius, rotation speed, and orbit speed controls
- Update GUI title to reflect current body
- Apply changes to body properties in real-time
- Maintain animation loop for smooth transitions

### 7. Planet Customization
- Select planet type (Class-M, Class-L, Class-H, etc.)
- Adjust terrain parameters:
  - Height
  - Noise scale
  - Octaves
  - Persistence
  - Lacunarity
- Modify surface properties:
  - Roughness
  - Detail scale
- Configure atmosphere:
  - Color
  - Rayleigh scattering
  - Mie coefficient
  - Scale
- Adjust ocean settings:
  - Enable/disable
  - Depth
  - Wave properties
  - Foam effects
- Configure cloud layers:
  - Coverage
  - Density
  - Speed
  - Turbulence
  - Color

### 8. Data Management
- Star system data structure with consistent naming conventions
- Deterministic celestial body generation using Lehmer32
- Planet class parameters and properties
- Orbital elements storage
- Physics parameters
- User preferences
- System state management

## Use Case Diagram

```mermaid
graph TD
    %% Main Actors
    User((User))
    System((Solar System Simulator))

    %% Core Components
    subgraph Core[Core Components]
        direction TB
        Physics((Physics Engine))
        Renderer((Renderer))
        UI((UI Manager))
    end

    %% User Interactions
    subgraph Input[User Input]
        direction TB
        I1[CTRL+E: Edit Mode]
        I2[CTRL+D: Debug Mode]
        I3[TAB: Cycle Bodies]
        I4[Mouse/Touch: Camera]
    end

    %% System Features
    subgraph Features[System Features]
        direction TB
        
        subgraph Debug[Debug Features]
            direction TB
            D1[FPS Counter]
            D2[Position Display]
            D3[Statistics]
            D4[Debug Helpers]
        end

        subgraph Edit[Edit Features]
            direction TB
            E1[Property Editor]
            E2[Terraforming]
            E3[Customization]
            E4[Body Selection]
        end

        subgraph Phys[Physics Features]
            direction TB
            P1[Orbital Mechanics]
            P2[Gravitational Forces]
            P3[Spatial Partitioning]
        end

        subgraph Rend[Rendering Features]
            direction TB
            R1[Star System]
            R2[Planet Generation]
            R3[Atmospheric Effects]
            R4[Ocean & Clouds]
        end

        subgraph UIMan[UI Features]
            direction TB
            U1[Debug Panel]
            U2[Edit Controls]
            U3[Camera Controls]
            U4[Settings]
        end
    end

    %% Connections
    User -->|Input| Input
    Input -->|Commands| System
    
    System -->|Update| Core
    Core -->|Process| Features
    
    System -->|Debug Info| Debug
    System -->|Edit Commands| Edit
    System -->|Physics Update| Phys
    System -->|Render Commands| Rend
    System -->|UI Updates| UIMan

    %% Component Connections
    Physics -->|Calculate| Phys
    Renderer -->|Render| Rend
    UI -->|Display| UIMan
```

## Class Diagrams

### Core System Classes

```mermaid
classDiagram
    class SolarSystemManager {
        -star: Star
        -planets: Planet[]
        -moons: Moon[]
        -activeBodies: Set
        -spatialHash: SpatialHash
        +initialize()
        +update()
        +generateStarSystem()
        +getDebugInfo()
        +toggleEditMode()
        +toggleDebugMode()
    }

    class CelestialBody {
        <<abstract>>
        #position: Vector3
        #velocity: Vector3
        #mass: number
        #radius: number
        +update()
        +applyForce()
        +getPosition()
        +getVelocity()
    }

    class Star {
        -temperature: number
        -luminosity: number
        -color: Color
        +update()
        +emitLight()
    }

    class Planet {
        -atmosphere: Atmosphere
        -ocean: Ocean
        -clouds: CloudLayer
        -terrain: Terrain
        +update()
        +generateTerrain()
        +updateAtmosphere()
    }

    class Moon {
        -parent: Planet
        -orbitRadius: number
        -orbitPeriod: number
        +update()
        +calculateOrbit()
    }

    class SpatialHash {
        -gridSize: number
        -cells: Map
        +insert()
        +query()
        +update()
        +clear()
    }

    CelestialBody <|-- Star
    CelestialBody <|-- Planet
    CelestialBody <|-- Moon
    SolarSystemManager o-- Star
    SolarSystemManager o-- Planet
    SolarSystemManager o-- Moon
    SolarSystemManager o-- SpatialHash
    Planet o-- Moon
```

### Physics and Rendering Classes

```mermaid
classDiagram
    class PhysicsEngine {
        -gravity: number
        -timeStep: number
        -bodies: CelestialBody[]
        +update()
        +calculateForces()
        +applyGravity()
        +checkCollisions()
    }

    class Renderer {
        -scene: Scene
        -camera: Camera
        -renderer: WebGLRenderer
        +initialize()
        +update()
        +render()
        +updateCamera()
    }

    class ViewManager {
        -controls: OrbitControls
        -crosshairs: Object3D
        -isEditMode: boolean
        +initialize()
        +update()
        +setEditMode()
        +updateControls()
        +handleInput()
    }

    class TerrainGenerator {
        -noise: SimplexNoise
        -chunkSize: number
        -resolution: number
        +generateChunk()
        +updateChunk()
        +getHeight()
    }

    class AtmosphereRenderer {
        -rayleigh: number
        -mie: number
        -scale: number
        +update()
        +render()
        +updateParameters()
    }

    class OceanRenderer {
        -waveHeight: number
        -waveSpeed: number
        -foamIntensity: number
        +update()
        +render()
        +updateWaves()
    }

    PhysicsEngine o-- CelestialBody
    Renderer o-- ViewManager
    Renderer o-- TerrainGenerator
    Renderer o-- AtmosphereRenderer
    Renderer o-- OceanRenderer
```

### UI and Input Classes

```mermaid
classDiagram
    class UIManager {
        -gui: GUI
        -debugPanel: Panel
        -editPanel: Panel
        -tooltips: Map
        +initialize()
        +update()
        +showDebugPanel()
        +showEditPanel()
        +updateTooltips()
    }

    class InputManager {
        -keyboard: Map
        -mouse: MouseState
        -touch: TouchState
        +initialize()
        +update()
        +handleKeyDown()
        +handleKeyUp()
        +handleMouseMove()
        +handleTouch()
    }

    class DebugPanel {
        -fpsCounter: Element
        -positionDisplay: Element
        -statistics: Element
        +update()
        +show()
        +hide()
        +updateStats()
    }

    class EditPanel {
        -propertyControls: Map
        -terraformingTools: Map
        -currentBody: CelestialBody
        +initialize()
        +update()
        +show()
        +hide()
        +updateProperties()
    }

    class TooltipManager {
        -tooltips: Map
        -activeTooltip: Element
        +initialize()
        +show()
        +hide()
        +update()
    }

    UIManager o-- DebugPanel
    UIManager o-- EditPanel
    UIManager o-- TooltipManager
    InputManager --> UIManager
```

## Sequence Diagrams

### Universe Creation and Synchronization

```mermaid
sequenceDiagram
    participant User
    participant App
    participant GalacticChart
    participant API
    participant UniverseGenerator
    participant SolarSystemManager
    participant StarfieldManager

    Note over App: Application Initialization
    App->>GalacticChart: fetchUniverseData()
    GalacticChart->>API: GET /api/generate_universe
    API->>UniverseGenerator: generate_universe(90)
    
    Note over UniverseGenerator: Initialize Lehmer32 RNG
    loop For each star system (0-89)
        UniverseGenerator->>UniverseGenerator: generate_star_system()
        Note over UniverseGenerator: Generate star (type, name, size)
        
        loop For each planet (0-9)
            UniverseGenerator->>UniverseGenerator: generate_planet()
            Note over UniverseGenerator: Set planet attributes<br/>(type, name, faction, etc.)
            
            loop For each moon (0-5)
                UniverseGenerator->>UniverseGenerator: generate_moon()
                Note over UniverseGenerator: Set moon attributes<br/>(type, name, size)
            end
        end
    end
    
    UniverseGenerator->>UniverseGenerator: calculate_checksum()
    UniverseGenerator-->>API: Return universe data
    API-->>GalacticChart: Return universe data
    GalacticChart->>GalacticChart: updateGrid()
    Note over GalacticChart: Update cell counts<br/>Set ship location<br/>Highlight current system
    GalacticChart->>SolarSystemManager: Share universe data
    App->>SolarSystemManager: generateStarSystem('A0')
    
    alt Has Universe Data
        SolarSystemManager->>SolarSystemManager: Use system from universe
        SolarSystemManager->>SolarSystemManager: createStarSystem()
        Note over SolarSystemManager: Create star mesh<br/>Add star light<br/>Create planets<br/>Setup physics
    else No Universe Data
        SolarSystemManager->>API: GET /api/generate_star_system
        API->>UniverseGenerator: generate_star_system(seed)
        UniverseGenerator-->>API: Return star system
        API-->>SolarSystemManager: Return star system
        SolarSystemManager->>SolarSystemManager: createStarSystem()
        Note over SolarSystemManager: Create star mesh<br/>Add star light<br/>Create planets<br/>Setup physics
    end
    
    SolarSystemManager-->>StarfieldManager: System Created
    StarfieldManager->>StarfieldManager: updateTargetList()
    Note over StarfieldManager: Get celestial bodies<br/>Calculate distances<br/>Format for display<br/>Sort by distance
```

### Tab Targeting Flow

```mermaid
sequenceDiagram
    participant User
    participant StarfieldManager
    participant SolarSystemManager
    participant ViewManager
    participant GalacticChart

    User->>StarfieldManager: Press Tab key
    Note over StarfieldManager: Check target computer state
    StarfieldManager->>StarfieldManager: cycleTarget()
    StarfieldManager->>SolarSystemManager: getCelestialBodies()
    SolarSystemManager->>SolarSystemManager: Filter active bodies
    Note over SolarSystemManager: Exclude atmosphere<br/>clouds and rings
    SolarSystemManager-->>StarfieldManager: Return bodies list
    StarfieldManager->>GalacticChart: getStarSystemForSector(currentSector)
    GalacticChart-->>StarfieldManager: Return sector data
    StarfieldManager->>StarfieldManager: updateTargetList()
    Note over StarfieldManager: Calculate distances<br/>Sort targets<br/>Format distances
    StarfieldManager->>StarfieldManager: Create wireframe
    Note over StarfieldManager: Create geometry<br/>Set material<br/>Add to HUD scene
    StarfieldManager->>StarfieldManager: updateTargetDisplay()
    Note over StarfieldManager: Update HUD info<br/>Position reticle<br/>Update direction arrow
    StarfieldManager-->>User: Display target info
```

### Galactic Chart Population

```mermaid
sequenceDiagram
    participant User
    participant GalacticChart
    participant SolarSystemManager
    participant API
    participant StarfieldManager

    User->>GalacticChart: Click sector cell
    GalacticChart->>GalacticChart: setCurrentSystem(index)
    Note over GalacticChart: Update cell highlights<br/>Clear previous selection
    
    alt Universe Data Exists
        GalacticChart->>GalacticChart: showSystemDetails()
        Note over GalacticChart: Show star info<br/>List planets<br/>Show factions<br/>Show economy
        GalacticChart->>SolarSystemManager: setCurrentSector()
        SolarSystemManager->>SolarSystemManager: Check universe data
        SolarSystemManager->>SolarSystemManager: createStarSystem()
        Note over SolarSystemManager: Create meshes<br/>Setup physics<br/>Configure orbits
    else No Universe Data
        SolarSystemManager->>API: generateStarSystem(sector)
        API-->>SolarSystemManager: Return star system
        SolarSystemManager->>SolarSystemManager: createStarSystem()
        Note over SolarSystemManager: Create meshes<br/>Setup physics<br/>Configure orbits
    end
    
    SolarSystemManager->>StarfieldManager: System Updated
    StarfieldManager->>StarfieldManager: updateTargetList()
    Note over StarfieldManager: Get bodies<br/>Calculate distances<br/>Sort targets
    StarfieldManager->>StarfieldManager: updateCurrentSector()
    Note over StarfieldManager: Check position<br/>Generate new system<br/>if sector changed
    StarfieldManager-->>User: Display updated system

    loop Every Frame
        StarfieldManager->>StarfieldManager: update()
        Note over StarfieldManager: Update speed<br/>Move camera<br/>Check sector<br/>Update displays
    end
```

### Key Synchronization Points

1. **Universe Creation**:
   - App initializes by fetching universe data through GalacticChart
   - GalacticChart handles UI updates and grid cell management
   - SolarSystemManager creates all necessary 3D objects and physics
   - StarfieldManager maintains real-time targeting and movement

2. **Tab Targeting**:
   - StarfieldManager handles all targeting logic and display
   - Target computer state determines targeting behavior
   - Wireframe and HUD elements show target information
   - Real-time distance calculations and sorting

3. **Galactic Chart Updates**:
   - GalacticChart manages sector selection and details display
   - SolarSystemManager creates and manages celestial bodies
   - StarfieldManager handles movement and sector transitions
   - Continuous updates during gameplay

### Error Handling

1. **Universe Creation**:
   - Handle API failures gracefully
   - Provide fallback for offline mode
   - Maintain data consistency across components
   - Validate universe data before use

2. **Tab Targeting**:
   - Handle missing or invalid targets
   - Manage wireframe creation failures
   - Update HUD only when appropriate
   - Handle off-screen targets

3. **Galactic Chart**:
   - Validate sector selections
   - Handle missing system data
   - Manage state during transitions
   - Ensure smooth sector changes

## Technical Considerations

### Naming System
- **Stars**:
  - Prefix list: Greek letters (Alpha through Pi)
  - Name list: Traditional star names (Centauri, Proxima, etc.)
  - Format: `{prefix} {name}`

- **Planets**:
  - Prefix list: Mythological/space-themed names (Nova, Terra, etc.)
  - Suffix list: Descriptive/numerical terms (Prime, Major, I through X)
  - Format: `{prefix} {suffix}`

- **Moons**:
  - Prefix list: Traditional moon names (Phobos, Deimos, etc.)
  - Suffix list: Greek letters, Roman numerals, Latin ordinals
  - Format: `{prefix} {suffix}`

### Random Generation
- Uses Lehmer32 algorithm for deterministic random generation
- Seed-based system ensures reproducible results
- Checksum verification for universe consistency

### Performance
- Efficient physics calculations
- Optimized rendering pipeline
- Memory management
- Chunk loading/unloading
- Level of detail system

### Scalability
- Support for multiple star systems
- Extensible body type system
- Modular component architecture
- Configurable parameters

### Maintainability
- Clear code organization
- Modular design
- Consistent naming conventions
- Comprehensive documentation
- Debug tools and logging

### User Experience
- Intuitive controls
- Responsive interface
- Clear feedback
- Helpful tooltips
- Consistent behavior 