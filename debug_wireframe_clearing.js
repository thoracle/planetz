/**
 * Debug script to test wireframe clearing
 */

function debugWireframeClearing() {
    console.log('🔍 DEBUGGING WIREFRAME CLEARING');
    
    if (!window.targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    const tcm = window.targetComputerManager;
    
    console.log('🎯 Current target:', tcm.currentTarget ? {
        name: tcm.currentTarget.name,
        id: tcm.currentTarget.id,
        type: tcm.currentTarget.type
    } : 'None');
    
    console.log('🖼️ Current wireframe:', tcm.targetWireframe ? 'EXISTS' : 'None');
    console.log('🖼️ Wireframe scene children:', tcm.wireframeScene ? tcm.wireframeScene.children.length : 'No wireframe scene');
    
    if (tcm.wireframeScene && tcm.wireframeScene.children.length > 0) {
        console.log('🖼️ Wireframe scene contents:');
        tcm.wireframeScene.children.forEach((child, i) => {
            console.log(`  ${i + 1}. ${child.constructor.name} - visible: ${child.visible}`);
        });
    }
}

function manualClearWireframe() {
    console.log('🧪 MANUALLY CLEARING WIREFRAME');
    
    if (!window.targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    const tcm = window.targetComputerManager;
    
    console.log('🖼️ Before clearing:');
    debugWireframeClearing();
    
    console.log('🧪 Calling clearTargetWireframe()...');
    tcm.clearTargetWireframe();
    
    console.log('🖼️ After clearing:');
    debugWireframeClearing();
}

function manualClearTarget() {
    console.log('🧪 MANUALLY CLEARING TARGET');
    
    if (!window.targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    const tcm = window.targetComputerManager;
    
    console.log('🎯 Before clearing:');
    debugWireframeClearing();
    
    console.log('🧪 Calling clearCurrentTarget()...');
    tcm.clearCurrentTarget();
    
    console.log('🎯 After clearing:');
    debugWireframeClearing();
}

// Export functions for console use
window.debugWireframeClearing = debugWireframeClearing;
window.manualClearWireframe = manualClearWireframe;
window.manualClearTarget = manualClearTarget;

console.log('🔧 Wireframe debug functions loaded:');
console.log('  - debugWireframeClearing()');
console.log('  - manualClearWireframe()');
console.log('  - manualClearTarget()');
