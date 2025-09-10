/**
 * Expose StarChartsManager for Console Testing
 * 
 * This script makes the StarChartsManager instance accessible from the browser console
 * by creating convenient global references and helper functions.
 */

console.log('🔧 Exposing StarChartsManager for console testing...');

// Function to get StarChartsManager from the correct path
function getStarChartsManager() {
    // Try the correct path through NavigationSystemManager
    if (window.navigationSystemManager && window.navigationSystemManager.starChartsManager) {
        return window.navigationSystemManager.starChartsManager;
    }
    
    // Fallback: try through viewManager (if the structure changes)
    if (window.viewManager && window.viewManager.navigationSystemManager && window.viewManager.navigationSystemManager.starChartsManager) {
        return window.viewManager.navigationSystemManager.starChartsManager;
    }
    
    return null;
}

// Wait for the system to be ready and expose StarChartsManager
function exposeStarChartsManager() {
    const scm = getStarChartsManager();
    
    if (scm) {
        // Expose globally for easy access
        window.starChartsManager = scm;
        window.scm = scm; // Short alias
        
        console.log('✅ StarChartsManager exposed globally!');
        console.log('   Access via: window.starChartsManager or window.scm');
        console.log('   Discovery status:', {
            discoveredCount: scm.discoveredObjects.size,
            discoveryRadius: scm.getDiscoveryRadius(),
            currentSector: scm.currentSector
        });
        
        // Expose useful helper functions
        window.testStarCharts = {
            // Get discovery status
            getDiscoveryStatus: () => ({
                discoveredCount: scm.discoveredObjects.size,
                discoveredObjects: Array.from(scm.discoveredObjects),
                discoveryRadius: scm.getDiscoveryRadius(),
                playerPosition: scm.getPlayerPosition()
            }),
            
            // Check if object is discovered
            isDiscovered: (objectId) => scm.isDiscovered(objectId),
            
            // Get nearby objects
            getNearbyObjects: () => {
                const playerPos = scm.getPlayerPosition();
                const radius = scm.getDiscoveryRadius();
                return scm.spatialManager.getNearbyObjects(playerPos, radius);
            },
            
            // Simulate discovery (for testing)
            simulateDiscovery: (objectId) => {
                if (!scm.isDiscovered(objectId)) {
                    scm.addDiscoveredObject(objectId);
                    console.log(`🌟 Simulated discovery of ${objectId}`);
                } else {
                    console.log(`ℹ️ ${objectId} already discovered`);
                }
            },
            
            // Get all objects in current sector
            getAllObjects: () => {
                if (scm.objectDatabase && scm.objectDatabase[scm.currentSector]) {
                    return scm.objectDatabase[scm.currentSector];
                }
                return [];
            }
        };
        
        console.log('🧪 Test helpers exposed as window.testStarCharts');
        console.log('   Available methods:');
        console.log('   - testStarCharts.getDiscoveryStatus()');
        console.log('   - testStarCharts.isDiscovered(objectId)');
        console.log('   - testStarCharts.getNearbyObjects()');
        console.log('   - testStarCharts.simulateDiscovery(objectId)');
        console.log('   - testStarCharts.getAllObjects()');
        
        return true;
    } else {
        console.log('❌ StarChartsManager not yet available');
        console.log('   Available objects:', {
            navigationSystemManager: !!window.navigationSystemManager,
            viewManager: !!window.viewManager,
            starfieldManager: !!window.starfieldManager
        });
        return false;
    }
}

// Try to expose immediately
if (!exposeStarChartsManager()) {
    // If not ready, wait and retry
    console.log('⏳ Waiting for StarChartsManager to be ready...');
    
    const checkInterval = setInterval(() => {
        if (exposeStarChartsManager()) {
            clearInterval(checkInterval);
        }
    }, 1000);
    
    // Stop trying after 30 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('⚠️ Timeout waiting for StarChartsManager');
    }, 30000);
}
