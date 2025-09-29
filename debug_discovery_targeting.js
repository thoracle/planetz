/**
 * PlanetZ Discovery & Targeting Debug Script
 * ==========================================
 * 
 * Comprehensive debugging tool for discovery system and target computer issues.
 * This script helps diagnose and fix:
 * 
 * 1. A0 objects showing teal (undiscovered) color despite being discovered
 * 2. B1 planets not being discovered when flying near them  
 * 3. A0 targets appearing in B1 target computer (contamination)
 * 4. Discovery state inconsistencies between systems
 * 
 * Usage: Copy this entire file and paste into browser console, then run:
 * > analyzeDiscoveryState()
 * > checkTargetingContamination()
 * > fixDiscoveryColors()
 * > 
 */

// Enable debug channels immediately
if (window.debugEnable) {
    window.debugEnable('UTILITY', 'TARGETING', 'STAR_CHARTS');
    console.log('✅ Enabled UTILITY, TARGETING, and STAR_CHARTS debug channels');
} else {
    console.log('❌ debugEnable function not available');
}

function analyzeDiscoveryState() {
    console.log('🔍 DISCOVERY STATE ANALYSIS');
    console.log('===========================');
    
    // Get core managers
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starfieldManager = viewManager?.starfieldManager;
    const targetComputerManager = starfieldManager?.targetComputerManager;
    const starChartsManager = starfieldManager?.starChartsManager;
    const navigationSystemManager = viewManager?.navigationSystemManager;
    const starChartsIntegration = navigationSystemManager?.starChartsIntegration;
    
    if (!viewManager) {
        console.error('❌ ViewManager not found');
        return;
    }
    
    const currentSector = solarSystemManager?.currentSector || 'UNKNOWN';
    const playerPosition = starfieldManager?.camera?.position;
    const discoveredObjects = starChartsManager?.getDiscoveredObjects() || [];
    const discoveryRadius = starChartsManager?.getDiscoveryRadius() || 50;
    
    console.log('📊 SYSTEM STATUS:');
    console.log(`  Current Sector: ${currentSector}`);
    console.log(`  Player Position: (${playerPosition?.x?.toFixed(1) || '?'}, ${playerPosition?.y?.toFixed(1) || '?'}, ${playerPosition?.z?.toFixed(1) || '?'})`);
    console.log(`  Discovery Radius: ${discoveryRadius}km`);
    console.log(`  Total Discovered Objects: ${discoveredObjects.length}`);
    console.log('');
    
    // Analyze celestial bodies and their discovery status
    const celestialBodies = solarSystemManager?.getCelestialBodies();
    if (!celestialBodies || celestialBodies.size === 0) {
        console.log('❌ No celestial bodies found in current sector');
        return;
    }
    
    console.log('🌌 DISCOVERY STATUS BY OBJECT:');
    
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
    
    let discoverable = 0;
    let discovered = 0;
    let undiscoveredNearby = 0;
    
    bodies.forEach((body, index) => {
        const discoveryIcon = body.discovered ? '🔍' : '❓';
        const distanceStr = body.distance !== null ? `${body.distance.toFixed(1)}km` : 'N/A';
        const withinRange = body.distance <= discoveryRadius;
        const rangeIcon = withinRange ? '✅' : '❌';
        
        if (withinRange) {
            discoverable++;
            if (!body.discovered) {
                undiscoveredNearby++;
            }
        }
        
        if (body.discovered) {
            discovered++;
        }
        
        console.log(`  [${index}] ${discoveryIcon} ${body.name} (${body.type})`);
        console.log(`      Object ID: "${body.id}"`);
        console.log(`      Discovery ID: "${body.discoveryId}"`);
        console.log(`      Distance: ${distanceStr} ${rangeIcon}`);
        console.log(`      Discovered: ${body.discovered ? '✅ YES' : '❌ NO'}`);
        console.log(`      Position: (${body.position?.x?.toFixed(1) || '?'}, ${body.position?.y?.toFixed(1) || '?'}, ${body.position?.z?.toFixed(1) || '?'})`);
    });
    
    console.log('');
    console.log('📊 DISCOVERY SUMMARY:');
    console.log(`  Total objects in sector: ${bodies.length}`);
    console.log(`  Objects within discovery range (≤${discoveryRadius}km): ${discoverable}`);
    console.log(`  Objects discovered: ${discovered}`);
    console.log(`  Undiscovered objects nearby: ${undiscoveredNearby}`);
    
    if (undiscoveredNearby > 0) {
        console.log('');
        console.log('⚠️ DISCOVERY ISSUES DETECTED:');
        console.log(`  ${undiscoveredNearby} objects are within discovery range but not discovered`);
        console.log('  This may indicate discovery system problems');
    }
    
    // Check for cross-sector contamination in discovered objects
    const crossSectorDiscovered = discoveredObjects.filter(id => 
        !id.startsWith(currentSector + '_') && 
        !id.toLowerCase().startsWith(currentSector.toLowerCase() + '_')
    );
    
    if (crossSectorDiscovered.length > 0) {
        console.log('');
        console.log('🚨 DISCOVERY CONTAMINATION DETECTED:');
        console.log(`  ${crossSectorDiscovered.length} discovered objects from other sectors:`);
        crossSectorDiscovered.forEach(id => {
            console.log(`    - ${id}`);
        });
    }
    
    console.log('');
    console.log('🔧 RECOMMENDATIONS:');
    if (undiscoveredNearby > 0) {
        console.log('  • Run forceDiscoveryCheck() to trigger discovery for nearby objects');
        console.log('  • Check if discovery system is running properly');
    }
    if (crossSectorDiscovered.length > 0) {
        console.log('  • Run clearDiscoveryContamination() to clean up cross-sector discoveries');
    }
    console.log('  • Run fixDiscoveryColors() to fix display color issues');
}

function checkTargetingContamination() {
    console.log('🎯 TARGETING CONTAMINATION CHECK');
    console.log('===============================');
    
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starfieldManager = viewManager?.starfieldManager;
    const targetComputerManager = starfieldManager?.targetComputerManager;
    const starChartsIntegration = viewManager?.navigationSystemManager?.starChartsIntegration;
    
    if (!targetComputerManager) {
        console.error('❌ TargetComputerManager not found');
        return;
    }
    
    const currentSector = solarSystemManager?.currentSector || 'UNKNOWN';
    const targetObjects = targetComputerManager.targetObjects || [];
    const knownTargets = targetComputerManager.knownTargets || new Map();
    const enhancedTargets = starChartsIntegration?.enhancedTargets || new Map();
    
    console.log('📊 TARGET COMPUTER STATE:');
    console.log(`  Current Sector: ${currentSector}`);
    console.log(`  Target Objects: ${targetObjects.length}`);
    console.log(`  Known Targets Cache: ${knownTargets.size}`);
    console.log(`  Enhanced Targets Cache: ${enhancedTargets.size}`);
    console.log('');
    
    // Check target objects for contamination
    const contaminatedTargets = targetObjects.filter(target => 
        target.id && !String(target.id).startsWith(currentSector + '_')
    );
    
    console.log('🎯 TARGET OBJECTS ANALYSIS:');
    if (contaminatedTargets.length > 0) {
        console.log(`🚨 CONTAMINATION DETECTED: ${contaminatedTargets.length} cross-sector targets found:`);
        contaminatedTargets.forEach((target, index) => {
            console.log(`  [${index}] ${target.name} - ID: "${target.id}"`);
        });
    } else {
        console.log('✅ No cross-sector contamination in target objects');
    }
    
    // Check known targets cache
    console.log('');
    console.log('💾 KNOWN TARGETS CACHE ANALYSIS:');
    const contaminatedKnown = [];
    for (const [id, target] of knownTargets.entries()) {
        if (id && !String(id).startsWith(currentSector + '_')) {
            contaminatedKnown.push({ id, target });
        }
    }
    
    if (contaminatedKnown.length > 0) {
        console.log(`🚨 CACHE CONTAMINATION: ${contaminatedKnown.length} cross-sector entries in knownTargets:`);
        contaminatedKnown.forEach((entry, index) => {
            console.log(`  [${index}] ${entry.target?.name || 'Unknown'} - ID: "${entry.id}"`);
        });
    } else {
        console.log('✅ No cross-sector contamination in knownTargets cache');
    }
    
    // Check enhanced targets cache
    console.log('');
    console.log('⚡ ENHANCED TARGETS CACHE ANALYSIS:');
    const contaminatedEnhanced = [];
    for (const [id, target] of enhancedTargets.entries()) {
        if (id && !String(id).startsWith(currentSector + '_')) {
            contaminatedEnhanced.push({ id, target });
        }
    }
    
    if (contaminatedEnhanced.length > 0) {
        console.log(`🚨 ENHANCED CACHE CONTAMINATION: ${contaminatedEnhanced.length} cross-sector entries:`);
        contaminatedEnhanced.forEach((entry, index) => {
            console.log(`  [${index}] ${entry.target?.name || 'Unknown'} - ID: "${entry.id}"`);
        });
    } else {
        console.log('✅ No cross-sector contamination in enhancedTargets cache');
    }
    
    console.log('');
    console.log('📝 CONTAMINATION SUMMARY:');
    const totalContamination = contaminatedTargets.length + contaminatedKnown.length + contaminatedEnhanced.length;
    if (totalContamination > 0) {
        console.log(`🚨 TOTAL CONTAMINATION: ${totalContamination} cross-sector entries found`);
        console.log('🔧 Run cleanTargetingContamination() to fix this issue');
    } else {
        console.log('✅ No targeting contamination detected - system is clean!');
    }
}

function cleanTargetingContamination() {
    console.log('🧹 CLEANING TARGETING CONTAMINATION');
    console.log('===================================');
    
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starfieldManager = viewManager?.starfieldManager;
    const targetComputerManager = starfieldManager?.targetComputerManager;
    const starChartsIntegration = viewManager?.navigationSystemManager?.starChartsIntegration;
    
    if (!targetComputerManager) {
        console.error('❌ TargetComputerManager not found');
        return;
    }
    
    const currentSector = solarSystemManager?.currentSector || 'UNKNOWN';
    let cleaned = 0;
    
    // Clean target objects array
    if (targetComputerManager.targetObjects) {
        const originalLength = targetComputerManager.targetObjects.length;
        targetComputerManager.targetObjects = targetComputerManager.targetObjects.filter(target => 
            !target.id || String(target.id).startsWith(currentSector + '_')
        );
        const removed = originalLength - targetComputerManager.targetObjects.length;
        if (removed > 0) {
            console.log(`✅ Removed ${removed} contaminated targets from targetObjects`);
            cleaned += removed;
        }
    }
    
    // Clean known targets cache
    if (targetComputerManager.knownTargets) {
        const originalSize = targetComputerManager.knownTargets.size;
        const toRemove = [];
        for (const [id, target] of targetComputerManager.knownTargets.entries()) {
            if (id && !String(id).startsWith(currentSector + '_')) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => targetComputerManager.knownTargets.delete(id));
        if (toRemove.length > 0) {
            console.log(`✅ Removed ${toRemove.length} contaminated entries from knownTargets cache`);
            cleaned += toRemove.length;
        }
    }
    
    // Clean enhanced targets cache
    if (starChartsIntegration?.enhancedTargets) {
        const originalSize = starChartsIntegration.enhancedTargets.size;
        const toRemove = [];
        for (const [id, target] of starChartsIntegration.enhancedTargets.entries()) {
            if (id && !String(id).startsWith(currentSector + '_')) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => starChartsIntegration.enhancedTargets.delete(id));
        if (toRemove.length > 0) {
            console.log(`✅ Removed ${toRemove.length} contaminated entries from enhancedTargets cache`);
            cleaned += toRemove.length;
        }
    }
    
    // Reset target index if current target was contaminated
    if (targetComputerManager.currentTarget && targetComputerManager.currentTarget.id) {
        const currentTargetId = String(targetComputerManager.currentTarget.id);
        if (!currentTargetId.startsWith(currentSector + '_')) {
            targetComputerManager.targetIndex = -1;
            targetComputerManager.currentTarget = null;
            console.log('✅ Reset current target (was contaminated)');
        }
    }
    
    // Force target list update
    if (starfieldManager.updateTargetList) {
        starfieldManager.updateTargetList();
        console.log('✅ Forced target list update');
    }
    
    console.log('');
    console.log(`🎯 CONTAMINATION CLEANUP COMPLETE: Removed ${cleaned} contaminated entries`);
    console.log('Run checkTargetingContamination() to verify the cleanup');
}

function fixDiscoveryColors() {
    console.log('🎨 FIXING DISCOVERY COLORS');
    console.log('=========================');
    
    const viewManager = window.viewManager;
    const starfieldManager = viewManager?.starfieldManager;
    const targetComputerManager = starfieldManager?.targetComputerManager;
    const starChartsManager = starfieldManager?.starChartsManager;
    
    if (!targetComputerManager || !starChartsManager) {
        console.error('❌ Required managers not found');
        return;
    }
    
    let fixed = 0;
    
    // Clear any cached discovery status on all targets
    if (targetComputerManager.targetObjects) {
        targetComputerManager.targetObjects.forEach(target => {
            if (target._lastDiscoveryStatus !== undefined) {
                target._lastDiscoveryStatus = undefined;
                fixed++;
            }
        });
    }
    
    // Clear cached discovery status on current target
    if (targetComputerManager.currentTarget && targetComputerManager.currentTarget._lastDiscoveryStatus !== undefined) {
        targetComputerManager.currentTarget._lastDiscoveryStatus = undefined;
        console.log(`✅ Cleared cached discovery status for current target: ${targetComputerManager.currentTarget.name}`);
    }
    
    // Force target computer display update
    if (targetComputerManager.updateTargetDisplay) {
        targetComputerManager.updateTargetDisplay();
        console.log('✅ Forced target computer display update');
    }
    
    // Force target list update
    if (starfieldManager.updateTargetList) {
        starfieldManager.updateTargetList();
        console.log('✅ Forced target list update');
    }
    
    // Force StarCharts UI refresh if available
    const starChartsUI = starChartsManager.starChartsUI;
    if (starChartsUI && starChartsUI.refreshObjectList) {
        starChartsUI.refreshObjectList();
        console.log('✅ Forced StarCharts UI refresh');
    }
    
    console.log('');
    console.log(`🎨 DISCOVERY COLOR FIX COMPLETE: Cleared ${fixed} cached discovery statuses`);
    console.log('Discovery colors should now reflect the correct state');
}

function forceDiscoveryCheck() {
    console.log('🔍 FORCING DISCOVERY CHECK');
    console.log('=========================');
    
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starfieldManager = viewManager?.starfieldManager;
    const starChartsManager = starfieldManager?.starChartsManager;
    
    if (!starChartsManager || !solarSystemManager) {
        console.error('❌ Required managers not found');
        return;
    }
    
    const currentSector = solarSystemManager.currentSector;
    const playerPosition = starfieldManager?.camera?.position;
    const discoveryRadius = starChartsManager.getDiscoveryRadius();
    
    if (!playerPosition) {
        console.error('❌ Player position not available');
        return;
    }
    
    console.log(`📍 Player Position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
    console.log(`🔍 Discovery Radius: ${discoveryRadius}km`);
    console.log('');
    
    // Force discovery check for all nearby objects
    const celestialBodies = solarSystemManager.getCelestialBodies();
    let checked = 0;
    let discovered = 0;
    
    for (const [key, body] of celestialBodies.entries()) {
        const distance = calculateDistance(playerPosition, body.position);
        const info = solarSystemManager.getCelestialBodyInfo(body);
        
        if (distance <= discoveryRadius) {
            checked++;
            
            // Force discovery event
            const objectId = `${currentSector}_${key}`;
            if (starChartsManager.handleDiscoveryEvent) {
                try {
                    starChartsManager.handleDiscoveryEvent(objectId, {
                        name: info?.name || 'Unknown',
                        type: info?.type || 'Unknown',
                        position: body.position
                    });
                    discovered++;
                    console.log(`✅ Forced discovery: ${info?.name || 'Unknown'} (${distance.toFixed(1)}km)`);
                } catch (error) {
                    console.error(`❌ Failed to force discovery for ${info?.name || 'Unknown'}:`, error);
                }
            }
        }
    }
    
    console.log('');
    console.log(`🔍 DISCOVERY CHECK COMPLETE: Checked ${checked} nearby objects, forced ${discovered} discoveries`);
    
    // Force display updates
    fixDiscoveryColors();
}

function clearDiscoveryContamination() {
    console.log('🧹 CLEARING DISCOVERY CONTAMINATION');
    console.log('===================================');
    
    const viewManager = window.viewManager;
    const solarSystemManager = viewManager?.solarSystemManager;
    const starChartsManager = viewManager?.starfieldManager?.starChartsManager;
    
    if (!starChartsManager || !solarSystemManager) {
        console.error('❌ Required managers not found');
        return;
    }
    
    const currentSector = solarSystemManager.currentSector;
    const discoveredObjects = starChartsManager.getDiscoveredObjects() || [];
    
    // Find cross-sector contamination
    const contaminated = discoveredObjects.filter(id => 
        !id.startsWith(currentSector + '_') && 
        !id.toLowerCase().startsWith(currentSector.toLowerCase() + '_')
    );
    
    if (contaminated.length === 0) {
        console.log('✅ No discovery contamination found');
        return;
    }
    
    console.log(`🚨 Found ${contaminated.length} contaminated discovery entries:`);
    contaminated.forEach(id => {
        console.log(`  - ${id}`);
    });
    
    // Clear contaminated discoveries (if method exists)
    if (starChartsManager.clearDiscoveredObjects) {
        // Clear all and re-add only current sector
        const currentSectorDiscoveries = discoveredObjects.filter(id => 
            id.startsWith(currentSector + '_') || 
            id.toLowerCase().startsWith(currentSector.toLowerCase() + '_')
        );
        
        starChartsManager.clearDiscoveredObjects();
        currentSectorDiscoveries.forEach(id => {
            if (starChartsManager.addDiscoveredObject) {
                starChartsManager.addDiscoveredObject(id);
            }
        });
        
        console.log(`✅ Cleared ${contaminated.length} contaminated discoveries`);
        console.log(`✅ Restored ${currentSectorDiscoveries.length} valid discoveries`);
    } else {
        console.log('⚠️ Cannot clear discoveries - clearDiscoveredObjects method not available');
        console.log('Manual intervention may be required');
    }
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

// Helper function to calculate distance
function calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return null;
    
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Comprehensive fix function
function fixAllDiscoveryTargetingIssues() {
    console.log('🔧 COMPREHENSIVE DISCOVERY & TARGETING FIX');
    console.log('==========================================');
    console.log('This will fix all known discovery and targeting issues...');
    console.log('');
    
    // Step 1: Clean targeting contamination
    console.log('Step 1: Cleaning targeting contamination...');
    cleanTargetingContamination();
    console.log('');
    
    // Step 2: Clear discovery contamination
    console.log('Step 2: Clearing discovery contamination...');
    clearDiscoveryContamination();
    console.log('');
    
    // Step 3: Fix discovery colors
    console.log('Step 3: Fixing discovery colors...');
    fixDiscoveryColors();
    console.log('');
    
    // Step 4: Force discovery check for nearby objects
    console.log('Step 4: Forcing discovery check...');
    forceDiscoveryCheck();
    console.log('');
    
    console.log('🎉 COMPREHENSIVE FIX COMPLETE!');
    console.log('Run analyzeDiscoveryState() and checkTargetingContamination() to verify fixes');
}

// Export functions to global scope
window.analyzeDiscoveryState = analyzeDiscoveryState;
window.checkTargetingContamination = checkTargetingContamination;
window.cleanTargetingContamination = cleanTargetingContamination;
window.fixDiscoveryColors = fixDiscoveryColors;
window.forceDiscoveryCheck = forceDiscoveryCheck;
window.clearDiscoveryContamination = clearDiscoveryContamination;
window.checkB1Distances = checkB1Distances;
window.fixAllDiscoveryTargetingIssues = fixAllDiscoveryTargetingIssues;

console.log('🔧 DISCOVERY & TARGETING DEBUG TOOLS LOADED');
console.log('===========================================');
console.log('Available functions:');
console.log('  🔍 analyzeDiscoveryState() - Analyze discovery system state');
console.log('  🎯 checkTargetingContamination() - Check for cross-sector target contamination');
console.log('  🧹 cleanTargetingContamination() - Clean cross-sector targets');
console.log('  🎨 fixDiscoveryColors() - Fix discovery color display issues');
console.log('  🔍 forceDiscoveryCheck() - Force discovery for nearby objects');
console.log('  🧹 clearDiscoveryContamination() - Clear cross-sector discoveries');
console.log('  📏 checkB1Distances() - Check B1 planet distances and discoverability');
console.log('  🔧 fixAllDiscoveryTargetingIssues() - Comprehensive fix for all issues');
console.log('');
console.log('👉 QUICK START:');
console.log('  • Run fixAllDiscoveryTargetingIssues() to fix all known issues');
console.log('  • Run analyzeDiscoveryState() to diagnose discovery problems');
console.log('  • Run checkTargetingContamination() to check for target contamination');
console.log('  • Run checkB1Distances() when in B1 to check planet distances');
console.log('');

