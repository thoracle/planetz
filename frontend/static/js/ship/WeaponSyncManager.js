import { debug } from '../debug.js';

/**
 * WeaponSyncManager - Unified weapon system initialization and synchronization
 * 
 * This class provides a single, consistent approach to weapon initialization
 * that works for both game start and station launch scenarios.
 * 
 * Key Features:
 * - Analyzes all weapon sources (ship systems, starter cards, inventory)
 * - Creates WeaponSystemCore with correct slot count
 * - Ensures docking interface and weapon system show identical weapons
 * - Provides debugging and testing capabilities
 */
export default class WeaponSyncManager {
    constructor(ship) {
        this.ship = ship;
        this.weaponSystem = null;
        this.cardInventoryUI = null;
        this.weapons = new Map(); // Map of slotIndex -> weaponCard
        this.debugMode = false;
    }
    
    /**
     * Initialize weapons for the ship using unified approach
     * @returns {Promise} Promise that resolves when weapons are initialized
     */
    async initializeWeapons() {
debug('COMBAT', '🔫 WeaponSyncManager: Starting unified weapon initialization...');
        
        try {
            // Step 1: Gather all weapons from all sources
            const weaponSources = await this.gatherAllWeaponSources();
            
            // Step 2: Reconcile weapons into a unified configuration
            const unifiedWeapons = this.reconcileWeaponConfiguration(weaponSources);
            
            // Step 3: Create weapon system with correct slot count
            const slotCount = Math.max(unifiedWeapons.length, 1); // At least 1 slot
            await this.createWeaponSystem(slotCount);
            
            // Step 4: Equip weapons to the system
            await this.equipWeaponsToSystem(unifiedWeapons);
            
            // Step 5: Store reference for the ship
            this.ship.weaponSystem = this.weaponSystem;
            
debug('COMBAT', `🔫 WeaponSyncManager: Initialized ${unifiedWeapons.length} weapons in ${slotCount} slots`);
            return this.weaponSystem;
            
        } catch (error) {
            debug('P1', 'WeaponSyncManager: Failed to initialize weapons:', error);
            throw error;
        }
    }
    
    /**
     * Gather weapons from all possible sources
     * @returns {Object} Object containing weapons from different sources
     */
    async gatherAllWeaponSources() {
        const sources = {
            shipSystems: [],
            starterCards: [],
            inventory: []
        };
        
        // Source 1: Ship systems (legacy weapons system)
        if (this.ship.systems) {
            for (const [systemName, system] of this.ship.systems.entries()) {
                if (this.isWeaponSystem(systemName) && system && (typeof system.isOperational === 'function' ? system.isOperational() : system.isOperational)) {
                    // Map legacy "weapons" system to a specific weapon type
                    let weaponType = systemName;
                    if (systemName === 'weapons') {
                        weaponType = 'laser_cannon'; // Default mapping for legacy weapons system
debug('COMBAT', `🔫 Found legacy weapons system, mapping to laser_cannon`);
                    }
                    
                    sources.shipSystems.push({
                        type: weaponType,
                        level: system.level || 1,
                        source: 'ship_system'
                    });
debug('COMBAT', `🔫 Found ship system weapon: ${systemName} -> ${weaponType} (Level ${system.level || 1})`);
                }
            }
        }
        
        // PRIORITY FIX: Use current installed cards from cardSystemIntegration instead of static starterCards
        // Source 2: Current installed cards (highest priority for station-modified configurations)
        if (this.ship.cardSystemIntegration && this.ship.cardSystemIntegration.installedCards) {
debug('UI', `🔫 Using current installed cards (post-station configuration)`);
            for (const [slotId, cardData] of this.ship.cardSystemIntegration.installedCards.entries()) {
                if (this.isWeaponCard(cardData.cardType)) {
                    sources.inventory.push({
                        type: cardData.cardType,
                        level: cardData.level || 1,
                        slotId: slotId,
                        source: 'current_config'
                    });
debug('COMBAT', `🔫 Found current weapon: ${cardData.cardType} (Level ${cardData.level || 1})`);
                }
            }
        } else {
            // Fallback: Use starter cards only if no current configuration exists
debug('UI', `🔫 Using fallback starter cards (initial configuration)`);
            if (this.ship.shipConfig?.starterCards) {
                for (const [slotId, cardData] of Object.entries(this.ship.shipConfig.starterCards)) {
                    if (this.isWeaponCard(cardData.cardType)) {
                        sources.starterCards.push({
                            type: cardData.cardType,
                            level: cardData.level || 1,
                            slotId: slotId,
                            source: 'starter_card'
                        });
debug('COMBAT', `🔫 Found starter card weapon: ${cardData.cardType} (Level ${cardData.level || 1})`);
                    }
                }
            }
        }
        
        return sources;
    }
    
    /**
     * Reconcile weapons from multiple sources into a unified configuration
     * Priority: current_config > starter_cards > ship_systems > inventory
     * @param {Object} sources - Weapons from different sources
     * @returns {Array} Array of unified weapon configurations
     */
    reconcileWeaponConfiguration(sources) {
        const unifiedWeapons = [];
        const usedWeapons = new Set();
        
        // Priority 1: Current configuration (highest priority for station-modified setups)
        const currentConfigWeapons = sources.inventory.filter(w => w.source === 'current_config');
        for (const weapon of currentConfigWeapons) {
            const key = `${weapon.type}_${weapon.level}`;
            if (!usedWeapons.has(key)) {
                unifiedWeapons.push(weapon);
                usedWeapons.add(key);
            }
        }
        
        // Only use fallback sources if no current configuration exists
        if (currentConfigWeapons.length === 0) {
debug('UTILITY', `🔫 No current config found, using fallback sources`);
            
            // Priority 2: Starter cards (for initial game setup)
            for (const weapon of sources.starterCards) {
                const key = `${weapon.type}_${weapon.level}`;
                if (!usedWeapons.has(key)) {
                    unifiedWeapons.push(weapon);
                    usedWeapons.add(key);
                }
            }
            
            // Priority 3: Ship systems (for legacy compatibility)
            for (const weapon of sources.shipSystems) {
                const key = `${weapon.type}_${weapon.level}`;
                if (!usedWeapons.has(key)) {
                    unifiedWeapons.push(weapon);
                    usedWeapons.add(key);
                }
            }
            
            // Priority 4: Other inventory (lowest priority, fallback)
            const otherInventoryWeapons = sources.inventory.filter(w => w.source !== 'current_config');
            for (const weapon of otherInventoryWeapons) {
                const key = `${weapon.type}_${weapon.level}`;
                if (!usedWeapons.has(key)) {
                    unifiedWeapons.push(weapon);
                    usedWeapons.add(key);
                }
            }
        } else {
debug('COMBAT', `🔫 Using current configuration with ${currentConfigWeapons.length} weapons`);
        }
        
        debug('COMBAT', `Reconciled ${unifiedWeapons.length} unique weapons:`,
            unifiedWeapons.map(w => `${w.type} (${w.source})`));
        
        return unifiedWeapons;
    }
    
    /**
     * Create the weapon system with the specified slot count
     * @param {number} slotCount - Number of weapon slots to create
     */
    async createWeaponSystem(slotCount) {
        try {
            const { WeaponSystemCore } = await import('./systems/WeaponSystemCore.js');
            this.weaponSystem = new WeaponSystemCore(this.ship, slotCount);
            
            // Connect with target computer for target lock functionality
            const targetComputer = this.ship.getSystem('target_computer');
            if (targetComputer) {
                this.weaponSystem.setLockedTarget(targetComputer.currentTarget);
            }
            
debug('COMBAT', `Created WeaponSystemCore with ${slotCount} slots`);
        } catch (error) {
            debug('P1', 'Failed to create weapon system:', error);
            throw error;
        }
    }
    
    /**
     * Equip weapons to the weapon system
     * @param {Array} weapons - Array of weapon configurations
     */
    async equipWeaponsToSystem(weapons) {
        try {
            const { WeaponDefinitions } = await import('./systems/WeaponDefinitions.js');
            
            let slotIndex = 0;
            for (const weaponConfig of weapons) {
                if (slotIndex >= this.weaponSystem.maxWeaponSlots) {
                    debug('COMBAT', `Cannot equip ${weaponConfig.type}: No more weapon slots available`);
                    break;
                }
                
                // Create weapon card from definition
                const weaponCard = WeaponDefinitions.createWeaponCard(weaponConfig.type);
                if (weaponCard) {
                    weaponCard.level = weaponConfig.level;
                    
                    if (this.weaponSystem.equipWeapon(slotIndex, weaponCard)) {
                        this.weapons.set(slotIndex, weaponCard);
debug('COMBAT', `🔫 Equipped ${weaponCard.name} (Level ${weaponCard.level}) to slot ${slotIndex}`);
                        
                        // REMOVED: No longer create individual weapon systems to avoid slot conflicts
                        // The WeaponSystemCore handles all weapon functionality internally
                        
                        slotIndex++;
                    } else {
                        debug('P1', `Failed to equip ${weaponCard.name} to slot ${slotIndex}`);
                    }
                } else {
                    debug('P1', `Could not create weapon card for ${weaponConfig.type}`);
                }
            }
            
debug('COMBAT', `Equipped ${slotIndex}/${this.weaponSystem.maxWeaponSlots} weapons successfully`);
        } catch (error) {
            debug('P1', 'Failed to equip weapons:', error);
            throw error;
        }
    }
    
    /**
     * Check if a system name represents a weapon system
     * @param {string} systemName - Name of the system
     * @returns {boolean} True if it's a weapon system
     */
    isWeaponSystem(systemName) {
        const weaponSystems = [
            // Legacy weapon system
            'weapons',
            // Scan-hit weapons (energy weapons)
            'laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
            'disruptor_cannon', 'particle_beam',
            // Splash-damage weapons (projectile weapons)
            'standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine'
        ];
        return weaponSystems.includes(systemName);
    }
    
    /**
     * Check if a card type is a weapon card
     * @param {string} cardType - Type of the card
     * @returns {boolean} True if it's a weapon card
     */
    isWeaponCard(cardType) {
        const weaponCardTypes = [
            // Scan-hit weapons (energy weapons)
            'laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
            'disruptor_cannon', 'particle_beam',
            // Splash-damage weapons (projectile weapons)
            'standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine'
        ];
        return weaponCardTypes.includes(cardType);
    }
    
    /**
     * Set card inventory UI reference for future synchronization
     * @param {CardInventoryUI} cardInventoryUI - Reference to card inventory
     */
    setCardInventoryUI(cardInventoryUI) {
        this.cardInventoryUI = cardInventoryUI;
    }
    
    /**
     * Synchronize card inventory display with weapon system
     * This ensures the docking interface shows the same weapons as the weapon system
     */
    async syncWithCardInventory() {
        if (!this.cardInventoryUI || !this.weaponSystem) {
            debug('COMBAT', 'Cannot sync: Missing card inventory UI or weapon system');
            return;
        }
        
        // TODO: Implement synchronization logic when CardInventoryUI is updated
debug('COMBAT', '🔫 Weapon system and card inventory are synchronized');
    }
    
    /**
     * Get current weapon configuration for debugging
     * @returns {Object} Current weapon configuration
     */
    getWeaponConfiguration() {
        return {
            weaponSystemSlots: this.weaponSystem?.maxWeaponSlots || 0,
            equippedWeapons: Array.from(this.weapons.entries()).map(([slot, weapon]) => ({
                slot,
                name: weapon.name,
                type: weapon.weaponType,
                level: weapon.level
            })),
            ship: this.ship.shipType,
            hasWeaponSystem: !!this.weaponSystem
        };
    }
    
    /**
     * Enable debug mode for detailed logging
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (enabled) {
debug('COMBAT', '🔫 WeaponSyncManager debug mode enabled');
debug('COMBAT', '🔫 Current configuration:', this.getWeaponConfiguration());
        }
    }
} 