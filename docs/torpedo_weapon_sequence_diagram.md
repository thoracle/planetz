# Torpedo Weapon System - UML Sequence Diagram

This diagram shows the complete flow of torpedo weapon firing from user input through physics-based projectile simulation to damage application and HUD updates. Torpedoes are **projectile weapons** that do NOT require target lock and do NOT support sub-targeting, but can cause random subsystem damage.

```mermaid
sequenceDiagram
    participant User
    participant InputHandler as Input Handler
    participant WeaponSystemCore as Weapon System Core
    participant WeaponSlot as Weapon Slot
    participant SplashDamageWeapon as Splash Damage Weapon (Torpedo)
    participant Ship as Ship
    participant PhysicsProjectile as Physics Projectile
    participant PhysicsManager as Physics Manager
    participant WeaponEffectsManager as Weapon Effects Manager
    participant TargetComputerManager as Target Computer Manager
    participant EnemyShip as Enemy Ship
    participant WeaponHUD as Weapon HUD
    participant AudioSystem as Audio System

    User->>InputHandler: Click to fire weapon
    InputHandler->>WeaponSystemCore: triggerWeaponFire(slotIndex)
    WeaponSystemCore->>WeaponSlot: fire()
    
    WeaponSlot->>SplashDamageWeapon: fire(origin, target)
    
    Note over SplashDamageWeapon: PROJECTILE WEAPON - No target lock required
    SplashDamageWeapon->>Ship: hasEnoughEnergy(energyCost)
    Ship-->>SplashDamageWeapon: true/false
    
    alt Insufficient Energy
        SplashDamageWeapon->>WeaponHUD: showMessage("Insufficient energy")
        SplashDamageWeapon-->>WeaponSlot: firing failed
    else Sufficient Energy
        SplashDamageWeapon->>Ship: consumeEnergy(energyCost)
        
        Note over SplashDamageWeapon: Get camera aim direction for crosshair targeting
        SplashDamageWeapon->>SplashDamageWeapon: getCameraAimDirection()
        
        SplashDamageWeapon->>SplashDamageWeapon: createProjectile(origin, null)
        SplashDamageWeapon->>PhysicsProjectile: new PhysicsProjectile(weaponData, direction, origin)
        
        PhysicsProjectile->>PhysicsManager: createRigidBody(position, velocity)
        PhysicsManager-->>PhysicsProjectile: rigidBody
        
        PhysicsProjectile->>WeaponEffectsManager: createProjectileTrail(projectileId, projectileObject)
        WeaponEffectsManager-->>PhysicsProjectile: trailId
        
        SplashDamageWeapon->>AudioSystem: playSound("torpedo_fire", origin, 1.0)
        SplashDamageWeapon->>SplashDamageWeapon: startCooldown()
        
        Note over PhysicsProjectile: Projectile flies through space with physics simulation
        
        loop Projectile Flight
            PhysicsProjectile->>PhysicsProjectile: checkRangeExpiry()
            alt Range Exceeded
                PhysicsProjectile->>PhysicsProjectile: expireOutOfRange()
                PhysicsProjectile->>WeaponEffectsManager: removeProjectileTrail(trailId)
                PhysicsProjectile->>PhysicsManager: removeRigidBody(rigidBody)
                Note over PhysicsProjectile: Projectile cleanup - no explosion
            else Collision Detected
                PhysicsManager->>PhysicsProjectile: onCollision(contactPoint, otherObject)
                PhysicsProjectile->>PhysicsProjectile: detonate(contactPoint)
                
                Note over PhysicsProjectile: PROJECTILE FEATURE - Splash Damage
                PhysicsProjectile->>PhysicsManager: getEntitiesInRadius(position, blastRadius)
                PhysicsManager-->>PhysicsProjectile: affectedEntities[]
                
                loop For Each Entity in Blast Radius
                    PhysicsProjectile->>PhysicsProjectile: calculateDistanceDamage(entity, distance)
                    
                    Note over PhysicsProjectile: NO SUB-TARGETING - Base damage only
                    PhysicsProjectile->>EnemyShip: applyDamage(damage, "explosive")
                    
                    Note over EnemyShip: Apply damage to shields first, then hull
                    EnemyShip->>EnemyShip: damageShields(damage)
                    EnemyShip->>EnemyShip: damageHull(remainingDamage)
                    
                    Note over EnemyShip: PROJECTILE FEATURE - Random Subsystem Damage
                    alt Damage Penetrated Shields/Hull
                        EnemyShip->>EnemyShip: rollRandomSubsystemDamage()
                        EnemyShip->>EnemyShip: selectRandomSubsystem()
                        EnemyShip->>EnemyShip: applySubsystemDamage(randomSystem, bonusDamage)
                        Note right of EnemyShip: Random chance to damage:<br/>- Engines<br/>- Weapons<br/>- Shields<br/>- Life Support
                    end
                    
                    EnemyShip-->>PhysicsProjectile: damageResult
                    
                    alt Target Destroyed
                        PhysicsProjectile->>TargetComputerManager: removeDestroyedTarget(target)
                        PhysicsProjectile->>AudioSystem: playSuccessSound()
                    end
                end
                
                PhysicsProjectile->>WeaponEffectsManager: createExplosion(position, blastRadius)
                PhysicsProjectile->>AudioSystem: playSound("explosion", position, 1.0)
                PhysicsProjectile->>WeaponEffectsManager: removeProjectileTrail(trailId)
                PhysicsProjectile->>PhysicsManager: removeRigidBody(rigidBody)
                Note over PhysicsProjectile: Projectile cleanup after explosion
            end
        end
        
        SplashDamageWeapon->>WeaponHUD: updateWeaponStatus(slotIndex)
    end
    
    SplashDamageWeapon-->>WeaponSlot: firing complete
    WeaponSlot-->>WeaponSystemCore: weapon fired
    WeaponSystemCore->>WeaponHUD: refreshWeaponDisplay()
```

## Key Features of Projectile Weapons (Torpedoes):

### **🚀 Physics-Based Projectiles**
- **Real Physics**: Projectiles have mass, velocity, and collision detection
- **Travel Time**: Realistic flight time to target
- **Range Limiting**: Projectiles expire at maximum range if no collision

### **💥 Splash Damage System**
- **Area of Effect**: Damage all entities within blast radius
- **Distance-Based Damage**: Damage decreases with distance from impact
- **Multiple Target Hits**: Can damage multiple enemies simultaneously

### **🎯 Free-Aim Targeting**
- **No Target Lock Required**: Fire toward crosshairs direction
- **Camera-Based Direction**: Uses camera quaternion for aim direction
- **Manual Aiming**: Player skill-based targeting system

### **🎲 Random Subsystem Damage**
- **Penetration Bonus**: When damage penetrates shields/hull, chance for subsystem damage
- **Random Target Selection**: Engines, Weapons, Shields, Life Support systems
- **Lucky Hits**: Simulates realistic combat where projectiles can hit critical components
- **No Precision Targeting**: Unlike beam weapons, cannot deliberately target subsystems

### **🔋 Energy-Based System**
- **Energy Consumption**: Uses ship's energy reserves
- **Energy Validation**: Comprehensive pre-fire energy checking
- **HUD Feedback**: Clear messaging for insufficient energy

### **⏱️ Projectile Lifecycle**
- **Creation**: Physics body created with initial velocity
- **Flight**: Continuous physics simulation and range checking
- **Collision**: Detection and immediate detonation
- **Expiry**: Range-based cleanup if no collision occurs
- **Cleanup**: Proper removal from physics world and scene 