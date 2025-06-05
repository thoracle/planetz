// Simple Docking Modal Debug Script
console.log('🔧 Starting simple docking debug...');

function debugDockingModal() {
    // Check if we have the required objects
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    if (!window.starfieldManager.dockingModal) {
        console.error('❌ DockingModal not found');
        return;
    }
    
    const dm = window.starfieldManager.dockingModal;
    console.log('✅ DockingModal found');
    
    // Check if docking interval is running
    if (dm.dockingCheckInterval) {
        console.log('✅ Docking check interval is running');
    } else {
        console.error('❌ Docking check interval is NOT running');
        console.log('🔧 Starting docking check...');
        dm.startDockingCheck();
    }
    
    // Force a docking check right now
    console.log('🔍 Running manual docking check...');
    dm.checkDockingConditions();
    
    // Check what celestial bodies are nearby
    if (window.solarSystemManager) {
        const bodies = window.solarSystemManager.getCelestialBodies();
        console.log(`🌍 Found ${bodies.length} celestial bodies in system`);
        
        if (window.starfieldManager.ship) {
            const shipPos = window.starfieldManager.ship.mesh.position;
            console.log(`🚀 Ship position: x=${shipPos.x.toFixed(2)}, y=${shipPos.y.toFixed(2)}, z=${shipPos.z.toFixed(2)}`);
            
            bodies.forEach((body, index) => {
                const distance = shipPos.distanceTo(body.mesh.position);
                console.log(`📍 ${body.name}: distance = ${distance.toFixed(2)}`);
            });
        }
    }
}

// Run the debug
setTimeout(debugDockingModal, 2000);

// Add a global function to manually trigger
window.debugDocking = debugDockingModal;

console.log('🎯 Debug loaded. Use debugDocking() to run manual check'); 