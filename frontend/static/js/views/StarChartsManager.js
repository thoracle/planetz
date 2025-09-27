import { debug } from '../debug.js';
import { DistanceCalculator } from '../utils/DistanceCalculator.js';

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
        this.discoveryInterval = 1000;       // Check every 1 second for responsive discovery
        
        // Discovery pacing system
        this.discoveryTypes = {
            'major': {
                types: ['star', 'planet'],
                notification: 'prominent',
                audio: 'blurb.mp3',
                cooldown: 0 // No cooldown for major discoveries
            },
            'minor': {
                types: ['moon', 'navigation_beacon', 'space_station', 'Refinery', 'Research Lab', 'Communications Array', 'Storage Depot', 'Frontier Outpost', 'Factory', 'Defense Platform', 'Repair Station', 'Shipyard', 'Mining Station'],
                notification: 'subtle', 
                audio: 'blurb.mp3',
                cooldown: 0 // Disabled cooldown for testing
            },
            'background': {
                types: ['asteroid', 'debris_field'],
                notification: 'log_only',
                audio: null,
                cooldown: 0 // Disabled cooldown for testing
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
        
        // Initialization state
        this.isInitialized = false;
        
        // Initialize system
        this.initialize();
        
        // Add console commands for hit box debugging
        this.setupHitBoxDebugCommands();
    }
    
    async initialize() {
        // Prevent multiple initializations
        if (this.isInitialized) {
            debug('UTILITY', 'StarChartsManager: Already initialized, skipping...');
            return;
        }
        
debug('UTILITY', 'StarChartsManager: Initializing...');
        
        try {
            // Load static database
            const startTime = performance.now();
            await this.loadObjectDatabase();
            const loadTime = performance.now() - startTime;
            this.performanceMetrics.databaseLoadTime.push(loadTime);
            
            // Load discovery state
            await this.loadDiscoveryState();

            // DEBUGGING: Auto-discovery disabled - no test mode or beacon auto-discovery
            debug('UTILITY', '🔧 DEBUG MODE: Auto-discovery disabled (test mode and beacon auto-discovery)');
            
            // COMMENTED OUT FOR DEBUGGING - Re-enable when discovery system is stable
            /*
            // Optional test mode: auto-discover everything in current sector for parity testing
            if (this.isTestDiscoverAllEnabled()) {
                this.discoverAllInCurrentSector();
            }

            // TEMPORARY FIX: Auto-discover beacons for debugging
            this.autoDiscoverBeacons();
            */
            
            // Initialize spatial grid
            this.initializeSpatialGrid();
            
            // Start discovery checking
            this.startDiscoveryLoop();
            
            // Mark as initialized
            this.isInitialized = true;
            
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
    
    getScenePosition(obj) {
        // Get actual 3D scene coordinates from SolarSystemManager instead of data coordinates
        
        if (!this.solarSystemManager || !obj || !obj.id) {
            return null;
        }
        
        try {
            // Handle different object types and their ID mappings
            
            // 1. Stars (A0_star -> 'star')
            if (obj.id === 'A0_star') {
                const star = this.solarSystemManager.celestialBodies?.get('star');
                if (star && star.position) {
                    return [star.position.x, star.position.y, star.position.z];
                }
            }
            
            // 2. Planets (A0_terra_prime -> 'planet_0', A0_luna -> 'planet_1', etc.)
            if (obj.id.startsWith('A0_') && obj.type === 'planet') {
                // Try to find the planet by checking all planet entries
                for (const [key, celestialBody] of this.solarSystemManager.celestialBodies.entries()) {
                    if (key.startsWith('planet_') && celestialBody.name === obj.name) {
                        return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
                    }
                }
            }
            
            // 3. Moons (A0_luna -> moon_0_0, A0_europa -> moon_0_1, etc.)
            if (obj.id.startsWith('A0_') && obj.type === 'moon') {
                // Try to find the moon by checking all moon entries
                for (const [key, celestialBody] of this.solarSystemManager.celestialBodies.entries()) {
                    if (key.startsWith('moon_') && celestialBody.name === obj.name) {
                        return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
                    }
                }
            }
            
            // 4. Direct ID lookup (for beacons and other objects)
            let celestialBody = this.solarSystemManager.celestialBodies?.get(obj.id);
            if (celestialBody && celestialBody.position) {
                return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
            }

            // 4b. Station ID mapping (a0_hermes_refinery -> station_hermes_refinery)
            // Handle all station types by checking if obj.id starts with 'a0_' and has a valid station type
            if (obj.id && obj.id.startsWith('a0_') && obj.type && 
                (obj.type === 'station' || 
                 obj.type === 'Refinery' || 
                 obj.type === 'Research Lab' || 
                 obj.type === 'Defense Platform' || 
                 obj.type === 'Storage Depot' || 
                 obj.type === 'Factory' || 
                 obj.type === 'Frontier Outpost' ||
                 obj.type === 'Communications Array' ||
                 obj.type === 'Repair Station' ||
                 obj.type === 'Mining Station' ||
                 obj.type === 'Shipyard' ||
                 obj.type.includes('Station') ||
                 obj.type.includes('Lab') ||
                 obj.type.includes('Platform') ||
                 obj.type.includes('Depot') ||
                 obj.type.includes('Factory') ||
                 obj.type.includes('Outpost') ||
                 obj.type.includes('Array') ||
                 obj.type.includes('Complex') ||
                 obj.type.includes('Facility') ||
                 obj.type.includes('Shipyard'))) {
                const stationKey = `station_${obj.name.toLowerCase().replace(/\s+/g, '_')}`;
                debug('STAR_CHARTS', `🔍 Looking for station ${obj.name} with key: ${stationKey}`);
                debug('STAR_CHARTS', `🔍 CelestialBodies map has ${this.solarSystemManager.celestialBodies?.size || 0} entries`);
                
                // Debug: Show all available keys
                if (this.solarSystemManager.celestialBodies?.size > 0) {
                    const allKeys = Array.from(this.solarSystemManager.celestialBodies.keys());
                    debug('STAR_CHARTS', `🔍 Available keys: ${allKeys.join(', ')}`);
                }
                
                celestialBody = this.solarSystemManager.celestialBodies?.get(stationKey);
                if (celestialBody && celestialBody.position) {
                    debug('STAR_CHARTS', `✅ Found station ${obj.name} at scene position: [${celestialBody.position.x.toFixed(2)}, ${celestialBody.position.y.toFixed(2)}, ${celestialBody.position.z.toFixed(2)}]`);
                    return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
                } else {
                    debug('STAR_CHARTS', `❌ Station ${obj.name} not found with key: ${stationKey}`);
                }

                // Enhanced fallback: Try multiple key formats
                const alternativeKeys = [
                    obj.id,  // a0_hermes_refinery
                    ...(typeof obj.id === 'string' ? [
                        obj.id.replace('a0_', ''),  // hermes_refinery
                        obj.id.replace('a0_', 'A0_'),  // A0_hermes_refinery
                    ] : []),
                    obj.name,  // Hermes Refinery
                    ...(typeof obj.name === 'string' ? [
                        obj.name.toLowerCase().replace(/\s+/g, '_'),  // hermes_refinery
                    ] : []),
                ];
                
                debug('STAR_CHARTS', `🔍 Trying alternative keys: ${alternativeKeys.join(', ')}`);
                
                for (const altKey of alternativeKeys) {
                    celestialBody = this.solarSystemManager.celestialBodies?.get(altKey);
                    if (celestialBody && celestialBody.position) {
                        debug('STAR_CHARTS', `✅ Found station ${obj.name} with alternative key "${altKey}" at: [${celestialBody.position.x.toFixed(2)}, ${celestialBody.position.y.toFixed(2)}, ${celestialBody.position.z.toFixed(2)}]`);
                        return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
                    }
                }

                // Fallback: Search all station entries by name matching
                if (this.solarSystemManager.celestialBodies) {
                    debug('STAR_CHARTS', `🔍 Searching all ${this.solarSystemManager.celestialBodies.size} celestial bodies for station ${obj.name}`);
                    for (const [key, body] of this.solarSystemManager.celestialBodies.entries()) {
                        if (body && body.position && (
                            key.includes('station') || 
                            (body.name && body.name === obj.name) ||
                            (body.userData?.name && body.userData.name === obj.name)
                        )) {
                            debug('STAR_CHARTS', `✅ Found station ${obj.name} via fallback search (key: ${key}) at: [${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)}, ${body.position.z.toFixed(2)}]`);
                            return [body.position.x, body.position.y, body.position.z];
                        }
                    }
                }

                debug('STAR_CHARTS', `❌ Station ${obj.name} not found in scene (tried key: ${stationKey} and alternatives)`);
            }

            // 4c. Beacon ID mapping (a0_navigation_beacon_1 -> beacon key)
            if (obj.id && typeof obj.id === 'string' && obj.id.startsWith('a0_navigation_beacon_')) {
                // Try multiple beacon lookup strategies
                const beaconNum = obj.id.replace('a0_navigation_beacon_', '');
                const beaconKey = `beacon_${beaconNum}`;

                // Try different beacon storage patterns
                celestialBody = this.solarSystemManager.celestialBodies?.get(beaconKey) ||
                               this.solarSystemManager.celestialBodies?.get(obj.id) ||
                               this.solarSystemManager.celestialBodies?.get(`navigation_beacon_${beaconNum}`);

                if (celestialBody && celestialBody.position) {
                    return [celestialBody.position.x, celestialBody.position.y, celestialBody.position.z];
                }
            }
            
            // 5. Scene object lookup by name
            if (this.solarSystemManager.scene) {
                const sceneObject = this.solarSystemManager.scene.getObjectByName(obj.id) || 
                                   this.solarSystemManager.scene.getObjectByName(obj.name);
                if (sceneObject && sceneObject.position) {
                    return [sceneObject.position.x, sceneObject.position.y, sceneObject.position.z];
                }
            }
            
            // 6. StarfieldManager scene lookup (for stations, beacons)
            if (this.viewManager?.starfieldManager?.scene) {
                const starfieldObject = this.viewManager.starfieldManager.scene.getObjectByName(obj.id) ||
                                       this.viewManager.starfieldManager.scene.getObjectByName(obj.name);
                if (starfieldObject && starfieldObject.position) {
                    return [starfieldObject.position.x, starfieldObject.position.y, starfieldObject.position.z];
                }
            }
            
            // CRITICAL: Return null - object will be SKIPPED from spatial grid (no fallback to data coordinates)
            debug('STAR_CHARTS', `❌ No scene position found for ${obj.id || obj.name} - will be skipped`);
            return null;
            
        } catch (error) {
            debug('STAR_CHARTS', `⚠️ Error getting scene position for ${obj.id}: ${error.message}`);
            return null;
        }
    }
    
    initializeSpatialGrid() {
        // Initialize spatial partitioning for optimized proximity checking
        
        if (!this.objectDatabase || !this.objectDatabase.sectors[this.currentSector]) {
            debug('STAR_CHARTS', '⚠️ Cannot initialize spatial grid: no object database or sector data');
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

        // Store as class property for access by other methods
        this.allObjects = allObjects;

        let processedCount = 0;
        let skippedCount = 0;

        // Debug: Log ALL objects being processed

        allObjects.forEach((obj, index) => {
            if (obj && obj.position) {
                // Get actual 3D scene coordinates - NO FALLBACK to data coordinates
                const scenePosition3D = this.getScenePosition(obj);
                
                // CRITICAL: Only use scene positions - skip objects without valid scene positions
                if (!scenePosition3D) {
                    debug('STAR_CHARTS', `❌ SKIPPING ${obj.id || obj.name} - no valid scene position found`);
                    skippedCount++;
                    return; // Skip this object entirely
                }
                
                const position3D = scenePosition3D;

                const gridKey = this.getGridKey(position3D);

                // Store the scene position for discovery calculations
                obj.cartesianPosition = position3D;

                if (!this.spatialGrid.has(gridKey)) {
                    this.spatialGrid.set(gridKey, []);

                } else {

                }

                const beforeCount = this.spatialGrid.get(gridKey).length;
                this.spatialGrid.get(gridKey).push(obj);
                const afterCount = this.spatialGrid.get(gridKey).length;

                processedCount++;

                // Log summary for first few objects
                if (index < 5) {

                }
            } else {
                skippedCount++;
                // Log ALL skipped objects

            }
        });

        // Only log spatial grid initialization on first setup, not on refresh
        if (!this.spatialGridInitialized) {
            debug('UTILITY', `🗺️ Spatial grid initialized: ${this.spatialGrid.size} cells, ${allObjects.length} objects`);
            this.spatialGridInitialized = true;
        }

        // Add global debug function for spatial grid inspection
        if (typeof window !== 'undefined') {
            window.debugSpatialGrid = () => {

                for (const [cellKey, objects] of this.spatialGrid) {

                    objects.forEach(obj => {

                    });
                }
                return 'Spatial grid logged to console';
            };
            
            // Add manual refresh function for testing
            window.refreshSpatialGrid = () => {

                this.refreshSpatialGrid();
                return 'Spatial grid refreshed';
            };
            // debug('STAR_CHARTS', '🗺️ Use debugSpatialGrid() in console to inspect spatial grid'); // Reduced spam
        }
    }

    /**
     * Refresh spatial grid after system generation
     * Call this after SolarSystemManager creates all stations
     */
    refreshSpatialGrid() {
        // debug('STAR_CHARTS', '🔄 Refreshing spatial grid after system generation...'); // Reduced spam
        this.initializeSpatialGrid();
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

        // debug('STAR_CHARTS', `🔍 getNearbyObjects called with playerPos[${playerPosition.join(',')}], radius=${radius}`);  // Commented out to reduce spam

        const nearbyObjects = [];
        // Fix: Ensure we search enough grid cells to cover the full radius
        // Add larger buffer to account for objects near cell boundaries
        // With 50km grid size and 10km discovery radius, we need at least 2 cell buffer
        const gridRadius = Math.ceil(radius / this.gridSize) + 2;
        const playerPos3D = this.ensure3DPosition(playerPosition);
        const playerGridKey = this.getGridKey(playerPosition);
        const [px, py, pz] = playerGridKey.split(',').map(Number);

        // Enhanced debug logging for spatial grid search (commented out to reduce spam)

        let checkedCells = 0;
        let totalObjectsFound = 0;

        // Spatial grid cell logging commented out to reduce spam

        // for (const [cellKey, objects] of this.spatialGrid) {

        // }

        // Check surrounding grid cells
        for (let x = px - gridRadius; x <= px + gridRadius; x++) {
            for (let y = py - gridRadius; y <= py + gridRadius; y++) {
                for (let z = pz - gridRadius; z <= pz + gridRadius; z++) {
                    const gridKey = `${x},${y},${z}`;
                    const cellObjects = this.spatialGrid.get(gridKey);
                    checkedCells++;

                    if (cellObjects && cellObjects.length > 0) {
                        // debug('STAR_CHARTS', `📦 Cell ${gridKey}: ${cellObjects.length} objects found`); // Commented out to reduce spam
                        
                        // Filter objects to ensure they're actually within range (spatial grid gives nearby cells, but we need precise distance check)
                        const inRangeObjects = cellObjects.filter(obj => {
                            // Use stored Cartesian coordinates for accurate distance calculation
                            const objPos3D = obj.cartesianPosition || obj.position || [0, 0, 0];
                            const distance = this.calculateDistance(objPos3D, playerPos3D);
                            const inRange = distance <= radius;
                            
                            // debug('STAR_CHARTS', `  - ${obj.id || obj.name}: ${distance.toFixed(1)}km ${inRange ? '✅ IN RANGE' : '❌ OUT OF RANGE'}`); // Commented out to reduce spam
                            return inRange;
                        });

                        nearbyObjects.push(...inRangeObjects);
                        totalObjectsFound += inRangeObjects.length;
                    } else {
                        // debug('STAR_CHARTS', `📦 Cell ${gridKey}: empty`); // Commented out to reduce spam
                    }
                }
            }
        }

        // debug('STAR_CHARTS', `🔍 SUMMARY: Checked ${checkedCells} grid cells, found ${totalObjectsFound} objects total`);  // Commented out to reduce spam
        // debug('STAR_CHARTS', `🔍 Returning ${nearbyObjects.length} nearby objects`);  // Commented out to reduce spam
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
            
            // Get discovery radius from Target CPU (with debug override support)
            const discoveryRadius = this.getEffectiveDiscoveryRadius();
            
            // Get nearby objects using spatial partitioning
            const nearbyObjects = this.getNearbyObjects(playerPosition, discoveryRadius);

            // Debug spatial grid status
            const gridCells = this.spatialGrid.size;
            const totalObjectsInGrid = Array.from(this.spatialGrid.values()).reduce((sum, cell) => sum + cell.length, 0);

            // Only log discovery checks when objects are found to reduce spam
            if (nearbyObjects.length > 0) {
                debug('STAR_CHARTS', `🔍 Discovery check: ${nearbyObjects.length} objects within ${discoveryRadius.toFixed(0)}km radius`);
            }

            // Debug: Show what objects are being checked
            if (nearbyObjects.length > 0) {
                debug('STAR_CHARTS', `📋 Nearby objects: ${nearbyObjects.map(obj => obj.name || obj.id).join(', ')}`);
            }

            // Debug spatial search details - commented out to reduce spam
            // const gridRadius = Math.ceil(discoveryRadius / this.gridSize);
            // const playerGridKey = this.getGridKey(playerPosition);
            // debug('STAR_CHARTS', `🔍 Spatial search: gridRadius=${gridRadius}, playerGridKey=${playerGridKey}, gridSize=${this.gridSize}`);  // Commented out to reduce spam

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

        // debug('STAR_CHARTS', `🔍 Processing ${objects?.length || 0} nearby objects for discovery`);  // Commented out to reduce spam

        const undiscovered = objects.filter(obj => !this.isDiscovered(obj.id));
        const inRange = undiscovered.filter(obj => this.isWithinRange(obj, playerPosition, discoveryRadius));
        const discoveries = inRange.slice(0, this.config.maxDiscoveriesPerFrame);

        // Debug undiscovered objects in range - FOCUSED DEBUG
        if (undiscovered.length > 0) {
            undiscovered.forEach(obj => {
                const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
                const distance = this.calculateDistance(objPos, playerPosition);
                const withinRange = this.isWithinRange(obj, playerPosition, discoveryRadius);
                
                // Enhanced debug logging to diagnose discovery issues (reduced spam)

                debug('STAR_CHARTS', `   ✅ Has cartesianPosition: ${!!obj.cartesianPosition}`);
                
                if (withinRange) {
                    debug('STAR_CHARTS', `🎯 IN RANGE: ${obj.id} (${obj.type}) at ${distance.toFixed(1)}km - ready for discovery`);
                }
            });
        }

        // Simplified batch processing debug - only show when there are discoveries
        if (discoveries.length > 0) {
            debug('STAR_CHARTS', `📊 Discovery batch: ${inRange.length} in range → ${discoveries.length} processing`);
        }

        if (discoveries.length > 0) {
            discoveries.forEach((obj, index) => {
                const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
                const distance = this.calculateDistance(objPos, playerPosition);

                // Stagger notifications to prevent overlap when multiple objects are discovered simultaneously
                if (index === 0) {
                    // Process first discovery immediately
                    this.processDiscovery(obj);
                } else {
                    // Delay subsequent discoveries by 2 seconds each to prevent notification overlap
                    setTimeout(() => {
                        this.processDiscovery(obj);
                    }, index * 2000);
                }
            });
        }
    }
    
    calculateDistance(pos1, pos2) {
        // Use unified DistanceCalculator for consistent results across all systems
        return DistanceCalculator.calculate(pos1, pos2);
    }

    isWithinRange(object, playerPosition, discoveryRadius) {
        //Check if object is within discovery range

        // Use stored Cartesian coordinates for accurate distance calculation
        const objPos = object.cartesianPosition || object.position || [0, 0, 0];
        
        // Check if we have valid position data
        if (!objPos || (Array.isArray(objPos) && objPos.length < 2)) {
            debug('STAR_CHARTS', `❌ Invalid position for ${object.id}: ${objPos}`);
            return false;
        }

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

        debug('STAR_CHARTS', `🔔 DISCOVERY NOTIFICATION: ${message}`);

        // Try multiple notification methods for debugging
        let notificationShown = false;

        // Method 1: Use StarfieldManager's ephemeral HUD (top center)
        if (this.viewManager?.starfieldManager?.showHUDEphemeral) {
            try {
                this.viewManager.starfieldManager.showHUDEphemeral('🔍 DISCOVERY', message, 4000);
                debug('STAR_CHARTS', `✅ Discovery notification sent to Ephemeral HUD (top center)`);
                notificationShown = true;
            } catch (e) {
                debug('STAR_CHARTS', `❌ Ephemeral HUD notification failed: ${e.message}`);
            }
        }

        // Method 2: Try WeaponHUD unified message system
        if (this.viewManager?.starfieldManager?.weaponHUD?.showUnifiedMessage) {
            try {
                this.viewManager.starfieldManager.weaponHUD.showUnifiedMessage(
                    message, 
                    5000, // duration
                    3,    // high priority
                    '#00ff41', // green color
                    '#00ff41', // green border
                    'rgba(0, 0, 0, 0.9)' // dark background
                );
                debug('STAR_CHARTS', `✅ Discovery notification sent to WeaponHUD`);
                notificationShown = true;
            } catch (e) {
                debug('STAR_CHARTS', `❌ WeaponHUD notification failed: ${e.message}`);
            }
        }

        // Method 3: Fallback to creating notification element
        if (!notificationShown) {
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

        // Use StarfieldManager's ephemeral HUD for proper notifications (top center)
        if (this.viewManager?.starfieldManager?.showHUDEphemeral) {
            this.viewManager.starfieldManager.showHUDEphemeral('🔍 DISCOVERY', message, 3000);
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

        // Primary: ship position from StarfieldManager (most accurate for gameplay)
        if (this.viewManager && this.viewManager.starfieldManager && this.viewManager.starfieldManager.ship && this.viewManager.starfieldManager.ship.position) {
            const position = this.viewManager.starfieldManager.ship.position;
            if (position && typeof position.x === 'number') {

                return [position.x, position.y, position.z];
            } else {
                debug('STAR_CHARTS', `❌ Invalid starfield ship position:`, position);
            }
        } else {
            debug('STAR_CHARTS', `❌ No starfieldManager.ship available`);
        }

        // Secondary: ship position from ViewManager
        if (this.viewManager && this.viewManager.ship && this.viewManager.ship.position) {
            const position = this.viewManager.ship.position;
            if (position && typeof position.x === 'number') {

                return [position.x, position.y, position.z];
            } else {
                debug('STAR_CHARTS', `❌ Invalid viewManager ship position:`, position);
            }
        } else {
            debug('STAR_CHARTS', `❌ No viewManager.ship available`);
        }

        // Tertiary: ship position from SolarSystemManager (legacy fallback)
        if (this.solarSystemManager && this.solarSystemManager.ship) {
            const position = this.solarSystemManager.ship.position;
            if (position && typeof position.x === 'number') {

                return [position.x, position.y, position.z];
            } else {
                debug('STAR_CHARTS', `❌ Invalid solarSystem ship position:`, position);
            }
        } else {
            debug('STAR_CHARTS', `❌ No solarSystemManager.ship available`);
        }

        // Fallback: use active camera position (always available in gameplay)
        if (this.camera && this.camera.position) {
            const pos = this.camera.position;

            return [pos.x, pos.y, pos.z];
        } else {
            debug('STAR_CHARTS', `❌ No camera position available`);
        }

        // Fallback: Default to (0,0,0) if no ship position found
        debug('STAR_CHARTS', `⚠️ No player ship position found, defaulting to [0, 0, 0]`);
        console.log('🚀 DEBUG: getPlayerPosition() returning:', [0, 0, 0]); // New log
        return [0, 0, 0];
    }
    
    getDiscoveryRadius() {
        //Get discovery radius - close-range exploration requiring players to fly near objects

        // System uses kilometers as primary unit (1 game unit = 1km)
        // No conversion needed - return radius directly in kilometers
        // Using 50km for normal gameplay - allows comfortable exploration
        // - SOL: ~20km (close approach needed)
        // - Stations/Infrastructure: 40-60km range (exploration required)
        // - Planets/Moons: Variable based on 3D scene coordinates
        // - Production radius for normal gameplay
        const discoveryRangeKm = 50; // 50 kilometers - normal gameplay radius

        // debug('STAR_CHARTS', `🔍 Using discovery radius: ${discoveryRangeKm}km`); // Commented out to reduce spam
        return discoveryRangeKm;
    }
    
    // Debug helper: Set discovery radius from console
    setDiscoveryRadius(newRadius) {
        this.debugDiscoveryRadius = newRadius;
        debug('STAR_CHARTS', `🔧 Debug: Discovery radius set to ${newRadius}km`);
        return newRadius;
    }
    
    // Debug helper: Get current discovery radius (with debug override)
    getEffectiveDiscoveryRadius() {
        return this.debugDiscoveryRadius || this.getDiscoveryRadius();
    }
    
    // Debug helper: Reset discovery state for testing
    resetDiscoveryState() {
        this.discoveredObjects.clear();
        this.discoveryMetadata.clear();
        debug('STAR_CHARTS', '🧹 Discovery state reset - all objects now undiscovered');
        debug('STAR_CHARTS', `📊 Discovered objects: ${this.discoveredObjects.size}`);
        return this.discoveredObjects.size;
    }

    // Debug helper: Diagnose discovery radius issues (simplified)
    debugRadiusIssues() {
        debug('STAR_CHARTS', `Discovery radius: ${this.getEffectiveDiscoveryRadius()}km`);
        const playerPos = this.getPlayerPosition();
        if (playerPos) {
            const nearby = this.getNearbyObjects(playerPos, 100);
            debug('STAR_CHARTS', `Objects within 100km: ${nearby.length}`);
        }
    }
    
    isDiscovered(objectId) {
        //Check if object has been discovered
        // Normalize ID to handle case sensitivity (a0_ vs A0_)
        const normalizedId = typeof objectId === 'string' ? objectId.replace(/^a0_/i, 'A0_') : objectId;
        return this.discoveredObjects.has(normalizedId);
    }

    getDiscoveryMetadata(objectId) {
        //Get metadata for a discovered object
        // Normalize ID to handle case sensitivity (a0_ vs A0_)
        const normalizedId = typeof objectId === 'string' ? objectId.replace(/^a0_/i, 'A0_') : objectId;
        return this.discoveryMetadata.get(normalizedId) || null;
    }

    getObjectById(objectId) {
        //Get object data by ID from all loaded objects
        if (this.allObjects) {
            return this.allObjects.find(obj => obj && obj.id === objectId);
        }
        return null;
    }

    addDiscoveredObject(objectId, discoveryMethod = 'proximity', source = 'player') {
        //Add object to discovered list with metadata and save state
        
        // Normalize ID to handle case sensitivity (a0_ vs A0_)
        const normalizedId = typeof objectId === 'string' ? objectId.replace(/^a0_/i, 'A0_') : objectId;
        const wasAlreadyDiscovered = this.discoveredObjects.has(normalizedId);

        debug('STAR_CHARTS', `🔍 DISCOVERY ATTEMPT: ${normalizedId} (method: ${discoveryMethod}, already discovered: ${wasAlreadyDiscovered})`);

        if (!wasAlreadyDiscovered) {
            this.discoveredObjects.add(normalizedId);

            // Add discovery metadata
            const discoveryData = {
                discoveredAt: new Date().toISOString(),
                discoveryMethod: discoveryMethod,
                source: source,
                sector: this.currentSector,
                firstDiscovered: true
            };

            this.discoveryMetadata.set(normalizedId, discoveryData);

            this.saveDiscoveryState();
            debug('STAR_CHARTS', `✅ DISCOVERED: ${normalizedId} (${discoveryMethod}) - Total discovered: ${this.discoveredObjects.size}`);

            // Update achievement progress
            this.updateAchievementProgress();

            // Get object data for notification
            const objectData = this.getObjectById(objectId);
            if (objectData) {
                debug('STAR_CHARTS', `📋 Object data found: ${objectData.name} (${objectData.type})`);
                
                // Check if we should notify
                const shouldNotify = this.shouldNotifyDiscovery(objectData.type);
                debug('STAR_CHARTS', `🔔 Should notify: ${shouldNotify}`);
                
                if (shouldNotify) {
                    const category = this.getDiscoveryCategory(objectData.type);
                    debug('STAR_CHARTS', `📂 Discovery category: ${category}`);
                    this.showDiscoveryNotification(objectData, category);
                }
            } else {
                debug('STAR_CHARTS', `❌ No object data found for ${objectId}`);
            }

            // Trigger discovery callbacks
            this.triggerDiscoveryCallbacks(normalizedId, discoveryData);
            
            // Force immediate target computer sync for responsive updates
            if (this.viewManager?.navigationSystemManager?.starChartsTargetComputerIntegration) {
                this.viewManager.navigationSystemManager.starChartsTargetComputerIntegration.syncTargetData();
                debug('STAR_CHARTS', `🔄 Triggered immediate target computer sync for discovery: ${normalizedId}`);
            }
        } else {
            debug('STAR_CHARTS', `⏭️ Object ${objectId} already discovered, updating metadata`);
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
        // DEBUGGING: Discovery persistence disabled - always start fresh

        debug('UTILITY', '🔧 DEBUG MODE: Discovery persistence disabled - starting fresh each session');
        
        // Always initialize with fresh state for debugging
        this.initializeDiscoveryState();

        // COMMENTED OUT FOR DEBUGGING - Re-enable when discovery system is stable
        /*
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
        */
    }
    
    initializeDiscoveryState() {
        //Initialize discovery state with completely empty state - no objects discovered
        
        // DEBUGGING: Start completely fresh - no objects discovered, including central star
        // Players must fly within 10km of SOL (or any object) to discover it
        // this.discoveredObjects is already initialized as empty Set in constructor
        
        debug('UTILITY', '🌟 Initialized discovery state - COMPLETELY FRESH (no objects discovered)');
        debug('UTILITY', `📊 Total discovered objects: ${this.discoveredObjects.size}`);
        debug('UTILITY', `🎯 Players must fly within 10km of any object (including SOL) to discover it`);
    }

    saveDiscoveryState() {
        //Save discovery state to localStorage with metadata
        // DEBUGGING: Discovery persistence disabled - no saving to localStorage

        debug('UTILITY', `🔧 DEBUG MODE: Discovery save skipped - persistence disabled (${this.discoveredObjects.size} objects in memory)`);
        
        // COMMENTED OUT FOR DEBUGGING - Re-enable when discovery system is stable
        /*
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
        */
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
        return typeof objectId === 'string' ? objectId.replace(/^a0_/i, 'A0_') : objectId;
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

                if (this.targetComputerManager && this.targetComputerManager.targetObjects) {

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
        
        // Helper function to match IDs (handles both normalized and original formats)
        const matchesId = (dbId, searchId) => {
            if (dbId === searchId) return true;
            // Try normalized versions
            const normalizedDbId = this.normalizeObjectId(dbId);
            const normalizedSearchId = this.normalizeObjectId(searchId);
            return normalizedDbId === normalizedSearchId;
        };
        
        // Check star
        if (sectorData.star && matchesId(sectorData.star.id, objectId)) {
            return sectorData.star;
        }
        
        // Check celestial objects
        const celestialObject = sectorData.objects.find(obj => matchesId(obj.id, objectId));
        if (celestialObject) {
            return celestialObject;
        }
        
        // Check infrastructure
        if (sectorData.infrastructure) {
            const station = sectorData.infrastructure.stations?.find(obj => matchesId(obj.id, objectId));
            if (station) {
                return station;
            }
            
            const beacon = sectorData.infrastructure.beacons?.find(obj => matchesId(obj.id, objectId));
            if (beacon) {
                return beacon;
            }
        }
        
        // Check virtual waypoints
        return this.virtualWaypoints.get(objectId) || null;
    }
    
    /**
     * Setup console commands for hit box debugging
     */
    setupHitBoxDebugCommands() {
        // Add hit box debug commands to window object
        window.toggleHitBoxDebug = () => {
            const currentState = localStorage.getItem('star_charts_debug_hitboxes') === 'true';
            const newState = !currentState;
            localStorage.setItem('star_charts_debug_hitboxes', newState.toString());
            
            if (newState) {

                // Force refresh of Star Charts if it's currently open
                if (this.starChartsUI) {
                    this.starChartsUI.render();

                } else {

                }
            } else {

                // Force refresh of Star Charts if it's currently open
                if (this.starChartsUI) {
                    this.starChartsUI.render();

                } else {

                }
            }
            
            return newState;
        };
        
        window.enableHitBoxDebug = () => {
            localStorage.setItem('star_charts_debug_hitboxes', 'true');

            // Force refresh of Star Charts if it's currently open
            if (this.starChartsUI) {
                this.starChartsUI.render();

            } else {

            }
            return true;
        };
        
        window.disableHitBoxDebug = () => {
            localStorage.removeItem('star_charts_debug_hitboxes');

            // Force refresh of Star Charts if it's currently open
            if (this.starChartsUI) {
                this.starChartsUI.render();

            } else {

            }
            return false;
        };
        
        window.hitBoxDebugStatus = () => {
            const isEnabled = localStorage.getItem('star_charts_debug_hitboxes') === 'true';

            return isEnabled;
        };
        
        window.refreshStarCharts = () => {
            if (this.starChartsUI) {
                this.starChartsUI.render();
                return true;
            } else {
                return false;
            }
        };
    }

    /**
     * Update achievement progress based on discovery count
     */
    updateAchievementProgress() {
        try {
            const discoveryCount = this.discoveredObjects.size;
            
            // Import achievement system dynamically to avoid circular dependencies
            if (window.achievementSystem) {
                window.achievementSystem.updateDiscoveryProgress(discoveryCount);
            } else {
                // Try to initialize achievement system if not available
                import('../systems/AchievementSystem.js').then(module => {
                    const achievementSystem = module.getAchievementSystem();
                    const discoveryCount = this.discoveredObjects.size;
                    achievementSystem.updateDiscoveryProgress(discoveryCount);
                }).catch(error => {
                    console.warn('Failed to load achievement system:', error);
                });
            }
        } catch (error) {
            console.warn('Failed to update achievement progress:', error);
        }
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
