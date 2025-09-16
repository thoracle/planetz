/**
 * 🎯 WAYPOINT TARGETING INTEGRATION - FIXED VERSION
 * 
 * Fixes:
 * 1. TAB cycling loop issue
 * 2. Inner HUD frame coloring
 * 3. Waypoint wireframe creation
 */

console.log('🎯 Loading Fixed Waypoint Targeting Integration...');

// ========== WAYPOINT COLOR SCHEME ==========

window.WAYPOINT_COLORS = {
    primary: '#ff00ff',      // Bright magenta - main waypoint color
    secondary: '#cc00cc',    // Darker magenta - secondary elements
    accent: '#ff66ff',       // Light magenta - highlights and effects
    glow: '#ff00ff88',       // Translucent magenta - glow effects
    text: '#ffffff',         // White text for readability
    background: '#330033'    // Dark purple background
};

console.log('✅ Waypoint color scheme defined:', window.WAYPOINT_COLORS);

// ========== WAYPOINT TARGET OBJECT CREATION ==========

function createWaypointTargetObject(waypoint) {
    return {
        id: waypoint.id,
        name: waypoint.name,
        type: 'waypoint',
        isWaypoint: true,
        position: {
            x: waypoint.position[0],
            y: waypoint.position[1], 
            z: waypoint.position[2]
        },
        // Three.js object for 3D positioning
        object3D: {
            position: {
                x: waypoint.position[0],
                y: waypoint.position[1],
                z: waypoint.position[2]
            },
            userData: {
                type: 'waypoint',
                waypointId: waypoint.id,
                waypointType: waypoint.type,
                isWaypoint: true
            }
        },
        // Waypoint-specific data
        waypointData: waypoint,
        triggerRadius: waypoint.triggerRadius,
        status: waypoint.status,
        missionId: waypoint.missionId,
        // Targeting system compatibility
        faction: 'waypoint',
        diplomacy: 'waypoint',
        isTargetable: true,
        distance: 0 // Will be calculated dynamically
    };
}

// ========== TARGETING SYSTEM INTEGRATION ==========

function integrateWaypointsWithTargeting() {
    if (!window.targetComputerManager) {
        console.warn('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;
    console.log('🎯 Found TargetComputerManager:', tcm);
    
    // ========== PREVENT DUPLICATE WAYPOINT ADDITIONS ==========
    
    tcm.addWaypointsToTargets = function() {
        if (!window.waypointManager) return;
        
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        
        // Remove existing waypoint targets to prevent duplicates
        this.targetObjects = this.targetObjects.filter(t => !t.isWaypoint);
        
        for (const waypoint of activeWaypoints) {
            const waypointTarget = createWaypointTargetObject(waypoint);
            
            // Calculate distance to player
            if (this.camera) {
                const dx = waypointTarget.position.x - this.camera.position.x;
                const dy = waypointTarget.position.y - this.camera.position.y;
                const dz = waypointTarget.position.z - this.camera.position.z;
                waypointTarget.distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            }
            
            this.targetObjects.push(waypointTarget);
        }

        // Sort targets by distance
        this.targetObjects.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    };

    // ========== FIXED TARGET CYCLING ==========
    
    // Store original cycleTarget if it exists
    if (!tcm._originalCycleTarget && tcm.cycleTarget) {
        tcm._originalCycleTarget = tcm.cycleTarget.bind(tcm);
    }
    
    tcm.cycleTarget = function(forward = true) {
        // Only add waypoints once at the beginning, not on every cycle
        if (!this._waypointsAdded) {
            this.addWaypointsToTargets();
            this._waypointsAdded = true;
        }
        
        // Call original cycling logic if it exists
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
        
        // Handle waypoint-specific targeting (only once per cycle)
        if (this.currentTarget && this.currentTarget.isWaypoint && !this._waypointStyleApplied) {
            console.log(`🎯 Waypoint targeted: ${this.currentTarget.name}`);
            
            // Update waypoint status to TARGETED
            if (window.waypointManager) {
                const waypoint = window.waypointManager.getWaypoint(this.currentTarget.id);
                if (waypoint) {
                    window.waypointManager.updateWaypoint(this.currentTarget.id, {
                        status: 'targeted'
                    });
                }
            }
            
            // Set waypoint-specific HUD colors
            this.setWaypointHUDColors();
            this.createWaypointWireframe();
            this._waypointStyleApplied = true;
        } else if (!this.currentTarget?.isWaypoint) {
            this._waypointStyleApplied = false;
        }
    };

    // ========== ENHANCED WAYPOINT HUD STYLING ==========
    
    tcm.setWaypointHUDColors = function() {
        if (this.targetHUD) {
            // Outer frame
            this.targetHUD.style.borderColor = window.WAYPOINT_COLORS.primary;
            this.targetHUD.style.color = window.WAYPOINT_COLORS.primary;
            this.targetHUD.style.backgroundColor = window.WAYPOINT_COLORS.background + '88';
            this.targetHUD.style.boxShadow = `0 0 15px ${window.WAYPOINT_COLORS.glow}`;
            
            // Inner frame elements - find all child elements with borders
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
            
            console.log('🎯 Applied waypoint HUD colors (outer and inner frames)');
        }
        
        if (this.targetNameDisplay) {
            this.targetNameDisplay.style.color = window.WAYPOINT_COLORS.text;
            this.targetNameDisplay.innerHTML = `
                <span style="color: ${window.WAYPOINT_COLORS.primary}">📍</span> 
                ${this.currentTarget.name}
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

    // ========== WAYPOINT WIREFRAME CREATION ==========
    
    tcm.createWaypointWireframe = function() {
        if (!this.scene || !this.THREE || !this.currentTarget?.isWaypoint) return;
        
        // Remove existing wireframe
        if (this.targetWireframe) {
            this.scene.remove(this.targetWireframe);
            this.targetWireframe = null;
        }
        
        // Create waypoint wireframe - diamond/rhombus shape
        const geometry = new this.THREE.BufferGeometry();
        
        // Diamond vertices (distinct from beacon sphere and target dummy cube)
        const vertices = new Float32Array([
            // Top pyramid
            0, 2, 0,    // top
            -1, 0, 0,   // left
            0, 0, 1,    // front
            
            0, 2, 0,    // top
            0, 0, 1,    // front
            1, 0, 0,    // right
            
            0, 2, 0,    // top
            1, 0, 0,    // right
            0, 0, -1,   // back
            
            0, 2, 0,    // top
            0, 0, -1,   // back
            -1, 0, 0,   // left
            
            // Bottom pyramid
            0, -2, 0,   // bottom
            0, 0, 1,    // front
            -1, 0, 0,   // left
            
            0, -2, 0,   // bottom
            1, 0, 0,    // right
            0, 0, 1,    // front
            
            0, -2, 0,   // bottom
            0, 0, -1,   // back
            1, 0, 0,    // right
            
            0, -2, 0,   // bottom
            -1, 0, 0,   // left
            0, 0, -1,   // back
        ]);
        
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertices, 3));
        
        // Create wireframe material with waypoint colors
        const material = new this.THREE.MeshBasicMaterial({
            color: window.WAYPOINT_COLORS.primary,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        // Create wireframe mesh
        this.targetWireframe = new this.THREE.Mesh(geometry, material);
        
        // Position wireframe at waypoint location
        this.targetWireframe.position.set(
            this.currentTarget.position.x,
            this.currentTarget.position.y,
            this.currentTarget.position.z
        );
        
        // Scale based on trigger radius
        const scale = Math.max(1, this.currentTarget.triggerRadius / 10);
        this.targetWireframe.scale.setScalar(scale);
        
        // Add pulsing animation
        this.targetWireframe.userData = {
            isWaypointWireframe: true,
            animationTime: 0
        };
        
        this.scene.add(this.targetWireframe);
        
        console.log('🎯 Created waypoint wireframe (diamond shape)');
    };

    // ========== WAYPOINT TARGET RETICLE ==========
    
    tcm.createWaypointReticle = function() {
        if (this.targetReticle) {
            // Update existing reticle for waypoint
            this.targetReticle.style.borderColor = window.WAYPOINT_COLORS.primary;
            this.targetReticle.style.backgroundColor = window.WAYPOINT_COLORS.glow;
            this.targetReticle.style.boxShadow = `0 0 20px ${window.WAYPOINT_COLORS.primary}`;
            
            // Add waypoint-specific styling
            this.targetReticle.classList.add('waypoint-reticle');
            
            // Add pulsing animation for waypoints
            if (!document.querySelector('#waypoint-reticle-style')) {
                const style = document.createElement('style');
                style.id = 'waypoint-reticle-style';
                style.textContent = `
                    .waypoint-reticle {
                        animation: waypointPulse 2s infinite ease-in-out;
                    }
                    @keyframes waypointPulse {
                        0%, 100% { 
                            transform: scale(1);
                            opacity: 0.8;
                        }
                        50% { 
                            transform: scale(1.1);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            console.log('🎯 Applied waypoint reticle styling');
        }
    };

    // ========== WIREFRAME ANIMATION ==========
    
    tcm.animateWaypointWireframe = function() {
        if (this.targetWireframe && this.targetWireframe.userData.isWaypointWireframe) {
            this.targetWireframe.userData.animationTime += 0.02;
            
            // Pulsing scale animation
            const pulseScale = 1 + Math.sin(this.targetWireframe.userData.animationTime * 2) * 0.1;
            this.targetWireframe.scale.setScalar(pulseScale);
            
            // Rotation animation
            this.targetWireframe.rotation.y += 0.01;
        }
    };

    // ========== ENHANCED TARGET DISPLAY UPDATE ==========
    
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
            this.setWaypointHUDColors();
            this.createWaypointReticle();
            this.animateWaypointWireframe();
        }
    };

    // ========== ENHANCED setTargetById ==========
    
    // Store original setTargetById if it exists
    if (!tcm._originalSetTargetById && tcm.setTargetById) {
        tcm._originalSetTargetById = tcm.setTargetById.bind(tcm);
    }
    
    tcm.setTargetById = function(targetId) {
        console.log(`🎯 setTargetById called with: ${targetId}`);
        
        // Add waypoints to target list first (only if not already added)
        if (!this._waypointsAdded) {
            this.addWaypointsToTargets();
            this._waypointsAdded = true;
        }
        
        // Find target in our list
        const targetIndex = this.targetObjects.findIndex(t => t.id === targetId);
        
        if (targetIndex !== -1) {
            this.targetIndex = targetIndex;
            this.currentTarget = this.targetObjects[targetIndex];
            console.log(`🎯 Target set: ${this.currentTarget.name}`);
            
            // Update display
            if (this.updateTargetDisplay) {
                this.updateTargetDisplay();
            }
            
            return true;
        } else {
            // Call original method if it exists
            if (this._originalSetTargetById) {
                return this._originalSetTargetById(targetId);
            }
        }
        
        return false;
    };

    // ========== REFRESH WAYPOINTS METHOD ==========
    
    tcm.refreshWaypoints = function() {
        this._waypointsAdded = false;
        this.addWaypointsToTargets();
        this._waypointsAdded = true;
        console.log('🎯 Waypoints refreshed in targeting system');
    };

    console.log('✅ TargetComputerManager enhanced with waypoint support (fixed version)');
    return true;
}

// ========== WAYPOINT MANAGER INTEGRATION ==========

function integrateWaypointManager() {
    if (!window.waypointManager) {
        console.warn('❌ WaypointManager not available');
        return false;
    }

    const wm = window.waypointManager;
    
    // Store original methods
    if (!wm._originalActivateWaypoint && wm.activateWaypoint) {
        wm._originalActivateWaypoint = wm.activateWaypoint.bind(wm);
    }
    if (!wm._originalDeleteWaypoint && wm.deleteWaypoint) {
        wm._originalDeleteWaypoint = wm.deleteWaypoint.bind(wm);
    }

    // ========== ENHANCED WAYPOINT ACTIVATION ==========
    
    wm.activateWaypoint = function(waypointId) {
        // Call original method
        if (this._originalActivateWaypoint) {
            this._originalActivateWaypoint(waypointId);
        }
        
        // Notify targeting system to refresh target list
        if (window.targetComputerManager && window.targetComputerManager.refreshWaypoints) {
            window.targetComputerManager.refreshWaypoints();
        }
        
        console.log(`🎯 Waypoint activated and added to targeting system: ${waypointId}`);
    };

    // ========== ENHANCED WAYPOINT DELETION ==========
    
    wm.deleteWaypoint = function(waypointId) {
        // Check if this waypoint is currently targeted
        if (window.targetComputerManager?.currentTarget?.id === waypointId) {
            // Clear current target and cycle to next
            window.targetComputerManager.currentTarget = null;
            if (window.targetComputerManager.cycleTarget) {
                window.targetComputerManager.cycleTarget();
            }
        }
        
        // Call original method
        if (this._originalDeleteWaypoint) {
            const result = this._originalDeleteWaypoint(waypointId);
            
            // Refresh targeting system
            if (window.targetComputerManager && window.targetComputerManager.refreshWaypoints) {
                window.targetComputerManager.refreshWaypoints();
            }
            
            return result;
        }
        
        return true;
    };

    console.log('✅ WaypointManager enhanced with targeting integration (fixed version)');
    return true;
}

// ========== INITIALIZATION ==========

function initializeWaypointTargeting() {
    console.log('🎯 Initializing fixed waypoint targeting integration...');
    
    let successCount = 0;
    
    // Integrate with targeting system
    if (integrateWaypointsWithTargeting()) {
        successCount++;
    }
    
    // Integrate with waypoint manager
    if (integrateWaypointManager()) {
        successCount++;
    }
    
    console.log(`🎯 Fixed waypoint targeting integration complete: ${successCount}/2 systems integrated`);
    
    // Add global test functions
    window.testWaypointTargeting = function() {
        console.log('🎯 Testing waypoint targeting...');
        
        if (window.targetComputerManager) {
            window.targetComputerManager.refreshWaypoints();
            console.log('Target objects updated:', window.targetComputerManager.targetObjects.length);
            
            const waypoints = window.targetComputerManager.targetObjects.filter(t => t.isWaypoint);
            console.log('Waypoints in targeting system:', waypoints.length);
            
            if (waypoints.length > 0) {
                console.log('First waypoint:', waypoints[0]);
                window.targetComputerManager.setTargetById(waypoints[0].id);
                console.log('Waypoint targeted successfully!');
            }
        }
    };
    
    window.createTestWaypoint = function() {
        if (window.waypointManager) {
            const testWaypoint = window.waypointManager.createWaypoint({
                name: 'Test Navigation Point',
                position: [-50, 0, 50],
                triggerRadius: 25.0,
                type: 'navigation',
                actions: [{
                    type: 'show_message',
                    parameters: {
                        title: 'Test Waypoint',
                        message: 'You have reached the test waypoint!',
                        audioFileId: 'discovery_chime'
                    }
                }]
            });
            
            console.log('✅ Test waypoint created:', testWaypoint);
            return testWaypoint;
        }
    };
    
    window.cleanupWaypointTests = function() {
        console.log('🧹 Cleaning up waypoint tests...');
        
        if (window.waypointManager) {
            const activeWaypoints = window.waypointManager.getActiveWaypoints();
            
            for (const waypoint of activeWaypoints) {
                if (waypoint.name.includes('Test')) {
                    window.waypointManager.deleteWaypoint(waypoint.id);
                    console.log(`🗑️ Deleted test waypoint: ${waypoint.name}`);
                }
            }
        }
        
        // Reset targeting system flags
        if (window.targetComputerManager) {
            window.targetComputerManager._waypointsAdded = false;
            window.targetComputerManager._waypointStyleApplied = false;
        }
        
        console.log('✅ Waypoint test cleanup complete');
    };
    
    return successCount >= 1;
}

// ========== AUTO-INITIALIZATION ==========

// Initialize immediately
const success = initializeWaypointTargeting();

if (success) {
    console.log('🎉 Fixed waypoint targeting integration loaded successfully!');
    console.log('🎮 Available test functions:');
    console.log('  testWaypointTargeting() - Test waypoint targeting');
    console.log('  createTestWaypoint() - Create a test waypoint');
    console.log('  cleanupWaypointTests() - Clean up test waypoints');
    
    // Clean up any existing test waypoints first
    setTimeout(() => {
        if (window.cleanupWaypointTests) {
            window.cleanupWaypointTests();
        }
    }, 500);
    
} else {
    console.log('❌ Fixed waypoint targeting integration failed to load');
}
