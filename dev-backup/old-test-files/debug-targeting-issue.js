// Debug script for targeting computer issues
console.log('🔍 === TARGETING COMPUTER DEEP DEBUG ===');

function debugTargetingIssue() {
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Core components not available');
        console.log('Available globals:', Object.keys(window).filter(k => k.includes('view') || k.includes('star')));
        return;
    }
    
    console.log('\n📋 === CURRENT STATE ===');
    console.log('Ship:', ship.shipType);
    console.log('Docked:', starfieldManager.isDocked);
    
    // Check targeting computer system
    const targetComputerSystem = ship.getSystem('target_computer');
    console.log('\n🎯 === TARGET COMPUTER SYSTEM ===');
    if (targetComputerSystem) {
        console.log('✅ System exists');
        console.log(`   Level: ${targetComputerSystem.level}`);
        console.log(`   Active: ${targetComputerSystem.isActive}`);
        console.log(`   Operational: ${targetComputerSystem.isOperational()}`);
        console.log(`   Health: ${targetComputerSystem.healthPercentage}%`);
        console.log(`   Can activate: ${targetComputerSystem.canActivate(ship)}`);
    } else {
        console.log('❌ System does NOT exist');
    }
    
    // Check card system
    console.log('\n🎴 === CARD SYSTEM ===');
    if (ship.cardSystemIntegration) {
        console.log('✅ Card integration exists');
        
        const hasCards = ship.hasSystemCardsSync('target_computer');
        console.log(`   Has targeting cards: ${hasCards}`);
        
        if (ship.cardSystemIntegration.installedCards) {
            const cards = Array.from(ship.cardSystemIntegration.installedCards.values());
            console.log(`   Total cards: ${cards.length}`);
            const targetCards = cards.filter(card => 
                card.cardType === 'target_computer' || 
                card.cardType === 'tactical_computer' || 
                card.cardType === 'combat_computer'
            );
            console.log(`   Targeting cards: ${targetCards.length}`);
            targetCards.forEach(card => console.log(`     - ${card.cardType} (Level ${card.level})`));
        }
    } else {
        console.log('❌ Card integration missing');
    }
    
    // Check StarfieldManager state
    console.log('\n⭐ === STARFIELD MANAGER STATE ===');
    console.log(`   targetComputerEnabled: ${starfieldManager.targetComputerEnabled}`);
    console.log(`   Current target: ${starfieldManager.currentTargetData ? 'Yes' : 'None'}`);
    if (starfieldManager.currentTargetData) {
        console.log(`   Target name: ${starfieldManager.currentTargetData.name || 'Unknown'}`);
    }
    
    // Test TAB key requirements
    console.log('\n🔑 === TAB KEY REQUIREMENTS ===');
    const req1 = !!targetComputerSystem;
    const req2 = targetComputerSystem?.canActivate(ship) || false;
    const req3 = ship.hasSystemCardsSync('target_computer');
    const req4 = !starfieldManager.isDocked;
    
    console.log(`   System exists: ${req1 ? '✅' : '❌'}`);
    console.log(`   Can activate: ${req2 ? '✅' : '❌'}`);
    console.log(`   Has cards: ${req3 ? '✅' : '❌'}`);
    console.log(`   Not docked: ${req4 ? '✅' : '❌'}`);
    
    const shouldWork = req1 && req2 && req3 && req4;
    console.log(`\n🎯 TAB SHOULD WORK: ${shouldWork ? '✅ YES' : '❌ NO'}`);
    
    // If it should work, test it
    if (shouldWork) {
        console.log('\n🧪 === TESTING TAB TOGGLE ===');
        const before = starfieldManager.targetComputerEnabled;
        try {
            starfieldManager.toggleTargetComputer();
            const after = starfieldManager.targetComputerEnabled;
            console.log(`   Before: ${before}, After: ${after}`);
            console.log(`   Toggle ${before !== after ? 'WORKED' : 'FAILED'} ✅`);
            
            // Toggle back
            if (before !== after) {
                starfieldManager.toggleTargetComputer();
                console.log('   Toggled back to original state');
            }
        } catch (error) {
            console.error('   Toggle error:', error);
        }
    }
    
    // Distance test if there's a target
    if (starfieldManager.currentTargetData) {
        console.log('\n📏 === DISTANCE TEST ===');
        try {
            const target = starfieldManager.currentTargetData;
            const distance = starfieldManager.calculateDistance(
                starfieldManager.camera.position,
                target.position || target.mesh?.position
            );
            console.log(`   Current distance: ${distance ? distance.toFixed(2) : 'N/A'} km`);
        } catch (error) {
            console.error('   Distance calculation error:', error);
        }
    }
    
    return { shouldWork, hasSystem: req1, hasCards: req3, notDocked: req4 };
}

// Quick fix function
function quickFixTargeting() {
    console.log('🔧 === APPLYING QUICK FIX ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not available');
        return;
    }
    
    const ship = starfieldManager.viewManager?.getShip();
    if (!ship) {
        console.error('❌ Ship not available');
        return;
    }
    
    // Fix the sync issue
    const targetComputerSystem = ship.getSystem('target_computer');
    const hasCards = ship.hasSystemCardsSync('target_computer');
    
    if (targetComputerSystem && hasCards) {
        // Sync the states
        starfieldManager.targetComputerEnabled = targetComputerSystem.isActive;
        console.log(`✅ Synced: system=${targetComputerSystem.isActive}, manager=${starfieldManager.targetComputerEnabled}`);
        
        // Update display
        if (starfieldManager.targetComputerEnabled) {
            starfieldManager.updateTargetList();
            starfieldManager.updateTargetDisplay();
        }
        
        console.log('🎯 Quick fix applied - try TAB key now');
    } else {
        console.log('❌ Cannot apply fix - missing system or cards');
    }
}

// Run the debug
const result = debugTargetingIssue();

// Export functions for manual use
window.debugTargeting = debugTargetingIssue;
window.quickFixTargeting = quickFixTargeting;

console.log('\n💡 Manual functions available:');
console.log('  - debugTargeting() - Run full diagnostic');
console.log('  - quickFixTargeting() - Apply quick state sync fix'); 