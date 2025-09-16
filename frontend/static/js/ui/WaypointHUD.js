import { debug } from '../debug.js';

/**
 * WaypointHUD - Heads-up display for waypoint navigation
 * 
 * Provides visual feedback for:
 * - Current waypoint target information
 * - Distance and direction indicators
 * - Waypoint status and progress
 * - Interruption/resumption indicators
 * - Keyboard shortcut hints
 */

export class WaypointHUD {
    constructor(hudContainer) {
        this.hudContainer = hudContainer;
        this.waypointDisplay = null;
        this.distanceIndicator = null;
        this.directionIndicator = null;
        this.statusIndicator = null;
        this.interruptionIndicator = null;
        this.shortcutHints = null;
        
        // State tracking
        this.currentWaypoint = null;
        this.isVisible = false;
        this.updateInterval = null;
        this.lastUpdateTime = 0;
        
        // Update frequency (10Hz = every 100ms for smooth updates)
        this.updateFrequency = 100;
        
        this.createHUDElements();
        this.setupUpdateLoop();
        
        debug('WAYPOINTS', '🎯 WaypointHUD initialized');
    }
    
    /**
     * Create HUD visual elements
     */
    createHUDElements() {
        // Main waypoint display container
        this.waypointDisplay = document.createElement('div');
        this.waypointDisplay.className = 'waypoint-hud-display';
        this.waypointDisplay.style.cssText = `
            position: fixed;
            top: 120px;
            left: 20px;
            width: 280px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00ffff;
            border-radius: 4px;
            font-family: 'VT323', monospace;
            color: #00ffff;
            padding: 12px;
            box-shadow: 
                0 0 15px rgba(0, 255, 255, 0.3),
                inset 0 0 15px rgba(0, 255, 255, 0.1);
            z-index: 1002;
            display: none;
            user-select: none;
            backdrop-filter: blur(2px);
        `;
        
        this.createHeader();
        this.createWaypointInfo();
        this.createNavigationInfo();
        this.createStatusInfo();
        this.createShortcutHints();
        
        this.hudContainer.appendChild(this.waypointDisplay);
    }
    
    /**
     * Create header with waypoint icon and title
     */
    createHeader() {
        this.headerArea = document.createElement('div');
        this.headerArea.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(0, 255, 255, 0.3);
        `;
        
        // Waypoint icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 16px;
            height: 16px;
            margin-right: 8px;
            background: #00ffff;
            border-radius: 50%;
            position: relative;
        `;
        
        // Add crosshair to icon
        const crosshair = document.createElement('div');
        crosshair.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            border: 1px solid #000;
            border-radius: 50%;
        `;
        icon.appendChild(crosshair);
        
        // Title
        const title = document.createElement('div');
        title.textContent = 'WAYPOINT NAV';
        title.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            flex: 1;
        `;
        
        this.headerArea.appendChild(icon);
        this.headerArea.appendChild(title);
        this.waypointDisplay.appendChild(this.headerArea);
    }
    
    /**
     * Create waypoint information section
     */
    createWaypointInfo() {
        this.waypointInfo = document.createElement('div');
        this.waypointInfo.style.cssText = `
            margin-bottom: 8px;
        `;
        
        // Waypoint name
        this.waypointName = document.createElement('div');
        this.waypointName.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 4px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
        `;
        
        // Waypoint type and description
        this.waypointDetails = document.createElement('div');
        this.waypointDetails.style.cssText = `
            font-size: 11px;
            color: #aaffff;
            line-height: 1.3;
        `;
        
        this.waypointInfo.appendChild(this.waypointName);
        this.waypointInfo.appendChild(this.waypointDetails);
        this.waypointDisplay.appendChild(this.waypointInfo);
    }
    
    /**
     * Create navigation information section
     */
    createNavigationInfo() {
        this.navigationInfo = document.createElement('div');
        this.navigationInfo.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 6px;
            background: rgba(0, 255, 255, 0.1);
            border-radius: 3px;
        `;
        
        // Distance indicator
        this.distanceIndicator = document.createElement('div');
        this.distanceIndicator.style.cssText = `
            font-size: 12px;
            color: #00ffff;
        `;
        
        // Direction indicator (compass-style)
        this.directionIndicator = document.createElement('div');
        this.directionIndicator.style.cssText = `
            font-size: 12px;
            color: #ffff00;
            font-weight: bold;
        `;
        
        this.navigationInfo.appendChild(this.distanceIndicator);
        this.navigationInfo.appendChild(this.directionIndicator);
        this.waypointDisplay.appendChild(this.navigationInfo);
    }
    
    /**
     * Create status information section
     */
    createStatusInfo() {
        this.statusInfo = document.createElement('div');
        this.statusInfo.style.cssText = `
            margin-bottom: 8px;
        `;
        
        // Status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.style.cssText = `
            font-size: 11px;
            padding: 3px 6px;
            border-radius: 2px;
            text-align: center;
            font-weight: bold;
        `;
        
        // Interruption indicator
        this.interruptionIndicator = document.createElement('div');
        this.interruptionIndicator.style.cssText = `
            font-size: 11px;
            color: #ffaa00;
            margin-top: 4px;
            display: none;
            text-align: center;
        `;
        
        this.statusInfo.appendChild(this.statusIndicator);
        this.statusInfo.appendChild(this.interruptionIndicator);
        this.waypointDisplay.appendChild(this.statusInfo);
    }
    
    /**
     * Create keyboard shortcut hints
     */
    createShortcutHints() {
        this.shortcutHints = document.createElement('div');
        this.shortcutHints.style.cssText = `
            font-size: 10px;
            color: #888888;
            border-top: 1px solid rgba(0, 255, 255, 0.2);
            padding-top: 6px;
            text-align: center;
        `;
        this.shortcutHints.innerHTML = `
            <div>W: Resume • Shift+W: Next • C: Star Charts</div>
        `;
        
        this.waypointDisplay.appendChild(this.shortcutHints);
    }
    
    /**
     * Set up the update loop for real-time information
     */
    setupUpdateLoop() {
        this.updateInterval = setInterval(() => {
            if (this.isVisible && this.currentWaypoint) {
                this.updateDisplay();
            }
        }, this.updateFrequency);
    }
    
    /**
     * Show waypoint HUD with specified waypoint
     * @param {Object} waypoint - Waypoint object to display
     */
    show(waypoint) {
        if (!waypoint) return;
        
        this.currentWaypoint = waypoint;
        this.isVisible = true;
        this.waypointDisplay.style.display = 'block';
        
        // Update display immediately
        this.updateDisplay();
        
        debug('WAYPOINTS', `🎯 WaypointHUD: Showing waypoint ${waypoint.name}`);
    }
    
    /**
     * Hide waypoint HUD
     */
    hide() {
        this.isVisible = false;
        this.currentWaypoint = null;
        this.waypointDisplay.style.display = 'none';
        
        debug('WAYPOINTS', '🎯 WaypointHUD: Hidden');
    }
    
    /**
     * Update the display with current waypoint information
     */
    updateDisplay() {
        if (!this.currentWaypoint) return;
        
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateFrequency) return;
        this.lastUpdateTime = now;
        
        // Update waypoint information
        this.updateWaypointInfo();
        
        // Update navigation information
        this.updateNavigationInfo();
        
        // Update status information
        this.updateStatusInfo();
        
        // Check for interruptions
        this.updateInterruptionStatus();
    }
    
    /**
     * Update waypoint name and details
     */
    updateWaypointInfo() {
        this.waypointName.textContent = this.currentWaypoint.name || 'Unknown Waypoint';
        
        const type = this.currentWaypoint.type || 'navigation';
        const description = this.currentWaypoint.description || '';
        
        this.waypointDetails.innerHTML = `
            <div>Type: ${type.toUpperCase()}</div>
            ${description ? `<div>${description}</div>` : ''}
        `;
    }
    
    /**
     * Update distance and direction information
     */
    updateNavigationInfo() {
        if (!this.currentWaypoint.position || !window.viewManager?.camera) {
            this.distanceIndicator.textContent = 'Distance: --';
            this.directionIndicator.textContent = '--';
            return;
        }
        
        const camera = window.viewManager.camera;
        const waypointPos = this.currentWaypoint.position;
        
        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(camera.position.x - waypointPos[0], 2) +
            Math.pow(camera.position.y - waypointPos[1], 2) +
            Math.pow(camera.position.z - waypointPos[2], 2)
        );
        
        // Format distance
        let distanceText;
        if (distance < 1) {
            distanceText = `${(distance * 1000).toFixed(0)}m`;
        } else if (distance < 100) {
            distanceText = `${distance.toFixed(1)}km`;
        } else {
            distanceText = `${distance.toFixed(0)}km`;
        }
        
        this.distanceIndicator.textContent = `Distance: ${distanceText}`;
        
        // Calculate direction (simplified compass)
        const dx = waypointPos[0] - camera.position.x;
        const dz = waypointPos[2] - camera.position.z;
        const angle = Math.atan2(dx, dz) * 180 / Math.PI;
        
        // Convert to compass direction
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const directionIndex = Math.round(((angle + 360) % 360) / 45) % 8;
        
        this.directionIndicator.textContent = directions[directionIndex];
    }
    
    /**
     * Update waypoint status
     */
    updateStatusInfo() {
        const status = this.currentWaypoint.status || 'active';
        
        // Set status color and text
        let statusColor, statusText;
        switch (status.toLowerCase()) {
            case 'active':
                statusColor = '#00ff00';
                statusText = 'ACTIVE';
                break;
            case 'targeted':
                statusColor = '#ffff00';
                statusText = 'TARGETED';
                break;
            case 'triggered':
                statusColor = '#ff8800';
                statusText = 'TRIGGERED';
                break;
            case 'completed':
                statusColor = '#0088ff';
                statusText = 'COMPLETED';
                break;
            case 'interrupted':
                statusColor = '#ff4400';
                statusText = 'INTERRUPTED';
                break;
            default:
                statusColor = '#888888';
                statusText = status.toUpperCase();
        }
        
        this.statusIndicator.style.backgroundColor = statusColor + '22';
        this.statusIndicator.style.border = `1px solid ${statusColor}`;
        this.statusIndicator.style.color = statusColor;
        this.statusIndicator.textContent = statusText;
    }
    
    /**
     * Update interruption status indicator
     */
    updateInterruptionStatus() {
        if (!window.targetComputerManager) return;
        
        const hasInterrupted = window.targetComputerManager.hasInterruptedWaypoint();
        
        if (hasInterrupted) {
            const interruptedWaypoint = window.targetComputerManager.getInterruptedWaypoint();
            if (interruptedWaypoint) {
                this.interruptionIndicator.style.display = 'block';
                this.interruptionIndicator.innerHTML = `
                    ⏸ Waypoint Interrupted<br>
                    <span style="color: #ffffff;">Press W to resume</span>
                `;
            }
        } else {
            this.interruptionIndicator.style.display = 'none';
        }
    }
    
    /**
     * Update waypoint information (called externally when waypoint changes)
     * @param {Object} waypoint - Updated waypoint object
     */
    updateWaypoint(waypoint) {
        if (this.isVisible && waypoint && waypoint.id === this.currentWaypoint?.id) {
            this.currentWaypoint = waypoint;
            this.updateDisplay();
        }
    }
    
    /**
     * Check if HUD is currently visible
     * @returns {boolean} - True if visible
     */
    get visible() {
        return this.isVisible;
    }
    
    /**
     * Get current waypoint being displayed
     * @returns {Object|null} - Current waypoint or null
     */
    getCurrentWaypoint() {
        return this.currentWaypoint;
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.waypointDisplay && this.waypointDisplay.parentNode) {
            this.waypointDisplay.parentNode.removeChild(this.waypointDisplay);
        }
        
        debug('WAYPOINTS', '🎯 WaypointHUD: Destroyed');
    }
}

export default WaypointHUD;
