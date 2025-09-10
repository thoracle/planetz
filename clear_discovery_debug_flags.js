/**
 * Clear Discovery Debug Flags
 * ===========================
 * 
 * This script clears all discovery-related debug flags and localStorage entries
 * that might be causing auto-discovery to activate during debugging.
 * 
 * Run this in browser console to ensure clean discovery debugging state.
 */

console.log('🧹 Clearing discovery debug flags...');

// Clear test mode flags
const testFlags = [
    'star_charts_test_discover_all',
    'STAR_CHARTS_DISCOVER_ALL',
    'star_charts_debug_mode',
    'planetz_discovery_test',
    'discovery_test_mode'
];

let clearedCount = 0;
testFlags.forEach(flag => {
    if (localStorage.getItem(flag) !== null) {
        localStorage.removeItem(flag);
        console.log(`   ✅ Removed localStorage flag: ${flag}`);
        clearedCount++;
    }
});

// Clear window flags
if (typeof window !== 'undefined') {
    if (window.STAR_CHARTS_DISCOVER_ALL !== undefined) {
        delete window.STAR_CHARTS_DISCOVER_ALL;
        console.log('   ✅ Removed window.STAR_CHARTS_DISCOVER_ALL');
        clearedCount++;
    }
}

// Clear any discovery-related localStorage keys
const allKeys = Object.keys(localStorage);
const discoveryKeys = allKeys.filter(key => 
    key.includes('discovery') || 
    key.includes('star_charts') ||
    key.includes('discover')
);

discoveryKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`   ✅ Removed discovery-related key: ${key}`);
    clearedCount++;
});

if (clearedCount === 0) {
    console.log('✅ No discovery debug flags found - already clean');
} else {
    console.log(`✅ Cleared ${clearedCount} discovery debug flags`);
}

console.log('🔧 Discovery debug flags cleared - reload page to test clean state');

// Provide verification function
window.verifyDiscoveryFlags = function() {
    console.log('🔍 Verifying discovery debug flags...');
    
    const testFlags = [
        'star_charts_test_discover_all',
        'STAR_CHARTS_DISCOVER_ALL',
        'star_charts_debug_mode'
    ];
    
    let foundFlags = 0;
    testFlags.forEach(flag => {
        const value = localStorage.getItem(flag);
        if (value !== null) {
            console.log(`   ⚠️ Found flag: ${flag} = ${value}`);
            foundFlags++;
        }
    });
    
    if (window.STAR_CHARTS_DISCOVER_ALL !== undefined) {
        console.log(`   ⚠️ Found window flag: STAR_CHARTS_DISCOVER_ALL = ${window.STAR_CHARTS_DISCOVER_ALL}`);
        foundFlags++;
    }
    
    if (foundFlags === 0) {
        console.log('✅ No discovery debug flags found - clean state verified');
    } else {
        console.log(`❌ Found ${foundFlags} discovery debug flags - run clearDiscoveryFlags() to clean`);
    }
    
    return foundFlags === 0;
};

console.log('Run verifyDiscoveryFlags() to check current state');
