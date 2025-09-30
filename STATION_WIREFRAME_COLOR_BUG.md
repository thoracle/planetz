# Station Wireframe Color Bug - Analysis & Fix

**Date**: September 30, 2025  
**Branch**: achievements  
**Priority**: HIGH - Visual consistency bug  
**Reported By**: User observation

---

## 🐛 **Problem Statement**

Station wireframes show **yellow (neutral)** while HUD border and direction arrows show **green (friendly)**.

**Expected**: All UI elements (wireframe, HUD, arrows) show same faction-based color  
**Actual**: Wireframe ignores station faction, defaults to yellow

---

## 🔬 **Root Cause Analysis**

### **The Data Flow**

**1. Station Creation** (`SolarSystemManager.js:864`)
```javascript
// Stations have faction data in userData
station.userData = {
    name: 'Europa Research Station',
    faction: 'Terran Republic Alliance',  // ✅ Faction data exists!
    type: 'station',
    canDock: true
};
```

**2. Getting Station Info** (`SolarSystemManager.js:858-869`)
```javascript
getCelestialBodyInfo(body) {
    if (key.startsWith('station_')) {
        if (body && body.userData) {
            return {
                name: body.userData.name || 'Unknown Station',
                type: 'station',
                faction: body.userData.faction || 'Unknown',  // ✅ Returns faction
                diplomacy: body.userData.diplomacy,           // Usually undefined
                // ...
            };
        }
    }
}
```

**3. Getting Diplomacy** (`TargetComputerManager.js:2097-2150`)
```javascript
getTargetDiplomacy(targetData) {
    // ... discovery check ...
    
    // 1. Check targetData.diplomacy (usually undefined for stations) ❌
    if (targetData.diplomacy && targetData.diplomacy !== 'unknown') {
        return targetData.diplomacy;
    }

    // 2. Check targetData.faction (usually undefined - not populated!) ❌
    if (targetData.faction) {
        const factionDiplomacy = this.getFactionDiplomacy(targetData.faction);
        if (factionDiplomacy && factionDiplomacy !== 'unknown') {
            return factionDiplomacy;
        }
    }

    // 3. Ship diplomacy (N/A for stations) ❌
    if (targetData.ship?.diplomacy) {
        return targetData.ship.diplomacy;
    }

    // 4. Celestial body info diplomacy
    const info = this.solarSystemManager?.getCelestialBodyInfo(targetData.object || targetData);
    if (info?.diplomacy) {  // ❌ CHECKS diplomacy, but info has faction!
        return info.diplomacy;
    }

    // 5. TYPE-BASED DEFAULTS
    if (targetData.type === 'station') {
        return 'neutral'; // ⚠️ BUG: Returns neutral WITHOUT checking info.faction!
    }
    
    // ...
}
```

### **The Problem**

At step 4, we check `info.diplomacy`, but `getCelestialBodyInfo()` returns `info.faction` for stations, NOT `info.diplomacy`!

Then at step 5, we hit the type-based default: `if (type === 'station') return 'neutral'` BEFORE checking `info.faction`.

---

## 🎯 **Why HUD Shows Green but Wireframe Shows Yellow**

### **HUD Color Logic** (`TargetComputerManager.js:3122`)
```javascript
const diplomacy = this.getTargetDiplomacy(currentTargetData);
// For 'Europa Research Station' with faction 'Terran Republic Alliance':
// ✅ Returns 'neutral' (WRONG, but let's trace further...)
```

Wait, this should also be broken! Let me check if there's another code path...

**Actually**, the issue is more subtle. The HUD might be getting faction data from a DIFFERENT source! Let me check `updateTargetDisplay()` more carefully.

---

## 🔍 **Deeper Investigation**

The key is: **WHERE does the HUD get its faction data?**

Looking at `updateTargetDisplay()` around line 3100-3130:
- It calls `this.getTargetDiplomacy(currentTargetData)` 
- BUT it also has access to `info` object (enhanced target info)
- The `info` might have faction data that's being used

**Wait!** Let me check if there's a different code path for the HUD vs wireframe...

Actually, looking at the code flow:
1. **Wireframe** is created in `createTargetWireframe()` (line ~2751)
2. **HUD border** is set in `updateTargetDisplay()` (line ~3122)

Both call `getTargetDiplomacy()`, so they SHOULD return the same value!

Unless... the `currentTargetData` is different between the two calls!

---

## 💡 **The Real Issue**

The problem is in `getTargetDiplomacy()` step 4-5:

**Current Code:**
```javascript
// 4. Celestial body info diplomacy (for planets, stations, etc.)
const info = this.solarSystemManager?.getCelestialBodyInfo(targetData.object || targetData);
if (info?.diplomacy) {
    return info.diplomacy;  // ❌ Checks diplomacy only
}

// 5. Default logic for discovered objects based on type
if (targetData.type === 'station') {
    return 'neutral';  // ❌ IGNORES info.faction!
}
```

**Problem**: 
- We get `info` which has `{faction: 'Terran Republic Alliance', diplomacy: undefined}`
- We check `info.diplomacy` (undefined) → skip
- We hit type default → return 'neutral' → **IGNORES the faction!**

---

## ✅ **The Solution**

Add `info.faction` check BEFORE the type-based defaults:

```javascript
// 4. Celestial body info diplomacy (for planets, stations, etc.)
const info = this.solarSystemManager?.getCelestialBodyInfo(targetData.object || targetData);
if (info?.diplomacy) {
    return info.diplomacy;
}

// 4.5. Celestial body faction (especially important for stations!)
if (info?.faction) {
    const factionDiplomacy = this.getFactionDiplomacy(info.faction);
    if (factionDiplomacy && factionDiplomacy !== 'unknown') {
        debug('TARGETING', `Using faction diplomacy from celestial body info: ${info.faction} → ${factionDiplomacy}`);
        return factionDiplomacy;
    }
}

// 5. Default logic for discovered objects based on type
if (targetData.type === 'station') {
    return 'neutral'; // Only use this if no faction was found above
}
```

This way:
1. Check `info.diplomacy` first (explicit diplomacy property)
2. Check `info.faction` second (convert faction to diplomacy)
3. Only fall back to type-based 'neutral' if both are missing

---

## 📊 **Before vs After**

### **Station: Europa Research Station**
**Faction**: `'Terran Republic Alliance'`

#### **Before (BROKEN):**
```
1. targetData.diplomacy? → undefined ❌
2. targetData.faction? → undefined ❌  
3. info.diplomacy? → undefined ❌
4. type === 'station'? → return 'neutral' ✅ (WRONG!)

Result: Yellow wireframe (neutral)
```

#### **After (FIXED):**
```
1. targetData.diplomacy? → undefined ❌
2. targetData.faction? → undefined ❌
3. info.diplomacy? → undefined ❌
4. info.faction? → 'Terran Republic Alliance' ✅
   getFactionDiplomacy('Terran Republic Alliance') → 'friendly' ✅
   return 'friendly'

Result: Green wireframe (friendly) ✅
```

---

## 🧪 **Testing Plan**

### **Test Case 1: Friendly Station**
```
Station: Europa Research Station
Faction: Terran Republic Alliance
Expected: Green wireframe, green HUD, green arrows
```

### **Test Case 2: Neutral Station**
```
Station: Free Trader Hub
Faction: Free Trader Consortium
Expected: Yellow wireframe, yellow HUD, yellow arrows
```

### **Test Case 3: Enemy Station**
```
Station: Raider Outpost
Faction: Crimson Raider Clans
Expected: Red wireframe, red HUD, red arrows
```

### **Test Case 4: Station with No Faction**
```
Station: Ancient Derelict
Faction: undefined
Expected: Yellow wireframe (neutral default), consistent across all UI
```

---

## 📝 **Files to Modify**

1. **`TargetComputerManager.js`** (1 edit):
   - Add `info.faction` check between step 4 and step 5 of `getTargetDiplomacy()`
   - Lines ~2130-2138

---

## 🎯 **Impact**

**Priority**: HIGH  
**Complexity**: LOW (simple addition)  
**Impact**: HIGH (fixes major visual inconsistency)  
**Risk**: VERY LOW (adds check before fallback)

---

**Status**: Ready for implementation
