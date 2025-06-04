/**
 * Simple Equipment Synchronization Test
 */

(function() {
    console.log('🧪 Simple Equipment Sync Test Starting...');
    
    setTimeout(function() {
        try {
            const starfieldManager = window.starfieldManager;
            const ship = window.ship || (starfieldManager ? starfieldManager.viewManager.getShip() : null);
            
            if (!ship || !starfieldManager) {
                console.error('❌ Ship or StarfieldManager not found');
                return;
            }
            
            console.log('✅ Game components found');
            console.log('Ship:', ship);
            console.log('StarfieldManager:', starfieldManager);
            
            // Test basic ship properties
            if (ship.cardSystemIntegration) {
                console.log('✅ Card System Integration available');
            } else {
                console.log('❌ Card System Integration missing');
            }
            
            if (ship.weaponSystem) {
                console.log('✅ Weapon System available');
            } else {
                console.log('❌ Weapon System missing');
            }
            
            // Test the fix - call initializeShipSystems
            console.log('\n🔧 Testing initializeShipSystems...');
            starfieldManager.initializeShipSystems().then(function() {
                console.log('✅ initializeShipSystems completed successfully!');
                console.log('🎉 Equipment sync test completed!');
            }).catch(function(error) {
                console.error('❌ initializeShipSystems failed:', error);
            });
            
        } catch (error) {
            console.error('❌ Test failed with error:', error);
        }
        
    }, 3000);
    
})(); 