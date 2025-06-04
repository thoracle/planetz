# Projectile Weapon System Simplification

## Overview
Simplified the projectile weapon system by replacing the missile tubes concept with individual weapon cards for each projectile type. This makes the system more intuitive and consistent with how laser weapons work.

## Changes Made

### Removed Concept
- **Missile Tubes**: Previously required installing missile tube equipment that fired different ammo types
- **Torpedo Launchers**: Separate equipment for torpedo weapons  
- **Ammo Consumption**: Projectiles no longer consume ammo

### New System
Individual weapon cards that work like laser weapons but fire projectiles:

#### 1. Standard Missile
- **Type**: `standard_missile`
- **Damage**: 200
- **Cooldown**: 3.0 seconds
- **Range**: 3000m
- **Blast Radius**: 50m
- **Homing**: No
- **Target Lock**: Required
- **Autofire**: No

#### 2. Homing Missile  
- **Type**: `homing_missile`
- **Damage**: 180
- **Cooldown**: 2.5 seconds
- **Range**: 3500m
- **Blast Radius**: 45m
- **Homing**: Yes (120°/s turn rate)
- **Target Lock**: Required
- **Autofire**: Yes

#### 3. Photon Torpedo
- **Type**: `photon_torpedo` 
- **Damage**: 320
- **Cooldown**: 4.0 seconds
- **Range**: 2500m
- **Blast Radius**: 80m
- **Homing**: No
- **Target Lock**: Required
- **Shield Piercing**: Yes
- **Autofire**: No

#### 4. Proximity Mine
- **Type**: `proximity_mine`
- **Damage**: 150
- **Cooldown**: 3.5 seconds
- **Range**: 500m (deployment)
- **Blast Radius**: 80m
- **Homing**: No
- **Target Lock**: Not required
- **Deployment**: Stationary at ship location
- **Autofire**: No

## Technical Implementation

### Files Modified
1. **WeaponDefinitions.js**
   - Removed: `heavy_torpedo`, `cluster_missile`, `guided_torpedo`
   - Added: `photon_torpedo` 
   - Updated: `standard_missile`, `homing_missile` balancing
   - All projectile weapons now use cooldowns instead of ammo

2. **NFTCard.js**
   - Removed: `MISSILE_TUBES`, `TORPEDO_LAUNCHER`
   - Added: `STANDARD_MISSILE`, `HOMING_MISSILE`, `PHOTON_TORPEDO`, `PROXIMITY_MINE`
   - Updated display names and icons

3. **CardInventoryUI.js**
   - Updated `isWeaponCard()` method to include new projectile weapons
   - Updated all `cardToSlotMapping` objects to map new weapons to weapon slots
   - Removed deprecated missile tube mappings

4. **CardSystemIntegration.js**
   - Updated weapon system mapping to include all projectile weapons
   - Removed deprecated missile tube system mapping

5. **MissileTubes.js**
   - **DELETED** - No longer needed

### Weapon Slot Assignment
All projectile weapons are assigned to weapon slots:
- `'standard_missile': ['weapons']`
- `'homing_missile': ['weapons']` 
- `'photon_torpedo': ['weapons']`
- `'proximity_mine': ['weapons']`

### Cooldown System
Projectile weapons now work exactly like laser weapons:
- No ammo consumption
- Cooldown-based firing rate
- Energy cost per shot
- Same update loop and timing system

### Splash Damage Mechanics
Projectile weapons retain their splash damage capabilities:
- Create `Projectile` instances with physics simulation
- Blast radius damage with linear falloff
- Special properties (homing, shield piercing, etc.)
- Visual explosion effects

## Gameplay Impact

### Benefits
1. **Simplified Equipment**: No need to manage separate launcher + ammo systems
2. **Consistent Interface**: All weapons work the same way (cooldowns, no ammo)
3. **Clear Specialization**: Each weapon type has distinct characteristics
4. **Balanced Progression**: Different damage/cooldown/range trade-offs

### Weapon Roles
- **Standard Missile**: High damage, direct fire projectile
- **Homing Missile**: Lower damage but tracking capability + autofire
- **Photon Torpedo**: Highest damage, shield piercing, longest cooldown
- **Proximity Mine**: Area denial, no target lock required

### Balance Considerations
- Projectile weapons have higher damage than lasers but longer cooldowns
- Homing missile trades damage for tracking and autofire capability
- Photon torpedo is the most powerful but slowest firing
- Proximity mine is defensive/tactical rather than direct combat

## Testing
Created `test_projectile_weapons.html` to verify:
- Weapon creation and firing mechanics
- Cooldown timing accuracy
- Special properties (homing, shield piercing)
- Splash damage calculations
- Visual feedback and logging

## Migration Path
- Existing missile tube cards become obsolete
- Players will need to obtain new individual weapon cards
- No automatic conversion - clean slate approach
- Weapon slot allocation remains the same

This simplification makes the weapon system more intuitive while maintaining the tactical depth of projectile combat with splash damage and special effects. 