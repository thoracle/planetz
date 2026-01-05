/**
 * StarChartsCoordinateSystem
 *
 * Extracted from StarChartsUI to reduce file size.
 * Handles coordinate transformations and viewBox management for Star Charts.
 *
 * Features:
 * - SVG viewBox setup and management
 * - Screen-to-world coordinate conversion
 * - World-to-screen coordinate conversion
 * - Object display position calculation
 */

import { debug } from '../../debug.js';

export class StarChartsCoordinateSystem {
    /**
     * Create a StarChartsCoordinateSystem
     * @param {Object} starChartsUI - Reference to parent StarChartsUI
     */
    constructor(starChartsUI) {
        this.ui = starChartsUI;
    }

    /**
     * Setup SVG coordinate system - account for map container aspect ratio
     */
    setupCoordinateSystem() {
        // Ensure valid zoom level (allow zoom out to 0.4 for beacon ring view)
        if (isNaN(this.ui.currentZoomLevel) || this.ui.currentZoomLevel < 0.4) {
            this.ui.currentZoomLevel = 1;
        }

        // Ensure valid center coordinates
        if (!this.ui.currentCenter || isNaN(this.ui.currentCenter.x) || isNaN(this.ui.currentCenter.y)) {
            this.ui.currentCenter = { x: 0, y: 0 };
        }

        // Get actual map container dimensions to account for layout
        const mapRect = this.ui.mapContainer.getBoundingClientRect();
        const containerWidth = mapRect.width || 400; // Fallback if not available
        const containerHeight = mapRect.height || 400;

        // Calculate aspect ratio of the actual container
        const aspectRatio = containerWidth / containerHeight;

        // Adjust viewBox to maintain proper centering based on container aspect ratio
        let baseViewBoxWidth = this.ui.defaultViewBox.width / this.ui.currentZoomLevel;
        let baseViewBoxHeight = this.ui.defaultViewBox.height / this.ui.currentZoomLevel;

        // If container is wider than square, adjust viewBox width to maintain centering
        if (aspectRatio > 1) {
            baseViewBoxWidth = baseViewBoxHeight * aspectRatio;
        } else if (aspectRatio < 1) {
            baseViewBoxHeight = baseViewBoxWidth / aspectRatio;
        }

        // Calculate viewBox position ensuring the center point
        const viewBoxX = this.ui.currentCenter.x - (baseViewBoxWidth / 2);
        const viewBoxY = this.ui.currentCenter.y - (baseViewBoxHeight / 2);

        // Final validation of viewBox values
        const safeViewBox = {
            width: isNaN(baseViewBoxWidth) ? this.ui.defaultViewBox.width : baseViewBoxWidth,
            height: isNaN(baseViewBoxHeight) ? this.ui.defaultViewBox.height : baseViewBoxHeight,
            x: isNaN(viewBoxX) ? this.ui.defaultViewBox.x : viewBoxX,
            y: isNaN(viewBoxY) ? this.ui.defaultViewBox.y : viewBoxY
        };

        const viewBox = `${safeViewBox.x} ${safeViewBox.y} ${safeViewBox.width} ${safeViewBox.height}`;
        this.ui.svg.setAttribute('viewBox', viewBox);
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} World coordinates {x, y}
     */
    screenToWorld(screenX, screenY) {
        const rect = this.ui.svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;

        // Calculate world bounds based on zoom level
        const worldSize = this.getWorldSize();
        const worldX = (screenX / svgWidth - 0.5) * worldSize + this.ui.currentCenter.x;
        const worldY = (screenY / svgHeight - 0.5) * worldSize + this.ui.currentCenter.y;

        return { x: worldX, y: worldY };
    }

    /**
     * Convert world coordinates to screen coordinates for an object
     * This is the inverse of screenToWorld
     * @param {Object} object - The object with position data
     * @returns {Object|null} Screen coordinates {x, y} or null
     */
    worldToScreen(object) {
        if (!object) return null;

        const pos = this.getDisplayPosition(object);
        if (!pos) return null;

        const rect = this.ui.svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;
        const worldSize = this.getWorldSize();

        // Convert world coordinates back to screen coordinates
        const screenX = ((pos.x - this.ui.currentCenter.x) / worldSize + 0.5) * svgWidth;
        const screenY = ((pos.y - this.ui.currentCenter.y) / worldSize + 0.5) * svgHeight;

        return { x: screenX, y: screenY };
    }

    /**
     * Get world size based on zoom level
     * @returns {number} World size in units
     */
    getWorldSize() {
        // Mimic LRS scaling by adjusting base size from discovery range
        let baseSize = 1000;
        try {
            const range = this.ui.starChartsManager.getDiscoveryRadius?.() || 150;
            const rangeMultiplier = Math.max(0.5, Math.min(2.0, range / 150));
            baseSize = 1000 * rangeMultiplier;
        } catch (e) {}
        return baseSize / this.ui.currentZoomLevel;
    }

    /**
     * Convert stored object position to top-down display coordinates (x,z)
     * @param {Object} object - The object with position data
     * @returns {Object} Display coordinates {x, y}
     */
    getDisplayPosition(object) {
        // Prefer normalized display position if model built
        if (this.ui.displayModel && this.ui.displayModel.positions.has(object.id)) {
            const pos = this.ui.displayModel.positions.get(object.id);
            if (object.type === 'navigation_beacon') {
                debug('UI', `Beacon ${object.name}: Using display model position (${pos.x}, ${pos.y}) - found in model`);
            }
            return pos;
        } else if (object.type === 'navigation_beacon') {
            debug('UI', `Beacon ${object.name}: Display model position NOT found, falling back to calculation`);
        }

        if (Array.isArray(object.position)) {
            if (object.position.length >= 3) {
                // Special handling for navigation beacons - they use [x, y, z] format
                // where y is the vertical coordinate, not z
                const pos = object.type === 'navigation_beacon'
                    ? { x: object.position[0], y: object.position[1] }
                    : { x: object.position[0], y: object.position[2] };

                if (object.type === 'navigation_beacon') {
                    debug('UI', `Beacon ${object.name}: Using beacon position [${object.position[0]}, ${object.position[1]}, ${object.position[2]}] -> display (${pos.x}, ${pos.y})`);
                }
                return pos;
            }
            if (object.position.length === 2) {
                const radiusAU = object.position[0];
                const angleDeg = object.position[1];
                const angleRad = (angleDeg * Math.PI) / 180;
                const AU_TO_DISPLAY = 149.6; // Keep consistent with planet units
                const r = radiusAU * AU_TO_DISPLAY;
                const pos = { x: r * Math.cos(angleRad), y: r * Math.sin(angleRad) };
                if (object.type === 'navigation_beacon') {
                    debug('UI', `Beacon ${object.name}: Using polar position [${radiusAU}, ${angleDeg}] -> display (${pos.x}, ${pos.y})`);
                }
                return pos;
            }
        }

        if (object.type === 'navigation_beacon') {
            debug('UTILITY', `Beacon ${object.name}: No position data found, using (0,0)`);
        }
        return { x: 0, y: 0 };
    }

    /**
     * Get the display position of the sector's star
     * @returns {Object} Star display coordinates {x, y}
     */
    getSectorStarDisplayPosition() {
        try {
            const sectorData = this.ui.starChartsManager.objectDatabase?.sectors[this.ui.starChartsManager.getCurrentSector()];
            if (sectorData?.star) {
                return this.getDisplayPosition(sectorData.star);
            }
        } catch (e) {}
        return { x: 0, y: 0 };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.ui = null;
    }
}
