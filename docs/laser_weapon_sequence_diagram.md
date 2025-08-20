# Laser Weapon System - UML Sequence Diagram

This diagram shows the complete flow of laser weapon firing from user input through damage application to HUD updates. Laser cannons are **beam weapons** that support precision sub-targeting.

```mermaid
sequenceDiagram
    participant User
    participant StarfieldManager as Input Handler (Space key)
    participant WeaponSystemCore as Weapon System Core
    participant WeaponSlot as Weapon Slot
    participant WeaponCard as Weapon Card (Laser)
    participant Ship as Ship
    participant WeaponEffectsManager as Weapon Effects Manager
    participant PhysicsManager as Physics Manager
    participant TargetComputerManager as Target Computer Manager
    participant EnemyShip as Enemy Ship
    participant WeaponHUD as Weapon HUD
    participant AudioSystem as Audio System

    User->>StarfieldManager: Press Space to fire weapon
    StarfieldManager->>WeaponSystemCore: fireActiveWeapon()
    WeaponSystemCore->>WeaponSlot: fire()
    
    WeaponSlot->>WeaponCard: fire(origin, target)
    
    Note over WeaponCard: BEAM WEAPON - No target lock required
    WeaponCard->>Ship: hasEnoughEnergy(energyCost)
    Ship-->>WeaponCard: true/false
    
    alt Insufficient Energy
        WeaponCard->>WeaponHUD: showMessage("Insufficient energy")
        WeaponCard-->>WeaponSlot: firing failed
    else Sufficient Energy
        WeaponCard->>Ship: consumeEnergy(energyCost)
        
        Note over WeaponCard: Get camera aim direction for crosshair targeting
        WeaponSlot->>WeaponSlot: computeAimAndConvergence(camera, target)
        
        Note over WeaponCard: BEAM WEAPON FEATURE - Sub-targeting Support
        WeaponSlot->>TargetComputerManager: getCurrentTarget()
        TargetComputerManager-->>WeaponSlot: target + targetedSubsystem
        
        WeaponSlot->>PhysicsManager: raycast(startPositions[2], endPositions[2], range)
        PhysicsManager-->>WeaponSlot: hitResult + hitEntity
        
        alt Hit Target
            Note over WeaponCard: Calculate damage with sub-targeting bonus
            WeaponCard->>WeaponCard: calculateDamage(baseDamage, targetedSubsystem)
            Note right of WeaponCard: +30% damage bonus<br/>for sub-targeting
            
            WeaponCard->>EnemyShip: applyDamage(damage, "energy", targetedSubsystem)
            EnemyShip->>EnemyShip: applySubsystemDamage(targetedSubsystem, damage)
            EnemyShip-->>WeaponCard: damageResult
            
            alt Target Destroyed
                WeaponCard->>TargetComputerManager: removeDestroyedTarget(target)
                WeaponCard->>AudioSystem: playSuccessSound()
            end
            
            WeaponEffectsManager->>WeaponEffectsManager: createLaserBeam(leftOrigin, hitPoint)
            WeaponEffectsManager->>WeaponEffectsManager: createLaserBeam(rightOrigin, hitPoint)
            WeaponEffectsManager->>WeaponEffectsManager: createImpactEffect(hitPoint)
            StarfieldManager->>AudioSystem: playSound("laser", origin, 1.0)
            
        else Miss
            WeaponEffectsManager->>WeaponEffectsManager: createLaserBeam(leftOrigin, missPoint)
            WeaponEffectsManager->>WeaponEffectsManager: createLaserBeam(rightOrigin, missPoint)
            StarfieldManager->>AudioSystem: playSound("laser", origin, 1.0)
        end
        
        WeaponSlot->>WeaponCard: startCooldown()
        WeaponSystemCore->>WeaponHUD: updateWeaponStatus(activeSlot)
    end
    
    WeaponCard-->>WeaponSlot: firing complete
    WeaponSlot-->>WeaponSystemCore: weapon fired
    WeaponSystemCore->>WeaponHUD: refreshWeaponDisplay()
```

## Key Features of Beam Weapons (Lasers):

### **🎯 Sub-Targeting System**
- **Precision Targeting**: Can target specific enemy subsystems (shields, engines, weapons, etc.)
- **Damage Bonus**: 30% damage bonus when targeting specific subsystems
- **Tactical Advantage**: Allows strategic component destruction

### **⚡ Instant Hit Detection**
- **Raycast-based**: Instant hit detection using physics raycasting
- **No Travel Time**: Damage applied immediately upon firing
- **Dual Beam Configuration**: Fire from left/right weapon positions, converge at crosshairs

### **🔋 Energy-Based System**
- **Energy Consumption**: Uses ship's energy reserves
- **Energy Validation**: Comprehensive pre-fire energy checking
- **HUD Feedback**: Clear messaging for insufficient energy

### **🎯 Crosshair Targeting**
- **No Target Lock Required**: Fire toward crosshairs like free-aim
- **Camera-Based Direction**: Uses camera quaternion for aim direction
- **Manual Aiming**: Player skill-based targeting system 