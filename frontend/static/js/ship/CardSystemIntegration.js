/**
 * CardSystemIntegration - Bridges card-based ship configuration with ship systems
 * Allows ship systems to check if required cards are installed and functional
 */

import { CARD_TYPES } from './NFTCard.js';

export default class CardSystemIntegration {
    constructor(ship) {
        this.ship = ship;
        this.installedCards = new Map(); // Map of slotId -> {cardType, level}
        this.playerDataCache = null;
        this.cardInventoryUI = null;
        
        // Initialize card data
        this.initializeCardData();
    }

    /**
     * Initialize card data for this ship
     */
    async initializeCardData() {
        try {
            await this.loadCards();
        } catch (error) {
            console.error('Error initializing card data:', error);
        }
    }

    /**
     * Load cards from the card inventory UI
     */
    async loadCards() {
        console.log(`🔧 LOADING CARDS for ${this.ship.shipType}...`);
        
        // Clear existing cards to avoid duplicates
        this.installedCards.clear();
        
        if (this.cardInventoryUI && this.cardInventoryUI.shipSlots) {
            // Load from cardInventoryUI if available
            console.log(`📦 Loading from cardInventoryUI (${this.cardInventoryUI.shipSlots.size} slots)`);
            for (const [slotId, card] of this.cardInventoryUI.shipSlots.entries()) {
                if (card && card.cardType) {
                    this.installedCards.set(slotId, {
                        cardType: card.cardType,
                        level: card.level || 1
                    });
                    console.log(`  ✅ Loaded ${card.cardType} (L${card.level}) from slot ${slotId}`);
                }
            }
        } else {
            // Load from PlayerData as fallback
            console.log(`💾 Loading from PlayerData fallback...`);
            try {
                const { default: CardInventoryUI } = await import('../ui/CardInventoryUI.js');
                const playerData = CardInventoryUI.getPlayerData();
                this.playerDataCache = playerData;
                
                const shipConfig = playerData.getShipConfiguration(this.ship.shipType);
                if (shipConfig && shipConfig.size > 0) {
                    console.log(`📋 Found ship config in PlayerData (${shipConfig.size} entries)`);
                    for (const [slotId, cardData] of shipConfig.entries()) {
                        if (cardData && cardData.cardType) {
                            this.installedCards.set(slotId, {
                                cardType: cardData.cardType,
                                level: cardData.level || 1
                            });
                            console.log(`  ✅ Loaded ${cardData.cardType} (L${cardData.level}) from PlayerData slot ${slotId}`);
                        }
                    }
                } else {
                    console.log(`❌ No ship config found in PlayerData for ${this.ship.shipType}`);
                }
            } catch (error) {
                console.error('Error loading cards from PlayerData:', error);
            }
        }
        
        // Log final result for debugging
        if (this.installedCards.size > 0) {
            const installedCardTypes = Array.from(this.installedCards.values()).map(card => card.cardType);
            console.log(`🎯 CARDS LOADED: [${installedCardTypes.join(', ')}] (${this.installedCards.size} total)`);
        } else {
            console.log(`❌ NO CARDS LOADED for ${this.ship.shipType}`);
        }
    }

    /**
     * Create mapping between ship systems and required card types
     */
    createSystemCardMapping() {
        return {
            // Core systems that require cards to function
            'subspace_radio': [CARD_TYPES.SUBSPACE_RADIO],
            'long_range_scanner': [CARD_TYPES.LONG_RANGE_SCANNER],
            'galactic_chart': [CARD_TYPES.GALACTIC_CHART],
            'target_computer': [CARD_TYPES.TARGET_COMPUTER],
            'impulse_engines': [CARD_TYPES.IMPULSE_ENGINES],
            'warp_drive': [CARD_TYPES.WARP_DRIVE],
            'shields': [CARD_TYPES.SHIELDS, CARD_TYPES.SHIELD_GENERATOR],
            'weapons': [
                CARD_TYPES.LASER_CANNON,
                CARD_TYPES.PLASMA_CANNON,
                CARD_TYPES.PULSE_CANNON,
                CARD_TYPES.PHASER_ARRAY,
                CARD_TYPES.DISRUPTOR_CANNON,
                CARD_TYPES.PARTICLE_BEAM
            ],
            'missile_tubes': [CARD_TYPES.MISSILE_TUBES, CARD_TYPES.TORPEDO_LAUNCHER],
            'hull_plating': [CARD_TYPES.HULL_PLATING],
            'energy_reactor': [CARD_TYPES.ENERGY_REACTOR],
            'cargo_hold': [CARD_TYPES.CARGO_HOLD, CARD_TYPES.REINFORCED_CARGO_HOLD, CARD_TYPES.SHIELDED_CARGO_HOLD]
        };
    }

    /**
     * Check if a system has the required cards installed
     * @param {string} systemName - Name of the system to check
     * @returns {Object} - Check result with details
     */
    async hasRequiredCards(systemName) {
        const requiredCardTypes = this.getSystemCardRequirements(systemName);
        
        if (!requiredCardTypes || requiredCardTypes.length === 0) {
            // System doesn't require cards or is not mapped
            return {
                hasCards: true,
                reason: 'No cards required',
                installedCards: [],
                missingCards: [],
                requiredCardTypes: []
            };
        }

        // Ensure cards are loaded
        await this.loadCards();

        // Get all installed card types
        const installedCardTypes = Array.from(this.installedCards.values()).map(card => card.cardType);
        
        // Check if any of the required card types are installed
        const installedRequiredCards = requiredCardTypes.filter(cardType => {
            return installedCardTypes.includes(cardType);
        });

        const hasCards = installedRequiredCards.length > 0;
        const missingCards = hasCards ? [] : requiredCardTypes;

        return {
            hasCards,
            reason: hasCards ? 'Required cards installed' : 'Missing required cards',
            installedCards: installedRequiredCards,
            missingCards,
            requiredCardTypes
        };
    }

    /**
     * Get the level of the highest installed card for a system
     * @param {string} systemName - Name of the system
     * @returns {number} - Highest card level, or 0 if no cards installed
     */
    async getSystemCardLevel(systemName) {
        const requiredCardTypes = this.systemCardMapping[systemName];
        
        if (!requiredCardTypes) {
            return 0;
        }

        await this.updateInstalledCards();

        let highestLevel = 0;
        for (const card of this.installedCards.values()) {
            if (requiredCardTypes.includes(card.cardType)) {
                highestLevel = Math.max(highestLevel, card.level);
            }
        }

        return highestLevel;
    }

    /**
     * Get all installed cards for a specific system
     * @param {string} systemName - Name of the system
     * @returns {Array} - Array of installed cards for this system
     */
    async getSystemCards(systemName) {
        const requiredCardTypes = this.systemCardMapping[systemName];
        
        if (!requiredCardTypes) {
            return [];
        }

        await this.updateInstalledCards();

        const systemCards = [];
        for (const card of this.installedCards.values()) {
            if (requiredCardTypes.includes(card.cardType)) {
                systemCards.push(card);
            }
        }

        return systemCards;
    }

    /**
     * Check if a system can be activated based on installed cards
     * @param {string} systemName - Name of the system
     * @returns {boolean} - True if system can be activated
     */
    async canActivateSystem(systemName) {
        const cardCheck = await this.hasRequiredCards(systemName);
        return cardCheck.hasCards;
    }

    /**
     * Check if a system has the required cards installed (boolean version)
     * @param {string} systemName - Name of the system
     * @returns {boolean} - True if system has required cards
     */
    async hasSystemCards(systemName) {
        const cardCheck = await this.hasRequiredCards(systemName);
        return cardCheck.hasCards;
    }

    /**
     * Get system effectiveness based on installed cards
     * @param {string} systemName - Name of the system
     * @returns {number} - Effectiveness multiplier (0.0 to 2.0+)
     */
    async getSystemEffectiveness(systemName) {
        const systemCards = await this.getSystemCards(systemName);
        
        if (systemCards.length === 0) {
            return 0.0; // No cards = no functionality
        }

        // Calculate effectiveness based on card levels and rarity
        let totalEffectiveness = 0;
        let cardCount = 0;

        for (const card of systemCards) {
            // Base effectiveness from level (1.0 at level 1, 2.0 at level 10)
            const levelMultiplier = 1.0 + (card.level - 1) * 0.1;
            
            // Rarity bonus
            const rarityMultipliers = {
                'common': 1.0,
                'rare': 1.2,
                'epic': 1.5,
                'legendary': 2.0
            };
            const rarityMultiplier = rarityMultipliers[card.rarity] || 1.0;
            
            totalEffectiveness += levelMultiplier * rarityMultiplier;
            cardCount++;
        }

        // Average effectiveness across all cards, with bonus for multiple cards
        const averageEffectiveness = totalEffectiveness / cardCount;
        const multiCardBonus = cardCount > 1 ? 1.0 + (cardCount - 1) * 0.1 : 1.0;
        
        return Math.min(averageEffectiveness * multiCardBonus, 3.0); // Cap at 3x effectiveness
    }

    /**
     * Get detailed system status including card information
     * @param {string} systemName - Name of the system
     * @returns {Object} - Detailed system status
     */
    async getSystemStatus(systemName) {
        const cardCheck = await this.hasRequiredCards(systemName);
        const systemCards = await this.getSystemCards(systemName);
        const effectiveness = await this.getSystemEffectiveness(systemName);
        const canActivate = await this.canActivateSystem(systemName);

        return {
            systemName,
            hasRequiredCards: cardCheck.hasCards,
            canActivate,
            effectiveness,
            installedCards: systemCards.map(card => ({
                name: card.metadata.name,
                type: card.cardType,
                level: card.level,
                rarity: card.rarity
            })),
            missingCards: cardCheck.missingCards,
            requiredCardTypes: cardCheck.requiredCardTypes
        };
    }

    /**
     * Set reference to the card inventory UI for integration
     */
    setCardInventoryUI(cardInventoryUI) {
        this.cardInventoryUI = cardInventoryUI;
    }

    /**
     * Get all system statuses
     * @returns {Object} - Map of system names to their statuses
     */
    getAllSystemStatuses() {
        const statuses = {};
        
        for (const systemName of Object.keys(this.systemCardMapping)) {
            statuses[systemName] = this.getSystemStatus(systemName);
        }

        return statuses;
    }

    /**
     * Get the required card types for a system
     * @param {string} systemName - Name of the system
     * @returns {Array} - Array of required card types
     */
    getSystemCardRequirements(systemName) {
        const mapping = this.createSystemCardMapping();
        return mapping[systemName] || [];
    }

    /**
     * Check if ship has required cards for a system (synchronous version)
     */
    hasSystemCardsSync(systemName) {
        // Get the system card requirements
        const requiredCardTypes = this.getSystemCardRequirements(systemName);
        
        if (requiredCardTypes.length === 0) {
            // System doesn't require any specific cards
            return { hasCards: true, missingCards: [] };
        }
        
        // Check if we have ANY of the required cards installed (OR relationship)
        const installedCardTypes = Array.from(this.installedCards.values()).map(card => card.cardType);
        const availableCards = [];
        
        // Check each required card type
        for (const cardType of requiredCardTypes) {
            const isInstalled = installedCardTypes.includes(cardType);
            if (isInstalled) {
                availableCards.push(cardType);
            }
        }
        
        // System is functional if ANY of the required card types are installed
        const hasCards = availableCards.length > 0;
        const missingCards = hasCards ? [] : requiredCardTypes;
        
        return {
            hasCards: hasCards,
            missingCards: missingCards
        };
    }

    /**
     * Create missing systems based on installed cards
     * This ensures that if a card is installed, the corresponding system exists
     */
    async createSystemsFromCards() {
        console.log(`🔧 Creating systems from installed cards...`);
        
        const cardToSystemMap = {
            'subspace_radio': 'SubspaceRadioSystem',
            'long_range_scanner': 'LongRangeScanner', 
            'galactic_chart': 'GalacticChartSystem',
            'shields': 'Shields',
            'hull_plating': 'HullPlating',
            'shield_generator': 'Shields',  // Map shield_generator card to Shields class
            'cargo_hold': 'CargoHold',
            'warp_drive': 'WarpDrive',
            'laser_cannon': 'Weapons',
            'plasma_cannon': 'Weapons',
            'pulse_cannon': 'Weapons',
            'missile_tubes': 'MissileTubes'
        };
        
        const systemPathMap = {
            'SubspaceRadioSystem': './systems/SubspaceRadioSystem.js',
            'LongRangeScanner': './systems/LongRangeScanner.js',
            'GalacticChartSystem': './systems/GalacticChartSystem.js',
            'Shields': './systems/Shields.js',
            'HullPlating': './systems/HullPlating.js',
            'ShieldGenerator': './systems/ShieldGenerator.js',
            'CargoHold': './systems/CargoHold.js',
            'WarpDrive': './systems/WarpDrive.js',
            'Weapons': './systems/Weapons.js',
            'MissileTubes': './systems/MissileTubes.js'
        };
        
        let systemsCreated = 0;
        
        // Check each installed card
        for (const [slotId, cardData] of this.installedCards) {
            const systemClass = cardToSystemMap[cardData.cardType];
            const systemName = this.getSystemNameForCard(cardData.cardType);
            
            // Skip if system already exists
            if (this.ship.getSystem(systemName)) {
                continue;
            }
            
            // Skip if we don't know how to create this system
            if (!systemClass || !systemPathMap[systemClass]) {
                console.log(`  ⚠️ Unknown system type for card: ${cardData.cardType}`);
                continue;
            }
            
            try {
                // Import and create the system
                const modulePath = systemPathMap[systemClass];
                const { default: SystemClass } = await import(modulePath);
                const system = new SystemClass(cardData.level);
                
                // Add the system to the ship
                if (this.ship.addSystem(systemName, system)) {
                    systemsCreated++;
                    console.log(`  ✅ Created ${systemName} (Level ${cardData.level}) from ${cardData.cardType} card`);
                } else {
                    console.log(`  ❌ Failed to add ${systemName} to ship (no slots?)`);
                }
                
            } catch (error) {
                console.error(`  ❌ Failed to create system ${systemName} for card ${cardData.cardType}:`, error);
            }
        }
        
        console.log(`🎯 SYSTEMS CREATED: ${systemsCreated} new systems from cards`);
        
        // Recalculate ship stats after adding systems
        if (systemsCreated > 0) {
            this.ship.calculateTotalStats();
        }
    }
    
    /**
     * Get the system name that corresponds to a card type
     */
    getSystemNameForCard(cardType) {
        const cardToSystemNameMap = {
            'subspace_radio': 'subspace_radio',
            'long_range_scanner': 'long_range_scanner',
            'galactic_chart': 'galactic_chart', 
            'shields': 'shields',
            'hull_plating': 'hull_plating',
            'shield_generator': 'shields',  // Map shield_generator card to shields system
            'cargo_hold': 'cargo_hold',
            'warp_drive': 'warp_drive',
            'laser_cannon': 'weapons',
            'plasma_cannon': 'weapons', 
            'pulse_cannon': 'weapons',
            'missile_tubes': 'missile_tubes'
        };
        
        return cardToSystemNameMap[cardType] || cardType;
    }
} 