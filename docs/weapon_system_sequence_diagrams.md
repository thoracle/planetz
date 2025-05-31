# Weapon System Setup - UML Sequence Diagrams

## Scenario 1: Game Start (New Ship Initialization)

```mermaid
sequenceDiagram
    participant App as app.js
    participant VM as ViewManager
    participant Ship as Ship
    participant SC as ShipConfigs
    participant WSC as WeaponSystemCore
    participant WD as WeaponDefinitions
    participant CSI as CardSystemIntegration

    App->>VM: new ViewManager()
    VM->>Ship: new Ship('starter_ship')
    Ship->>SC: getShipConfig('starter_ship')
    SC-->>Ship: shipConfig with defaultSystems
    
    Ship->>Ship: initializeDefaultSystems()
    Ship->>Ship: addSystem('laser_cannon', weapons)
    
    Note over Ship: Asynchronous initialization
    Ship->>CSI: initializeCardData()
    CSI-->>Ship: Card data loaded
    
    Ship->>Ship: initializeWeaponSystem()
    Ship->>WSC: new WeaponSystemCore(ship, 4)
    WSC-->>Ship: Weapon system created
    
    Ship->>Ship: autoEquipWeaponCards()
    Ship->>Ship: getSystem('laser_cannon')
    Ship-->>Ship: Found legacy laser_cannon system
    
    Ship->>WD: createWeaponCard('laser_cannon')
    WD-->>Ship: WeaponCard instance
    
    Ship->>WSC: equipWeapon(0, weaponCard)
    WSC-->>Ship: Weapon equipped to slot 0
    
    Note over Ship: Result: 1 laser cannon in slot 0
```

## Scenario 2: Launch from Station (Existing Ship Configuration)

```mermaid
sequenceDiagram
    participant DI as DockingInterface
    participant SM as StarfieldManager
    participant CIU as CardInventoryUI
    participant Ship as Ship
    participant WSC as WeaponSystemCore
    participant WD as WeaponDefinitions

    Note over DI: Player clicks Launch button
    DI->>SM: undock()
    SM->>SM: restoreAllSystems()
    
    Note over SM: Ship systems are restored to pre-docking state
    SM->>Ship: Ship systems already exist
    
    Note over CIU: CardInventoryUI has been showing ship configuration
    CIU->>CIU: loadCurrentShipConfiguration(ship)
    CIU->>Ship: Check shipConfig.starterCards
    CIU->>CIU: Map starter cards to slots
    
    Note over CIU: Shows 1 laser_cannon in weapon slot
    
    Note over Ship: WeaponSystemCore already initialized
    Ship->>WSC: autoEquipWeaponCards() (if reconnection needed)
    Ship->>Ship: getSystem('laser_cannon')
    Ship-->>Ship: Found legacy laser_cannon system
    
    Ship->>WD: createWeaponCard('laser_cannon')
    WD-->>Ship: WeaponCard instance
    
    Ship->>WSC: equipWeapon(0, weaponCard)
    WSC-->>Ship: Weapon equipped to slot 0
    
    Note over Ship: Result: 1 laser cannon in slot 0
```

## Current Issues Identified

### 1. **Inconsistent Weapon Slot Configuration**
- **Game Start**: Ship configured with 4 weapon slots in WeaponSystemCore
- **Docking Interface**: Shows only 1 weapon slot from starterCards
- **Result**: Mismatch between display and actual weapon system

### 2. **Multiple Weapon Loading Paths**
- **StarterCards**: Used by CardInventoryUI for docking interface display
- **Ship Systems**: Used by WeaponSystemCore for actual weapon loading
- **Card Inventory**: Used as fallback by autoEquipWeaponCards()

### 3. **Initialization Timing Issues**
- WeaponSystemCore initializes before ship systems are fully loaded
- CardInventoryUI loads separately from weapon system
- No synchronization between docking interface and weapon system

## Proposed Unified Solution

```mermaid
sequenceDiagram
    participant Init as Initializer
    participant Ship as Ship
    participant SC as ShipConfigs
    participant WSM as WeaponSyncManager
    participant WSC as WeaponSystemCore
    participant CIU as CardInventoryUI

    Note over Init: Unified weapon initialization
    Init->>Ship: Ship creation/restoration
    Ship->>SC: getShipConfig()
    SC-->>Ship: Unified weapon configuration
    
    Ship->>WSM: new WeaponSyncManager(ship)
    WSM->>WSM: analyzeWeaponSources()
    
    Note over WSM: Check all weapon sources
    WSM->>Ship: getSystem('laser_cannon')
    WSM->>Ship: getShipConfig().starterCards
    WSM->>CIU: getInstalledWeaponCards()
    
    WSM->>WSM: reconcileWeaponConfiguration()
    Note over WSM: Create unified weapon list
    
    WSM->>WSC: new WeaponSystemCore(ship, slotCount)
    WSM->>WSC: equipWeapons(weaponList)
    
    WSM->>CIU: syncDisplayWithWeaponSystem()
    Note over WSM: Ensure both show same weapons
    
    Note over Init: Result: Consistent weapon display everywhere
```

## Implementation Strategy

### Phase 1: Create WeaponSyncManager
```javascript
class WeaponSyncManager {
    constructor(ship) {
        this.ship = ship;
        this.weaponSystem = null;
        this.cardInventoryUI = null;
    }
    
    async initializeWeapons() {
        // 1. Analyze all weapon sources
        const weapons = await this.gatherAllWeapons();
        
        // 2. Create weapon system with correct slot count
        const slotCount = Math.max(weapons.length, 1); // At least 1 slot
        this.weaponSystem = new WeaponSystemCore(this.ship, slotCount);
        
        // 3. Equip weapons to system
        await this.equipWeaponsToSystem(weapons);
        
        // 4. Sync with card inventory display
        await this.syncWithCardInventory(weapons);
    }
}
```

### Phase 2: Update ShipConfigs for Consistency
```javascript
// Make starter ship weapon slots dynamic based on actual weapons
starterCards: {
    weapon_1: { cardType: 'laser_cannon', level: 1 }
    // Add more weapons here to test 4-weapon setup
},
slotConfig: {
    weapons: 'dynamic' // Calculate based on starterCards
}
```

### Phase 3: Unified Initialization Entry Point
```javascript
Ship.prototype.initializeWeaponSystem = async function() {
    this.weaponSyncManager = new WeaponSyncManager(this);
    await this.weaponSyncManager.initializeWeapons();
    this.weaponSystem = this.weaponSyncManager.weaponSystem;
}
```

## Benefits of Unified Approach

1. **Consistency**: Docking interface and weapon system always show same weapons
2. **Flexibility**: Easy to add/remove weapons and have both systems sync
3. **Single Source of Truth**: WeaponSyncManager manages all weapon configuration
4. **Debugging**: Clear centralized place to troubleshoot weapon issues
5. **Testing**: Can easily test with different weapon configurations

## Testing Configuration for 4 Weapons

To test with 4 weapon slots as requested:

```javascript
// ShipConfigs.js - starter_ship
starterCards: {
    utility_1: { cardType: 'target_computer', level: 1 },
    engine_1: { cardType: 'impulse_engines', level: 1 },
    power_1: { cardType: 'energy_reactor', level: 1 },
    weapon_1: { cardType: 'laser_cannon', level: 1 },
    weapon_2: { cardType: 'pulse_cannon', level: 1 },
    weapon_3: { cardType: 'plasma_cannon', level: 1 },
    weapon_4: { cardType: 'phaser_array', level: 1 }
},
slotConfig: {
    weapons: 4  // Now matches actual weapon count
}
```

This will ensure both the docking interface and weapon system show exactly 4 weapons consistently. 