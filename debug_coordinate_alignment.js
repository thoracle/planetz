// Debug coordinate alignment between visual icons and hitboxes
console.log('🔍 COORDINATE ALIGNMENT DEBUG');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Get all objects and their visual elements
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    const svg = document.querySelector('.starcharts-svg');
    
    if (!svg) {
        console.log('❌ No SVG found');
        return;
    }
    
    console.log(`🔍 Analyzing coordinate alignment for ${allObjects.length} objects`);
    
    // Clear existing debug elements
    document.querySelectorAll('.coordinate-debug').forEach(el => el.remove());
    
    allObjects.forEach((object, index) => {
        const objectId = object.id;
        
        // Get calculated hitbox position (what the hover detection uses)
        const hitboxPos = starChartsUI.worldToScreen(object);
        
        // Find the actual visual element in the SVG
        const visualElement = svg.querySelector(`[data-object-id="${objectId}"]`) || 
                             svg.querySelector(`[data-name="${objectId}"]`) ||
                             svg.querySelector(`[id*="${objectId}"]`);
        
        let visualPos = null;
        if (visualElement) {
            // Get visual element's actual position
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
                // For groups, try to find the main shape inside
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
        }
        
        // Calculate alignment error
        let alignmentError = null;
        if (hitboxPos && visualPos) {
            const dx = hitboxPos.x - visualPos.x;
            const dy = hitboxPos.y - visualPos.y;
            alignmentError = Math.sqrt(dx * dx + dy * dy);
        }
        
        console.log(`${index + 1}. ${objectId}:`);
        console.log(`   Hitbox pos: ${hitboxPos ? `(${hitboxPos.x.toFixed(1)}, ${hitboxPos.y.toFixed(1)})` : 'null'}`);
        console.log(`   Visual pos: ${visualPos ? `(${visualPos.x.toFixed(1)}, ${visualPos.y.toFixed(1)})` : 'not found'}`);
        console.log(`   Alignment error: ${alignmentError ? `${alignmentError.toFixed(1)} pixels` : 'unknown'}`);
        console.log(`   Visual element: ${visualElement ? visualElement.tagName : 'NOT FOUND'}`);
        
        // Add visual debugging markers
        if (hitboxPos) {
            // Blue circle for hitbox position
            const hitboxMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitboxMarker.setAttribute('cx', hitboxPos.x);
            hitboxMarker.setAttribute('cy', hitboxPos.y);
            hitboxMarker.setAttribute('r', 4);
            hitboxMarker.setAttribute('fill', '#0088ff');
            hitboxMarker.setAttribute('stroke', '#ffffff');
            hitboxMarker.setAttribute('stroke-width', '1');
            hitboxMarker.setAttribute('class', 'coordinate-debug');
            hitboxMarker.style.pointerEvents = 'none';
            svg.appendChild(hitboxMarker);
        }
        
        if (visualPos) {
            // Green circle for visual position
            const visualMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            visualMarker.setAttribute('cx', visualPos.x);
            visualMarker.setAttribute('cy', visualPos.y);
            visualMarker.setAttribute('r', 3);
            visualMarker.setAttribute('fill', '#00ff00');
            visualMarker.setAttribute('stroke', '#ffffff');
            visualMarker.setAttribute('stroke-width', '1');
            visualMarker.setAttribute('class', 'coordinate-debug');
            visualMarker.style.pointerEvents = 'none';
            svg.appendChild(visualMarker);
            
            // Draw line between hitbox and visual if they're different
            if (hitboxPos && alignmentError > 5) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', hitboxPos.x);
                line.setAttribute('y1', hitboxPos.y);
                line.setAttribute('x2', visualPos.x);
                line.setAttribute('y2', visualPos.y);
                line.setAttribute('stroke', '#ff0000');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('stroke-dasharray', '5,5');
                line.setAttribute('class', 'coordinate-debug');
                line.style.pointerEvents = 'none';
                svg.appendChild(line);
            }
        }
    });
    
    console.log('\n🎯 COORDINATE DEBUG MARKERS ADDED:');
    console.log('🔵 Blue circles = Hitbox positions (where hover detection works)');
    console.log('🟢 Green circles = Visual icon positions (where you see the icons)');
    console.log('🔴 Red dashed lines = Misalignment (> 5 pixels)');
    
    // Test coordinate conversion functions
    console.log('\n🧪 TESTING COORDINATE CONVERSION:');
    
    // Test a few sample world coordinates
    const testCoords = [
        { x: 0, y: 0, name: 'Origin' },
        { x: 100, y: 100, name: 'Test Point 1' },
        { x: -50, y: 50, name: 'Test Point 2' }
    ];
    
    testCoords.forEach(coord => {
        const screenPos = starChartsUI.worldToScreen({ 
            position: [coord.x, 0, coord.y] // Assuming standard position format
        });
        console.log(`${coord.name} (${coord.x}, ${coord.y}) -> Screen: ${screenPos ? `(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)})` : 'null'}`);
    });
    
    // Function to fix coordinate alignment
    window.fixCoordinateAlignment = function() {
        console.log('🔧 Attempting to fix coordinate alignment...');
        
        // Force a re-render which might fix coordinate calculations
        starChartsUI.render();
        
        // Wait a bit then re-add debug markers
        setTimeout(() => {
            console.log('🔄 Re-running coordinate analysis after render...');
            // Re-run this script
            eval(document.querySelector('script[src*="debug_coordinate_alignment"]')?.textContent || '');
        }, 500);
    };
    
    console.log('\n💡 Available functions:');
    console.log('  - window.fixCoordinateAlignment() - Force re-render and re-analyze');
    
} else {
    console.log('❌ Star Charts components not found');
}

console.log('\n🏁 Coordinate alignment analysis complete!');
