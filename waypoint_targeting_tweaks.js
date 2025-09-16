/**
 * 🎯 WAYPOINT TARGETING - FINAL TWEAKS
 * 
 * Fixes:
 * 1. Target reticle colored magenta for waypoints
 * 2. Remove magenta pulse in world VFX
 * 3. Wireframe object showing up in target HUD
 * 4. In-world 3D waypoint object 60% smaller
 */

console.log('🎯 Applying Waypoint Targeting Tweaks...');

function applyWaypointTweaks() {
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;

    // ========== TWEAK 1: MAGENTA TARGET RETICLE ==========
    
    tcm.createWaypointReticle = function() {
        if (this.targetReticle) {
            // Set magenta colors for waypoint reticle
            this.targetReticle.style.borderColor = window.WAYPOINT_COLORS.primary;
            this.targetReticle.style.backgroundColor = 'transparent'; // Remove background
            this.targetReticle.style.boxShadow = `0 0 10px ${window.WAYPOINT_COLORS.primary}`;
            
            // Add waypoint-specific styling
            this.targetReticle.classList.add('waypoint-reticle');
            
            // Remove pulsing animation - create static magenta reticle
            if (!document.querySelector('#waypoint-reticle-style-static')) {
                const style = document.createElement('style');
                style.id = 'waypoint-reticle-style-static';
                style.textContent = `
                    .waypoint-reticle {
                        border: 2px solid ${window.WAYPOINT_COLORS.primary} !important;
                        background: transparent !important;
                        box-shadow: 0 0 10px ${window.WAYPOINT_COLORS.primary} !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            console.log('🎯 Applied static magenta waypoint reticle');
        }
    };

    // ========== TWEAK 2: REMOVE MAGENTA PULSE VFX ==========
    
    // Remove any existing waypoint pulse animations
    const existingPulseStyles = document.querySelectorAll('#waypoint-reticle-style');
    existingPulseStyles.forEach(style => {
        style.remove();
        console.log('🗑️ Removed waypoint pulse animation');
    });

    // ========== TWEAK 3: WIREFRAME IN TARGET HUD ==========
    
    tcm.createWaypointWireframe = function() {
        if (!this.scene || !this.THREE || !this.currentTarget?.isWaypoint) return;
        
        // Remove existing wireframe
        if (this.targetWireframe) {
            this.scene.remove(this.targetWireframe);
            this.targetWireframe = null;
        }
        
        // Create waypoint wireframe - diamond/rhombus shape
        const geometry = new this.THREE.BufferGeometry();
        
        // Smaller diamond vertices (60% of original size)
        const size = 0.6; // 60% smaller
        const vertices = new Float32Array([
            // Top pyramid
            0, 2*size, 0,    // top
            -1*size, 0, 0,   // left
            0, 0, 1*size,    // front
            
            0, 2*size, 0,    // top
            0, 0, 1*size,    // front
            1*size, 0, 0,    // right
            
            0, 2*size, 0,    // top
            1*size, 0, 0,    // right
            0, 0, -1*size,   // back
            
            0, 2*size, 0,    // top
            0, 0, -1*size,   // back
            -1*size, 0, 0,   // left
            
            // Bottom pyramid
            0, -2*size, 0,   // bottom
            0, 0, 1*size,    // front
            -1*size, 0, 0,   // left
            
            0, -2*size, 0,   // bottom
            1*size, 0, 0,    // right
            0, 0, 1*size,    // front
            
            0, -2*size, 0,   // bottom
            0, 0, -1*size,   // back
            1*size, 0, 0,    // right
            
            0, -2*size, 0,   // bottom
            -1*size, 0, 0,   // left
            0, 0, -1*size,   // back
        ]);
        
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertices, 3));
        
        // Create wireframe material with waypoint colors (no pulse)
        const material = new this.THREE.MeshBasicMaterial({
            color: window.WAYPOINT_COLORS.primary,
            wireframe: true,
            transparent: true,
            opacity: 0.9 // Slightly more opaque for better visibility
        });
        
        // Create wireframe mesh
        this.targetWireframe = new this.THREE.Mesh(geometry, material);
        
        // Position wireframe at waypoint location
        this.targetWireframe.position.set(
            this.currentTarget.position.x,
            this.currentTarget.position.y,
            this.currentTarget.position.z
        );
        
        // Scale based on trigger radius but 60% smaller
        const scale = Math.max(0.6, (this.currentTarget.triggerRadius / 10) * 0.6); // 60% smaller
        this.targetWireframe.scale.setScalar(scale);
        
        // Static wireframe - no animation
        this.targetWireframe.userData = {
            isWaypointWireframe: true,
            isStatic: true // Flag to prevent animation
        };
        
        this.scene.add(this.targetWireframe);
        
        console.log('🎯 Created static waypoint wireframe (60% smaller, no pulse)');
        
        // ========== ENSURE WIREFRAME SHOWS IN HUD ==========
        
        // Make sure the wireframe is visible in the target HUD by setting proper render layers
        if (this.targetWireframe) {
            this.targetWireframe.layers.enable(0); // Default layer
            this.targetWireframe.renderOrder = 1000; // High render order for visibility
            this.targetWireframe.frustumCulled = false; // Always render
            
            console.log('🎯 Wireframe configured for HUD visibility');
        }
    };

    // ========== TWEAK 4: REMOVE WIREFRAME ANIMATION ==========
    
    tcm.animateWaypointWireframe = function() {
        // Do nothing - remove all animations for static wireframe
        // This prevents pulsing and rotation
        return;
    };

    // ========== ENHANCED HUD STYLING (NO PULSE) ==========
    
    tcm.setWaypointHUDColors = function() {
        if (this.targetHUD) {
            // Outer frame - static colors, no pulse
            this.targetHUD.style.borderColor = window.WAYPOINT_COLORS.primary;
            this.targetHUD.style.color = window.WAYPOINT_COLORS.primary;
            this.targetHUD.style.backgroundColor = window.WAYPOINT_COLORS.background + '88';
            this.targetHUD.style.boxShadow = `0 0 8px ${window.WAYPOINT_COLORS.primary}`; // Reduced glow
            
            // Inner frame elements
            const innerElements = this.targetHUD.querySelectorAll('*');
            innerElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.borderWidth !== '0px' || computedStyle.borderColor !== 'rgba(0, 0, 0, 0)') {
                    element.style.borderColor = window.WAYPOINT_COLORS.primary;
                }
                if (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    element.style.backgroundColor = window.WAYPOINT_COLORS.background + '44';
                }
            });
            
            console.log('🎯 Applied static waypoint HUD colors (no pulse)');
        }
        
        if (this.targetNameDisplay) {
            this.targetNameDisplay.style.color = window.WAYPOINT_COLORS.text;
            const waypointName = this.currentTarget?.name || 'Unknown Waypoint';
            this.targetNameDisplay.innerHTML = `
                <span style="color: ${window.WAYPOINT_COLORS.primary}; font-size: 1.2em;">📍</span> 
                <span style="color: ${window.WAYPOINT_COLORS.text}; font-weight: bold;">${waypointName}</span>
            `;
        }
        
        if (this.targetDistanceDisplay) {
            this.targetDistanceDisplay.style.color = window.WAYPOINT_COLORS.accent;
        }
        
        if (this.targetInfoDisplay) {
            const waypointType = this.currentTarget.waypointData?.type || 'navigation';
            this.targetInfoDisplay.innerHTML = `
                <div style="color: ${window.WAYPOINT_COLORS.accent}">
                    Type: ${waypointType.toUpperCase()}
                </div>
                <div style="color: ${window.WAYPOINT_COLORS.text}">
                    Mission Waypoint
                </div>
            `;
        }
    };

    // ========== ENHANCED UPDATE TARGET DISPLAY ==========
    
    // Store original updateTargetDisplay if it exists
    if (!tcm._originalUpdateTargetDisplay && tcm.updateTargetDisplay) {
        tcm._originalUpdateTargetDisplay = tcm.updateTargetDisplay.bind(tcm);
    }
    
    tcm.updateTargetDisplay = function() {
        // Call original method if it exists
        if (this._originalUpdateTargetDisplay) {
            this._originalUpdateTargetDisplay();
        }
        
        // Handle waypoint-specific display updates
        if (this.currentTarget && this.currentTarget.isWaypoint) {
            setTimeout(() => {
                this.setWaypointHUDColors();
                this.createWaypointReticle();
                // Don't call animateWaypointWireframe - we want static wireframes
            }, 50);
        }
    };

    console.log('✅ All waypoint targeting tweaks applied');
    return true;
}

// ========== TEST FUNCTION FOR TWEAKS ==========

window.testWaypointTweaks = function() {
    console.log('🎯 Testing waypoint tweaks...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    // Find waypoint targets
    const waypointTargets = tcm.targetObjects?.filter(t => t.isWaypoint) || [];
    
    if (waypointTargets.length === 0) {
        console.log('⚠️ No waypoints available - creating one...');
        if (window.createSingleTestWaypoint) {
            window.createSingleTestWaypoint();
            setTimeout(() => {
                window.testWaypointTweaks();
            }, 2000);
        }
        return;
    }
    
    // Target the first waypoint
    tcm.setTargetById(waypointTargets[0].id);
    
    setTimeout(() => {
        console.log('🎯 Waypoint Tweaks Test Results:');
        
        // Test 1: Reticle color
        if (tcm.targetReticle) {
            const reticleStyle = window.getComputedStyle(tcm.targetReticle);
            const isMagenta = reticleStyle.borderColor.includes('255, 0, 255') || 
                            reticleStyle.borderColor.includes('#ff00ff');
            console.log(`  ✅ Reticle Color: ${isMagenta ? 'Magenta ✅' : 'Not Magenta ❌'}`);
            console.log(`    Border: ${reticleStyle.borderColor}`);
            console.log(`    Background: ${reticleStyle.backgroundColor}`);
        } else {
            console.log('  ❌ Reticle not found');
        }
        
        // Test 2: Pulse animations removed
        const pulseStyles = document.querySelectorAll('#waypoint-reticle-style');
        console.log(`  ✅ Pulse Animations Removed: ${pulseStyles.length === 0 ? 'Yes ✅' : 'No ❌'}`);
        
        // Test 3: Wireframe visibility
        if (tcm.targetWireframe) {
            console.log('  ✅ Wireframe Created: Yes ✅');
            console.log(`    Position: x=${tcm.targetWireframe.position.x.toFixed(2)}, y=${tcm.targetWireframe.position.y.toFixed(2)}, z=${tcm.targetWireframe.position.z.toFixed(2)}`);
            console.log(`    Scale: ${tcm.targetWireframe.scale.x.toFixed(2)} (should be ~60% smaller)`);
            console.log(`    Render Order: ${tcm.targetWireframe.renderOrder}`);
            console.log(`    Layers: ${tcm.targetWireframe.layers.mask}`);
            console.log(`    Frustum Culled: ${tcm.targetWireframe.frustumCulled}`);
            
            if (tcm.targetWireframe.material) {
                const color = tcm.targetWireframe.material.color;
                const isMagenta = color.r === 1 && color.g === 0 && color.b === 1;
                console.log(`    Color: ${isMagenta ? 'Magenta ✅' : 'Not Magenta ❌'} (r=${color.r}, g=${color.g}, b=${color.b})`);
                console.log(`    Opacity: ${tcm.targetWireframe.material.opacity}`);
            }
        } else {
            console.log('  ❌ Wireframe not created');
        }
        
        // Test 4: Size reduction
        if (tcm.targetWireframe) {
            const scale = tcm.targetWireframe.scale.x;
            const expectedScale = Math.max(0.6, (tcm.currentTarget.triggerRadius / 10) * 0.6);
            const isCorrectSize = Math.abs(scale - expectedScale) < 0.1;
            console.log(`  ✅ Size Reduction: ${isCorrectSize ? 'Correct ✅' : 'Incorrect ❌'}`);
            console.log(`    Actual Scale: ${scale.toFixed(2)}`);
            console.log(`    Expected Scale: ${expectedScale.toFixed(2)}`);
        }
        
        console.log('\n🎯 All tweaks verification complete!');
        
    }, 1000);
};

// ========== CLEANUP FUNCTION ==========

window.cleanupWaypointAnimations = function() {
    console.log('🧹 Cleaning up waypoint animations...');
    
    // Remove all pulse animation styles
    const pulseStyles = document.querySelectorAll('[id*="waypoint-reticle-style"]');
    pulseStyles.forEach(style => {
        style.remove();
        console.log('🗑️ Removed pulse animation style');
    });
    
    // Reset any animated wireframes to static
    if (window.targetComputerManager?.targetWireframe) {
        const wireframe = window.targetComputerManager.targetWireframe;
        if (wireframe.userData) {
            wireframe.userData.isStatic = true;
            wireframe.userData.animationTime = 0;
        }
        console.log('🔄 Set wireframe to static mode');
    }
    
    console.log('✅ Animation cleanup complete');
};

// ========== AUTO-APPLY TWEAKS ==========

// Apply the tweaks immediately
const success = applyWaypointTweaks();

if (success) {
    console.log('🎉 Waypoint targeting tweaks applied successfully!');
    console.log('🎮 Available functions:');
    console.log('  testWaypointTweaks() - Test all tweaks');
    console.log('  cleanupWaypointAnimations() - Remove animations');
    
    // Auto-test if we have waypoints
    setTimeout(() => {
        if (window.testWaypointTweaks) {
            window.testWaypointTweaks();
        }
    }, 1000);
} else {
    console.log('❌ Failed to apply waypoint targeting tweaks');
}
