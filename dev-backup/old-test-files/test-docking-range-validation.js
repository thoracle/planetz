console.log('🧪 Testing docking range validation...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== DOCKING RANGE VALIDATION TEST ===');
    
    // Check if required managers exist
    const sm = window.starfieldManager;
    const dsm = sm?.dockingSystemManager;
    
    if (!sm || !dsm) {
        console.error('❌ Required managers not found');
        return;
    }
    
    console.log('✅ Managers found');
    
    // Get celestial bodies
    const bodies = sm.solarSystemManager?.getCelestialBodies();
    if (!bodies || bodies.size === 0) {
        console.error('❌ No celestial bodies found');
        return;
    }
    
    console.log(`📍 Found ${bodies.size} celestial bodies`);
    
    // Test each body
    Array.from(bodies.values()).forEach((body, index) => {
        const info = sm.solarSystemManager.getCelestialBodyInfo(body);
        const distance = sm.calculateDistance(sm.camera.position, body.position);
        
        console.log(`\n🎯 Testing ${info.name} (${info.type})`);
        console.log(`📏 Current distance: ${distance.toFixed(2)}km`);
        
        // Check default docking range from DSM
        const defaultRange = dsm.dockingRequirements.dockingRange;
        console.log(`🔧 DSM default docking range: ${defaultRange}km`);
        
        // Test the validation logic directly
        const ship = sm.viewManager?.getShip();
        const validation = dsm.validateDocking(ship, body, sm);
        
        console.log(`✅ Validation result: canDock=${validation.canDock}`);
        console.log(`📝 Reasons: ${validation.reasons.join(', ')}`);
        
        // Extract the actual range being used from the error message
        const rangePattern = /(\d+\.?\d*)km > (\d+\.?\d*)km/;
        const rangeMatch = validation.reasons.join(' ').match(rangePattern);
        
        if (rangeMatch) {
            const actualDistance = parseFloat(rangeMatch[1]);
            const usedRange = parseFloat(rangeMatch[2]);
            console.log(`🎯 Distance: ${actualDistance}km, Range used: ${usedRange}km`);
            
            // Expected range based on type
            const expectedRange = info.type === 'planet' ? 4.0 : 1.5;
            console.log(`🎯 Expected range for ${info.type}: ${expectedRange}km`);
            
            if (usedRange !== expectedRange) {
                console.error(`❌ RANGE MISMATCH! Used ${usedRange}km but expected ${expectedRange}km for ${info.type}`);
            } else {
                console.log(`✅ Range correct for ${info.type}`);
            }
        }
        
        // Test the range calculation logic manually
        let manualRange = dsm.dockingRequirements.dockingRange; // Default 1.5
        if (info?.type === 'planet') {
            manualRange = 4.0;
        }
        console.log(`🔧 Manual range calculation: ${manualRange}km`);
    });
    
    console.log('\n=== VALIDATION TEST COMPLETE ===');
}, 2000); 