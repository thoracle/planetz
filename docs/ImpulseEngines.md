# Impulse Engines System

## Overview

The Impulse Engines system provides ship movement and maneuverability with **variable energy consumption based on speed settings**. Players can choose between energy efficiency and speed, creating tactical decisions during travel and combat.

## Key Features

### Variable Energy Consumption
- **Impulse 0**: Stopped - No energy consumption
- **Impulse 1**: Base consumption (5 energy/sec at Level 1)
- **Impulse 9**: Emergency speed - 15x base consumption (75 energy/sec at Level 1)

### Energy Scaling by Impulse Speed
```
Impulse 1: 1.0x   (Base consumption)
Impulse 2: 1.5x   (50% more energy)
Impulse 3: 2.2x   (120% more energy)
Impulse 4: 3.0x   (200% more energy)
Impulse 5: 4.0x   (300% more energy)
Impulse 6: 5.5x   (450% more energy)
Impulse 7: 7.5x   (650% more energy)
Impulse 8: 10.0x  (900% more energy)
Impulse 9: 15.0x  (1400% more energy - Emergency speed)
```

### Free Rotation
- **Ship rotation consumes NO energy**
- Only forward movement consumes energy
- Players can orient their ship freely without energy penalty

### Level Progression
| Level | Max Impulse | Energy Efficiency | Effectiveness |
|-------|-------------|-------------------|---------------|
| 1     | 6           | 100%              | 1.0x          |
| 2     | 7           | 110% (10% better) | 1.2x          |
| 3     | 8           | 125% (20% better) | 1.4x          |
| 4     | 9           | 143% (30% better) | 1.6x          |
| 5     | 9           | 167% (40% better) | 1.8x          |

## Gameplay Mechanics

### Speed vs Efficiency Trade-off
Players must balance:
- **Speed**: Higher impulse = faster travel but exponentially more energy
- **Efficiency**: Lower impulse = slower travel but much better energy economy
- **Range**: Energy consumption affects how far you can travel

### Example Travel Scenarios
For 100 distance units with Level 1 engines:

| Impulse | Travel Time | Energy Cost | Efficiency | Use Case |
|---------|-------------|-------------|------------|----------|
| 1       | 100.0       | 500         | 5.0        | Long range, economy |
| 3       | 33.3        | 366         | 3.7        | Balanced travel |
| 5       | 20.0        | 400         | 4.0        | Medium range |
| 6       | 16.7        | 458         | 4.6        | Fast travel |
| 9       | 11.1        | 833         | 8.3        | Emergency/combat |

### Damage Effects
- **Operational**: Full performance
- **Damaged**: Reduced efficiency (more energy consumption)
- **Critical**: Maximum speed limited to Impulse 3
- **Disabled**: Ship dead in space (no movement)

## Integration Points

### Ship Movement System
```javascript
// Set impulse speed (0-9)
engines.setImpulseSpeed(5);

// Track movement state
engines.setMovingForward(true);  // Consumes energy
engines.setRotating(true);       // FREE - no energy cost

// Get current energy consumption
const energyPerSecond = engines.getEnergyConsumptionRate();
```

### Energy Management
```javascript
// Check if ship can sustain current speed
const totalConsumption = ship.getEnergyConsumptionRate();
const canSustain = ship.currentEnergy > totalConsumption * 10; // 10 seconds

// Calculate travel costs
const travelPlan = engines.calculateTravel(distance, impulseSpeed);
console.log(`Travel will take ${travelPlan.time} seconds and cost ${travelPlan.energyCost} energy`);
```

### UI Controls
- **Impulse Speed Selector**: 0-9 speed settings
- **Energy Consumption Display**: Real-time energy drain rate
- **Travel Calculator**: Estimate time/energy for planned journeys
- **Efficiency Meter**: Energy cost per distance unit

## Strategic Considerations

### Combat
- **High Impulse**: Better maneuverability, faster escape
- **Energy Drain**: May need to balance speed vs weapon/shield energy

### Exploration
- **Low Impulse**: Longer range exploration
- **Emergency Speed**: Quick escape from danger zones

### Resource Management
- **Energy Planning**: Calculate total journey energy cost
- **Speed Optimization**: Find best speed for available energy
- **Emergency Reserve**: Keep energy for emergency maneuvers

## Technical Implementation

### System Class: `ImpulseEngines`
- Extends base `System` class
- Implements variable energy consumption
- Handles damage effects on performance
- Provides travel calculation utilities

### Key Methods
- `setImpulseSpeed(speed)` - Set impulse speed (0-9)
- `getEnergyConsumptionRate()` - Get current energy drain
- `calculateTravel(distance, speed)` - Plan journey energy cost
- `getEnergyEfficiency()` - Get energy per distance ratio

### Testing
Run `window.testImpulseEngines()` in console to see:
- Energy consumption at different speeds
- Travel time/cost calculations
- Damage effects on performance
- Level progression benefits

This system creates meaningful player choices between speed and energy efficiency, adding tactical depth to ship movement and resource management. 