# Unified Slot Management System

## Overview
This document defines the unified slot management system that ensures consistent slot handling between ship initialization, weapon system integration, and station-based ship configuration.

## Problem Statement
Currently, we have multiple systems trying to manage ship slots independently:
- **WeaponSyncManager** expects 4 weapon slots
- **CardInventoryUI** has its own slot mapping and assignment logic  
- **Ship initialization** uses different slot counting
- **Station configuration** may show different slot layouts

This leads to mismatches where the weapon system shows 4 weapons but the station only shows 3, because they're using different slot management approaches.

## Solution: Unified Slot Management

### Core Principles
1. **Single Source of Truth**: One slot definition system for all ship types
2. **Type Safety**: Cards can only be placed in compatible slot types
3. **Consistent Indexing**: All systems use the same slot numbering
4. **Extensible**: Easy to add new ship types and slot configurations

## Class Diagram - Unified Slot System

```mermaid
classDiagram
    class SlotDefinition {
        +Number slotIndex
        +String slotType
        +String slotId
        +Boolean isRequired
        +Array compatibleCardTypes
        +String displayName
        +constructor(index, type, id, required)
        +isCompatibleWith(cardType) Boolean
        +isEmpty() Boolean
        +getDisplayName() String
    }

    class ShipSlotLayout {
        +String shipType
        +Array slotDefinitions
        +Map slotsByType
        +Map slotsByIndex
        +Number totalSlots
        +constructor(shipType, slotConfig)
        +getSlotByIndex(index) SlotDefinition
        +getSlotsByType(slotType) Array
        +getWeaponSlots() Array
        +getUtilitySlots() Array
        +validateSlotAssignment(slotIndex, cardType) Boolean
        +getNextAvailableSlot(cardType) SlotDefinition
        +getTotalSlotCount() Number
        +getSlotConfiguration() Object
    }

    class UnifiedSlotManager {
        +Ship ship
        +ShipSlotLayout slotLayout
        +Map installedCards
        +constructor(ship)
        +initializeSlots() void
        +installCard(slotIndex, cardType, level) Boolean
        +removeCard(slotIndex) Boolean
        +getInstalledCard(slotIndex) Object
        +getInstalledCardsByType(slotType) Array
        +validateInstallation(slotIndex, cardType) ValidationResult
        +getSlotStatus() Object
        +syncWithWeaponSystem() void
        +syncWithCardInventory() void
        +exportConfiguration() Object
        +importConfiguration(config) Boolean
    }

    class ShipSlotFactory {
        +createSlotLayout(shipType) ShipSlotLayout
        +getStarterShipLayout() ShipSlotLayout
        +getFrigateLayout() ShipSlotLayout
        +getDestroyerLayout() ShipSlotLayout
        +validateSlotConfiguration(config) Boolean
        +getDefaultSlotConfiguration(shipType) Object
    }

    class SlotValidationResult {
        +Boolean isValid
        +String errorMessage
        +String errorCode
        +Array suggestions
        +constructor(valid, message, code)
        +addSuggestion(suggestion) void
        +getDisplayMessage() String
    }

    class CardSlotMatcher {
        +Map cardToSlotTypeMapping
        +getCompatibleSlotTypes(cardType) Array
        +isCardCompatibleWithSlot(cardType, slotType) Boolean
        +getSlotTypeForCard(cardType) String
        +validateCardPlacement(cardType, slotDefinition) Boolean
        +getSuggestedSlots(cardType, slotLayout) Array
    }

    class Ship {
        +UnifiedSlotManager slotManager
        +ShipSlotLayout slotLayout
        +WeaponSystemCore weaponSystem
        +initializeSlotSystem() void
        +getSlotManager() UnifiedSlotManager
        +installSystem(slotIndex, cardType, level) Boolean
        +removeSystem(slotIndex) Boolean
        +getSystemConfiguration() Object
    }

    class WeaponSystemCore {
        +UnifiedSlotManager slotManager
        +Array weaponSlots
        +syncWithSlotManager() void
        +getWeaponFromSlot(slotIndex) WeaponCard
        +updateWeaponSlots() void
        +validateWeaponConfiguration() Boolean
    }

    class CardInventoryUI {
        +UnifiedSlotManager slotManager
        +ShipSlotLayout slotLayout
        +renderSlotGrid() void
        +updateSlotDisplay() void
        +handleCardDrop(slotIndex, cardType) Boolean
        +validateDropTarget(slotIndex, cardType) Boolean
        +showSlotCompatibility(cardType) void
    }

    ShipSlotLayout o-- SlotDefinition : contains_many
    UnifiedSlotManager --> ShipSlotLayout : uses
    UnifiedSlotManager --> CardSlotMatcher : validates_with
    ShipSlotFactory --> ShipSlotLayout : creates
    UnifiedSlotManager --> SlotValidationResult : returns
    Ship --> UnifiedSlotManager : has_one
    Ship --> ShipSlotLayout : has_one
    WeaponSystemCore --> UnifiedSlotManager : syncs_with
    CardInventoryUI --> UnifiedSlotManager : manages_through
    CardSlotMatcher --> SlotDefinition : validates_against
```

## Sequence Diagram - Ship Initialization with Unified Slots

```mermaid
sequenceDiagram
    participant Ship
    participant SlotFactory as ShipSlotFactory
    participant SlotManager as UnifiedSlotManager
    participant SlotLayout as ShipSlotLayout
    participant WeaponSystem as WeaponSystemCore
    participant CardInventory as CardInventoryUI

    Ship->>SlotFactory: createSlotLayout("starter_ship")
    SlotFactory->>SlotLayout: new ShipSlotLayout("starter_ship", starterConfig)
    SlotLayout->>SlotLayout: Define 9 slots: [engines, reactor, 4×weapons, 3×utility]
    SlotFactory-->>Ship: Return slotLayout

    Ship->>SlotManager: new UnifiedSlotManager(ship, slotLayout)
    SlotManager->>SlotManager: initializeSlots()
    SlotManager->>SlotLayout: getSlotConfiguration()
    SlotLayout-->>SlotManager: Slot definitions with types and indices

    Ship->>Ship: installStarterCards()
    loop For each starter card
        Ship->>SlotManager: installCard(slotIndex, cardType, level)
        SlotManager->>SlotLayout: validateSlotAssignment(slotIndex, cardType)
        SlotLayout-->>SlotManager: ValidationResult
        
        alt Valid assignment
            SlotManager->>SlotManager: installedCards.set(slotIndex, cardData)
            SlotManager-->>Ship: Installation successful
        else Invalid assignment
            SlotManager-->>Ship: ValidationResult with error
        end
    end

    Ship->>WeaponSystem: new WeaponSystemCore(ship)
    WeaponSystem->>SlotManager: syncWithWeaponSystem()
    SlotManager->>SlotLayout: getWeaponSlots()
    SlotLayout-->>SlotManager: Array of weapon slot definitions
    
    loop For each weapon slot
        SlotManager->>SlotManager: getInstalledCard(weaponSlotIndex)
        SlotManager->>WeaponSystem: equipWeapon(slotIndex, weaponCard)
    end

    Ship->>CardInventory: initializeUI()
    CardInventory->>SlotManager: getSlotStatus()
    SlotManager-->>CardInventory: Current slot configuration
    CardInventory->>SlotLayout: getSlotDefinitions()
    SlotLayout-->>CardInventory: Slot types and indices
    CardInventory->>CardInventory: renderSlotGrid(slotDefinitions)
```

## Sequence Diagram - Station Configuration with Unified Slots

```mermaid
sequenceDiagram
    participant Player
    participant StationUI as StationUI
    participant CardInventory as CardInventoryUI
    participant SlotManager as UnifiedSlotManager
    participant SlotLayout as ShipSlotLayout
    participant WeaponSystem as WeaponSystemCore
    participant Validator as CardSlotMatcher

    Player->>StationUI: Open ship configuration
    StationUI->>CardInventory: loadShipConfiguration()
    CardInventory->>SlotManager: getSlotStatus()
    SlotManager-->>CardInventory: Current installed cards by slot
    
    CardInventory->>SlotLayout: getSlotDefinitions()
    SlotLayout-->>CardInventory: All slot definitions with types
    CardInventory->>CardInventory: renderSlotGrid(slots, installedCards)
    CardInventory-->>Player: Show ship configuration UI

    Player->>CardInventory: Drag pulse_cannon to slot
    CardInventory->>Validator: isCardCompatibleWithSlot("pulse_cannon", slotDefinition)
    Validator-->>CardInventory: Compatibility result

    alt Compatible slot
        CardInventory->>SlotManager: validateInstallation(slotIndex, "pulse_cannon")
        SlotManager->>SlotLayout: validateSlotAssignment(slotIndex, "pulse_cannon")
        SlotLayout-->>SlotManager: ValidationResult(valid=true)
        SlotManager-->>CardInventory: Installation valid

        Player->>CardInventory: Drop card
        CardInventory->>SlotManager: installCard(slotIndex, "pulse_cannon", level)
        SlotManager->>SlotManager: installedCards.set(slotIndex, cardData)
        SlotManager->>WeaponSystem: syncWithWeaponSystem()
        
        loop Update weapon slots
            SlotManager->>WeaponSystem: updateWeaponSlot(weaponSlotIndex, weaponCard)
        end
        
        SlotManager-->>CardInventory: Installation complete
        CardInventory->>CardInventory: updateSlotDisplay()
        CardInventory-->>Player: Show updated configuration

    else Incompatible slot
        CardInventory->>CardInventory: showInvalidDropIndicator()
        CardInventory-->>Player: Visual feedback: invalid drop
    end
```

## Activity Diagram - Unified Slot Validation Flow

```mermaid
flowchart TD
    Start([Card Installation Request]) --> GetSlotDef[Get Slot Definition]
    GetSlotDef --> CheckSlotType{Slot Type Compatible?}
    
    CheckSlotType -->|No| ShowError[Show Incompatible Type Error]
    CheckSlotType -->|Yes| CheckSlotOccupied{Slot Already Occupied?}
    
    CheckSlotOccupied -->|Yes| CheckReplacement{Allow Replacement?}
    CheckReplacement -->|No| ShowOccupiedError[Show Slot Occupied Error]
    CheckReplacement -->|Yes| RemoveExisting[Remove Existing Card]
    
    CheckSlotOccupied -->|No| InstallCard[Install Card in Slot]
    RemoveExisting --> InstallCard
    
    InstallCard --> UpdateWeaponSystem{Card is Weapon Type?}
    UpdateWeaponSystem -->|Yes| SyncWeapons[Sync with Weapon System]
    UpdateWeaponSystem -->|No| UpdateUI[Update UI Display]
    
    SyncWeapons --> UpdateWeaponSlots[Update Weapon Slot Array]
    UpdateWeaponSlots --> UpdateUI
    
    UpdateUI --> Success([Installation Complete])
    ShowError --> End([End])
    ShowOccupiedError --> End
```

## Data Structure - Dynamic Ship Slot Configurations

```mermaid
flowchart TB
    subgraph "Starter Ship - 9 Total Slots"
        subgraph "Starter Essential"
            S0[Slot 0: engines]
            S1[Slot 1: reactor]
        end
        
        subgraph "Starter Weapons"
            S2[Slot 2: weapons]
            S3[Slot 3: weapons] 
            S4[Slot 4: weapons]
            S5[Slot 5: weapons]
        end
        
        subgraph "Starter Utility"
            S6[Slot 6: utility]
            S7[Slot 7: utility]
            S8[Slot 8: utility]
        end
    end
    
    subgraph "Frigate - 12 Total Slots"
        subgraph "Frigate Essential"
            F0[Slot 0: engines]
            F1[Slot 1: reactor]
            F2[Slot 2: shields]
        end
        
        subgraph "Frigate Weapons"
            F3[Slot 3: weapons]
            F4[Slot 4: weapons]
            F5[Slot 5: weapons]
            F6[Slot 6: weapons]
            F7[Slot 7: weapons]
            F8[Slot 8: weapons]
        end
        
        subgraph "Frigate Utility"
            F9[Slot 9: utility]
            F10[Slot 10: utility]
            F11[Slot 11: utility]
        end
    end
    
    subgraph "Destroyer - 15 Total Slots"
        subgraph "Destroyer Essential"
            D0[Slot 0: engines]
            D1[Slot 1: engines]
            D2[Slot 2: reactor]
            D3[Slot 3: shields]
        end
        
        subgraph "Destroyer Weapons"
            D4[Slot 4: weapons]
            D5[Slot 5: weapons]
            D6[Slot 6: weapons]
            D7[Slot 7: weapons]
            D8[Slot 8: weapons]
            D9[Slot 9: weapons]
            D10[Slot 10: weapons]
            D11[Slot 11: weapons]
        end
        
        subgraph "Destroyer Utility"
            D12[Slot 12: utility]
            D13[Slot 13: utility]
            D14[Slot 14: utility]
        end
    end
    
    subgraph "Card Type Compatibility"
        EngineCards[impulse_engines, quantum_drive, warp_drive]
        ReactorCards[energy_reactor, quantum_reactor, antimatter_core]
        WeaponCards[laser_cannon, pulse_cannon, plasma_cannon, phaser_array, missiles]
        UtilityCards[target_computer, galactic_chart, subspace_radio, long_range_scanner]
        ShieldCards[shield_generator, shields, quantum_barrier]
    end
    
    S0 --> EngineCards
    S1 --> ReactorCards
    S2 --> WeaponCards
    S6 --> UtilityCards
    
    F0 --> EngineCards
    F1 --> ReactorCards
    F2 --> ShieldCards
    F3 --> WeaponCards
    F9 --> UtilityCards
    
    D0 --> EngineCards
    D2 --> ReactorCards
    D3 --> ShieldCards
    D4 --> WeaponCards
    D12 --> UtilityCards
```

## Class Diagram - Enhanced Multi-Ship Slot System

```mermaid
classDiagram
    class ShipSlotFactory {
        +Map shipTypeConfigurations
        +createSlotLayout(shipType) ShipSlotLayout
        +getStarterShipLayout() ShipSlotLayout
        +getFrigateLayout() ShipSlotLayout
        +getDestroyerLayout() ShipSlotLayout
        +getBattleshipLayout() ShipSlotLayout
        +validateSlotConfiguration(config) Boolean
        +getDefaultSlotConfiguration(shipType) Object
        +getAvailableShipTypes() Array
        +getShipTypeInfo(shipType) Object
    }

    class ShipTypeConfiguration {
        +String shipType
        +Number totalSlots
        +Array slotTypePattern
        +Map slotTypeDistribution
        +Number maxWeaponSlots
        +Number maxUtilitySlots
        +Boolean requiresShields
        +Boolean allowsMultipleEngines
        +constructor(shipType, config)
        +getSlotTypeAtIndex(index) String
        +getSlotIndicesByType(slotType) Array
        +validateSlotDistribution() Boolean
        +getSlotCapabilities() Object
    }

    class ShipSlotLayout {
        +String shipType
        +Array slotDefinitions
        +Map slotsByType
        +Map slotsByIndex
        +Number totalSlots
        +ShipTypeConfiguration shipConfig
        +constructor(shipType, shipConfig)
        +getSlotByIndex(index) SlotDefinition
        +getSlotsByType(slotType) Array
        +getWeaponSlots() Array
        +getUtilitySlots() Array
        +getEngineSlots() Array
        +getShieldSlots() Array
        +validateSlotAssignment(slotIndex, cardType) Boolean
        +getNextAvailableSlot(cardType) SlotDefinition
        +getTotalSlotCount() Number
        +getSlotConfiguration() Object
        +getSlotDistribution() Object
    }

    class SlotDefinition {
        +Number slotIndex
        +String slotType
        +String slotId
        +Boolean isRequired
        +Array compatibleCardTypes
        +String displayName
        +String shipType
        +constructor(index, type, id, required, shipType)
        +isCompatibleWith(cardType) Boolean
        +isEmpty() Boolean
        +getDisplayName() String
        +isEssentialSlot() Boolean
        +getSlotPriority() Number
    }

    class UnifiedSlotManager {
        +Ship ship
        +ShipSlotLayout slotLayout
        +ShipTypeConfiguration shipConfig
        +Map installedCards
        +constructor(ship)
        +initializeSlots() void
        +switchShipType(newShipType) Boolean
        +migrateCardsToNewLayout(oldLayout, newLayout) MigrationResult
        +installCard(slotIndex, cardType, level) Boolean
        +removeCard(slotIndex) Boolean
        +getInstalledCard(slotIndex) Object
        +getInstalledCardsByType(slotType) Array
        +validateInstallation(slotIndex, cardType) ValidationResult
        +getSlotStatus() Object
        +syncWithWeaponSystem() void
        +syncWithCardInventory() void
        +exportConfiguration() Object
        +importConfiguration(config) Boolean
        +getShipCapabilities() Object
    }

    class CardSlotMatcher {
        +Map cardToSlotTypeMapping
        +Map shipTypeConstraints
        +getCompatibleSlotTypes(cardType) Array
        +isCardCompatibleWithSlot(cardType, slotType) Boolean
        +isCardCompatibleWithShip(cardType, shipType) Boolean
        +getSlotTypeForCard(cardType) String
        +validateCardPlacement(cardType, slotDefinition) Boolean
        +getSuggestedSlots(cardType, slotLayout) Array
        +getShipTypeRequirements(shipType) Object
        +validateShipConfiguration(slotLayout, installedCards) ValidationResult
    }

    class ShipMigrationManager {
        +migrateToNewShipType(oldLayout, newLayout, installedCards) MigrationResult
        +findCompatibleSlots(cardType, newLayout) Array
        +prioritizeEssentialSystems(cards) Array
        +handleOverflowCards(cards, newLayout) Array
        +generateMigrationReport(result) Object
        +validateMigration(result) Boolean
    }

    class MigrationResult {
        +Boolean success
        +Map migratedCards
        +Array overflowCards
        +Array warnings
        +Array errors
        +String summary
        +constructor()
        +addMigration(oldSlot, newSlot, cardType) void
        +addOverflow(cardType, reason) void
        +addWarning(message) void
        +addError(message) void
        +getReport() Object
    }

    ShipSlotFactory --> ShipTypeConfiguration : creates
    ShipSlotFactory --> ShipSlotLayout : creates
    ShipSlotLayout --> SlotDefinition : contains_many
    ShipSlotLayout --> ShipTypeConfiguration : uses
    UnifiedSlotManager --> ShipSlotLayout : manages
    UnifiedSlotManager --> CardSlotMatcher : validates_with
    UnifiedSlotManager --> ShipMigrationManager : uses_for_ship_changes
    ShipMigrationManager --> MigrationResult : returns
    CardSlotMatcher --> SlotDefinition : validates_against
```

## Sequence Diagram - Ship Type Change with Slot Migration

```mermaid
sequenceDiagram
    participant Player
    participant StationUI as StationUI
    participant SlotManager as UnifiedSlotManager
    participant SlotFactory as ShipSlotFactory
    participant MigrationMgr as ShipMigrationManager
    participant WeaponSystem as WeaponSystemCore
    participant CardInventory as CardInventoryUI

    Player->>StationUI: Select new ship type (Frigate)
    StationUI->>SlotManager: switchShipType("frigate")
    SlotManager->>SlotManager: getCurrentConfiguration()
    SlotManager->>SlotFactory: createSlotLayout("frigate")
    SlotFactory->>SlotFactory: getShipTypeConfiguration("frigate")
    SlotFactory-->>SlotManager: Return frigate layout (12 slots)

    SlotManager->>MigrationMgr: migrateToNewShipType(starterLayout, frigateLayout, installedCards)
    
    loop For each installed card
        MigrationMgr->>MigrationMgr: findCompatibleSlots(cardType, frigateLayout)
        
        alt Compatible slot found
            MigrationMgr->>MigrationMgr: assignToNewSlot(card, newSlotIndex)
        else No compatible slot
            MigrationMgr->>MigrationMgr: addToOverflow(card, reason)
        end
    end
    
    MigrationMgr-->>SlotManager: Return MigrationResult
    
    alt Migration successful
        SlotManager->>SlotManager: updateSlotLayout(frigateLayout)
        SlotManager->>SlotManager: applyMigratedCards()
        SlotManager->>WeaponSystem: syncWithWeaponSystem()
        SlotManager->>CardInventory: syncWithCardInventory()
        SlotManager-->>StationUI: Migration complete
        
        StationUI->>StationUI: updateUI(frigateLayout)
        StationUI-->>Player: Show new ship configuration
        
        alt Has overflow cards
            StationUI->>StationUI: showOverflowDialog(overflowCards)
            StationUI-->>Player: "Some cards couldn't be transferred"
        end
        
    else Migration failed
        SlotManager-->>StationUI: Migration failed with errors
        StationUI->>StationUI: showErrorDialog(errors)
        StationUI-->>Player: Show error message
    end
```

## Activity Diagram - Dynamic Slot Type Resolution

```mermaid
flowchart TD
    Start([Card Installation Request]) --> GetShipType[Get Current Ship Type]
    GetShipType --> GetSlotLayout[Get Ship Slot Layout]
    GetSlotLayout --> GetSlotDef[Get Slot Definition at Index]
    
    GetSlotDef --> CheckSlotExists{Slot Index Valid?}
    CheckSlotExists -->|No| ShowSlotError[Show Invalid Slot Error]
    CheckSlotExists -->|Yes| GetSlotType[Get Slot Type from Definition]
    
    GetSlotType --> CheckCompatibility{Card Compatible with Slot Type?}
    CheckCompatibility -->|No| CheckShipConstraints{Check Ship-Specific Constraints}
    CheckShipConstraints -->|Fails| ShowCompatibilityError[Show Incompatibility Error]
    CheckShipConstraints -->|Passes| ShowTypeError[Show Slot Type Mismatch]
    
    CheckCompatibility -->|Yes| CheckSlotOccupied{Slot Already Occupied?}
    CheckSlotOccupied -->|Yes| CheckReplacement{Allow Replacement?}
    CheckReplacement -->|No| ShowOccupiedError[Show Slot Occupied Error]
    CheckReplacement -->|Yes| RemoveExisting[Remove Existing Card]
    
    CheckSlotOccupied -->|No| InstallCard[Install Card in Slot]
    RemoveExisting --> InstallCard
    
    InstallCard --> UpdateSystemsByType{Determine System Type}
    UpdateSystemsByType -->|Weapon| SyncWeapons[Sync with Weapon System]
    UpdateSystemsByType -->|Engine| SyncEngines[Sync with Engine System]  
    UpdateSystemsByType -->|Shield| SyncShields[Sync with Shield System]
    UpdateSystemsByType -->|Utility| SyncUtility[Sync with Utility Systems]
    
    SyncWeapons --> UpdateUI[Update UI Display]
    SyncEngines --> UpdateUI
    SyncShields --> UpdateUI
    SyncUtility --> UpdateUI
    
    UpdateUI --> Success([Installation Complete])
    ShowSlotError --> End([End])
    ShowCompatibilityError --> End
    ShowTypeError --> End
    ShowOccupiedError --> End
```

## Ship Type Configuration Examples

```javascript
// Ship type configurations in ShipSlotFactory
const SHIP_TYPE_CONFIGURATIONS = {
    starter_ship: {
        totalSlots: 9,
        slotTypePattern: [
            'engines',    // 0
            'reactor',    // 1
            'weapons',    // 2
            'weapons',    // 3
            'weapons',    // 4
            'weapons',    // 5
            'utility',    // 6
            'utility',    // 7
            'utility'     // 8
        ],
        slotTypeDistribution: {
            engines: 1,
            reactor: 1,
            weapons: 4,
            utility: 3
        },
        maxWeaponSlots: 4,
        maxUtilitySlots: 3,
        requiresShields: false,
        allowsMultipleEngines: false
    },
    
    frigate: {
        totalSlots: 12,
        slotTypePattern: [
            'engines',    // 0
            'reactor',    // 1
            'shields',    // 2
            'weapons',    // 3
            'weapons',    // 4
            'weapons',    // 5
            'weapons',    // 6
            'weapons',    // 7
            'weapons',    // 8
            'utility',    // 9
            'utility',    // 10
            'utility'     // 11
        ],
        slotTypeDistribution: {
            engines: 1,
            reactor: 1,
            shields: 1,
            weapons: 6,
            utility: 3
        },
        maxWeaponSlots: 6,
        maxUtilitySlots: 3,
        requiresShields: true,
        allowsMultipleEngines: false
    },
    
    destroyer: {
        totalSlots: 15,
        slotTypePattern: [
            'engines',    // 0
            'engines',    // 1
            'reactor',    // 2
            'shields',    // 3
            'weapons',    // 4
            'weapons',    // 5
            'weapons',    // 6
            'weapons',    // 7
            'weapons',    // 8
            'weapons',    // 9
            'weapons',    // 10
            'weapons',    // 11
            'utility',    // 12
            'utility',    // 13
            'utility'     // 14
        ],
        slotTypeDistribution: {
            engines: 2,
            reactor: 1,
            shields: 1,
            weapons: 8,
            utility: 3
        },
        maxWeaponSlots: 8,
        maxUtilitySlots: 3,
        requiresShields: true,
        allowsMultipleEngines: true
    }
};
```

## Component Integration Diagram

```mermaid
graph TB
    subgraph "Unified Slot System"
        SlotFactory[ShipSlotFactory]
        SlotLayout[ShipSlotLayout]
        SlotManager[UnifiedSlotManager]
        SlotValidator[CardSlotMatcher]
    end
    
    subgraph "Game Systems"
        Ship[Ship Class]
        WeaponSystem[WeaponSystemCore]
        CardSystem[CardInventoryUI]
        StationUI[StationUI]
    end
    
    subgraph "Configuration Sources"
        ShipConfigs[ShipConfigs.js]
        StarterCards[Starter Card Definitions]
        CardDefinitions[Card Type Definitions]
    end
    
    SlotFactory --> SlotLayout
    SlotLayout --> SlotManager
    SlotManager --> SlotValidator
    
    Ship --> SlotManager
    WeaponSystem --> SlotManager
    CardSystem --> SlotManager
    StationUI --> CardSystem
    
    SlotFactory --> ShipConfigs
    SlotManager --> StarterCards
    SlotValidator --> CardDefinitions
    
    SlotManager -.-> Ship : "syncs slot state"
    SlotManager -.-> WeaponSystem : "updates weapon slots"
    SlotManager -.-> CardSystem : "validates installations"
```

## Key Benefits

1. **Consistency**: All systems use the same slot definitions and indexing
2. **Type Safety**: Cards can only be placed in compatible slots
3. **Synchronization**: Changes in one system automatically update others
4. **Maintainability**: Single place to define ship slot layouts
5. **Extensibility**: Easy to add new ship types with different slot configurations
6. **Validation**: Clear error messages when invalid placements are attempted

## Implementation Notes

1. **ShipSlotFactory** creates slot layouts based on ship type
2. **UnifiedSlotManager** maintains the single source of truth for installed cards
3. **CardSlotMatcher** handles all card-to-slot compatibility logic
4. **Synchronization methods** ensure weapon system and UI stay in sync
5. **Validation results** provide clear feedback for invalid operations

This unified approach ensures that whether you're initializing a ship, managing weapons in space, or configuring at a station, all systems see the same slot configuration and card placements. 