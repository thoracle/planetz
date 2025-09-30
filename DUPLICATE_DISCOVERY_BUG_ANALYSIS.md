# Duplicate Discovery Messages Bug - Analysis

**Date**: September 30, 2025  
**Branch**: achievements  
**Priority**: MEDIUM - Annoying UX bug, not game-breaking

---

## 🐛 **Bug Report**

**Symptom**: Ship's log shows multiple entries for the same object discovery:
```
📡 [2025.272.73] 🔍 DISCOVERY: Sol discovered!
📡 [2025.272.73] 🔍 DISCOVERY: Sol discovered!
📡 [2025.272.73] 🔍 DISCOVERY: Sol discovered!
📡 [2025.272.73] 🔍 DISCOVERY: Europa discovered!
📡 [2025.272.73] 🔍 DISCOVERY: Europa discovered!
```

---

## 🔬 **Root Cause Analysis**

### **Multiple Discovery Paths**

There are **3 different code paths** that can trigger discovery for the same object:

1. **Proximity Discovery** (`StarChartsManager.js`)
   - Proximity checking system discovers objects within radius
   - Called from game loop every 1 second

2. **Targeting Discovery** (`TargetComputerManager.js:2555`)
   ```javascript
   // DISCOVERY FIX: Auto-discover objects when they become the current target
   starChartsManager.addDiscoveredObject(objectId, 'targeting', 'player');
   ```

3. **Manual Discovery** (`StarChartsManager.js:817`)
   ```javascript
   processDiscovery(object) {
       this.showDiscoveryNotification(object, category);
       this.addDiscoveredObject(object.id);
   }
   ```

### **Why Duplicates Occur**

**Scenario 1: Game Startup**
- Multiple objects discovered via proximity at same time
- Target computer cycles through objects, triggering targeting discoveries
- Same timestamp = cooldown check fails
- Each discovery path calls `showDiscoveryNotification()` → `showHUDEphemeral()` → logs to ship's log

**Scenario 2: Rapid Target Cycling**
- User presses TAB rapidly
- Each target triggers auto-discovery via targeting path
- If object was just discovered via proximity, both fire simultaneously
- Both log to ship's log

**Scenario 3: Manual Discovery + Auto Discovery**
- `processDiscovery()` called manually
- Proximity system also detects object
- Both call `addDiscoveredObject()` → notification shown twice

---

## 🛡️ **Existing Prevention (Not Working)**

### **1. Discovery Duplicate Prevention** ✅ WORKING
```javascript
// StarChartsManager.js:1187-1193
if (!wasAlreadyDiscovered) {
    if (!this._discoveryInProgress) this._discoveryInProgress = new Set();
    if (this._discoveryInProgress.has(normalizedId)) {
        return; // ❌ This prevents duplicate discoveries
    }
}
```
**Status**: This WORKS - prevents duplicate discoveries in `discoveredObjects` Set

### **2. Notification Cooldown** ❌ NOT WORKING
```javascript
// StarChartsManager.js:868-870
if (lastNotification && (now - lastNotification) < 5000) {
    return; // Skip duplicate notification
}
```
**Status**: This FAILS when discoveries happen at exact same timestamp

### **3. Ephemeral HUD Logging** ❌ NO DUPLICATE PREVENTION
```javascript
// StarfieldManager.js:5332
window.shipLog.addEphemeralEntry(title, message);
```
**Status**: NO duplicate prevention at this level

---

## 💥 **The Actual Problem**

The 5-second cooldown check uses:
```javascript
const notificationKey = `${object.id}_${object.name}`;
const lastNotification = this._recentNotifications.get(notificationKey);

if (lastNotification && (now - lastNotification) < 5000) {
    return; // Skip
}
```

**But:**
- If discoveries trigger simultaneously (same `Date.now()`), the check is:
  - `(1234567890 - 1234567890) < 5000` = `0 < 5000` = **TRUE** ✅
  - But BOTH discoveries check at same timestamp before either sets the value!
  - Race condition: Both see `lastNotification = undefined`
  - Both pass the check and show notification

---

## ✅ **Solution**

### **Option 1: Synchronous Flag Check** (Recommended)
Add immediate flag before async notification:

```javascript
showDiscoveryNotification(object, category) {
    // DUPLICATE PREVENTION: Check if we've already shown notification for this object recently
    if (!this._recentNotifications) this._recentNotifications = new Map();
    const notificationKey = `${object.id}_${object.name}`;
    const now = Date.now();
    const lastNotification = this._recentNotifications.get(notificationKey);
    
    // IMMEDIATE FLAG SET - prevents race condition
    if (lastNotification && (now - lastNotification) < 5000) {
        debug('STAR_CHARTS', `⏭️ NOTIFICATION COOLDOWN: Skipping duplicate notification for ${object.name} (${now - lastNotification}ms ago)`);
        return;
    }
    
    // ✅ FIX: Set flag IMMEDIATELY before any async operations
    this._recentNotifications.set(notificationKey, now);
    
    // Rest of notification logic...
}
```

**Already implemented!** The flag is set at line 873, so this should work.

### **Option 2: Ship's Log Duplicate Prevention**
Add duplicate prevention at the ship's log level:

```javascript
// ShipLog.js
addEphemeralEntry(title, message) {
    if (!window.gameConfig?.verbose) {
        return;
    }
    
    // NEW: Prevent duplicate entries within short time window
    const entryKey = `${title}_${message}`;
    const now = Date.now();
    
    if (!this._recentEntries) this._recentEntries = new Map();
    const lastEntry = this._recentEntries.get(entryKey);
    
    if (lastEntry && (now - lastEntry) < 1000) { // 1 second cooldown
        return; // Skip duplicate
    }
    
    this._recentEntries.set(entryKey, now);
    
    const logMessage = title ? `${title}: ${message}` : message;
    this.addEntry('ephemeral', logMessage, title);
}
```

### **Option 3: Deduplicate at Display Time**
When showing ship's log, filter out consecutive duplicates.

---

## 🎯 **Recommended Fix**

**Implement Option 2** - Add duplicate prevention at ship's log level.

**Why:**
- Works regardless of notification source
- Simple, single-point fix
- Doesn't require tracking down all discovery paths
- Protects against future bugs

**Implementation**:
1. Add `_recentEntries` Map to ShipLog
2. Check for duplicates before adding entry
3. 1-second cooldown window (shorter than notification cooldown)
4. Cleanup old entries to prevent memory leak

---

## 📊 **Impact**

**Before Fix:**
- Annoying duplicate messages in ship's log
- Cluttered UI
- Hard to read actual discoveries

**After Fix:**
- Clean ship's log with single entry per discovery
- Better UX
- Professional appearance

---

## 🧪 **Testing**

Test scenarios:
1. **Game startup** - Multiple discoveries at once
2. **Rapid TAB cycling** - Quick target changes
3. **Proximity + Targeting** - Same object discovered via both paths
4. **Manual discovery** - Calling processDiscovery() directly

Expected result: Only ONE ship's log entry per object, regardless of discovery method.

---

**Status**: Ready for implementation
