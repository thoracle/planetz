# AI Team Member Onboarding - PlanetZ

> **Auto-Generated Status**: Run `./scripts/update_restart_streamlined.sh` to refresh git history

## 🎯 Project Overview

**PlanetZ** is a production-ready 3D web-based space simulation game inspired by Star Raiders, Elite and Freelancer. Built with Three.js (frontend) and Flask/Python (backend).

**Core Systems:**
- **3D Space Combat** - Weapons, targeting, shields with raycasting collision detection
- **Discovery System** - Object discovery with synchronized wireframe colors and faction standings
- **Mission Framework** - Cargo delivery, elimination, escort missions with unified economy
- **Faction System** - 10 unique factions with diplomatic complexity
- **Collection System** - NFT-style card collection driving gameplay progression
- **Achievement System** - Multi-tier progression with trophy notifications
- **Help Screen 2.0** - ESC-triggered modal with tabbed interface

**Codebase Stats:**
- JavaScript Files: ~7,700 | Python Files: ~3,300
- Architecture: Fully modular ES6+ with Three.js native physics
- Branch: `main` | Status: Production

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
**Last 10 Commits:**
- `82fba2b` refactor: Extract app.js bootstrap and PhysicsManager debug visualization
- `afaa470` refactor: Extract CardInventoryUI into focused manager modules
- `49c44a4` docs: Update restart.md with security hardening v2.1.5
- `4284aa2` test: Fix strict mode violations in tooltip tests
- `da1bbbe` test: Fix test_canvas_context_available fallback container check
- `d9c986f` test: Fix 11 failing Playwright tests with proper skip conditions
- `eb6537e` docs: Update CLAUDE.md with SECRET_KEY and environment configuration
- `ca9443d` docs: Add .env.example with all environment variables
- `b1fd0ae` fix: Remove hardcoded SECRET_KEY, generate random key for development
- `4b5ff1b` docs: Update CLAUDE.md with security hardening changes
<!-- DYNAMIC_GIT_END -->

## 🎉 Latest Issues Solved

### **Phase 2 Refactoring - God Class Extraction** ✅ **JUST COMPLETED** *(Jan 10, 2026)*
- **CardInventoryUI.js**: 1,469 → 771 lines (-47.5%)
  - Extracted `CUIShopModeManager.js` (299 lines) - shop/inventory container management
  - Extracted `CUIUICreator.js` (284 lines) - UI element creation
  - Extracted `CUICardUpgradeManager.js` (204 lines) - card upgrade logic
  - Extracted `CUICardSlotManager.js` (203 lines) - card installation/removal
  - Previously extracted: `CUIShipConfigManager.js`, `CUIStyleManager.js`, `CUITestDataLoader.js`
- **app.js**: 2,507 → 212 lines (-91.5%)
  - Bootstrap logic extracted to focused modules
  - Now serves as thin orchestration layer
- **PhysicsManager.js**: 2,319 → 1,658 lines (-28.5%)
  - Debug visualization moved to `PhysicsDebugVisualizer.js`
- **Pattern**: Delegation via thin wrapper methods calling manager classes
- **Testing**: 1,281 backend tests passed, 9 ship logic tests passed
- **Commits**: `afaa470`, `82fba2b` pushed to main

### **Security Hardening v2.1.5** ✅ **COMPLETED** *(Jan 10, 2026)*
- **Release**: `v2.1.5-security-final` tag created and pushed
- **Security Headers**: Added comprehensive HTTP security headers via Flask middleware
  - Content-Security-Policy (CSP) with CDN allowances for Three.js, Google Fonts
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy (restricts geolocation, microphone, camera)
- **SECRET_KEY Fix**: Removed hardcoded secret key, now uses environment variable
  - Development: Auto-generates random key with warning
  - Production: Requires `FLASK_SECRET_KEY` environment variable
  - Added `.env.example` template for configuration
- **Exception Handling**: Replaced 15+ broad `except Exception` handlers with specific exceptions
  - `json.JSONDecodeError` for JSON parsing
  - `KeyError`, `ValueError`, `TypeError` for data validation
  - `FileNotFoundError`, `IOError` for file operations
  - Improved error messages and logging
- **Test Suite**: Fixed all failing Playwright tests (106 passed, 21 skipped, 0 failed)
  - Added proper skip conditions for headless browser limitations
  - Fixed strict mode violations (multiple element locators)
  - Fixed JSON serialization in page.evaluate() calls
- **Files**: `backend/__init__.py`, `backend/routes/*.py`, `backend/mission_system/*.py`, `.env.example`

### **Keyboard Mappings & Audio System** ✅ **COMPLETED** *(Jan 8, 2026)*
- **Issue**: Keyboard mappings didn't match ESC help menu documentation; audio played fallback beeps instead of actual sound files
- **Root Causes**:
  - F key was mapped to Diplomacy (should be Fore View)
  - A key was mapped to Autofire (should be Aft View)
  - D key fell through to Damage Control (should be Diplomacy)
  - / and Q keys were not implemented
  - Audio path was relative (`static/audio/`) causing loading failures
  - Fallback beeps silently masked audio loading problems
- **Solution**:
  - Fixed keyboard mappings in `KeyboardInputManager.js` and `VMKeyboardHandler.js`
  - Added sound effects for F/A view switching
  - Implemented / key for Autofire toggle, Q key for training targets
  - Fixed audio path to absolute (`/static/audio/`)
  - Removed fallback beeps - now logs clear errors when audio fails
- **Files**: `KeyboardInputManager.js`, `VMKeyboardHandler.js`, `StarfieldAudioManager.js`, `CommandAudioManager.js`

### **Docking System Silent Failure** ✅ **FIXED** *(Jan 8, 2026)*
- **Issue**: Clicking dock button in docking modal failed silently
- **Root Cause**: `SimpleDockingManager` class was imported in `app.js` but never passed to `StarfieldManager`, so `DockingOperationsManager.initializeSimpleDocking()` couldn't instantiate it
- **Solution**: Pass `SimpleDockingManager` class through the initialization chain and store for deferred use
- **Files**: `app.js`, `StarfieldManager.js`, `DockingOperationsManager.js`

### **Console Violation Cleanup - Complete** ✅ **COMPLETED** *(Jan 1, 2026)*
- **Issue**: 200+ `console.log/warn/error` statements scattered across codebase instead of using `debug()` system
- **Solution**: Systematic migration to `debug(channel, message)` pattern across all major files
- **Files Fixed (21 total)**:
  - **Major Files**: SolarSystemManager.js, WaypointManager.js, app.js, PhysicsManager.js, SimpleDockingManager.js
  - **Warp System**: WarpDrive.js, WarpDriveManager.js, WarpDriveAdapter.js, WarpEffects.js, WarpFeedback.js
  - **Waypoint System**: WaypointAction.js, WaypointPersistence.js, WaypointKeyboardHandler.js, GiveItemAction.js, GiveRewardAction.js, PlayCommAction.js, ShowMessageAction.js, SpawnShipsAction.js
  - **Utilities**: SectorNavigation.js, SpatialManager.js, chunkManager.js
- **Pattern Used**:
  - `console.error(msg)` → `debug('P1', msg)` (critical errors)
  - `console.warn(msg)` → `debug('P1', msg)` (warnings)
  - `console.log(msg)` → `debug('CHANNEL', msg)` (appropriate channel: NAVIGATION, WAYPOINTS, UTILITY, etc.)
- **Result**: Clean codebase with consistent debug channel usage; remaining console statements are intentional (debug infrastructure, user-facing commands)

### **Directional Arrows for Unknown Targets** ✅ **FIXED** *(Sept 30, 2025)*
- **Issue**: Directional arrows not showing for undiscovered/unknown targets when off-screen
- **Root Causes**: 
  - Arrow z-index (9999) was below UI elements (10000-20000)
  - Setting `display: block` broke flexbox centering needed for CSS triangle arrows
  - Explicitly setting transparent borders was overriding border-style properties
- **Solution**: 
  - Increased arrow z-index to 25000 (above all UI)
  - Changed to `display: flex` to maintain triangle centering
  - Only update visible border color, preserve original border configuration
- **Testing**: Comprehensive diagnostic logging to trace arrow visibility issues
- **Files**: `frontend/static/js/views/TargetComputerManager.js`
- **Result**: Teal arrows (#44ffff) now visible for unknown targets, all diplomacy states working

### **Console Cleanup & Debug Management** ✅ **COMPLETED** *(Sept 30, 2025)*
- **Issue**: Excessive debug logging making console difficult to read for debugging
- **Solution**: 
  - Moved verbose logs to debug channels (TARGETING, STAR_CHARTS)
  - Removed spammy version banners and debug test messages
  - Added `debug-config.json` for persistent channel management
  - Cleaned up TARGET DEBUG, viewBox, and restorePreviousView logs
- **Files**: `frontend/static/js/views/StarChartsManager.js`, `TargetComputerManager.js`, `StarChartsUI.js`, `ViewManager.js`
- **Result**: Clean console output, easy channel enable/disable via config file

### **Achievement Display Bug** ✅ **FIXED**
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

1. **Security Hardening** ✅ **COMPLETED** - v2.1.5-security-final released
2. **Phase 2 Refactoring** ✅ **MOSTLY COMPLETE** - God class extraction done
   - CardInventoryUI, app.js, PhysicsManager extracted
   - Remaining: Phase 2.4 (minor UI components) - optional
3. **Phase 3 Refactoring** 🔄 **UP NEXT** - Frontend infrastructure improvements
4. **Achievement System Polish** - Trophy notifications, faction-based ranks
5. **Mission System Enhancement** - New mission types, complexity scaling
6. **Performance Optimization** - Three.js rendering, memory management

## ✅ Recent Major Fixes (January 2026)

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

**Navigation:**
- **F** - Forward (Fore) View
- **A** - Aft View
- **Arrow Keys** - Ship attitude control
- **0-9 Keys** - Impulse engine speed

**Systems:**
- **ESC** - Help Screen 2.0 (modal interface)
- **D** - Diplomacy Report
- **O** - Operations Report (Damage Control)
- **S** - Shield toggle
- **L** - Long Range Scanner
- **G** - Galactic Chart
- **P** - Proximity Detector

**Combat:**
- **TAB** - Cycle targets
- **T** - Toggle Target Computer
- **Z,X** - Cycle sub-system targets
- **<,>** - Cycle weapon selection
- **SPACE** - Fire weapons
- **/** - Toggle Autofire

**Debug:**
- **Q** - Spawn training targets
- **F12** - Browser console for debug commands

## 💡 Quick Start Tips

1. **Enable debug channels** for your work area first
2. **Check existing implementations** before creating new patterns
3. **Use the help screen** (ESC) to understand current systems
4. **Test with browser console** debug helpers
5. **Follow the modular architecture** - don't create monolithic files

## ✅ Recent Fixes

### **Discovery System Overhaul** *(Completed)*
- **Issue**: Wireframe colors not matching discovery/faction status
- **Solution**: Complete synchronization between TargetComputer and StarCharts systems
- **Files Modified**: `TargetComputerManager.js`, `StarChartsManager.js`
- **Result**: Perfect wireframe color accuracy with faction-based diplomacy

## ⚠️ Open Issues

### **Production Deployment Notes**
- **Security**: Set `FLASK_SECRET_KEY` environment variable before deploying
- **Template**: See `.env.example` for all required environment variables
- **Headers**: Security headers automatically applied via Flask middleware

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
