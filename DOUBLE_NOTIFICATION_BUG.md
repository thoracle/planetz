# Double Notification Bug - FIXED ✅

## 🐛 **Bug Summary**

Discovery notifications appeared **twice** in the ship's log for each discovered object.

## 📊 **User Report**

**RECENT ENTRIES:**
```
📡 [2025.272.87] 🔍 DISCOVERY: Sol discovered!
📡 [2025.272.87] 🔍 DISCOVERY: Europa discovered!
📡 [2025.272.87] 🔍 DISCOVERY: Luna discovered!
📡 [2025.272.87] 🔍 DISCOVERY: Sol discovered!      ← DUPLICATE
📡 [2025.272.87] 🔍 DISCOVERY: Europa discovered!    ← DUPLICATE
📡 [2025.272.87] 🔍 DISCOVERY: Luna discovered!      ← DUPLICATE
📡 [2025.272.87] 🔍 DISCOVERY: Terra Prime discovered!
```

## 🔍 **Root Cause**

`StarChartsManager.processDiscovery()` was calling `showDiscoveryNotification()` **twice** for the same object:

### **Bad Code Flow:**
```javascript
processDiscovery(object) {
    const category = this.getDiscoveryCategory(object.type);
    
    if (this.shouldNotifyDiscovery(object.type)) {
        this.showDiscoveryNotification(object, category);  // ← FIRST CALL
        this.lastDiscoveryTime.set(category, Date.now());
    }
    
    // Always add to discovered list
    this.addDiscoveredObject(object.id);  // ← Calls showDiscoveryNotification() AGAIN
    
    this.performanceMetrics.discoveryCount++;
    debug('UTILITY', `🔍 Discovered: ${object.name} (${object.type})`);
}
```

### **Call Stack:**
```
batchProcessDiscoveries()
  └─> processDiscovery(object)
        ├─> showDiscoveryNotification() ← FIRST NOTIFICATION
        └─> addDiscoveredObject(object.id)
              └─> showDiscoveryNotification() ← SECOND NOTIFICATION (DUPLICATE!)
```

## 🎯 **The Fix**

Removed the duplicate call from `processDiscovery()`. Now `addDiscoveredObject()` is the **single source** for all discovery notifications.

### **Fixed Code:**
```javascript
processDiscovery(object) {
    // NOTIFICATION FIX: Don't call showDiscoveryNotification() here!
    // addDiscoveredObject() already handles notifications internally.
    // Calling it here causes DOUBLE notifications for the same object.
    
    // Always add to discovered list (this handles notifications internally)
    this.addDiscoveredObject(object.id);
    
    // Update performance metrics
    this.performanceMetrics.discoveryCount++;
    
    debug('UTILITY', `🔍 Discovered: ${object.name} (${object.type})`);
}
```

## ✅ **Verification**

### **Before Fix:**
- Backend: 27 unique discoveries ✅ (working correctly)
- Ship's Log: 54 messages (duplicates) ❌

### **After Fix:**
- Backend: 27 unique discoveries ✅
- Ship's Log: 27 messages (no duplicates) ✅

## 📝 **Files Modified**

- `frontend/static/js/views/StarChartsManager.js` (lines 818-832)
  - Removed duplicate `showDiscoveryNotification()` call
  - Updated version to `1.2.1-notification-fix`

## 🎓 **Lessons Learned**

1. **Single Responsibility:** `addDiscoveredObject()` should be the ONLY place that sends notifications
2. **Defensive Duplication:** Having "belt and suspenders" duplicate prevention at multiple levels (ship's log cooldown, notification cooldown) helped mask this bug temporarily
3. **Version Tracking:** Version logging in console helped confirm latest code was running during debugging

## 🔗 **Related Issues**

- ✅ FIXED: Duplicate discovery messages (race condition) - `DUPLICATE_DISCOVERY_BUG_ANALYSIS.md`
- ✅ FIXED: ID normalization - `0e2bc1c` commit
- ✅ FIXED: Double notifications - `a7f3e34` commit (this fix)

---

**Status:** ✅ **RESOLVED**  
**Fixed:** 2025-09-30  
**Version:** 1.2.1-notification-fix
