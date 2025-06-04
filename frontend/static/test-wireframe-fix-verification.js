// Test script to verify missing method fixes for StarfieldManager
// Load this after the game loads to check all functionality

console.log("🧪 Starting Wireframe Fix Verification...");

function testMissingMethods() {
    console.log("🔍 Testing missing methods restoration...");
    
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
        
        // Test 1: Check if createStarGeometry method exists
        console.log("\n🔬 Test 1: createStarGeometry method");
        if (typeof starfieldManager.createStarGeometry === 'function') {
            console.log("✅ createStarGeometry method exists");
            
            // Test creating star geometry
            try {
                const testGeometry = starfieldManager.createStarGeometry(10);
                if (testGeometry && testGeometry.attributes && testGeometry.attributes.position) {
                    console.log("✅ createStarGeometry successfully creates geometry");
                    console.log("   - Vertex count:", testGeometry.attributes.position.count);
                    
                    // Clean up test geometry
                    testGeometry.dispose();
                } else {
                    console.error("❌ createStarGeometry returned invalid geometry");
                }
            } catch (error) {
                console.error("❌ Error testing createStarGeometry:", error);
            }
        } else {
            console.error("❌ createStarGeometry method not found");
        }
        
        // Test 2: Check if createSubTargetIndicators method exists
        console.log("\n🔬 Test 2: createSubTargetIndicators method");
        if (typeof starfieldManager.createSubTargetIndicators === 'function') {
            console.log("✅ createSubTargetIndicators method exists");
            
            // Test method call (safe test - doesn't require actual target)
            try {
                starfieldManager.createSubTargetIndicators(0, 0); // Clear call
                console.log("✅ createSubTargetIndicators method callable");
            } catch (error) {
                console.error("❌ Error testing createSubTargetIndicators:", error);
            }
        } else {
            console.error("❌ createSubTargetIndicators method not found");
        }
        
        // Test 3: Check if updateSubTargetIndicators method exists
        console.log("\n🔬 Test 3: updateSubTargetIndicators method");
        if (typeof starfieldManager.updateSubTargetIndicators === 'function') {
            console.log("✅ updateSubTargetIndicators method exists");
            
            try {
                starfieldManager.updateSubTargetIndicators(); // Safe call
                console.log("✅ updateSubTargetIndicators method callable");
            } catch (error) {
                console.error("❌ Error testing updateSubTargetIndicators:", error);
            }
        } else {
            console.error("❌ updateSubTargetIndicators method not found");
        }
        
        // Test 4: Check if updateDirectionArrow method exists (from previous fix)
        console.log("\n🔬 Test 4: updateDirectionArrow method");
        if (typeof starfieldManager.updateDirectionArrow === 'function') {
            console.log("✅ updateDirectionArrow method exists");
            
            try {
                starfieldManager.updateDirectionArrow(); // Safe call
                console.log("✅ updateDirectionArrow method callable");
            } catch (error) {
                console.error("❌ Error testing updateDirectionArrow:", error);
            }
        } else {
            console.error("❌ updateDirectionArrow method not found");
        }
        
        // Test 5: Target computer wireframe test (if target available)
        console.log("\n🔬 Test 5: Target computer wireframe functionality");
        if (starfieldManager.targetComputerEnabled && starfieldManager.currentTarget) {
            console.log("✅ Target computer enabled with active target");
            console.log("   - Current target:", starfieldManager.currentTarget);
            
            // Check wireframe scene
            if (starfieldManager.wireframeScene) {
                console.log("✅ Wireframe scene exists");
                console.log("   - Children count:", starfieldManager.wireframeScene.children.length);
            } else {
                console.warn("⚠️ Wireframe scene not found");
            }
        } else {
            console.log("ℹ️ No active target for wireframe testing");
        }
        
        console.log("\n🎯 Wireframe Fix Verification Complete!");
        
    } catch (error) {
        console.error("❌ Verification test failed:", error);
    }
}

// Test target cycling to trigger wireframe creation
function testTargetCycling() {
    console.log("\n🎯 Testing target cycling to trigger wireframe creation...");
    
    try {
        const game = window.game;
        const starfieldManager = game?.starfieldManager;
        
        if (!starfieldManager) {
            console.error("❌ StarfieldManager not available");
            return;
        }
        
        // Check if target computer is enabled
        if (!starfieldManager.targetComputerEnabled) {
            console.log("⚠️ Target computer not enabled, enabling it...");
            starfieldManager.toggleTargetComputer();
        }
        
        // Try to cycle targets to test wireframe creation
        console.log("🔄 Cycling targets to test wireframe creation...");
        starfieldManager.cycleTarget(true); // Manual cycle
        
        setTimeout(() => {
            if (starfieldManager.currentTarget) {
                console.log("✅ Target cycling successful");
                console.log("   - Current target:", starfieldManager.currentTarget);
                
                // Check if wireframe was created
                if (starfieldManager.targetWireframe) {
                    console.log("✅ Target wireframe created successfully");
                    console.log("   - Wireframe type:", starfieldManager.targetWireframe.type);
                } else {
                    console.warn("⚠️ No wireframe found for current target");
                }
            } else {
                console.warn("⚠️ No target found after cycling");
            }
        }, 100);
        
    } catch (error) {
        console.error("❌ Target cycling test failed:", error);
    }
}

// Run tests when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            testMissingMethods();
            testTargetCycling();
        }, 2000);
    });
} else {
    setTimeout(() => {
        testMissingMethods();
        testTargetCycling();
    }, 1000);
} 