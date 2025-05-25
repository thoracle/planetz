// Final debug weapons system via starfieldManager
// Fixes: Use ship.currentEnergy and debug levelStats

console.log('=== Final Weapons Debug ===');

// Check if starfieldManager exists and has ship
if (typeof starfieldManager !== 'undefined' && starfieldManager) {
    console.log('StarfieldManager found:', starfieldManager);
    
    if (starfieldManager.ship) {
        const ship = starfieldManager.ship;
        console.log('Ship found:', ship);
        
        // Use Map.get() to access weapons system
        if (ship.systems && ship.systems.get('weapons')) {
            const weapons = ship.systems.get('weapons');
            console.log('Weapons system found:', weapons);
            
            // Debug levelStats initialization
            console.log('Weapons levelStats:', weapons.levelStats);
            console.log('Weapons level 1 stats:', weapons.levelStats[1]);
            console.log('Base fire rate:', weapons.baseFireRate);
            console.log('Base damage:', weapons.baseDamage);
            console.log('Base energy per shot:', weapons.energyPerShot);
            
            // Check current weapons status using proper methods and properties
            console.log('Current weapons status:', {
                // System base properties
                name: weapons.name,
                level: weapons.level,
                maxLevel: weapons.maxLevel,
                isOperational: weapons.isOperational(),
                effectiveness: weapons.getEffectiveness(),
                systemState: weapons.state,
                healthPercentage: weapons.healthPercentage,
                
                // Weapons-specific properties
                lastFireTime: weapons.lastFireTime,
                
                // Weapons-specific methods
                currentDamage: weapons.getCurrentDamage(),
                currentFireRate: weapons.getCurrentFireRate(),
                energyPerShot: weapons.getEnergyPerShot(),
                shotCooldown: weapons.getShotCooldown(),
                canFire: weapons.canFire(),
                
                // Ship energy - FIXED: use currentEnergy
                shipCurrentEnergy: ship.currentEnergy,
                shipMaxEnergy: ship.maxEnergy,
                shipHasEnergy: ship.hasEnergy(weapons.getEnergyPerShot())
            });
            
            // Test firing
            console.log('Testing weapons fire...');
            const fireResult = weapons.fire(ship);
            console.log('Fire result:', fireResult);
            
            // Check status after firing
            console.log('Status after fire attempt:', {
                canFire: weapons.canFire(),
                lastFireTime: weapons.lastFireTime,
                shipCurrentEnergy: ship.currentEnergy,
                timeSinceLastFire: Date.now() - weapons.lastFireTime,
                cooldownTime: weapons.getShotCooldown()
            });
            
        } else {
            console.log('No weapons system found on ship');
            console.log('Ship systems:', ship.systems);
        }
    } else {
        console.log('No ship found on starfieldManager');
        console.log('StarfieldManager properties:', Object.keys(starfieldManager));
    }
} else {
    console.log('StarfieldManager not found');
} 