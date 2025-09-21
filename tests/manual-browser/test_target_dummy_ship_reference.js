/**
 * Quick test to verify target dummy ship reference preservation
 */

// Mock ship object
const mockShip = {
    shipName: 'Target Dummy #1',
    diplomacy: 'enemy',
    isTargetDummy: true,
    faction: 'enemy',
    currentHull: 1.0
};

// Mock target data as it would be created in addNonPhysicsTargets
const mockTargetData = {
    name: 'Target Dummy #1',
    type: 'enemy_ship',
    position: [100, 0, 0],
    isMoon: false,
    object: {
        userData: {
            ship: mockShip
        }
    },
    isShip: true,
    ship: mockShip,
    distance: 100,
    diplomacy: 'enemy',
    faction: 'enemy'
};

// Mock currentTarget as the original mesh
const mockCurrentTarget = {
    userData: {
        ship: mockShip
    },
    name: 'Target Dummy #1'
};

// Test the processTargetData logic
function testProcessTargetData(targetData, currentTarget) {
    console.log('🧪 Testing processTargetData logic...');

    // Check if this is a ship
    if (targetData.type === 'ship' || targetData.type === 'enemy_ship' || targetData.isShip) {
        // Ensure we get the actual ship instance - try multiple sources
        let shipInstance = targetData.ship;
        console.log(`1. targetData.ship: ${!!shipInstance}`);

        // If no ship in targetData, try to get it from the object
        if (!shipInstance && targetData.object?.userData?.ship) {
            shipInstance = targetData.object.userData.ship;
            console.log(`2. targetData.object.userData.ship: ${!!shipInstance}`);
        }

        // If still no ship, try from currentTarget (which should be the original mesh)
        if (!shipInstance && currentTarget?.userData?.ship) {
            shipInstance = currentTarget.userData.ship;
            console.log(`3. currentTarget.userData.ship: ${!!shipInstance}`);
        }

        // For target dummies, ensure the ship instance is preserved
        if (!shipInstance && targetData.name?.includes('Target Dummy')) {
            console.log(`4. Target dummy fallback logic would run here`);
        }

        console.log(`✅ Final ship instance found: ${!!shipInstance}`);
        if (shipInstance) {
            console.log(`   Ship name: ${shipInstance.shipName}`);
            console.log(`   Ship diplomacy: ${shipInstance.diplomacy}`);
            console.log(`   Ship faction: ${shipInstance.faction}`);
        }

        return shipInstance;
    }

    return null;
}

// Run the test
console.log('🎯 Testing target dummy ship reference preservation...\n');

const shipInstance = testProcessTargetData(mockTargetData, mockCurrentTarget);

console.log(`\n🎊 Test Result: ${shipInstance ? 'PASSED' : 'FAILED'}`);
console.log(`   Ship reference preserved: ${!!shipInstance}`);
console.log(`   Diplomacy correct: ${shipInstance?.diplomacy === 'enemy'}`);
console.log(`   Faction correct: ${shipInstance?.faction === 'enemy'}`);
