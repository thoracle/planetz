/**
 * NFTCard class - Represents a ship system card with NFT-like properties
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * 
 * Features:
 * - Unique token ID for each card instance
 * - Rarity-based stats progression (Common to Legendary)
 * - Metadata generation for crypto wallet compatibility  
 * - Never consumed or destroyed during upgrades
 * - Accumulate in crypto wallet simulation
 */

// Card rarity definitions with drop rates
export const CARD_RARITY = {
    COMMON: 'common',
    RARE: 'rare', 
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

// Drop rates by rarity (must sum to 100%)
export const DROP_RATES = {
    [CARD_RARITY.COMMON]: 70,      // 70% drop rate
    [CARD_RARITY.RARE]: 20,        // 20% drop rate
    [CARD_RARITY.EPIC]: 8,         // 8% drop rate
    [CARD_RARITY.LEGENDARY]: 2     // 2% drop rate
};

// Card type definitions for all ship systems
export const CARD_TYPES = {
    // Core ship systems
    HULL_PLATING: 'hull_plating',
    ENERGY_REACTOR: 'energy_reactor',
    SHIELD_GENERATOR: 'shield_generator',
    CARGO_HOLD: 'cargo_hold',
    REINFORCED_CARGO_HOLD: 'reinforced_cargo_hold',  // Damage-resistant cargo
    SHIELDED_CARGO_HOLD: 'shielded_cargo_hold',      // Scan-resistant cargo
    
    // Operational systems
    IMPULSE_ENGINES: 'impulse_engines',
    WARP_DRIVE: 'warp_drive',
    SHIELDS: 'shields',
    
    // Weapon systems
    LASER_CANNON: 'laser_cannon',
    PLASMA_CANNON: 'plasma_cannon',
    PULSE_CANNON: 'pulse_cannon',
    PHASER_ARRAY: 'phaser_array',
    DISRUPTOR_CANNON: 'disruptor_cannon',
    PARTICLE_BEAM: 'particle_beam',
    // Projectile weapons
    STANDARD_MISSILE: 'standard_missile',
    HOMING_MISSILE: 'homing_missile',
    PHOTON_TORPEDO: 'photon_torpedo',
    PROXIMITY_MINE: 'proximity_mine',
    
    // Sensor and communication systems
    LONG_RANGE_SCANNER: 'long_range_scanner',
    SUBSPACE_RADIO: 'subspace_radio',
    GALACTIC_CHART: 'galactic_chart',
    TARGET_COMPUTER: 'target_computer',
    
    // Advanced Intel Systems (Level 3+ Target Computers)
    TACTICAL_COMPUTER: 'tactical_computer',        // Level 3 - Basic intel
    COMBAT_COMPUTER: 'combat_computer',            // Level 4 - Enhanced intel
    STRATEGIC_COMPUTER: 'strategic_computer',      // Level 5 - Advanced intel
    
    // Exotic Core Systems
    QUANTUM_REACTOR: 'quantum_reactor',
    DARK_MATTER_CORE: 'dark_matter_core',
    ANTIMATTER_GENERATOR: 'antimatter_generator',
    CRYSTALLINE_MATRIX: 'crystalline_matrix',
    
    // Advanced Propulsion
    QUANTUM_DRIVE: 'quantum_drive',
    DIMENSIONAL_SHIFTER: 'dimensional_shifter',
    TEMPORAL_ENGINE: 'temporal_engine',
    GRAVITY_WELL_DRIVE: 'gravity_well_drive',
    
    // Exotic Weapons
    ION_STORM_CANNON: 'ion_storm_cannon',
    GRAVITON_BEAM: 'graviton_beam',
    QUANTUM_TORPEDO: 'quantum_torpedo',
    SINGULARITY_LAUNCHER: 'singularity_launcher',
    VOID_RIPPER: 'void_ripper',
    NANITE_SWARM: 'nanite_swarm',
    
    // Advanced Defense
    PHASE_SHIELD: 'phase_shield',
    ADAPTIVE_ARMOR: 'adaptive_armor',
    QUANTUM_BARRIER: 'quantum_barrier',
    TEMPORAL_DEFLECTOR: 'temporal_deflector',
    
    // Exotic Sensors & Tech
    QUANTUM_SCANNER: 'quantum_scanner',
    PRECOGNITION_ARRAY: 'precognition_array',
    DIMENSIONAL_RADAR: 'dimensional_radar',
    PSIONIC_AMPLIFIER: 'psionic_amplifier',
    NEURAL_INTERFACE: 'neural_interface',
    
    // Alien Technology
    ZEPHYRIAN_CRYSTAL: 'zephyrian_crystal',
    VORTHAN_MIND_LINK: 'vorthan_mind_link',
    NEXUS_HARMONIZER: 'nexus_harmonizer',
    ETHEREAL_CONDUIT: 'ethereal_conduit',
    
    // Experimental Systems
    PROBABILITY_DRIVE: 'probability_drive',
    CHAOS_FIELD_GEN: 'chaos_field_gen',
    REALITY_ANCHOR: 'reality_anchor',
    ENTROPY_REVERSER: 'entropy_reverser'
};

// Card display names
export const CARD_DISPLAY_NAMES = {
    [CARD_TYPES.HULL_PLATING]: 'Hull Plating',
    [CARD_TYPES.ENERGY_REACTOR]: 'Energy Reactor',
    [CARD_TYPES.SHIELD_GENERATOR]: 'Shield Generator',
    [CARD_TYPES.CARGO_HOLD]: 'Cargo Hold',
    [CARD_TYPES.REINFORCED_CARGO_HOLD]: 'Reinforced Cargo Hold',
    [CARD_TYPES.SHIELDED_CARGO_HOLD]: 'Shielded Cargo Hold',
    [CARD_TYPES.IMPULSE_ENGINES]: 'Impulse Engines',
    [CARD_TYPES.WARP_DRIVE]: 'Warp Drive',
    [CARD_TYPES.SHIELDS]: 'Deflector Shield Generator',
    [CARD_TYPES.LASER_CANNON]: 'Laser Cannon',
    [CARD_TYPES.PLASMA_CANNON]: 'Plasma Cannon',
    [CARD_TYPES.PULSE_CANNON]: 'Pulse Cannon',
    [CARD_TYPES.PHASER_ARRAY]: 'Phaser Array',
    [CARD_TYPES.DISRUPTOR_CANNON]: 'Disruptor Cannon',
    [CARD_TYPES.PARTICLE_BEAM]: 'Particle Beam',
    [CARD_TYPES.STANDARD_MISSILE]: 'Standard Missile',
    [CARD_TYPES.HOMING_MISSILE]: 'Homing Missile',
    [CARD_TYPES.PHOTON_TORPEDO]: 'Photon Torpedo',
    [CARD_TYPES.PROXIMITY_MINE]: 'Proximity Mine',
    [CARD_TYPES.LONG_RANGE_SCANNER]: 'Long Range Sensors',
    [CARD_TYPES.SUBSPACE_RADIO]: 'Subspace Radio',
    [CARD_TYPES.GALACTIC_CHART]: 'Galactic Chart',
    [CARD_TYPES.TARGET_COMPUTER]: 'Target Computer',
    
    // Exotic Core Systems
    [CARD_TYPES.QUANTUM_REACTOR]: 'Quantum Reactor',
    [CARD_TYPES.DARK_MATTER_CORE]: 'Dark Matter Core',
    [CARD_TYPES.ANTIMATTER_GENERATOR]: 'Antimatter Generator',
    [CARD_TYPES.CRYSTALLINE_MATRIX]: 'Crystalline Matrix',
    
    // Advanced Propulsion
    [CARD_TYPES.QUANTUM_DRIVE]: 'Quantum Drive',
    [CARD_TYPES.DIMENSIONAL_SHIFTER]: 'Dimensional Shifter',
    [CARD_TYPES.TEMPORAL_ENGINE]: 'Temporal Engine',
    [CARD_TYPES.GRAVITY_WELL_DRIVE]: 'Gravity Well Drive',
    
    // Exotic Weapons
    [CARD_TYPES.ION_STORM_CANNON]: 'Ion Storm Cannon',
    [CARD_TYPES.GRAVITON_BEAM]: 'Graviton Beam',
    [CARD_TYPES.QUANTUM_TORPEDO]: 'Quantum Torpedo',
    [CARD_TYPES.SINGULARITY_LAUNCHER]: 'Singularity Launcher',
    [CARD_TYPES.VOID_RIPPER]: 'Void Ripper',
    [CARD_TYPES.NANITE_SWARM]: 'Nanite Swarm',
    
    // Advanced Defense
    [CARD_TYPES.PHASE_SHIELD]: 'Phase Shield',
    [CARD_TYPES.ADAPTIVE_ARMOR]: 'Adaptive Armor',
    [CARD_TYPES.QUANTUM_BARRIER]: 'Quantum Barrier',
    [CARD_TYPES.TEMPORAL_DEFLECTOR]: 'Temporal Deflector',
    
    // Exotic Sensors & Tech
    [CARD_TYPES.QUANTUM_SCANNER]: 'Quantum Sensors',
    [CARD_TYPES.PRECOGNITION_ARRAY]: 'Precognition Array',
    [CARD_TYPES.DIMENSIONAL_RADAR]: 'Dimensional Radar',
    [CARD_TYPES.PSIONIC_AMPLIFIER]: 'Psionic Amplifier',
    [CARD_TYPES.NEURAL_INTERFACE]: 'Neural Interface',
    
    // Alien Technology
    [CARD_TYPES.ZEPHYRIAN_CRYSTAL]: 'Zephyrian Crystal',
    [CARD_TYPES.VORTHAN_MIND_LINK]: 'Vorthan Mind Link',
    [CARD_TYPES.NEXUS_HARMONIZER]: 'Nexus Harmonizer',
    [CARD_TYPES.ETHEREAL_CONDUIT]: 'Ethereal Conduit',
    
    // Experimental Systems
    [CARD_TYPES.PROBABILITY_DRIVE]: 'Probability Drive',
    [CARD_TYPES.CHAOS_FIELD_GEN]: 'Chaos Field Generator',
    [CARD_TYPES.REALITY_ANCHOR]: 'Reality Anchor',
    [CARD_TYPES.ENTROPY_REVERSER]: 'Entropy Reverser'
};

// Card icons for slot identification (matches ship configuration icons exactly)
export const CARD_ICONS = {
    // Core systems - match slot icons
    [CARD_TYPES.HULL_PLATING]: '🔧',        // Utility slot icon (armor now goes in utility)
    [CARD_TYPES.ENERGY_REACTOR]: '⚡',       // Power Systems slot icon
    [CARD_TYPES.SHIELD_GENERATOR]: '🔧',     // Utility slot icon (shield generators now go in utility)
    [CARD_TYPES.CARGO_HOLD]: '🔧',          // Utility slot icon (cargo goes in utility)
    [CARD_TYPES.REINFORCED_CARGO_HOLD]: '🔧',  // Utility slot icon
    [CARD_TYPES.SHIELDED_CARGO_HOLD]: '🔧',    // Utility slot icon
    
    // Operational systems - match slot icons
    [CARD_TYPES.IMPULSE_ENGINES]: '🚀',     // Engine slot icon
    [CARD_TYPES.WARP_DRIVE]: '🔧',          // Utility slot icon (warp drives now go in utility)
    [CARD_TYPES.SHIELDS]: '🔧',             // Utility slot icon (shields now go in utility)
    
    // Weapon systems - all use weapon slot icon
    [CARD_TYPES.LASER_CANNON]: '⚔️',        // Weapon slot icon
    [CARD_TYPES.PLASMA_CANNON]: '⚔️',       // Weapon slot icon
    [CARD_TYPES.PULSE_CANNON]: '⚔️',        // Weapon slot icon
    [CARD_TYPES.PHASER_ARRAY]: '⚔️',        // Weapon slot icon
    [CARD_TYPES.DISRUPTOR_CANNON]: '⚔️',    // Weapon slot icon
    [CARD_TYPES.PARTICLE_BEAM]: '⚔️',       // Weapon slot icon
    [CARD_TYPES.STANDARD_MISSILE]: '⚔️',    // Weapon slot icon
    [CARD_TYPES.HOMING_MISSILE]: '⚔️',      // Weapon slot icon
    [CARD_TYPES.PHOTON_TORPEDO]: '⚔️',      // Weapon slot icon
    [CARD_TYPES.PROXIMITY_MINE]: '⚔️',      // Weapon slot icon
    
    // Sensor and communication systems - now use utility slot icon since they go in utility slots
    [CARD_TYPES.LONG_RANGE_SCANNER]: '🔧',  // Utility slot icon (sensors go in utility)
    [CARD_TYPES.SUBSPACE_RADIO]: '🔧',      // Utility slot icon (comms go in utility)
    [CARD_TYPES.GALACTIC_CHART]: '🔧',      // Utility slot icon (navigation goes in utility)
    [CARD_TYPES.TARGET_COMPUTER]: '🔧',     // Utility slot icon (targeting goes in utility)
    
    // Exotic Core Systems - use Power Systems slot icon
    [CARD_TYPES.QUANTUM_REACTOR]: '⚡',          // Power Systems slot icon
    [CARD_TYPES.DARK_MATTER_CORE]: '⚡',         // Power Systems slot icon
    [CARD_TYPES.ANTIMATTER_GENERATOR]: '⚡',     // Power Systems slot icon
    [CARD_TYPES.CRYSTALLINE_MATRIX]: '⚡',       // Power Systems slot icon
    
    // Advanced Propulsion - use Engine slot icon
    [CARD_TYPES.QUANTUM_DRIVE]: '🚀',           // Engine slot icon
    [CARD_TYPES.DIMENSIONAL_SHIFTER]: '🚀',     // Engine slot icon
    [CARD_TYPES.TEMPORAL_ENGINE]: '🚀',         // Engine slot icon
    [CARD_TYPES.GRAVITY_WELL_DRIVE]: '🚀',      // Engine slot icon
    
    // Exotic Weapons - use Weapon slot icon
    [CARD_TYPES.ION_STORM_CANNON]: '⚔️',        // Weapon slot icon
    [CARD_TYPES.GRAVITON_BEAM]: '⚔️',           // Weapon slot icon
    [CARD_TYPES.QUANTUM_TORPEDO]: '⚔️',         // Weapon slot icon
    [CARD_TYPES.SINGULARITY_LAUNCHER]: '⚔️',    // Weapon slot icon
    [CARD_TYPES.VOID_RIPPER]: '⚔️',             // Weapon slot icon
    [CARD_TYPES.NANITE_SWARM]: '⚔️',            // Weapon slot icon
    
    // Advanced Defense - now use utility slot icon since armor goes in utility slots
    [CARD_TYPES.PHASE_SHIELD]: '🔧',           // Utility slot icon (armor now goes in utility)
    [CARD_TYPES.ADAPTIVE_ARMOR]: '🔧',          // Utility slot icon (armor now goes in utility)
    [CARD_TYPES.QUANTUM_BARRIER]: '🔧',         // Utility slot icon (armor now goes in utility)
    [CARD_TYPES.TEMPORAL_DEFLECTOR]: '🔧',      // Utility slot icon (armor now goes in utility)
    
    // Exotic Sensors & Tech - use Utility slot icon (they go in utility slots)
    [CARD_TYPES.QUANTUM_SCANNER]: '🔧',         // Utility slot icon
    [CARD_TYPES.PRECOGNITION_ARRAY]: '🔧',      // Utility slot icon
    [CARD_TYPES.DIMENSIONAL_RADAR]: '🔧',       // Utility slot icon
    [CARD_TYPES.PSIONIC_AMPLIFIER]: '🔧',       // Utility slot icon
    [CARD_TYPES.NEURAL_INTERFACE]: '🔧',        // Utility slot icon
    
    // Alien Technology - use Utility slot icon (they go in utility slots)
    [CARD_TYPES.ZEPHYRIAN_CRYSTAL]: '🔧',        // Utility slot icon (targeting enhancement goes in utility)
    [CARD_TYPES.VORTHAN_MIND_LINK]: '🔧',       // Utility slot icon (telepathic communication goes in utility)
    [CARD_TYPES.NEXUS_HARMONIZER]: '🔧',        // Utility slot icon (communication goes in utility)
    [CARD_TYPES.ETHEREAL_CONDUIT]: '🔧',        // Utility slot icon (dimensional communication goes in utility)
    
    // Experimental Systems - use Utility slot icon (they go in utility slots)
    [CARD_TYPES.PROBABILITY_DRIVE]: '🔧',       // Utility slot icon (probability targeting goes in utility)
    [CARD_TYPES.CHAOS_FIELD_GEN]: '🔧',         // Utility slot icon (chaos targeting goes in utility)
    [CARD_TYPES.REALITY_ANCHOR]: '🔧',          // Utility slot icon (reality targeting goes in utility)
    [CARD_TYPES.ENTROPY_REVERSER]: '🔧'         // Utility slot icon (entropy targeting goes in utility)
};

// Card availability by rarity - more exotic cards only appear in higher rarities
export const RARITY_CARD_POOLS = {
    [CARD_RARITY.COMMON]: [
        // Basic systems only
        CARD_TYPES.HULL_PLATING,
        CARD_TYPES.ENERGY_REACTOR,
        CARD_TYPES.SHIELD_GENERATOR,
        CARD_TYPES.CARGO_HOLD,
        CARD_TYPES.IMPULSE_ENGINES,
        CARD_TYPES.WARP_DRIVE,
        CARD_TYPES.SHIELDS,
        CARD_TYPES.LASER_CANNON,
        CARD_TYPES.PLASMA_CANNON,
        CARD_TYPES.PULSE_CANNON,
        CARD_TYPES.LONG_RANGE_SCANNER,
        CARD_TYPES.SUBSPACE_RADIO,
        CARD_TYPES.GALACTIC_CHART,
        CARD_TYPES.TARGET_COMPUTER
    ],
    [CARD_RARITY.RARE]: [
        // All common cards plus some advanced weapons
        CARD_TYPES.HULL_PLATING,
        CARD_TYPES.ENERGY_REACTOR,
        CARD_TYPES.SHIELD_GENERATOR,
        CARD_TYPES.CARGO_HOLD,
        CARD_TYPES.IMPULSE_ENGINES,
        CARD_TYPES.WARP_DRIVE,
        CARD_TYPES.SHIELDS,
        CARD_TYPES.LASER_CANNON,
        CARD_TYPES.PLASMA_CANNON,
        CARD_TYPES.PULSE_CANNON,
        CARD_TYPES.LONG_RANGE_SCANNER,
        CARD_TYPES.SUBSPACE_RADIO,
        CARD_TYPES.GALACTIC_CHART,
        CARD_TYPES.TARGET_COMPUTER,
        CARD_TYPES.PHASER_ARRAY,
        CARD_TYPES.DISRUPTOR_CANNON,
        CARD_TYPES.PARTICLE_BEAM,
        CARD_TYPES.STANDARD_MISSILE,
        CARD_TYPES.HOMING_MISSILE,
        CARD_TYPES.PHOTON_TORPEDO,
        CARD_TYPES.PROXIMITY_MINE,
        // Some exotic core systems
        CARD_TYPES.QUANTUM_REACTOR,
        CARD_TYPES.CRYSTALLINE_MATRIX,
        // Advanced cargo systems
        CARD_TYPES.REINFORCED_CARGO_HOLD
    ],
    [CARD_RARITY.EPIC]: [
        // All rare cards plus exotic systems
        CARD_TYPES.HULL_PLATING,
        CARD_TYPES.ENERGY_REACTOR,
        CARD_TYPES.SHIELD_GENERATOR,
        CARD_TYPES.CARGO_HOLD,
        CARD_TYPES.IMPULSE_ENGINES,
        CARD_TYPES.WARP_DRIVE,
        CARD_TYPES.SHIELDS,
        CARD_TYPES.LASER_CANNON,
        CARD_TYPES.PLASMA_CANNON,
        CARD_TYPES.PULSE_CANNON,
        CARD_TYPES.LONG_RANGE_SCANNER,
        CARD_TYPES.SUBSPACE_RADIO,
        CARD_TYPES.GALACTIC_CHART,
        CARD_TYPES.TARGET_COMPUTER,
        CARD_TYPES.PHASER_ARRAY,
        CARD_TYPES.DISRUPTOR_CANNON,
        CARD_TYPES.PARTICLE_BEAM,
        CARD_TYPES.STANDARD_MISSILE,
        CARD_TYPES.HOMING_MISSILE,
        CARD_TYPES.PHOTON_TORPEDO,
        CARD_TYPES.PROXIMITY_MINE,
        CARD_TYPES.QUANTUM_REACTOR,
        CARD_TYPES.CRYSTALLINE_MATRIX,
        CARD_TYPES.DARK_MATTER_CORE,
        CARD_TYPES.QUANTUM_DRIVE,
        CARD_TYPES.DIMENSIONAL_SHIFTER,
        CARD_TYPES.ION_STORM_CANNON,
        CARD_TYPES.GRAVITON_BEAM,
        CARD_TYPES.QUANTUM_TORPEDO,
        CARD_TYPES.PHASE_SHIELD,
        CARD_TYPES.ADAPTIVE_ARMOR,
        CARD_TYPES.QUANTUM_SCANNER,
        CARD_TYPES.PRECOGNITION_ARRAY,
        CARD_TYPES.ZEPHYRIAN_CRYSTAL,
        CARD_TYPES.NEURAL_INTERFACE,
        // Advanced cargo systems
        CARD_TYPES.REINFORCED_CARGO_HOLD,
        CARD_TYPES.SHIELDED_CARGO_HOLD
    ],
    [CARD_RARITY.LEGENDARY]: [
        // All epic cards plus the most exotic systems
        CARD_TYPES.HULL_PLATING,
        CARD_TYPES.ENERGY_REACTOR,
        CARD_TYPES.SHIELD_GENERATOR,
        CARD_TYPES.CARGO_HOLD,
        CARD_TYPES.IMPULSE_ENGINES,
        CARD_TYPES.WARP_DRIVE,
        CARD_TYPES.SHIELDS,
        CARD_TYPES.LASER_CANNON,
        CARD_TYPES.PLASMA_CANNON,
        CARD_TYPES.PULSE_CANNON,
        CARD_TYPES.LONG_RANGE_SCANNER,
        CARD_TYPES.SUBSPACE_RADIO,
        CARD_TYPES.GALACTIC_CHART,
        CARD_TYPES.TARGET_COMPUTER,
        CARD_TYPES.PHASER_ARRAY,
        CARD_TYPES.DISRUPTOR_CANNON,
        CARD_TYPES.PARTICLE_BEAM,
        CARD_TYPES.STANDARD_MISSILE,
        CARD_TYPES.HOMING_MISSILE,
        CARD_TYPES.PHOTON_TORPEDO,
        CARD_TYPES.PROXIMITY_MINE,
        CARD_TYPES.QUANTUM_REACTOR,
        CARD_TYPES.CRYSTALLINE_MATRIX,
        CARD_TYPES.DARK_MATTER_CORE,
        CARD_TYPES.QUANTUM_DRIVE,
        CARD_TYPES.DIMENSIONAL_SHIFTER,
        CARD_TYPES.ION_STORM_CANNON,
        CARD_TYPES.GRAVITON_BEAM,
        CARD_TYPES.QUANTUM_TORPEDO,
        CARD_TYPES.PHASE_SHIELD,
        CARD_TYPES.ADAPTIVE_ARMOR,
        CARD_TYPES.QUANTUM_SCANNER,
        CARD_TYPES.PRECOGNITION_ARRAY,
        CARD_TYPES.ZEPHYRIAN_CRYSTAL,
        CARD_TYPES.NEURAL_INTERFACE,
        CARD_TYPES.ANTIMATTER_GENERATOR,
        CARD_TYPES.TEMPORAL_ENGINE,
        CARD_TYPES.GRAVITY_WELL_DRIVE,
        CARD_TYPES.SINGULARITY_LAUNCHER,
        CARD_TYPES.VOID_RIPPER,
        CARD_TYPES.NANITE_SWARM,
        CARD_TYPES.QUANTUM_BARRIER,
        CARD_TYPES.TEMPORAL_DEFLECTOR,
        CARD_TYPES.DIMENSIONAL_RADAR,
        CARD_TYPES.PSIONIC_AMPLIFIER,
        CARD_TYPES.VORTHAN_MIND_LINK,
        CARD_TYPES.NEXUS_HARMONIZER,
        CARD_TYPES.ETHEREAL_CONDUIT,
        CARD_TYPES.PROBABILITY_DRIVE,
        CARD_TYPES.CHAOS_FIELD_GEN,
        CARD_TYPES.REALITY_ANCHOR,
        CARD_TYPES.ENTROPY_REVERSER,
        // Advanced cargo systems
        CARD_TYPES.REINFORCED_CARGO_HOLD,
        CARD_TYPES.SHIELDED_CARGO_HOLD
    ]
};

// Upgrade requirements (Clash Royale style)
export const UPGRADE_REQUIREMENTS = {
    1: 0,   // Level 1 (base level)
    2: 3,   // Level 1→2: 3x cards
    3: 6,   // Level 2→3: 6x cards  
    4: 12,  // Level 3→4: 12x cards
    5: 24   // Level 4→5: 24x cards
};

/**
 * NFTCard class - Represents a single NFT card
 */
export default class NFTCard {
    /**
     * Create an NFT card
     * @param {string} cardType - Type of card (from CARD_TYPES)
     * @param {string} rarity - Rarity level (from CARD_RARITY)
     * @param {string} tokenId - Unique token identifier
     */
    constructor(cardType, rarity = CARD_RARITY.COMMON, tokenId = null) {
        // Validate card type
        if (!Object.values(CARD_TYPES).includes(cardType)) {
            throw new Error(`Invalid card type: ${cardType}`);
        }
        
        // Validate rarity
        if (!Object.values(CARD_RARITY).includes(rarity)) {
            throw new Error(`Invalid rarity: ${rarity}`);
        }
        
        // Core properties
        this.cardType = cardType;
        this.rarity = rarity;
        this.tokenId = tokenId || this.generateTokenId();
        this.quantity = 1; // Always 1 for NFTs
        this.discovered = false; // For silhouette display
        
        // Metadata (ERC-721 compatible)
        this.metadata = {
            name: CARD_DISPLAY_NAMES[cardType] || cardType,
            description: this.generateDescription(),
            image: this.generateImagePath(),
            attributes: this.generateAttributes()
        };
        
        // Creation timestamp
        this.createdAt = Date.now();
    }
    
    /**
     * Generate a unique token ID
     * @returns {string} Unique token identifier
     */
    generateTokenId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `0x${timestamp}${random}`;
    }
    
    /**
     * Generate card description based on type and rarity
     * @returns {string} Card description
     */
    generateDescription() {
        const rarityDescriptions = {
            [CARD_RARITY.COMMON]: 'A standard ship system component.',
            [CARD_RARITY.RARE]: 'An enhanced ship system with improved performance.',
            [CARD_RARITY.EPIC]: 'A high-performance ship system with advanced capabilities.',
            [CARD_RARITY.LEGENDARY]: 'A legendary ship system of unmatched power and efficiency.'
        };
        
        const baseDescription = rarityDescriptions[this.rarity];
        const systemName = CARD_DISPLAY_NAMES[this.cardType] || this.cardType;
        
        return `${systemName} - ${baseDescription}`;
    }
    
    /**
     * Generate image path for the card
     * @returns {string} Path to card image
     */
    generateImagePath() {
        // For now, return a placeholder path
        // In the future, this would point to actual card artwork
        return `/images/cards/${this.cardType}_${this.rarity}.png`;
    }
    
    /**
     * Generate NFT attributes array
     * @returns {Array} Array of attribute objects
     */
    generateAttributes() {
        return [
            {
                trait_type: 'System Type',
                value: CARD_DISPLAY_NAMES[this.cardType] || this.cardType
            },
            {
                trait_type: 'Rarity',
                value: this.rarity.charAt(0).toUpperCase() + this.rarity.slice(1)
            },
            {
                trait_type: 'Category',
                value: this.getSystemCategory()
            },
            {
                trait_type: 'Drop Rate',
                value: `${DROP_RATES[this.rarity]}%`
            }
        ];
    }
    
    /**
     * Get the system category for this card type
     * @returns {string} System category
     */
    getSystemCategory() {
        const coreSystemTypes = [
            CARD_TYPES.HULL_PLATING,
            CARD_TYPES.ENERGY_REACTOR,
            CARD_TYPES.SHIELD_GENERATOR,
            CARD_TYPES.SHIELDS,  // Deflector Shields are a type of Shield Generator
            CARD_TYPES.CARGO_HOLD,
            CARD_TYPES.REINFORCED_CARGO_HOLD,
            CARD_TYPES.SHIELDED_CARGO_HOLD,
            // Exotic Core Systems
            CARD_TYPES.QUANTUM_REACTOR,
            CARD_TYPES.DARK_MATTER_CORE,
            CARD_TYPES.ANTIMATTER_GENERATOR,
            CARD_TYPES.CRYSTALLINE_MATRIX
        ];
        
        const weaponSystemTypes = [
            CARD_TYPES.LASER_CANNON,
            CARD_TYPES.PLASMA_CANNON,
            CARD_TYPES.PULSE_CANNON,
            CARD_TYPES.PHASER_ARRAY,
            CARD_TYPES.DISRUPTOR_CANNON,
            CARD_TYPES.PARTICLE_BEAM,
            CARD_TYPES.STANDARD_MISSILE,
            CARD_TYPES.HOMING_MISSILE,
            CARD_TYPES.PHOTON_TORPEDO,
            CARD_TYPES.PROXIMITY_MINE,
            // Exotic Weapons
            CARD_TYPES.ION_STORM_CANNON,
            CARD_TYPES.GRAVITON_BEAM,
            CARD_TYPES.QUANTUM_TORPEDO,
            CARD_TYPES.SINGULARITY_LAUNCHER,
            CARD_TYPES.VOID_RIPPER,
            CARD_TYPES.NANITE_SWARM
        ];
        
        const operationalSystemTypes = [
            CARD_TYPES.IMPULSE_ENGINES,
            CARD_TYPES.WARP_DRIVE,
            // Advanced Propulsion
            CARD_TYPES.QUANTUM_DRIVE,
            CARD_TYPES.DIMENSIONAL_SHIFTER,
            CARD_TYPES.TEMPORAL_ENGINE,
            CARD_TYPES.GRAVITY_WELL_DRIVE,
            // Advanced Defense
            CARD_TYPES.PHASE_SHIELD,
            CARD_TYPES.ADAPTIVE_ARMOR,
            CARD_TYPES.QUANTUM_BARRIER,
            CARD_TYPES.TEMPORAL_DEFLECTOR
        ];
        
        const sensorSystemTypes = [
            CARD_TYPES.LONG_RANGE_SCANNER,
            CARD_TYPES.SUBSPACE_RADIO,
            CARD_TYPES.GALACTIC_CHART,
            CARD_TYPES.TARGET_COMPUTER,
            // Exotic Sensors & Tech
            CARD_TYPES.QUANTUM_SCANNER,
            CARD_TYPES.PRECOGNITION_ARRAY,
            CARD_TYPES.DIMENSIONAL_RADAR,
            CARD_TYPES.PSIONIC_AMPLIFIER,
            CARD_TYPES.NEURAL_INTERFACE
        ];
        
        const alienTechTypes = [
            CARD_TYPES.ZEPHYRIAN_CRYSTAL,
            CARD_TYPES.VORTHAN_MIND_LINK,
            CARD_TYPES.NEXUS_HARMONIZER,
            CARD_TYPES.ETHEREAL_CONDUIT
        ];
        
        const experimentalTypes = [
            CARD_TYPES.PROBABILITY_DRIVE,
            CARD_TYPES.CHAOS_FIELD_GEN,
            CARD_TYPES.REALITY_ANCHOR,
            CARD_TYPES.ENTROPY_REVERSER
        ];
        
        if (coreSystemTypes.includes(this.cardType)) {
            return 'Core Systems';
        } else if (weaponSystemTypes.includes(this.cardType)) {
            return 'Weapon Systems';
        } else if (operationalSystemTypes.includes(this.cardType)) {
            return 'Operational Systems';
        } else if (sensorSystemTypes.includes(this.cardType)) {
            return 'Sensor Systems';
        } else if (alienTechTypes.includes(this.cardType)) {
            return 'Alien Technology';
        } else if (experimentalTypes.includes(this.cardType)) {
            return 'Experimental Systems';
        } else {
            return 'Unknown';
        }
    }
    
    /**
     * Check if this card has been discovered
     * @returns {boolean} True if discovered
     */
    isDiscovered() {
        return this.discovered;
    }
    
    /**
     * Mark this card as discovered
     */
    discover() {
        if (!this.discovered) {
            this.discovered = true;
        }
    }
    
    /**
     * Get card metadata (ERC-721 compatible)
     * @returns {Object} Card metadata
     */
    getMetadata() {
        return {
            ...this.metadata,
            tokenId: this.tokenId,
            rarity: this.rarity,
            discovered: this.discovered,
            createdAt: this.createdAt
        };
    }
    
    /**
     * Get card display name
     * @returns {string} Display name
     */
    getDisplayName() {
        return this.metadata.name;
    }
    
    /**
     * Get rarity color for UI display
     * @returns {string} CSS color value
     */
    getRarityColor() {
        const rarityColors = {
            [CARD_RARITY.COMMON]: '#9CA3AF',     // Gray
            [CARD_RARITY.RARE]: '#3B82F6',      // Blue
            [CARD_RARITY.EPIC]: '#8B5CF6',      // Purple
            [CARD_RARITY.LEGENDARY]: '#F59E0B'  // Orange/Gold
        };
        
        return rarityColors[this.rarity] || rarityColors[CARD_RARITY.COMMON];
    }

    /**
     * Get card icon for slot identification
     * @returns {string} Emoji icon representing the card type
     */
    getIcon() {
        return CARD_ICONS[this.cardType] || '❓';
    }

    /**
     * Get card stats based on type and rarity
     * @returns {Object} Card stats object
     */
    getStats() {
        // Base stats by card type
        const baseStats = {
            // Original systems
            [CARD_TYPES.IMPULSE_ENGINES]: { power: 15, mass: 8, efficiency: 1.0 },
            [CARD_TYPES.WARP_DRIVE]: { power: 25, mass: 12, efficiency: 1.0 },
            [CARD_TYPES.SHIELD_GENERATOR]: { power: 20, mass: 10, shieldStrength: 100 },
            [CARD_TYPES.SHIELDS]: { power: 15, mass: 8, shieldStrength: 80 },
            [CARD_TYPES.LASER_CANNON]: { power: 12, mass: 6, damage: 25 },
            [CARD_TYPES.PLASMA_CANNON]: { power: 18, mass: 9, damage: 35 },
            [CARD_TYPES.PULSE_CANNON]: { power: 14, mass: 7, damage: 28 },
            [CARD_TYPES.PHASER_ARRAY]: { power: 22, mass: 11, damage: 40 },
            [CARD_TYPES.DISRUPTOR_CANNON]: { power: 20, mass: 10, damage: 38 },
            [CARD_TYPES.PARTICLE_BEAM]: { power: 24, mass: 12, damage: 42 },
            [CARD_TYPES.STANDARD_MISSILE]: { power: 16, mass: 8, damage: 50 },
            [CARD_TYPES.HOMING_MISSILE]: { power: 18, mass: 9, damage: 55 },
            [CARD_TYPES.PHOTON_TORPEDO]: { power: 18, mass: 9, damage: 55 },
            [CARD_TYPES.PROXIMITY_MINE]: { power: 18, mass: 9, damage: 55 },
            [CARD_TYPES.LONG_RANGE_SCANNER]: { power: 8, mass: 4, range: 1000 },
            [CARD_TYPES.SUBSPACE_RADIO]: { power: 6, mass: 3, range: 500 },
            [CARD_TYPES.GALACTIC_CHART]: { power: 4, mass: 2, accuracy: 1.0 },
            [CARD_TYPES.TARGET_COMPUTER]: { power: 10, mass: 5, accuracy: 1.2 },
            [CARD_TYPES.HULL_PLATING]: { power: 0, mass: 15, armor: 50 },
            [CARD_TYPES.ENERGY_REACTOR]: { power: -30, mass: 20, energyOutput: 100 },
            [CARD_TYPES.CARGO_HOLD]: { power: 2, mass: 12, capacity: 100 },
            [CARD_TYPES.REINFORCED_CARGO_HOLD]: { power: 3, mass: 18, capacity: 80, armor: 25, durability: 2.0 },
            [CARD_TYPES.SHIELDED_CARGO_HOLD]: { power: 5, mass: 15, capacity: 90, stealth: 1.5, scanResistance: 3.0 },
            
            // Exotic Core Systems
            [CARD_TYPES.QUANTUM_REACTOR]: { power: -50, mass: 15, energyOutput: 200 },
            [CARD_TYPES.DARK_MATTER_CORE]: { power: -80, mass: 25, energyOutput: 350 },
            [CARD_TYPES.ANTIMATTER_GENERATOR]: { power: -100, mass: 30, energyOutput: 500 },
            [CARD_TYPES.CRYSTALLINE_MATRIX]: { power: -40, mass: 12, energyOutput: 180, efficiency: 1.5 },
            
            // Advanced Propulsion
            [CARD_TYPES.QUANTUM_DRIVE]: { power: 40, mass: 18, efficiency: 2.0, speed: 150 },
            [CARD_TYPES.DIMENSIONAL_SHIFTER]: { power: 60, mass: 25, efficiency: 3.0, speed: 200 },
            [CARD_TYPES.TEMPORAL_ENGINE]: { power: 80, mass: 35, efficiency: 4.0, speed: 300 },
            [CARD_TYPES.GRAVITY_WELL_DRIVE]: { power: 70, mass: 30, efficiency: 3.5, speed: 250 },
            
            // Exotic Weapons
            [CARD_TYPES.ION_STORM_CANNON]: { power: 35, mass: 18, damage: 80, range: 1200 },
            [CARD_TYPES.GRAVITON_BEAM]: { power: 45, mass: 22, damage: 100, range: 1500 },
            [CARD_TYPES.QUANTUM_TORPEDO]: { power: 30, mass: 15, damage: 120, range: 2000 },
            [CARD_TYPES.SINGULARITY_LAUNCHER]: { power: 60, mass: 35, damage: 200, range: 2500 },
            [CARD_TYPES.VOID_RIPPER]: { power: 80, mass: 40, damage: 300, range: 1800 },
            [CARD_TYPES.NANITE_SWARM]: { power: 25, mass: 12, damage: 60, special: 'self-repair' },
            
            // Advanced Defense
            [CARD_TYPES.PHASE_SHIELD]: { power: 30, mass: 15, shieldStrength: 200, special: 'phase' },
            [CARD_TYPES.ADAPTIVE_ARMOR]: { power: 5, mass: 20, armor: 120, special: 'adaptive' },
            [CARD_TYPES.QUANTUM_BARRIER]: { power: 50, mass: 25, shieldStrength: 350, special: 'quantum' },
            [CARD_TYPES.TEMPORAL_DEFLECTOR]: { power: 40, mass: 18, shieldStrength: 250, special: 'temporal' },
            
            // Exotic Sensors & Tech
            [CARD_TYPES.QUANTUM_SCANNER]: { power: 20, mass: 8, range: 5000, accuracy: 2.0 },
            [CARD_TYPES.PRECOGNITION_ARRAY]: { power: 35, mass: 15, range: 3000, special: 'precognition' },
            [CARD_TYPES.DIMENSIONAL_RADAR]: { power: 25, mass: 12, range: 8000, special: 'dimensional' },
            [CARD_TYPES.PSIONIC_AMPLIFIER]: { power: 30, mass: 10, range: 2000, special: 'psionic' },
            [CARD_TYPES.NEURAL_INTERFACE]: { power: 15, mass: 5, efficiency: 2.0, special: 'neural' },
            
            // Alien Technology
            [CARD_TYPES.ZEPHYRIAN_CRYSTAL]: { power: -20, mass: 8, energyOutput: 150, special: 'zephyrian' },
            [CARD_TYPES.VORTHAN_MIND_LINK]: { power: 25, mass: 6, range: 10000, special: 'telepathic' },
            [CARD_TYPES.NEXUS_HARMONIZER]: { power: 40, mass: 20, efficiency: 3.0, special: 'harmonic' },
            [CARD_TYPES.ETHEREAL_CONDUIT]: { power: 60, mass: 15, special: 'ethereal', phaseShift: true },
            
            // Experimental Systems
            [CARD_TYPES.PROBABILITY_DRIVE]: { power: 50, mass: 25, special: 'probability', luck: 2.0 },
            [CARD_TYPES.CHAOS_FIELD_GEN]: { power: 45, mass: 20, damage: 150, special: 'chaos' },
            [CARD_TYPES.REALITY_ANCHOR]: { power: 35, mass: 30, shieldStrength: 400, special: 'reality' },
            [CARD_TYPES.ENTROPY_REVERSER]: { power: 55, mass: 28, special: 'entropy', repair: 3.0 }
        };

        // Rarity multipliers
        const rarityMultipliers = {
            [CARD_RARITY.COMMON]: 1.0,
            [CARD_RARITY.RARE]: 1.25,
            [CARD_RARITY.EPIC]: 1.5,
            [CARD_RARITY.LEGENDARY]: 2.0
        };

        const base = baseStats[this.cardType] || { power: 5, mass: 3 };
        const multiplier = rarityMultipliers[this.rarity] || 1.0;

        // Apply rarity multiplier to all stats except special properties
        const stats = {};
        Object.keys(base).forEach(key => {
            if (typeof base[key] === 'number') {
                stats[key] = Math.round(base[key] * multiplier);
            } else {
                stats[key] = base[key]; // Keep special properties as-is
            }
        });

        return stats;
    }
    
    /**
     * Get upgrade requirement for a specific level
     * @param {number} targetLevel - Target upgrade level
     * @returns {number} Number of cards required
     */
    static getUpgradeRequirement(targetLevel) {
        return UPGRADE_REQUIREMENTS[targetLevel] || 0;
    }
    
    /**
     * Create a card from JSON data
     * @param {Object} data - Card data
     * @returns {NFTCard} New NFTCard instance
     */
    static fromJSON(data) {
        const card = new NFTCard(data.cardType, data.rarity, data.tokenId);
        card.discovered = data.discovered || false;
        card.createdAt = data.createdAt || Date.now();
        return card;
    }
    
    /**
     * Convert card to JSON for storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            cardType: this.cardType,
            rarity: this.rarity,
            tokenId: this.tokenId,
            quantity: this.quantity,
            discovered: this.discovered,
            metadata: this.metadata,
            createdAt: this.createdAt
        };
    }
    
    /**
     * Clone this card (for stacking purposes)
     * @returns {NFTCard} New card instance with different token ID
     */
    clone() {
        const clonedCard = new NFTCard(this.cardType, this.rarity);
        clonedCard.discovered = this.discovered;
        return clonedCard;
    }
} 