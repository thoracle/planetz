/**
 * ShipCollection class - Manages multiple ship ownership and selection
 * Based on docs/tech_design.md and docs/system_architecture.md
 * 
 * Features:
 * - Multiple ship ownership and management
 * - Ship selection interface (station-only)
 * - Ship configuration persistence
 * - Build validation preventing invalid launches
 */

import Ship from './Ship.js';
import CardInventory from './CardInventory.js';
import { CARD_TYPES } from './NFTCard.js';

// Ship class definitions with base stats and slot configurations
export const SHIP_CLASSES = {
    SCOUT: {
        name: 'Scout',
        description: 'Fast and agile reconnaissance vessel',
        baseStats: {
            hull: 50,
            energy: 100,
            mass: 500,
            maxSpeed: 8
        },
        slots: {
            [CARD_TYPES.IMPULSE_ENGINES]: 1,
            [CARD_TYPES.WARP_DRIVE]: 1,
            [CARD_TYPES.DEFLECTOR_SHIELDS]: 1,
            [CARD_TYPES.LONG_RANGE_SCANNER]: 1,
            [CARD_TYPES.LASER_CANNON]: 2,
            [CARD_TYPES.ENERGY_REACTOR]: 1
        },
        cost: 10000
    },
    FRIGATE: {
        name: 'Frigate',
        description: 'Balanced combat and exploration vessel',
        baseStats: {
            hull: 100,
            energy: 150,
            mass: 1000,
            maxSpeed: 6
        },
        slots: {
            [CARD_TYPES.IMPULSE_ENGINES]: 1,
            [CARD_TYPES.WARP_DRIVE]: 1,
            [CARD_TYPES.DEFLECTOR_SHIELDS]: 1,
            [CARD_TYPES.SHIELD_GENERATOR]: 1,
            [CARD_TYPES.LONG_RANGE_SCANNER]: 1,
            [CARD_TYPES.TARGET_COMPUTER]: 1,
            [CARD_TYPES.PHASER_ARRAY]: 2,
            [CARD_TYPES.TORPEDO_LAUNCHER]: 1,
            [CARD_TYPES.ENERGY_REACTOR]: 2
        },
        cost: 25000
    },
    DESTROYER: {
        name: 'Destroyer',
        description: 'Heavy combat vessel with powerful weapons',
        baseStats: {
            hull: 200,
            energy: 200,
            mass: 2000,
            maxSpeed: 4
        },
        slots: {
            [CARD_TYPES.IMPULSE_ENGINES]: 2,
            [CARD_TYPES.WARP_DRIVE]: 1,
            [CARD_TYPES.DEFLECTOR_SHIELDS]: 2,
            [CARD_TYPES.SHIELD_GENERATOR]: 2,
            [CARD_TYPES.LONG_RANGE_SCANNER]: 1,
            [CARD_TYPES.TARGET_COMPUTER]: 1,
            [CARD_TYPES.PHASER_ARRAY]: 3,
            [CARD_TYPES.TORPEDO_LAUNCHER]: 2,
            [CARD_TYPES.MISSILE_TUBES]: 1,
            [CARD_TYPES.ENERGY_REACTOR]: 3
        },
        cost: 50000
    }
};

export default class ShipCollection {
    constructor() {
        // Collection of owned ships
        this.ships = new Map();
        
        // Currently selected ship ID
        this.activeShipId = null;
        
        // Ship counter for unique IDs
        this.shipIdCounter = 1;
        
        // Player credits for purchasing ships
        this.credits = 100000; // Starting credits
        
        // Initialize with a basic scout ship
        this.addShip(SHIP_CLASSES.SCOUT, 'USS Pioneer');
    }

    /**
     * Add a new ship to the collection
     * @param {Object} shipClass - Ship class definition
     * @param {string} name - Custom ship name
     * @returns {Object} - Result with ship ID and success status
     */
    addShip(shipClass, name = null) {
        const shipId = `ship_${this.shipIdCounter++}`;
        const shipName = name || `${shipClass.name} ${this.shipIdCounter - 1}`;
        
        const shipData = {
            id: shipId,
            name: shipName,
            class: shipClass.name,
            classData: shipClass,
            baseStats: { ...shipClass.baseStats },
            installedCards: new Map(),
            cardInventory: new CardInventory(),
            isValidBuild: false,
            lastValidated: null,
            created: Date.now()
        };

        this.ships.set(shipId, shipData);
        
        // Set as active ship if it's the first one
        if (this.ships.size === 1) {
            this.activeShipId = shipId;
        }

        return {
            success: true,
            shipId: shipId,
            shipName: shipName
        };
    }

    /**
     * Purchase a new ship
     * @param {string} shipClassName - Name of ship class to purchase
     * @param {string} customName - Custom name for the ship
     * @returns {Object} - Purchase result
     */
    purchaseShip(shipClassName, customName = null) {
        const shipClass = SHIP_CLASSES[shipClassName];
        if (!shipClass) {
            return {
                success: false,
                error: `Unknown ship class: ${shipClassName}`
            };
        }

        if (this.credits < shipClass.cost) {
            return {
                success: false,
                error: `Insufficient credits. Need ${shipClass.cost}, have ${this.credits}`
            };
        }

        // Deduct credits
        this.credits -= shipClass.cost;
        
        // Add ship to collection
        const result = this.addShip(shipClass, customName);
        
        return {
            ...result,
            creditsSpent: shipClass.cost,
            remainingCredits: this.credits
        };
    }

    /**
     * Select active ship (station-only operation)
     * @param {string} shipId - ID of ship to select
     * @param {boolean} isAtStation - Whether player is currently at a station
     * @returns {Object} - Selection result
     */
    selectShip(shipId, isAtStation = true) {
        if (!isAtStation) {
            return {
                success: false,
                error: 'Ship selection is only available at stations'
            };
        }

        if (!this.ships.has(shipId)) {
            return {
                success: false,
                error: `Ship not found: ${shipId}`
            };
        }

        const ship = this.ships.get(shipId);
        
        // Validate ship build before allowing selection
        const validation = this.validateShipBuild(shipId);
        if (!validation.isValid) {
            return {
                success: false,
                error: `Cannot select ship with invalid build: ${validation.errors.join(', ')}`
            };
        }

        this.activeShipId = shipId;
        
        return {
            success: true,
            activeShip: ship,
            shipName: ship.name
        };
    }

    /**
     * Get currently active ship
     * @returns {Object|null} - Active ship data or null
     */
    getActiveShip() {
        if (!this.activeShipId) return null;
        return this.ships.get(this.activeShipId);
    }

    /**
     * Get all ships in collection
     * @returns {Array} - Array of ship data
     */
    getAllShips() {
        return Array.from(this.ships.values());
    }

    /**
     * Install card in ship slot
     * @param {string} shipId - Ship ID
     * @param {string} slotType - Type of slot to install in
     * @param {NFTCard} card - Card to install
     * @returns {Object} - Installation result
     */
    installCard(shipId, slotType, card) {
        const ship = this.ships.get(shipId);
        if (!ship) {
            return { success: false, error: 'Ship not found' };
        }

        // Check if ship class supports this slot type
        const maxSlots = ship.classData.slots[slotType] || 0;
        if (maxSlots === 0) {
            return {
                success: false,
                error: `${ship.class} does not support ${slotType} slots`
            };
        }

        // Count currently installed cards of this type
        const installedCount = Array.from(ship.installedCards.values())
            .filter(installedCard => installedCard.cardType === slotType).length;

        if (installedCount >= maxSlots) {
            return {
                success: false,
                error: `Maximum ${maxSlots} ${slotType} slots already filled`
            };
        }

        // Install the card
        const slotId = `${slotType}_${installedCount + 1}`;
        ship.installedCards.set(slotId, card);
        
        // Remove card from ship's inventory
        ship.cardInventory.removeCard(card);
        
        // Invalidate build validation
        ship.isValidBuild = false;
        ship.lastValidated = null;

        return {
            success: true,
            slotId: slotId,
            installedCard: card
        };
    }

    /**
     * Remove card from ship slot
     * @param {string} shipId - Ship ID
     * @param {string} slotId - Slot ID to remove card from
     * @returns {Object} - Removal result
     */
    removeCard(shipId, slotId) {
        const ship = this.ships.get(shipId);
        if (!ship) {
            return { success: false, error: 'Ship not found' };
        }

        const card = ship.installedCards.get(slotId);
        if (!card) {
            return { success: false, error: 'No card in specified slot' };
        }

        // Remove card from slot
        ship.installedCards.delete(slotId);
        
        // Return card to ship's inventory
        ship.cardInventory.addCard(card);
        
        // Invalidate build validation
        ship.isValidBuild = false;
        ship.lastValidated = null;

        return {
            success: true,
            removedCard: card
        };
    }

    /**
     * Validate ship build for launch readiness
     * @param {string} shipId - Ship ID to validate
     * @returns {Object} - Validation result
     */
    validateShipBuild(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) {
            return {
                isValid: false,
                errors: ['Ship not found']
            };
        }

        const errors = [];
        const warnings = [];

        // Check for required systems
        const requiredSystems = [
            CARD_TYPES.IMPULSE_ENGINES,
            CARD_TYPES.WARP_DRIVE,
            CARD_TYPES.ENERGY_REACTOR
        ];

        requiredSystems.forEach(systemType => {
            const hasSystem = Array.from(ship.installedCards.values())
                .some(card => card.cardType === systemType);
            
            if (!hasSystem) {
                errors.push(`Missing required system: ${systemType}`);
            }
        });

        // Check energy balance
        let totalEnergyProduction = 0;
        let totalEnergyConsumption = 0;

        ship.installedCards.forEach(card => {
            if (card.stats.energyProduction) {
                totalEnergyProduction += card.stats.energyProduction;
            }
            if (card.stats.energyConsumption) {
                totalEnergyConsumption += card.stats.energyConsumption;
            }
        });

        if (totalEnergyConsumption > totalEnergyProduction) {
            errors.push(`Insufficient energy: ${totalEnergyConsumption} required, ${totalEnergyProduction} available`);
        }

        // Check mass limits (if applicable)
        let totalMass = ship.baseStats.mass;
        ship.installedCards.forEach(card => {
            totalMass += card.stats.mass || 0;
        });

        // Update ship validation status
        ship.isValidBuild = errors.length === 0;
        ship.lastValidated = Date.now();

        return {
            isValid: ship.isValidBuild,
            errors: errors,
            warnings: warnings,
            stats: {
                energyProduction: totalEnergyProduction,
                energyConsumption: totalEnergyConsumption,
                totalMass: totalMass
            }
        };
    }

    /**
     * Get ship configuration for persistence
     * @param {string} shipId - Ship ID
     * @returns {Object} - Ship configuration data
     */
    getShipConfiguration(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return null;

        return {
            id: ship.id,
            name: ship.name,
            class: ship.class,
            installedCards: Array.from(ship.installedCards.entries()),
            cardInventory: ship.cardInventory.toJSON(),
            isValidBuild: ship.isValidBuild,
            lastValidated: ship.lastValidated
        };
    }

    /**
     * Load ship configuration from persistence
     * @param {Object} config - Ship configuration data
     * @returns {Object} - Load result
     */
    loadShipConfiguration(config) {
        if (!config.id || !this.ships.has(config.id)) {
            return { success: false, error: 'Invalid ship configuration' };
        }

        const ship = this.ships.get(config.id);
        
        // Restore installed cards
        ship.installedCards.clear();
        config.installedCards.forEach(([slotId, card]) => {
            ship.installedCards.set(slotId, card);
        });
        
        // Restore card inventory
        ship.cardInventory.fromJSON(config.cardInventory);
        
        // Restore validation status
        ship.isValidBuild = config.isValidBuild || false;
        ship.lastValidated = config.lastValidated || null;

        return { success: true };
    }

    /**
     * Export collection data for persistence
     * @returns {Object} - Serializable collection data
     */
    toJSON() {
        return {
            ships: Array.from(this.ships.entries()),
            activeShipId: this.activeShipId,
            shipIdCounter: this.shipIdCounter,
            credits: this.credits
        };
    }

    /**
     * Import collection data from persistence
     * @param {Object} data - Serialized collection data
     */
    fromJSON(data) {
        if (data.ships) {
            this.ships = new Map(data.ships);
        }
        
        if (data.activeShipId) {
            this.activeShipId = data.activeShipId;
        }
        
        if (data.shipIdCounter !== undefined) {
            this.shipIdCounter = data.shipIdCounter;
        }
        
        if (data.credits !== undefined) {
            this.credits = data.credits;
        }
    }

    /**
     * Reset collection (for testing or new game)
     */
    reset() {
        this.ships.clear();
        this.activeShipId = null;
        this.shipIdCounter = 1;
        this.credits = 100000;
        
        // Add default scout ship
        this.addShip(SHIP_CLASSES.SCOUT, 'USS Pioneer');
    }
} 