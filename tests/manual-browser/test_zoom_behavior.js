// Test Zoom Behavior Comparison
// Copy and paste this into the browser console

(function() {
    console.log('🔍 ZOOM BEHAVIOR COMPARISON TEST');
    console.log('=================================\n');
    
    const lrs = window.viewManager?.navigationSystemManager?.longRangeScanner;
    const starCharts = window.viewManager?.navigationSystemManager?.starChartsUI;
    
    if (!lrs || !starCharts) {
        console.log('❌ Systems not available');
        return;
    }
    
    console.log('📊 Current State:');
    console.log('- LRS zoom level:', lrs.currentZoomLevel);
    console.log('- LRS max zoom:', lrs.maxZoomLevel);
    console.log('- Star Charts zoom level:', starCharts.currentZoomLevel);
    console.log('- Star Charts max zoom:', starCharts.maxZoomLevel);
    
    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('========================');
    console.log('');
    console.log('1. Press L to open LRS');
    console.log('2. Click Sol (the star) exactly 4 times');
    console.log('3. Note the zoom progression in console');
    console.log('4. Press L to close LRS');
    console.log('5. Press C to open Star Charts');
    console.log('6. Click Sol exactly 4 times');
    console.log('7. Compare the zoom progressions');
    console.log('');
    console.log('Expected LRS: 1 → 2 → 3 → 3 (stays at max)');
    console.log('Expected Star Charts: 1 → 2 → 3 → 3 (should match)');
    console.log('');
    console.log('🔍 Watch for these log messages:');
    console.log('LRS: "🔍 LRS: showCelestialBodyDetails called"');
    console.log('Star Charts: "🔍 Star Charts: selectObject called"');
    console.log('');
    console.log('🚨 Report any differences in zoom progression!');
    
    // Monitor zoom changes
    let lrsLastZoom = lrs.currentZoomLevel;
    let starChartsLastZoom = starCharts.currentZoomLevel;
    
    const checkZoomChanges = () => {
        if (lrs.currentZoomLevel !== lrsLastZoom) {
            console.log(`📈 LRS zoom changed: ${lrsLastZoom} → ${lrs.currentZoomLevel}`);
            lrsLastZoom = lrs.currentZoomLevel;
        }
        
        if (starCharts.currentZoomLevel !== starChartsLastZoom) {
            console.log(`📈 Star Charts zoom changed: ${starChartsLastZoom} → ${starCharts.currentZoomLevel}`);
            starChartsLastZoom = starCharts.currentZoomLevel;
        }
    };
    
    // Check every 100ms for zoom changes
    const interval = setInterval(checkZoomChanges, 100);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
        clearInterval(interval);
        console.log('⏰ Zoom monitoring stopped');
    }, 30000);
    
    console.log('⏰ Zoom monitoring started for 30 seconds...');
    
})();
