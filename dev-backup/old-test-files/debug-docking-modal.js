// Debug script for docking modal issues
console.log('🔧 Loading docking modal debug script...');

// Monitor docking modal state
function monitorDockingModal() {
    const starfieldManager = window.starfieldManager;
    if (!starfieldManager?.dockingModal) {
        console.log('⚠️ No docking modal found');
        return;
    }
    
    const dockingModal = starfieldManager.dockingModal;
    
    // Patch the findNearbyDockableObjects method to add extra debugging
    const originalFind = dockingModal.findNearbyDockableObjects.bind(dockingModal);
    dockingModal.findNearbyDockableObjects = function() {
        console.log('🔧 DEBUG: findNearbyDockableObjects called');
        
        const nearbyObjects = [];
        const playerPosition = this.starfieldManager.camera.position;
        
        console.log('🔧 DEBUG: playerPosition =', playerPosition);
        
        // Check if we have a solar system manager
        if (!this.starfieldManager.solarSystemManager) {
            console.log('🔧 DEBUG: no solar system manager');
            return nearbyObjects;
        }
        
        // Get celestial bodies using the proper method
        const celestialBodies = this.starfieldManager.solarSystemManager.getCelestialBodies();
        if (!celestialBodies || celestialBodies.size === 0) {
            console.log('🔧 DEBUG: no celestial bodies found');
            return nearbyObjects;
        }
        
        console.log(`🔧 DEBUG: checking ${celestialBodies.size} celestial bodies`);
        
        // Iterate through all celestial bodies
        celestialBodies.forEach((body, bodyId) => {
            console.log(`🔧 DEBUG: examining body ${bodyId}:`, body);
            
            // Only consider planets and moons (skip star)
            if (!bodyId.startsWith('planet_') && !bodyId.startsWith('moon_')) {
                console.log(`🔧 DEBUG: skipping ${bodyId} - not planet or moon`);
                return;
            }
            
            // Determine body type from the ID
            const bodyType = bodyId.startsWith('planet_') ? 'planet' : 'moon';
            console.log(`🔧 DEBUG: ${bodyId} is a ${bodyType}`);
            
            // Get detailed info about this celestial body
            const bodyInfo = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(body);
            console.log(`🔧 DEBUG: bodyInfo for ${bodyId}:`, bodyInfo);
            
            // Skip hostile targets
            if (bodyInfo && bodyInfo.diplomacy?.toLowerCase() === 'enemy') {
                console.log(`🔧 DEBUG: skipping hostile ${body.name || bodyId}`);
                return;
            }
            
            // Calculate distance
            const distance = this.starfieldManager.calculateDistance(playerPosition, body.position);
            console.log(`🔧 DEBUG: distance to ${bodyId}: ${distance}km`);
            
            // Determine docking range based on type
            let dockingRange = 1.5; // Default for moons
            if (bodyType === 'planet') {
                dockingRange = 4.0;
            }
            console.log(`🔧 DEBUG: docking range for ${bodyType}: ${dockingRange}km`);
            
            console.log(`🔧 DEBUG: checking ${bodyType} "${body.name || bodyId}" at distance ${distance.toFixed(3)}km (range: ${dockingRange}km)`);
            
            // Check if within docking range
            if (distance <= dockingRange) {
                const dockableObject = {
                    ...body, // Include all body properties (name, position, etc.)
                    type: bodyType, // Explicitly set the type
                    info: bodyInfo,
                    distance: distance,
                    dockingRange: dockingRange
                };
                
                nearbyObjects.push(dockableObject);
                console.log(`🔧 DEBUG: ADDED to nearbyObjects array:`, dockableObject);
                console.log(`🔧 DEBUG: nearbyObjects.length is now: ${nearbyObjects.length}`);
                
                console.log(`🎯 findNearbyDockableObjects: FOUND ${bodyType} "${body.name || bodyId}" at distance ${distance.toFixed(3)}km (within range: ${dockingRange}km)`);
            } else {
                console.log(`🔧 DEBUG: NOT in range - distance ${distance} > range ${dockingRange}`);
            }
        });
        
        // Sort by distance (closest first)
        nearbyObjects.sort((a, b) => a.distance - b.distance);
        
        console.log(`🔧 DEBUG: FINAL nearbyObjects array length: ${nearbyObjects.length}`);
        console.log(`🔧 DEBUG: FINAL nearbyObjects array:`, nearbyObjects);
        console.log(`🔍 findNearbyDockableObjects: found ${nearbyObjects.length} nearby dockable objects`);
        return nearbyObjects;
    };
    
    // Patch checkDockingConditions to add debugging
    const originalCheck = dockingModal.checkDockingConditions.bind(dockingModal);
    dockingModal.checkDockingConditions = function() {
        console.log('🔧 DEBUG: checkDockingConditions called');
        console.log('🔧 DEBUG: isDocked =', this.starfieldManager.isDocked);
        console.log('🔧 DEBUG: isVisible =', this.isVisible);
        
        // Don't check if already docked or modal is showing
        if (this.starfieldManager.isDocked || this.isVisible) {
            console.log('🔧 DEBUG: exiting early - docked or modal visible');
            return;
        }
        
        // Find nearby dockable objects automatically
        const nearbyDockableObjects = this.findNearbyDockableObjects();
        console.log('🔧 DEBUG: findNearbyDockableObjects returned:', nearbyDockableObjects);
        
        if (nearbyDockableObjects.length === 0) {
            console.log('🔧 DEBUG: no dockable objects found - exiting');
            return; // No dockable objects nearby
        }
        
        // Use the closest dockable object
        const target = nearbyDockableObjects[0];
        const targetInfo = nearbyDockableObjects[0].info;
        const distance = nearbyDockableObjects[0].distance;
        
        console.log('🔧 DEBUG: closest target:', target);
        console.log('🔧 DEBUG: targetInfo:', targetInfo);
        console.log('🔧 DEBUG: distance:', distance);
        
        // Don't show for hostile targets
        if (targetInfo.diplomacy?.toLowerCase() === 'enemy') {
            console.log('🔧 DEBUG: skipping - hostile target');
            return;
        }
        
        // Check cooldown
        const targetName = target.name || 'unknown';
        const cancelTimestamp = this.cancelledTargets.get(targetName);
        if (cancelTimestamp) {
            const timeSinceCancelled = Date.now() - cancelTimestamp;
            const remainingCooldown = this.cooldownDuration - timeSinceCancelled;
            
            if (remainingCooldown > 0) {
                console.log(`🔧 DEBUG: skipping - cooldown active for ${targetName}`);
                return;
            }
        }
        
        // Check if within docking range
        if (distance <= targetInfo.dockingRange) {
            console.log('🔧 DEBUG: ALL CONDITIONS MET - calling show()');
            this.show(target, targetInfo, distance);
        } else {
            console.log('🔧 DEBUG: not in docking range');
        }
    };
    
    // Patch show method to add debugging
    const originalShow = dockingModal.show.bind(dockingModal);
    dockingModal.show = function(target, targetInfo, distance) {
        console.log('🔧 DEBUG: show() called with:', {target, targetInfo, distance});
        console.log('🔧 DEBUG: isVisible before show:', this.isVisible);
        
        const result = originalShow(target, targetInfo, distance);
        
        console.log('🔧 DEBUG: isVisible after show:', this.isVisible);
        console.log('🔧 DEBUG: modal.style.display:', this.modal.style.display);
        
        return result;
    };
    
    console.log('✅ Docking modal debugging patches applied');
}

// Check current state
function checkCurrentState() {
    const starfieldManager = window.starfieldManager;
    if (!starfieldManager) {
        console.log('⚠️ No starfieldManager found');
        return;
    }
    
    console.log('🔧 Current state check:');
    console.log('  - starfieldManager:', !!starfieldManager);
    console.log('  - dockingModal:', !!starfieldManager.dockingModal);
    console.log('  - solarSystemManager:', !!starfieldManager.solarSystemManager);
    console.log('  - camera position:', starfieldManager.camera?.position);
    console.log('  - current speed:', starfieldManager.currentSpeed);
    console.log('  - isDocked:', starfieldManager.isDocked);
    
    if (starfieldManager.dockingModal) {
        console.log('  - modal isVisible:', starfieldManager.dockingModal.isVisible);
        console.log('  - modal cooldownDuration:', starfieldManager.dockingModal.cooldownDuration);
        console.log('  - modal cancelledTargets size:', starfieldManager.dockingModal.cancelledTargets?.size);
    }
    
    if (starfieldManager.solarSystemManager) {
        const bodies = starfieldManager.solarSystemManager.getCelestialBodies();
        console.log('  - celestial bodies count:', bodies?.size);
        if (bodies) {
            bodies.forEach((body, id) => {
                const distance = starfieldManager.calculateDistance(starfieldManager.camera.position, body.position);
                console.log(`    - ${id}: ${body.name} at ${distance.toFixed(3)}km`);
            });
        }
    }
}

// Auto-apply when game is ready
function waitForGame() {
    if (window.starfieldManager?.dockingModal) {
        monitorDockingModal();
        checkCurrentState();
    } else {
        console.log('⏳ Waiting for game to load...');
        setTimeout(waitForGame, 1000);
    }
}

waitForGame();

// Expose functions for manual use
window.debugDockingModal = {
    monitorDockingModal,
    checkCurrentState
};

console.log('🔧 Docking modal debug script loaded. Use window.debugDockingModal for manual controls.'); 