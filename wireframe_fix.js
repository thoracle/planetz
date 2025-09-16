/**
 * 🎯 WIREFRAME FIX - Restore wireframes for all targets
 * 
 * This fixes the issue where wireframes stopped showing for regular targets
 * while preserving waypoint-specific tweaks
 */

console.log('🔧 Fixing wireframe display for all targets...');

function fixWireframeDisplay() {
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;

    // ========== RESTORE ORIGINAL WIREFRAME CREATION ==========
    
    // Store the waypoint wireframe function separately
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
            opacity: 0.9
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
        const scale = Math.max(0.6, (this.currentTarget.triggerRadius / 10) * 0.6);
        this.targetWireframe.scale.setScalar(scale);
        
        // Static wireframe - no animation
        this.targetWireframe.userData = {
            isWaypointWireframe: true,
            isStatic: true
        };
        
        this.scene.add(this.targetWireframe);
        
        console.log('🎯 Created waypoint wireframe (diamond, 60% smaller, static)');
    };

    // ========== ENHANCED WIREFRAME CREATION FOR ALL TARGETS ==========
    
    tcm.createTargetWireframe = function() {
        if (!this.scene || !this.THREE || !this.currentTarget) return;
        
        // Remove existing wireframe
        if (this.targetWireframe) {
            this.scene.remove(this.targetWireframe);
            this.targetWireframe = null;
        }
        
        // Handle waypoints specially
        if (this.currentTarget.isWaypoint) {
            this.createWaypointWireframe();
            return;
        }
        
        // ========== REGULAR TARGET WIREFRAMES ==========
        
        let geometry;
        let material;
        let wireframeColor = '#00ff00'; // Default green
        let wireframeSize = 1.0;
        
        // Determine wireframe type based on target
        const targetType = this.currentTarget.type || 'unknown';
        const targetName = this.currentTarget.name || '';
        
        if (targetName.toLowerCase().includes('beacon')) {
            // Navigation beacons - sphere wireframe
            geometry = new this.THREE.SphereGeometry(wireframeSize, 8, 6);
            wireframeColor = '#ffff00'; // Yellow for beacons
        } else if (targetName.toLowerCase().includes('dummy') || targetName.toLowerCase().includes('target')) {
            // Target dummies - cube wireframe
            geometry = new this.THREE.BoxGeometry(wireframeSize * 2, wireframeSize * 2, wireframeSize * 2);
            wireframeColor = '#ff0000'; // Red for target dummies
        } else if (targetType === 'ship' || targetName.toLowerCase().includes('ship')) {
            // Ships - octahedron wireframe
            geometry = new this.THREE.OctahedronGeometry(wireframeSize);
            wireframeColor = '#ff8800'; // Orange for ships
        } else if (targetType === 'station' || targetName.toLowerCase().includes('station') || 
                   targetName.toLowerCase().includes('outpost') || targetName.toLowerCase().includes('complex')) {
            // Stations - larger cube wireframe
            geometry = new this.THREE.BoxGeometry(wireframeSize * 3, wireframeSize * 2, wireframeSize * 3);
            wireframeColor = '#00ffff'; // Cyan for stations
        } else if (targetType === 'planet' || targetName.toLowerCase().includes('prime') || 
                   targetName.toLowerCase().includes('luna') || targetName.toLowerCase().includes('europa') ||
                   targetName.toLowerCase().includes('callisto') || targetName.toLowerCase().includes('sol')) {
            // Planets/celestial bodies - large sphere wireframe
            geometry = new this.THREE.SphereGeometry(wireframeSize * 2, 12, 8);
            wireframeColor = '#0088ff'; // Blue for celestial bodies
        } else {
            // Default - simple sphere
            geometry = new this.THREE.SphereGeometry(wireframeSize, 8, 6);
            wireframeColor = '#00ff00'; // Green default
        }
        
        // Create wireframe material
        material = new this.THREE.MeshBasicMaterial({
            color: wireframeColor,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        
        // Create wireframe mesh
        this.targetWireframe = new this.THREE.Mesh(geometry, material);
        
        // Position wireframe at target location
        if (this.currentTarget.object3D && this.currentTarget.object3D.position) {
            this.targetWireframe.position.copy(this.currentTarget.object3D.position);
        } else if (this.currentTarget.position) {
            this.targetWireframe.position.set(
                this.currentTarget.position.x,
                this.currentTarget.position.y,
                this.currentTarget.position.z
            );
        }
        
        // Scale based on target size or distance
        let scale = 1.0;
        if (this.currentTarget.distance) {
            scale = Math.max(0.5, Math.min(2.0, this.currentTarget.distance / 50));
        }
        this.targetWireframe.scale.setScalar(scale);
        
        // Set wireframe properties for visibility
        this.targetWireframe.userData = {
            isTargetWireframe: true,
            targetType: targetType,
            isStatic: false // Regular wireframes can animate
        };
        
        this.targetWireframe.layers.enable(0);
        this.targetWireframe.renderOrder = 1000;
        this.targetWireframe.frustumCulled = false;
        
        this.scene.add(this.targetWireframe);
        
        console.log(`🎯 Created ${targetType} wireframe (${wireframeColor}) for ${this.currentTarget.name}`);
    };

    // ========== RESTORE WIREFRAME ANIMATION FOR NON-WAYPOINTS ==========
    
    tcm.animateTargetWireframe = function() {
        if (this.targetWireframe && this.targetWireframe.userData) {
            // Don't animate waypoint wireframes (they're static)
            if (this.targetWireframe.userData.isWaypointWireframe && this.targetWireframe.userData.isStatic) {
                return;
            }
            
            // Animate regular target wireframes
            if (this.targetWireframe.userData.isTargetWireframe) {
                // Gentle rotation animation for regular targets
                this.targetWireframe.rotation.y += 0.01;
                this.targetWireframe.rotation.x += 0.005;
                
                // Subtle pulsing for non-waypoint targets
                const time = Date.now() * 0.001;
                const pulse = 1 + Math.sin(time * 2) * 0.1;
                this.targetWireframe.scale.setScalar(this.targetWireframe.userData.baseScale || 1.0 * pulse);
            }
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
        
        // Create wireframe for current target
        if (this.currentTarget) {
            setTimeout(() => {
                this.createTargetWireframe();
                
                // Apply waypoint-specific styling if it's a waypoint
                if (this.currentTarget.isWaypoint) {
                    this.setWaypointHUDColors();
                    this.createWaypointReticle();
                }
                
                // Animate wireframe if it's not a static waypoint
                this.animateTargetWireframe();
            }, 50);
        }
    };

    // ========== ENHANCED CYCLE TARGET ==========
    
    // Store original cycleTarget if it exists
    if (!tcm._originalCycleTarget && tcm.cycleTarget) {
        tcm._originalCycleTarget = tcm.cycleTarget.bind(tcm);
    }
    
    tcm.cycleTarget = function(forward = true) {
        // Call original cycling logic
        if (this._originalCycleTarget) {
            this._originalCycleTarget(forward);
        } else {
            // Basic cycling implementation
            if (this.targetObjects && this.targetObjects.length > 0) {
                if (forward) {
                    this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
                } else {
                    this.targetIndex = (this.targetIndex - 1 + this.targetObjects.length) % this.targetObjects.length;
                }
                this.currentTarget = this.targetObjects[this.targetIndex];
            }
        }
        
        // Update display for new target
        if (this.updateTargetDisplay) {
            this.updateTargetDisplay();
        }
    };

    // ========== ANIMATION LOOP ==========
    
    // Set up animation loop for wireframes
    if (!tcm._wireframeAnimationLoop) {
        tcm._wireframeAnimationLoop = setInterval(() => {
            if (tcm.animateTargetWireframe) {
                tcm.animateTargetWireframe();
            }
        }, 16); // ~60 FPS
        
        console.log('🎬 Started wireframe animation loop');
    }

    console.log('✅ Wireframe display fixed for all targets');
    return true;
}

// ========== TEST WIREFRAME FUNCTION ==========

window.testWireframes = function() {
    console.log('🎯 Testing wireframe display...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    console.log('🎮 Instructions:');
    console.log('  1. Press TAB to cycle through targets');
    console.log('  2. Each target should show a wireframe');
    console.log('  3. Waypoints should show diamond wireframes (magenta)');
    console.log('  4. Regular targets should show appropriate wireframes (colored by type)');
    
    // Show current target info
    if (tcm.currentTarget) {
        console.log(`📍 Current Target: ${tcm.currentTarget.name}`);
        console.log(`   Type: ${tcm.currentTarget.type || 'unknown'}`);
        console.log(`   Is Waypoint: ${tcm.currentTarget.isWaypoint ? 'Yes' : 'No'}`);
        
        if (tcm.targetWireframe) {
            console.log(`   Wireframe: ✅ Present`);
            console.log(`   Wireframe Type: ${tcm.targetWireframe.userData?.isWaypointWireframe ? 'Waypoint' : 'Regular'}`);
            if (tcm.targetWireframe.material) {
                const color = tcm.targetWireframe.material.color;
                console.log(`   Color: r=${color.r.toFixed(2)}, g=${color.g.toFixed(2)}, b=${color.b.toFixed(2)}`);
            }
        } else {
            console.log(`   Wireframe: ❌ Missing`);
        }
    } else {
        console.log('📍 No target selected');
    }
    
    // Show available targets
    if (tcm.targetObjects && tcm.targetObjects.length > 0) {
        console.log(`🎯 Available Targets: ${tcm.targetObjects.length}`);
        const waypoints = tcm.targetObjects.filter(t => t.isWaypoint);
        const regular = tcm.targetObjects.filter(t => !t.isWaypoint);
        console.log(`   Waypoints: ${waypoints.length}`);
        console.log(`   Regular: ${regular.length}`);
    }
};

// ========== CLEANUP FUNCTION ==========

window.stopWireframeAnimation = function() {
    if (window.targetComputerManager?._wireframeAnimationLoop) {
        clearInterval(window.targetComputerManager._wireframeAnimationLoop);
        window.targetComputerManager._wireframeAnimationLoop = null;
        console.log('🛑 Stopped wireframe animation loop');
    }
};

// ========== AUTO-APPLY FIX ==========

// Apply the fix immediately
const success = fixWireframeDisplay();

if (success) {
    console.log('🎉 Wireframe display fix applied successfully!');
    console.log('🎮 Available functions:');
    console.log('  testWireframes() - Test wireframe display');
    console.log('  stopWireframeAnimation() - Stop wireframe animations');
    
    // Auto-test wireframes
    setTimeout(() => {
        if (window.testWireframes) {
            window.testWireframes();
        }
    }, 1000);
} else {
    console.log('❌ Failed to apply wireframe display fix');
}
