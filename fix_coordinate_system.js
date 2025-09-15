// Fix coordinate system alignment between hitboxes and visual elements
console.log('🔧 FIXING COORDINATE SYSTEM ALIGNMENT');

if (window.navigationSystemManager?.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    
    console.log('✅ Star Charts UI found');
    
    // Store original methods
    const originalWorldToScreen = starChartsUI.worldToScreen.bind(starChartsUI);
    const originalGetObjectAtScreenPosition = starChartsUI.getObjectAtScreenPosition.bind(starChartsUI);
    
    // Override worldToScreen with corrected version
    starChartsUI.worldToScreen = function(object) {
        if (!object) return null;
        
        const pos = this.getDisplayPosition(object);
        if (!pos) return null;
        
        // Find the actual visual element to get its real position
        const svg = document.querySelector('.starcharts-svg');
        if (svg) {
            const visualElement = svg.querySelector(`[data-object-id="${object.id}"]`) || 
                                 svg.querySelector(`[data-name="${object.id}"]`) ||
                                 svg.querySelector(`[id*="${object.id}"]`);
            
            if (visualElement) {
                // Use the actual visual element's position instead of calculated position
                let visualPos = null;
                
                if (visualElement.tagName === 'circle') {
                    visualPos = {
                        x: parseFloat(visualElement.getAttribute('cx')),
                        y: parseFloat(visualElement.getAttribute('cy'))
                    };
                } else if (visualElement.tagName === 'rect') {
                    visualPos = {
                        x: parseFloat(visualElement.getAttribute('x')) + parseFloat(visualElement.getAttribute('width')) / 2,
                        y: parseFloat(visualElement.getAttribute('y')) + parseFloat(visualElement.getAttribute('height')) / 2
                    };
                } else if (visualElement.tagName === 'g') {
                    // For groups, find the main shape
                    const shape = visualElement.querySelector('circle, rect, polygon');
                    if (shape) {
                        if (shape.tagName === 'circle') {
                            visualPos = {
                                x: parseFloat(shape.getAttribute('cx')),
                                y: parseFloat(shape.getAttribute('cy'))
                            };
                        } else if (shape.tagName === 'rect') {
                            visualPos = {
                                x: parseFloat(shape.getAttribute('x')) + parseFloat(shape.getAttribute('width')) / 2,
                                y: parseFloat(shape.getAttribute('y')) + parseFloat(shape.getAttribute('height')) / 2
                            };
                        }
                    }
                }
                
                if (visualPos) {
                    console.log(`🎯 Using visual position for ${object.id}: (${visualPos.x}, ${visualPos.y})`);
                    return visualPos;
                }
            }
        }
        
        // Fallback to original calculation
        return originalWorldToScreen(object);
    };
    
    // Clear existing hitbox circles and re-add them with fixed positions
    const updateHitboxes = () => {
        document.querySelectorAll('.hitbox-debug').forEach(el => el.remove());
        
        const svg = document.querySelector('.starcharts-svg');
        if (!svg) return;
        
        const allObjects = starChartsUI.getDiscoveredObjectsForRender();
        console.log(`🔴 Adding ${allObjects.length} FIXED hitbox circles`);
        
        allObjects.forEach(object => {
            const objectScreenPos = starChartsUI.worldToScreen(object);
            if (objectScreenPos) {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', objectScreenPos.x);
                circle.setAttribute('cy', objectScreenPos.y);
                circle.setAttribute('r', 8);
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#00ff00'); // Green for fixed hitboxes
                circle.setAttribute('stroke-width', '2');
                circle.setAttribute('stroke-opacity', '0.8');
                circle.setAttribute('class', 'hitbox-debug');
                circle.style.pointerEvents = 'none';
                
                svg.appendChild(circle);
            }
        });
    };
    
    // Update hitboxes now
    updateHitboxes();
    
    // Override render to update hitboxes after each render
    const originalRender = starChartsUI.render.bind(starChartsUI);
    starChartsUI.render = function() {
        const result = originalRender.call(this);
        setTimeout(updateHitboxes, 100);
        return result;
    };
    
    console.log('✅ Coordinate system fix applied');
    console.log('🟢 Green circles = Fixed hitbox positions (should align with icons)');
    console.log('🎯 Hover over objects now - tooltips should work correctly!');
    
    // Test function
    window.testCoordinateFix = function() {
        console.log('🧪 Testing coordinate fix...');
        updateHitboxes();
        console.log('✅ Hitboxes updated with fixed coordinates');
    };
    
    console.log('\n💡 Available functions:');
    console.log('  - window.testCoordinateFix() - Refresh fixed hitboxes');
    
} else {
    console.log('❌ Star Charts UI not found');
}

console.log('\n🏁 Coordinate system fix complete!');
