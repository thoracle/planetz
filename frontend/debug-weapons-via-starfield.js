// Debug weapons system via starfieldManager
// Since starfieldManager is available globally, we can access the ship through it

console.log('=== Weapons Debug via StarfieldManager ===');

// Check if starfieldManager exists and has ship
if (typeof starfieldManager !== 'undefined' && starfieldManager) {
    console.log('StarfieldManager found:', starfieldManager);
    
    if (starfieldManager.ship) {
        const ship = starfieldManager.ship;
        console.log('Ship found:', ship);
        
        if (ship.systems && ship.systems.get('weapons')) {
            const weapons = ship.systems.get('weapons');
            console.log('Weapons system found:', weapons);
            
            // Check current weapons status
            console.log('Current weapons status:', {
                isOperational: weapons.isOperational(),
                currentLevel: weapons.currentLevel,
                energyConsumption: weapons.energyConsumption,
                lastFireTime: weapons.lastFireTime,
                cooldownPeriod: weapons.cooldownPeriod,
                currentTime: Date.now(),
                timeSinceLastFire: Date.now() - weapons.lastFireTime,
                canFire: weapons.canFire(),
                shipEnergy: ship.energy
            });
            
            // Test firing
            console.log('Testing weapons fire...');
            const fireResult = weapons.fire(ship);
            console.log('Fire result:', fireResult);
            
            // Check status after firing
            console.log('Status after fire attempt:', {
                canFire: weapons.canFire(),
                lastFireTime: weapons.lastFireTime,
                shipEnergy: ship.energy
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