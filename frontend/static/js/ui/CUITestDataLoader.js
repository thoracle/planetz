/**
 * CUITestDataLoader
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Loads test/demo data for card inventory system.
 *
 * Features:
 * - Generate random cards for testing
 * - Add essential system cards
 * - Add upgrade cards for testing high-level systems
 */

import { debug } from '../debug.js';

export class CUITestDataLoader {
    /**
     * Create a CUITestDataLoader
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Load test data for card inventory
     */
    loadTestData() {
        debug('UI', 'Loading test data for card inventory...');

        // Generate some random cards for testing
        for (let i = 0; i < 15; i++) {
            const card = this.cui.inventory.generateRandomCard();
            this.cui.inventory.addCard(card);
        }

        // Add essential core system cards that players need guaranteed access to
        const specificCards = [
            // Core propulsion systems
            'impulse_engines',
            'warp_drive',

            // Essential defense systems
            'shields',
            'shield_generator',
            'hull_plating',

            // Core weapon systems - energy weapons
            'laser_cannon',
            'plasma_cannon',
            'pulse_cannon',
            'phaser_array',

            // Core weapon systems - projectile weapons
            'standard_missile',
            'homing_missile',
            'photon_torpedo',
            'proximity_mine',

            // Essential navigation and communication systems
            'star_charts',              // Required for C key Star Charts functionality
            'long_range_scanner',       // Required for L key functionality
            'subspace_radio',           // Keep for quantity increase badge testing
            'target_computer',          // Required for T key functionality

            // Proximity detection systems
            'basic_radar',              // Required for P key proximity detector functionality
            'advanced_radar',           // Enhanced radar capabilities
            'tactical_radar',           // Advanced tactical radar system

            // Advanced Intel Systems (for Intel I key functionality)
            'tactical_computer',        // Level 3+ target computer with basic intel capabilities

            // Core power and utility systems
            'energy_reactor',
            'cargo_hold'
        ];

        specificCards.forEach(cardType => {
            const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
            this.cui.inventory.addCard(card);
        });

        // Add MANY more impulse engines to allow upgrading to higher levels
        debug('UI', 'Adding 25 impulse engine cards for high-level upgrades...');
        for (let i = 0; i < 25; i++) {
            const impulseEngine = this.cui.inventory.generateSpecificCard('impulse_engines', 'common');
            this.cui.inventory.addCard(impulseEngine);
        }

        // Also add multiple energy reactors for upgrading
        for (let i = 0; i < 15; i++) {
            const reactor = this.cui.inventory.generateSpecificCard('energy_reactor', 'common');
            this.cui.inventory.addCard(reactor);
        }

        // Add extra subspace radio cards for quantity increase badge testing
        debug('UI', 'Adding 3 extra subspace radio cards for quantity increase badge testing...');
        for (let i = 0; i < 3; i++) {
            const radio = this.cui.inventory.generateSpecificCard('subspace_radio', 'common');
            this.cui.inventory.addCard(radio);
        }

        // Add multiple weapon cards for upgrading
        for (let i = 0; i < 10; i++) {
            const laser = this.cui.inventory.generateSpecificCard('laser_cannon', 'common');
            this.cui.inventory.addCard(laser);

            const plasma = this.cui.inventory.generateSpecificCard('plasma_cannon', 'common');
            this.cui.inventory.addCard(plasma);
        }

        // Add multiple target computer cards for upgrading to Level 3+ for sub-targeting
        debug('TARGETING', 'Adding 12 target computer cards for sub-targeting upgrades...');
        for (let i = 0; i < 12; i++) {
            const targetComputer = this.cui.inventory.generateSpecificCard('target_computer', 'common');
            this.cui.inventory.addCard(targetComputer);
        }

        // Add multiple radar cards for upgrading proximity detector system
        debug('UI', 'Adding 10 radar cards for proximity detector upgrades...');
        for (let i = 0; i < 10; i++) {
            const basicRadar = this.cui.inventory.generateSpecificCard('basic_radar', 'common');
            this.cui.inventory.addCard(basicRadar);
        }

        debug('UTILITY', 'Test data loaded with high-level upgrade capabilities');
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
