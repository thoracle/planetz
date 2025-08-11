/**
 * FormationPatterns.js
 * 
 * Defines structured formation patterns for enemy ship groups.
 * Provides static methods to generate formation positions and behaviors
 * for different tactical scenarios.
 */

import * as THREE from 'three';

export class FormationPatterns {
    
    /**
     * Create a V-Formation pattern
     * @param {THREE.Vector3} leaderPos - Position of formation leader
     * @param {THREE.Vector3} leaderHeading - Heading direction of leader
     * @param {number} spacing - Distance between ships in formation (km)
     * @param {number} wingCount - Number of ships per wing (excluding leader)
     * @returns {Array} Array of formation positions
     */
    static createVFormation(leaderPos, leaderHeading, spacing = 1.5, wingCount = 2) {
        const positions = [];
        
        // Leader takes point position
        positions.push({
            position: leaderPos.clone(),
            role: 'leader',
            index: 0
        });
        
        // Calculate perpendicular vector for wing positioning
        const right = new THREE.Vector3();
        right.crossVectors(leaderHeading, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Create wings alternating left and right
        for (let i = 1; i <= wingCount * 2; i++) {
            const wingPos = leaderPos.clone();
            const isLeftWing = i % 2 === 1;
            const wingIndex = Math.ceil(i / 2);
            
            // Position behind and to the side of leader
            wingPos.add(leaderHeading.clone().multiplyScalar(-spacing * wingIndex));
            wingPos.add(right.clone().multiplyScalar(
                (isLeftWing ? -1 : 1) * spacing * wingIndex * 0.8
            ));
            
            positions.push({
                position: wingPos,
                role: isLeftWing ? 'left_wing' : 'right_wing',
                index: i,
                wingIndex: wingIndex
            });
        }
        
        return positions;
    }
    
    /**
     * Create an Escort Formation (protective diamond around leader)
     * @param {THREE.Vector3} leaderPos - Position of ship being escorted
     * @param {THREE.Vector3} leaderHeading - Heading direction
     * @param {number} radius - Distance from leader to escorts (km)
     * @param {number} escortCount - Number of escort ships
     * @returns {Array} Array of formation positions
     */
    static createEscortFormation(leaderPos, leaderHeading, radius = 2.0, escortCount = 4) {
        const positions = [];
        
        // Leader (being escorted) at center
        positions.push({
            position: leaderPos.clone(),
            role: 'protected',
            index: 0
        });
        
        // Calculate base vectors
        const forward = leaderHeading.clone().normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        
        // Standard escort positions
        const escortOffsets = [
            { offset: forward.clone().multiplyScalar(radius), role: 'point_guard' },
            { offset: forward.clone().multiplyScalar(-radius), role: 'rear_guard' },
            { offset: right.clone().multiplyScalar(radius), role: 'right_flank' },
            { offset: right.clone().multiplyScalar(-radius), role: 'left_flank' }
        ];
        
        // Add vertical escorts if more than 4 requested
        if (escortCount > 4) {
            escortOffsets.push({ offset: up.clone().multiplyScalar(radius), role: 'top_cover' });
            escortOffsets.push({ offset: up.clone().multiplyScalar(-radius), role: 'bottom_cover' });
        }
        
        // Create escort positions
        for (let i = 0; i < Math.min(escortCount, escortOffsets.length); i++) {
            const escortPos = leaderPos.clone().add(escortOffsets[i].offset);
            
            positions.push({
                position: escortPos,
                role: escortOffsets[i].role,
                index: i + 1
            });
        }
        
        return positions;
    }
    
    /**
     * Create a Carrier Battle Group formation
     * @param {THREE.Vector3} carrierPos - Position of carrier
     * @param {THREE.Vector3} carrierHeading - Heading direction
     * @param {Object} config - Formation configuration
     * @returns {Array} Array of formation positions
     */
    static createCarrierBattleGroup(carrierPos, carrierHeading, config = {}) {
        const positions = [];
        const {
            escortRadius = 3.0,
            screenRadius = 5.0,
            fighterRadius = 1.5,
            escortCount = 4,
            screenCount = 6,
            fighterCount = 8
        } = config;
        
        // Carrier at center
        positions.push({
            position: carrierPos.clone(),
            role: 'carrier',
            index: 0,
            priority: 'critical'
        });
        
        // Close escorts (heavy fighters)
        const escorts = this.createEscortFormation(carrierPos, carrierHeading, escortRadius, escortCount);
        escorts.slice(1).forEach((escort, i) => {
            positions.push({
                ...escort,
                role: 'heavy_escort',
                shipType: 'heavy_fighter',
                priority: 'high'
            });
        });
        
        // Outer screen (light fighters)
        const screenPositions = this.createCircularScreen(carrierPos, carrierHeading, screenRadius, screenCount);
        screenPositions.forEach((screen, i) => {
            positions.push({
                ...screen,
                role: 'outer_screen',
                shipType: 'light_fighter',
                priority: 'medium'
            });
        });
        
        // Fighter patrol pattern
        const fighters = this.createFighterPatrol(carrierPos, carrierHeading, fighterRadius, fighterCount);
        fighters.forEach((fighter, i) => {
            positions.push({
                ...fighter,
                role: 'fighter_patrol',
                shipType: 'light_fighter',
                priority: 'low'
            });
        });
        
        return positions;
    }
    
    /**
     * Create circular screen formation
     */
    static createCircularScreen(centerPos, heading, radius, count) {
        const positions = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            const offset = new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            
            positions.push({
                position: centerPos.clone().add(offset),
                role: 'screen',
                index: i,
                angle: angle
            });
        }
        
        return positions;
    }
    
    /**
     * Create fighter patrol pattern
     */
    static createFighterPatrol(centerPos, heading, radius, count) {
        const positions = [];
        const pairsCount = Math.floor(count / 2);
        
        for (let i = 0; i < pairsCount; i++) {
            const angle = (i / pairsCount) * Math.PI * 2;
            const pairRadius = radius * (0.7 + 0.3 * Math.random()); // Slight variation
            
            // Create fighter pair
            for (let j = 0; j < 2; j++) {
                const offset = new THREE.Vector3(
                    Math.cos(angle) * pairRadius + (j === 0 ? -0.3 : 0.3),
                    (Math.random() - 0.5) * 0.5, // Slight vertical spread
                    Math.sin(angle) * pairRadius
                );
                
                positions.push({
                    position: centerPos.clone().add(offset),
                    role: 'patrol',
                    index: i * 2 + j,
                    pairId: i,
                    wingman: j === 1
                });
            }
        }
        
        return positions;
    }
    
    /**
     * Create line abreast formation (ships side by side)
     * @param {THREE.Vector3} centerPos - Center position of line
     * @param {THREE.Vector3} heading - Direction the line faces
     * @param {number} spacing - Distance between ships
     * @param {number} count - Number of ships in line
     * @returns {Array} Array of formation positions
     */
    static createLineAbreast(centerPos, heading, spacing = 2.0, count = 5) {
        const positions = [];
        const right = new THREE.Vector3();
        right.crossVectors(heading, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Calculate starting position for line
        const startOffset = -(count - 1) * spacing / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = right.clone().multiplyScalar(startOffset + i * spacing);
            const shipPos = centerPos.clone().add(offset);
            
            positions.push({
                position: shipPos,
                role: i === Math.floor(count / 2) ? 'line_leader' : 'line_member',
                index: i,
                linePosition: i
            });
        }
        
        return positions;
    }
    
    /**
     * Create column formation (ships in single file)
     * @param {THREE.Vector3} leaderPos - Position of lead ship
     * @param {THREE.Vector3} heading - Direction of movement
     * @param {number} spacing - Distance between ships
     * @param {number} count - Number of ships in column
     * @returns {Array} Array of formation positions
     */
    static createColumn(leaderPos, heading, spacing = 1.5, count = 4) {
        const positions = [];
        const backward = heading.clone().multiplyScalar(-1);
        
        for (let i = 0; i < count; i++) {
            const offset = backward.clone().multiplyScalar(i * spacing);
            const shipPos = leaderPos.clone().add(offset);
            
            positions.push({
                position: shipPos,
                role: i === 0 ? 'column_leader' : 'column_follower',
                index: i,
                columnPosition: i
            });
        }
        
        return positions;
    }
    
    /**
     * Calculate optimal formation based on tactical situation
     * @param {Object} situation - Current tactical context
     * @returns {Object} Recommended formation configuration
     */
    static selectOptimalFormation(situation) {
        const {
            threatLevel,
            groupSize,
            shipTypes,
            mission,
            terrain
        } = situation;
        
        // Formation selection logic
        if (mission === 'escort' || shipTypes.includes('freighter')) {
            return {
                type: 'escort',
                config: { radius: 2.5, escortCount: Math.min(groupSize - 1, 6) }
            };
        } else if (shipTypes.includes('carrier')) {
            return {
                type: 'carrier_battle_group',
                config: { 
                    escortRadius: 3.0,
                    screenRadius: 5.0,
                    fighterRadius: 1.5
                }
            };
        } else if (threatLevel === 'high' || mission === 'attack') {
            return {
                type: 'v_formation',
                config: { spacing: 1.8, wingCount: Math.floor((groupSize - 1) / 2) }
            };
        } else if (terrain === 'open_space') {
            return {
                type: 'line_abreast',
                config: { spacing: 2.5, count: groupSize }
            };
        } else {
            return {
                type: 'column',
                config: { spacing: 1.5, count: groupSize }
            };
        }
    }
    
    /**
     * Update formation positions based on leader movement
     * @param {Array} currentFormation - Current formation data
     * @param {THREE.Vector3} newLeaderPos - Updated leader position
     * @param {THREE.Vector3} newLeaderHeading - Updated leader heading
     * @returns {Array} Updated formation positions
     */
    static updateFormationPositions(currentFormation, newLeaderPos, newLeaderHeading) {
        if (!currentFormation || currentFormation.length === 0) return [];
        
        const formationType = currentFormation[0].formationType || 'v_formation';
        const originalSpacing = currentFormation[0].spacing || 1.5;
        
        // Regenerate formation with new leader position and heading
        switch (formationType) {
            case 'v_formation':
                const wingCount = Math.floor((currentFormation.length - 1) / 2);
                return this.createVFormation(newLeaderPos, newLeaderHeading, originalSpacing, wingCount);
                
            case 'escort':
                const escortCount = currentFormation.length - 1;
                return this.createEscortFormation(newLeaderPos, newLeaderHeading, originalSpacing, escortCount);
                
            case 'line_abreast':
                return this.createLineAbreast(newLeaderPos, newLeaderHeading, originalSpacing, currentFormation.length);
                
            case 'column':
                return this.createColumn(newLeaderPos, newLeaderHeading, originalSpacing, currentFormation.length);
                
            default:
                return this.createVFormation(newLeaderPos, newLeaderHeading, originalSpacing, 2);
        }
    }
}
