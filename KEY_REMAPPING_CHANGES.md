# Key Remapping Changes - Star Charts Integration

## 🎮 **Updated Key Mappings**

### **Navigation Systems**
- **L Key**: Long Range Scanner (unchanged)
- **C Key**: Star Charts (NEW - moved from autofire)
- **G Key**: Galactic Chart (unchanged)

### **Combat Systems**
- **/ Key**: Toggle Autofire (NEW - moved from C key)
- **Space**: Fire weapons (unchanged)
- **Tab**: Cycle targets (unchanged)
- **,/./</>**: Previous/Next weapon (NEW - swapped from Z/X, includes < > keys)
- **Z/X**: Previous/Next sub-target (NEW - swapped from ,/.)

## 🔄 **What Changed**

### **Before**
- **L Key**: Showed either Long Range Scanner OR Star Charts (dual system)
- **C Key**: Toggle autofire
- **/ Key**: (unused)
- **Z/X Keys**: Previous/Next weapon
- **,/./</>Keys**: Previous/Next sub-target

### **After**
- **L Key**: Long Range Scanner ONLY
- **C Key**: Star Charts ONLY
- **/ Key**: Toggle autofire
- **Z/X Keys**: Previous/Next sub-target (swapped)
- **,/./</>Keys**: Previous/Next weapon (swapped)

## 🎯 **Benefits of New Mapping**

1. **Clear Separation**: Each navigation system has its own dedicated key
2. **No Conflicts**: L and C keys are completely independent
3. **Logical Grouping**: Navigation keys (L, C, G) are grouped together
4. **Autofire Accessibility**: / key is easily accessible for combat

## 🛠️ **Files Modified**

1. **ViewManager.js**:
   - Updated L key to show Long Range Scanner only
   - Added C key handler for Star Charts
   - Both keys hide other navigation interfaces when activated

2. **StarfieldManager.js**:
   - Changed autofire toggle from C key to / key
   - Supports both / and ? (shift+/) for accessibility
   - Swapped weapon selection keys: Z/X ↔ ,/. 
   - Swapped sub-targeting keys: ,/. ↔ Z/X

3. **StarChartsUI.js**:
   - Updated keyboard handler to use C key for closing (instead of L)
   - Maintains Escape key as alternative

4. **restart.md**:
   - Updated documentation to reflect new key mappings

5. **HelpInterface.js**:
   - Updated help manual to show new weapon keys (,/.)
   - Updated sub-targeting keys (Z/X)
   - Updated autofire key (/)
   - Added Star Charts entry (C key)

## 🧪 **Testing the Changes**

### **In Game**:
1. **L Key**: Should show/hide Long Range Scanner only
2. **C Key**: Should show/hide Star Charts only
3. **/ Key**: Should toggle autofire when not docked
4. **Both L and C**: Should hide the other navigation interface when activated
5. **,/./</>Keys**: Should cycle weapons (previous/next)
6. **Z/X Keys**: Should cycle sub-targets (previous/next) when target computer is active

### **Expected Behavior**:
- Press L → Shows LRS, hides Star Charts if open
- Press C → Shows Star Charts, hides LRS if open
- Press / → Toggles autofire (with audio feedback)
- Press , or < → Cycles to previous weapon
- Press . or > → Cycles to next weapon
- Press Z → Cycles to previous sub-target (when target computer active)
- Press X → Cycles to next sub-target (when target computer active)
- Press Escape → Closes any open interface

## 🎮 **User Experience**

The new mapping provides:
- **Dedicated Access**: Each navigation system has its own key
- **No Confusion**: Clear separation between LRS and Star Charts
- **Combat Flow**: Autofire on / key doesn't interfere with navigation
- **Muscle Memory**: L key still works for LRS as before

## ✅ **Implementation Complete**

All changes have been implemented and are ready for testing. The key remapping maintains backward compatibility for the L key while providing dedicated access to the new Star Charts system on the C key.
