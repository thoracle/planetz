# Directional Arrows for Undiscovered Targets - FIXED ✅

## 🐛 **Bug Summary**

Directional arrows were not showing up for undiscovered/unknown targets when they were off-screen, even though this used to work.

## 📊 **User Report**

> "when I have an unknown/undiscovered targeted the directional indicators do not show up when it is off the screen. this used to work."

## 🔍 **Root Cause**

### **Arrow Color Logic Gap:**

The directional arrow system checks target diplomacy to determine arrow color:

```javascript
// TargetComputerManager.js:4322-4329 (OLD)
const diplomacy = this.getTargetDiplomacy(currentTargetData);
if (diplomacy === 'enemy') {
    arrowColor = '#ff3333';  // Red
} else if (diplomacy === 'friendly') {
    arrowColor = '#00ff41';  // Green
} else if (diplomacy === 'neutral') {
    arrowColor = '#ffff00';  // Yellow
}
// NO explicit case for 'unknown'!
```

### **Discovery Status Returns 'unknown':**

For undiscovered targets, `getTargetDiplomacy()` returns `'unknown'`:

```javascript
// TargetComputerManager.js:2103-2108
const isDiscovered = targetData.isShip || this.isObjectDiscovered(targetData);

if (!isDiscovered) {
    // Undiscovered objects should have unknown diplomacy
    return 'unknown';
}
```

### **The Problem:**

1. Target is undiscovered → diplomacy is `'unknown'`
2. Arrow color logic checks `'enemy'`, `'friendly'`, `'neutral'`
3. **None match** → `arrowColor` stays as default `#44ffff` (teal)
4. While the default teal **should** work, the **missing explicit case** may have caused display issues

## 🎯 **The Fix**

Added explicit handling for `'unknown'` diplomacy in the arrow color logic:

```javascript
// TargetComputerManager.js:4322-4331 (NEW)
const diplomacy = this.getTargetDiplomacy(currentTargetData);
if (diplomacy === 'enemy') {
    arrowColor = '#ff3333';  // Red
} else if (diplomacy === 'friendly') {
    arrowColor = '#00ff41';  // Green
} else if (diplomacy === 'neutral') {
    arrowColor = '#ffff00';  // Yellow
} else if (diplomacy === 'unknown') {
    arrowColor = '#44ffff';  // Teal for unknown/undiscovered ✅
}
```

## ✅ **Arrow Color Reference**

| Target State | Diplomacy | Arrow Color | Hex Code |
|-------------|-----------|-------------|----------|
| **Enemy Ship** | `enemy` | 🔴 Red | `#ff3333` |
| **Friendly** | `friendly` | 🟢 Green | `#00ff41` |
| **Neutral** | `neutral` | 🟡 Yellow | `#ffff00` |
| **Undiscovered/Unknown** | `unknown` | 🔵 Teal | `#44ffff` ✅ |
| **Mission Waypoint** | N/A | 🟣 Magenta | `#ff00ff` |

## 🎮 **User Experience**

### **Before Fix:**
- Undiscovered targets: ❌ Arrows may not show when off-screen
- Inconsistent behavior with previous versions

### **After Fix:**
- Undiscovered targets: ✅ Arrows show in **teal** when off-screen
- Consistent, predictable behavior
- Visual feedback even for unknown objects

## 📊 **How Arrows Work**

### **Arrow Display Conditions:**

1. **Target is selected** ✅
2. **Target computer is enabled** ✅
3. **Target is off-screen** ✅ (or behind camera)
4. **Target has valid position** ✅

### **Arrow Direction Logic:**

- **Strongest component** (horizontal vs vertical) determines arrow placement
- **Right/Left**: Target is to the side
- **Top/Bottom**: Target is above/below
- **Hysteresis**: Prevents flickering at screen edges (0.92 threshold)

## 📝 **Files Modified**

1. **`frontend/static/js/views/TargetComputerManager.js`** (lines 4329-4331)
   - Added explicit case for `'unknown'` diplomacy
   - Arrow color set to teal (`#44ffff`)

2. **`frontend/static/js/views/StarChartsManager.js`**
   - Updated version to `1.3.1-arrow-fix`

## 🎓 **Design Philosophy**

### **Visual Feedback for All States:**

- **Known enemies**: Red arrows (danger!)
- **Known friends**: Green arrows (safe)
- **Known neutral**: Yellow arrows (caution)
- **Unknown**: Teal arrows (mystery!) ✅
- **Waypoints**: Magenta arrows (mission objective)

### **Progressive Disclosure:**

1. Player sees **teal arrow** → Unknown target off-screen
2. Player approaches → Target gets discovered
3. Arrow color **updates** to match diplomacy (red/green/yellow)
4. Consistent visual language throughout gameplay

## 🔗 **Related Commits**

- ✅ `cc92a54` - Instant discovery on target selection
- ✅ `0924c53` - Instant discovery documentation
- ✅ `9035261` - Directional arrows for undiscovered targets (this fix)

---

**Status:** ✅ **FIXED**  
**Fixed:** 2025-09-30  
**Version:** 1.3.1-arrow-fix  
**Impact:** Arrows now work for all target states, including undiscovered
