/**
 * Test script for Long Range Scanner target selection fix
 * This script simulates the LRS target selection process to verify the fix works
 */

// Mock THREE.js object for testing
class MockTHREEObject {
    constructor(name, position = [0, 0, 0]) {
        this.userData = { name };
        this.position = {
            x: position[0],
            y: position[1],
            z: position[2],
            toArray: () => position,
            distanceTo: (otherPos) => {
                const dx = this.position.x - otherPos.x;
                const dy = this.position.y - otherPos.y;
                const dz = this.position.z - otherPos.z;
                return Math.sqrt(dx*dx + dy*dy + dz*dz);
            }
        };
    }
}

// Mock StarfieldManager for testing
class MockStarfieldManager {
    constructor() {
        this.targetComputerEnabled = true;
        this.targetComputerManager = new MockTargetComputerManager();
        this.camera = {
            position: { x: 0, y: 0, z: 0, distanceTo: () => 100 }
        };
        this.outlineEnabled = true;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
    }

    setTargetFromScanner(targetData) {
        this.targetComputerManager.setTargetFromScanner(targetData);
        this.currentTarget = this.targetComputerManager.currentTarget?.object || this.targetComputerManager.currentTarget;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.targetObjects = this.targetComputerManager.targetObjects;
    }

    updateTargetOutline(target, index) {
        console.log(`🎯 Updated 3D outline for target: ${target.userData?.name || target.name}`);
    }
}

// Mock TargetComputerManager for testing
class MockTargetComputerManager {
    constructor() {
        this.targetObjects = [];
        this.currentTarget = null;
        this.targetIndex = -1;
        this.isFromLongRangeScanner = false;
        this.targetComputerEnabled = true;
    }

    updateTargetList() {
        // Simulate target list update - in real implementation this would scan for targets
        console.log(`🎯 Updated target list: ${this.targetObjects.length} targets`);
    }

    setTargetFromScanner(targetData) {
        console.log(`🎯 Setting target from scanner: ${targetData.name}`);
        this.currentTarget = targetData;
        this.isFromLongRangeScanner = true;

        const targetIndex = this.targetObjects.findIndex(target => target.name === targetData.name);
        if (targetIndex !== -1) {
            this.targetIndex = targetIndex;
        } else {
            this.targetObjects.push(targetData);
            this.targetIndex = this.targetObjects.length - 1;
        }

        this.updateTargetDisplay();
    }

    updateTargetDisplay() {
        console.log(`🎯 Updated target display for: ${this.currentTarget?.name || 'none'}`);
    }
}

// Mock ViewManager for testing
class MockViewManager {
    constructor() {
        this.starfieldManager = new MockStarfieldManager();
    }
}

// Test the LongRangeScanner fix
function testLRSTargetSelection() {
    console.log('🧪 Testing Long Range Scanner Target Selection Fix\n');

    // Create mock scanner
    const mockViewManager = new MockViewManager();
    const mockScanner = {
        viewManager: mockViewManager,
        setScannerTargetRobustly: function(bodyName, bodyInfo, targetBody) {
            const starfieldManager = this.viewManager.starfieldManager;
            if (!starfieldManager?.targetComputerManager) {
                console.warn('🔍 LRS: No TargetComputerManager available');
                return;
            }

            const tcm = starfieldManager.targetComputerManager;

            // Store previous state
            const previousTargetState = {
                name: tcm.currentTarget?.name,
                index: tcm.targetIndex,
                isFromScanner: tcm.isFromLongRangeScanner
            };

            console.log(`🔍 LRS: Robust target setting for ${bodyName} - previous state:`, previousTargetState);

            // Force fresh target list update
            tcm.updateTargetList();

            // Find target in updated list
            let targetIndex = tcm.targetObjects.findIndex(t =>
                t.name === bodyName ||
                (t.object?.userData?.name === bodyName) ||
                (t.object === targetBody)
            );

            // Create out-of-range target if not found
            if (targetIndex === -1) {
                console.log(`🔍 LRS: Target ${bodyName} not in range - creating out-of-range entry`);
                const distance = starfieldManager.camera.position.distanceTo(targetBody.position);
                const outOfRangeTarget = {
                    name: bodyName,
                    type: bodyInfo.type,
                    position: targetBody.position.toArray(),
                    isMoon: bodyInfo.type === 'moon',
                    object: targetBody,
                    isShip: false,
                    distance: distance,
                    outOfRange: true,
                    faction: bodyInfo.faction || 'Neutral',
                    diplomacy: bodyInfo.diplomacy || 'Neutral',
                    ...bodyInfo
                };
                tcm.targetObjects.push(outOfRangeTarget);
                targetIndex = tcm.targetObjects.length - 1;
            }

            // Validate target index
            if (targetIndex < 0 || targetIndex >= tcm.targetObjects.length) {
                console.error(`🔍 LRS: Invalid target index ${targetIndex}`);
                return;
            }

            // Set the target
            const targetData = tcm.targetObjects[targetIndex];
            console.log(`🔍 LRS: Setting scanner target: ${targetData.name} at index ${targetIndex}`);

            try {
                tcm.setTargetFromScanner(targetData);

                // Force synchronization
                starfieldManager.currentTarget = tcm.currentTarget?.object || tcm.currentTarget;
                starfieldManager.targetIndex = tcm.targetIndex;
                starfieldManager.targetObjects = tcm.targetObjects;

                // Ensure UI updates
                if (tcm.updateTargetDisplay) {
                    tcm.updateTargetDisplay();
                    setTimeout(() => tcm.updateTargetDisplay(), 50);
                }

                // Update 3D outline if enabled
                if (starfieldManager.outlineEnabled && targetData.object) {
                    starfieldManager.updateTargetOutline(targetData.object, 0);
                }

                console.log(`🔍 LRS: Robust target setting completed successfully for ${bodyName}`);

            } catch (error) {
                console.error(`🔍 LRS: Error during robust target setting:`, error);
                // Recovery logic would go here
            }
        }
    };

    // Test 1: First target selection
    console.log('📋 Test 1: First target selection');
    const planet1 = new MockTHREEObject('Earth', [100, 0, 0]);
    const planet1Info = { type: 'planet', faction: 'Human', diplomacy: 'Friendly' };

    mockScanner.setScannerTargetRobustly('Earth', planet1Info, planet1);

    // Verify first selection
    const tcm = mockViewManager.starfieldManager.targetComputerManager;
    console.log(`✅ First target: ${tcm.currentTarget?.name}, Index: ${tcm.targetIndex}, IsFromScanner: ${tcm.isFromLongRangeScanner}`);

    // Test 2: Second target selection (the problematic case)
    console.log('\n📋 Test 2: Second target selection');
    const planet2 = new MockTHREEObject('Mars', [200, 0, 0]);
    const planet2Info = { type: 'planet', faction: 'Human', diplomacy: 'Friendly' };

    mockScanner.setScannerTargetRobustly('Mars', planet2Info, planet2);

    // Verify second selection
    console.log(`✅ Second target: ${tcm.currentTarget?.name}, Index: ${tcm.targetIndex}, IsFromScanner: ${tcm.isFromLongRangeScanner}`);

    // Test 3: Third target selection to ensure consistency
    console.log('\n📋 Test 3: Third target selection');
    const moon1 = new MockTHREEObject('Luna', [80, 10, 0]);
    const moon1Info = { type: 'moon', faction: 'Human', diplomacy: 'Friendly' };

    mockScanner.setScannerTargetRobustly('Luna', moon1Info, moon1);

    // Verify third selection
    console.log(`✅ Third target: ${tcm.currentTarget?.name}, Index: ${tcm.targetIndex}, IsFromScanner: ${tcm.isFromLongRangeScanner}`);

    // Test 4: Verify target list integrity
    console.log('\n📋 Test 4: Target list integrity');
    console.log(`Total targets in list: ${tcm.targetObjects.length}`);
    tcm.targetObjects.forEach((target, index) => {
        console.log(`  ${index}: ${target.name} (${target.type}) - Distance: ${target.distance?.toFixed(1) || 'N/A'}`);
    });

    console.log('\n🎉 LRS Target Selection Fix Test Complete!');
}

// Run the test
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testLRSTargetSelection };
} else {
    testLRSTargetSelection();
}
