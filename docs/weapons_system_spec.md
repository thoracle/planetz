# Weapons System Specification

## 1. Overview
The weapons system allows players to equip weapons to their ship via a card-based drag-and-drop interface, select active weapons using `[`, `]` keys, fire them with the `Enter` key, and toggle autofire mode with the `\` key. Weapons are categorized into two types: **Scan-Hit** (direct-fire energy weapons) and **Splash-Damage** (area-effect projectiles). Each weapon has attributes like damage, cooldown, range, and special properties (e.g., autofire compatibility, homing for missiles).

## 2. Implementation Architecture

### Core Classes
- **WeaponSystemCore**: Main controller managing weapon slots, selection, autofire, and integration
- **WeaponSlot**: Individual slot management with cooldown tracking and firing validation
- **WeaponCard**: Base class for weapon cards with ScanHitWeapon and SplashDamageWeapon subclasses
- **WeaponDefinitions**: Factory methods for 8 predefined weapon types
- **WeaponHUD**: Visual interface for weapon status and user feedback
- **Projectile**: Physics-based projectile system for splash-damage weapons

### Ship Integration
The weapons system is integrated into the Ship class via:
- `ship.weaponSystem` property initialized in `initializeWeaponSystem()`
- Integration with TargetComputer for target lock functionality
- Connection to ship energy system for energy consumption validation
- Updates in the main game loop for autofire and cooldown processing

## 3. Weapon Slot and Card System Integration

### Weapon Slots
Ships have 4 weapon slots by default. Each slot can hold one weapon card dragged from the player's inventory. Players can equip multiple copies of the same card to different slots (e.g., can drag the same "Laser Cannon" card to three different weapon slots).

### Card Properties
Each weapon card defines:

**Basic Properties:**
- **Weapon Type**: Scan-Hit (e.g., laser cannon, plasma cannon) or Splash-Damage (e.g., missile, torpedo, mine)
- **Damage**: Base damage value (e.g., 50 for laser, 200 for missile)
- **Cooldown**: Time (in seconds) before the weapon can fire again (e.g., 0.5s for laser, 3s for torpedo)
- **Range**: Maximum engagement distance (e.g., 1000m for laser, 3000m for missile)
- **Autofire Property**: Boolean indicating if the weapon can fire in autofire mode
- **Energy Cost**: Energy consumed per shot

**Type-Specific Properties:**
- **Scan-Hit**: Accuracy (chance to hit, e.g., 95%)
- **Splash-Damage**: Blast radius (e.g., 50m), homing capability, target lock requirement, flight range, turn rate

**Card Visuals:** Cards display key stats (damage, cooldown, range, type) and visual indicators (e.g., laser icon for Scan-Hit, explosion icon for Splash-Damage).

## 4. Weapon Selection Mechanics

### Active Weapon Selection
- **`[` key**: Cycle to previous equipped weapon slot
- **`]` key**: Cycle to next equipped weapon slot  
- Only one weapon slot is active at a time for manual firing
- Visual feedback: Active slot highlighted in WeaponHUD
- Empty slots are skipped during cycling
- If no weapons equipped, displays "No weapons equipped" message

### Slot Cycling
- Slots wrap around (first ↔ last)
- Only equipped weapons are selectable
- Audio feedback confirms weapon selection

### Firing
- **`Enter` key**: Fire currently selected weapon
- Validates cooldown status before firing
- For Splash-Damage weapons requiring target lock, validates target availability
- Energy consumption checked before firing
- Audio feedback for successful/failed firing attempts

## 5. Autofire Mode

### Toggle
- **`\` key**: Toggle autofire mode on/off
- HUD indicator shows "Autofire: ON/OFF" status
- Console log confirms autofire state changes

### Behavior
When autofire is ON:
- All equipped weapons with `autofireEnabled: true` attempt to fire automatically
- Validates weapon cooldown status
- For Splash-Damage weapons, validates target lock and range
- Prioritizes closest valid target within range
- Respects individual weapon cooldown timers
- Manual firing with `Enter` still works (mixed control)

## 6. Weapon Types and Mechanics

### (a) Scan-Hit Weapons
**Description**: Direct-fire energy weapons that hit instantly upon firing, requiring line-of-sight to the target.

**Available Types:**
1. **Laser Cannon**: High accuracy (95%), moderate damage (50), fast cooldown (0.5s), medium range (1200m), autofire enabled
2. **Plasma Cannon**: Good accuracy (85%), high damage (65), medium cooldown (1.5s), medium range (1000m), autofire enabled  
3. **Pulse Cannon**: High accuracy (90%), low damage (35), very fast cooldown (0.33s), short range (800m), autofire enabled
4. **Phaser Array**: High accuracy (92%), good damage (55), medium cooldown (1.1s), long range (1500m), autofire enabled

**Mechanics:**
- Instant hit calculation using accuracy percentage
- Damage applied immediately to target
- Energy consumption per shot
- Cooldown timer starts after firing
- In autofire mode, fires at locked target when cooldown expires

### (b) Splash-Damage Weapons  
**Description**: Projectile-based weapons that deal area-of-effect damage, often requiring target lock.

**Available Types:**
1. **Standard Missile**: High damage (200), long cooldown (3s), long range (3000m), 50m blast radius, target lock required, no autofire
2. **Homing Missile**: Very high damage (250), medium cooldown (2s), extended range (3500m), 60m blast radius, homing capability, target lock required, autofire enabled
3. **Heavy Torpedo**: Extreme damage (400), very long cooldown (5s), medium range (2000m), 100m blast radius, target lock required, no autofire
4. **Proximity Mine**: Moderate damage (150), long cooldown (4s), short range (500m), 80m blast radius, no target lock required, no autofire

**Mechanics:**
- Creates Projectile instances with physics simulation
- **Standard Missiles/Torpedoes**: Fire in straight line toward locked target
- **Homing Missiles**: Automatically track locked target with turn rate limitations
- **Mines**: Deploy at ship location, detonate on proximity or timer
- **Target Lock**: Required for missiles/torpedoes (validates via TargetComputer)
- **Blast Radius**: Damage applied to all targets within radius with falloff
- **Flight Range**: Projectiles detonate when reaching maximum flight distance

## 7. Weapon Definitions

The system includes 8 predefined weapon types accessible via `WeaponDefinitions.getAllWeaponDefinitions()`:

### Scan-Hit Weapons
| Name | Damage | Cooldown | Range | Accuracy | Energy | Autofire |
|------|--------|----------|--------|----------|---------|----------|
| Laser Cannon | 50 | 0.5s | 1200m | 95% | 15 | Yes |
| Plasma Cannon | 65 | 1.5s | 1000m | 85% | 25 | Yes |
| Pulse Cannon | 35 | 0.33s | 800m | 90% | 10 | Yes |
| Phaser Array | 55 | 1.1s | 1500m | 92% | 20 | Yes |

### Splash-Damage Weapons  
| Name | Damage | Cooldown | Range | Blast | Energy | Target Lock | Autofire |
|------|--------|----------|--------|-------|---------|-------------|----------|
| Standard Missile | 200 | 3.0s | 3000m | 50m | 5 | Yes | No |
| Homing Missile | 250 | 2.0s | 3500m | 60m | 8 | Yes | Yes |
| Heavy Torpedo | 400 | 5.0s | 2000m | 100m | 10 | Yes | No |
| Proximity Mine | 150 | 4.0s | 500m | 80m | 3 | No | No |

## 8. Key Bindings Integration

### StarfieldManager Integration
All weapon controls are integrated into StarfieldManager's `bindKeyEvents()` method:

```javascript
// Weapon key bindings (disabled when docked)
if (event.key === '[') {
    // Previous weapon selection with audio feedback
}
if (event.key === ']') {
    // Next weapon selection with audio feedback  
}
if (event.key === 'Enter') {
    // Fire active weapon with success/failure audio
}
if (event.key === '\\') {
    // Toggle autofire with status console logging
}
```

### Target Integration
- Weapon system automatically receives target updates from TargetComputer
- `cycleTarget()` method updates `ship.weaponSystem.setLockedTarget()`
- Target lock validation for splash-damage weapons
- Range checking for autofire weapons

## 9. HUD Integration

### WeaponHUD Features
- **Weapon Slots Display**: Shows 4 weapon slots with equipped weapons
- **Active Weapon Highlight**: Visual indicator of currently selected weapon
- **Cooldown Bars**: Real-time cooldown progress indicators
- **Autofire Indicators**: Shows which weapons support/use autofire
- **Target Lock Status**: Indicates when target lock is required/available
- **User Feedback Messages**: Weapon selection confirmations, error messages

### Update Integration
- HUD updates integrated into main game loop via `StarfieldManager.update()`
- Real-time cooldown display updates
- Automatic HUD connection when WeaponSystemCore is initialized

## 10. Technical Implementation Notes

### Weapon System Initialization
```javascript
// In Ship.js - initializeWeaponSystem()
const { WeaponSystemCore } = await import('./systems/WeaponSystemCore.js');
this.weaponSystem = new WeaponSystemCore(this, 4); // 4 weapon slots
```

### Main Game Loop Integration
```javascript
// In StarfieldManager.js - update() method
if (ship && ship.weaponSystem) {
    ship.weaponSystem.updateAutofire(deltaTime);
    if (this.weaponHUD) {
        this.weaponHUD.updateCooldownDisplay(ship.weaponSystem.weaponSlots);
    }
}
```

### Target Lock Integration
```javascript
// In StarfieldManager.js - cycleTarget() method  
if (ship && ship.weaponSystem) {
    ship.weaponSystem.setLockedTarget(this.currentTarget);
}
```

### Energy System Integration
- Weapons validate energy availability before firing
- Energy consumption handled via `ship.consumeEnergy(amount)`
- Failed energy validation prevents weapon firing with error feedback

## 11. Error Handling and User Feedback

### Common Messages
- **"No weapons equipped"**: When trying to fire with empty weapon slots
- **Cooldown messages**: "{weapon_name} cooling down: {time}s"
- **"Target lock required"**: For splash-damage weapons without valid target
- **"Insufficient energy"**: When energy requirements not met
- **Audio feedback**: Success/failure sounds for all weapon actions

### Validation Systems
- Slot availability checking during weapon cycling
- Cooldown validation before firing
- Target lock validation for splash-damage weapons
- Energy availability validation before weapon discharge
- Range checking for autofire weapons

## 12. Future Integration Points

### Card System Integration (Next Priority)
- Drag-and-drop weapon installation from CardInventoryUI
- Weapon card validation and slot compatibility
- Weapon configuration persistence across ship changes
- Build validation preventing invalid weapon configurations

### Energy System Enhancement
- Integration with ship energy reactor systems
- Energy efficiency calculations based on weapon levels
- Energy priority management during low-power situations

### Combat Integration
- Damage application to enemy ships and systems
- Weapon effectiveness calculations vs. different armor types
- Sub-targeting integration for precision weapon strikes

