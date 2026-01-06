/**
 * SCMSpatialGrid - Spatial partitioning for optimized proximity checking
 * Extracted from StarChartsManager.js to reduce file size.
 *
 * Handles:
 * - Spatial grid initialization from dynamic solar system
 * - Grid key calculation
 * - Nearby object retrieval
 */

import { debug } from '../../debug.js';

export class SCMSpatialGrid {
    constructor(manager) {
        this.manager = manager;
    }

    // Convenience accessors
    get spatialGrid() { return this.manager.spatialGrid; }
    get gridSize() { return this.manager.gridSize; }
    get solarSystemManager() { return this.manager.solarSystemManager; }
    get _currentSector() { return this.manager._currentSector; }

    /**
     * Initialize spatial partitioning for optimized proximity checking
     */
    initializeSpatialGrid() {
        // CRITICAL FIX: Use dynamic solar system data instead of static database
        if (!this.solarSystemManager) {
            debug('STAR_CHARTS', 'Cannot initialize spatial grid: no solarSystemManager');
            return;
        }

        const celestialBodies = this.solarSystemManager.getCelestialBodies();
        if (!celestialBodies || celestialBodies.size === 0) {
            debug('STAR_CHARTS', 'Cannot initialize spatial grid: no celestial bodies in current sector');
            return;
        }

        this.spatialGrid.clear();

        // Build objects list from dynamic solar system
        const allObjects = [];

        for (const [key, body] of celestialBodies.entries()) {
            const info = this.solarSystemManager.getCelestialBodyInfo(body);
            if (info && body.position) {
                const objectEntry = {
                    id: `${this._currentSector}_${key}`,
                    name: info.name,
                    type: info.type,
                    position: body.position,
                    cartesianPosition: [body.position.x, body.position.y, body.position.z]
                };
                allObjects.push(objectEntry);
                debug('STAR_CHARTS', `Added to spatial grid: ${objectEntry.name} (${objectEntry.id}) at [${objectEntry.cartesianPosition.join(', ')}]`);
            }
        }

        debug('STAR_CHARTS', `Spatial grid using ${allObjects.length} objects from dynamic solar system (sector: ${this._currentSector})`);

        // Store as class property for access by other methods
        this.manager.allObjects = allObjects;

        let processedCount = 0;
        let skippedCount = 0;

        allObjects.forEach((obj, index) => {
            if (obj && obj.position && obj.cartesianPosition) {
                const position3D = obj.cartesianPosition;
                const gridKey = this.getGridKey(position3D);

                if (!this.spatialGrid.has(gridKey)) {
                    this.spatialGrid.set(gridKey, []);
                }

                this.spatialGrid.get(gridKey).push(obj);
                processedCount++;

                if (index < 5) {
                    // Log summary for first few objects
                } else if (index === 5) {
                    debug('STAR_CHARTS', `   ... and ${allObjects.length - 5} more objects`);
                }
            } else {
                debug('STAR_CHARTS', `SKIPPING ${obj.id || obj.name} - no valid position data`);
                skippedCount++;
            }
        });

        // Only log spatial grid initialization on first setup
        if (!this.manager.spatialGridInitialized) {
            debug('UTILITY', `Spatial grid initialized: ${this.spatialGrid.size} cells, ${allObjects.length} objects`);
            this.manager.spatialGridInitialized = true;
        }

        // Add global debug functions
        if (typeof window !== 'undefined') {
            window.debugSpatialGrid = () => {
                for (const [cellKey, objects] of this.spatialGrid) {
                    objects.forEach(obj => {
                        // Log object details
                    });
                }
                return 'Spatial grid logged to console';
            };

            window.refreshSpatialGrid = () => {
                this.refreshSpatialGrid();
                return 'Spatial grid refreshed';
            };
        }
    }

    /**
     * Refresh spatial grid after system generation
     */
    refreshSpatialGrid() {
        this.initializeSpatialGrid();
    }

    /**
     * Get spatial grid key for position
     * @param {Array} position - [x, y, z] or [x, y] position
     * @returns {string} Grid key "x,y,z"
     */
    getGridKey(position) {
        if (!position || !Array.isArray(position) || position.length < 2) {
            debug('STAR_CHARTS', `Invalid position for grid key:`, position);
            return '0,0,0';
        }

        const x = Math.floor(position[0] / this.gridSize);
        const y = Math.floor(position[1] / this.gridSize);
        const z = position.length >= 3 ? Math.floor(position[2] / this.gridSize) : 0;

        return `${x},${y},${z}`;
    }

    /**
     * Get objects within radius using spatial partitioning
     * @param {Array} playerPosition - Player's position
     * @param {number} radius - Search radius
     * @returns {Array} Objects within radius
     */
    getNearbyObjects(playerPosition, radius) {
        const nearbyObjects = [];
        const gridRadius = Math.ceil(radius / this.gridSize) + 2;
        const playerPos3D = this.manager.discoveryProcessor.ensure3DPosition(playerPosition);
        const playerGridKey = this.getGridKey(playerPosition);
        const [px, py, pz] = playerGridKey.split(',').map(Number);

        let checkedCells = 0;
        let totalObjectsFound = 0;

        // Check surrounding grid cells
        for (let x = px - gridRadius; x <= px + gridRadius; x++) {
            for (let y = py - gridRadius; y <= py + gridRadius; y++) {
                for (let z = pz - gridRadius; z <= pz + gridRadius; z++) {
                    const gridKey = `${x},${y},${z}`;
                    const cellObjects = this.spatialGrid.get(gridKey);
                    checkedCells++;

                    if (cellObjects && cellObjects.length > 0) {
                        const inRangeObjects = cellObjects.filter(obj => {
                            const objPos3D = obj.cartesianPosition || obj.position || [0, 0, 0];
                            const distance = this.manager.discoveryProcessor.calculateDistance(objPos3D, playerPos3D);
                            return distance <= radius;
                        });

                        nearbyObjects.push(...inRangeObjects);
                        totalObjectsFound += inRangeObjects.length;
                    }
                }
            }
        }

        return nearbyObjects;
    }
}
