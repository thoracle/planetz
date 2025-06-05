(function() {
    console.log('🎯 AFT CROSSHAIR FIX TEST - Verifying crosshair patterns...');
    
    function testAftCrosshairPattern() {
        const viewManager = window.viewManager;
        
        if (!viewManager) {
            console.error('❌ ViewManager not found');
            return;
        }
        
        console.log('✅ Found ViewManager, testing crosshair patterns...');
        
        // Test initial creation
        if (!viewManager.aftCrosshair) {
            console.error('❌ Aft crosshair element not found');
            return;
        }
        
        console.log('✅ Aft crosshair element exists');
        
        // Switch to AFT view to make crosshair visible
        console.log('📍 Switching to AFT view...');
        viewManager.setView('AFT');
        
        // Wait a bit for view to settle
        setTimeout(() => {
            // Check if aft crosshair is visible
            const aftDisplay = viewManager.aftCrosshair.style.display;
            console.log(`🎯 Aft crosshair display: ${aftDisplay}`);
            
            // Force update crosshair display to test the fix
            if (viewManager.updateCrosshairDisplay) {
                console.log('🔄 Forcing crosshair display update...');
                viewManager.updateCrosshairDisplay();
            }
            
            // Check crosshair elements
            const crosshairElements = viewManager.aftCrosshair.querySelectorAll('.crosshair-element');
            console.log(`🎯 Number of crosshair elements: ${crosshairElements.length}`);
            
            if (crosshairElements.length === 2) {
                console.log('✅ Correct number of elements for aft crosshair (-- --)');
                
                // Check element positioning
                crosshairElements.forEach((element, index) => {
                    const style = element.style;
                    const position = style.left === '0px' ? 'left' : 'right';
                    const width = style.width;
                    console.log(`   Element ${index + 1}: ${position} side, width: ${width}`);
                });
                
                // Verify both elements are horizontal lines
                const horizontalLines = Array.from(crosshairElements).filter(el => {
                    return el.style.height === '2px' && 
                           (el.style.left === '0px' || el.style.right === '0px') &&
                           el.style.top === '50%';
                });
                
                if (horizontalLines.length === 2) {
                    console.log('✅ Both elements are correctly positioned horizontal lines');
                    console.log('✅ AFT CROSSHAIR FIX SUCCESSFUL! Pattern shows as: -- --');
                } else {
                    console.error('❌ Elements are not positioned correctly for -- -- pattern');
                }
            } else {
                console.error(`❌ Wrong number of elements. Expected 2 for -- --, got ${crosshairElements.length}`);
                if (crosshairElements.length === 4) {
                    console.error('   This suggests the + crosshair pattern is still being used');
                }
            }
            
            // Test switching back to FORE view
            setTimeout(() => {
                console.log('📍 Switching back to FORE view...');
                viewManager.setView('FORE');
                
                setTimeout(() => {
                    const foreElements = viewManager.frontCrosshair.querySelectorAll('.crosshair-element');
                    console.log(`🎯 FORE crosshair elements: ${foreElements.length} (should be 4 for + pattern)`);
                    
                    if (foreElements.length === 4) {
                        console.log('✅ FORE view correctly shows + crosshair pattern');
                    } else {
                        console.warn('⚠️ FORE view crosshair may have issues');
                    }
                }, 100);
            }, 1000);
            
        }, 500);
    }
    
    // Wait for game to initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(testAftCrosshairPattern, 2000);
        });
    } else {
        setTimeout(testAftCrosshairPattern, 2000);
    }
})(); 