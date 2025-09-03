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
        
        // Configuration
        this.config = {
            enabled: true,
            fallbackToLRS: true,
            sectors: ['A0'], // Phase 0: A0 only
            maxDiscoveriesPerFrame: 5,
            performanceMonitoring: true
        };
        
        // Initialize system
        this.initialize();
    }
    
    async initialize() {
        console.log('🚀 StarChartsManager: Initializing...');
        
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
            
            console.log('✅ StarChartsManager: Initialization complete');
            console.log(`   - Database load time: ${loadTime.toFixed(2)}ms`);
            console.log(`   - Current sector: ${this.currentSector}`);
            console.log(`   - Discovered objects: ${this.discoveredObjects.size}`);
            
        } catch (error) {
            console.error('❌ StarChartsManager: Initialization failed:', error);
            if (this.config.fallbackToLRS) {
                console.log('🔄 Falling back to Long Range Scanner');
                this.config.enabled = false;
            }
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
            console.log(`📊 Loaded database: ${this.objectDatabase.metadata.total_sectors} sectors`);
            console.log(`   - Universe seed: ${this.objectDatabase.metadata.universe_seed}`);
            console.log(`   - Generated: ${this.objectDatabase.metadata.generation_timestamp}`);
            
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
        
        allObjects.forEach(obj => {
            if (obj && obj.position) {
                const gridKey = this.getGridKey(obj.position);
                if (!this.spatialGrid.has(gridKey)) {
                    this.spatialGrid.set(gridKey, []);
                }
                this.spatialGrid.get(gridKey).push(obj);
            }
        });
        
        console.log(`🗺️  Spatial grid initialized: ${this.spatialGrid.size} cells, ${allObjects.length} objects`);
    }
    
    getGridKey(position) {
        //Get spatial grid key for position
        const x = Math.floor(position[0] / this.gridSize);
        const y = Math.floor(position[1] / this.gridSize);
        const z = Math.floor(position[2] / this.gridSize);
        return `${x},${y},${z}`;
    }
    
    getNearbyObjects(playerPosition, radius) {
        //Get objects within radius using spatial partitioning
        
        const nearbyObjects = [];
        const gridRadius = Math.ceil(radius / this.gridSize);
        const playerGridKey = this.getGridKey(playerPosition);
        const [px, py, pz] = playerGridKey.split(',').map(Number);
        
        // Check surrounding grid cells
        for (let x = px - gridRadius; x <= px + gridRadius; x++) {
            for (let y = py - gridRadius; y <= py + gridRadius; y++) {
                for (let z = pz - gridRadius; z <= pz + gridRadius; z++) {
                    const gridKey = `${x},${y},${z}`;
                    const cellObjects = this.spatialGrid.get(gridKey);
                    if (cellObjects) {
                        nearbyObjects.push(...cellObjects);
                    }
                }
            }
        }
        
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
        
        const discoveries = objects
            .filter(obj => !this.isDiscovered(obj.id))
            .filter(obj => this.isWithinRange(obj, playerPosition, discoveryRadius))
            .slice(0, this.config.maxDiscoveriesPerFrame);
        
        discoveries.forEach(obj => this.processDiscovery(obj));
    }
    
    isWithinRange(object, playerPosition, discoveryRadius) {
        //Check if object is within discovery range
        
        if (!object.position || object.position.length < 3) {
            return false;
        }
        
        const distance = Math.sqrt(
            Math.pow(object.position[0] - playerPosition[0], 2) +
            Math.pow(object.position[1] - playerPosition[1], 2) +
            Math.pow(object.position[2] - playerPosition[2], 2)
        );
        
        return distance <= discoveryRadius;
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
        
        console.log(`🔍 Discovered: ${object.name} (${object.type})`);
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
        
        const category = this.getDiscoveryCategory(objectType);
        const lastTime = this.lastDiscoveryTime.get(category) || 0;
        const cooldown = this.discoveryTypes[category].cooldown;
        
        return Date.now() - lastTime > cooldown;
    }
    
    showDiscoveryNotification(object, category) {
        //Show discovery notification with appropriate prominence
        
        const config = this.discoveryTypes[category];
        
        // Play audio if specified
        if (config.audio && window.audioManager) {
            window.audioManager.playSound(config.audio);
        }
        
        // Show notification
        const message = `${object.name} discovered!`;
        
        if (config.notification === 'prominent') {
            this.showProminentNotification(message);
        } else if (config.notification === 'subtle') {
            this.showSubtleNotification(message);
        } else {
            console.log(`📝 ${message}`);
        }
    }
    
    showProminentNotification(message) {
        //Show prominent discovery notification
        
        // Create notification element
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
    
    showSubtleNotification(message) {
        //Show subtle discovery notification
        
        // Create notification element
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
    
    getPlayerPosition() {
        //Get current player position
        
        if (this.solarSystemManager && this.solarSystemManager.ship) {
            const position = this.solarSystemManager.ship.position;
            return [position.x, position.y, position.z];
        }
        
        return null;
    }
    
    getDiscoveryRadius() {
        //Get discovery radius based on equipped Target CPU
        
        // Try to get range from target computer
        if (this.targetComputerManager && this.targetComputerManager.targetComputer) {
            const range = this.targetComputerManager.targetComputer.range;
            if (range) {
                return range;
            }
        }
        
        // Check for ship systems
        if (this.solarSystemManager && this.solarSystemManager.ship && this.solarSystemManager.ship.systems) {
            const targetComputer = this.solarSystemManager.ship.systems.get('target_computer');
            if (targetComputer && targetComputer.range) {
                return targetComputer.range;
            }
        }
        
        // Fallback to Level 1 Target CPU range
        return 50.0;
    }
    
    isDiscovered(objectId) {
        //Check if object has been discovered
        return this.discoveredObjects.has(objectId);
    }
    
    addDiscoveredObject(objectId) {
        //Add object to discovered list and save state
        
        if (!this.discoveredObjects.has(objectId)) {
            this.discoveredObjects.add(objectId);
            this.saveDiscoveryState();
        }
    }
    
    // Discovery state persistence
    async loadDiscoveryState() {
        //Load discovery state from localStorage
        
        try {
            const key = `star_charts_discovery_${this.currentSector}`;
            const savedState = localStorage.getItem(key);
            
            if (savedState) {
                const state = JSON.parse(savedState);
                this.discoveredObjects = new Set(state.discovered || []);
                console.log(`📂 Loaded discovery state: ${this.discoveredObjects.size} objects discovered`);
            } else {
                // Initialize with star always discovered
                this.discoveredObjects.add(`${this.currentSector}_star`);
                console.log('🌟 Initialized discovery state with central star');
            }
            
        } catch (error) {
            console.error('❌ Failed to load discovery state:', error);
            // Initialize with star always discovered
            this.discoveredObjects.add(`${this.currentSector}_star`);
        }
    }
    
    saveDiscoveryState() {
        //Save discovery state to localStorage
        
        try {
            const key = `star_charts_discovery_${this.currentSector}`;
            const state = {
                sector: this.currentSector,
                discovered: Array.from(this.discoveredObjects),
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(key, JSON.stringify(state));
            
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
        
        console.log(`🎯 Created waypoint: ${waypoint.name} at [${waypoint.position.join(', ')}]`);
        
        return waypointId;
    }
    
    removeWaypoint(waypointId) {
        //Remove virtual waypoint
        
        if (this.virtualWaypoints.has(waypointId)) {
            const waypoint = this.virtualWaypoints.get(waypointId);
            this.virtualWaypoints.delete(waypointId);
            console.log(`🗑️  Removed waypoint: ${waypoint.name}`);
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
        
        console.log(`🎯 Waypoint triggered: ${waypoint.name}`);
        
        waypoint.actions.forEach(action => {
            switch (action.type) {
                case 'spawn_ships':
                    // TODO: Integrate with ship spawning system
                    console.log(`🚀 Spawn ships: ${action.params}`);
                    break;
                    
                case 'play_comm':
                    if (window.audioManager) {
                        window.audioManager.playSound(action.params.audioFile);
                    }
                    break;
                    
                case 'next_waypoint':
                    // TODO: Integrate with mission system
                    console.log('➡️  Advance to next waypoint');
                    break;
                    
                case 'mission_update':
                    // TODO: Integrate with mission system
                    console.log(`📋 Mission update: ${action.params}`);
                    break;
                    
                default:
                    console.log(`❓ Unknown waypoint action: ${action.type}`);
            }
        });
    }
    
    // Target Computer integration
    selectObjectById(objectId) {
        //Select object for targeting by ID
        
        if (this.targetComputerManager && this.targetComputerManager.setTargetById) {
            return this.targetComputerManager.setTargetById(objectId);
        }
        
        console.warn('⚠️  Target Computer integration not available');
        return false;
    }
    
    setVirtualTarget(waypointId) {
        //Set virtual waypoint as target
        
        const waypoint = this.virtualWaypoints.get(waypointId);
        if (!waypoint) {
            console.error(`❌ Waypoint not found: ${waypointId}`);
            return false;
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
        
        console.log('📊 Star Charts Performance Report:');
        console.log(`   - Average discovery check: ${metrics.averageDiscoveryCheckTime.toFixed(2)}ms`);
        console.log(`   - Max discovery check: ${metrics.maxDiscoveryCheckTime.toFixed(2)}ms`);
        console.log(`   - Total discoveries: ${metrics.totalDiscoveries}`);
        console.log(`   - Discovered objects: ${metrics.discoveredObjectsCount}`);
        console.log(`   - Spatial grid cells: ${metrics.spatialGridCells}`);
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
