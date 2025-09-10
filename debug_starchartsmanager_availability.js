/**
 * Debug StarChartsManager Availability
 * ===================================
 * 
 * This script helps diagnose why StarChartsManager isn't available
 * and provides steps to access it properly.
 */

function debugStarChartsAvailability() {
    console.log('🔍 Debugging StarChartsManager availability...');
    
    // Check if window.app exists
    console.log('\n📱 Checking app object:');
    if (window.app) {
        console.log('   ✅ window.app exists');
        console.log('   📋 app properties:', Object.keys(window.app));
    } else {
        console.log('   ❌ window.app not found');
        console.log('   💡 Game may not be fully loaded yet');
        return;
    }
    
    // Check if viewManager exists
    console.log('\n👁️ Checking viewManager:');
    if (window.app.viewManager) {
        console.log('   ✅ viewManager exists');
        console.log('   📋 viewManager properties:', Object.keys(window.app.viewManager));
        console.log('   📍 Current view:', window.app.viewManager.currentView);
    } else {
        console.log('   ❌ viewManager not found');
        return;
    }
    
    // Check if starChartsManager exists
    console.log('\n🗺️ Checking starChartsManager:');
    if (window.app.viewManager.starChartsManager) {
        console.log('   ✅ starChartsManager exists');
        console.log('   📋 starChartsManager properties:', Object.keys(window.app.viewManager.starChartsManager));
        
        // Check if it's initialized
        if (window.app.viewManager.starChartsManager.discoveredObjects) {
            console.log('   ✅ starChartsManager is initialized');
            console.log('   📊 Discovered objects:', window.app.viewManager.starChartsManager.discoveredObjects.size);
        } else {
            console.log('   ⚠️ starChartsManager exists but may not be initialized');
        }
    } else {
        console.log('   ❌ starChartsManager not found');
        console.log('   💡 You may need to navigate to star charts view first');
    }
    
    // Check current view
    console.log('\n📍 Current game state:');
    if (window.app.viewManager) {
        console.log('   Current view:', window.app.viewManager.currentView);
        console.log('   Previous view:', window.app.viewManager.previousView);
        console.log('   Is docked:', window.app.viewManager.isDocked);
    }
    
    // Provide recommendations
    console.log('\n💡 Recommendations:');
    if (!window.app) {
        console.log('   1. Wait for game to fully load');
        console.log('   2. Refresh the page if needed');
    } else if (!window.app.viewManager.starChartsManager) {
        console.log('   1. Navigate to star charts view (press appropriate key/button)');
        console.log('   2. Try: switchToStarCharts() if available');
        console.log('   3. Check if star charts view is accessible from current view');
    } else {
        console.log('   ✅ StarChartsManager should be available - try running tests again');
    }
}

function tryAccessStarCharts() {
    console.log('🗺️ Attempting to access star charts...');
    
    if (!window.app?.viewManager) {
        console.log('❌ ViewManager not available');
        return;
    }
    
    const vm = window.app.viewManager;
    
    // Try different methods to access star charts
    console.log('\n🔄 Trying different access methods:');
    
    // Method 1: Direct view switch
    if (vm.switchToView) {
        console.log('   Trying switchToView("star_charts")...');
        try {
            vm.switchToView('star_charts');
            console.log('   ✅ switchToView attempted');
        } catch (e) {
            console.log('   ❌ switchToView failed:', e.message);
        }
    }
    
    // Method 2: Check for star charts specific methods
    if (vm.showStarCharts) {
        console.log('   Trying showStarCharts()...');
        try {
            vm.showStarCharts();
            console.log('   ✅ showStarCharts attempted');
        } catch (e) {
            console.log('   ❌ showStarCharts failed:', e.message);
        }
    }
    
    // Method 3: Check available views
    console.log('\n📋 Available views/methods:');
    const methods = Object.getOwnPropertyNames(vm).filter(name => 
        typeof vm[name] === 'function' && 
        (name.includes('star') || name.includes('chart') || name.includes('view'))
    );
    console.log('   Star/Chart/View methods:', methods);
    
    // Wait a moment and check if StarChartsManager is now available
    setTimeout(() => {
        console.log('\n🔍 Checking StarChartsManager after access attempt...');
        if (window.app?.viewManager?.starChartsManager) {
            console.log('   ✅ StarChartsManager is now available!');
            console.log('   🧪 You can now run: testSOLDiscovery() or test10kmDiscovery()');
        } else {
            console.log('   ❌ StarChartsManager still not available');
            console.log('   💡 Try manually navigating to star charts view in the game UI');
        }
    }, 1000);
}

function listAllAvailableMethods() {
    console.log('📋 Listing all available methods...');
    
    if (!window.app) {
        console.log('❌ window.app not available');
        return;
    }
    
    console.log('\n🔍 App methods:');
    const appMethods = Object.getOwnPropertyNames(window.app).filter(name => 
        typeof window.app[name] === 'function'
    );
    console.log('   ', appMethods);
    
    if (window.app.viewManager) {
        console.log('\n👁️ ViewManager methods:');
        const vmMethods = Object.getOwnPropertyNames(window.app.viewManager).filter(name => 
            typeof window.app.viewManager[name] === 'function'
        );
        console.log('   ', vmMethods);
    }
}

// Auto-run diagnostic
console.log('🔧 StarChartsManager Debug Script Loaded');
console.log('📋 Available commands:');
console.log('   debugStarChartsAvailability() - Diagnose availability issues');
console.log('   tryAccessStarCharts() - Attempt to access star charts');
console.log('   listAllAvailableMethods() - Show all available methods');
console.log('');
console.log('🚀 Running automatic diagnostic...');
debugStarChartsAvailability();
