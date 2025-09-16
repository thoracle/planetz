/**
 * 🎯 WAYPOINT TARGETING INTEGRATION - DIRECT CONSOLE VERSION
 * 
 * Direct console script that integrates waypoints with targeting system
 * Copy-paste this entire script into browser console
 */

console.log('🎯 Loading Direct Waypoint Targeting Integration...');

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
    
    // ========== ADD WAYPOINT TARGET COLLECTION ==========
    
    /**
     * Add waypoints to target collection
     */
    tcm.addWaypointsToTargets = function() {
        if (!window.waypointManager) return;
        
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        console.log(`🎯 Found ${activeWaypoints.length} active waypoints`);
        
        for (const waypoint of activeWaypoints) {
            const waypointTarget = createWaypointTargetObject(waypoint);
            
            // Calculate distance to player
            if (this.camera) {
                const dx = waypointTarget.position.x - this.camera.position.x;
                const dy = waypointTarget.position.y - this.camera.position.y;
                const dz = waypointTarget.position.z - this.camera.position.z;
                waypointTarget.distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            }
            
            // Add to target objects if not already present
            const existingIndex = this.targetObjects.findIndex(t => t.id === waypoint.id);
            if (existingIndex === -1) {
                this.targetObjects.push(waypointTarget);
                console.log(`🎯 Added waypoint to targets: ${waypoint.name}`);
            } else {
                // Update existing waypoint target
                this.targetObjects[existingIndex] = waypointTarget;
                console.log(`🎯 Updated waypoint target: ${waypoint.name}`);
            }
        }

        // Sort targets by distance (waypoints included)
        this.targetObjects.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        console.log(`🎯 Total targets after waypoint integration: ${this.targetObjects.length}`);
    };

    // ========== ENHANCED TARGET CYCLING ==========
    
    // Store original cycleTarget if it exists
    if (!tcm._originalCycleTarget && tcm.cycleTarget) {
        tcm._originalCycleTarget = tcm.cycleTarget.bind(tcm);
    }
    
    tcm.cycleTarget = function(forward = true) {
        console.log('🎯 Enhanced cycleTarget called with waypoint support');
        
        // Add waypoints to target list
        this.addWaypointsToTargets();
        
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
                console.log(`🎯 Cycled to target: ${this.currentTarget?.name || 'none'}`);
            }
        }
        
        // Handle waypoint-specific targeting
        if (this.currentTarget && this.currentTarget.isWaypoint) {
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
        }
    };

    // ========== WAYPOINT HUD STYLING ==========
    
    tcm.setWaypointHUDColors = function() {
        if (this.targetHUD) {
            this.targetHUD.style.borderColor = window.WAYPOINT_COLORS.primary;
            this.targetHUD.style.color = window.WAYPOINT_COLORS.primary;
            this.targetHUD.style.backgroundColor = window.WAYPOINT_COLORS.background + '88';
            this.targetHUD.style.boxShadow = `0 0 15px ${window.WAYPOINT_COLORS.glow}`;
            console.log('🎯 Applied waypoint HUD colors');
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
        }
    };

    // ========== ENHANCED setTargetById ==========
    
    // Store original setTargetById if it exists
    if (!tcm._originalSetTargetById && tcm.setTargetById) {
        tcm._originalSetTargetById = tcm.setTargetById.bind(tcm);
    }
    
    tcm.setTargetById = function(targetId) {
        console.log(`🎯 setTargetById called with: ${targetId}`);
        
        // Add waypoints to target list first
        this.addWaypointsToTargets();
        
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

    console.log('✅ TargetComputerManager enhanced with waypoint support');
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
        if (window.targetComputerManager && window.targetComputerManager.addWaypointsToTargets) {
            window.targetComputerManager.addWaypointsToTargets();
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
            return this._originalDeleteWaypoint(waypointId);
        }
        
        // Notify targeting system to refresh target list
        if (window.targetComputerManager && window.targetComputerManager.addWaypointsToTargets) {
            window.targetComputerManager.addWaypointsToTargets();
        }
        
        return true;
    };

    console.log('✅ WaypointManager enhanced with targeting integration');
    return true;
}

// ========== INITIALIZATION ==========

function initializeWaypointTargeting() {
    console.log('🎯 Initializing waypoint targeting integration...');
    
    let successCount = 0;
    
    // Integrate with targeting system
    if (integrateWaypointsWithTargeting()) {
        successCount++;
    }
    
    // Integrate with waypoint manager
    if (integrateWaypointManager()) {
        successCount++;
    }
    
    console.log(`🎯 Waypoint targeting integration complete: ${successCount}/2 systems integrated`);
    
    // Add global test functions
    window.testWaypointTargeting = function() {
        console.log('🎯 Testing waypoint targeting...');
        
        if (window.targetComputerManager) {
            window.targetComputerManager.addWaypointsToTargets();
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
    
    window.cycleToWaypoint = function() {
        console.log('🎮 Cycling to find waypoint...');
        
        if (window.targetComputerManager) {
            const tcm = window.targetComputerManager;
            
            // Enable target computer if method exists
            if (tcm.enableTargetComputer) {
                tcm.enableTargetComputer();
            }
            
            // Add waypoints to targets
            tcm.addWaypointsToTargets();
            
            // Cycle until we find a waypoint
            let attempts = 0;
            const maxAttempts = 15;
            
            const cycleInterval = setInterval(() => {
                tcm.cycleTarget(true);
                attempts++;
                
                if (tcm.currentTarget && tcm.currentTarget.isWaypoint) {
                    console.log(`🎯 Waypoint found and targeted: ${tcm.currentTarget.name}`);
                    clearInterval(cycleInterval);
                } else if (attempts >= maxAttempts) {
                    console.log('❌ No waypoint found after maximum attempts');
                    clearInterval(cycleInterval);
                } else {
                    console.log(`🔄 Cycling... attempt ${attempts} (current: ${tcm.currentTarget?.name || 'none'})`);
                }
            }, 500);
        }
    };
    
    return successCount >= 1;
}

// ========== AUTO-INITIALIZATION ==========

// Initialize immediately
const success = initializeWaypointTargeting();

if (success) {
    console.log('🎉 Waypoint targeting integration loaded successfully!');
    console.log('🎮 Available test functions:');
    console.log('  testWaypointTargeting() - Test waypoint targeting');
    console.log('  createTestWaypoint() - Create a test waypoint');
    console.log('  cycleToWaypoint() - Cycle through targets to find waypoints');
} else {
    console.log('❌ Waypoint targeting integration failed to load');
}

// Auto-create a test waypoint for immediate testing
setTimeout(() => {
    if (window.waypointManager && window.targetComputerManager) {
        console.log('🚀 Auto-creating test waypoint...');
        const testId = window.createTestWaypoint();
        
        setTimeout(() => {
            console.log('🎯 Auto-testing waypoint targeting...');
            window.testWaypointTargeting();
        }, 1000);
    }
}, 2000);
