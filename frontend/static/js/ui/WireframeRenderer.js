/**
 * WireframeRenderer
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages the main target wireframe display in the target computer HUD.
 *
 * Features:
 * - Creates and manages Three.js wireframe scene, camera, renderer
 * - Provides geometry factory methods for different wireframe types
 * - Handles wireframe animation (rotation)
 * - Cleans up wireframe resources
 */

import { debug } from '../debug.js';
import { WIREFRAME_GEOMETRY } from '../constants/TargetingConstants.js';
import { getWireframeType } from '../constants/WireframeTypes.js';

export class WireframeRenderer {
    /**
     * Create a WireframeRenderer
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Three.js components
        this.wireframeContainer = null;
        this.wireframeRenderer = null;
        this.wireframeScene = null;
        this.wireframeCamera = null;
        this.targetWireframe = null;
        this.wireframeAnimationId = null;

        // Sub-target indicators (disabled but kept for compatibility)
        this.subTargetIndicators = [];
    }

    /**
     * Create the wireframe display container and Three.js scene
     * @returns {HTMLElement} The wireframe container element
     */
    createWireframeDisplay() {
        const THREE = this.tcm.THREE;

        // Create wireframe container - match original styling
        this.wireframeContainer = document.createElement('div');
        this.wireframeContainer.style.cssText = `
            width: 100%;
            height: 150px;
            border: 1px solid #D0D0D0;
            margin-bottom: 10px;
            position: relative;
            overflow: visible;
            pointer-events: none;
            z-index: 9999;
        `;

        // Create wireframe renderer - match original size
        this.wireframeRenderer = new THREE.WebGLRenderer({ alpha: true });
        this.wireframeRenderer.setSize(200, 150);
        this.wireframeRenderer.setClearColor(0x000000, 0);

        // Create scene and camera for wireframe
        this.wireframeScene = new THREE.Scene();
        this.wireframeCamera = new THREE.PerspectiveCamera(45, 200/150, 0.1, 1000);
        this.wireframeCamera.position.z = WIREFRAME_GEOMETRY.MAIN_CAMERA_Z;

        // Add lights to wireframe scene
        const wireframeLight = new THREE.DirectionalLight(0x00ff41, 1);
        wireframeLight.position.set(1, 1, 1);
        this.wireframeScene.add(wireframeLight);

        const wireframeAmbient = new THREE.AmbientLight(0x00ff41, 0.4);
        this.wireframeScene.add(wireframeAmbient);

        // Ensure wireframe canvas doesn't block clicks
        this.wireframeRenderer.domElement.style.pointerEvents = 'none';
        this.wireframeContainer.appendChild(this.wireframeRenderer.domElement);

        return this.wireframeContainer;
    }

    /**
     * Create star geometry for wireframe display
     * @param {number} radius - Star radius
     * @returns {THREE.BufferGeometry} Star geometry
     */
    createStarGeometry(radius) {
        const THREE = this.tcm.THREE;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        // Create a simpler 3D star with radiating lines from center
        const center = [0, 0, 0];

        // Create star points radiating outward in multiple directions
        const directions = [
            // Primary axes
            [1, 0, 0], [-1, 0, 0],    // X axis
            [0, 1, 0], [0, -1, 0],    // Y axis
            [0, 0, 1], [0, 0, -1],    // Z axis

            // Diagonal directions for more star-like appearance
            [0.707, 0.707, 0], [-0.707, -0.707, 0],     // XY diagonal
            [0.707, 0, 0.707], [-0.707, 0, -0.707],     // XZ diagonal
            [0, 0.707, 0.707], [0, -0.707, -0.707],     // YZ diagonal

            // Additional points for fuller star shape
            [0.577, 0.577, 0.577], [-0.577, -0.577, -0.577],  // 3D diagonals
            [0.577, -0.577, 0.577], [-0.577, 0.577, -0.577],
        ];

        // Create lines from center to each star point
        directions.forEach(direction => {
            // Line from center to outer point
            vertices.push(center[0], center[1], center[2]);
            vertices.push(
                direction[0] * radius,
                direction[1] * radius,
                direction[2] * radius
            );
        });

        // Create some connecting lines between points for more complex star pattern
        const outerPoints = directions.map(dir => [
            dir[0] * radius,
            dir[1] * radius,
            dir[2] * radius
        ]);

        // Connect some outer points to create star pattern
        for (let i = 0; i < 6; i += 2) {
            // Connect opposite primary axis points
            vertices.push(outerPoints[i][0], outerPoints[i][1], outerPoints[i][2]);
            vertices.push(outerPoints[i + 1][0], outerPoints[i + 1][1], outerPoints[i + 1][2]);
        }

        // Convert vertices array to Float32Array and set as position attribute
        const vertexArray = new Float32Array(vertices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));

        return geometry;
    }

    /**
     * Create a standard wireframe geometry for unknown/undiscovered objects
     * @param {number} radius - The radius/size of the geometry
     * @returns {THREE.BufferGeometry} A simple geometric shape for unknown objects
     */
    createUnknownWireframeGeometry(radius) {
        const THREE = this.tcm.THREE;

        // Create a simple diamond/octahedron shape for unknown objects
        // This gives a generic, mysterious appearance that doesn't reveal the actual object type
        const geometry = new THREE.OctahedronGeometry(radius * 0.8, 0);

        // Convert to edges geometry for wireframe display
        const edgesGeometry = new THREE.EdgesGeometry(geometry);

        // Dispose the temporary geometry
        geometry.dispose();

        debug('INSPECTION', `Created unknown wireframe geometry with radius ${radius * 0.8}`);
        return edgesGeometry;
    }

    /**
     * Get wireframe configuration for an object type using centralized data
     * @param {string} objectType - The object type to get wireframe config for
     * @returns {Object} Wireframe configuration with geometry and description
     */
    getWireframeConfig(objectType) {
        return getWireframeType(objectType);
    }

    /**
     * Create geometry from centralized wireframe configuration
     * @param {string} geometryType - The geometry type from WIREFRAME_TYPES
     * @param {number} radius - The radius/size of the geometry
     * @returns {THREE.Geometry|null} The created geometry or null if not supported
     */
    createGeometryFromConfig(geometryType, radius) {
        const THREE = this.tcm.THREE;

        switch (geometryType) {
            case 'icosahedron':
                return new THREE.IcosahedronGeometry(radius, 0);

            case 'octahedron':
                return new THREE.OctahedronGeometry(radius, 0);

            case 'sphere':
                return new THREE.SphereGeometry(radius * 0.8, 8, 6);

            default:
                debug('P1', `Unknown geometry type: ${geometryType}`);
                return null;
        }
    }

    /**
     * Create waypoint-specific wireframe (diamond shape)
     * @returns {THREE.LineSegments} Waypoint wireframe or null
     */
    createWaypointWireframe() {
        const THREE = this.tcm.THREE;
        const currentTarget = this.tcm.currentTarget;

        if (!currentTarget || !currentTarget.isWaypoint) {
            debug('WAYPOINTS', 'Current target is not a waypoint, skipping wireframe');
            return null;
        }

        if (!this.wireframeScene) {
            debug('WAYPOINTS', 'Wireframe scene not available for waypoint wireframe creation');
            return null;
        }

        // Remove existing wireframe
        this.clearTargetWireframe();

        // Create diamond wireframe geometry
        const geometry = new THREE.BufferGeometry();
        const size = 0.6; // 60% smaller

        // Diamond vertices (distinct shape for waypoints)
        const vertices = new Float32Array([
            // Top pyramid
            0, size, 0,     size, 0, 0,     // Top to Right
            0, size, 0,     0, 0, size,     // Top to Front
            0, size, 0,     -size, 0, 0,    // Top to Left
            0, size, 0,     0, 0, -size,    // Top to Back

            // Bottom pyramid
            0, -size, 0,    size, 0, 0,     // Bottom to Right
            0, -size, 0,    0, 0, size,     // Bottom to Front
            0, -size, 0,    -size, 0, 0,    // Bottom to Left
            0, -size, 0,    0, 0, -size,    // Bottom to Back

            // Middle ring
            size, 0, 0,     0, 0, size,     // Right to Front
            0, 0, size,     -size, 0, 0,    // Front to Left
            -size, 0, 0,    0, 0, -size,    // Left to Back
            0, 0, -size,    size, 0, 0      // Back to Right
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        // Magenta material
        const material = new THREE.LineBasicMaterial({
            color: 0xff00ff, // Magenta
            transparent: true,
            opacity: 0.9
        });

        this.targetWireframe = new THREE.LineSegments(geometry, material);
        // Position at origin for HUD display (not at world coordinates)
        this.targetWireframe.position.set(0, 0, 0);

        // Animation and render settings
        this.targetWireframe.userData.rotationSpeed = 0.02;
        this.targetWireframe.layers.enable(0);
        this.targetWireframe.renderOrder = 1000;
        this.targetWireframe.frustumCulled = false;

        this.wireframeScene.add(this.targetWireframe);

        debug('WAYPOINTS', `Created magenta diamond wireframe for: ${currentTarget.name}`);
        return this.targetWireframe;
    }

    /**
     * Set the current wireframe (called after TCM creates it)
     * @param {THREE.LineSegments} wireframe - The wireframe to set
     * @param {number} cameraZ - Camera Z position for the wireframe size
     */
    setWireframe(wireframe, cameraZ = 3) {
        this.targetWireframe = wireframe;
        if (wireframe) {
            wireframe.position.set(0, 0, 0);
            this.wireframeScene.add(wireframe);
            this.wireframeCamera.position.z = cameraZ;
            wireframe.rotation.set(0.5, 0, 0.3);
        }
    }

    /**
     * Animate the wireframe (rotation)
     * @param {number} deltaTime - Time since last frame
     */
    animateWireframe(deltaTime) {
        if (this.targetWireframe) {
            this.targetWireframe.rotation.y += deltaTime * 0.5;
            this.targetWireframe.rotation.x = 0.5 + Math.sin(Date.now() * 0.001) * 0.2;
        }
    }

    /**
     * Render the wireframe scene
     */
    render() {
        if (this.targetWireframe && this.wireframeScene && this.wireframeRenderer) {
            try {
                this.wireframeRenderer.render(this.wireframeScene, this.wireframeCamera);
            } catch (error) {
                debug('P1', `Error rendering wireframe: ${error}`);
            }
        }
    }

    /**
     * Clear the current target wireframe
     */
    clearTargetWireframe() {
        debug('TARGETING', `WIREFRAME: clearTargetWireframe() called - existing wireframe: ${this.targetWireframe ? 'YES' : 'NO'}`);

        if (!this.wireframeScene) return;

        const childrenBefore = this.wireframeScene.children.length;
        const childTypesBefore = this.wireframeScene.children.map(child => child.constructor.name).join(', ');
        debug('TARGETING', `WIREFRAME: Before clear - ${childrenBefore} objects: ${childTypesBefore}`);

        // Store reference to current wireframe before clearing for orphan detection
        const currentWireframe = this.targetWireframe;

        // Clear main wireframe
        if (this.targetWireframe) {
            this.wireframeScene.remove(this.targetWireframe);
            if (this.targetWireframe.geometry) {
                this.targetWireframe.geometry.dispose();
            }
            if (this.targetWireframe.material) {
                if (Array.isArray(this.targetWireframe.material)) {
                    this.targetWireframe.material.forEach(m => m.dispose());
                } else {
                    this.targetWireframe.material.dispose();
                }
            }
            this.targetWireframe = null;
        }

        // SAFETY: Remove any orphaned LineSegments that might be wireframes
        const orphanedWireframes = this.wireframeScene.children.filter(child =>
            child.constructor.name === 'LineSegments' &&
            child !== currentWireframe
        );

        if (orphanedWireframes.length > 0) {
            debug('TARGETING', `WIREFRAME: Found ${orphanedWireframes.length} orphaned wireframes, removing...`);
            orphanedWireframes.forEach(wireframe => {
                this.wireframeScene.remove(wireframe);
                if (wireframe.geometry) wireframe.geometry.dispose();
                if (wireframe.material) wireframe.material.dispose();
            });
        }

        // Clear sub-target indicators
        const indicatorCount = this.subTargetIndicators?.length || 0;
        if (this.subTargetIndicators) {
            this.subTargetIndicators.forEach(indicator => {
                this.wireframeScene.remove(indicator);
                if (indicator.geometry) indicator.geometry.dispose();
                if (indicator.material) indicator.material.dispose();
            });
        }
        this.subTargetIndicators = [];

        const childrenAfter = this.wireframeScene.children.length;
        const childTypesAfter = this.wireframeScene.children.map(child => child.constructor.name).join(', ');
        debug('TARGETING', `WIREFRAME: After clear - ${childrenAfter} objects: ${childTypesAfter}`);
        if (childrenBefore !== childrenAfter || indicatorCount > 0 || orphanedWireframes.length > 0) {
            debug('TARGETING', `WIREFRAME: Cleared ${childrenBefore - childrenAfter} objects (${indicatorCount} sub-targets, ${orphanedWireframes.length} orphaned wireframes)`);
        }
    }

    /**
     * Stop wireframe animation
     */
    stopWireframeAnimation() {
        if (this.wireframeAnimationId) {
            cancelAnimationFrame(this.wireframeAnimationId);
            this.wireframeAnimationId = null;
        }
    }

    /**
     * Update wireframe container border color
     * @param {string} color - CSS color string
     */
    updateBorderColor(color) {
        if (this.wireframeContainer) {
            this.wireframeContainer.style.borderColor = color;
        }
    }

    /**
     * Set wireframe container opacity
     * @param {number|string} opacity - Opacity value
     */
    setContainerOpacity(opacity) {
        if (this.wireframeContainer) {
            this.wireframeContainer.style.opacity = opacity;
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Stop animation
        this.stopWireframeAnimation();

        // Clean up wireframe renderer
        if (this.wireframeRenderer) {
            this.wireframeRenderer.dispose();
            this.wireframeRenderer = null;
        }

        // Clean up target wireframe
        if (this.targetWireframe) {
            if (this.wireframeScene) {
                this.wireframeScene.remove(this.targetWireframe);
            }
            if (this.targetWireframe.geometry) {
                this.targetWireframe.geometry.dispose();
            }
            if (this.targetWireframe.material) {
                if (Array.isArray(this.targetWireframe.material)) {
                    this.targetWireframe.material.forEach(m => m.dispose());
                } else {
                    this.targetWireframe.material.dispose();
                }
            }
            this.targetWireframe = null;
        }

        // Clean up wireframe scene children
        if (this.wireframeScene) {
            while (this.wireframeScene.children.length > 0) {
                const child = this.wireframeScene.children[0];
                this.wireframeScene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.wireframeScene = null;
        }

        // Clean up sub-target indicators
        this.subTargetIndicators = [];

        // Remove container from DOM
        if (this.wireframeContainer && this.wireframeContainer.parentNode) {
            this.wireframeContainer.parentNode.removeChild(this.wireframeContainer);
        }
        this.wireframeContainer = null;
        this.wireframeCamera = null;
    }
}
