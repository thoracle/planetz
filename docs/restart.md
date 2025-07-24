# PROJECT CONTEXT: Planetz - 3D Space Combat Game

You're joining the development of **Star F*ckers **, a fully functional 3D web-based space simulation game inspired by Elite, Privateer, and Star Raiders. The game is built with Three.js (frontend), Flask/Python (backend), and features complete ship management, combat, targeting, and exploration systems.

## 📁 Current Project State
- **Branch**: `optimization` (up to date with origin)
- **Latest Work**: Debug cleanup and target preservation system completion
- **Tech Stack**: Three.js, ES6+ modules, Flask/Python backend, HTML5/CSS3, Ammo.js physics
- **Codebase**: 25,000+ lines, 150+ files, fully modular architecture
- **Recent Achievement**: ✅ Complete target preservation system for Q-key dummy creation with cleaned debug logs
- **Status**: Production-ready combat game with robust physics and sophisticated target management

## 🏗️ Architecture Overview
```
planetz/
├── frontend/static/js/
│   ├── ship/systems/          # Ship systems (weapons, targeting, shields, etc.)
│   ├── ship/                  # Ship classes (Ship.js, EnemyShip.js)
│   ├── views/                 # UI managers (StarfieldManager, TargetComputerManager)
│   ├── ui/                    # HUD components (WeaponHUD, DamageControlHUD)
│   ├── PhysicsManager.js      # Ammo.js physics integration
│   └── app.js                 # Main entry point
├── backend/                   # Flask server (app.py, routes/)
├── frontend/index.html        # Main HTML entry point
├── frontend/static/index.html # Static HTML for direct serving
└── docs/                      # Documentation and specs
```

## 🎮 Current Game Features (All Working)
- ✅ **Complete weapon system** - Lasers, torpedoes, missiles with physics and targeting
- ✅ **Advanced targeting** - Sub-system targeting with faction-colored HUD
- ✅ **Target preservation** - Q-key dummy creation preserves current target perfectly
- ✅ **Universal autofire** - All weapons support autofire with intelligent target validation
- ✅ **Physics projectiles** - Torpedo/missile physics with collision, range expiry, damage
- ✅ **Sophisticated combat** - Beam vs projectile weapons, sub-targeting vs random damage
- ✅ **Audio systems** - Consistent explosion audio, command feedback sounds
- ✅ **Station docking** - Repair and upgrade interface with card system
- ✅ **Visual systems** - Wireframe targeting, faction colors, damage control screens

## 🔧 Key Systems Recently Enhanced

### 1. **Target Preservation System** ⭐ LATEST ACHIEVEMENT
- **Feature**: Pressing Q to create target dummies preserves current target selection
- **Technology**: Identifier-based target restoration using name, position, shipName
- **Capabilities**:
  - ✅ Preserves target across array rebuilding during dummy creation
  - ✅ Handles wireframe cleanup and recreation automatically
  - ✅ Works with all target types (ships, celestial bodies, stars)
  - ✅ Robust fallback matching system for edge cases
- **Files**: `StarfieldManager.js`, `TargetComputerManager.js`
- **Status**: ✅ COMPLETE - Production ready target management

### 2. **Enhanced Sub-Targeting System**
- **HUD Integration**: Sub-targeting availability based on weapon type and target computer level
- **Faction Colors**: All HUD elements respect target faction (red hostile, yellow neutral, green friendly)
- **Smart Controls**: `<` and `>` keys only work for compatible weapons, plays error sound otherwise
- **Weapon Compatibility**: Only beam weapons (scan-hit type) support sub-targeting
- **Files**: `StarfieldManager.js`, `WeaponSystemCore.js`

### 3. **Universal Autofire System**
- **All Weapons**: Every weapon now supports autofire functionality
- **Smart Validation**: Homing missiles validate target lock on each autofire cycle
- **Energy Management**: Autofire respects energy requirements and cooldowns
- **HUD Feedback**: Clear autofire status indicators and messages
- **Files**: `WeaponSystemCore.js`, `WeaponDefinitions.js`

### 4. **Advanced Projectile Physics**
- **Realistic Flight**: Torpedoes and missiles use Ammo.js physics with proper velocity
- **Collision System**: Robust hit detection with collision loop prevention
- **Range Management**: Projectiles expire at weapon range, no infinite trails
- **Damage Application**: Proper shield/hull damage with random subsystem effects
- **Files**: `WeaponCard.js`, `PhysicsManager.js`, `EnemyShip.js`

### 5. **Clean Debug Environment** 🧹 LATEST CLEANUP
- **Removed**: 20+ verbose Q-KEY debug logs from target dummy creation
- **Removed**: Collision delay debug messages from weapon system
- **Removed**: Target list update spam from app initialization
- **Preserved**: Essential functionality logs and error handling
- **Result**: Clean console output focused on important information
- **Files**: `StarfieldManager.js`, `WeaponCard.js`, `app.js`

## 🚀 How to Run the Game

### Flask Backend (Recommended)
```bash
# Terminal - Backend (serves everything)
cd backend && python app.py
# Runs on http://127.0.0.1:5001

# Browser
open http://127.0.0.1:5001
```

### Quick Start Commands
```bash
# Kill any existing server and start fresh
pkill -f "python app.py" || true
cd backend && python app.py

# Browser
open http://127.0.0.1:5001
```

## 🎯 Current Gameplay Features

### **Combat System**
- **Beam Weapons**: Instant hit with sub-system targeting precision (+30% damage bonus)
- **Projectile Weapons**: Physics-based flight with random subsystem damage on penetration
- **Autofire**: All weapons support autofire with smart target validation
- **Energy System**: Weapons consume energy, respect cooldowns and range limits

### **Targeting System**
- **Target Computer**: Level-based functionality (Level 2+ for sub-targeting)
- **Faction Colors**: Red (hostile), Yellow (neutral), Green (friendly) HUD elements  
- **Sub-Targeting**: Precision damage to specific ship systems (beam weapons only)
- **Target Preservation**: Q-key dummy creation maintains current target selection

### **Controls**
- **Tab**: Cycle through available targets
- **Q**: Create target dummy ships (preserves current target)
- **R**: Fire weapons (autofire available)
- **< / >**: Cycle sub-targets (beam weapons with Level 2+ target computer)
- **A**: Toggle autofire for current weapon

### **Audio Feedback**
- **Success Sounds**: Ship destruction, subsystem damage
- **Command Sounds**: Valid key presses, targeting changes
- **Error Sounds**: Invalid commands, failed operations
- **Explosion Audio**: Consistent positioning for all weapon types

## 🔍 Development Status: PRODUCTION READY

### ✅ Fully Completed Systems
- ✅ **Target Preservation** - Q-key dummy creation with perfect target maintenance
- ✅ **Universal Autofire** - All weapons with intelligent validation
- ✅ **Advanced Sub-Targeting** - Faction-colored HUD with weapon compatibility
- ✅ **Physics Projectiles** - Torpedoes/missiles with realistic flight and collision
- ✅ **Weapon Balance** - Beam vs projectile mechanics properly differentiated
- ✅ **Audio Systems** - Consistent sound effects with proper positioning
- ✅ **Debug Cleanup** - Clean console output, removed development noise

### 🏆 Technical Achievements
- **Identifier-Based Target Restoration**: Robust system handles array rebuilding
- **Sophisticated Damage Models**: Different mechanics for beam vs projectile weapons
- **Smart HUD Management**: Faction colors, weapon compatibility, system availability
- **Production Code Quality**: Clean, well-documented, minimal debug noise

## 🛠️ Potential Next Steps

### **Immediate Opportunities** (All systems ready)
- **Enemy AI Enhancement**: Intelligent combat behaviors, evasion patterns
- **Dynamic Economy**: Trading systems, market fluctuations, cargo management
- **Mission Framework**: Quest system, objectives, story progression
- **Fleet Combat**: Multiple ship battles, squadron management
- **Environmental Hazards**: Asteroid fields, radiation zones, gravity wells

### **Advanced Features** (Foundation complete)
- **Multiplayer Support**: Network architecture for PvP/coop
- **Procedural Generation**: Star systems, missions, encounters
- **Crafting Systems**: Ship customization, weapon modifications
- **Territory Control**: Faction warfare, station capture
- **Advanced Physics**: Orbital mechanics, gravitational effects

### **Polish & Content** (Core systems solid)
- **Visual Effects**: Enhanced explosions, weapon effects, environmental details
- **Audio Expansion**: Dynamic music, environmental sounds, voice acting
- **UI/UX Improvements**: Better menus, tutorials, accessibility features
- **Performance Optimization**: Rendering improvements, memory management
- **Content Creation**: More ships, weapons, locations, storylines

## 💡 Technical Architecture Notes

### **Target Management System**
- **Preservation Mechanism**: Uses identifying characteristics (name, position, shipName)
- **Wireframe Coordination**: Manages both TargetComputerManager and StarfieldManager systems
- **Array Rebuilding**: Handles target list reconstruction without losing selection
- **Fallback Systems**: Multiple matching strategies for robust restoration

### **Weapon Systems Architecture**
- **Type-Based Mechanics**: `weaponType` property determines targeting capabilities
- **Energy Integration**: Weapons respect ship energy systems and consumption
- **Physics Integration**: Projectiles use Ammo.js for realistic flight and collision
- **Sound Management**: Centralized audio system with positional effects

### **HUD Color System**
- **Faction-Based**: Colors determined by target diplomacy status
- **Consistent Application**: Used across all HUD elements (wireframes, text, borders)
- **Smart Defaults**: Fallback colors for unknown or neutral entities
- **Visual Hierarchy**: Important information highlighted with appropriate colors

## 🎊 Current Project Health: EXCELLENT

**The game is production-ready with sophisticated targeting and combat systems!** All major features are implemented and polished:

- ✅ **Target Management**: Perfect preservation system with identifier-based restoration
- ✅ **Combat Systems**: Complete weapon variety with proper mechanics differentiation  
- ✅ **User Experience**: Intuitive controls with clear feedback and faction colors
- ✅ **Code Quality**: Clean, maintainable codebase with minimal debug noise
- ✅ **Audio/Visual**: Consistent effects with proper positioning and faction theming

**Ready for content creation, gameplay features, and advanced systems.** The technical foundation is rock-solid with sophisticated target management, realistic combat mechanics, and professional code quality. Focus can now shift to gameplay content, enemy AI, missions, and advanced features rather than core system development.

## 📝 Key Implementation Details

### **Target Preservation Algorithm**
```javascript
// Store identifying characteristics
const targetIdentifier = {
    name: previousTargetData.name,
    type: previousTargetData.type, 
    shipName: previousTargetData.ship?.shipName,
    position: {x, y, z} // rounded for reliability
};

// Restore using multiple matching strategies
// 1. Ship name match (most reliable)
// 2. Position match (celestial bodies)
// 3. Name-only fallback
```

### **Weapon Type System**
```javascript
// Beam weapons (scan-hit type)
weaponType: 'scan-hit'        // Supports sub-targeting
targetLockRequired: false     // No lock needed
homingCapability: false       // Instant hit

// Projectile weapons  
weaponType: 'splash-damage'   // Random subsystem damage
targetLockRequired: varies    // Missiles need lock, torpedoes don't
homingCapability: varies      // Missiles home, torpedoes fly straight
```

### **Faction Color Mapping**
```javascript
const factionColors = {
    hostile: '#ff4444',    // Red
    neutral: '#ffff44',    // Yellow  
    friendly: '#44ff44',   // Green
    unknown: '#ffffff'     // White fallback
};
```

This foundation provides everything needed for expanding into advanced gameplay features while maintaining the robust, production-quality codebase we've built. 