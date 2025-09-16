/**
 * 🎯 WAYPOINT TARGETING INTEGRATION
 * 
 * Integrates waypoints with the existing targeting system to provide:
 * 1. Waypoint targeting via TAB cycling
 * 2. Targeting CPU HUD display for waypoints
 * 3. Target reticle visualization in 3D view
 * 4. Blinking waypoint icons in Star Charts
 * 5. Unique waypoint color scheme
 */

console.log('🎯 Loading Waypoint Targeting Integration...');

// ========== WAYPOINT COLOR SCHEME ==========

/**
 * Unique waypoint colors distinct from faction colors
 * Faction colors: red (hostile), green (friendly), yellow (neutral), blue (alliance)
 * Waypoint colors: purple/magenta theme for distinction
 */
const WAYPOINT_COLORS = {
    primary: '#ff00ff',      // Bright magenta - main waypoint color
    secondary: '#cc00cc',    // Darker magenta - secondary elements
    accent: '#ff66ff',       // Light magenta - highlights and effects
    glow: '#ff00ff88',       // Translucent magenta - glow effects
    text: '#ffffff',         // White text for readability
    background: '#330033'    // Dark purple background
};

console.log('✅ Waypoint color scheme defined:', WAYPOINT_COLORS);

// ========== WAYPOINT TARGET OBJECT CREATION ==========

/**
 * Convert waypoint to target object compatible with targeting system
 */
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
        // Three.js object for 3D positioning (create virtual object)
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

/**
 * Extend TargetComputerManager to support waypoints
 */
function integrateWaypointsWithTargeting() {
    if (!window.targetComputerManager) {
        console.warn('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;
    
    // Store original methods
    if (!tcm._originalCycleTarget) {
        tcm._originalCycleTarget = tcm.cycleTarget.bind(tcm);
    }
    if (!tcm._originalUpdateTargetObjects) {
        tcm._originalUpdateTargetObjects = tcm.updateTargetObjects?.bind(tcm);
    }

    // ========== ENHANCED TARGET OBJECT COLLECTION ==========
    
    /**
     * Enhanced updateTargetObjects to include waypoints
     */
    tcm.updateTargetObjects = function() {
        // Call original method first
        if (this._originalUpdateTargetObjects) {
            this._originalUpdateTargetObjects();
        }

        // Add active waypoints to target list
        if (window.waypointManager) {
            const activeWaypoints = window.waypointManager.getActiveWaypoints();
            
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
                } else {
                    // Update existing waypoint target
                    this.targetObjects[existingIndex] = waypointTarget;
                }
            }
        }

        // Sort targets by distance (waypoints included)
        this.targetObjects.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    };

    // ========== ENHANCED TARGET CYCLING ==========
    
    /**
     * Enhanced cycleTarget to handle waypoints
     */
    tcm.cycleTarget = function(forward = true) {
        console.log('🎯 Enhanced cycleTarget called with waypoint support');
        
        // Update target objects to include waypoints
        this.updateTargetObjects();
        
        // Call original cycling logic
        this._originalCycleTarget(forward);
        
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
    
    /**
     * Apply waypoint-specific colors to targeting HUD
     */
    tcm.setWaypointHUDColors = function() {
        if (this.targetHUD) {
            this.targetHUD.style.borderColor = WAYPOINT_COLORS.primary;
            this.targetHUD.style.color = WAYPOINT_COLORS.primary;
            this.targetHUD.style.backgroundColor = WAYPOINT_COLORS.background + '88';
            this.targetHUD.style.boxShadow = `0 0 15px ${WAYPOINT_COLORS.glow}`;
        }
        
        if (this.targetNameDisplay) {
            this.targetNameDisplay.style.color = WAYPOINT_COLORS.text;
        }
        
        if (this.targetDistanceDisplay) {
            this.targetDistanceDisplay.style.color = WAYPOINT_COLORS.accent;
        }
    };

    // ========== WAYPOINT TARGET RETICLE ==========
    
    /**
     * Create waypoint-specific target reticle
     */
    tcm.createWaypointReticle = function() {
        if (this.targetReticle) {
            // Update existing reticle for waypoint
            this.targetReticle.style.borderColor = WAYPOINT_COLORS.primary;
            this.targetReticle.style.backgroundColor = WAYPOINT_COLORS.glow;
            this.targetReticle.style.boxShadow = `0 0 20px ${WAYPOINT_COLORS.primary}`;
            
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
        }
    };

    // ========== ENHANCED TARGET DISPLAY UPDATE ==========
    
    // Store original updateTargetDisplay
    if (!tcm._originalUpdateTargetDisplay) {
        tcm._originalUpdateTargetDisplay = tcm.updateTargetDisplay?.bind(tcm);
    }
    
    tcm.updateTargetDisplay = function() {
        // Call original method
        if (this._originalUpdateTargetDisplay) {
            this._originalUpdateTargetDisplay();
        }
        
        // Handle waypoint-specific display updates
        if (this.currentTarget && this.currentTarget.isWaypoint) {
            this.setWaypointHUDColors();
            this.createWaypointReticle();
            
            // Update HUD with waypoint-specific information
            if (this.targetNameDisplay) {
                this.targetNameDisplay.innerHTML = `
                    <span style="color: ${WAYPOINT_COLORS.primary}">📍</span> 
                    ${this.currentTarget.name}
                `;
            }
            
            // Add waypoint type information
            if (this.targetInfoDisplay) {
                const waypointType = this.currentTarget.waypointData?.type || 'navigation';
                this.targetInfoDisplay.innerHTML = `
                    <div style="color: ${WAYPOINT_COLORS.accent}">
                        Type: ${waypointType.toUpperCase()}
                    </div>
                    <div style="color: ${WAYPOINT_COLORS.text}">
                        Mission Waypoint
                    </div>
                `;
            }
        }
    };

    console.log('✅ TargetComputerManager enhanced with waypoint support');
    return true;
}

// ========== STAR CHARTS INTEGRATION ==========

/**
 * Extend StarChartsUI to support waypoint blinking
 */
function integrateWaypointsWithStarCharts() {
    if (!window.starChartsUI) {
        console.warn('❌ StarChartsUI not available');
        return false;
    }

    const starCharts = window.starChartsUI;
    
    // Store original methods
    if (!starCharts._originalMatchesCurrentTarget) {
        starCharts._originalMatchesCurrentTarget = starCharts.matchesCurrentTarget?.bind(starCharts);
    }
    if (!starCharts._originalCreateObjectElement) {
        starCharts._originalCreateObjectElement = starCharts.createObjectElement?.bind(starCharts);
    }

    // ========== ENHANCED TARGET MATCHING ==========
    
    /**
     * Enhanced matchesCurrentTarget to include waypoints
     */
    starCharts.matchesCurrentTarget = function(object) {
        // Call original matching logic first
        if (this._originalMatchesCurrentTarget) {
            const originalMatch = this._originalMatchesCurrentTarget(object);
            if (originalMatch) return true;
        }
        
        // Check for waypoint matching
        const currentTarget = this.starChartsManager?.targetComputerManager?.currentTarget;
        if (currentTarget && currentTarget.isWaypoint && object) {
            return currentTarget.id === object.id || 
                   currentTarget.id === object.waypointId ||
                   currentTarget.name === object.name;
        }
        
        return false;
    };

    // ========== WAYPOINT ICON CREATION ==========
    
    /**
     * Create waypoint icon for Star Charts
     */
    starCharts.createWaypointIcon = function(waypoint, x, y) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        icon.setAttribute('class', 'waypoint-icon');
        icon.setAttribute('transform', `translate(${x}, ${y})`);
        
        // Waypoint diamond shape
        const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        diamond.setAttribute('points', '0,-8 8,0 0,8 -8,0');
        diamond.setAttribute('fill', WAYPOINT_COLORS.primary);
        diamond.setAttribute('stroke', WAYPOINT_COLORS.accent);
        diamond.setAttribute('stroke-width', '2');
        
        // Inner crosshair
        const crosshair = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('x1', '-4');
        hLine.setAttribute('y1', '0');
        hLine.setAttribute('x2', '4');
        hLine.setAttribute('y2', '0');
        hLine.setAttribute('stroke', WAYPOINT_COLORS.background);
        hLine.setAttribute('stroke-width', '1');
        
        const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('x1', '0');
        vLine.setAttribute('y1', '-4');
        vLine.setAttribute('x2', '0');
        vLine.setAttribute('y2', '4');
        vLine.setAttribute('stroke', WAYPOINT_COLORS.background);
        vLine.setAttribute('stroke-width', '1');
        
        crosshair.appendChild(hLine);
        crosshair.appendChild(vLine);
        
        icon.appendChild(diamond);
        icon.appendChild(crosshair);
        
        // Add waypoint data
        icon.waypointData = waypoint;
        icon.setAttribute('data-waypoint-id', waypoint.id);
        
        // Add hover effects
        icon.addEventListener('mouseenter', () => {
            diamond.setAttribute('fill', WAYPOINT_COLORS.accent);
        });
        
        icon.addEventListener('mouseleave', () => {
            diamond.setAttribute('fill', WAYPOINT_COLORS.primary);
        });
        
        // Add click handler for targeting
        icon.addEventListener('click', () => {
            if (window.targetComputerManager) {
                window.targetComputerManager.setTargetById(waypoint.id);
            }
        });
        
        return icon;
    };

    // ========== WAYPOINT RENDERING ==========
    
    /**
     * Render waypoints in Star Charts
     */
    starCharts.renderWaypoints = function() {
        if (!window.waypointManager) return;
        
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        
        for (const waypoint of activeWaypoints) {
            // Convert waypoint position to Star Charts coordinates
            const waypointPos = {
                x: waypoint.position[0],
                y: waypoint.position[1],
                z: waypoint.position[2]
            };
            
            // Project to 2D coordinates (simplified - use existing projection logic)
            const screenPos = this.projectToScreen ? 
                this.projectToScreen(waypointPos) : 
                { x: waypointPos.x * 10 + 400, y: waypointPos.z * 10 + 300 };
            
            // Create waypoint icon
            const waypointIcon = this.createWaypointIcon(waypoint, screenPos.x, screenPos.y);
            
            // Add blinking if this waypoint is targeted
            const isCurrentTarget = this.matchesCurrentTarget(waypoint);
            if (isCurrentTarget) {
                waypointIcon.classList.add('target-blink');
                console.log(`🎯 WAYPOINT BLINKING: Added blink to ${waypoint.name}`);
            }
            
            // Add to SVG
            if (this.svg) {
                this.svg.appendChild(waypointIcon);
            }
        }
    };

    // ========== ENHANCED RENDERING ==========
    
    // Store original render method
    if (!starCharts._originalRender) {
        starCharts._originalRender = starCharts.render?.bind(starCharts);
    }
    
    starCharts.render = function() {
        // Call original render
        if (this._originalRender) {
            this._originalRender();
        }
        
        // Render waypoints
        this.renderWaypoints();
    };

    console.log('✅ StarChartsUI enhanced with waypoint support');
    return true;
}

// ========== WAYPOINT MANAGER INTEGRATION ==========

/**
 * Enhance WaypointManager to notify targeting system
 */
function integrateWaypointManager() {
    if (!window.waypointManager) {
        console.warn('❌ WaypointManager not available');
        return false;
    }

    const wm = window.waypointManager;
    
    // Store original methods
    if (!wm._originalActivateWaypoint) {
        wm._originalActivateWaypoint = wm.activateWaypoint?.bind(wm);
    }
    if (!wm._originalDeleteWaypoint) {
        wm._originalDeleteWaypoint = wm.deleteWaypoint?.bind(wm);
    }

    // ========== ENHANCED WAYPOINT ACTIVATION ==========
    
    wm.activateWaypoint = function(waypointId) {
        // Call original method
        if (this._originalActivateWaypoint) {
            this._originalActivateWaypoint(waypointId);
        }
        
        // Notify targeting system to refresh target list
        if (window.targetComputerManager) {
            window.targetComputerManager.updateTargetObjects?.();
        }
        
        console.log(`🎯 Waypoint activated and added to targeting system: ${waypointId}`);
    };

    // ========== ENHANCED WAYPOINT DELETION ==========
    
    wm.deleteWaypoint = function(waypointId) {
        // Check if this waypoint is currently targeted
        if (window.targetComputerManager?.currentTarget?.id === waypointId) {
            // Clear current target and cycle to next
            window.targetComputerManager.currentTarget = null;
            window.targetComputerManager.cycleTarget();
        }
        
        // Call original method
        if (this._originalDeleteWaypoint) {
            return this._originalDeleteWaypoint(waypointId);
        }
        
        // Notify targeting system to refresh target list
        if (window.targetComputerManager) {
            window.targetComputerManager.updateTargetObjects?.();
        }
        
        return true;
    };

    console.log('✅ WaypointManager enhanced with targeting integration');
    return true;
}

// ========== INITIALIZATION ==========

/**
 * Initialize waypoint targeting integration
 */
function initializeWaypointTargeting() {
    console.log('🎯 Initializing waypoint targeting integration...');
    
    let successCount = 0;
    
    // Integrate with targeting system
    if (integrateWaypointsWithTargeting()) {
        successCount++;
    }
    
    // Integrate with Star Charts
    if (integrateWaypointsWithStarCharts()) {
        successCount++;
    }
    
    // Integrate with waypoint manager
    if (integrateWaypointManager()) {
        successCount++;
    }
    
    console.log(`🎯 Waypoint targeting integration complete: ${successCount}/3 systems integrated`);
    
    // Add global test functions
    window.testWaypointTargeting = function() {
        console.log('🎯 Testing waypoint targeting...');
        
        if (window.targetComputerManager) {
            window.targetComputerManager.updateTargetObjects();
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
    
    return successCount === 3;
}

// ========== AUTO-INITIALIZATION ==========

// Initialize when all systems are ready
function checkAndInitialize() {
    const requiredSystems = [
        'targetComputerManager',
        'starChartsUI', 
        'waypointManager'
    ];
    
    const availableSystems = requiredSystems.filter(system => window[system]);
    
    if (availableSystems.length === requiredSystems.length) {
        initializeWaypointTargeting();
    } else {
        const missingSystems = requiredSystems.filter(system => !window[system]);
        console.log(`🎯 Waiting for systems: ${missingSystems.join(', ')}`);
        
        // Retry in 1 second
        setTimeout(checkAndInitialize, 1000);
    }
}

// Start initialization check
checkAndInitialize();

console.log('🎯 Waypoint Targeting Integration script loaded');
console.log('🎮 Available test functions:');
console.log('  testWaypointTargeting() - Test waypoint targeting');
console.log('  createTestWaypoint() - Create a test waypoint');
