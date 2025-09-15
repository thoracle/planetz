// Script to enable test mode for Star Charts
// This will show all object names regardless of discovery status
// Run this in browser console when Star Charts is open

console.log('🔧 Enabling Star Charts test mode...');

if (window.navigationSystemManager?.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    
    // Check current test mode status
    const currentTestMode = starChartsUI.isTestModeEnabled();
    console.log('Current test mode:', currentTestMode);
    
    // Enable test mode (this method may vary depending on implementation)
    // Let's try a few different approaches:
    
    // Approach 1: Direct property setting
    if (starChartsUI.testMode !== undefined) {
        starChartsUI.testMode = true;
        console.log('✅ Set testMode property to true');
    }
    
    // Approach 2: Check for setTestMode method
    if (typeof starChartsUI.setTestMode === 'function') {
        starChartsUI.setTestMode(true);
        console.log('✅ Called setTestMode(true)');
    }
    
    // Approach 3: Check for enableTestMode method
    if (typeof starChartsUI.enableTestMode === 'function') {
        starChartsUI.enableTestMode();
        console.log('✅ Called enableTestMode()');
    }
    
    // Approach 4: Set debug flag
    if (starChartsUI.debugMode !== undefined) {
        starChartsUI.debugMode = true;
        console.log('✅ Set debugMode property to true');
    }
    
    // Approach 5: Global test mode flag
    window.STAR_CHARTS_TEST_MODE = true;
    console.log('✅ Set global STAR_CHARTS_TEST_MODE flag');
    
    // Check new test mode status
    const newTestMode = starChartsUI.isTestModeEnabled();
    console.log('New test mode:', newTestMode);
    
    if (newTestMode) {
        console.log('🎉 Test mode successfully enabled! All objects should now show names.');
        console.log('💡 Hover over objects to see their names instead of "Unknown"');
    } else {
        console.log('⚠️ Test mode not enabled. Let me check the isTestModeEnabled method...');
        
        // Let's examine the isTestModeEnabled method
        console.log('isTestModeEnabled method:', starChartsUI.isTestModeEnabled.toString());
        
        // Try to find what property/condition it checks
        const starChartsUIProps = Object.getOwnPropertyNames(starChartsUI);
        const testModeProps = starChartsUIProps.filter(prop => 
            prop.toLowerCase().includes('test') || 
            prop.toLowerCase().includes('debug') ||
            prop.toLowerCase().includes('mode')
        );
        console.log('Potential test mode properties:', testModeProps);
    }
    
} else {
    console.log('❌ Star Charts not found');
}

console.log('\n🏁 Test mode enable attempt complete!');
