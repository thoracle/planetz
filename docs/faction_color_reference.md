# Faction Color Reference

This document provides the definitive reference for all faction colors used throughout the PlanetZ game system.

## 🎨 **Universal Faction Color System**

These colors are used consistently across all UI elements, wireframes, HUD displays, and visual indicators:

### **Primary Faction Colors**

```javascript
// Hex values for CSS/HTML
enemy: '#ff3333'     // Red for hostile
neutral: '#ffff44'   // Yellow for neutral  
friendly: '#44ff44'  // Green for friendly
unknown: '#44ffff'   // Cyan for unknown
waypoint: '#ff00ff'  // Magenta for waypoints
```

```javascript
// Hex values for Three.js materials
enemy: 0xff3333      // Red for hostile
neutral: 0xffff44    // Yellow for neutral  
friendly: 0x44ff44   // Green for friendly
unknown: 0x44ffff    // Cyan for unknown
waypoint: 0xff00ff   // Magenta for waypoints
```

### **RGB Values**

For systems requiring RGB values:

```javascript
enemy: { r: 255, g: 51, b: 51 }      // Red for hostile
neutral: { r: 255, g: 255, b: 68 }   // Yellow for neutral  
friendly: { r: 68, g: 255, b: 68 }   // Green for friendly
unknown: { r: 68, g: 255, b: 255 }   // Cyan for unknown
waypoint: { r: 255, g: 0, b: 255 }   // Magenta for waypoints
```

## 🎯 **Usage Guidelines**

### **When to Use Each Color**

#### **Enemy (Red - #ff3333)**
- Hostile ships and factions
- Enemy stations and facilities
- Threat indicators
- Combat-related UI elements
- Damage/critical status indicators

#### **Neutral (Yellow - #ffff44)**
- Neutral factions and ships
- Stars and celestial bodies (default)
- Unaligned stations
- Caution/warning indicators
- Default object states

#### **Friendly (Green - #44ff44)**
- Allied factions and ships
- Friendly stations and facilities
- Safe/operational indicators
- Positive status displays
- Player-aligned objects

#### **Unknown (Cyan - #44ffff)**
- Undiscovered objects
- Unidentified ships/stations
- Objects without faction data
- Information/neutral status
- Discovery system placeholders

#### **Waypoint (Magenta - #ff00ff)**
- Mission waypoints
- Navigation markers
- Player-created objectives
- Temporary mission targets
- Guidance indicators

## 🖼️ **Visual Applications**

### **Wireframes**
All target wireframes use these colors to indicate faction status:
- Enemy ships: Red wireframes
- Friendly objects: Green wireframes
- Neutral objects: Yellow wireframes
- Unknown objects: Cyan wireframes
- Waypoints: Magenta wireframes

### **HUD Elements**
- Target reticles
- Direction arrows
- Status indicators
- Frame borders
- Text highlighting

### **UI Components**
- Button states
- Progress bars
- Status panels
- Notification colors
- Icon tinting

## 📋 **Implementation Examples**

### **CSS Variables**
```css
:root {
    --faction-enemy: #ff3333;
    --faction-neutral: #ffff44;
    --faction-friendly: #44ff44;
    --faction-unknown: #44ffff;
    --faction-waypoint: #ff00ff;
}
```

### **JavaScript Constants**
```javascript
const FACTION_COLORS = {
    enemy: '#ff3333',
    neutral: '#ffff44',
    friendly: '#44ff44',
    unknown: '#44ffff',
    waypoint: '#ff00ff'
};

const FACTION_COLORS_HEX = {
    enemy: 0xff3333,
    neutral: 0xffff44,
    friendly: 0x44ff44,
    unknown: 0x44ffff,
    waypoint: 0xff00ff
};
```

### **Three.js Material Creation**
```javascript
function createFactionMaterial(faction) {
    const color = FACTION_COLORS_HEX[faction] || FACTION_COLORS_HEX.unknown;
    return new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
    });
}
```

## 🔧 **Consistency Requirements**

### **Documentation Updates**
When updating faction colors, ensure consistency across:
- `docs/restart.md` - Main faction color system
- `docs/user_interface_guide.md` - UI color specifications
- `docs/target_reticle_coloring_sequence.md` - Targeting system colors
- `docs/target_dummy_fixes_complete_summary.md` - Implementation examples
- This reference document

### **Code Updates**
When implementing faction colors, update:
- `frontend/static/js/views/TargetComputerManager.js` - Wireframe colors
- `frontend/static/js/views/ViewManager.js` - HUD colors
- `frontend/static/css/` - CSS color variables
- Any custom UI components using faction colors

## 🎨 **Color Accessibility**

These colors have been chosen for:
- **High contrast** against dark space backgrounds
- **Color-blind accessibility** with distinct hues
- **Consistent brightness** for equal visual weight
- **Intuitive associations** (red=danger, green=safe, etc.)

## 📚 **Related Documentation**

- [Main Restart Guide](restart.md) - Core faction color system
- [UI Guide](user_interface_guide.md) - CSS implementation
- [Target Reticle Sequence](target_reticle_coloring_sequence.md) - Targeting colors
- [Waypoint System](waypoint_system_sequence_diagram.md) - Waypoint color usage

---

**Last Updated**: 2025-09-16  
**Version**: 1.0 - Added waypoint colors to universal system
