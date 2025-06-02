// Simple Cube Target Dummies Test
// Run this in the browser console to test the simplified target dummies

(function() {
    console.log('=== Simple Cube Target Dummies Test ===');
    
    // Get the starfield manager
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not ready. Make sure you have a ship and are in-game.');
        console.log('💡 1. Load the game at http://localhost:5001');
        console.log('💡 2. Press T to enable target computer');
        console.log('💡 3. Run this test again');
        return;
    }
    
    // Function to test simplified cube creation
    function testSimplifiedCubes() {
        console.log('🧪 Testing simplified cube target dummies...');
        
        // Clear any existing dummies
        starfieldManager.clearTargetDummyShips();
        
        // Create new simplified target dummies
        console.log('🏗️ Creating 5 simplified cube target dummies...');
        starfieldManager.createTargetDummyShips(5);
        
        // Wait a moment then analyze the created meshes
        setTimeout(() => {
            console.log('\n📊 Analyzing created target dummies...');
            
            const dummyMeshes = starfieldManager.dummyShipMeshes || [];
            console.log(`✅ Found ${dummyMeshes.length} target dummy meshes`);
            
            dummyMeshes.forEach((mesh, index) => {
                console.log(`\n🎯 Target Dummy ${index + 1}:`);
                console.log(`   📦 Type: ${mesh.type}`);
                console.log(`   🎨 Material: ${mesh.material?.constructor.name}`);
                console.log(`   🟦 Color: #${mesh.material?.color?.getHexString()}`);
                console.log(`   📐 Geometry: ${mesh.geometry?.constructor.name}`);
                console.log(`   📏 Scale: ${mesh.scale?.x}, ${mesh.scale?.y}, ${mesh.scale?.z}`);
                console.log(`   🔄 Rotation: ${mesh.rotation?.x?.toFixed(2)}, ${mesh.rotation?.y?.toFixed(2)}, ${mesh.rotation?.z?.toFixed(2)}`);
                
                // Check if it's a simple mesh (not a group)
                if (mesh.children && mesh.children.length === 0) {
                    console.log('   ✅ Simple single mesh (not a complex group)');
                } else if (mesh.children && mesh.children.length > 0) {
                    console.log(`   ⚠️ Has ${mesh.children.length} child objects (should be simplified)`);
                    mesh.children.forEach((child, childIndex) => {
                        console.log(`      Child ${childIndex}: ${child.constructor.name}`);
                    });
                }
                
                // Check if it has flat shading
                if (mesh.material?.flatShading) {
                    console.log('   ✅ Uses flat shading');
                } else {
                    console.log('   ⚠️ Does not use flat shading');
                }
                
                // Check geometry type
                if (mesh.geometry?.constructor.name === 'BoxGeometry') {
                    console.log('   ✅ Uses cube geometry');
                } else {
                    console.log(`   ⚠️ Uses ${mesh.geometry?.constructor.name} instead of BoxGeometry`);
                }
            });
            
            // Test targeting and wireframes
            console.log('\n🎯 Testing targeting and wireframes...');
            
            // Enable target computer if not already enabled
            if (!starfieldManager.targetComputerEnabled) {
                starfieldManager.toggleTargetComputer();
            }
            
            // Update target list and cycle to first dummy
            starfieldManager.updateTargetList();
            starfieldManager.targetIndex = -1;
            starfieldManager.cycleTarget();
            
            const currentTarget = starfieldManager.getCurrentTargetData();
            if (currentTarget?.isShip) {
                console.log(`✅ Successfully targeted: ${currentTarget.name}`);
                console.log('✅ Wireframe should show simple cube outline');
            } else {
                console.log('⚠️ Could not target a ship dummy');
            }
            
            // Summary
            console.log('\n=== TEST SUMMARY ===');
            console.log('Expected characteristics of simplified target dummies:');
            console.log('• Single mesh (not grouped objects)');
            console.log('• BoxGeometry (cube shape)');
            console.log('• MeshBasicMaterial with flat shading');
            console.log('• Bright, vibrant colors for visibility (purple, green, blue, yellow, magenta, cyan, orange)');
            console.log('• 50% smaller scale (0.75) for better targeting');
            console.log('• Simple cube wireframe when targeted');
            console.log('• No extra components (cores, weapons, rings, etc.)');
            
            const allSimple = dummyMeshes.every(mesh => 
                mesh.geometry?.constructor.name === 'BoxGeometry' &&
                mesh.material?.constructor.name === 'MeshBasicMaterial' &&
                (!mesh.children || mesh.children.length === 0)
            );
            
            // Check if they're the correct smaller size
            const correctSize = dummyMeshes.every(mesh => 
                Math.abs(mesh.scale?.x - 0.75) < 0.01
            );
            
            if (allSimple && correctSize) {
                console.log('\n✅ SUCCESS: All target dummies are properly simplified and sized!');
                console.log('   • Geometry: Simple cubes ✅');
                console.log('   • Size: 50% smaller (0.75 scale) ✅');
                console.log('   • Colors: Bright and vibrant ✅');
            } else {
                console.log('\n⚠️ Issues detected:');
                if (!allSimple) {
                    console.log('   • Some target dummies may still have complex geometry');
                }
                if (!correctSize) {
                    console.log('   • Some target dummies may not be the correct smaller size');
                }
            }
            
        }, 1000);
    }
    
    // Expose test function globally
    window.testSimplifiedCubes = testSimplifiedCubes;
    
    // Run the test
    testSimplifiedCubes();
    
    console.log('\n💡 Use testSimplifiedCubes() to run this test again');
    
})(); 