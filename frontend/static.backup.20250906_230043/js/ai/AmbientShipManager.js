/**
 * AmbientShipManager.js
 * 
 * Manages non-player ships that populate the galaxy with dynamic activities:
 * - Trade convoys running between stations
 * - Patrol ships securing trade routes
 * - Pirates attempting extortion and raiding
 * - Exploration vessels on scientific missions
 * - Diplomatic escorts and VIP transports
 * 
 * Creates a living, breathing galaxy where ships have their own goals and missions.
 */

import * as THREE from 'three';
import EnemyShip from '../ship/EnemyShip.js';
import { EnemyAI } from './EnemyAI.js';
import { getAIConfig } from './AIConfigs.js';

export class AmbientShipManager {
    constructor(scene, camera, starfieldManager) {
        this.scene = scene;
        this.camera = camera;
        this.starfieldManager = starfieldManager;
        
        // Ship tracking
        this.ambientShips = new Map();           // Map of ship ID -> ship data
        this.activeShips = new Set();            // Currently active ships
        this.shipBehaviors = new Map();          // Ship ID -> behavior instance
        
        // Spawn management
        this.maxAmbientShips = 20;               // Maximum concurrent ambient ships
        this.spawnRadius = 15.0;                 // Spawn distance from player (km)
        this.despawnRadius = 25.0;               // Remove ships beyond this distance
        this.lastSpawnTime = 0;
        this.spawnInterval = 15000;              // Spawn new ship every 15 seconds
        
        // Behavior configurations
        this.behaviorTypes = {
            'trade_convoy': {
                weight: 0.3,
                minShips: 1,
                maxShips: 3,
                factions: ['Free Trader Consortium', 'Nexus Corporate Syndicate'],
                shipTypes: ['freighter', 'transport'],
                escortTypes: ['fighter', 'corvette']
            },
            'patrol': {
                weight: 0.25,
                minShips: 1,
                maxShips: 2,
                factions: ['Terran Republic Alliance', 'Zephyrian Collective'],
                shipTypes: ['frigate', 'corvette', 'scout'],
                escortTypes: []
            },
            'pirate_raider': {
                weight: 0.15,
                minShips: 1,
                maxShips: 4,
                factions: ['Crimson Raider Clans', 'Shadow Consortium'],
                shipTypes: ['fighter', 'corvette', 'raider'],
                escortTypes: []
            },
            'exploration': {
                weight: 0.15,
                minShips: 1,
                maxShips: 2,
                factions: ['Scientists Consortium', 'Terran Republic Alliance'],
                shipTypes: ['science_vessel', 'explorer'],
                escortTypes: ['scout']
            },
            'diplomatic_escort': {
                weight: 0.1,
                minShips: 2,
                maxShips: 4,
                factions: ['Terran Republic Alliance', 'Ethereal Wanderers'],
                shipTypes: ['diplomatic_vessel'],
                escortTypes: ['frigate', 'destroyer']
            },
            'mining_operation': {
                weight: 0.05,
                minShips: 2,
                maxShips: 5,
                factions: ['Free Trader Consortium', 'Nexus Corporate Syndicate'],
                shipTypes: ['mining_vessel'],
                escortTypes: ['corvette', 'fighter']
            }
        };
        
        // Faction relationships (affects behavior toward player)
        this.factionRelations = {
            'Terran Republic Alliance': 'friendly',
            'Zephyrian Collective': 'friendly',
            'Scientists Consortium': 'friendly',
            'Free Trader Consortium': 'neutral',
            'Nexus Corporate Syndicate': 'neutral',
            'Ethereal Wanderers': 'neutral',
            'Draconis Imperium': 'neutral',
            'Crimson Raider Clans': 'hostile',
            'Shadow Consortium': 'hostile',
            'Void Cult': 'hostile'
        };
        
        // Trade routes (station to station)
        this.tradeRoutes = [];
        this.currentSector = null;
        
        // Communication system
        this.communicationQueue = [];
        this.lastCommunication = 0;
        this.communicationInterval = 8000;      // 8 seconds between messages
        
        console.log('🌌 AmbientShipManager initialized');
    }
    
    /**
     * Initialize ambient ship system
     */
    initialize() {
        this.setupTradeRoutes();
        this.isInitialized = true;
        console.log('🌌 AmbientShipManager ready - galaxy coming to life!');
    }
    
    /**
     * Setup trade routes between stations in current sector
     */
    setupTradeRoutes() {
        if (!this.starfieldManager.solarSystemManager?.celestialBodies) return;
        
        const stations = [];
        this.starfieldManager.solarSystemManager.celestialBodies.forEach((body, name) => {
            if (body.userData?.type === 'station' && body.userData?.canDock) {
                stations.push({
                    name: name,
                    position: body.position.clone(),
                    faction: body.userData.faction,
                    type: body.userData.stationType
                });
            }
        });
        
        // Create routes between stations
        this.tradeRoutes = [];
        for (let i = 0; i < stations.length; i++) {
            for (let j = i + 1; j < stations.length; j++) {
                const route = {
                    from: stations[i],
                    to: stations[j],
                    distance: stations[i].position.distanceTo(stations[j].position),
                    traffic: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
                    risk: this.calculateRouteRisk(stations[i], stations[j])
                };
                this.tradeRoutes.push(route);
            }
        }
        
        console.log(`🚢 Generated ${this.tradeRoutes.length} trade routes between ${stations.length} stations`);
    }
    
    /**
     * Calculate risk factor for a trade route based on faction relations
     */
    calculateRouteRisk(stationA, stationB) {
        const factionA = stationA.faction;
        const factionB = stationB.faction;
        
        // Routes between hostile factions are risky
        if (this.factionRelations[factionA] === 'hostile' || this.factionRelations[factionB] === 'hostile') {
            return Math.random() * 0.6 + 0.4; // 0.4 to 1.0
        }
        
        // Routes between friendly factions are safer
        if (this.factionRelations[factionA] === 'friendly' && this.factionRelations[factionB] === 'friendly') {
            return Math.random() * 0.3; // 0.0 to 0.3
        }
        
        // Mixed routes have moderate risk
        return Math.random() * 0.5 + 0.2; // 0.2 to 0.7
    }
    
    /**
     * Main update loop
     */
    update(deltaTime, gameWorld) {
        if (!this.isInitialized) return;
        
        const now = Date.now();
        
        // Update existing ships
        this.updateExistingShips(deltaTime, gameWorld);
        
        // Spawn new ships if needed
        if (now - this.lastSpawnTime > this.spawnInterval && this.activeShips.size < this.maxAmbientShips) {
            this.spawnAmbientShip();
            this.lastSpawnTime = now;
        }
        
        // Clean up distant ships
        this.cleanupDistantShips();
        
        // Process communications
        this.processCommunications(now);
    }
    
    /**
     * Update all existing ambient ships
     */
    updateExistingShips(deltaTime, gameWorld) {
        for (const [shipId, shipData] of this.ambientShips) {
            if (shipData.ship && shipData.behavior) {
                // Update ship behavior
                shipData.behavior.update(deltaTime, gameWorld);
                
                // Update ship AI if it has one
                if (shipData.ai) {
                    shipData.ai.update(deltaTime, gameWorld);
                }
            }
        }
    }
    
    /**
     * Spawn a new ambient ship with random behavior
     */
    spawnAmbientShip() {
        const behaviorType = this.selectRandomBehavior();
        const behaviorConfig = this.behaviorTypes[behaviorType];
        
        // Select faction
        const faction = behaviorConfig.factions[Math.floor(Math.random() * behaviorConfig.factions.length)];
        
        // Determine number of ships in group
        const groupSize = Math.floor(Math.random() * (behaviorConfig.maxShips - behaviorConfig.minShips + 1)) + behaviorConfig.minShips;
        
        // Create ship group
        const shipGroup = [];
        for (let i = 0; i < groupSize; i++) {
            const shipType = this.selectShipType(behaviorConfig, i === 0);
            const ship = this.createAmbientShip(shipType, faction, behaviorType, i === 0);
            
            if (ship) {
                shipGroup.push(ship);
                this.activeShips.add(ship.id);
            }
        }
        
        // Create group behavior
        if (shipGroup.length > 0) {
            this.createGroupBehavior(shipGroup, behaviorType, behaviorConfig);
            console.log(`🌌 Spawned ${shipGroup.length} ${faction} ships on ${behaviorType} mission`);
        }
    }
    
    /**
     * Select random behavior type based on weights
     */
    selectRandomBehavior() {
        const totalWeight = Object.values(this.behaviorTypes).reduce((sum, config) => sum + config.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [behaviorType, config] of Object.entries(this.behaviorTypes)) {
            random -= config.weight;
            if (random <= 0) {
                return behaviorType;
            }
        }
        
        return 'trade_convoy'; // fallback
    }
    
    /**
     * Select ship type for behavior
     */
    selectShipType(behaviorConfig, isLeader) {
        if (isLeader) {
            // Leader uses primary ship types
            return behaviorConfig.shipTypes[Math.floor(Math.random() * behaviorConfig.shipTypes.length)];
        } else if (behaviorConfig.escortTypes.length > 0) {
            // Escorts use escort types
            return behaviorConfig.escortTypes[Math.floor(Math.random() * behaviorConfig.escortTypes.length)];
        } else {
            // Use primary types for all ships
            return behaviorConfig.shipTypes[Math.floor(Math.random() * behaviorConfig.shipTypes.length)];
        }
    }
    
    /**
     * Create an ambient ship
     */
    createAmbientShip(shipType, faction, behaviorType, isLeader) {
        // Generate spawn position near player but not too close
        const playerPosition = this.camera.position;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDistance = this.spawnRadius + Math.random() * 5; // 15-20km from player
        
        const spawnPosition = new THREE.Vector3(
            playerPosition.x + Math.cos(spawnAngle) * spawnDistance,
            playerPosition.y + (Math.random() - 0.5) * 4, // ±2km vertical spread
            playerPosition.z + Math.sin(spawnAngle) * spawnDistance
        );
        
        // Create ship
        const shipId = `ambient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ship = new EnemyShip({
            shipType: shipType,
            position: spawnPosition,
            faction: faction,
            isAmbient: true,
            behaviorType: behaviorType,
            isLeader: isLeader
        });
        
        if (!ship.mesh) {
            console.warn(`Failed to create ambient ship: ${shipType}`);
            return null;
        }
        
        // Add to scene
        this.scene.add(ship.mesh);
        
        // Create AI with appropriate configuration
        const aiConfig = getAIConfig(shipType);
        const ai = new EnemyAI(ship, aiConfig);
        
        // Store ship data
        const shipData = {
            id: shipId,
            ship: ship,
            ai: ai,
            faction: faction,
            behaviorType: behaviorType,
            isLeader: isLeader,
            spawnTime: Date.now(),
            lastActivity: Date.now(),
            behavior: null // Will be set by group behavior
        };
        
        this.ambientShips.set(shipId, shipData);
        ship.id = shipId; // Store ID on ship for reference
        
        return shipData;
    }
    
    /**
     * Create group behavior for ship group
     */
    createGroupBehavior(shipGroup, behaviorType, behaviorConfig) {
        switch (behaviorType) {
            case 'trade_convoy':
                this.createTradeConvoyBehavior(shipGroup);
                break;
            case 'patrol':
                this.createPatrolBehavior(shipGroup);
                break;
            case 'pirate_raider':
                this.createPirateRaiderBehavior(shipGroup);
                break;
            case 'exploration':
                this.createExplorationBehavior(shipGroup);
                break;
            case 'diplomatic_escort':
                this.createDiplomaticEscortBehavior(shipGroup);
                break;
            case 'mining_operation':
                this.createMiningOperationBehavior(shipGroup);
                break;
        }
    }
    
    /**
     * Create trade convoy behavior
     */
    createTradeConvoyBehavior(shipGroup) {
        if (this.tradeRoutes.length === 0) return;
        
        const route = this.tradeRoutes[Math.floor(Math.random() * this.tradeRoutes.length)];
        const behavior = new TradeConvoyBehavior(shipGroup, route, this);
        
        shipGroup.forEach(shipData => {
            shipData.behavior = behavior;
        });
        
        // Add to communication queue
        this.queueCommunication(shipGroup[0], `Trade convoy ${shipGroup[0].faction} to ${route.to.name}. Requesting safe passage.`);
    }
    
    /**
     * Create patrol behavior
     */
    createPatrolBehavior(shipGroup) {
        const behavior = new PatrolBehavior(shipGroup, this);
        
        shipGroup.forEach(shipData => {
            shipData.behavior = behavior;
        });
        
        this.queueCommunication(shipGroup[0], `${shipGroup[0].faction} patrol active. Sector security sweep in progress.`);
    }
    
    /**
     * Create pirate raider behavior
     */
    createPirateRaiderBehavior(shipGroup) {
        const behavior = new PirateRaiderBehavior(shipGroup, this);
        
        shipGroup.forEach(shipData => {
            shipData.behavior = behavior;
        });
        
        // Pirates might not announce themselves immediately
        if (Math.random() < 0.3) {
            this.queueCommunication(shipGroup[0], `You're in our territory now. Pay the toll or face the consequences.`);
        }
    }
    
    /**
     * Create exploration behavior
     */
    createExplorationBehavior(shipGroup) {
        const behavior = new ExplorationBehavior(shipGroup, this);
        
        shipGroup.forEach(shipData => {
            shipData.behavior = behavior;
        });
        
        this.queueCommunication(shipGroup[0], `${shipGroup[0].faction} research vessel conducting deep space survey.`);
    }
    
    /**
     * Create diplomatic escort behavior
     */
    createDiplomaticEscortBehavior(shipGroup) {
        const behavior = new DiplomaticEscortBehavior(shipGroup, this);
        
        shipGroup.forEach(shipData => {
            shipData.behavior = behavior;
        });
        
        this.queueCommunication(shipGroup[0], `Diplomatic mission in progress. Maintaining neutral status.`);
    }
    
    /**
     * Create mining operation behavior
     */
    createMiningOperationBehavior(shipGroup) {
        const behavior = new MiningOperationBehavior(shipGroup, this);
        
        shipGroup.forEach(shipData => {
            shipData.behavior = behavior;
        });
        
        this.queueCommunication(shipGroup[0], `Mining operation commencing. Asteroid survey in progress.`);
    }
    
    /**
     * Queue a communication message
     */
    queueCommunication(shipData, message) {
        this.communicationQueue.push({
            ship: shipData,
            message: message,
            timestamp: Date.now(),
            priority: shipData.behaviorType === 'pirate_raider' ? 'high' : 'normal'
        });
    }
    
    /**
     * Process queued communications
     */
    processCommunications(now) {
        if (this.communicationQueue.length === 0) return;
        if (now - this.lastCommunication < this.communicationInterval) return;
        
        // Sort by priority and timestamp
        this.communicationQueue.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return a.timestamp - b.timestamp;
        });
        
        const communication = this.communicationQueue.shift();
        this.broadcastMessage(communication.ship, communication.message);
        this.lastCommunication = now;
    }
    
    /**
     * Broadcast message to subspace radio
     */
    broadcastMessage(shipData, message) {
        if (this.starfieldManager.subspaceRadio) {
            const shipName = `${shipData.faction} ${shipData.ship.shipType}`;
            this.starfieldManager.subspaceRadio.addMessage(`[${shipName}] ${message}`, 'mission');
        }
    }
    
    /**
     * Clean up ships that are too far from player
     */
    cleanupDistantShips() {
        const playerPosition = this.camera.position;
        const shipsToRemove = [];
        
        for (const [shipId, shipData] of this.ambientShips) {
            const distance = shipData.ship.mesh.position.distanceTo(playerPosition);
            
            if (distance > this.despawnRadius) {
                shipsToRemove.push(shipId);
            }
        }
        
        shipsToRemove.forEach(shipId => {
            this.removeAmbientShip(shipId);
        });
    }
    
    /**
     * Remove an ambient ship
     */
    removeAmbientShip(shipId) {
        const shipData = this.ambientShips.get(shipId);
        if (!shipData) return;
        
        // Remove from scene
        if (shipData.ship.mesh) {
            this.scene.remove(shipData.ship.mesh);
        }
        
        // Clean up
        this.ambientShips.delete(shipId);
        this.activeShips.delete(shipId);
        
        console.log(`🌌 Removed distant ambient ship: ${shipData.faction} ${shipData.ship.shipType}`);
    }
    
    /**
     * Get all ambient ships (for targeting system integration)
     */
    getAllAmbientShips() {
        return Array.from(this.ambientShips.values()).map(shipData => shipData.ship);
    }
    
    /**
     * Handle player interaction with ambient ship
     */
    handlePlayerInteraction(shipId, interactionType) {
        const shipData = this.ambientShips.get(shipId);
        if (!shipData || !shipData.behavior) return;
        
        if (shipData.behavior.handlePlayerInteraction) {
            shipData.behavior.handlePlayerInteraction(interactionType);
        }
    }
}

// Behavior classes will be implemented in separate files
// This is the foundation that allows each behavior to be modular and extensible

export default AmbientShipManager;
