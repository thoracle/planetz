# AI Team Member Onboarding - PlanetZ

> **Auto-Generated Status**: Run `./scripts/update_restart_streamlined.sh` to refresh git history

## 🎯 Project Overview

**PlanetZ** is a production-ready 3D web-based space simulation game inspired by Star Raiders, Elite and Freelancer. Built with Three.js (frontend) and Flask/Python (backend).

**Core Systems:**
- **3D Space Combat** - Weapons, targeting, shields with raycasting collision detection
- **Mission Framework** - Cargo delivery, elimination, escort missions with unified economy
- **Faction System** - 10 unique factions with diplomatic complexity
- **Collection System** - NFT-style card collection driving gameplay progression
- **Achievement System** - Multi-tier progression with trophy notifications
- **Help Screen 2.0** - ESC-triggered modal with tabbed interface

**Codebase Stats:**
- JavaScript Files: ~7,700 | Python Files: ~3,300
- Architecture: Fully modular ES6+ with Three.js native physics
- Branch: `achievements` | Status: Active development

## 🚨 Critical Do's and Don'ts

### **✅ DO THIS**
- **Use `debug()` instead of `console.log()`** - Channel-based logging system
- **Follow modular ES6+ patterns** - Import/export, class-based architecture
- **Test with debug channels** - Enable specific logging for your area
- **Check existing patterns** - Look for similar implementations before creating new ones
- **Use absolute paths** - `/Users/retroverse/Desktop/LLM/planetz/` for tool calls

### **❌ DON'T DO THIS**
- **Don't use `console.log()`** - Use `debug(channel, message)` instead
- **Don't create new files unnecessarily** - Prefer editing existing files
- **Don't ignore the debug system** - It's essential for development
- **Don't bypass the event system** - Use existing event patterns
- **Don't break the modular architecture** - Maintain clean separation of concerns
- **Don't use defensive programming** - We're in development so it's better to crash and find bugs faster than to hide them behind fallbacks.

## 🔧 Debug System Usage

**This project uses a smart debug logging system instead of console.log().**

### **Basic Usage**
```javascript
// ✅ CORRECT - Use debug() with appropriate channel
debug('TARGETING', 'Target acquired:', target.name);
debug('MISSIONS', 'Mission completed:', mission.title);
debug('P1', 'CRITICAL: System initialization failed');

// ❌ WRONG - Don't use console.log()
console.log('Target acquired:', target.name);
```

### **Debug Channels**
- **P1** - Critical system messages (always visible)
- **TARGETING** - Weapon/targeting system
- **MISSIONS** - Mission system activity
- **COMBAT** - Weapon firing, damage, AI
- **STAR_CHARTS** - Navigation, discovery
- **ACHIEVEMENTS** - Achievement tracking
- **MONEY** - Credits, transactions
- **UTILITY** - General system operations

### **Enable/Disable Channels**
```javascript
// In browser console
debugEnable('TARGETING');           // Enable single channel
debugEnable('MISSIONS', 'COMBAT');  // Enable multiple channels
debugDisable('TARGETING');          // Disable channel
debugStatus();                      // Show current channel status
```

### **Configuration File**
Debug settings persist in: `frontend/static/js/debug_config.json`
- Automatically created on first use
- Survives page reloads
- Can be manually edited

## 📚 Recent Git History

<!-- DYNAMIC_GIT_START -->
**Last 5 Commits:**
- `385f203` 🔧 Fix achievement display bug showing checkmarks for incomplete achievements
- `a1e63ab` 🎯 Complete Help Screen 2.0 + Star Charts Subsystem Bug Fix
- `f855691` fix: Add missing refreshShipsLogDisplay method in HelpInterface
- `1b4ea8c` feat: Implement single source of truth for card inventory system
- `8bd0b7a` ✨ Implement Help Screen 2.0 with Tabbed Interface
<!-- DYNAMIC_GIT_END -->

## 🎉 Latest Issues Solved

### **Achievement Display Bug** ✅ **JUST FIXED**
- **Issue**: Achievements showing checkmarks (✅) and "Unlocked" status for incomplete progress
- **Root Cause**: Corrupted localStorage data marking achievements as unlocked incorrectly
- **Solution**: Added data validation, display-time safety checks, and debug helpers
- **Files**: `frontend/static/js/systems/AchievementSystem.js`

### **Help Screen 2.0 Implementation** ✅ **COMPLETED**
- **Feature**: ESC-triggered modal help screen with 4 tabs (Help, Ship's Log, Achievements, Collection, About)
- **Integration**: Game pause/resume, tab navigation, context-sensitive content
- **Files**: `frontend/static/js/ui/HelpInterface.js`, `frontend/static/js/views/StarfieldManager.js`

### **Single Source of Truth - Card Inventory** ✅ **COMPLETED**
- **Issue**: Data inconsistencies between ESC collection view and station collection view
- **Solution**: Unified inventory object, removed 100+ lines of sync code
- **Impact**: Perfect data parity, simplified architecture, better performance

## 🚧 Current Development Priorities

1. **Achievement System Polish** - Trophy notifications, faction-based ranks
2. **Mission System Enhancement** - New mission types, complexity scaling
3. **UI/UX Polish** - Visual feedback improvements, accessibility
4. **Performance Optimization** - Three.js rendering, memory management
5. **Content Expansion** - New ships, stations, gameplay elements

## ✅ Recent Major Fixes (January 2025)

### **Discovery & Targeting System Overhaul**
**Status**: **COMPLETED** - All critical issues resolved

**Critical Issues Fixed**:
- **Infinite Recursion Loop**: Fixed stack overflow in discovery color update system
- **Cross-Sector Contamination**: A0 targets no longer appear in B1 target computer
- **Discovery Color Bug**: Discovered objects now show correct faction colors (yellow for neutral)
- **Duplicate Ship's Log**: Fixed duplicate discovery notifications in ship's log
- **Console Log Spam**: Reduced repetitive debug output by 90%
- **Variable Scoping Errors**: Fixed `orbitRadius`, `angle`, `moonOrbitRadius` ReferenceErrors

**Key Files Modified**:
- `TargetComputerManager.js` - Wireframe colors, discovery detection, sector validation
- `StarChartsTargetComputerIntegration.js` - Discovery notifications, cache management  
- `StarChartsManager.js` - Duplicate prevention, notification cooldowns
- `SolarSystemManager.js` - Variable scoping, backend positioning integration
- `MissionAPIService.js` - Debug channel migration

**Technical Solutions**:
- **Nuclear Cache Clearing**: Comprehensive cache management during warp transitions
- **Fail-Fast Sector Validation**: Aggressive cross-sector contamination prevention
- **Notification Cooldowns**: 5-second duplicate prevention for discovery messages
- **Safe Wireframe Recreation**: Non-recursive color updates for discovered objects

**Testing Tools**: Use `debug_discovery_targeting.js` for comprehensive system diagnostics

## 🏗️ Key Architecture Patterns

### **File Structure**
```
frontend/static/js/
├── ship/systems/          # Weapons, targeting, shields
├── ui/                    # User interface components
├── views/                 # Main game views (StarfieldManager)
├── services/              # Data services, APIs
├── systems/               # Game systems (achievements, missions)
└── debug.js               # Debug logging system
```

### **Event System**
```javascript
// Use existing event patterns
this.eventBus.emit('achievement:earned', achievementData);
this.eventBus.on('mission:completed', (mission) => { /* handle */ });
```

### **Service Pattern**
```javascript
// Services are singletons with clear interfaces
export class AchievementService {
    constructor() { /* init */ }
    increment(category, amount, context) { /* logic */ }
    getProgress(category) { /* return data */ }
}
```

## 🧪 Testing & Debug Tools

### **Debug Helpers (Browser Console)**
```javascript
// Achievement system
checkAchievements()        // Show achievement status
fixAchievements()          // Fix corrupted data
testAchievement(count)     // Test with discovery count

// Mission system  
debugEnable('MISSIONS')    // Enable mission logging
showMissionStatus()        // Show current missions

// General debugging
debugStatus()              // Show all debug channel states
```

### **Test Files**
- `test_achievement_fix.html` - Achievement system testing
- `tests/playwright/` - Automated browser tests
- `backend/tests/` - Python unit tests

## 🎮 Game Controls Reference

**Essential Controls:**
- **ESC** - Help Screen 2.0 (modal interface)
- **TAB** - Cycle targets
- **Z,X** - Cycle Sub-system targets
- **<,>** - Cycle weapon selection
- **SPACE** - Fire weapons
- **Arrow Keys** - Ship movement
- **0-9 Keys** - Ship impulse engine speed

**Debug Controls:**
- **H** - Shows message to use ESC instead
- **F12** - Browser console for debug commands

## 💡 Quick Start Tips

1. **Enable debug channels** for your work area first
2. **Check existing implementations** before creating new patterns
3. **Use the help screen** (ESC) to understand current systems
4. **Test with browser console** debug helpers
5. **Follow the modular architecture** - don't create monolithic files

## ⚠️ Open Issues

### **Performance Optimization Needed**
- **Area**: Three.js rendering pipeline
- **Impact**: Frame drops during complex scenes
- **Priority**: Medium - affects user experience

### **Achievement System Enhancement**
- **Area**: Faction-based rank progression
- **Status**: Planned implementation
- **Priority**: High - core feature for Help Screen 2.0

### **Mission System Expansion**
- **Area**: New mission types and complexity
- **Status**: Active development
- **Priority**: Medium - content expansion

---

**Need Help?** Check the full documentation in `docs/` or enable relevant debug channels to see system activity in real-time.

**Update This File**: Run `./scripts/update_restart_streamlined.sh` to refresh git history and status.
