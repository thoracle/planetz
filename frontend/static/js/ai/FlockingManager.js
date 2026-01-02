import { debug } from '../debug.js';

/**
 * FlockingManager.js
 * 
 * Central coordinator for flocking behaviors and formation management.
 * Manages groups of AI ships and coordinates their collective movements.
 */

import * as THREE from 'three';
import { FlockingBehavior } from './FlockingBehavior.js';
import { FormationPatterns } from './FormationPatterns.js';

export class FlockingManager {
    constructor() {
        // Active flocks and formations
        this.flocks = new Map(); // flockId -> { ships: [], behavior: FlockingBehavior, formation: {} }
        this.formations = new Map(); // formationId -> formation data
        
        // Global flocking parameters
        this.neighborhoodRadius = 5.0; // 5km default neighbor detection
        this.maxFlockSize = 8; // Maximum ships per flock
        
        // Performance optimization
        this.updateInterval = 100; // Update every 100ms
        this.lastUpdate = 0;
        
        // Debug mode
        this.debugMode = false;
        this.debugStats = {
            totalFlocks: 0,
            totalShips: 0,
            averageFlockSize: 0,
            computeTime: 0
        };
    }
    
    /**
     * Create a new flock with specified ships
     * @param {Array} ships - Array of AI ships to include in flock
     * @param {Object} config - Flocking behavior configuration
     * @returns {string} - Flock ID
     */
    createFlock(ships, config = {}) {
        const flockId = `flock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const flockingBehavior = new FlockingBehavior({
            separationWeight: config.separationWeight || 0.8,
            alignmentWeight: config.alignmentWeight || 0.6,
            cohesionWeight: config.cohesionWeight || 0.4,
            formationWeight: config.formationWeight || 0.7,
            avoidanceWeight: config.avoidanceWeight || 1.0,
            separationRadius: config.separationRadius || 0.5,
            alignmentRadius: config.alignmentRadius || 2.0,
            cohesionRadius: config.cohesionRadius || 3.0
        });
        
        this.flocks.set(flockId, {
            ships: ships.slice(), // Copy array
            behavior: flockingBehavior,
            formation: null,
            config: config,
            leader: ships[0] || null,
            created: Date.now()
        });
        
        // Initialize ship flocking properties
        ships.forEach(ship => {
            if (ship.ai) {
                ship.ai.flockId = flockId;
                ship.ai.velocity = ship.ai.velocity || new THREE.Vector3();
                ship.ai.acceleration = ship.ai.acceleration || new THREE.Vector3();
            }
        });
        
debug('UTILITY', `🐦 Created flock ${flockId} with ${ships.length} ships`);
        return flockId;
    }
    
    /**
     * Assign a formation to a flock
     * @param {string} flockId - Target flock ID
     * @param {string} formationType - Type of formation
     * @param {Object} formationConfig - Formation parameters
     */
    assignFormation(flockId, formationType, formationConfig = {}) {
        const flock = this.flocks.get(flockId);
        if (!flock || !flock.leader || !flock.leader.ship) {
            debug('AI', `⚠️ Cannot assign formation: Invalid flock ${flockId}`);
            return;
        }
        
        const leaderPos = flock.leader.ship.position;
        const leaderHeading = this.getShipHeading(flock.leader.ship);
        
        let formationPositions = [];
        
        switch (formationType) {
            case 'v_formation':
                formationPositions = FormationPatterns.createVFormation(
                    leaderPos, leaderHeading,
                    formationConfig.spacing || 1.5,
                    formationConfig.wingCount || Math.floor((flock.ships.length - 1) / 2)
                );
                break;
                
            case 'escort':
                formationPositions = FormationPatterns.createEscortFormation(
                    leaderPos, leaderHeading,
                    formationConfig.radius || 2.0,
                    flock.ships.length - 1
                );
                break;
                
            case 'carrier_battle_group':
                formationPositions = FormationPatterns.createCarrierBattleGroup(
                    leaderPos, leaderHeading, formationConfig
                );
                break;
                
            case 'line_abreast':
                formationPositions = FormationPatterns.createLineAbreast(
                    leaderPos, leaderHeading,
                    formationConfig.spacing || 2.0,
                    flock.ships.length
                );
                break;
                
            case 'column':
                formationPositions = FormationPatterns.createColumn(
                    leaderPos, leaderHeading,
                    formationConfig.spacing || 1.5,
                    flock.ships.length
                );
                break;
                
            default:
                debug('AI', `⚠️ Unknown formation type: ${formationType}`);
                return;
        }
        
        // Assign formation positions to ships
        flock.formation = {
            type: formationType,
            config: formationConfig,
            positions: formationPositions,
            lastUpdate: Date.now()
        };
        
        // Set formation targets for each ship's flocking behavior
        flock.ships.forEach((ship, index) => {
            if (ship.ai && ship.ai.flockingBehavior && formationPositions[index]) {
                ship.ai.flockingBehavior.setFormationTarget(
                    formationPositions[index].position,
                    leaderHeading
                );
            }
        });
        
debug('AI', `🎯 Assigned ${formationType} formation to flock ${flockId}`);
    }
    
    /**
     * Update all flocks and their behaviors
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return; // Skip update if not enough time has passed
        }
        
        const startTime = performance.now();
        
        // Update each flock
        for (const [flockId, flock] of this.flocks) {
            this.updateFlock(flockId, flock, deltaTime);
        }
        
        // Update debug stats
        if (this.debugMode) {
            this.updateDebugStats(performance.now() - startTime);
        }
        
        this.lastUpdate = now;
    }
    
    /**
     * Update a single flock
     * @param {string} flockId - Flock identifier
     * @param {Object} flock - Flock data
     * @param {number} deltaTime - Time since last update
     */
    updateFlock(flockId, flock, deltaTime) {
        const { ships, behavior, formation } = flock;
        
        // Remove invalid ships
        flock.ships = ships.filter(ship => ship && ship.ai && ship.ship && ship.ship.position);
        
        if (flock.ships.length === 0) {
            this.removeFlock(flockId);
            return;
        }
        
        // Update formation positions if leader has moved significantly
        if (formation && flock.leader && flock.leader.ship) {
            this.updateFormationIfNeeded(flockId, flock);
        }
        
        // Calculate flocking forces for each ship
        flock.ships.forEach(ship => {
            if (!ship.ai || !ship.ship) return;
            
            // Get neighbors within detection radius
            const neighbors = this.getNeighbors(ship, flock.ships);
            
            // Get obstacles (could include asteroids, stations, etc.)
            const obstacles = this.getObstacles(ship);
            
            // Calculate steering force
            const steeringForce = behavior.calculateSteeringForce(ship.ai, neighbors, obstacles);
            
            // Apply steering force to ship's AI
            this.applySteeringForce(ship.ai, steeringForce, deltaTime);
        });
    }
    
    /**
     * Update formation positions if leader has moved significantly
     */
    updateFormationIfNeeded(flockId, flock) {
        const { formation, leader } = flock;
        if (!formation || !leader || !leader.ship) return;
        
        const leaderPos = leader.ship.position;
        const leaderHeading = this.getShipHeading(leader.ship);
        
        // Check if leader has moved significantly since last formation update
        const lastFormationPos = formation.lastLeaderPos || leaderPos.clone();
        const distanceMoved = leaderPos.distanceTo(lastFormationPos);
        
        if (distanceMoved > 1.0 || Date.now() - formation.lastUpdate > 5000) {
            // Update formation positions
            const newPositions = FormationPatterns.updateFormationPositions(
                formation.positions, leaderPos, leaderHeading
            );
            
            formation.positions = newPositions;
            formation.lastUpdate = Date.now();
            formation.lastLeaderPos = leaderPos.clone();
            
            // Update formation targets for ships
            flock.ships.forEach((ship, index) => {
                if (ship.ai && ship.ai.flockingBehavior && newPositions[index]) {
                    ship.ai.flockingBehavior.setFormationTarget(
                        newPositions[index].position,
                        leaderHeading
                    );
                }
            });
        }
    }
    
    /**
     * Get neighboring ships within detection radius
     */
    getNeighbors(ship, flockShips) {
        const neighbors = [];
        const myPos = ship.ship.position;
        
        for (const otherShip of flockShips) {
            if (otherShip === ship || !otherShip.ship || !otherShip.ship.position) continue;
            
            const distance = myPos.distanceTo(otherShip.ship.position);
            if (distance <= this.neighborhoodRadius) {
                neighbors.push(otherShip.ai);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Get environmental obstacles near ship
     */
    getObstacles(ship) {
        // FUTURE: Query SpatialManager for asteroids, stations, other ships
        // Currently returns empty - AI ships don't avoid obstacles yet
        return [];
    }
    
    /**
     * Apply steering force to ship's AI movement
     */
    applySteeringForce(ai, steeringForce, deltaTime) {
        if (!ai.acceleration) {
            ai.acceleration = new THREE.Vector3();
        }
        if (!ai.velocity) {
            ai.velocity = new THREE.Vector3();
        }
        
        // Apply force to acceleration
        ai.acceleration.add(steeringForce);
        
        // Update velocity with acceleration
        ai.velocity.add(ai.acceleration.clone().multiplyScalar(deltaTime));
        
        // Limit velocity to maximum speed
        const maxSpeed = ai.flockingBehavior?.maxSpeed || 0.8;
        if (ai.velocity.length() > maxSpeed) {
            ai.velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Reset acceleration for next frame
        ai.acceleration.set(0, 0, 0);
        
        // Apply velocity to ship position (this would be handled by ship's movement system)
        if (ai.ship && ai.ship.position) {
            const movement = ai.velocity.clone().multiplyScalar(deltaTime);
            ai.ship.position.add(movement);
        }
    }
    
    /**
     * Get ship's current heading direction
     */
    getShipHeading(ship) {
        if (ship.rotation && ship.rotation.y !== undefined) {
            // Calculate forward direction from ship's rotation
            const heading = new THREE.Vector3(0, 0, 1);
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(ship.rotation.y);
            heading.applyMatrix4(rotationMatrix);
            return heading.normalize();
        }
        
        // Default forward direction
        return new THREE.Vector3(0, 0, 1);
    }
    
    /**
     * Remove a flock and clean up resources
     */
    removeFlock(flockId) {
        const flock = this.flocks.get(flockId);
        if (flock) {
            // Clear flocking behavior from ships
            flock.ships.forEach(ship => {
                if (ship.ai) {
                    ship.ai.flockId = null;
                    if (ship.ai.flockingBehavior) {
                        ship.ai.flockingBehavior.clearFormationTarget();
                    }
                }
            });
            
            this.flocks.delete(flockId);
debug('UTILITY', `🗑️ Removed flock ${flockId}`);
        }
    }
    
    /**
     * Add ships to existing flock
     */
    addShipsToFlock(flockId, ships) {
        const flock = this.flocks.get(flockId);
        if (!flock) {
            debug('AI', `⚠️ Cannot add ships: Flock ${flockId} not found`);
            return;
        }
        
        ships.forEach(ship => {
            if (ship.ai) {
                ship.ai.flockId = flockId;
                ship.ai.velocity = ship.ai.velocity || new THREE.Vector3();
                ship.ai.acceleration = ship.ai.acceleration || new THREE.Vector3();
                flock.ships.push(ship);
            }
        });
        
debug('UTILITY', `➕ Added ${ships.length} ships to flock ${flockId}`);
    }
    
    /**
     * Remove ships from flock
     */
    removeShipsFromFlock(flockId, ships) {
        const flock = this.flocks.get(flockId);
        if (!flock) return;
        
        ships.forEach(ship => {
            const index = flock.ships.indexOf(ship);
            if (index !== -1) {
                flock.ships.splice(index, 1);
                if (ship.ai) {
                    ship.ai.flockId = null;
                    if (ship.ai.flockingBehavior) {
                        ship.ai.flockingBehavior.clearFormationTarget();
                    }
                }
            }
        });
        
        // Remove flock if no ships remain
        if (flock.ships.length === 0) {
            this.removeFlock(flockId);
        }
    }
    
    /**
     * Get debug statistics
     */
    getDebugStats() {
        return {
            ...this.debugStats,
            flocks: Array.from(this.flocks.entries()).map(([id, flock]) => ({
                id,
                shipCount: flock.ships.length,
                formation: flock.formation?.type || 'none',
                created: flock.created
            }))
        };
    }
    
    /**
     * Update debug statistics
     */
    updateDebugStats(computeTime) {
        this.debugStats.totalFlocks = this.flocks.size;
        this.debugStats.totalShips = Array.from(this.flocks.values())
            .reduce((total, flock) => total + flock.ships.length, 0);
        this.debugStats.averageFlockSize = this.debugStats.totalFlocks > 0 
            ? this.debugStats.totalShips / this.debugStats.totalFlocks 
            : 0;
        this.debugStats.computeTime = computeTime;
    }
    
    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
debug('AI', `🐦 Flocking debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Cleanup when destroyed - clears all flocks and resources
     */
    destroy() {
        // Remove all flocks
        for (const flockId of this.flocks.keys()) {
            this.removeFlock(flockId);
        }

        // Clear maps
        this.flocks.clear();
        this.formations.clear();

        // Reset stats
        this.debugStats = {
            totalFlocks: 0,
            totalShips: 0,
            averageFlockSize: 0,
            computeTime: 0
        };

        debug('AI', '🐦 FlockingManager destroyed');
    }
}
