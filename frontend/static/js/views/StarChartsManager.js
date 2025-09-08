import { debug } from '../debug.js';

/**
 * StarChartsManager - Advanced discovery-based navigation system
 * 
 * This class implements the Star Charts system with:
 * - Database-driven discovery with fog of war
 * - Optimized proximity checking with spatial partitioning
 * - Dynamic discovery radius based on Target CPU equipment
 * - Mission waypoint integration
 * - Performance monitoring and fallback mechanisms
 * - Discovery pacing to prevent notification fatigue
 * 
 * Phase 0 Implementation: A0 sector proof of concept with full optimization
 */

import * as THREE from 'three';

export class StarChartsManager {
    constructor(scene, camera, viewManager, solarSystemManager, targetComputerManager) {
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;
        this.solarSystemManager = solarSystemManager;
        this.targetComputerManager = targetComputerManager;
        
        // Core data structures
        this.objectDatabase = null;           // Static database from verse.py
        this.discoveredObjects = new Set();  // Set of discovered object IDs
        this.discoveryMetadata = new Map();  // Metadata for each discovered object
        this.currentSector = 'A0';           // Current sector (Phase 0: A0 only)
        this.virtualWaypoints = new Map();   // Mission waypoints
        
        // Spatial optimization
        this.spatialGrid = new Map();        // Spatial partitioning for performance
        this.gridSize = 50;                  // Grid cell size in game units
        this.lastDiscoveryCheck = 0;         // Last proximity check time
        this.discoveryInterval = 5000;       // Check every 5 seconds
        
        // Discovery pacing system
        this.discoveryTypes = {
            'major': {
                types: ['star', 'planet', 'space_station'],
                notification: 'prominent',
                audio: 'blurb.mp3',
                cooldown: 0 // No cooldown for major discoveries
            },
            'minor': {
                types: ['moon', 'navigation_beacon'],
                notification: 'subtle', 
                audio: 'blurb.mp3',
                cooldown: 10000 // 10 second cooldown
            },
            'background': {
                types: ['asteroid', 'debris_field'],
                notification: 'log_only',
                audio: null,
                cooldown: 30000 // 30 second cooldown
            }
        };
        this.lastDiscoveryTime = new Map();
        
        // Performance monitoring
        this.performanceMetrics = {
            discoveryCheckTime: [],
            databaseLoadTime: [],
            memoryUsage: [],
            discoveryCount: 0
        };
        
        // Memory management
        this.loadedSectors = new Map();
        this.maxLoadedSectors = 9; // 3x3 grid around player

        // Integration callbacks
        this.discoveryCallbacks = [];
        this.targetSelectionCallbacks = [];

        // Configuration
        this.config = {
            enabled: true,
            fallbackToLRS: true,
            sectors: ['A0'], // Phase 0: A0 only
            maxDiscoveriesPerFrame: 50, // Testing with higher limit to see if current limit is too restrictive
            performanceMonitoring: true
        };
        
        // Initialize system
        this.initialize();
    }
    
    async initialize() {
debug('UTILITY', 'StarChartsManager: Initializing...');
        
        try {
            // Load static database
            const startTime = performance.now();
            await this.loadObjectDatabase();
            const loadTime = performance.now() - startTime;
            this.performanceMetrics.databaseLoadTime.push(loadTime);
            
            // Load discovery state
            await this.loadDiscoveryState();

            // Optional test mode: auto-discover everything in current sector for parity testing
            if (this.isTestDiscoverAllEnabled()) {
                this.discoverAllInCurrentSector();
            }

            // TEMPORARY FIX: Auto-discover beacons for debugging
            this.autoDiscoverBeacons();
            
            // Initialize spatial grid
            this.initializeSpatialGrid();
            
            // Start discovery checking
            this.startDiscoveryLoop();
            
debug('UTILITY', '✅ StarChartsManager: Initialization complete');
debug('UTILITY', `   - Database load time: ${loadTime.toFixed(2)}ms`);
debug('UTILITY', `   - Current sector: ${this.currentSector}`);
debug('UTILITY', `   - Discovered objects: ${this.discoveredObjects.size}`);
            
        } catch (error) {
            console.error('❌ StarChartsManager: Initialization failed:', error);
            if (this.config.fallbackToLRS) {
debug('UTILITY', '🔄 Falling back to Long Range Scanner');
                this.config.enabled = false;
            }
        }
    }

    isTestDiscoverAllEnabled() {
        try {
            if (typeof window !== 'undefined' && window.STAR_CHARTS_DISCOVER_ALL === true) {
                return true;
            }
        } catch (e) {}
        try {
            const flag = localStorage.getItem('star_charts_test_discover_all');
            return String(flag).toLowerCase() === 'true' || flag === '1';
        } catch (e) {}
        return false;
    }

    discoverAllInCurrentSector() {
        try {
            const sector = this.objectDatabase?.sectors?.[this.currentSector];
            if (!sector) return;
            let count = 0;
            if (sector.star?.id) {
                if (!this.discoveredObjects.has(sector.star.id)) count++;
                this.discoveredObjects.add(sector.star.id);
            }
            (sector.objects || []).forEach(obj => {
                if (obj?.id) {
                    if (!this.discoveredObjects.has(obj.id)) count++;
                    this.discoveredObjects.add(obj.id);
                }
            });
            const infra = sector.infrastructure || {};
            (infra.stations || []).forEach(st => {
                if (st?.id) {
                    if (!this.discoveredObjects.has(st.id)) count++;
                    this.discoveredObjects.add(st.id);
                }
            });
            (infra.beacons || []).forEach(b => {
                if (b?.id) {
                    if (!this.discoveredObjects.has(b.id)) count++;
                    this.discoveredObjects.add(b.id);
                }
            });
            this.saveDiscoveryState();
debug('UTILITY', `🧪 StarCharts TEST MODE: Discovered all objects in ${this.currentSector} (+${count})`);
        } catch (e) {
            console.warn('🧪 StarCharts TEST MODE failed to discover all:', e);
        }
    }

    autoDiscoverBeacons() {
        // TEMPORARY FIX: Auto-discover all beacons for debugging beacon display issue
        try {
            const sector = this.objectDatabase.sectors[this.currentSector];
            if (!sector || !sector.infrastructure || !sector.infrastructure.beacons) return;

            let count = 0;
            sector.infrastructure.beacons.forEach(beacon => {
                if (beacon?.id && !this.discoveredObjects.has(beacon.id)) {
                    this.discoveredObjects.add(beacon.id);
                    count++;
                }
            });

            if (count > 0) {
                this.saveDiscoveryState();
debug('UTILITY', `🔧 TEMP FIX: Auto-discovered ${count} beacons`);

                // Trigger UI refresh if Star Charts UI exists
                if (this.viewManager?.starfieldManager?.starChartsUI) {
debug('UI', `🔧 TEMP FIX: Triggering Star Charts UI refresh`);
                    setTimeout(() => {
                        this.viewManager.starfieldManager.starChartsUI.render();
                    }, 100);
                }
            }
        } catch (e) {
            console.warn('🔧 TEMP FIX: Failed to auto-discover beacons:', e);
        }
    }
    
    async loadObjectDatabase() {
        // Load static database generated from verse.py
        
        try {
            const response = await fetch('/static/data/star_charts/objects.json');
            if (!response.ok) {
                throw new Error(`Failed to load database: ${response.status}`);
            }
            
            this.objectDatabase = await response.json();
debug('UTILITY', `📊 Loaded database: ${this.objectDatabase.metadata.total_sectors} sectors`);
debug('UTILITY', `   - Universe seed: ${this.objectDatabase.metadata.universe_seed}`);
debug('UTILITY', `   - Generated: ${this.objectDatabase.metadata.generation_timestamp}`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load object database:', error);
            throw error;
        }
    }
    
    initializeSpatialGrid() {
        // Initialize spatial partitioning for optimized proximity checking
        
        if (!this.objectDatabase || !this.objectDatabase.sectors[this.currentSector]) {
            return;
        }
        
        const sectorData = this.objectDatabase.sectors[this.currentSector];
        this.spatialGrid.clear();
        
        // Add celestial objects to grid
        const allObjects = [
            sectorData.star,
            ...sectorData.objects,
            ...(sectorData.infrastructure?.stations || []),
            ...(sectorData.infrastructure?.beacons || [])
        ];

        debug('STAR_CHARTS', `📊 Processing ${allObjects.length} objects for sector ${this.currentSector}`);
        debug('STAR_CHARTS', `   - Star: ${sectorData.star?.id || 'none'}`);
        debug('STAR_CHARTS', `   - Objects: ${sectorData.objects?.length || 0}`);
        debug('STAR_CHARTS', `   - Stations: ${sectorData.infrastructure?.stations?.length || 0}`);
        debug('STAR_CHARTS', `   - Beacons: ${sectorData.infrastructure?.beacons?.length || 0}`);

        let processedCount = 0;
        let skippedCount = 0;

        // Debug: Log ALL objects being processed
        debug('STAR_CHARTS', `   📋 Processing all ${allObjects.length} objects:`);

        allObjects.forEach((obj, index) => {
            if (obj && obj.position) {
                const gridKey = this.getGridKey(obj.position);
                if (!this.spatialGrid.has(gridKey)) {
                    this.spatialGrid.set(gridKey, []);
                }
                this.spatialGrid.get(gridKey).push(obj);
                processedCount++;

                // Log ALL objects during initialization
                debug('STAR_CHARTS', `   ✅ ${obj.id}: pos[${obj.position.join(',')}] → grid[${gridKey}]`);
            } else {
                skippedCount++;
                // Log ALL skipped objects
                debug('STAR_CHARTS', `   ❌ Skipped ${index}: ${obj?.id || 'unknown'} (no position)`);
            }
        });

debug('UTILITY', `🗺️  Spatial grid initialized: ${this.spatialGrid.size} cells, ${allObjects.length} objects (${processedCount} processed, ${skippedCount} skipped)`);

        // Add global debug function for spatial grid inspection
        if (typeof window !== 'undefined') {
            window.debugSpatialGrid = () => {
                console.log('🗺️ Spatial Grid Debug:');
                console.log(`  Total cells: ${this.spatialGrid.size}`);
                console.log(`  Grid size: ${this.gridSize}`);
                console.log('  All cells:');
                for (const [cellKey, objects] of this.spatialGrid) {
                    console.log(`    ${cellKey}: ${objects.length} objects`);
                    objects.forEach(obj => {
                        console.log(`      - ${obj.id} at [${obj.position.join(', ')}]`);
                    });
                }
                return 'Spatial grid logged to console';
            };
            debug('STAR_CHARTS', '🗺️ Use debugSpatialGrid() in console to inspect spatial grid');
        }
    }
    
    getGridKey(position) {
        //Get spatial grid key for position (handles both 2D and 3D positions)
        if (!position || !Array.isArray(position) || position.length < 2) {
            debug('STAR_CHARTS', `❌ Invalid position for grid key:`, position);
            return '0,0,0'; // Fallback
        }

        const x = Math.floor(position[0] / this.gridSize);
        const y = Math.floor(position[1] / this.gridSize);

        // Handle 2D positions (infrastructure) by assuming z=0
        const z = position.length >= 3 ? Math.floor(position[2] / this.gridSize) : 0;

        return `${x},${y},${z}`;
    }
    
    getNearbyObjects(playerPosition, radius) {
        //Get objects within radius using spatial partitioning

        debug('STAR_CHARTS', `🔍 getNearbyObjects called with playerPos[${playerPosition.join(',')}], radius=${radius}`);

        const nearbyObjects = [];
        const gridRadius = Math.ceil(radius / this.gridSize);
        const playerPos3D = this.ensure3DPosition(playerPosition);
        const playerGridKey = this.getGridKey(playerPosition);
        const [px, py, pz] = playerGridKey.split(',').map(Number);

        debug('STAR_CHARTS', `🔍 gridRadius=${gridRadius}, playerGridKey=${playerGridKey}, gridSize=${this.gridSize}`);
        debug('STAR_CHARTS', `🔍 Spatial grid has ${this.spatialGrid.size} total cells`);

        let checkedCells = 0;
        let totalObjectsFound = 0;

        // Log all cells in the spatial grid first
        debug('STAR_CHARTS', `🔍 All spatial grid cells:`);
        for (const [cellKey, objects] of this.spatialGrid) {
            debug('STAR_CHARTS', `   📦 Cell ${cellKey}: ${objects.length} objects`);
        }

        // Check surrounding grid cells
        for (let x = px - gridRadius; x <= px + gridRadius; x++) {
            for (let y = py - gridRadius; y <= py + gridRadius; y++) {
                for (let z = pz - gridRadius; z <= pz + gridRadius; z++) {
                    const gridKey = `${x},${y},${z}`;
                    const cellObjects = this.spatialGrid.get(gridKey);
                    checkedCells++;
                    if (cellObjects && cellObjects.length > 0) {
                        // Filter objects to ensure they're actually within range (spatial grid gives nearby cells, but we need precise distance check)
                        const inRangeObjects = cellObjects.filter(obj => {
                            const objPos3D = this.ensure3DPosition(obj.position);
                            const distance = this.calculateDistance(objPos3D, playerPos3D);
                            return distance <= radius;
                        });

                        nearbyObjects.push(...inRangeObjects);
                        totalObjectsFound += inRangeObjects.length;
                        debug('STAR_CHARTS', `🔍 Cell ${gridKey}: ${cellObjects.length} objects total, ${inRangeObjects.length} in range (${inRangeObjects.map(o => o.id).join(', ')})`);
                    } else if (this.spatialGrid.has(gridKey)) {
                        // Cell exists but is empty
                        debug('STAR_CHARTS', `🔍 Cell ${gridKey}: empty (exists in grid)`);
                    } else {
                        // Cell doesn't exist in grid
                        debug('STAR_CHARTS', `🔍 Cell ${gridKey}: not in grid`);
                    }
                }
            }
        }

        debug('STAR_CHARTS', `🔍 SUMMARY: Checked ${checkedCells} grid cells, found ${totalObjectsFound} objects total`);
        debug('STAR_CHARTS', `🔍 Returning ${nearbyObjects.length} nearby objects`);
        return nearbyObjects;
    }
    
    startDiscoveryLoop() {
        //Start the discovery checking loop
        
        const discoveryLoop = () => {
            if (this.config.enabled) {
                this.checkDiscoveryRadius();
            }
            requestAnimationFrame(discoveryLoop);
        };
        
        discoveryLoop();
    }
    
    checkDiscoveryRadius() {
        //Optimized proximity checking with performance monitoring
        
        const now = Date.now();
        if (now - this.lastDiscoveryCheck < this.discoveryInterval) {
            return; // Skip check if too soon
        }
        
        const startTime = performance.now();
        
        try {
            // Get player position
            const playerPosition = this.getPlayerPosition();
            if (!playerPosition) return;
            
            // Get discovery radius from Target CPU
            const discoveryRadius = this.getDiscoveryRadius();
            
            // Get nearby objects using spatial partitioning
            const nearbyObjects = this.getNearbyObjects(playerPosition, discoveryRadius);

            // Debug spatial grid status
            const gridCells = this.spatialGrid.size;
            const totalObjectsInGrid = Array.from(this.spatialGrid.values()).reduce((sum, cell) => sum + cell.length, 0);

            debug('STAR_CHARTS', `🔍 Discovery check: ${nearbyObjects.length} objects within ${discoveryRadius.toFixed(0)}km radius`);
            debug('STAR_CHARTS', `📊 Spatial grid: ${gridCells} cells, ${totalObjectsInGrid} total objects`);

            // Debug spatial search details
            const gridRadius = Math.ceil(discoveryRadius / this.gridSize);
            const playerGridKey = this.getGridKey(playerPosition);
            debug('STAR_CHARTS', `🔍 Spatial search: gridRadius=${gridRadius}, playerGridKey=${playerGridKey}, gridSize=${this.gridSize}`);

            // Batch process discoveries
            this.batchProcessDiscoveries(nearbyObjects, playerPosition, discoveryRadius);
            
            this.lastDiscoveryCheck = now;
            
        } catch (error) {
            console.error('❌ Discovery check failed:', error);
        }
        
        // Performance monitoring
        const checkTime = performance.now() - startTime;
        this.performanceMetrics.discoveryCheckTime.push(checkTime);
        
        // Alert if performance degrades
        if (checkTime > 16) { // 16ms = 60fps budget
            console.warn(`⚠️  Discovery check exceeding frame budget: ${checkTime.toFixed(2)}ms`);
        }
        
        // Keep metrics array manageable
        if (this.performanceMetrics.discoveryCheckTime.length > 100) {
            this.performanceMetrics.discoveryCheckTime.shift();
        }
    }
    
    batchProcessDiscoveries(objects, playerPosition, discoveryRadius) {
        //Process discoveries in batches to avoid frame drops

        debug('STAR_CHARTS', `🔍 Processing ${objects?.length || 0} nearby objects for discovery`);

        const undiscovered = objects.filter(obj => !this.isDiscovered(obj.id));
        const inRange = undiscovered.filter(obj => this.isWithinRange(obj, playerPosition, discoveryRadius));
        const discoveries = inRange.slice(0, this.config.maxDiscoveriesPerFrame);

        // Debug what we're finding
        if (objects && objects.length > 0) {
            debug('STAR_CHARTS', `📋 First 3 nearby objects:`);
            objects.slice(0, 3).forEach((obj, index) => {
                const distance = this.calculateDistance(obj.position, playerPosition);
                const discovered = this.isDiscovered(obj.id);
                const withinRange = this.isWithinRange(obj, playerPosition, discoveryRadius);
                debug('STAR_CHARTS', `   ${index + 1}. ${obj.id} (${obj.type}) - ${distance.toFixed(1)}km - ${discovered ? 'ALREADY DISCOVERED' : 'NEW'} - ${withinRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
            });
        }

        // Get total objects in database for context
        const totalInDatabase = this.objectDatabase?.sectors?.[this.currentSector]?.objects?.length || 0;

        debug('STAR_CHARTS', `📊 Discovery batch: ${objects?.length || 0}/${totalInDatabase} nearby → ${undiscovered.length} undiscovered → ${inRange.length} in range → ${discoveries.length}/${this.config.maxDiscoveriesPerFrame} processing`);
        debug('STAR_CHARTS', `📈 Progress: ${this.discoveredObjects.size} total discovered`);

        if (discoveries.length > 0) {
            debug('STAR_CHARTS', `🎯 Processing ${discoveries.length} discoveries:`);
            discoveries.forEach((obj, index) => {
                const distance = this.calculateDistance(obj.position, playerPosition);
                debug('STAR_CHARTS', `   ${index + 1}. Discovering ${obj.id} (${obj.type}) at ${distance.toFixed(1)}km`);
                this.processDiscovery(obj);
            });
        } else {
            debug('STAR_CHARTS', `❌ No objects to discover in this batch`);
        }
    }
    
    calculateDistance(pos1, pos2) {
        //Calculate Euclidean distance between two 3D positions
        if (!pos1 || !pos2 || pos1.length < 3 || pos2.length < 3) {
            return Infinity;
        }

        return Math.sqrt(
            Math.pow(pos1[0] - pos2[0], 2) +
            Math.pow(pos1[1] - pos2[1], 2) +
            Math.pow(pos1[2] - pos2[2], 2)
        );
    }

    isWithinRange(object, playerPosition, discoveryRadius) {
        //Check if object is within discovery range

        if (!object.position || object.position.length < 2) {
            return false;
        }

        // Ensure both positions are 3D for distance calculation
        const objPos = this.ensure3DPosition(object.position);
        const playerPos = this.ensure3DPosition(playerPosition);

        const distance = this.calculateDistance(objPos, playerPos);
        return distance <= discoveryRadius;
    }

    ensure3DPosition(position) {
        //Ensure position is 3D by adding z=0 if missing
        if (!position || !Array.isArray(position)) {
            return [0, 0, 0];
        }

        if (position.length === 2) {
            return [position[0], position[1], 0];
        }

        return position;
    }
    
    processDiscovery(object) {
        //Process a new object discovery with pacing
        
        const category = this.getDiscoveryCategory(object.type);
        
        if (this.shouldNotifyDiscovery(object.type)) {
            this.showDiscoveryNotification(object, category);
            this.lastDiscoveryTime.set(category, Date.now());
        }
        
        // Always add to discovered list
        this.addDiscoveredObject(object.id);
        
        // Update performance metrics
        this.performanceMetrics.discoveryCount++;
        
debug('UTILITY', `🔍 Discovered: ${object.name} (${object.type})`);
    }
    
    getDiscoveryCategory(objectType) {
        //Get discovery category for pacing system
        
        for (const [category, config] of Object.entries(this.discoveryTypes)) {
            if (config.types.includes(objectType)) {
                return category;
            }
        }
        return 'background';
    }
    
    shouldNotifyDiscovery(objectType) {
        //Check if discovery should trigger notification based on pacing
        // TEMPORARILY DISABLED: Always notify for testing purposes

        // const category = this.getDiscoveryCategory(objectType);
        // const lastTime = this.lastDiscoveryTime.get(category) || 0;
        // const cooldown = this.discoveryTypes[category].cooldown;
        //
        // return Date.now() - lastTime > cooldown;

        return true; // Always notify for testing - remove suppression
    }
    
    showDiscoveryNotification(object, category) {
        //Show discovery notification with appropriate prominence
        
        const config = this.discoveryTypes[category];
        
        // Play audio if specified
        if (config.audio) {
            let played = false;
            try {
                if (window.audioManager && typeof window.audioManager.playSound === 'function') {
                    window.audioManager.playSound(config.audio);
                    played = true;
                }
            } catch (e) {
                // Fall through to HTMLAudioElement fallback
            }
            if (!played) {
                try {
                    const audio = new Audio('/static/audio/blurb.mp3');
                    audio.volume = 0.8;
                    // Non-blocking play; browsers may reject silently if not user-initiated
                    audio.play().catch(() => {});
                } catch (e) {
                    // Ignore audio errors to avoid interrupting UX
                }
            }
        }
        
        // Show notification
        const message = `${object.name} discovered!`;

        if (config.notification === 'prominent') {
            this.showProminentNotification(message);
        } else if (config.notification === 'subtle') {
            this.showSubtleNotification(message);
        } else if (config.notification === 'log_only') {
            debug('STAR_CHARTS', `📝 ${message}`);
        } else {
            debug('STAR_CHARTS', `📝 ${message}`);
        }
    }
    
    showProminentNotification(message) {
        //Show prominent discovery notification using HUD system

        // Use StarfieldManager's communication HUD for proper notifications
        if (this.viewManager?.starfieldManager?.communicationHUD?.showMessage) {
            this.viewManager.starfieldManager.communicationHUD.showMessage('DISCOVERY', message, {
                duration: 3000,
                priority: 'normal'
            });
        } else {
            // Fallback to creating notification element
            const notification = document.createElement('div');
            notification.className = 'star-charts-discovery-notification prominent';
            notification.textContent = message;

            // Style the notification
            Object.assign(notification.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 255, 68, 0.9)',
                color: '#000',
                padding: '10px 20px',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                zIndex: '10000',
                animation: 'fadeInOut 3s ease-in-out'
            });

            document.body.appendChild(notification);

            // Remove after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
    
    showSubtleNotification(message) {
        //Show subtle discovery notification using HUD system

        // Use StarfieldManager's communication HUD for proper notifications
        if (this.viewManager?.starfieldManager?.communicationHUD?.showMessage) {
            this.viewManager.starfieldManager.communicationHUD.showMessage('DISCOVERY', message, {
                duration: 2000,
                priority: 'low'
            });
        } else {
            // Fallback to creating notification element
            const notification = document.createElement('div');
            notification.className = 'star-charts-discovery-notification subtle';
            notification.textContent = message;

            // Style the notification
            Object.assign(notification.style, {
                position: 'fixed',
                top: '60px',
                right: '20px',
                backgroundColor: 'rgba(255, 255, 68, 0.7)',
                color: '#000',
                padding: '8px 15px',
                borderRadius: '3px',
                fontSize: '14px',
                zIndex: '9999',
                animation: 'slideInOut 2s ease-in-out'
            });

            document.body.appendChild(notification);

            // Remove after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 2000);
        }
    }
    
    getPlayerPosition() {
        //Get current player position with robust fallbacks

        // Primary: ship position from SolarSystemManager
        if (this.solarSystemManager && this.solarSystemManager.ship) {
            const position = this.solarSystemManager.ship.position;
            if (position && typeof position.x === 'number') {
                debug('STAR_CHARTS', `📍 Player position (ship): (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
                return [position.x, position.y, position.z];
            } else {
                debug('STAR_CHARTS', `❌ Invalid ship position:`, position);
            }
        } else {
            debug('STAR_CHARTS', `❌ No solarSystemManager.ship available`);
        }

        // Fallback: use active camera position (always available in gameplay)
        if (this.camera && this.camera.position) {
            const pos = this.camera.position;
            debug('STAR_CHARTS', `📍 Player position (camera): (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
            return [pos.x, pos.y, pos.z];
        } else {
            debug('STAR_CHARTS', `❌ No camera position available`);
        }

        debug('STAR_CHARTS', `❌ Returning null position`);
        return null;
    }
    
    getDiscoveryRadius() {
        //Get discovery radius - independent of target computer range for better solar system coverage

        // Testing very small discovery radius for precise object detection
        // This will require players to get very close to objects
        const baseDiscoveryRadius = 10.0; // 10km for extremely precise discovery

        debug('STAR_CHARTS', `🔍 Using discovery radius: ${baseDiscoveryRadius}km`);
        return baseDiscoveryRadius;
    }
    
    isDiscovered(objectId) {
        //Check if object has been discovered
        return this.discoveredObjects.has(objectId);
    }

    getDiscoveryMetadata(objectId) {
        //Get metadata for a discovered object
        return this.discoveryMetadata.get(objectId) || null;
    }

    addDiscoveredObject(objectId, discoveryMethod = 'proximity', source = 'player') {
        //Add object to discovered list with metadata and save state

        const wasAlreadyDiscovered = this.discoveredObjects.has(objectId);

        if (!wasAlreadyDiscovered) {
            this.discoveredObjects.add(objectId);

            // Add discovery metadata
            const discoveryData = {
                discoveredAt: new Date().toISOString(),
                discoveryMethod: discoveryMethod,
                source: source,
                sector: this.currentSector,
                firstDiscovered: true
            };

            this.discoveryMetadata.set(objectId, discoveryData);

            this.saveDiscoveryState();
debug('UTILITY', `🗺️ Discovered: ${objectId} (${discoveryMethod})`);

            // Trigger discovery callbacks
            this.triggerDiscoveryCallbacks(objectId, discoveryData);
        } else {
            // Update metadata for re-discovery
            const existing = this.discoveryMetadata.get(objectId);
            if (existing) {
                existing.lastSeen = new Date().toISOString();
                existing.source = source;
            }
        }
    }

    // Integration callback methods
    addDiscoveryCallback(callback) {
        //Add a callback for discovery events
        if (typeof callback === 'function') {
            this.discoveryCallbacks.push(callback);
        }
    }

    addTargetSelectionCallback(callback) {
        //Add a callback for target selection events
        if (typeof callback === 'function') {
            this.targetSelectionCallbacks.push(callback);
        }
    }

    triggerDiscoveryCallbacks(objectId, discoveryData) {
        //Trigger all discovery callbacks
        this.discoveryCallbacks.forEach(callback => {
            try {
                callback(objectId, discoveryData);
            } catch (error) {
                console.error('❌ Discovery callback error:', error);
            }
        });
    }

    triggerTargetSelectionCallbacks(objectId) {
        //Trigger all target selection callbacks
        this.targetSelectionCallbacks.forEach(callback => {
            try {
                callback(objectId);
            } catch (error) {
                console.error('❌ Target selection callback error:', error);
            }
        });
    }
    
    // Discovery state persistence
    async loadDiscoveryState() {
        //Load discovery state from localStorage with metadata

        try {
            const key = `star_charts_discovery_${this.currentSector}`;
            const savedState = localStorage.getItem(key);

            if (savedState) {
                const state = JSON.parse(savedState);
                this.discoveredObjects = new Set(state.discovered || []);

                // Load discovery metadata
                if (state.metadata) {
                    this.discoveryMetadata = new Map(Object.entries(state.metadata));
                }

debug('UTILITY', `📂 Loaded discovery state: ${this.discoveredObjects.size} objects discovered`);
debug('UTILITY', `📊 Discovery metadata: ${this.discoveryMetadata.size} entries`);
            } else {
                // Initialize with star always discovered
                this.initializeDiscoveryState();
            }

        } catch (error) {
            console.error('❌ Failed to load discovery state:', error);
            // Initialize with star always discovered
            this.initializeDiscoveryState();
        }
    }
    
    initializeDiscoveryState() {
        //Initialize discovery state with central star
        const starId = `${this.currentSector}_star`;
        this.discoveredObjects.add(starId);

        // Add metadata for the star
        this.discoveryMetadata.set(starId, {
            discoveredAt: new Date().toISOString(),
            discoveryMethod: 'initial',
            source: 'system',
            sector: this.currentSector,
            firstDiscovered: true
        });

debug('UTILITY', '🌟 Initialized discovery state with central star');
    }

    saveDiscoveryState() {
        //Save discovery state to localStorage with metadata

        try {
            const key = `star_charts_discovery_${this.currentSector}`;
            const state = {
                sector: this.currentSector,
                discovered: Array.from(this.discoveredObjects),
                metadata: Object.fromEntries(this.discoveryMetadata),
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };

            localStorage.setItem(key, JSON.stringify(state));
debug('UTILITY', `💾 Saved discovery state: ${this.discoveredObjects.size} objects`);

        } catch (error) {
            console.error('❌ Failed to save discovery state:', error);
        }
    }
    
    // Mission waypoint system
    createWaypoint(config) {
        //Create virtual waypoint for missions
        
        const waypointId = `waypoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const waypoint = {
            id: waypointId,
            name: config.name || `Mission Waypoint #${this.virtualWaypoints.size + 1}`,
            type: 'virtual_waypoint',
            position: config.position,
            triggerRadius: config.triggerRadius || 10.0,
            actions: config.actions || [],
            created: Date.now()
        };
        
        this.virtualWaypoints.set(waypointId, waypoint);
        
debug('UTILITY', `🎯 Created waypoint: ${waypoint.name} at [${waypoint.position.join(', ')}]`);
        
        return waypointId;
    }
    
    removeWaypoint(waypointId) {
        //Remove virtual waypoint
        
        if (this.virtualWaypoints.has(waypointId)) {
            const waypoint = this.virtualWaypoints.get(waypointId);
            this.virtualWaypoints.delete(waypointId);
debug('UTILITY', `🗑️  Removed waypoint: ${waypoint.name}`);
            return true;
        }
        
        return false;
    }
    
    checkWaypointTriggers() {
        //Check if player has reached any waypoint triggers
        
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return;
        
        for (const [waypointId, waypoint] of this.virtualWaypoints) {
            const distance = Math.sqrt(
                Math.pow(waypoint.position[0] - playerPosition[0], 2) +
                Math.pow(waypoint.position[1] - playerPosition[1], 2) +
                Math.pow(waypoint.position[2] - playerPosition[2], 2)
            );
            
            if (distance <= waypoint.triggerRadius) {
                this.executeWaypointActions(waypoint);
                this.removeWaypoint(waypointId);
            }
        }
    }
    
    executeWaypointActions(waypoint) {
        //Execute waypoint actions when triggered
        
debug('UTILITY', `🎯 Waypoint triggered: ${waypoint.name}`);
        
        waypoint.actions.forEach(action => {
            switch (action.type) {
                case 'spawn_ships':
                    // TODO: Integrate with ship spawning system
debug('UTILITY', `🚀 Spawn ships: ${action.params}`);
                    break;
                    
                case 'play_comm':
                    if (window.audioManager) {
                        window.audioManager.playSound(action.params.audioFile);
                    }
                    break;
                    
                case 'next_waypoint':
                    // TODO: Integrate with mission system
debug('UTILITY', '➡️  Advance to next waypoint');
                    break;
                    
                case 'mission_update':
                    // TODO: Integrate with mission system
debug('MISSIONS', `📋 Mission update: ${action.params}`);
                    break;
                    
                default:
debug('UTILITY', `❓ Unknown waypoint action: ${action.type}`);
            }
        });
    }
    
    /**
     * Normalize object ID to consistent format
     * Converts lowercase 'a0_' prefixes to uppercase 'A0_' to match database format
     */
    normalizeObjectId(objectId) {
        if (!objectId) return objectId;
        return objectId.replace(/^a0_/i, 'A0_');
    }

    // Target Computer integration
    selectObjectById(objectId) {
        // Select object for targeting by ID with LRS-style robustness
        debug('TARGETING', `🎯 TARGET_SWITCH: Star Charts selection started - objectId: ${objectId}`);
        debug('STAR_CHARTS', `🗺️ Starting target selection process for ${objectId}`);

        // DEBUG: Check if star is discovered
        const isStarDiscovered = this.isDiscovered(objectId);
        debug('STAR_CHARTS', `🗺️ Star discovered check: ${objectId} = ${isStarDiscovered}`);

        // DEBUG: Check target computer integration
        if (this.targetComputerManager) {
            const targetObjectsCount = this.targetComputerManager.targetObjects ? this.targetComputerManager.targetObjects.length : 0;
            debug('TARGETING', `🎯 Target Computer targetObjects count: ${targetObjectsCount}`);

            // Check if A0_star is in targetObjects
            if (this.targetComputerManager.targetObjects) {
                const foundTarget = this.targetComputerManager.targetObjects.find(t => t.id === objectId);
                debug('TARGETING', `🎯 A0_star in targetObjects: ${!!foundTarget}`);
                if (foundTarget) {
                    debug('TARGETING', `🎯 Found target: ${foundTarget.name} (${foundTarget.id})`);
                }

                // List all targets for debugging
                debug('TARGETING', `🎯 All targets in targetObjects: ${this.targetComputerManager.targetObjects.map(t => `${t.name}(${t.id})`).join(', ')}`);
            }
        }

        // Add global debug function for runtime inspection
        if (typeof window !== 'undefined') {
            window.debugStarChartsState = () => {
                console.log('🗺️ Star Charts State:');
                console.log('  - Current sector:', this.currentSector);
                console.log('  - Discovered objects:', Array.from(this.discoveredObjects));
                console.log('  - Is A0_star discovered:', this.isDiscovered('A0_star'));

                if (this.targetComputerManager && this.targetComputerManager.targetObjects) {
                    console.log('🎯 Target Computer State:');
                    console.log('  - Target objects count:', this.targetComputerManager.targetObjects.length);
                    console.log('  - Has A0_star:', !!this.targetComputerManager.targetObjects.find(t => t.id === 'A0_star'));
                    console.log('  - All targets:', this.targetComputerManager.targetObjects.map(t => `${t.name}(${t.id})`));
                }

                return 'Debug info logged to console';
            };
            debug('STAR_CHARTS', '🗺️ Use debugStarChartsState() in console to inspect current state');
        }

        // Normalize object ID to match Target Computer format
        const normalizedId = this.normalizeObjectId(objectId);
        debug('STAR_CHARTS', `🗺️ Normalized ID: ${normalizedId}`);

        // Lazy-acquire TargetComputerManager if not provided at construction
        if (!this.targetComputerManager && this.viewManager?.starfieldManager?.targetComputerManager) {
            this.targetComputerManager = this.viewManager.starfieldManager.targetComputerManager;
        }

        if (this.targetComputerManager && this.targetComputerManager.setTargetById) {
            // Get object data for robust targeting
            const objectData = this.getObjectData(objectId);
            if (objectData) {
debug('TARGETING', `🎯 Star Charts: Setting robust target for ${objectData.name} (${normalizedId})`);
debug('STAR_CHARTS', `🗺️ Object data found - name: ${objectData.name}, type: ${objectData.type}`);
            }

            // Ensure Target Computer is activated for manual selection
            if (this.targetComputerManager.targetComputerEnabled === false) {
debug('TARGETING', 'Star Charts: Activating Target Computer for selection');
                this.targetComputerManager.targetComputerEnabled = true;
            }

            // Set target by ID - no fallbacks, crash on failure for debugging
            debug('TARGETING', `🎯 TARGET_SWITCH: Calling setTargetById with normalizedId: ${normalizedId}`);
            const success = this.targetComputerManager.setTargetById(normalizedId);
            if (!success) {
                const errorMsg = `❌ CRITICAL: Failed to set target for ${objectData.name} (${normalizedId}) - target lookup failed`;
                debug('TARGETING', `🎯 TARGET_SWITCH: setTargetById FAILED for ${normalizedId}`);
                console.error(errorMsg);
                throw new Error(errorMsg); // Crash in dev to find bugs
            }

debug('TARGETING', `🎯 Star Charts: Successfully targeted ${objectData.name}`);
debug('TARGETING', `🎯 TARGET_SWITCH: setTargetById SUCCEEDED for ${normalizedId}`);
            // Trigger target selection callbacks
            debug('STAR_CHARTS', `🗺️ Triggering target selection callbacks for ${normalizedId}`);
            this.triggerTargetSelectionCallbacks(normalizedId);
            return true;
        }
        
        console.warn('⚠️  Target Computer integration not available');
        return false;
    }

    setVirtualTarget(waypointId) {
        // Set virtual waypoint as target
        
        const waypoint = this.virtualWaypoints.get(waypointId);
        if (!waypoint) {
            console.error(`❌ Waypoint not found: ${waypointId}`);
            return false;
        }
        
        // Lazy-acquire TargetComputerManager if not provided at construction
        if (!this.targetComputerManager && this.viewManager?.starfieldManager?.targetComputerManager) {
            this.targetComputerManager = this.viewManager.starfieldManager.targetComputerManager;
        }

        if (this.targetComputerManager && this.targetComputerManager.setVirtualTarget) {
            return this.targetComputerManager.setVirtualTarget(waypoint);
        }
        
        console.warn('⚠️  Virtual target integration not available');
        return false;
    }
    
    // Performance monitoring
    getPerformanceMetrics() {
        //Get current performance metrics
        
        const metrics = this.performanceMetrics;
        
        return {
            averageDiscoveryCheckTime: metrics.discoveryCheckTime.length > 0 
                ? metrics.discoveryCheckTime.reduce((a, b) => a + b) / metrics.discoveryCheckTime.length 
                : 0,
            maxDiscoveryCheckTime: Math.max(...metrics.discoveryCheckTime, 0),
            totalDiscoveries: metrics.discoveryCount,
            discoveredObjectsCount: this.discoveredObjects.size,
            loadedSectorsCount: this.loadedSectors.size,
            spatialGridCells: this.spatialGrid.size
        };
    }
    
    logPerformanceReport() {
        //Log performance report to console
        
        const metrics = this.getPerformanceMetrics();
        
debug('PERFORMANCE', '📊 Star Charts Performance Report:');
debug('UTILITY', `   - Average discovery check: ${metrics.averageDiscoveryCheckTime.toFixed(2)}ms`);
debug('UTILITY', `   - Max discovery check: ${metrics.maxDiscoveryCheckTime.toFixed(2)}ms`);
debug('UTILITY', `   - Total discoveries: ${metrics.totalDiscoveries}`);
debug('UTILITY', `   - Discovered objects: ${metrics.discoveredObjectsCount}`);
debug('UTILITY', `   - Spatial grid cells: ${metrics.spatialGridCells}`);
    }
    
    // Public API
    isEnabled() {
        return this.config.enabled;
    }
    
    getDiscoveredObjects() {
        return Array.from(this.discoveredObjects);
    }
    
    getCurrentSector() {
        return this.currentSector;
    }
    
    getObjectData(objectId) {
        //Get object data by ID
        
        if (!this.objectDatabase || !this.objectDatabase.sectors[this.currentSector]) {
            return null;
        }
        
        const sectorData = this.objectDatabase.sectors[this.currentSector];
        
        // Check star
        if (sectorData.star && sectorData.star.id === objectId) {
            return sectorData.star;
        }
        
        // Check celestial objects
        const celestialObject = sectorData.objects.find(obj => obj.id === objectId);
        if (celestialObject) {
            return celestialObject;
        }
        
        // Check infrastructure
        if (sectorData.infrastructure) {
            const station = sectorData.infrastructure.stations?.find(obj => obj.id === objectId);
            if (station) {
                return station;
            }
            
            const beacon = sectorData.infrastructure.beacons?.find(obj => obj.id === objectId);
            if (beacon) {
                return beacon;
            }
        }
        
        // Check virtual waypoints
        return this.virtualWaypoints.get(objectId) || null;
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
    
    @keyframes slideInOut {
        0% { opacity: 0; transform: translateX(20px); }
        20% { opacity: 1; transform: translateX(0); }
        80% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(20px); }
    }
`;
document.head.appendChild(style);
