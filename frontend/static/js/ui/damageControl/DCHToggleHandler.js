/**
 * DCHToggleHandler - System toggle and button state management
 * Extracted from DamageControlHUD.js to reduce file size.
 *
 * Handles:
 * - System toggle operations (matching keyboard shortcuts)
 * - Active state detection for various systems
 * - Button state updates
 */

import { debug } from '../../debug.js';

export class DCHToggleHandler {
    constructor(hud) {
        this.hud = hud;
    }

    // Convenience accessors
    get ship() { return this.hud.ship; }
    get starfieldManager() { return this.hud.starfieldManager; }
    get elements() { return this.hud.elements; }
    get isVisible() { return this.hud.isVisible; }

    /**
     * Get the active state for a system
     * @param {string} systemName - Name of the system
     * @param {Object} system - System object (optional)
     * @returns {boolean} True if system is active
     */
    getSystemActiveState(systemName, system = null) {
        // Get system if not provided
        if (!system) {
            system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;
        }

        // Passive systems are always considered "active" since they can't be toggled
        const passiveSystems = ['energy_reactor', 'impulse_engines', 'warp_drive', 'cargo_hold'];
        if (passiveSystems.includes(systemName)) {
            return true;
        }

        // Special handling for different system types
        switch (systemName) {
            case 'target_computer':
                // Target computer state is managed by StarfieldManager
                return this.starfieldManager && this.starfieldManager.targetComputerEnabled ? this.starfieldManager.targetComputerEnabled : false;

            case 'radar':
                // Radar state is managed by ProximityDetector3D
                return this.starfieldManager && this.starfieldManager.proximityDetector3D ? this.starfieldManager.proximityDetector3D.isVisible : false;

            case 'shields':
                // Shields have their own isShieldsUp property
                return system && system.isShieldsUp !== undefined ? system.isShieldsUp : false;

            case 'long_range_scanner':
                // Check system active state, not UI visibility
                return system && system.isActive !== undefined ? system.isActive : false;

            case 'star_charts':
                // Check system active state, not UI visibility
                return system && system.isActive !== undefined ? system.isActive : false;

            case 'galactic_chart':
                // Check system active state, not UI visibility
                return system && system.isActive !== undefined ? system.isActive : false;

            case 'subspace_radio':
                // Check the actual system's active state, not UI visibility
                return system && system.isActive !== undefined ? system.isActive : false;

            default:
                // Default to system.isActive for other systems
                return system && system.isActive !== undefined ? system.isActive : false;
        }
    }

    /**
     * Update the state of a specific button after a system toggle
     * @param {string} systemName - Name of the system
     * @param {boolean} logUpdate - Whether to log the update (default: true)
     */
    updateButtonState(systemName, logUpdate = true) {
        const button = this.elements.systemsList.querySelector(`[data-system-name="${systemName}"]`);
        if (!button) {
            if (logUpdate) debug('UI', `Button not found for system: ${systemName}`);
            return;
        }

        const system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;
        const isActive = this.getSystemActiveState(systemName, system);

        // Check if state actually changed to avoid unnecessary updates
        const currentState = button.dataset.isActive === 'true';
        if (currentState === isActive && !logUpdate) {
            return; // No change needed
        }

        // Check if this is a passive system
        const passiveSystems = ['energy_reactor', 'impulse_engines', 'warp_drive', 'cargo_hold'];
        const isPassiveSystem = passiveSystems.includes(systemName);

        // Don't update passive systems - they maintain their distinct styling
        if (isPassiveSystem) {
            return;
        }

        // Check if button is disabled (no card) - damaged systems can still be updated
        const isDisabled = button.disabled;
        if (isDisabled) {
            return; // Don't update disabled buttons (no card systems)
        }

        // Update button appearance based on new state
        if (isActive) {
            button.textContent = 'ON';
            button.style.backgroundColor = '#2a4a2a';
            button.style.color = '#00ff41';
        } else {
            button.textContent = 'OFF';
            button.style.backgroundColor = '#4a2a2a';
            button.style.color = '#ff4444';
        }

        // Update stored state for hover effects
        button.dataset.isActive = isActive.toString();
    }

    /**
     * Update all button states to reflect current system states
     * Called periodically to sync with external state changes
     */
    updateAllButtonStates() {
        if (!this.isVisible || !this.elements.systemsList) {
            return;
        }

        // Get all toggle buttons
        const buttons = this.elements.systemsList.querySelectorAll('.damage-control-toggle-btn');

        buttons.forEach(button => {
            const systemName = button.dataset.systemName;
            if (systemName) {
                this.updateButtonState(systemName, false); // Don't log routine updates
            }
        });
    }

    /**
     * Toggle a system on/off - matches keyboard shortcut behavior
     * @param {string} systemName - Name of the system to toggle
     */
    toggleSystem(systemName) {
        try {
            // Passive systems cannot be toggled
            const passiveSystems = ['energy_reactor', 'hull_plating', 'impulse_engines', 'warp_drive', 'cargo_hold'];
            if (passiveSystems.includes(systemName)) {
                debug('UI', `Cannot toggle passive system: ${systemName}`);
                return;
            }

            const ship = this.ship;
            if (!ship || !ship.getSystem) {
                debug('UI', 'No ship or ship.getSystem method available for system toggle');
                return;
            }

            const system = ship.getSystem(systemName);
            if (!system) {
                debug('UI', `System ${systemName} not found`);
                return;
            }

            debug('UI', `System ${systemName} current state: isActive=${system.isActive}, hasActivate=${typeof system.activate === 'function'}`);

            // Special handling for systems with keyboard shortcuts
            if (systemName === 'target_computer') {
                this._toggleTargetComputer(ship, system);
            } else if (systemName === 'shields') {
                this._toggleShields(ship, system);
            } else if (systemName === 'radar') {
                this._toggleRadar(ship, system);
            } else if (systemName === 'long_range_scanner') {
                this._toggleLongRangeScanner(ship, system);
            } else if (systemName === 'star_charts') {
                this._toggleStarCharts(ship, system);
            } else if (systemName === 'galactic_chart') {
                this._toggleGalacticChart(ship, system);
            } else if (systemName === 'subspace_radio') {
                this._toggleSubspaceRadio(ship, system);
            } else {
                this._toggleGenericSystem(ship, system, systemName);
            }

            // Refresh the display to update button states
            this.hud.refresh();
        } catch (error) {
            debug('UI', `Error toggling system ${systemName}: ${error.message}`);
            this.hud.refresh();
        }
    }

    _toggleTargetComputer(ship, system) {
        if (this.starfieldManager && this.starfieldManager.toggleTargetComputer) {
            const targetComputer = ship?.getSystem('target_computer');
            const energyReactor = ship?.getSystem('energy_reactor');
            const isCurrentlyOn = this.starfieldManager.targetComputerEnabled;

            if (isCurrentlyOn || (targetComputer && targetComputer.canActivate(ship))) {
                this.starfieldManager.playCommandSound();
                this.starfieldManager.toggleTargetComputer();
                this.hud._setTimeout(() => this.updateButtonState('target_computer'), 50);
            } else {
                this.starfieldManager.playCommandFailedSound();
                this._showTargetComputerError(targetComputer, energyReactor, ship);
            }
        } else {
            debug('UI', 'StarfieldManager or toggleTargetComputer method not available');
        }
    }

    _showTargetComputerError(targetComputer, energyReactor, ship) {
        if (!targetComputer) {
            this.starfieldManager.showHUDEphemeral(
                'TARGET COMPUTER UNAVAILABLE',
                'No Target Computer card installed in ship slots'
            );
        } else if (!targetComputer.isOperational()) {
            this.starfieldManager.showHUDEphemeral(
                'TARGET COMPUTER OFFLINE',
                `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
            );
        } else if (!ship.hasSystemCardsSync('target_computer')) {
            this.starfieldManager.showHUDEphemeral(
                'TARGET COMPUTER UNAVAILABLE',
                'No Target Computer card installed in ship slots'
            );
        } else if (!energyReactor || !energyReactor.isOperational()) {
            if (!energyReactor) {
                this.starfieldManager.showHUDEphemeral(
                    'POWER FAILURE',
                    'No Energy Reactor installed - cannot power systems'
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'POWER FAILURE',
                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                );
            }
        } else {
            this.starfieldManager.showHUDEphemeral(
                'TARGET COMPUTER UNAVAILABLE',
                'System requirements not met'
            );
        }
    }

    _toggleShields(ship, system) {
        const shields = ship?.getSystem('shields');
        const isCurrentlyOn = shields?.isShieldsUp || false;

        if (isCurrentlyOn || (shields && shields.canActivate(ship))) {
            this.starfieldManager.playCommandSound();
            shields.toggleShields();
            this.hud._setTimeout(() => this.updateButtonState('shields'), 50);
        } else {
            this.starfieldManager.playCommandFailedSound();
            if (!shields) {
                this.starfieldManager.showHUDEphemeral(
                    'SHIELDS UNAVAILABLE',
                    'No Shield Generator card installed in ship slots'
                );
            } else if (!shields.isOperational()) {
                this.starfieldManager.showHUDEphemeral(
                    'SHIELDS OFFLINE',
                    `Shield system damaged (${Math.round(shields.healthPercentage * 100)}% health) - repair required`
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'SHIELDS UNAVAILABLE',
                    'System requirements not met'
                );
            }
        }
        this.hud._setTimeout(() => this.updateButtonState('shields'), 50);
    }

    _toggleRadar(ship, system) {
        const radarSystem = ship?.getSystem('radar');
        const isCurrentlyOn = this.starfieldManager?.proximityDetector3D?.isVisible || false;

        if (!radarSystem) {
            this.starfieldManager.playCommandFailedSound();
            this.starfieldManager.showHUDEphemeral(
                'PROXIMITY DETECTOR UNAVAILABLE',
                'No Proximity Detector card installed in ship slots'
            );
        } else if (!isCurrentlyOn && !radarSystem.canActivate(ship)) {
            this.starfieldManager.playCommandFailedSound();
            if (!radarSystem.isOperational()) {
                this.starfieldManager.showHUDEphemeral(
                    'PROXIMITY DETECTOR DAMAGED',
                    'Proximity Detector system requires repair'
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'INSUFFICIENT ENERGY',
                    'Need energy to activate proximity detector'
                );
            }
        } else {
            this.starfieldManager.playCommandSound();
            this.starfieldManager.toggleProximityDetector();
            this.hud._setTimeout(() => this.updateButtonState('radar'), 50);
        }
    }

    _toggleLongRangeScanner(ship, system) {
        if (!this.starfieldManager.viewManager) {
            debug('UI', 'ViewManager not available for Long Range Scanner');
            return;
        }

        const scannerSystem = ship?.systems?.get('long_range_scanner');
        const isVisible = this.starfieldManager.viewManager.navigationSystemManager?.longRangeScanner?.isVisible();

        if (isVisible) {
            this.starfieldManager.playCommandSound();
            if (scannerSystem) {
                scannerSystem.stopScan();
            }
            this.starfieldManager.viewManager.navigationSystemManager?.longRangeScanner.hide();
            this.hud._setTimeout(() => this.updateButtonState('long_range_scanner'), 50);
        } else if (scannerSystem && scannerSystem.canActivate(ship)) {
            this.starfieldManager.playCommandSound();
            const scanStarted = scannerSystem.startScan(ship);
            if (scanStarted) {
                this.starfieldManager.viewManager.navigationSystemManager?.longRangeScanner.show();
                this.hud._setTimeout(() => this.updateButtonState('long_range_scanner'), 50);
            } else {
                debug('UI', 'Failed to start Long Range Scanner');
            }
        } else {
            this.starfieldManager.playCommandFailedSound();
            if (!scannerSystem) {
                this.starfieldManager.showHUDEphemeral(
                    'LONG RANGE SCANNER UNAVAILABLE',
                    'No Long Range Scanner card installed in ship slots'
                );
            } else if (!scannerSystem.isOperational()) {
                this.starfieldManager.showHUDEphemeral(
                    'LONG RANGE SCANNER OFFLINE',
                    `Scanner system damaged (${Math.round(scannerSystem.healthPercentage * 100)}% health) - repair required`
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'LONG RANGE SCANNER UNAVAILABLE',
                    'System requirements not met'
                );
            }
        }
    }

    _toggleStarCharts(ship, system) {
        if (!this.starfieldManager.viewManager) {
            debug('UI', 'ViewManager not available for Star Charts');
            return;
        }

        const starCharts = ship?.systems?.get('star_charts');
        const isVisible = this.starfieldManager.viewManager.navigationSystemManager?.starChartsUI?.isVisible();

        if (isVisible) {
            this.starfieldManager.playCommandSound();
            this.starfieldManager.viewManager.navigationSystemManager?.starChartsUI.hide();
            this.hud._setTimeout(() => this.updateButtonState('star_charts'), 50);
        } else if (starCharts && starCharts.canActivate(ship)) {
            this.starfieldManager.playCommandSound();
            this.starfieldManager.viewManager.navigationSystemManager?.starChartsUI.show();
            this.hud._setTimeout(() => this.updateButtonState('star_charts'), 50);
        } else {
            this.starfieldManager.playCommandFailedSound();
            if (!starCharts) {
                this.starfieldManager.showHUDEphemeral(
                    'STAR CHARTS UNAVAILABLE',
                    'No Star Charts card installed in ship slots'
                );
            } else if (!starCharts.isOperational()) {
                this.starfieldManager.showHUDEphemeral(
                    'STAR CHARTS OFFLINE',
                    `Star Charts system damaged (${Math.round(starCharts.healthPercentage * 100)}% health) - repair required`
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'STAR CHARTS UNAVAILABLE',
                    'System requirements not met'
                );
            }
        }
    }

    _toggleGalacticChart(ship, system) {
        if (!this.starfieldManager.viewManager) {
            debug('UI', 'ViewManager not available for Galactic Chart');
            return;
        }

        const galacticChart = ship?.systems?.get('galactic_chart');
        const isVisible = this.starfieldManager.viewManager.galacticChart?.isVisible();

        if (isVisible) {
            this.starfieldManager.playCommandSound();
            this.starfieldManager.viewManager.galacticChart.hide(true);
            this.hud._setTimeout(() => this.updateButtonState('galactic_chart'), 50);
        } else if (galacticChart && galacticChart.canActivate(ship)) {
            this.starfieldManager.playCommandSound();
            this.starfieldManager.viewManager.setView('galactic');
            this.hud._setTimeout(() => this.updateButtonState('galactic_chart'), 50);
        } else {
            this.starfieldManager.playCommandFailedSound();
            if (!galacticChart) {
                this.starfieldManager.showHUDEphemeral(
                    'GALACTIC CHART UNAVAILABLE',
                    'No Galactic Chart card installed in ship slots'
                );
            } else if (!galacticChart.isOperational()) {
                this.starfieldManager.showHUDEphemeral(
                    'GALACTIC CHART OFFLINE',
                    `Chart system damaged (${Math.round(galacticChart.healthPercentage * 100)}% health) - repair required`
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'GALACTIC CHART UNAVAILABLE',
                    'System requirements not met'
                );
            }
        }
    }

    _toggleSubspaceRadio(ship, system) {
        const radio = ship?.getSystem('subspace_radio');

        if (!radio) {
            this.starfieldManager.playCommandFailedSound();
            this.starfieldManager.showHUDEphemeral(
                'SUBSPACE RADIO UNAVAILABLE',
                'Install subspace radio card to enable communications'
            );
        } else if (!radio.canActivate(ship)) {
            this.starfieldManager.playCommandFailedSound();
            if (!radio.isOperational()) {
                this.starfieldManager.showHUDEphemeral(
                    'SUBSPACE RADIO DAMAGED',
                    'Repair system to enable communications'
                );
            } else if (!ship.hasSystemCardsSync('subspace_radio')) {
                this.starfieldManager.showHUDEphemeral(
                    'SUBSPACE RADIO MISSING',
                    'Install subspace radio card to enable communications'
                );
            } else if (!ship.hasEnergy(15)) {
                this.starfieldManager.showHUDEphemeral(
                    'INSUFFICIENT ENERGY',
                    'Need 15 energy units to activate radio'
                );
            } else {
                this.starfieldManager.showHUDEphemeral(
                    'SUBSPACE RADIO ERROR',
                    'System cannot be activated'
                );
            }
        } else {
            this.starfieldManager.playCommandSound();

            let subspaceRadioUI = null;
            if (this.starfieldManager.viewManager && this.starfieldManager.viewManager.subspaceRadio) {
                subspaceRadioUI = this.starfieldManager.viewManager.subspaceRadio;
            } else if (window.subspaceRadio) {
                subspaceRadioUI = window.subspaceRadio;
            }

            if (subspaceRadioUI && subspaceRadioUI.toggle) {
                subspaceRadioUI.toggle();
                this.hud._setTimeout(() => this.updateButtonState('subspace_radio'), 50);
            } else {
                debug('UI', 'SubspaceRadio UI not available via any access method');
            }
        }
    }

    _toggleGenericSystem(ship, system, systemName) {
        if (!system.canActivate) {
            debug('UI', `System ${systemName} does not have canActivate method`);
            return;
        }

        if (!system.canActivate(ship)) {
            debug('UI', `Cannot activate system ${systemName}`);
            return;
        }

        if (system.isActive) {
            try {
                system.deactivate();
                debug('UI', `Deactivated system: ${systemName}`);
            } catch (error) {
                debug('UI', `Error deactivating system ${systemName}: ${error.message}`);
            }
        } else {
            try {
                const result = system.activate(ship);
                if (result) {
                    debug('UI', `Activated system: ${systemName}`);
                } else {
                    debug('UI', `Failed to activate system ${systemName} - activate() returned false`);
                }
            } catch (error) {
                debug('UI', `Error activating system ${systemName}: ${error.message}`);
            }
        }
    }
}
