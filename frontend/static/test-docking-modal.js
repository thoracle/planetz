// Test script for new docking modal system
// Run this in the browser console to test docking modal functionality

(function() {
    console.log('=== Docking Modal Test ===');
    
    // Get game instances
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not ready. Make sure you have a ship and are in space.');
        return;
    }
    
    console.log('✅ Game instances found');
    console.log('📍 Current speed:', starfieldManager.currentSpeed);
    console.log('🎯 Current target:', starfieldManager.currentTarget?.name || 'None');
    console.log('🚢 Is docked:', starfieldManager.isDocked);
    
    // Test 1: Check if docking modal exists
    if (starfieldManager.dockingModal) {
        console.log('✅ Docking modal instance found');
        
        // Test 2: Check current conditions
        console.log('\n=== Current Docking Conditions ===');
        if (starfieldManager.currentTarget) {
            const target = starfieldManager.currentTarget;
            const distance = starfieldManager.calculateDistance(
                starfieldManager.camera.position,
                target.position
            );
            const targetInfo = starfieldManager.solarSystemManager?.getCelestialBodyInfo(target);
            
            console.log('🎯 Target:', targetInfo?.name || 'Unknown');
            console.log('📏 Distance:', distance.toFixed(1) + 'km');
            console.log('⚡ Speed:', 'Impulse ' + starfieldManager.currentSpeed);
            
            if (targetInfo) {
                console.log('🏛️ Type:', targetInfo.type);
                console.log('🤝 Diplomacy:', targetInfo.diplomacy || 'Unknown');
            }
            
            // Test manual modal trigger
            window.testDockingModal = function() {
                console.log('\n=== Testing Manual Modal Trigger ===');
                
                // Force show modal for testing
                if (starfieldManager.dockingModal && targetInfo) {
                    starfieldManager.dockingModal.show(target, targetInfo, distance);
                    console.log('✅ Modal manually triggered');
                } else {
                    console.error('❌ Cannot trigger modal - missing components');
                }
            };
            
            console.log('\n💡 To manually test the modal, run: testDockingModal()');
            
        } else {
            console.log('❌ No target selected. Please target a planet or moon first.');
        }
        
        // Test modal visibility check
        if (starfieldManager.dockingModal.isVisible) {
            console.log('👁️ Modal is currently visible');
        } else {
            console.log('👁️ Modal is currently hidden');
        }
        
    } else {
        console.error('❌ Docking modal not found - was it initialized properly?');
    }
    
    // Provide helper functions
    window.setSpeedForTesting = function(speed) {
        starfieldManager.currentSpeed = speed;
        starfieldManager.targetSpeed = speed;
        console.log('🚀 Speed set to Impulse', speed);
    };
    
    window.triggerDockingCheck = function() {
        if (starfieldManager.dockingModal) {
            starfieldManager.dockingModal.checkDockingConditions();
            console.log('🔄 Manually triggered docking condition check');
        }
    };
    
    console.log('\n=== Available Test Functions ===');
    console.log('setSpeedForTesting(speed) - Set impulse speed (0-1 for docking)');
    console.log('triggerDockingCheck() - Manually check docking conditions');
    console.log('testDockingModal() - Force show the modal (if target selected)');
    
})(); 