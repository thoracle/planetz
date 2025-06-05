# 🏗️ Refactoring UML Diagrams - BEFORE State

## Overview

This document shows the current monolithic architecture of the three major files targeted for refactoring:
- `app.js` (2,245 lines)
- `CardInventoryUI.js` (1,462 lines) 
- `DamageControlInterface.js` (1,285 lines)

## 1. Current app.js Architecture (BEFORE)

### Class Diagram - Current Monolithic Structure

```mermaid
classDiagram
    class App {
        -scene: THREE.Scene
        -camera: THREE.PerspectiveCamera
        -renderer: THREE.WebGLRenderer
        -controls: OrbitControls
        -planetGenerator: PlanetGenerator
        -viewManager: ViewManager
        -solarSystemManager: SolarSystemManager
        -debugManager: DebugManager
        -gui: dat.GUI
        -warpGui: dat.GUI
        -editMode: boolean
        -warpControlMode: boolean
        -stats: Stats
        -atmosphere: Atmosphere
        -cloud: Cloud
        
        +init()
        +animate()
        +updateDebugInfo()
        +toggleEditMode()
        +toggleWarpControlMode()
        +toggleDebugMode()
        +cycleCelestialBody()
        +updateGUIControls(body)
        +createPlanetGeometry()
        +updatePlanetGeometry()
        +handleTerraforming(event)
        +handleKeyDown(event)
        +handleMouseEvent(event)
        +logMouseEvent(type, event)
        +resize()
        +setupEventListeners()
        +createMainGUI()
        +createWarpGUI()
        +updatePlanetParameters()
    }

    class DebugManager {
        -stats: Stats
        -debugInfo: HTMLElement
        -visible: boolean
        -axesHelper: THREE.AxesHelper
        -gridHelper: THREE.GridHelper
        
        +initialize(scene, uiContainer)
        +toggle()
        +updateInfo()
        +setEditMode(enabled)
        +update()
    }

    class PlanetGenerator {
        +generateDensityField()
        +generateMesh()
        +updateGeometry()
    }

    class ViewManager {
        +setEditMode(enabled)
        +getCurrentView()
        +switchView(view)
    }

    class SolarSystemManager {
        +getCelestialBodies()
        +setCurrentEditBody(body)
        +getDebugInfo()
    }

    App --> DebugManager : contains
    App --> PlanetGenerator : uses
    App --> ViewManager : uses
    App --> SolarSystemManager : uses
    App --> "1..*" THREE.Object3D : manages
```

### Sequence Diagram - Current Application Initialization

```mermaid
sequenceDiagram
    participant Main as Main Script
    participant App as App (Monolithic)
    participant Three as THREE.js
    participant Debug as DebugManager
    participant Planet as PlanetGenerator
    participant View as ViewManager
    participant Solar as SolarSystemManager

    Main->>App: Initialize Application
    App->>Three: Create Scene, Camera, Renderer
    App->>Debug: Initialize Debug System
    App->>Planet: Initialize Planet Generator
    App->>View: Initialize View Manager
    App->>Solar: Initialize Solar System
    App->>App: Setup Event Listeners
    App->>App: Create GUI Controls
    App->>App: Start Animation Loop
    
    loop Animation Loop
        App->>App: Update Debug Info
        App->>Three: Render Scene
        App->>Debug: Update Stats
        App->>Planet: Update Geometry (if needed)
        App->>View: Handle View Updates
    end
```

### Problem Areas in Current Structure

```mermaid
graph TD
    A[app.js - 2,245 lines] --> B[Scene Management - 400+ lines]
    A --> C[Planet Generation - 500+ lines]
    A --> D[Input Handling - 300+ lines]
    A --> E[Debug Management - 200+ lines]
    A --> F[GUI Management - 400+ lines]
    A --> G[Mode Management - 200+ lines]
    A --> H[Animation Loop - 150+ lines]
    A --> I[Event Handling - 295+ lines]
    
    B --> J[High Coupling]
    C --> J
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    
    J --> K[Difficult to Test]
    J --> L[Hard to Maintain]
    J --> M[Code Duplication]
```

## 2. Current CardInventoryUI.js Architecture (BEFORE)

### Class Diagram - Current Monolithic Structure

```mermaid
classDiagram
    class CardInventoryUI {
        -containerId: string
        -container: HTMLElement
        -inventory: CardInventory
        -shipSlots: Map
        -credits: number
        -currentShipType: string
        -currentShipConfig: Object
        -isShopMode: boolean
        -dockedLocation: Object
        -dockingInterface: Object
        -playerData: PlayerData
        
        +constructor(containerId)
        +init()
        +showAsShop(dockedLocation, dockingInterface)
        +showAsInventory(dockedLocation, dockingInterface)
        +hideShop()
        +hideInventory()
        +loadTestData()
        +createUI()
        +createShipSlotsPanel()
        +createInventoryPanel()
        +createCollectionStats()
        +render()
        +renderInventoryGrid()
        +renderShipSlots()
        +setupEventListeners()
        +handleDragStart(event)
        +handleDragOver(event)
        +handleDrop(event)
        +handleCardClick(card)
        +installCard(card, slotId)
        +removeCard(slotId)
        +switchShip(shipType)
        +loadShipConfiguration(shipType)
        +loadCurrentShipConfiguration(ship)
        +saveShipConfiguration()
        +validateBuild()
        +isCardCompatibleWithSlot(cardType, slotType)
        +updateCollectionStats()
        +updateCreditsDisplay()
        +generateSlotTypeMapping()
        +createShipTypeOptions()
        +playUpgradeSound()
        +initializeAudio()
    }

    class CardInventory {
        +addCard(card)
        +removeCard(card)
        +getDiscoveredCards()
        +generateRandomCard()
        +generateSpecificCard(type, rarity)
    }

    class PlayerData {
        -ownedShips: Set
        -credits: number
        -shipConfigurations: Map
        
        +getShipConfiguration(shipType)
        +setShipConfiguration(shipType, config)
        +addOwnedShip(shipType)
        +hasShip(shipType)
    }

    CardInventoryUI --> CardInventory : uses
    CardInventoryUI --> PlayerData : uses
    CardInventoryUI --> "1..*" HTMLElement : manages
```

### Sequence Diagram - Current Card Installation Process

```mermaid
sequenceDiagram
    participant User as User
    participant UI as CardInventoryUI
    participant DOM as DOM Elements
    participant Data as CardInventory
    participant Player as PlayerData
    participant Ship as Ship System

    User->>DOM: Drag Card to Slot
    DOM->>UI: handleDragStart()
    DOM->>UI: handleDragOver()
    DOM->>UI: handleDrop()
    UI->>UI: validateDrop()
    UI->>UI: isCardCompatibleWithSlot()
    UI->>UI: installCard()
    UI->>Data: updateInventory()
    UI->>Player: saveShipConfiguration()
    UI->>UI: renderShipSlots()
    UI->>UI: renderInventoryGrid()
    UI->>UI: updateCollectionStats()
    UI->>Ship: refreshEquipment()
    UI->>UI: playUpgradeSound()
```

### Problem Areas in Current Structure

```mermaid
graph TD
    A[CardInventoryUI.js - 1,462 lines] --> B[UI Rendering - 400+ lines]
    A --> C[Drag & Drop Logic - 300+ lines]
    A --> D[Data Management - 350+ lines]
    A --> E[Ship Configuration - 250+ lines]
    A --> F[Audio & Effects - 100+ lines]
    A --> G[Shop Mode Logic - 200+ lines]
    
    B --> H[Mixed Responsibilities]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[Hard to Test UI Logic]
    H --> J[Complex Dependencies]
    H --> K[Tight Coupling]
```

## 3. Current DamageControlInterface.js Architecture (BEFORE)

### Class Diagram - Current Monolithic Structure

```mermaid
classDiagram
    class DamageControlInterface {
        -isVisible: boolean
        -ship: Ship
        -isDocked: boolean
        -selectedSystem: string
        -refreshInterval: number
        -repairKits: Object
        -damageLog: Array
        -maxLogEntries: number
        -boundKeyHandler: Function
        
        +constructor()
        +show(ship, isDocked)
        +hide()
        +toggle()
        +handleKeyPress(event)
        +createInterface()
        +removeInterface()
        +updateInterface()
        +updateSystemsGrid()
        +updateSystemDetails()
        +updateRepairSection()
        +updateDamageLog()
        +createSystemCard(systemName, systemStatus)
        +selectSystem(systemName)
        +repairSystem(systemName, repairType)
        +calculateRepairCost(systemName, repairType)
        +formatSystemName(name)
        +getSystemStatusIcon(status)
        +getSystemStatusText(status)
        +getSystemStatusClass(status)
        +getStatusClass(healthPercent)
        +addDamageLogEntry(message, type)
        +bindEvents()
        +addCSS()
        +createInterfaceHTML()
        +createSystemsGridHTML()
        +createSystemDetailsHTML()
        +createRepairSectionHTML()
        +createDamageLogHTML()
    }

    class Ship {
        +getSystems()
        +getSystemHealth(name)
        +repairSystem(name, amount)
        +getCredits()
        +deductCredits(amount)
    }

    DamageControlInterface --> Ship : manages
    DamageControlInterface --> "1..*" HTMLElement : creates
```

### Sequence Diagram - Current Repair Process

```mermaid
sequenceDiagram
    participant User as User
    participant DCI as DamageControlInterface
    participant Ship as Ship
    participant DOM as DOM Elements
    participant Audio as Audio System

    User->>DCI: Press 'D' (Toggle Interface)
    DCI->>DCI: createInterface()
    DCI->>Ship: getSystems()
    DCI->>DCI: updateSystemsGrid()
    DCI->>DOM: Render System Cards
    
    User->>DOM: Click System Card
    DOM->>DCI: selectSystem()
    DCI->>Ship: getSystemHealth()
    DCI->>DCI: updateSystemDetails()
    DCI->>DCI: calculateRepairCost()
    
    User->>DOM: Click Repair Button
    DOM->>DCI: repairSystem()
    DCI->>Ship: repairSystem()
    DCI->>Ship: deductCredits()
    DCI->>DCI: addDamageLogEntry()
    DCI->>DCI: updateInterface()
    DCI->>Audio: playRepairSound()
```

### Problem Areas in Current Structure

```mermaid
graph TD
    A[DamageControlInterface.js - 1,285 lines] --> B[UI Creation - 400+ lines]
    A --> C[System Monitoring - 300+ lines]
    A --> D[Repair Logic - 250+ lines]
    A --> E[CSS Generation - 200+ lines]
    A --> F[Event Handling - 150+ lines]
    
    B --> G[Monolithic Responsibilities]
    C --> G
    D --> G
    E --> G
    F --> G
    
    G --> H[Hard to Unit Test]
    G --> I[CSS Mixed with Logic]
    G --> J[Complex State Management]
```

## 4. Cross-System Dependencies (BEFORE)

### System Interaction Diagram

```mermaid
graph TB
    subgraph "app.js Monolith"
        A1[Scene Management]
        A2[Planet Generation]
        A3[Input Handling]
        A4[GUI Management]
        A5[Debug System]
        A6[Animation Loop]
    end
    
    subgraph "CardInventoryUI.js Monolith"
        B1[UI Rendering]
        B2[Drag & Drop]
        B3[Data Management]
        B4[Ship Configuration]
    end
    
    subgraph "DamageControlInterface.js Monolith"
        C1[Damage Display]
        C2[Repair Management]
        C3[System Monitoring]
    end
    
    A3 --> B1 : Key Events
    A3 --> C1 : Toggle Interface
    A4 --> B1 : UI Updates
    B4 --> C3 : Ship State
    A1 --> C1 : Scene Updates
    B3 --> A6 : State Changes
    
    style A1 fill:#ffcccc
    style A2 fill:#ffcccc
    style A3 fill:#ffcccc
    style A4 fill:#ffcccc
    style A5 fill:#ffcccc
    style A6 fill:#ffcccc
    style B1 fill:#ccffcc
    style B2 fill:#ccffcc
    style B3 fill:#ccffcc
    style B4 fill:#ccffcc
    style C1 fill:#ccccff
    style C2 fill:#ccccff
    style C3 fill:#ccccff
```

## 5. Current Issues Summary

### Code Complexity Metrics (BEFORE)

| File | Lines | Classes | Methods | Responsibilities | Coupling Level |
|------|-------|---------|---------|------------------|----------------|
| app.js | 2,245 | 2 | 25+ | 8 major areas | Very High |
| CardInventoryUI.js | 1,462 | 3 | 35+ | 6 major areas | High |
| DamageControlInterface.js | 1,285 | 1 | 20+ | 5 major areas | Medium |

### Key Problems to Address

1. **Single Responsibility Violation**: Each file handles multiple concerns
2. **High Coupling**: Components tightly integrated, hard to test in isolation
3. **Code Duplication**: Similar patterns repeated across files
4. **Maintenance Difficulty**: Large files hard to navigate and understand
5. **Testing Challenges**: Monolithic structure makes unit testing difficult
6. **Performance Issues**: Large files impact loading and parsing time

---

*This "BEFORE" state documentation will be used as the baseline for our refactoring transformation to the modular "AFTER" state.* 