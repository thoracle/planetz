/**
 * ProximityDetector3D - 3D Perspective Proximity Detector Display
 * 
 * Elite (1984) inspired 3D spatial visualization system featuring:
 * - Tilted 3D perspective grid (30-45° angle)
 * - Dynamic rotation with ship orientation  
 * - Vertical altitude indicator lines
 * - Perspective depth cues (scaling, fading, convergence)
 * - Retro holographic aesthetic
 * 
 * Based on revised docs/radar_spec.md
 */

import * as THREE from 'three';

export class ProximityDetector3D {
    constructor(starfieldManager, container) {
        this.starfieldManager = starfieldManager;
        this.container = container;
        this.THREE = starfieldManager.THREE || THREE;
        
        // 3D Configuration
        this.config = {
            // Display properties
            screenWidth: 0.3125,            // 31.25% of screen width (25% wider)
            screenHeight: 0.1875,           // 18.75% of screen height (25% shorter)
            position: 'bottom-center',       // Lower center position
            
            // 3D Grid properties
            gridSize: 12,                   // 12x12 grid for better testing resolution (kept as requested)
            gridSpacing: 100,               // 100m per grid square (reduced from 1km for close-range view)
            gridTilt: -35,                  // 35° tilt from horizontal (degrees)
            
            // Detection properties  
            detectionRange: 1200,           // 1.2km spherical range (much closer for combat/close objects)
            altitudeRange: 600,             // ±600m vertical range (reduced for close-range focus)
            
            // Visual properties
            fadeDistance: 1000,             // Objects start fading at 1km
            updateFrequency: 20,            // 20Hz updates for smooth 3D
            
            // Zoom levels for dynamic ranging (7 levels total, ordered far to close)
            // CORRECTED: Higher magnification for wider views (to see distant objects)
            zoomLevels: [
                { name: 'Galaxy', range: 160000, gridSpacing: 12800, label: '160km', magnification: 8 },     // 8x magnification for distant objects
                { name: 'Region', range: 80000, gridSpacing: 6400, label: '80km', magnification: 4 },       // 4x magnification for far objects
                { name: 'Wide Area', range: 40000, gridSpacing: 3200, label: '40km', magnification: 2 },     // 2x magnification for wide view
                { name: 'Sector', range: 20000, gridSpacing: 1600, label: '20km', magnification: 1.5 },     // 1.5x magnification for sector view
                { name: 'System', range: 15000, gridSpacing: 1200, label: '15km', magnification: 1.25 },    // 1.25x magnification for system view
                { name: 'Standard', range: 10000, gridSpacing: 800, label: '10km', magnification: 1 },      // 1x baseline (standard)
                { name: 'Local', range: 5000, gridSpacing: 400, label: '5km', magnification: 0.75 }        // 0.75x for close objects (already big)
            ],
            currentZoomLevel: 2,            // Start with x2 magnification (Wide Area - 40km)
            
            // Perspective properties
            cameraDistance: 4,              // Camera distance from grid (closer for zoom)
            fov: 45,                        // Focused field of view for zoomed view
            convergenceStrength: 0.3        // Grid line convergence factor
        };
        
        // Logging control system
        this.debugMode = false;             // Production: disabled by default
        this.lastLogTime = 0;
        this.logInterval = 3000;            // Log important events every 3 seconds max
        this.sessionStats = {
            objectsTracked: 0,
            lastObjectCount: 0,
            lastTotalObjects: 0,
            toggleCount: 0,
            errors: 0,
            lastSpecUpdate: 0
        };
        
        // 3D Scene components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gridMesh = null;
        this.playerIndicator = null;
        
        // Object tracking
        this.trackedObjects = new Map();
        this.objectBlips = new Map();
        this.altitudeLines = new Map();
        
        // State
        this.isVisible = false;
        this.lastUpdate = 0;
        this.currentShipRotation = new THREE.Euler();
        
        // Container elements
        this.detectorContainer = null;
        this.canvas3D = null;
        
        // Logging control for production
        this.debugMode = false; // Set to true for debugging
        this.lastLogTime = 0;
        this.logInterval = 5000; // Log important events every 5 seconds max
        this.sessionStats = {
            objectsTracked: 0,
            toggleCount: 0,
            errors: 0,
            lastObjectCount: -1
        };
        
        this.initialize();
    }
    
    /**
     * Controlled logging method to reduce console spam
     * @param {string} level - Log level (log, warn, error)
     * @param {string} message - Message to log
     * @param {*} data - Optional data to include
     * @param {boolean} forceLog - Force logging regardless of throttling
     */
    logControlled(level, message, data = null, forceLog = false) {
        const now = Date.now();
        
        // Always log errors and forced messages
        if (level === 'error' || level === 'warn' || forceLog) {
            console[level](`🎯 ProximityDetector3D: ${message}`, data || '');
            if (level === 'error') this.sessionStats.errors++;
            return;
        }
        
        // Throttle debug messages
        if (this.debugMode && (now - this.lastLogTime > this.logInterval)) {
            console[level](`🎯 ProximityDetector3D: ${message}`, data || '');
            this.lastLogTime = now;
        }
    }
    
    /**
     * Initialize the 3D proximity detector
     */
    initialize() {
        this.logControlled('log', 'Initializing 3D Perspective Proximity Detector...', null, true);
        
        this.createHUDContainer();
        this.setup3DScene();
        this.createPerspectiveGrid();
        this.createPlayerIndicator();
        this.setupEventListeners();
        
        this.logControlled('log', '3D Proximity Detector initialized', null, true);
    }
    
    /**
     * Create the HUD container element
     */
    createHUDContainer() {
        // Remove old container if it exists
        const existingContainer = document.querySelector('.proximity-detector-3d');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Create main container
        this.detectorContainer = document.createElement('div');
        this.detectorContainer.className = 'proximity-detector-3d';
        
        // Calculate responsive size
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const detectorWidth = Math.floor(screenWidth * this.config.screenWidth);
        const detectorHeight = Math.floor(screenHeight * this.config.screenHeight);
        
        this.detectorContainer.style.cssText = `
            position: fixed;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            width: ${detectorWidth}px;
            height: ${detectorHeight}px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00ff41;
            border-radius: 4px;
            font-family: 'VT323', monospace;
            color: #00ff41;
            padding: 6px;
            box-shadow: 
                0 0 20px rgba(0, 255, 65, 0.3),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
            z-index: 1000;
            display: none;
            user-select: none;
            pointer-events: none;
            backdrop-filter: blur(2px);
        `;
        
        // Add range display
        const rangeDisplay = document.createElement('div');
        rangeDisplay.className = 'proximity-range-display';
        const currentZoom = this.config.zoomLevels[this.config.currentZoomLevel];
        rangeDisplay.textContent = `MAG: x${currentZoom.magnification}`;
        rangeDisplay.style.cssText = `
            position: absolute;
            top: 4px;
            right: 6px;
            font-size: 14px;
            font-family: "Courier New", monospace;
            color: #00ff41;
            font-weight: bold;
            letter-spacing: 1px;
        `;
        this.detectorContainer.appendChild(rangeDisplay);
        this.rangeDisplay = rangeDisplay;
        
        // Add zoom hint
        const zoomHint = document.createElement('div');
        zoomHint.className = 'proximity-zoom-hint';
        zoomHint.textContent = '+/- ZOOM';
        zoomHint.style.cssText = `
            position: absolute;
            bottom: 4px;
            right: 6px;
            font-size: 15px;
            color: #00ff41;
            opacity: 0.6;
            letter-spacing: 1px;
        `;
        this.detectorContainer.appendChild(zoomHint);
        
        // Scan line effect removed for cleaner display
        
        this.container.appendChild(this.detectorContainer);
        
        // Scan line effect removed for cleaner display
        
        // Store dimensions for 3D renderer (consistent with updateDetectorSpecifications)
        this.canvasWidth = detectorWidth - 16;  // Account for padding
        this.canvasHeight = detectorHeight - 28; // Account for padding and range display
    }
    
    /**
     * Setup the 3D scene with perspective camera
     */
    setup3DScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create perspective camera
        this.camera = new THREE.PerspectiveCamera(
            this.config.fov,
            this.canvasWidth / this.canvasHeight,
            0.1,
            100
        );
        
        // Position camera for tilted perspective view
        this.camera.position.set(0, this.config.cameraDistance, this.config.cameraDistance * 0.7);
        this.camera.lookAt(0, 0, 0);
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(this.canvasWidth, this.canvasHeight);
        this.renderer.setClearColor(0x000000, 0.0); // Transparent background
        
        // Apply retro rendering settings
        this.renderer.sortObjects = false;
        this.renderer.shadowMap.enabled = false;
        
        // Add canvas to container
        this.canvas3D = this.renderer.domElement;
        this.canvas3D.style.cssText = `
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        `;
        
        this.detectorContainer.appendChild(this.canvas3D);
    }
    
    /**
     * Create the tilted 3D perspective grid
     */
    createPerspectiveGrid() {
        const gridGroup = new THREE.Group();
        
        // Grid parameters
        const gridSize = this.config.gridSize;
        const spacing = this.config.gridSpacing / 1000; // Convert to scene units
        const halfSize = (gridSize - 1) * spacing / 2;
        
        // Create grid line material with retro glow
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff41,
            opacity: 0.8,
            transparent: true,
            linewidth: 1
        });
        
        // Create horizontal grid lines (X direction)
        for (let i = 0; i < gridSize; i++) {
            const z = -halfSize + (i * spacing);
            const geometry = new THREE.BufferGeometry();
            const points = [
                new THREE.Vector3(-halfSize, 0, z),
                new THREE.Vector3(halfSize, 0, z)
            ];
            geometry.setFromPoints(points);
            
            const line = new THREE.Line(geometry, gridMaterial);
            gridGroup.add(line);
        }
        
        // Create vertical grid lines (Z direction)  
        for (let i = 0; i < gridSize; i++) {
            const x = -halfSize + (i * spacing);
            const geometry = new THREE.BufferGeometry();
            const points = [
                new THREE.Vector3(x, 0, -halfSize),
                new THREE.Vector3(x, 0, halfSize)
            ];
            geometry.setFromPoints(points);
            
            const line = new THREE.Line(geometry, gridMaterial);
            gridGroup.add(line);
        }
        
        // Add perspective convergence effect by scaling distant lines
        gridGroup.children.forEach((line, index) => {
            const vertices = line.geometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                const z = vertices[i + 2]; // Z coordinate
                const distanceFactor = 1 - (Math.abs(z) / halfSize) * this.config.convergenceStrength;
                vertices[i] *= distanceFactor; // Scale X coordinate
            }
            line.geometry.attributes.position.needsUpdate = true;
        });
        
        // Apply grid tilt
        gridGroup.rotation.x = THREE.MathUtils.degToRad(this.config.gridTilt);
        
        this.gridMesh = gridGroup;
        this.scene.add(this.gridMesh);
        
        this.logControlled('log', `Created ${gridSize}x${gridSize} perspective grid with ${this.config.gridTilt}° tilt`, null, true);
    }
    
    /**
     * Create player indicator at grid center
     */
    createPlayerIndicator() {
        // Create player triangle indicator (same size as enemy triangles)
        const triangleGeometry = new THREE.BufferGeometry();
        const triangleVertices = new Float32Array([
            0, 0, 0.25,     // Top point (forward - points up on screen)
            -0.15, 0, -0.15, // Bottom left
            0.15, 0, -0.15   // Bottom right
        ]);
        triangleGeometry.setAttribute('position', new THREE.BufferAttribute(triangleVertices, 3));
        
        const triangleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,  // Cyan for player
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        this.playerIndicator = new THREE.Mesh(triangleGeometry, triangleMaterial);
        this.playerIndicator.position.set(0, 0.05, 0); // Slightly above grid
        
        this.scene.add(this.playerIndicator);
        
        console.log('🎯 Player indicator created at grid center');
    }
    
    /**
     * Setup event listeners for responsive resizing
     */
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.handleResize();
            }
        });
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const detectorWidth = Math.floor(screenWidth * this.config.screenWidth);
        const detectorHeight = Math.floor(screenHeight * this.config.screenHeight);
        
        this.canvasWidth = detectorWidth - 16;
        this.canvasHeight = detectorHeight - 28;
        
        // Update container size
        this.detectorContainer.style.width = `${detectorWidth}px`;
        this.detectorContainer.style.height = `${detectorHeight}px`;
        
        // Update camera and renderer
        this.camera.aspect = this.canvasWidth / this.canvasHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvasWidth, this.canvasHeight);
    }
    
    /**
     * Toggle proximity detector visibility
     */
    toggle() {
        // Check if ship has radar cards before allowing toggle
        if (!this.canUseDetector()) {
            this.logControlled('warn', 'Cannot toggle - no proximity detector cards installed', null, true);
            return false;
        }
        
        this.isVisible = !this.isVisible;
        this.detectorContainer.style.display = this.isVisible ? 'block' : 'none';
        
        // Log toggle events
        this.sessionStats.toggleCount++;
        this.logControlled('log', `${this.isVisible ? 'Enabled' : 'Disabled'}`, null, true);
        
        if (this.isVisible) {
            // Update detector specifications based on installed cards
            this.updateDetectorSpecifications();
            
            // Use the same logic as zoom which works correctly
            // Get current zoom level and force a "zoom" to the same level to trigger proper initialization
            const currentZoomLevel = this.getCurrentZoom();
            
            // Update config to match zoom level (same as updateZoom method)
            this.config.detectionRange = currentZoomLevel.range;
            this.config.gridSpacing = currentZoomLevel.gridSpacing;
            this.config.fadeDistance = currentZoomLevel.range * 0.8;
            
            // Dynamically adjust camera distance based on magnification level
            // Higher magnification = camera closer to player for better separation
            const baseCameraDistance = 4; // Base distance
            const magnificationFactor = 1 / currentZoomLevel.magnification; // Inverse: higher mag = closer camera
            this.config.cameraDistance = baseCameraDistance * magnificationFactor;
            
            // Update camera position with new distance
            this.camera.position.set(0, this.config.cameraDistance, this.config.cameraDistance * 0.7);
            this.camera.lookAt(0, 0, 0);
            this.camera.updateProjectionMatrix();
            
            // Recreate grid with spacing (same as updateZoom method)
            if (this.gridMesh) {
                this.scene.remove(this.gridMesh);
            }
            this.createPerspectiveGrid();
            
            // Update magnification display (same as updateZoom method)
            if (this.rangeDisplay) {
                this.rangeDisplay.textContent = `MAG: x${currentZoomLevel.magnification}`;
            }
            
            // Force update to show range (same as updateZoom method)
            this.forceUpdate();
        }
        
        return true;
    }
    
    /**
     * Zoom in to closer range (higher detail, smaller area)
     */
    zoomIn() {
        if (!this.isVisible) return false;
        
        // Can't zoom in further if already at closest level
        if (this.config.currentZoomLevel <= 0) {
            return false;
        }
        
        // Move to closer zoom level
        this.config.currentZoomLevel--;
        return this.updateZoom();
    }
    
    /**
     * Zoom out to farther range (lower detail, larger area)
     */
    zoomOut() {
        if (!this.isVisible) return false;
        
        // Can't zoom out further if already at farthest level
        if (this.config.currentZoomLevel >= this.config.zoomLevels.length - 1) {
            return false;
        }
        
        // Move to farther zoom level
        this.config.currentZoomLevel++;
        return this.updateZoom();
    }
    
    /**
     * Update the display after zoom level change
     */
    updateZoom() {
        const zoomLevel = this.config.zoomLevels[this.config.currentZoomLevel];
        
        // Update config to match zoom level
        this.config.detectionRange = zoomLevel.range;
        this.config.gridSpacing = zoomLevel.gridSpacing;
        this.config.fadeDistance = zoomLevel.range * 0.8;
        
        // Dynamically adjust camera distance based on magnification level
        // Higher magnification = camera closer to player for better separation
        const baseCameraDistance = 4; // Base distance
        const magnificationFactor = 1 / zoomLevel.magnification; // Inverse: higher mag = closer camera
        this.config.cameraDistance = baseCameraDistance * magnificationFactor;
        
        // Update camera position with new distance
        this.camera.position.set(0, this.config.cameraDistance, this.config.cameraDistance * 0.7);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        console.log(`📷 CAMERA: Position Y=${this.config.cameraDistance.toFixed(2)}, Z=${(this.config.cameraDistance * 0.7).toFixed(2)}, Looking at (0,0,0)`);
        
        // Recreate grid with new spacing
        if (this.gridMesh) {
            this.scene.remove(this.gridMesh);
        }
        this.createPerspectiveGrid();
        
        // Update magnification display
        if (this.rangeDisplay) {
            this.rangeDisplay.textContent = `MAG: x${zoomLevel.magnification}`;
        }
        
        // Force update to show new range
        this.forceUpdate();
        
        this.logControlled('log', `Zoom: ${zoomLevel.name} (${zoomLevel.label})`, null, true);
        return true;
    }
    
    /**
     * Check if proximity detector can be used (requires radar cards)
     */
    canUseDetector() {
        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) return false;
        
        // Check if ship has radar cards installed
        return ship.hasSystemCardsSync('radar');
    }
    
    /**
     * Update detector specifications based on installed cards
     */
    updateDetectorSpecifications() {
        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) return;
        
        // Get radar system if it exists
        const radarSystem = ship.getSystem('radar');
        if (radarSystem) {
            // Update detector configuration based on radar system capabilities
            this.config.detectionRange = radarSystem.getRange();
            this.config.updateFrequency = radarSystem.getUpdateFrequency();
            
            console.log(`🎯 ProximityDetector3D: Updated to Level ${radarSystem.level} specifications:`, {
                range: `${(this.config.detectionRange / 1000).toFixed(0)}km`,
                updateFrequency: `${this.config.updateFrequency}Hz`
            });
        } else {
            // Use basic specifications if no radar system
            this.config.detectionRange = 10000;  // 10km basic range
            this.config.updateFrequency = 20;    // 20Hz basic update rate
            
            console.log('🎯 ProximityDetector3D: Using basic detector specifications');
        }
    }
    
    /**
     * Normalize altitude into one of 9 discrete buckets for better visual distribution
     * @param {number} worldAltitude - The actual world Y coordinate difference
     * @returns {number} - Normalized Y position for the altitude line (-0.8 to +0.8)
     */
    normalizeAltitudeToBucket(worldAltitude) {
        // Define 9 altitude buckets with fixed Y positions
        const buckets = [
            { name: 'very_low', y: -0.7, threshold: -Infinity },      // Bottom bucket
            { name: 'low', y: -0.5, threshold: -1000 },               // Large negative
            { name: 'somewhat_low', y: -0.25, threshold: -500 },       // Medium negative  
            { name: 'not_very_low', y: -0.1, threshold: -100 },       // Small negative
            { name: 'zero', y: 0, threshold: -50 },                   // Near grid level
            { name: 'not_very_high', y: 0.1, threshold: 50 },         // Small positive
            { name: 'somewhat_high', y: 0.25, threshold: 100 },       // Medium positive
            { name: 'high', y: 0.5, threshold: 500 },                 // Large positive
            { name: 'very_high', y: 0.7, threshold: 1000 }            // Top bucket
        ];
        
        // Find the appropriate bucket for this altitude
        for (let i = buckets.length - 1; i >= 0; i--) {
            if (worldAltitude >= buckets[i].threshold) {
                return buckets[i].y;
            }
        }
        
        // Fallback to very_low if something goes wrong
        return buckets[0].y;
    }

    /**
     * Force immediate detector update
     */
    forceUpdate() {
        if (!this.isVisible) return;
        
        // Bypass throttling for immediate update
        this.updateTrackedObjects();
        this.updateGridOrientation();
        this.render3DScene();
        this.lastUpdate = 0;
    }
    
    /**
     * Main update loop - called from StarfieldManager
     */
    update(deltaTime) {
        if (!this.isVisible) return;
        
        // Throttle updates based on configured frequency
        const updateInterval = 1000 / this.config.updateFrequency;
        this.lastUpdate += deltaTime * 1000;
        
        if (this.lastUpdate >= updateInterval) {
            this.updateTrackedObjects();
            this.updateGridOrientation();
            this.render3DScene();
            this.lastUpdate = 0;
        }
    }
    
    /**
     * Update tracked objects and their positions
     */
    updateTrackedObjects() {
        // Reduce spam - only log updates when debug mode is on
        this.logControlled('log', 'updateTrackedObjects() called');
        
        if (!this.starfieldManager.solarSystemManager) {
            this.logControlled('warn', 'No solarSystemManager available');
            return;
        }
        
        // Try multiple ways to get the player ship and mesh
        let playerShip = this.starfieldManager.viewManager?.getShip();
        let playerMesh = playerShip?.mesh;
        
        // If no player ship mesh, try alternative approaches
        if (!playerMesh) {
            // Try getting ship from ViewManager directly
            const viewManager = this.starfieldManager.viewManager;
            if (viewManager && viewManager.ship) {
                playerShip = viewManager.ship;
                playerMesh = playerShip.mesh;
            }
            
            // Try getting camera position as fallback (player follows camera)
            if (!playerMesh && this.starfieldManager.camera) {
                this.logControlled('log', 'Using camera position as player position fallback');
                // Create a temporary position object that works like a mesh position
                const cameraPos = this.starfieldManager.camera.position;
                playerMesh = { position: cameraPos };
            }
        }
        
        if (!playerMesh || !playerMesh.position) {
            this.logControlled('warn', 'No player position available - ship mesh or camera not found');
            return;
        }
        
        const playerPosition = playerMesh.position;
        // Use current zoom level range instead of fixed detection range
        const currentZoom = this.getCurrentZoom();
        const detectionRange = currentZoom.range;
        
        // Minimal position logging - only in debug mode
        this.logControlled('log', `Player at (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}), range: ${(detectionRange/1000).toFixed(0)}km`);
        
        // Clear previous frame's objects
        this.clearPreviousObjects();
        
        // Track all objects within range
        const allObjects = this.getAllTrackableObjects();
        
        // Minimal object count logging - only in debug mode
        this.logControlled('log', `Found ${allObjects.length} trackable objects total`);
        
        // Controlled object debugging - only when debug mode enabled
        if (allObjects.length === 0) {
            this.logControlled('warn', `No trackable objects found. Sources: SolarSystem=${!!this.starfieldManager.solarSystemManager}, Ships=${this.starfieldManager.dummyShipMeshes?.length || 0}, Enemies=${this.starfieldManager.enemyShips?.length || 0}, Stations=${this.starfieldManager.spaceStations?.length || 0}`);
        }
        
        let objectsInRange = 0;
        for (const obj of allObjects) {
            if (!obj.mesh || !obj.mesh.position) {
                this.logControlled('warn', `Object ${obj.name} has no mesh or position`);
                continue;
            }
            
            const distance = playerPosition.distanceTo(obj.mesh.position);
            
            if (distance <= detectionRange && distance > 1) { // Exclude self
                // Temporarily disable celestial bodies (stars, planets, moons)
                if (obj.type === 'star' || obj.type === 'planet' || obj.type === 'moon') {
                    continue;
                }
                
                this.createObjectBlip(obj, playerPosition);
                objectsInRange++;
            }
        }
        

        
        // Only log when object count changes significantly
        if (objectsInRange !== this.sessionStats.lastObjectCount) {
            this.logControlled('log', `Tracking ${objectsInRange} objects within ${(detectionRange/1000).toFixed(0)}km range`, null, true);
            this.sessionStats.lastObjectCount = objectsInRange;
        }
        this.sessionStats.objectsTracked = objectsInRange;
    }
    
    /**
     * Get all trackable objects in the system
     */
    getAllTrackableObjects() {
        const objects = [];
        
        // Minimal logging for object collection (debug mode only)
        this.logControlled('log', 'getAllTrackableObjects() called');
        
        // Get celestial bodies (planets, moons, stars) from SolarSystemManager
        if (this.starfieldManager.solarSystemManager) {
            this.logControlled('log', 'Getting celestial bodies from SolarSystemManager');
            const bodies = this.starfieldManager.solarSystemManager.getCelestialBodies();
            
            if (bodies) {
                this.logControlled('log', `Found ${bodies.size} celestial bodies in the system`);
                for (const [key, body] of bodies.entries()) {
                    if (body && body.position) {
                        const info = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(body);
                        
                        objects.push({
                            mesh: body,  // The Three.js object
                            name: info?.name || key,
                            type: info?.type || 'celestial',
                            id: key,
                            isCelestial: true
                        });
                    }
                }
            } else {
                this.logControlled('warn', 'getCelestialBodies() returned null/undefined');
            }
        } else {
            this.logControlled('warn', 'No SolarSystemManager available');
        }
        
        // Get target dummy ships from StarfieldManager
        if (this.starfieldManager.dummyShipMeshes) {
            this.logControlled('log', `Found ${this.starfieldManager.dummyShipMeshes.length} dummy ship meshes`);
            this.starfieldManager.dummyShipMeshes.forEach((mesh, index) => {
                if (mesh && mesh.position && mesh.userData?.ship) {
                    objects.push({
                        mesh: mesh,  // The Three.js mesh
                        name: mesh.userData.ship.shipName || `Target ${index + 1}`,
                        type: 'enemy_ship',
                        id: `target_dummy_${index}`,
                        ship: mesh.userData.ship,
                        isTargetDummy: true
                    });
                }
            });
        }
        
        // Get real enemy ships if they exist
        if (this.starfieldManager.enemyShips) {
            this.starfieldManager.enemyShips.forEach((ship, index) => {
                if (ship && ship.mesh && ship.mesh.position) {
                    objects.push({
                        mesh: ship.mesh,
                        name: ship.shipName || `Enemy ${index + 1}`,
                        type: 'enemy_ship',
                        id: `enemy_${index}`,
                        ship: ship,
                        isEnemyShip: true
                    });
                }
            });
        }
        
        // Get space stations if they exist
        if (this.starfieldManager.spaceStations) {
            this.starfieldManager.spaceStations.forEach((station, index) => {
                if (station && station.mesh && station.mesh.position) {
                    objects.push({
                        mesh: station.mesh,
                        name: station.name || `Station ${index + 1}`,
                        type: 'space_station',
                        id: `station_${index}`,
                        isSpaceStation: true
                    });
                }
            });
        }
        
        // Only log object counts when significant changes occur
        if (objects.length !== this.sessionStats.lastTotalObjects) {
            this.logControlled('log', `Found ${objects.length} total objects`, null, true);
            this.sessionStats.lastTotalObjects = objects.length;
        }
        
        return objects;
    }
    
    /**
     * Clear previous frame's object blips
     */
    clearPreviousObjects() {
        // Remove all blips and altitude lines from scene
        this.objectBlips.forEach((blip) => {
            this.scene.remove(blip);
        });
        this.altitudeLines.forEach((line) => {
            this.scene.remove(line);
        });
        
        this.objectBlips.clear();
        this.altitudeLines.clear();
    }
    
    /**
     * Create a blip for an object on the 3D grid
     */
    createObjectBlip(obj, playerPosition) {
        if (!obj.mesh) return;
        
        // Calculate relative position
        const relativePos = obj.mesh.position.clone().sub(playerPosition);
        const distance = relativePos.length();
        
        // Calculate the actual size of the grid in Three.js scene units
        const gridSize = this.config.gridSize;
        const spacing = this.config.gridSpacing / 1000; // Convert to scene units (gridSpacing is in meters, convert to km)
        const gridHalfSizeInScene = (gridSize - 1) * spacing / 2; // Actual half-size of grid (0.55 units)
        
        // Use current zoom level's range for world coordinate mapping
        const currentZoom = this.getCurrentZoom();
        const worldHalfRange = (currentZoom.range / 1000) / 2; // Half the detection range in kilometers (convert from meters to km)
        
        // Map world coordinates to Three.js grid coordinates
        // Scale factor: how many Three.js units per meter
        const worldToGridScaleFactor = gridHalfSizeInScene / worldHalfRange;
        
        let gridX = relativePos.x * worldToGridScaleFactor;
        let gridZ = relativePos.z * worldToGridScaleFactor;
        
        // Apply minimum visual separation for very close objects
        const minVisualSeparation = 0.1; // Minimum separation in grid units
        const gridDistance = Math.sqrt(gridX * gridX + gridZ * gridZ);
        
        if (gridDistance > 0 && gridDistance < minVisualSeparation) {
            // Scale up to minimum separation while preserving direction
            const scaleFactor = minVisualSeparation / gridDistance;
            gridX *= scaleFactor;
            gridZ *= scaleFactor;
            console.log(`📏 MINIMUM SEPARATION: Scaled ${obj.name || obj.type} from ${gridDistance.toFixed(6)} to ${minVisualSeparation} grid units`);
        }
        
        // Debug very small distances (under 1 meter)
        if (distance < 1.0) {
            console.log(`🔍 VERY CLOSE OBJECT: ${obj.name || obj.type}`);
            console.log(`  Distance: ${(distance * 1000).toFixed(2)}mm`);
            console.log(`  World pos: (${relativePos.x.toFixed(6)}, ${relativePos.y.toFixed(6)}, ${relativePos.z.toFixed(6)})`);
            console.log(`  Scale factor: ${worldToGridScaleFactor.toFixed(6)}`);
            console.log(`  Grid pos: (${gridX.toFixed(6)}, ${gridZ.toFixed(6)})`);
            console.log(`  Grid range: ${worldHalfRange}m, Grid size: ${gridHalfSizeInScene.toFixed(3)} units`);
        }
        
        const altitude = relativePos.y; // Altitude in km (world coordinates are already in km)
        
        // Use altitude bucketing system for better visual distribution
        const bucketedAltitudeY = this.normalizeAltitudeToBucket(altitude);
        
        // Get blip color for matching altitude line color
        const blipColor = this.getBlipColor(obj);
        
        // Create altitude line with matching color
        this.createAltitudeLine(gridX, gridZ, bucketedAltitudeY, blipColor, obj);
        
        // Create object blip
        this.createBlip(obj, gridX, gridZ, bucketedAltitudeY, distance);
    }
    
    /**
     * Create vertical altitude indicator line
     */
    createAltitudeLine(gridX, gridZ, bucketedAltitudeY, blipColor, obj) {
        // Use bucketed altitude directly (already normalized to appropriate range)
        
        // Use cylinder geometry for guaranteed thickness visibility
        // Calculate line length and position
        const lineLength = Math.abs(bucketedAltitudeY);
        const lineHeight = lineLength > 0 ? lineLength : 0.01; // Minimum height for visibility
        const centerY = bucketedAltitudeY / 2; // Position cylinder center between grid and object
        
        // Calculate line thickness based on blip size (33% of triangle size)
        const baseSizeMultiplier = 0.1;
        const playerSize = baseSizeMultiplier * 2; // Full size for player ship
        const targetSize = baseSizeMultiplier * 1.2; // Smaller size for targets
        const blipSize = (obj.type === 'enemy_ship' || obj.isTargetDummy) ? targetSize : playerSize;
        const lineThickness = blipSize * 0.33; // 33% of blip size
        
        // Create thick line using cylinder geometry with proper thickness
        const lineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineHeight, 6);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: blipColor, // Match the blip color
            opacity: 0.8,
            transparent: true
        });
        
        const altitudeLine = new THREE.Mesh(lineGeometry, lineMaterial);
        
        // Position the cylinder between grid level and object altitude
        altitudeLine.position.set(gridX, centerY, gridZ);
        
        // DO NOT apply grid rotation to altitude lines - they should stay vertical
        // Grid tilt should only affect the grid itself, not the altitude indicators
        
        this.scene.add(altitudeLine);
        this.altitudeLines.set(`${obj.id || `${gridX}_${gridZ}_${Date.now()}`}`, altitudeLine);
        
        // Debug logging for altitude line creation
        console.log(`🔧 ALTITUDE LINE: Created for ${obj.name || obj.type} at (${gridX.toFixed(2)}, ${centerY.toFixed(2)}, ${gridZ.toFixed(2)}), thickness: ${lineThickness.toFixed(3)}, height: ${lineHeight.toFixed(3)}, color: #${blipColor.toString(16)}`);
    }
    
    /**
     * Create object blip on the grid
     */
    createBlip(obj, gridX, gridZ, scaledAltitudeY, distance) {
        const clampedAltitude = Math.max(-1, Math.min(1, scaledAltitudeY));
        
        // Determine blip color based on object type and faction
        const blipColor = this.getBlipColor(obj);
        
        // Use different sizes for player vs targets
        // Player ship blip should be more prominent, target blips smaller
        const baseSizeMultiplier = 0.1;
        const playerSize = baseSizeMultiplier * 2; // Full size for player ship
        const targetSize = baseSizeMultiplier * 1.2; // Smaller size for targets (60% of player size)
        
        // Choose size based on whether this is a target or other object
        const blipSize = (obj.type === 'enemy_ship' || obj.isTargetDummy) ? targetSize : playerSize;
        
        // Different shapes for different object types
        let blipGeometry;
        if (obj.type === 'enemy_ship' || obj.isTargetDummy) {
            // Triangle for ships (pointing up) - smaller for targets
            blipGeometry = new THREE.ConeGeometry(blipSize, blipSize * 1.5, 3);
        } else if (obj.type === 'planet') {
            // Large sphere for planets
            blipGeometry = new THREE.SphereGeometry(blipSize * 1.2, 8, 8);
        } else if (obj.type === 'moon') {
            // Small sphere for moons
            blipGeometry = new THREE.SphereGeometry(blipSize * 0.8, 6, 6);
        } else if (obj.type === 'star') {
            // Star shape (octahedron) - same size as enemy blips
            const starSize = (obj.type === 'star') ? targetSize : blipSize;
            blipGeometry = new THREE.OctahedronGeometry(starSize);
        } else {
            // Default cube for other objects
            blipGeometry = new THREE.BoxGeometry(blipSize, blipSize, blipSize);
        }
        
        const blipMaterial = new THREE.MeshBasicMaterial({
            color: blipColor,
            transparent: true,
            opacity: 0.9
        });
        
        const blip = new THREE.Mesh(blipGeometry, blipMaterial);
        
        // Position blip at grid coordinates with altitude (already scaled)
        blip.position.set(gridX, clampedAltitude, gridZ);
        
        // Ships point in a direction based on their altitude relative to grid plane
        if (obj.type === 'enemy_ship' || obj.isTargetDummy) {
            // Determine if object is above or below grid plane
            const gridPlaneWorldY = 0; // Grid is centered at world Y=0
            const objectAltitude = obj.mesh.position.y; // Object's world Y position
            
            if (objectAltitude >= gridPlaneWorldY) {
                // Object is at or above grid plane - point triangle UP
                blip.rotation.x = -Math.PI / 2; // Point up from grid
                console.log(`🔺 TRIANGLE UP: ${obj.name || obj.type} at altitude ${objectAltitude.toFixed(1)}m (at/above grid at ${gridPlaneWorldY})`);
            } else {
                // Object is below grid plane - point triangle DOWN
                blip.rotation.x = Math.PI / 2; // Point down from grid
                console.log(`🔻 TRIANGLE DOWN: ${obj.name || obj.type} at altitude ${objectAltitude.toFixed(1)}m (below grid at ${gridPlaneWorldY})`);
            }
        }
        
        this.scene.add(blip);
        this.objectBlips.set(obj.id || `${gridX}_${gridZ}_${Date.now()}`, blip);
    }
    
    /**
     * Get blip color based on object type and faction
     */
    getBlipColor(obj) {
        // Handle celestial bodies
        if (obj.isCelestial) {
            switch (obj.type) {
                case 'star': return 0xffffff;     // White for stars
                case 'planet': return 0xffff00;   // Yellow for planets
                case 'moon': return 0xaaaaaa;     // Gray for moons
                default: return 0x888888;         // Gray for unknown celestial
            }
        }
        
        // Handle space stations
        if (obj.isSpaceStation) {
            return 0x00ff00; // Green for stations
        }
        
        // Handle target dummies (red for practice targets)
        if (obj.isTargetDummy) {
            return 0xff0000; // Red for target dummies
        }
        
        // Handle enemy ships
        if (obj.isEnemyShip && obj.ship) {
            // Check ship diplomacy if available
            switch (obj.ship.diplomacy) {
                case 'enemy': return 0xff0000;     // Red
                case 'friendly': return 0x00ff00;  // Green  
                case 'neutral': return 0xffff00;   // Yellow
                default: return 0xff8800;          // Orange for unknown hostiles
            }
        }
        
        // Handle ships by type
        if (obj.type === 'enemy_ship') {
            return 0xff0000; // Red for enemy ships
        }
        
        // Default to gray for unknown objects
        return 0x888888;
    }
    
    /**
     * Get current zoom level configuration
     * @returns {Object} Current zoom level object
     */
    getCurrentZoom() {
        return this.config.zoomLevels[this.config.currentZoomLevel];
    }
    
    /**
     * Update grid orientation and position based on ship movement and rotation
     * Per radar_spec.md:
     * - Triangle stays pointing north (fixed orientation)
     * - Grid rotates with ship orientation
     * - Grid scrolls to keep player centered
     */
    updateGridOrientation() {
        // Try multiple ways to get the player ship and mesh (same as updateTrackedObjects)
        let playerShip = this.starfieldManager.viewManager?.getShip();
        let playerMesh = playerShip?.mesh;
        let playerRotation = null;
        let playerPosition = null;
        
        // If no player ship mesh, try alternative approaches
        if (!playerMesh) {
            // Try getting ship from ViewManager directly
            const viewManager = this.starfieldManager.viewManager;
            if (viewManager && viewManager.ship) {
                playerShip = viewManager.ship;
                playerMesh = playerShip.mesh;
            }
            
            // Try getting camera rotation and position as fallback (player follows camera)
            if (!playerMesh && this.starfieldManager.camera) {

                // Use camera rotation and position directly
                playerRotation = this.starfieldManager.camera.rotation;
                playerPosition = this.starfieldManager.camera.position;
            }
        } else {
            // Use mesh rotation and position
            playerRotation = playerMesh.rotation;
            playerPosition = playerMesh.position;
        }
        
        if (!playerRotation || !playerPosition) {
            console.log('🎯 GRID ROTATION: No ship mesh or camera available for grid rotation');
            return;
        }
        

        
        // SPEC: Grid rotates with ship orientation
        // Smoothly interpolate grid rotation to match ship's Y rotation
        const targetY = -playerRotation.y; // Inverse for correct orientation
        this.gridMesh.rotation.y = THREE.MathUtils.lerp(this.gridMesh.rotation.y, targetY, 0.1);
        
        // SPEC: Triangle stays pointing north (fixed orientation)
        // Keep player indicator pointing to absolute north regardless of ship rotation
        if (this.playerIndicator) {
            this.playerIndicator.rotation.y = 0; // Always point north
        }
        
        // SPEC: Grid scrolls to keep player centered
        // Update grid position to follow ship (keeping player at center)
        // IMPORTANT: Only update X and Z, keep Y at 0 to maintain fixed grid elevation
        if (this.gridMesh) {
            // Convert ship position to grid coordinates for scrolling effect
            const gridScale = this.getCurrentZoom().gridSpacing;
            this.gridMesh.position.x = -(playerPosition.x % gridScale) / 100;
            this.gridMesh.position.y = 0; // Keep grid at fixed elevation
            this.gridMesh.position.z = -(playerPosition.z % gridScale) / 100;
        }
        
        // Keep player indicator at grid level (fixed position)
        // Player altitude should be shown via vertical lines, not by moving the indicator
        if (this.playerIndicator) {
            this.playerIndicator.position.y = 0; // Keep player indicator on grid level
            
            // Update triangle orientation based on player altitude relative to grid plane
            // Grid plane is at a fixed world Y position (determined by the game)
            const gridPlaneWorldY = 0; // Grid is centered at world Y=0
            const playerAltitude = playerPosition.y; // Player's world Y position
            
            // Point triangle up if at or above grid plane, down if below grid plane
            if (playerAltitude >= gridPlaneWorldY) {
                // Player is at or above grid plane - point triangle UP
                this.playerIndicator.rotation.x = -Math.PI / 2; // Point up on screen
            } else {
                // Player is below grid plane - point triangle DOWN
                this.playerIndicator.rotation.x = Math.PI / 2; // Point down on screen
            }
            
            // Create/update player's altitude line
            this.updatePlayerAltitudeLine(playerAltitude);
        }
    }
    
    /**
     * Create/update player's altitude line
     */
    updatePlayerAltitudeLine(playerAltitude) {
        // Remove old player altitude line if it exists
        if (this.playerAltitudeLine) {
            this.scene.remove(this.playerAltitudeLine);
        }
        
        // Convert player altitude to km and bucket it
        const altitudeInKm = playerAltitude / 1000;
        const bucketedAltitudeY = this.normalizeAltitudeToBucket(altitudeInKm);
        
        // Only create line if there's significant altitude
        if (Math.abs(bucketedAltitudeY) > 0.01) {
            // Calculate line thickness based on player triangle size (33% of triangle size)
            const baseSizeMultiplier = 0.1;
            const playerSize = baseSizeMultiplier * 2; // Full size for player ship
            const lineThickness = playerSize * 0.33; // 33% of blip size
            
            // Calculate line length and position
            const lineLength = Math.abs(bucketedAltitudeY);
            const lineHeight = lineLength > 0 ? lineLength : 0.01; // Minimum height for visibility
            const centerY = bucketedAltitudeY / 2; // Position cylinder center between grid and object
            
            // Create thick line using cylinder geometry with proper thickness
            const lineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineHeight, 6);
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff, // Cyan to match player triangle
                opacity: 0.8,
                transparent: true
            });
            
            this.playerAltitudeLine = new THREE.Mesh(lineGeometry, lineMaterial);
            this.playerAltitudeLine.position.set(0, centerY, 0); // At player position (center of grid)
            
            this.scene.add(this.playerAltitudeLine);
        }
    }
    
    /**
     * Render the 3D scene
     */
    render3DScene() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}