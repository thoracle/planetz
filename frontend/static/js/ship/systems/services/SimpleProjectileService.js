/**
 * SimpleProjectileService - Three.js-based projectile system
 * 
 * Philosophy: Visual projectiles with emulated flight time + instant hit detection
 * No complex physics - just visual trajectory and Three.js collision detection
 */

import * as THREE from 'three';

const DEBUG_PROJECTILES = false;

export class SimpleProjectile {
    constructor(config) {
        this.weaponName = config.weaponName || 'Projectile';
        this.damage = config.damage || 100;
        this.blastRadius = config.blastRadius || 0;
        this.isHoming = config.isHoming || false;
        this.flightTime = config.flightTime || 1.5; // seconds to reach target
        
        // Positions
        this.startPosition = new THREE.Vector3(config.origin.x, config.origin.y, config.origin.z);
        this.targetPosition = config.targetPosition ? 
            new THREE.Vector3(config.targetPosition.x, config.targetPosition.y, config.targetPosition.z) :
            null;
        this.currentPosition = this.startPosition.clone();
        
        // Visual properties
        this.scene = config.scene || window.starfieldManager?.scene;
        this.mesh = null;
        this.trail = [];
        
        // Animation properties
        this.launchTime = Date.now();
        this.hasImpacted = false;
        this.target = config.target;
        
        // Create visual mesh
        this.createVisualMesh();
        
        // Perform instant hit detection to determine final impact point
        this.calculateImpactPoint(config.origin, config.direction, config.maxRange);
        
        if (DEBUG_PROJECTILES) {
            console.log(`🚀 ${this.weaponName}: Created simple projectile`);
            console.log(`  - Flight time: ${this.flightTime}s`);
            console.log(`  - Target: ${this.targetPosition ? 'Found' : 'None'}`);
        }
    }
    
    /**
     * Use HitScanService to instantly determine where projectile will hit
     */
    calculateImpactPoint(origin, direction, maxRange) {
        // Use our existing HitScanService for instant collision detection
        if (window.HitScanService) {
            const originVec = new THREE.Vector3(origin.x, origin.y, origin.z);
            const dirVec = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
            const maxRangeKm = (maxRange || 15000) / 1000; // Convert to km
            
            const hitResult = window.HitScanService.performHitScan(originVec, dirVec, maxRangeKm, null);
            
            if (hitResult && hitResult.hit) {
                this.targetPosition = hitResult.hitPoint.clone();
                this.hitTarget = hitResult.metadata;
                
                if (DEBUG_PROJECTILES) {
                    console.log(`🎯 ${this.weaponName}: Hit detected at (${this.targetPosition.x.toFixed(1)}, ${this.targetPosition.y.toFixed(1)}, ${this.targetPosition.z.toFixed(1)})`);
                }
            } else {
                // No hit - projectile travels max range
                this.targetPosition = originVec.clone().add(dirVec.multiplyScalar(maxRangeKm * 1000));
                this.hitTarget = null;
                
                if (DEBUG_PROJECTILES) {
                    console.log(`🚀 ${this.weaponName}: No hit - traveling to max range`);
                }
            }
        } else {
            console.warn(`⚠️ ${this.weaponName}: HitScanService not available`);
            // Fallback: travel in direction for max range
            const originVec = new THREE.Vector3(origin.x, origin.y, origin.z);
            const dirVec = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
            this.targetPosition = originVec.clone().add(dirVec.multiplyScalar(15000)); // 15km default
        }
    }
    
    /**
     * Create visual mesh for projectile
     */
    createVisualMesh() {
        if (!this.scene) return;
        
        const THREE = window.THREE;
        if (!THREE) return;
        
        // Create glowing projectile mesh
        const geometry = new THREE.SphereGeometry(2, 8, 6); // 2m radius, low poly
        const material = new THREE.MeshBasicMaterial({ 
            color: this.getProjectileColor(),
            emissive: this.getProjectileColor(),
            emissiveIntensity: 0.3
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.startPosition);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(4, 8, 6); // Larger glow
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.getProjectileColor(),
            transparent: true,
            opacity: 0.2
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glowMesh);
        
        this.scene.add(this.mesh);
        
        if (DEBUG_PROJECTILES) {
            console.log(`✨ ${this.weaponName}: Visual mesh created and added to scene`);
        }
    }
    
    /**
     * Get projectile color based on weapon type
     */
    getProjectileColor() {
        if (this.weaponName.toLowerCase().includes('missile')) return 0xff4444; // Red
        if (this.weaponName.toLowerCase().includes('torpedo')) return 0x44ff44; // Green  
        if (this.weaponName.toLowerCase().includes('homing')) return 0xffff44; // Yellow
        return 0x4444ff; // Blue default
    }
    
    /**
     * Update projectile animation
     */
    update(deltaTime) {
        if (this.hasImpacted || !this.targetPosition || !this.mesh) return false;
        
        const elapsedTime = (Date.now() - this.launchTime) / 1000;
        const progress = Math.min(elapsedTime / this.flightTime, 1.0);
        
        // Simple linear interpolation for smooth movement
        this.currentPosition.lerpVectors(this.startPosition, this.targetPosition, progress);
        this.mesh.position.copy(this.currentPosition);
        
        // Rotate mesh to face movement direction if homing
        if (this.isHoming && progress < 0.9) {
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.currentPosition)
                .normalize();
            this.mesh.lookAt(this.currentPosition.clone().add(direction));
        }
        
        // Check for impact
        if (progress >= 1.0) {
            this.impact();
            return false; // Remove from updates
        }
        
        return true; // Continue updating
    }
    
    /**
     * Handle projectile impact
     */
    impact() {
        if (this.hasImpacted) return;
        this.hasImpacted = true;
        
        if (DEBUG_PROJECTILES) {
            console.log(`💥 ${this.weaponName}: Impact at (${this.targetPosition.x.toFixed(1)}, ${this.targetPosition.y.toFixed(1)}, ${this.targetPosition.z.toFixed(1)})`);
        }
        
        // Apply damage if we hit a target
        if (this.hitTarget) {
            this.applyDamage();
        }
        
        // Create explosion effect
        this.createExplosionEffect();
        
        // Remove visual mesh
        this.cleanup();
    }
    
    /**
     * Apply damage to hit target
     */
    applyDamage() {
        if (!this.hitTarget) return;
        
        // Find the actual target object for damage application
        const targetShip = this.findTargetShip();
        if (targetShip) {
            if (DEBUG_PROJECTILES) {
                console.log(`💥 ${this.weaponName}: Applying ${this.damage} damage to ${targetShip.shipName || 'target'}`);
            }
            
            // Apply damage to target
            if (targetShip.takeDamage) {
                targetShip.takeDamage(this.damage, this.weaponName);
            } else if (targetShip.hull) {
                targetShip.hull.current = Math.max(0, targetShip.hull.current - this.damage);
            }
            
            // Show damage feedback
            this.showDamageEffects(targetShip);
        }
    }
    
    /**
     * Find the actual ship object from hit metadata
     */
    findTargetShip() {
        // Try to find target ship in dummy ships
        if (window.starfieldManager?.dummyShipMeshes) {
            for (const dummyMesh of window.starfieldManager.dummyShipMeshes) {
                if (dummyMesh.userData?.ship) {
                    const ship = dummyMesh.userData.ship;
                    const shipPos = dummyMesh.position;
                    const distance = shipPos.distanceTo(this.targetPosition);
                    
                    if (distance < 50) { // Within 50m of impact point
                        return ship;
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Show damage effects on target
     */
    showDamageEffects(targetShip) {
        // Flash target briefly
        // This could be enhanced with particle effects, screen shake, etc.
        
        // Show damage number if available
        if (window.starfieldManager?.weaponHUD) {
            window.starfieldManager.weaponHUD.showMessage(
                `${this.weaponName} Hit!`,
                `${this.damage} damage`,
                2000
            );
        }
    }
    
    /**
     * Create explosion effect at impact point
     */
    createExplosionEffect() {
        if (!this.scene) return;
        
        // Simple explosion effect - could be enhanced with WeaponEffectsManager
        if (window.starfieldManager?.weaponEffectsManager) {
            try {
                // Use existing explosion effects
                window.starfieldManager.weaponEffectsManager.createExplosion(
                    this.targetPosition,
                    this.blastRadius || 20,
                    this.getProjectileColor()
                );
            } catch (e) {
                if (DEBUG_PROJECTILES) {
                    console.log(`⚠️ ${this.weaponName}: Could not create explosion effect:`, e);
                }
            }
        }
    }
    
    /**
     * Clean up projectile resources
     */
    cleanup() {
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}

/**
 * Simple projectile manager for tracking active projectiles
 */
export class SimpleProjectileManager {
    constructor() {
        this.activeProjectiles = [];
        this.lastUpdate = Date.now();
    }
    
    /**
     * Add projectile to manager
     */
    addProjectile(projectile) {
        this.activeProjectiles.push(projectile);
        
        if (DEBUG_PROJECTILES) {
            console.log(`🎯 ProjectileManager: Added ${projectile.weaponName}, ${this.activeProjectiles.length} active`);
        }
    }
    
    /**
     * Update all active projectiles
     */
    update() {
        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;
        
        // Update all projectiles, remove finished ones
        this.activeProjectiles = this.activeProjectiles.filter(projectile => 
            projectile.update(deltaTime)
        );
    }
    
    /**
     * Get count of active projectiles
     */
    getActiveCount() {
        return this.activeProjectiles.length;
    }
    
    /**
     * Clear all projectiles
     */
    clear() {
        this.activeProjectiles.forEach(projectile => projectile.cleanup());
        this.activeProjectiles = [];
    }
}

// Create global projectile manager and expose classes
if (typeof window !== 'undefined') {
    window.simpleProjectileManager = new SimpleProjectileManager();
    window.SimpleProjectile = SimpleProjectile;
    window.SimpleProjectileManager = SimpleProjectileManager;
    console.log('🚀 SimpleProjectileService loaded - Three.js projectile system');
}

export { SimpleProjectile };
