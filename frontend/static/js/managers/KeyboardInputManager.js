/**
 * KeyboardInputManager
 *
 * Extracted from StarfieldManager.js to reduce god class size.
 * Manages all keyboard and mouse input event handling.
 *
 * Features:
 * - Key event binding and tracking
 * - Command key handling (T, I, L, G, S, P, M, etc.)
 * - Debug key combinations (Ctrl+Shift+V/M/N/B)
 * - Speed control (number keys 0-9)
 * - Navigation keys (arrow keys)
 * - Weapon and targeting controls
 */

import { debug } from '../debug.js';

export class KeyboardInputManager {
    /**
     * Create a KeyboardInputManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager for cross-calls
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Track key presses for movement control
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
    }

    /**
     * Bind all keyboard events
     */
    bindKeyEvents() {
        debug('TARGETING', `🎯 KeyboardInputManager.bindKeyEvents() called - setting up TAB handler`);

        document.addEventListener('keydown', (event) => {

            // Basic TAB detection test
            if (event.key === 'Tab') {
                debug('TARGETING', `🎯 RAW TAB detected in KeyboardInputManager keydown handler`);
            }

            // Debug commands for testing damage (only in development)
            if (event.ctrlKey && event.shiftKey) {
                const key = event.key.toLowerCase();
                switch (key) {
                    case 'v':
                        // Damage random systems for testing
                        this.sfm.debugDamageRandomSystems();
                        event.preventDefault();
                        return;
                    case 'm':
                        // Damage hull for testing
                        this.sfm.debugDamageHull();
                        event.preventDefault();
                        return;
                    case 'n':
                        // Drain energy for testing
                        this.sfm.debugDrainEnergy();
                        event.preventDefault();
                        return;
                    case 'b':
                        // Repair all systems for testing
                        this.sfm.debugRepairAllSystems();
                        event.preventDefault();
                        return;
                }
            }

            // Debug mode toggle (Ctrl-O) for weapon hit detection
            if (event.ctrlKey && event.key.toLowerCase() === 'o') {
                event.preventDefault();

                debug('UTILITY', 'CTRL+O PRESSED: Toggling debug mode...');

                // Toggle weapon debug mode
                this.sfm.toggleDebugMode();

                // Toggle spatial debug visualization (placeholder for future implementation)
                if (window.spatialManager) {
                    debug('UTILITY', 'SpatialManager Status: Initialized and ready');
                    const stats = window.spatialManager.getStats();

                    // Future: Add debug visualization for spatial bounding volumes

                } else {
                    debug('P1', 'SpatialManager not available for debug visualization');
                }

                debug('UTILITY', 'CTRL+O DEBUG TOGGLE COMPLETE');
            }

            // Enhanced wireframe visibility toggle (Ctrl-Shift-P) for debugging wireframe issues
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
                event.preventDefault();

                debug('UTILITY', 'CTRL+SHIFT+P PRESSED: Enhancing wireframe visibility...');

                if (window.physicsManager && window.physicsManager.initialized && window.physicsManager.debugMode) {
                    window.physicsManager.enhanceWireframeVisibility();
                } else {
                    debug('P1', 'Cannot enhance wireframes - debug mode not active or physics manager not available');
                    debug('UTILITY', 'Press Ctrl+P first to enable debug mode');
                }
            }

            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = true;
            }

            // Handle number keys for speed control - only if not docked
            if (/^[0-9]$/.test(event.key) && !this.sfm.isDocked) {
                const requestedSpeed = parseInt(event.key);

                // Update impulse engines with new speed setting (this will clamp the speed)
                const ship = this.sfm.viewManager?.getShip();
                let actualSpeed = requestedSpeed; // fallback

                if (ship) {
                    const impulseEngines = ship.getSystem('impulse_engines');
                    if (impulseEngines && impulseEngines.isOperational()) {
                        // Use the system to set speed - it will handle clamping
                        impulseEngines.setImpulseSpeed(requestedSpeed);
                        actualSpeed = impulseEngines.impulseSpeed;

                        if (actualSpeed < requestedSpeed) {
                            // Speed was clamped due to engine level
                            debug('UTILITY', `Speed clamped: requested ${requestedSpeed}, actual ${actualSpeed} (engine level ${impulseEngines.level})`);
                        }
                    } else {
                        debug('P1', 'Cannot set speed - impulse engines not operational');
                        this.sfm.playCommandFailedSound();
                        return;
                    }
                }

                // Handle engine sounds
                if (this.sfm.audioManager) {
                    if (actualSpeed === 0 && this.sfm.audioManager.getEngineState() === 'running') {
                        this.sfm.playEngineShutdown();
                    } else if (actualSpeed > 0 && this.sfm.audioManager.getEngineState() !== 'running') {
                        this.sfm.playEngineStartup(actualSpeed / this.sfm.maxSpeed);
                    } else if (actualSpeed > 0) {
                        this.sfm.audioManager.updateEnginePitch(actualSpeed / this.sfm.maxSpeed);
                    }
                }

                // Update speed state
                this.sfm.targetSpeed = actualSpeed;
                if (actualSpeed > this.sfm.currentSpeed) {
                    this.sfm.decelerating = false;
                }
                this.sfm.playCommandSound();
            }

            // Handle navigation view switching with arrow keys
            // Note: viewManager handles view switching, we just pass through

            // Block Tab key default behavior while allowing event handling
            if (event.key === 'Tab') {
                event.preventDefault();
            }

            // Get the lowercase command key for easier matching
            const commandKey = event.key.toLowerCase();

            // Escape key for Help Screen
            if (event.key === 'Escape') {
                // Check if help interface exists and toggle it
                if (this.sfm.helpInterface) {
                    if (!this.sfm.helpInterface.isVisible) {
                        // Don't show help screen if docking modal is open
                        if (this.sfm.dockingModal && this.sfm.dockingModal.isOpen) {
                            return; // Let docking modal handle escape
                        }

                        this.sfm.playCommandSound();
                        this.sfm.toggleHelp();
                    } else {
                        this.sfm.playCommandSound();
                        this.sfm.toggleHelp();
                    }
                }
                return; // Don't process other keys when escape is pressed
            }

            // TAB key cycling with energy/health/damage validation
            if (event.key === 'Tab') {
                debug('TARGETING', '🎯 TAB key detected in KeyboardInputManager');

                // Check if there's an active undock cooldown
                if (this.sfm.undockCooldown && Date.now() < this.sfm.undockCooldown) {
                    const remainingSeconds = Math.ceil((this.sfm.undockCooldown - Date.now()) / 1000);
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'TARGETING SYSTEMS WARMING UP',
                        `Target computer will be available in ${remainingSeconds} seconds`
                    );
                    return;
                }

                // Only allow TAB if not docked and target computer is enabled
                if (this.sfm.isDocked) {
                    debug('TARGETING', '🎯 TAB blocked - ship is docked');
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'TARGETING UNAVAILABLE',
                        'Targeting systems offline while docked'
                    );
                    return;
                }

                // Use the target computer system for activation checks
                const ship = this.sfm.viewManager?.getShip();
                if (ship) {
                    const targetComputer = ship.getSystem('target_computer');
                    const energyReactor = ship.getSystem('energy_reactor');

                    if (!targetComputer || !targetComputer.canActivate(ship)) {
                        debug('TARGETING', `🎯 TAB blocked - target computer cannot activate`);
                        this.sfm.playCommandFailedSound();

                        // Provide specific error messages
                        if (!targetComputer) {
                            this.sfm.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!targetComputer.isOperational()) {
                            this.sfm.showHUDEphemeral(
                                'TARGET COMPUTER OFFLINE',
                                `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('target_computer')) {
                            this.sfm.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            // Energy reactor is the problem
                            if (!energyReactor) {
                                this.sfm.showHUDEphemeral(
                                    'POWER FAILURE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                this.sfm.showHUDEphemeral(
                                    'POWER FAILURE',
                                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                );
                            }
                        } else if (ship.currentEnergy < targetComputer.getEnergyConsumptionRate()) {
                            // Insufficient energy
                            const required = targetComputer.getEnergyConsumptionRate();
                            const available = Math.round(ship.currentEnergy);
                            this.sfm.showHUDEphemeral(
                                'INSUFFICIENT ENERGY',
                                `Need ${required}/sec energy. Available: ${available} units`
                            );
                        } else {
                            // Generic fallback
                            this.sfm.showHUDEphemeral(
                                'TARGET COMPUTER ACTIVATION FAILED',
                                'System requirements not met - check power and repair status'
                            );
                        }
                        return;
                    }
                }

                // Target computer is available - check if it's enabled
                if (!this.sfm.targetComputerEnabled) {
                    debug('TARGETING', '🎯 TAB blocked - target computer not enabled');
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'TARGET COMPUTER NOT ACTIVE',
                        'Press T to activate targeting computer first'
                    );
                    return;
                }

                // All checks passed - cycle targets
                debug('TARGETING', '🎯 TAB: Cycling targets via targetComputerManager');
                this.sfm.playCommandSound();

                if (event.shiftKey) {
                    // Shift+TAB = previous target
                    this.sfm.targetComputerManager?.cycleTarget(false);
                } else {
                    // TAB = next target
                    this.sfm.targetComputerManager?.cycleTarget(true);
                }

                // Sync state back from manager
                this.sfm.currentTarget = this.sfm.targetComputerManager?.currentTarget;
                this.sfm.targetIndex = this.sfm.targetComputerManager?.targetIndex;

                return; // Don't process other key handlers for TAB
            }

            // Long Range Scanner key binding (L)
            if (commandKey === 'l') {
                // Block long range scanner when docked
                if (!this.sfm.isDocked) {
                    // Check if scanner system exists and can be activated
                    const ship = this.sfm.viewManager?.getShip();
                    if (!ship) {
                        this.sfm.playCommandFailedSound();
                        this.sfm.showHUDEphemeral(
                            'LONG RANGE SCANNER UNAVAILABLE',
                            'No ship systems available'
                        );
                        return;
                    }

                    const scanner = ship.getSystem('long_range_scanner');
                    const energyReactor = ship.getSystem('energy_reactor');

                    // Check if scanner can be activated
                    if (scanner && scanner.canActivate(ship)) {
                        this.sfm.playCommandSound();
                        // Use viewManager to properly toggle scanner with view management
                        this.sfm.viewManager?.toggleLongRangeScanner?.();
                    } else {
                        // System can't be activated - provide specific error message
                        this.sfm.playCommandFailedSound();

                        if (!scanner) {
                            this.sfm.showHUDEphemeral(
                                'LONG RANGE SCANNER UNAVAILABLE',
                                'No Long Range Scanner card installed in ship slots'
                            );
                        } else if (!scanner.isOperational()) {
                            this.sfm.showHUDEphemeral(
                                'LONG RANGE SCANNER OFFLINE',
                                `System damaged (${Math.round(scanner.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('long_range_scanner')) {
                            this.sfm.showHUDEphemeral(
                                'LONG RANGE SCANNER UNAVAILABLE',
                                'No Long Range Scanner card installed in ship slots'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            // Energy reactor is the problem
                            if (!energyReactor) {
                                this.sfm.showHUDEphemeral(
                                    'POWER FAILURE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                this.sfm.showHUDEphemeral(
                                    'POWER FAILURE',
                                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                );
                            }
                        } else if (ship.currentEnergy < scanner.getEnergyConsumptionRate()) {
                            // Insufficient energy
                            const required = scanner.getEnergyConsumptionRate();
                            const available = Math.round(ship.currentEnergy);
                            this.sfm.showHUDEphemeral(
                                'INSUFFICIENT ENERGY',
                                `Need ${required}/sec energy. Available: ${available} units`
                            );
                        } else {
                            // Generic fallback
                            this.sfm.showHUDEphemeral(
                                'LONG RANGE SCANNER ACTIVATION FAILED',
                                'System requirements not met - check power and repair status'
                            );
                        }
                    }
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'LONG RANGE SCANNER UNAVAILABLE',
                        'Scanner systems offline while docked'
                    );
                }
            }

            // Galactic Chart key binding (G)
            if (commandKey === 'g') {
                // Block galactic chart when docked
                if (!this.sfm.isDocked) {
                    // Check if subspace radio system exists and can be activated (required for chart)
                    const ship = this.sfm.viewManager?.getShip();
                    if (!ship) {
                        this.sfm.playCommandFailedSound();
                        this.sfm.showHUDEphemeral(
                            'GALACTIC CHART UNAVAILABLE',
                            'No ship systems available'
                        );
                        return;
                    }

                    const radio = ship.getSystem('subspace_radio');
                    const energyReactor = ship.getSystem('energy_reactor');

                    // Check if radio can be activated (required for chart data)
                    if (radio && radio.canActivate(ship)) {
                        this.sfm.playCommandSound();
                        // Use viewManager to properly toggle chart with view management
                        this.sfm.viewManager?.toggleGalacticChart?.();
                    } else {
                        // System can't be activated - provide specific error message
                        this.sfm.playCommandFailedSound();

                        if (!radio) {
                            this.sfm.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                'No Subspace Radio installed - required for chart data reception'
                            );
                        } else if (!radio.isOperational()) {
                            this.sfm.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                `Subspace Radio damaged (${Math.round(radio.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('subspace_radio')) {
                            this.sfm.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                'No Subspace Radio installed - required for chart data reception'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            // Energy reactor is the problem
                            if (!energyReactor) {
                                this.sfm.showHUDEphemeral(
                                    'GALACTIC CHART UNAVAILABLE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                this.sfm.showHUDEphemeral(
                                    'GALACTIC CHART UNAVAILABLE',
                                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                );
                            }
                        } else if (ship.currentEnergy < radio.getEnergyConsumptionRate()) {
                            // Insufficient energy
                            const required = radio.getEnergyConsumptionRate();
                            const available = Math.round(ship.currentEnergy);
                            this.sfm.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                `Insufficient energy - need ${required}/sec. Available: ${available} units`
                            );
                        } else {
                            // Generic fallback
                            this.sfm.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                'System requirements not met - check power and repair status'
                            );
                        }
                    }
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'GALACTIC CHART UNAVAILABLE',
                        'Chart systems offline while docked'
                    );
                }
            }

            // Target Computer key binding (T)
            if (commandKey === 't') {
                // Block target computer when docked
                if (!this.sfm.isDocked) {
                    // Check if target computer system can be activated
                    const ship = this.sfm.viewManager?.getShip();
                    if (ship) {
                        const targetComputer = ship.getSystem('target_computer');
                        const energyReactor = ship.getSystem('energy_reactor');

                        if (targetComputer && targetComputer.canActivate(ship)) {
                            this.sfm.playCommandSound();
                            this.sfm.toggleTargetComputer();
                        } else {
                            // System can't be activated - provide specific error message
                            this.sfm.playCommandFailedSound();

                            if (!targetComputer) {
                                this.sfm.showHUDEphemeral(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!targetComputer.isOperational()) {
                                this.sfm.showHUDEphemeral(
                                    'TARGET COMPUTER OFFLINE',
                                    `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                                );
                            } else if (!ship.hasSystemCardsSync('target_computer')) {
                                this.sfm.showHUDEphemeral(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!energyReactor || !energyReactor.isOperational()) {
                                // Energy reactor is the problem
                                if (!energyReactor) {
                                    this.sfm.showHUDEphemeral(
                                        'POWER FAILURE',
                                        'No Energy Reactor installed - cannot power systems'
                                    );
                                } else {
                                    this.sfm.showHUDEphemeral(
                                        'POWER FAILURE',
                                        `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                    );
                                }
                            } else if (ship.currentEnergy < targetComputer.getEnergyConsumptionRate()) {
                                // Insufficient energy
                                const required = targetComputer.getEnergyConsumptionRate();
                                const available = Math.round(ship.currentEnergy);
                                this.sfm.showHUDEphemeral(
                                    'INSUFFICIENT ENERGY',
                                    `Need ${required}/sec energy. Available: ${available} units`
                                );
                            } else {
                                // Generic fallback
                                this.sfm.showHUDEphemeral(
                                    'TARGET COMPUTER ACTIVATION FAILED',
                                    'System requirements not met - check power and repair status'
                                );
                            }
                        }
                    } else {
                        this.sfm.playCommandFailedSound();
                        this.sfm.showHUDEphemeral(
                            'SHIP SYSTEMS OFFLINE',
                            'No ship systems available'
                        );
                    }
                } else {
                    this.sfm.showHUDEphemeral(
                        'TARGET COMPUTER UNAVAILABLE',
                        'Targeting systems offline while docked'
                    );
                }
            }

            // Intel key binding (I)
            if (commandKey === 'i') {
                // Block intel when docked
                if (this.sfm.isDocked) {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'INTEL UNAVAILABLE',
                        'Intelligence systems offline while docked'
                    );
                    return;
                }

                // Check if intel can be activated (requires target computer and scanner)
                const ship = this.sfm.viewManager?.getShip();
                if (!ship) {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'INTEL UNAVAILABLE',
                        'No ship systems available'
                    );
                    return;
                }

                const targetComputer = ship.getSystem('target_computer');
                const scanner = ship.getSystem('long_range_scanner');
                const energyReactor = ship.getSystem('energy_reactor');

                // Check all requirements for Intel functionality
                if (targetComputer && targetComputer.canActivate(ship) && targetComputer.hasIntelCapabilities() &&
                    scanner && scanner.canActivate(ship) &&
                    this.sfm.intelAvailable && this.sfm.targetComputerEnabled && this.sfm.currentTarget) {
                    // All requirements met - activate Intel
                    this.sfm.playCommandSound();
                    this.sfm.toggleIntel();
                } else {
                    // Intel can't be activated - provide specific error messages
                    this.sfm.playCommandFailedSound();

                    // Priority order: Target Computer issues first (most critical)
                    if (!targetComputer) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Target Computer card installed in ship slots'
                        );
                    } else if (!targetComputer.isOperational()) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            `Target Computer damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                        );
                    } else if (!ship.hasSystemCardsSync('target_computer')) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Target Computer card installed in ship slots'
                        );
                    } else if (!this.sfm.targetComputerEnabled) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'Activate Target Computer (T key) first'
                        );
                    } else if (!energyReactor || !energyReactor.isOperational()) {
                        // Energy reactor issues
                        if (!energyReactor) {
                            this.sfm.showHUDEphemeral(
                                'INTEL UNAVAILABLE',
                                'No Energy Reactor installed - cannot power systems'
                            );
                        } else {
                            this.sfm.showHUDEphemeral(
                                'INTEL UNAVAILABLE',
                                `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                            );
                        }
                    } else if (ship.currentEnergy < (targetComputer.getEnergyConsumptionRate() + (scanner?.getEnergyConsumptionRate() || 0))) {
                        // Insufficient energy for both systems
                        const required = targetComputer.getEnergyConsumptionRate() + (scanner?.getEnergyConsumptionRate() || 0);
                        const available = Math.round(ship.currentEnergy);
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            `Insufficient energy - need ${required}/sec for intel operations. Available: ${available} units`
                        );
                    } else if (!targetComputer.hasIntelCapabilities()) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'Requires Level 3+ Target Computer with intel capabilities'
                        );
                    } else if (!scanner) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Long Range Scanner card installed - required for detailed analysis'
                        );
                    } else if (!scanner.isOperational()) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            `Long Range Scanner damaged (${Math.round(scanner.healthPercentage * 100)}% health) - repair required`
                        );
                    } else if (!ship.hasSystemCardsSync('long_range_scanner')) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Long Range Scanner card installed - required for detailed analysis'
                        );
                    } else if (!this.sfm.currentTarget) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No target selected - activate Target Computer and select target first'
                        );
                    } else if (!this.sfm.intelAvailable) {
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'Target out of scanner range or intel data not available'
                        );
                    } else {
                        // Generic fallback
                        this.sfm.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'System requirements not met - check power and repair status'
                        );
                    }
                }
            }

            // Proximity Detector key binding (P)
            if (commandKey === 'p') {
                // Block proximity detector when docked
                if (!this.sfm.isDocked) {
                    // Check radar system availability like other systems
                    const ship = this.sfm.viewManager?.getShip();
                    const radarSystem = ship?.getSystem('radar');

                    if (!radarSystem) {
                        // No radar system exists (no cards installed)
                        this.sfm.playCommandFailedSound();
                        this.sfm.showHUDEphemeral(
                            'PROXIMITY DETECTOR UNAVAILABLE',
                            'No Proximity Detector card installed in ship slots'
                        );
                    } else if (!radarSystem.canActivate(ship)) {
                        // System exists but can't be activated
                        if (!radarSystem.isOperational()) {
                            this.sfm.showHUDEphemeral(
                                'PROXIMITY DETECTOR DAMAGED',
                                'Proximity Detector system requires repair'
                            );
                        } else {
                            this.sfm.showHUDEphemeral(
                                'INSUFFICIENT ENERGY',
                                'Need energy to activate proximity detector'
                            );
                        }
                        this.sfm.playCommandFailedSound();
                    } else {
                        // System available and operational - toggle it
                        this.sfm.playCommandSound();
                        this.sfm.toggleProximityDetector();
                    }
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                }
            }

            // Proximity Detector Zoom In key binding (= key, which is + without shift)
            if (event.key === '=' || event.key === '+') {
                // Only allow zoom when not docked and proximity detector is visible
                if (!this.sfm.isDocked && this.sfm.proximityDetector3D && this.sfm.proximityDetector3D.isVisible) {
                    // Zoom in (closer range) - + should zoom IN
                    if (this.sfm.proximityDetector3D.zoomIn()) {
                        this.sfm.playCommandSound();
                    } else {
                        this.sfm.playCommandFailedSound();
                    }
                } else if (this.sfm.isDocked) {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Proximity Detector Zoom Out key binding (- key)
            if (event.key === '-' || event.key === '_') {
                // Only allow zoom when not docked and proximity detector is visible
                if (!this.sfm.isDocked && this.sfm.proximityDetector3D && this.sfm.proximityDetector3D.isVisible) {
                    // Zoom out (farther range) - - should zoom OUT
                    if (this.sfm.proximityDetector3D.zoomOut()) {
                        this.sfm.playCommandSound();
                    } else {
                        this.sfm.playCommandFailedSound();
                    }
                } else if (this.sfm.isDocked) {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Proximity Detector View Mode Toggle key binding (\\ key)
            if (event.key === '\\') {
                // Only allow view mode toggle when not docked and proximity detector is visible
                if (!this.sfm.isDocked && this.sfm.proximityDetector3D && this.sfm.proximityDetector3D.isVisible) {
                    // Toggle between 3D and top-down view modes
                    if (this.sfm.proximityDetector3D.toggleViewMode()) {
                        this.sfm.playCommandSound();
                    } else {
                        this.sfm.playCommandFailedSound();
                    }
                } else if (this.sfm.isDocked) {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR VIEW UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'PROXIMITY DETECTOR VIEW UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Mission Status key binding (M)
            if (commandKey === 'm') {
                if (!this.sfm.isDocked) { // Don't show during docking
                    if (this.sfm.missionStatusHUD) {
                        // CRITICAL: Dismiss conflicting HUDs to prevent overlap
                        if (this.sfm.damageControlHUD && this.sfm.damageControlHUD.isVisible) {
                            this.sfm.damageControlHUD.hide();
                            debug('COMBAT', 'Damage Control HUD dismissed for Mission Status');
                        }

                        // Also dismiss Galactic Chart and Long Range Scanner if open
                        if (this.sfm.viewManager) {
                            if (this.sfm.viewManager.galacticChart && this.sfm.viewManager.galacticChart.isVisible()) {
                                this.sfm.viewManager.galacticChart.hide();
                                debug('MISSIONS', 'Galactic Chart dismissed for Mission Status');
                            }
                            if (this.sfm.viewManager.longRangeScanner && this.sfm.viewManager.longRangeScanner.isVisible()) {
                                this.sfm.viewManager.longRangeScanner.hide();
                                debug('MISSIONS', '🔭 Long Range Scanner dismissed for Mission Status');
                            }
                        }

                        if (this.sfm.missionStatusHUD.toggle()) {
                            this.sfm.playCommandSound();
                            debug('UI', 'Mission Status HUD toggled:', this.sfm.missionStatusHUD.visible ? 'ON' : 'OFF');
                        } else {
                            this.sfm.playCommandFailedSound();
                        }
                    } else {
                        this.sfm.playCommandFailedSound();
                        this.sfm.showHUDEphemeral(
                            'MISSION STATUS UNAVAILABLE',
                            'Mission system not initialized'
                        );
                    }
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'MISSION STATUS UNAVAILABLE',
                        'Use Mission Board while docked'
                    );
                }
            }

            // Shields key binding (S)
            if (commandKey === 's') {
                // Block shields when docked
                if (!this.sfm.isDocked) {
                    // Check if shields system can be activated
                    const ship = this.sfm.viewManager?.getShip();
                    if (ship) {
                        const shields = ship.getSystem('shields');

                        // DEBUG: Add comprehensive shield debugging
                        debug('COMBAT', '  • Shields system object:', shields);
                        debug('UI', '  • Ship has cardSystemIntegration:', !!ship.cardSystemIntegration);

                        if (ship.cardSystemIntegration) {
                            const installedCards = Array.from(ship.cardSystemIntegration.installedCards.values());
                            debug('UI', '  • Total installed cards:', installedCards.length);
                            debug('UI', '  • Installed card types:', installedCards.map(card => `${card.cardType} (L${card.level})`));

                            const shieldCards = installedCards.filter(card => card.cardType === 'shields');
                            debug('COMBAT', '  • Shield cards found:', shieldCards.length, shieldCards);

                            const hasSystemCardsResult = ship.cardSystemIntegration.hasSystemCardsSync('shields');
                            debug('UI', '  • hasSystemCardsSync result:', hasSystemCardsResult);

                            const shipHasSystemCards = ship.hasSystemCardsSync('shields', true);
                            debug('UI', '  • ship.hasSystemCardsSync result:', shipHasSystemCards);
                        }

                        if (shields && shields.canActivate(ship)) {
                            this.sfm.playCommandSound();
                            shields.toggleShields();
                        } else {
                            // System can't be activated - provide specific error message
                            if (!shields) {
                                debug('COMBAT', 'SHIELD DEBUG: No shields system found');
                                this.sfm.showHUDEphemeral(
                                    'SHIELDS UNAVAILABLE',
                                    'System not installed on this ship'
                                );
                            } else if (!shields.isOperational()) {
                                debug('COMBAT', 'SHIELD DEBUG: Shields system not operational');
                                this.sfm.showHUDEphemeral(
                                    'SHIELDS DAMAGED',
                                    'Repair system to enable shield protection'
                                );
                            } else if (!ship.hasSystemCardsSync('shields', true)) {
                                debug('COMBAT', 'SHIELD DEBUG: Missing shield cards - this is the problem!');
                                this.sfm.showHUDEphemeral(
                                    'SHIELDS MISSING',
                                    'Install shield card to enable protection'
                                );
                            } else if (!ship.hasEnergy(25)) {
                                debug('COMBAT', 'SHIELD DEBUG: Insufficient energy');
                                this.sfm.showHUDEphemeral(
                                    'INSUFFICIENT ENERGY',
                                    'Need 25 energy units to activate shields'
                                );
                            } else {
                                this.sfm.showHUDEphemeral(
                                    'SHIELDS ERROR',
                                    'System cannot be activated'
                                );
                            }
                            this.sfm.playCommandFailedSound();
                        }
                    }
                }
            }

            // Subspace Radio key binding (R) - Note: SubspaceRadio has its own R key handler
            // This is a fallback for when the system doesn't exist
            if (commandKey === 'r') {
                // DISABLED - handled by SubspaceRadio UI class to avoid conflicts
                // SubspaceRadio class properly handles R key activation and UI
            }

            // Sub-targeting key bindings (Z/X)
            if (event.key === 'z' || event.key === 'Z') {
                // Previous sub-target
                this.handleSubTargetingKey('previous');
            } else if (event.key === 'x' || event.key === 'X') {
                // Next sub-target
                this.handleSubTargetingKey('next');
            }

            // Weapon key bindings (,/. and </> keys)
            if (event.key === ',' || event.key === '<') {
                // Previous weapon selection
                if (!this.sfm.isDocked) {
                    const ship = this.sfm.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.selectPreviousWeapon()) {
                            this.sfm.playCommandSound();
                        }
                    }
                }
            } else if (event.key === '.' || event.key === '>') {
                // Next weapon selection
                if (!this.sfm.isDocked) {
                    const ship = this.sfm.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.selectNextWeapon()) {
                            this.sfm.playCommandSound();
                        }
                    }
                }
            } else if (event.key === ' ') {
                // Fire active weapon
                if (!this.sfm.isDocked) {
                    const ship = this.sfm.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.fireActiveWeapon()) {
                            // Weapon fired successfully - no command sound needed, weapon plays its own audio
                        } else {
                            // Can't fire - weapon cooldown, no ammo, or system disabled
                            // Don't play command failed sound - too noisy during combat
                        }
                    }
                }
            }

            // Autofire toggle key binding (A)
            if (commandKey === 'a') {
                if (!this.sfm.isDocked) {
                    const ship = this.sfm.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        ship.weaponSystem.toggleAutofire();
                        this.sfm.playCommandSound();
                    }
                }
            }

            // Diplomacy HUD toggle key binding (F)
            if (commandKey === 'f') {
                if (!this.sfm.isDocked) {
                    if (this.sfm.diplomacyHUD) {
                        // CRITICAL: Dismiss conflicting HUDs to prevent overlap
                        if (this.sfm.missionStatusHUD && this.sfm.missionStatusHUD.visible) {
                            this.sfm.missionStatusHUD.hide();
                            debug('FACTION', 'Mission Status HUD dismissed for Diplomacy HUD');
                        }
                        if (this.sfm.damageControlHUD && this.sfm.damageControlHUD.isVisible) {
                            this.sfm.damageControlHUD.hide();
                            debug('FACTION', 'Damage Control HUD dismissed for Diplomacy HUD');
                        }

                        this.sfm.diplomacyHUD.toggle();
                        this.sfm.playCommandSound();
                        debug('FACTION', 'Diplomacy HUD toggled');
                    }
                } else {
                    this.sfm.playCommandFailedSound();
                    this.sfm.showHUDEphemeral(
                        'DIPLOMACY UNAVAILABLE',
                        'Diplomacy systems offline while docked'
                    );
                }
            }

            // Waypoint creation key binding (W)
            if (commandKey === 'w') {
                if (!this.sfm.isDocked) {
                    this.sfm.handleWaypointCreationAsync();
                }
            }

            // Operations Report key (O) - toggle operations/damage control HUD overlay
            if (commandKey === 'o') {
                // Check if Mission Status HUD is open before dismissing
                const missionHudWasVisible = this.sfm.missionStatusHUD && this.sfm.missionStatusHUD.visible;

                // CRITICAL: Dismiss Mission Status HUD if open to prevent overlap
                if (missionHudWasVisible) {
                    this.sfm.missionStatusHUD.hide();
                    debug('COMBAT', 'Mission Status HUD dismissed for Operations Report');
                }

                // Dismiss other HUDs that might conflict
                if (this.sfm.diplomacyHUD && this.sfm.diplomacyHUD.visible) {
                    this.sfm.diplomacyHUD.hide();
                    debug('COMBAT', 'Diplomacy HUD dismissed for Operations Report');
                }

                this.sfm.playCommandSound();

                // Simple logic: If Mission HUD was visible, always show Ops HUD
                // Otherwise, toggle Ops HUD normally
                if (missionHudWasVisible) {
                    // Mission HUD was open, so FORCE show Ops HUD
                    // Set the state to closed first, then toggle to ensure it opens
                    this.sfm.damageControlVisible = false;
                    this.sfm.toggleDamageControl();
                } else {
                    // Normal toggle behavior when Mission HUD wasn't open
                    this.sfm.toggleDamageControl();
                }
            }
        }, { signal: this.sfm._abortController.signal });

        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = false;
            }
        }, { signal: this.sfm._abortController.signal });
    }

    /**
     * Bind mouse events
     */
    bindMouseEvents() {
        // Only handle clicks for weapons, no mouse look
        document.addEventListener('click', (event) => {
            // Mouse click weapons fire - currently uses SPACE key instead
        }, { signal: this.sfm._abortController.signal });
    }

    /**
     * Enhanced sub-targeting key handler with weapon type validation
     * @param {string} direction 'previous' or 'next'
     */
    handleSubTargetingKey(direction) {
        // Hide intel panel when cycling targets with Z/X keys
        if (this.sfm.intelVisible) {
            this.sfm.intelVisible = false;
            this.sfm.intelHUD.style.display = 'none';
            // Show target panels when intel is hidden
            if (this.sfm.targetComputerManager && this.sfm.targetComputerManager.targetHUD) {
                this.sfm.targetComputerManager.targetHUD.style.visibility = 'visible';
            }
        }

        // Basic requirements check
        if (this.sfm.isDocked || !this.sfm.targetComputerEnabled || !this.sfm.currentTarget) {
            this.sfm.playCommandFailedSound();
            return;
        }

        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            this.sfm.playCommandFailedSound();
            return;
        }

        const targetComputer = ship.getSystem('target_computer');

        // Check if target computer exists and supports sub-targeting (Level 3+)
        if (!targetComputer) {
            this.sfm.playCommandFailedSound();
            ship.weaponSystem?.showMessage('No Target Computer Installed', 3000);
            return;
        }

        if (!targetComputer.hasSubTargeting()) {
            this.sfm.playCommandFailedSound();
            const tcLevel = targetComputer.level;
            ship.weaponSystem?.showMessage(`Target Computer Level ${tcLevel} - Sub-targeting requires Level 3+`, 4000);
            return;
        }

        // Check current weapon compatibility
        const currentWeapon = ship.weaponSystem?.getActiveWeapon();
        if (!currentWeapon || currentWeapon.isEmpty) {
            this.sfm.playCommandFailedSound();
            ship.weaponSystem?.showMessage('No Weapon Selected', 3000);
            return;
        }

        const weaponCard = currentWeapon.equippedWeapon;
        const weaponType = weaponCard?.weaponType;
        const weaponName = weaponCard?.name || 'Current Weapon';

        // Debug weapon information
        debug('TARGETING', `🎯 Sub-targeting check for: ${weaponName}`);
        debug('COMBAT', `🎯 Weapon type: ${weaponType}`);
        debug('COMBAT', `🎯 Weapon card:`, weaponCard);

        // Check if current weapon supports sub-targeting (scan-hit weapons only)
        const canActuallyTarget = (weaponType === 'scan-hit');

        if (!canActuallyTarget) {
            // Show message that projectiles can't target but allow scanning to continue
            if (weaponType === 'splash-damage') {
                ship.weaponSystem?.showMessage(`${weaponName}: Projectile weapons don't support sub-targeting`, 4000);
            } else {
                ship.weaponSystem?.showMessage(`${weaponName}: Sub-targeting not supported (type: ${weaponType})`, 4000);
            }
            // Don't return - allow scanning to continue
        }

        // All requirements met - proceed with sub-targeting
        if (targetComputer.availableSubTargets.length <= 1) {
            this.sfm.playCommandFailedSound();
            ship.weaponSystem?.showMessage('No Additional Sub-targets Available', 3000);
        } else {
            // Cycle sub-target in the requested direction
            let success = false;
            if (direction === 'previous') {
                success = targetComputer.cycleSubTargetPrevious();
            } else {
                success = targetComputer.cycleSubTargetNext();
            }

            if (success) {
                this.sfm.playCommandSound();
                this.sfm.updateTargetDisplay(); // Update main HUD display

                // Also update Target Computer Manager display for sub-targeting UI
                if (this.sfm.targetComputerManager) {
                    this.sfm.targetComputerManager.updateTargetDisplay();
                }

                // Show brief confirmation - different message based on weapon capability
                const subTargetName = targetComputer.currentSubTarget?.displayName || 'Unknown';

                if (canActuallyTarget) {
                    // Scan-hit weapons can actually target sub-systems
                    ship.weaponSystem?.showMessage(`Targeting: ${subTargetName}`, 2000);
                } else {
                    // Projectile weapons can only scan, not target
                    const weaponTypeName = weaponType === 'splash-damage' ? 'projectiles' : weaponType;
                    ship.weaponSystem?.showMessage(`System Targeting unavailable for ${weaponTypeName}`, 3000);
                }
            } else {
                this.sfm.playCommandFailedSound();
            }
        }
    }
}
