# Weapon Slot Mapping Fix

## Problem Description
Weapons were being placed in utility slots instead of weapon slots, triggering "WEAPON SLOT VIOLATION" errors. The logs showed:

```
Loaded pulse_cannon (Lv.1) from named slot weapon_2 to slot 7 (utility)
Loaded plasma_cannon (Lv.1) from named slot weapon_3 to slot 8 (utility)
❌ WEAPON SLOT VIOLATION: Cannot place weapon phaser_array - no weapon slots available
```

## Root Cause Analysis

### The Issue
The problem was in `CardInventoryUI.js` around line 1189. There were **multiple** `cardToSlotMapping` objects in the same file, and one of them was missing weapon type mappings.

### Multiple Mappings
The file contained several `cardToSlotMapping` objects:

1. **Line 1088-1099**: ✅ **Complete mapping** with all weapon types
2. **Line 1161-1168**: ✅ **Complete mapping** with all weapon types  
3. **Line 1189-1196**: ❌ **Incomplete mapping** - ONLY had `laser_cannon`
4. **Line 1405-1411**: ✅ **Complete mapping** with all weapon types

### The Problematic Mapping (Before Fix)
```javascript
// Line 1189-1196 - MISSING WEAPON TYPES
const cardToSlotMapping = {
    'impulse_engines': 'engines',
    'energy_reactor': 'reactor',
    'laser_cannon': 'weapons',        // ✅ Only this weapon was mapped
    'target_computer': 'utility',     // ❌ pulse_cannon missing
    'galactic_chart': 'utility',      // ❌ plasma_cannon missing
    'subspace_radio': 'utility',      // ❌ phaser_array missing
    'long_range_scanner': 'utility'
};
```

### Why Only laser_cannon Worked
- `laser_cannon` was correctly mapped to `'weapons'` → went to weapon slot
- `pulse_cannon`, `plasma_cannon`, `phaser_array` were **not in the mapping**
- When not in mapping, they defaulted to `'utility'` → went to utility slots
- When no utility slots available, `phaser_array` triggered the violation error

### The Fix (After Fix)
```javascript
// Line 1189-1196 - NOW COMPLETE
const cardToSlotMapping = {
    'impulse_engines': 'engines',
    'energy_reactor': 'reactor',
    'laser_cannon': 'weapons',        // ✅ Mapped to weapons
    'pulse_cannon': 'weapons',        // ✅ Added mapping
    'plasma_cannon': 'weapons',       // ✅ Added mapping  
    'phaser_array': 'weapons',        // ✅ Added mapping
    'target_computer': 'utility',
    'galactic_chart': 'utility',
    'subspace_radio': 'utility',
    'long_range_scanner': 'utility'
};
```

## Solution Applied

### Fix Method
Used a Python script (`fix_weapon_mapping.py`) to automatically find and fix the incomplete mapping:

```python
#!/usr/bin/env python3
import re

def fix_weapon_mapping():
    file_path = 'frontend/static/js/ui/CardInventoryUI.js'
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to find the problematic mapping
    pattern = r"(const cardToSlotMapping = \{[^}]*'laser_cannon': 'weapons',\s*'target_computer': 'utility',)"
    
    # Replacement with all weapon types
    replacement = r"""const cardToSlotMapping = {
                        'impulse_engines': 'engines',
                        'energy_reactor': 'reactor',
                        'laser_cannon': 'weapons',
                        'pulse_cannon': 'weapons',
                        'plasma_cannon': 'weapons',
                        'phaser_array': 'weapons',
                        'target_computer': 'utility',"""
    
    # Find and replace
    new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    # Write back if changed
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False
```

### Files Modified
- `frontend/static/js/ui/CardInventoryUI.js` - Fixed weapon mapping
- `fix_weapon_mapping.py` - Script used to apply the fix
- `clear_weapon_config.html` - Utility to clear cached configurations

## Expected Results After Fix

### Before Fix (Broken)
```
Loaded laser_cannon (Lv.1) from named slot weapon_1 to slot 2 (weapons)    ✅
Loaded pulse_cannon (Lv.1) from named slot weapon_2 to slot 7 (utility)    ❌
Loaded plasma_cannon (Lv.1) from named slot weapon_3 to slot 8 (utility)   ❌
❌ WEAPON SLOT VIOLATION: Cannot place weapon phaser_array - no weapon slots available
```

### After Fix (Working)
```
Loaded laser_cannon (Lv.1) from named slot weapon_1 to slot 2 (weapons)    ✅
Loaded pulse_cannon (Lv.1) from named slot weapon_2 to slot 3 (weapons)    ✅
Loaded plasma_cannon (Lv.1) from named slot weapon_3 to slot 4 (weapons)   ✅
Loaded phaser_array (Lv.1) from named slot weapon_4 to slot 5 (weapons)    ✅
```

## Testing

### Clear Cached Configuration
Since the game may have cached the broken configuration, use `clear_weapon_config.html`:

1. Open `http://localhost:8008/clear_weapon_config.html`
2. Click "Clear Starter Ship Only" or "Clear All Stored Configurations"
3. Restart the game

### Verification
Check the console logs when starting a new game:
- All weapons should load into weapon slots (not utility slots)
- No "WEAPON SLOT VIOLATION" errors should appear
- Weapons should respect cooldown restrictions

## Technical Details

### Why Multiple Mappings Exist
The `CardInventoryUI.js` file handles different loading scenarios:
1. **Default starter cards** (lines 1088-1099)
2. **Named slot loading** (lines 1161-1168 and 1189-1196)
3. **Ship configuration loading** (lines 1405-1411)

Each scenario needed its own mapping, but only one was incomplete.

### Slot Assignment Flow
1. **Parse starter cards** → Get card type (e.g., `pulse_cannon`)
2. **Look up in mapping** → `cardToSlotMapping[cardType]` → `'weapons'`
3. **Find weapon slot** → Search `slotTypeToIndex['weapons']` → [2, 3, 4, 5]
4. **Assign to slot** → First available weapon slot

### Ship Configuration
Starter ship has 4 weapon slots as configured in `ShipConfigs.js`:
```javascript
slotConfig: {
    engines: 1,    // slot 0
    reactor: 1,    // slot 1  
    weapons: 4,    // slots 2, 3, 4, 5
    utility: 3     // slots 6, 7, 8
}
```

This fix ensures all weapon types are correctly mapped to the available weapon slots. 