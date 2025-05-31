# Weapon Slot Enforcement Fix

## Problem Description
Weapons were being shown in utility slots in the ship upgrade shop UI instead of being restricted to weapon slots only. From the game logs:

```
Loaded pulse_cannon (Lv.1) from named slot weapon_2 to slot 7 (utility)
Loaded plasma_cannon (Lv.1) from named slot weapon_3 to slot 8 (utility)
```

This violated the game design principle that weapons should only be slotted into weapon slots.

## Root Cause Analysis

The issue was in the `CardInventoryUI.js` slot assignment logic, specifically in the `loadShipConfiguration()` method around lines 1100-1200. The code had fallback logic that would:

1. **First**: Try to place cards in their preferred slot type (weapons → weapon slots)
2. **Second**: If no preferred slots available, try utility slots  
3. **Third**: If no utility slots available, try ANY available slot

This fallback system meant weapons could end up in utility slots when weapon slots were full.

## Solution: Strict Slot Type Enforcement

### Changes Made

1. **Modified slot assignment logic** in `CardInventoryUI.js`:
   - **Removed utility slot fallback for weapons**: Weapons can NO LONGER fall back to utility slots
   - **Removed "any available slot" fallback for weapons**: Weapons must go in weapon slots only
   - **Added weapon detection**: Created `isWeaponCard()` method to identify weapon card types
   - **Enhanced error handling**: Clear error messages when weapon slot placement fails

2. **Updated three key methods**:
   - `loadShipConfiguration()` (lines ~1100-1200)
   - `loadCurrentShipConfiguration()` (lines ~1430-1490)  
   - Both default starter card loading and stored configuration loading

### Code Changes

#### Before (Problem):
```javascript
// If no preferred slot available, find any utility slot
if (targetSlotIndex === null && slotTypeToIndex['utility']) {
    for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
        if (!this.shipSlots.has(slotIndex.toString())) {
            targetSlotIndex = slotIndex;
            break;
        }
    }
}

// If still no slot found, try ANY available slot
if (targetSlotIndex === null) {
    for (let i = 0; i < shipConfig.systemSlots; i++) {
        if (!this.shipSlots.has(i.toString())) {
            targetSlotIndex = i;
            console.warn(`Using any available slot ${i} for ${cardType}`);
            break;
        }
    }
}
```

#### After (Solution):
```javascript
// For weapons, only allow weapon slots - NO FALLBACK to utility
if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
    console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
    return; // Skip this weapon instead of placing it in wrong slot type
}

// For non-weapons, allow fallback to utility slots
if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
    for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
        if (!this.shipSlots.has(slotIndex.toString())) {
            targetSlotIndex = slotIndex;
            break;
        }
    }
}

// REMOVED: No more fallback to ANY available slot for weapons
```

#### New Helper Method:
```javascript
isWeaponCard(cardType) {
    const weaponCards = ['laser_cannon', 'pulse_cannon', 'plasma_cannon', 'phaser_array', 'disruptor_cannon', 'particle_beam', 'ion_storm_cannon', 'graviton_beam', 'quantum_torpedo', 'singularity_launcher', 'void_ripper'];
    return weaponCards.includes(cardType);
}
```

## Validation

### Drag & Drop System
The existing drag and drop system was already correctly enforcing slot restrictions via the `isCardCompatibleWithSlot()` method:

```javascript
// Weapon slot cards - ONLY weapon slots
'laser_cannon': ['weapons'],
'pulse_cannon': ['weapons'], 
'plasma_cannon': ['weapons'],
'phaser_array': ['weapons'],
```

### Ship Configuration
All ships now properly respect the 4-weapon-slot maximum:
- **Starter Ship**: 4 weapon slots (for testing)
- **Heavy Fighter**: 4 weapon slots (maximum combat)
- **Light Fighter**: 3 weapon slots  
- **Scout**: 2 weapon slots (reconnaissance focus)
- **Light Freighter**: 2 weapon slots (moderate defense)
- **Heavy Freighter**: 1 weapon slot (minimal weapons, cargo focus)

## Expected Behavior After Fix

1. **✅ Weapons ONLY in weapon slots**: No weapons will appear in utility slots
2. **✅ Graceful handling**: If no weapon slots available, weapons are skipped with clear error message
3. **✅ Non-weapons still flexible**: Other card types can still use utility slots as fallback
4. **✅ Drag & drop enforcement**: Players cannot manually drag weapons to utility slots
5. **✅ Consistent ship layouts**: All ships respect their weapon slot limits

## Testing

- **Test pages created**:
  - `test_weapon_slot_enforcement.html` - Visual slot assignment test
  - `clear_stored_configs.html` - Clear invalid stored configurations
  
- **Manual testing**: Visit ship upgrade shop and confirm weapons only appear in weapon slots

## Migration Strategy

1. Clear stored configurations that may have weapons in wrong slots
2. Restart game to load clean starter ship configuration
3. Weapons will now be properly placed only in weapon slots
4. Players can manually rearrange weapons between weapon slots but cannot place them in utility slots

This fix ensures strict adherence to the game's slot type system while maintaining flexibility for non-weapon cards. 