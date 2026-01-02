/**
 * CardValidationEngine
 *
 * Extracted from CardInventoryUI.js to reduce god class size.
 * Contains pure validation logic for card-slot compatibility.
 */

import { debug } from '../debug.js';

// Card to slot type mapping - defines which slots each card type can be installed in
const CARD_TO_SLOT_MAPPING = {
    // Engine slot cards
    'impulse_engines': ['engines'],
    'quantum_drive': ['engines'],
    'dimensional_shifter': ['engines'],
    'temporal_engine': ['engines'],
    'gravity_well_drive': ['engines'],

    // Reactor/Power slot cards
    'energy_reactor': ['reactor'],
    'quantum_reactor': ['reactor'],
    'dark_matter_core': ['reactor'],
    'antimatter_generator': ['reactor'],
    'crystalline_matrix': ['reactor'],

    // Weapon slot cards
    'laser_cannon': ['weapons'],
    'pulse_cannon': ['weapons'],
    'plasma_cannon': ['weapons'],
    'phaser_array': ['weapons'],
    'disruptor_cannon': ['weapons'],
    'particle_beam': ['weapons'],
    'ion_storm_cannon': ['weapons'],
    'graviton_beam': ['weapons'],
    'quantum_torpedo': ['weapons'],
    'singularity_launcher': ['weapons'],
    'void_ripper': ['weapons'],
    'nanite_swarm': ['weapons'],
    // Specialized combat weapons (AI-compatible)
    'energy_pulse_cannon': ['weapons'],
    'energy_cannon': ['weapons'],
    'long_range_beam': ['weapons'],
    'defensive_turret': ['weapons'],
    'dual_turret': ['weapons'],
    // Advanced weapon systems
    'missile_launcher': ['weapons'],
    'point_defense': ['weapons'],
    'missile_pod': ['weapons'],
    // Projectile weapons
    'standard_missile': ['weapons'],
    'homing_missile': ['weapons'],
    'photon_torpedo': ['weapons'],
    'proximity_mine': ['weapons'],

    // Utility slot cards (most flexible)
    'hull_plating': ['utility'],
    'adaptive_armor': ['utility'],
    'shield_generator': ['utility'],
    'shields': ['utility'],
    'phase_shield': ['utility'],
    'quantum_barrier': ['utility'],
    'temporal_deflector': ['utility'],
    'cargo_hold': ['utility'],
    'reinforced_cargo_hold': ['utility'],
    'shielded_cargo_hold': ['utility'],
    'warp_drive': ['utility'],
    'long_range_scanner': ['utility'],
    'quantum_scanner': ['utility'],
    'dimensional_radar': ['utility'],
    'basic_radar': ['utility'],
    'advanced_radar': ['utility'],
    'tactical_radar': ['utility'],
    'subspace_radio': ['utility'],
    'galactic_chart': ['utility'],
    'target_computer': ['utility'],
    'tactical_computer': ['utility'],
    'combat_computer': ['utility'],
    'strategic_computer': ['utility'],
    'precognition_array': ['utility'],
    'psionic_amplifier': ['utility'],
    'neural_interface': ['utility'],

    // Alien Technology (utility only)
    'zephyrian_crystal': ['utility'],
    'vorthan_mind_link': ['utility'],
    'nexus_harmonizer': ['utility'],
    'ethereal_conduit': ['utility'],

    // Experimental Systems (utility only)
    'probability_drive': ['utility'],
    'chaos_field_gen': ['utility'],
    'reality_anchor': ['utility'],
    'entropy_reverser': ['utility'],

    // Capital Ship Systems (RESTRICTED - Capital ships and stations only)
    'landing_bay': ['capital'],
    'fighter_launch_bay': ['capital'],
    'shuttle_bay': ['capital'],
    'ship_construction_bay': ['capital'],
    'repair_facility': ['capital'],
    'manufacturing_plant': ['capital'],
    'fleet_command_center': ['capital'],
    'communications_array': ['capital'],
    'battle_bridge': ['capital'],
    'point_defense_grid': ['capital'],
    'shield_array': ['capital'],
    'reactor_core': ['capital'],
    'cargo_processing_center': ['capital'],
    'medical_bay': ['capital'],
    'science_lab': ['capital'],

    // Station-Specific Systems (RESTRICTED - Stations only)
    'mining_array': ['station'],
    'industrial_fabricator': ['station'],
    'security_complex': ['station'],
    'observatory_array': ['station'],
    'logistics_center': ['station'],
    'frontier_command': ['station']
};

// Capital ship types that can use capital ship systems
const CAPITAL_SHIP_TYPES = [
    'carrier',
    'heavy_freighter',
    'destroyer',
    'battleship',
    'cruiser'
];

// Station types that can use station-specific systems
const STATION_TYPES = [
    'space_station',
    'asteroid_mine',
    'refinery',
    'storage_depot',
    'research_lab',
    'repair_station',
    'frontier_outpost',
    'prison',
    'shipyard',
    'defense_platform',
    'factory',
    'communications_array',
    'listening_post',
    'orbital_telescope'
];

// Weapon card types
const WEAPON_CARDS = [
    // Energy weapons (lasers, beams, cannons)
    'laser_cannon', 'pulse_cannon', 'plasma_cannon', 'phaser_array', 'disruptor_cannon',
    'particle_beam', 'ion_storm_cannon', 'graviton_beam',
    // Specialized combat weapons (AI-compatible)
    'energy_pulse_cannon', 'energy_cannon', 'long_range_beam', 'defensive_turret', 'dual_turret',
    // Advanced weapon systems
    'missile_launcher', 'point_defense', 'missile_pod',
    // Projectile weapons (missiles, torpedoes, mines)
    'standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine',
    // Exotic weapons
    'quantum_torpedo', 'singularity_launcher', 'void_ripper', 'nanite_swarm'
];

// Cargo hold card types
const CARGO_HOLD_TYPES = ['cargo_hold', 'reinforced_cargo_hold', 'shielded_cargo_hold'];

export class CardValidationEngine {
    /**
     * Check if a card type is compatible with a slot type
     * @param {string} cardType - The card type to check
     * @param {string} slotType - The slot type to check against
     * @param {string} shipType - The current ship type (for capital/station restrictions)
     * @returns {boolean} True if compatible
     */
    static isCardCompatibleWithSlot(cardType, slotType, shipType) {
        const allowedSlots = CARD_TO_SLOT_MAPPING[cardType] || ['utility'];

        // CRITICAL: Block capital ship and station cards from regular ships
        if (allowedSlots.includes('capital') || allowedSlots.includes('station')) {
            const isCapitalShip = CardValidationEngine.isCapitalShipType(shipType);
            const isStation = CardValidationEngine.isStationType(shipType);

            if (allowedSlots.includes('capital') && !isCapitalShip && !isStation) {
                debug('UI', `CAPITAL SHIP RESTRICTION: ${cardType} cannot be installed on regular ship ${shipType}`);
                return false;
            }

            if (allowedSlots.includes('station') && !isStation) {
                debug('UI', `STATION RESTRICTION: ${cardType} cannot be installed on non-station ${shipType}`);
                return false;
            }

            // Valid capital ship/station, allow utility slot placement
            return slotType === 'utility';
        }

        return allowedSlots.includes(slotType);
    }

    /**
     * Check if a ship type is a capital ship
     * @param {string} shipType - The ship type to check
     * @returns {boolean} True if capital ship
     */
    static isCapitalShipType(shipType) {
        return CAPITAL_SHIP_TYPES.includes(shipType);
    }

    /**
     * Check if a ship type is a station
     * @param {string} shipType - The ship type to check
     * @returns {boolean} True if station
     */
    static isStationType(shipType) {
        return STATION_TYPES.includes(shipType);
    }

    /**
     * Check if a card type is a weapon
     * @param {string} cardType - The card type to check
     * @returns {boolean} True if weapon card
     */
    static isWeaponCard(cardType) {
        return WEAPON_CARDS.includes(cardType);
    }

    /**
     * Check if a card type is a cargo hold
     * @param {string} cardType - The card type to check
     * @returns {boolean} True if cargo hold card
     */
    static isCargoHoldCard(cardType) {
        return CARGO_HOLD_TYPES.includes(cardType);
    }

    /**
     * Get the allowed slot types for a card type
     * @param {string} cardType - The card type
     * @returns {Array<string>} Array of allowed slot types
     */
    static getAllowedSlots(cardType) {
        return CARD_TO_SLOT_MAPPING[cardType] || ['utility'];
    }

    /**
     * Get all weapon card types
     * @returns {Array<string>} Array of weapon card types
     */
    static getWeaponCardTypes() {
        return [...WEAPON_CARDS];
    }

    /**
     * Get all cargo hold card types
     * @returns {Array<string>} Array of cargo hold card types
     */
    static getCargoHoldTypes() {
        return [...CARGO_HOLD_TYPES];
    }
}

// Export constants for direct access if needed
export {
    CARD_TO_SLOT_MAPPING,
    CAPITAL_SHIP_TYPES,
    STATION_TYPES,
    WEAPON_CARDS,
    CARGO_HOLD_TYPES
};
