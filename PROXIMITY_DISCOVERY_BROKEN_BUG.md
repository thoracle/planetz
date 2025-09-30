# Proximity Discovery Broken for Planets/Moons - Bug Analysis & Fix

**Date**: September 30, 2025  
**Branch**: achievements  
**Priority**: CRITICAL - Discovery system completely broken  
**Reported By**: User - "fly right up to some objects (planets or moons) and they never trigger the state change to be discovered"

---

## 🐛 **Problem Statement**

Flying within 150km of planets and moons does NOT trigger discovery, even when directly next to them.

**Expected**: Objects within 150km discovery radius should be discovered via proximity check  
**Actual**: Planets/moons never discovered via proximity

---

## 🔬 **Root Cause Analysis**

### **The Spatial Grid Building Flow** (`StarChartsManager.js:450-530`)

```javascript
// Line 466-477: Create object entries from celestial bodies
for (const [key, body] of celestialBodies.entries()) {
    const info = this.solarSystemManager.getCelestialBodyInfo(body);
    if (info && body.position) {
        const objectEntry = {
            id: `${this._currentSector}_${key}`,  // e.g. "A0_planet_0"
            name: info.name,                        // e.g. "Terra Prime"
            type: info.type,                        // e.g. "planet"
            position: body.position,                // THREE.Vector3
            cartesianPosition: [body.position.x, body.position.y, body.position.z] // ✅ VALID!
        };
        allObjects.push(objectEntry);
    }
}

// Line 495-530: Process objects for spatial grid
validObjects.forEach((obj, index) => {
    if (obj && obj.position) {
        // ❌ BUG: Call getScenePosition() AFTER cartesianPosition already set!
        const scenePosition3D = this.getScenePosition(obj);  // Line 498
        
        // ❌ CRITICAL BUG: Skip object if getScenePosition fails!
        if (!scenePosition3D) {
            debug('STAR_CHARTS', `❌ SKIPPING ${obj.id || obj.name} - no valid scene position found`);
            skippedCount++;
            return; // ❌ OBJECT NEVER ADDED TO SPATIAL GRID!
        }
        
        // Line 512: Overwrite the already-valid cartesianPosition
        obj.cartesianPosition = position3D;  // Unnecessary!
        
        // Line 522: Add to spatial grid
        this.spatialGrid.get(gridKey).push(obj);
    }
});
```

### **The Problem**

1. **Line 475**: `cartesianPosition` is set to a VALID position from `body.position` ✅
2. **Line 498**: `getScenePosition(obj)` is called ❌
3. **Line 500-505**: If `getScenePosition()` returns null, **SKIP THE OBJECT** ❌
4. **Result**: Object NEVER added to spatial grid → NEVER discovered!

### **Why `getScenePosition()` Fails**

Looking at `getScenePosition()` (lines 273-370):

```javascript
getScenePosition(obj) {
    // ...
    
    // For planets: A0_planet_0
    if (obj.id.startsWith('A0_') && obj.type === 'planet') {
        for (const [key, celestialBody] of this.solarSystemManager.celestialBodies.entries()) {
            if (key.startsWith('planet_') && celestialBody.name === obj.name) {  // ← Name match!
                return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
            }
        }
    }
    // ...
    return null; // ❌ FAILS if name doesn't match!
}
```

**The issue**: 
- `obj.id` = `"A0_planet_0"` (created from `key` = `"planet_0"`)
- `obj.name` = from `info.name`
- Searches celestialBodies for entry where `key.startsWith('planet_')` AND `name === obj.name`
- **BUT** the search is redundant because we already HAVE the position from line 475!

---

## 💡 **Why This is Completely Redundant**

The spatial grid building code at line 466-477 ALREADY iterates through `celestialBodies`:

```javascript
for (const [key, body] of celestialBodies.entries()) {  // ← WE ALREADY HAVE body!
    const info = this.solarSystemManager.getCelestialBodyInfo(body);
    if (info && body.position) {  // ← WE ALREADY HAVE position!
        const objectEntry = {
            cartesianPosition: [body.position.x, body.position.y, body.position.z]  // ← VALID!
        };
    }
}
```

Then later, we call `getScenePosition(obj)` to... find the SAME `body` and get the SAME `position`!

**This is completely redundant!**

---

## ✅ **The Fix**

The `cartesianPosition` is **ALREADY VALID** from line 475. We don't need to call `getScenePosition()` at all!

**Option 1: Skip the redundant check** (RECOMMENDED)

```javascript
validObjects.forEach((obj, index) => {
    if (obj && obj.position && obj.cartesianPosition) {  // ✅ Check if cartesianPosition exists
        const position3D = obj.cartesianPosition;  // ✅ Use already-set position
        
        const gridKey = this.getGridKey(position3D);
        
        if (!this.spatialGrid.has(gridKey)) {
            this.spatialGrid.set(gridKey, []);
        }
        
        this.spatialGrid.get(gridKey).push(obj);
        processedCount++;
    } else {
        debug('STAR_CHARTS', `❌ SKIPPING ${obj.id || obj.name} - no valid position`);
        skippedCount++;
    }
});
```

**Option 2: Keep getScenePosition() as fallback**

```javascript
validObjects.forEach((obj, index) => {
    if (obj && obj.position) {
        // Try to get scene position, but FALLBACK to already-set cartesianPosition
        const scenePosition3D = this.getScenePosition(obj) || obj.cartesianPosition;
        
        if (!scenePosition3D) {
            debug('STAR_CHARTS', `❌ SKIPPING ${obj.id || obj.name} - no valid position`);
            skippedCount++;
            return;
        }
        
        obj.cartesianPosition = scenePosition3D;
        
        // ... rest of code ...
    }
});
```

**Recommendation**: Use Option 1 since `getScenePosition()` is completely redundant in this context.

---

## 📊 **Before vs After**

### **Before (BROKEN):**
```
1. Create objectEntry with cartesianPosition = [body.x, body.y, body.z] ✅
2. Call getScenePosition(objectEntry)
3. getScenePosition searches for body by name matching
4. Name doesn't match exactly → returns null ❌
5. Skip object (don't add to spatial grid) ❌
6. Object NEVER discovered ❌
```

### **After (FIXED):**
```
1. Create objectEntry with cartesianPosition = [body.x, body.y, body.z] ✅
2. Use already-set cartesianPosition directly ✅
3. Add to spatial grid ✅
4. Proximity detection works ✅
5. Object discovered when player flies within 150km ✅
```

---

## 🧪 **Testing Plan**

### **Test Case 1: Proximity Discovery**
```
1. Warp to Sol system
2. Fly toward Terra Prime (planet)
3. Expected: Discovery notification when within 150km
4. Verify: Planet appears in discovered list
```

### **Test Case 2: Moon Discovery**
```
1. Fly toward Luna (moon)
2. Expected: Discovery notification when within 150km
3. Verify: Moon appears in discovered list
```

### **Test Case 3: Multiple Objects**
```
1. Fly through system
2. Expected: All objects within 150km are discovered
3. Verify: No objects are skipped
```

### **Test Case 4: Spatial Grid Integrity**
```
1. Check console for "❌ SKIPPING" messages
2. Expected: No objects skipped
3. Verify: skippedCount = 0, processedCount = all objects
```

---

## 📝 **Files to Modify**

1. **`StarChartsManager.js`** (1 edit):
   - Fix spatial grid building logic (lines ~495-530)
   - Remove redundant `getScenePosition()` call
   - Use already-set `cartesianPosition` directly

---

## 🎯 **Impact**

**Priority**: CRITICAL  
**Complexity**: LOW (remove redundant code)  
**Impact**: CRITICAL (fixes broken proximity discovery)  
**Risk**: VERY LOW (simplifies code, removes redundancy)

---

## 🔍 **Why This Wasn't Caught Earlier**

1. **Test Mode**: Auto-discovers all objects, bypassing proximity system
2. **Manual Discovery**: Targeting objects still works
3. **Silent Failure**: Objects skipped without obvious error (just debug log)
4. **Redundant Code**: getScenePosition() appeared intentional

---

**Status**: Ready for implementation
