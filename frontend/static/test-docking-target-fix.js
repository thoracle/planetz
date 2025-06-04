(function() {
    console.log('🔧 DOCKING TARGET FIX TEST - Testing improved target tracking and validation...');
    
    function testDockingTargetFix() {
        const starfieldManager = window.starfieldManager;
        
        if (!starfieldManager) {
            console.error('❌ StarfieldManager not found');
            return;
        }
        
        console.log('✅ Found StarfieldManager');
        
        // Check if docking modal exists
        const dockingModal = starfieldManager.dockingModal;
        if (!dockingModal) {
            console.error('❌ DockingModal not found');
            return;
        }
        
        console.log('✅ Found DockingModal');
        
        // Test target monitoring improvements
        console.log('🎯 Testing target monitoring improvements...');
        
        // Mock a scenario where target might be lost temporarily
        const originalTarget = starfieldManager.currentTarget;
        if (originalTarget) {
            console.log('📊 Current target status:', {
                name: originalTarget.name,
                position: originalTarget.position,
                hasPosition: !!originalTarget.position,
                modalTarget: dockingModal.currentTarget?.name,
                modalVisible: dockingModal.isVisible
            });
            
            // Test docking validation
            console.log('🚀 Testing docking validation...');
            const canDock = starfieldManager.canDockWithLogging(originalTarget);
            console.log('  - Can dock result:', canDock);
            
            if (canDock) {
                console.log('✅ Target is valid for docking');
            } else {
                console.log('⚠️ Target is not valid for docking (this is normal if not close enough)');
                
                // Get more details about why docking failed
                const ship = starfieldManager.viewManager?.getShip();
                if (ship && originalTarget.position) {
                    const distance = starfieldManager.calculateDistance(
                        starfieldManager.camera.position,
                        originalTarget.position
                    );
                    
                    const info = starfieldManager.solarSystemManager?.getCelestialBodyInfo(originalTarget);
                    const dockingRange = info?.type === 'planet' ? 4.0 : 1.5;
                    
                    console.log('📊 Docking status details:', {
                        distance: distance.toFixed(2) + 'km',
                        maxRange: dockingRange + 'km',
                        withinRange: distance <= dockingRange,
                        currentSpeed: starfieldManager.currentSpeed,
                        targetType: info?.type
                    });
                    
                    if (distance > dockingRange) {
                        console.log('❌ Too far from target');
                    }
                    if (starfieldManager.currentSpeed > 1) {
                        console.log('❌ Speed too high');
                    }
                }
            }
        } else {
            console.log('⚠️ No current target set');
        }
        
        // Test target restoration methods
        console.log('🔄 Testing target restoration methods...');
        if (dockingModal.backupTarget) {
            console.log('✅ Backup target available:', dockingModal.backupTarget.name);
        } else {
            console.log('⚠️ No backup target stored');
        }
        
        if (dockingModal.originalStarfieldTarget) {
            console.log('✅ Original starfield target available:', dockingModal.originalStarfieldTarget.name);
        } else {
            console.log('⚠️ No original starfield target stored');
        }
        
        // Test target verification ID system
        if (originalTarget && originalTarget._dockingModalId) {
            console.log('✅ Target has verification ID:', originalTarget._dockingModalId);
            if (dockingModal.targetVerificationId === originalTarget._dockingModalId) {
                console.log('✅ Verification ID matches modal');
            } else {
                console.log('⚠️ Verification ID mismatch');
            }
        } else {
            console.log('⚠️ Target has no verification ID');
        }
        
        console.log('🔧 Docking target fix test completed');
    }
    
    // Wait for game to initialize
    setTimeout(() => {
        testDockingTargetFix();
    }, 2000);
    
    // Also provide manual test function
    window.testDockingTargetFix = testDockingTargetFix;
    console.log('💡 Manual test available: window.testDockingTargetFix()');
    
    // Monitor for docking modal events
    const originalShow = window.starfieldManager?.dockingModal?.show;
    if (originalShow) {
        window.starfieldManager.dockingModal.show = function(...args) {
            console.log('📡 DOCKING MODAL SHOW intercepted with args:', args);
            return originalShow.apply(this, args);
        };
    }
    
    const originalHandleDock = window.starfieldManager?.dockingModal?.handleDock;
    if (originalHandleDock) {
        window.starfieldManager.dockingModal.handleDock = function(...args) {
            console.log('🚀 DOCK BUTTON PRESSED - intercepted');
            return originalHandleDock.apply(this, args);
        };
    }
    
    console.log('📡 Monitoring docking modal events...');
})(); 