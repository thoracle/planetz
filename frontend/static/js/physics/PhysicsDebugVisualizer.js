/**
 * PhysicsDebugVisualizer
 *
 * Extracted from PhysicsManager to reduce file size.
 * Handles debug visualization of physics collision shapes.
 *
 * Features:
 * - Toggle debug mode
 * - Wireframe creation for collision shapes
 * - Wireframe position updates
 * - Debug console commands
 */

import { debug } from '../debug.js';

export class PhysicsDebugVisualizer {
    /**
     * Create a PhysicsDebugVisualizer
     * @param {Object} physicsManager - Reference to parent PhysicsManager
     */
    constructor(physicsManager) {
        this.pm = physicsManager;
    }

    /**
     * Toggle physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene to add debug wireframes to
     */
    toggleDebugMode(scene) {
        this.pm.debugMode = !this.pm.debugMode;

        if (this.pm.debugMode) {
            debug('PHYSICS', 'Physics debug mode ENABLING - creating wireframes...');
            this.enableDebugVisualization(scene);
            debug('PHYSICS', `🔍 Physics debug mode ENABLED - showing ${this.pm.debugWireframes.size} collision shapes`);
        } else {
            debug('PHYSICS', 'Physics debug mode DISABLING - removing wireframes...');
            this.disableDebugVisualization(scene);
            debug('PHYSICS', 'Physics debug mode DISABLED - hiding collision shapes');
        }

        return this.pm.debugMode;
    }

    /**
     * Disable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene
     */
    disableDebugVisualization(scene) {
        if (this.pm.debugGroup && scene) {
            for (const [rigidBody, wireframe] of this.pm.debugWireframes.entries()) {
                if (wireframe.geometry) wireframe.geometry.dispose();
                if (wireframe.material) wireframe.material.dispose();
            }

            if (this.pm.delayedWireframes) {
                for (const [wireframe, data] of this.pm.delayedWireframes.entries()) {
                    if (wireframe.geometry) wireframe.geometry.dispose();
                    if (wireframe.material) wireframe.material.dispose();
                }
                this.pm.delayedWireframes.clear();
                debug('PERFORMANCE', '🧹 Cleaned up delayed torpedo wireframes');
            }

            if (this.pm._torpedoLogTimestamps) {
                this.pm._torpedoLogTimestamps.clear();
                debug('UTILITY', '🧹 Cleaned up torpedo logging timestamps');
            }

            this.pm.debugWireframes.clear();
            scene.remove(this.pm.debugGroup);
            this.pm.debugGroup = null;

            debug('PHYSICS', '🧹 Disabled physics debug visualization and cleaned up all wireframes');
        }
    }

    /**
     * Enable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene
     */
    enableDebugVisualization(scene) {
        if (!scene || typeof THREE === 'undefined') {
            debug('AI', 'Scene or THREE.js not available for physics debug');
            return;
        }

        console.clear();
        debug('PHYSICS', 'Physics Debug Mode ENABLED - Console cleared');

        if (!this.pm.debugGroup) {
            this.pm.debugGroup = new THREE.Group();
            this.pm.debugGroup.name = 'PhysicsDebugGroup';
            this.pm.debugGroup.renderOrder = 999;
            scene.add(this.pm.debugGroup);
            if (!this.pm._silentMode) {
                debug('PHYSICS', '📦 Created physics debug group');
            }
        }

        let wireframeCount = 0;
        for (const [threeObject, rigidBody] of this.pm.rigidBodies.entries()) {
            this.createDebugWireframe(rigidBody, threeObject);
            wireframeCount++;
        }

        if (!this.pm._silentMode && this.pm._debugLoggingEnabled) {
            debug('PERFORMANCE', `🔍 Forcing immediate wireframe position update...`);
        }
        this.updateDebugVisualization();

        if (!this.pm._silentMode) {
            debug('PHYSICS', `👁️ PHYSICS DEBUG WIREFRAMES NOW VISIBLE`);
            debug('PERFORMANCE', `   • Enemy ships: MAGENTA wireframes`);
            debug('PERFORMANCE', `   • Celestial bodies (stars): ORANGE wireframes`);
            debug('PERFORMANCE', `   • Celestial bodies (planets): YELLOW wireframes`);
            debug('PERFORMANCE', `   • Torpedo projectiles: BRIGHT MAGENTA/RED-PINK wireframes`);
            debug('PERFORMANCE', `   • Missile projectiles: BRIGHT ORANGE/RED-ORANGE wireframes`);
            debug('PERFORMANCE', `   • Other projectiles: CYAN/GREEN wireframes`);
            debug('PERFORMANCE', `   • Unknown objects: WHITE wireframes`);
            debug('COMBAT', `💡 TIP: Fire torpedoes to see their bright collision shapes in motion!`);
        }

        this._exposeDebugCommands();
    }

    /**
     * Expose debug methods globally for console access
     */
    _exposeDebugCommands() {
        window.testWireframes = () => this.testWireframeVisibility();
        window.debugWireframes = () => this.debugWireframeInfo();
        window.updateWireframes = () => this.updateDebugVisualization();
        window.moveWireframesToCamera = () => this.moveWireframesToCamera();
        window.enhanceWireframes = () => this.enhanceWireframeVisibility();
        window.enableVerboseLogging = () => this.enableVerboseLogging();
        window.disableVerboseLogging = () => this.disableVerboseLogging();
        window.disableCollisionDebug = () => this.pm.disableCollisionDebug();
        window.clearConsole = () => console.clear();
        window.stopProjectileWireframes = () => { this.pm._silentMode = true; debug('UTILITY', '🔇 Silent mode enabled'); };
        window.checkAllPhysicsShapes = () => this.checkAllPhysicsShapes();

        debug('PHYSICS', `💡 Physics Debug Console Commands:`);
        debug('UTILITY', `   • clearConsole() - Clear the console`);
        debug('PHYSICS', `   • checkAllPhysicsShapes() - Audit all physics objects`);
        debug('PERFORMANCE', `   • debugWireframes() - Show wireframe status summary`);
        debug('PERFORMANCE', `   • testWireframes() - Make wireframes extremely obvious`);
    }

    /**
     * Create wireframe visualization for a physics body
     * @param {object} rigidBody - Ammo.js rigid body
     * @param {THREE.Object3D} threeObject - Associated Three.js object
     */
    createDebugWireframe(rigidBody, threeObject) {
        if (!this.pm.debugMode || !this.pm.debugGroup || !rigidBody || this.pm.debugWireframes.has(rigidBody)) {
            return;
        }

        try {
            const metadata = this.pm.entityMetadata.get(rigidBody);

            const entityType = metadata?.type || 'unknown';
            const entityId = metadata?.id || '';
            const objectName = threeObject?.name || '';

            const isFilteredProjectile =
                entityId.includes('laser') || entityId.includes('Laser') ||
                entityId.includes('bullet') || entityId.includes('Bullet') ||
                objectName.includes('laser') || objectName.includes('bullet') ||
                (entityType === 'projectile' && (
                    entityId.includes('laser') || entityId.includes('bullet') ||
                    entityId.includes('beam') || entityId.includes('ray')
                ));

            if (isFilteredProjectile) {
                if (this.pm._debugLoggingEnabled && !this.pm._silentMode) {
                    debug('PERFORMANCE', `🚫 Skipping wireframe for filtered projectile: ${entityId || objectName || 'unnamed'}`);
                }
                return;
            }

            const collisionShape = rigidBody.getCollisionShape();
            if (!collisionShape) return;

            const transform = new this.pm.Ammo.btTransform();
            rigidBody.getWorldTransform(transform);
            const position = transform.getOrigin();
            const rotation = transform.getRotation();

            let geometry;
            let material;
            let wireframe;

            const storedShapeType = metadata?.shapeType;
            const storedRadius = metadata?.shapeRadius;

            if (storedShapeType === 'sphere') {
                const radius = storedRadius || 1.0;
                geometry = new THREE.SphereGeometry(radius * 1.1, 16, 16);

                let wireframeColor;
                if (entityType === 'projectile') {
                    wireframeColor = entityId.includes('torpedo') ? 0xff0044 :
                        entityId.includes('missile') ? 0xff4400 : 0x44ff00;
                } else {
                    wireframeColor = entityType === 'planet' ? 0xffff00 :
                        entityType === 'star' ? 0xff8800 :
                            entityType === 'moon' ? 0x88ffff : 0x00ff00;
                }

                material = new THREE.MeshBasicMaterial({
                    color: wireframeColor,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6,
                    depthTest: false,
                    depthWrite: false
                });
            } else if (storedShapeType === 'box') {
                const width = metadata?.shapeWidth || 2;
                const height = metadata?.shapeHeight || 2;
                const depth = metadata?.shapeDepth || 2;
                geometry = new THREE.BoxGeometry(width * 1.1, height * 1.1, depth * 1.1);

                let wireframeColor;
                if (entityType === 'projectile') {
                    wireframeColor = entityId.includes('torpedo') ? 0xff0044 :
                        entityId.includes('missile') ? 0xff4400 : 0x44ff00;
                } else {
                    wireframeColor = entityType === 'planet' ? 0xffff00 :
                        entityType === 'star' ? 0xff8800 : 0x00ff00;
                }

                material = new THREE.MeshBasicMaterial({
                    color: wireframeColor,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6,
                    depthTest: false,
                    depthWrite: false
                });
            } else if (storedShapeType === 'capsule') {
                debug('PERFORMANCE', `   • Creating CAPSULE wireframe (approximated as cylinder)`);
                const radius = metadata?.shapeRadius || 1;
                const height = metadata?.shapeHeight || 2;
                geometry = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, height * 1.1, 16);

                let wireframeColor;
                if (entityType === 'projectile') {
                    wireframeColor = entityId.includes('torpedo') ? 0xff0044 :
                        entityId.includes('missile') ? 0xff4400 : 0x44ff00;
                } else {
                    wireframeColor = entityType === 'planet' ? 0xffff00 :
                        entityType === 'star' ? 0xff8800 :
                            entityType === 'moon' ? 0x88ffff : 0x00ff00;
                }

                material = new THREE.MeshBasicMaterial({
                    color: wireframeColor,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6,
                    depthTest: false,
                    depthWrite: false
                });
            } else {
                debug('PERFORMANCE', `   • Creating DEFAULT BOX wireframe (unknown shape type: ${storedShapeType})`);
                geometry = new THREE.BoxGeometry(2, 2, 2);
                material = new THREE.MeshBasicMaterial({
                    color: entityType === 'projectile' ? 0xffffff : 0xffffff,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6,
                    depthTest: false,
                    depthWrite: false
                });
            }

            wireframe = new THREE.Mesh(geometry, material);

            if (entityType === 'projectile') {
                wireframe.scale.set(10, 10, 10);
            }

            wireframe.renderOrder = 1000;
            wireframe.material.depthTest = false;

            wireframe.position.set(position.x(), position.y(), position.z());
            wireframe.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());

            wireframe.userData = {
                type: 'physics_debug',
                entityType: metadata?.type || 'unknown',
                entityId: metadata?.id || 'unknown',
                rigidBody: rigidBody
            };

            this.pm.debugGroup.add(wireframe);
            this.pm.debugWireframes.set(rigidBody, wireframe);

            const entityName = metadata?.id || threeObject.name || 'unnamed';

            if (!this.pm._silentMode && (this.pm._debugLoggingEnabled || entityType === 'star' || entityType === 'planet')) {
                debug('PERFORMANCE', `🔍 Created wireframe for ${entityName} (${entityType})`);
            }

        } catch (error) {
            if (this.pm._debugLoggingEnabled && !this.pm._silentMode) {
                debug('P1', 'Failed to create debug wireframe:', error);
            }
        }
    }

    /**
     * Update debug wireframes to match current physics body positions
     */
    updateDebugVisualization() {
        if (!this.pm.debugMode || !this.pm.debugGroup) {
            return;
        }

        let updateCount = 0;
        const staleWireframes = [];

        for (const [threeObject, rigidBody] of this.pm.rigidBodies.entries()) {
            const wireframe = this.pm.debugWireframes.get(rigidBody);
            if (wireframe) {
                try {
                    const position = threeObject.position;
                    const quaternion = threeObject.quaternion;

                    wireframe.position.set(position.x, position.y, position.z);
                    wireframe.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

                    updateCount++;
                } catch (error) {
                    staleWireframes.push(rigidBody);
                }
            }
        }

        if (this.pm.delayedWireframes && this.pm.delayedWireframes.size > 0) {
            const now = Date.now();
            for (const [wireframe, data] of this.pm.delayedWireframes.entries()) {
                try {
                    if (data.detonated && data.position) {
                        wireframe.position.set(data.position.x, data.position.y, data.position.z);
                    }

                    if (now - data.timestamp > 3000) {
                        this.pm.delayedWireframes.delete(wireframe);
                        if (wireframe.parent) {
                            wireframe.parent.remove(wireframe);
                        }
                        continue;
                    }

                    updateCount++;
                } catch (error) {
                    debug('P1', 'Failed to update delayed torpedo wireframe:', error);
                    this.pm.delayedWireframes.delete(wireframe);
                }
            }
        }

        staleWireframes.forEach(rigidBody => {
            this.removeDebugWireframe(rigidBody);
        });
    }

    /**
     * Remove debug wireframe for a specific rigid body
     * @param {object} rigidBody - Ammo.js rigid body
     */
    removeDebugWireframe(rigidBody) {
        if (!rigidBody) return;

        const wireframe = this.pm.debugWireframes.get(rigidBody);
        if (wireframe && this.pm.debugGroup) {
            this.pm.debugGroup.remove(wireframe);

            if (wireframe.geometry) wireframe.geometry.dispose();
            if (wireframe.material) wireframe.material.dispose();

            this.pm.debugWireframes.delete(rigidBody);

            debug('PERFORMANCE', `🧹 Removed debug wireframe for ${wireframe.userData?.entityType || 'unknown'} entity`);
        }
    }

    /**
     * Check if collision shape is a box
     */
    isBoxShape(collisionShape) {
        try {
            return collisionShape.getShapeType() === 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if collision shape is a sphere
     */
    isSphereShape(collisionShape) {
        try {
            return collisionShape.getShapeType() === 8;
        } catch (error) {
            return false;
        }
    }

    /**
     * Add debug wireframe for newly created rigid body
     */
    onRigidBodyCreated(rigidBody, threeObject) {
        if (this.pm.debugMode) {
            this.createDebugWireframe(rigidBody, threeObject);
        }
    }

    /**
     * Make all debug wireframes more visible
     */
    enhanceWireframeVisibility() {
        if (!this.pm.debugMode || !this.pm.debugGroup) {
            debug('PERFORMANCE', '❌ Debug mode not active - cannot enhance wireframes');
            return;
        }

        let enhancedCount = 0;
        for (const [rigidBody, wireframe] of this.pm.debugWireframes.entries()) {
            if (wireframe && wireframe.material) {
                wireframe.material.color.setHex(0xff0000);
                wireframe.material.transparent = true;
                wireframe.material.opacity = 0.8;
                wireframe.material.depthTest = false;
                wireframe.material.depthWrite = false;
                wireframe.renderOrder = 9999;
                wireframe.scale.set(1.5, 1.5, 1.5);
                enhancedCount++;
            }
        }

        debug('PERFORMANCE', `🔍 Enhanced visibility for ${enhancedCount} wireframes`);
    }

    /**
     * Make wireframes extremely obvious for debugging
     */
    testWireframeVisibility() {
        if (!this.pm.debugMode || !this.pm.debugGroup) {
            debug('INSPECTION', '❌ Debug mode not active');
            return;
        }

        debug('PERFORMANCE', `🔍 Force updating wireframe positions first...`);
        this.updateDebugVisualization();

        let count = 0;
        for (const [threeObject, rigidBody] of this.pm.rigidBodies.entries()) {
            const wireframe = this.pm.debugWireframes.get(rigidBody);
            if (wireframe && wireframe.material) {
                const threePos = threeObject.position;

                wireframe.position.set(threePos.x, threePos.y, threePos.z);

                wireframe.material.color.setHex(0xff0000);
                wireframe.material.transparent = false;
                wireframe.material.opacity = 1.0;
                wireframe.material.wireframe = false;
                wireframe.material.depthTest = false;
                wireframe.material.depthWrite = false;
                wireframe.renderOrder = 99999;
                wireframe.scale.set(3, 3, 3);
                wireframe.material.needsUpdate = true;
                count++;
            }
        }

        debug('PERFORMANCE', `🔍 Made ${count} wireframes into BRIGHT RED SOLID SHAPES that are 3x larger`);
    }

    /**
     * Print detailed debug information about wireframes
     */
    debugWireframeInfo() {
        debug('PERFORMANCE', `🔍 === WIREFRAME DEBUG INFO ===`);
        debug('INSPECTION', `🔍 Debug mode: ${this.pm.debugMode}`);
        debug('INSPECTION', `🔍 Debug group exists: ${!!this.pm.debugGroup}`);
        debug('INSPECTION', `🔍 Debug group parent: ${!!this.pm.debugGroup?.parent}`);
        debug('INSPECTION', `🔍 Debug group children: ${this.pm.debugGroup?.children.length || 0}`);
        debug('PERFORMANCE', `🔍 Wireframes in map: ${this.pm.debugWireframes.size}`);
        debug('PHYSICS', `🔍 Physics bodies: ${this.pm.rigidBodies.size}`);
    }

    /**
     * Enable verbose logging
     */
    enableVerboseLogging() {
        this.pm._debugLoggingEnabled = true;
        this.pm._silentMode = false;
        debug('AI', '🔊 Verbose logging enabled');
    }

    /**
     * Disable verbose logging
     */
    disableVerboseLogging() {
        this.pm._debugLoggingEnabled = false;
        this.pm._silentMode = true;
        debug('AI', '🔇 Verbose logging disabled');
    }

    /**
     * Check all physics shapes
     */
    checkAllPhysicsShapes() {
        debug('PHYSICS', `🔍 === PHYSICS SHAPE AUDIT ===`);
        debug('PHYSICS', `Total rigid bodies: ${this.pm.rigidBodies.size}`);

        for (const [threeObject, rigidBody] of this.pm.rigidBodies.entries()) {
            const metadata = this.pm.entityMetadata.get(rigidBody);
            debug('PHYSICS', `  • ${metadata?.type || 'unknown'}: ${metadata?.id || threeObject.name || 'unnamed'}`);
        }
    }

    /**
     * Move all wireframes to camera position for testing
     */
    moveWireframesToCamera() {
        if (!this.pm.debugMode || !this.pm.debugGroup || !window.camera) {
            debug('AI', '❌ Debug mode not active or no camera available');
            return;
        }

        debug('PERFORMANCE', `🔍 Moving all wireframes to camera position for visibility test...`);

        const cameraPos = window.camera.position;
        const offsetDistance = 5;
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);

        let movedCount = 0;
        this.pm.debugWireframes.forEach((wireframe, rigidBody) => {
            const metadata = this.pm.entityMetadata.get(rigidBody);
            const entityName = metadata?.id || 'unnamed';

            const offset = new THREE.Vector3().copy(cameraDirection).multiplyScalar(offsetDistance + movedCount * 2);
            wireframe.position.copy(cameraPos).add(offset);

            wireframe.material.color.setHex(0xff0000);
            wireframe.material.wireframe = false;
            wireframe.scale.set(0.5, 0.5, 0.5);
            wireframe.material.needsUpdate = true;

            debug('UTILITY', `🔍 Moved ${entityName} to camera front at distance ${offsetDistance + movedCount * 2}`);
            movedCount++;
        });

        debug('PERFORMANCE', `🔍 Moved ${movedCount} wireframes to camera position`);
    }

    /**
     * Create a visual indicator for collision detection
     * @param {THREE.Vector3} projectilePos - Position of the projectile
     * @param {THREE.Vector3} targetPos - Position of the target
     * @param {number} collisionThreshold - The collision detection radius
     */
    createCollisionVisualization(projectilePos, targetPos, collisionThreshold) {
        if (!window.starfieldManager?.scene) return;

        const damageZones = [
            { radius: 0.5, color: 0xff0000, name: 'close hits' },
            { radius: 2, color: 0xff6600, name: 'medium range' },
            { radius: 5, color: 0xffff00, name: 'edge hits' }
        ];

        const spheres = [];

        damageZones.forEach(zone => {
            const geometry = new THREE.SphereGeometry(zone.radius, 16, 12);
            const material = new THREE.MeshBasicMaterial({
                color: zone.color,
                wireframe: true,
                transparent: true,
                opacity: 0.7
            });

            const sphere = new THREE.Mesh(geometry, material);
            if (projectilePos.isVector3) {
                sphere.position.copy(projectilePos);
            } else {
                sphere.position.set(projectilePos.x, projectilePos.y, projectilePos.z);
            }
            debug('UTILITY', `🔍 SPHERE ${zone.name}: Set position to (${sphere.position.x.toFixed(1)}, ${sphere.position.y.toFixed(1)}, ${sphere.position.z.toFixed(1)})`);

            window.starfieldManager.scene.add(sphere);
            spheres.push({ sphere, geometry, material });
        });

        setTimeout(() => {
            if (window.starfieldManager?.scene) {
                spheres.forEach(({ sphere, geometry, material }) => {
                    window.starfieldManager.scene.remove(sphere);
                    geometry.dispose();
                    material.dispose();
                });
            }
        }, 3000);

        debug('COMBAT', `👁️ Created collision visualization showing damage zones at detonation point: ${projectilePos.x.toFixed(1)}, ${projectilePos.y.toFixed(1)}, ${projectilePos.z.toFixed(1)}`);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.pm = null;
    }
}
