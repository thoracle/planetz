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
        +Map~String, NFTCard[]~ cards
        +Set~String~ discoveredTypes
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
        +Map~String, Number~ cardCounts
        +Array~String~ discoveredCards
        +discoverCard(cardType) void
        +addCards(cardType, quantity) void
        +getStackCount(cardType) Number
        +canUpgradeSystem(cardType, level) Boolean
        +upgradeSystem(cardType, credits) Boolean
    }

    class DropSystem {
        +Map~String, Number~ dropRates
        +Map~String, Number~ systemInventory
        +generateDrop() NFTCard
        +updateInventory(cardType, quantity) void
        +getAvailableCards() Array
        +isCardAvailable(cardType) Boolean
    }

    CardInventory ||--o{ NFTCard : contains
    CardCollection ||--|| CardInventory : manages
    DropSystem ..> NFTCard : creates
    CardCollection <-- DropSystem : receives drops
```

### Sequence Diagram - Card Discovery and Upgrade

```mermaid
sequenceDiagram
    participant Player
    participant UI as Card UI
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
        Inventory->>UI: Show discovery animation
    end
    
    UI->>UI: Update card stack display
    
    Player->>UI: Attempt upgrade
    UI->>Collection: canUpgradeSystem(cardType, level)
    Collection->>Inventory: getCardCount(cardType)
    
    alt Sufficient cards
        Collection->>Ship: upgradeSystem(cardType, newLevel)
        Ship->>Ship: updateSystemStats()
        UI->>UI: Show upgrade success
    else Insufficient cards
        UI->>UI: Show requirement message
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
        +Map~String, SystemSlot~ slots
        +Map~String, System~ systems
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
        +Array~Ship~ ownedShips
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

    Ship ||--o{ SystemSlot : contains
    SystemSlot ||--o| System : holds
    ShipCollection ||--o{ Ship : manages
    BuildValidator ..> Ship : validates
    Ship ..> BuildValidator : uses
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
    
    ShowInvalid --> DragOver
    ShowValid --> Drop{Player Drops Card?}
    
    Drop -->|No| CancelDrag[Cancel Drag Operation]
    Drop -->|Yes| ValidateInstall{Can Install System?}
    
    ValidateInstall -->|No| ShowInstallError[Show Installation Error]
    ValidateInstall -->|Yes| InstallSystem[Install System in Slot]
    
    InstallSystem --> UpdateUI[Update UI Display]
    UpdateUI --> ValidateBuild[Validate Ship Build]
    
    ValidateBuild --> ShowBuildStatus[Show Build Status]
    ShowBuildStatus --> WaitAction[Wait for Next Action]
    
    WaitAction --> SelectCard
    WaitAction --> AttemptLaunch{Player Attempts Launch?}
    
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
    Trading -.-> CardCollection
    
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
    
    CardUI <--> CardCollection
    ShipUI <--> ActiveShip
    StationUI <--> ShipCollection
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

This architecture documentation provides a comprehensive view of the NFT card collection system, showing how all components interact to create a cohesive gameplay experience while maintaining flexibility for future blockchain integration. 