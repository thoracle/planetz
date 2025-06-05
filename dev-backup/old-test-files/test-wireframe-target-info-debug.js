// Test script to debug target computer HUD info display issues
// Load this after the game loads to check target computer functionality

console.log("🐛 Starting Target Computer HUD Info Debug...");

function debugTargetComputerHUD() {
    console.log("🔍 Debugging target computer HUD...");
    
    try {
        // Get the game and StarfieldManager
        const game = window.game;
        if (!game) {
            console.error("❌ Game instance not found");
            return;
        }
        
        const starfieldManager = game.starfieldManager;
        if (!starfieldManager) {
            console.error("❌ StarfieldManager not found");
            return;
        }
        
        console.log("✅ StarfieldManager found:", starfieldManager);
        
        // Check if target computer is enabled
        console.log("🎯 Target computer enabled:", starfieldManager.targetComputerEnabled);
        
        // Check if HUD elements exist
        console.log("🖥️ Target HUD element:", starfieldManager.targetHUD);
        console.log("🖥️ Target info display element:", starfieldManager.targetInfoDisplay);
        console.log("🖥️ Target reticle element:", starfieldManager.targetReticle);
        
        // Check target data
        console.log("🎯 Current target:", starfieldManager.currentTarget);
        console.log("🎯 Target objects:", starfieldManager.targetObjects);
        console.log("🎯 Target index:", starfieldManager.targetIndex);
        
        // Check if target info display is visible
        if (starfieldManager.targetInfoDisplay) {
            const styles = window.getComputedStyle(starfieldManager.targetInfoDisplay);
            console.log("🖥️ Target info display styles:");
            console.log("  - Display:", styles.display);
            console.log("  - Visibility:", styles.visibility);
            console.log("  - Opacity:", styles.opacity);
            console.log("  - HTML content:", starfieldManager.targetInfoDisplay.innerHTML);
        }
        
        // Check if target HUD is visible
        if (starfieldManager.targetHUD) {
            const styles = window.getComputedStyle(starfieldManager.targetHUD);
            console.log("🖥️ Target HUD styles:");
            console.log("  - Display:", styles.display);
            console.log("  - Visibility:", styles.visibility);
            console.log("  - Opacity:", styles.opacity);
        }
        
        // Test manual target cycling
        console.log("🔄 Testing manual target cycling...");
        if (starfieldManager.targetObjects && starfieldManager.targetObjects.length > 0) {
            console.log(`📊 Found ${starfieldManager.targetObjects.length} targets`);
            
            // Try to cycle to next target
            console.log("🔄 Cycling to next target...");
            starfieldManager.cycleTarget(true);
            
            // Check results
            console.log("🎯 After cycling - Current target:", starfieldManager.currentTarget);
            console.log("🎯 After cycling - Target index:", starfieldManager.targetIndex);
            
            // Check if target info display was updated
            if (starfieldManager.targetInfoDisplay) {
                console.log("🖥️ Target info after cycling:", starfieldManager.targetInfoDisplay.innerHTML);
            }
        } else {
            console.log("⚠️ No targets found - checking target list update...");
            
            // Try to update target list
            starfieldManager.updateTargetList();
            console.log("📊 After updateTargetList - Target objects:", starfieldManager.targetObjects);
        }
        
        // Test updateTargetDisplay method directly
        console.log("🔧 Testing updateTargetDisplay method directly...");
        starfieldManager.updateTargetDisplay();
        
        // Check results again
        if (starfieldManager.targetInfoDisplay) {
            console.log("🖥️ Target info after direct update:", starfieldManager.targetInfoDisplay.innerHTML);
        }
        
        // Check solar system manager
        console.log("🌟 Solar system manager:", starfieldManager.solarSystemManager);
        if (starfieldManager.solarSystemManager) {
            const bodies = starfieldManager.solarSystemManager.getCelestialBodies();
            console.log("🌍 Celestial bodies found:", bodies);
        }
        
        // Test getCurrentTargetData method
        const currentTargetData = starfieldManager.getCurrentTargetData();
        console.log("📊 Current target data:", currentTargetData);
        
    } catch (error) {
        console.error("❌ Error during debug:", error);
    }
}

function forceEnableTargetComputer() {
    console.log("🔧 Force enabling target computer...");
    
    const game = window.game;
    if (!game) {
        console.error("❌ Game instance not found");
        return;
    }
    
    const starfieldManager = game.starfieldManager;
    if (!starfieldManager) {
        console.error("❌ StarfieldManager not found");
        return;
    }
    
    // Force enable target computer
    starfieldManager.targetComputerEnabled = true;
    console.log("✅ Target computer enabled");
    
    // Show target HUD
    if (starfieldManager.targetHUD) {
        starfieldManager.targetHUD.style.display = 'block';
        console.log("✅ Target HUD display set to block");
    }
    
    // Update target list and display
    starfieldManager.updateTargetList();
    starfieldManager.updateTargetDisplay();
    
    console.log("✅ Target computer forced enabled and updated");
}

// Run debug after a short delay to ensure everything is loaded
setTimeout(() => {
    debugTargetComputerHUD();
    
    // Provide manual functions for testing
    window.debugTargetComputerHUD = debugTargetComputerHUD;
    window.forceEnableTargetComputer = forceEnableTargetComputer;
    
    console.log("🔧 Debug functions available:");
    console.log("  - debugTargetComputerHUD()");
    console.log("  - forceEnableTargetComputer()");
    
}, 2000); 