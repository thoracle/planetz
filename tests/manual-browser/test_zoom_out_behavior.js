// Test Zoom Out Behavior Comparison
// Copy and paste this into the browser console

(function() {
    console.log('🔍 ZOOM OUT BEHAVIOR TEST');
    console.log('=========================\n');
    
    console.log('🎯 TESTING INSTRUCTIONS:');
    console.log('========================');
    console.log('');
    console.log('TEST 1: Empty Space Zoom Out');
    console.log('1. Press L to open LRS');
    console.log('2. Click Sol to zoom to level 3');
    console.log('3. Click empty space 3 times');
    console.log('4. Note zoom progression: should be 3→2→1→0.4');
    console.log('5. Press L to close LRS');
    console.log('6. Press C to open Star Charts');
    console.log('7. Click Sol to zoom to level 3');
    console.log('8. Click empty space 3 times');
    console.log('9. Compare zoom progressions');
    console.log('');
    console.log('TEST 2: B Key Behavior');
    console.log('1. In LRS: Press B key → should go to 0.4x zoom');
    console.log('2. Press B again → should go to 1x zoom');
    console.log('3. In Star Charts: Press B key → should behave identically');
    console.log('');
    console.log('TEST 3: Double-Click Behavior');
    console.log('1. In LRS: Double-click empty space → should go to 0.4x');
    console.log('2. In Star Charts: Double-click empty space → should match');
    console.log('');
    console.log('🔍 Watch for these patterns:');
    console.log('- Empty space clicks: "Empty space clicked, zooming out"');
    console.log('- Zoom progression: 3→2→1→0.4→1 (cycle)');
    console.log('- B key: "KEYBOARD SUPER ZOOM" or "BEACON ring"');
    console.log('- Double-click: "DOUBLE-CLICK SUPER ZOOM"');
    console.log('');
    console.log('✅ SUCCESS: Both systems should have identical zoom out behavior');
    console.log('❌ FAILURE: Different zoom out progression or timing');
    
})();
