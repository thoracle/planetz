/**
 * ProximityGridRenderer - Handles radar grid and player indicator rendering
 * Extracted from ProximityDetector3D.js for better code organization.
 *
 * Handles:
 * - 3D perspective grid rendering
 * - Top-down 2D grid rendering
 * - Player indicator creation and positioning
 * - Grid orientation updates
 */

import { debug } from '../../debug.js';
import * as THREE from 'three';

export class ProximityGridRenderer {
    constructor(detector) {
        this.detector = detector;
        this.THREE = THREE;

        // Grid state
        this.gridMesh = null;
        this.playerIndicator = null;
        this.playerAltitudeLine = null;

        // Debug tracking
        this.playerPositionLogCount = 0;
    }

    /**
     * Create appropriate grid based on view mode
     */
    createGrid() {
        if (this.detector.viewMode === 'topDown') {
            this.createTopDownGrid();
        } else {
            this.createPerspectiveGrid();
        }
    }

    /**
     * Create 3D perspective grid with convergence effect
     */
    createPerspectiveGrid() {
        const gridGroup = new THREE.Group();
        const config = this.detector.config;

        // Grid parameters
        const gridSize = config.gridSize;
        const spacing = config.gridSpacing / 1000;
        const halfSize = (gridSize - 1) * spacing / 2;

        // Grid material
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            opacity: 0.8,
            transparent: true
        });

        const lineThickness = 0.008;
        const lineLength = gridSize * spacing;

        // Create horizontal grid lines (X direction)
        for (let i = 0; i < gridSize; i++) {
            const z = -halfSize + (i * spacing);
            const geometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength, 6);
            const line = new THREE.Mesh(geometry, gridMaterial);
            line.rotation.z = Math.PI / 2;
            line.position.set(0, 0, z);
            gridGroup.add(line);
        }

        // Create vertical grid lines (Z direction)
        for (let i = 0; i < gridSize; i++) {
            const x = -halfSize + (i * spacing);
            const geometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength, 6);
            const line = new THREE.Mesh(geometry, gridMaterial);
            line.rotation.x = Math.PI / 2;
            line.position.set(x, 0, 0);
            gridGroup.add(line);
        }

        // Add perspective convergence effect
        gridGroup.children.forEach((line) => {
            const linePosition = line.position;
            if (Math.abs(linePosition.z) > 0.001) {
                const distanceFactor = 1 - (Math.abs(linePosition.z) / halfSize) * config.convergenceStrength;
                line.scale.x = distanceFactor;
            } else if (Math.abs(linePosition.x) > 0.001) {
                const distanceFactor = 1 - (Math.abs(linePosition.x) / halfSize) * config.convergenceStrength * 0.1;
                line.scale.z = Math.max(distanceFactor, 0.5);
            }
        });

        // Apply grid tilt
        gridGroup.rotation.x = THREE.MathUtils.degToRad(config.gridTilt);

        this.gridMesh = gridGroup;
        this.detector.scene.add(this.gridMesh);

        this.detector.logControlled('log', `Created ${gridSize}x${gridSize} perspective grid with ${config.gridTilt}° tilt`, null, true);
    }

    /**
     * Create simple 2D grid for top-down view
     */
    createTopDownGrid() {
        const currentZoom = this.detector.getCurrentZoom();

        const viewHalfSize = Math.min(currentZoom.range / 1000, 50);
        const gridHalfSize = viewHalfSize * 5;
        const gridSpacing = viewHalfSize / 6;
        const gridLines = Math.ceil((gridHalfSize * 2) / gridSpacing);

        debug('UI', `🔄 Top-down grid: viewSize=${viewHalfSize}, gridSize=${gridHalfSize}, spacing=${gridSpacing}, lines=${gridLines}`);

        const gridGeometry = new THREE.BufferGeometry();
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            opacity: 0.8,
            transparent: true
        });

        const vertices = [];

        // Create horizontal lines
        for (let i = 0; i <= gridLines; i++) {
            const pos = -gridHalfSize + (i * gridSpacing);
            vertices.push(-gridHalfSize, 0, pos);
            vertices.push(gridHalfSize, 0, pos);
        }

        // Create vertical lines
        for (let i = 0; i <= gridLines; i++) {
            const pos = -gridHalfSize + (i * gridSpacing);
            vertices.push(pos, 0, -gridHalfSize);
            vertices.push(pos, 0, gridHalfSize);
        }

        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.gridMesh = new THREE.LineSegments(gridGeometry, gridMaterial);

        // Flat orientation for top-down
        this.gridMesh.rotation.x = 0;
        this.gridMesh.rotation.y = 0;
        this.gridMesh.rotation.z = 0;

        debug('UI', `🔄 Top-down grid created with flat orientation`);

        this.detector.scene.add(this.gridMesh);
    }

    /**
     * Create player indicator at grid center
     */
    createPlayerIndicator() {
        let triangleSize;
        if (this.detector.viewMode === 'topDown') {
            const currentZoom = this.detector.getCurrentZoom();
            const coordinateScale = Math.min(currentZoom.range / 1000, 50);
            triangleSize = Math.max(coordinateScale * 0.04, 1.0);
        } else {
            triangleSize = 0.25;
        }

        debug('UI', `🔄 Creating player indicator with size: ${triangleSize} for ${this.detector.viewMode} mode`);

        // Create player indicator geometry
        const playerGeometry = new THREE.BufferGeometry();
        const triangleVertices = new Float32Array([
            0, 0, -triangleSize,
            -triangleSize * 0.6, 0, triangleSize * 0.6,
            triangleSize * 0.6, 0, triangleSize * 0.6
        ]);
        playerGeometry.setAttribute('position', new THREE.BufferAttribute(triangleVertices, 3));

        let playerOpacity, playerTransparent;
        if (this.detector.viewMode === 'topDown') {
            playerOpacity = 1.0;
            playerTransparent = false;
        } else {
            playerOpacity = 0.9;
            playerTransparent = true;
        }

        const triangleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: playerTransparent,
            opacity: playerOpacity
        });

        this.playerIndicator = new THREE.Mesh(playerGeometry, triangleMaterial);

        if (this.detector.viewMode === 'topDown') {
            this.playerIndicator.position.set(0, 0.1, 0);
        } else {
            this.playerIndicator.position.set(0, 0.05, 0);
        }

        this.detector.scene.add(this.playerIndicator);
        this.initializePlayerIndicatorRotation();
    }

    /**
     * Initialize player indicator rotation
     */
    initializePlayerIndicatorRotation() {
        if (!this.playerIndicator) return;
        this.playerIndicator.rotation.y = 0;
        debug('RADAR', `Player indicator initialized with fixed upward orientation`);
    }

    /**
     * Update grid orientation based on ship heading
     * @param {number} deltaTime Time since last update
     */
    updateGridOrientation(deltaTime = 1/60) {
        const sfm = this.detector.starfieldManager;

        // Get ship heading
        let shipHeading = 0;
        if (sfm?.shipHeading !== undefined) {
            shipHeading = sfm.shipHeading;
        } else if (sfm?.camera) {
            if (sfm.shipHeading === undefined) {
                sfm.shipHeading = sfm.camera.rotation.y;
            }
            shipHeading = sfm.shipHeading;
        }

        // Get player position
        let playerPosition = new THREE.Vector3(0, 0, 0);
        if (sfm?.camera) {
            playerPosition = sfm.camera.position.clone();
        }

        // Update grid mesh rotation
        if (this.gridMesh) {
            if (this.detector.viewMode === 'topDown') {
                this.gridMesh.rotation.x = 0;
                this.gridMesh.rotation.z = 0;
                this.gridMesh.rotation.y = -shipHeading;
                this.gridMesh.position.set(-playerPosition.x, 0, -playerPosition.z);
            } else {
                this.gridMesh.rotation.x = THREE.MathUtils.degToRad(this.detector.config.gridTilt);
                this.gridMesh.rotation.y = -shipHeading - Math.PI / 2;
                this.gridMesh.rotation.z = 0;
            }
        }

        // Update player indicator
        if (this.playerIndicator) {
            if (this.detector.viewMode === 'topDown') {
                this.playerIndicator.rotation.y = 0;
                this.playerIndicator.position.set(0, 0.1, 0);
            } else {
                this.playerIndicator.rotation.y = 0;
            }

            this.playerPositionLogCount++;
            if (this.playerPositionLogCount % 600 === 0) {
                debug('UI', `🎯 PLAYER INDICATOR: Position (${this.playerIndicator.position.x}, ${this.playerIndicator.position.y}, ${this.playerIndicator.position.z}) Visible: ${this.playerIndicator.visible}`);
            }
        }
    }

    /**
     * Update player altitude line
     * @param {number} playerAltitude Player's current altitude
     */
    updatePlayerAltitudeLine(playerAltitude) {
        // Remove existing altitude line
        if (this.playerAltitudeLine) {
            this.detector.scene.remove(this.playerAltitudeLine);
            this.playerAltitudeLine = null;
        }

        // Skip in top-down mode
        if (this.detector.viewMode === 'topDown') {
            return;
        }

        // Create altitude line for player
        const bucketedAltitudeY = this.detector.normalizeAltitudeToBucket(playerAltitude);

        if (Math.abs(bucketedAltitudeY) > 0.01) {
            const lineLength = Math.abs(bucketedAltitudeY) * 2;
            const lineHeight = lineLength > 0 ? lineLength : 0.2;
            const lineThickness = 0.016;

            let centerY;
            if (bucketedAltitudeY >= 0) {
                centerY = lineHeight / 2;
            } else {
                centerY = -lineHeight / 2;
            }

            const lineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineHeight, 6);
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                opacity: 1.0,
                transparent: false
            });

            this.playerAltitudeLine = new THREE.Mesh(lineGeometry, lineMaterial);
            this.playerAltitudeLine.position.set(0, centerY, 0);

            this.detector.scene.add(this.playerAltitudeLine);
        }
    }

    /**
     * Remove and recreate grid for view mode change
     */
    recreateGrid() {
        if (this.gridMesh) {
            this.detector.scene.remove(this.gridMesh);
            this.disposeObject(this.gridMesh);
            this.gridMesh = null;
        }
        this.createGrid();
    }

    /**
     * Remove and recreate player indicator for view mode change
     */
    recreatePlayerIndicator() {
        if (this.playerIndicator) {
            this.detector.scene.remove(this.playerIndicator);
            this.disposeObject(this.playerIndicator);
            this.playerIndicator = null;
        }
        this.createPlayerIndicator();
    }

    /**
     * Dispose of a Three.js object and its resources
     * @param {THREE.Object3D} object Object to dispose
     */
    disposeObject(object) {
        if (!object) return;

        if (object.geometry) {
            object.geometry.dispose();
        }

        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else {
                object.material.dispose();
            }
        }

        if (object.children) {
            while (object.children.length > 0) {
                this.disposeObject(object.children[0]);
                object.remove(object.children[0]);
            }
        }
    }

    /**
     * Dispose all grid resources
     */
    dispose() {
        if (this.gridMesh) {
            this.detector.scene.remove(this.gridMesh);
            this.disposeObject(this.gridMesh);
            this.gridMesh = null;
        }

        if (this.playerIndicator) {
            this.detector.scene.remove(this.playerIndicator);
            this.disposeObject(this.playerIndicator);
            this.playerIndicator = null;
        }

        if (this.playerAltitudeLine) {
            this.detector.scene.remove(this.playerAltitudeLine);
            this.disposeObject(this.playerAltitudeLine);
            this.playerAltitudeLine = null;
        }
    }
}
