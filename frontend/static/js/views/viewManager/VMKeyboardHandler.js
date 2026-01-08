/**
 * VMKeyboardHandler - Keyboard event handling for view switching
 * Extracted from ViewManager.js to reduce file size.
 *
 * Handles:
 * - G key: Galactic Chart toggle
 * - L key: Long Range Scanner toggle
 * - C key: Star Charts toggle
 * - F/A keys: Fore/Aft view switching
 * - S key: Shield toggle (delegated to StarfieldManager)
 * - D key: Diplomacy Report (delegated to KeyboardInputManager)
 */

import { debug } from '../../debug.js';

export const VIEW_TYPES = {
    FORE: 'fore',
    AFT: 'aft',
    GALACTIC: 'galactic',
    SCANNER: 'scanner'
};

export class VMKeyboardHandler {
    constructor(viewManager) {
        this.vm = viewManager;
        this._boundKeydownHandler = null;
    }

    /**
     * Bind keyboard event listeners
     */
    bindKeyEvents() {
        this._boundKeydownHandler = (event) => {
            if (this.vm.editMode) return;

            const key = event.key.toLowerCase();
            const isGalacticChartVisible = this.vm.galacticChart.isVisible();
            const isLongRangeScannerVisible = this.vm.navigationSystemManager?.isNavigationVisible();
            const isDocked = this.vm.starfieldManager?.isDocked;

            if (key === 'g') {
                this.handleGalacticChartKey(event, isDocked, isGalacticChartVisible, isLongRangeScannerVisible);
            } else if (key === 'l') {
                this.handleLongRangeScannerKey(event, isDocked, isGalacticChartVisible);
            } else if (key === 'c') {
                this.handleStarChartsKey(event, isDocked, isGalacticChartVisible);
            } else if (key === 's' && !isDocked) {
                // Shield toggle - handled by StarfieldManager
                event.preventDefault();
                event.stopPropagation();
                debug('COMBAT', 'Shield key pressed - handled by StarfieldManager');
            } else if (key === ' ' && !isDocked) {
                // Space key - weapon firing handled by StarfieldManager
                event.preventDefault();
                event.stopPropagation();
            } else if (key === 'd') {
                // Diplomacy Report - handled by KeyboardInputManager
                event.preventDefault();
                event.stopPropagation();
                debug('FACTION', 'Diplomacy key pressed - handled by KeyboardInputManager');
            } else if (!isDocked && key === 'f' && (this.vm.currentView === VIEW_TYPES.AFT || isGalacticChartVisible || isLongRangeScannerVisible)) {
                event.preventDefault();
                event.stopPropagation();
                this.vm.starfieldManager?.playCommandSound();
                this.vm.setView(VIEW_TYPES.FORE);
            } else if (!isDocked && key === 'a' && (this.vm.currentView === VIEW_TYPES.FORE || isGalacticChartVisible || isLongRangeScannerVisible)) {
                event.preventDefault();
                event.stopPropagation();
                this.vm.starfieldManager?.playCommandSound();
                this.vm.setView(VIEW_TYPES.AFT);
            }
        };
        document.addEventListener('keydown', this._boundKeydownHandler);
    }

    /**
     * Handle G key for Galactic Chart
     */
    handleGalacticChartKey(event, isDocked, isGalacticChartVisible, isLongRangeScannerVisible) {
        if (isDocked) return;

        debug('UI', 'G key pressed:', {
            isGalacticChartVisible,
            isLongRangeScannerVisible,
            currentView: this.vm.currentView,
            previousView: this.vm.previousView,
            isDocked
        });

        event.preventDefault();
        event.stopPropagation();

        const chartSystem = this.vm.ship.systems.get('galactic_chart');

        if (isGalacticChartVisible) {
            debug('UTILITY', 'Restoring previous view');
            if (chartSystem) {
                chartSystem.deactivateChart();
            }
            this.vm.galacticChart.hide(true);
        } else {
            // Check if chart system is available
            if (!chartSystem) {
                debug('UI', 'No Galactic Chart system found on ship');
                if (this.vm.starfieldManager?.showHUDError) {
                    this.vm.starfieldManager.showHUDError(
                        'GALACTIC CHART UNAVAILABLE',
                        'System not installed on this ship'
                    );
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            // Check operability
            if (!chartSystem.isOperational()) {
                debug('UI', 'Cannot use Galactic Chart: System damaged or offline');
                if (this.vm.starfieldManager?.showHUDError) {
                    this.vm.starfieldManager.showHUDError(
                        'GALACTIC CHART DAMAGED',
                        'Repair system to enable navigation'
                    );
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            // Check if chart cards are installed
            let hasChartCards = false;
            try {
                if (this.vm.ship.hasSystemCards && typeof this.vm.ship.hasSystemCards === 'function') {
                    hasChartCards = this.vm.ship.hasSystemCards('galactic_chart');
                    debug('UI', `🗺️ ViewManager G key: Card check result:`, hasChartCards);
                } else {
                    hasChartCards = true;
                    debug('UI', `🗺️ ViewManager G key: No card system - allowing access`);
                }
            } catch (error) {
                debug('UI', 'Chart card check failed:', error);
                hasChartCards = false;
            }

            debug('UI', `🗺️ ViewManager G key: Final hasChartCards result:`, hasChartCards);

            if (!hasChartCards) {
                debug('UI', 'Cannot use Galactic Chart: No chart cards installed');
                if (this.vm.starfieldManager?.showHUDError) {
                    this.vm.starfieldManager.showHUDError(
                        'GALACTIC CHART CARDS MISSING',
                        'Install galactic chart cards to enable navigation'
                    );
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            // Play command sound
            this.vm.starfieldManager?.playCommandSound?.();

            // Try to activate chart system
            let chartFullyActivated = false;
            if (chartSystem.canActivate(this.vm.ship)) {
                chartFullyActivated = chartSystem.activateChart(this.vm.ship);
                if (chartFullyActivated) {
                    debug('UTILITY', 'Galactic Chart fully activated with scanning capabilities');
                }
            } else {
                debug('NAVIGATION', 'Galactic Chart opened in navigation-only mode');
            }

            // Hide scanner if visible
            if (isLongRangeScannerVisible) {
                debug('UTILITY', 'Hiding scanner before showing galactic chart');
                const scannerSystem = this.vm.ship.systems.get('long_range_scanner');
                if (scannerSystem) {
                    scannerSystem.stopScan();
                }
                this.vm.navigationSystemManager?.hideNavigationInterface();
            }

            debug('UTILITY', 'Setting view to GALACTIC');
            this.vm.setView(VIEW_TYPES.GALACTIC);
        }
    }

    /**
     * Handle L key for Long Range Scanner
     */
    handleLongRangeScannerKey(event, isDocked, isGalacticChartVisible) {
        if (isDocked) return;

        event.preventDefault();
        event.stopPropagation();

        const scannerSystem = this.vm.ship.systems.get('long_range_scanner');

        if (this.vm.navigationSystemManager?.longRangeScanner?.isVisible()) {
            debug('UTILITY', 'Hiding Long Range Scanner');
            if (scannerSystem) {
                scannerSystem.stopScan();
            }
            this.vm.navigationSystemManager.longRangeScanner.hide();
        } else {
            // Check if scanner system is available
            if (!scannerSystem) {
                debug('UI', 'No Long Range Scanner system found on ship');
                if (this.vm.starfieldManager?.showHUDError) {
                    this.vm.starfieldManager.showHUDError(
                        'LONG RANGE SCANNER UNAVAILABLE',
                        'System not installed on this ship'
                    );
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            if (!scannerSystem.canActivate(this.vm.ship)) {
                if (!scannerSystem.isOperational()) {
                    debug('UI', 'Cannot activate Long Range Scanner: System damaged or offline');
                    if (this.vm.starfieldManager?.showHUDError) {
                        this.vm.starfieldManager.showHUDError(
                            'LONG RANGE SCANNER DAMAGED',
                            'Repair system to enable scanner operations'
                        );
                    }
                } else {
                    debug('UI', 'Cannot activate Long Range Scanner: Insufficient energy');
                    if (this.vm.starfieldManager?.showHUDError) {
                        this.vm.starfieldManager.showHUDError(
                            'INSUFFICIENT ENERGY',
                            'Need 20 energy units to activate scanner'
                        );
                    }
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            // Play command sound
            this.vm.starfieldManager?.playCommandSound?.();

            // Start scanning
            const scanStarted = scannerSystem.startScan(this.vm.ship);
            if (!scanStarted) {
                debug('UI', 'Failed to start Long Range Scanner');
                return;
            }

            // Hide galactic chart if visible
            if (isGalacticChartVisible) {
                debug('UTILITY', 'Hiding galactic chart before showing scanner');
                const chartSystem = this.vm.ship.systems.get('galactic_chart');
                if (chartSystem) {
                    chartSystem.deactivateChart();
                }
                this.vm.galacticChart.hide(false);
            }

            // Hide Star Charts if visible
            if (this.vm.navigationSystemManager?.starChartsUI?.isVisible()) {
                this.vm.navigationSystemManager.starChartsUI.hide();
            }

            debug('UTILITY', 'Showing Long Range Scanner');
            this.vm.navigationSystemManager?.longRangeScanner.show();
        }
    }

    /**
     * Handle C key for Star Charts
     */
    handleStarChartsKey(event, isDocked, isGalacticChartVisible) {
        if (isDocked) return;

        event.preventDefault();
        event.stopPropagation();

        if (this.vm.navigationSystemManager?.starChartsUI?.isVisible()) {
            debug('UTILITY', 'Hiding Star Charts');
            this.vm.navigationSystemManager.starChartsUI.hide();
        } else {
            // Check if Star Charts system is available
            if (!this.vm.navigationSystemManager?.starChartsManager?.isEnabled()) {
                debug('UI', 'Star Charts system not available');
                if (this.vm.starfieldManager?.showHUDError) {
                    this.vm.starfieldManager.showHUDError(
                        'STAR CHARTS UNAVAILABLE',
                        'System not initialized or failed'
                    );
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            // Check if ship has Star Charts cards
            let hasStarChartsCards = false;
            try {
                if (this.vm.ship.hasSystemCards && typeof this.vm.ship.hasSystemCards === 'function') {
                    hasStarChartsCards = this.vm.ship.hasSystemCards('star_charts');
                    debug('UI', `🗺️ ViewManager C key: Star Charts card check result:`, hasStarChartsCards);
                } else if (this.vm.ship.hasSystemCardsSync) {
                    hasStarChartsCards = this.vm.ship.hasSystemCardsSync('star_charts');
                    debug('UI', `🗺️ ViewManager C key: Star Charts card check (sync) result:`, hasStarChartsCards);
                }
            } catch (error) {
                debug('P1', 'Error checking Star Charts cards:', error);
            }

            if (!hasStarChartsCards) {
                debug('UI', 'Cannot use Star Charts: No star charts cards installed');
                if (this.vm.starfieldManager?.showHUDError) {
                    this.vm.starfieldManager.showHUDError(
                        'STAR CHARTS CARDS MISSING',
                        'Install star charts cards to enable navigation'
                    );
                }
                this.vm.starfieldManager?.playCommandFailedSound?.();
                return;
            }

            // Play command sound
            this.vm.starfieldManager?.playCommandSound?.();

            // Hide galactic chart if visible
            if (isGalacticChartVisible) {
                debug('UTILITY', 'Hiding galactic chart before showing Star Charts');
                const chartSystem = this.vm.ship.systems.get('galactic_chart');
                if (chartSystem) {
                    chartSystem.deactivateChart();
                }
                this.vm.galacticChart.hide(false);
            }

            // Hide Long Range Scanner if visible
            if (this.vm.navigationSystemManager.longRangeScanner?.isVisible()) {
                const scannerSystem = this.vm.ship.systems.get('long_range_scanner');
                if (scannerSystem) {
                    scannerSystem.stopScan();
                }
                this.vm.navigationSystemManager.longRangeScanner.hide();
            }

            debug('UTILITY', 'Showing Star Charts');
            this.vm.navigationSystemManager?.starChartsUI.show();
        }
    }

    /**
     * Remove event listeners
     */
    dispose() {
        if (this._boundKeydownHandler) {
            document.removeEventListener('keydown', this._boundKeydownHandler);
            this._boundKeydownHandler = null;
        }
    }
}
