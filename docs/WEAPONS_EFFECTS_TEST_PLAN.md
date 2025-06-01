# Weapons Visual Effects System - Test Plan

## Overview
Comprehensive testing plan for the WeaponEffectsManager system implementing arcade-style retro Elite vector aesthetics with 60fps performance targeting.

## Test Environment Setup
- **Browser**: Chrome/Firefox/Safari
- **Server**: `python3 run.py` on localhost:5001
- **Debug Mode**: Enable with `Ctrl+D` for performance monitoring
- **Audio**: Ensure speakers/headphones connected for 3D spatial audio testing

## Key Controls for Testing 🎮
- **Q** - Spawn 3 target dummy ships for weapons testing
- **T** - Toggle Target Computer (required for targeting)
- **Tab** - Cycle through targets
- **Z/X** - Previous/Next weapon selection
- **Space** - Fire active weapon
- **C** - Toggle autofire mode
- **0-9** - Speed control (impulse engines)
- **F/A** - Fore/Aft view changes
- **D** - Toggle damage control interface
- **H** - Toggle help interface

---

## 1. Basic Functionality Tests

### 1.1 System Initialization
- [ ] **Test**: WeaponEffectsManager initializes without errors
- [ ] **Expected**: Console shows "WeaponEffectsManager initialized in full mode"
- [ ] **Expected**: Console shows "WeaponEffectsManager connected to ship"
- [ ] **Verify**: No infinite retry loops or error spam

### 1.2 Weapon Firing Basics
- [ ] **Test**: Fire each weapon type (Laser, Pulse, Plasma, Phaser)
- [ ] **Method**: Use number keys 1-4 or click weapon HUD
- [ ] **Expected**: Each weapon fires without errors
- [ ] **Expected**: Visual and audio effects trigger for each shot

### 1.3 Effect Creation
- [ ] **Test**: Muzzle flash appears at weapon firing
- [ ] **Test**: Laser beam creates visible line to target
- [ ] **Test**: Explosion effect appears at impact point
- [ ] **Expected**: All effects have appropriate colors per weapon type

---

## 2. Visual Effects Tests

### 2.1 Muzzle Flash Effects
| Weapon Type | Expected Color | Duration | Test Result |
|-------------|---------------|----------|-------------|
| Laser Cannon | Cyan | 0.15s | ⬜ |
| Pulse Cannon | Cyan | 0.15s | ⬜ |
| Plasma Cannon | Green | 0.15s | ⬜ |
| Phaser Array | Green | 0.15s | ⬜ |

- [ ] **Test**: Muzzle flash appears as bright sphere at ship position
- [ ] **Test**: Flash fades out smoothly over duration
- [ ] **Test**: Flash disappears completely after duration

### 2.2 Laser Beam Effects
- [ ] **Test**: Beam appears as thin cylinder between ship and target
- [ ] **Test**: Beam color matches weapon type (cyan/green)
- [ ] **Test**: Beam fades out over ~0.8 seconds (tunable)
- [ ] **Test**: Beam length matches actual firing distance
- [ ] **Test**: Multiple beams can exist simultaneously

### 2.3 Explosion Effects
- [ ] **Test**: Explosion appears at target impact point
- [ ] **Test**: Explosion uses expanding wireframe sphere geometry
- [ ] **Test**: Explosion scale appropriate to damage/weapon type
- [ ] **Test**: Explosion fades out smoothly
- [ ] **Test**: Multiple explosions render correctly

### 2.4 Effect Colors by Weapon Type
| Weapon | Muzzle | Beam | Explosion | Test Result |
|--------|--------|------|-----------|-------------|
| Laser | Cyan | Cyan | Orange | ⬜ |
| Pulse | Cyan | Cyan | Orange | ⬜ |
| Plasma | Green | Green | Green | ⬜ |
| Phaser | Green | Green | Green | ⬜ |

### 2.5 Target HUD Readability
- [ ] **Test**: Target hostile ships with Target Computer (`T` key)
- [ ] **Expected**: Hostile target info displays in **bright red (#ff4444)** for better readability
- [ ] **Test**: Target neutral/friendly objects
- [ ] **Expected**: Text remains in appropriate colors (yellow/green)
- [ ] **Test**: HUD border colors match target diplomacy status
- [ ] **Expected**: Bright red borders for hostile targets, improved visibility

### 2.6 Manual Aiming System (Critical Gameplay Test)
- [ ] **Test**: Spawn targets with `Q` key, activate target computer with `T`
- [ ] **Test**: Select a target with `Tab` (target reticle appears)
- [ ] **Test**: **Look away from target** using arrow keys/rotation
- [ ] **Test**: Fire weapons with `Space` while looking away from target
- [ ] **Expected**: ✅ **Weapons fire in direction you're looking (manual aim)**
- [ ] **Expected**: ✅ **Weapons do NOT auto-aim at selected target**
- [ ] **Expected**: ✅ **Target reticle is visual aid only, not auto-hit**
- [ ] **Test**: Console shows "🎯 Using camera aim direction for weapon fire"
- [ ] **Expected**: Manual skill-based aiming, not auto-targeting

---

## 3. Audio System Tests

### 3.1 Audio File Mapping
| Weapon Type | Expected Audio File | Test Result |
|-------------|-------------------|-------------|
| Laser Cannon | lasers.wav | ⬜ |
| Pulse Cannon | lasers.wav | ⬜ |
| Plasma Cannon | photons.wav | ⬜ |
| Phaser Array | photons.wav | ⬜ |

### 3.2 3D Spatial Audio
- [ ] **Test**: Audio volume decreases with distance from target
- [ ] **Test**: Audio pans left/right based on target position
- [ ] **Test**: Audio context resumes properly after user interaction
- [ ] **Test**: Multiple audio sources play simultaneously without issues

### 3.3 Audio Context Management
- [ ] **Test**: Audio works after page reload
- [ ] **Test**: Audio resumes after browser tab becomes inactive/active
- [ ] **Test**: Audio handles context suspension gracefully

---

## 4. Performance Tests

### 4.1 Frame Rate Performance
- [ ] **Test**: Maintain 60fps during single weapon fire
- [ ] **Test**: Maintain 60fps during rapid fire (hold fire key)
- [ ] **Test**: Maintain 60fps with multiple weapons firing simultaneously
- [ ] **Test**: Check fps with debug mode (`Ctrl+D`)

### 4.2 Object Pooling
- [ ] **Test**: Fire weapons rapidly (hold keys) for 30+ seconds
- [ ] **Expected**: No memory leaks or performance degradation
- [ ] **Verify**: Object pool reuses effects efficiently
- [ ] **Verify**: No infinite object creation

### 4.3 Effect Culling
- [ ] **Test**: Fire at targets beyond 5000 units distance
- [ ] **Expected**: Effects don't render at extreme distances
- [ ] **Test**: Move close to target and verify effects reappear
- [ ] **Expected**: Performance improves with culling active

### 4.4 Memory Management
- [ ] **Test**: Fire 100+ shots with different weapons
- [ ] **Expected**: Browser memory usage remains stable
- [ ] **Expected**: No console errors about disposed geometries
- [ ] **Expected**: Effects cleanup properly after completion

---

## 5. Integration Tests

### 5.1 Weapon Slot Integration
- [ ] **Test**: Effects work with all 4 weapon slots
- [ ] **Test**: Equipping different weapons updates effect types
- [ ] **Test**: Unequipping weapons disables effects for that slot
- [ ] **Test**: Weapon cooldowns don't interfere with effects

### 5.2 Ship Position Synchronization
- [ ] **Test**: Effects originate from correct ship position during movement
- [ ] **Test**: Effects track properly during ship rotation
- [ ] **Test**: Impulse movement doesn't break effect positioning
- [ ] **Test**: View changes (FWD/AFT) don't affect effect placement

### 5.3 Target Computer Integration
- [ ] **Test**: Enable target computer with `T` key
- [ ] **Test**: Fire at targeted objects
- [ ] **Expected**: Laser beams point toward selected target
- [ ] **Expected**: Explosions appear at target location
- [ ] **Test**: Target switching updates effect targeting

### 5.4 Card-Based Weapon System
- [ ] **Test**: Effects work with starter weapons
- [ ] **Test**: Upgrading weapon cards maintains effect functionality
- [ ] **Test**: Different weapon levels don't break effects
- [ ] **Test**: Card inventory changes update effects properly

---

## 6. Edge Case Tests

### 6.1 Rapid Fire Scenarios
- [ ] **Test**: Hold down multiple weapon keys simultaneously
- [ ] **Test**: Rapid key presses (weapon key mashing)
- [ ] **Expected**: No effect overlap issues
- [ ] **Expected**: No audio distortion or cutting out
- [ ] **Expected**: Performance remains stable

### 6.2 Maximum Range Testing
- [ ] **Test**: Fire at targets at maximum weapon range
- [ ] **Test**: Fire beyond maximum range
- [ ] **Expected**: Effects scale appropriately with distance
- [ ] **Expected**: No effects render beyond culling distance

### 6.3 Fallback Mode Testing
- [ ] **Test**: Disable THREE.js temporarily (console: `window.THREE = null`)
- [ ] **Test**: Reload page and verify fallback mode
- [ ] **Expected**: No infinite error loops
- [ ] **Expected**: Console shows "WeaponEffectsManager running in fallback mode"
- [ ] **Expected**: Weapons fire without visual effects but no crashes

### 6.4 Audio Context Edge Cases
- [ ] **Test**: Start game with muted browser tab
- [ ] **Test**: Switch tabs during weapons firing
- [ ] **Test**: Browser loses focus during combat
- [ ] **Expected**: Audio resumes correctly when focus returns

---

## 7. Tunable Parameters Tests

### 7.1 Effect Duration Modification
- [ ] **Test**: Modify `effectConfig.muzzleFlash.duration` in console
- [ ] **Test**: Modify `effectConfig.laserBeam.duration` in console
- [ ] **Expected**: Effects respect new duration settings
- [ ] **Method**: 
  ```javascript
  // In browser console
  starfieldManager.weaponEffectsManager.updateEffectConfig('muzzleFlash', {duration: 0.3});
  starfieldManager.weaponEffectsManager.updateEffectConfig('laserBeam', {duration: 1.5});
  ```

### 7.2 Performance Settings
- [ ] **Test**: Modify `maxEffectsPerType` setting
- [ ] **Test**: Modify `effectCullingDistance` setting
- [ ] **Expected**: Performance changes as expected
- [ ] **Method**:
  ```javascript
  // In browser console
  starfieldManager.weaponEffectsManager.maxEffectsPerType = 10;
  starfieldManager.weaponEffectsManager.effectCullingDistance = 2500;
  ```

### 7.3 Color Customization
- [ ] **Test**: Verify weapon colors can be modified via getWeaponColors()
- [ ] **Test**: Custom color changes reflect in effects
- [ ] **Expected**: Ship editor integration ready for color tuning

---

## 8. Cross-Browser Compatibility

### 8.1 Browser Testing Matrix
| Browser | Version | Visual Effects | Audio | Performance | Result |
|---------|---------|---------------|--------|-------------|---------|
| Chrome | Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox | Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Safari | Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Edge | Latest | ⬜ | ⬜ | ⬜ | ⬜ |

### 8.2 Mobile Testing (Optional)
- [ ] **Test**: Basic functionality on mobile Chrome
- [ ] **Test**: Touch controls for weapon firing
- [ ] **Expected**: Graceful degradation on lower-power devices

---

## 9. Regression Tests

### 9.1 Previous Functionality
- [ ] **Test**: Ship movement still works correctly
- [ ] **Test**: Target computer functions unchanged
- [ ] **Test**: Damage control systems unaffected
- [ ] **Test**: Card inventory system still functional
- [ ] **Test**: Audio systems for non-weapon sounds still work

### 9.2 Performance Baseline
- [ ] **Test**: Game loads in similar time as before effects
- [ ] **Test**: No new console errors introduced
- [ ] **Test**: Memory usage comparable to pre-effects implementation

---

## 10. User Experience Tests

### 10.1 Satisfaction Testing
- [ ] **Test**: Effects feel responsive and immediate
- [ ] **Test**: Visual feedback matches weapon firing
- [ ] **Test**: Audio enhances immersion
- [ ] **Test**: Effects don't distract from gameplay

### 10.2 Accessibility
- [ ] **Test**: Game playable with effects disabled
- [ ] **Test**: Audio can be muted without breaking functionality
- [ ] **Test**: Visual effects don't cause seizure-inducing flashes

---

## Bug Reporting Template

When issues are found, report using this format:

```markdown
**Bug Title**: [Brief description]
**Test Section**: [Which test section]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Browser**: [Browser and version]
**Console Errors**: [Any console errors]
**Screenshots**: [If applicable]
```

---

## Success Criteria

✅ **System is ready for production when:**
- [ ] All Basic Functionality tests pass
- [ ] All Visual Effects tests pass
- [ ] All Audio System tests pass
- [ ] Performance maintains 60fps under normal load
- [ ] No memory leaks detected
- [ ] All Integration tests pass
- [ ] Edge cases handled gracefully
- [ ] At least 2 browsers fully compatible

---

## Test Execution Notes

**Tester**: ________________
**Date**: ________________
**Game Version**: ________________
**Notes**: 
_Use this space for additional observations, performance notes, or suggestions for improvement._ 

## Manual Testing Steps

### Step 1: Launch Game and Setup
1. **Start Server**: Run `python3 run.py` from project root
2. **Open Browser**: Navigate to `http://localhost:5001`
3. **Wait for Load**: Ensure all systems initialize (check console for "WeaponEffectsManager initialized")
4. **Spawn Targets**: Press **Q key** to spawn 3 target dummy ships for testing
5. **Activate Systems**: Press `T` to enable Target Computer
6. **Cycle Targets**: Press `Tab` to select a target dummy ship

### Step 2: Basic Weapon Effects Testing 

## Quick Test Checklist ⚡

**Basic Functionality** (5 minutes):
- [ ] Launch game: `python3 run.py` → `http://localhost:5001`
- [ ] Press **Q** to spawn target dummy ships
- [ ] Press `T` to activate Target Computer  
- [ ] Press `Tab` to cycle targets
- [ ] Press `Space` to fire weapons and observe:
  - [ ] **Dual muzzle flashes** appear at actual **bottom screen corners**
  - [ ] **Dual laser beams** fire from **true bottom-left and bottom-right viewport corners**
  - [ ] **Camera-relative positioning** - beams move with view direction
  - [ ] **Laser beams** visible for ~0.8 seconds (cyan/green/etc.)
  - [ ] **Short laser audio** plays (first 0.3 seconds only)
  - [ ] **10km range** - beams extend further into space
  - [ ] **Smaller explosions** when hitting targets (50% smaller)
  - [ ] No console errors 