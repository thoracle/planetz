import { debug } from '../debug.js';

// Debug script for proximity detector visibility issues
debug('INSPECTION', 'PROXIMITY DETECTOR DEBUG SCRIPT');

function debugProximityDetector() {
debug('INSPECTION', '=== PROXIMITY DETECTOR DEBUG ===');
    
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
    
debug('UTILITY', `✅ Detector state: ${detector.isVisible ? 'VISIBLE' : 'HIDDEN'}`);
debug('UTILITY', `✅ Scene objects: ${detector.scene?.children?.length || 0}`);
debug('UTILITY', `✅ Tracked objects: ${detector.trackedObjects?.size || 0}`);
debug('UTILITY', `✅ Object blips: ${detector.objectBlips?.size || 0}`);
debug('UTILITY', `✅ Altitude lines: ${detector.altitudeLines?.size || 0}`);
    
    // Check camera position and orientation
    if (detector.camera) {
debug('UTILITY', `📷 Camera position:`, detector.camera.position);
debug('UTILITY', `📷 Camera rotation:`, detector.camera.rotation);
debug('UTILITY', `📷 Camera FOV: ${detector.camera.fov}°`);
    }
    
    // Check renderer
    if (detector.renderer) {
debug('RENDER', `🖥️ Renderer size: ${detector.renderer.domElement.width}x${detector.renderer.domElement.height}`);
debug('UI', `🖥️ Renderer visible: ${detector.renderer.domElement.style.display !== 'none'}`);
    }
    
    // Check container
    if (detector.detectorContainer) {
        const style = window.getComputedStyle(detector.detectorContainer);
debug('AI', `📦 Container visible: ${style.display !== 'none'}`);
debug('AI', `📦 Container opacity: ${style.opacity}`);
debug('AI', `📦 Container position: ${style.position}`);
debug('AI', `📦 Container bottom: ${style.bottom}`);
debug('AI', `📦 Container left: ${style.left}`);
debug('AI', `📦 Container transform: ${style.transform}`);
    }
    
    // List all scene objects
    if (detector.scene) {
debug('UTILITY', '📋 Scene objects:');
        detector.scene.children.forEach((child, index) => {
debug('UTILITY', `  ${index}: ${child.type} at (${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`);
        });
    }
    
    // Force a manual update
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

debug('INSPECTION', '💡 Use debugProximityDetector() to diagnose visibility issues');