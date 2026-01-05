import { debug } from '../debug.js';
import * as THREE from 'three';
import { ProximityBlipManager } from './proximity/ProximityBlipManager.js';
import { ProximityGridRenderer } from './proximity/ProximityGridRenderer.js';

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
 * Extracted handlers:
 * - ProximityBlipManager: blip tracking, creation, faction coloring
 * - ProximityGridRenderer: grid rendering, player indicator
 *
 * Based on revised docs/radar_spec.md
 */

export class ProximityDetector3D {
    constructor(starfieldManager, container) {
        this.starfieldManager = starfieldManager;
        this.container = container;
        this.THREE = starfieldManager.THREE || THREE;
        
        // 3D Configuration
        this.config = {
            // Display properties
            screenWidth: 0.25,              // 25% of screen width (SAME width)
            screenHeight: 0.140625,         // 14.0625% of screen height (50% total reduction: 0.25 * 0.75 * 0.75 = 0.140625)
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

        // Object tracking
        this.trackedObjects = new Map();

        // Initialize handlers (after scene is set up in initialize())
        this.blipManager = null;
        this.gridRenderer = null;
        
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

        // Memory leak prevention: track resize handlers
        this._boundHandlers = {
            windowResize: null,
            setupResize: null
        };

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

        // Map console levels to debug channels
        const channelMap = {
            'log': 'RADAR',
            'warn': 'P1',
            'error': 'P1'
        };

        const channel = channelMap[level] || 'RADAR';

        // Always log errors and forced messages
        if (level === 'error' || level === 'warn' || forceLog) {
            debug(channel, `ProximityDetector3D: ${message}`, data || '');
            if (level === 'error') this.sessionStats.errors++;
            return;
        }

        // Throttle debug messages
        if (this.debugMode && (now - this.lastLogTime > this.logInterval)) {
            debug(channel, `ProximityDetector3D: ${message}`, data || '');
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

        // Initialize handlers after scene is ready
        this.gridRenderer = new ProximityGridRenderer(this);
        this.blipManager = new ProximityBlipManager(this);

        // Create initial grid and player indicator via handlers
        this.gridRenderer.createGrid();
        this.gridRenderer.createPlayerIndicator();

        this.setupEventListeners();

        this.logControlled('log', '3D Proximity Detector initialized', null, true);

        // Expose debug method globally for console access
        window.debugRadarRotation = () => this.debugRadarRotation();

        // Add window resize handler for responsive positioning - store for cleanup
        this._boundHandlers.windowResize = () => this.handleWindowResize();
        window.addEventListener('resize', this._boundHandlers.windowResize);
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
            // Top-down view: Rectangular, bottom-center position (matching 3D radar location)
            // Position same as RadarHUD at bottom-center for consistency
            const radarWidth = 200; // Match RadarHUD width
            const radarHeight = 160; // Compact but readable height
            
            // Position: Bottom-center, same as other radar systems
            const positioningCSS = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                width: ${radarWidth}px;
                height: ${radarHeight}px;
                transform: translateX(-50%);
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
        
        // Create WebGL renderer with safe dimensions
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        
        // Ensure valid dimensions before setting size
        const safeWidth = Math.max(1, this.canvasWidth || 1);
        const safeHeight = Math.max(1, this.canvasHeight || 1);
        this.renderer.setSize(safeWidth, safeHeight);
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
     * Setup event listeners for responsive resizing
     */
    setupEventListeners() {
        // Handle window resize - store handler for cleanup
        this._boundHandlers.setupResize = () => {
            if (this.isVisible) {
                this.handleResize();
            }
        };
        window.addEventListener('resize', this._boundHandlers.setupResize);
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
            this.gridRenderer.recreateGrid();
            
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
debug('UI', `📷 ORTHO CAMERA: viewSize=${viewSize}, range=${zoomLevel.range}km`);
        } else {
            // Update perspective camera position with new distance
            this.camera.position.set(0, this.config.cameraDistance, this.config.cameraDistance * 0.7);
            this.camera.lookAt(0, 0, 0);
            this.camera.updateProjectionMatrix();
debug('UI', `📷 CAMERA: Position Y=${this.config.cameraDistance.toFixed(2)}, Z=${(this.config.cameraDistance * 0.7).toFixed(2)}, Looking at (0,0,0)`);
        }
        
        // Recreate grid with new spacing for current view mode
        this.gridRenderer.recreateGrid();
        
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
        
        // Check if ship has radar system (like other systems do)
        const radarSystem = ship.getSystem('radar');
        
        if (!radarSystem) {
debug('UI', 'ProximityDetector: No radar system found');
            return false;
        }
        
        // Check if the radar system can be activated
        if (!radarSystem.canActivate(ship)) {
debug('COMBAT', 'ProximityDetector: Radar system cannot be activated:', radarSystem.isOperational() ? 'low energy' : 'damaged');
            return false;
        }
        
debug('AI', 'ProximityDetector: Radar system available and operational');
        return true;
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

            debug('RADAR', `🎯 ProximityDetector3D: Updated to Level ${radarSystem.level} specifications: range=${(this.config.detectionRange / 1000).toFixed(0)}km, updateFrequency=${this.config.updateFrequency}Hz`);
        } else {
            // Use basic specifications if no radar system
            this.config.detectionRange = 10000;  // 10km basic range
            this.config.updateFrequency = 20;    // 20Hz basic update rate
            
debug('UI', 'ProximityDetector3D: Using basic detector specifications');
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
        this.blipManager.updateBlipPositions();
        this.gridRenderer.updateGridOrientation(1/60); // Use default deltaTime for immediate update
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
            this.blipManager.updateBlipPositions();
            this.blipManager.updateBlipBlinking(deltaTime);
            this.gridRenderer.updateGridOrientation(deltaTime);
            this.render3DScene();
            this.lastUpdate = 0;
        }
    }

    /**
     * Manual debug method to check radar rotation alignment (call from console)
     */
    debugRadarRotation() {
        const gridMesh = this.gridRenderer?.gridMesh;
        if (!this.isVisible || !gridMesh) {
            debug('INSPECTION', 'RADAR DEBUG: Radar not visible or grid not initialized');
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
            const gridDegrees = THREE.MathUtils.radToDeg(gridMesh.rotation.y);
            const expectedGridDegrees = THREE.MathUtils.radToDeg(-playerRotation.y - Math.PI / 2);
            const playerIndicator = this.gridRenderer?.playerIndicator;
            const playerTriangleDegrees = playerIndicator ? THREE.MathUtils.radToDeg(playerIndicator.rotation.y) : 'N/A';

            debug('INSPECTION', '=== RADAR ROTATION DEBUG ===');
            debug('UI', `🧭 Player heading: ${playerDegrees.toFixed(1)}°`);
            debug('UI', `🧭 Grid rotation: ${gridDegrees.toFixed(1)}° (expected: ${expectedGridDegrees.toFixed(1)}°)`);
            debug('UI', `🔺 Player triangle: ${playerTriangleDegrees}°`);
            debug('UI', `🧭 Grid tilt (X): ${THREE.MathUtils.radToDeg(gridMesh.rotation.x).toFixed(1)}° (should be ${this.config.gridTilt}°)`);
            debug('UI', `🧭 Grid roll (Z): ${THREE.MathUtils.radToDeg(gridMesh.rotation.z).toFixed(1)}° (should be 0°)`);
            debug('UI', `🔄 Note: Grid uses angle wrapping for smooth 360° rotation`);
        } else {
            debug('AI', 'RADAR DEBUG: No player rotation available');
        }
    }
    
    /**
     * Toggle between 3D and top-down view modes
     */
    toggleViewMode() {
        if (!this.isVisible) return false;
        
        this.viewMode = this.viewMode === '3D' ? 'topDown' : '3D';
        
debug('UI', `🔄 ProximityDetector: Switched to ${this.viewMode} view mode`);
        
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
        
        // Recreate the grid and player indicator for the new view mode
        this.gridRenderer.recreateGrid();
        this.gridRenderer.recreatePlayerIndicator();
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
        
debug('UI', `🔄 Top-down camera setup: zoom range=${currentZoom.range}km, viewSize=${viewSize}`);
        
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
        
debug('UI', `🔄 Top-down camera positioned at (0, 100, 0) with orthographic bounds: ${-viewSize} to ${viewSize}`);
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
     * Create appropriate grid based on view mode (delegates to gridRenderer)
     */
    createGrid() {
        this.gridRenderer.createGrid();
    }

    /**
     * Get current zoom level configuration
     * @returns {Object} Current zoom level object
     */
    getCurrentZoom() {
        return this.config.zoomLevels[this.config.currentZoomLevel];
    }

    /**
     * Render the 3D scene
     */
    render3DScene() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Clean up all resources
     */
    dispose() {
        // Remove window event listeners
        if (this._boundHandlers) {
            if (this._boundHandlers.windowResize) {
                window.removeEventListener('resize', this._boundHandlers.windowResize);
            }
            if (this._boundHandlers.setupResize) {
                window.removeEventListener('resize', this._boundHandlers.setupResize);
            }
        }

        // Remove global debug function
        if (window.debugRadarRotation) {
            delete window.debugRadarRotation;
        }

        // Dispose handlers
        if (this.blipManager) {
            this.blipManager.dispose();
            this.blipManager = null;
        }

        if (this.gridRenderer) {
            this.gridRenderer.dispose();
            this.gridRenderer = null;
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer = null;
        }

        // Remove canvas from DOM
        if (this.canvas3D && this.canvas3D.parentNode) {
            this.canvas3D.parentNode.removeChild(this.canvas3D);
            this.canvas3D = null;
        }

        // Remove container from DOM
        if (this.detectorContainer && this.detectorContainer.parentNode) {
            this.detectorContainer.parentNode.removeChild(this.detectorContainer);
            this.detectorContainer = null;
        }

        // Null out Three.js references
        this.scene = null;
        this.camera = null;

        // Null out other references
        this.starfieldManager = null;
        this.container = null;
        this.trackedObjects.clear();
        this._boundHandlers = null;
        this.config = null;

        debug('RADAR', 'ProximityDetector3D: Disposed');
    }

    /**
     * Alias for dispose() for consistency with other UI components
     */
    destroy() {
        this.dispose();
    }
}