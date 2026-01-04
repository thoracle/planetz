/**
 * TargetDisplayManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles target display updates, distance formatting, and target data retrieval.
 *
 * Features:
 * - Update target HUD display based on current target
 * - Sort targets by distance from camera
 * - Format distances with appropriate units (Km, Mm, Gm, Tm, Pm, Em)
 * - Get current target data from target computer manager
 * - Get parent planet name for moons
 */

import { debug } from '../debug.js';

export class TargetDisplayManager {
    /**
     * Create a TargetDisplayManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Update target display in the HUD
     * Handles visibility, diplomacy colors, and delegation to target computer manager
     */
    updateTargetDisplay() {
        // Don't show anything if targeting is completely disabled
        if (!this.sfm.targetComputerEnabled) {
            this.sfm.targetComputerManager.hideTargetHUD();
            this.sfm.targetComputerManager.hideTargetReticle();
            this.sfm.currentButtonState = {
                hasDockButton: false,
                isDocked: false,
                hasScanButton: false,
                hasTradeButton: false
            };
            return;
        }

        // Handle galactic view
        if (this.sfm.viewManager.currentView === 'galactic') {
            this.sfm.targetComputerManager.hideTargetHUD();
            return;
        }

        // Keep target HUD visible as long as targeting is enabled
        this.sfm.targetComputerManager.showTargetHUD();

        // Handle case where there's no current target
        if (!this.sfm.currentTarget) {
            this.sfm.targetComputerManager.hideTargetReticle();
            // Clear any existing action buttons to prevent stale dock buttons
            this.sfm.targetComputerManager.clearActionButtons();
            // Reset button state
            this.sfm.currentButtonState = {
                hasDockButton: false,
                isDocked: false,
                hasScanButton: false,
                hasTradeButton: false
            };
            // Hide intel when no target
            if (this.sfm.intelVisible) {
                this.sfm.intelVisible = false;
                this.sfm.intelHUD.style.display = 'none';
            }
            this.sfm.updateIntelIconDisplay();
            return;
        }

        // Get the current target data
        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) {
            this.sfm.targetComputerManager.hideTargetReticle();
            // Clear any existing action buttons to prevent stale dock buttons
            this.sfm.targetComputerManager.clearActionButtons();
            // Reset button state
            this.sfm.currentButtonState = {
                hasDockButton: false,
                isDocked: false,
                hasScanButton: false,
                hasTradeButton: false
            };
            return;
        }

        // Check if target has changed and dismiss intel if so
        if (this.sfm.previousTarget !== this.sfm.currentTarget) {
            if (this.sfm.intelVisible) {
                this.sfm.intelVisible = false;
                this.sfm.intelHUD.style.display = 'none';
            }
            this.sfm.previousTarget = this.sfm.currentTarget;
        }

        // Calculate distance to target
        const distance = this.sfm.calculateDistance(this.sfm.camera.position, this.sfm.currentTarget.position);

        // Check intel availability based on scan range and long range scanner
        this.sfm.updateIntelAvailability(distance);

        // Get target info for diplomacy status and actions
        let info = null;
        let isEnemyShip = false;

        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
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

        // Update HUD border color based on diplomacy
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
        this.sfm.targetComputerManager.setTargetHUDBorderColor(diplomacyColor);

        // Update wireframe container border color to match
        if (this.sfm.wireframeContainer) {
            this.sfm.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Delegate full Target CPU HUD rendering to TargetComputerManager to avoid double-rendering
        // and accidental overwrites (especially for space stations' sub-target UI)
        this.sfm.targetComputerManager.updateTargetDisplay();

        // Display the reticle if we have a valid target
        this.sfm.targetComputerManager.showTargetReticle();
        this.sfm.updateReticlePosition();
    }

    /**
     * Sort target objects by distance from camera
     * Updates targetObjects array in place with sorted results and distance property
     */
    sortTargetsByDistance() {
        const cameraPosition = this.sfm.camera.position;

        this.sfm.targetObjects.sort((a, b) => {
            const distA = Math.sqrt(
                Math.pow(a.position[0] - cameraPosition.x, 2) +
                Math.pow(a.position[1] - cameraPosition.y, 2) +
                Math.pow(a.position[2] - cameraPosition.z, 2)
            );
            const distB = Math.sqrt(
                Math.pow(b.position[0] - cameraPosition.x, 2) +
                Math.pow(b.position[1] - cameraPosition.y, 2) +
                Math.pow(b.position[2] - cameraPosition.z, 2)
            );
            return distA - distB;
        });

        // Add distance to each target
        this.sfm.targetObjects = this.sfm.targetObjects.map(target => {
            const distance = Math.sqrt(
                Math.pow(target.position[0] - cameraPosition.x, 2) +
                Math.pow(target.position[1] - cameraPosition.y, 2) +
                Math.pow(target.position[2] - cameraPosition.z, 2)
            );
            return {
                ...target,
                distance: this.formatDistance(distance)
            };
        });
    }

    /**
     * Format distance with appropriate unit suffix
     * @param {number} distanceInKm - Distance in kilometers
     * @returns {string} Formatted distance string with unit
     */
    formatDistance(distanceInKm) {
        // Helper function to add commas to numbers
        const addCommas = (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        if (distanceInKm >= 1e15) {
            // Convert to exameters (1 Em = 1e15 km)
            const distanceInEm = distanceInKm / 1e15;
            return `${addCommas(distanceInEm.toFixed(2))} Em`;
        } else if (distanceInKm >= 1e12) {
            // Convert to petameters (1 Pm = 1e12 km)
            const distanceInPm = distanceInKm / 1e12;
            return `${addCommas(distanceInPm.toFixed(2))} Pm`;
        } else if (distanceInKm >= 1e9) {
            // Convert to terameters (1 Tm = 1e9 km)
            const distanceInTm = distanceInKm / 1e9;
            return `${addCommas(distanceInTm.toFixed(2))} Tm`;
        } else if (distanceInKm >= 1e6) {
            // Convert to gigameters (1 Gm = 1e6 km)
            const distanceInGm = distanceInKm / 1e6;
            return `${addCommas(distanceInGm.toFixed(2))} Gm`;
        } else if (distanceInKm >= 1e3) {
            // Convert to megameters (1 Mm = 1e3 km)
            const distanceInMm = distanceInKm / 1e3;
            return `${addCommas(distanceInMm.toFixed(2))} Mm`;
        } else {
            return `${addCommas(distanceInKm.toFixed(2))} Km`;
        }
    }

    /**
     * Get current target data from target computer manager or local array
     * @returns {Object|null} Target data object or null if no valid target
     */
    getCurrentTargetData() {
        if (!this.sfm.currentTarget || !this.sfm.targetObjects || this.sfm.targetIndex === -1) {
            return null;
        }

        // Use the target data from TargetComputerManager which has the most up-to-date information
        const targetComputerData = this.sfm.targetComputerManager.getCurrentTargetData();
        if (targetComputerData) {
            return targetComputerData;
        }

        // Fallback to local target objects array
        return this.sfm.targetObjects[this.sfm.targetIndex];
    }

    /**
     * Get the name of the parent planet for a moon
     * @param {Object} moon - Moon object with position
     * @returns {string} Name of parent planet or 'Unknown'
     */
    getParentPlanetName(moon) {
        // Get all celestial bodies
        const bodies = this.sfm.solarSystemManager.getCelestialBodies();

        // Find the parent planet by checking which planet's position is closest to the moon
        let closestPlanet = null;
        let minDistance = Infinity;

        for (const [key, body] of bodies.entries()) {
            if (!key.startsWith('moon_')) {
                const distance = body.position.distanceTo(moon.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPlanet = body;
                }
            }
        }

        if (closestPlanet) {
            const info = this.sfm.solarSystemManager.getCelestialBodyInfo(closestPlanet);
            return info.name;
        }

        return 'Unknown';
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
