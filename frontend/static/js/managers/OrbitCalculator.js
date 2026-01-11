/**
 * OrbitCalculator - Handles orbital mechanics calculations and spatial grid management
 * Extracted from SolarSystemManager.js to reduce file size and improve modularity.
 *
 * @module OrbitCalculator
 */

import * as THREE from 'three';

/**
 * Physical constants for orbital calculations
 */
const ORBITAL_CONSTANTS = {
    G: 6.67430e-11,          // Gravitational constant
    SOLAR_MASS: 1.989e30,     // Solar mass in kg
    AU: 149.6e9,              // Astronomical unit in meters
    SCALE_FACTOR: 1e-9        // Scale factor for scene representation
};

/**
 * Calculator for orbital mechanics and spatial grid operations
 */
export class OrbitCalculator {
    /**
     * Create a new OrbitCalculator
     * @param {number} gridSize - Size of spatial grid cells (default: 20)
     */
    constructor(gridSize = 20) {
        // Physical constants
        this.G = ORBITAL_CONSTANTS.G;
        this.SOLAR_MASS = ORBITAL_CONSTANTS.SOLAR_MASS;
        this.AU = ORBITAL_CONSTANTS.AU;
        this.SCALE_FACTOR = ORBITAL_CONSTANTS.SCALE_FACTOR;

        // Visual scale factor for scene representation
        this.VISUAL_SCALE = 100.0;

        // Maximum distance from sun in kilometers
        this.MAX_DISTANCE_KM = 1.6e6;

        // Spatial partitioning settings
        this.gridSize = gridSize;
        this.spatialGrid = new Map();

        // Orbital elements storage
        this.orbitalElements = new Map();
    }

    /**
     * Calculate orbital period using Kepler's Third Law
     * T² = (4π²/GM) * a³
     * @param {number} semiMajorAxis - Semi-major axis of the orbit
     * @returns {number} Orbital period
     */
    calculateOrbitalPeriod(semiMajorAxis) {
        return Math.sqrt((4 * Math.PI * Math.PI) / (this.G * this.SOLAR_MASS) * Math.pow(semiMajorAxis, 3));
    }

    /**
     * Calculate orbital velocity for an object
     * v = sqrt(GM/a)
     * @param {Object} elements - Orbital elements containing semiMajorAxis
     * @returns {number} Orbital velocity
     */
    calculateOrbitalVelocity(elements) {
        return Math.sqrt((this.G * this.SOLAR_MASS) / elements.semiMajorAxis);
    }

    /**
     * Calculate mean motion (angular velocity) for an orbit
     * n = sqrt(GM/a³)
     * @param {Object} elements - Orbital elements containing semiMajorAxis
     * @returns {number} Mean motion
     */
    calculateMeanMotion(elements) {
        return Math.sqrt((this.G * this.SOLAR_MASS) / Math.pow(elements.semiMajorAxis, 3));
    }

    /**
     * Calculate gravitational force between two bodies
     * F = G * m1 * m2 / r²
     * @param {string} body1Key - Key of first body in celestialBodies
     * @param {string} body2Key - Key of second body in celestialBodies
     * @param {Map} celestialBodies - Map of celestial body meshes
     * @returns {THREE.Vector3} Force vector
     */
    calculateGravitationalForce(body1Key, body2Key, celestialBodies) {
        const elements1 = this.orbitalElements.get(body1Key);
        const elements2 = this.orbitalElements.get(body2Key);
        if (!elements1 || !elements2) return new THREE.Vector3();

        const body1 = celestialBodies.get(body1Key);
        const body2 = celestialBodies.get(body2Key);
        if (!body1 || !body2) return new THREE.Vector3();

        const pos1 = body1.position;
        const pos2 = body2.position;

        const r = pos2.clone().sub(pos1);
        const distance = r.length();

        if (distance < 0.1) return new THREE.Vector3(); // Prevent division by zero

        const forceMagnitude = (this.G * elements1.mass * elements2.mass) / (distance * distance);
        return r.normalize().multiplyScalar(forceMagnitude);
    }

    /**
     * Set orbital elements for a celestial body
     * @param {string} key - Body identifier
     * @param {Object} elements - Orbital elements
     */
    setOrbitalElements(key, elements) {
        this.orbitalElements.set(key, {
            semiMajorAxis: elements.semiMajorAxis,
            eccentricity: elements.eccentricity,
            inclination: elements.inclination,
            longitudeOfAscendingNode: elements.longitudeOfAscendingNode,
            argumentOfPeriapsis: elements.argumentOfPeriapsis,
            meanAnomaly: elements.meanAnomaly,
            mass: elements.mass
        });
    }

    /**
     * Get orbital elements for a celestial body
     * @param {string} key - Body identifier
     * @returns {Object|undefined} Orbital elements or undefined
     */
    getOrbitalElements(key) {
        return this.orbitalElements.get(key);
    }

    /**
     * Clear all orbital elements
     */
    clearOrbitalElements() {
        this.orbitalElements.clear();
    }

    /**
     * Get grid cell key for a position
     * @param {THREE.Vector3} position - Position to map to grid
     * @returns {string} Grid cell key
     */
    getGridKey(position) {
        const x = Math.floor(position.x / this.gridSize);
        const y = Math.floor(position.y / this.gridSize);
        const z = Math.floor(position.z / this.gridSize);
        return `${x},${y},${z}`;
    }

    /**
     * Update spatial partitioning grid from celestial bodies
     * @param {Map} celestialBodies - Map of celestial body meshes
     */
    updateSpatialGrid(celestialBodies) {
        this.spatialGrid.clear();
        celestialBodies.forEach((body, key) => {
            const gridKey = this.getGridKey(body.position);
            if (!this.spatialGrid.has(gridKey)) {
                this.spatialGrid.set(gridKey, new Set());
            }
            this.spatialGrid.get(gridKey).add(key);
        });
    }

    /**
     * Clear the spatial grid
     */
    clearSpatialGrid() {
        this.spatialGrid.clear();
    }

    /**
     * Get nearby bodies for gravitational calculations
     * @param {THREE.Vector3} position - Center position
     * @param {number} radius - Search radius
     * @param {Map} celestialBodies - Map of celestial body meshes
     * @returns {Array<string>} Array of nearby body keys
     */
    getNearbyBodies(position, radius, celestialBodies) {
        const nearbyBodies = new Set();
        const cellRadius = Math.ceil(radius / this.gridSize);
        const centerCell = this.getGridKey(position);
        const [centerX, centerY, centerZ] = centerCell.split(',').map(Number);

        // Check surrounding cells
        for (let x = -cellRadius; x <= cellRadius; x++) {
            for (let y = -cellRadius; y <= cellRadius; y++) {
                for (let z = -cellRadius; z <= cellRadius; z++) {
                    const cellKey = `${centerX + x},${centerY + y},${centerZ + z}`;
                    const cellBodies = this.spatialGrid.get(cellKey);
                    if (cellBodies) {
                        cellBodies.forEach(bodyKey => {
                            const body = celestialBodies.get(bodyKey);
                            if (body && body.position.distanceTo(position) <= radius) {
                                nearbyBodies.add(bodyKey);
                            }
                        });
                    }
                }
            }
        }
        return Array.from(nearbyBodies);
    }

    /**
     * Get position in orbit around the star
     * @param {number} auDistance - Distance in AU
     * @param {number} angleDegrees - Angle in degrees
     * @returns {THREE.Vector3} Position vector
     */
    getOrbitPosition(auDistance, angleDegrees) {
        const angle = (angleDegrees * Math.PI) / 180;
        const distance = auDistance * this.VISUAL_SCALE;

        return new THREE.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 2, // Small random Y variation
            Math.sin(angle) * distance
        );
    }

    /**
     * Get position near Europa moon around Terra Prime
     * @returns {THREE.Vector3} Position vector
     */
    getEuropaMoonOrbitPosition() {
        // Terra Prime is at ~1 AU (100 units from star)
        const terraPrimeDistance = 1.0 * this.VISUAL_SCALE;
        const terraPrimeAngle = 0;

        // Europa moon orbits at ~16 units distance
        const europaMoonDistance = 16.0;
        const europaMoonAngle = Math.PI * 0.5;

        // Calculate Terra Prime position
        const terraPrimeX = Math.cos(terraPrimeAngle) * terraPrimeDistance;
        const terraPrimeZ = Math.sin(terraPrimeAngle) * terraPrimeDistance;

        // Calculate Europa moon position relative to Terra Prime
        const europaMoonX = terraPrimeX + Math.cos(europaMoonAngle) * europaMoonDistance;
        const europaMoonZ = terraPrimeZ + Math.sin(europaMoonAngle) * europaMoonDistance;

        // Position station slightly offset from Europa moon
        const stationOffset = 2.0;
        const stationAngle = Math.PI * 0.25;

        return new THREE.Vector3(
            europaMoonX + Math.cos(stationAngle) * stationOffset,
            (Math.random() - 0.5) * 2,
            europaMoonZ + Math.sin(stationAngle) * stationOffset
        );
    }
}

export default OrbitCalculator;
