// Test script for Star Charts Hit Box Debug
// Run this in the browser console to test the debug system

console.log('🎯 Testing Star Charts Hit Box Debug System...');

// Test 1: Check if debug commands are available
console.log('\n1. Testing debug commands availability:');
if (typeof window.toggleHitBoxDebug === 'function') {
    console.log('✅ toggleHitBoxDebug() - Available');
} else {
    console.log('❌ toggleHitBoxDebug() - Missing');
}

if (typeof window.enableHitBoxDebug === 'function') {
    console.log('✅ enableHitBoxDebug() - Available');
} else {
    console.log('❌ enableHitBoxDebug() - Missing');
}

if (typeof window.refreshStarCharts === 'function') {
    console.log('✅ refreshStarCharts() - Available');
} else {
    console.log('❌ refreshStarCharts() - Missing');
}

// Test 2: Check current debug status
console.log('\n2. Current debug status:');
const currentStatus = window.hitBoxDebugStatus();

// Test 3: Test localStorage
console.log('\n3. Testing localStorage:');
const debugValue = localStorage.getItem('star_charts_debug_hitboxes');
console.log(`localStorage value: "${debugValue}"`);

// Test 4: Enable debug mode
console.log('\n4. Enabling debug mode...');
window.enableHitBoxDebug();

// Test 5: Check if Star Charts UI is available
console.log('\n5. Checking Star Charts UI availability:');
if (window.starfieldManager && window.starfieldManager.viewManager && window.starfieldManager.viewManager.starChartsManager) {
    const starChartsManager = window.starfieldManager.viewManager.starChartsManager;
    if (starChartsManager.starChartsUI) {
        console.log('✅ Star Charts UI is available');
        console.log('💡 Try opening Star Charts (press G) to see debug hit boxes');
    } else {
        console.log('❌ Star Charts UI not initialized');
        console.log('💡 Open Star Charts first (press G), then run this test again');
    }
} else {
    console.log('❌ Star Charts Manager not found');
    console.log('💡 Make sure the game is fully loaded');
}

console.log('\n🎯 Test complete! If you see red circles in Star Charts, the debug system is working.');
console.log('💡 If not, try: refreshStarCharts() after opening Star Charts');
