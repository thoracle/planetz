# Station Wireframe Race Condition - Analysis & Fix

**Date**: September 30, 2025  
**Branch**: achievements  
**Priority**: HIGH - Visual inconsistency  
**Reported By**: User - "Calisto defense platform shows up with green faction but yellow wireframe. If I tab away and then shift tab back to it then it shows wireframe correctly"

---

## 🐛 **Problem Statement**

Station wireframes show **yellow (neutral)** on initial targeting, but **green (friendly)** after cycling away and back.

**Key Clue**: "shows up with green faction but yellow wireframe" → HUD shows correct faction, wireframe doesn't
**Key Clue**: "if I tab away and then shift tab back" → Cycling fixes it

---

## 🔬 **Root Cause Analysis**

### **The Race Condition**

**Step 1: Target List Building** (`refreshTargetList()` - lines 1850-1897)
```javascript
// Line 1863: Check if discovered
const isDiscovered = this.isObjectDiscovered({id: targetId, name: info.name, type: info.type});

// Lines 1883-1897: Include faction ONLY if discovered
if (isDiscovered) {
    return {
        ...baseTarget,
        ...info, // ✅ Includes faction: "Terran Republic Alliance"
        discovered: true
    };
} else {
    return {
        ...baseTarget,
        diplomacy: 'unknown',       // ❌ Missing faction data!
        faction: 'Unknown',          // ❌ Wrong faction!
        discovered: false
    };
}
```

**Step 2: Initial Wireframe Creation** (`createTargetWireframe()` - line 2733)
```javascript
const currentTargetData = this.getCurrentTargetData();
// → Returns data from target list built in Step 1

// Line 2777: Get diplomacy
const diplomacy = this.getTargetDiplomacy(currentTargetData);
// → currentTargetData.faction = 'Unknown' (from target list)
// → getTargetDiplomacy() checks currentTargetData.faction first
// → Returns 'neutral' because faction = 'Unknown'
```

**Step 3: After TAB Cycling** (`cycleTarget()` + wireframe recreation)
```javascript
// Target list gets refreshed
// Station is now discovered (proximity discovery kicked in)
// Target data now has: faction: "Terran Republic Alliance"

// Wireframe recreated with correct faction data
// → diplomacy = 'friendly'
// → wireframe color = green ✅
```

---

## 💡 **Why This Happens**

1. **Target list is built early**, before proximity discovery completes
2. **Station shows as undiscovered** in initial target list
3. **Faction data is stripped** (set to 'Unknown') for undiscovered objects
4. **Wireframe uses stale data** from target list
5. **But HUD enriches data** from `getCelestialBodyInfo()` (our step 4.5 fix!)
6. **After cycling**, target list refreshes with discovered=true, faction data included
7. **Wireframe now correct** with enriched data

---

## ✅ **The Solution**

**Option 1: Enrich currentTargetData in wireframe creation** (RECOMMENDED)

Before calling `getTargetDiplomacy()`, enrich the target data from `getCelestialBodyInfo()`:

```javascript
// In createTargetWireframe() - around line 2773
const currentTargetData = this.getCurrentTargetData();

// ENRICHMENT FIX: If currentTargetData lacks faction, get it from getCelestialBodyInfo
if (!currentTargetData.faction || currentTargetData.faction === 'Unknown') {
    const info = this.solarSystemManager?.getCelestialBodyInfo(targetObject);
    if (info?.faction) {
        currentTargetData.faction = info.faction;
    }
    if (info?.diplomacy) {
        currentTargetData.diplomacy = info.diplomacy;
    }
}

const diplomacy = this.getTargetDiplomacy(currentTargetData);
```

**Option 2: Always check getCelestialBodyInfo in getTargetDiplomacy** (ALTERNATIVE)

Our step 4.5 fix already does this! But it checks `info?.faction` AFTER checking `targetData.faction`.

The issue is that `targetData.faction = 'Unknown'` (string), so step 2 in `getTargetDiplomacy()` tries:
```javascript
if (targetData.faction) {  // 'Unknown' is truthy!
    const factionDiplomacy = this.getFactionDiplomacy(targetData.faction); 
    // getFactionDiplomacy('Unknown') → logs warning, returns 'neutral'
}
```

So we need to skip step 2 if `targetData.faction === 'Unknown'`:

```javascript
// In getTargetDiplomacy() - around line 2117
// 2. Faction-based diplomacy
if (targetData.faction && targetData.faction !== 'Unknown') {  // ✅ Skip 'Unknown'
    const factionDiplomacy = this.getFactionDiplomacy(targetData.faction);
    if (factionDiplomacy && factionDiplomacy !== 'unknown') {
        return factionDiplomacy;
    }
}
```

---

## 📊 **Before vs After**

### **Before (BROKEN):**
```
1. Build target list → station undiscovered → faction: 'Unknown'
2. Create wireframe → getTargetDiplomacy(data with faction='Unknown')
3. getFactionDiplomacy('Unknown') → logs warning → 'neutral'
4. Wireframe color = yellow ❌

After TAB:
1. Refresh target list → station discovered → faction: 'Terran Republic Alliance'
2. Create wireframe → getTargetDiplomacy(data with faction='TRA')
3. getFactionDiplomacy('TRA') → 'friendly'
4. Wireframe color = green ✅
```

### **After (FIXED):**
```
1. Build target list → station undiscovered → faction: 'Unknown'
2. Create wireframe → getTargetDiplomacy(data with faction='Unknown')
3. Skip faction='Unknown' check
4. Fall through to step 4.5: getCelestialBodyInfo()
5. info.faction = 'Terran Republic Alliance'
6. getFactionDiplomacy('TRA') → 'friendly'
7. Wireframe color = green ✅ (first time!)
```

---

## 🧪 **Testing Plan**

### **Test Case 1: Fresh Station Discovery**
```
1. Warp to system
2. Immediately target Calisto Defense Platform (before proximity discovery)
3. Expected: Green wireframe (friendly) - FIRST TIME
4. Verify: No yellow wireframe flash
```

### **Test Case 2: After Cycling**
```
1. Target station
2. TAB away to another object
3. SHIFT+TAB back to station
4. Expected: Still green wireframe
5. Verify: Consistent color
```

---

## 📝 **Files to Modify**

1. **`TargetComputerManager.js`** (1 edit):
   - Fix `getTargetDiplomacy()` to skip `faction === 'Unknown'` check
   - Line ~2117: Add `&& targetData.faction !== 'Unknown'`

---

## 🎯 **Impact**

**Priority**: HIGH  
**Complexity**: TRIVIAL (one-line change)  
**Impact**: HIGH (fixes visual inconsistency)  
**Risk**: VERY LOW (just skips invalid faction value)

---

**Status**: Ready for implementation
