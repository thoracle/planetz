# Diplomacy Logic Inconsistency - Analysis & Fix

**Date**: September 30, 2025  
**Branch**: achievements  
**Priority**: MEDIUM - Visual consistency issue

---

## 🐛 **Problem Statement**

Diplomacy/faction colors are **inconsistent** across different UI elements:
- HUD border
- Wireframe
- Direction arrows

**Expected Behavior**: All colors should be faction-based, with **one exception: Stars always show as neutral (yellow)**.

**Current Behavior**: Inconsistent special-case handling and different logic paths.

---

## 🔬 **Root Cause Analysis**

### **Three Different Color Determination Paths:**

#### **1. HUD Border Color** (`TargetComputerManager.js:3104-3131`)
```javascript
// Line 3116: Uses getTargetDiplomacy()
const diplomacy = isObjectDiscoveredForDiplomacy ? this.getTargetDiplomacy(currentTargetData) : 'unknown';

// Lines 3118-3129: Maps diplomacy to color
if (diplomacy === 'enemy') {
    diplomacyColor = '#ff3333'; // Enemy red
} else if (diplomacy === 'neutral') {
    diplomacyColor = '#ffff00'; // Neutral yellow
} else if (diplomacy === 'friendly') {
    diplomacyColor = '#00ff41'; // Friendly green
} else if (diplomacy === 'unknown') {
    diplomacyColor = '#44ffff'; // Unknown teal
} else if (info?.type === 'star') {
    diplomacyColor = '#ffff00'; // ❌ REDUNDANT: Stars handled AFTER diplomacy check
}
```
**Status**: ✅ Works (but redundant) - Star check happens after diplomacy mapping

#### **2. Wireframe Color** (`TargetComputerManager.js:2751-2793`)
```javascript
// Line 2751: Uses getTargetDiplomacy()
const diplomacy = this.getTargetDiplomacy(currentTargetData);

// Lines 2773-2793: Maps diplomacy to color
switch (diplomacy) {
    case 'enemy':
    case 'hostile':
        wireframeColor = 0xff3333; // Red for hostile
        break;
    case 'friendly':
    case 'ally':
        wireframeColor = 0x44ff44; // Green for friendly
        break;
    case 'neutral':
        wireframeColor = 0xffff44; // Yellow for neutral
        break;
    case 'unknown':
        wireframeColor = 0x44ffff; // Cyan for unknown
        break;
    default:
        wireframeColor = 0xffff44; // Yellow (neutral) as default
        break;
}
```
**Status**: ❌ **NO special case for stars** - Relies on `getTargetDiplomacy()` returning 'neutral'

#### **3. Direction Arrow Color** (`TargetComputerManager.js:4267-4286`)
```javascript
// Line 4278: Uses getTargetDiplomacy()
const diplomacy = this.getTargetDiplomacy(currentTargetData);

// Lines 4279-4285: Maps diplomacy to color
if (diplomacy === 'enemy') {
    arrowColor = '#ff3333';
} else if (diplomacy === 'friendly') {
    arrowColor = '#00ff41';
} else if (diplomacy === 'neutral') {
    arrowColor = '#ffff00';
}
```
**Status**: ❌ **NO special case for stars** - Relies on `getTargetDiplomacy()` returning 'neutral'

---

## 🎯 **The Core Issue: `getTargetDiplomacy()` Method**

### **Current Implementation** (`TargetComputerManager.js:2081-2138`)

```javascript
getTargetDiplomacy(targetData) {
    if (!targetData) {
        return 'unknown';
    }

    // DISCOVERY COLOR FIX: Check if object is discovered first
    const isDiscovered = targetData.isShip || this.isObjectDiscovered(targetData);
    
    if (!isDiscovered) {
        return 'unknown'; // Undiscovered objects
    }

    // For DISCOVERED objects, determine proper faction standing
    // 1. Direct diplomacy property
    if (targetData.diplomacy && targetData.diplomacy !== 'unknown') {
        return targetData.diplomacy;
    }

    // 2. Faction-based diplomacy
    if (targetData.faction) {
        const factionDiplomacy = this.getFactionDiplomacy(targetData.faction);
        if (factionDiplomacy && factionDiplomacy !== 'unknown') {
            return factionDiplomacy;
        }
    }

    // 3. Ship diplomacy
    if (targetData.ship?.diplomacy) {
        return targetData.ship.diplomacy;
    }

    // 4. Celestial body info diplomacy
    const info = this.solarSystemManager?.getCelestialBodyInfo(targetData.object || targetData);
    if (info?.diplomacy) {
        return info.diplomacy;
    }

    // 5. Default logic for discovered objects based on type
    if (targetData.type === 'station') {
        return 'neutral';
    }

    if (targetData.type === 'planet' || targetData.type === 'moon') {
        return 'neutral';
    }

    if (targetData.type === 'beacon' || targetData.type === 'navigation_beacon') {
        return 'neutral';
    }

    if (targetData.isShip) {
        return 'unknown'; // Ships need proper faction data
    }

    // Default for other discovered objects
    return 'neutral';
}
```

### **⚠️ MISSING: Special Case for Stars!**

There's **NO check for `targetData.type === 'star'`** to force 'neutral' regardless of faction!

---

## ❌ **Why This Causes Inconsistency**

### **Scenario 1: Star with Faction Data**
If a star has `targetData.faction = 'Some Faction'` set:

1. **HUD Border**: Shows yellow (line 3126 catches it)
2. **Wireframe**: Shows faction color! (no special case)
3. **Arrow**: Shows faction color! (no special case)

### **Scenario 2: Star with Direct Diplomacy Property**
If a star has `targetData.diplomacy = 'hostile'` set:

1. **HUD Border**: Shows yellow (line 3126 catches it)
2. **Wireframe**: Shows RED! (returns early at step 1)
3. **Arrow**: Shows RED! (returns early at step 1)

### **Scenario 3: Star with No Faction/Diplomacy**
If a star has neither faction nor diplomacy:

1. **HUD Border**: Shows yellow ✅
2. **Wireframe**: Shows yellow ✅ (hits default case)
3. **Arrow**: Shows yellow ✅ (hits default)

**Only Scenario 3 works consistently!**

---

## ✅ **The Solution**

Add special case for stars **at the beginning of `getTargetDiplomacy()`** to ensure stars ALWAYS return 'neutral' regardless of faction.

### **Fixed Implementation:**

```javascript
getTargetDiplomacy(targetData) {
    if (!targetData) {
        return 'unknown';
    }

    // SPECIAL CASE: Stars always show as neutral regardless of faction
    if (targetData.type === 'star') {
        return 'neutral';
    }

    // DISCOVERY COLOR FIX: Check if object is discovered first
    const isDiscovered = targetData.isShip || this.isObjectDiscovered(targetData);
    
    if (!isDiscovered) {
        return 'unknown'; // Undiscovered objects
    }

    // ... rest of existing logic unchanged ...
}
```

### **Benefits:**
✅ Single source of truth for diplomacy determination  
✅ Stars always neutral across ALL UI elements  
✅ Removes redundant star check in HUD border logic (line 3126-3127)  
✅ Consistent behavior across wireframe, HUD, and arrows  
✅ Follows "always faction-based except stars = neutral" rule  

---

## 🧹 **Additional Cleanup**

### **Remove Redundant Star Check in HUD Border Logic**

**Before** (lines 3126-3127):
```javascript
} else if (info?.type === 'star') {
    diplomacyColor = '#ffff00'; // Stars are neutral yellow
}
```

**After**: DELETE these lines (no longer needed!)

Now stars return 'neutral' from `getTargetDiplomacy()`, so they hit the `diplomacy === 'neutral'` case at line 3120.

---

## 📊 **Color Mapping Reference**

### **Diplomacy Status → Colors**

| Diplomacy Status | HUD Border | Wireframe (hex) | Arrow |
|-----------------|-----------|-----------------|-------|
| enemy/hostile   | #ff3333   | 0xff3333        | #ff3333 |
| neutral         | #ffff00   | 0xffff44        | #ffff00 |
| friendly        | #00ff41   | 0x44ff44        | #00ff41 |
| unknown         | #44ffff   | 0x44ffff        | #44ffff (default) |
| waypoint        | #ff00ff   | 0xff00ff        | #ff00ff |

### **Special Case:**
- **Stars**: Always 'neutral' → yellow (#ffff00 / 0xffff44)

---

## 🧪 **Testing Plan**

### **Test Case 1: Sol (Star)**
1. Target Sol
2. **Expected**: Yellow wireframe, yellow HUD border, yellow arrows (if off-screen)
3. **Verify**: Consistent yellow across all three UI elements

### **Test Case 2: Hostile Faction Planet**
1. Target planet with hostile faction
2. **Expected**: Red wireframe, red HUD border, red arrows
3. **Verify**: Consistent red across all three

### **Test Case 3: Neutral Station**
1. Target neutral station
2. **Expected**: Yellow wireframe, yellow HUD border, yellow arrows
3. **Verify**: Consistent yellow across all three

### **Test Case 4: Friendly Ship**
1. Target friendly ship
2. **Expected**: Green wireframe, green HUD border, green arrows
3. **Verify**: Consistent green across all three

### **Test Case 5: Undiscovered Object**
1. Target undiscovered planet
2. **Expected**: Cyan wireframe, cyan HUD border, cyan arrows
3. **Verify**: Consistent cyan across all three

---

## 📝 **Files to Modify**

1. **`TargetComputerManager.js`** (2 edits):
   - Add star special case at beginning of `getTargetDiplomacy()` (line ~2085)
   - Remove redundant star check from HUD border logic (line 3126-3127)

---

## 🎯 **Implementation Priority**

**Priority**: MEDIUM  
**Complexity**: LOW (simple fix)  
**Impact**: HIGH (visual consistency across all UI)  
**Risk**: LOW (single source of truth)

---

**Status**: Ready for implementation
