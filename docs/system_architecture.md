# System Architecture Documentation ✅ IMPLEMENTED

## Overview
This document contains UML diagrams illustrating the architecture of the Planetz NFT card collection spaceship system.

**✅ IMPLEMENTATION STATUS**: All core systems fully implemented and integrated into the main game.

## NFT Card Collection System ✅ IMPLEMENTED

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
        +generateDescription() String
        +getDisplayName() String
        +getIcon() String
        +getRarityColor() String
        +getStats() Object
    }

    class CardInventory {
        +Map cards
        +Set discoveredTypes
        +Number credits
        +addCard(nftCard) void
        +getCardCount(cardType) Number
        +canUpgrade(cardType, currentLevel) Boolean
        +getUpgradeRequirement(cardType, level) Number
        +getDiscoveredTypes() Array
        +getUndiscoveredTypes() Array
        +getAllCardTypes() Array
        +generateSpecificCard(cardType, rarity) NFTCard
        +loadTestData() void
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

### Sequence Diagram - Card Discovery and Upgrade ✅ IMPLEMENTED

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

## Ship Management System ✅ IMPLEMENTED

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
        +CardSystemIntegration cardSystemIntegration
        +WeaponSystemCore weaponSystem
        +constructor(shipType, config)
        +installSystem(slotId, cardType, level) Boolean
        +removeSystem(slotId) Boolean
        +validateBuild() ValidationResult
        +canLaunch() Boolean
        +getSystemByType(systemType) System
        +getAvailableSlots() Array
        +calculateTotalStats() Object
        +update(deltaTime) void
        +consumeEnergy(amount) Boolean
        +hasSystemCards(systemName) Boolean
        +initializeAllSystems() void
        +shutdownAllSystems() void
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
        +Number energyConsumptionRate
        +Object stats
        +constructor(systemType, level)
        +activate() Boolean
        +deactivate() void
        +takeDamage(amount) void
        +repair(amount) void
        +getEffectiveness() Number
        +upgrade(newLevel) void
        +update(deltaTime, ship) void
        +isOperational() Boolean
        +initialize() void
        +shutdown() void
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

    class CardSystemIntegration {
        +Ship ship
        +Map installedCards
        +CardInventoryUI cardInventoryUI
        +loadCards() Promise
        +hasSystemCards(systemName) Boolean
        +getSystemCardEffectiveness(systemName) Number
        +createSystemsFromCards() Promise
        +reinitializeAllSystems() Promise
    }

    class WeaponSystemCore {
        +Ship ship
        +Array weaponSlots
        +Number activeSlotIndex
        +initializeFromCards() Promise
        +registerAllWeapons() void
        +updateWeaponHUD() void
    }

    class DockingManager {
        +Ship ship
        +StarfieldManager starfieldManager
        +shutdownSystemsForDocking() void
        +initializeSystemsForLaunch() Promise
        +validateLaunchConditions() Boolean
    }

    Ship o-- SystemSlot : contains_many
    SystemSlot --> System : holds
    Ship --> CardSystemIntegration : uses
    Ship --> WeaponSystemCore : has_one
    Ship --> BuildValidator : validates_with
    ShipCollection o-- Ship : contains_many
    DockingManager --> Ship : manages
    DockingManager --> CardSystemIntegration : coordinates_with
    DockingManager --> WeaponSystemCore : coordinates_with
```

### State Diagram - Ship Configuration States ✅ UPDATED

```mermaid
stateDiagram-v2
    [*] --> Docked
    
    Docked --> Configuring : Edit Ship
    Configuring --> Docked : Save Configuration
    Configuring --> Configuring : Install/Remove Systems
    
    Docked --> ValidatingBuild : Attempt Launch
    ValidatingBuild --> Docked : Invalid Build
    ValidatingBuild --> InitializingSystems : Valid Build
    
    InitializingSystems --> Launched : Systems Ready
    InitializingSystems --> Docked : Initialization Failed
    
    Launched --> InSpace : Undock Complete
    InSpace --> Damaged : Take Damage
    Damaged --> InSpace : Repair Systems
    InSpace --> ShuttingDown : Dock at Station
    ShuttingDown --> Docked : Systems Shutdown
    
    state Configuring {
        [*] --> SelectingSlot
        SelectingSlot --> DraggingCard : Drag Card
        DraggingCard --> InstallingSystem : Drop on Slot
        InstallingSystem --> SelectingSlot : Installation Complete
    }
    
    state InitializingSystems {
        [*] --> LoadingCards
        LoadingCards --> CreatingSystems : Cards Loaded
        CreatingSystems --> RegisteringWeapons : Systems Created
        RegisteringWeapons --> ActivatingTargeting : Weapons Registered
        ActivatingTargeting --> [*] : Ready for Launch
    }
    
    state ShuttingDown {
        [*] --> DeactivatingSystems
        DeactivatingSystems --> PoweringDown : Systems Deactivated
        PoweringDown --> [*] : Ready for Docking
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

## UPDATED: Docking and Launch System Architecture 🚀

### Updated Launch/Undocking Sequence ✅ CORRECTED

```mermaid
sequenceDiagram
    participant Player
    participant DockingInterface as Docking Interface
    participant StarfieldManager as Starfield Manager
    participant Ship
    participant TargetingComputer as Targeting Computer
    participant WeaponHUD as Weapon HUD
    participant PowerSystems as Power Systems

    Note over Player,PowerSystems: ✅ CORRECTED: Unified Ship Initialization Pattern

    Player->>DockingInterface: Click LAUNCH
    DockingInterface->>StarfieldManager: requestUndock()
    
    Note over StarfieldManager: Check undock cooldown
    alt Cooldown Active
        StarfieldManager-->>DockingInterface: Reject (cooldown message)
        DockingInterface-->>Player: Show cooldown warning
    else Cooldown Expired
        Note over StarfieldManager,PowerSystems: Phase 1: System Shutdown
        StarfieldManager->>Ship: shutdownAllSystems()
        Ship->>PowerSystems: stopAllSystemPower()
        Ship->>TargetingComputer: shutdown()
        Ship->>WeaponHUD: clearAllWeapons()
        
        Note over StarfieldManager,PowerSystems: Phase 2: Unified Reinitialization
        StarfieldManager->>Ship: initializeShipSystems()
        
        Note over Ship: ✅ UNIFIED METHOD (used by all paths)
        Ship->>Ship: clearSystemReferences()
        Ship->>Ship: loadCurrentCardConfiguration()
        Ship->>Ship: initializeCoreSystemInstances()
        Ship->>TargetingComputer: initialize(availableWeapons)
        Ship->>WeaponHUD: registerAllWeapons(weaponList)
        Ship->>PowerSystems: registerAllSystems(systemList)
        Ship->>Ship: setupSystemKeybindings()
        Ship->>Ship: validateSystemIntegrity()
        
        Note over StarfieldManager,PowerSystems: Phase 3: Game State Transition
        StarfieldManager->>StarfieldManager: hideStationView()
        StarfieldManager->>StarfieldManager: showStarfieldView()
        StarfieldManager->>StarfieldManager: enablePlayerControls()
        StarfieldManager->>StarfieldManager: startUndockCooldown(30s)
        
        StarfieldManager-->>DockingInterface: Success
        DockingInterface->>DockingInterface: hide()
        DockingInterface-->>Player: Launch successful
    end
```

### **🔄 Unified Ship Initialization Across All Code Paths**

All ship initialization scenarios now use the same `initializeShipSystems()` method:

#### **Code Path 1: Game Startup**
```mermaid
sequenceDiagram
    participant App
    participant ViewManager
    participant Ship
    
    App->>ViewManager: new ViewManager()
    ViewManager->>Ship: new Ship('starter_ship')
    ViewManager->>Ship: initializeShipSystems() ✅ UNIFIED
    Ship-->>ViewManager: Systems ready
```

#### **Code Path 2: Ship Loading from Saved State**
```mermaid
sequenceDiagram
    participant Player
    participant CardInventoryUI
    participant Ship
    
    Player->>CardInventoryUI: Load saved game
    CardInventoryUI->>CardInventoryUI: loadShipConfiguration(savedShipType)
    CardInventoryUI->>Ship: initializeShipSystems(savedConfiguration) ✅ UNIFIED
    Ship-->>CardInventoryUI: Systems ready
```

#### **Code Path 3: Ship Switching at Station**
```mermaid
sequenceDiagram
    participant Player
    participant CardInventoryUI
    participant Ship
    
    Player->>CardInventoryUI: Switch to different ship
    CardInventoryUI->>CardInventoryUI: switchShip(newShipType)
    CardInventoryUI->>Ship: initializeShipSystems(newConfiguration) ✅ UNIFIED
    Ship-->>CardInventoryUI: Systems ready
```

#### **Code Path 4: Launch from Station** 
```mermaid
sequenceDiagram
    participant Player
    participant StarfieldManager
    participant Ship
    
    Player->>StarfieldManager: Launch from station
    StarfieldManager->>Ship: shutdownAllSystems()
    StarfieldManager->>Ship: initializeShipSystems() ✅ UNIFIED
    Ship-->>StarfieldManager: Systems ready
```

## Damage Control System

### Sequence Diagram - Damage Control and Auto-Repair Flow

```mermaid
sequenceDiagram
    participant Player
    participant StarfieldManager as StarfieldManager
    participant DamageControl as SimplifiedDamageControl
    participant AutoRepair as AutoRepairSystem
    participant Ship as Ship
    participant System as System
    participant UI as DamageControlUI

    %% Opening Damage Control Interface
    Player->>StarfieldManager: Press 'D' key
    StarfieldManager->>DamageControl: show(ship, isDocked)
    DamageControl->>DamageControl: createInterface()
    DamageControl->>Ship: getStatus()
    Ship->>Ship: Calculate system status
    Ship-->>DamageControl: {systems: {...}, hull: {...}}
    DamageControl->>UI: Render systems grid
    DamageControl->>AutoRepair: getStatus()
    AutoRepair-->>DamageControl: {isActive, currentTarget, queue}
    DamageControl->>UI: Update interface display

    %% Setting System Priorities
    Player->>UI: Adjust priority slider
    UI->>DamageControl: setPriority(systemName, priority)
    DamageControl->>AutoRepair: setSystemPriority(systemName, priority)
    AutoRepair->>AutoRepair: updateRepairQueue()
    
    loop For each damaged system
        AutoRepair->>Ship: getSystem(systemName)
        Ship-->>AutoRepair: System instance
        AutoRepair->>System: healthPercentage
        System-->>AutoRepair: health value
    end
    
    AutoRepair->>AutoRepair: Sort queue by priority & health
    AutoRepair->>AutoRepair: Set currentTarget

    %% Activating Auto-Repair
    Player->>UI: Click "ACTIVATE" button
    UI->>DamageControl: toggleAutoRepair()
    DamageControl->>AutoRepair: toggle()
    AutoRepair->>AutoRepair: start()
    AutoRepair->>AutoRepair: updateRepairQueue()
        
        loop For each priority change
            UI->>DamageControl: setPriority(system, value)
            DamageControl->>AutoRepair: setSystemPriority(system, value)
        end
        
        AutoRepair->>AutoRepair: updateRepairQueue()
        AutoRepair->>AutoRepair: Reorder by priority
        AutoRepair->>DamageControl: Current target changed
        DamageControl->>UI: Update repair queue display
    end

    %% Closing Interface
    Player->>UI: Press 'D' or 'ESC'
    UI->>DamageControl: handleKeyPress()
    DamageControl->>DamageControl: hide()
    DamageControl->>DamageControl: Clear refresh timer
    DamageControl->>DamageControl: Remove event listeners
```

### Class Diagram - Damage Control Architecture

```mermaid
classDiagram
    class SimplifiedDamageControl {
        +Boolean isVisible
        +Ship ship
        +Boolean isDocked
        +Number refreshInterval
        +show(ship, isDocked) Boolean
        +hide() Boolean
        +toggle(ship, isDocked) Boolean
        +createInterface() void
        +updateInterface() void
        +setPriority(systemName, priority) void
        +toggleAutoRepair() void
        +formatSystemName(systemName) String
    }

    class AutoRepairSystem {
        +Ship ship
        +Array repairQueue
        +Number repairRate
        +Boolean isActive
        +String currentTarget
        +Object priorities
        +start() void
        +stop() void
        +toggle() Boolean
        +update(deltaTime) void
        +setSystemPriority(systemName, priority) void
        +updateRepairQueue() void
        +getStatus() Object
        +getEstimatedRepairTime() Number
    }

    class Ship {
        +Number currentHull
        +Number maxHull
        +Number currentEnergy
        +Number maxEnergy
        +Map systems
        +AutoRepairSystem autoRepairSystem
        +getStatus() Object
        +getSystem(systemName) System
        +applyDamage(amount, type) void
        +calculateTotalStats() Object
        +update(deltaTime) void
    }

    class System {
        +String name
        +Number level
        +Number currentHealth
        +Number maxHealth
        +Number healthPercentage
        +String state
        +Boolean isActive
        +takeDamage(amount) void
        +repair(amount) void
        +updateSystemState() void
        +getEffectiveness() Number
        +isOperational() Boolean
    }

    class DamageControlUI {
        +Element container
        +Map sliders
        +Element statusDisplay
        +Element queueDisplay
        +renderSystemsGrid() void
        +updateHealthBars() void
        +updateRepairQueue() void
        +addSliderEventListeners() void
    }

    SimplifiedDamageControl --> Ship : manages
    SimplifiedDamageControl --> AutoRepairSystem : controls
    SimplifiedDamageControl --> DamageControlUI : renders
    AutoRepairSystem --> Ship : repairs_systems_of
    Ship o-- System : contains_many
    Ship --> AutoRepairSystem : has_one
    AutoRepairSystem --> System : repairs
    DamageControlUI --> SimplifiedDamageControl : callbacks_to
```

### State Diagram - Auto-Repair System States

```mermaid
stateDiagram-v2
    [*] --> Inactive
    
    Inactive --> Active : toggle() / start()
    Active --> Inactive : toggle() / stop()
    
    state Active {
        [*] --> ScanningQueue
        ScanningQueue --> RepairingSystem : target_found
        ScanningQueue --> Idle : no_targets
        
        RepairingSystem --> ScanningQueue : system_repaired
        RepairingSystem --> ScanningQueue : priority_changed
        RepairingSystem --> RepairingSystem : repair_progress
        
        Idle --> ScanningQueue : new_damage / priority_change
    }
    
    state RepairingSystem {
        [*] --> CalculatingRepair
        CalculatingRepair --> ApplyingRepair : repair_amount_calculated
        ApplyingRepair --> CheckingProgress : repair_applied
        CheckingProgress --> CalculatingRepair : continue_repair
        CheckingProgress --> [*] : repair_complete
    }
```

This architecture documentation provides a comprehensive view of the NFT card collection system, showing how all components interact to create a cohesive gameplay experience while maintaining flexibility for future blockchain integration.

## Weapons System Architecture

### Class Diagram - Weapons System Core

```mermaid
classDiagram
    class WeaponSystemCore {
        +Ship ship
        +Array weaponSlots
        +Number activeSlotIndex
        +Number maxWeaponSlots
        +Boolean isAutofireOn
        +Boolean targetLockRequired
        +Object lockedTarget
        +WeaponHUD weaponHUD
        +selectPreviousWeapon() Boolean
        +selectNextWeapon() Boolean
        +fireActiveWeapon() Boolean
        +toggleAutofire() Boolean
        +updateAutofire(deltaTime) void
        +getActiveWeapon() WeaponSlot
        +installWeapon(slotIndex, weaponCard) Boolean
        +removeWeapon(slotIndex) Boolean
        +validateTargetLock() Boolean
        +setLockedTarget(target) void
        +setWeaponHUD(weaponHUD) void
        +updateWeaponDisplay() void
        +showWeaponSelectFeedback() void
    }

    class WeaponSlot {
        +Number slotIndex
        +WeaponCard equippedWeapon
        +Number cooldownTimer
        +Boolean isEmpty
        +fire(ship, target) Boolean
        +canFire() Boolean
        +isInCooldown() Boolean
        +getCooldownPercentage() Number
        +equipWeapon(weaponCard) Boolean
        +unequipWeapon() void
        +updateCooldown(deltaTime) void
        +getCooldownTimeRemaining() Number
        +getEquippedWeaponName() String
    }

    class WeaponCard {
        +String weaponId
        +String name
        +String weaponType
        +Number damage
        +Number cooldownTime
        +Number range
        +Boolean autofireEnabled
        +Number accuracy
        +Number energyCost
        +Number blastRadius
        +Boolean homingCapability
        +Boolean targetLockRequired
        +Number flightRange
        +Number turnRate
        +Object specialProperties
        +constructor(weaponData) void
        +fire(origin, target) Object
        +isValidTarget(target, distance) Boolean
        +getDisplayName() String
    }

    class ScanHitWeapon {
        +Number accuracy
        +Number energyCost
        +fire(origin, target) Object
        +calculateHitChance(distance) Number
        +applyInstantDamage(target) Number
        +validateEnergyConsumption(ship) Boolean
    }

    class SplashDamageWeapon {
        +Number blastRadius
        +Boolean homingCapability
        +Number flightRange
        +Number turnRate
        +fire(origin, target) Projectile
        +createProjectile(origin, target) Projectile
        +validateTargetLock(target) Boolean
        +calculateSplashDamage(distance) Number
    }

    class Projectile {
        +Object position
        +Object velocity
        +Object target
        +Number damage
        +Number blastRadius
        +Number flightRange
        +Boolean isHoming
        +Number turnRate
        +Boolean hasDetonated
        +Number distanceTraveled
        +Number launchTime
        +String weaponName
        +calculateInitialVelocity() void
        +update(deltaTime) void
        +updateHoming(target, deltaTime) void
        +checkCollision() Boolean
        +detonate() void
        +calculateTrajectory() Object
        +isInRange() Boolean
    }

    class WeaponHUD {
        +Element container
        +Array weaponSlots
        +Number activeSlotIndex
        +displayWeaponSlots() void
        +updateActiveWeapon(slotIndex) void
        +showCooldownIndicator(slotIndex, percentage) void
        +displayTargetLockStatus(locked) void
        +updateAmmoCount(slotIndex, count) void
        +showWeaponName(slotIndex, name) void
    }

    WeaponSystemCore o-- WeaponSlot : contains_many
    WeaponSlot --> WeaponCard : equipped_with
    WeaponCard <|-- ScanHitWeapon
    WeaponCard <|-- SplashDamageWeapon
    SplashDamageWeapon --> Projectile : creates
    WeaponSystemCore --> WeaponHUD : updates
    WeaponHUD --> WeaponSystemCore : callbacks_to
``` 