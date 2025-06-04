(function() {
    console.log('🔧 DAMAGE CONTROL SYSTEMS DEBUG - Quick Check');
    
    function debugSystemsDisplay() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship) {
            console.error('❌ No ship found');
            return;
        }
        
        console.log('\\n🔍 SHIP SYSTEM ANALYSIS:');
        
        // 1. Get ship status
        const shipStatus = ship.getStatus();
        console.log('1. Ship.getStatus().systems:', Object.keys(shipStatus.systems));
        
        // 2. Check ship.systems Map directly
        if (ship.systems && ship.systems instanceof Map) {
            console.log('2. Ship.systems Map keys:', Array.from(ship.systems.keys()));
        }
        
        // 3. Check unified weapon system
        if (ship.weaponSystem) {
            console.log('3. Ship.weaponSystem exists:', ship.weaponSystem.constructor.name);
            console.log('   Weapon slots:', ship.weaponSystem.weaponSlots?.length || 0);
        } else {
            console.log('3. Ship.weaponSystem: NOT FOUND');
        }
        
        // 4. Check what damage control is showing
        const damageControlGrid = document.getElementById('damage-control-systems-grid');
        if (damageControlGrid) {
            const systemCards = damageControlGrid.querySelectorAll('.system-card');
            console.log('4. Damage Control showing', systemCards.length, 'system cards');
            
            systemCards.forEach((card, index) => {
                const nameElement = card.querySelector('.system-name');
                const name = nameElement ? nameElement.textContent : 'Unknown';
                console.log(`   Card ${index + 1}: ${name}`);
            });
        } else {
            console.log('4. Damage Control grid not found or not visible');
        }
        
        // 5. Force refresh damage control
        if (window.starfieldManager && window.starfieldManager.damageControlHUD) {
            console.log('5. Force refreshing damage control...');
            window.starfieldManager.damageControlHUD.forceRefresh();
        }
    }
    
    // Run immediately
    debugSystemsDisplay();
    
    // Also make it available globally for manual testing
    window.debugSystemsDisplay = debugSystemsDisplay;
    
    console.log('💡 Run debugSystemsDisplay() in console to check again');
})(); 