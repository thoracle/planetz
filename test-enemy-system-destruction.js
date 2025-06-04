// Enemy System Destruction Test
// Run this in the browser console to test enemy system destruction

(function() {
    console.log('=== Enemy System Destruction Test ===');
    
    // Get the starfield manager and current target
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    const targetComputer = ship?.getSystem('target_computer');
    
    if (!starfieldManager || !ship || !targetComputer) {
        console.error('❌ Game not ready. Make sure you have a ship and targeting computer.');
        return;
    }
    
    // Get current target
    const currentTargetData = starfieldManager.getCurrentTargetData();
    
    if (!currentTargetData || !currentTargetData.ship) {
        console.error('❌ No enemy ship targeted. Target an enemy ship first (Tab key).');
        return;
    }
    
    const enemyShip = currentTargetData.ship;
    console.log(`✅ Testing on: ${enemyShip.shipName || 'Enemy Ship'}`);
    
    // Check if target computer has sub-targeting
    if (!targetComputer.hasSubTargeting()) {
        console.error('❌ Target computer does not have sub-targeting capability (needs Level 3+)');
        console.log(`Target computer level: ${targetComputer.level}`);
        return;
    }
    
    console.log(`✅ Target computer Level ${targetComputer.level} - Sub-targeting available`);
    
    // Activate targeting computer if not active
    if (!targetComputer.isActive) {
        console.log('🎯 Activating target computer...');
        targetComputer.activate(ship);
    }
    
    // Set current target and update sub-targets
    targetComputer.currentTarget = enemyShip;
    targetComputer.updateSubTargets();
    
    console.log(`📡 Available sub-targets: ${targetComputer.availableSubTargets.length}`);
    targetComputer.availableSubTargets.forEach((subTarget, index) => {
        console.log(`  ${index + 1}. ${subTarget.displayName} (${(subTarget.health * 100).toFixed(1)}% health)`);
    });
    
    // Find subspace radio
    const radioSubTarget = targetComputer.availableSubTargets.find(
        target => target.systemName === 'subspace_radio'
    );
    
    if (!radioSubTarget) {
        console.error('❌ No subspace radio found on enemy ship');
        console.log('Available systems:', targetComputer.availableSubTargets.map(t => t.systemName));
        return;
    }
    
    console.log(`📻 Found subspace radio: ${(radioSubTarget.health * 100).toFixed(1)}% health`);
    
    // Target the subspace radio
    targetComputer.currentSubTarget = radioSubTarget;
    console.log(`🎯 Targeting subspace radio...`);
    
    // Apply heavy damage directly to test destruction
    console.log('💥 Applying heavy damage to subspace radio...');
    
    let damageRounds = 0;
    const maxRounds = 10;
    
    while (radioSubTarget.system.healthPercentage > 0 && damageRounds < maxRounds) {
        damageRounds++;
        const damage = 50; // Heavy damage per round
        
        console.log(`--- Round ${damageRounds} ---`);
        console.log(`Health before: ${(radioSubTarget.system.healthPercentage * 100).toFixed(1)}%`);
        
        // Apply damage
        enemyShip.applySubTargetDamage('subspace_radio', damage, 'test');
        
        console.log(`Health after: ${(radioSubTarget.system.healthPercentage * 100).toFixed(1)}%`);
        
        if (radioSubTarget.system.healthPercentage <= 0) {
            console.log('💥🎉 SUBSPACE RADIO DESTROYED! 🎉💥');
            break;
        }
    }
    
    // Update sub-targets to see if radio was removed
    targetComputer.updateSubTargets();
    
    console.log('📡 Final sub-target list:');
    targetComputer.availableSubTargets.forEach((subTarget, index) => {
        console.log(`  ${index + 1}. ${subTarget.displayName} (${(subTarget.health * 100).toFixed(1)}% health)`);
    });
    
    const radioStillTargetable = targetComputer.availableSubTargets.find(
        target => target.systemName === 'subspace_radio'
    );
    
    if (!radioStillTargetable) {
        console.log('✅ SUCCESS: Subspace radio removed from targetable systems!');
    } else {
        console.log('❌ Radio still targetable - may need more damage');
    }
    
    return 'Test complete';
})(); 