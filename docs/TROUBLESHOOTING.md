# Planetz Troubleshooting Guide

## 🚀 Recent Major System Fixes

### Equipment Synchronization System Fix (v2024.12.1)

#### Problem Analysis
After docking at stations and changing equipment, the ship's systems weren't properly synchronized with the new gear configuration. This manifested in several ways:

1. **Weapons HUD Desynchronization**: The weapon display showed old weapons instead of newly installed ones
2. **System Activation Failure**: New systems (Radio, Chart, Scanner) were present but unresponsive to key commands
3. **Damage Control Workaround**: Systems would mysteriously start working after opening the damage control HUD

#### Root Cause Investigation
The issue was in the launch sequence chain:
```
undock() → initializeShipSystems() → [Missing card system refresh]
```

Meanwhile, the damage control HUD was doing the missing step:
```javascript
// Damage control was doing this critical refresh:
ship.cardSystemIntegration.loadCards().then(() => {
    ship.cardSystemIntegration.createSystemsFromCards().then(() => {
        // Systems now worked properly
    });
});
```

#### Technical Solution
Enhanced the `initializeShipSystems()` method in `StarfieldManager.js`:

```javascript
async initializeShipSystems() {
    console.log('🚀 Initializing ship systems for launch');
    
    const ship = this.viewManager?.getShip();
    if (!ship) return;

    // CRITICAL: Force refresh ship systems from current card configuration
    if (ship && ship.cardSystemIntegration) {
        console.log('  🔄 Refreshing ship systems from card configuration...');
        await ship.cardSystemIntegration.loadCards();
        await ship.cardSystemIntegration.createSystemsFromCards();
        console.log('  ✅ Ship systems refreshed from current card configuration');
    }

    // Initialize all systems with fresh configuration
    await this.initializeWeaponSystems();
    // ... rest of system initialization
}
```

#### Weapon HUD Synchronization
Enhanced weapon system initialization to use WeaponSyncManager:

```javascript
async initializeWeaponSystems() {
    const ship = this.viewManager?.getShip();
    
    // Force weapon system refresh using WeaponSyncManager
    if (ship && ship.weaponSyncManager) {
        await ship.weaponSyncManager.initializeWeapons();
        ship.weaponSyncManager.refreshWeaponHUD();
        console.log('  ✅ Weapon systems synchronized with HUD');
    }
}
```

### StarfieldManager Global Access Fix (v2024.12.1)

#### Problem Analysis
Development and testing tools couldn't reliably access the StarfieldManager instance because:
1. **Timing Issues**: `window.starfieldManager` was undefined during async initialization
2. **Scope Problems**: StarfieldManager was created inside DOMContentLoaded event but not globally exposed
3. **Testing Failures**: Debug scripts failed with "StarfieldManager not found" errors

#### Technical Solution
1. **Global Exposure in app.js**:
```javascript
// After StarfieldManager creation
window.starfieldManager = starfieldManager;
window.starfieldManagerReady = true;
console.log('✅ StarfieldManager exposed globally');
```

2. **Utility Functions in starfield-manager-utils.js**:
```javascript
async function waitForStarfieldManager(timeout = 10000) {
    const start = Date.now();
    while (!window.starfieldManager) {
        if (Date.now() - start > timeout) {
            throw new Error('StarfieldManager not available after timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.starfieldManager;
}
```

3. **Safe Script Loading Pattern**:
```javascript
// Modern approach for test scripts
await waitForStarfieldManager();
const ship = window.starfieldManager.viewManager.getShip();
console.log('✅ Safe access to ship systems');
```

### Undock Cooldown User Experience Fix (v2024.12.1)

#### Problem Analysis
After launching from stations, the targeting computer was silently blocked for 30 seconds:
- TAB key was completely unresponsive
- No user feedback explaining why
- Players thought the game was broken

#### Root Cause
In `StarfieldManager.js` TAB key handler:
```javascript
// Silent blocking with no feedback!
if (this.undockCooldown && Date.now() < this.undockCooldown) {
    return; 
}
```

#### Technical Solution
Enhanced the TAB key handler with comprehensive user feedback:

```javascript
if (this.undockCooldown && Date.now() < this.undockCooldown) {
    const remainingTime = Math.ceil((this.undockCooldown - Date.now()) / 1000);
    
    // Clear user feedback with countdown
    this.showMessage(
        `TARGETING SYSTEMS WARMING UP - Systems initializing after launch - ${remainingTime}s remaining`,
        'error',
        2000
    );
    
    // Audio feedback
    this.audioManager?.playSound('command_failed');
    return;
}
```

#### Cooldown Duration Optimization
- **Reduced from 30 seconds to 10 seconds** for better user experience
- **Maintained system integrity** while improving responsiveness
- **Added clear countdown timer** so players know exactly how long to wait

## 🛠️ Debugging Tools & Utilities

### Test Scripts Available

#### 1. Equipment Synchronization Testing
**File**: `test-equipment-sync-simple.js`
```javascript
// Load via console:
var script = document.createElement('script');
script.src = '/test-equipment-sync-simple.js';
document.head.appendChild(script);
```

**Tests**:
- Equipment synchronization after docking
- Weapon HUD accuracy
- System responsiveness
- Card integration functionality

#### 2. StarfieldManager Availability Testing  
**File**: `test-starfield-ready.js`
```javascript
// Load via console:
var script = document.createElement('script');
script.src = '/test-starfield-ready.js';  
document.head.appendChild(script);
```

**Tests**:
- Global availability of StarfieldManager
- Timing of initialization
- Access to ship systems
- API availability

### Console Debugging Commands

#### Basic System Status
```javascript
// Get ship instance
const ship = window.starfieldManager.viewManager.getShip();

// Check all systems
ship.systems.forEach(sys => {
    console.log(`${sys.name}: ${sys.isOperational() ? '✅' : '❌'} (${sys.health}%)`);
});

// Check weapon synchronization
if (ship.weaponSyncManager) {
    console.log('Weapon Status:', ship.weaponSyncManager.getWeaponStatus());
}
```

#### Equipment Synchronization Check
```javascript
// Check card system integration
const cardIntegration = ship.cardSystemIntegration;
console.log('Card Integration Status:', cardIntegration ? '✅' : '❌');

// Force refresh if needed
if (cardIntegration) {
    await cardIntegration.loadCards();
    await cardIntegration.createSystemsFromCards();
    console.log('✅ Forced card system refresh completed');
}
```

#### Targeting System Debug
```javascript
// Check targeting computer status
const targetingComputer = ship.getSystem('Target Computer');
console.log('Targeting Computer:', targetingComputer ? '✅' : '❌');

// Check undock cooldown
const starfieldManager = window.starfieldManager;
const cooldownRemaining = starfieldManager.undockCooldown - Date.now();
console.log('Undock Cooldown:', cooldownRemaining > 0 ? `${cooldownRemaining}ms` : 'None');
```

## 🔍 Common Issue Patterns

### 1. System Not Responding Pattern
**Symptoms**: Specific systems don't respond to key presses
**Investigation Steps**:
1. Check system installation: `ship.getSystem('System Name')`
2. Verify system health: `system.health > 0`
3. Check energy availability: `ship.energy >= system.energyConsumption`
4. Confirm key focus: Click on game viewport

### 2. Equipment Change Not Applied Pattern
**Symptoms**: Changes made at station don't take effect
**Investigation Steps**:
1. Verify card installation completed
2. Check if undocked properly (triggers system refresh)
3. Force refresh: `await ship.cardSystemIntegration.createSystemsFromCards()`
4. Check for JavaScript errors in console

### 3. Performance Degradation Pattern
**Symptoms**: Game becomes slow or unresponsive
**Investigation Steps**:
1. Check FPS: Ctrl+D (Cmd+D on Mac)
2. Monitor memory usage in browser dev tools
3. Look for worker thread errors
4. Restart browser if memory leaks detected

## 📋 Maintenance & Updates

### System Health Monitoring
```javascript
// Automated health check
function systemHealthCheck() {
    const ship = window.starfieldManager?.viewManager?.getShip();
    if (!ship) return 'No ship available';
    
    const report = {
        shipHealth: ship.hull,
        energyLevel: ship.energy,
        systemsOperational: ship.systems.filter(s => s.isOperational()).length,
        systemsTotal: ship.systems.length,
        weaponSyncStatus: ship.weaponSyncManager ? 'Active' : 'Inactive'
    };
    
    console.table(report);
    return report;
}

// Run every 30 seconds for monitoring
setInterval(systemHealthCheck, 30000);
```

### Performance Optimization
```javascript
// Clear accumulated data periodically
function performanceMaintenance() {
    // Clear old THREE.js objects
    if (window.starfieldManager?.renderer) {
        window.starfieldManager.renderer.renderLists.dispose();
    }
    
    // Force garbage collection hint
    if (window.gc) window.gc();
    
    console.log('🧹 Performance maintenance completed');
}
```

## 🚨 Emergency Procedures

### Complete System Reset
```javascript
// Nuclear option - complete game state reset
function emergencyReset() {
    // Clear local storage
    localStorage.clear();
    
    // Reload page
    window.location.reload();
}
```

### Safe System Restart
```javascript
// Gentler restart that preserves progress
async function safeRestart() {
    const ship = window.starfieldManager?.viewManager?.getShip();
    
    // Save current state
    if (ship) {
        console.log('💾 Saving current ship state...');
        // Ship auto-saves to localStorage
    }
    
    // Reinitialize systems
    if (window.starfieldManager) {
        await window.starfieldManager.initializeShipSystems();
        console.log('🔄 Systems reinitialized');
    }
}
```

## 📞 Support & Reporting

### Bug Report Template
When reporting issues, include:

```
**Environment**:
- Browser: [Chrome/Firefox/Safari] Version [X.X]
- OS: [Windows/Mac/Linux]
- Screen Resolution: [1920x1080]

**Issue Description**:
[Detailed description of the problem]

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [Result observed]

**Console Output**:
[Copy/paste any error messages from F12 Developer Tools]

**System State**:
[Run systemHealthCheck() and paste results]

**Expected Behavior**:
[What should have happened]
```

### Self-Diagnosis Checklist
Before reporting, try:
- [ ] Refresh the page
- [ ] Check browser console for errors (F12)
- [ ] Verify game viewport has focus (click on it)
- [ ] Run `systemHealthCheck()` in console
- [ ] Test in incognito/private browsing mode
- [ ] Try different browser if available

This comprehensive troubleshooting guide should help identify and resolve most common issues with the Planetz game system. 