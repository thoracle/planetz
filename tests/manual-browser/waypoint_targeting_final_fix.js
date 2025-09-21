/**
 * 🎯 WAYPOINT TARGETING - FINAL FIX
 * 
 * Fixes the target name display issue for waypoints
 * This addresses the missing 📍 icon in the HUD
 */

console.log('🎯 Applying Final Waypoint Targeting Fix...');

function applyFinalWaypointFix() {
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;

    // ========== ENHANCED HUD STYLING WITH BETTER TARGET NAME HANDLING ==========
    
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
        
        // Enhanced target name display handling
        if (this.targetNameDisplay) {
            this.targetNameDisplay.style.color = window.WAYPOINT_COLORS.text;
            
            // Set the waypoint name with icon
            const waypointName = this.currentTarget?.name || 'Unknown Waypoint';
            this.targetNameDisplay.innerHTML = `
                <span style="color: ${window.WAYPOINT_COLORS.primary}; font-size: 1.2em;">📍</span> 
                <span style="color: ${window.WAYPOINT_COLORS.text}; font-weight: bold;">${waypointName}</span>
            `;
            
            console.log(`🎯 Updated target name display: 📍 ${waypointName}`);
        }
        
        // Also try to find target name by common selectors
        const possibleNameElements = [
            this.targetHUD?.querySelector('.target-name'),
            this.targetHUD?.querySelector('#target-name'),
            this.targetHUD?.querySelector('[class*="name"]'),
            document.querySelector('#target-name'),
            document.querySelector('.target-name')
        ];
        
        for (const element of possibleNameElements) {
            if (element && element !== this.targetNameDisplay) {
                element.style.color = window.WAYPOINT_COLORS.text;
                const waypointName = this.currentTarget?.name || 'Unknown Waypoint';
                element.innerHTML = `
                    <span style="color: ${window.WAYPOINT_COLORS.primary}; font-size: 1.2em;">📍</span> 
                    <span style="color: ${window.WAYPOINT_COLORS.text}; font-weight: bold;">${waypointName}</span>
                `;
                console.log(`🎯 Updated additional target name element: 📍 ${waypointName}`);
            }
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
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.setWaypointHUDColors();
                this.createWaypointReticle();
                this.animateWaypointWireframe();
            }, 50);
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
            
            // Update display with delay for waypoints
            if (this.currentTarget.isWaypoint) {
                setTimeout(() => {
                    this.setWaypointHUDColors();
                    this.createWaypointReticle();
                    this.createWaypointWireframe();
                }, 100);
            } else if (this.updateTargetDisplay) {
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

    console.log('✅ Final waypoint targeting fix applied');
    return true;
}

// ========== TEST FUNCTION FOR TARGET NAME ==========

window.testTargetNameFix = function() {
    console.log('🎯 Testing target name fix...');
    
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
                window.testTargetNameFix();
            }, 2000);
        }
        return;
    }
    
    // Target the first waypoint
    tcm.setTargetById(waypointTargets[0].id);
    
    setTimeout(() => {
        console.log('🎯 Target Name Test Results:');
        
        // Check targetNameDisplay
        if (tcm.targetNameDisplay) {
            console.log(`  targetNameDisplay HTML: ${tcm.targetNameDisplay.innerHTML}`);
            console.log(`  Has 📍 Icon: ${tcm.targetNameDisplay.innerHTML.includes('📍') ? '✅' : '❌'}`);
        } else {
            console.log('  ❌ targetNameDisplay not found');
        }
        
        // Check all possible name elements
        const nameElements = [
            { name: 'targetNameDisplay', element: tcm.targetNameDisplay },
            { name: '.target-name', element: tcm.targetHUD?.querySelector('.target-name') },
            { name: '#target-name', element: document.querySelector('#target-name') },
            { name: '.target-name (global)', element: document.querySelector('.target-name') }
        ];
        
        nameElements.forEach(({ name, element }) => {
            if (element) {
                console.log(`  ${name}: "${element.innerHTML}"`);
                console.log(`    Has 📍: ${element.innerHTML.includes('📍') ? '✅' : '❌'}`);
            } else {
                console.log(`  ${name}: Not found`);
            }
        });
        
        // Check current target info
        console.log(`  Current Target: ${tcm.currentTarget?.name || 'none'}`);
        console.log(`  Is Waypoint: ${tcm.currentTarget?.isWaypoint ? '✅' : '❌'}`);
        
    }, 1000);
};

// ========== AUTO-APPLY FIX ==========

// Apply the fix immediately
const success = applyFinalWaypointFix();

if (success) {
    console.log('🎉 Final waypoint targeting fix applied successfully!');
    console.log('🎮 Test function available: testTargetNameFix()');
    
    // Auto-test if we have waypoints
    setTimeout(() => {
        if (window.testTargetNameFix) {
            window.testTargetNameFix();
        }
    }, 1000);
} else {
    console.log('❌ Failed to apply final waypoint targeting fix');
}
