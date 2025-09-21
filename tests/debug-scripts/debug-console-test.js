// Debug Console Test - Copy and paste into browser console
// Test file-based debug configuration system

console.log('🔧 DEBUG CONFIGURATION TEST');
console.log('============================');
console.log('Only P1 messages should appear!');

// Test 1: Check file loading
console.log('\n📁 TEST 1: File Configuration Loading');
fetch('/data/debug-config.json')
    .then(r => r.json())
    .then(config => {
        console.log('✅ File config loaded:');
        console.log('P1 enabled:', config.channels.P1.enabled);
        console.log('TARGETING enabled:', config.channels.TARGETING.enabled);
        console.log('MONEY enabled:', config.channels.MONEY.enabled);
    })
    .catch(e => console.error('❌ File config error:', e));

// Test 2: Test debug channels (will work after page loads)
console.log('\n🎯 TEST 2: Debug Channel Filtering');
console.log('Run these commands in console after debug system loads:');
console.log('debug("TARGETING", "This should NOT appear")');
console.log('debug("MONEY", "This should NOT appear")');
console.log('debug("P1", "This SHOULD appear - P1 test")');
console.log('debug("MISSIONS", "This should NOT appear")');

// Test 3: Console commands
console.log('\n🖥️ TEST 3: Console Commands');
console.log('Available commands:');
console.log('- debugList()     // Show all channels');
console.log('- debugStates()   // Show current states');
console.log('- debugLoadFile() // Load from file');
console.log('- debugConfigFile() // View file config');
console.log('- debugSyncFile() // Sync with file');

// Test 4: Expected output
console.log('\n🎯 EXPECTED RESULTS:');
console.log('✅ P1 messages: Should appear with 🔴 prefix');
console.log('❌ Other channels: Should be filtered out (no output)');
console.log('✅ File config: Should load successfully');
console.log('✅ Console commands: Should work properly');

console.log('\n🚀 TEST COMPLETE - Check results above!');
