// Test script to verify grid key calculations
// Run this in the browser console after loading the game

console.log('🧪 Testing Grid Key Calculations...');

setTimeout(() => {
    if (!window.navigationSystemManager?.starChartsManager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    const manager = window.navigationSystemManager.starChartsManager;

    console.log('✅ Star Charts Manager found');

    // Test grid key calculation for known object positions
    console.log('📊 Testing grid key calculations:');

    // Test some object positions from the debug logs
    const testPositions = [
        [0, 0, 0],              // A0_star
        [-299.38, -0.77, 19.23], // a0_helios_solar_array
        [205.61, 6.89, 218.46],  // a0_hermes_refinery
        [17.93, 1.17, -19.12]    // Player position
    ];

    const gridSize = manager.gridSize || 50;
    console.log(`Grid size: ${gridSize}`);

    testPositions.forEach((pos, index) => {
        const gridKey = manager.getGridKey(pos);
        const [gx, gy, gz] = gridKey.split(',').map(Number);

        console.log(`Position ${index}: [${pos.join(', ')}]`);
        console.log(`  → Grid key: ${gridKey}`);
        console.log(`  → Grid coords: (${gx}, ${gy}, ${gz})`);

        // Manual calculation
        const manualX = Math.floor(pos[0] / gridSize);
        const manualY = Math.floor(pos[1] / gridSize);
        const manualZ = Math.floor(pos[2] / gridSize);
        console.log(`  → Manual calc: (${manualX}, ${manualY}, ${manualZ})`);
        console.log(`  → Match: ${gx === manualX && gy === manualY && gz === manualZ ? '✅' : '❌'}`);
        console.log('');
    });

    // Test spatial grid contents
    console.log('🗺️ Spatial grid contents:');
    if (typeof window.debugSpatialGrid === 'function') {
        window.debugSpatialGrid();
    } else {
        console.log('❌ debugSpatialGrid function not available');
    }

    console.log('🧪 Grid key test complete!');

}, 3000);
