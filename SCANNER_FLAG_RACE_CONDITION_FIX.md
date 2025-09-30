# Scanner Flag Race Condition - Fix Complete ✅

**Date**: September 30, 2025  
**Branch**: achievements  
**Priority**: HIGH - Core gameplay bug affecting Star Charts navigation

---

## 🐛 **Bug Summary**

The `isFromLongRangeScanner` flag was being **cleared too aggressively** during target cycling, causing:
1. Lost protection from auto-target switching after sector changes
2. Disabled target list enhancement (no cached targets for cycling)
3. Inconsistent user experience (first TAB works, subsequent TABs fail)
4. **Affects both Long Range Scanner AND Star Charts**

---

## ✅ **Fix Applied**

### **1. Flag Renamed for Clarity**
```javascript
// OLD (misleading name)
this.isFromLongRangeScanner = false;

// NEW (accurate purpose)
this.isManualNavigationSelection = false;
```

**Reason**: Star Charts also uses this flag, so "LongRangeScanner" was misleading.

---

### **2. Removed Aggressive Clearing from cycleTarget()**

**Before (BROKEN):**
```javascript
// TargetComputerManager.js:2456-2471
if (previousTarget.name !== targetData.name) {
    this.isFromLongRangeScanner = false; // ❌ Cleared on EVERY cycle
    this.isManualSelection = false;
}
```

**After (FIXED):**
```javascript
// TargetComputerManager.js:2456-2472
// FIXED: Don't clear navigation selection flag during cycling
// The flag should only clear when user explicitly changes targeting mode,
// not when cycling through targets (which is part of normal navigation workflow)
if (previousTarget.name !== targetData.name) {
    // Preserve navigation selection flag - only clear generic manual flag
    this.isManualSelection = false;
}
// Note: Removed aggressive flag clearing from edge cases - preserve user intent
```

---

### **3. Added Explicit Clearing on Interface Close**

**Star Charts close:**
```javascript
// StarChartsUI.js:1301-1306
// Clear manual navigation selection flag when user closes Star Charts
if (this.starChartsManager?.targetComputerManager) {
    this.starChartsManager.targetComputerManager.isManualNavigationSelection = false;
    debug('TARGETING', '🗺️ Star Charts closed - clearing manual navigation selection flag');
}
```

**Long Range Scanner close:**
```javascript
// LongRangeScanner.js:144-149
// Clear manual navigation selection flag when user closes LRS
if (this.viewManager?.starfieldManager?.targetComputerManager) {
    this.viewManager.starfieldManager.targetComputerManager.isManualNavigationSelection = false;
    debug('TARGETING', '🔍 Long Range Scanner closed - clearing manual navigation selection flag');
}
```

---

## 📝 **Files Modified**

### **Core Changes:**
1. **`TargetComputerManager.js`** - 14 edits
   - Renamed flag throughout (17 references)
   - Removed aggressive clearing from `cycleTarget()`
   - Updated comments for clarity

2. **`LongRangeScanner.js`** - 2 edits
   - Updated flag references
   - Added explicit clearing on `hide()`

3. **`StarChartsUI.js`** - 1 edit
   - Added explicit clearing on `hide()`

---

## 🎯 **How the Fix Works**

### **Before Fix - Bug Flow:**
1. User selects target from Star Charts → `isFromLongRangeScanner = true` ✅
2. User presses TAB once → **Flag cleared immediately** ❌
3. Sector change triggers → Auto-selects different target (no protection) 💥
4. Target list enhancement doesn't work (flag is false) 💥

### **After Fix - Correct Flow:**
1. User selects target from Star Charts → `isManualNavigationSelection = true` ✅
2. User presses TAB multiple times → **Flag preserved** ✅
3. Sector change triggers → **Selection preserved** (flag still true) ✅
4. Target list enhancement works (flag is true) ✅
5. User closes Star Charts → **Flag cleared** (intentional exit) ✅

---

## 🔧 **Flag Clearing Logic**

The flag is now cleared **ONLY** when:
- ✅ User closes Star Charts interface
- ✅ User closes Long Range Scanner interface
- ✅ Target Computer is disabled entirely
- ✅ Target Computer state is explicitly cleared
- ❌ ~~User cycles through targets~~ (NO LONGER CLEARS)

---

## 🚀 **Benefits**

### **User Experience:**
- ✅ Consistent behavior - TAB cycling works as expected
- ✅ Manual selections stay protected through sector changes
- ✅ No unexpected target switches
- ✅ Better cycling experience with cached target enhancement

### **Technical:**
- ✅ More accurate flag naming
- ✅ Intent-based clearing (user action, not side effect)
- ✅ Matches mental model: "I selected from navigation, keep that context"
- ✅ No linter errors introduced

---

## 🧪 **Testing Recommendations**

### **Test Case 1: Star Charts Selection + Cycling**
1. Open Star Charts (G key)
2. Click on "Jupiter" 
3. Press TAB to cycle to "Io" (moon)
4. Press TAB again to cycle to "Europa"
5. **Expected**: Selection stays in Jupiter system, no auto-override

### **Test Case 2: Sector Change Protection**
1. Open Star Charts
2. Select target in current sector
3. Press TAB to cycle
4. Warp to different sector
5. **Expected**: No auto-selection after warp (manual selection preserved)

### **Test Case 3: Interface Close**
1. Open Star Charts
2. Select target
3. Close Star Charts (G key again)
4. Trigger sector change
5. **Expected**: Auto-selection works now (flag was cleared on close)

### **Test Case 4: Target List Enhancement**
1. Open Star Charts
2. Select distant target (limited nearby objects)
3. Press TAB to cycle
4. **Expected**: Enhanced target list with cached objects for better cycling

---

## 📊 **Impact Analysis**

### **Before:**
- 🔴 Bug affects primary navigation interface (Star Charts)
- 🔴 Confusing UX - first TAB works, subsequent TABs fail
- 🔴 Manual selections lost after sector changes
- 🔴 No target list enhancement

### **After:**
- 🟢 Star Charts navigation works correctly
- 🟢 Consistent TAB cycling behavior
- 🟢 Manual selections protected
- 🟢 Target list enhancement active

---

## 🎓 **Lessons Learned**

1. **Flag names matter** - `isFromLongRangeScanner` was misleading when Star Charts also used it
2. **Clearing should be intent-based** - Not side effects of normal operations (cycling)
3. **State vs. Event flags** - This needed to be state-based, not event-based
4. **Always check new features** - Star Charts inherited the LRS bug

---

## ✅ **Verification**

- ✅ No linter errors
- ✅ All 19 references updated (17 in TargetComputerManager, 2 in LongRangeScanner)
- ✅ Explicit clearing added to both navigation interfaces
- ✅ Comments updated for clarity
- ⏳ Manual testing needed (see test cases above)

---

## 🔄 **Next Steps**

1. **Manual Testing** - Run through test cases above
2. **Verify Long Range Scanner** - If planning to deprecate, can skip detailed testing
3. **Monitor for Edge Cases** - Watch for any unexpected flag persistence
4. **Consider UI Indicator** - Show user when in "navigation selection mode"

---

**Status**: ✅ **FIX COMPLETE - READY FOR TESTING**
