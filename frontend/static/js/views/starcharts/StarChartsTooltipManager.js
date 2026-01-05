/**
 * StarChartsTooltipManager
 *
 * Extracted from StarChartsUI to reduce file size.
 * Handles tooltip display and object details panel for Star Charts.
 *
 * Features:
 * - Tooltip display on hover
 * - Object details panel for selected objects
 * - Object data loading and name resolution
 */

import { debug } from '../../debug.js';

export class StarChartsTooltipManager {
    /**
     * Create a StarChartsTooltipManager
     * @param {Object} starChartsUI - Reference to parent StarChartsUI
     */
    constructor(starChartsUI) {
        this.ui = starChartsUI;
    }

    /**
     * Ensure object database is loaded before showing tooltips
     * @returns {boolean} True if database is ready
     */
    ensureObjectDataLoaded() {
        if (!this.ui.starChartsManager.objectDatabase || !this.ui.starChartsManager.isInitialized) {
            debug('STAR_CHARTS', '🖱️ Object database not ready for tooltips yet');
            return false;
        }
        return true;
    }

    /**
     * Ensure object has a name, fetching from database if needed
     * @param {Object} object - The object to check
     * @returns {Object|null} Object with name or null
     */
    ensureObjectHasName(object) {
        if (!object) return null;

        // If object already has a name, return it
        if (object.name && object.name !== 'undefined' && object.name.trim() !== '') {
            return object;
        }

        // If it's a ship, handle specially
        if (object._isShip) {
            return {
                ...object,
                name: 'Your Ship',
                type: 'ship'
            };
        }

        // Try to get complete data from database
        if (object.id && this.ui.starChartsManager.objectDatabase) {
            const completeData = this.ui.starChartsManager.getObjectData(object.id);
            if (completeData && completeData.name) {
                return {
                    ...object,
                    ...completeData
                };
            }
        }

        // Fallback: create a meaningful name from available data
        let fallbackName = 'Unknown Object';
        if (object.id) {
            // Check if ID is a string before trying to use string methods
            if (typeof object.id === 'string') {
                // Try to extract meaningful name from ID
                const cleanId = object.id.replace(/^[A-Z]\d+_/, ''); // Remove sector prefix like "A0_"
                fallbackName = cleanId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            } else {
                // If ID is numeric (like Three.js mesh ID), create a generic name
                fallbackName = `Object ${object.id}`;
            }
        }

        return {
            ...object,
            name: fallbackName,
            type: object.type || 'Unknown'
        };
    }

    /**
     * Show tooltip at screen position for object
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {Object} object - The object to show tooltip for
     */
    showTooltip(screenX, screenY, object) {
        // Ensure object database is ready
        if (!this.ensureObjectDataLoaded()) {
            return;
        }

        // Ensure object has complete data including name
        const completeObject = this.ensureObjectHasName(object);
        if (!completeObject) {
            debug('STAR_CHARTS', '⚠️ Could not get complete object data for tooltip');
            return;
        }

        // For undiscovered objects, show "Unknown" instead of revealing the name
        // For ship, show "You are here"
        let tooltipText;
        if (completeObject._isShip) {
            tooltipText = 'You are here';
        } else if (completeObject._isUndiscovered) {
            tooltipText = 'Unknown';
        } else {
            // Use the name from the complete object
            tooltipText = completeObject.name || 'Unknown Object';
        }

        // Show tooltip for hovered object - match LRS simple text format
        if (!this.ui.tooltip) {
            debug('P1', '❌ Tooltip element not found!');
            return;
        }

        this.ui.tooltip.textContent = tooltipText;

        // Position tooltip at cursor like LRS
        this.ui.tooltip.style.left = screenX + 'px';
        this.ui.tooltip.style.top = screenY + 'px';
        this.ui.tooltip.style.display = 'block';
    }

    /**
     * Hide the tooltip
     */
    hideTooltip() {
        if (this.ui.tooltip) {
            this.ui.tooltip.style.display = 'none';
        }
    }

    /**
     * Show detailed information about selected object in details panel
     * @param {Object} object - The object to show details for
     */
    showObjectDetails(object) {
        // For undiscovered objects, only show minimal info
        if (object._isUndiscovered) {
            const p = this.ui.getDisplayPosition(object);
            const detailsHTML = `
                <div class="object-details">
                    <h3 style="color: #44ffff; margin-top: 0;">
                        Unknown Object
                    </h3>
                    <div><strong>Status:</strong> Undiscovered</div>
                    <div><strong>Position:</strong></div>
                    <div style="margin-left: 10px;">
                        X: ${p.x.toFixed(1)}<br>
                        Z: ${p.y.toFixed(1)}
                    </div>
                    <div style="margin-top: 10px; font-style: italic; color: #888;">
                        Move closer to discover more information
                    </div>
                </div>
            `;
            this.ui.detailsPanel.innerHTML = detailsHTML;
            return;
        }

        let detailsHTML = `
            <div class="object-details">
                <h3 style="color: #00ff00; margin-top: 0;">${object.name}</h3>
                <div><strong>Type:</strong> ${object.type}</div>
                <div><strong>Class:</strong> ${object.class || 'Unknown'}</div>
        `;

        // Add position info (robust for DB cartesian, polar, or normalized positions)
        try {
            let posBlock = '';
            if (Array.isArray(object.position) && object.position.length >= 3 &&
                typeof object.position[0] === 'number') {
                posBlock = `
                    X: ${object.position[0].toFixed(1)}<br>
                    Y: ${object.position[1].toFixed(1)}<br>
                    Z: ${object.position[2].toFixed(1)}
                `;
            } else if (Array.isArray(object.position) && object.position.length === 2 &&
                       typeof object.position[0] === 'number') {
                const radiusAU = object.position[0];
                const angleDeg = object.position[1];
                posBlock = `
                    Radius (AU): ${radiusAU.toFixed(3)}<br>
                    Angle: ${angleDeg.toFixed(1)}°
                `;
            } else {
                // Use normalized display position (top-down X/Z)
                const p = this.ui.getDisplayPosition(object);
                posBlock = `
                    X: ${p.x.toFixed(1)}<br>
                    Z: ${p.y.toFixed(1)}
                `;
            }
            detailsHTML += `
                <div><strong>Position:</strong></div>
                <div style="margin-left: 10px;">${posBlock}</div>
            `;
        } catch (e) {
            // Silently ignore position errors
        }

        // Add orbit info for celestial bodies
        if (object.orbit) {
            detailsHTML += `
                <div><strong>Orbital Data:</strong></div>
                <div style="margin-left: 10px;">
                    Parent: ${object.orbit.parent}<br>
                    Radius: ${object.orbit.radius.toFixed(1)} km<br>
                    Period: ${object.orbit.period.toFixed(1)} days
                </div>
            `;
        }

        // Add station-specific info
        if (object.faction) {
            detailsHTML += `<div><strong>Faction:</strong> ${object.faction}</div>`;
        }

        if (object.services && object.services.length > 0) {
            detailsHTML += `
                <div><strong>Services:</strong></div>
                <div style="margin-left: 10px;">
                    ${object.services.join('<br>')}
                </div>
            `;
        }

        // Add description
        if (object.description) {
            detailsHTML += `
                <div style="margin-top: 10px;">
                    <strong>Description:</strong><br>
                    <em>${object.description}</em>
                </div>
            `;
        }

        // Add intel brief for stations
        if (object.intel_brief) {
            detailsHTML += `
                <div style="margin-top: 10px; color: #ffff00;">
                    <strong>Intel Brief:</strong><br>
                    <em>${object.intel_brief}</em>
                </div>
            `;
        }

        detailsHTML += '</div>';

        this.ui.detailsPanel.innerHTML = detailsHTML;
    }

    /**
     * Clear the details panel
     */
    clearObjectDetails() {
        if (this.ui.detailsPanel) {
            this.ui.detailsPanel.innerHTML = '';
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.ui = null;
    }
}
