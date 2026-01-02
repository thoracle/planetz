/**
 * SubSystemPanelManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages the sub-system targeting panel that displays when targeting ship systems.
 *
 * Features:
 * - Creates sliding sub-system panel with Three.js wireframe display
 * - Creates geometric wireframe shapes for each system type
 * - Updates wireframe color based on health and diplomacy
 * - Handles show/hide animations
 * - Color blending utilities for health-based display
 */

import { debug } from '../debug.js';
import { WIREFRAME_GEOMETRY } from '../constants/TargetingConstants.js';

export class SubSystemPanelManager {
    /**
     * Create a SubSystemPanelManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Sub-system panel DOM elements
        this.subSystemPanel = null;
        this.subSystemWireframeContainer = null;
        this.subSystemContent = null;

        // Three.js rendering components
        this.subSystemWireframeRenderer = null;
        this.subSystemWireframeScene = null;
        this.subSystemWireframeCamera = null;
        this.currentSubSystemWireframe = null;
    }

    /**
     * Create the sub-system targeting panel
     * @param {HTMLElement} parentHUD - Parent HUD element to attach to
     * @param {AbortController} abortController - For event listener cleanup
     */
    createSubSystemPanel(parentHUD, abortController) {
        const THREE = this.tcm.THREE;

        // Create sub-system targeting panel (slides out to the right, flush with bottom)
        this.subSystemPanel = document.createElement('div');
        this.subSystemPanel.style.cssText = `
            position: absolute;
            bottom: -2px;
            left: 220px;
            width: 165px;
            height: auto;
            border: 2px solid #D0D0D0;
            background: rgba(0, 0, 0, 0.7);
            color: #D0D0D0;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            pointer-events: auto;
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            transform: translateX(-100%);
            opacity: 0;
            overflow: hidden;
            cursor: pointer;
        `;

        // Add click handler for left/right half sub-targeting (with abort signal for cleanup)
        this.subSystemPanel.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Use the panel's bounding rect for consistent click detection regardless of child elements
            const rect = this.subSystemPanel.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const halfWidth = rect.width / 2;

            if (clickX < halfWidth) {
                // Left half - same as Z (previous sub-target)
                this.tcm.cycleToPreviousSubTarget();
            } else {
                // Right half - same as X (next sub-target)
                this.tcm.cycleToNextSubTarget();
            }
        }, { signal: abortController.signal });

        // Create sub-system wireframe container
        this.subSystemWireframeContainer = document.createElement('div');
        this.subSystemWireframeContainer.style.cssText = `
            width: 100%;
            height: 75px;
            border: 1px solid #D0D0D0;
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
            background: rgba(0, 20, 0, 0.3);
        `;

        // Create sub-system wireframe renderer (149x75)
        this.subSystemWireframeRenderer = new THREE.WebGLRenderer({ alpha: true });
        this.subSystemWireframeRenderer.setSize(149, 75);
        this.subSystemWireframeRenderer.setClearColor(0x000000, 0);

        // Create scene and camera for sub-system wireframe
        this.subSystemWireframeScene = new THREE.Scene();
        this.subSystemWireframeCamera = new THREE.PerspectiveCamera(45, 149/75, 0.1, 1000);
        this.subSystemWireframeCamera.position.z = WIREFRAME_GEOMETRY.SUBSYSTEM_CAMERA_Z;

        // Add lights to sub-system wireframe scene
        const subSystemWireframeLight = new THREE.DirectionalLight(0x00ff41, 1);
        subSystemWireframeLight.position.set(1, 1, 1);
        this.subSystemWireframeScene.add(subSystemWireframeLight);

        const subSystemWireframeAmbient = new THREE.AmbientLight(0x00ff41, 0.4);
        this.subSystemWireframeScene.add(subSystemWireframeAmbient);

        // Center the smaller wireframe renderer in its container
        this.subSystemWireframeRenderer.domElement.style.cssText = `
            display: block;
            margin: 0 auto;
            pointer-events: none;
        `;

        this.subSystemWireframeContainer.appendChild(this.subSystemWireframeRenderer.domElement);

        // Create sub-system content container
        this.subSystemContent = document.createElement('div');
        this.subSystemContent.style.cssText = `
            width: 100%;
            height: auto;
        `;

        // Ensure all child elements don't block clicks by setting pointer-events: none on children
        const subSystemStyle = document.createElement('style');
        subSystemStyle.textContent = `
            .sub-system-content * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(subSystemStyle);
        this.subSystemContent.className = 'sub-system-content';

        // Assemble sub-system panel
        this.subSystemPanel.appendChild(this.subSystemWireframeContainer);
        this.subSystemPanel.appendChild(this.subSystemContent);

        // Add to parent HUD
        parentHUD.appendChild(this.subSystemPanel);
    }

    /**
     * Show the sub-system targeting panel with slide-out animation
     */
    showSubSystemPanel() {
        if (!this.subSystemPanel) return;

        // Ensure the panel is visible first
        this.subSystemPanel.style.display = 'block';

        // Small delay to ensure display change is processed before animation
        requestAnimationFrame(() => {
            // Animate the panel sliding out from left to right
            this.subSystemPanel.style.transform = 'translateX(0)';
            this.subSystemPanel.style.opacity = '1';
        });

        debug('TARGETING', 'Sub-system panel sliding out');
    }

    /**
     * Hide the sub-system targeting panel with slide-in animation
     */
    hideSubSystemPanel() {
        if (!this.subSystemPanel) return;

        // Immediately start the slide-in animation (right to left)
        this.subSystemPanel.style.transform = 'translateX(-100%)';
        this.subSystemPanel.style.opacity = '0';

        // Hide the panel after animation completes
        setTimeout(() => {
            if (this.subSystemPanel && this.subSystemPanel.style.opacity === '0') {
                this.subSystemPanel.style.display = 'none';
            }
        }, 300); // Match the CSS transition duration

        debug('TARGETING', 'Sub-system panel sliding in');
    }

    /**
     * Update sub-system panel border color to match main HUD
     * @param {string} color - CSS color string
     */
    updateSubSystemPanelColor(color) {
        if (this.subSystemPanel) {
            this.subSystemPanel.style.borderColor = color;
        }
        if (this.subSystemWireframeContainer) {
            this.subSystemWireframeContainer.style.borderColor = color;
        }
    }

    /**
     * Create geometric shapes for different sub-systems
     * @param {string} systemName - Name of the system (weapons, shields, etc.)
     * @param {number} baseColor - Hex color for the wireframe
     * @returns {THREE.LineSegments} Wireframe geometry
     */
    createSubSystemGeometry(systemName, baseColor = 0x00ff41) {
        const THREE = this.tcm.THREE;
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.8
        });

        let vertices = [];

        switch (systemName) {
            case 'weapons':
                // Octahedron - aggressive angular shape
                vertices = [
                    // Top pyramid
                    0, 1, 0,   1, 0, 0,
                    1, 0, 0,   0, 0, 1,
                    0, 0, 1,   -1, 0, 0,
                    -1, 0, 0,  0, 1, 0,
                    // Bottom pyramid
                    0, -1, 0,  1, 0, 0,
                    1, 0, 0,   0, 0, 1,
                    0, 0, 1,   -1, 0, 0,
                    -1, 0, 0,  0, -1, 0,
                    // Connect top and bottom
                    0, 1, 0,   0, -1, 0
                ];
                break;

            case 'shields':
                // Icosphere - protective dome shape
                const t = (1.0 + Math.sqrt(5.0)) / 2.0; // Golden ratio
                const icosahedronVertices = [
                    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
                    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
                ];
                // Create edges for wireframe
                const edges = [
                    [0,11], [0,5], [0,1], [0,7], [0,10], [1,5], [5,11], [11,10], [10,7], [7,1],
                    [3,9], [3,4], [3,2], [3,6], [3,8], [4,9], [9,8], [8,6], [6,2], [2,4],
                    [1,9], [5,4], [11,2], [10,6], [7,8], [0,3], [1,3], [5,3], [11,3], [10,3]
                ];
                vertices = [];
                edges.forEach(edge => {
                    vertices.push(...icosahedronVertices[edge[0]], ...icosahedronVertices[edge[1]]);
                });
                break;

            case 'impulse_engines':
                // Cylinder - engine thruster shape
                const radius = 0.8;
                const height = 1.5;
                const segments = 8;
                vertices = [];
                // Top circle
                for (let i = 0; i < segments; i++) {
                    const angle1 = (i / segments) * Math.PI * 2;
                    const angle2 = ((i + 1) / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * radius, height/2, Math.sin(angle1) * radius,
                        Math.cos(angle2) * radius, height/2, Math.sin(angle2) * radius
                    );
                }
                // Bottom circle
                for (let i = 0; i < segments; i++) {
                    const angle1 = (i / segments) * Math.PI * 2;
                    const angle2 = ((i + 1) / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * radius, -height/2, Math.sin(angle1) * radius,
                        Math.cos(angle2) * radius, -height/2, Math.sin(angle2) * radius
                    );
                }
                // Vertical lines connecting circles
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle) * radius, height/2, Math.sin(angle) * radius,
                        Math.cos(angle) * radius, -height/2, Math.sin(angle) * radius
                    );
                }
                break;

            case 'warp_drive':
                // Torus - ring drive shape
                const majorRadius = 1.0;
                const minorRadius = 0.3;
                const majorSegments = 12;
                const minorSegments = 6;
                vertices = [];
                // Major circles
                for (let i = 0; i < majorSegments; i++) {
                    const angle1 = (i / majorSegments) * Math.PI * 2;
                    const angle2 = ((i + 1) / majorSegments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * majorRadius, 0, Math.sin(angle1) * majorRadius,
                        Math.cos(angle2) * majorRadius, 0, Math.sin(angle2) * majorRadius
                    );
                }
                // Minor circles
                for (let i = 0; i < majorSegments; i += 3) { // Every 3rd segment
                    const majorAngle = (i / majorSegments) * Math.PI * 2;
                    const centerX = Math.cos(majorAngle) * majorRadius;
                    const centerZ = Math.sin(majorAngle) * majorRadius;
                    for (let j = 0; j < minorSegments; j++) {
                        const minorAngle1 = (j / minorSegments) * Math.PI * 2;
                        const minorAngle2 = ((j + 1) / minorSegments) * Math.PI * 2;
                        vertices.push(
                            centerX + Math.cos(minorAngle1) * minorRadius * Math.cos(majorAngle),
                            Math.sin(minorAngle1) * minorRadius,
                            centerZ + Math.cos(minorAngle1) * minorRadius * Math.sin(majorAngle),
                            centerX + Math.cos(minorAngle2) * minorRadius * Math.cos(majorAngle),
                            Math.sin(minorAngle2) * minorRadius,
                            centerZ + Math.cos(minorAngle2) * minorRadius * Math.sin(majorAngle)
                        );
                    }
                }
                break;

            case 'target_computer':
                // Tetrahedron - precise targeting shape
                vertices = [
                    // Base triangle
                    1, -0.5, -0.5,   -1, -0.5, -0.5,
                    -1, -0.5, -0.5,  0, -0.5, 1,
                    0, -0.5, 1,      1, -0.5, -0.5,
                    // Apex connections
                    1, -0.5, -0.5,   0, 1, 0,
                    -1, -0.5, -0.5,  0, 1, 0,
                    0, -0.5, 1,      0, 1, 0
                ];
                break;

            case 'long_range_scanner':
                // Dish/Parabola - scanning array shape
                const dishRadius = 1.2;
                const dishSegments = 12;
                vertices = [];
                // Dish rim
                for (let i = 0; i < dishSegments; i++) {
                    const angle1 = (i / dishSegments) * Math.PI * 2;
                    const angle2 = ((i + 1) / dishSegments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * dishRadius, 0, Math.sin(angle1) * dishRadius,
                        Math.cos(angle2) * dishRadius, 0, Math.sin(angle2) * dishRadius
                    );
                }
                // Dish spokes to center
                for (let i = 0; i < dishSegments; i += 2) {
                    const angle = (i / dishSegments) * Math.PI * 2;
                    vertices.push(
                        0, 0, 0,
                        Math.cos(angle) * dishRadius, 0, Math.sin(angle) * dishRadius
                    );
                }
                // Support structure
                vertices.push(0, 0, 0, 0, -1, 0);
                break;

            case 'energy_reactor':
                // Cube - power core shape
                vertices = [
                    // Front face
                    -1, -1, 1,   1, -1, 1,
                    1, -1, 1,    1, 1, 1,
                    1, 1, 1,     -1, 1, 1,
                    -1, 1, 1,    -1, -1, 1,
                    // Back face
                    -1, -1, -1,  1, -1, -1,
                    1, -1, -1,   1, 1, -1,
                    1, 1, -1,    -1, 1, -1,
                    -1, 1, -1,   -1, -1, -1,
                    // Connecting edges
                    -1, -1, 1,   -1, -1, -1,
                    1, -1, 1,    1, -1, -1,
                    1, 1, 1,     1, 1, -1,
                    -1, 1, 1,    -1, 1, -1
                ];
                break;

            case 'hull_plating':
                // Hexagonal prism - armor plating shape
                const hexRadius = 1.0;
                const hexHeight = 0.8;
                vertices = [];
                // Top hexagon
                for (let i = 0; i < 6; i++) {
                    const angle1 = (i / 6) * Math.PI * 2;
                    const angle2 = ((i + 1) / 6) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * hexRadius, hexHeight/2, Math.sin(angle1) * hexRadius,
                        Math.cos(angle2) * hexRadius, hexHeight/2, Math.sin(angle2) * hexRadius
                    );
                }
                // Bottom hexagon
                for (let i = 0; i < 6; i++) {
                    const angle1 = (i / 6) * Math.PI * 2;
                    const angle2 = ((i + 1) / 6) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * hexRadius, -hexHeight/2, Math.sin(angle1) * hexRadius,
                        Math.cos(angle2) * hexRadius, -hexHeight/2, Math.sin(angle2) * hexRadius
                    );
                }
                // Vertical edges
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle) * hexRadius, hexHeight/2, Math.sin(angle) * hexRadius,
                        Math.cos(angle) * hexRadius, -hexHeight/2, Math.sin(angle) * hexRadius
                    );
                }
                break;

            default:
                // Default: Simple wireframe cube
                vertices = [
                    -1, -1, 1,   1, -1, 1,   1, -1, 1,    1, 1, 1,
                    1, 1, 1,     -1, 1, 1,   -1, 1, 1,    -1, -1, 1,
                    -1, -1, -1,  1, -1, -1,  1, -1, -1,   1, 1, -1,
                    1, 1, -1,    -1, 1, -1,  -1, 1, -1,   -1, -1, -1,
                    -1, -1, 1,   -1, -1, -1, 1, -1, 1,    1, -1, -1,
                    1, 1, 1,     1, 1, -1,   -1, 1, 1,    -1, 1, -1
                ];
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return new THREE.LineSegments(geometry, material);
    }

    /**
     * Update sub-system wireframe based on current sub-target
     * @param {string} systemName - Name of the system
     * @param {number} healthPercentage - Health as decimal (0-1)
     * @param {string} diplomacyColor - CSS color string
     */
    updateSubSystemWireframe(systemName, healthPercentage = 1.0, diplomacyColor = '#00ff41') {
        if (!this.subSystemWireframeScene || !this.subSystemWireframeRenderer) return;

        // Clear existing wireframe
        while (this.subSystemWireframeScene.children.length > 2) { // Keep lights
            this.subSystemWireframeScene.remove(this.subSystemWireframeScene.children[2]);
        }

        if (!systemName) return;

        // Convert diplomacy color to hex number for Three.js
        const baseColor = this.convertColorToHex(diplomacyColor);

        // Create new wireframe for the system with faction color
        const wireframe = this.createSubSystemGeometry(systemName, baseColor);

        // Adjust color based on health while maintaining faction hue
        const finalColor = this.getFactionHealthColor(diplomacyColor, healthPercentage);
        wireframe.material.color.setHex(finalColor);

        // Add rotation animation
        wireframe.rotation.x = Date.now() * 0.0005;
        wireframe.rotation.y = Date.now() * 0.001;

        this.subSystemWireframeScene.add(wireframe);

        // Store reference for animation
        this.currentSubSystemWireframe = wireframe;

        // Render the scene
        this.subSystemWireframeRenderer.render(this.subSystemWireframeScene, this.subSystemWireframeCamera);

        debug('TARGETING', `Sub-system wireframe updated: ${systemName} (${Math.round(healthPercentage * 100)}% health, ${diplomacyColor} faction)`);
    }

    /**
     * Convert CSS color string to Three.js hex number
     * @param {string} colorString - CSS color (e.g., '#00ff41')
     * @returns {number} Hex color as integer
     */
    convertColorToHex(colorString) {
        // Remove # if present
        const hex = colorString.replace('#', '');
        return parseInt(hex, 16);
    }

    /**
     * Get faction-based health color that maintains faction hue but adjusts for damage
     * @param {string} diplomacyColor - CSS color string
     * @param {number} healthPercentage - Health as decimal (0-1)
     * @returns {number} Hex color as integer
     */
    getFactionHealthColor(diplomacyColor, healthPercentage) {
        // For healthy systems (70%+), use full faction color
        if (healthPercentage > 0.7) {
            return this.convertColorToHex(diplomacyColor);
        }

        // For damaged systems, blend faction color with damage indicators
        const baseColor = this.convertColorToHex(diplomacyColor);

        if (healthPercentage > 0.4) {
            // Slightly damaged - blend with yellow
            return this.blendColors(baseColor, 0xffff00, 0.3);
        } else if (healthPercentage > 0.2) {
            // Heavily damaged - blend with orange
            return this.blendColors(baseColor, 0xff8800, 0.5);
        } else {
            // Critical - blend with red
            return this.blendColors(baseColor, 0xff0000, 0.7);
        }
    }

    /**
     * Blend two hex colors
     * @param {number} color1 - First hex color
     * @param {number} color2 - Second hex color
     * @param {number} ratio - Blend ratio (0-1, where 1 = full color2)
     * @returns {number} Blended hex color
     */
    blendColors(color1, color2, ratio) {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;

        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;

        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

        return (r << 16) | (g << 8) | b;
    }

    /**
     * Get color based on health percentage (legacy method for compatibility)
     * @param {number} healthPercentage - Health as decimal (0-1)
     * @returns {number} Hex color as integer
     */
    getHealthColor(healthPercentage) {
        if (healthPercentage > 0.7) return 0x00ff41; // Green - healthy
        if (healthPercentage > 0.4) return 0xffff00; // Yellow - damaged
        if (healthPercentage > 0.2) return 0xff8800; // Orange - heavily damaged
        return 0xff0000; // Red - critical
    }

    /**
     * Animate sub-system wireframe
     */
    animateSubSystemWireframe() {
        if (this.currentSubSystemWireframe && this.subSystemWireframeRenderer && this.subSystemWireframeScene) {
            // Rotate the wireframe
            this.currentSubSystemWireframe.rotation.x += 0.005;
            this.currentSubSystemWireframe.rotation.y += 0.01;

            // Render the scene
            this.subSystemWireframeRenderer.render(this.subSystemWireframeScene, this.subSystemWireframeCamera);
        }
    }

    /**
     * Check if panel is currently visible
     * @returns {boolean} True if panel is visible
     */
    isPanelVisible() {
        return this.subSystemPanel && this.subSystemPanel.style.opacity === '1';
    }

    /**
     * Dispose of panel DOM elements and Three.js resources
     */
    dispose() {
        // Dispose Three.js resources
        if (this.subSystemWireframeRenderer) {
            this.subSystemWireframeRenderer.dispose();
        }
        if (this.currentSubSystemWireframe) {
            if (this.currentSubSystemWireframe.geometry) {
                this.currentSubSystemWireframe.geometry.dispose();
            }
            if (this.currentSubSystemWireframe.material) {
                this.currentSubSystemWireframe.material.dispose();
            }
        }

        // Remove DOM elements
        if (this.subSystemPanel && this.subSystemPanel.parentNode) {
            this.subSystemPanel.parentNode.removeChild(this.subSystemPanel);
        }

        this.subSystemPanel = null;
        this.subSystemWireframeContainer = null;
        this.subSystemContent = null;
        this.subSystemWireframeRenderer = null;
        this.subSystemWireframeScene = null;
        this.subSystemWireframeCamera = null;
        this.currentSubSystemWireframe = null;
    }
}
