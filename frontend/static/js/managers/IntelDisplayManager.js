/**
 * IntelDisplayManager
 *
 * Extracted from StarfieldManager.js to reduce god class size.
 * Manages the Intel HUD display for showing detailed information about targeted celestial bodies.
 *
 * Features:
 * - Intel HUD creation and display
 * - Dynamic faction color theming
 * - Intel availability checking based on scanner range
 * - Intel icon display management
 */

import { debug } from '../debug.js';

export class IntelDisplayManager {
    /**
     * Create an IntelDisplayManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager for cross-calls
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Intel state
        this.intelVisible = false;
        this.intelAvailable = false;
        this.intelRange = 50; // Default 50km range for intel detection
        this.previousTarget = null; // Track previous target for intel dismissal

        // DOM elements
        this.intelHUD = null;
        this.intelIcon = null;

        // Create intel HUD
        this.createIntelHUD();
    }

    /**
     * Create the Intel HUD DOM element
     */
    createIntelHUD() {
        // Create intel HUD container - match targeting CPU screen exactly and cover all panels
        this.intelHUD = document.createElement('div');
        this.intelHUD.className = 'intel-hud';
        this.intelHUD.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 10px;
            width: 200px;
            height: 280px;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.95);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1500;
            overflow-y: auto;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        `;

        // Add CSS for dock button and intel scrollbar
        const style = document.createElement('style');
        style.textContent = `
            .dock-button {
                background: #00aa41;
                color: #000 !important;
                border: none;
                padding: 8px 20px;
                cursor: pointer;
                font-family: "Courier New", monospace;
                font-weight: bold;
                border-radius: 4px;
                transition: all 0.2s ease-in-out;
                pointer-events: auto;
                z-index: 1001;
                width: 100%;
            }
            .dock-button:hover {
                filter: brightness(1.2);
                transform: scale(1.05);
            }
            .dock-button.launch {
                background: #aa4100;
            }
            .dock-button.launch:hover {
                background: #cc4f00;
            }

            /* Custom scrollbar for intel HUD - positioned on left side */
            .intel-hud {
                direction: rtl; /* Right-to-left to move scrollbar to left */
            }
            .intel-hud > * {
                direction: ltr; /* Reset content direction to normal */
            }
            .intel-hud::-webkit-scrollbar {
                width: 8px;
            }
            .intel-hud::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            .intel-hud::-webkit-scrollbar-thumb {
                background: #00ff41;
                border-radius: 4px;
                border: 1px solid rgba(0, 255, 65, 0.3);
            }
            .intel-hud::-webkit-scrollbar-thumb:hover {
                background: #00aa41;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(this.intelHUD);
    }

    /**
     * Toggle intel display visibility
     */
    toggleIntel() {
        this.intelVisible = !this.intelVisible;

        // Hide/show target panels when intel is toggled
        if (this.sfm.targetComputerManager && this.sfm.targetComputerManager.targetHUD) {
            if (this.intelVisible) {
                // Hide target panels when intel is visible
                this.sfm.targetComputerManager.targetHUD.style.visibility = 'hidden';
            } else {
                // Show target panels when intel is hidden
                this.sfm.targetComputerManager.targetHUD.style.visibility = 'visible';
            }
        }

        // Update intel display and icon visibility
        this.updateIntelDisplay();
        this.updateIntelIconDisplay();
    }

    /**
     * Hide intel display (called when target changes or is cleared)
     */
    hideIntel() {
        if (this.intelVisible) {
            this.intelVisible = false;
            this.intelHUD.style.display = 'none';
        }
        this.updateIntelIconDisplay();
    }

    /**
     * Update intel display content
     */
    updateIntelDisplay() {
        if (!this.intelVisible || !this.sfm.currentTarget || !this.intelAvailable) {
            this.intelHUD.style.display = 'none';
            // Show target panels when intel is hidden
            if (this.sfm.targetComputerManager && this.sfm.targetComputerManager.targetHUD) {
                this.sfm.targetComputerManager.targetHUD.style.visibility = 'visible';
            }
            return;
        }

        const currentTargetData = this.sfm.getCurrentTargetData();
        if (!currentTargetData) {
            this.intelHUD.style.display = 'none';
            return;
        }

        const info = this.sfm.solarSystemManager.getCelestialBodyInfo(this.sfm.currentTarget);
        if (!info) {
            this.intelHUD.style.display = 'none';
            return;
        }

        // Determine faction color using same logic as target HUD
        let isEnemyShip = false;
        let diplomacyColor = '#44ffff'; // Default teal for unknown

        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            diplomacyColor = '#ff8888'; // Enemy ships are brighter red for better visibility
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else {
            // Convert faction to diplomacy if needed
            let diplomacy = info?.diplomacy?.toLowerCase();
            if (!diplomacy && info?.faction) {
                diplomacy = this.sfm.getFactionDiplomacy(info.faction).toLowerCase();
            }

            if (diplomacy === 'enemy') {
                diplomacyColor = '#ff8888'; // Enemy red (brighter for intel)
            } else if (diplomacy === 'neutral') {
                diplomacyColor = '#ffff00'; // Neutral yellow
            } else if (diplomacy === 'friendly') {
                diplomacyColor = '#00ff41'; // Friendly green
            }
        }

        // Update intel HUD border color to match faction
        this.intelHUD.style.borderColor = diplomacyColor;

        // Update scrollbar colors to match faction
        this._updateScrollbarColors(diplomacyColor);

        // Format the intel information
        let intelHTML = `
            <div style="text-align: center; border-bottom: 1px solid ${diplomacyColor}; padding-bottom: 5px; margin-bottom: 10px; color: ${diplomacyColor};">
                INTEL: ${currentTargetData.name}
            </div>
        `;

        // Add description section if available
        if (info.description && info.description.trim() !== '') {
            const rgbaColor = this._hexToRgba(diplomacyColor, 0.3);

            intelHTML += `
                <div style="margin-bottom: 12px; padding: 8px; border: 1px solid ${rgbaColor}; border-radius: 4px;">
                    <div style="color: ${diplomacyColor}; font-weight: bold; margin-bottom: 6px;">DESCRIPTION:</div>
                    <div style="color: ${diplomacyColor}; font-style: italic; line-height: 1.4; font-size: 13px;">
                        ${info.description}
                    </div>
                </div>
            `;
        }

        // Add intel brief section if available
        if (info.intel_brief && info.intel_brief.trim() !== '') {
            const rgbaColor = this._hexToRgba(diplomacyColor, 0.3);

            intelHTML += `
                <div style="margin-bottom: 12px; padding: 8px; border: 1px solid ${rgbaColor}; border-radius: 4px;">
                    <div style="color: ${diplomacyColor}; font-weight: bold; margin-bottom: 6px;">INTEL BRIEF:</div>
                    <div style="color: ${diplomacyColor}; font-style: italic; line-height: 1.4; font-size: 13px; max-height: 150px; overflow-y: auto; padding-right: 5px;">
                        ${info.intel_brief}
                    </div>
                </div>
            `;
        }

        // Check if it's a planet or moon by checking if diplomacy info exists
        if (info.diplomacy !== undefined) {
            // For planets and moons, only show population
            if (info.population) {
                intelHTML += `
                    <div style="margin-top: 12px; font-size: 0.9em; opacity: 0.8;">
                        Population: ${info.population}
                    </div>
                `;
            }
        } else {
            // For other celestial bodies (stars, asteroids, etc.)
            intelHTML += `
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Type: ${info.type || 'Unknown'}</div>
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Mass: ${info.mass || 'Unknown'}</div>
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Atmosphere: ${info.atmosphere || 'Unknown'}</div>
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Resources: ${info.resources || 'Unknown'}</div>
            `;
        }

        this.intelHUD.innerHTML = intelHTML;
        this.intelHUD.style.display = 'block';
    }

    /**
     * Update intel availability based on distance and scanner status
     * @param {number} distance - Distance to current target
     */
    updateIntelAvailability(distance) {
        // Reset intel availability
        this.intelAvailable = false;

        // Check if we have a current target
        if (!this.sfm.currentTarget) {
            return;
        }

        // Check if target computer is enabled
        if (!this.sfm.targetComputerEnabled) {
            return;
        }

        // Get target info to check if it's a celestial body (not enemy ship)
        const currentTargetData = this.sfm.getCurrentTargetData();
        const isEnemyShip = currentTargetData?.isShip && currentTargetData?.ship;

        // Intel is only available for celestial bodies, not enemy ships
        if (isEnemyShip) {
            return;
        }

        // Get celestial body info to check if it has intel data
        const info = this.sfm.solarSystemManager.getCelestialBodyInfo(this.sfm.currentTarget);
        if (!info) {
            return;
        }

        // Check if ship has required systems for intel
        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            return;
        }

        // Intel requires a level 3+ target computer with intel capabilities
        const targetComputer = ship.getSystem('target_computer');
        if (!targetComputer || !targetComputer.hasIntelCapabilities()) {
            return;
        }

        // Check if long range scanner is operational and get its scan range
        const longRangeScanner = ship.getSystem('long_range_scanner');
        let effectiveScanRange = this.intelRange; // Default 50km

        if (longRangeScanner && longRangeScanner.isOperational()) {
            // Use scanner's current range, but scale it down for intel detection
            // Scanner range is much larger (1000km base), so use a fraction for intel
            const scannerRange = longRangeScanner.getCurrentScanRange();
            effectiveScanRange = Math.max(this.intelRange, scannerRange * 0.02); // 2% of scanner range, minimum 50km
        }

        // Intel is available if we're within scan range
        this.intelAvailable = distance <= effectiveScanRange;
    }

    /**
     * Update intel icon display based on availability and current state
     */
    updateIntelIconDisplay() {
        if (!this.intelIcon) {
            return;
        }

        // Show intel icon if intel is available and intel HUD is not currently visible
        const shouldShowIcon = this.intelAvailable && !this.intelVisible &&
                               this.sfm.targetComputerEnabled && this.sfm.currentTarget;

        this.intelIcon.style.display = shouldShowIcon ? 'flex' : 'none';

        // Update icon color based on current target diplomacy if visible
        if (shouldShowIcon && this.sfm.currentTarget) {
            const diplomacyColor = this._getTargetDiplomacyColor();
            this.intelIcon.style.borderColor = diplomacyColor;
            this.intelIcon.style.color = diplomacyColor;
            this.intelIcon.style.textShadow = `0 0 4px ${diplomacyColor}`;
        }
    }

    /**
     * Get diplomacy color for current target
     * @returns {string} Hex color string
     */
    _getTargetDiplomacyColor() {
        const currentTargetData = this.sfm.getCurrentTargetData();
        let info = null;
        let isEnemyShip = false;

        // Check if this is an enemy ship
        if (currentTargetData && currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            info = {
                type: 'enemy_ship',
                diplomacy: currentTargetData.ship.diplomacy || 'enemy',
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
        } else {
            // Get celestial body info
            info = this.sfm.solarSystemManager.getCelestialBodyInfo(this.sfm.currentTarget);
        }

        // Determine diplomacy color using same logic as target HUD
        let diplomacyColor = '#44ffff'; // Default teal for unknown
        if (isEnemyShip) {
            diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else {
            // Convert faction to diplomacy if needed
            let diplomacy = info?.diplomacy?.toLowerCase();
            if (!diplomacy && info?.faction) {
                diplomacy = this.sfm.getFactionDiplomacy(info.faction).toLowerCase();
            }

            if (diplomacy === 'enemy') {
                diplomacyColor = '#ff3333'; // Enemy red
            } else if (diplomacy === 'neutral') {
                diplomacyColor = '#ffff00'; // Neutral yellow
            } else if (diplomacy === 'friendly') {
                diplomacyColor = '#00ff41'; // Friendly green
            }
        }

        return diplomacyColor;
    }

    /**
     * Update scrollbar colors to match faction color
     * @param {string} diplomacyColor - Hex color string
     */
    _updateScrollbarColors(diplomacyColor) {
        const rgb = this._hexToRgb(diplomacyColor);
        if (!rgb) return;

        // Set CSS custom properties for scrollbar colors
        this.intelHUD.style.setProperty('--scrollbar-thumb-color', diplomacyColor);
        this.intelHUD.style.setProperty('--scrollbar-track-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);

        // Create dynamic style element for scrollbar colors
        const styleId = 'intel-scrollbar-style';
        let existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .intel-hud::-webkit-scrollbar-thumb,
            .intel-hud *::-webkit-scrollbar-thumb,
            .intel-hud div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
                background-color: ${diplomacyColor} !important;
            }
            .intel-hud::-webkit-scrollbar-track,
            .intel-hud *::-webkit-scrollbar-track,
            .intel-hud div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
                background: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) !important;
            }
            .intel-hud,
            .intel-hud *,
            .intel-hud div[style*="overflow-y: auto"] {
                scrollbar-color: ${diplomacyColor} rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) !important;
            }
            .intel-hud div[style*="overflow-y: auto"]::-webkit-scrollbar {
                width: 8px !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Convert hex color to RGB object
     * @param {string} hex - Hex color string
     * @returns {Object|null} RGB object with r, g, b properties
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convert hex color to rgba string
     * @param {string} hex - Hex color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    _hexToRgba(hex, alpha) {
        const borderColor = hex.replace('#', '').match(/.{2}/g);
        return `rgba(${parseInt(borderColor[0], 16)}, ${parseInt(borderColor[1], 16)}, ${parseInt(borderColor[2], 16)}, ${alpha})`;
    }

    /**
     * Clean up intel HUD resources
     */
    destroy() {
        if (this.intelHUD && this.intelHUD.parentNode) {
            this.intelHUD.parentNode.removeChild(this.intelHUD);
            this.intelHUD = null;
        }

        // Remove dynamic scrollbar style if it exists
        const styleId = 'intel-scrollbar-style';
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
    }
}
