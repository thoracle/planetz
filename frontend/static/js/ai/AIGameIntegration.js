/**
 * AIGameIntegration.js
 * 
 * Utility functions and systems for integrating Enemy AI with the broader game world.
 * Handles damage application, physics integration, audio/visual effects, and game events.
 */

import * as THREE from 'three';

export class AIGameIntegration {
    constructor(scene, audioManager, effectsManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.effectsManager = effectsManager;
        
        // Integration settings
        this.enableDamageApplication = true;
        this.enablePhysicsIntegration = true;
        this.enableAudioEffects = true;
        this.enableVisualEffects = true;
        
        // Damage system configuration
        this.damageMultipliers = {
            scout: 0.8,          // Scouts take less damage
            light_fighter: 1.0,  // Standard damage
            heavy_fighter: 1.2,  // Heavy fighters take more damage but have more hull
            carrier: 0.6,        // Carriers are heavily armored
            light_freighter: 1.1, // Freighters are vulnerable
            heavy_freighter: 0.9  // Heavy freighters have some armor
        };
        
        // Physics integration
        this.physicsEnabled = false;
        this.physicsWorld = null;
        
        console.log('🔗 AIGameIntegration initialized');
    }
    
    /**
     * Initialize physics integration
     */
    initializePhysics(physicsWorld) {
        this.physicsWorld = physicsWorld;
        this.physicsEnabled = true;
        console.log('🔗 Physics integration enabled');
    }
    
    /**
     * Apply weapon damage from AI to target
     * @param {Object} attacker - AI ship doing the attacking
     * @param {Object} target - Target being hit
     * @param {Object} weaponData - Weapon information
     * @param {number} hitProbability - Probability this shot hits (0-1)
     * @returns {boolean} Whether hit was successful
     */
    applyWeaponDamage(attacker, target, weaponData, hitProbability) {
        if (!this.enableDamageApplication) return false;
        
        // Determine if shot hits
        const hitRoll = Math.random();
        if (hitRoll > hitProbability) {
            this.createMissEffect(attacker, target, weaponData);
            return false;
        }
        
        // Calculate damage
        const baseDamage = weaponData.damage || 25;
        const targetType = target.shipType || 'unknown';
        const damageMultiplier = this.damageMultipliers[targetType] || 1.0;
        const finalDamage = baseDamage * damageMultiplier;
        
        // Apply damage to target
        this.applyDamageToShip(target, finalDamage, attacker);
        
        // Create hit effects
        this.createHitEffect(attacker, target, weaponData, finalDamage);
        
        // Play audio effects
        this.playWeaponAudio(weaponData, target);
        
        return true;
    }
    
    /**
     * Apply damage to a ship
     */
    applyDamageToShip(ship, damage, attacker) {
        if (!ship.currentHull || !ship.maxHull) {
            // Initialize hull if not present
            ship.maxHull = ship.maxHull || this.getDefaultHullForShipType(ship.shipType);
            ship.currentHull = ship.currentHull || ship.maxHull;
        }
        
        const oldHull = ship.currentHull;
        ship.currentHull = Math.max(0, ship.currentHull - damage);
        
        // Log damage for debugging
        console.log(`💥 ${attacker?.shipType || 'Unknown'} dealt ${damage.toFixed(1)} damage to ${ship.shipType || 'target'} (${ship.currentHull.toFixed(1)}/${ship.maxHull} hull)`);
        
        // Check for ship destruction
        if (ship.currentHull <= 0 && oldHull > 0) {
            this.handleShipDestruction(ship, attacker);
        }
        // Check for critical damage
        else if (ship.currentHull / ship.maxHull < 0.25 && oldHull / ship.maxHull >= 0.25) {
            this.handleCriticalDamage(ship);
        }
    }
    
    /**
     * Get default hull values for ship types
     */
    getDefaultHullForShipType(shipType) {
        const hullValues = {
            scout: 60,
            light_fighter: 80,
            heavy_fighter: 120,
            carrier: 200,
            light_freighter: 70,
            heavy_freighter: 150,
            unknown: 100
        };
        return hullValues[shipType] || 100;
    }
    
    /**
     * Handle ship destruction
     */
    handleShipDestruction(ship, attacker) {
        console.log(`💀 ${ship.shipType || 'Ship'} destroyed by ${attacker?.shipType || 'unknown'}`);
        
        // Create destruction effect
        this.createDestructionEffect(ship);
        
        // Play destruction audio
        this.playDestructionAudio(ship);
        
        // Award points/experience to attacker (if player)
        if (attacker && attacker.isPlayer) {
            this.awardCombatRewards(attacker, ship);
        }
        
        // Remove ship from scene (handled by game manager)
        this.markShipForRemoval(ship);
    }
    
    /**
     * Handle critical damage state
     */
    handleCriticalDamage(ship) {
        console.log(`⚠️ ${ship.shipType || 'Ship'} critically damaged`);
        
        // Create critical damage effects
        this.createCriticalDamageEffect(ship);
        
        // Trigger AI state change if applicable
        if (ship.ai && ship.ai.stateMachine) {
            // Force AI to flee state if critically damaged
            ship.ai.stateMachine.currentState = 'flee';
            ship.ai.stateMachine.stateStartTime = Date.now();
        }
    }
    
    /**
     * Create weapon hit effect
     */
    createHitEffect(attacker, target, weaponData, damage) {
        if (!this.enableVisualEffects || !target.position) return;
        
        const effectType = weaponData.type || 'energy';
        const effectPosition = target.position.clone();
        
        // Add some randomness to hit position
        effectPosition.add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ));
        
        // Create visual effect based on weapon type
        switch (effectType) {
            case 'energy':
            case 'energy_pulse':
            case 'energy_cannon':
                this.createEnergyHitEffect(effectPosition, damage);
                break;
            case 'plasma':
            case 'plasma_cannon':
                this.createPlasmaHitEffect(effectPosition, damage);
                break;
            case 'beam':
            case 'long_range_beam':
                this.createBeamHitEffect(attacker.position, effectPosition, damage);
                break;
            default:
                this.createGenericHitEffect(effectPosition, damage);
        }
    }
    
    /**
     * Create energy weapon hit effect
     */
    createEnergyHitEffect(position, damage) {
        // Create simple particle effect (placeholder)
        const geometry = new THREE.SphereGeometry(0.1 + damage * 0.01);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x44ff44, 
            transparent: true, 
            opacity: 0.8 
        });
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(position);
        
        this.scene.add(effect);
        
        // Animate and remove effect
        this.animateEffect(effect, 500); // 500ms duration
    }
    
    /**
     * Create plasma weapon hit effect
     */
    createPlasmaHitEffect(position, damage) {
        const geometry = new THREE.SphereGeometry(0.15 + damage * 0.015);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff4444, 
            transparent: true, 
            opacity: 0.9 
        });
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(position);
        
        this.scene.add(effect);
        this.animateEffect(effect, 800); // Longer duration for plasma
    }
    
    /**
     * Create beam weapon hit effect
     */
    createBeamHitEffect(startPos, endPos, damage) {
        // Create beam line
        const points = [startPos, endPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xffff44, 
            transparent: true, 
            opacity: 0.8,
            linewidth: 2 + damage * 0.1
        });
        const beam = new THREE.Line(geometry, material);
        
        this.scene.add(beam);
        this.animateEffect(beam, 200); // Quick beam flash
        
        // Add hit effect at impact point
        this.createEnergyHitEffect(endPos, damage);
    }
    
    /**
     * Create generic hit effect
     */
    createGenericHitEffect(position, damage) {
        this.createEnergyHitEffect(position, damage);
    }
    
    /**
     * Create weapon miss effect
     */
    createMissEffect(attacker, target, weaponData) {
        if (!this.enableVisualEffects) return;
        
        // Create a projectile that misses the target
        const startPos = attacker.position.clone();
        const targetPos = target.position.clone();
        
        // Add miss offset
        const missOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 10
        );
        targetPos.add(missOffset);
        
        // Create projectile effect
        this.createProjectileEffect(startPos, targetPos, weaponData);
    }
    
    /**
     * Create projectile effect
     */
    createProjectileEffect(startPos, endPos, weaponData) {
        // Simple projectile visualization
        const geometry = new THREE.SphereGeometry(0.05);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const projectile = new THREE.Mesh(geometry, material);
        projectile.position.copy(startPos);
        
        this.scene.add(projectile);
        
        // Animate projectile movement
        this.animateProjectile(projectile, endPos, weaponData.projectileSpeed || 2.0);
    }
    
    /**
     * Create destruction effect
     */
    createDestructionEffect(ship) {
        if (!this.enableVisualEffects || !ship.position) return;
        
        // Create explosion effect
        const geometry = new THREE.SphereGeometry(2.0);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, 
            transparent: true, 
            opacity: 0.8 
        });
        const explosion = new THREE.Mesh(geometry, material);
        explosion.position.copy(ship.position);
        
        this.scene.add(explosion);
        this.animateExplosion(explosion, 1500); // 1.5 second explosion
    }
    
    /**
     * Create critical damage effect
     */
    createCriticalDamageEffect(ship) {
        if (!this.enableVisualEffects || !ship.position) return;
        
        // Create sparks/smoke effect
        const geometry = new THREE.SphereGeometry(0.5);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, 
            transparent: true, 
            opacity: 0.6 
        });
        const sparks = new THREE.Mesh(geometry, material);
        sparks.position.copy(ship.position);
        sparks.position.y += 1;
        
        this.scene.add(sparks);
        this.animateEffect(sparks, 2000); // 2 second sparks
    }
    
    /**
     * Animate effect with fade out
     */
    animateEffect(effect, duration) {
        const startOpacity = effect.material.opacity;
        const startTime = Date.now();
        const startScale = effect.scale.clone();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(effect);
                if (effect.geometry) effect.geometry.dispose();
                if (effect.material) effect.material.dispose();
                return;
            }
            
            // Fade out
            effect.material.opacity = startOpacity * (1 - progress);
            
            // Scale up slightly
            const scale = 1 + progress * 0.5;
            effect.scale.copy(startScale).multiplyScalar(scale);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Animate projectile movement
     */
    animateProjectile(projectile, targetPos, speed) {
        const startPos = projectile.position.clone();
        const distance = startPos.distanceTo(targetPos);
        const duration = (distance / speed) * 1000; // Convert to milliseconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(projectile);
                if (projectile.geometry) projectile.geometry.dispose();
                if (projectile.material) projectile.material.dispose();
                return;
            }
            
            // Move projectile
            projectile.position.lerpVectors(startPos, targetPos, progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Animate explosion effect
     */
    animateExplosion(explosion, duration) {
        const startTime = Date.now();
        const maxScale = 3.0;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(explosion);
                if (explosion.geometry) explosion.geometry.dispose();
                if (explosion.material) explosion.material.dispose();
                return;
            }
            
            // Scale up and fade out
            const scale = 1 + progress * maxScale;
            explosion.scale.setScalar(scale);
            explosion.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Play weapon audio effects
     */
    playWeaponAudio(weaponData, target) {
        if (!this.enableAudioEffects || !this.audioManager) return;
        
        const audioFile = this.getWeaponAudioFile(weaponData.type);
        if (audioFile) {
            this.audioManager.playSound(audioFile, target.position);
        }
    }
    
    /**
     * Play destruction audio
     */
    playDestructionAudio(ship) {
        if (!this.enableAudioEffects || !this.audioManager) return;
        
        this.audioManager.playSound('explosion.wav', ship.position);
    }
    
    /**
     * Get audio file for weapon type
     */
    getWeaponAudioFile(weaponType) {
        const audioMap = {
            'energy': 'laser_shot.wav',
            'energy_pulse': 'pulse_laser.wav',
            'energy_cannon': 'heavy_laser.wav',
            'plasma': 'plasma_shot.wav',
            'plasma_cannon': 'heavy_plasma.wav',
            'beam': 'beam_weapon.wav',
            'long_range_beam': 'long_beam.wav'
        };
        return audioMap[weaponType] || 'generic_shot.wav';
    }
    
    /**
     * Award combat rewards to player
     */
    awardCombatRewards(player, destroyedShip) {
        // This would integrate with the game's progression system
        console.log(`🎖️ Player destroyed ${destroyedShip.shipType}, awarding rewards`);
        
        // Award experience points
        const xpReward = this.calculateXPReward(destroyedShip);
        
        // Award credits
        const creditReward = this.calculateCreditReward(destroyedShip);
        
        console.log(`  XP: +${xpReward}, Credits: +${creditReward}`);
    }
    
    /**
     * Calculate XP reward for destroying ship
     */
    calculateXPReward(ship) {
        const baseXP = {
            scout: 50,
            light_fighter: 75,
            heavy_fighter: 100,
            carrier: 200,
            light_freighter: 25,
            heavy_freighter: 50
        };
        return baseXP[ship.shipType] || 50;
    }
    
    /**
     * Calculate credit reward for destroying ship
     */
    calculateCreditReward(ship) {
        const baseCredits = {
            scout: 100,
            light_fighter: 150,
            heavy_fighter: 250,
            carrier: 500,
            light_freighter: 75,
            heavy_freighter: 125
        };
        return baseCredits[ship.shipType] || 100;
    }
    
    /**
     * Mark ship for removal from game
     */
    markShipForRemoval(ship) {
        ship.destroyed = true;
        ship.markedForRemoval = true;
        
        // Remove from 3D scene if mesh exists
        if (ship.mesh && this.scene) {
            this.scene.remove(ship.mesh);
        }
    }
    
    /**
     * Configure integration settings
     */
    configure(settings) {
        if (settings.enableDamageApplication !== undefined) {
            this.enableDamageApplication = settings.enableDamageApplication;
        }
        if (settings.enablePhysicsIntegration !== undefined) {
            this.enablePhysicsIntegration = settings.enablePhysicsIntegration;
        }
        if (settings.enableAudioEffects !== undefined) {
            this.enableAudioEffects = settings.enableAudioEffects;
        }
        if (settings.enableVisualEffects !== undefined) {
            this.enableVisualEffects = settings.enableVisualEffects;
        }
        
        console.log('🔗 AI Game Integration configured:', settings);
    }
    
    /**
     * Get integration statistics
     */
    getIntegrationStats() {
        return {
            damageApplicationEnabled: this.enableDamageApplication,
            physicsIntegrationEnabled: this.enablePhysicsIntegration,
            audioEffectsEnabled: this.enableAudioEffects,
            visualEffectsEnabled: this.enableVisualEffects,
            physicsEnabled: this.physicsEnabled
        };
    }
}
