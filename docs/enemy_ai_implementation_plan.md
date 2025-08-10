# Enemy AI Implementation Plan

## Overview

This document outlines a comprehensive implementation plan for the Enemy AI system based on the specifications in `enemy_ai_spec.md`. The plan is designed to integrate seamlessly with the existing Planetz codebase while maintaining performance and the retro aesthetic.

## Architecture Overview

### Core AI Components

```
EnemyAIManager
├── EncounterSpawner          # Spawns and manages encounters
├── FlockingSystem            # Handles boid-based movement
├── CombatAISystem            # Manages combat decisions
├── FactionManager            # Handles faction relationships
└── SpatialPartitionSystem    # Optimizes spatial queries
```

### Integration Points

The AI system will integrate with existing systems:
- **EnemyShip.js**: Add AI state and behavior properties
- **StarfieldManager.js**: Coordinate AI updates with game loop
- **PhysicsManager.js**: Handle AI movement and collision
- **WeaponSystem**: AI weapon usage and targeting
- **ProximityDetector3D**: AI ships appear on radar

## Phase 1: Core Foundation (Week 1-2)

### 1.1 EnemyAI Base Class
**File**: `frontend/static/js/ai/EnemyAI.js`

```javascript
export class EnemyAI {
    constructor(ship, aiConfig) {
        this.ship = ship;
        this.config = aiConfig;
        this.state = 'idle';
        this.behaviorWeights = {};
        this.sensors = new SensorSystem(ship);
        this.stateMachine = new AIStateMachine();
    }
}
```

**Integration**: Extend existing `EnemyShip.js` to include AI instance

### 1.2 AI Configuration System
**File**: `frontend/static/js/ai/AIConfigs.js`

Ship-specific AI configurations matching the specification tables:

```javascript
export const AI_CONFIGS = {
    scout: {
        sensorRange: 2000,
        behaviorWeights: {
            separation: 0.8,
            alignment: 0.2,
            cohesion: 0.2,
            pursuit: 0.1,
            evasion: 0.9,
            orbiting: 0.8
        },
        combatThresholds: {
            fleeHealth: 0.3,
            engageRange: 1500
        }
    },
    // ... other ship types
};
```

### 1.3 State Machine Framework
**File**: `frontend/static/js/ai/AIStateMachine.js`

Finite state machine implementing the 5 states from spec:
- Idle, Engage, Evade, Flee, Buzz

```javascript
export class AIStateMachine {
    constructor() {
        this.currentState = 'idle';
        this.states = new Map();
        this.transitionRules = new Map();
    }
    
    update(deltaTime, context) {
        const currentState = this.states.get(this.currentState);
        const newState = currentState.update(deltaTime, context);
        
        if (newState !== this.currentState) {
            this.transition(newState, context);
        }
    }
}
```

## Phase 2: Flocking and Movement (Week 3-4)

### 2.1 Flocking System
**File**: `frontend/static/js/ai/FlockingSystem.js`

Implementation of Craig Reynolds' boid model for 3D space:

```javascript
export class FlockingSystem {
    constructor() {
        this.entities = [];
        this.spatialGrid = new SpatialHashGrid(1000); // 1km cells
    }
    
    calculateSeparation(entity, neighbors) {
        // Avoid crowding - repulsion vector
    }
    
    calculateAlignment(entity, neighbors) {
        // Match velocity with neighbors
    }
    
    calculateCohesion(entity, neighbors) {
        // Move toward center of mass
    }
    
    calculatePursuit(entity, target) {
        // Predictive targeting
    }
    
    calculateEvasion(entity, threat) {
        // Avoid threats
    }
    
    calculateOrbiting(entity, target, distance) {
        // Circular movement around target
    }
}
```

### 2.2 Spatial Optimization
**File**: `frontend/static/js/ai/SpatialHashGrid.js`

Optimize neighbor queries using spatial partitioning:

```javascript
export class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    insert(entity) {
        const hash = this.hash(entity.position);
        if (!this.grid.has(hash)) {
            this.grid.set(hash, []);
        }
        this.grid.get(hash).push(entity);
    }
    
    query(position, radius) {
        // Return nearby entities efficiently
    }
}
```

## Phase 3: Combat AI (Week 5-6)

### 3.1 Combat Decision System
**File**: `frontend/static/js/ai/CombatAI.js`

```javascript
export class CombatAI {
    constructor(ship) {
        this.ship = ship;
        this.threatAssessment = new ThreatAssessment();
        this.weaponController = new AIWeaponController(ship);
    }
    
    update(deltaTime) {
        const threats = this.threatAssessment.evaluateThreats();
        const primaryTarget = this.selectTarget(threats);
        
        if (primaryTarget) {
            this.engageTarget(primaryTarget, deltaTime);
        }
    }
    
    engageTarget(target, deltaTime) {
        // Weapon firing logic
        // Tactical positioning
        // Evasive maneuvers
    }
}
```

### 3.2 Threat Assessment
**File**: `frontend/static/js/ai/ThreatAssessment.js`

```javascript
export class ThreatAssessment {
    evaluateThreats(ship, detectedEntities) {
        return detectedEntities
            .filter(entity => this.isHostile(entity, ship))
            .map(entity => ({
                entity,
                threatLevel: this.calculateThreatLevel(entity, ship),
                distance: ship.position.distanceTo(entity.position)
            }))
            .sort((a, b) => b.threatLevel - a.threatLevel);
    }
    
    calculateThreatLevel(entity, ship) {
        // Distance, firepower, faction consideration
        const distanceFactor = 1 / Math.max(0.1, entity.distance / 1000);
        const firepowerFactor = entity.currentFirepower / 100;
        const healthFactor = entity.currentHull / entity.maxHull;
        
        return distanceFactor * firepowerFactor * healthFactor;
    }
}
```

## Phase 4: Faction System (Week 7)

### 4.1 Faction Manager
**File**: `frontend/static/js/ai/FactionManager.js`

```javascript
export class FactionManager {
    constructor() {
        this.factions = new Map();
        this.relationships = new Map(); // faction1_faction2 -> disposition
    }
    
    getDisposition(faction1, faction2) {
        const key = `${faction1}_${faction2}`;
        return this.relationships.get(key) || 'neutral';
    }
    
    setDisposition(faction1, faction2, disposition) {
        // Update faction relationships
        // Handle dynamic shifts (neutral -> hostile)
    }
    
    isHostile(ship1, ship2) {
        return this.getDisposition(ship1.faction, ship2.faction) === 'hostile';
    }
}
```

### 4.2 Faction Behaviors
**File**: `frontend/static/js/ai/FactionBehaviors.js`

Implement specific behaviors for each disposition:
- **Friendly**: Escort, defend, assist
- **Neutral**: Buzz maneuver, inspect, ignore
- **Hostile**: Attack, pursue, prioritize threats

## Phase 5: Encounter System (Week 8-9)

### 5.1 Encounter Spawner
**File**: `frontend/static/js/ai/EncounterSpawner.js`

```javascript
export class EncounterSpawner {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.activeEncounters = [];
        this.spawnRules = new Map();
    }
    
    spawnEncounter(type, position, playerLevel) {
        switch(type) {
            case 'solo':
                return this.spawnSoloEncounter(position, playerLevel);
            case 'patrol':
                return this.spawnPatrolEncounter(position, playerLevel);
            case 'formation':
                return this.spawnFormationEncounter(position, playerLevel);
        }
    }
    
    spawnPatrolEncounter(position, playerLevel) {
        const shipCount = 2 + Math.floor(Math.random() * 4); // 2-5 ships
        const ships = [];
        
        for (let i = 0; i < shipCount; i++) {
            const shipType = this.selectShipType('patrol', playerLevel);
            const ship = this.createAIShip(shipType, position);
            ships.push(ship);
        }
        
        // Set up formation and AI coordination
        return new PatrolEncounter(ships);
    }
}
```

### 5.2 Formation Manager
**File**: `frontend/static/js/ai/FormationManager.js`

```javascript
export class FormationManager {
    constructor() {
        this.formations = new Map();
        this.initializeFormationPatterns();
    }
    
    initializeFormationPatterns() {
        this.formations.set('v_formation', new VFormation());
        this.formations.set('line_formation', new LineFormation());
        this.formations.set('sphere_escort', new SphereEscort());
        this.formations.set('cylinder_escort', new CylinderEscort());
    }
    
    assignFormationPositions(ships, formationType, leader) {
        const formation = this.formations.get(formationType);
        return formation.assignPositions(ships, leader);
    }
}
```

## Phase 6: Carrier Operations (Week 10)

### 6.1 Carrier AI Controller
**File**: `frontend/static/js/ai/CarrierAI.js`

```javascript
export class CarrierAI extends EnemyAI {
    constructor(ship, aiConfig) {
        super(ship, aiConfig);
        this.launchedFighters = [];
        this.maxFighters = 6;
        this.launchCooldown = 0;
        this.landingBayHealth = 1.0;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        this.manageFighters(deltaTime);
        this.checkWarpConditions();
    }
    
    launchFighter() {
        if (this.canLaunchFighter()) {
            const fighter = this.createFighter();
            this.launchedFighters.push(fighter);
            this.launchCooldown = 30 + Math.random() * 30; // 30-60 seconds
        }
    }
    
    checkWarpConditions() {
        const hullPercent = this.ship.currentHull / this.ship.maxHull;
        
        if (hullPercent < 0.2 || this.landingBayHealth < 0.1) {
            this.initiateWarpOut();
        }
    }
}
```

## Phase 7: Performance Optimization (Week 11)

### 7.1 AI Manager
**File**: `frontend/static/js/ai/EnemyAIManager.js`

Central coordinator that manages all AI systems:

```javascript
export class EnemyAIManager {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.aiEntities = [];
        this.flockingSystem = new FlockingSystem();
        this.encounterSpawner = new EncounterSpawner(starfieldManager);
        this.factionManager = new FactionManager();
        
        // Performance optimization
        this.updateRate = {
            flocking: 1000 / 15,    // 15 Hz
            combat: 1000 / 10,      // 10 Hz
            faction: 1000 / 3       // 3 Hz
        };
        this.lastUpdate = {
            flocking: 0,
            combat: 0,
            faction: 0
        };
    }
    
    update(deltaTime) {
        const now = Date.now();
        
        // Variable update rates for performance
        if (now - this.lastUpdate.flocking > this.updateRate.flocking) {
            this.updateFlocking(deltaTime);
            this.lastUpdate.flocking = now;
        }
        
        if (now - this.lastUpdate.combat > this.updateRate.combat) {
            this.updateCombat(deltaTime);
            this.lastUpdate.combat = now;
        }
        
        if (now - this.lastUpdate.faction > this.updateRate.faction) {
            this.updateFactionLogic(deltaTime);
            this.lastUpdate.faction = now;
        }
    }
}
```

### 7.2 Level-of-Detail (LOD) System
**File**: `frontend/static/js/ai/AILODSystem.js`

```javascript
export class AILODSystem {
    constructor() {
        this.lodLevels = {
            high: { distance: 5000, updateRate: 60 },    // Full AI within 5km
            medium: { distance: 20000, updateRate: 15 },  // Reduced AI 5-20km
            low: { distance: 50000, updateRate: 3 },      // Minimal AI 20-50km
            culled: { distance: Infinity, updateRate: 0 } // No AI beyond 50km
        };
    }
    
    getLODLevel(ship, playerPosition) {
        const distance = ship.position.distanceTo(playerPosition);
        
        for (const [level, config] of Object.entries(this.lodLevels)) {
            if (distance <= config.distance) {
                return level;
            }
        }
        return 'culled';
    }
}
```

## Phase 8: Integration & Polish (Week 12)

### 8.1 StarfieldManager Integration
**Modifications to**: `frontend/static/js/views/StarfieldManager.js`

```javascript
// Add to StarfieldManager constructor
this.enemyAIManager = new EnemyAIManager(this);

// Add to update loop
update(deltaTime) {
    // ... existing code ...
    
    // Update AI systems
    if (this.enemyAIManager) {
        this.enemyAIManager.update(deltaTime);
    }
}

// Add encounter spawning methods
spawnRandomEncounter() {
    const playerPosition = this.camera.position;
    const spawnDistance = 10000 + Math.random() * 20000; // 10-30km away
    const spawnPosition = this.generateSpawnPosition(playerPosition, spawnDistance);
    
    const encounterType = this.selectEncounterType();
    this.enemyAIManager.encounterSpawner.spawnEncounter(encounterType, spawnPosition, this.playerLevel);
}
```

### 8.2 Physics Integration
**Modifications to**: `frontend/static/js/PhysicsManager.js`

```javascript
// Add AI ship physics bodies
createAIShipPhysicsBody(ship, position) {
    const shape = new this.Ammo.btSphereShape(3.0); // 3m radius
    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new this.Ammo.btVector3(position.x, position.y, position.z));
    
    const motionState = new this.Ammo.btDefaultMotionState(transform);
    const inertia = new this.Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(100, inertia); // 100kg mass
    
    const rigidBody = new this.Ammo.btRigidBody(
        new this.Ammo.btRigidBodyConstructionInfo(100, motionState, shape, inertia)
    );
    
    // Tag as AI ship
    rigidBody.userData = { type: 'ai_ship', ship: ship };
    
    this.physicsWorld.addRigidBody(rigidBody);
    return rigidBody;
}
```

## Configuration Files

### AI Tuning Configuration
**File**: `frontend/static/data/ai_tuning.json`

```json
{
    "global": {
        "maxActiveEncounters": 3,
        "spawnDistanceMin": 10000,
        "spawnDistanceMax": 30000,
        "despawnDistance": 50000
    },
    "shipTypes": {
        "scout": {
            "sensorRange": 2000,
            "behaviorWeights": {
                "separation": 0.8,
                "alignment": 0.2,
                "cohesion": 0.2,
                "pursuit": 0.1,
                "evasion": 0.9,
                "orbiting": 0.8
            },
            "combatThresholds": {
                "fleeHealthPercent": 0.3,
                "engageRange": 1500,
                "buzzDistance": 500
            }
        }
    },
    "formations": {
        "patrol_v": {
            "spacing": 200,
            "flexibility": 0.3
        },
        "escort_sphere": {
            "radius": 500,
            "verticalSpread": 100
        }
    }
}
```

## Testing Strategy

### Unit Tests
- **FlockingSystem**: Test separation, alignment, cohesion calculations
- **ThreatAssessment**: Verify threat level calculations
- **StateMachine**: Test state transitions
- **FormationManager**: Validate formation position calculations

### Integration Tests
- **AI-Physics Integration**: Verify AI ships move correctly in physics world
- **Combat Scenarios**: Test various encounter types
- **Performance Tests**: Measure frame rate with multiple AI ships

### Debugging Tools

```javascript
// AI Debug Visualization
export class AIDebugRenderer {
    constructor(scene) {
        this.scene = scene;
        this.debugLines = [];
    }
    
    visualizeFlockingVectors(ship) {
        // Draw separation, alignment, cohesion vectors as colored lines
    }
    
    showAIState(ship) {
        // Display current AI state above ship
    }
    
    showFormationStructure(formation) {
        // Draw formation pattern and ship positions
    }
}
```

## Performance Targets

- **Maximum AI Ships**: 20 concurrent without frame rate impact
- **Update Frequency**: 15 Hz for flocking, 10 Hz for combat
- **Memory Usage**: <50MB for AI systems
- **CPU Usage**: <10% for AI on recommended hardware

## Risk Mitigation

### Technical Risks
1. **Performance Impact**: Use LOD system and variable update rates
2. **Physics Integration Complexity**: Incremental integration with fallbacks
3. **Behavioral Complexity**: Start simple, iterate based on testing

### Design Risks
1. **AI Too Predictable**: Add randomization and personality quirks
2. **AI Too Aggressive**: Implement retreat behaviors and faction diplomacy
3. **Formation Breaking**: Robust formation recovery mechanisms

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1 | Week 1-2 | Core AI framework, state machine, configuration system |
| 2 | Week 3-4 | Flocking system, spatial optimization, basic movement |
| 3 | Week 5-6 | Combat AI, threat assessment, weapon integration |
| 4 | Week 7 | Faction system, diplomatic behaviors |
| 5 | Week 8-9 | Encounter spawning, formation management |
| 6 | Week 10 | Carrier operations, advanced ship behaviors |
| 7 | Week 11 | Performance optimization, LOD system |
| 8 | Week 12 | Integration, polish, debugging tools |

## Success Criteria

### Minimum Viable Product (MVP)
- ✅ Basic AI ships that can move and fight
- ✅ Simple flocking behaviors (separation, alignment, cohesion)
- ✅ State machine with idle, engage, flee states
- ✅ Integration with existing weapon and physics systems

### Full Feature Set
- ✅ All 6 ship types with unique behaviors
- ✅ Complete faction system with dynamic relationships
- ✅ Formation flying and coordinated tactics
- ✅ Carrier operations with fighter launching
- ✅ Performance optimized for 20+ concurrent AI ships
- ✅ Debugging and tuning tools

This implementation plan provides a structured approach to building the Enemy AI system while maintaining compatibility with the existing Planetz codebase and achieving the retro space combat aesthetic outlined in the specification.
