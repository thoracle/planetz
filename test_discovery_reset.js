/**
 * Discovery Reset Test
 * ====================
 * 
 * This script tests that discovery state properly resets between sessions
 * when persistence is disabled for debugging.
 * 
 * Usage:
 * 1. Load this script in browser console
 * 2. Run testDiscoveryReset()
 * 3. Reload page and run again to verify fresh state
 */

function testDiscoveryReset() {
    console.log('🧪 Testing Discovery Reset Behavior...');
    
    // Test auto-discovery flags
    console.log('\n🔧 Testing auto-discovery flags:');
    const testFlags = [
        'star_charts_test_discover_all',
        'STAR_CHARTS_DISCOVER_ALL', 
        'star_charts_debug_mode'
    ];
    
    let foundFlags = 0;
    testFlags.forEach(flag => {
        const value = localStorage.getItem(flag);
        if (value !== null) {
            console.log(`   ⚠️ Found localStorage flag: ${flag} = ${value}`);
            foundFlags++;
        }
    });
    
    if (window.STAR_CHARTS_DISCOVER_ALL !== undefined) {
        console.log(`   ⚠️ Found window flag: STAR_CHARTS_DISCOVER_ALL = ${window.STAR_CHARTS_DISCOVER_ALL}`);
        foundFlags++;
    }
    
    if (foundFlags === 0) {
        console.log('✅ No auto-discovery flags found (expected for debug mode)');
    } else {
        console.log(`❌ Found ${foundFlags} auto-discovery flags - these may cause objects to be auto-discovered`);
    }
    
    // Test localStorage clearing
    console.log('\n📂 Testing localStorage state:');
    const discoveryKeys = Object.keys(localStorage).filter(key => 
        key.includes('star_charts_discovery') || 
        key.includes('planetz_discovery') ||
        key.includes('discovery')
    );
    
    if (discoveryKeys.length === 0) {
        console.log('✅ No discovery keys found in localStorage (expected for debug mode)');
    } else {
        console.log('⚠️ Found discovery keys in localStorage:', discoveryKeys);
        discoveryKeys.forEach(key => {
            const value = localStorage.getItem(key);
            try {
                const parsed = JSON.parse(value);
                console.log(`   ${key}: ${parsed.discovered?.length || 0} objects`);
            } catch (e) {
                console.log(`   ${key}: (invalid JSON)`);
            }
        });
    }
    
    // Test StarChartsManager state if available
    console.log('\n🗺️ Testing StarChartsManager state:');
    if (window.app && window.app.viewManager && window.app.viewManager.starChartsManager) {
        const scm = window.app.viewManager.starChartsManager;
        const discoveredCount = scm.discoveredObjects ? scm.discoveredObjects.size : 0;
        const metadataCount = scm.discoveryMetadata ? scm.discoveryMetadata.size : 0;
        
        console.log(`✅ StarChartsManager discovered objects: ${discoveredCount}`);
        console.log(`✅ StarChartsManager metadata entries: ${metadataCount}`);
        
        if (discoveredCount === 1) {
            console.log('✅ Expected: Only central star should be discovered initially');
        } else if (discoveredCount > 1) {
            console.log('⚠️ Unexpected: More than central star discovered on fresh start');
            console.log('   Discovered objects:', Array.from(scm.discoveredObjects));
        }
    } else {
        console.log('⚠️ StarChartsManager not available - game may not be fully loaded');
    }
    
    // Test backend game state if accessible
    console.log('\n🔧 Testing backend state (if accessible):');
    fetch('/api/debug/game-state')
        .then(response => response.json())
        .then(data => {
            if (data.player_discoveries !== undefined) {
                console.log(`✅ Backend discoveries: ${data.player_discoveries} objects`);
                if (data.player_discoveries === 0) {
                    console.log('✅ Expected: Backend starts with no discoveries in debug mode');
                }
            } else {
                console.log('ℹ️ Backend game state debug endpoint not available');
            }
        })
        .catch(error => {
            console.log('ℹ️ Backend game state not accessible (normal for frontend-only testing)');
        });
    
    console.log('\n🎯 Test Summary:');
    console.log('- Discovery persistence should be disabled');
    console.log('- Only central star should be discovered initially');
    console.log('- No discovery data should persist between browser sessions');
    console.log('- Debug messages should indicate persistence is disabled');
    
    return {
        localStorageKeys: discoveryKeys.length,
        starChartsDiscovered: window.app?.viewManager?.starChartsManager?.discoveredObjects?.size || 0,
        testPassed: discoveryKeys.length === 0 && 
                   (window.app?.viewManager?.starChartsManager?.discoveredObjects?.size || 0) <= 1
    };
}

function clearAllDiscoveryData() {
    console.log('🧹 Clearing all discovery data for testing...');
    
    // Clear auto-discovery flags
    const testFlags = [
        'star_charts_test_discover_all',
        'STAR_CHARTS_DISCOVER_ALL',
        'star_charts_debug_mode',
        'planetz_discovery_test',
        'discovery_test_mode'
    ];
    
    let clearedFlags = 0;
    testFlags.forEach(flag => {
        if (localStorage.getItem(flag) !== null) {
            localStorage.removeItem(flag);
            console.log(`   Removed flag: ${flag}`);
            clearedFlags++;
        }
    });
    
    // Clear window flags
    if (typeof window !== 'undefined' && window.STAR_CHARTS_DISCOVER_ALL !== undefined) {
        delete window.STAR_CHARTS_DISCOVER_ALL;
        console.log('   Removed window.STAR_CHARTS_DISCOVER_ALL');
        clearedFlags++;
    }
    
    // Clear localStorage
    const discoveryKeys = Object.keys(localStorage).filter(key => 
        key.includes('discovery') || key.includes('star_charts')
    );
    
    discoveryKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`   Removed: ${key}`);
    });
    
    // Clear StarChartsManager state if available
    if (window.app && window.app.viewManager && window.app.viewManager.starChartsManager) {
        const scm = window.app.viewManager.starChartsManager;
        scm.discoveredObjects.clear();
        scm.discoveryMetadata.clear();
        scm.initializeDiscoveryState();
        console.log('   Cleared StarChartsManager state and reinitialized');
    }
    
    console.log(`✅ Discovery data cleared (${clearedFlags} flags, ${discoveryKeys.length} keys) - reload page to test fresh state`);
}

// Auto-run test when script loads
console.log('🔧 Discovery Reset Test Script Loaded');
console.log('Run testDiscoveryReset() to test current state');
console.log('Run clearAllDiscoveryData() to clear and test fresh state');

// Export functions to global scope
window.testDiscoveryReset = testDiscoveryReset;
window.clearAllDiscoveryData = clearAllDiscoveryData;
