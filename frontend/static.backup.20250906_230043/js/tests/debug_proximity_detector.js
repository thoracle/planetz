// Debug script for proximity detector visibility issues
console.log('🔍 PROXIMITY DETECTOR DEBUG SCRIPT');

function debugProximityDetector() {
    console.log('=== PROXIMITY DETECTOR DEBUG ===');
    
    const starfield = window.starfieldManager;
    if (!starfield) {
        console.error('❌ StarfieldManager not available');
        return;
    }
    
    const detector = starfield.proximityDetector3D;
    if (!detector) {
        console.error('❌ ProximityDetector3D not available');
        return;
    }
    
    console.log(`✅ Detector state: ${detector.isVisible ? 'VISIBLE' : 'HIDDEN'}`);
    console.log(`✅ Scene objects: ${detector.scene?.children?.length || 0}`);
    console.log(`✅ Tracked objects: ${detector.trackedObjects?.size || 0}`);
    console.log(`✅ Object blips: ${detector.objectBlips?.size || 0}`);
    console.log(`✅ Altitude lines: ${detector.altitudeLines?.size || 0}`);
    
    // Check camera position and orientation
    if (detector.camera) {
        console.log(`📷 Camera position:`, detector.camera.position);
        console.log(`📷 Camera rotation:`, detector.camera.rotation);
        console.log(`📷 Camera FOV: ${detector.camera.fov}°`);
    }
    
    // Check renderer
    if (detector.renderer) {
        console.log(`🖥️ Renderer size: ${detector.renderer.domElement.width}x${detector.renderer.domElement.height}`);
        console.log(`🖥️ Renderer visible: ${detector.renderer.domElement.style.display !== 'none'}`);
    }
    
    // Check container
    if (detector.detectorContainer) {
        const style = window.getComputedStyle(detector.detectorContainer);
        console.log(`📦 Container visible: ${style.display !== 'none'}`);
        console.log(`📦 Container opacity: ${style.opacity}`);
        console.log(`📦 Container position: ${style.position}`);
        console.log(`📦 Container bottom: ${style.bottom}`);
        console.log(`📦 Container left: ${style.left}`);
        console.log(`📦 Container transform: ${style.transform}`);
    }
    
    // List all scene objects
    if (detector.scene) {
        console.log('📋 Scene objects:');
        detector.scene.children.forEach((child, index) => {
            console.log(`  ${index}: ${child.type} at (${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`);
        });
    }
    
    // Force a manual update
    console.log('🔄 Forcing detector update...');
    detector.forceUpdate?.();
    
    return {
        detector,
        scene: detector.scene,
        camera: detector.camera,
        renderer: detector.renderer,
        container: detector.detectorContainer
    };
}

// Make it globally available
window.debugProximityDetector = debugProximityDetector;

console.log('💡 Use debugProximityDetector() to diagnose visibility issues');