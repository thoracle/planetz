// Test weapon system debug functionality
// Run this in the browser console after loading the game

console.log('🧪 Testing weapon system debug functionality...');

// Wait for game to be ready
setTimeout(() => {
    // Get game objects
    const starfieldManager = window.starfieldManager;
    const ship = starfieldManager?.viewManager?.getShip();
    const weaponSystem = ship?.weaponSystem;
    
    if (!starfieldManager || !ship || !weaponSystem) {
        console.error('❌ Game objects not found:', {
            starfieldManager: !!starfieldManager,
            ship: !!ship,
            weaponSystem: !!weaponSystem
        });
        return;
    }
    
    console.log('✅ Game objects found');
    
    // Check weapon system state
    console.log('🔫 Weapon System State:');
    console.log('  - Max weapon slots:', weaponSystem.maxWeaponSlots);
    console.log('  - Active slot index:', weaponSystem.activeSlotIndex);
    console.log('  - Autofire enabled:', weaponSystem.isAutofireOn);
    console.log('  - Locked target:', weaponSystem.lockedTarget);
    
    // Check each weapon slot
    console.log('🔫 Weapon Slots:');
    weaponSystem.weaponSlots.forEach((slot, index) => {
        console.log(`  Slot ${index}:`, {
            isEmpty: slot.isEmpty,
            weaponName: slot.equippedWeapon?.name || 'None',
            weaponLevel: slot.equippedWeapon?.level || 'N/A',
            canFire: slot.canFire(),
            isInCooldown: slot.isInCooldown(),
            cooldownTimer: slot.cooldownTimer
        });
    });
    
    // Check ship energy
    console.log('⚡ Ship Energy:');
    console.log('  - Current energy:', ship.currentEnergy);
    console.log('  - Max energy:', ship.maxEnergy);
    console.log('  - Has energy for weapon (15 units):', ship.hasEnergy(15));
    
    // Check card system integration
    console.log('🃏 Card System Integration:');
    if (ship.cardSystemIntegration) {
        console.log('  - Installed cards:', ship.cardSystemIntegration.installedCards?.size || 0);
        if (ship.cardSystemIntegration.installedCards) {
            for (const [slotId, cardData] of ship.cardSystemIntegration.installedCards.entries()) {
                if (cardData.cardType.includes('cannon') || cardData.cardType.includes('laser') || cardData.cardType.includes('weapon')) {
                    console.log(`    Weapon card: ${cardData.cardType} (Level ${cardData.level})`);
                }
            }
        }
    } else {
        console.log('  - No card system integration found');
    }
    
    // Try to fire the active weapon
    console.log('🎯 Testing weapon firing...');
    const activeSlot = weaponSystem.getActiveWeapon();
    if (activeSlot) {
        console.log('  - Active weapon:', activeSlot.equippedWeapon?.name || 'None');
        console.log('  - Can fire check:', activeSlot.canFire());
        
        if (!activeSlot.isEmpty && activeSlot.canFire()) {
            console.log('  - Attempting to fire weapon...');
            const fireResult = weaponSystem.fireActiveWeapon();
            console.log('  - Fire result:', fireResult);
        } else {
            console.log('  - Cannot fire weapon:', {
                isEmpty: activeSlot.isEmpty,
                canFire: activeSlot.canFire(),
                isInCooldown: activeSlot.isInCooldown(),
                hasWeapon: !!activeSlot.equippedWeapon
            });
        }
    } else {
        console.log('  - No active weapon slot found');
    }
    
    // Check weapon sync manager
    console.log('🔄 Weapon Sync Manager:');
    if (ship.weaponSyncManager) {
        console.log('  - Weapon sync manager exists');
        console.log('  - Weapons map size:', ship.weaponSyncManager.weapons?.size || 0);
    } else {
        console.log('  - No weapon sync manager found');
    }
    
}, 2000); // Wait 2 seconds for game to fully load 