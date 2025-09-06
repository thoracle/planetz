// Test script to verify wireframe fixes for Star Charts targeting
// Copy and paste this into the browser console to test wireframe behavior

(function() {
    console.log('🎯 WIREFRAME FIX VERIFICATION TEST');
    console.log('=================================\n');

    // Test 1: Check if Star Charts manager is available
    console.log('1️⃣ Checking Star Charts Manager:');
    const starChartsManager = window.viewManager?.navigationSystemManager?.starChartsManager;
    if (!starChartsManager) {
        console.log('❌ Star Charts Manager not found');
        return;
    }
    console.log('✅ Star Charts Manager available');

    // Test 2: Check if Target Computer Manager is available
    console.log('\n2️⃣ Checking Target Computer Manager:');
    const targetComputerManager = window.viewManager?.starfieldManager?.targetComputerManager;
    if (!targetComputerManager) {
        console.log('❌ Target Computer Manager not found');
        return;
    }
    console.log('✅ Target Computer Manager available');

    // Test 3: Check discovered objects
    console.log('\n3️⃣ Checking Discovered Objects:');
    const discovered = starChartsManager.getDiscoveredObjects();
    console.log(`📊 Discovered objects: ${discovered.length}`);
    if (discovered.length === 0) {
        console.log('⚠️ No objects discovered yet. Try flying around or enable test mode:');
        console.log('   window.STAR_CHARTS_DISCOVER_ALL = true; then reload');
        return;
    }

    // Test 4: Test object selection and wireframe creation
    console.log('\n4️⃣ Testing Object Selection and Wireframe Creation:');

    // Get first discovered object for testing
    const testObjectId = discovered[0];
    const testObjectData = starChartsManager.getObjectData(testObjectId);

    if (!testObjectData) {
        console.log('❌ Could not get object data for testing');
        return;
    }

    console.log(`🎯 Testing with object: ${testObjectData.name} (${testObjectData.type})`);

    // Test Star Charts selection
    console.log('\n📡 Testing Star Charts object selection...');
    const selectionSuccess = starChartsManager.selectObjectById(testObjectId);
    console.log(`🎯 Star Charts selection result: ${selectionSuccess ? '✅' : '❌'}`);

    // Wait a moment for target to be set
    setTimeout(() => {
        // Check current target in Target Computer
        const currentTarget = targetComputerManager.currentTarget;
        console.log('\n🎯 Target Computer current target:', currentTarget?.name || 'none');

        if (currentTarget) {
            // Check target data processing
            const currentTargetData = targetComputerManager.getCurrentTargetData();
            console.log('🎯 Target data from getCurrentTargetData:', currentTargetData);

            if (currentTargetData) {
                console.log(`✅ Target type from Star Charts: ${currentTargetData.type}`);
                console.log(`✅ Target name: ${currentTargetData.name}`);

                // Test wireframe creation
                console.log('\n🎨 Testing wireframe creation...');
                targetComputerManager.createTargetWireframe();

                // Check if wireframe was created
                setTimeout(() => {
                    const hasWireframe = !!targetComputerManager.targetWireframe;
                    console.log(`🎨 Wireframe created: ${hasWireframe ? '✅' : '❌'}`);

                    if (hasWireframe) {
                        console.log('🎨 Wireframe geometry type should match Star Charts object type');
                        console.log(`🎨 Expected wireframe for type: ${currentTargetData.type}`);

                        // Test different object types
                        testWireframeForType('star', 'star-shaped geometry');
                        testWireframeForType('planet', 'icosahedron geometry');
                        testWireframeForType('moon', 'octahedron geometry');
                        testWireframeForType('navigation_beacon', 'sphere geometry');
                        testWireframeForType('space_station', 'torus geometry');

                        console.log('\n✅ WIREFRAME TEST COMPLETE');
                        console.log('Check console logs above for "Creating [TYPE] wireframe" messages');
                        console.log('The wireframes should now prioritize Star Charts types over spatial manager metadata');
                    }
                }, 100);
            }
        } else {
            console.log('❌ No current target found in Target Computer');
        }
    }, 500);

    function testWireframeForType(expectedType, expectedGeometry) {
        console.log(`\n🔍 Testing ${expectedType} wireframe:`);
        console.log(`   Expected geometry: ${expectedGeometry}`);
        console.log(`   Should see: "Creating ${expectedType.toUpperCase()} wireframe" in logs`);
    }

    // Test 5: Instructions for manual testing
    console.log('\n📋 MANUAL TESTING INSTRUCTIONS:');
    console.log('================================');
    console.log('1. Open Star Charts (press C key)');
    console.log('2. Click on different objects (star, planet, moon, beacon, station)');
    console.log('3. Check that wireframes match the object types:');
    console.log('   - Star: radiating star shape');
    console.log('   - Planet: spherical/icosahedron');
    console.log('   - Moon: octahedral');
    console.log('   - Beacon: spherical with triangles');
    console.log('   - Station: torus/ring shape');
    console.log('4. Compare with TAB (Target Ahead) targeting - should match exactly');

})();
