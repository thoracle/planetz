import * as THREE from 'three';

/**
 * ThreatAssessment - Analyzes and prioritizes threats for enemy AI
 * 
 * Handles target prioritization, threat level calculation, and tactical analysis
 * Based on docs/enemy_ai_spec.md threat assessment requirements
 */
export class ThreatAssessment {
    constructor(ai) {
        this.ai = ai;
        this.ship = ai.ship;
        
        // Threat tracking
        this.currentThreats = new Map(); // Map of ship -> threat data
        this.threatHistory = new Map(); // Historical threat data
        this.primaryThreat = null;
        this.lastAssessmentTime = 0;
        this.assessmentInterval = 500; // Update every 500ms
        
        // Threat scoring weights
        this.threatWeights = {
            distance: 0.3,      // Closer threats are more dangerous
            firepower: 0.25,    // Higher firepower = higher threat
            health: 0.15,       // Healthier enemies are more persistent
            diplomacy: 0.2,     // Enemy vs neutral vs ally
            targeting: 0.1      // Is this threat currently targeting us?
        };
        
        console.log(`🎯 ThreatAssessment initialized for ${this.ship.shipType}`);
    }
    
    /**
     * Update threat assessment
     * @param {number} deltaTime - Time since last update
     * @param {Object} gameWorld - Game world reference
     */
    update(deltaTime, gameWorld) {
        const now = Date.now();
        
        // Only update assessment at specified interval
        if (now - this.lastAssessmentTime < this.assessmentInterval) {
            return;
        }
        
        this.lastAssessmentTime = now;
        
        // Clear old threat data
        this.currentThreats.clear();
        
        // Assess all detected entities
        this.assessThreats(gameWorld);
        
        // Update primary threat
        this.updatePrimaryThreat();
        
        // Update AI target based on assessment
        this.updateAITarget();
    }
    
    /**
     * Assess threats from all detected entities
     * @param {Object} gameWorld - Game world reference
     */
    assessThreats(gameWorld) {
        if (!gameWorld.ships || !this.ship.position) return;
        
        for (const ship of gameWorld.ships) {
            if (ship === this.ship) continue;
            
            const distance = this.ship.position.distanceTo(ship.position);
            
            // Only assess ships within sensor range
            if (distance <= this.ai.sensorRange) {
                const threatData = this.calculateThreatLevel(ship, distance);
                if (threatData.threatLevel > 0) {
                    this.currentThreats.set(ship, threatData);
                }
            }
        }
        
        // Also check for player ship if available
        if (gameWorld.playerShip && gameWorld.playerShip !== this.ship) {
            const distance = this.ship.position.distanceTo(gameWorld.playerShip.position);
            if (distance <= this.ai.sensorRange) {
                const threatData = this.calculateThreatLevel(gameWorld.playerShip, distance);
                if (threatData.threatLevel > 0) {
                    this.currentThreats.set(gameWorld.playerShip, threatData);
                }
            }
        }
    }
    
    /**
     * Calculate threat level for a specific ship
     * @param {Object} ship - Ship to assess
     * @param {number} distance - Distance to the ship
     * @returns {Object} Threat assessment data
     */
    calculateThreatLevel(ship, distance) {
        let threatLevel = 0;
        const factors = {};
        
        // Distance factor (closer = more threatening)
        factors.distance = Math.max(0, 1 - (distance / this.ai.sensorRange));
        threatLevel += factors.distance * this.threatWeights.distance;
        
        // Firepower factor
        const shipFirepower = ship.currentFirepower || ship.baseFirepower || 1;
        const maxFirepower = 100; // Normalize against expected max firepower
        factors.firepower = Math.min(1, shipFirepower / maxFirepower);
        threatLevel += factors.firepower * this.threatWeights.firepower;
        
        // Health factor (healthier ships are more persistent threats)
        factors.health = ship.currentHull && ship.maxHull ? 
            (ship.currentHull / ship.maxHull) : 1;
        threatLevel += factors.health * this.threatWeights.health;
        
        // Diplomacy factor
        factors.diplomacy = this.getDiplomacyThreatFactor(ship);
        threatLevel += factors.diplomacy * this.threatWeights.diplomacy;
        
        // Targeting factor (is this ship targeting us?)
        factors.targeting = this.isTargetingUs(ship) ? 1 : 0;
        threatLevel += factors.targeting * this.threatWeights.targeting;
        
        // Ship type modifiers
        const typeModifier = this.getShipTypeThreatModifier(ship);
        threatLevel *= typeModifier;
        
        return {
            ship: ship,
            threatLevel: Math.min(1, threatLevel), // Cap at 1.0
            distance: distance,
            factors: factors,
            typeModifier: typeModifier,
            lastUpdated: Date.now()
        };
    }
    
    /**
     * Get diplomacy-based threat factor
     * @param {Object} ship - Ship to assess
     * @returns {number} Threat factor (0-1)
     */
    getDiplomacyThreatFactor(ship) {
        if (ship.isPlayer) return 1.0; // Player is always max threat
        
        switch (ship.diplomacy) {
            case 'enemy': return 1.0;    // Full threat
            case 'neutral': return 0.3;  // Low threat unless provoked
            case 'friendly': return 0.0; // No threat
            default: return 0.5;         // Unknown = moderate threat
        }
    }
    
    /**
     * Check if a ship is currently targeting us
     * @param {Object} ship - Ship to check
     * @returns {boolean} True if ship is targeting us
     */
    isTargetingUs(ship) {
        // Check if ship has AI and is targeting us
        if (ship.ai && ship.ai.currentTarget === this.ship) {
            return true;
        }
        
        // Check if player ship is aiming at us (simplified)
        if (ship.isPlayer) {
            // This would require more sophisticated targeting detection
            return true; // Assume player is always targeting when in range
        }
        
        return false;
    }
    
    /**
     * Get ship type threat modifier
     * @param {Object} ship - Ship to assess
     * @returns {number} Threat multiplier
     */
    getShipTypeThreatModifier(ship) {
        const shipType = ship.shipType || 'unknown';
        
        // Threat modifiers based on ship capability
        const typeModifiers = {
            scout: 0.7,          // Fast but lightly armed
            light_fighter: 1.0,  // Standard threat
            heavy_fighter: 1.3,  // Higher threat due to armor/weapons
            carrier: 0.8,        // Dangerous but slow and prefers distance
            light_freighter: 0.4, // Low combat threat
            heavy_freighter: 0.6, // Slightly more dangerous than light
            unknown: 1.0         // Default
        };
        
        return typeModifiers[shipType] || typeModifiers.unknown;
    }
    
    /**
     * Update the primary threat based on current assessment
     */
    updatePrimaryThreat() {
        let highestThreat = null;
        let highestThreatLevel = 0;
        
        for (const threatData of this.currentThreats.values()) {
            if (threatData.threatLevel > highestThreatLevel) {
                highestThreatLevel = threatData.threatLevel;
                highestThreat = threatData;
            }
        }
        
        // Only change primary threat if new threat is significantly higher
        // or if current primary threat is no longer valid
        if (!this.primaryThreat || 
            !this.currentThreats.has(this.primaryThreat.ship) ||
            highestThreatLevel > this.primaryThreat.threatLevel + 0.1) {
            
            this.primaryThreat = highestThreat;
            
            if (this.primaryThreat) {
                console.log(`🎯 ${this.ship.shipType} primary threat: ${this.primaryThreat.ship.shipType || 'unknown'} (level: ${this.primaryThreat.threatLevel.toFixed(2)})`);
            }
        }
    }
    
    /**
     * Update AI target based on threat assessment
     */
    updateAITarget() {
        // Set AI target to primary threat if we should engage
        if (this.primaryThreat && this.shouldEngageThreat(this.primaryThreat)) {
            this.ai.setTarget(this.primaryThreat.ship);
        } else if (this.ai.currentTarget && !this.shouldContinueEngagement()) {
            // Clear target if we should no longer engage
            this.ai.clearTarget();
        }
    }
    
    /**
     * Determine if we should engage a specific threat
     * @param {Object} threatData - Threat assessment data
     * @returns {boolean} True if we should engage
     */
    shouldEngageThreat(threatData) {
        // Don't engage if we're fleeing or heavily damaged
        if (this.ai.shouldFlee()) return false;
        
        // Engage if threat level is high enough
        if (threatData.threatLevel > 0.4) return true;
        
        // Engage if threat is targeting us
        if (this.isTargetingUs(threatData.ship)) return true;
        
        // Ship-specific engagement rules
        switch (this.ship.shipType) {
            case 'scout':
                // Scouts only engage if they have backup or target is weak
                return threatData.threatLevel < 0.6 || this.hasNearbyAllies();
            
            case 'light_fighter':
            case 'heavy_fighter':
                // Fighters are aggressive
                return threatData.threatLevel > 0.3;
            
            case 'carrier':
                // Carriers avoid direct engagement
                return false;
            
            default:
                return threatData.threatLevel > 0.5;
        }
    }
    
    /**
     * Determine if we should continue current engagement
     * @returns {boolean} True if we should continue
     */
    shouldContinueEngagement() {
        if (!this.ai.currentTarget) return false;
        
        const currentThreat = this.currentThreats.get(this.ai.currentTarget);
        if (!currentThreat) return false; // Target no longer detected
        
        // Continue if still a significant threat
        return currentThreat.threatLevel > 0.2;
    }
    
    /**
     * Check if we have nearby allies
     * @returns {boolean} True if allies are nearby
     */
    hasNearbyAllies() {
        let allyCount = 0;
        
        for (const nearbyShip of this.ai.nearbyShips) {
            if (nearbyShip.ship.diplomacy === this.ship.diplomacy && 
                nearbyShip.distance < 2000) {
                allyCount++;
            }
        }
        
        return allyCount > 0;
    }
    
    /**
     * Get the current overall threat level
     * @returns {number} Overall threat level (0-1)
     */
    getCurrentThreatLevel() {
        if (this.currentThreats.size === 0) return 0;
        
        let totalThreat = 0;
        let threatCount = 0;
        
        for (const threatData of this.currentThreats.values()) {
            totalThreat += threatData.threatLevel;
            threatCount++;
        }
        
        return threatCount > 0 ? totalThreat / threatCount : 0;
    }
    
    /**
     * Get all current threats sorted by threat level
     * @returns {Array} Array of threat data objects
     */
    getCurrentThreats() {
        return Array.from(this.currentThreats.values())
            .sort((a, b) => b.threatLevel - a.threatLevel);
    }
    
    /**
     * Get the primary threat
     * @returns {Object|null} Primary threat data or null
     */
    getPrimaryThreat() {
        return this.primaryThreat;
    }
    
    /**
     * Get threat level for a specific ship
     * @param {Object} ship - Ship to check
     * @returns {number} Threat level or 0 if not assessed
     */
    getThreatLevel(ship) {
        const threatData = this.currentThreats.get(ship);
        return threatData ? threatData.threatLevel : 0;
    }
    
    /**
     * Check if a ship is considered a threat
     * @param {Object} ship - Ship to check
     * @returns {boolean} True if ship is a threat
     */
    isThreat(ship) {
        return this.getThreatLevel(ship) > 0.2; // 20% threat threshold
    }
    
    /**
     * Get threat assessment factors for debugging
     * @param {Object} ship - Ship to get factors for
     * @returns {Object|null} Threat factors or null
     */
    getThreatFactors(ship) {
        const threatData = this.currentThreats.get(ship);
        return threatData ? threatData.factors : null;
    }
    
    /**
     * Cleanup when destroyed
     */
    destroy() {
        this.currentThreats.clear();
        this.threatHistory.clear();
        this.primaryThreat = null;
        this.ai = null;
        this.ship = null;
    }
}

export default ThreatAssessment;
