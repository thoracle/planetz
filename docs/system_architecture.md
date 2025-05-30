# System Architecture Documentation

## Overview
This document contains UML diagrams illustrating the architecture of the Planetz NFT card collection spaceship system.

## NFT Card Collection System

### Class Diagram - Core Card System

```mermaid
classDiagram
    class NFTCard {
        +String tokenId
        +String cardType
        +String rarity
        +Number quantity
        +Boolean discovered
        +Object metadata
        +String name
        +String description
        +String image
        +Array attributes
        +constructor(cardType, rarity, tokenId)
        +isDiscovered() Boolean
        +getMetadata() Object
    }

    class CardInventory {
        +Map cards
        +Set discoveredTypes
        +addCard(nftCard) void
        +getCardCount(cardType) Number
        +canUpgrade(cardType, currentLevel) Boolean
        +getUpgradeRequirement(cardType, level) Number
        +getDiscoveredTypes() Array
        +getUndiscoveredTypes() Array
        +getAllCardTypes() Array
    }

    class CardCollection {
        +CardInventory inventory
        +Map cardCounts
        +Array discoveredCards
        +discoverCard(cardType) void
        +addCards(cardType, quantity) void
        +getStackCount(cardType) Number
        +canUpgradeSystem(cardType, level) Boolean
        +upgradeSystem(cardType, credits) Boolean
    }

    class DropSystem {
        +Map dropRates
        +Map systemInventory
        +generateDrop() NFTCard
        +updateInventory(cardType, quantity) void
        +getAvailableCards() Array
        +isCardAvailable(cardType) Boolean
    }

    CardInventory o-- NFTCard : contains_many
    CardCollection --> CardInventory : manages
    DropSystem --> NFTCard : creates
    DropSystem --> CardCollection : provides_drops
```

### Sequence Diagram - Card Discovery and Upgrade

```mermaid
sequenceDiagram
    participant Player
    participant CardUI as Card_UI
    participant Collection as CardCollection
    participant Inventory as CardInventory
    participant Drop as DropSystem
    participant Ship as Ship

    Player->>Drop: Complete mission/loot
    Drop->>Drop: Generate random drop
    Drop->>Collection: addCard(newCard)
    Collection->>Inventory: addCard(newCard)
    
    alt Card not discovered
        Inventory->>Inventory: discoverCard(cardType)
        Inventory->>CardUI: Show discovery animation
    end
    
    CardUI->>CardUI: Update card stack display
    
    Player->>CardUI: Attempt upgrade
    CardUI->>Collection: canUpgradeSystem(cardType, level)
    Collection->>Inventory: getCardCount(cardType)
    
    alt Sufficient cards
        Collection->>Ship: upgradeSystem(cardType, newLevel)
        Ship->>Ship: updateSystemStats()
        CardUI->>CardUI: Show upgrade success
    else Insufficient cards
        CardUI->>CardUI: Show requirement message
    end
```

## Ship Management System

### Class Diagram - Ship and System Architecture

```mermaid
classDiagram
    class Ship {
        +String shipType
        +String name
        +Number maxSlots
        +Number maxEnergy
        +Number energyRechargeRate
        +Number maxHull
        +Map slots
        +Map systems
        +Number currentEnergy
        +Number currentHull
        +constructor(shipType, config)
        +installSystem(slotId, cardType, level) Boolean
        +removeSystem(slotId) Boolean
        +validateBuild() ValidationResult
        +canLaunch() Boolean
        +getSystemByType(systemType) System
        +getAvailableSlots() Array
    }

    class SystemSlot {
        +String slotId
        +String installedSystem
        +Boolean isEmpty
        +install(systemType) Boolean
        +remove() Boolean
        +getSystem() System
    }

    class System {
        +String systemType
        +Number level
        +Number health
        +Boolean isActive
        +Number energyConsumption
        +Object stats
        +constructor(systemType, level)
        +activate() Boolean
        +deactivate() void
        +takeDamage(amount) void
        +repair(amount) void
        +getEffectiveness() Number
        +upgrade(newLevel) void
    }

    class ShipCollection {
        +Array ownedShips
        +Ship activeShip
        +addShip(shipType, name) Ship
        +selectShip(shipId) Boolean
        +getShip(shipId) Ship
        +getAllShips() Array
        +canSwitchShip() Boolean
    }

    class BuildValidator {
        +validateBuild(ship) ValidationResult
        +hasEssentialSystems(ship) Boolean
        +checkEnergyBalance(ship) Boolean
        +checkSlotCapacity(ship) Boolean
        +getValidationErrors(ship) Array
    }

    Ship o-- SystemSlot : contains_many
    SystemSlot --> System : holds_one
    ShipCollection o-- Ship : manages_many
    BuildValidator --> Ship : validates
    Ship --> BuildValidator : uses
```

### State Diagram - Ship Configuration States

```mermaid
stateDiagram-v2
    [*] --> Docked
    
    Docked --> Configuring : Edit Ship
    Configuring --> Docked : Save Configuration
    Configuring --> Configuring : Install/Remove Systems
    
    Docked --> ValidatingBuild : Attempt Launch
    ValidatingBuild --> Docked : Invalid Build
    ValidatingBuild --> Launched : Valid Build
    
    Launched --> InSpace : Undock
    InSpace --> Damaged : Take Damage
    Damaged --> InSpace : Repair Systems
    InSpace --> Docked : Dock at Station
    
    state Configuring {
        [*] --> SelectingSlot
        SelectingSlot --> DraggingCard : Drag Card
        DraggingCard --> InstallingSystem : Drop on Slot
        DraggingCard --> SelectingSlot : Cancel Drag
        InstallingSystem --> SelectingSlot : System Installed
        SelectingSlot --> RemovingSystem : Right Click Slot
        RemovingSystem --> SelectingSlot : System Removed
    }
    
    state ValidatingBuild {
        [*] --> CheckingEssentials
        CheckingEssentials --> CheckingEnergy : Has Required Systems
        CheckingEssentials --> [*] : Missing Systems
        CheckingEnergy --> CheckingSlots : Energy Balanced
        CheckingEnergy --> [*] : Energy Imbalanced
        CheckingSlots --> [*] : Valid/Invalid
    }
```

## User Interface Architecture

### Component Diagram - UI System

```mermaid
graph TB
    subgraph "Main Game UI"
        HUD[HUD Manager]
        ViewMgr[View Manager]
        DamageCtrl[Damage Control]
    end
    
    subgraph "Card Collection UI"
        CardGrid[Card Grid Display]
        CardStack[Card Stack Component]
        SilhouetteCard[Silhouette Card]
        UpgradeBtn[Upgrade Button]
    end
    
    subgraph "Ship Configuration UI"
        ShipSelector[Ship Selector]
        SlotGrid[Slot Grid]
        SlotComponent[Slot Component]
        DragDrop[Drag & Drop Handler]
    end
    
    subgraph "Station Interface"
        StationUI[Station Interface]
        RepairService[Repair Service]
        ShipSwitch[Ship Switching]
        LaunchBtn[Launch Button]
    end
    
    subgraph "Validation System"
        BuildValidator[Build Validator]
        ErrorDisplay[Error Display]
        LaunchPrevention[Launch Prevention]
    end
    
    HUD --> DamageCtrl
    ViewMgr --> HUD
    
    CardGrid --> CardStack
    CardStack --> SilhouetteCard
    CardStack --> UpgradeBtn
    
    ShipSelector --> SlotGrid
    SlotGrid --> SlotComponent
    DragDrop --> SlotComponent
    CardStack --> DragDrop
    
    StationUI --> RepairService
    StationUI --> ShipSwitch
    StationUI --> LaunchBtn
    
    BuildValidator --> ErrorDisplay
    BuildValidator --> LaunchPrevention
    LaunchBtn --> BuildValidator
```

### Activity Diagram - Card Installation Flow

```mermaid
flowchart TD
    Start([Player Opens Ship Editor]) --> CheckDocked{At Station?}
    CheckDocked -->|No| ShowError[Show Error: Must be docked]
    CheckDocked -->|Yes| ShowUI[Display Ship Configuration UI]
    
    ShowUI --> SelectCard[Player Selects Card from Inventory]
    SelectCard --> StartDrag[Start Drag Operation]
    StartDrag --> DragOver{Dragging over valid slot?}
    
    DragOver -->|No| ShowInvalid[Show Invalid Drop Indicator]
    DragOver -->|Yes| ShowValid[Show Valid Drop Indicator]
    
    ShowInvalid --> DragContinue{Continue Dragging?}
    DragContinue -->|Yes| DragOver
    DragContinue -->|No| CancelDrag[Cancel Drag Operation]
    
    ShowValid --> Drop{Player Drops Card?}
    
    Drop -->|No| CancelDrag
    Drop -->|Yes| ValidateInstall{Can Install System?}
    
    ValidateInstall -->|No| ShowInstallError[Show Installation Error]
    ValidateInstall -->|Yes| InstallSystem[Install System in Slot]
    
    InstallSystem --> UpdateUI[Update UI Display]
    UpdateUI --> ValidateBuild[Validate Ship Build]
    
    ValidateBuild --> ShowBuildStatus[Show Build Status]
    ShowBuildStatus --> WaitAction[Wait for Next Action]
    
    WaitAction --> NextAction{Next Action?}
    NextAction -->|Select Card| SelectCard
    NextAction -->|Attempt Launch| AttemptLaunch{Player Attempts Launch?}
    
    AttemptLaunch -->|Yes| FinalValidation{Build Valid?}
    FinalValidation -->|No| ShowLaunchError[Show Launch Error]
    FinalValidation -->|Yes| Launch[Launch Ship]
    
    ShowError --> End([End])
    CancelDrag --> WaitAction
    ShowInstallError --> WaitAction
    ShowLaunchError --> WaitAction
    Launch --> End
```

## Data Flow Architecture

### Data Flow Diagram - Card Collection to Ship Configuration

```mermaid
flowchart LR
    subgraph "External Sources"
        Missions[Mission Rewards]
        Loot[Loot Drops]
        Trading[Future: NFT Trading]
    end
    
    subgraph "Drop System"
        DropGen[Drop Generator]
        RarityCalc[Rarity Calculator]
        Inventory[System Inventory]
    end
    
    subgraph "Card Management"
        CardCollection[Card Collection]
        CardStacks[Card Stacks]
        Discovery[Discovery System]
    end
    
    subgraph "Ship Systems"
        ShipCollection[Ship Collection]
        ActiveShip[Active Ship]
        SystemSlots[System Slots]
    end
    
    subgraph "Validation"
        BuildValidator[Build Validator]
        LaunchCheck[Launch Check]
    end
    
    subgraph "UI Layer"
        CardUI[Card UI]
        ShipUI[Ship Configuration UI]
        StationUI[Station UI]
    end
    
    Missions --> DropGen
    Loot --> DropGen
    Trading --> CardCollection
    
    DropGen --> RarityCalc
    RarityCalc --> Inventory
    Inventory --> CardCollection
    
    CardCollection --> CardStacks
    CardStacks --> Discovery
    Discovery --> CardUI
    
    CardUI --> ShipUI
    ShipUI --> SystemSlots
    SystemSlots --> ActiveShip
    ActiveShip --> ShipCollection
    
    SystemSlots --> BuildValidator
    BuildValidator --> LaunchCheck
    LaunchCheck --> StationUI
    
    CardCollection --> CardUI
    ActiveShip --> ShipUI
    ShipCollection --> StationUI
```

## System Integration

### Component Integration Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[User Interface]
        GameLogic[Game Logic]
        CardSystem[Card System]
        ShipSystem[Ship System]
    end
    
    subgraph "API Layer"
        ShipAPI[Ship API Endpoints]
        CardAPI[Card API Endpoints]
        StationAPI[Station API Endpoints]
    end
    
    subgraph "Backend Layer"
        ShipConfigs[Ship Configurations]
        CardDefinitions[Card Definitions]
        DropRates[Drop Rate System]
        ValidationRules[Validation Rules]
    end
    
    subgraph "Data Layer"
        SessionData[Session Data]
        LocalStorage[Local Storage]
        FutureBlockchain[Future: Blockchain]
    end
    
    UI --> GameLogic
    UI --> CardSystem
    UI --> ShipSystem
    
    CardSystem --> CardAPI
    ShipSystem --> ShipAPI
    UI --> StationAPI
    
    ShipAPI --> ShipConfigs
    CardAPI --> CardDefinitions
    CardAPI --> DropRates
    ShipAPI --> ValidationRules
    
    ShipConfigs --> SessionData
    CardDefinitions --> LocalStorage
    DropRates --> SessionData
    
    LocalStorage -.-> FutureBlockchain
    SessionData -.-> FutureBlockchain
```

### Sequence Diagram - Card Purchase and Installation

```mermaid
sequenceDiagram
    participant Player
    participant StationUI as Station_Interface
    participant CardShop as Card_Shop
    participant CardInventory as Card_Inventory
    participant Ship as Ship_Configuration
    participant SlotManager as Slot_Manager
    participant SystemRegistry as System_Registry

    Player->>StationUI: Dock at station
    StationUI->>StationUI: Show docking interface
    Player->>StationUI: Click "CARD SHOP"
    StationUI->>CardShop: Open card shop interface
    
    CardShop->>CardInventory: Load available cards
    CardInventory->>CardShop: Display card grid
    
    Player->>CardShop: Purchase subspace_radio card
    CardShop->>CardInventory: Add card to inventory
    CardInventory->>CardShop: Confirm purchase
    
    Player->>CardShop: Purchase long_range_scanner card
    CardShop->>CardInventory: Add card to inventory
    CardInventory->>CardShop: Confirm purchase
    
    Player->>CardShop: Switch to ship configuration view
    CardShop->>Ship: Load current ship configuration
    Ship->>SlotManager: Get available slots
    SlotManager->>CardShop: Display slot grid
    
    Player->>CardShop: Drag subspace_radio to slot
    CardShop->>SlotManager: Validate card compatibility
    SlotManager->>Ship: Install system(subspace_radio)
    Ship->>SystemRegistry: Register system instance
    SystemRegistry->>Ship: Confirm registration
    Ship->>CardShop: Update slot display
    
    Player->>CardShop: Drag long_range_scanner to slot
    CardShop->>SlotManager: Validate card compatibility
    SlotManager->>Ship: Install system(long_range_scanner)
    Ship->>SystemRegistry: Register system instance
    SystemRegistry->>Ship: Confirm registration
    Ship->>CardShop: Update slot display
    
    Player->>CardShop: Close card shop
    CardShop->>Ship: Save ship configuration
    Ship->>StationUI: Return to docking interface
```

### Sequence Diagram - Ship Launch and System Recognition

```mermaid
sequenceDiagram
    participant Player
    participant StationUI as Station_Interface
    participant Ship as Ship_Configuration
    participant SystemRegistry as System_Registry
    participant GameState as Game_State
    participant HUD as HUD_Manager
    participant KeyHandler as Key_Handler

    Player->>StationUI: Click "UNDOCK" button
    StationUI->>Ship: Validate ship configuration
    Ship->>SystemRegistry: Verify installed systems
    SystemRegistry->>Ship: Return system manifest
    
    alt Valid ship configuration
        Ship->>GameState: Initialize ship in space
        GameState->>SystemRegistry: Load active systems
        SystemRegistry->>GameState: Register system handlers
        
        loop For each installed system
            SystemRegistry->>KeyHandler: Register system key bindings
            KeyHandler->>SystemRegistry: Confirm key registration
        end
        
        GameState->>HUD: Update system status display
        HUD->>Player: Show space view with active systems
        StationUI->>GameState: Complete undocking sequence
    else Invalid configuration
        Ship->>StationUI: Show validation errors
        StationUI->>Player: Display error message
    end
```

### Sequence Diagram - System Activation (Success Path)

```mermaid
sequenceDiagram
    participant Player
    participant KeyHandler as Key_Handler
    participant SystemRegistry as System_Registry
    participant SubspaceRadio as Subspace_Radio_System
    participant AudioManager as Audio_Manager
    participant UI as UI_Manager

    Note over Player, UI: Player has subspace_radio card installed
    
    Player->>KeyHandler: Press 'R' key
    KeyHandler->>SystemRegistry: Check system availability(subspace_radio)
    SystemRegistry->>SubspaceRadio: Verify system operational
    
    alt System available and operational
        SubspaceRadio->>SystemRegistry: Return system ready
        SystemRegistry->>KeyHandler: Confirm activation possible
        KeyHandler->>SubspaceRadio: Activate system
        SubspaceRadio->>AudioManager: Play activation sound
        SubspaceRadio->>UI: Show subspace radio interface
        UI->>Player: Display galactic chart overlay
        AudioManager->>Player: Play success sound
    else System damaged
        SubspaceRadio->>SystemRegistry: Return system damaged
        SystemRegistry->>AudioManager: Play error sound
        SystemRegistry->>UI: Show damage message
        UI->>Player: Display "Subspace Radio damaged"
        AudioManager->>Player: Play error sound
    end
```

### Sequence Diagram - System Activation (Failure Path)

```mermaid
sequenceDiagram
    participant Player
    participant KeyHandler as Key_Handler
    participant SystemRegistry as System_Registry
    participant AudioManager as Audio_Manager
    participant UI as UI_Manager
    participant ErrorHandler as Error_Handler

    Note over Player, ErrorHandler: Player has NO galactic_chart card installed
    
    Player->>KeyHandler: Press 'G' key
    KeyHandler->>SystemRegistry: Check system availability(galactic_chart)
    SystemRegistry->>SystemRegistry: Search installed systems
    
    alt System not found
        SystemRegistry->>ErrorHandler: System not installed
        ErrorHandler->>AudioManager: Play command fail sound
        ErrorHandler->>UI: Show error message
        UI->>Player: Display "Galactic Chart not available"
        AudioManager->>Player: Play error sound effect
        
        Note over ErrorHandler, UI: Optional: Show card requirement hint
        ErrorHandler->>UI: Show card installation hint
        UI->>Player: Display "Install Galactic Chart card at station"
    else System found but no card
        SystemRegistry->>ErrorHandler: System exists but no card backing
        ErrorHandler->>AudioManager: Play different error sound
        ErrorHandler->>UI: Show specific error
        UI->>Player: Display "Galactic Chart card required"
        AudioManager->>Player: Play card-missing sound
    end
```

### Sequence Diagram - System State Synchronization Issues

```mermaid
sequenceDiagram
    participant CardSystem as Card_System
    participant ShipConfig as Ship_Configuration
    participant SystemRegistry as System_Registry
    participant KeyBindings as Key_Bindings
    participant ActiveSystems as Active_Systems

    Note over CardSystem, ActiveSystems: Common bug scenarios and synchronization points
    
    rect rgb(255, 200, 200)
        Note over CardSystem, ActiveSystems: BUG SCENARIO 1: Card installed but system not recognized
        CardSystem->>ShipConfig: Install card in slot
        ShipConfig->>ShipConfig: Update configuration
        Note over SystemRegistry: SystemRegistry not notified!
        KeyBindings->>SystemRegistry: Try to activate system
        SystemRegistry->>KeyBindings: System not found (ERROR)
    end
    
    rect rgb(255, 255, 200)
        Note over CardSystem, ActiveSystems: SOLUTION: Proper synchronization
        CardSystem->>ShipConfig: Install card in slot
        ShipConfig->>SystemRegistry: Register system instance
        SystemRegistry->>KeyBindings: Update key bindings
        KeyBindings->>ActiveSystems: Register activation handler
        ActiveSystems->>SystemRegistry: Confirm registration
    end
    
    rect rgb(255, 200, 200)
        Note over CardSystem, ActiveSystems: BUG SCENARIO 2: Ship launch doesn't load card systems
        ShipConfig->>SystemRegistry: Load ship configuration
        Note over SystemRegistry: Card systems skipped!
        KeyBindings->>SystemRegistry: Try to activate
        SystemRegistry->>KeyBindings: System exists but not active (ERROR)
    end
    
    rect rgb(200, 255, 200)
        Note over CardSystem, ActiveSystems: SOLUTION: Complete system initialization
        ShipConfig->>SystemRegistry: Load all installed cards
        loop For each card
            SystemRegistry->>ActiveSystems: Create system instance
            ActiveSystems->>KeyBindings: Register key handler
        end
        SystemRegistry->>ShipConfig: Confirm all systems loaded
    end
```

This architecture documentation provides a comprehensive view of the NFT card collection system, showing how all components interact to create a cohesive gameplay experience while maintaining flexibility for future blockchain integration. 