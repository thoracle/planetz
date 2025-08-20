## Weapon Firing System – Current Flow (Hit-scan and Projectile)

This document reflects the current behavior in code for both hit-scan (laser) and projectile weapons.

### Hit-scan (Laser) firing sequence

```mermaid
sequenceDiagram
    autonumber
    participant P as Player
    participant SF as StarfieldManager
    participant WS as WeaponSystemCore
    participant SL as WeaponSlot
    participant WC as WeaponCard (equipped)
    participant EM as WeaponEffectsManager
    participant PM as PhysicsManager
    participant TS as Target Ship

    P->>SF: Space keydown
    SF->>WS: fireActiveWeapon()
    WS->>SL: fire(ship, lockedTarget)

    alt Not ready to fire
      SL-->>WS: return false (cooldown/energy/lock/HUD msg)
      WS-->>SF: false
    else Ready to fire
      SL->>SL: calculateCrosshairDistance()/calculateDistanceToTarget
      SL->>SL: calculateWeaponOrigin()
      SL->>WC: fire(origin, target)
      WC-->>SL: { success, damage, ... }
      alt success
        SL->>SL: setCooldownTimer()
        SL->>EM: triggerWeaponEffects(ship, weapon, target, result)
        Note over EM: Dual muzzle flashes at screen corners
        EM->>EM: compute convergence (visual aim)
        EM->>EM: createLaserBeam(left,right -> aimPoint)
        EM->>SL: request physics hit test
        SL->>PM: raycast(start, dir, rangeKm) (checkLaserBeamHit)
        PM-->>SL: {hit, point, entity, distanceKm}
        alt hit && entity.ship
          SL->>EM: createExplosion(point, radius)
          SL->>TS: applyDamage(damage, 'energy', [subsystem?])
          SL->>HUD: showDamageFeedback
        else miss
          SL->>HUD: showMissFeedback
        end
      else failed
        SL-->>WS: false
      end
    end
```

Notes:
- Input path: `StarfieldManager` keydown → `WeaponSystemCore.fireActiveWeapon()` → active `WeaponSlot.fire()`.
- Range enforcement: blocks firing when target/crosshair distance > weapon.range (km).
- Physics raycast: performed by `WeaponSlot.checkLaserBeamHit()`; world units are kilometers.
- Filtering: current logic skips stars/planets/moons; accepts any non‑celestial entity (ships, stations, beacons, friendlies).
- On hit, damage is applied via `hitEntity.ship.applyDamage(...)`; HUD feedback is shown.

### Projectile weapon firing sequence

```mermaid
sequenceDiagram
    autonumber
    participant P as Player
    participant SF as StarfieldManager
    participant WS as WeaponSystemCore
    participant SL as WeaponSlot
    participant WC as WeaponCard (equipped)
    participant EM as WeaponEffectsManager
    participant App as App Update Loop
    participant PR as Projectile Instance
    participant TS as Target Ship

    P->>SF: Space keydown
    SF->>WS: fireActiveWeapon()
    WS->>SL: fire(ship, lockedTarget)
    alt Not ready to fire
      SL-->>WS: return false (cooldown/energy/lock/HUD msg)
      WS-->>SF: false
    else Ready to fire
      SL->>SL: calculateDistance / origin
      SL->>WC: fire(origin, target)
      WC-->>SL: { success, damage, projectile?, ... }
      alt success
        SL->>SL: setCooldownTimer()
        SL->>EM: triggerWeaponEffects(...)
        EM->>EM: create muzzle flashes
        EM->>PR: create projectile + trail
        EM->>App: register PR in activeProjectiles
        loop per frame
          App->>PR: update(deltaTime)
          alt collision/detonation
            PR->>TS: applyDamage(damage, 'explosive')
            PR->>EM: createExplosion
            PR-->>App: deactivate/cleanup
          end
        end
      else failed
        SL-->>WS: false
      end
    end
```

Key implementation points (as of codebase):
- Input and control: `frontend/static/js/views/StarfieldManager.js` (Space fires).
- Weapon orchestration: `frontend/static/js/ship/systems/WeaponSystemCore.js` → `WeaponSlot.fire()`.
- Hit‑scan specifics: `WeaponSlot.triggerWeaponEffects()` + `checkLaserBeamHit()` + `PhysicsManager.raycast()`.
- Damage application: `hitEntity.ship.applyDamage(...)` on successful physics hit.
- Projectiles: effects/trail handled by `WeaponEffectsManager`; update loop processes active projectiles.


