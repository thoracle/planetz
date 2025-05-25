# Warp Drive System Specification

## Overview
The warp drive system enables faster-than-light travel between sectors in the galaxy. Unlike traditional sci-fi warp systems with variable speeds, this implementation uses **energy-based distance limitations** where warp costs are computed based on Manhattan distance between sectors.

## Core Mechanics

### Energy-Based Travel System
- **No Variable Speeds**: The warp drive doesn't have different "warp factors" that affect travel speed
- **Distance-Based Energy Cost**: Energy consumption is calculated using Manhattan distance between sectors
- **Damage Affects Range**: When damaged, the warp drive's maximum travel distance per jump is reduced
- **Emergency Capability**: Critical protection ensures minimum 1-sector travel capability even when severely damaged

### Energy Cost Calculation
```javascript
calculateRequiredEnergy(fromSector, toSector) {
    const fromRow = fromSector.charCodeAt(0) - 65;  // A=0, B=1, etc.
    const fromCol = parseInt(fromSector[1]);        // 1, 2, 3, etc.
    const toRow = toSector.charCodeAt(0) - 65;
    const toCol = parseInt(toSector[1]);
    
    // Manhattan distance calculation
    const distance = Math.abs(toRow - fromRow) + Math.abs(toCol - fromCol);
    
    // Energy cost scales quadratically with distance
    return Math.pow(distance, 2) * 50;
}
```

### Damage Effects on Travel Range
When the warp drive takes damage, it doesn't lose "speed" but rather loses the ability to travel long distances:

- **Healthy (80-100%)**: Can travel to any sector in the galaxy
- **Damaged (50-79%)**: Maximum travel distance reduced proportionally
- **Critical (20-49%)**: Limited to short-range jumps (1-3 sectors)
- **Severely Damaged (15-19%)**: Emergency capability only (1-2 sectors maximum)
- **Never Completely Disabled**: Always maintains minimum 1-sector emergency travel

### Level-Based Improvements
Higher level warp drives provide:
- **Energy Efficiency**: Reduced energy cost for the same distance
- **Faster Cooldown**: Shorter wait time between warp jumps
- **Better Damage Resistance**: Maintains longer range capability when damaged

```javascript
// Level stats example
levelStats = {
    1: { 
        energyEfficiency: 1.0,      // No efficiency bonus
        cooldownReduction: 1.0,     // No cooldown reduction
        maxWarpFactor: 6.0          // Legacy field (not used for speed)
    },
    5: { 
        energyEfficiency: 0.80,     // 20% more efficient
        cooldownReduction: 0.6,     // 40% faster cooldown
        maxWarpFactor: 9.9          // Legacy field (not used for speed)
    }
};
```

## Core Components

### 1. WarpDriveManager
The central coordinator for warp operations, managing the interaction between navigation, system generation, and visual effects.

### 2. WarpDrive System
Handles the core warp mechanics, including energy management and damage-based range limitations.

### 3. SectorNavigation
Manages the actual movement between sectors and handles the transition between systems.

## Warp Sequence

### 1. Pre-Warp Phase
```javascript
navigateToSector(targetSector) {
    // Store target computer state before clearing
    const wasTargetComputerEnabled = this.viewManager.starfieldManager?.targetComputerEnabled;
    
    // Clear target computer first
    if (this.viewManager.starfieldManager) {
        this.viewManager.starfieldManager.clearTargetComputer();
    }
    
    // Store the state for post-warp restoration
    this.sectorNavigation.wasTargetComputerEnabled = wasTargetComputerEnabled;
    
    // Start navigation
    return this.sectorNavigation.startNavigation(targetSector);
}
```

### 2. Warp Activation
```javascript
startNavigation(targetSector) {
    // Calculate energy requirements based on Manhattan distance
    const requiredEnergy = this.calculateRequiredEnergy(
        this.currentSector, 
        targetSector
    );
    
    // Check if ship has sufficient energy
    if (this.viewManager.getShipEnergy() < requiredEnergy) {
        return false;
    }
    
    // Check if warp drive can handle this distance (damage-based limitation)
    const maxTravelDistance = this.warpDrive.getMaxTravelDistance();
    const requestedDistance = this.calculateManhattanDistance(
        this.currentSector, 
        targetSector
    );
    
    if (requestedDistance > maxTravelDistance) {
        console.warn(`Travel distance ${requestedDistance} exceeds maximum ${maxTravelDistance} due to warp drive damage`);
        return false;
    }
    
    // Clear target computer and old system
    if (this.viewManager.starfieldManager) {
        this.viewManager.starfieldManager.clearTargetComputer();
    }
    if (this.viewManager.solarSystemManager) {
        this.viewManager.solarSystemManager.clearSystem();
    }
    
    // Set navigation parameters
    this.targetSector = targetSector;
    this.isNavigating = true;
    this.navigationProgress = 0;
    this.startTime = Date.now();
    
    // Store start position and calculate target position
    this.startPosition.copy(this.camera.position);
    this.targetPosition = this.calculatePositionFromSector(targetSector);
    
    // Activate warp drive
    if (!this.warpDrive.activate()) {
        console.error('Failed to activate warp drive');
        this.isNavigating = false;
        return false;
    }

    console.log('Warp drive activated, starting navigation');
    return true;
}
```

### 3. Warp Effects
The visual effects system creates the illusion of faster-than-light travel, but the actual "speed" is cosmetic. All warp jumps take the same amount of time regardless of distance.

```javascript
update(deltaTime, warpFactor) {
    // Note: warpFactor here is cosmetic and doesn't affect actual travel time
    // All warp jumps take the same duration (warpSequenceTime)
    
    // Calculate target intensity for visual effects
    this.targetIntensity = Math.min(1.0, warpFactor / 9.9);
    
    // Update individual effects
    this.starTrails.update(deltaTime, this.intensity, warpFactor);
    this.engineGlow.update(deltaTime, this.intensity, warpFactor);
    this.starfieldStretch.update(deltaTime, this.intensity, warpFactor);
    this.lightSpeedEffect.update(deltaTime, this.intensity);
    
    // Update camera shake
    this.updateCameraShake(deltaTime, warpFactor);
}
```

### 4. Post-Warp Phase
```javascript
async handleWarpEnd() {
    console.log('Warp drive deactivated');
    this.isActive = false;
    this.hideAllWarpEffects();

    // Only proceed with system generation if we're in navigation mode
    if (this.sectorNavigation && this.sectorNavigation.isNavigating) {
        try {
            console.log('Starting post-warp sequence');
            
            // Get current sector from navigation
            const currentSector = this.sectorNavigation.currentSector;
            console.log('Generating new star system for sector:', currentSector);
            
            // Generate new star system and wait for completion
            const generationSuccess = await this.viewManager.solarSystemManager.generateStarSystem(currentSector);
            
            if (!generationSuccess) {
                console.error('Failed to generate new star system');
                return;
            }
            
            console.log('New star system generated successfully');
            
            // Update galactic chart with new position
            if (this.viewManager.galacticChart) {
                console.log('Updating galactic chart with new position:', currentSector);
                this.viewManager.galacticChart.setShipLocation(currentSector);
            }
            
            // Restore previous view and target computer state
            if (this.viewManager.currentView === 'galactic') {
                console.log('Restoring previous view after warp');
                this.viewManager.restorePreviousView();
            }
            
            // Restore target computer if it was enabled before warp
            const wasTargetComputerEnabled = this.sectorNavigation.wasTargetComputerEnabled;
            if (wasTargetComputerEnabled && this.viewManager.starfieldManager) {
                console.log('Restoring target computer state after warp');
                this.viewManager.starfieldManager.toggleTargetComputer();
            }
            
            console.log('Post-warp sequence completed successfully');
        } catch (error) {
            console.error('Error in post-warp sequence:', error);
        }
    }
}
```

## Critical System Protection

### Emergency Travel Capability
The warp drive is a critical system that can never be completely disabled:

- **Minimum Health Protection**: Cannot drop below 15% health
- **Always Operational**: `isOperational()` always returns true
- **Emergency Range**: Always maintains at least 1-sector travel capability
- **Repair Compatibility**: Can always be repaired with repair kits

### Damage-Based Range Reduction
```javascript
getMaxTravelDistance() {
    if (!this.isOperational()) {
        return 1; // Emergency capability
    }
    
    const effectiveness = this.getEffectiveness();
    
    if (effectiveness < 0.2) {
        // Severely damaged - emergency range only (1-2 sectors)
        return 2;
    } else if (effectiveness < 0.5) {
        // Moderately damaged - reduced range
        return Math.floor(8 * effectiveness); // 2-4 sectors
    } else {
        // Lightly damaged or operational - full range
        return 9; // Full galactic range (9x9 grid)
    }
}
```

## Energy Management

### Lump Sum Consumption
Unlike other systems that consume energy per second, the warp drive:
- Calculates total energy cost before warp activation
- Consumes energy gradually during the warp sequence
- Uses the same time duration regardless of distance
- Applies efficiency bonuses based on system level and damage

### Energy Efficiency Factors
```javascript
calculateWarpEnergyCost(baseCost) {
    const levelStats = this.levelStats[this.level] || this.levelStats[1];
    const efficiency = levelStats.energyEfficiency || 1.0;
    
    // Damaged systems are less efficient
    const effectiveness = this.getEffectiveness();
    const damageInefficiency = 1 + (1 - effectiveness) * 0.3; // Up to 30% more energy when damaged
    
    return Math.ceil(baseCost * efficiency * damageInefficiency);
}
```

## Timing and Sequencing

### Critical Timing Points
1. **Pre-Warp State Storage**
   - Target computer state must be stored before clearing
   - Current view state must be preserved
   - Energy requirements must be verified before proceeding
   - Travel distance must be validated against warp drive capability

2. **System Clearance**
   - Target computer must be cleared before system clearance
   - Old system must be cleared before warp activation
   - All geometries and materials must be properly disposed
   - Clearance must happen after energy and distance verification

3. **Warp Effects**
   - Visual effects are cosmetic and don't affect actual travel mechanics
   - All warp jumps take the same time duration (warpSequenceTime)
   - Effects intensity can be based on cosmetic "warp factor" for visual appeal
   - Energy consumption occurs gradually during the fixed warp duration

4. **Post-Warp Sequence**
   - New system generation must complete before view restoration
   - View restoration must occur before target computer restoration
   - Galactic chart update must happen after system generation
   - Target computer state must be verified before restoration

### State Management
1. **Target Computer**
   - State is stored before warp
   - Cleared during warp
   - Restored after new system generation
   - HUD visibility depends on current view
   - Target list must be updated with new system data

2. **View Management**
   - Previous view is stored before galactic view
   - View is restored after system generation
   - Target computer HUD visibility is tied to view state
   - Camera position and rotation must be preserved

3. **System Generation**
   - Old system is cleared before warp
   - New system is generated after warp
   - System data is validated before use
   - Celestial bodies must be properly initialized

4. **Warp Effects**
   - Effects are purely visual and don't affect game mechanics
   - Transitions must be smooth
   - Camera shake must be synchronized
   - Star trails must be properly disposed

## Error Handling

### Critical Error Points
1. **Distance Validation**
   - Check if requested travel distance exceeds warp drive capability
   - Handle damage-based range limitations
   - Provide clear feedback when travel distance is too far
   - Suggest alternative routes or repairs

2. **Energy Validation**
   - Verify sufficient energy before warp activation
   - Account for efficiency bonuses and damage penalties
   - Handle energy depletion during warp sequence
   - Provide emergency termination if energy runs out

3. **System Generation**
   - Handle failed system generation
   - Validate system data before use
   - Ensure proper cleanup on failure
   - Verify celestial body initialization

4. **View Management**
   - Handle view restoration failures
   - Validate view state before changes
   - Ensure proper view state after errors
   - Preserve camera state during errors

## Testing Requirements

### Unit Tests
1. **Energy Cost Calculation**
   - Verify Manhattan distance calculation
   - Test quadratic energy scaling
   - Check efficiency bonuses and damage penalties
   - Validate edge cases (same sector, maximum distance)

2. **Range Limitation**
   - Test damage-based range reduction
   - Verify emergency capability protection
   - Check level-based range improvements
   - Test edge cases (minimum/maximum damage)

3. **Critical System Protection**
   - Verify minimum health protection (15%)
   - Test that system always remains operational
   - Check emergency travel capability
   - Validate repair kit compatibility

4. **Warp Sequence**
   - Test complete warp cycle
   - Verify energy consumption timing
   - Check state preservation and restoration
   - Test error handling and recovery

### Integration Tests
1. **Full Warp Sequence**
   - Test complete warp cycle with various distances
   - Verify all state transitions
   - Check error handling
   - Test energy consumption patterns

2. **Damage Integration**
   - Test warp capability with various damage levels
   - Verify range limitations work correctly
   - Check emergency capability under extreme damage
   - Test repair and capability restoration

3. **System Generation**
   - Test system generation timing
   - Verify data consistency
   - Check cleanup procedures
   - Test celestial body initialization

## Legacy Compatibility

### Warp Factor Fields
Some legacy code may still reference "warp factor" values. These are maintained for compatibility but don't affect actual travel mechanics:

- `warpFactor`: Cosmetic value used for visual effects
- `maxWarpFactor`: Level-based value that doesn't affect travel speed
- `setWarpFactor()`: Method maintained for compatibility but doesn't change travel capability

### Migration Notes
When updating existing code:
1. Replace speed-based logic with distance-based range checking
2. Update energy calculations to use Manhattan distance
3. Replace warp factor limitations with travel distance limitations
4. Update UI to show travel range instead of "warp speed" 