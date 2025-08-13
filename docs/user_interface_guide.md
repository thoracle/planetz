# 🎮 PlanetZ - User Interface Design Guide

## 📋 Table of Contents
- [Design Philosophy](#design-philosophy)
- [Typography](#typography)
- [Color Palette](#color-palette)
- [Buttons & Controls](#buttons--controls)
- [Menu Systems](#menu-systems)
- [HUD Elements](#hud-elements)
- [Icons & Symbols](#icons--symbols)
- [Faction Styling](#faction-styling)
- [Animation & Effects](#animation--effects)
- [Layout Principles](#layout-principles)
- [Accessibility](#accessibility)

---

## 🎨 Design Philosophy

### **Retro-Futuristic Aesthetic**
- **Theme:** Classic sci-fi computer interfaces from the 80s/90s
- **Style:** Clean, minimal, high-contrast terminal-inspired design
- **Feel:** Professional space operator workstation
- **Inspiration:** Star Trek LCARS, Alien Nostromo computer, retro arcade games

### **Core Principles**
1. **Functional First:** Every element serves a purpose
2. **High Contrast:** Readable in all lighting conditions
3. **Consistent Patterns:** Reusable components across all screens
4. **Responsive Feedback:** Clear visual/audio confirmation of actions
5. **Hierarchical Information:** Most important data stands out

---

## 📝 Typography

### **Primary Font Family**
```css
font-family: 'VT323', monospace;
```
- **Source:** Google Fonts - VT323 (terminal/retro computer font)
- **Fallback:** `monospace` for system compatibility
- **Usage:** All UI text, buttons, labels, and HUD elements

### **Font Sizes**
| **Element Type** | **Size** | **Usage** |
|---|---|---|
| **Large Headers** | `28px` | Screen titles, station names |
| **Medium Headers** | `20px` | Section titles, important labels |
| **Standard Text** | `16px` | Button text, descriptions, most UI |
| **Small Text** | `12px` | Subtitles, secondary info, status text |
| **Micro Text** | `10px` | Technical details, minimal descriptions |

### **Font Weight**
- **Standard:** Normal weight (VT323 is naturally bold-looking)
- **Emphasis:** Use color and size changes instead of font-weight
- **Never:** Use italic or other font variations

---

## 🎨 Color Palette

### **Primary Colors**
```css
/* Matrix Green - Primary UI Color */
--primary-green: #00ff41;
--primary-green-hover: #44ff44;
--primary-green-background: rgba(0, 255, 65, 0.2);
--primary-green-dim: rgba(0, 255, 65, 0.1);

/* Background Colors */
--background-dark: rgba(0, 0, 0, 0.8);
--background-medium: rgba(0, 0, 0, 0.5);
--background-light: rgba(0, 0, 0, 0.3);

/* Text Colors */
--text-primary: #00ff41;
--text-secondary: #ffffff;
--text-dim: #888888;
--text-disabled: #555555;
```

### **System Colors**
```css
/* Status Colors */
--status-good: #00ff41;      /* Operational, healthy */
--status-warning: #ffaa00;   /* Caution, needs attention */
--status-critical: #ff3333;  /* Error, damaged, hostile */
--status-info: #0099ff;      /* Information, neutral */

/* Faction Colors */
--faction-friendly: #00ff41;   /* Allied factions */
--faction-neutral: #888888;    /* Neutral/unknown */
--faction-hostile: #ff3333;    /* Enemy factions */
```

### **Service Colors**
```css
/* Station Service Colors */
--service-repair: #ffaa00;     /* Repair services */
--service-shop: #0099ff;       /* Shopping/upgrade */
--service-mission: #00ff41;    /* Mission board */
--service-cargo: #9944ff;      /* Commodity exchange */
--service-launch: #00ff41;     /* Launch/departure */
```

---

## 🔘 Buttons & Controls

### **Standard Button Style**
```css
.game-button {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00ff41;
    color: #00ff41;
    padding: 12px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'VT323', monospace;
    font-size: 16px;
    transition: all 0.3s ease;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.game-button:hover:not(:disabled) {
    background: rgba(0, 255, 65, 0.2);
    border-color: #44ff44;
    transform: scale(1.05);
}

.game-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}
```

### **Button Variants**

#### **Service Buttons (Station Menu)**
```css
.service-button {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00ff41;
    padding: 12px;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.service-button .service-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 4px;
}

.service-button .service-description {
    font-size: 10px;
    opacity: 0.7;
    line-height: 1.2;
}
```

#### **Colored Service Buttons**
- **Repair:** `border-color: #ffaa00; color: #ffaa00;`
- **Shop:** `border-color: #0099ff; color: #0099ff;`
- **Mission:** `border-color: #00ff41; color: #00ff41;`
- **Cargo:** `border-color: #9944ff; color: #9944ff;`

#### **Return/Navigation Buttons**
```css
.return-button {
    /* Same as standard button */
    /* Text: "Return to Station Menu" or "← Return to Station Menu" */
}
```

### **Button Icons**
- **Repair:** 🔧
- **Shop:** 🏪  
- **Mission:** 🎯
- **Cargo:** 🚛
- **Launch:** 🚀
- **Close:** ✕

---

## 📱 Menu Systems

### **Menu Hierarchy**
1. **Docking Menu:** Dock/Cancel confirmation
2. **Station Menu:** Service selection screen
3. **Service Menus:** Individual service interfaces

### **Standard Menu Container**
```css
.menu-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #00ff41;
    border-radius: 8px;
    padding: 20px;
    font-family: 'VT323', monospace;
    color: #00ff41;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    z-index: 1000;
}
```

### **Menu Headers**
```css
.menu-header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #00ff41;
    padding-bottom: 15px;
}

.menu-title {
    font-size: 28px;
    color: #00ff41;
    margin: 0 0 8px 0;
}

.menu-subtitle {
    font-size: 16px;
    opacity: 0.8;
    margin: 0;
}
```

### **Menu Layout Patterns**

#### **Two-Column Layout (Station Menu)**
```css
.content-wrapper {
    display: flex;
    gap: 20px;
}

.station-wireframe {
    flex: 0 0 250px;
    /* Wireframe visualization */
}

.services-container {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
```

#### **Full-Screen Overlay (Mission Board, Shop)**
```css
.fullscreen-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    z-index: 2000;
}
```

---

## 📊 HUD Elements

### **HUD Container Standards**
```css
.hud-element {
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #00ff41;
    border-radius: 4px;
    padding: 10px;
    font-family: 'VT323', monospace;
    color: #00ff41;
    font-size: 14px;
    z-index: 100;
}
```

### **HUD Positioning**
- **Top-Left:** Energy, shields, targeting info
- **Top-Right:** Speed, navigation, mission status
- **Bottom-Left:** Weapon systems, damage control
- **Bottom-Right:** Communication, notifications
- **Center:** Crosshairs, major alerts

### **HUD Element Types**

#### **Status Bars**
```css
.status-bar {
    background: #333;
    border: 1px solid #666;
    height: 8px;
    border-radius: 2px;
    overflow: hidden;
}

.status-fill {
    height: 100%;
    transition: width 0.3s ease;
    /* Color varies by status type */
}
```

#### **Data Displays**
```css
.data-label {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 2px;
}

.data-value {
    font-size: 16px;
    font-weight: bold;
}
```

---

## 🔣 Icons & Symbols

### **Standard Icons**
- **⚡ Energy/Power**
- **🛡️ Shields**  
- **🎯 Targeting**
- **🚀 Engine/Speed**
- **🔧 Repair/Maintenance**
- **🏪 Shopping/Commerce**
- **📡 Communications**
- **⚠️ Warning/Alert**
- **✅ Success/Complete**
- **❌ Error/Failed**

### **Navigation Symbols**
- **↑ ↓ ← →** Direction indicators
- **⟲ ⟳** Rotation/cycling
- **⊞ ⊟** Expand/collapse
- **◐ ◑** Status indicators

### **Wireframe Symbols**
- **○** Circular objects (stations, planets)
- **△** Ships/triangular objects
- **□** Structures/rectangular objects
- **◇** Special objects/diamonds

---

## 🏛️ Faction Styling

### **Faction Color System**
```css
/* Friendly Factions */
.faction-friendly {
    color: #00ff41;
    border-color: #00ff41;
}

/* Neutral Factions */
.faction-neutral {
    color: #888888;
    border-color: #888888;
}

/* Hostile Factions */
.faction-hostile {
    color: #ff3333;
    border-color: #ff3333;
}
```

### **Specific Faction Colors**
- **Terran Republic Alliance:** `#00ff41` (Friendly Green)
- **Free Trader Consortium:** `#0099ff` (Commerce Blue)
- **Scientists Consortium:** `#9944ff` (Research Purple)
- **Nexus Corporate Syndicate:** `#ffaa00` (Corporate Orange)
- **Ethereal Wanderers:** `#44ffaa` (Mystic Teal)
- **Unknown/Hostile:** `#ff3333` (Danger Red)

### **Diplomacy Status Display**
- **Format:** `DIPLOMACY • TYPE` (e.g., "FRIENDLY • STATION")
- **Order:** Diplomacy status first (more important than object type)
- **Styling:** Use faction colors for the diplomacy portion

---

## ✨ Animation & Effects

### **Standard Transitions**
```css
/* Default transition for all interactive elements */
transition: all 0.3s ease;

/* Hover scale effect */
transform: scale(1.05);

/* Opacity fade */
opacity: 0.8;
```

### **Button Hover Effects**
1. **Background color change:** rgba(0, 255, 65, 0.2)
2. **Border color brighten:** #44ff44
3. **Scale increase:** scale(1.05)
4. **Smooth transition:** 0.3s ease

### **HUD Animations**
- **Pulse effect:** For critical alerts
- **Slide in/out:** For HUD element toggles
- **Typewriter effect:** For communication text
- **Rotation:** For wireframe objects

### **Wireframe Animations**
```css
@keyframes station-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

@keyframes wireframe-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
```

---

## 📐 Layout Principles

### **Grid Systems**
- **2x2 Grid:** Service buttons in Station Menu
- **3-Column:** Complex data displays
- **Flexbox:** Dynamic content and responsive layouts

### **Spacing Standards**
```css
/* Standard spacing units */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-xxl: 24px;
```

### **Container Sizing**
- **Full Screen:** 100vw × 100vh for overlays
- **Modal Windows:** 90vw × 90vh maximum
- **HUD Elements:** Auto-sized with max constraints
- **Service Screens:** 70vw × 70vh for focused content

### **Z-Index Hierarchy**
```css
/* Z-index layering system */
--z-background: 0;
--z-hud: 100;
--z-menus: 1000;
--z-modals: 2000;
--z-alerts: 9999;
```

---

## ♿ Accessibility

### **Contrast Requirements**
- **Minimum contrast ratio:** 4.5:1 for normal text
- **High contrast mode:** Available with brighter colors
- **Color blindness:** All information conveyed through multiple methods

### **Keyboard Navigation**
- **Tab order:** Logical flow through interactive elements
- **Enter/Space:** Activate buttons
- **Escape:** Close menus/modals
- **Arrow keys:** Navigate lists and grids

### **Screen Reader Support**
```html
<!-- Proper labeling -->
<button aria-label="Return to Station Menu">Return to Station Menu</button>

<!-- Status information -->
<div role="status" aria-live="polite">Mission accepted</div>

<!-- Progress indicators -->
<div role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
```

### **Font Size Considerations**
- **Minimum readable size:** 12px
- **Preferred size:** 16px for body text
- **Scalability:** Text should remain readable when zoomed to 200%

---

## 🔧 Implementation Guidelines

### **CSS Organization**
1. **Variables first:** Define all colors, fonts, spacing
2. **Base styles:** Typography, containers, layout
3. **Components:** Buttons, forms, cards
4. **Utilities:** Helper classes, overrides

### **Naming Conventions**
```css
/* Component-based naming */
.component-name { }
.component-name__element { }
.component-name--modifier { }

/* Examples */
.service-button { }
.service-button__title { }
.service-button--repair { }
```

### **Code Examples**

#### **Standard Button Implementation**
```javascript
function createStandardButton(text, onClick, variant = 'default') {
    const button = document.createElement('button');
    button.className = `game-button ${variant}`;
    button.textContent = text;
    button.addEventListener('click', onClick);
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(0, 255, 65, 0.2)';
        button.style.borderColor = '#44ff44';
        button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(0, 0, 0, 0.5)';
        button.style.borderColor = '#00ff41';
        button.style.transform = 'scale(1)';
    });
    
    return button;
}
```

#### **HUD Element Creation**
```javascript
function createHUDElement(position, content) {
    const hud = document.createElement('div');
    hud.className = 'hud-element';
    hud.style.cssText = `
        position: fixed;
        ${position};
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff41;
        border-radius: 4px;
        padding: 10px;
        font-family: 'VT323', monospace;
        color: #00ff41;
        font-size: 14px;
        z-index: 100;
    `;
    hud.innerHTML = content;
    return hud;
}
```

---

## 📋 Quick Reference Checklist

### **Before Creating New UI Elements:**
- [ ] Uses VT323 font family
- [ ] Follows color palette (primary green #00ff41)
- [ ] Has proper hover states with scale(1.05)
- [ ] Includes smooth transitions (0.3s ease)
- [ ] Uses standard border-radius (4px)
- [ ] Has appropriate z-index for layering
- [ ] Follows naming convention (Docking Menu → Station Menu → Service Menu)
- [ ] Includes "Return to Station Menu" button for service screens
- [ ] Uses consistent spacing and sizing
- [ ] Accessible with proper ARIA labels

### **Testing UI Elements:**
- [ ] Readable in full-screen and windowed mode
- [ ] Hover effects work smoothly
- [ ] Keyboard navigation functions
- [ ] Scales properly with browser zoom
- [ ] Maintains hierarchy and contrast
- [ ] Consistent with existing game elements

---

## 🚀 Conclusion

This guide establishes the visual language and interaction patterns for PlanetZ. All new UI elements should follow these standards to maintain the cohesive retro-futuristic aesthetic and ensure a consistent player experience.

**Remember:** When in doubt, prioritize function over form, but maintain the established visual style. The UI should feel like a professional space operator's workstation - clean, functional, and reliable.

---

*Last Updated: January 2025*  
*Version: 1.0*
