import { debug } from '../debug.js';

/**
 * RadarHUD - 3D Proximity Detector Display Component
 * 
 * Provides a retro-style 3D proximity detector display showing:
 * - Galactic plane grid (X-Z)
 * - Player position at center
 * - Tracked objects with faction colors
 * - Altitude indicators (Y-axis)
 * - Dynamic orientation matching ship rotation
 * 
 * Based on docs/radar_spec.md
 */

export class RadarHUD {
    constructor(starfieldManager, container) {
        this.starfieldManager = starfieldManager;
        this.container = container;
        this.THREE = starfieldManager.THREE;
        
        // Proximity Detector configuration
        this.config = {
            width: 180,                   // Radar display width in pixels
            height: 135,                  // Radar display height in pixels
            size: 180,                    // Radar display size in pixels (for compatibility)
            range: 50000,                 // Detection range in game units (50km)
            gridSize: 5,                  // 5x5 grid
            verticalRange: 20000,         // Vertical display range (20km up/down)
            updateFrequency: 10,          // Updates per second
            fadeDistance: 45000,          // Objects start fading at 45km
            minBlipSize: 2,              // Minimum blip size
            maxBlipSize: 6               // Maximum blip size
        };
        
        // Radar elements
        this.radarContainer = null;
        this.radarCanvas = null;
        this.radarContext = null;
        this.radarInfo = null;
        this.isVisible = false;
        this.trackedObjects = new Map();
        this.lastUpdate = 0;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = 0;
        
        // Logging control
        this.lastSpecLevel = null;
        this.basicSpecLogged = false;
        
        // Only log during initialization
debug('UI', 'RadarHUD: Initializing 3D radar system...');
        this.initialize();
    }
    
    /**
     * Initialize the radar HUD component
     */
    initialize() {
        this.createRadarContainer();
        this.createRadarCanvas();
        this.createRadarInfo();
        this.setupEventListeners();
        
        // Single initialization completion log
debug('UI', 'RadarHUD: Initialization complete');
    }
    
    /**
     * Create the main radar container with retro styling
     */
    createRadarContainer() {
        this.radarContainer = document.createElement('div');
        this.radarContainer.className = 'radar-container';
        this.radarContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 180px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00ff41;
            border-radius: 4px;
            font-family: 'VT323', monospace;
            color: #00ff41;
            padding: 10px;
            box-shadow: 
                0 0 20px rgba(0, 255, 65, 0.3),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
            z-index: 1000;
            display: none;
            user-select: none;
            pointer-events: none;
        `;
        
        // Add title
        const title = document.createElement('div');
        title.className = 'radar-title';
        title.textContent = 'PROXIMITY DETECTOR';
        title.style.cssText = `
            text-align: center;
            font-size: 14px;
            margin-bottom: 5px;
            text-shadow: 0 0 5px #00ff41;
            letter-spacing: 2px;
            font-weight: bold;
        `;
        this.radarContainer.appendChild(title);
        
        // Add display area
        const displayArea = document.createElement('div');
        displayArea.className = 'radar-display';
        displayArea.style.cssText = `
            width: 180px;
            height: 135px;
            margin: 0 auto;
            border: 1px solid #00ff41;
            background: rgba(0, 40, 0, 0.3);
            position: relative;
            overflow: hidden;
        `;
        this.radarContainer.appendChild(displayArea);
        
        this.container.appendChild(this.radarContainer);
debug('AI', 'RadarHUD: Container created');
    }
    
    /**
     * Create the radar canvas for rendering
     */
    createRadarCanvas() {
        this.radarCanvas = document.createElement('canvas');
        this.radarCanvas.width = this.config.width;
        this.radarCanvas.height = this.config.height;
        this.radarCanvas.className = 'radar-canvas';
        this.radarCanvas.style.cssText = `
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        `;
        
        this.radarContext = this.radarCanvas.getContext('2d');
        
        // Find display area and append canvas
        const displayArea = this.radarContainer.querySelector('.radar-display');
        displayArea.appendChild(this.radarCanvas);
        
debug('UI', 'RadarHUD: Canvas created');
    }
    
    /**
     * Create radar information display
     */
    createRadarInfo() {
        this.radarInfo = document.createElement('div');
        this.radarInfo.className = 'radar-info';
        this.radarInfo.style.cssText = `
            margin-top: 8px;
            font-size: 10px;
            text-align: center;
            opacity: 0.8;
            line-height: 1.2;
        `;
        
        this.radarInfo.innerHTML = `
            <div>RANGE: ${(this.config.range / 1000).toFixed(0)}KM</div>
            <div>CONTACTS: <span id="radar-contact-count">0</span></div>
            <div>R: TOGGLE</div>
        `;
        
        this.radarContainer.appendChild(this.radarInfo);
debug('UI', 'RadarHUD: Info display created');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Integration with existing key binding system will be handled in StarfieldManager
        // Event listeners ready (no need to log)
    }
    
    /**
     * Toggle radar visibility
     */
    toggle() {
        // Check if ship has radar cards before allowing toggle
        if (!this.canUseRadar()) {
debug('UI', 'ProximityDetector: Cannot toggle - no proximity detector cards installed');
            return false;
        }
        
        this.isVisible = !this.isVisible;
        this.radarContainer.style.display = this.isVisible ? 'block' : 'none';
        
        // Log toggle events (force log for important user actions)
debug('UI', `🎯 ProximityDetector: ${this.isVisible ? 'Enabled' : 'Disabled'}`);
        
        if (this.isVisible) {
            // Update radar specifications based on installed cards
            this.updateRadarSpecifications();
            // Force immediate update when shown
            this.forceUpdate();
        }
        
        return true;
    }
    
    /**
     * Check if proximity detector can be used (requires radar cards)
     */
    canUseRadar() {
        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) return false;
        
        // Check if ship has radar cards installed
        return ship.hasSystemCardsSync('radar');
    }
    
    /**
     * Update proximity detector specifications based on installed cards
     */
    updateRadarSpecifications() {
        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) return;
        
        // Get radar system if it exists
        const radarSystem = ship.getSystem('radar');
        if (radarSystem) {
            // Update radar configuration based on radar system capabilities
            this.config.range = radarSystem.getRange();
            this.config.updateFrequency = radarSystem.getUpdateFrequency();
            
            // Only log significant spec changes
            if (this.lastSpecLevel !== radarSystem.level) {
                console.log(`🎯 ProximityDetector: Updated to Level ${radarSystem.level} specifications:`, {
                    range: `${(this.config.range / 1000).toFixed(0)}km`,
                    updateFrequency: `${this.config.updateFrequency}Hz`
                });
                this.lastSpecLevel = radarSystem.level;
            }
        } else {
            // Use basic specifications if no radar system
            this.config.range = 25000;  // 25km basic range
            this.config.updateFrequency = 5; // 5Hz basic update rate
            
            // Only log once when falling back to basic specs
            if (!this.basicSpecLogged) {
debug('UI', 'ProximityDetector: Using basic detector specifications');
                this.basicSpecLogged = true;
            }
        }
    }
    
    /**
     * Force immediate radar update
     */
    forceUpdate() {
        this.updateTrackedObjects();
        this.renderRadarDisplay();
        this.updateRadarInfo();
    }
    
    /**
     * Main update loop
     */
    update(deltaTime) {
        if (!this.isVisible) return;
        
        const now = Date.now();
        const updateInterval = 1000 / this.config.updateFrequency;
        
        if (now - this.lastUpdate < updateInterval) return;
        this.lastUpdate = now;
        
        this.updateTrackedObjects();
        this.renderRadarDisplay();
        this.updateRadarInfo();
        
        // Performance tracking
        this.frameCount++;
        if (now - this.lastFrameTime > 1000) {
            this.lastFrameTime = now;
            this.frameCount = 0;
        }
    }
    
    /**
     * Update tracked objects within radar range
     */
    updateTrackedObjects() {
        this.trackedObjects.clear();
        
        if (!this.starfieldManager || !this.starfieldManager.camera) return;
        
        const playerPosition = this.starfieldManager.camera.position;
        const playerRotation = this.starfieldManager.camera.quaternion;
        
        // Get all trackable objects
        const allObjects = this.getAllTrackableObjects();
        
        allObjects.forEach(obj => {
            if (!obj || !obj.position) return;
            
            const distance = playerPosition.distanceTo(obj.position);
            if (distance <= this.config.range) {
                // Calculate relative position
                const relativePos = obj.position.clone().sub(playerPosition);
                
                // Transform to player coordinate system (radar rotates with ship)
                const rotatedPos = relativePos.clone()
                    .applyQuaternion(playerRotation.clone().invert());
                
                this.trackedObjects.set(this.getObjectId(obj), {
                    object: obj,
                    relativePosition: rotatedPos,
                    distance: distance,
                    factionColor: this.getObjectColorForRadar(obj),
                    type: this.getObjectType(obj)
                });
            }
        });
    }
    
    /**
     * Get all trackable objects from various sources
     */
    getAllTrackableObjects() {
        const objects = [];
        
        // Add celestial bodies from solar system manager
        if (this.starfieldManager.solarSystemManager && 
            this.starfieldManager.solarSystemManager.celestialBodies) {
            this.starfieldManager.solarSystemManager.celestialBodies.forEach((body, key) => {
                // Create a trackable object with proper identification
                const trackableObj = {
                    object: body,
                    position: body.position,
                    name: key,
                    uuid: body.uuid,
                    isCelestial: true,
                    isSpaceStation: key.startsWith('station_'),
                    type: this.getCelestialObjectType(key, body),
                };
                objects.push(trackableObj);
            });
        }
        
        // Add targets from target computer manager
        if (this.starfieldManager.targetComputerManager && 
            this.starfieldManager.targetComputerManager.targetObjects) {
            objects.push(...this.starfieldManager.targetComputerManager.targetObjects);
        }
        
        return objects;
    }
    
    /**
     * Get unique ID for an object
     */
    getObjectId(obj) {
        return obj.id || obj.name || obj.uuid || `obj_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get celestial object type from solar system manager key
     */
    getCelestialObjectType(key, body) {
        if (key === 'star') return 'star';
        if (key.startsWith('planet_')) return 'planet';
        if (key.startsWith('moon_')) return 'moon';
        if (key.startsWith('station_')) return 'station';
        
        // Fallback to body inspection
        if (body && body.userData) {
            if (body.userData.isSpaceStation) return 'station';
            if (body.userData.type) return body.userData.type.toLowerCase();
        }
        
        return 'unknown';
    }

    /**
     * Get object type for appropriate blip rendering
     */
    getObjectType(obj) {
        if (obj.type) {
            switch(obj.type.toLowerCase()) {
                case 'planet': return 'planet';
                case 'moon': return 'moon';
                case 'star': return 'star';
                case 'station':
                case 'space_station': return 'station';
                case 'ship':
                case 'enemy_ship': return 'ship';
                default: return 'unknown';
            }
        }
        
        // Fallback detection based on name or properties
        const name = (obj.name || '').toLowerCase();
        if (name.includes('planet')) return 'planet';
        if (name.includes('moon')) return 'moon';
        if (name.includes('star') || name.includes('sun')) return 'star';
        if (name.includes('station')) return 'station';
        if (name.includes('ship') || name.includes('fighter') || name.includes('dummy')) return 'ship';
        
        return 'unknown';
    }
    
    /**
     * Get color for radar display based on object type
     */
    getObjectColorForRadar(target) {
        // Handle celestial bodies first
        if (target.isCelestial) {
            switch (target.type) {
                case 'star': return '#ffffff';    // Bright white for stars
                case 'planet': return '#44ff44';  // Bright green for planets
                case 'moon': return '#888888';    // Gray for moons
                case 'station': return '#00ffff'; // Cyan for space stations
                default: return '#666666';        // Dim gray for unknown celestial
            }
        }
        
        // Handle space stations with faction-specific colors
        if (target.isSpaceStation || target.type === 'station') {
            // Check if we have faction information from the station userData
            if (target.object && target.object.userData && target.object.userData.faction) {
                switch (target.object.userData.faction) {
                    case 'Terran Republic Alliance': return '#00ff44'; // Alliance green
                    case 'Free Trader Consortium': return '#ffff00';   // Trade yellow
                    case 'Nexus Corporate Syndicate': return '#44ffff'; // Corporate cyan
                    case 'Scientists Consortium': return '#44ff44';    // Science green
                    case 'Ethereal Wanderers': return '#ff44ff';       // Ethereal purple
                    default: return '#00ffff'; // Default cyan for unknown faction stations
                }
            }
            return '#00ffff'; // Default cyan for stations
        }
        
        // Handle target dummies (orange to distinguish from enemy ships)
        if (target.isTargetDummy) {
            return '#ff8800'; // Orange for target dummies (not red)
        }
        
        // Handle enemy ships - ONLY these should be red
        if (target.isEnemyShip || target.type === 'enemy_ship') {
            return '#ff0000'; // Red for confirmed enemy ships
        }
        
        // Fall back to faction-based colors for other objects
        return this.getFactionColorForRadar(target);
    }

    /**
     * Get faction color for radar display (legacy method)
     */
    getFactionColorForRadar(target) {
        // Use existing faction color system from ViewManager
        let baseColor = '#ffffff';
        
        if (this.starfieldManager.viewManager && 
            this.starfieldManager.viewManager.getFactionColor) {
            baseColor = this.starfieldManager.viewManager.getFactionColor(target);
        }
        
        // Convert to radar-appropriate colors with retro feel
        const radarColors = {
            '#ff3333': '#ff4444',  // Enemy: Bright red
            '#44ff44': '#44ff44',  // Friendly: Bright green  
            '#ffff44': '#ffff00',  // Neutral: Bright yellow
            '#44ffff': '#00ffff',  // Unknown: Bright cyan
            '#ffffff': '#888888'   // Default: Dim gray
        };
        
        return radarColors[baseColor] || '#888888';
    }
    
    /**
     * Render the complete radar display
     */
    renderRadarDisplay() {
        const ctx = this.radarContext;
        const size = this.config.size;
        const center = size / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 20, 0, 0.3)';
        ctx.fillRect(0, 0, size, size);
        
        // Draw grid
        this.renderGrid(ctx, size, center);
        
        // Draw player indicator
        this.renderPlayerIndicator(ctx, center);
        
        // Draw tracked objects
        this.renderTrackedObjects(ctx, center);
        
        // Draw range circles (optional)
        this.renderRangeCircles(ctx, center, size);
    }
    
    /**
     * Render the radar grid
     */
    renderGrid(ctx, size, center) {
        const gridSpacing = size / this.config.gridSize;
        
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.6;
        
        // Draw grid lines
        for (let i = 0; i <= this.config.gridSize; i++) {
            const pos = i * gridSpacing;
            
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render player position indicator
     */
    renderPlayerIndicator(ctx, center) {
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1.0;
        
        // Draw center crosshair
        this.drawCrosshair(ctx, center, center, 8);
        
        // Draw small center dot
        ctx.beginPath();
        ctx.arc(center, center, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Draw crosshair at specified position
     */
    drawCrosshair(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.stroke();
    }
    
    /**
     * Render all tracked objects as blips
     */
    renderTrackedObjects(ctx, center) {
        const scale = this.config.size / (this.config.range * 2);
        const verticalScale = 60 / this.config.verticalRange; // 60px for vertical display
        
        this.trackedObjects.forEach(tracked => {
            const { relativePosition, factionColor, distance, type } = tracked;
            
            // Calculate 2D grid position (X-Z plane)
            const gridX = center + (relativePosition.x * scale);
            const gridZ = center + (relativePosition.z * scale);
            
            // Skip if outside display area
            if (gridX < 5 || gridX > this.config.size - 5 || 
                gridZ < 5 || gridZ > this.config.size - 5) return;
            
            // Calculate vertical position for altitude indicator
            const altitude = relativePosition.y;
            const verticalOffset = Math.max(-30, Math.min(30, altitude * verticalScale));
            
            // Draw vertical line (altitude indicator)
            ctx.strokeStyle = factionColor;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(gridX, center - 30);
            ctx.lineTo(gridX, center + 30);
            ctx.stroke();
            
            // Draw object blip
            ctx.globalAlpha = this.calculateBlipAlpha(distance);
            ctx.fillStyle = factionColor;
            ctx.strokeStyle = factionColor;
            
            const blipY = center + verticalOffset;
            const blipSize = this.getBlipSize(type, distance);
            
            this.drawBlip(ctx, gridX, blipY, blipSize, type);
        });
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Calculate blip alpha based on distance (fade at range limit)
     */
    calculateBlipAlpha(distance) {
        if (distance <= this.config.fadeDistance) {
            return 1.0;
        } else {
            const fadeRange = this.config.range - this.config.fadeDistance;
            const fadeAmount = (distance - this.config.fadeDistance) / fadeRange;
            return Math.max(0.3, 1.0 - fadeAmount);
        }
    }
    
    /**
     * Get blip size based on object type and distance
     */
    getBlipSize(type, distance) {
        let baseSize = this.config.minBlipSize;
        
        switch(type) {
            case 'planet': baseSize = this.config.maxBlipSize; break;
            case 'star': baseSize = this.config.maxBlipSize + 1; break;
            case 'moon': baseSize = this.config.minBlipSize + 1; break;
            case 'station': baseSize = this.config.minBlipSize + 2; break;
            case 'ship': baseSize = this.config.minBlipSize + 1; break;
            default: baseSize = this.config.minBlipSize;
        }
        
        // Scale down with distance
        const distanceScale = Math.max(0.5, 1.0 - (distance / this.config.range) * 0.5);
        return Math.max(1, baseSize * distanceScale);
    }
    
    /**
     * Draw individual blip based on object type
     */
    drawBlip(ctx, x, y, size, type) {
        ctx.beginPath();
        
        switch(type) {
            case 'ship':
                // Triangle for ships
                ctx.moveTo(x, y - size);
                ctx.lineTo(x - size, y + size);
                ctx.lineTo(x + size, y + size);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'planet':
                // Large circle for planets
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'moon':
                // Small circle for moons
                ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'station':
                // Square for stations
                ctx.rect(x - size, y - size, size * 2, size * 2);
                ctx.fill();
                break;
                
            case 'star':
                // Star shape for stars
                this.drawStar(ctx, x, y, size);
                break;
                
            default:
                // Default dot
                ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
        }
    }
    
    /**
     * Draw star shape
     */
    drawStar(ctx, x, y, size) {
        const spikes = 4;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        
        ctx.moveTo(x, y - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
            rot += step;
        }
        
        ctx.lineTo(x, y - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Render range circles (optional visual aid)
     */
    renderRangeCircles(ctx, center, size) {
        // Draw quarter and half range circles
        const ranges = [0.25, 0.5, 0.75];
        
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.2;
        
        ranges.forEach(range => {
            const radius = (size / 2) * range;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Update radar information display
     */
    updateRadarInfo() {
        const contactCount = this.radarContainer.querySelector('#radar-contact-count');
        if (contactCount) {
            contactCount.textContent = this.trackedObjects.size;
        }
    }
    
    /**
     * Cleanup radar resources
     */
    destroy() {
        if (this.radarContainer && this.radarContainer.parentNode) {
            this.radarContainer.parentNode.removeChild(this.radarContainer);
        }
        
        this.trackedObjects.clear();
debug('UI', 'RadarHUD: Destroyed');
    }
}