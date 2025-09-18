# TAB Wireframe Debug Summary

## 🔍 **Issue Analysis**

The problem is that wireframes appear when clicking in Star Charts but not when using TAB cycling. Based on the logs, `StarfieldManager.cycleTarget()` is being called but we don't see output from `TargetComputerManager.cycleTarget()`, suggesting it's being blocked by an early return condition.

## ✅ **Debugging Enhancements Added**

### **1. Enhanced TargetComputerManager.cycleTarget() Debugging**
**File**: `frontend/static/js/views/TargetComputerManager.js`

Added comprehensive condition checking:
```javascript
console.log('🎯 TAB: Checking conditions...', {
    isDocked: this.viewManager?.starfieldManager?.isDocked,
    undockCooldown: this.viewManager?.starfieldManager?.undockCooldown ? (Date.now() < this.viewManager.starfieldManager.undockCooldown) : false,
    preventTargetChanges: this.preventTargetChanges,
    targetComputerEnabled: this.targetComputerEnabled,
    targetObjectsLength: this.targetObjects?.length || 0
});
```

### **2. Enhanced Wireframe Creation Debugging**
Added detailed logging to `createTargetWireframe()`:
- Entry logging with target name
- Scene children count tracking
- Success/error logging with wireframe details

### **3. TAB Cycle Wireframe Tracking**
Added specific logging in the cycleTarget method:
```javascript
console.log('🎯 TAB: About to create wireframe for target:', this.currentTarget?.name);
this.createTargetWireframe();
console.log('🎯 TAB: Wireframe creation completed, wireframe exists:', !!this.targetWireframe);
```

### **4. Debug Tools Script**
**File**: `debug_tab_cycling_issue.js`

Provides functions to:
- Check all blocking conditions
- Manually trigger cycleTarget with debugging
- Enable target computer if disabled
- Enhanced TAB key handler with debugging

## 🧪 **How to Debug**

### **Step 1: Load Debug Tools (Optional)**
```javascript
// Run the contents of debug_tab_cycling_issue.js in browser console
// This adds helper functions for debugging
```

### **Step 2: Test TAB Cycling**
1. **Reload the game** to get the enhanced debugging
2. **Press TAB** and watch console output
3. **Look for these key messages**:
   - `🎯 TargetComputerManager.cycleTarget called` - Method entry
   - `🎯 TAB: Checking conditions...` - Condition check results
   - `🖼️ createTargetWireframe() called` - Wireframe creation attempt
   - `🖼️ Wireframe creation SUCCESS` - Successful wireframe creation

### **Step 3: Identify the Issue**
Based on console output, you'll see one of these scenarios:

#### **Scenario A: Method Not Called**
If you see:
- `🎯 StarfieldManager.cycleTarget called`
- `🎯 StarfieldManager: Delegated to targetComputerManager.cycleTarget`
- **But NOT**: `🎯 TargetComputerManager.cycleTarget called`

**Cause**: One of the blocking conditions is active
**Solution**: Check the condition values in the debug output

#### **Scenario B: Method Called, No Wireframe**
If you see:
- `🎯 TargetComputerManager.cycleTarget called`
- `🎯 TAB: All checks passed, proceeding with target cycling`
- `🖼️ createTargetWireframe() called`
- **But NOT**: `🖼️ Wireframe creation SUCCESS`

**Cause**: Wireframe creation is failing
**Solution**: Check for error messages in wireframe creation

#### **Scenario C: Everything Works**
If you see all the success messages, the issue might be elsewhere (wireframe rendering, scene setup, etc.)

## 🔧 **Common Blocking Conditions**

### **1. Target Computer Disabled**
```javascript
targetComputerEnabled: false
```
**Fix**: Run `enableTargetComputer()` or manually enable it

### **2. No Target Objects**
```javascript
targetObjectsLength: 0
```
**Fix**: Ensure targets are loaded, try refreshing target list

### **3. Ship Docked**
```javascript
isDocked: true
```
**Fix**: Undock from station/planet

### **4. Prevent Target Changes Flag**
```javascript
preventTargetChanges: true
```
**Fix**: This flag should clear automatically, but can be manually reset

## 🎯 **Debug Functions Available**

If you loaded the debug script, you can use:

```javascript
// Check what might be blocking TAB cycling
debugCycleTargetConditions()

// Manually trigger cycleTarget with debugging
debugCycleTarget()

// Enable target computer if disabled
enableTargetComputer()
```

## 📋 **Expected Output for Working TAB Cycle**

When TAB cycling works correctly, you should see:
```
🎯 StarfieldManager.cycleTarget called (forward=true)
🎯 StarfieldManager: About to delegate to targetComputerManager
🎯 StarfieldManager: Delegated to targetComputerManager.cycleTarget
🎯 TargetComputerManager.cycleTarget called (forward=true)
🎯 TAB: Checking conditions... {isDocked: false, undockCooldown: false, preventTargetChanges: false, targetComputerEnabled: true, targetObjectsLength: 5}
🎯 TargetComputerManager: All checks passed, proceeding with target cycling
🎯 TAB: About to create wireframe for target: Sol
🖼️ createTargetWireframe() called for target: Sol
🖼️ Wireframe scene children before: 0
🖼️ Wireframe creation SUCCESS: {targetName: "Sol", wireframeExists: true, wireframeType: "LineSegments", sceneChildren: 1}
🎯 TAB: Wireframe creation completed, wireframe exists: true
🎯 TargetComputerManager: cycleTarget completed - new target: Sol (ID: A0_sol)
```

## 🚀 **Next Steps**

1. **Test with enhanced debugging** - Press TAB and check console
2. **Identify the blocking condition** - Look for which check is failing
3. **Apply appropriate fix** - Based on the specific condition
4. **Verify wireframe creation** - Ensure wireframes appear in HUD

The enhanced debugging will show exactly where the TAB cycling is failing and help identify the root cause of the wireframe issue.
