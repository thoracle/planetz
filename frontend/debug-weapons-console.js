// Main Game Weapons Debugger - Paste this into your browser console while playing the game

console.log('🔫 Weapons Debug Script Loading...');

// Get the weapons system
const weaponsSystem = viewManager.ship.systems.get('weapons');
const ship = viewManager.ship;

if (!weaponsSystem) {
    console.error('❌ No weapons system found!');
} else {
    console.log('✅ Weapons system found');
    
    // Create debug function
    window.debugWeapons = function() {
        const now = Date.now();
        const status = weaponsSystem.getStatus();
        const isOperational = weaponsSystem.isOperational();
        const canFire = weaponsSystem.canFire();
        const timeSinceLastFire = now - weaponsSystem.lastFireTime;
        const requiredCooldown = weaponsSystem.getShotCooldown();
        const cooldownRemaining = weaponsSystem.currentCooldown || 0;
        
        console.log('\n🔍 === WEAPONS DEBUG REPORT ===');
        console.log(`System Operational: ${isOperational}`);
        console.log(`Can Fire: ${canFire}`);
        console.log(`Weapon Health: ${(status.healthPercentage * 100).toFixed(1)}%`);
        console.log(`Ship Energy: ${ship.currentEnergy.toFixed(1)}/${ship.maxEnergy}`);
        console.log(`Energy per Shot: ${weaponsSystem.getEnergyPerShot()}`);
        console.log(`Last Fire Time: ${weaponsSystem.lastFireTime}`);
        console.log(`Current Time: ${now}`);
        console.log(`Time Since Last Fire: ${timeSinceLastFire}ms`);
        console.log(`Required Cooldown: ${requiredCooldown}ms`);
        console.log(`Current Cooldown: ${cooldownRemaining}ms`);
        console.log(`Fire Rate: ${status.currentFireRate}/sec`);
        console.log(`Weapon Type: ${status.weaponType}`);
        
        // Identify the specific issue
        console.log('\n🔍 === ISSUE ANALYSIS ===');
        if (!isOperational) {
            console.error('❌ ISSUE: Weapon system not operational (health too low?)');
        }
        if (ship.currentEnergy < weaponsSystem.getEnergyPerShot()) {
            console.error('❌ ISSUE: Insufficient energy for firing');
        }
        if (cooldownRemaining > 0) {
            console.error(`❌ ISSUE: Weapon on cooldown for ${cooldownRemaining}ms`);
        }
        if (timeSinceLastFire < requiredCooldown) {
            console.error(`❌ ISSUE: Not enough time since last fire (need ${requiredCooldown}ms, only ${timeSinceLastFire}ms elapsed)`);
        }
        if (isOperational && ship.currentEnergy >= weaponsSystem.getEnergyPerShot() && cooldownRemaining <= 0 && timeSinceLastFire >= requiredCooldown) {
            console.log('✅ All checks passed - weapon should be able to fire!');
        }
        
        return {
            canFire,
            isOperational,
            timeSinceLastFire,
            requiredCooldown,
            cooldownRemaining,
            energy: ship.currentEnergy,
            energyPerShot: weaponsSystem.getEnergyPerShot()
        };
    };
    
    // Create cooldown reset function
    window.resetWeaponsCooldown = function() {
        weaponsSystem.lastFireTime = 0;
        weaponsSystem.currentCooldown = 0;
        console.log('🔄 Weapons cooldown reset!');
        debugWeapons();
    };
    
    // Create force fire function
    window.forceFireWeapons = function() {
        console.log('🔫 Attempting force fire...');
        const result = weaponsSystem.fire(ship);
        if (result) {
            console.log(`✅ Force fire SUCCESS: ${result.damage} damage, ${result.energyConsumed} energy consumed`);
        } else {
            console.error('❌ Force fire FAILED');
            debugWeapons();
        }
        return result;
    };
    
    // Create continuous monitoring
    window.startWeaponsMonitoring = function() {
        console.log('🔍 Starting weapons monitoring (every 2 seconds)...');
        window.weaponsMonitorInterval = setInterval(() => {
            const canFire = weaponsSystem.canFire();
            const cooldown = weaponsSystem.currentCooldown || 0;
            if (!canFire && cooldown > 0) {
                console.log(`⏰ Weapon cooldown: ${cooldown}ms remaining`);
            }
        }, 2000);
    };
    
    window.stopWeaponsMonitoring = function() {
        if (window.weaponsMonitorInterval) {
            clearInterval(window.weaponsMonitorInterval);
            console.log('🛑 Weapons monitoring stopped');
        }
    };
    
    // Enhanced spacebar listener that logs attempts
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !viewManager.starfieldManager?.isDocked) {
            console.log('🎯 SPACEBAR PRESSED - Weapons fire attempt:');
            debugWeapons();
        }
    });
    
    console.log('\n✅ Weapons debug functions loaded!');
    console.log('Available commands:');
    console.log('  debugWeapons() - Show detailed weapons status');
    console.log('  resetWeaponsCooldown() - Reset weapon cooldown');
    console.log('  forceFireWeapons() - Force fire weapons');
    console.log('  startWeaponsMonitoring() - Monitor weapons every 2 seconds');
    console.log('  stopWeaponsMonitoring() - Stop monitoring');
    
    // Run initial debug
    console.log('\n📊 Initial weapons status:');
    debugWeapons();
} 