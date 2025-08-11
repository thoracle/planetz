# Enemy AI System User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [AI System Components](#ai-system-components)
4. [Ship Types and Behaviors](#ship-types-and-behaviors)
5. [Debug Commands](#debug-commands)
6. [Performance Settings](#performance-settings)
7. [Integration Guide](#integration-guide)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

## Overview

The Enemy AI system provides sophisticated, ship-type specific artificial intelligence for space combat scenarios. The system includes flocking behaviors, formation flying, advanced combat AI, weapon targeting, and performance optimization.

### Key Features
- **Ship-Type Specialization**: 6 unique ship types with distinct combat behaviors
- **Flocking & Formations**: Coordinated group movement with 6 formation patterns
- **Advanced Combat**: Weapon targeting with ballistic prediction and combat maneuvers
- **Performance Optimization**: Level-of-Detail (LOD) system for scalable performance
- **Debug Visualization**: Comprehensive 3D debug overlays and statistics
- **Game Integration**: Complete damage system, effects, and world interaction

### System Architecture
```
EnemyAIManager (Central Coordinator)
├── AIPerformanceManager (LOD & Optimization)
├── FlockingManager (Group Coordination)
├── AIDebugVisualizer (3D Debug Overlays)
└── Individual AI Ships
    ├── EnemyAI (Core AI Logic)
    ├── AIStateMachine (State Management)
    ├── ThreatAssessment (Target Evaluation)
    ├── CombatBehavior (Combat AI)
    ├── WeaponTargeting (Fire Control)
    └── FlockingBehavior (Movement Coordination)
```

## Getting Started

### Basic Usage

1. **Enable AI System**: The AI system is automatically initialized when the game loads.

2. **Spawn AI Ships**: Press `Q` to spawn target dummy ships with AI enabled.

3. **Enable Debug Mode**: Press `Cmd+Shift+A` to enable AI debug visualization.

4. **Test Combat**: Press `Cmd+Shift+X` to make all AIs target the player ship.

### Quick Test Sequence
```
1. Press Q                 → Spawn 3 target dummies with AI
2. Press Cmd+Shift+A      → Enable debug mode (see AI visualizations)
3. Press Cmd+Shift+V      → Create V-Formation
4. Press Cmd+Shift+X      → Make AIs target player
5. Press Cmd+Shift+S      → View comprehensive AI statistics
```

## AI System Components

### Core Components

#### EnemyAI (Base AI Class)
- **Purpose**: Main AI logic coordinator
- **Features**: State management, threat assessment, combat coordination
- **Integration**: Automatically added to enemy ships

#### AIStateMachine (Behavior States)
- **States**: idle, engage, evade, flee, buzz
- **Transitions**: Based on threat level, health, and ship type
- **State Duration**: Minimum time limits prevent state thrashing

#### ThreatAssessment (Target Evaluation)
- **Threat Factors**: Distance, firepower, health, targeting status
- **Ship-Specific Weights**: Each ship type evaluates threats differently
- **Primary/Secondary Targets**: Maintains target priorities

#### CombatBehavior (Combat AI)
- **Combat Profiles**: Ship-type specific combat behaviors
- **Maneuvers**: Circle strafe, spiral in/out, evasive jinking
- **Engagement Rules**: Range preferences, aggressiveness levels

#### WeaponTargeting (Fire Control)
- **Target Prediction**: Calculates target movement and acceleration
- **Ballistic Calculation**: Accounts for projectile travel time
- **Fire Control States**: searching → tracking → locked → firing
- **Hit Probability**: Multi-factor accuracy calculation

### Advanced Components

#### FlockingBehavior (Movement Coordination)
- **Boids Algorithm**: Separation, alignment, cohesion
- **Formation Support**: Maintains assigned formation positions
- **Obstacle Avoidance**: Navigates around environmental hazards

#### FlockingManager (Group Coordination)
- **Multi-Flock Management**: Handles multiple ship groups
- **Formation Assignment**: Applies tactical formations to groups
- **Dynamic Updates**: Adjusts formations based on leader movement

#### AIPerformanceManager (Optimization)
- **Level of Detail (LOD)**: 4 distance-based quality levels
- **Adaptive Performance**: Adjusts quality based on frame time
- **Update Scheduling**: Priority-based AI update queue

#### AIDebugVisualizer (Debug Overlays)
- **3D Visualization**: Real-time AI state and behavior overlays
- **Performance Monitoring**: Visual performance indicators
- **Configurable Display**: Toggle different visualization elements

## Ship Types and Behaviors

### Scout
- **Role**: Reconnaissance and harassment
- **Combat Style**: Hit-and-run tactics
- **Preferred Range**: Long range (1.65km)
- **Special Behavior**: Buzzing (inspection orbits)
- **Aggressiveness**: Low (30%)
- **Evasiveness**: Very High (90%)

**Typical Behavior:**
- Maintains distance from threats
- Uses high-speed evasive maneuvers
- Engages only when target is weakened
- Performs buzzing behavior on neutral targets

### Light Fighter
- **Role**: Agile dogfighter
- **Combat Style**: Aggressive close combat
- **Preferred Range**: Close range (1.2km)
- **Special Behavior**: Circle strafing
- **Aggressiveness**: High (80%)
- **Evasiveness**: Moderate (60%)

**Typical Behavior:**
- Closes to optimal weapon range quickly
- Uses circle strafe and spiral maneuvers
- Maintains sustained engagement
- Coordinates well in formations

### Heavy Fighter
- **Role**: Tank brawler
- **Combat Style**: Close-range powerhouse
- **Preferred Range**: Very close (0.9km)
- **Special Behavior**: Head-on attacks
- **Aggressiveness**: Very High (90%)
- **Evasiveness**: Low (30%)

**Typical Behavior:**
- Charges directly at targets
- Absorbs damage while dealing high damage
- Uses spiral-in maneuvers
- Fights until critically damaged

### Carrier
- **Role**: Command and control
- **Combat Style**: Defensive coordinator
- **Preferred Range**: Very long (2.25km)
- **Special Behavior**: Formation command
- **Aggressiveness**: Very Low (20%)
- **Evasiveness**: High (70%)

**Typical Behavior:**
- Maintains maximum weapon range
- Coordinates escort formations
- Withdraws when threatened
- Provides command and control

### Light Freighter
- **Role**: Cargo transport
- **Combat Style**: Evasive runner
- **Preferred Range**: Ultra long (3km+)
- **Special Behavior**: Immediate flight
- **Aggressiveness**: Minimal (10%)
- **Evasiveness**: Maximum (100%)

**Typical Behavior:**
- Flees immediately when threatened
- Uses maximum evasive maneuvers
- Minimal defensive weapons only
- Seeks escort protection

### Heavy Freighter
- **Role**: Armored cargo transport
- **Combat Style**: Defensive turret
- **Preferred Range**: Medium (1.8km)
- **Special Behavior**: Defensive circles
- **Aggressiveness**: Low (30%)
- **Evasiveness**: Moderate (40%)

**Typical Behavior:**
- Defends while seeking escape
- Uses defensive weapon turrets
- Maintains formation with escorts
- More durable than light freighter

## Debug Commands

### Basic AI Controls
| Command | Function | Description |
|---------|----------|-------------|
| `Q` | Spawn Target Dummies | Creates 3 AI ships for testing |
| `Cmd+Shift+A` | Toggle AI Debug Mode | Enables/disables debug visualization |
| `Cmd+Shift+E` | Force AIs to Engage | Sets all AIs to engage state |
| `Cmd+Shift+I` | Force AIs to Idle | Sets all AIs to idle state |
| `Cmd+Shift+F` | Force AIs to Flee | Sets all AIs to flee state |
| `Cmd+Shift+S` | Show AI Statistics | Displays comprehensive AI stats |

### Formation Controls
| Command | Function | Description |
|---------|----------|-------------|
| `Cmd+Shift+V` | Create V-Formation | Forms AIs into V-formation |
| `Cmd+Shift+C` | Create Column | Forms AIs into single-file column |
| `Cmd+Shift+L` | Create Line Abreast | Forms AIs into side-by-side line |
| `Cmd+Shift+B` | Show Flocking Stats | Displays flocking statistics |

### Combat Analysis
| Command | Function | Description |
|---------|----------|-------------|
| `Cmd+Shift+T` | Combat Statistics | Shows detailed combat analysis |
| `Cmd+Shift+W` | Weapon Targeting Debug | Displays targeting information |
| `Cmd+Shift+X` | Target Player | Forces all AIs to engage player |

### Performance & Visualization
| Command | Function | Description |
|---------|----------|-------------|
| `Cmd+Shift+P` | Performance Statistics | Shows LOD and frame timing |
| `Cmd+Shift+D` | Toggle Debug Visualization | Cycles through visualization modes |

### Debug Visualization Elements

When debug mode is enabled, you'll see:

- **State Indicators**: Colored boxes above ships showing AI state
- **Sensor Ranges**: Cyan circles showing detection range
- **Weapon Ranges**: Orange circles showing firing range
- **Targeting Lines**: Red lines to current targets
- **Velocity Vectors**: Green arrows showing movement direction
- **Threat Indicators**: Colored spheres showing threat levels
- **LOD Indicators**: Colored rings showing quality level

## Performance Settings

### Level of Detail (LOD) System

The AI system automatically adjusts quality based on distance:

| LOD Level | Distance | Update Rate | Features |
|-----------|----------|-------------|-----------|
| **High** | ≤ 10km | 20 FPS | Full AI processing |
| **Medium** | ≤ 25km | 10 FPS | Reduced AI processing |
| **Low** | ≤ 50km | 4 FPS | Minimal AI processing |
| **Culled** | > 50km | 1 FPS | State-only updates |

### Performance Tuning

The system automatically adjusts performance based on frame time:

- **Frame Budget**: 8ms per frame for AI processing (configurable)
- **Adaptive Quality**: Reduces LOD distances when performance drops
- **Update Limiting**: Maximum 8 AI updates per frame (configurable)

### Performance Monitoring

Use `Cmd+Shift+P` to view:
- Current LOD distribution
- Frame time usage
- Update queue status
- Performance overruns
- Adaptive adjustments

## Integration Guide

### Adding AI to New Ships

```javascript
// Create ship with AI
const ship = new EnemyShip(shipConfig);
const ai = enemyAIManager.addAIToShip(ship, {
    difficulty: 75,
    faction: 'hostile',
    aggressiveness: 0.8
});
```

### Creating Custom Formations

```javascript
// Create custom formation
const ships = [ship1, ship2, ship3];
const flockId = enemyAIManager.createFlockFromShips(ships);
enemyAIManager.flockingManager.assignFormation(flockId, 'v_formation', {
    spacing: 2.0,
    wingCount: 2
});
```

### Handling Ship Destruction

```javascript
// Ship destruction is handled automatically
// The AI system will:
// 1. Apply damage based on weapon type
// 2. Create visual/audio effects
// 3. Award rewards to player
// 4. Remove ship from AI management
```

### Custom AI Behaviors

```javascript
// Override AI behavior for specific ships
ship.ai.combatBehavior.combatProfile.aggressiveness = 0.5;
ship.ai.threatAssessment.evaluationWeights.distance = 0.8;
ship.ai.weaponTargeting.targetingAccuracy = 0.9;
```

## Troubleshooting

### Common Issues

#### AIs Not Responding
- **Check**: AI system enabled with `enemyAIManager.aiEnabled = true`
- **Check**: Ships have valid positions and meshes
- **Check**: Game world is properly updated
- **Debug**: Use `Cmd+Shift+S` to view AI statistics

#### Poor Performance
- **Check**: Too many AIs active (recommended max: 20-30)
- **Fix**: Increase LOD distances to reduce quality sooner
- **Fix**: Reduce max AI updates per frame
- **Monitor**: Use `Cmd+Shift+P` to track performance

#### AIs Not Engaging
- **Check**: Ships are within sensor range (default 2-5km)
- **Check**: Threat assessment is working (use `Cmd+Shift+T`)
- **Force**: Use `Cmd+Shift+X` to force engagement
- **Debug**: Enable debug visualization to see targeting

#### Formations Not Working
- **Check**: At least 2 ships with AI
- **Check**: Ships are close enough to each other
- **Check**: Formation assignment successful
- **Debug**: Use `Cmd+Shift+B` for flocking statistics

### Debug Information

Enable comprehensive debugging:
```javascript
// Enable all debug systems
enemyAIManager.setDebugMode(true);
enemyAIManager.debugVisualizer.configure({
    showSensorRanges: true,
    showWeaponRanges: true,
    showTargetingLines: true,
    showStateLabels: true,
    showVelocityVectors: true,
    showThreatLevels: true
});
```

### Console Commands

For advanced debugging, use browser console:
```javascript
// Get detailed AI information
const ai = enemyAIManager.activeAIs.values().next().value;
console.log(ai.getDebugInfo());

// Force specific AI state
ai.setState('engage');

// Modify AI parameters
ai.sensorRange = 10;
ai.weaponTargeting.targetingAccuracy = 1.0;
```

## Advanced Configuration

### AI Configuration Structure

```javascript
const customAIConfig = {
    // Basic parameters
    sensorRange: 3.0,           // Detection range in km
    maxSpeed: 6,                // Maximum movement speed
    maxForce: 0.15,             // Maximum steering force
    
    // Combat thresholds
    combatThresholds: {
        fleeHealth: 0.25,       // Health % to trigger flee
        evadeHealth: 0.5,       // Health % to trigger evasion
        engageRange: 1.5        // Range to engage targets
    },
    
    // Behavior weights
    behaviorWeights: {
        separation: 0.7,        // Flocking separation
        alignment: 0.5,         // Flocking alignment
        cohesion: 0.4,          // Flocking cohesion
        pursuit: 0.8,           // Target pursuit
        evasion: 0.6,           // Evasive behavior
        orbiting: 0.3           // Orbiting behavior
    },
    
    // Flocking parameters
    flocking: {
        separationWeight: 0.8,
        alignmentWeight: 0.6,
        cohesionWeight: 0.4,
        formationWeight: 0.7,
        avoidanceWeight: 1.0,
        separationRadius: 0.5,  // Personal space in km
        alignmentRadius: 2.0,   // Alignment check distance
        cohesionRadius: 3.0     // Group cohesion distance
    }
};
```

### Performance Configuration

```javascript
// Configure performance settings
enemyAIManager.performanceManager.configurePerformance({
    maxAIUpdatesPerFrame: 10,   // Max AIs per frame
    updateBudgetMs: 12,         // Frame time budget
    lodDistances: {
        high: 8,                // High quality distance
        medium: 20,             // Medium quality distance
        low: 40,                // Low quality distance
        culled: 80              // Culling distance
    }
});
```

### Custom Formation Patterns

```javascript
// Create custom formation
const customFormation = FormationPatterns.createCustomFormation(
    leaderPosition,
    leaderHeading,
    {
        pattern: 'diamond',
        spacing: 2.5,
        shipCount: 4,
        verticalSpacing: 1.0
    }
);
```

### Weapon System Customization

```javascript
// Custom weapon configuration
const customWeapon = {
    type: 'custom_laser',
    projectileSpeed: 4.0,       // km/s
    damage: 35,
    fireRate: 1.8,              // shots/second
    energyCost: 15,
    range: 2.5,                 // km
    tracking: 0.85,             // Tracking ability
    accuracy: 0.8               // Base accuracy
};
```

### Event Handling

```javascript
// Listen for AI events
enemyAIManager.addEventListener('shipDestroyed', (event) => {
    console.log(`Ship ${event.ship.shipType} destroyed by ${event.attacker.shipType}`);
});

enemyAIManager.addEventListener('formationCreated', (event) => {
    console.log(`Formation ${event.type} created with ${event.shipCount} ships`);
});
```

---

## Quick Reference

### Essential Commands
- **Basic Test**: `Q` → `Cmd+Shift+A` → `Cmd+Shift+V` → `Cmd+Shift+X`
- **Performance Check**: `Cmd+Shift+P`
- **Combat Analysis**: `Cmd+Shift+T`
- **Debug Toggle**: `Cmd+Shift+D`

### Key Files
- `EnemyAIManager.js` - Main AI coordinator
- `AIConfigs.js` - Ship-type configurations
- `AIPerformanceManager.js` - Performance optimization
- `AIDebugVisualizer.js` - Debug visualization

### Default Settings
- Sensor Range: 2-5km (ship dependent)
- Weapon Range: 1.2-3km (ship dependent)
- LOD Distances: 10/25/50/100km
- Update Budget: 8ms per frame
- Max AIs per frame: 8

This guide covers the complete Enemy AI system. For additional help, use the in-game help system (`H` key) or check the console output when using debug commands.
