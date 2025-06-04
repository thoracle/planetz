// Debug script to analyze planet vs moon docking range detection issue
console.log('🔧 Loading planet range debugging script...');

function debugPlanetRangeIssue() {
    console.log('\n=== PLANET DOCKING RANGE DEBUG ===');
    
    // Check if we have access to the required objects
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    const sm = window.starfieldManager;
    
    if (!sm.dockingModal) {
        console.error('❌ DockingModal not found');
        return;
    }
    
    if (!sm.solarSystemManager) {
        console.error('❌ SolarSystemManager not found');
        return;
    }
    
    if (!sm.dockingSystemManager) {
        console.error('❌ DockingSystemManager not found');
        return;
    }
    
    console.log('✅ All required managers found');
    
    // Get all celestial bodies
    const celestialBodies = sm.solarSystemManager.getCelestialBodies();
    console.log(`📍 Found ${celestialBodies.size} celestial bodies`);
    
    const playerPos = sm.camera.position;
    console.log(`🚀 Player position: (${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)})`);
    
    // Analyze each planet and moon
    celestialBodies.forEach((body, bodyId) => {
        if (!bodyId.startsWith('planet_') && !bodyId.startsWith('moon_')) {
            return;
        }
        
        console.log(`\n--- ANALYZING ${bodyId.toUpperCase()} ---`);
        console.log(`📍 Body:`, body);
        console.log(`📍 Body name: "${body.name || 'unnamed'}"`);
        console.log(`📍 Body position:`, body.position);
        
        // Get body info from SolarSystemManager
        const bodyInfo = sm.solarSystemManager.getCelestialBodyInfo(body);
        console.log(`ℹ️ Body info from SolarSystemManager:`, bodyInfo);
        console.log(`ℹ️ Body info type: "${bodyInfo?.type}"`);
        
        // Calculate distance
        const distance = sm.calculateDistance(playerPos, body.position);
        console.log(`📏 Distance: ${distance.toFixed(3)}km`);
        
        // Check what the DockingSystemManager thinks the range should be
        const bodyType = bodyId.startsWith('planet_') ? 'planet' : 'moon';
        const expectedRange = bodyType === 'planet' ? 4.0 : 1.5;
        console.log(`🎯 Expected range for ${bodyType}: ${expectedRange}km`);
        
        // Test DockingSystemManager validation
        const ship = sm.viewManager?.getShip();
        console.log(`🚀 Ship object:`, ship ? 'Found' : 'Not found');
        
        if (ship) {
            console.log(`⚡ Ship current speed: ${sm.currentSpeed}`);
            
            // Run validation
            const validation = sm.dockingSystemManager.validateDocking(ship, body, sm);
            console.log(`🔍 DockingSystemManager validation result:`, validation);
            console.log(`🔍 Can dock: ${validation.canDock}`);
            console.log(`🔍 Reasons: ${validation.reasons.join(', ')}`);
            
            // Check if the validation is using the correct range
            if (!validation.canDock && validation.reasons.some(reason => reason.includes('Too far'))) {
                const rangeMatch = validation.reasons.find(reason => reason.includes('Too far'));
                console.log(`❌ Range validation failed: ${rangeMatch}`);
                
                // Extract the range used in validation
                const usedRangeMatch = rangeMatch.match(/(\d+\.?\d*)km\)$/);
                if (usedRangeMatch) {
                    const usedRange = parseFloat(usedRangeMatch[1]);
                    console.log(`🎯 Range used by DockingSystemManager: ${usedRange}km`);
                    console.log(`🎯 Expected range: ${expectedRange}km`);
                    
                    if (usedRange !== expectedRange) {
                        console.error(`🚨 MISMATCH! DockingSystemManager used ${usedRange}km but should use ${expectedRange}km for ${bodyType}`);
                        
                        // Investigate why the range is wrong
                        console.log(`🔍 Investigating target info type detection...`);
                        console.log(`🔍 bodyInfo?.type = "${bodyInfo?.type}"`);
                        console.log(`🔍 bodyId = "${bodyId}"`);
                        console.log(`🔍 Expected type = "${bodyType}"`);
                        
                        if (bodyInfo?.type !== bodyType) {
                            console.error(`🚨 TYPE MISMATCH! SolarSystemManager thinks it's "${bodyInfo?.type}" but bodyId suggests "${bodyType}"`);
                        }
                    } else {
                        console.log(`✅ Range detection is correct`);
                    }
                }
            }
        }
        
        // Test canDockWithLogging directly
        if (sm.currentTarget === body) {
            console.log(`🎯 This body is currently targeted`);
            const canDock = sm.canDockWithLogging(body);
            console.log(`🔍 canDockWithLogging result: ${canDock}`);
        } else {
            console.log(`📍 This body is NOT currently targeted`);
        }
        
        // Check what DockingModal thinks
        const withinModalRange = distance <= (bodyInfo?.dockingRange || expectedRange);
        console.log(`🔍 DockingModal range check: distance ${distance.toFixed(3)}km <= ${bodyInfo?.dockingRange || expectedRange}km = ${withinModalRange}`);
    });
    
    // Test current target specifically
    if (sm.currentTarget) {
        console.log(`\n--- CURRENT TARGET ANALYSIS ---`);
        console.log(`🎯 Current target:`, sm.currentTarget);
        console.log(`🎯 Current target name: "${sm.currentTarget.name}"`);
        
        const targetInfo = sm.solarSystemManager.getCelestialBodyInfo(sm.currentTarget);
        console.log(`ℹ️ Target info:`, targetInfo);
        
        const distance = sm.calculateDistance(playerPos, sm.currentTarget.position);
        console.log(`📏 Distance to current target: ${distance.toFixed(3)}km`);
        
        // Try to dock with current target
        console.log(`🚀 Testing dock with current target...`);
        const canDock = sm.canDockWithLogging(sm.currentTarget);
        console.log(`🔍 Can dock with current target: ${canDock}`);
    } else {
        console.log(`\n--- NO CURRENT TARGET ---`);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
}

// Run the debug when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(debugPlanetRangeIssue, 1000);
    });
} else {
    setTimeout(debugPlanetRangeIssue, 1000);
}

// Make it available globally for manual testing
window.debugPlanetRangeIssue = debugPlanetRangeIssue;

console.log('✅ Planet range debugging script loaded - use debugPlanetRangeIssue() to run manually'); 