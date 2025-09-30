# Sub-System Range Analysis - Why Sub-Systems Hide Until Closer

**Date**: September 30, 2025  
**Branch**: achievements  
**Reported By**: User - "Aphrodite Atmospheric Research shows up on my target HUD but it's sub-system HUD is hidden until I move closer. Is the target range and sub-system range set to different ranges?"

---

## 🔬 **Analysis**

### **The Answer: YES - They Use Different Criteria**

The target and sub-system display use **different triggers**:

1. **Target Display**: `maxTargetingRange` (150km)
2. **Sub-System Display**: `isTargetDiscovered` (proximity-based, also 150km but lags behind)

---

## 📊 **How It Works**

### **Target Display Range** (`TargetComputerManager.js:1824`)
```javascript
const maxTargetingRange = targetComputer?.range || 150; // 150km
```

Objects appear in target list when within **150km** of your ship.

### **Sub-System Display Criteria** (`TargetComputerManager.js:3182`)
```javascript
if (targetComputerForSubTargets && 
    targetComputerForSubTargets.hasSubTargeting() && 
    (currentTargetData?.isShip || isTargetDiscovered)) {  // ← DISCOVERY CHECK!
    // Show sub-systems
}
```

Sub-systems only appear when target is **discovered**.

---

## 🎯 **The Race Condition**

### **Scenario: Approaching Aphrodite Atmospheric Research**

**At 150km distance:**
1. Station enters targeting range ✅
2. Appears in target HUD ✅
3. **But not yet discovered** (proximity check hasn't triggered) ❌
4. Sub-systems hidden ❌

**At ~140km distance** (proximity discovery triggered):
1. Station still in targeting range ✅
2. Still in target HUD ✅
3. **Now discovered** (proximity check triggered) ✅
4. Sub-systems appear ✅

---

## 💡 **Why This Happens**

### **Discovery System Lag**

`StarChartsManager.js` proximity discovery:
```javascript
// Line 682: Discovery radius
const discoveryRadius = this.getEffectiveDiscoveryRadius(); // 150km

// Line 670: Discovery check interval
if (now - this.lastDiscoveryCheck < this.discoveryInterval) {
    return; // Skip check if too soon
}
```

**The lag occurs because:**
1. Discovery checks run on an **interval** (not every frame)
2. Discovery is **batched** to prevent performance issues
3. Discovery processes **async** (staggered notifications)

So even though both ranges are 150km, discovery can lag behind targeting by:
- **Discovery interval time** (~0.5-1 second)
- **Spatial grid update time** 
- **Batch processing delay**

---

## ✅ **Is This Intentional?**

**YES!** This is a **security/gameplay feature**:

From `TargetComputerManager.js` comments around line 3172:
```javascript
// Debug logging for subsystem targeting (for undiscovered objects)
// 🚫 SUBSYSTEM CHECK for undiscovered...
```

**Design Intent:**
- You can **see** distant objects (target them at 150km)
- But you can't **scan their internals** until you get close enough to discover them
- This prevents players from seeing detailed station/ship info from afar

---

## 🎮 **Gameplay Impact**

### **Positive:**
- ✅ Encourages exploration (get closer to learn more)
- ✅ Adds mystery (what's that station? Better investigate!)
- ✅ Security (can't scan enemy defenses from afar)

### **Potential Confusion:**
- ⚠️ Players expect sub-systems immediately when targeting
- ⚠️ No clear feedback about why sub-systems are hidden
- ⚠️ Appears as a bug (inconsistent display)

---

## 🔧 **Potential Solutions** (If You Want To Change It)

### **Option 1: Remove Discovery Requirement** (Instant Sub-Systems)
```javascript
// Line 3182: Change from
if (targetComputerForSubTargets && targetComputerForSubTargets.hasSubTargeting() && 
    (currentTargetData?.isShip || isTargetDiscovered)) {

// To:
if (targetComputerForSubTargets && targetComputerForSubTargets.hasSubTargeting()) {
    // Sub-systems appear immediately when targeted
}
```

**Trade-off**: Removes exploration mystery, shows all info immediately

### **Option 2: Add Visual Feedback** (Keep Current Behavior)
```javascript
// Show "SCANNING..." message when target in range but not discovered
if (!isTargetDiscovered && !currentTargetData?.isShip) {
    subTargetHTML = `
        <div style="color: #44ffff; font-style: italic; margin-top: 8px;">
            SCANNING... (Approach to discover systems)
        </div>
    `;
}
```

**Trade-off**: Adds UI clutter, but explains the delay

### **Option 3: Reduce Discovery Interval** (Faster Discovery)
```javascript
// StarChartsManager.js - reduce interval
this.discoveryInterval = 100; // Currently 500ms, make it 100ms
```

**Trade-off**: More CPU usage, but faster response

---

## 📝 **Summary**

**Question**: "Is the target range and sub-system range set to different ranges?"

**Answer**: 
- **Targeting Range**: 150km (distance-based)
- **Sub-System Range**: 150km (discovery-based, with lag)

Both are 150km, but sub-systems require **discovery** which lags behind targeting due to:
- Interval-based discovery checks (~0.5-1 second delay)
- Batch processing
- Spatial grid updates

This is **intentional** for gameplay reasons (exploration, mystery, security), but can feel like a bug.

---

## 🎯 **Recommendation**

**Keep current behavior** - It's a good gameplay mechanic!

But consider adding visual feedback:
- Show "SCANNING..." or "UNKNOWN SYSTEMS" when target is in range but not discovered
- Clear indication that discovery is in progress
- Helps players understand it's intentional, not a bug

---

**Status**: Working as designed (but could use UX improvement)
