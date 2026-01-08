import { debug } from '../debug.js';
import { DistanceCalculator } from '../utils/DistanceCalculator.js';
import { SCMSpatialGrid } from './starcharts/SCMSpatialGrid.js';
import { SCMDiscoveryProcessor } from './starcharts/SCMDiscoveryProcessor.js';
import { GameObjectRegistry } from '../core/GameObjectRegistry.js';
import { isTestingMode } from './StarfieldManager.js';

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

// VERSION TRACKING
const STAR_CHARTS_VERSION = '1.3.1-arrow-fix';
const VERSION_DATE = '2025-09-30T21:45:00Z';

export class StarChartsManager {
    constructor(scene, camera, viewManager, solarSystemManager, targetComputerManager) {
        // VERSION LOGGING - Confirms latest code is running
        debug('UTILITY', `🚀 StarChartsManager v${STAR_CHARTS_VERSION}`);
        
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;
        this.solarSystemManager = solarSystemManager;
        this.targetComputerManager = targetComputerManager;
        
        // Core data structures
        this.objectDatabase = null;           // Static database from verse.py
        this.discoveredObjects = new Set();  // Set of discovered object IDs
        this.discoveryMetadata = new Map();  // Metadata for each discovered object
        this._currentSector = 'A0';          // Current sector (Phase 0: A0 only)
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

        // Memory leak prevention: track resources for cleanup
        this._animationFrameId = null;
        this._pendingTimeouts = new Set();
        this._globalDebugFunctions = [
            'debugSpatialGrid',
            'refreshSpatialGrid',
            'debugStarChartsState',
            'toggleHitBoxDebug',
            'enableHitBoxDebug',
            'disableHitBoxDebug',
            'hitBoxDebugStatus',
            'refreshStarCharts'
        ];

        // Initialization state
        this.isInitialized = false;

        // Initialize extracted handlers
        this.spatialGridHandler = new SCMSpatialGrid(this);
        this.discoveryProcessor = new SCMDiscoveryProcessor(this);

        // Initialize system
        this.initialize();
        
        // Add console commands for hit box debugging
        this.setupHitBoxDebugCommands();
    }
    
    // Getter and setter for currentSector that refreshes spatial grid on change
    get currentSector() {
        return this._currentSector;
    }
    
    set currentSector(newSector) {
        if (this._currentSector !== newSector) {
            debug('STAR_CHARTS', `🗺️ Sector changed from ${this._currentSector} to ${newSector} - refreshing spatial grid`);
            this._currentSector = newSector;
            
            // CRITICAL: Refresh spatial grid when sector changes to prevent contamination
            if (this.isInitialized) {
                this.refreshSpatialGrid();
            }
        }
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
            debug('P1', '❌ StarChartsManager: Initialization failed:', error);
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

            // Helper to set GameObject.discovered (PHASE 4 dual-write)
            const setGameObjectDiscovered = (id) => {
                const gameObject = GameObjectRegistry.getById(id);
                if (gameObject) {
                    gameObject.discovered = true;
                }
            };

            if (sector.star?.id) {
                if (!this.discoveredObjects.has(sector.star.id)) count++;
                this.discoveredObjects.add(sector.star.id);
                setGameObjectDiscovered(sector.star.id);
            }
            (sector.objects || []).forEach(obj => {
                if (obj?.id) {
                    if (!this.discoveredObjects.has(obj.id)) count++;
                    this.discoveredObjects.add(obj.id);
                    setGameObjectDiscovered(obj.id);
                }
            });
            const infra = sector.infrastructure || {};
            (infra.stations || []).forEach(st => {
                if (st?.id) {
                    if (!this.discoveredObjects.has(st.id)) count++;
                    this.discoveredObjects.add(st.id);
                    setGameObjectDiscovered(st.id);
                }
            });
            (infra.beacons || []).forEach(b => {
                if (b?.id) {
                    if (!this.discoveredObjects.has(b.id)) count++;
                    this.discoveredObjects.add(b.id);
                    setGameObjectDiscovered(b.id);
                }
            });
            this.saveDiscoveryState();
debug('UTILITY', `🧪 StarCharts TEST MODE: Discovered all objects in ${this.currentSector} (+${count})`);
        } catch (e) {
            debug('UTILITY', '🧪 StarCharts TEST MODE failed to discover all:', e);
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
                    // PHASE 4: Also set GameObject.discovered
                    const gameObject = GameObjectRegistry.getById(beacon.id);
                    if (gameObject) {
                        gameObject.discovered = true;
                    }
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
            debug('UTILITY', '🔧 TEMP FIX: Failed to auto-discover beacons:', e);
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
            debug('P1', '❌ Failed to load object database:', error);
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
    
    
    startDiscoveryLoop() {
        //Start the discovery checking loop

        const discoveryLoop = () => {
            if (this.config.enabled) {
                this.checkDiscoveryRadius();
            }
            this._animationFrameId = requestAnimationFrame(discoveryLoop);
        };

        discoveryLoop();
    }

    stopDiscoveryLoop() {
        //Stop the discovery checking loop
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }
    
    /**
     * Force immediate discovery check for a specific object (eliminates lag on target selection)
     * @param {string} objectId - Object ID to check for discovery
     */
    forceDiscoveryCheck(objectId) {
        if (!objectId) return;
        
        // Already discovered? Skip
        if (this.isDiscovered(objectId)) {
            return;
        }
        
        // Get object data
        const object = this.getObjectById(objectId);
        if (!object) {
            return;
        }
        
        // Check if in discovery range
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return;
        
        const discoveryRadius = this.getEffectiveDiscoveryRadius();
        
        if (this.isWithinRange(object, playerPosition, discoveryRadius)) {
            debug('STAR_CHARTS', `⚡ INSTANT DISCOVERY: ${object.name} (forced by target selection)`);
            this.processDiscovery(object);
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
        return [0, 0, 0];
    }
    
    getDiscoveryRadius() {
        //Get discovery radius - close-range exploration requiring players to fly near objects

        // System uses kilometers as primary unit (1 game unit = 1km)
        // No conversion needed - return radius directly in kilometers
        
        // CRITICAL FIX: Increase discovery radius for better gameplay
        // Different sectors have different scales - B1 objects are much farther apart than A0
        // - A0 (Sol): ~50km works well (close approach needed)
        // - B1 and other sectors: Objects can be 1000+ km apart, need larger radius
        // - Using 150km for better exploration experience across all sectors
        const discoveryRangeKm = 150; // 150 kilometers - improved gameplay radius for all sectors

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
                debug('P1', '❌ Discovery callback error:', error);
            }
        });
    }

    triggerTargetSelectionCallbacks(objectId) {
        //Trigger all target selection callbacks
        this.targetSelectionCallbacks.forEach(callback => {
            try {
                callback(objectId);
            } catch (error) {
                debug('P1', '❌ Target selection callback error:', error);
            }
        });
    }
    
    // Discovery state persistence
    async loadDiscoveryState() {
        // Skip loading in testing mode - always start fresh
        if (isTestingMode()) {
            debug('UTILITY', 'Testing mode: Skipping discovery state load');
            this.initializeDiscoveryState();
            return;
        }

        // Load discovery state from localStorage with metadata
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

                debug('UTILITY', `Loaded discovery state: ${this.discoveredObjects.size} objects discovered`);
                debug('UTILITY', `Discovery metadata: ${this.discoveryMetadata.size} entries`);
            } else {
                // Initialize with fresh state
                this.initializeDiscoveryState();
            }

        } catch (error) {
            debug('P1', `Failed to load discovery state: ${error}`);
            // Initialize with fresh state on error
            this.initializeDiscoveryState();
        }
    }
    
    initializeDiscoveryState() {
        // Initialize discovery state with empty state - no objects discovered
        // Players must fly within 10km of any object (including SOL) to discover it
        // this.discoveredObjects is already initialized as empty Set in constructor
        debug('UTILITY', `Initialized discovery state - fresh start (${this.discoveredObjects.size} objects)`);
    }

    saveDiscoveryState() {
        // Skip saving in testing mode
        if (isTestingMode()) {
            debug('UTILITY', `Testing mode: Skipping discovery state save (${this.discoveredObjects.size} objects in memory)`);
            return;
        }

        // Save discovery state to localStorage with metadata
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
            debug('UTILITY', `Saved discovery state: ${this.discoveredObjects.size} objects`);

        } catch (error) {
            debug('P1', `Failed to save discovery state: ${error}`);
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
                    // Handled by WaypointManager SpawnShipsAction
                    debug('UTILITY', `🚀 Spawn ships: ${action.params}`);
                    break;

                case 'play_comm':
                    if (window.audioManager) {
                        window.audioManager.playSound(action.params.audioFile);
                    }
                    break;

                case 'next_waypoint':
                    // Handled by WaypointManager chain system
                    debug('UTILITY', '➡️  Advance to next waypoint');
                    break;

                case 'mission_update':
                    // Handled by MissionEventService
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

        // CRITICAL FIX: Check current sector to prevent cross-sector contamination
        const currentSector = this.solarSystemManager?.currentSector || 'A0';
        if (normalizedId && !normalizedId.startsWith(currentSector + '_')) {
            debug('STAR_CHARTS', `🚫 StarCharts: Skipping target from different sector: ${objectId} (normalized: ${normalizedId}, current sector: ${currentSector})`);
            return false;
        }

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
                debug('P1', errorMsg);
                throw new Error(errorMsg); // Crash in dev to find bugs
            }

debug('TARGETING', `🎯 Star Charts: Successfully targeted ${objectData.name}`);
debug('TARGETING', `🎯 TARGET_SWITCH: setTargetById SUCCEEDED for ${normalizedId}`);
            // Trigger target selection callbacks
            debug('STAR_CHARTS', `🗺️ Triggering target selection callbacks for ${normalizedId}`);
            this.triggerTargetSelectionCallbacks(normalizedId);
            return true;
        }

        debug('TARGETING', '⚠️  Target Computer integration not available');
        return false;
    }

    setVirtualTarget(waypointId) {
        // Set virtual waypoint as target

        const waypoint = this.virtualWaypoints.get(waypointId);
        if (!waypoint) {
            debug('P1', `❌ Waypoint not found: ${waypointId}`);
            return false;
        }

        // Lazy-acquire TargetComputerManager if not provided at construction
        if (!this.targetComputerManager && this.viewManager?.starfieldManager?.targetComputerManager) {
            this.targetComputerManager = this.viewManager.starfieldManager.targetComputerManager;
        }

        if (this.targetComputerManager && this.targetComputerManager.setVirtualTarget) {
            return this.targetComputerManager.setVirtualTarget(waypoint);
        }

        debug('TARGETING', '⚠️  Virtual target integration not available');
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
        // Get object data by ID - CRITICAL FIX: Use dynamic solar system data instead of static database
        
        // CRITICAL FIX: Only reject cross-sector objects, not legitimate current sector objects
        const normalizedSearchId = this.normalizeObjectId(objectId);
        if (normalizedSearchId && typeof normalizedSearchId === 'string' && !normalizedSearchId.startsWith(this.currentSector + '_')) {
            debug('STAR_CHARTS', `🚫 getObjectData: Rejecting cross-sector object: ${objectId} (normalized: ${normalizedSearchId}, current sector: ${this.currentSector})`);
            return null;
        }
        
        // CRITICAL FIX: Use dynamic solar system data instead of static database
        if (!this.solarSystemManager) {
            debug('STAR_CHARTS', `🚫 getObjectData: SolarSystemManager not available`);
            return null;
        }
        
        const celestialBodies = this.solarSystemManager.getCelestialBodies();
        if (!celestialBodies || celestialBodies.size === 0) {
            debug('STAR_CHARTS', `🚫 getObjectData: No celestial bodies in current solar system`);
            return null;
        }
        
        // Search through dynamic solar system objects
        for (const [key, body] of celestialBodies.entries()) {
            const bodyId = `${this.currentSector}_${key}`;
            const normalizedBodyId = this.normalizeObjectId(bodyId);
            
            // Check if this matches the requested object
            if (normalizedBodyId === normalizedSearchId || bodyId === objectId) {
                const info = this.solarSystemManager.getCelestialBodyInfo(body);
                if (info) {
                    // Create object data compatible with StarCharts format
                    const objectData = {
                        id: bodyId,
                        name: info.name,
                        type: info.type,
                        position: body.position ? [body.position.x, body.position.y, body.position.z] : [0, 0, 0],
                        cartesianPosition: body.position,
                        visualRadius: info.radius || 1,
                        class: this.getObjectClass(info.type),
                        description: this.getObjectDescription(info.name, info.type),
                        faction: info.faction || 'neutral',
                        diplomacy: info.diplomacy || 'neutral'
                    };
                    
                    debug('STAR_CHARTS', `✅ getObjectData: Found dynamic object: ${info.name} (${bodyId})`);
                    return objectData;
                }
            }
        }
        
        // Check virtual waypoints as fallback
        const waypoint = this.virtualWaypoints.get(objectId);
        if (waypoint) {
            debug('STAR_CHARTS', `✅ getObjectData: Found virtual waypoint: ${waypoint.name} (${objectId})`);
            return waypoint;
        }
        
        debug('STAR_CHARTS', `🚫 getObjectData: Object not found in dynamic solar system: ${objectId} (normalized: ${normalizedSearchId})`);
        return null;
    }
    
    /**
     * Get object class based on type
     */
    getObjectClass(type) {
        const classMap = {
            'star': 'yellow dwarf',
            'planet': 'Class-M',
            'moon': 'Class-D',
            'station': 'Space Station',
            'beacon': 'Navigation Beacon'
        };
        return classMap[type] || 'Unknown';
    }
    
    /**
     * Get object description based on name and type
     */
    getObjectDescription(name, type) {
        const descriptions = {
            'star': `${name} is a stable main-sequence star providing energy to the system.`,
            'planet': `${name} is a planetary body with potential for exploration and resource extraction.`,
            'moon': `${name} is a natural satellite offering strategic positioning opportunities.`,
            'station': `${name} is a space station providing services and facilities.`,
            'beacon': `${name} is a navigation beacon assisting with stellar positioning.`
        };
        return descriptions[type] || `${name} is a celestial object of interest.`;
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
                    debug('ACHIEVEMENTS', 'Failed to load achievement system:', error);
                });
            }
        } catch (error) {
            debug('ACHIEVEMENTS', 'Failed to update achievement progress:', error);
        }
    }


    /**
     * Clean up all resources and event listeners
     */
    dispose() {
        debug('UTILITY', '🧹 Disposing StarChartsManager...');

        // Stop discovery loop
        this.stopDiscoveryLoop();

        // Clear pending timeouts
        for (const timeout of this._pendingTimeouts) {
            clearTimeout(timeout);
        }
        this._pendingTimeouts.clear();

        // Remove global debug functions
        if (typeof window !== 'undefined') {
            for (const funcName of this._globalDebugFunctions) {
                if (window[funcName]) {
                    delete window[funcName];
                }
            }
        }

        // Remove style element if we created it
        if (StarChartsManager._styleElement && StarChartsManager._styleElement.parentNode) {
            StarChartsManager._styleElement.parentNode.removeChild(StarChartsManager._styleElement);
            StarChartsManager._styleElement = null;
        }

        // Clear data structures
        this.discoveredObjects.clear();
        this.discoveryMetadata.clear();
        this.spatialGrid.clear();
        this.virtualWaypoints.clear();
        this.loadedSectors.clear();
        this.discoveryCallbacks = [];
        this.targetSelectionCallbacks = [];

        // Null out references
        this.scene = null;
        this.camera = null;
        this.viewManager = null;
        this.solarSystemManager = null;
        this.targetComputerManager = null;
        this.objectDatabase = null;
        this.allObjects = null;

        this.isInitialized = false;

        debug('UTILITY', '🧹 StarChartsManager disposed');
    }

    /**
     * Alias for dispose() for consistency with other components
     */
    destroy() {
        this.dispose();
    }
}

// Static style element reference for cleanup
StarChartsManager._styleElement = null;

// ============================================================================
// DELEGATION METHODS - Forward calls to extracted handlers
// ============================================================================

// Spatial Grid Handler Delegations
StarChartsManager.prototype.initializeSpatialGrid = function() {
    return this.spatialGridHandler.initializeSpatialGrid();
};

StarChartsManager.prototype.refreshSpatialGrid = function() {
    return this.spatialGridHandler.refreshSpatialGrid();
};

StarChartsManager.prototype.getGridKey = function(position) {
    return this.spatialGridHandler.getGridKey(position);
};

StarChartsManager.prototype.getNearbyObjects = function(playerPosition, radius) {
    return this.spatialGridHandler.getNearbyObjects(playerPosition, radius);
};

// Discovery Processor Delegations
StarChartsManager.prototype.checkDiscoveryRadius = function() {
    return this.discoveryProcessor.checkDiscoveryRadius();
};

StarChartsManager.prototype.isDiscovered = function(input) {
    return this.discoveryProcessor.isDiscovered(input);
};

StarChartsManager.prototype.addDiscoveredObject = function(objectId, discoveryMethod = 'proximity', source = 'player') {
    return this.discoveryProcessor.addDiscoveredObject(objectId, discoveryMethod, source);
};

StarChartsManager.prototype.isWithinRange = function(object, playerPosition, discoveryRadius) {
    return this.discoveryProcessor.isWithinRange(object, playerPosition, discoveryRadius);
};

StarChartsManager.prototype.processDiscovery = function(object) {
    return this.discoveryProcessor.processDiscovery(object);
};

StarChartsManager.prototype.getObjectById = function(objectId) {
    return this.getObjectData(objectId);
};

// Add CSS animations for notifications (only once per page load)
if (!StarChartsManager._styleElement) {
    const style = document.createElement('style');
    style.id = 'star-charts-manager-styles';
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
    StarChartsManager._styleElement = style;
}
