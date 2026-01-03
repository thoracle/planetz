/**
 * StatusBarManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles the top status bar HUD display (Energy, View, Speed).
 *
 * Features:
 * - Creates fixed position status boxes for energy, view, and speed
 * - Updates speed display based on impulse engine state
 * - Shows DOCKED status when ship is docked
 * - Displays current energy level from ship
 * - Shows current view mode (FORE, AFT, GALACTIC, etc.)
 */

import { debug } from '../debug.js';

export class StatusBarManager {
    /**
     * Create a StatusBarManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.energyBox = null;
        this.viewBox = null;
        this.speedBox = null;
    }

    /**
     * Create the speed indicator HUD elements
     */
    createSpeedIndicator() {
        // Create individual boxes for each stat in the correct order: Energy, View, Speed
        const stats = ['Energy', 'View', 'Speed'].map((label, index) => {
            const box = document.createElement('div');
            box.style.cssText = `
                position: fixed;
                top: 10px;
                color: #00ff41;
                font-family: "Courier New", monospace;
                font-size: 20px;
                text-align: ${index === 0 ? 'left' : index === 1 ? 'center' : 'right'};
                pointer-events: none;
                z-index: 1000;
                ${index === 0 ? 'left: 10px;' : index === 1 ? 'left: 50%; transform: translateX(-50%);' : 'right: 10px;'}
                border: 1px solid #00ff41;
                padding: 5px 10px;
                min-width: 120px;
                background: rgba(0, 0, 0, 0.5);
            `;
            return box;
        });

        this.energyBox = stats[0];
        this.viewBox = stats[1];
        this.speedBox = stats[2];

        // Also store references on StarfieldManager for backwards compatibility
        this.sfm.energyBox = this.energyBox;
        this.sfm.viewBox = this.viewBox;
        this.sfm.speedBox = this.speedBox;

        stats.forEach(box => document.body.appendChild(box));

        this.updateSpeedIndicator();
    }

    /**
     * Update the speed indicator display
     */
    updateSpeedIndicator() {
        // Convert speed to impulse format
        let speedText;

        if (this.sfm.isDocked) {
            speedText = "DOCKED";
        } else {
            // Get actual speed from impulse engines system (accounts for clamping)
            const ship = this.sfm.viewManager?.getShip();
            const impulseEngines = ship?.getSystem('impulse_engines');

            if (impulseEngines) {
                const actualSpeed = impulseEngines.getImpulseSpeed();
                if (actualSpeed === 0) {
                    speedText = "Full Stop";
                } else {
                    speedText = `Impulse ${actualSpeed}`;
                }
            } else {
                // Fallback to internal speed if no impulse engines found
                const currentSpeedLevel = Math.round(this.sfm.currentSpeed);
                if (currentSpeedLevel === 0) {
                    speedText = "Full Stop";
                } else {
                    speedText = `Impulse ${currentSpeedLevel}`;
                }
            }
        }

        if (this.speedBox) {
            this.speedBox.textContent = `Speed: ${speedText}`;
        }
        // Connect Ship energy to existing energy display (using ship directly)
        if (this.energyBox && this.sfm.ship) {
            this.energyBox.textContent = `Energy: ${this.sfm.ship.currentEnergy.toFixed(2)}`;
        }
        if (this.viewBox) {
            this.viewBox.textContent = `View: ${this.sfm.view}`;
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.energyBox && this.energyBox.parentNode) {
            this.energyBox.parentNode.removeChild(this.energyBox);
        }
        if (this.viewBox && this.viewBox.parentNode) {
            this.viewBox.parentNode.removeChild(this.viewBox);
        }
        if (this.speedBox && this.speedBox.parentNode) {
            this.speedBox.parentNode.removeChild(this.speedBox);
        }
        this.energyBox = null;
        this.viewBox = null;
        this.speedBox = null;
        this.sfm = null;
    }
}
