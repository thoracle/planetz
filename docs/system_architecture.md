# System Architecture Documentation ✅ FULLY IMPLEMENTED

## Overview
This document contains UML diagrams illustrating the architecture of the Planetz NFT card collection spaceship system.

**✅ IMPLEMENTATION STATUS**: All core systems fully implemented and integrated into the main game with comprehensive testing and production-ready stability.

## Core Application Architecture ✅ IMPLEMENTED

### Main Application Class Diagram

```mermaid
classDiagram
    class App {
        +THREE.Scene scene
        +THREE.WebGLRenderer renderer
        +ViewManager viewManager
        +StarfieldManager starfieldManager
        +SolarSystemManager solarSystemManager
        +DebugManager debugManager
        +WeaponEffectsManager weaponEffectsManager
        +boolean editMode
        +boolean warpControlMode
        +initialize() void
        +animate() void
        +handleKeyDown(event) void
        +toggleEditMode() void
        +toggleDebugMode() void
        +updateDebugInfo() void
    }

    class ViewManager {
        +THREE.Camera camera
        +OrbitControls controls
        +string currentView
        +boolean editMode
        +Ship playerShip
        +setView(viewName) void
        +setEditMode(enabled) void
        +updateCameraPosition() void
        +handleViewSwitch(event) void
    }

    class StarfieldManager {
        +THREE.BufferGeometry geometry
        +THREE.Points starfield
        +number starCount
        +initialize() void
        +createStarfield() void
        +updateStarfield() void
        +setStarfieldDensity(density) void
    }

    class SolarSystemManager {
        +Array celestialBodies
        +PlanetGenerator planetGenerator
        +THREE.Group solarSystemGroup
        +string currentSystem
        +generateSystem(systemData) void
        +addCelestialBody(body) void
        +getCelestialBodies() Array
        +findNearestStation(position) Object
        +getDebugInfo() Object
    }

    App --> ViewManager : manages
    App --> StarfieldManager : manages
    App --> SolarSystemManager : manages
    App --> WeaponEffectsManager : manages
    ViewManager --> Ship : controls
```

## NFT Card Collection System ✅ IMPLEMENTED

### Updated Card System Class Diagram

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
        +Number level
        +constructor(cardType, rarity, tokenId, level)
        +isDiscovered() Boolean
        +getMetadata() Object
        +generateDescription() String
        +getDisplayName() String
        +getIcon() String
        +getRarityColor() String
        +getStats() Object
        +canUpgrade() Boolean
        +getUpgradeRequirement() Number
    }

    class CardInventory {
        +Map cards
        +Set discoveredTypes
        +Number credits
        +Map stackCounts
        +addCard(nftCard) void
        +getCardCount(cardType) Number
        +canUpgrade(cardType, currentLevel) Boolean
        +getUpgradeRequirement(cardType, level) Number
        +getDiscoveredTypes() Array
        +getUndiscoveredTypes() Array
        +getAllCardTypes() Array
        +generateSpecificCard(cardType, rarity) NFTCard
        +loadTestData() void
        +getCardsByType(cardType) Array
        +spendCredits(amount) Boolean
        +addCredits(amount) void
    }

    class CardInventoryUI {
        +HTMLElement container
        +CardInventory inventory
        +Ship currentShip
        +Map shipSlots
        +boolean isDragging
        +initialize() void
        +renderCards() void
        +renderShipSlots() void
        +handleCardDrag(event) void
        +handleCardDrop(event) void
        +validateCardPlacement(cardType, slotId) Boolean
        +updateSlotDisplay(slotId) void
        +showUpgradeModal(cardType) void
        +refreshDisplay() void
        +getPlayerData() PlayerData
    }

    class PlayerData {
        +Map shipConfigurations
        +CardInventory inventory
        +Number credits
        +String activeShip
        +Array ownedShips
        +saveToStorage() void
        +loadFromStorage() void
        +getShipConfiguration(shipType) Map
        +setShipConfiguration(shipType, config) void
        +addOwnedShip(shipType, name) void
        +switchActiveShip(shipType) void
        +canAffordUpgrade(cardType, level) Boolean
    }

    class DropSystem {
        +Map dropRates
        +Map systemInventory
        +Array rarityWeights
        +generateDrop() NFTCard
        +generateDropWithType(cardType) NFTCard
        +updateInventory(cardType, quantity) void
        +getAvailableCards() Array
        +isCardAvailable(cardType) Boolean
        +calculateRarity() String
        +depleteInventory(cardType) void
    }

    CardInventory o-- NFTCard : contains_many
    CardInventoryUI --> CardInventory : manages
    CardInventoryUI --> PlayerData : accesses
    PlayerData --> CardInventory : contains
    DropSystem --> NFTCard : creates
    DropSystem --> CardInventory : provides_drops
```

### Card System Integration Sequence Diagram ✅ IMPLEMENTED

```mermaid
sequenceDiagram
    participant Player
    participant CardUI as CardInventoryUI
    participant PlayerData as PlayerData
    participant Collection as CardInventory
    participant Ship as Ship
    participant CardSystem as CardSystemIntegration

    Player->>CardUI: Open inventory interface
    CardUI->>PlayerData: getShipConfiguration(shipType)
    PlayerData->>CardUI: Return current ship slots
    CardUI->>Collection: getDiscoveredCards()
    Collection->>CardUI: Return available cards
    CardUI->>CardUI: renderCards() and renderShipSlots()

    Player->>CardUI: Drag card to ship slot
    CardUI->>CardUI: validateCardPlacement(cardType, slotId)
    CardUI->>PlayerData: setShipConfiguration(shipType, newConfig)
    PlayerData->>PlayerData: saveToStorage()
    CardUI->>Ship: Notify configuration change
    Ship->>CardSystem: loadCards()
    CardSystem->>CardSystem: createSystemsFromCards()
    CardSystem->>Ship: Update ship systems

    Player->>CardUI: Attempt card upgrade
    CardUI->>Collection: canUpgrade(cardType, level)
    Collection->>Collection: Check card count and credits
    
    alt Sufficient resources
        CardUI->>Collection: upgradeCard(cardType)
        Collection->>PlayerData: spendCredits(cost)
        CardUI->>CardUI: showUpgradeSuccess()
        CardUI->>Ship: refreshSystemStats()
    else Insufficient resources
        CardUI->>CardUI: showUpgradeRequirement()
    end
```

## Ship Management System ✅ IMPLEMENTED

### Enhanced Ship and System Architecture

```mermaid
classDiagram
    class Ship {
        +String shipType
        +ShipConfig shipConfig
        +String name
        +Number maxSlots
        +Number maxEnergy
        +Number energyRechargeRate
        +Number maxHull
        +Number currentHull
        +Number currentEnergy
        +Map systems
        +Map upgrades
        +THREE.Vector3 position
        +CardSystemIntegration cardSystemIntegration
        +WeaponSystemCore weaponSystem
        +WeaponSyncManager weaponSyncManager
        +AutoRepairSystem autoRepairSystem
        +constructor(shipType, config)
        +initializeDefaultSystems() void
        +initializeWeaponSystem() Promise
        +addSystem(systemName, system) void
        +removeSystem(systemName) void
        +getSystem(systemName) System
        +calculateTotalStats() Object
        +applyDamage(damage, damageType) void
        +applySubTargetDamage(systemName, damage) void
        +repairSystem(systemName, amount) void
        +consumeEnergy(amount) Boolean
        +hasEnergy(amount) Boolean
        +update(deltaTime) void
        +getStatus() Object
        +hasSystemCards(systemName) Promise
        +getSystemCardEffectiveness(systemName) Number
    }

    class CardSystemIntegration {
        +Ship ship
        +Map installedCards
        +CardInventoryUI cardInventoryUI
        +PlayerData playerDataCache
        +Map systemCardMapping
        +initializeCardData() Promise
        +loadCards() Promise
        +hasRequiredCards(systemName) Promise
        +getSystemCardLevel(systemName) Promise
        +getSystemCards(systemName) Promise
        +canActivateSystem(systemName) Promise
        +getSystemEffectiveness(systemName) Promise
        +createSystemsFromCards() Promise
        +refreshWeaponSystems() Promise
        +cleanupOrphanedSystems() Promise
        +createSystemCardMapping() Object
        +getSystemCardRequirements(systemName) Array
    }

    class System {
        +String systemType
        +Number level
        +Number health
        +Boolean isActive
        +Number energyConsumptionRate
        +Number slotCost
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
        +getStatus() Object
    }

    class WeaponSystemCore {
        +Ship ship
        +Array weaponSlots
        +Number activeSlotIndex
        +Boolean isAutofireOn
        +Object lockedTarget
        +WeaponHUD weaponHUD
        +Number maxWeaponSlots
        +selectPreviousWeapon() Boolean
        +selectNextWeapon() Boolean
        +fireActiveWeapon() Boolean
        +toggleAutofire() Boolean
        +updateAutofire(deltaTime) void
        +equipWeapon(slotIndex, weaponCard) Boolean
        +unequipWeapon(slotIndex) Boolean
        +getActiveWeapon() WeaponSlot
        +validateTargetLock() Boolean
        +getEquippedWeaponCount() Number
        +setLockedTarget(target) void
        +getStatus() Object
    }

    class WeaponSlot {
        +Number slotIndex
        +Ship ship
        +StarfieldManager starfieldManager
        +WeaponCard equippedWeapon
        +Boolean isEmpty
        +Number cooldownTimer
        +Number lastFireTime
        +equipWeapon(weaponCard) Boolean
        +removeWeapon() void
        +fire(ship, target) Boolean
        +canFire() Boolean
        +isInCooldown() Boolean
        +updateCooldown(deltaTimeMs) void
        +getStatus() Object
        +getCooldownRemaining() Number
    }

    class WeaponSyncManager {
        +Ship ship
        +WeaponSystemCore weaponSystem
        +Boolean initialized
        +constructor(ship)
        +initialize() Promise
        +syncWeaponsFromCards() Promise
        +refreshWeaponSlots() Promise
        +validateWeaponConfiguration() Boolean
        +getWeaponCards() Array
        +createWeaponFromCard(cardData) WeaponCard
        +clearAllWeapons() void
        +isWeaponCard(cardType) Boolean
    }

    class ShipCollection {
        +Array ownedShips
        +Ship activeShip
        +String activeShipType
        +addShip(shipType, name) Ship
        +selectShip(shipType) Boolean
        +getShip(shipType) Ship
        +getAllShips() Array
        +canSwitchShip() Boolean
        +getActiveShip() Ship
        +saveConfiguration() void
        +loadConfiguration() void
    }

    Ship --> CardSystemIntegration : contains
    Ship --> System : contains_many
    Ship --> WeaponSystemCore : contains
    Ship --> WeaponSyncManager : contains
    CardSystemIntegration --> Ship : references
    WeaponSystemCore --> WeaponSlot : manages_many
    WeaponSyncManager --> WeaponSystemCore : manages
    ShipCollection --> Ship : contains_many
    System <|-- ImpulseEngines
    System <|-- WarpDrive
    System <|-- Shields
    System <|-- LongRangeScanner
    System <|-- TargetComputer
    System <|-- SubspaceRadioSystem
    System <|-- HullPlating
    System <|-- EnergyReactor
    System <|-- CargoHold
```

## Weapon System Architecture ✅ IMPLEMENTED

### Comprehensive Weapon System Class Diagram

```mermaid
classDiagram
    class WeaponCard {
        +String cardType
        +String name
        +Number level
        +Number damage
        +Number range
        +Number cooldown
        +Number energyCost
        +String projectileType
        +Boolean targetLockRequired
        +String effectType
        +Object metadata
        +constructor(cardType, level)
        +calculateDamage() Number
        +calculateRange() Number
        +calculateCooldown() Number
        +getEffectiveness() Number
        +canFire(ship, target) Boolean
        +getStats() Object
        +upgrade(newLevel) void
    }

    class WeaponDefinitions {
        +Map WEAPON_DEFINITIONS
        +getWeaponData(cardType) Object
        +createWeaponCard(cardType, level) WeaponCard
        +isProjectileWeapon(cardType) Boolean
        +getWeaponCategory(cardType) String
        +getDefaultStats(cardType) Object
    }

    class WeaponEffectsManager {
        +THREE.Scene scene
        +Array activeEffects
        +Map effectPools
        +ParticleSystem particleSystem
        +initialize(scene) void
        +createLaserEffect(start, end, color) void
        +createPlasmaEffect(start, end, color) void
        +createMissileEffect(start, end, type) void
        +createExplosionEffect(position, scale) void
        +updateEffects(deltaTime) void
        +cleanupEffect(effect) void
        +getEffectByType(type) Object
        +setEffectIntensity(intensity) void
    }

    class ProjectileSystem {
        +Array activeProjectiles
        +THREE.Scene scene
        +StarfieldManager starfieldManager
        +createProjectile(weaponData, start, target) Projectile
        +updateProjectiles(deltaTime) void
        +handleProjectileCollision(projectile, target) void
        +removeProjectile(projectile) void
        +getProjectileCount() Number
        +clearAllProjectiles() void
    }

    class Projectile {
        +THREE.Object3D mesh
        +THREE.Vector3 position
        +THREE.Vector3 velocity
        +THREE.Vector3 target
        +Number damage
        +Number speed
        +Number lifespan
        +String type
        +Boolean isHoming
        +Number trackingStrength
        +update(deltaTime) void
        +checkCollision(targets) Boolean
        +detonate() void
        +destroy() void
        +setTarget(target) void
    }

    WeaponSystemCore --> WeaponCard : uses
    WeaponCard --> WeaponDefinitions : references
    WeaponSystemCore --> WeaponEffectsManager : uses
    WeaponSystemCore --> ProjectileSystem : uses
    ProjectileSystem --> Projectile : manages_many
    WeaponEffectsManager --> THREE.Scene : renders_to
    ProjectileSystem --> THREE.Scene : renders_to
```

## Station and Docking System ✅ IMPLEMENTED

### Station Integration Class Diagram

```mermaid
classDiagram
    class DockingSystemManager {
        +Ship playerShip
        +SolarSystemManager solarSystemManager
        +HTMLElement dockingModal
        +HTMLElement stationServicesModal
        +Object nearestStation
        +Boolean isDocked
        +Number dockingRange
        +initialize(ship, solarSystemManager) void
        +checkDockingRange() Boolean
        +showDockingModal(station) void
        +hideDockingModal() void
        +dock(station) Promise
        +undock() Promise
        +showStationServices(station) void
        +hideStationServices() void
        +refreshStationInterface() void
        +getRepairCosts() Object
        +performRepairs(systems) Promise
    }

    class StationServices {
        +Object station
        +Ship currentShip
        +RepairService repairService
        +InventoryService inventoryService
        +ShipSwitchingService shipSwitchingService
        +constructor(station, ship)
        +getAvailableServices() Array
        +calculateRepairCosts(ship) Object
        +performFullRepair(ship) Promise
        +performSystemRepair(ship, systemName) Promise
        +openInventoryInterface() void
        +enableShipSwitching() void
        +getFactionPricing() Object
    }

    class RepairService {
        +Object station
        +Number baseCost
        +Map factionMultipliers
        +calculateCost(damage, systemType, shipType) Number
        +repairSystem(ship, systemName, amount) Promise
        +repairAllSystems(ship) Promise
        +getRepairTime(damage) Number
        +canRepair(ship, systemName) Boolean
        +getFactionDiscount(playerFaction, stationFaction) Number
    }

    class InventoryService {
        +Ship ship
        +CardInventoryUI cardInterface
        +PlayerData playerData
        +openCardInventory() void
        +enableShipSwitching() void
        +saveShipConfiguration() void
        +loadShipConfiguration() void
        +validateConfiguration() Boolean
        +refreshInterface() void
    }

    DockingSystemManager --> StationServices : uses
    StationServices --> RepairService : contains
    StationServices --> InventoryService : contains
    InventoryService --> CardInventoryUI : manages
    InventoryService --> PlayerData : accesses
```

## Main Game Loop Integration ✅ IMPLEMENTED

### Game Loop Sequence Diagram

```mermaid
sequenceDiagram
    participant GameLoop
    participant ViewManager
    participant Ship
    participant WeaponSystem
    participant Systems
    participant StarfieldManager
    participant SolarSystemManager

    loop Every Frame
        GameLoop->>ViewManager: update(deltaTime)
        ViewManager->>Ship: update(deltaTime)
        Ship->>Systems: update(deltaTime) for each system
        Systems->>Ship: Consume energy if active
        Ship->>WeaponSystem: updateAutofire(deltaTime)
        WeaponSystem->>WeaponSystem: Update weapon cooldowns
        
        alt Autofire enabled and target locked
            WeaponSystem->>WeaponSystem: fireActiveWeapon()
            WeaponSystem->>StarfieldManager: Create weapon effects
        end
        
        Ship->>Ship: Update energy recharge
        Ship->>Ship: Process system damage
        
        GameLoop->>SolarSystemManager: update(deltaTime)
        SolarSystemManager->>SolarSystemManager: Update celestial bodies
        
        GameLoop->>StarfieldManager: update(deltaTime)
        StarfieldManager->>StarfieldManager: Update weapon effects
        StarfieldManager->>StarfieldManager: Update projectiles
        
        GameLoop->>GameLoop: Render scene
    end
```

## Data Flow Architecture ✅ IMPLEMENTED

### System Data Flow Diagram

```mermaid
flowchart TD
    A[Player Input] --> B[Input Handler]
    B --> C{Input Type}
    
    C -->|Card Management| D[CardInventoryUI]
    C -->|Ship Control| E[Ship Controller]
    C -->|Weapon Control| F[WeaponSystemCore]
    C -->|View Control| G[ViewManager]
    
    D --> H[PlayerData]
    H --> I[LocalStorage]
    
    E --> J[Ship Systems]
    J --> K[CardSystemIntegration]
    K --> L[System Validation]
    
    F --> M[WeaponSlots]
    M --> N[WeaponEffects]
    N --> O[StarfieldManager]
    
    G --> P[Camera Control]
    P --> Q[THREE.js Renderer]
    
    R[Game Loop] --> S[Update All Systems]
    S --> T[Render Frame]
    
    U[Station Docking] --> V[DockingSystemManager]
    V --> W[Station Services]
    W --> X[Repair/Inventory]
    
    style A fill:#e1f5fe
    style I fill:#f3e5f5
    style Q fill:#e8f5e8
    style T fill:#fff3e0
```

## Error Handling and Recovery ✅ IMPLEMENTED

### Error Handling Architecture

```mermaid
classDiagram
    class ErrorHandler {
        +static Map errorTypes
        +static Array errorLog
        +static handleSystemError(error, context) void
        +static handleCardError(error, cardType) void
        +static handleWeaponError(error, weaponSlot) void
        +static handleDockingError(error, station) void
        +static logError(error, severity) void
        +static getErrorReport() Object
        +static clearErrorLog() void
    }

    class SystemRecovery {
        +Ship ship
        +Map recoveryStrategies
        +recoverFromSystemFailure(systemName) Boolean
        +recoverFromCardError(cardType) Boolean
        +recoverFromWeaponError(slotIndex) Boolean
        +validateAndRepair() Boolean
        +emergencyFallback() void
        +getRecoveryStatus() Object
    }

    class ValidationManager {
        +static validateShipConfiguration(ship) ValidationResult
        +static validateCardInstallation(cardType, slotId) ValidationResult
        +static validateWeaponConfiguration(weaponSystem) ValidationResult
        +static validateEnergyBalance(ship) ValidationResult
        +static getValidationErrors() Array
    }

    ErrorHandler --> SystemRecovery : triggers
    SystemRecovery --> ValidationManager : uses
    ValidationManager --> Ship : validates
```

## Performance Monitoring ✅ IMPLEMENTED

### Performance Architecture

```mermaid
classDiagram
    class PerformanceMonitor {
        +Stats stats
        +Map performanceMetrics
        +Number frameTime
        +Number memoryUsage
        +Number activeEffects
        +initialize() void
        +updateMetrics() void
        +getFrameRate() Number
        +getMemoryUsage() Number
        +getActiveObjectCount() Number
        +logPerformanceData() void
        +optimizeIfNeeded() void
    }

    class DebugManager {
        +PerformanceMonitor monitor
        +HTMLElement debugInfo
        +Boolean visible
        +Stats stats
        +THREE.AxesHelper axesHelper
        +THREE.GridHelper gridHelper
        +initialize(scene, container) void
        +toggle() void
        +updateInfo() void
        +setEditMode(enabled) void
        +update() void
    }

    App --> DebugManager : contains
    DebugManager --> PerformanceMonitor : contains
```

**✅ IMPLEMENTATION STATUS**: All architectural components are fully implemented, tested, and integrated into the production game. The system demonstrates enterprise-level software architecture with proper separation of concerns, error handling, and performance monitoring.

This architecture provides a solid foundation for continued development and demonstrates professional game development practices with modern web technologies. 