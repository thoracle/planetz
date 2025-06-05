// Test script to verify target computer HUD info display fix
// Load this after the game loads to check target computer functionality

console.log("🧪 Starting Target Computer HUD Info Display Fix Verification...");

function testTargetComputerHUDInfo() {
    console.log("🔍 Testing target computer HUD info display...");
    
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
        
        // Test 1: Check if target computer is available
        const ship = starfieldManager.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        
        if (!targetComputer) {
            console.error("❌ Target computer system not found");
            return;
        }
        
        console.log("✅ Target computer system found:", targetComputer);
        
        // Test 2: Check if target display elements exist
        const targetInfoDisplay = document.getElementById('targetInfoDisplay');
        const targetHUD = document.getElementById('targetHUD');
        
        if (!targetInfoDisplay) {
            console.error("❌ Target info display element not found");
            return;
        }
        
        if (!targetHUD) {
            console.error("❌ Target HUD element not found");
            return;
        }
        
        console.log("✅ Target display elements found");
        console.log("   - Target info display:", targetInfoDisplay);
        console.log("   - Target HUD:", targetHUD);
        
        // Test 3: Enable target computer if not already enabled
        if (!starfieldManager.targetComputerEnabled) {
            console.log("🔧 Enabling target computer...");
            starfieldManager.toggleTargetComputer();
        }
        
        console.log("✅ Target computer enabled:", starfieldManager.targetComputerEnabled);
        
        // Test 4: Check if updateTargetDisplay method exists and is callable
        if (typeof starfieldManager.updateTargetDisplay !== 'function') {
            console.error("❌ updateTargetDisplay method not found");
            return;
        }
        
        console.log("✅ updateTargetDisplay method found");
        
        // Test 5: Force update target list and display
        console.log("🔧 Updating target list...");
        starfieldManager.updateTargetList();
        
        // Test 6: Check if target list was populated
        console.log("📊 Target list info:");
        console.log("   - Target objects count:", starfieldManager.targetObjects?.length || 0);
        console.log("   - Current target index:", starfieldManager.currentTargetIndex);
        console.log("   - Current target:", starfieldManager.currentTarget);
        
        // Test 7: Force call updateTargetDisplay directly
        console.log("🔧 Calling updateTargetDisplay directly...");
        starfieldManager.updateTargetDisplay();
        
        // Test 8: Check target info display visibility and content
        const targetInfoStyle = window.getComputedStyle(targetInfoDisplay);
        console.log("📱 Target info display status:");
        console.log("   - Display style:", targetInfoStyle.display);
        console.log("   - Visibility:", targetInfoStyle.visibility);
        console.log("   - Content HTML:", targetInfoDisplay.innerHTML.substring(0, 200) + "...");
        
        // Test 9: Check target HUD visibility
        const targetHUDStyle = window.getComputedStyle(targetHUD);
        console.log("📱 Target HUD status:");
        console.log("   - Display style:", targetHUDStyle.display);
        console.log("   - Visibility:", targetHUDStyle.visibility);
        
        // Test 10: Cycle through targets if available
        if (starfieldManager.targetObjects && starfieldManager.targetObjects.length > 0) {
            console.log("🔧 Testing target cycling...");
            starfieldManager.cycleTarget();
            
            setTimeout(() => {
                console.log("📊 After cycling target:");
                console.log("   - Current target index:", starfieldManager.currentTargetIndex);
                console.log("   - Current target:", starfieldManager.currentTarget);
                console.log("   - Target info content:", targetInfoDisplay.innerHTML.substring(0, 200) + "...");
            }, 100);
        }
        
        // Test 11: Check target distance formatting
        if (typeof starfieldManager.formatDistance === 'function') {
            console.log("🔧 Testing distance formatting...");
            console.log("   - 1000 km:", starfieldManager.formatDistance(1000));
            console.log("   - 1500000 km:", starfieldManager.formatDistance(1500000));
            console.log("   - 2500000000 km:", starfieldManager.formatDistance(2500000000));
        }
        
        // Test 12: Check target sorting
        if (typeof starfieldManager.sortTargetsByDistance === 'function') {
            console.log("🔧 Testing target sorting...");
            starfieldManager.sortTargetsByDistance();
            console.log("✅ Target sorting completed");
        }
        
        console.log("✅ Target Computer HUD Info Display Fix Test Completed!");
        
    } catch (error) {
        console.error("❌ Error during target computer HUD info test:", error);
        console.error("Stack trace:", error.stack);
    }
}

function testUpdateLogicFix() {
    console.log("🔍 Testing update logic fix...");
    
    try {
        const game = window.game;
        const starfieldManager = game?.starfieldManager;
        
        if (!starfieldManager) {
            console.error("❌ StarfieldManager not available");
            return;
        }
        
        // Test the fix: updateTargetDisplay should be called when target computer is enabled
        // even without a current target
        console.log("🔧 Testing update logic without current target...");
        
        const originalTarget = starfieldManager.currentTarget;
        
        // Temporarily clear current target
        starfieldManager.currentTarget = null;
        starfieldManager.currentTargetIndex = -1;
        
        // Enable target computer
        starfieldManager.targetComputerEnabled = true;
        
        // Call update method (simulating game loop)
        starfieldManager.update(0.016); // 60 FPS
        
        console.log("✅ Update method called without current target");
        
        // Restore original target
        starfieldManager.currentTarget = originalTarget;
        
        console.log("🔧 Testing update logic with current target...");
        
        // Test with a target
        if (starfieldManager.targetObjects && starfieldManager.targetObjects.length > 0) {
            starfieldManager.currentTarget = starfieldManager.targetObjects[0].object;
            starfieldManager.currentTargetIndex = 0;
            
            // Call update method
            starfieldManager.update(0.016);
            
            console.log("✅ Update method called with current target");
        }
        
        console.log("✅ Update logic fix test completed!");
        
    } catch (error) {
        console.error("❌ Error during update logic test:", error);
    }
}

// Auto-run tests when script loads
if (window.game && window.game.starfieldManager) {
    setTimeout(() => {
        testTargetComputerHUDInfo();
        setTimeout(() => {
            testUpdateLogicFix();
        }, 1000);
    }, 2000);
} else {
    console.log("⏳ Waiting for game to load...");
    const checkInterval = setInterval(() => {
        if (window.game && window.game.starfieldManager) {
            clearInterval(checkInterval);
            setTimeout(() => {
                testTargetComputerHUDInfo();
                setTimeout(() => {
                    testUpdateLogicFix();
                }, 1000);
            }, 1000);
        }
    }, 1000);
}

// Expose test functions globally for manual testing
window.testTargetComputerHUDInfo = testTargetComputerHUDInfo;
window.testUpdateLogicFix = testUpdateLogicFix; 