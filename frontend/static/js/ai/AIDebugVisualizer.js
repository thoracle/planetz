/**
 * AIDebugVisualizer.js
 * 
 * Visual debugging system for Enemy AI. Creates 3D overlays, debug information,
 * and visual indicators for AI states, targeting, and behavior analysis.
 */

import * as THREE from 'three';

export class AIDebugVisualizer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enabled = false;
        
        // Debug visualization objects
        this.debugObjects = new Map(); // aiId -> debug objects
        this.debugLines = new Map(); // aiId -> line objects
        this.debugLabels = new Map(); // aiId -> label objects
        this.sensorRanges = new Map(); // aiId -> sensor range circles
        this.weaponRanges = new Map(); // aiId -> weapon range circles
        
        // Materials for different states and information
        this.materials = this.createDebugMaterials();
        
        // Debug settings
        this.showSensorRanges = true;
        this.showWeaponRanges = true;
        this.showTargetingLines = true;
        this.showStateLabels = true;
        this.showVelocityVectors = true;
        this.showFlockingForces = true;
        this.showThreatLevels = true;
        
        // Performance tracking
        this.debugObjectCount = 0;
        this.maxDebugObjects = 200; // Limit for performance
        
        console.log('🎨 AIDebugVisualizer initialized');
    }
    
    /**
     * Create materials for different debug visualizations
     */
    createDebugMaterials() {
        return {
            // AI State materials
            idle: new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 }),
            engage: new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 }),
            evade: new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }),
            flee: new THREE.LineBasicMaterial({ color: 0xff0088, transparent: true, opacity: 0.8 }),
            buzz: new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.8 }),
            
            // Range materials
            sensorRange: new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 }),
            weaponRange: new THREE.LineBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.4 }),
            
            // Targeting materials
            targetLine: new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 }),
            predictedTarget: new THREE.LineBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0.5 }),
            
            // Velocity and force vectors
            velocity: new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }),
            acceleration: new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 }),
            flockingForce: new THREE.LineBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.6 }),
            
            // Threat level materials
            lowThreat: new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.3 }),
            mediumThreat: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.4 }),
            highThreat: new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 }),
            
            // LOD indicators
            highLOD: new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 }),
            mediumLOD: new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 }),
            lowLOD: new THREE.LineBasicMaterial({ color: 0xff8800, linewidth: 1 }),
            culledLOD: new THREE.LineBasicMaterial({ color: 0x888888, linewidth: 1 })
        };
    }
    
    /**
     * Enable or disable debug visualization
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            this.clearAllDebugObjects();
        }
        
        console.log(`🎨 AI Debug Visualization ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Update debug visualization for all AIs
     */
    update(aiInstances, playerPosition) {
        if (!this.enabled) return;
        
        // Clear old debug objects
        this.clearStaleDebugObjects(aiInstances);
        
        // Update debug visualization for each AI
        aiInstances.forEach(ai => {
            if (ai && ai.ship && ai.ship.position) {
                this.updateAIDebugVisualization(ai, playerPosition);
            }
        });
        
        // Limit number of debug objects for performance
        this.limitDebugObjects();
    }
    
    /**
     * Update debug visualization for a single AI
     */
    updateAIDebugVisualization(ai, playerPosition) {
        const aiId = ai.ship.id || ai.ship.uuid || Math.random().toString(36);
        
        // Update state indicator
        if (this.showStateLabels) {
            this.updateStateIndicator(aiId, ai);
        }
        
        // Update sensor range
        if (this.showSensorRanges) {
            this.updateSensorRange(aiId, ai);
        }
        
        // Update weapon range
        if (this.showWeaponRanges) {
            this.updateWeaponRange(aiId, ai);
        }
        
        // Update targeting lines
        if (this.showTargetingLines) {
            this.updateTargetingLines(aiId, ai);
        }
        
        // Update velocity vectors
        if (this.showVelocityVectors) {
            this.updateVelocityVectors(aiId, ai);
        }
        
        // Update flocking forces
        if (this.showFlockingForces && ai.flockId) {
            this.updateFlockingForces(aiId, ai);
        }
        
        // Update threat level indicators
        if (this.showThreatLevels) {
            this.updateThreatIndicators(aiId, ai);
        }
        
        // Update LOD indicator
        this.updateLODIndicator(aiId, ai, playerPosition);
    }
    
    /**
     * Update state indicator above AI ship
     */
    updateStateIndicator(aiId, ai) {
        const position = ai.ship.position.clone();
        position.y += 2; // Above the ship
        
        // Create or update text sprite (simplified - would use actual text rendering)
        const stateInfo = {
            state: ai.stateMachine?.currentState || 'unknown',
            combat: ai.combatBehavior?.getCombatState() || 'idle',
            threat: (ai.threatAssessment?.getCurrentThreatLevel() * 100).toFixed(0) + '%',
            health: ((ai.ship.currentHull / ai.ship.maxHull) * 100).toFixed(0) + '%'
        };
        
        // Create state indicator geometry (simple box for now)
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = this.materials[stateInfo.state] || this.materials.idle;
        
        let stateIndicator = this.debugObjects.get(`${aiId}_state`);
        if (!stateIndicator) {
            stateIndicator = new THREE.Mesh(geometry, material);
            this.scene.add(stateIndicator);
            this.debugObjects.set(`${aiId}_state`, stateIndicator);
        }
        
        stateIndicator.position.copy(position);
        stateIndicator.material = material;
    }
    
    /**
     * Update sensor range visualization
     */
    updateSensorRange(aiId, ai) {
        const sensorRange = ai.sensorRange || 5;
        const geometry = new THREE.RingGeometry(sensorRange * 0.95, sensorRange, 32);
        const material = this.materials.sensorRange;
        
        let sensorCircle = this.sensorRanges.get(aiId);
        if (!sensorCircle) {
            sensorCircle = new THREE.Mesh(geometry, material);
            sensorCircle.rotation.x = -Math.PI / 2; // Lay flat
            this.scene.add(sensorCircle);
            this.sensorRanges.set(aiId, sensorCircle);
        }
        
        sensorCircle.position.copy(ai.ship.position);
        sensorCircle.position.y = ai.ship.position.y; // Keep at ship level
    }
    
    /**
     * Update weapon range visualization
     */
    updateWeaponRange(aiId, ai) {
        const weaponRange = ai.weaponTargeting?.getWeaponConfig()?.range || ai.engageRange || 1.5;
        const geometry = new THREE.RingGeometry(weaponRange * 0.95, weaponRange, 24);
        const material = this.materials.weaponRange;
        
        let weaponCircle = this.weaponRanges.get(aiId);
        if (!weaponCircle) {
            weaponCircle = new THREE.Mesh(geometry, material);
            weaponCircle.rotation.x = -Math.PI / 2;
            this.scene.add(weaponCircle);
            this.weaponRanges.set(aiId, weaponCircle);
        }
        
        weaponCircle.position.copy(ai.ship.position);
        weaponCircle.position.y = ai.ship.position.y;
    }
    
    /**
     * Update targeting lines
     */
    updateTargetingLines(aiId, ai) {
        const currentTarget = ai.currentTarget || ai.weaponTargeting?.getCurrentTarget();
        
        // Remove old targeting line
        const oldLine = this.debugLines.get(`${aiId}_target`);
        if (oldLine) {
            this.scene.remove(oldLine);
            this.debugLines.delete(`${aiId}_target`);
        }
        
        if (currentTarget && currentTarget.position) {
            // Create targeting line
            const points = [ai.ship.position, currentTarget.position];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, this.materials.targetLine);
            
            this.scene.add(line);
            this.debugLines.set(`${aiId}_target`, line);
            
            // Add predicted target position if available
            const aimPoint = ai.weaponTargeting?.getAimPoint();
            if (aimPoint) {
                const predPoints = [ai.ship.position, aimPoint];
                const predGeometry = new THREE.BufferGeometry().setFromPoints(predPoints);
                const predLine = new THREE.Line(predGeometry, this.materials.predictedTarget);
                
                this.scene.add(predLine);
                this.debugLines.set(`${aiId}_predicted`, predLine);
            }
        }
    }
    
    /**
     * Update velocity and acceleration vectors
     */
    updateVelocityVectors(aiId, ai) {
        // Velocity vector
        if (ai.velocity && ai.velocity.length() > 0.1) {
            const velocityEnd = ai.ship.position.clone().add(ai.velocity.clone().multiplyScalar(2));
            const velPoints = [ai.ship.position, velocityEnd];
            const velGeometry = new THREE.BufferGeometry().setFromPoints(velPoints);
            
            let velLine = this.debugLines.get(`${aiId}_velocity`);
            if (!velLine) {
                velLine = new THREE.Line(velGeometry, this.materials.velocity);
                this.scene.add(velLine);
                this.debugLines.set(`${aiId}_velocity`, velLine);
            } else {
                velLine.geometry.setFromPoints(velPoints);
            }
        }
        
        // Acceleration vector
        if (ai.acceleration && ai.acceleration.length() > 0.1) {
            const accelEnd = ai.ship.position.clone().add(ai.acceleration.clone().multiplyScalar(5));
            const accelPoints = [ai.ship.position, accelEnd];
            const accelGeometry = new THREE.BufferGeometry().setFromPoints(accelPoints);
            
            let accelLine = this.debugLines.get(`${aiId}_acceleration`);
            if (!accelLine) {
                accelLine = new THREE.Line(accelGeometry, this.materials.acceleration);
                this.scene.add(accelLine);
                this.debugLines.set(`${aiId}_acceleration`, accelLine);
            } else {
                accelLine.geometry.setFromPoints(accelPoints);
            }
        }
    }
    
    /**
     * Update flocking force visualization
     */
    updateFlockingForces(aiId, ai) {
        if (!ai.flockingBehavior) return;
        
        // Get flocking forces (this would need to be exposed by FlockingBehavior)
        // For now, show a simple indicator
        const flockCenter = ai.ship.position.clone();
        flockCenter.y += 1;
        
        const geometry = new THREE.SphereGeometry(0.1);
        const material = this.materials.flockingForce;
        
        let flockIndicator = this.debugObjects.get(`${aiId}_flock`);
        if (!flockIndicator) {
            flockIndicator = new THREE.Mesh(geometry, material);
            this.scene.add(flockIndicator);
            this.debugObjects.set(`${aiId}_flock`, flockIndicator);
        }
        
        flockIndicator.position.copy(flockCenter);
    }
    
    /**
     * Update threat level indicators
     */
    updateThreatIndicators(aiId, ai) {
        const threatLevel = ai.threatAssessment?.getCurrentThreatLevel() || 0;
        
        if (threatLevel > 0.1) {
            let material;
            if (threatLevel < 0.3) material = this.materials.lowThreat;
            else if (threatLevel < 0.7) material = this.materials.mediumThreat;
            else material = this.materials.highThreat;
            
            const radius = 0.5 + threatLevel * 1.5; // Scale with threat level
            const geometry = new THREE.SphereGeometry(radius, 8, 6);
            
            let threatIndicator = this.debugObjects.get(`${aiId}_threat`);
            if (!threatIndicator) {
                threatIndicator = new THREE.Mesh(geometry, material);
                this.scene.add(threatIndicator);
                this.debugObjects.set(`${aiId}_threat`, threatIndicator);
            }
            
            threatIndicator.position.copy(ai.ship.position);
            threatIndicator.position.y += 3;
            threatIndicator.material = material;
            threatIndicator.geometry = geometry;
        }
    }
    
    /**
     * Update LOD (Level of Detail) indicator
     */
    updateLODIndicator(aiId, ai, playerPosition) {
        if (!playerPosition) return;
        
        const distance = ai.ship.position.distanceTo(playerPosition);
        let lodLevel, material;
        
        if (distance <= 10) {
            lodLevel = 'high';
            material = this.materials.highLOD;
        } else if (distance <= 25) {
            lodLevel = 'medium';
            material = this.materials.mediumLOD;
        } else if (distance <= 50) {
            lodLevel = 'low';
            material = this.materials.lowLOD;
        } else {
            lodLevel = 'culled';
            material = this.materials.culledLOD;
        }
        
        // Create LOD indicator ring around ship
        const geometry = new THREE.RingGeometry(1.8, 2.0, 8);
        
        let lodIndicator = this.debugObjects.get(`${aiId}_lod`);
        if (!lodIndicator) {
            lodIndicator = new THREE.Mesh(geometry, material);
            lodIndicator.rotation.x = -Math.PI / 2;
            this.scene.add(lodIndicator);
            this.debugObjects.set(`${aiId}_lod`, lodIndicator);
        }
        
        lodIndicator.position.copy(ai.ship.position);
        lodIndicator.material = material;
    }
    
    /**
     * Clear stale debug objects for AIs that no longer exist
     */
    clearStaleDebugObjects(activeAIs) {
        const activeAIIds = new Set();
        activeAIs.forEach(ai => {
            if (ai && ai.ship) {
                const aiId = ai.ship.id || ai.ship.uuid || Math.random().toString(36);
                activeAIIds.add(aiId);
            }
        });
        
        // Remove debug objects for inactive AIs
        for (const [key, obj] of this.debugObjects.entries()) {
            const aiId = key.split('_')[0];
            if (!activeAIIds.has(aiId)) {
                this.scene.remove(obj);
                this.debugObjects.delete(key);
            }
        }
        
        for (const [key, obj] of this.debugLines.entries()) {
            const aiId = key.split('_')[0];
            if (!activeAIIds.has(aiId)) {
                this.scene.remove(obj);
                this.debugLines.delete(key);
            }
        }
        
        for (const [aiId, obj] of this.sensorRanges.entries()) {
            if (!activeAIIds.has(aiId)) {
                this.scene.remove(obj);
                this.sensorRanges.delete(aiId);
            }
        }
        
        for (const [aiId, obj] of this.weaponRanges.entries()) {
            if (!activeAIIds.has(aiId)) {
                this.scene.remove(obj);
                this.weaponRanges.delete(aiId);
            }
        }
    }
    
    /**
     * Limit number of debug objects for performance
     */
    limitDebugObjects() {
        const totalObjects = this.debugObjects.size + this.debugLines.size + 
                           this.sensorRanges.size + this.weaponRanges.size;
        
        if (totalObjects > this.maxDebugObjects) {
            console.warn(`🎨 Debug object limit exceeded: ${totalObjects}/${this.maxDebugObjects}`);
            // Could implement object culling based on distance or importance
        }
        
        this.debugObjectCount = totalObjects;
    }
    
    /**
     * Clear all debug objects
     */
    clearAllDebugObjects() {
        // Remove all debug objects from scene
        for (const obj of this.debugObjects.values()) {
            this.scene.remove(obj);
        }
        for (const obj of this.debugLines.values()) {
            this.scene.remove(obj);
        }
        for (const obj of this.sensorRanges.values()) {
            this.scene.remove(obj);
        }
        for (const obj of this.weaponRanges.values()) {
            this.scene.remove(obj);
        }
        
        // Clear all maps
        this.debugObjects.clear();
        this.debugLines.clear();
        this.sensorRanges.clear();
        this.weaponRanges.clear();
        
        this.debugObjectCount = 0;
        console.log('🎨 All debug objects cleared');
    }
    
    /**
     * Configure debug visualization options
     */
    configure(options) {
        if (options.showSensorRanges !== undefined) this.showSensorRanges = options.showSensorRanges;
        if (options.showWeaponRanges !== undefined) this.showWeaponRanges = options.showWeaponRanges;
        if (options.showTargetingLines !== undefined) this.showTargetingLines = options.showTargetingLines;
        if (options.showStateLabels !== undefined) this.showStateLabels = options.showStateLabels;
        if (options.showVelocityVectors !== undefined) this.showVelocityVectors = options.showVelocityVectors;
        if (options.showFlockingForces !== undefined) this.showFlockingForces = options.showFlockingForces;
        if (options.showThreatLevels !== undefined) this.showThreatLevels = options.showThreatLevels;
        
        console.log('🎨 Debug visualization configured:', options);
    }
    
    /**
     * Get debug statistics
     */
    getDebugStats() {
        return {
            enabled: this.enabled,
            debugObjectCount: this.debugObjectCount,
            maxDebugObjects: this.maxDebugObjects,
            debugObjects: this.debugObjects.size,
            debugLines: this.debugLines.size,
            sensorRanges: this.sensorRanges.size,
            weaponRanges: this.weaponRanges.size,
            settings: {
                showSensorRanges: this.showSensorRanges,
                showWeaponRanges: this.showWeaponRanges,
                showTargetingLines: this.showTargetingLines,
                showStateLabels: this.showStateLabels,
                showVelocityVectors: this.showVelocityVectors,
                showFlockingForces: this.showFlockingForces,
                showThreatLevels: this.showThreatLevels
            }
        };
    }
    
    /**
     * Cleanup when destroyed
     */
    destroy() {
        this.clearAllDebugObjects();
        
        // Dispose materials
        Object.values(this.materials).forEach(material => {
            if (material.dispose) material.dispose();
        });
        
        this.scene = null;
        this.camera = null;
        console.log('🎨 AIDebugVisualizer destroyed');
    }
}
