# Warp Drive System Specification

## Overview
The warp drive system enables faster-than-light travel between sectors in the galaxy. It consists of several interconnected components that handle navigation, system generation, and visual effects.

## Core Components

### 1. WarpDriveManager
The central coordinator for warp operations, managing the interaction between navigation, system generation, and visual effects.

```javascript
class WarpDriveManager {
    constructor(scene, camera, viewManager) {
        // Store viewManager reference
        this.viewManager = viewManager;

        // Core components
        this.warpDrive = new WarpDrive(viewManager);
        this.warpEffects = new WarpEffects(scene);
        this.sectorNavigation = new SectorNavigation(scene, camera, this.warpDrive);
        
        // Ship properties
        this.ship = new THREE.Object3D();
        this.ship.position.set(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Movement parameters
        this.maxSpeed = 1000;
        this.acceleration = 50;
        this.deceleration = 30;
        
        // Camera reference
        this.camera = camera;
        
        // Current system data
        this.currentSystem = null;
        
        // Initialize event handlers
        this.warpDrive.onWarpStart = this.handleWarpStart.bind(this);
        this.warpDrive.onWarpEnd = this.handleWarpEnd.bind(this);
        this.warpDrive.onEnergyUpdate = this.handleEnergyUpdate.bind(this);
    }
}
```

### 2. WarpDrive
Handles the core warp mechanics, including energy management and warp factor control.

```javascript
class WarpDrive {
    constructor(viewManager) {
        // Core properties
        this.isActive = false;
        this.warpFactor = 1.0;
        this.maxWarpFactor = 9.9;
        this.viewManager = viewManager;
        this.energyConsumptionRate = 0.1;
        this.cooldownTime = 0;
        this.maxCooldownTime = 5000; // 5 seconds
        this.warpSequenceTime = 5000; // 5 seconds

        // Acceleration curve for smooth transitions
        this.accelerationCurve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.2, 0.8, 0),
            new THREE.Vector3(0.8, 1, 0),
            new THREE.Vector3(1, 1, 0)
        );

        // Event listeners
        this.onWarpStart = null;
        this.onWarpEnd = null;
        this.onEnergyUpdate = null;

        // Initialize feedback system
        this.feedback = new WarpFeedback();
    }
}
```

### 3. SectorNavigation
Manages the actual movement between sectors and handles the transition between systems.

```javascript
class SectorNavigation {
    constructor(scene, camera, warpDrive) {
        this.scene = scene;
        this.camera = camera;
        this.warpDrive = warpDrive;
        this.isNavigating = false;
        this.currentSector = null;
        this.targetSector = null;
        this.navigationProgress = 0;
        this.startTime = 0;
        this.startPosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
    }
}
```

## Warp Sequence

### 1. Pre-Warp Phase
```javascript
navigateToSector(targetSector) {
    // Store target computer state before clearing
    const wasTargetComputerEnabled = this.viewManager.starfieldManager?.targetComputerEnabled;
    console.log('Storing target computer state before warp:', {
        wasEnabled: wasTargetComputerEnabled,
        targetSector: targetSector
    });
    
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
    // Verify energy requirements
    const requiredEnergy = this.calculateRequiredEnergy(targetSector);
    if (this.viewManager.getShipEnergy() < requiredEnergy) {
        return false;
    }
    
    // Clear target computer and old system
    if (this.viewManager.starfieldManager) {
        console.log('Clearing target computer');
        this.viewManager.starfieldManager.clearTargetComputer();
    }
    if (this.viewManager.solarSystemManager) {
        console.log('Clearing old star system:', {
            sector: this.currentSector,
            timestamp: new Date().toISOString()
        });
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
    this.feedback.showVisualCues('accelerating', 1.0);
            return true;
}
```

### 3. Warp Effects
```javascript
update(deltaTime, warpFactor) {
    // Calculate target intensity based on warp factor
    this.targetIntensity = Math.min(1.0, warpFactor / 9.9);
    
    // Smoothly transition current intensity
    const transition = this.transitionSpeed * (deltaTime / 1000);
    if (this.intensity < this.targetIntensity) {
        this.intensity = Math.min(this.targetIntensity, this.intensity + transition);
    } else if (this.intensity > this.targetIntensity) {
        this.intensity = Math.max(this.targetIntensity, this.intensity - transition);
    }
    
    // Update individual effects
    this.starTrails.update(deltaTime, this.intensity, warpFactor);
    this.engineGlow.update(deltaTime, this.intensity, warpFactor);
    this.starfieldStretch.update(deltaTime, this.intensity, warpFactor);
    this.lightSpeedEffect.update(deltaTime, this.intensity);
    
    // Update camera shake
    this.updateCameraShake(deltaTime, warpFactor);
    
    // Trigger camera shake during warp
    if (this.intensity > 0.8 && this.cameraShake.duration <= 0) {
        this.triggerCameraShake(0.1, 1000);
    }
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
            
            if (!this.viewManager || !this.viewManager.solarSystemManager) {
                throw new Error('SolarSystemManager not available');
            }
            
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
            
            // Ensure we're in the correct view (FRONT or AFT)
            if (this.viewManager.currentView === 'galactic') {
                console.log('Restoring previous view after warp');
                this.viewManager.restorePreviousView();
            }
            
            // Get the stored target computer state
            const wasTargetComputerEnabled = this.sectorNavigation.wasTargetComputerEnabled;
            console.log('Target computer state before warp:', {
                wasEnabled: wasTargetComputerEnabled,
                hasStarfieldManager: !!this.viewManager.starfieldManager,
                currentSector: currentSector
            });
            
            // Only enable target computer if it was enabled before warp
            if (wasTargetComputerEnabled && this.viewManager.starfieldManager) {
                console.log('Restoring target computer state after warp');
                this.viewManager.starfieldManager.toggleTargetComputer();
                console.log('Target computer state after restoration:', {
                    isEnabled: this.viewManager.starfieldManager.targetComputerEnabled,
                    targetCount: this.viewManager.starfieldManager.targetObjects?.length || 0,
                    currentTarget: this.viewManager.starfieldManager.currentTarget ? 'set' : 'none'
                });
            } else {
                console.log('Target computer state unchanged:', {
                    reason: !wasTargetComputerEnabled ? 'was not enabled before warp' : 'starfieldManager not available',
                    currentState: this.viewManager.starfieldManager?.targetComputerEnabled
                });
            }
            
            console.log('Post-warp sequence completed successfully');
        } catch (error) {
            console.error('Error in post-warp sequence:', error);
        }
    }
}
```

## Timing and Sequencing

### Critical Timing Points
1. **Pre-Warp State Storage**
   - Target computer state must be stored before clearing
   - Current view state must be preserved
   - System data must be backed up if needed
   - Energy requirements must be verified before proceeding

2. **System Clearance**
   - Target computer must be cleared before system clearance
   - Old system must be cleared before warp activation
   - All geometries and materials must be properly disposed
   - Clearance must happen after energy verification

3. **Warp Effects**
   - Star trails must be initialized before warp
   - Engine glow must be synchronized with warp factor
   - Starfield stretch must be proportional to warp speed
   - Camera shake must be triggered at high warp factors

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
   - Effects intensity is tied to warp factor
   - Transitions must be smooth
   - Camera shake must be synchronized
   - Star trails must be properly disposed

## Error Handling

### Critical Error Points
1. **System Generation**
   - Handle failed system generation
   - Validate system data before use
   - Ensure proper cleanup on failure
   - Verify celestial body initialization

2. **View Management**
   - Handle view restoration failures
   - Validate view state before changes
   - Ensure proper view state after errors
   - Preserve camera state during errors

3. **Target Computer**
   - Handle target computer state restoration failures
   - Validate target data before use
   - Ensure proper cleanup on errors
   - Verify HUD visibility state

4. **Warp Effects**
   - Handle effect initialization failures
   - Clean up effects on error
   - Ensure smooth transitions
   - Handle camera shake errors

## Testing Requirements

### Unit Tests
1. **Warp Sequence**
   - Verify proper state storage
   - Validate system clearance
   - Check post-warp restoration
   - Test energy management

2. **View Management**
   - Test view state preservation
   - Verify view restoration
   - Validate HUD visibility
   - Test camera state preservation

3. **Target Computer**
   - Test state preservation
   - Verify target list updates
   - Check HUD visibility rules
   - Test target cycling

4. **Warp Effects**
   - Test effect initialization
   - Verify smooth transitions
   - Check camera shake
   - Test effect cleanup

### Integration Tests
1. **Full Warp Sequence**
   - Test complete warp cycle
   - Verify all state transitions
   - Check error handling
   - Test energy consumption

2. **View Transitions**
   - Test view changes during warp
   - Verify HUD behavior
   - Check state preservation
   - Test camera transitions

3. **System Generation**
   - Test system generation timing
   - Verify data consistency
   - Check cleanup procedures
   - Test celestial body initialization

4. **Effect Integration**
   - Test effect synchronization
   - Verify visual feedback
   - Check performance impact
   - Test effect cleanup 