/**
 * Debug script to track wireframe creation and cleanup
 * 
 * This script will:
 * 1. Turn off star charts debug channel
 * 2. Monitor wireframe scene objects
 * 3. Track wireframe creation/destruction
 * 4. Help identify where wireframes are accumulating
 */

console.log('🔧 Wireframe Tracking Debug Tool');
console.log('📋 Debug channels configured via debug-config.json');

// Wait for game to load
setTimeout(() => {
    if (!window.starfieldManager || !window.starfieldManager.targetComputerManager) {
        console.error('❌ Target computer not loaded yet');
        return;
    }
    
    const targetComputer = window.starfieldManager.targetComputerManager;
    const wireframeScene = targetComputer.wireframeScene;
    
    console.log('✅ Target computer loaded');
    console.log(`📊 Initial wireframe scene children: ${wireframeScene.children.length}`);
    
    // Function to analyze wireframe scene
    function analyzeWireframeScene() {
        const children = wireframeScene.children;
        console.log('🔍 WIREFRAME SCENE ANALYSIS:');
        console.log(`📊 Total children: ${children.length}`);
        
        const types = {};
        children.forEach((child, index) => {
            const type = child.type || 'unknown';
            const isLight = type.includes('Light');
            const isLineSegments = type === 'LineSegments';
            const isGroup = type === 'Group';
            
            if (!types[type]) types[type] = 0;
            types[type]++;
            
            if (!isLight) {
                console.log(`  ${index}: ${type} - ${child.name || 'unnamed'} - geometry: ${child.geometry?.type || 'none'} - material: ${child.material?.type || 'none'}`);
                
                if (child.userData) {
                    console.log(`    userData:`, child.userData);
                }
            }
        });
        
        console.log('📈 Type summary:', types);
        
        // Count non-light objects (these are the wireframes)
        const nonLightObjects = children.filter(child => !child.type.includes('Light'));
        console.log(`🎯 Non-light objects (wireframes): ${nonLightObjects.length}`);
        
        return nonLightObjects.length;
    }
    
    // Initial analysis
    let lastWireframeCount = analyzeWireframeScene();
    
    // Monitor wireframe scene changes
    let monitoringInterval = setInterval(() => {
        const currentCount = wireframeScene.children.filter(child => !child.type.includes('Light')).length;
        
        if (currentCount !== lastWireframeCount) {
            console.log(`🚨 WIREFRAME COUNT CHANGED: ${lastWireframeCount} → ${currentCount}`);
            console.log(`📍 Current target: ${targetComputer.currentTarget?.name || 'none'}`);
            console.log(`📍 Target index: ${targetComputer.targetIndex}`);
            
            analyzeWireframeScene();
            lastWireframeCount = currentCount;
        }
    }, 1000); // Check every second
    
    // Add manual analysis function to global scope
    window.analyzeWireframes = analyzeWireframeScene;
    window.stopWireframeMonitoring = () => {
        clearInterval(monitoringInterval);
        console.log('🛑 Wireframe monitoring stopped');
    };
    
    console.log('🔧 DEBUG COMMANDS:');
    console.log('analyzeWireframes() - Analyze current wireframe scene');
    console.log('stopWireframeMonitoring() - Stop automatic monitoring');
    console.log('');
    console.log('💡 Now target different objects and watch for wireframe count changes');
    
}, 2000);
