/**
 * Warp Sector Diagnostic Tool
 * ===========================
 * 
 * Run this in the browser console after warping to analyze:
 * 1. All objects in the current sector
 * 2. Discovery status of each object  
 * 3. Distance from player's current position to each object
 * 4. Target computer state
 * 5. StarCharts integration state
 * 
 * Usage: Copy this entire file and paste into browser console, then run:
 * > analyzeSectorState()
 */

function analyzeSectorState() {
    console.log('🔍 WARP SECTOR DIAGNOSTIC TOOL');
    console.log('==============================');
    
    // Get core managers
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starfieldManager = viewManager?.starfieldManager;
    const targetComputerManager = starfieldManager?.targetComputerManager;
    const starChartsManager = starfieldManager?.starChartsManager;
    const navigationSystemManager = viewManager?.navigationSystemManager;
    const starChartsIntegration = navigationSystemManager?.starChartsIntegration;
    
    if (!viewManager) {
        console.error('❌ ViewManager not found - cannot analyze sector state');
        return;
    }
    
    console.log('📊 SYSTEM STATUS:');
    console.log(`  ViewManager: ${!!viewManager ? '✅' : '❌'}`);
    console.log(`  SolarSystemManager: ${!!solarSystemManager ? '✅' : '❌'}`);
    console.log(`  StarfieldManager: ${!!starfieldManager ? '✅' : '❌'}`);
    console.log(`  TargetComputerManager: ${!!targetComputerManager ? '✅' : '❌'}`);
    console.log(`  StarChartsManager: ${!!starChartsManager ? '✅' : '❌'}`);
    console.log(`  NavigationSystemManager: ${!!navigationSystemManager ? '✅' : '❌'}`);
    console.log(`  StarChartsIntegration: ${!!starChartsIntegration ? '✅' : '❌'}`);
    console.log('');
    
    // Get current sector info
    const currentSector = solarSystemManager?.currentSector || 'UNKNOWN';
    const starChartsCurrentSector = starChartsManager?.currentSector || 'UNKNOWN';
    const playerPosition = starfieldManager?.camera?.position;
    
    console.log('🗺️ SECTOR INFORMATION:');
    console.log(`  SolarSystemManager sector: ${currentSector}`);
    console.log(`  StarChartsManager sector: ${starChartsCurrentSector}`);
    console.log(`  Sector consistency: ${currentSector === starChartsCurrentSector ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`  Player position: (${playerPosition?.x?.toFixed(1) || '?'}, ${playerPosition?.y?.toFixed(1) || '?'}, ${playerPosition?.z?.toFixed(1) || '?'})`);
    console.log('');
    
    // Get all celestial bodies from SolarSystemManager
    const celestialBodies = solarSystemManager?.getCelestialBodies();
    const discoveredObjects = starChartsManager?.getDiscoveredObjects() || [];
    
    console.log('🌌 CELESTIAL BODIES IN SECTOR:');
    if (!celestialBodies || celestialBodies.size === 0) {
        console.log('  ❌ No celestial bodies found');
    } else {
        console.log(`  Total bodies: ${celestialBodies.size}`);
        
        const bodies = [];
        for (const [key, body] of celestialBodies.entries()) {
            const info = solarSystemManager.getCelestialBodyInfo(body);
            const distance = calculateDistance(playerPosition, body.position);
            const objectId = `${currentSector}_${key}`;
            
            // CRITICAL FIX: Use correct discovery ID format
            // Discovery system uses IDs like "A0_hermes_refinery" (without type prefix)
            // Dynamic system uses IDs like "A0_station_hermes_refinery" (with type prefix)
            let discoveryId = objectId;
            if (key.startsWith('station_')) {
                // Convert A0_station_hermes_refinery -> A0_hermes_refinery
                discoveryId = `${currentSector}_${key.replace('station_', '')}`;
            } else if (key.startsWith('planet_')) {
                // Convert A0_planet_0 -> A0_terra_prime (need to get actual planet name)
                discoveryId = info?.name ? `${currentSector}_${info.name.toLowerCase().replace(/\s+/g, '_')}` : objectId;
            } else if (key.startsWith('moon_')) {
                // Convert A0_moon_0_0 -> A0_luna (need to get actual moon name)  
                discoveryId = info?.name ? `${currentSector}_${info.name.toLowerCase().replace(/\s+/g, '_')}` : objectId;
            } else if (key === 'star') {
                // Star uses just the sector prefix
                discoveryId = `${currentSector}_star`;
            }
            
            const isDiscovered = discoveredObjects.includes(discoveryId) || 
                               discoveredObjects.some(id => id.toLowerCase() === discoveryId.toLowerCase());
            
            bodies.push({
                key,
                name: info?.name || 'Unknown',
                type: info?.type || 'Unknown',
                id: objectId,
                discoveryId: discoveryId,
                position: body.position,
                distance,
                discovered: isDiscovered
            });
        }
        
        // Sort by distance
        bodies.sort((a, b) => a.distance - b.distance);
        
        bodies.forEach((body, index) => {
            const discoveryIcon = body.discovered ? '🔍' : '❓';
            const distanceStr = body.distance !== null ? `${body.distance.toFixed(1)}km` : 'N/A';
            console.log(`  [${index}] ${discoveryIcon} ${body.name} (${body.type})`);
            console.log(`      ID: "${body.id}"`);
            console.log(`      Discovery ID: "${body.discoveryId}"`);
            console.log(`      Distance: ${distanceStr}`);
            console.log(`      Position: (${body.position?.x?.toFixed(1) || '?'}, ${body.position?.y?.toFixed(1) || '?'}, ${body.position?.z?.toFixed(1) || '?'})`);
        });
    }
    console.log('');
    
    // Get target computer state
    console.log('🎯 TARGET COMPUTER STATE:');
    if (!targetComputerManager) {
        console.log('  ❌ TargetComputerManager not available');
    } else {
        const targetObjects = targetComputerManager.targetObjects || [];
        const currentTarget = targetComputerManager.currentTarget;
        const targetIndex = targetComputerManager.targetIndex;
        const knownTargetsSize = targetComputerManager.knownTargets?.size || 0;
        const isFromLongRangeScanner = targetComputerManager.isFromLongRangeScanner;
        
        console.log(`  Enabled: ${targetComputerManager.targetComputerEnabled ? '✅' : '❌'}`);
        console.log(`  Current target: ${currentTarget?.name || 'None'} (index: ${targetIndex})`);
        console.log(`  Target objects: ${targetObjects.length}`);
        console.log(`  Known targets cache: ${knownTargetsSize}`);
        console.log(`  isFromLongRangeScanner: ${isFromLongRangeScanner ? '✅' : '❌'}`);
        
        if (targetObjects.length > 0) {
            console.log('  Target list:');
            targetObjects.forEach((target, index) => {
                const isCurrentTarget = index === targetIndex;
                const marker = isCurrentTarget ? '👉' : '  ';
                const distanceStr = target.distance !== undefined ? `${target.distance.toFixed(1)}km` : 'N/A';
                const cachedMarker = target.isCached ? ' [CACHED]' : '';
                console.log(`${marker}[${index}] ${target.name} - ID: "${target.id}" - Distance: ${distanceStr}${cachedMarker}`);
            });
        }
    }
    console.log('');
    
    // Get StarCharts integration state
    console.log('🔄 STARCHARTS INTEGRATION STATE:');
    if (!starChartsIntegration) {
        console.log('  ❌ StarChartsIntegration not available');
    } else {
        const isActive = starChartsIntegration.isActive;
        const pauseSync = starChartsIntegration.pauseSync;
        const enhancedTargetsSize = starChartsIntegration.enhancedTargets?.size || 0;
        const lastSyncTime = starChartsIntegration.lastSyncTime;
        const timeSinceLastSync = lastSyncTime ? Date.now() - lastSyncTime : null;
        
        console.log(`  Active: ${isActive ? '✅' : '❌'}`);
        console.log(`  Sync paused: ${pauseSync ? '⏸️ YES' : '▶️ NO'}`);
        console.log(`  Enhanced targets cache: ${enhancedTargetsSize}`);
        console.log(`  Last sync: ${timeSinceLastSync ? `${Math.round(timeSinceLastSync / 1000)}s ago` : 'Never'}`);
    }
    console.log('');
    
    // Discovery analysis
    console.log('📋 DISCOVERY ANALYSIS:');
    if (!starChartsManager) {
        console.log('  ❌ StarChartsManager not available');
    } else {
        const totalDiscovered = discoveredObjects.length;
        const currentSectorObjects = celestialBodies?.size || 0;
        
        // Count discovered objects in current sector
        const currentSectorDiscovered = discoveredObjects.filter(id => 
            id.startsWith(currentSector + '_') || 
            id.toLowerCase().startsWith(currentSector.toLowerCase() + '_')
        ).length;
        
        // Count discovered objects from other sectors (contamination)
        const otherSectorObjects = discoveredObjects.filter(id => 
            !id.startsWith(currentSector + '_') && 
            !id.toLowerCase().startsWith(currentSector.toLowerCase() + '_')
        );
        
        console.log(`  Total discovered objects: ${totalDiscovered}`);
        console.log(`  Current sector (${currentSector}) objects: ${currentSectorObjects}`);
        console.log(`  Current sector discovered: ${currentSectorDiscovered}`);
        console.log(`  Other sector contamination: ${otherSectorObjects.length}`);
        
        if (otherSectorObjects.length > 0) {
            console.log('  ⚠️ CONTAMINATION DETECTED:');
            otherSectorObjects.forEach(id => {
                console.log(`    - ${id}`);
            });
        }
    }
    console.log('');
    
    // Summary and recommendations
    console.log('📝 DIAGNOSTIC SUMMARY:');
    const issues = [];
    
    if (currentSector !== starChartsCurrentSector) {
        issues.push('❌ Sector mismatch between SolarSystemManager and StarChartsManager');
    }
    
    if (targetComputerManager?.targetObjects?.some(t => !t.id?.startsWith(currentSector + '_'))) {
        issues.push('❌ Target computer contains objects from other sectors');
    }
    
    if (discoveredObjects.some(id => !id.startsWith(currentSector + '_') && !id.toLowerCase().startsWith(currentSector.toLowerCase() + '_'))) {
        issues.push('❌ Discovery contamination from other sectors detected');
    }
    
    if (starChartsIntegration?.pauseSync) {
        issues.push('⚠️ StarCharts integration sync is paused (may be intentional during warp)');
    }
    
    if (issues.length === 0) {
        console.log('  ✅ No issues detected - sector state looks clean!');
    } else {
        console.log('  Issues found:');
        issues.forEach(issue => console.log(`    ${issue}`));
    }
    
    console.log('');
    console.log('🔧 DIAGNOSTIC COMPLETE');
    console.log('Run analyzeSectorState() again after making changes to re-check.');
}

// Helper function to calculate distance
function calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return null;
    
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Additional helper functions
function clearAllTargetCaches() {
    console.log('🧹 CLEARING ALL TARGET CACHES...');
    
    const targetComputerManager = window.viewManager?.starfieldManager?.targetComputerManager;
    const starChartsIntegration = window.viewManager?.navigationSystemManager?.starChartsIntegration;
    
    let cleared = 0;
    
    if (targetComputerManager?.knownTargets) {
        const size = targetComputerManager.knownTargets.size;
        targetComputerManager.knownTargets.clear();
        console.log(`  ✅ Cleared TargetComputerManager.knownTargets (${size} items)`);
        cleared++;
    }
    
    if (starChartsIntegration?.enhancedTargets) {
        const size = starChartsIntegration.enhancedTargets.size;
        starChartsIntegration.enhancedTargets.clear();
        console.log(`  ✅ Cleared StarChartsIntegration.enhancedTargets (${size} items)`);
        cleared++;
    }
    
    if (cleared === 0) {
        console.log('  ❌ No caches found to clear');
    } else {
        console.log(`  🎯 Cleared ${cleared} caches. Run updateTargetList() to repopulate.`);
    }
}

function updateTargetList() {
    console.log('🔄 UPDATING TARGET LIST...');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (starfieldManager?.updateTargetList) {
        starfieldManager.updateTargetList();
        console.log('  ✅ Target list updated');
        
        // Show new target list
        const targetObjects = starfieldManager.targetComputerManager?.targetObjects || [];
        console.log(`  📊 New target list (${targetObjects.length} targets):`);
        targetObjects.forEach((target, index) => {
            console.log(`    [${index}] ${target.name} - ID: "${target.id}"`);
        });
    } else {
        console.log('  ❌ StarfieldManager.updateTargetList() not available');
    }
}

function resumeStarChartsSync() {
    console.log('▶️ RESUMING STARCHARTS SYNC...');
    
    const starChartsIntegration = window.viewManager?.navigationSystemManager?.starChartsIntegration;
    if (starChartsIntegration) {
        starChartsIntegration.pauseSync = false;
        console.log('  ✅ StarCharts integration sync resumed');
    } else {
        console.log('  ❌ StarChartsIntegration not available');
    }
}

function pauseStarChartsSync() {
    console.log('⏸️ PAUSING STARCHARTS SYNC...');
    
    const starChartsIntegration = window.viewManager?.navigationSystemManager?.starChartsIntegration;
    if (starChartsIntegration) {
        starChartsIntegration.pauseSync = true;
        console.log('  ✅ StarCharts integration sync paused');
    } else {
        console.log('  ❌ StarChartsIntegration not available');
    }
}

function fixSectorContamination() {
    console.log('🔧 FIXING SECTOR CONTAMINATION...');
    console.log('This simulates the warp completion sequence to clean up old sector data.');
    console.log('');
    
    // Step 1: Pause StarCharts integration
    console.log('Step 1: Pausing StarCharts integration...');
    pauseStarChartsSync();
    
    // Step 2: Clear all caches
    console.log('Step 2: Clearing all target caches...');
    clearAllTargetCaches();
    
    // Step 3: Clear StarCharts integration enhanced targets cache
    console.log('Step 3: Clearing StarCharts integration cache...');
    const starChartsIntegration = window.viewManager?.navigationSystemManager?.starChartsIntegration;
    if (starChartsIntegration?.enhancedTargets) {
        const size = starChartsIntegration.enhancedTargets.size;
        starChartsIntegration.enhancedTargets.clear();
        console.log(`  ✅ Cleared StarCharts enhanced targets cache (${size} items)`);
    }
    
    // Step 4: Force update target list
    console.log('Step 4: Updating target list...');
    updateTargetList();
    
    // Step 5: Wait a moment, then resume sync
    console.log('Step 5: Resuming StarCharts sync after cleanup...');
    setTimeout(() => {
        resumeStarChartsSync();
        console.log('');
        console.log('🎯 CONTAMINATION FIX COMPLETE!');
        console.log('Run analyzeSectorState() to verify the fix.');
    }, 1000);
}

function traceContamination() {
    console.log('🔍 TRACING CONTAMINATION SOURCE...');
    console.log('This will monitor target additions in real-time');
    
    const targetComputerManager = window.viewManager?.starfieldManager?.targetComputerManager;
    if (!targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    // Override the targetObjects setter to trace additions
    let originalTargetObjects = targetComputerManager.targetObjects;
    Object.defineProperty(targetComputerManager, 'targetObjects', {
        get: function() {
            return this._targetObjects || [];
        },
        set: function(value) {
            console.log('🎯 TARGET OBJECTS BEING SET:', value?.map(t => `${t.name} (${t.id})`));
            console.trace('Stack trace for target objects assignment:');
            this._targetObjects = value;
        }
    });
    
    // Initialize with current value
    targetComputerManager._targetObjects = originalTargetObjects;
    
    // Override the push method to trace individual additions
    const originalPush = Array.prototype.push;
    if (targetComputerManager.targetObjects) {
        targetComputerManager.targetObjects.push = function(...items) {
            items.forEach(item => {
                console.log(`🎯 TARGET BEING ADDED: ${item.name} (${item.id})`);
                console.trace('Stack trace for target addition:');
            });
            return originalPush.apply(this, items);
        };
    }
    
    console.log('✅ Contamination tracing enabled');
    console.log('Now warp to another sector and watch for contamination sources');
}

// B1 Distance Check Function
function checkB1Distances() {
    console.log('🔍 B1 DISTANCE CHECK');
    console.log('==================');
    
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starfieldManager = viewManager?.starfieldManager;
    const starChartsManager = starfieldManager?.starChartsManager;
    
    if (!solarSystemManager) {
        console.error('❌ SolarSystemManager not found');
        return;
    }
    
    const currentSector = solarSystemManager.currentSector;
    const playerPosition = starfieldManager?.camera?.position;
    const discoveryRadius = starChartsManager?.getDiscoveryRadius() || 150;
    
    console.log(`Current Sector: ${currentSector}`);
    console.log(`Player Position: (${playerPosition?.x?.toFixed(1) || '?'}, ${playerPosition?.y?.toFixed(1) || '?'}, ${playerPosition?.z?.toFixed(1) || '?'})`);
    console.log(`Discovery Radius: ${discoveryRadius}km`);
    console.log('');
    
    if (currentSector !== 'B1') {
        console.log('⚠️ Not in B1 sector. Warp to B1 first.');
        return;
    }
    
    const celestialBodies = solarSystemManager.getCelestialBodies();
    if (!celestialBodies || celestialBodies.size === 0) {
        console.log('❌ No celestial bodies found in B1');
        return;
    }
    
    console.log('🌌 B1 CELESTIAL BODY DISTANCES:');
    
    const bodies = [];
    for (const [key, body] of celestialBodies.entries()) {
        const info = solarSystemManager.getCelestialBodyInfo(body);
        const distance = calculateDistance(playerPosition, body.position);
        
        bodies.push({
            key,
            name: info?.name || 'Unknown',
            type: info?.type || 'Unknown',
            position: body.position,
            distance
        });
    }
    
    // Sort by distance
    bodies.sort((a, b) => a.distance - b.distance);
    
    bodies.forEach((body, index) => {
        const distanceStr = body.distance !== null ? `${body.distance.toFixed(1)}km` : 'N/A';
        const discoverable = body.distance <= discoveryRadius ? '✅ DISCOVERABLE' : '❌ TOO FAR';
        console.log(`  [${index}] ${body.name} (${body.type})`);
        console.log(`      Distance: ${distanceStr} ${discoverable}`);
        console.log(`      Position: (${body.position?.x?.toFixed(1) || '?'}, ${body.position?.y?.toFixed(1) || '?'}, ${body.position?.z?.toFixed(1) || '?'})`);
    });
    
    console.log('');
    console.log('📊 SUMMARY:');
    const discoverableBodies = bodies.filter(b => b.distance <= discoveryRadius);
    const tooFarBodies = bodies.filter(b => b.distance > discoveryRadius);
    
    console.log(`  Total bodies: ${bodies.length}`);
    console.log(`  Discoverable (≤${discoveryRadius}km): ${discoverableBodies.length}`);
    console.log(`  Too far (>${discoveryRadius}km): ${tooFarBodies.length}`);
    
    if (tooFarBodies.length > 0) {
        console.log('');
        console.log('💡 RECOMMENDATIONS:');
        console.log(`  - Fly closer to planets (closest planet is ${bodies.find(b => b.type === 'planet')?.distance?.toFixed(1) || 'N/A'}km away)`);
        console.log(`  - Consider increasing discovery radius beyond ${discoveryRadius}km`);
        console.log(`  - Or reduce planet distances in procedural generation`);
    }
}

// Export functions to global scope
window.analyzeSectorState = analyzeSectorState;
window.clearAllTargetCaches = clearAllTargetCaches;
window.updateTargetList = updateTargetList;
window.resumeStarChartsSync = resumeStarChartsSync;
window.pauseStarChartsSync = pauseStarChartsSync;
window.fixSectorContamination = fixSectorContamination;
window.traceContamination = traceContamination;
window.checkB1Distances = checkB1Distances;

console.log('🔧 WARP DIAGNOSTIC TOOLS LOADED');
console.log('Available functions:');
console.log('  • analyzeSectorState() - Full sector analysis');
console.log('  • checkB1Distances() - Check B1 planet distances and discoverability');
console.log('  • clearAllTargetCaches() - Clear all target caches');
console.log('  • updateTargetList() - Force target list update');
console.log('  • resumeStarChartsSync() - Resume StarCharts sync');
console.log('  • pauseStarChartsSync() - Pause StarCharts sync');
console.log('  • fixSectorContamination() - Complete contamination fix');
console.log('  • traceContamination() - Trace where contamination comes from');
console.log('');
console.log('👉 Run fixSectorContamination() to fix the current issue');
console.log('👉 Run analyzeSectorState() to diagnose problems');
console.log('');
console.log('🔧 ENABLING DEBUG CHANNELS...');
if (window.debugEnable) {
    window.debugEnable('UTILITY', 'TARGETING');
    console.log('✅ Enabled UTILITY and TARGETING debug channels');
} else {
    console.log('❌ debugEnable function not available');
}
