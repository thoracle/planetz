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
        // Clear existing cards to avoid duplicates
        this.installedCards.clear();
        
        if (this.cardInventoryUI && this.cardInventoryUI.shipSlots) {
            // Load from cardInventoryUI if available
            for (const [slotId, card] of this.cardInventoryUI.shipSlots.entries()) {
                if (card && card.cardType) {
                    this.installedCards.set(slotId, {
                        cardType: card.cardType,
                        level: card.level || 1
                    });
                }
            }
        } else {
            // Load from PlayerData as fallback
            try {
                const { default: CardInventoryUI } = await import('../ui/CardInventoryUI.js');
                const playerData = CardInventoryUI.getPlayerData();
                this.playerDataCache = playerData;
                
                const shipConfig = playerData.getShipConfiguration(this.ship.shipType);
                if (shipConfig && shipConfig.size > 0) {
                    for (const [slotId, cardData] of shipConfig.entries()) {
                        if (cardData && cardData.cardType) {
                            this.installedCards.set(slotId, {
                                cardType: cardData.cardType,
                                level: cardData.level || 1
                            });
                        }
                    }
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
            'target_computer': [CARD_TYPES.TARGET_COMPUTER, CARD_TYPES.TACTICAL_COMPUTER, CARD_TYPES.COMBAT_COMPUTER, CARD_TYPES.STRATEGIC_COMPUTER],
            'tactical_computer': [CARD_TYPES.TACTICAL_COMPUTER],     // Advanced intel-enabled target computer
            'combat_computer': [CARD_TYPES.COMBAT_COMPUTER],       // Advanced intel-enabled target computer
            'strategic_computer': [CARD_TYPES.STRATEGIC_COMPUTER],    // Advanced intel-enabled target computer
            'impulse_engines': [CARD_TYPES.IMPULSE_ENGINES],
            'warp_drive': [CARD_TYPES.WARP_DRIVE],
            'shields': [CARD_TYPES.SHIELDS, CARD_TYPES.SHIELD_GENERATOR],
            'weapons': [
                CARD_TYPES.LASER_CANNON,
                CARD_TYPES.PLASMA_CANNON,
                CARD_TYPES.PULSE_CANNON,
                CARD_TYPES.PHASER_ARRAY,
                CARD_TYPES.DISRUPTOR_CANNON,
                CARD_TYPES.PARTICLE_BEAM,
                // New projectile weapons
                CARD_TYPES.STANDARD_MISSILE,
                CARD_TYPES.HOMING_MISSILE,
                CARD_TYPES.PHOTON_TORPEDO,
                CARD_TYPES.PROXIMITY_MINE
            ],
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
     * Create ship systems based on installed cards
     * This ensures that if a card is installed, the corresponding system exists
     */
    async createSystemsFromCards() {
        // STEP 1: Clean up orphaned systems that no longer have cards
        await this.cleanupOrphanedSystems();
        
        const cardToSystemMap = {
            'impulse_engines': 'ImpulseEngines',
            'target_computer': 'TargetComputer',
            'energy_reactor': 'EnergyReactor',
            'subspace_radio': 'SubspaceRadioSystem',
            'long_range_scanner': 'LongRangeScanner', 
            'galactic_chart': 'GalacticChartSystem',
            'shields': 'Shields',
            'hull_plating': 'HullPlating',
            'shield_generator': 'Shields',  // Map shield_generator card to Shields class
            'cargo_hold': 'CargoHold',
            'reinforced_cargo_hold': 'ReinforcedCargoHold',
            'shielded_cargo_hold': 'ShieldedCargoHold',
            'warp_drive': 'WarpDrive',
            // SKIP WEAPON CARDS - WeaponSyncManager handles these as individual systems
            // 'laser_cannon': 'Weapons',
            // 'plasma_cannon': 'Weapons',
            // 'pulse_cannon': 'Weapons',
            // 'phaser_array': 'Weapons',
            // 'disruptor_cannon': 'Weapons',
            // 'particle_beam': 'Weapons',
            'missile_tubes': 'MissileTubes',
            'torpedo_launcher': 'MissileTubes',  // Map torpedo launcher to missile system
            'tactical_computer': 'TargetComputer',     // Advanced intel-enabled target computer
            'combat_computer': 'TargetComputer',       // Advanced intel-enabled target computer
            'strategic_computer': 'TargetComputer',    // Advanced intel-enabled target computer
            
            // Exotic Core Systems (map to existing reactor class)
            'quantum_reactor': 'EnergyReactor',
            'dark_matter_core': 'EnergyReactor',
            'antimatter_generator': 'EnergyReactor',
            'crystalline_matrix': 'EnergyReactor',
            
            // Advanced Propulsion (map to existing engine class)
            'quantum_drive': 'ImpulseEngines',
            'dimensional_shifter': 'ImpulseEngines',
            'temporal_engine': 'ImpulseEngines',
            'gravity_well_drive': 'ImpulseEngines',
            
            // Advanced Defense (map to existing defense classes)
            'phase_shield': 'Shields',
            'adaptive_armor': 'HullPlating',
            'quantum_barrier': 'Shields',
            'temporal_deflector': 'Shields',
            
            // Exotic Sensors & Tech (map to existing sensor classes)
            'quantum_scanner': 'LongRangeScanner',
            'precognition_array': 'TargetComputer',
            'dimensional_radar': 'LongRangeScanner',
            'psionic_amplifier': 'TargetComputer',
            'neural_interface': 'TargetComputer'
            
            // NOTE: Alien Technology and Experimental Systems are handled as special cases
            // They provide passive benefits without creating system objects
        };
        
        const systemPathMap = {
            'ImpulseEngines': './systems/ImpulseEngines.js',
            'TargetComputer': './systems/TargetComputer.js',
            'EnergyReactor': './systems/EnergyReactor.js',
            'SubspaceRadioSystem': './systems/SubspaceRadioSystem.js',
            'LongRangeScanner': './systems/LongRangeScanner.js',
            'GalacticChartSystem': './systems/GalacticChartSystem.js',
            'Shields': './systems/Shields.js',
            'HullPlating': './systems/HullPlating.js',
            'ShieldGenerator': './systems/ShieldGenerator.js',
            'CargoHold': './systems/CargoHold.js',
            'ReinforcedCargoHold': './systems/CargoHold.js',
            'ShieldedCargoHold': './systems/CargoHold.js',
            'WarpDrive': './systems/WarpDrive.js',
            'Weapons': './systems/Weapons.js',
            'MissileTubes': './systems/MissileTubes.js'
        };
        
        let systemsCreated = 0;
        
        // Handle each installed card
        for (const [slotId, cardData] of this.installedCards) {
            const cardType = cardData.cardType;
            const systemName = this.getSystemNameForCard(cardType);
            
            console.log(`🔧 Processing card: ${cardType} → ${systemName}`);
            
            // Skip weapon cards - they're handled by WeaponSyncManager
            if (this.isWeaponCard(cardType)) {
                console.log(`🔫 SKIPPING weapon card ${cardType} - handled by WeaponSyncManager`);
                continue;
            }
            
            // Special handling for utility cards that don't create systems
            if (cardType === 'entropy_reverser' || 
                cardType === 'zephyrian_crystal' || 
                cardType === 'vorthan_mind_link' || 
                cardType === 'nexus_harmonizer' || 
                cardType === 'ethereal_conduit' || 
                cardType === 'probability_drive' || 
                cardType === 'chaos_field_gen' || 
                cardType === 'reality_anchor') {
                console.log(`🔧 UTILITY CARD: ${cardType} - provides passive benefits (no system created)`);
                continue;
            }
            
            // Skip if system already exists with same level
            if (this.ship.systems.has(systemName)) {
                const existingSystem = this.ship.systems.get(systemName);
                if (existingSystem.level === cardData.level) {
                    console.log(`✅ EXISTING: ${systemName} (Level ${cardData.level}) - no change needed`);
                    continue;
                } else {
                    // Level changed - remove old system first
                    console.log(`🔄 SYSTEM LEVEL CHANGED: ${systemName} Level ${existingSystem.level} → Level ${cardData.level}`);
                    this.ship.removeSystem(systemName);
                    console.log(`🗑️ Removed old ${systemName} system for replacement`);
                }
            }
            
            // Skip if we don't know how to create this system
            if (!cardToSystemMap[cardType] || !systemPathMap[cardToSystemMap[cardType]]) {
                console.log(`❌ SYSTEM CREATION FAILED: ${cardType} → Unknown system type`);
                continue;
            }
            
            try {
                // Import and create the system
                const modulePath = systemPathMap[cardToSystemMap[cardType]];
                
                // Handle both default and named exports
                let SystemClass;
                if (cardToSystemMap[cardType] === 'ReinforcedCargoHold' || cardToSystemMap[cardType] === 'ShieldedCargoHold') {
                    // Named exports for cargo variants
                    const module = await import(modulePath);
                    SystemClass = module[cardToSystemMap[cardType]];
                } else {
                    // Default exports for most systems
                    const { default: DefaultSystemClass } = await import(modulePath);
                    SystemClass = DefaultSystemClass;
                }
                
                // Create system with appropriate configuration
                let system;
                if (cardToSystemMap[cardType] === 'Weapons') {
                    // Pass weapon card type to Weapons system
                    system = new SystemClass(cardData.level, { weaponCardType: cardData.cardType });
                } else {
                    // Standard system creation
                    system = new SystemClass(cardData.level);
                }
                
                // Add the system to the ship
                if (this.ship.addSystem(systemName, system)) {
                    systemsCreated++;
                    console.log(`✅ CREATED: ${systemName} (Level ${cardData.level}) from card`);
                } else {
                    console.log(`❌ FAILED TO ADD: ${systemName} (no slots?)`);
                }
                
            } catch (error) {
                console.error(`❌ SYSTEM ERROR: ${cardType} →`, error.message);
            }
        }
        
        if (systemsCreated > 0) {
            console.log(`✅ Created ${systemsCreated} systems from cards`);
            // Recalculate ship stats after adding systems
            this.ship.calculateTotalStats();
            
            // CRITICAL: Clean up and refresh weapon systems after card changes
            await this.refreshWeaponSystems();
            
            // Trigger damage control interface refresh if it's open
            if (window.simplifiedDamageControl) {
                window.simplifiedDamageControl.forceRefresh();
            }
            
            // Also trigger StarfieldManager damage control refresh if visible
            if (window.starfieldManager && window.starfieldManager.damageControlVisible) {
                if (window.starfieldManager.damageControlHUD && window.starfieldManager.damageControlHUD.forceRefresh) {
                    window.starfieldManager.damageControlHUD.forceRefresh();
                } else {
                    window.starfieldManager.updateShipSystemsDisplay();
                }
            }
        }
    }
    
    /**
     * Clean up systems that no longer have corresponding cards installed
     */
    async cleanupOrphanedSystems() {
        console.log('🧹 Cleaning up orphaned systems...');
        
        // Get list of installed card types
        const installedCardTypes = Array.from(this.installedCards.values()).map(card => card.cardType);
        console.log('🧹 Installed card types:', installedCardTypes);
        
        // List of systems that should be removed if their cards are not installed
        const systemsToCheck = [
            'target_computer', 'impulse_engines', 'energy_reactor', 'subspace_radio',
            'long_range_scanner', 'galactic_chart', 'shields', 'hull_plating',
            'cargo_hold', 'reinforced_cargo_hold', 'shielded_cargo_hold', 'warp_drive',
            // Individual weapon systems
            'laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
            'disruptor_cannon', 'particle_beam', 'standard_missile', 'homing_missile',
            'heavy_torpedo', 'proximity_mine', 'missile_tubes'
        ];
        
        let removedCount = 0;
        for (const systemName of systemsToCheck) {
            if (this.ship.systems.has(systemName)) {
                // Check if we have the corresponding card installed
                const hasCard = this.hasCardForSystem(systemName, installedCardTypes);
                
                if (!hasCard) {
                    console.log(`🗑️ Removing orphaned system: ${systemName} (no corresponding card)`);
                    this.ship.removeSystem(systemName);
                    removedCount++;
                }
            }
        }
        
        console.log(`🧹 Cleanup complete: removed ${removedCount} orphaned systems`);
    }
    
    /**
     * Check if we have a card installed for a specific system
     */
    hasCardForSystem(systemName, installedCardTypes) {
        // Direct mapping for most systems
        if (installedCardTypes.includes(systemName)) {
            return true;
        }
        
        // Special cases for systems with multiple card variants
        if (systemName === 'shields' && (
            installedCardTypes.includes('shields') || 
            installedCardTypes.includes('shield_generator') || 
            installedCardTypes.includes('phase_shield') || 
            installedCardTypes.includes('quantum_barrier') || 
            installedCardTypes.includes('temporal_deflector')
        )) {
            return true;
        }
        
        // Target computer can be satisfied by various computer card types
        if (systemName === 'target_computer' && (
            installedCardTypes.includes('target_computer') || 
            installedCardTypes.includes('tactical_computer') || 
            installedCardTypes.includes('combat_computer') || 
            installedCardTypes.includes('strategic_computer') || 
            installedCardTypes.includes('precognition_array') || 
            installedCardTypes.includes('psionic_amplifier') || 
            installedCardTypes.includes('neural_interface')
        )) {
            return true;
        }
        
        // Energy reactor variants
        if (systemName === 'energy_reactor' && (
            installedCardTypes.includes('energy_reactor') || 
            installedCardTypes.includes('quantum_reactor') || 
            installedCardTypes.includes('dark_matter_core') || 
            installedCardTypes.includes('antimatter_generator') || 
            installedCardTypes.includes('crystalline_matrix')
        )) {
            return true;
        }
        
        // Impulse engine variants
        if (systemName === 'impulse_engines' && (
            installedCardTypes.includes('impulse_engines') || 
            installedCardTypes.includes('quantum_drive') || 
            installedCardTypes.includes('dimensional_shifter') || 
            installedCardTypes.includes('temporal_engine') || 
            installedCardTypes.includes('gravity_well_drive')
        )) {
            return true;
        }
        
        // Long range scanner variants
        if (systemName === 'long_range_scanner' && (
            installedCardTypes.includes('long_range_scanner') || 
            installedCardTypes.includes('quantum_scanner') || 
            installedCardTypes.includes('dimensional_radar')
        )) {
            return true;
        }
        
        // Hull plating variants
        if (systemName === 'hull_plating' && (
            installedCardTypes.includes('hull_plating') || 
            installedCardTypes.includes('adaptive_armor')
        )) {
            return true;
        }
        
        // Cargo hold variants
        if (systemName === 'cargo_hold' && (
            installedCardTypes.includes('cargo_hold') || 
            installedCardTypes.includes('reinforced_cargo_hold') || 
            installedCardTypes.includes('shielded_cargo_hold')
        )) {
            return true;
        }
        
        // For weapon systems, check if the specific weapon card is installed
        const weaponSystems = ['laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
                              'disruptor_cannon', 'particle_beam', 'standard_missile', 'homing_missile',
                              'heavy_torpedo', 'proximity_mine', 'photon_torpedo', 'ion_storm_cannon',
                              'graviton_beam', 'quantum_torpedo', 'singularity_launcher', 'void_ripper',
                              'nanite_swarm'];
        
        if (weaponSystems.includes(systemName)) {
            return installedCardTypes.includes(systemName);
        }
        
        return false;
    }

    /**
     * Clean up and refresh weapon systems to prevent duplicates and stale systems
     * This ensures WeaponSyncManager and CardSystemIntegration stay in sync
     */
    async refreshWeaponSystems() {
        try {
            console.log('🔧 Refreshing weapon systems to prevent duplicates...');
            
            // Step 1: Remove consolidated "weapons" system to prevent duplicates with individual weapons
            if (this.ship.systems.has('weapons')) {
                this.ship.removeSystem('weapons');
                console.log('🗑️ Removed consolidated "weapons" system to prevent duplicates');
            }
            
            // Step 2: Remove all individual weapon systems to prevent duplicates
            const weaponSystemNames = ['laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
                                     'disruptor_cannon', 'particle_beam', 'standard_missile', 'homing_missile',
                                     'heavy_torpedo', 'proximity_mine'];
            
            let removedCount = 0;
            for (const weaponName of weaponSystemNames) {
                if (this.ship.systems.has(weaponName)) {
                    this.ship.removeSystem(weaponName);
                    removedCount++;
                    console.log(`🗑️ Removed old individual weapon system: ${weaponName}`);
                }
            }
            
            // Step 3: Only re-initialize WeaponSyncManager if we have weapon cards
            const installedCardTypes = Array.from(this.installedCards.values()).map(card => card.cardType);
            const hasWeaponCards = weaponSystemNames.some(weaponType => installedCardTypes.includes(weaponType));
            
            if (hasWeaponCards && this.ship.initializeWeaponSystem) {
                console.log('🔫 Re-initializing weapon system after card changes...');
                await this.ship.initializeWeaponSystem();
            } else {
                console.log('🔫 No weapon cards installed - skipping weapon system initialization');
            }
            
            console.log(`🔧 Weapon systems refresh complete: removed ${removedCount + (removedCount > 0 ? 1 : 0)} old systems`);
            
        } catch (error) {
            console.error('🔧 Failed to refresh weapon systems:', error);
        }
    }

    /**
     * Get the system name that corresponds to a card type
     */
    getSystemNameForCard(cardType) {
        const cardToSystemNameMap = {
            'impulse_engines': 'impulse_engines',
            'target_computer': 'target_computer',
            'energy_reactor': 'energy_reactor',
            'subspace_radio': 'subspace_radio',
            'long_range_scanner': 'long_range_scanner',
            'galactic_chart': 'galactic_chart', 
            'shields': 'shields',
            'hull_plating': 'hull_plating',
            'shield_generator': 'shields',  // Map shield_generator card to shields system
            'cargo_hold': 'cargo_hold',
            'reinforced_cargo_hold': 'reinforced_cargo_hold',
            'shielded_cargo_hold': 'shielded_cargo_hold',
            'warp_drive': 'warp_drive',
            'laser_cannon': 'weapons',
            'plasma_cannon': 'weapons', 
            'pulse_cannon': 'weapons',
            'phaser_array': 'weapons',
            'disruptor_cannon': 'weapons',
            'particle_beam': 'weapons',
            'missile_tubes': 'missile_tubes',
            'torpedo_launcher': 'missile_tubes',  // Map torpedo launcher to missile system
            'tactical_computer': 'target_computer',     // Advanced intel-enabled target computer
            'combat_computer': 'target_computer',       // Advanced intel-enabled target computer
            'strategic_computer': 'target_computer',    // Advanced intel-enabled target computer
            
            // Projectile weapons
            'standard_missile': 'weapons',
            'homing_missile': 'weapons',
            'photon_torpedo': 'weapons',
            'proximity_mine': 'weapons',
            
            // Exotic Core Systems (reactor equivalents)
            'quantum_reactor': 'energy_reactor',
            'dark_matter_core': 'energy_reactor',
            'antimatter_generator': 'energy_reactor',
            'crystalline_matrix': 'energy_reactor',
            
            // Advanced Propulsion (engine equivalents)
            'quantum_drive': 'impulse_engines',
            'dimensional_shifter': 'impulse_engines',
            'temporal_engine': 'impulse_engines',
            'gravity_well_drive': 'impulse_engines',
            
            // Exotic Weapons
            'ion_storm_cannon': 'weapons',
            'graviton_beam': 'weapons',
            'quantum_torpedo': 'weapons',
            'singularity_launcher': 'weapons',
            'void_ripper': 'weapons',
            'nanite_swarm': 'weapons',
            
            // Advanced Defense (shield/armor equivalents)
            'phase_shield': 'shields',
            'adaptive_armor': 'hull_plating',
            'quantum_barrier': 'shields',
            'temporal_deflector': 'shields',
            
            // Exotic Sensors & Tech (utility/scanner equivalents)
            'quantum_scanner': 'long_range_scanner',
            'precognition_array': 'target_computer',
            'dimensional_radar': 'long_range_scanner',
            'psionic_amplifier': 'target_computer',
            'neural_interface': 'target_computer',
            
            // Alien Technology (special utility systems)
            'zephyrian_crystal': 'utility_special',
            'vorthan_mind_link': 'utility_special',
            'nexus_harmonizer': 'utility_special',
            'ethereal_conduit': 'utility_special',
            
            // Experimental Systems (special utility systems)
            'probability_drive': 'utility_special',
            'chaos_field_gen': 'utility_special',
            'reality_anchor': 'utility_special',
            'entropy_reverser': 'utility_special'
        };
        
        return cardToSystemNameMap[cardType] || cardType;
    }

    /**
     * Check if a card type is a weapon card
     */
    isWeaponCard(cardType) {
        const weaponCardTypes = [
            'laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
            'disruptor_cannon', 'particle_beam', 'standard_missile', 'homing_missile',
            'heavy_torpedo', 'proximity_mine'
        ];
        return weaponCardTypes.includes(cardType);
    }
} 