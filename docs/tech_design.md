# Technical Design Document

## Core Use Cases

### 1. Star System Generation and Management
- Generate a new star system with random seed
- Create and manage celestial bodies (star, planets, moons)
- Apply realistic orbital mechanics using Kepler's laws
- Handle gravitational interactions between bodies
- Manage spatial partitioning for efficient physics calculations

### 2. Celestial Body Visualization
- Render star with appropriate color and light emission
- Generate and render planets with procedural terrain
- Create and render moons with appropriate properties
- Apply atmospheric effects to planets
- Add cloud layers to planets
- Implement ocean rendering with wave effects

### 3. Camera and View Controls
- Free camera movement in normal mode
- Orbit controls for focused viewing
- Camera roll functionality (Option+Command+Drag)
- Zoom controls with mouse wheel
- Touch controls for mobile devices

### 4. Debug and Edit Modes

#### 4.1 Debug Mode (CTRL+D)
- Toggle debug information display
- Show FPS counter
- Display celestial body statistics
- Show debug helpers (axes, grid)
- Update debug panel in real-time

#### 4.2 Edit Mode (CTRL+E)
- Toggle edit panel
- Initialize GUI container
- Create property controls
- Add terraforming tools
- Handle input validation
- Update visual feedback
- Manage camera controls
- Handle touch interactions

#### 4.3 Tab Cycling in Edit Mode

```mermaid
sequenceDiagram
    participant User
    participant System
    participant UI
    participant SolarSystemManager
    participant GUI
    participant THREE

    User->>System: Press Tab Key
    System->>System: Prevent Default Event
    System->>SolarSystemManager: getCelestialBodies()
    SolarSystemManager-->>System: Array of THREE.Mesh objects
    
    System->>SolarSystemManager: getCurrentEditBody()
    SolarSystemManager-->>System: Current Body (THREE.Mesh)
    
    System->>System: Find Current Index
    System->>System: Calculate Next Index
    System->>SolarSystemManager: setCurrentEditBody(nextBody)
    
    System->>UI: Update GUI Title
    UI->>UI: Clear Existing Title
    UI->>UI: Set New Title Based on Body Type
    
    System->>GUI: updateGUIControls(nextBody)
    GUI->>GUI: Clear Existing Folders
    Note over GUI: Remove all folders from dat.GUI
    
    GUI->>SolarSystemManager: Find Body Key
    SolarSystemManager-->>GUI: Body Key (e.g., 'star', 'planet_1', 'moon_1_2')
    
    alt Body is Star
        GUI->>GUI: Create Star Properties Folder
        GUI->>THREE: Access geometry.parameters.radius
        THREE-->>GUI: Current Radius
        GUI->>GUI: Add Temperature Control (Default: 5000)
        GUI->>GUI: Add Radius Control
        Note over GUI: Store values in local params object
    else Body is Planet
        GUI->>GUI: Create Planet Properties Folder
        GUI->>THREE: Access geometry.parameters.radius
        THREE-->>GUI: Current Radius
        GUI->>GUI: Add Radius Control
        GUI->>GUI: Add Rotation Speed Control
        GUI->>GUI: Add Orbit Speed Control
        Note over GUI: Store values in local params object
    else Body is Moon
        GUI->>GUI: Create Moon Properties Folder
        GUI->>THREE: Access geometry.parameters.radius
        THREE-->>GUI: Current Radius
        GUI->>GUI: Add Radius Control
        GUI->>GUI: Add Rotation Speed Control
        GUI->>GUI: Add Orbit Speed Control
        Note over GUI: Store values in local params object
    end
    
    Note over GUI: Add onChange Handlers for Each Control
    
    alt Property Changed is Radius
        GUI->>THREE: Create New SphereGeometry
        GUI->>THREE: Dispose Old Geometry
        GUI->>THREE: Set New Geometry
    else Property Changed is Temperature (Star Only)
        GUI->>THREE: Update Material Color
        GUI->>THREE: Update Emissive Color
    else Property Changed is Rotation/Orbit Speed
        GUI->>SolarSystemManager: Store Speed in rotationSpeeds/orbitalSpeeds Map
    end
    
    Note over System: Animation Loop Updates
    loop Every Frame
        SolarSystemManager->>SolarSystemManager: Update Body Positions
        SolarSystemManager->>SolarSystemManager: Apply Rotation Speeds
        SolarSystemManager->>SolarSystemManager: Apply Orbital Speeds
    end
```

### 5. Planet Customization
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

### 6. Performance Optimization
- Spatial partitioning for physics calculations
- Chunk-based terrain generation
- Level of detail management
- Efficient rendering techniques
- Memory management for celestial bodies

### 7. User Interface
- Responsive design
- Modal dialogs for settings
- Tooltips for controls
- Keyboard shortcuts
- Touch interface support
- Debug information display
- Edit mode controls

### 8. Data Management
- Star system data structure
- Celestial body properties
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

### 1. Star System Generation and Management

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Physics
    participant Renderer
    participant UI

    User->>System: Generate New System
    System->>System: Create Random Seed
    System->>System: Generate Star Data
    System->>System: Generate Planet Data
    System->>System: Generate Moon Data
    System->>Physics: Initialize Orbital Mechanics
    System->>Renderer: Create Star Mesh
    System->>Renderer: Create Planet Meshes
    System->>Renderer: Create Moon Meshes
    System->>UI: Update Debug Info
    System->>User: Display New System
```

### 2. Celestial Body Visualization

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Renderer
    participant Physics

    loop Every Frame
        System->>Physics: Update Positions
        Physics->>System: Return New Positions
        System->>Renderer: Update Star Properties
        System->>Renderer: Update Planet Properties
        System->>Renderer: Update Moon Properties
        Renderer->>Renderer: Apply Atmospheric Effects
        Renderer->>Renderer: Apply Ocean Effects
        Renderer->>Renderer: Apply Cloud Layers
        Renderer->>User: Render Frame
    end
```

### 3. Camera and View Controls

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Camera
    participant UI

    User->>System: Mouse/Touch Input
    System->>Camera: Update Position
    Camera->>Camera: Calculate New View
    Camera->>System: Return View Matrix
    System->>UI: Update Camera Info
    System->>User: Update View
```

### 4. Debug and Edit Modes

#### 4.1 Debug Mode (CTRL+D)

```mermaid
sequenceDiagram
    participant User
    participant System
    participant UI
    participant Physics
    participant Renderer

    User->>System: Press CTRL+D
    System->>UI: Toggle Debug Mode
    UI->>UI: Show Debug Panel

    loop Every Frame
        System->>Physics: Get Body Positions
        Physics-->>System: Return Positions
        System->>System: Calculate Statistics
        System->>UI: Update Debug Info
        UI->>UI: Update Display
    end
```

#### 4.2 Edit Mode (CTRL+E)

```mermaid
sequenceDiagram
    participant User
    participant System
    participant UI
    participant Physics
    participant Renderer
    participant ViewManager

    User->>System: Press CTRL+E
    System->>ViewManager: Set Edit Mode
    ViewManager->>ViewManager: Hide Crosshairs
    ViewManager->>ViewManager: Enable Orbit Controls
    ViewManager->>ViewManager: Set Target to Origin
    System->>System: Show Debug Helpers
    System->>System: Add Edit Mode Class
    System->>UI: Toggle Edit Mode
    UI->>UI: Show Edit Panel
    UI->>UI: Initialize GUI Container
    UI->>UI: Create Title Element
    UI->>UI: Add Property Controls
    UI->>UI: Add Terraforming Tools
    UI->>UI: Add Save/Cancel Buttons
    UI->>UI: Position Panel Elements
    UI->>UI: Add Event Listeners
    UI->>UI: Initialize Tooltips
    UI->>UI: Setup Input Validation
    UI->>UI: Update Display

    System->>System: Get Celestial Bodies
    System->>System: Set Current Edit Body
    System->>System: Cycle Bodies
    System->>UI: Update Body Info
    UI->>UI: Update Title
    UI->>UI: Update Property Fields
    UI->>UI: Update Terraforming Tools
    UI->>UI: Validate Current Values
    UI->>UI: Update Tooltips
    UI->>UI: Update Display

    loop Animation Loop
        System->>ViewManager: Update Controls
        System->>System: Update Starfield
        System->>System: Update Solar System
        System->>System: Update Waves
        System->>System: Update Clouds
        System->>System: Update Atmosphere
        System->>System: Update Chunk Manager
        System->>UI: Update Debug Info
        System->>Renderer: Render Frame
    end

    User->>UI: Input Property Value
    UI->>UI: Validate Input
    alt Valid Input
        UI->>UI: Update Field Display
        UI->>UI: Show Success Indicator
    else Invalid Input
        UI->>UI: Show Error Message
        UI->>UI: Highlight Invalid Field
    end
    UI->>System: Submit Valid Changes
    System->>Physics: Update Body Properties
    Physics->>Renderer: Update Visual Properties
    Renderer->>Renderer: Update Display
    System->>UI: Update Display
    UI->>UI: Update Property Fields
    UI->>UI: Update Terraforming Tools
    UI->>UI: Update Tooltips
    UI->>UI: Update Display

    User->>UI: Use Terraforming Tool
    UI->>UI: Update Brush Preview
    UI->>UI: Show Tool Settings
    UI->>UI: Update Cursor
    UI->>UI: Update Display

    Note over User, Renderer: Camera Controls
    Note right of ViewManager: - Option+Drag: Orbit
    Note right of ViewManager: - Command+Drag: Pan
    Note right of ViewManager: - Option+Command+Drag: Roll
    Note right of ViewManager: - Two-finger drag: Zoom

    Note over User, Renderer: Event Prevention
    Note right of System: - Prevent default browser behaviors
    Note right of System: - Stop event propagation
    Note right of System: - Handle modifier keys
    Note right of System: - Prevent context menu

    Note over User, Renderer: Debug Helpers
    Note right of System: - Show axes helper
    Note right of System: - Show grid helper
    Note right of System: - Update debug info

    Note over User, Renderer: Touch Controls
    Note right of System: - Two-finger pinch: Zoom
    Note right of System: - Touch duration tracking
    Note right of System: - Distance calculation
```

#### 4.3 Tab Cycling in Edit Mode

```mermaid
sequenceDiagram
    participant User
    participant System
    participant UI
    participant SolarSystemManager
    participant GUI
    participant THREE

    User->>System: Press Tab Key
    System->>System: Prevent Default Event
    System->>SolarSystemManager: getCelestialBodies()
    SolarSystemManager-->>System: Array of THREE.Mesh objects
    
    System->>SolarSystemManager: getCurrentEditBody()
    SolarSystemManager-->>System: Current Body (THREE.Mesh)
    
    System->>System: Find Current Index
    System->>System: Calculate Next Index
    System->>SolarSystemManager: setCurrentEditBody(nextBody)
    
    System->>UI: Update GUI Title
    UI->>UI: Clear Existing Title
    UI->>UI: Set New Title Based on Body Type
    
    System->>GUI: updateGUIControls(nextBody)
    GUI->>GUI: Clear Existing Folders
    Note over GUI: Remove all folders from dat.GUI
    
    GUI->>SolarSystemManager: Find Body Key
    SolarSystemManager-->>GUI: Body Key (e.g., 'star', 'planet_1', 'moon_1_2')
    
    alt Body is Star
        GUI->>GUI: Create Star Properties Folder
        GUI->>THREE: Access geometry.parameters.radius
        THREE-->>GUI: Current Radius
        GUI->>GUI: Add Temperature Control (Default: 5000)
        GUI->>GUI: Add Radius Control
        Note over GUI: Store values in local params object
    else Body is Planet
        GUI->>GUI: Create Planet Properties Folder
        GUI->>THREE: Access geometry.parameters.radius
        THREE-->>GUI: Current Radius
        GUI->>GUI: Add Radius Control
        GUI->>GUI: Add Rotation Speed Control
        GUI->>GUI: Add Orbit Speed Control
        Note over GUI: Store values in local params object
    else Body is Moon
        GUI->>GUI: Create Moon Properties Folder
        GUI->>THREE: Access geometry.parameters.radius
        THREE-->>GUI: Current Radius
        GUI->>GUI: Add Radius Control
        GUI->>GUI: Add Rotation Speed Control
        GUI->>GUI: Add Orbit Speed Control
        Note over GUI: Store values in local params object
    end
    
    Note over GUI: Add onChange Handlers for Each Control
    
    alt Property Changed is Radius
        GUI->>THREE: Create New SphereGeometry
        GUI->>THREE: Dispose Old Geometry
        GUI->>THREE: Set New Geometry
    else Property Changed is Temperature (Star Only)
        GUI->>THREE: Update Material Color
        GUI->>THREE: Update Emissive Color
    else Property Changed is Rotation/Orbit Speed
        GUI->>SolarSystemManager: Store Speed in rotationSpeeds/orbitalSpeeds Map
    end
    
    Note over System: Animation Loop Updates
    loop Every Frame
        SolarSystemManager->>SolarSystemManager: Update Body Positions
        SolarSystemManager->>SolarSystemManager: Apply Rotation Speeds
        SolarSystemManager->>SolarSystemManager: Apply Orbital Speeds
    end
```

### 5. Planet Customization

```mermaid
sequenceDiagram
    participant User
    participant System
    participant UI
    participant Renderer
    participant Physics

    User->>System: Select Planet
    System->>UI: Show Customization Panel
    User->>UI: Adjust Parameters
    UI->>System: Update Parameters
    System->>Renderer: Update Terrain
    System->>Renderer: Update Atmosphere
    System->>Renderer: Update Ocean
    System->>Renderer: Update Clouds
    System->>Physics: Update Physical Properties
    System->>User: Display Changes
```

### 6. Performance Optimization

```mermaid
sequenceDiagram
    participant System
    participant Physics
    participant Renderer
    participant Memory

    loop Every Frame
        System->>Physics: Check Spatial Partitioning
        Physics->>System: Return Active Bodies
        System->>Renderer: Update LOD Levels
        System->>Memory: Manage Chunk Loading
        Memory->>Renderer: Provide Chunk Data
        Renderer->>System: Render Frame
    end
```

### 7. User Interface Management

```mermaid
sequenceDiagram
    participant User
    participant System
    participant UI
    participant Renderer

    User->>System: Interact with UI
    System->>UI: Process Input
    UI->>System: Update State
    System->>Renderer: Update Display
    System->>UI: Update UI Elements
    UI->>User: Show Feedback
```

### 8. Data Management

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Storage
    participant Physics

    User->>System: Request Data
    System->>Storage: Load System Data
    Storage->>System: Return Data
    System->>Physics: Initialize Physics
    System->>User: Display System
    loop On Changes
        System->>Storage: Save Updates
        Storage->>System: Confirm Save
    end
```

## Technical Considerations

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