// Disable all star charts test modes
console.log('🔧 Disabling Star Charts Test Mode...');

// Clear localStorage flag
localStorage.removeItem('star_charts_test_discover_all');
console.log('✅ Cleared localStorage flag');

// Clear global variable
if (window.STAR_CHARTS_DISCOVER_ALL) {
    window.STAR_CHARTS_DISCOVER_ALL = false;
    console.log('✅ Cleared global variable');
}

// Check current state
console.log('📊 Current State:');
console.log('  localStorage flag:', localStorage.getItem('star_charts_test_discover_all'));
console.log('  Global variable:', window.STAR_CHARTS_DISCOVER_ALL);

// Verify star charts manager
if (window.starChartsManager) {
    console.log('✅ Star Charts Manager found');
    console.log('  Discovered objects count:', window.starChartsManager.discoveredObjects?.size || 0);
} else {
    console.log('❌ Star Charts Manager not found');
}

console.log('🔄 Reloading page in 2 seconds...');
setTimeout(() => location.reload(), 2000);
