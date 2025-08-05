# Scale Issues in Planetz Game

## Overview

This document analyzes how scale is used throughout the Planetz game and identifies potential issues with collision detection. The game operates with mixed scale approaches that can cause inconsistencies in physics interactions.

## Scale Units and Conventions

### World Units
- **1 world unit = 1 meter** - This is the basic scale throughout the game
- Distance calculations return values in meters
- Physics bodies are sized in meters
- All position coordinates are in meters

### Distance Display Convention
- Distances are typically **displayed in kilometers** for readability
- Conversion: `distanceKm = distanceMeters / 1000`
- Log messages often show "X.Xkm" for user-friendly display

## Celestial Bodies Scale

### Solar System Scale Factors
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `VISUAL_SCALE` | 100.0 | Visual representation scaling |
| `SCALE_FACTOR` | 1e-9 | Physics calculations scaling |
| `MAX_DISTANCE_KM` | 1.6M km | Maximum orbital distance |

### Star Sizes
```javascript
// From SolarSystemManager.js
const starSize = this.starSystem.star_size || 5; // Default 5 meters radius
const starGeometry = new THREE.SphereGeometry(starSize, 32, 32);
```

| Star Type | Typical Radius | Physics Collision |
|-----------|----------------|-------------------|
| Standard Star | 5m | 5m (realistic) or 0.5m (weapon-friendly) |
| Large Star | Variable | Matches visual or capped at 0.5m |

### Planet Sizes
```javascript
// From SolarSystemManager.js
const planetSize = Math.max(0.1, planetData.planet_size || 1); // Minimum 0.1m
```

| Planet Type | Visual Radius | Physics Collision | Orbital Distance |
|-------------|---------------|-------------------|------------------|
| Small Planet | 0.1-1.2m | Matches visual (realistic mode) | 15-35m (starter system) |
| Terra Prime | ~1.2m | 1.2m | 15-35m |
| Luna (moon) | ~0.3m | 0.3m | 15-35m |
| Europa (moon) | ~0.25m | 0.25m | 15-35m |

### Orbital Spacing
- **Starter System**: Very compact (15-35m orbital radii)
- **Regular Systems**: Wider spacing (1000-5000m orbital radii)

## Ship and Target Scales

### Target Dummy Ships
```javascript
// From StarfieldManager.js
const baseMeshSize = 2.0;           // Base mesh radius: 2.0m
const meshScale = 1.5;              // Scale multiplier
const actualMeshSize = 3.0;         // Final visual size: 3.0m
```

| Ship Component | Visual Size | Physics Collision | Notes |
|----------------|-------------|-------------------|-------|
| Target Dummy Visual | 3.0m radius | 3.0m (realistic) or 4.0m (weapon-friendly) | "What you see is what you get" |
| Enemy Fighter | 3.0m radius | 3.0m | Hull: 600hp |
| Enemy Interceptor | 3.0m radius | 3.0m | Hull: 400hp |
| Enemy Gunship | 3.0m radius | 3.0m | Hull: 1000hp |

### Ship Positioning
- Target dummies spawn at **15-25km distance** from player
- Random height variation: ±5m
- Ships positioned around player in 360° arc

## Weapon and Projectile Scales

### Missile Visual Representation
```javascript
// From WeaponCard.js - PhysicsProjectile class
const geometry = new THREE.SphereGeometry(5.0, 8, 6); // Visual radius: 5.0m
```

### Weapon Specifications
| Weapon | Damage | Range | Speed | Visual Size | Collision Radius |
|--------|--------|-------|--------|-------------|------------------|
| **Standard Missile** | 150 | 30km | 1500 m/s | 5.0m radius | 2.0-3.5m (variable) |
| Homing Missile | 180 | 8.4km | 8000 m/s | 5.0m radius | Variable |
| Photon Torpedo | Variable | 45km | 10000 m/s | 5.0m radius | Variable |
| Laser Cannon | Variable | 18km | Instant | Beam | N/A |

### Collision Radius Calculations
```javascript
// Dynamic collision radius based on target distance
if (targetDistance < 1) {
    baseRadius = 2.5; // Close combat: 2.5m
} else if (targetDistance < 10) {
    baseRadius = 3.0; // Medium range: 3.0m  
} else {
    baseRadius = 3.5; // Long range: 3.5m
}

// For missiles without targets (precision shots)
collisionRadius = 2.0; // Small radius for precision
```

## Physics Parameters

### Collision Detection Settings
| Parameter | Value | Impact |
|-----------|-------|--------|
| Physics Update Rate | 60 Hz | Standard game physics |
| CCD Threshold | 0.100m | Continuous collision detection |
| Spatial Query Distance | 5000m | Entity deactivation distance |
| Collision Delay | 3ms | Prevents immediate collision |

### Speed vs. Collision Radius
```javascript
const physicsStepDistance = (projectileSpeed / 240); // Distance per physics step
const minRadiusForTunneling = Math.max(1.0, physicsStepDistance * 0.5);
```

| Projectile Speed | Physics Step Distance | Min Collision Radius |
|------------------|----------------------|---------------------|
| 1500 m/s (Standard Missile) | 6.25m | 3.125m |
| 8000 m/s (Homing Missile) | 33.3m | 16.7m |
| 10000 m/s (Photon Torpedo) | 41.7m | 20.8m |

## Scale Issues and Problems

### 1. **Massive Scale Disparity**
- **Problem**: Celestial bodies (5m stars, 1.2m planets) are tiny compared to realistic space scales
- **Impact**: Players can easily collide with "planets" that look like small rocks
- **Solution**: Consider separate visual and collision scales for celestial bodies

### 2. **Collision Tunneling with High-Speed Projectiles**
- **Problem**: Fast projectiles (10000 m/s) can tunnel through targets
- **Physics Step**: At 240 FPS, a 10000 m/s projectile moves 41.7m per frame
- **Target Size**: Ships are only 3.0m radius
- **Solution**: Enhanced CCD and larger collision radii for fast projectiles

### 3. **Inconsistent Visual vs. Physics Sizes**
- **Problem**: Missiles appear 5.0m radius but have 2.0-3.5m collision radius
- **Impact**: Visual mismatches with actual hit detection
- **Solution**: Either match collision to visual or use visual indicators for actual collision zone

### 4. **Orbital Distance vs. Object Size Inconsistency**
- **Problem**: Planets orbit 15-35m from a 5m star, but planets are 0.3-1.2m
- **Reality Check**: Objects would appear overlapping at these scales
- **Impact**: Unrealistic spatial relationships

### 5. **Aiming Precision vs. Object Scales**
- **Problem**: Crosshair aiming tolerance (50-300m) is huge compared to ship size (3m)
- **Impact**: Can "hit" targets that are visually 100+ ship-lengths away
- **Current**: Tolerance ranges from 17x to 100x ship radius

### 6. **Speed Scale Realism**
- **Missile Speed**: 1500 m/s = 5,400 km/h = Mach 4.4
- **Context**: Realistic for modern missiles
- **Problem**: At 15km distance, travel time is 10 seconds - very slow for space combat

## Recommendations

### Short Term Fixes
1. **Standardize collision radii** to match visual representation
2. **Reduce aiming tolerance** to 1-5m for precision targeting
3. **Implement separate collision modes** for different object types

### Long Term Considerations
1. **Scale Redesign**: Consider 1 world unit = 10m or 100m for better space scale
2. **Separate Visual/Physics Systems**: Use different scales for rendering vs. physics
3. **Distance-Based LOD**: Simplify collision detection for distant objects
4. **Realistic Speed Scaling**: Increase projectile speeds for faster combat

### Current Workarounds
The game currently uses several workarounds:
- **Realistic Collision Toggle**: `window.useRealisticCollision` flag
- **Dynamic Collision Radii**: Adjust based on target distance and speed
- **Compact Solar Systems**: Use unrealistically small orbital distances
- **Enhanced CCD**: Prevent tunneling with continuous collision detection

## Scale Comparison Table

| Object Type | Visual Size | Physics Size | Realistic Size | Scale Ratio |
|-------------|-------------|--------------|----------------|-------------|
| Star (Sol) | 5m radius | 5m | 696,000 km | 1:139,200,000 |
| Planet (Terra) | 1.2m radius | 1.2m | 6,371 km | 1:5,309,167 |
| Spaceship | 3m radius | 3m | ~50-100m | 1:17-33 |
| Missile | 5m visual | 2-3.5m physics | ~0.2m | 25:1 (oversized) |

This analysis reveals that the game uses dramatically different scaling approaches for different object types, which can lead to collision detection inconsistencies and unrealistic spatial relationships.