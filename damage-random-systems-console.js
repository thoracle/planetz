// JavaScript Console Script: Damage Random Systems
// Copy and paste this into your browser's JavaScript console while the game is running

(function() {
    console.log('=== Random System Damage Script ===');
    
    // Check if viewManager is available
    if (typeof window.viewManager === 'undefined' || !window.viewManager) {
        console.error('❌ ViewManager not found. Make sure the game is loaded.');
        return;
    }
    
    // Check if starfieldManager is available
    const starfieldManager = window.viewManager.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found. Make sure the game is fully initialized.');
        return;
    }
    
    // Check if ship is available
    const ship = window.viewManager.getShip();
    if (!ship) {
        console.error('❌ No ship available. Make sure you\'re in the game.');
        return;
    }
    
    console.log('✅ Found ship:', ship.name || 'Unknown Ship');
    console.log('✅ Ship systems available:', Array.from(ship.systems.keys()));
    
    // Function to show current system health
    function showSystemHealth() {
        console.log('🔍 Current System Health:');
        const shipStatus = ship.getStatus();
        for (const [systemName, systemInfo] of Object.entries(shipStatus.systems)) {
            const health = (systemInfo.health * 100).toFixed(1);
            const status = systemInfo.isActive ? 'ACTIVE' : 'INACTIVE';
            const operational = systemInfo.canBeActivated ? 'OPERATIONAL' : 'OFFLINE';
            console.log(`  ${systemName}: ${health}% (${status}, ${operational})`);
        }
    }
    
    // Function to damage random systems using StarfieldManager's method
    function damageRandomSystems() {
        console.log('🔧 Damaging random ship systems...');
        console.log('📊 System health BEFORE damage:');
        showSystemHealth();
        
        starfieldManager.debugDamageRandomSystems();
        
        console.log('📊 System health AFTER damage:');
        showSystemHealth();
        
        // Force update the damage control display if it's visible
        if (starfieldManager.damageControlVisible) {
            console.log('🔄 Forcing damage control display update...');
            starfieldManager.updateShipSystemsDisplay();
        }
        
        console.log('✅ Random damage applied successfully!');
        return 'Systems damaged';
    }
    
    // Function to damage hull using StarfieldManager's method
    function damageHull() {
        console.log('🛡️ Damaging ship hull...');
        const beforeHull = ship.currentHull;
        starfieldManager.debugDamageHull();
        const afterHull = ship.currentHull;
        console.log(`Hull: ${beforeHull} → ${afterHull} (${((afterHull/ship.maxHull)*100).toFixed(1)}%)`);
        console.log('✅ Hull damage applied successfully!');
        return 'Hull damaged';
    }
    
    // Function to drain energy using StarfieldManager's method
    function drainEnergy() {
        console.log('⚡ Draining ship energy...');
        const beforeEnergy = ship.currentEnergy;
        starfieldManager.debugDrainEnergy();
        const afterEnergy = ship.currentEnergy;
        console.log(`Energy: ${beforeEnergy.toFixed(1)} → ${afterEnergy.toFixed(1)} (${((afterEnergy/ship.maxEnergy)*100).toFixed(1)}%)`);
        console.log('✅ Energy drained successfully!');
        return 'Energy drained';
    }
    
    // Function to repair all systems using StarfieldManager's method
    function repairAll() {
        console.log('🔧 Repairing all ship systems...');
        console.log('📊 System health BEFORE repair:');
        showSystemHealth();
        
        starfieldManager.debugRepairAllSystems();
        
        console.log('📊 System health AFTER repair:');
        showSystemHealth();
        console.log('✅ All systems repaired successfully!');
        return 'All systems repaired';
    }
    
    // Function to show damage control view
    function showDamageControl() {
        if (!starfieldManager.damageControlVisible) {
            console.log('📊 Opening damage control view...');
            starfieldManager.toggleDamageControl();
        } else {
            console.log('📊 Damage control view is already open');
        }
        return 'Damage control toggled';
    }
    
    // Expose functions globally for easy console access
    window.damageRandomSystems = damageRandomSystems;
    window.damageHull = damageHull;
    window.drainEnergy = drainEnergy;
    window.repairAll = repairAll;
    window.showDamageControl = showDamageControl;
    window.showSystemHealth = showSystemHealth;
    
    console.log('🎮 Damage functions loaded! Available commands:');
    console.log('  damageRandomSystems()     - Damage 2-4 random systems');
    console.log('  damageHull()              - Damage hull by 30-70%');
    console.log('  drainEnergy()             - Drain 30-80% energy');
    console.log('  repairAll()               - Repair everything to 100%');
    console.log('  showDamageControl()       - Open damage control view');
    console.log('  showSystemHealth()        - Show current system health');
    console.log('');
    console.log('💡 You can also use the keyboard shortcuts:');
    console.log('  Ctrl+Shift+V - Damage random systems');
    console.log('  Ctrl+Shift+M - Damage hull');
    console.log('  Ctrl+Shift+N - Drain energy');
    console.log('  Ctrl+Shift+B - Repair all systems');
    console.log('  D - Toggle damage control view');
    console.log('');
    console.log('🚀 Ready to use! Try: damageRandomSystems()');
    
    return {
        status: 'loaded',
        ship: ship.name || 'Unknown Ship',
        systems: Array.from(ship.systems.keys()).length
    };
})(); 