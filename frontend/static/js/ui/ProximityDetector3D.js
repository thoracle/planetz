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
            screenWidth: 0.25,              // 25% of screen width (SQUARE aspect ratio)
            screenHeight: 0.25,             // 25% of screen height (SQUARE aspect ratio)
            position: 'bottom-center',       // Lower center position
            
            // 3D Grid properties
            gridSize: 12,                   // 12x12 grid for better testing resolution (kept as requested)
            gridSpacing: 100,               // 100m per grid square (reduced from 1km for close-range view)
            gridTilt: -35,                  // 35° tilt from horizontal (degrees)
            
            // Detection properties  
            detectionRange: 25000,          // 25km spherical range (combat range - matches starting zoom level)
            altitudeRange: 5000,            // ±5km vertical range (extended for better target detection)
            
            // Visual properties
            fadeDistance: 20000,            // Objects start fading at 20km (80% of 25km combat range)
            updateFrequency: 20,            // 20Hz updates for smooth 3D
            
            // Zoom levels for practical gameplay (4 levels total, ordered far to close)
            // CORRECTED: Higher magnification = smaller range (more zoomed in)
            // Ranges are now inversely proportional to magnification - UPDATED FOR 25km TOP MAGNIFICATION
            zoomLevels: [
                { name: 'Long Range', range: 100000, gridSpacing: 8000, label: '100km', magnification: 0.25 },  // 0.25x - ultra wide view
                { name: 'Wide Area', range: 75000, gridSpacing: 6000, label: '75km', magnification: 0.33 },     // 0.33x - wide view  
                { name: 'Sector', range: 50000, gridSpacing: 4000, label: '50km', magnification: 0.5 },         // 0.5x - sector view
                { name: 'Combat Range', range: 25000, gridSpacing: 2000, label: '25km', magnification: 1.0 }     // 1.0x - top magnification for 25km combat range
            ],
            currentZoomLevel: 3,            // Start with top magnification (Combat Range - 25km)
            
            // Perspective properties
            cameraDistance: 4,              // Camera distance from grid (closer for zoom)
            fov: 45,                        // Focused field of view for zoomed view
            convergenceStrength: 0.3        // Grid line convergence factor
        };
        
        // Logging control system
        this.debugMode = true;              // Temporarily enabled for coordinate debugging
        this.lastLogTime = 0;
        this.logInterval = 3000;            // Log important events every 3 seconds max
        this.lastLoggedRotation = null;     // For rotation debug throttling
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
        this.lastUpdateTime = 0; // For throttling updates
        this.currentShipRotation = new THREE.Euler();
        
        // Triangle orientation: fore camera direction = movement direction
        
        // View mode state - default to 3D view
        this.viewMode = '3D'; // '3D' or 'topDown'
        
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
        
        // Expose debug method globally for console access
        window.debugRadarRotation = () => this.debugRadarRotation();
        
        // Add window resize handler for responsive positioning
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    /**
     * Handle window resize events to maintain proper radar positioning
     */
    handleWindowResize() {
        if (this.detectorContainer) {
            this.updateContainerPositioning();
            
            // Update canvas dimensions based on view mode
            if (this.viewMode === 'topDown') {
                this.canvasWidth = this.detectorContainer.offsetWidth - 20;  // Account for 10px padding each side
                this.canvasHeight = this.detectorContainer.offsetHeight - 40; // Account for 10px padding + range display space
            } else {
                this.canvasWidth = this.detectorContainer.offsetWidth - 16;  // Account for 6px padding each side  
                this.canvasHeight = this.detectorContainer.offsetHeight - 28; // Account for 6px padding + range display space
            }
            
            // Update renderer size if it exists
            if (this.renderer) {
                this.renderer.setSize(this.canvasWidth, this.canvasHeight);
            }
            
            // Update camera aspect ratio for 3D view
            if (this.viewMode === '3D' && this.camera && this.camera.isPerspectiveCamera) {
                this.camera.aspect = this.canvasWidth / this.canvasHeight;
                this.camera.updateProjectionMatrix();
            }
        }
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
        
        // Calculate initial positioning and size based on view mode
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        let detectorWidth, detectorHeight, positioningCSS;
        
        if (this.viewMode === 'topDown') {
            // Top-down view: Rectangular, upper-left corner, same width as target HUD
            // Target HUD total width = 200px content + 2px border + 10px padding each side = 224px
            // Target HUD when fully populated (target dummies) = ~320px height
            // Target HUD positioned at bottom: 80px, so top of target HUD = screen height - 80px - 320px
            const radarWidth = 200; // Match target HUD content width
            const radarHeight = 100; // Compact height to fit above target HUD
            detectorWidth = radarWidth;
            detectorHeight = radarHeight;
            positioningCSS = `
                position: fixed;
                top: 55px;
                left: 10px;
                width: ${radarWidth}px;
                height: ${radarHeight}px;
                transform: none;
            `;
        } else {
            // 3D view: Larger rectangular, bottom-center (original positioning)
            detectorWidth = Math.floor(screenWidth * this.config.screenWidth);
            detectorHeight = Math.floor(screenHeight * this.config.screenHeight);
            positioningCSS = `
                position: fixed;
                bottom: 50px;
                left: 50%;
                transform: translateX(-50%);
                width: ${detectorWidth}px;
                height: ${detectorHeight}px;
            `;
        }
        
        // Add styling based on view mode
        let stylingCSS;
        if (this.viewMode === 'topDown') {
            // Match target HUD styling for consistency
            stylingCSS = `
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #00ff41;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                color: #00ff41;
                padding: 10px;
                z-index: 1000;
                display: none;
                user-select: none;
                pointer-events: none;
            `;
        } else {
            // 3D view: Keep original styling with glow effects
            stylingCSS = `
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
        }
        
        // Apply combined positioning and styling
        this.detectorContainer.style.cssText = positioningCSS + stylingCSS;
        
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
        
        // Store dimensions for 3D renderer (account for different padding in each mode)
        if (this.viewMode === 'topDown') {
            this.canvasWidth = detectorWidth - 20;  // Account for 10px padding each side
            this.canvasHeight = detectorHeight - 40; // Account for 10px padding + range display space
        } else {
            this.canvasWidth = detectorWidth - 16;  // Account for 6px padding each side  
            this.canvasHeight = detectorHeight - 28; // Account for 6px padding + range display space
        }
    }
    
    /**
     * Update container positioning and size based on current view mode
     */
    updateContainerPositioning() {
        if (!this.detectorContainer) return;
        
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        if (this.viewMode === 'topDown') {
            // Top-down view: Rectangular, upper-left corner, same width as target HUD
            // Target HUD total width = 200px content + 2px border + 10px padding each side = 224px
            // Target HUD when fully populated (target dummies) = ~320px height
            const radarWidth = 200; // Match target HUD content width
            const radarHeight = 100; // Compact height to fit above target HUD
            
            // Position: Upper-left, below energy counter, flush left with target HUD
            // Energy counter is at top: 10px, target HUD is at left: 10px
            // Energy counter height ~45px + clearance = 55px from top
            const positioningCSS = `
                position: fixed;
                top: 55px;
                left: 10px;
                width: ${radarWidth}px;
                height: ${radarHeight}px;
                transform: none;
            `;
            
            // Match target HUD styling for consistency
            const stylingCSS = `
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #00ff41;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                color: #00ff41;
                padding: 10px;
                z-index: 1000;
                display: ${this.detectorContainer.style.display || 'none'};
                user-select: none;
                pointer-events: none;
            `;
            
            this.detectorContainer.style.cssText = positioningCSS + stylingCSS;
        } else {
            // 3D view: Larger rectangular, bottom-center (original positioning)
            const detectorWidth = Math.floor(screenWidth * this.config.screenWidth);
            const detectorHeight = Math.floor(screenHeight * this.config.screenHeight);
            
            const positioningCSS = `
                position: fixed;
                bottom: 50px;
                left: 50%;
                transform: translateX(-50%);
                width: ${detectorWidth}px;
                height: ${detectorHeight}px;
            `;
            
            // 3D view: Keep original styling with glow effects
            const stylingCSS = `
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
                display: ${this.detectorContainer.style.display || 'none'};
                user-select: none;
                pointer-events: none;
                backdrop-filter: blur(2px);
            `;
            
            this.detectorContainer.style.cssText = positioningCSS + stylingCSS;
        }
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
        
        // Create grid line material with retro glow using mesh material for guaranteed visibility
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            opacity: 0.8,
            transparent: true
        });
        
        // Line thickness for grid lines (increased for better visibility)
        const lineThickness = 0.008; // Thicker cylinder radius for better visibility
        const lineLength = gridSize * spacing;
        
        // Create horizontal grid lines (X direction) using cylinder geometry
        for (let i = 0; i < gridSize; i++) {
            const z = -halfSize + (i * spacing);
            
            // Create horizontal line using rotated cylinder
            const geometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength, 6);
            const line = new THREE.Mesh(geometry, gridMaterial);
            
            // Rotate cylinder to horizontal (90 degrees around Z axis)
            line.rotation.z = Math.PI / 2;
            line.position.set(0, 0, z);
            
            gridGroup.add(line);
        }
        
        // Create vertical grid lines (Z direction) using cylinder geometry
        for (let i = 0; i < gridSize; i++) {
            const x = -halfSize + (i * spacing);
            
            // Create vertical line using rotated cylinder (runs along Z-axis)
            const geometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength, 6);
            const line = new THREE.Mesh(geometry, gridMaterial);
            
            // Rotate cylinder to run along Z axis (90 degrees around X axis)
            line.rotation.x = Math.PI / 2;
            line.position.set(x, 0, 0);
            
            gridGroup.add(line);
        }
        
        // Add perspective convergence effect by scaling mesh objects
        gridGroup.children.forEach((line, index) => {
            // For cylinder meshes, we can apply scaling to the entire mesh object
            // Check if this line is positioned along the Z-axis (horizontal lines)
            const linePosition = line.position;
            if (Math.abs(linePosition.z) > 0.001) {
                // This is a horizontal line, apply X-axis convergence based on Z position
                const distanceFactor = 1 - (Math.abs(linePosition.z) / halfSize) * this.config.convergenceStrength;
                line.scale.x = distanceFactor;
            } else if (Math.abs(linePosition.x) > 0.001) {
                // This is a vertical line, apply very subtle convergence based on X position (reduced effect)
                const distanceFactor = 1 - (Math.abs(linePosition.x) / halfSize) * this.config.convergenceStrength * 0.1;
                line.scale.z = Math.max(distanceFactor, 0.5); // Ensure lines don't become too small
            }
        });
        
        // Apply grid tilt
        gridGroup.rotation.x = THREE.MathUtils.degToRad(this.config.gridTilt);
        
        // Grid creation debug (disabled to reduce spam)
        // console.log(`🎯 ProximityDetector3D: Grid created with ${gridGroup.children.length} lines (thickness: ${lineThickness})`);
        // console.log(`🎯 ProximityDetector3D: Grid size ${gridSize}x${gridSize}, spacing ${spacing}, half-size ${halfSize}`);
        
        this.gridMesh = gridGroup;
        this.scene.add(this.gridMesh);
        
        this.logControlled('log', `Created ${gridSize}x${gridSize} perspective grid with ${this.config.gridTilt}° tilt`, null, true);
    }
    
    /**
     * Create player indicator at grid center
     */
    createPlayerIndicator() {
        // Scale player indicator size based on view mode and coordinate space
        let triangleSize;
        if (this.viewMode === 'topDown') {
            // In top-down mode, use larger triangle for the larger coordinate space
            const currentZoom = this.getCurrentZoom();
            const coordinateScale = Math.min(currentZoom.range / 1000, 50);
            triangleSize = Math.max(coordinateScale * 0.04, 1.0); // Scale with coordinate space, minimum 1.0
        } else {
            // In 3D mode, use the standard small size
            triangleSize = 0.25;
        }
        
        console.log(`🔄 Creating player indicator with size: ${triangleSize} for ${this.viewMode} mode`);
        
        // Create player indicator geometry based on view mode
        let playerGeometry;
        if (this.viewMode === 'topDown') {
            // Top-down mode: use flat triangle that can rotate to show heading
            playerGeometry = new THREE.BufferGeometry();
            const triangleVertices = new Float32Array([
                0, 0, -triangleSize,                   // Top point (forward - points toward negative Z)
                -triangleSize * 0.6, 0, triangleSize * 0.6, // Bottom left
                triangleSize * 0.6, 0, triangleSize * 0.6   // Bottom right
            ]);
            playerGeometry.setAttribute('position', new THREE.BufferAttribute(triangleVertices, 3));
        } else {
            // 3D mode: use triangle for player
            playerGeometry = new THREE.BufferGeometry();
            const triangleVertices = new Float32Array([
                0, 0, -triangleSize,                   // Top point (forward - points toward negative Z)
                -triangleSize * 0.6, 0, triangleSize * 0.6, // Bottom left
                triangleSize * 0.6, 0, triangleSize * 0.6   // Bottom right
            ]);
            playerGeometry.setAttribute('position', new THREE.BufferAttribute(triangleVertices, 3));
        }
        
        // Make player indicator brighter in top-down mode for better visibility
        let playerOpacity, playerTransparent;
        if (this.viewMode === 'topDown') {
            // Top-down mode: fully opaque and bright for maximum visibility
            playerOpacity = 1.0;
            playerTransparent = false;
        } else {
            // 3D mode: slightly transparent as before
            playerOpacity = 0.9;
            playerTransparent = true;
        }
        
        const triangleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,  // Cyan for player
            side: THREE.DoubleSide,
            transparent: playerTransparent,
            opacity: playerOpacity
        });
        
        this.playerIndicator = new THREE.Mesh(playerGeometry, triangleMaterial);
        
        // Position based on view mode
        if (this.viewMode === 'topDown') {
            this.playerIndicator.position.set(0, 0.1, 0); // Slightly above grid for visibility
        } else {
            this.playerIndicator.position.set(0, 0.05, 0); // Slightly above grid
        }
        
        this.scene.add(this.playerIndicator);
        
        // Initialize rotation to match current ship orientation
        this.initializePlayerIndicatorRotation();
        
        // console.log(`🎯 Player indicator created at grid center for ${this.viewMode} mode at position (${this.playerIndicator.position.x}, ${this.playerIndicator.position.y}, ${this.playerIndicator.position.z}) | Visible: ${this.playerIndicator.visible} | Scale: ${this.playerIndicator.scale.x}`);
    }
    
    /**
     * Initialize player indicator rotation to match current ship orientation
     */
    initializePlayerIndicatorRotation() {
        if (!this.playerIndicator) return;
        
        // Only initialize if we don't already have accumulated rotation
        if (this.playerIndicatorAccumulatedRotation !== undefined) {
            console.log(`🎯 Player indicator already has rotation: ${THREE.MathUtils.radToDeg(this.playerIndicatorAccumulatedRotation).toFixed(1)}° - skipping initialization`);
            return;
        }
        
        // Get current ship rotation (same method as updateGridOrientation)
        let playerShip = this.starfieldManager.viewManager?.getShip();
        let playerMesh = playerShip?.mesh;
        let playerRotation = null;
        
        if (!playerMesh && this.starfieldManager.camera) {
            playerRotation = this.starfieldManager.camera.rotation;
        } else if (playerMesh) {
            playerRotation = playerMesh.rotation;
        }
        
        if (playerRotation) {
            // Initialize accumulated rotation with current ship rotation
            this.playerIndicatorAccumulatedRotation = playerRotation.y;
            
            // Apply the rotation immediately to the indicator
            if (this.viewMode === 'topDown') {
                const correctedRotation = this.playerIndicatorAccumulatedRotation + Math.PI / 4; // Add 45° correction
                const yRotationQuaternion = new THREE.Quaternion();
                yRotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), correctedRotation);
                this.playerIndicator.quaternion.copy(yRotationQuaternion);
            } else {
                // 3D mode - similar logic but can include pitch later if needed
                const correctedRotation = this.playerIndicatorAccumulatedRotation + Math.PI / 4; // Add 45° correction
                const yRotationQuaternion = new THREE.Quaternion();
                yRotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), correctedRotation);
                this.playerIndicator.quaternion.copy(yRotationQuaternion);
            }
            
            console.log(`🎯 Player indicator initialized with rotation: ${THREE.MathUtils.radToDeg(playerRotation.y).toFixed(1)}°`);
        } else {
            // No rotation available, use default (pointing north)
            this.playerIndicatorAccumulatedRotation = 0;
            console.log(`🎯 Player indicator initialized with default rotation (no ship rotation available)`);
        }
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
        
        // Can't zoom in further if already at closest level (index 3)
        if (this.config.currentZoomLevel >= this.config.zoomLevels.length - 1) {
            return false;
        }
        
        // Move to closer zoom level (higher index = closer range in new order)
        this.config.currentZoomLevel++;
        return this.updateZoom();
    }
    
    /**
     * Zoom out to farther range (lower detail, larger area)  
     */
    zoomOut() {
        if (!this.isVisible) return false;
        
        // Can't zoom out further if already at farthest level (index 0)
        if (this.config.currentZoomLevel <= 0) {
            return false;
        }
        
        // Move to farther zoom level (lower index = farther range in new order)
        this.config.currentZoomLevel--;
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
        
        // Update camera based on view mode
        if (this.viewMode === 'topDown') {
            // Update orthographic camera view size for zoom changes
            const viewSize = Math.min(zoomLevel.range / 2000, 50);
            this.camera.left = -viewSize;
            this.camera.right = viewSize;
            this.camera.top = viewSize;
            this.camera.bottom = -viewSize;
            this.camera.updateProjectionMatrix();
            console.log(`📷 ORTHO CAMERA: viewSize=${viewSize}, range=${zoomLevel.range}km`);
        } else {
            // Update perspective camera position with new distance
            this.camera.position.set(0, this.config.cameraDistance, this.config.cameraDistance * 0.7);
            this.camera.lookAt(0, 0, 0);
            this.camera.updateProjectionMatrix();
            console.log(`📷 CAMERA: Position Y=${this.config.cameraDistance.toFixed(2)}, Z=${(this.config.cameraDistance * 0.7).toFixed(2)}, Looking at (0,0,0)`);
        }
        
        // Recreate grid with new spacing for current view mode
        if (this.gridMesh) {
            this.scene.remove(this.gridMesh);
            this.gridMesh = null;
        }
        this.createGrid();
        
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
        this.updateGridOrientation(1/60); // Use default deltaTime for immediate update
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
            this.updateBlipBlinking(deltaTime);
            this.updateGridOrientation(deltaTime);
            this.render3DScene();
            this.lastUpdate = 0;
        }
    }
    
    /**
     * Update blinking animation for current target blips
     */
    updateBlipBlinking(deltaTime) {
        if (!this.objectBlips) return;
        
        const currentTime = Date.now();
        const blinkFrequency = 2.0; // Blinks per second
        const blinkCycle = (currentTime / 1000 * blinkFrequency) % 1.0; // 0 to 1 cycle
        
        // Calculate blinking opacity using sine wave for smooth fade
        const blinkOpacity = 0.3 + 0.7 * (Math.sin(blinkCycle * Math.PI * 2) * 0.5 + 0.5);
        
        this.objectBlips.forEach((blip, key) => {
            if (blip && blip.userData && blip.userData.isCurrentTarget) {
                // Update the blinking opacity
                if (blip.material) {
                    blip.material.opacity = blip.userData.baseOpacity * blinkOpacity;
                    
                    // Ensure material is set to transparent for blinking to work
                    blip.material.transparent = true;
                }
            } else if (blip && blip.userData && blip.userData.baseOpacity) {
                // Reset non-target blips to their base opacity
                if (blip.material) {
                    blip.material.opacity = blip.userData.baseOpacity;
                }
            }
        });
    }
    
    /**
     * Manual debug method to check radar rotation alignment (call from console)
     */
    debugRadarRotation() {
        if (!this.isVisible || !this.gridMesh) {
            console.log('🧭 RADAR DEBUG: Radar not visible or grid not initialized');
            return;
        }
        
        // Get player rotation same way as updateGridOrientation
        let playerShip = this.starfieldManager.viewManager?.getShip();
        let playerMesh = playerShip?.mesh;
        let playerRotation = null;
        
        if (!playerMesh && this.starfieldManager.camera) {
            playerRotation = this.starfieldManager.camera.rotation;
        } else if (playerMesh) {
            playerRotation = playerMesh.rotation;
        }
        
        if (playerRotation) {
            const playerDegrees = THREE.MathUtils.radToDeg(playerRotation.y);
            const gridDegrees = THREE.MathUtils.radToDeg(this.gridMesh.rotation.y);
            const expectedGridDegrees = THREE.MathUtils.radToDeg(-playerRotation.y - Math.PI / 2);
            const playerTriangleDegrees = this.playerIndicator ? THREE.MathUtils.radToDeg(this.playerIndicator.rotation.y) : 'N/A';
            
            console.log('🧭 === RADAR ROTATION DEBUG ===');
            console.log(`🧭 Player heading: ${playerDegrees.toFixed(1)}°`);
            console.log(`🧭 Grid rotation: ${gridDegrees.toFixed(1)}° (expected: ${expectedGridDegrees.toFixed(1)}°)`);
            console.log(`🔺 Player triangle: ${playerTriangleDegrees}°`);
            console.log(`🧭 Grid tilt (X): ${THREE.MathUtils.radToDeg(this.gridMesh.rotation.x).toFixed(1)}° (should be ${this.config.gridTilt}°)`);
            console.log(`🧭 Grid roll (Z): ${THREE.MathUtils.radToDeg(this.gridMesh.rotation.z).toFixed(1)}° (should be 0°)`);
            console.log(`🔄 Note: Grid uses angle wrapping for smooth 360° rotation`);
        } else {
            console.log('🧭 RADAR DEBUG: No player rotation available');
        }
    }
    
    /**
     * Toggle between 3D and top-down view modes
     */
    toggleViewMode() {
        if (!this.isVisible) return false;
        
        this.viewMode = this.viewMode === '3D' ? 'topDown' : '3D';
        
        console.log(`🔄 ProximityDetector: Switched to ${this.viewMode} view mode`);
        
        // Update camera and grid for the new view mode
        this.updateViewMode();
        
        // Force a complete update to redraw everything
        this.forceUpdate();
        
        return true;
    }
    
    /**
     * Update camera and rendering for current view mode
     */
    updateViewMode() {
        if (!this.camera || !this.scene) return;
        
        // Update container positioning first
        this.updateContainerPositioning();
        
        // Update canvas dimensions based on new container size and view mode
        if (this.detectorContainer) {
            if (this.viewMode === 'topDown') {
                this.canvasWidth = this.detectorContainer.offsetWidth - 20;  // Account for 10px padding each side
                this.canvasHeight = this.detectorContainer.offsetHeight - 40; // Account for 10px padding + range display space
            } else {
                this.canvasWidth = this.detectorContainer.offsetWidth - 16;  // Account for 6px padding each side  
                this.canvasHeight = this.detectorContainer.offsetHeight - 28; // Account for 6px padding + range display space
            }
            
            // Update renderer size if it exists
            if (this.renderer) {
                this.renderer.setSize(this.canvasWidth, this.canvasHeight);
            }
        }
        
        if (this.viewMode === 'topDown') {
            // Top-down orthographic view
            this.setupTopDownView();
        } else {
            // 3D perspective view (default)
            this.setup3DView();
        }
        
        // Recreate the grid for the new view mode
        if (this.gridMesh) {
            this.scene.remove(this.gridMesh);
        }
        this.createGrid();
        
        // Recreate the player indicator for the new view mode (scale appropriately)
        // IMPORTANT: Preserve only the accumulated rotation amount, not the full quaternion
        let preservedAccumulatedRotation = 0;
        if (this.playerIndicator) {
            // Save only the accumulated rotation amount (not the full quaternion which may be incompatible)
            preservedAccumulatedRotation = this.playerIndicatorAccumulatedRotation || 0;
            this.scene.remove(this.playerIndicator);
        }
        
        this.createPlayerIndicator();
        
        // Always restore the accumulated rotation (including 0° for north-facing)
        this.playerIndicatorAccumulatedRotation = preservedAccumulatedRotation;
        
        // If we have preserved rotation, apply it immediately
        if (preservedAccumulatedRotation !== null && preservedAccumulatedRotation !== undefined) {
            // Rebuild the Y rotation quaternion from the accumulated rotation
            if (this.viewMode === 'topDown') {
                const correctedRotation = preservedAccumulatedRotation + Math.PI / 4; // Add 45° correction
                const restoredRotationQuaternion = new THREE.Quaternion();
                restoredRotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), correctedRotation);
                this.playerIndicator.quaternion.copy(restoredRotationQuaternion);
            } else {
                const correctedRotation = preservedAccumulatedRotation + Math.PI / 4; // Add 45° correction
                const restoredRotationQuaternion = new THREE.Quaternion();
                restoredRotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), correctedRotation);
                this.playerIndicator.quaternion.copy(restoredRotationQuaternion);
            }
            console.log(`🔺 RESTORED: Player indicator rotation to ${(preservedAccumulatedRotation * 180 / Math.PI).toFixed(1)}°`);
        } else {
            // No preserved rotation - initialize from current ship rotation
            console.log(`🔺 No preserved rotation - initializing from current ship orientation`);
        }
    }
    
    /**
     * Setup camera for top-down 2D view
     */
    setupTopDownView() {
        // Use orthographic camera for true top-down view
        const currentZoom = this.getCurrentZoom();
        
        // Adjust view size for better visibility in top-down mode
        // Use a smaller scale factor to make objects more visible
        const viewSize = Math.min(currentZoom.range / 1000, 50); // Smaller view size, max 50 units
        
        console.log(`🔄 Top-down camera setup: zoom range=${currentZoom.range}km, viewSize=${viewSize}`);
        
        // Replace perspective camera with orthographic camera
        this.camera = new THREE.OrthographicCamera(
            -viewSize, viewSize,    // left, right
            viewSize, -viewSize,    // top, bottom  
            0.1, 1000               // near, far
        );
        
        // Position camera directly above looking down
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        
        console.log(`🔄 Top-down camera positioned at (0, 100, 0) with orthographic bounds: ${-viewSize} to ${viewSize}`);
    }
    
    /**
     * Setup camera for 3D perspective view
     */
    setup3DView() {
        // Use perspective camera for 3D view
        this.camera = new THREE.PerspectiveCamera(
            this.config.fov,
            this.detectorContainer.offsetWidth / this.detectorContainer.offsetHeight,
            0.1,
            1000
        );
        
        // Position camera at angle for 3D perspective
        this.camera.position.set(0, this.config.cameraDistance, this.config.cameraDistance * 0.7);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Create appropriate grid based on view mode
     */
    createGrid() {
        if (this.viewMode === 'topDown') {
            this.createTopDownGrid();
        } else {
            this.createPerspectiveGrid();
        }
    }
    
    /**
     * Create simple 2D grid for top-down view
     */
    createTopDownGrid() {
        const currentZoom = this.getCurrentZoom();
        
        // Create a much larger grid to handle scrolling - make it 5x larger than the view
        const viewHalfSize = Math.min(currentZoom.range / 1000, 50);
        const gridHalfSize = viewHalfSize * 5; // 5x larger to handle scrolling
        const gridSpacing = viewHalfSize / 6; // More reasonable spacing for visibility
        const gridLines = Math.ceil((gridHalfSize * 2) / gridSpacing);
        
        console.log(`🔄 Top-down grid: viewSize=${viewHalfSize}, gridSize=${gridHalfSize}, spacing=${gridSpacing}, lines=${gridLines}`);
        
        const gridGeometry = new THREE.BufferGeometry();
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            opacity: 0.8,  // Brighter grid lines for better visibility in top-down
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
        
        // Ensure grid starts with correct orientation for top-down mode
        this.gridMesh.rotation.x = 0; // No tilt in top-down
        this.gridMesh.rotation.y = 0; // No initial rotation
        this.gridMesh.rotation.z = 0; // No roll
        
        console.log(`🔄 Top-down grid created with flat orientation`);
        
        this.scene.add(this.gridMesh);
    }
    
    /**
     * Update tracked objects and their positions
     */
    updateTrackedObjects() {
        // Throttle updates to avoid excessive processing and console spam
        const now = Date.now();
        if (this.lastUpdateTime && (now - this.lastUpdateTime) < 100) { // 100ms throttle (10 FPS max)
            return;
        }
        this.lastUpdateTime = now;
        
        // DEBUG: Always log method entry
        // Disabled to stop console spam
        // console.log('🎯 updateTrackedObjects() called - ENTRY POINT');
        
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
        
        // Movement direction = fore camera direction (ship only moves forward)
        
        // Use current zoom level range instead of fixed detection range
        const currentZoom = this.getCurrentZoom();
        const detectionRangeM = currentZoom.range; // Range in meters
        const detectionRangeKm = detectionRangeM / 1000; // Convert to km (game units)
        
        // Minimal position logging - only in debug mode
        this.logControlled('log', `Player at (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}), range: ${detectionRangeKm.toFixed(0)}km`);
        
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
            
            if (distance <= detectionRangeKm && distance > 1) { // Exclude self (distance in km, range in km)
                // DEBUG: Log all objects being considered (DISABLED to reduce console spam)
                // if (obj.isTargetDummy || obj.isEnemyShip || obj.type === 'enemy_ship') {
                //     console.log(`🎯 IN RANGE: ${obj.name || obj.type} at ${distance.toFixed(1)}km (range: ${detectionRangeKm.toFixed(0)}km)`);
                // }
                
                // Temporarily disable celestial bodies (stars, planets, moons)
                if (obj.type === 'star' || obj.type === 'planet' || obj.type === 'moon') {
                                    // console.log(`  🚫 FILTERED OUT: Celestial body (${obj.type})`);
                    continue;
                }
                
                // Completely disabled to stop console spam
                // if (obj.isTargetDummy) {
                //     console.log(`  ✅ PASSED FILTER: Creating blip for ${obj.name || obj.type}`);
                // }
                
                this.createObjectBlip(obj, playerPosition);
                objectsInRange++;
            } else {
                // DEBUG: Log objects outside range (DISABLED to reduce console spam)
                // if (obj.isTargetDummy || obj.isEnemyShip || obj.type === 'enemy_ship') {
                //     console.log(`🎯 OUT OF RANGE: ${obj.name || obj.type} at ${distance.toFixed(1)}km (range: ${detectionRangeKm.toFixed(0)}km)`);
                // }
            }
        }
        

        
        // Only log when object count changes significantly
        if (objectsInRange !== this.sessionStats.lastObjectCount) {
            this.logControlled('log', `Tracking ${objectsInRange} objects within ${detectionRangeKm.toFixed(0)}km range`, null, true);
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
            // Reduced debug spam - only log once
            // console.log(`🎯 DUMMY SHIP ACCESS: Found ${this.starfieldManager.dummyShipMeshes.length} dummy ship meshes`);
            this.starfieldManager.dummyShipMeshes.forEach((mesh, index) => {
                if (mesh && mesh.position && mesh.userData?.ship) {
                    // console.log(`🎯 DUMMY SHIP FOUND: ${mesh.userData.ship.shipName || `Target ${index + 1}`} at (${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)})`);
                    objects.push({
                        mesh: mesh,  // The Three.js mesh
                        name: mesh.userData.ship.shipName || `Target ${index + 1}`,
                        type: 'enemy_ship',
                        id: `target_dummy_${index}`,
                        ship: mesh.userData.ship,
                        isTargetDummy: true
                    });
                } else {
                    console.log(`🚫 DUMMY SHIP INVALID: Index ${index} - mesh:${!!mesh}, position:${!!mesh?.position}, userData.ship:${!!mesh?.userData?.ship}`);
                }
            });
        } else {
            console.log(`🚫 NO DUMMY SHIPS: dummyShipMeshes is ${this.starfieldManager.dummyShipMeshes}`);
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
        
        // Calculate position based on view mode
        const currentZoom = this.getCurrentZoom();
        let gridX, gridZ, relativePos, distance, worldToGridScaleFactor;
        
        // Common calculations for both view modes
        relativePos = obj.mesh.position.clone().sub(playerPosition);
        distance = relativePos.length(); // distance in km (game units: 1 unit = 1km)
        const detectionRangeM = currentZoom.range; // range in meters (for camera setup)
        const worldHalfRangeM = detectionRangeM / 2; // half range in meters
        
        if (this.viewMode === 'topDown') {
            // Top-down mode: use orthographic camera coordinates
            // Camera bounds are -viewSize to +viewSize, where viewSize = range/1000
            const viewSize = Math.min(currentZoom.range / 1000, 50); // Same as camera setup
            const worldRangeKm = currentZoom.range / 1000; // Convert range to km
            worldToGridScaleFactor = viewSize / worldRangeKm; // scene units per km (should be 1.0 for 25km range)
            
            // relativePos is already in km (game units), use directly
            gridX = relativePos.x * worldToGridScaleFactor;
            gridZ = relativePos.z * worldToGridScaleFactor;
        } else {
            // 3D mode: use relative positioning with proper scaling
            const gridHalfSizeInScene = 0.55; // Fixed visual half-size
            const worldHalfRangeKm = worldHalfRangeM / 1000; // Convert to km for consistency
            worldToGridScaleFactor = gridHalfSizeInScene / worldHalfRangeKm; // scale factor: scene units per km
            
            gridX = relativePos.x * worldToGridScaleFactor;
            gridZ = relativePos.z * worldToGridScaleFactor;
        }
        
        // DEBUG: Log coordinate mapping for targets near edge of detection range (24-26km)
        if (this.viewMode === 'topDown' && (obj.isTargetDummy || obj.type === 'enemy_ship') && distance >= 24 && distance <= 26) {
            console.log(`🎯 EDGE DETECTION DEBUG for ${obj.name || obj.type}:`);
            console.log(`  Type: ${obj.type}, isTargetDummy: ${obj.isTargetDummy}, isEnemyShip: ${obj.isEnemyShip}`);
            console.log(`  World distance: ${distance.toFixed(1)}km`);
            console.log(`  Player pos: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
            console.log(`  Target pos: (${obj.mesh.position.x.toFixed(1)}, ${obj.mesh.position.y.toFixed(1)}, ${obj.mesh.position.z.toFixed(1)})`);
            console.log(`  Relative pos: (${relativePos.x.toFixed(1)}, ${relativePos.y.toFixed(1)}, ${relativePos.z.toFixed(1)})`);
            console.log(`  Detection range: ${(detectionRangeM/1000).toFixed(1)}km`);
            console.log(`  Scale factor: ${worldToGridScaleFactor.toFixed(6)}`);
            console.log(`  Grid pos: (${gridX.toFixed(3)}, ${gridZ.toFixed(3)})`);
            console.log(`  Grid distance from center: ${Math.sqrt(gridX*gridX + gridZ*gridZ).toFixed(3)} units`);
        }
        
        // Debug ALL detected objects to see what we're working with (DISABLED to reduce console spam)
        // console.log(`🎯 DETECTED OBJECT: ${obj.name || 'unnamed'}`);
        // console.log(`  Type: ${obj.type}, isTargetDummy: ${obj.isTargetDummy}, isEnemyShip: ${obj.isEnemyShip}`);
        // console.log(`  View mode: ${this.viewMode}`);
        // console.log(`  World distance: ${distance.toFixed(1)}m (${(distance/1000).toFixed(2)}km)`);
        // console.log(`  Player pos: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
        // console.log(`  Target pos: (${obj.mesh.position.x.toFixed(1)}, ${obj.mesh.position.y.toFixed(1)}, ${obj.mesh.position.z.toFixed(1)})`);
        // console.log(`  Relative pos: (${relativePos.x.toFixed(1)}, ${relativePos.y.toFixed(1)}, ${relativePos.z.toFixed(1)})`);
        // console.log(`  Grid half range: ${worldHalfRangeM.toFixed(1)}m (${(worldHalfRangeM/1000).toFixed(1)}km)`);
        // console.log(`  Detection range: ${currentZoom.range}m (${currentZoom.label})`);
        // console.log(`  Grid pos: (${gridX.toFixed(3)}, ${gridZ.toFixed(3)})`);
        // console.log(`  Grid distance from center: ${Math.sqrt(gridX*gridX + gridZ*gridZ).toFixed(3)} units`);
        
        // Apply minimum visual separation for very close objects
        const minVisualSeparation = 0.1; // Minimum separation in grid units
        const gridDistance = Math.sqrt(gridX * gridX + gridZ * gridZ);
        
        if (gridDistance > 0 && gridDistance < minVisualSeparation) {
            // Scale up to minimum separation while preserving direction
            const scaleFactor = minVisualSeparation / gridDistance;
            gridX *= scaleFactor;
            gridZ *= scaleFactor;
            // console.log(`📏 MINIMUM SEPARATION: Scaled ${obj.name || obj.type} from ${gridDistance.toFixed(6)} to ${minVisualSeparation} grid units`);
        }
        
        // Debug very small distances (under 1 meter) - disabled for production
        // if (distance < 1.0) {
        //     console.log(`🔍 VERY CLOSE OBJECT: ${obj.name || obj.type}`);
        //     console.log(`  Distance: ${(distance * 1000).toFixed(2)}mm`);
        //     console.log(`  World pos: (${relativePos.x.toFixed(6)}, ${relativePos.y.toFixed(6)}, ${relativePos.z.toFixed(6)})`);
        //     console.log(`  Scale factor: ${worldToGridScaleFactor.toFixed(6)}`);
        //     console.log(`  Grid pos: (${gridX.toFixed(6)}, ${gridZ.toFixed(6)})`);
        //     console.log(`  Grid range: ${worldHalfRange}m, Grid size: ${gridHalfSizeInScene.toFixed(3)} units`);
        // }
        
        // Calculate altitude based on view mode
        let altitude;
        if (this.viewMode === 'topDown') {
            // Top-down mode: use absolute altitude relative to player
            altitude = obj.mesh.position.y - playerPosition.y;
        } else {
            // 3D mode: use relative altitude
            altitude = relativePos.y;
        }
        
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
        // Skip altitude lines in top-down mode
        if (this.viewMode === 'topDown') {
            return;
        }
        
        // Use bucketed altitude directly (already normalized to appropriate range)
        
        // Use cylinder geometry for guaranteed thickness visibility
        // Calculate line length and position (2x taller per user request)
        const lineLength = Math.abs(bucketedAltitudeY) * 2; // Make vertical columns 2x as tall
        const lineHeight = lineLength > 0 ? lineLength : 0.2; // Minimum height (also 2x taller)
        
        // Position so line is rooted at grid plane (Y=0) and extends to object altitude
        let centerY;
        if (bucketedAltitudeY >= 0) {
            // Object above or at grid level - line extends upward from Y=0
            centerY = lineHeight / 2; // Position cylinder so bottom is at Y=0, extends upward
        } else {
            // Object below grid level - line extends downward from Y=0
            centerY = -lineHeight / 2; // Position cylinder so top is at Y=0, extends downward
        }
        
        // Calculate line thickness based on blip size (increased for better visibility)
        const baseSizeMultiplier = 0.1;
        const playerSize = baseSizeMultiplier * 2; // Full size for player ship
        const targetSize = baseSizeMultiplier * 1.2; // Smaller size for targets
        const blipSize = (obj.type === 'enemy_ship' || obj.isTargetDummy) ? targetSize : playerSize;
        const lineThickness = blipSize * 0.8; // 80% as thick as the blip
        
        // Create thick line using cylinder geometry with proper thickness
        const lineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineHeight, 6);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: blipColor, // Match the blip color
            opacity: 1.0, // Fully opaque for better visibility
            transparent: false
        });
        
        const altitudeLine = new THREE.Mesh(lineGeometry, lineMaterial);
        
        // Position the cylinder between grid level and object altitude
        altitudeLine.position.set(gridX, centerY, gridZ);
        
        // DO NOT apply grid rotation to altitude lines - they should stay vertical
        // Grid tilt should only affect the grid itself, not the altitude indicators
        
        this.scene.add(altitudeLine);
        this.altitudeLines.set(`${obj.id || `${gridX}_${gridZ}_${Date.now()}`}`, altitudeLine);
        
        // Debug altitude line creation - disabled after diagnosis
        // if (obj.isTargetDummy) {
        //     console.log(`🔧 ALTITUDE LINE: Created for ${obj.name || obj.type} at (${gridX.toFixed(2)}, ${centerY.toFixed(2)}, ${gridZ.toFixed(2)}), thickness: ${lineThickness.toFixed(3)}, height: ${lineHeight.toFixed(3)}, bucketedAlt: ${bucketedAltitudeY.toFixed(3)}`);
        // }
    }
    
    /**
     * Create object blip on the grid
     */
    createBlip(obj, gridX, gridZ, scaledAltitudeY, distance) {
        const clampedAltitude = Math.max(-1, Math.min(1, scaledAltitudeY));
        
        // Determine blip color based on object type and faction
        const blipColor = this.getBlipColor(obj);
        
        // Use different sizes for player vs targets
        // Scale blip size based on view mode and coordinate space
        let baseSizeMultiplier;
        if (this.viewMode === 'topDown') {
            // In top-down mode, use larger blips for the larger coordinate space
            const currentZoom = this.getCurrentZoom();
            const coordinateScale = Math.min(currentZoom.range / 1000, 50);
            baseSizeMultiplier = Math.max(coordinateScale * 0.02, 0.5); // Scale with coordinate space, minimum 0.5
        } else {
            // In 3D mode, use the standard small size
            baseSizeMultiplier = 0.1;
        }
        
        const playerSize = baseSizeMultiplier * 2; // Full size for player ship
        const targetSize = baseSizeMultiplier * 1.2; // Smaller size for targets
        
        // Choose size based on whether this is a target or other object
        const blipSize = (obj.type === 'enemy_ship' || obj.isTargetDummy) ? targetSize : playerSize;
        
        // Different shapes based on view mode and object type
        let blipGeometry;
        if (this.viewMode === 'topDown') {
            // Top-down mode: use round dots (spheres) for all objects
            blipGeometry = new THREE.SphereGeometry(blipSize, 8, 8);
        } else {
            // 3D mode: use different shapes for different object types
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
        }
        
        // Make blips brighter in top-down mode for better visibility
        let blipOpacity, blipTransparent;
        if (this.viewMode === 'topDown') {
            // Top-down mode: fully opaque and bright for maximum visibility
            blipOpacity = 1.0;
            blipTransparent = false;
        } else {
            // 3D mode: slightly transparent as before
            blipOpacity = 0.9;
            blipTransparent = true;
        }
        
        const blipMaterial = new THREE.MeshBasicMaterial({
            color: blipColor,
            transparent: blipTransparent,
            opacity: blipOpacity
        });
        
        const blip = new THREE.Mesh(blipGeometry, blipMaterial);
        
        // Check if this is the currently targeted object for blinking
        const isCurrentTarget = this.isCurrentTarget(obj);
        if (isCurrentTarget) {
            blip.userData.isCurrentTarget = true;
            blip.userData.baseOpacity = blipOpacity;
            blip.userData.baseColor = blipColor;
            // Make material transparent to enable blinking
            blipMaterial.transparent = true;
        }
        
        // Position blip based on view mode
        if (this.viewMode === 'topDown') {
            // In top-down mode, place all blips slightly above grid level for visibility
            blip.position.set(gridX, 0.05, gridZ); // Slightly above grid
            // Debug top-down blip positioning
            if (obj.isTargetDummy || obj.type === 'enemy_ship') {
                // console.log(`🔄 TOP-DOWN BLIP: ${obj.name || obj.type} at (${gridX.toFixed(3)}, 0.05, ${gridZ.toFixed(3)}) size: ${blipSize.toFixed(3)} in viewMode: ${this.viewMode}`);
            }
        } else {
            // In 3D mode, use altitude information
            blip.position.set(gridX, clampedAltitude, gridZ);
        }
        
        // Handle orientation based on view mode
        if (obj.type === 'enemy_ship' || obj.isTargetDummy) {
            // Get player rotation for consistent orientation
            let playerRotation = null;
            if (this.starfieldManager.viewManager?.getShip()?.mesh) {
                playerRotation = this.starfieldManager.viewManager.getShip().mesh.rotation;
            } else if (this.starfieldManager.camera) {
                playerRotation = this.starfieldManager.camera.rotation;
            }
            
            // Use accumulated rotation for full 360° capability (same as player blip and grid)
            const accumulatedRotation = this.playerIndicatorAccumulatedRotation || (playerRotation ? playerRotation.y : 0);
            
            if (this.viewMode === 'topDown') {
                // In top-down mode, objects should be flat and visible from above
                // No rotation needed for spheres, but if this is a triangle, make it flat
                blip.rotation.x = 0; // Keep flat (lying in XZ plane)
                blip.rotation.z = 0; // No roll
                blip.rotation.y = accumulatedRotation + Math.PI / 2; // Match ship heading for directional objects
            } else {
                // In 3D mode, use full orientation logic
                // Set Y rotation to match player heading (fore view) 
                blip.rotation.y = accumulatedRotation + Math.PI / 2; // Add 90° to align with ship facing direction
                
                // Determine if object is above or below grid plane for X rotation
                const gridPlaneWorldY = 0; // Grid is centered at world Y=0
                const objectAltitude = obj.mesh.position.y; // Object's world Y position
                
                if (objectAltitude >= gridPlaneWorldY) {
                    // Object is at or above grid plane - point triangle UP
                    blip.rotation.x = -Math.PI / 2; // Point up from grid
                } else {
                    // Object is below grid plane - point triangle DOWN
                    blip.rotation.x = Math.PI / 2; // Point down from grid
                }
            }
        }
        
        this.scene.add(blip);
        this.objectBlips.set(obj.id || `${gridX}_${gridZ}_${Date.now()}`, blip);
    }
    
    /**
     * Check if an object is the current target
     */
    isCurrentTarget(obj) {
        // Get the target computer manager
        const targetComputerManager = this.starfieldManager.targetComputerManager;
        if (!targetComputerManager || !targetComputerManager.currentTarget) {
            return false;
        }
        
        const currentTarget = targetComputerManager.currentTarget;
        
        // Direct object comparison
        if (obj === currentTarget || obj.mesh === currentTarget) {
            return true;
        }
        
        // Check if the object's mesh is the current target
        if (obj.mesh && obj.mesh === currentTarget) {
            return true;
        }
        
        // For target dummies and enemy ships, also check userData
        if (currentTarget.userData) {
            // Check if the userData.ship matches our object or its mesh
            if (currentTarget.userData.ship === obj || currentTarget.userData.ship === obj.mesh) {
                return true;
            }
            
            // Check if the userData references match
            if (obj.userData && currentTarget.userData === obj.userData) {
                return true;
            }
        }
        
        // Check by ID if available
        if (obj.id && currentTarget.id && obj.id === currentTarget.id) {
            return true;
        }
        
        return false;
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
    updateGridOrientation(deltaTime = 1/60) {
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
        

        
        // SPEC: Grid rotates with ship orientation (Y-axis only for fore view)
        // Hold grid plane stable - only rotate around Y-axis to match player heading
        // Preserve the original tilt (X-axis) and keep Z-axis stable (no roll)
        // Use accumulated rotation for full 360° capability (same as player blip)
        const accumulatedRotation = this.playerIndicatorAccumulatedRotation || playerRotation.y;
        const targetY = -accumulatedRotation; // Remove 90° offset to align grid with ship heading
        
        // Handle angle wrapping for smooth 360° rotation (fix the mirroring issue)
        let currentY = this.gridMesh.rotation.y;
        let adjustedTargetY = targetY;
        
        // Find the shortest angular distance, accounting for 2π wrapping
        let angleDiff = adjustedTargetY - currentY;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        adjustedTargetY = currentY + angleDiff;
        
        // Add controlled debug logging for rotation verification (disabled to reduce spam)
        const rotationDiff = Math.abs(angleDiff);
        // if (rotationDiff > 0.1 || !this.lastLoggedRotation || Math.abs(this.lastLoggedRotation - targetY) > 0.1) {
        //     const playerDegrees = THREE.MathUtils.radToDeg(playerRotation.y);
        //     const gridDegrees = THREE.MathUtils.radToDeg(targetY);
        //     const currentGridDegrees = THREE.MathUtils.radToDeg(currentY);
        //     const adjustedGridDegrees = THREE.MathUtils.radToDeg(adjustedTargetY);
        //     console.log(`🧭 RADAR ROTATION: Player heading ${playerDegrees.toFixed(1)}°, Grid target ${gridDegrees.toFixed(1)}° (adjusted: ${adjustedGridDegrees.toFixed(1)}°), Current ${currentGridDegrees.toFixed(1)}°`);
        //     this.lastLoggedRotation = targetY;
        // }
        
        // Handle grid orientation based on view mode
        if (this.viewMode === 'topDown') {
            // Top-down mode: NO rotation at all - fixed grid orientation
            this.gridMesh.rotation.x = 0; // No tilt
            this.gridMesh.rotation.y = 0; // No rotation - grid stays fixed
            this.gridMesh.rotation.z = 0; // No roll
            
            // Debug top-down grid rotation (disabled to reduce console spam)
            // if (rotationDiff > 0.1 || !this.lastLoggedRotation) {
            //     const playerDegrees = THREE.MathUtils.radToDeg(playerRotation.y);
            //     const gridDegrees = THREE.MathUtils.radToDeg(targetY);
            //     const currentGridDegrees = THREE.MathUtils.radToDeg(currentY);
            //     const adjustedGridDegrees = THREE.MathUtils.radToDeg(adjustedTargetY);
            //     console.log(`🔄 TOP-DOWN GRID: Player=${playerDegrees.toFixed(1)}° Target=${gridDegrees.toFixed(1)}° Current=${currentGridDegrees.toFixed(1)}° Adjusted=${adjustedGridDegrees.toFixed(1)}° AngleDiff=${THREE.MathUtils.radToDeg(angleDiff).toFixed(1)}°`);
            //     
            //     // Log actual final grid rotation to verify it's flat
            //     const finalX = THREE.MathUtils.radToDeg(this.gridMesh.rotation.x);
            //     const finalY = THREE.MathUtils.radToDeg(this.gridMesh.rotation.y);
            //     const finalZ = THREE.MathUtils.radToDeg(this.gridMesh.rotation.z);
            //     console.log(`🔄 TOP-DOWN FINAL: X=${finalX.toFixed(3)}° Y=${finalY.toFixed(1)}° Z=${finalZ.toFixed(3)}° (X&Z should be 0.000°)`);
            // }
        } else {
            // 3D mode: apply all rotations
            this.gridMesh.rotation.y = THREE.MathUtils.lerp(currentY, adjustedTargetY, 0.1);
            this.gridMesh.rotation.x = THREE.MathUtils.degToRad(this.config.gridTilt); // Maintain original tilt
            this.gridMesh.rotation.z = 0; // No roll - keep grid plane level
        }
        
        // SPEC: Triangle orientation matches player ship heading (fore camera direction)
        // Combine ship rotation sync with velocity accumulation for 360° capability
        if (this.playerIndicator) {
            // Initialize accumulated rotation if not set, using current ship rotation
            if (this.playerIndicatorAccumulatedRotation === undefined && playerRotation) {
                this.playerIndicatorAccumulatedRotation = playerRotation.y;
            }
            
            // Use rotation velocity for smooth 360° tracking (preserves full rotation capability)
            const rotationVelocity = this.starfieldManager?.rotationVelocity;
            
            if (rotationVelocity && Math.abs(rotationVelocity.y) > 0.0001) {
                // Apply rotation using accumulated tracking to avoid Euler angle limitations
                const rotationAmount = rotationVelocity.y * deltaTime * 60;
                
                // Initialize accumulated rotation tracking if needed
                if (this.playerIndicatorAccumulatedRotation === undefined) {
                    this.playerIndicatorAccumulatedRotation = 0;
                }
                
                // Track accumulated rotation (this allows 360° rotation)
                this.playerIndicatorAccumulatedRotation += rotationAmount;
                
                // Log rotation for debugging (disabled to reduce spam)
                // const displayDegrees = THREE.MathUtils.radToDeg(this.playerIndicatorAccumulatedRotation);
                // const wrappedDegrees = ((displayDegrees % 360) + 360) % 360;
                // console.log(`🎯 ROTATION: ${wrappedDegrees.toFixed(1)}° (accumulated for 360° capability)`);
            } else if (playerRotation && this.playerIndicatorAccumulatedRotation === undefined) {
                // Fallback: if no velocity but we have ship rotation and no accumulated rotation yet
                this.playerIndicatorAccumulatedRotation = playerRotation.y;
            }
        }
        
        // SPEC: Grid scrolls to keep player centered (top-down mode only)
        if (this.gridMesh) {
            if (this.viewMode === 'topDown') {
                // Top-down mode: scroll grid to keep player centered
                const currentZoom = this.getCurrentZoom();
                const viewHalfSize = Math.min(currentZoom.range / 1000, 50);
                const worldHalfRangeM = currentZoom.range / 2;
                const worldToGridScale = viewHalfSize / (worldHalfRangeM / 1000); // convert meters to km for scale
                
                // Use modulo to create infinite scrolling effect
                const gridSpacing = viewHalfSize / 6;
                
                // Keep grid fixed at origin - blips use relative coordinates
                this.gridMesh.position.x = 0;
                this.gridMesh.position.y = 0; // Keep grid at fixed elevation
                this.gridMesh.position.z = 0;
                
                // Debug grid scrolling (disabled to reduce spam)
                // if (rotationDiff > 0.1 || !this.lastLoggedRotation) {
                //     console.log(`🔄 GRID SCROLL: Player at (${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)})km, Grid offset (${this.gridMesh.position.x.toFixed(2)}, ${this.gridMesh.position.z.toFixed(2)})`);
                // }
            } else {
                // 3D mode: use original scrolling logic
                const gridScale = this.getCurrentZoom().gridSpacing;
                this.gridMesh.position.x = -(playerPosition.x % gridScale) / 100;
                this.gridMesh.position.y = 0; // Keep grid at fixed elevation
                this.gridMesh.position.z = -(playerPosition.z % gridScale) / 100;
            }
        }
        
        // Keep player indicator at grid level (fixed position)
        // Player altitude should be shown via vertical lines, not by moving the indicator
        if (this.playerIndicator) {
            if (this.viewMode === 'topDown') {
                // Top-down mode: keep player indicator at center of screen (fixed position)
                this.playerIndicator.position.set(0, 0.1, 0); // Always at center, slightly above grid
                
                // Debug player indicator position (heavily throttled to reduce spam)
                this.playerPositionLogCount = (this.playerPositionLogCount || 0) + 1;
                if (this.playerPositionLogCount % 600 === 0) { // Only log every 10 seconds
                    console.log(`🎯 PLAYER INDICATOR: Position (${this.playerIndicator.position.x}, ${this.playerIndicator.position.y}, ${this.playerIndicator.position.z}) Visible: ${this.playerIndicator.visible}`);
                }
            } else {
                // 3D mode: position based on grid level
                this.playerIndicator.position.y = 0; // Keep player indicator on grid level
            }
            
            // Update triangle orientation based on player altitude relative to grid plane
            // Grid plane is at a fixed world Y position (determined by the game)
            const gridPlaneWorldY = 0; // Grid is centered at world Y=0
            const playerAltitude = playerPosition.y; // Player's world Y position
            
            // Handle player triangle orientation using PURE QUATERNIONS (no Euler angle interference)
            // IMPORTANT: Never set .rotation directly - it will override quaternion rotations
            if (this.viewMode === 'topDown') {
                // In top-down mode, triangle should be flat and visible from above
                // Apply 45° correction for coordinate system alignment
                const correctedRotation = (this.playerIndicatorAccumulatedRotation || 0) + Math.PI / 4; // Add 45° correction
                const yRotationQuaternion = new THREE.Quaternion();
                yRotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), correctedRotation);
                this.playerIndicator.quaternion.copy(yRotationQuaternion);
                
                // DEBUG: Compare camera vs blip rotation for synchronization debugging
                // Show debug every 1 second to diagnose rotation offset
                if (!this.lastRotationDebugTime || Date.now() - this.lastRotationDebugTime > 1000) {
                    const cameraRotationDeg = THREE.MathUtils.radToDeg(playerRotation ? playerRotation.y : 0);
                    const accumulatedRotationDeg = THREE.MathUtils.radToDeg(this.playerIndicatorAccumulatedRotation || 0);
                    const correctedRotationDeg = THREE.MathUtils.radToDeg(correctedRotation);
                    const offsetDeg = correctedRotationDeg - cameraRotationDeg;
                    const rotVel = this.starfieldManager?.rotationVelocity?.y || 0;
                    console.log(`🎯 ROTATION SYNC DEBUG:`);
                    console.log(`  Camera rotation: ${cameraRotationDeg.toFixed(1)}°`);
                    console.log(`  Accumulated rotation: ${accumulatedRotationDeg.toFixed(1)}°`);
                    console.log(`  Corrected rotation (blip): ${correctedRotationDeg.toFixed(1)}°`);
                    console.log(`  Offset (blip - camera): ${offsetDeg.toFixed(1)}°`);
                    console.log(`  Rotation velocity: ${rotVel.toFixed(4)}`);
                    this.lastRotationDebugTime = Date.now();
                }
                
            } else {
                // In 3D mode, we need to combine Y rotation (heading) with X rotation (pitch for altitude)
                // Decompose current quaternion to preserve Y rotation while setting X rotation
                
                // Extract current Y rotation from the accumulated rotation
                // Add 45° offset to correct for coordinate system mismatch
                const yRotationQuaternion = new THREE.Quaternion();
                const correctedRotation = (this.playerIndicatorAccumulatedRotation || 0) + Math.PI / 4; // Add 45° correction
                yRotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), correctedRotation);
                
                // Create pitch quaternion based on altitude
                const pitchQuaternion = new THREE.Quaternion();
                if (playerAltitude >= gridPlaneWorldY) {
                    // Player is at or above grid plane - point triangle UP (-90° pitch)
                    pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
                } else {
                    // Player is below grid plane - point triangle DOWN (+90° pitch)
                    pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
                }
                
                // Combine: Y rotation first, then pitch rotation
                this.playerIndicator.quaternion.multiplyQuaternions(pitchQuaternion, yRotationQuaternion);
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
        
        // Skip altitude lines in top-down mode
        if (this.viewMode === 'topDown') {
            return;
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
            
            // Calculate line length and position (2x taller per user request)
            const lineLength = Math.abs(bucketedAltitudeY) * 2; // Make player vertical column 2x as tall
            const lineHeight = lineLength > 0 ? lineLength : 0.02; // Minimum height (also 2x taller)
            
            // Position so line is rooted at grid plane (Y=0)
            let centerY;
            if (bucketedAltitudeY >= 0) {
                // Player above or at grid level - line extends upward from Y=0
                centerY = lineHeight / 2; // Position cylinder so bottom is at Y=0, extends upward
            } else {
                // Player below grid level - line extends downward from Y=0
                centerY = -lineHeight / 2; // Position cylinder so top is at Y=0, extends downward
            }
            
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