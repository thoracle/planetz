# 🏗️ Refactoring UML Diagrams - AFTER State

## Overview

This document shows the target modular architecture after refactoring the three major monolithic files:
- `app.js` (2,245 lines) → **8-10 focused modules** (200-400 lines each)
- `CardInventoryUI.js` (1,462 lines) → **6-8 focused modules** (150-300 lines each)
- `DamageControlInterface.js` (1,285 lines) → **4-6 focused modules** (150-300 lines each)

## 1. Target app.js Architecture (AFTER)

### Class Diagram - New Modular Structure

```mermaid
classDiagram
    class ApplicationCore {
        -sceneManager: SceneManager
        -inputManager: InputManager
        -debugManager: DebugManager
        -gameLoop: GameLoop
        -modeManager: ModeManager
        -uiManager: UIManager
        -planetManager: PlanetGenerationManager
        -eventBus: EventBus
        -config: AppConfig
        
        +initialize()
        +start()
        +shutdown()
        +getModule(name)
    }

    class SceneManager {
        -scene: THREE.Scene
        -camera: THREE.PerspectiveCamera
        -renderer: THREE.WebGLRenderer
        -controls: OrbitControls
        
        +initializeScene()
        +updateScene(deltaTime)
        +resizeHandler()
        +getScene()
        +getCamera()
        +getRenderer()
    }

    class InputManager {
        -eventBus: EventBus
        -keyBindings: Map
        -mouseHandler: MouseHandler
        
        +setupEventListeners()
        +handleKeyDown(event)
        +handleMouseEvent(event)
        +bindKey(key, action)
        +unbindKey(key)
    }

    class DebugManager {
        -stats: Stats
        -debugInfo: HTMLElement
        -visible: boolean
        -helpers: Map
        
        +initialize(scene, container)
        +toggle()
        +updateInfo()
        +setEditMode(enabled)
        +addHelper(name, helper)
    }

    class GameLoop {
        -isRunning: boolean
        -lastFrameTime: number
        -frameCounter: number
        -eventBus: EventBus
        
        +start()
        +stop()
        +tick(currentTime)
        +getFPS()
    }

    class ModeManager {
        -currentMode: string
        -editMode: boolean
        -warpControlMode: boolean
        -eventBus: EventBus
        
        +setEditMode(enabled)
        +setWarpControlMode(enabled)
        +transitionTo(mode)
        +getCurrentMode()
    }

    class UIManager {
        -gui: dat.GUI
        -warpGui: dat.GUI
        -containers: Map
        -eventBus: EventBus
        
        +createMainGUI()
        +createWarpGUI()
        +updateGUIControls(body)
        +showGUI(name)
        +hideGUI(name)
    }

    class PlanetGenerationManager {
        -planetGenerator: PlanetGenerator
        -currentPlanet: Object
        -eventBus: EventBus
        
        +generatePlanet(config)
        +updatePlanetGeometry()
        +handleTerraforming(event)
        +getCurrentPlanet()
    }

    class EventBus {
        -listeners: Map
        
        +on(event, callback)
        +emit(event, data)
        +off(event, callback)
        +once(event, callback)
    }

    class AppConfig {
        +SCENE: Object
        +CAMERA: Object
        +DEBUG: Object
        +INPUT: Object
        +PERFORMANCE: Object
    }

    ApplicationCore --> SceneManager
    ApplicationCore --> InputManager
    ApplicationCore --> DebugManager
    ApplicationCore --> GameLoop
    ApplicationCore --> ModeManager
    ApplicationCore --> UIManager
    ApplicationCore --> PlanetGenerationManager
    ApplicationCore --> EventBus
    ApplicationCore --> AppConfig

    SceneManager ..> EventBus : publishes events
    InputManager ..> EventBus : publishes events
    GameLoop ..> EventBus : publishes events
    ModeManager ..> EventBus : publishes events
    UIManager ..> EventBus : subscribes to events
    PlanetGenerationManager ..> EventBus : publishes events
```

### Sequence Diagram - New Modular Initialization

```mermaid
sequenceDiagram
    participant Main as Main Script
    participant Core as ApplicationCore
    participant Event as EventBus
    participant Scene as SceneManager
    participant Input as InputManager
    participant Debug as DebugManager
    participant Loop as GameLoop
    participant Planet as PlanetGenerationManager

    Main->>Core: Initialize Application
    Core->>Event: Create Event Bus
    Core->>Scene: Initialize Scene Manager
    Scene->>Event: Emit "scene-ready"
    Core->>Input: Initialize Input Manager
    Input->>Event: Emit "input-ready"
    Core->>Debug: Initialize Debug Manager
    Debug->>Event: Emit "debug-ready"
    Core->>Planet: Initialize Planet Manager
    Planet->>Event: Emit "planet-ready"
    Core->>Loop: Initialize Game Loop
    Loop->>Event: Emit "loop-ready"
    
    Event->>Core: All systems ready
    Core->>Core: Start Application
    
    loop Game Loop
        Loop->>Scene: Update Scene
        Loop->>Debug: Update Debug Info
        Loop->>Event: Emit "frame-tick"
        Event->>Planet: Handle Frame Updates
        Scene->>Scene: Render Frame
    end
```

### Module Communication Pattern

```mermaid
graph TB
    subgraph "Event-Driven Architecture"
        EB[EventBus]
        AC[ApplicationCore]
    end
    
    subgraph "Core Modules"
        SM[SceneManager<br/>~300 lines]
        IM[InputManager<br/>~300 lines]
        DM[DebugManager<br/>~200 lines]
        GL[GameLoop<br/>~150 lines]
    end
    
    subgraph "Feature Modules"
        MM[ModeManager<br/>~250 lines]
        UM[UIManager<br/>~300 lines]
        PM[PlanetManager<br/>~400 lines]
    end
    
    subgraph "Shared Resources"
        AC2[AppConfig<br/>~100 lines]
        Utils[AppUtils<br/>~100 lines]
    end
    
    AC --> EB
    EB --> SM
    EB --> IM
    EB --> DM
    EB --> GL
    EB --> MM
    EB --> UM
    EB --> PM
    
    SM -.->|publishes| EB
    IM -.->|publishes| EB
    GL -.->|publishes| EB
    MM -.->|publishes| EB
    PM -.->|publishes| EB
    
    UM -.->|subscribes| EB
    DM -.->|subscribes| EB
    
    style EB fill:#ffeb3b
    style AC fill:#4caf50
```

## 2. Target CardInventoryUI.js Architecture (AFTER)

### Class Diagram - New Modular Structure

```mermaid
classDiagram
    class CardInventoryController {
        -dataManager: CardInventoryDataManager
        -uiRenderer: CardInventoryUIRenderer
        -dragDropManager: CardDragDropManager
        -shipManager: ShipSlotManager
        -shopManager: CardShopModeManager
        -audioManager: CardAudioManager
        -eventBus: EventBus
        
        +constructor(containerId)
        +initialize()
        +showAsShop(location, interface)
        +showAsInventory(location, interface)
        +switchShip(shipType)
        +installCard(card, slotId)
        +removeCard(slotId)
    }

    class CardInventoryDataManager {
        -inventory: CardInventory
        -playerData: PlayerData
        -currentShipType: string
        -credits: number
        
        +loadTestData()
        +loadShipConfiguration(shipType)
        +saveShipConfiguration()
        +validateBuild()
        +getInventory()
        +getPlayerData()
        +updateCredits(amount)
    }

    class CardInventoryUIRenderer {
        -container: HTMLElement
        -gridRenderer: CardGridRenderer
        -slotRenderer: ShipSlotRenderer
        -statsRenderer: StatsRenderer
        
        +createUI()
        +render()
        +updateDisplay()
        +createHeader()
        +createMainContent()
        +updateVisuals()
    }

    class CardDragDropManager {
        -controller: CardInventoryController
        -currentDragCard: Object
        -dropZones: Map
        -validationRules: ValidationRules
        
        +setupDragHandlers()
        +handleDragStart(event)
        +handleDragOver(event)
        +handleDrop(event)
        +validateDrop(card, slot)
    }

    class ShipSlotManager {
        -shipSlots: Map
        -currentShipConfig: Object
        -slotTypeMapping: Map
        
        +renderShipSlots()
        +updateSlotConfiguration()
        +generateSlotTypeMapping()
        +isSlotCompatible(cardType, slotType)
        +getAvailableSlots()
    }

    class CardGridRenderer {
        -gridContainer: HTMLElement
        -cardComponents: Map
        
        +renderGrid(cards)
        +createCardElement(card)
        +updateCardVisuals()
        +applyGridLayout()
        +handleCardSelection()
    }

    class CardShopModeManager {
        -controller: CardInventoryController
        -isShopMode: boolean
        -dockingInterface: Object
        
        +showAsShop(location, interface)
        +hideShop()
        +setupShopUI()
        +handleShopInteractions()
    }

    class CardAudioManager {
        -audioBuffers: Map
        -effectQueue: Array
        
        +playUpgradeSound()
        +playInstallSound()
        +playErrorSound()
        +triggerVisualEffect(type, element)
        +initializeAudio()
    }

    CardInventoryController --> CardInventoryDataManager
    CardInventoryController --> CardInventoryUIRenderer
    CardInventoryController --> CardDragDropManager
    CardInventoryController --> ShipSlotManager
    CardInventoryController --> CardShopModeManager
    CardInventoryController --> CardAudioManager

    CardInventoryUIRenderer --> CardGridRenderer
    CardDragDropManager --> ValidationRules
    ShipSlotManager --> SlotTypeMapping
```

### Sequence Diagram - New Modular Card Installation

```mermaid
sequenceDiagram
    participant User as User
    participant Controller as CardInventoryController
    participant DragDrop as CardDragDropManager
    participant Ship as ShipSlotManager
    participant Data as CardInventoryDataManager
    participant UI as CardInventoryUIRenderer
    participant Audio as CardAudioManager
    participant Events as EventBus

    User->>DragDrop: Drag Card to Slot
    DragDrop->>DragDrop: validateDrop()
    DragDrop->>Ship: isSlotCompatible()
    Ship-->>DragDrop: validation result
    DragDrop->>Controller: installCard()
    Controller->>Data: updateInventory()
    Controller->>Ship: updateSlotConfiguration()
    Controller->>Events: emit("card-installed")
    Events->>UI: handle("card-installed")
    UI->>UI: updateDisplay()
    Events->>Audio: handle("card-installed")
    Audio->>Audio: playInstallSound()
    Controller->>Data: saveShipConfiguration()
```

### Module Dependency Graph

```mermaid
graph TB
    subgraph "UI Layer"
        CIC[CardInventoryController<br/>~200 lines]
        CIUR[CardInventoryUIRenderer<br/>~300 lines]
        CGR[CardGridRenderer<br/>~200 lines]
    end
    
    subgraph "Business Logic Layer"
        CIDM[CardInventoryDataManager<br/>~250 lines]
        CDDM[CardDragDropManager<br/>~250 lines]
        SSM[ShipSlotManager<br/>~200 lines]
    end
    
    subgraph "Feature Layer"
        CSMM[CardShopModeManager<br/>~150 lines]
        CAM[CardAudioManager<br/>~100 lines]
    end
    
    subgraph "Shared"
        VR[ValidationRules<br/>~50 lines]
        STM[SlotTypeMapping<br/>~50 lines]
    end
    
    CIC --> CIUR
    CIC --> CIDM
    CIC --> CDDM
    CIC --> SSM
    CIC --> CSMM
    CIC --> CAM
    
    CIUR --> CGR
    CDDM --> VR
    SSM --> STM
    
    style CIC fill:#4caf50
    style CIDM fill:#2196f3
    style CIUR fill:#ff9800
```

## 3. Target DamageControlInterface.js Architecture (AFTER)

### Class Diagram - New Modular Structure

```mermaid
classDiagram
    class DamageControlController {
        -uiManager: DamageControlUIManager
        -systemMonitor: SystemHealthMonitor
        -repairManager: RepairManager
        -visualManager: DamageVisualizationManager
        -eventBus: EventBus
        
        +show(ship, isDocked)
        +hide()
        +toggle()
        +selectSystem(systemName)
        +repairSystem(systemName, type)
        +updateInterface()
    }

    class SystemHealthMonitor {
        -systems: Map
        -damageLog: Array
        -refreshInterval: number
        -ship: Ship
        
        +updateSystemStatus()
        +trackDamage(system, damage)
        +getSystemHealth(system)
        +addDamageLogEntry(message, type)
        +startMonitoring()
        +stopMonitoring()
    }

    class DamageControlUIManager {
        -interface: HTMLElement
        -systemCards: Map
        -selectedSystem: string
        -stylesManager: DamageControlStyles
        
        +createInterface()
        +removeInterface()
        +updateInterface()
        +updateSystemsGrid()
        +bindEvents()
        +handleSystemSelection(system)
    }

    class RepairManager {
        -repairKits: Map
        -repairQueue: Array
        -costs: Map
        -ship: Ship
        
        +calculateRepairCost(system, type)
        +executeRepair(system, type)
        +manageRepairQueue()
        +getAvailableRepairKits()
        +validateRepair(system, type)
    }

    class DamageVisualizationManager {
        -visualEffects: Map
        -indicators: Map
        -healthBars: Map
        
        +showDamageEffect(system)
        +updateHealthBars()
        +createStatusIcons()
        +animateRepair(system)
        +clearEffects()
    }

    class DamageControlStyles {
        -styleSheet: CSSStyleSheet
        -isInjected: boolean
        
        +generateStylesheet()
        +addToDocument()
        +removeFromDocument()
        +updateTheme(theme)
    }

    class SystemCard {
        -element: HTMLElement
        -systemName: string
        -healthBar: HealthBar
        
        +render(systemData)
        +updateHealth(health)
        +setSelected(selected)
        +bindEvents()
    }

    DamageControlController --> SystemHealthMonitor
    DamageControlController --> DamageControlUIManager
    DamageControlController --> RepairManager
    DamageControlController --> DamageVisualizationManager

    DamageControlUIManager --> DamageControlStyles
    DamageControlUIManager --> "1..*" SystemCard
    SystemCard --> HealthBar
```

### Sequence Diagram - New Modular Repair Process

```mermaid
sequenceDiagram
    participant User as User
    participant Controller as DamageControlController
    participant UI as DamageControlUIManager
    participant Monitor as SystemHealthMonitor
    participant Repair as RepairManager
    participant Visual as DamageVisualizationManager
    participant Ship as Ship
    participant Events as EventBus

    User->>Controller: Press 'D' (Toggle Interface)
    Controller->>UI: createInterface()
    Controller->>Monitor: startMonitoring()
    Monitor->>Ship: getSystems()
    Ship-->>Monitor: system data
    Monitor->>Events: emit("systems-updated")
    Events->>UI: handle("systems-updated")
    UI->>UI: updateSystemsGrid()
    
    User->>UI: Click System Card
    UI->>Controller: selectSystem()
    Controller->>Monitor: getSystemHealth()
    Controller->>Repair: calculateRepairCost()
    Controller->>UI: updateSystemDetails()
    
    User->>UI: Click Repair Button
    UI->>Controller: repairSystem()
    Controller->>Repair: executeRepair()
    Repair->>Ship: repairSystem()
    Repair->>Ship: deductCredits()
    Repair->>Events: emit("system-repaired")
    Events->>Visual: handle("system-repaired")
    Visual->>Visual: animateRepair()
    Events->>Monitor: handle("system-repaired")
    Monitor->>Monitor: updateSystemStatus()
    Events->>UI: handle("system-repaired")
    UI->>UI: updateInterface()
```

### Module Separation Benefits

```mermaid
graph TB
    subgraph "Control Layer"
        DCC[DamageControlController<br/>~200 lines]
    end
    
    subgraph "Data Layer"
        SHM[SystemHealthMonitor<br/>~300 lines]
        RM[RepairManager<br/>~250 lines]
    end
    
    subgraph "Presentation Layer"
        DCUM[DamageControlUIManager<br/>~400 lines]
        DVM[DamageVisualizationManager<br/>~200 lines]
        DCS[DamageControlStyles<br/>~100 lines]
    end
    
    subgraph "Component Layer"
        SC[SystemCard<br/>~80 lines]
        HB[HealthBar<br/>~60 lines]
    end
    
    DCC --> SHM
    DCC --> RM
    DCC --> DCUM
    DCC --> DVM
    
    DCUM --> DCS
    DCUM --> SC
    SC --> HB
    
    style DCC fill:#4caf50
    style SHM fill:#2196f3
    style DCUM fill:#ff9800
    style DVM fill:#9c27b0
```

## 4. Cross-System Architecture (AFTER)

### Event-Driven Communication Pattern

```mermaid
graph TB
    subgraph "Global Event Bus"
        GEB[GlobalEventBus<br/>Centralized Communication]
    end
    
    subgraph "App Modules"
        AC[ApplicationCore]
        SM[SceneManager]
        IM[InputManager]
        GL[GameLoop]
    end
    
    subgraph "Card System Modules"
        CIC[CardInventoryController]
        CIDM[CardInventoryDataManager]
        CDDM[CardDragDropManager]
    end
    
    subgraph "Damage Control Modules"
        DCC[DamageControlController]
        SHM[SystemHealthMonitor]
        RM[RepairManager]
    end
    
    subgraph "Shared Services"
        AudioSvc[AudioService]
        StorageSvc[StorageService]
        ValidationSvc[ValidationService]
    end
    
    GEB <--> AC
    GEB <--> SM
    GEB <--> IM
    GEB <--> GL
    GEB <--> CIC
    GEB <--> CIDM
    GEB <--> CDDM
    GEB <--> DCC
    GEB <--> SHM
    GEB <--> RM
    
    AudioSvc <--> GEB
    StorageSvc <--> GEB
    ValidationSvc <--> GEB
    
    style GEB fill:#ffeb3b
    style AudioSvc fill:#e91e63
    style StorageSvc fill:#e91e63
    style ValidationSvc fill:#e91e63
```

### Dependency Injection Container

```mermaid
classDiagram
    class ServiceContainer {
        -services: Map
        -singletons: Map
        -factories: Map
        
        +register(name, factory, options)
        +get(name)
        +has(name)
        +createScope()
        +dispose()
    }

    class ModuleFactory {
        -container: ServiceContainer
        
        +createApplicationCore()
        +createCardInventoryController()
        +createDamageControlController()
        +wireUpDependencies()
    }

    class ServiceRegistry {
        +registerCoreServices()
        +registerUIServices()
        +registerDataServices()
        +registerAudioServices()
    }

    ServiceContainer --> ModuleFactory
    ModuleFactory --> ServiceRegistry
    ServiceRegistry --> "1..*" Service
```

## 5. Benefits of New Architecture

### Improved Metrics (AFTER)

| Module | Lines | Responsibilities | Coupling Level | Testability |
|--------|-------|------------------|----------------|-------------|
| ApplicationCore | ~200 | 1 (Orchestration) | Low | High |
| SceneManager | ~300 | 1 (Scene Management) | Low | High |
| CardInventoryController | ~200 | 1 (Card Coordination) | Low | High |
| SystemHealthMonitor | ~300 | 1 (Health Monitoring) | Low | High |
| DamageControlUIManager | ~400 | 1 (Damage UI) | Low | High |

### Quality Improvements

```mermaid
graph LR
    subgraph "BEFORE (Problems)"
        A1[Monolithic Files<br/>2000+ lines]
        A2[High Coupling]
        A3[Multiple Responsibilities]
        A4[Hard to Test]
        A5[Difficult Maintenance]
    end
    
    subgraph "AFTER (Solutions)"
        B1[Focused Modules<br/>100-400 lines]
        B2[Loose Coupling<br/>Event-Driven]
        B3[Single Responsibility<br/>Clear Purpose]
        B4[Highly Testable<br/>Injectable Dependencies]
        B5[Easy Maintenance<br/>Clear Structure]
    end
    
    A1 -.->|Refactor| B1
    A2 -.->|Refactor| B2
    A3 -.->|Refactor| B3
    A4 -.->|Refactor| B4
    A5 -.->|Refactor| B5
    
    style A1 fill:#ffcdd2
    style A2 fill:#ffcdd2
    style A3 fill:#ffcdd2
    style A4 fill:#ffcdd2
    style A5 fill:#ffcdd2
    style B1 fill:#c8e6c9
    style B2 fill:#c8e6c9
    style B3 fill:#c8e6c9
    style B4 fill:#c8e6c9
    style B5 fill:#c8e6c9
```

### Testing Strategy (AFTER)

```mermaid
graph TB
    subgraph "Unit Tests"
        UT1[ApplicationCore Tests]
        UT2[SceneManager Tests]
        UT3[CardController Tests]
        UT4[SystemMonitor Tests]
    end
    
    subgraph "Integration Tests"
        IT1[Module Communication Tests]
        IT2[Event Bus Tests]
        IT3[Service Container Tests]
        IT4[Cross-Module Workflow Tests]
    end
    
    subgraph "Component Tests"
        CT1[UI Component Tests]
        CT2[Card Grid Tests]
        CT3[System Card Tests]
        CT4[Health Bar Tests]
    end
    
    subgraph "E2E Tests"
        E2E1[Complete User Workflows]
        E2E2[Ship Configuration Tests]
        E2E3[Damage Control Tests]
        E2E4[Card Installation Tests]
    end
    
    UT1 --> IT1
    UT2 --> IT1
    UT3 --> IT2
    UT4 --> IT2
    
    IT1 --> E2E1
    IT2 --> E2E2
    CT1 --> E2E3
    CT2 --> E2E4
```

## 6. Migration Strategy

### Phase-by-Phase Transformation

```mermaid
gantt
    title Refactoring Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: app.js
    Extract Config & EventBus     :2024-01-01, 2d
    Extract DebugManager         :2024-01-03, 1d
    Extract SceneManager         :2024-01-04, 2d
    Extract PlanetManager        :2024-01-06, 2d
    Extract InputManager         :2024-01-08, 2d
    Extract ModeManager          :2024-01-10, 1d
    Extract UIManager            :2024-01-11, 2d
    Extract GameLoop             :2024-01-13, 1d
    Create ApplicationCore       :2024-01-14, 2d
    Integration Testing          :2024-01-16, 2d
    
    section Phase 2: CardInventoryUI
    Extract DataManager          :2024-01-18, 2d
    Extract DragDropManager      :2024-01-20, 1d
    Extract ShipSlotManager      :2024-01-21, 1d
    Extract UIRenderer           :2024-01-22, 1d
    Extract GridRenderer         :2024-01-23, 1d
    Extract ShopModeManager      :2024-01-24, 1d
    Extract AudioManager         :2024-01-25, 1d
    Create Controller            :2024-01-26, 2d
    
    section Phase 3: DamageControl
    Extract StylesManager        :2024-01-28, 1d
    Extract SystemMonitor        :2024-01-29, 1d
    Extract RepairManager        :2024-01-30, 1d
    Extract VisualizationManager :2024-01-31, 1d
    Extract UIManager            :2024-02-01, 1d
    Create Controller            :2024-02-02, 1d
```

---

**🎯 Transformation Success Metrics:**
- ✅ All files under 500 lines
- ✅ Single responsibility per module
- ✅ Event-driven communication
- ✅ 90%+ test coverage maintained
- ✅ Zero functionality regression
- ✅ Improved performance and maintainability

*This "AFTER" state represents the target architecture that will result from our systematic refactoring approach.* 