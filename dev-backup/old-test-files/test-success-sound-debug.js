/**
 * Debug script to test success.wav sound system
 * Tests:
 * 1. WeaponEffectsManager initialization
 * 2. Success.wav file loading
 * 3. Audio context state
 * 4. Success sound playback
 */

console.log('🔊 === SUCCESS SOUND DEBUG TEST ===');

// Test 1: Check if ship and weapon effects manager exist
function testShipAndAudioAvailability() {
    console.log('\n🔍 TEST 1: Ship and Audio Manager Availability');
    
    // Check if we have access to ship
    const ship = window.starfieldManager?.viewManager?.getShip();
    console.log('• Ship available:', !!ship);
    
    if (!ship) {
        console.error('❌ No ship found! Make sure you are in game view, not docked.');
        return false;
    }
    
    // Check weapon system
    const weaponSystem = ship.weaponSystem;
    console.log('• Weapon system available:', !!weaponSystem);
    
    if (!weaponSystem) {
        console.error('❌ No weapon system found!');
        return false;
    }
    
    // Check weapon effects manager (FIXED: Check ship.weaponEffectsManager instead of ship.weaponSystem.weaponEffectsManager)
    const effectsManager = ship.weaponEffectsManager;
    console.log('• Weapon effects manager available:', !!effectsManager);
    console.log('• Weapon effects manager location: ship.weaponEffectsManager');
    
    if (!effectsManager) {
        console.error('❌ No weapon effects manager found at ship.weaponEffectsManager!');
        console.log('🔍 Checking alternative locations...');
        
        // Check alternative locations
        const altLocations = [
            { path: 'ship.weaponSystem.weaponEffectsManager', value: ship.weaponSystem?.weaponEffectsManager },
            { path: 'starfieldManager.weaponEffectsManager', value: window.starfieldManager?.weaponEffectsManager },
            { path: 'window.WeaponEffectsManager', value: window.WeaponEffectsManager }
        ];
        
        altLocations.forEach(location => {
            console.log(`• ${location.path}: ${!!location.value}`);
        });
        
        return false;
    }
    
    console.log('✅ Ship and audio manager found');
    return effectsManager;
}

// Test 2: Check audio system initialization
function testAudioInitialization(effectsManager) {
    console.log('\n🔍 TEST 2: Audio System Initialization');
    
    console.log('• Audio initialized:', effectsManager.audioInitialized);
    console.log('• Audio context available:', !!effectsManager.audioContext);
    console.log('• Audio context state:', effectsManager.audioContext?.state || 'unknown');
    console.log('• Audio buffers loaded:', effectsManager.audioBuffers?.size || 0);
    
    // List all loaded audio buffers
    if (effectsManager.audioBuffers && effectsManager.audioBuffers.size > 0) {
        console.log('• Loaded audio types:');
        effectsManager.audioBuffers.forEach((buffer, type) => {
            console.log(`  - ${type}: ${buffer?.duration?.toFixed(2)}s`);
        });
    }
    
    // Check specifically for success sound
    const hasSuccessSound = effectsManager.audioBuffers?.has('success');
    console.log('• Success sound loaded:', hasSuccessSound);
    
    if (hasSuccessSound) {
        const successBuffer = effectsManager.audioBuffers.get('success');
        console.log(`• Success sound duration: ${successBuffer.duration.toFixed(2)}s`);
        console.log('✅ Success sound is loaded and ready');
        return true;
    } else {
        console.error('❌ Success sound not loaded!');
        return false;
    }
}

// Test 3: Test success sound playback
function testSuccessSoundPlayback(effectsManager) {
    console.log('\n🔍 TEST 3: Success Sound Playback Test');
    
    try {
        console.log('🎵 Playing full duration success sound...');
        effectsManager.playSuccessSound(null, 0.8); // Full duration, 80% volume
        
        setTimeout(() => {
            console.log('🎵 Playing 50% duration success sound...');
            effectsManager.playSuccessSound(null, 0.6, 0.5); // 50% duration, 60% volume
        }, 2000);
        
        setTimeout(() => {
            console.log('🎵 Playing 25% duration success sound...');
            effectsManager.playSuccessSound(null, 0.4, 0.25); // 25% duration, 40% volume
        }, 4000);
        
        console.log('✅ Success sound playback commands sent');
        console.log('🔊 Listen for the success.wav sound effects over the next 6 seconds');
        
        return true;
    } catch (error) {
        console.error('❌ Error playing success sound:', error);
        return false;
    }
}

// Test 4: Check audio context state and resume if needed
async function testAudioContextResume(effectsManager) {
    console.log('\n🔍 TEST 4: Audio Context State and Resume');
    
    if (!effectsManager.audioContext) {
        console.error('❌ No audio context available');
        return false;
    }
    
    console.log('• Audio context state:', effectsManager.audioContext.state);
    
    if (effectsManager.audioContext.state === 'suspended') {
        console.log('🔄 Audio context is suspended, attempting to resume...');
        try {
            await effectsManager.audioContext.resume();
            console.log('✅ Audio context resumed successfully');
            console.log('• New state:', effectsManager.audioContext.state);
            return true;
        } catch (error) {
            console.error('❌ Failed to resume audio context:', error);
            return false;
        }
    } else if (effectsManager.audioContext.state === 'running') {
        console.log('✅ Audio context is already running');
        return true;
    } else {
        console.warn('⚠️ Audio context in unexpected state:', effectsManager.audioContext.state);
        return false;
    }
}

// Test 5: Manual audio file loading test
async function testManualAudioLoading() {
    console.log('\n🔍 TEST 5: Manual Audio File Loading Test');
    
    try {
        console.log('🔄 Attempting to load success.wav manually...');
        const response = await fetch('/audio/success.wav');
        console.log('• Fetch response status:', response.status);
        console.log('• Response OK:', response.ok);
        
        if (!response.ok) {
            console.error(`❌ Failed to fetch success.wav: ${response.status} ${response.statusText}`);
            return false;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('• Array buffer size:', arrayBuffer.byteLength, 'bytes');
        
        // Try to decode with Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('• Audio buffer duration:', audioBuffer.duration.toFixed(2), 'seconds');
        console.log('• Audio buffer channels:', audioBuffer.numberOfChannels);
        console.log('• Audio buffer sample rate:', audioBuffer.sampleRate, 'Hz');
        
        console.log('✅ Manual audio loading successful');
        
        // Test manual playback
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = audioBuffer;
        gainNode.gain.value = 0.7;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        source.start();
        console.log('🎵 Playing manually loaded success sound...');
        
        return true;
    } catch (error) {
        console.error('❌ Manual audio loading failed:', error);
        return false;
    }
}

// Test 6: Check if the file path is correct
async function testFilePath() {
    console.log('\n🔍 TEST 6: Audio File Path Test');
    
    const paths = [
        '/audio/success.wav',
        'audio/success.wav',
        './audio/success.wav',
        '../audio/success.wav'
    ];
    
    for (const path of paths) {
        try {
            console.log(`🔄 Testing path: ${path}`);
            const response = await fetch(path);
            console.log(`• Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const contentLength = response.headers.get('content-length');
                console.log(`✅ Found at ${path} (${contentLength} bytes)`);
                return path;
            }
        } catch (error) {
            console.log(`❌ Failed: ${path} - ${error.message}`);
        }
    }
    
    console.error('❌ success.wav not found in any tested path');
    return null;
}

// Main test function
async function runSuccessSoundTests() {
    console.log('🔊 Starting comprehensive success sound debugging...\n');
    
    // Test 1: Basic availability
    const effectsManager = testShipAndAudioAvailability();
    if (!effectsManager) {
        console.error('💔 Cannot proceed without weapon effects manager');
        return;
    }
    
    // Test 2: Audio initialization
    const audioReady = testAudioInitialization(effectsManager);
    
    // Test 3: Audio context state
    await testAudioContextResume(effectsManager);
    
    // Test 4: File path verification
    await testFilePath();
    
    // Test 5: Manual loading (independent of game audio system)
    await testManualAudioLoading();
    
    // Test 6: Game audio system playback (if audio is ready)
    if (audioReady) {
        testSuccessSoundPlayback(effectsManager);
    } else {
        console.warn('⚠️ Skipping playback test - success sound not loaded');
    }
    
    console.log('\n🏁 === SUCCESS SOUND DEBUG COMPLETE ===');
    console.log('📋 If you heard sounds during manual loading but not during game playback,');
    console.log('    the issue is likely in the WeaponEffectsManager initialization or playback logic.');
    console.log('📋 If no sounds played at all, check browser audio settings and file paths.');
}

// Expose test functions globally
window.testSuccessSound = runSuccessSoundTests;
window.testSoundLoading = testManualAudioLoading;
window.testSoundPlayback = (volume = 0.8, duration = null) => {
    // FIXED: Use ship.weaponEffectsManager instead of ship.weaponSystem.weaponEffectsManager
    const ship = window.starfieldManager?.viewManager?.getShip();
    const effectsManager = ship?.weaponEffectsManager;
    if (effectsManager) {
        effectsManager.playSuccessSound(null, volume, duration);
        console.log(`🎵 Playing success sound: volume=${volume}, duration=${duration || 'full'}`);
    } else {
        console.error('❌ WeaponEffectsManager not found at ship.weaponEffectsManager');
    }
};

console.log('🎯 SUCCESS SOUND DEBUG LOADED');
console.log('📝 Available test functions:');
console.log('  testSuccessSound()           - Run full diagnostic');
console.log('  testSoundLoading()           - Check if success.wav is loaded');
console.log('  testSoundPlayback(vol, dur)  - Test game audio playback');
console.log('');
console.log('💡 Run testSuccessSound() to start debugging'); 