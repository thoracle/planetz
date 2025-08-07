/**
 * Test Player Position Fix
 * Quick test to verify the proximity detector can find player position
 */

console.log('🔧 Testing Player Position Fix...');

const s = window.starfieldManager;
if (!s) {
    console.error('❌ StarfieldManager not available');
} else {
    const d = s.proximityDetector3D;
    if (!d) {
        console.error('❌ ProximityDetector3D not available');
    } else {
        console.log('🔍 Testing player position detection methods:');
        
        // Method 1: viewManager.getShip()
        const ship1 = s.viewManager?.getShip();
        console.log('1. viewManager.getShip():', !!ship1, 'mesh:', !!ship1?.mesh);
        
        // Method 2: viewManager.ship
        const ship2 = s.viewManager?.ship;
        console.log('2. viewManager.ship:', !!ship2, 'mesh:', !!ship2?.mesh);
        
        // Method 3: Camera position fallback
        const camera = s.camera;
        console.log('3. camera position:', !!camera, 'position:', !!camera?.position);
        if (camera?.position) {
            console.log('   Camera pos:', {
                x: camera.position.x.toFixed(1),
                y: camera.position.y.toFixed(1), 
                z: camera.position.z.toFixed(1)
            });
        }
        
        // Enable detector and test
        if (!d.isVisible) {
            console.log('💡 Enabling proximity detector...');
            s.toggleProximityDetector();
        }
        
        console.log('🔄 Forcing update...');
        d.forceUpdate();
        
        console.log('✅ Test complete - check for object detection in the logs above');
    }
}