// Real-time tooltip bug analysis - run this in console while hovering
console.log('🔍 REAL-TIME TOOLTIP BUG ANALYSIS');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Override the showTooltip method to add debugging
    const originalShowTooltip = starChartsUI.showTooltip.bind(starChartsUI);
    
    starChartsUI.showTooltip = function(screenX, screenY, object) {
        console.log('\n🔍 REAL-TIME TOOLTIP DEBUG:');
        console.log('  Object ID:', object.id);
        console.log('  Object name property:', object.name);
        console.log('  Object _isUndiscovered:', object._isUndiscovered);
        
        // Test ensureObjectHasName
        const completeObject = this.ensureObjectHasName(object);
        console.log('  After ensureObjectHasName:');
        console.log('    - Name:', completeObject.name);
        console.log('    - _isUndiscovered:', completeObject._isUndiscovered);
        
        // Test database lookup
        const dbData = starChartsManager.getObjectData(object.id);
        console.log('  Database lookup result:', dbData ? dbData.name : 'null');
        
        // Test discovery status
        const discoveredIds = starChartsManager.getDiscoveredObjects();
        const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
        const nid = norm(object.id);
        const isInDiscoveryList = Array.isArray(discoveredIds) ? 
            discoveredIds.some(did => norm(did) === nid) :
            discoveredIds.has(nid);
        console.log('  In discovery list:', isInDiscoveryList);
        console.log('  Test mode enabled:', this.isTestModeEnabled());
        
        // Determine what tooltip SHOULD show
        let expectedTooltip;
        if (completeObject._isShip) {
            expectedTooltip = 'You are here';
        } else if (completeObject._isUndiscovered) {
            expectedTooltip = 'Unknown';
        } else {
            expectedTooltip = completeObject.name || 'Unknown Object';
        }
        console.log('  Expected tooltip:', expectedTooltip);
        
        // Call original method
        const result = originalShowTooltip.call(this, screenX, screenY, object);
        
        // Check what actually got displayed
        const actualTooltip = this.tooltip ? this.tooltip.textContent : 'NO TOOLTIP ELEMENT';
        console.log('  Actual tooltip displayed:', actualTooltip);
        
        if (expectedTooltip !== actualTooltip) {
            console.log('  🐛 BUG DETECTED: Expected "' + expectedTooltip + '" but got "' + actualTooltip + '"');
        } else {
            console.log('  ✅ Tooltip correct');
        }
        
        return result;
    };
    
    // Also add red circles manually since the render method isn't working
    const addHitboxCircles = () => {
        // Remove existing hitbox circles
        document.querySelectorAll('.hitbox-debug').forEach(el => el.remove());
        
        const svg = document.querySelector('.starcharts-svg');
        if (!svg) {
            console.log('❌ No SVG found for hitbox circles');
            return;
        }
        
        const allObjects = starChartsUI.getDiscoveredObjectsForRender();
        console.log(`🔴 Adding ${allObjects.length} red hitbox circles`);
        
        allObjects.forEach(object => {
            const objectScreenPos = starChartsUI.worldToScreen(object);
            if (objectScreenPos) {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', objectScreenPos.x);
                circle.setAttribute('cy', objectScreenPos.y);
                circle.setAttribute('r', 8);
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#ff0000');
                circle.setAttribute('stroke-width', '2');
                circle.setAttribute('stroke-opacity', '0.8');
                circle.setAttribute('class', 'hitbox-debug');
                circle.style.pointerEvents = 'none';
                
                svg.appendChild(circle);
            }
        });
    };
    
    // Add hitbox circles now
    addHitboxCircles();
    
    // Re-add them after any render
    const originalRender = starChartsUI.render.bind(starChartsUI);
    starChartsUI.render = function() {
        const result = originalRender.call(this);
        setTimeout(addHitboxCircles, 100); // Add circles after render completes
        return result;
    };
    
    console.log('✅ Real-time debugging enabled');
    console.log('✅ Red hitbox circles should now be visible');
    console.log('🔍 Hover over objects to see detailed tooltip analysis');
    
} else {
    console.log('❌ Star Charts components not found');
}

console.log('🏁 Real-time tooltip bug analysis ready!');
