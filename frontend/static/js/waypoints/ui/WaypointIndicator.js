/**
 * WaypointIndicator - 3D waypoint objects in world space
 * 
 * Creates visible 3D waypoint markers that players can see as they approach waypoint locations.
 * These are virtual objects visible only to the player, not to AI.
 */

import { debug } from '../../debug.js';

export class WaypointIndicator {
    constructor(scene, THREE) {
        this.scene = scene;
        this.THREE = THREE;
        this.waypointMeshes = new Map(); // waypointId -> mesh
        this.animationFrameId = null;
        
        debug('WAYPOINTS', '🎯 WaypointIndicator initialized');
    }

    /**
     * Create 3D waypoint object in world space
     * @param {Object} waypoint - Waypoint data
     */
    createWaypointObject(waypoint) {
        if (this.waypointMeshes.has(waypoint.id)) {
            debug('WAYPOINTS', `⚠️ Waypoint object already exists: ${waypoint.id}`);
            return;
        }

        const [x, y, z] = waypoint.position;
        
        // Create diamond geometry (same as wireframe but filled)
        const geometry = new this.THREE.BufferGeometry();
        
        // Diamond vertices for a 3D diamond shape (75% smaller)
        const size = Math.max(0.5, (waypoint.triggerRadius || 10) * 0.05); // 75% smaller - reduced from 0.2 to 0.05
        
        const vertices = new Float32Array([
            // Top pyramid faces
            0, size, 0,     size*0.5, 0, 0,     0, 0, size*0.5,     // Top-Right-Front
            0, size, 0,     0, 0, size*0.5,    -size*0.5, 0, 0,    // Top-Front-Left  
            0, size, 0,     -size*0.5, 0, 0,   0, 0, -size*0.5,    // Top-Left-Back
            0, size, 0,     0, 0, -size*0.5,   size*0.5, 0, 0,     // Top-Back-Right
            
            // Bottom pyramid faces
            0, -size, 0,    0, 0, size*0.5,    size*0.5, 0, 0,     // Bottom-Front-Right
            0, -size, 0,    -size*0.5, 0, 0,   0, 0, size*0.5,     // Bottom-Left-Front
            0, -size, 0,    0, 0, -size*0.5,   -size*0.5, 0, 0,    // Bottom-Back-Left
            0, -size, 0,    size*0.5, 0, 0,    0, 0, -size*0.5,    // Bottom-Right-Back
            
            // Middle ring faces
            size*0.5, 0, 0,     0, 0, size*0.5,    -size*0.5, 0, 0,    // Right-Front-Left
            0, 0, size*0.5,     -size*0.5, 0, 0,   0, 0, -size*0.5,    // Front-Left-Back
            -size*0.5, 0, 0,    0, 0, -size*0.5,   size*0.5, 0, 0,     // Left-Back-Right
            0, 0, -size*0.5,    size*0.5, 0, 0,    0, 0, size*0.5      // Back-Right-Front
        ]);
        
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        // Create materials - both wireframe and solid
        const solidMaterial = new this.THREE.MeshBasicMaterial({
            color: 0xff00ff,      // Magenta
            transparent: true,
            opacity: 0.3,         // Semi-transparent solid
            side: this.THREE.DoubleSide
        });
        
        const wireframeMaterial = new this.THREE.MeshBasicMaterial({
            color: 0xff00ff,      // Magenta
            wireframe: true,
            transparent: true,
            opacity: 0.8          // More opaque wireframe
        });
        
        // Create both solid and wireframe meshes
        const solidMesh = new this.THREE.Mesh(geometry.clone(), solidMaterial);
        const wireframeMesh = new this.THREE.Mesh(geometry.clone(), wireframeMaterial);
        
        // Create group to hold both meshes
        const waypointGroup = new this.THREE.Group();
        waypointGroup.add(solidMesh);
        waypointGroup.add(wireframeMesh);
        
        // Position at waypoint location
        waypointGroup.position.set(x, y, z);
        
        // Add metadata
        waypointGroup.userData = {
            waypointId: waypoint.id,
            waypointName: waypoint.name,
            isWaypointIndicator: true,
            createdAt: Date.now(),
            triggerRadius: waypoint.triggerRadius
        };
        
        // Add to scene
        this.scene.add(waypointGroup);
        this.waypointMeshes.set(waypoint.id, waypointGroup);
        
        debug('WAYPOINTS', `💎 Created 3D waypoint object: ${waypoint.name} at [${x}, ${y}, ${z}]`);
        
        // Start animation if not already running
        if (!this.animationFrameId) {
            this.startAnimation();
        }
    }

    /**
     * Remove waypoint 3D object from world space
     * @param {string} waypointId - Waypoint ID
     */
    removeWaypointObject(waypointId) {
        const mesh = this.waypointMeshes.get(waypointId);
        if (!mesh) return;
        
        this.scene.remove(mesh);
        this.waypointMeshes.delete(waypointId);
        
        debug('WAYPOINTS', `🗑️ Removed 3D waypoint object: ${waypointId}`);
        
        // Stop animation if no waypoints left
        if (this.waypointMeshes.size === 0 && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Update waypoint object (e.g., when status changes)
     * @param {Object} waypoint - Updated waypoint data
     */
    updateWaypointObject(waypoint) {
        const mesh = this.waypointMeshes.get(waypoint.id);
        if (!mesh) return;
        
        // Update position if changed
        const [x, y, z] = waypoint.position;
        mesh.position.set(x, y, z);
        
        // Update color based on status
        const color = this.getWaypointColor(waypoint);
        mesh.children.forEach(child => {
            if (child.material) {
                child.material.color.setHex(color);
            }
        });
        
        debug('WAYPOINTS', `🔄 Updated 3D waypoint object: ${waypoint.name}`);
    }

    /**
     * Get waypoint color based on status
     * @param {Object} waypoint - Waypoint data
     * @returns {number} - Hex color
     */
    getWaypointColor(waypoint) {
        switch (waypoint.status) {
            case 'pending':
                return 0x888888; // Gray
            case 'active':
                return 0xff00ff; // Magenta
            case 'targeted':
                return 0xff44ff; // Bright magenta
            case 'triggered':
                return 0x00ff00; // Green
            case 'completed':
                return 0x444444; // Dark gray
            default:
                return 0xff00ff; // Default magenta
        }
    }

    /**
     * Start animation loop for waypoint objects
     */
    startAnimation() {
        const animate = () => {
            const time = Date.now() * 0.001; // Convert to seconds
            
            // Animate all waypoint objects
            this.waypointMeshes.forEach((mesh, waypointId) => {
                if (mesh && mesh.userData) {
                    // Gentle rotation around Y axis
                    mesh.rotation.y = time * 0.5;
                    
                    // Gentle pulsing scale for active waypoints
                    const baseScale = 1.0;
                    const pulseAmount = 0.1;
                    const pulseSpeed = 2.0;
                    const scale = baseScale + Math.sin(time * pulseSpeed) * pulseAmount;
                    mesh.scale.setScalar(scale);
                }
            });
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
        debug('WAYPOINTS', '🎬 Started waypoint animation loop');
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            debug('WAYPOINTS', '⏹️ Stopped waypoint animation loop');
        }
    }

    /**
     * Get all waypoint objects
     * @returns {Map} - Map of waypointId -> mesh
     */
    getAllWaypointObjects() {
        return new Map(this.waypointMeshes);
    }

    /**
     * Clear all waypoint objects
     */
    clearAllWaypointObjects() {
        this.waypointMeshes.forEach((mesh, waypointId) => {
            this.scene.remove(mesh);
        });
        this.waypointMeshes.clear();
        this.stopAnimation();
        
        debug('WAYPOINTS', '🧹 Cleared all waypoint 3D objects');
    }

    /**
     * Get waypoint object by ID
     * @param {string} waypointId - Waypoint ID
     * @returns {Object|null} - Three.js mesh or null
     */
    getWaypointObject(waypointId) {
        return this.waypointMeshes.get(waypointId) || null;
    }

    /**
     * Check if waypoint object exists
     * @param {string} waypointId - Waypoint ID
     * @returns {boolean} - True if exists
     */
    hasWaypointObject(waypointId) {
        return this.waypointMeshes.has(waypointId);
    }
}
