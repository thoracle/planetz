import * as THREE from 'three';
import { GalacticChart } from './GalacticChart.js';
import { LongRangeScanner } from './LongRangeScanner.js';
import { NavigationSystemManager } from './NavigationSystemManager.js';
import WarpFeedback from '../WarpFeedback.js';
import WarpDriveManager from '../WarpDriveManager.js';
import Ship from '../ship/Ship.js';
import Shields from '../ship/systems/Shields.js';
import ImpulseEngines from '../ship/systems/ImpulseEngines.js';
import Weapons from '../ship/systems/Weapons.js';
import LongRangeScannerSystem from '../ship/systems/LongRangeScanner.js';
import GalacticChartSystem from '../ship/systems/GalacticChartSystem.js';
import SubspaceRadioSystem from '../ship/systems/SubspaceRadioSystem.js';
// import DamageControlInterface from '../ui/DamageControlInterface.js'; // DISABLED - using SimplifiedDamageControl instead
import SubspaceRadio from '../ui/SubspaceRadio.js';
import { CrosshairTargeting } from '../utils/CrosshairTargeting.js';
import { targetingService } from '../services/TargetingService.js';
import { getActiveCamera } from '../ship/systems/services/AimResolver.js';
import { getStarterCardsArray } from '../ship/ShipConfigs.js';
import { debug } from '../debug.js';

export const VIEW_TYPES = {
    FORE: 'fore',
    AFT: 'aft',
    GALACTIC: 'galactic',
    SCANNER: 'scanner'
};

export class ViewManager {
    constructor(scene, camera, controls) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.previousView = VIEW_TYPES.FORE;
        this.lastNonModalView = VIEW_TYPES.FORE; // Track last FORE/AFT view
        this.editMode = false;
        this.starfieldManager = null;
        this.solarSystemManager = null;  // Initialize solarSystemManager
        this.shipSystemsInitialized = false; // Flag to prevent duplicate initialization
        
        // Initialize Ship instance (replacing simple shipEnergy)
        this.ship = new Ship('starter_ship');
        // Maintain backward compatibility by setting ship energy to existing value
        this.ship.currentEnergy = 1000; // Reduced for starter ship
        
        // Initialize default ship systems
        // NOTE: Commented out to prevent duplicate initialization loop
        // Ship systems will be initialized when StarfieldManager is set
        // this.initializeShipSystems();
        
        // Store camera state
        this.savedCameraState = {
            position: new THREE.Vector3(),
            quaternion: new THREE.Quaternion()
        };
        
        // Store original camera position for front view
        this.defaultCameraPosition = new THREE.Vector3(0, 0, 10);
        this.camera.position.copy(this.defaultCameraPosition);
        
        // Disable OrbitControls for free movement
        this.controls.enabled = false;
        this.controls.enableDamping = false;
        this.controls.enableRotate = false;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        
        // Disable auto-rotate to prevent camera spinning near waypoints
        if (this.controls.autoRotate !== undefined) {
            this.controls.autoRotate = false;
        }
        
        // Initialize feedback systems (will be updated with starfieldManager reference later)
        this.warpFeedback = new WarpFeedback();
        
        // Initialize warp drive manager
        this.warpDriveManager = new WarpDriveManager(scene, camera, this);
        
        // Create crosshairs
        this.createCrosshairs();
        
        // Create galactic chart and ensure it's hidden
        this.galacticChart = new GalacticChart(this);
        
        // NavigationSystemManager will be initialized after managers are set
        this.navigationSystemManager = null;
        this.longRangeScanner = null; // Will be set when NavigationSystemManager is created
        
        // Initialize damage control interface - DISABLED (using SimplifiedDamageControl instead)
        // The old DamageControlInterface has been replaced with SimplifiedDamageControl
        // which is managed by StarfieldManager to avoid conflicts
        // this.damageControl = new DamageControlInterface();
        // this.damageControl.setShip(this.ship);
        
        // Initialize subspace radio
        this.subspaceRadio = new SubspaceRadio(this.ship);
        
        // Expose damage control globally for HTML event handlers - DISABLED
        // window.damageControl = this.damageControl;
        
        // Set initial view state - this will also set this.currentView
        this.setView(VIEW_TYPES.FORE);
        
        // Bind keyboard events
        this.bindKeyEvents();
        
debug('UTILITY', 'ViewManager initialized with Ship:', this.ship.getStatus());
    }

    setStarfieldManager(manager) {
        this.starfieldManager = manager;
        
        // Pass starfieldManager to SubspaceRadio for command sound
        if (this.subspaceRadio) {
            this.subspaceRadio.setStarfieldManager(manager);
        }
        
        // CRITICAL: Update WarpFeedback with starfieldManager reference for OPS HUD integration
        if (this.warpFeedback) {
            this.warpFeedback.starfieldManager = manager;
            debug('COMBAT', '🚀 WarpFeedback updated with StarfieldManager reference for OPS HUD integration');
        }
        
        // Initialize ship systems when StarfieldManager is available - but only once
        if (manager && typeof manager.initializeShipSystems === 'function' && !this.shipSystemsInitialized) {
debug('UTILITY', 'ViewManager: StarfieldManager set - initializing ship systems');
            this.initializeShipSystems();
            this.shipSystemsInitialized = true;
        }
        
        // Initialize NavigationSystemManager if both managers are available
        this.initializeNavigationSystemIfReady();
    }

    // Add method to set SolarSystemManager
    setSolarSystemManager(manager) {
        this.solarSystemManager = manager;
debug('UTILITY', 'SolarSystemManager set in ViewManager');
        
        // Initialize NavigationSystemManager if both managers are available
        this.initializeNavigationSystemIfReady();
    }
    
    initializeNavigationSystemIfReady() {
        // Initialize NavigationSystemManager once both managers are available
        if (this.starfieldManager && this.solarSystemManager && !this.navigationSystemManager) {

            this.navigationSystemManager = new NavigationSystemManager(
                this,
                this.scene,
                this.camera,
                this.solarSystemManager,
                this.starfieldManager.targetComputerManager
            );
            
            // Keep legacy reference for compatibility
            this.longRangeScanner = this.navigationSystemManager.longRangeScanner;
            
            // Expose globally for testing
            window.navigationSystemManager = this.navigationSystemManager;
            
            // Also expose StarChartsManager directly for debugging
            if (this.navigationSystemManager.starChartsManager) {
                window.starChartsManager = this.navigationSystemManager.starChartsManager;
                debug('UTILITY', '🔧 StarChartsManager exposed globally for debugging');
            }

        }
    }

    // Update areManagersReady to check solarSystemManager directly
    areManagersReady() {
        return this.starfieldManager && this.solarSystemManager;
    }

    // Update getSolarSystemManager to use direct reference
    getSolarSystemManager() {
        if (!this.areManagersReady()) {
            throw new Error('Managers not properly initialized');
        }
        return this.solarSystemManager;
    }

    createCrosshairs() {
        // Create container for crosshairs
        this.crosshairContainer = document.createElement('div');
        this.crosshairContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Create front view crosshair (+)
        this.frontCrosshair = document.createElement('div');
        this.frontCrosshair.style.cssText = `
            width: 60px;
            height: 60px;
            position: relative;
            display: none;
        `;
        
        // Store references to crosshair elements for color updates
        this.frontCrosshairElements = [];
        
        this.frontCrosshair.innerHTML = `
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                left: 0;
                width: calc(50% - 8px);
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                right: 0;
                width: calc(50% - 8px);
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                top: 0;
                left: 50%;
                height: calc(50% - 8px);
                width: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateX(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                bottom: 0;
                left: 50%;
                height: calc(50% - 8px);
                width: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateX(-50%);
            "></div>
        `;
        
        // Create aft view crosshair (-- --)
        this.aftCrosshair = document.createElement('div');
        this.aftCrosshair.style.cssText = `
            width: 60px;
            height: 40px;
            position: relative;
            display: none;
        `;
        
        // Store references to aft crosshair elements for color updates
        this.aftCrosshairElements = [];
        
        this.aftCrosshair.innerHTML = `
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                left: 0;
                width: 18px;
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                right: 0;
                width: 18px;
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
        `;
        
        this.crosshairContainer.appendChild(this.frontCrosshair);
        this.crosshairContainer.appendChild(this.aftCrosshair);
        document.body.appendChild(this.crosshairContainer);
        
        // Add CSS for crosshair animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.9; }
                50% { opacity: 0.6; }
                100% { opacity: 0.9; }
            }
            @keyframes rotate {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Get references to crosshair elements after DOM creation
        this.frontCrosshairElements = Array.from(this.frontCrosshair.querySelectorAll('.crosshair-element'));
        this.aftCrosshairElements = Array.from(this.aftCrosshair.querySelectorAll('.crosshair-element'));
    }

    bindKeyEvents() {
        document.addEventListener('keydown', (event) => {
            if (this.editMode) return; // Ignore view changes in edit mode
            
            const key = event.key.toLowerCase();
            const isGalacticChartVisible = this.galacticChart.isVisible();
            const isLongRangeScannerVisible = this.navigationSystemManager?.isNavigationVisible();
            const isDocked = this.starfieldManager?.isDocked;
            
            if (key === 'g') {
                // Block galactic chart completely when docked
                if (isDocked) {
                    return; // Early return - completely ignore the key when docked
                }
                
                console.log('G key pressed:', {
                    isGalacticChartVisible,
                    isLongRangeScannerVisible,
                    currentView: this.currentView,
                    previousView: this.previousView,
                    isDocked: isDocked
                });
                
                event.preventDefault();
                event.stopPropagation();
                
                // Get the galactic chart system from ship
                const chartSystem = this.ship.systems.get('galactic_chart');
                
                if (isGalacticChartVisible) {
debug('UTILITY', 'Restoring previous view');
                    // Deactivate chart system when hiding
                    if (chartSystem) {
                        chartSystem.deactivateChart();
                    }
                    this.galacticChart.hide(true);
                } else {
                    // Check if chart system is operational
                    if (!chartSystem) {
                        console.warn('No Galactic Chart system found on ship');
                        // Show HUD error message instead of just console warning
debug('AI', 'ViewManager G key: starfieldManager available?', !!this.starfieldManager);
                        if (this.starfieldManager && this.starfieldManager.showHUDError) {
                            this.starfieldManager.showHUDError(
                                'GALACTIC CHART UNAVAILABLE',
                                'System not installed on this ship'
                            );
                        } else {
                            console.warn('StarfieldManager not available for HUD error display');
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    // Check basic operability and cards FIRST (required for any chart usage)
                    if (!chartSystem.isOperational()) {
                        console.warn('Cannot use Galactic Chart: System damaged or offline');
                        if (this.starfieldManager && this.starfieldManager.showHUDError) {
                            this.starfieldManager.showHUDError(
                                'GALACTIC CHART DAMAGED',
                                'Repair system to enable navigation'
                            );
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    // Check if chart cards are installed (required for basic viewing)
                    let hasChartCards = false;
                    try {
                        if (this.ship.hasSystemCards && typeof this.ship.hasSystemCards === 'function') {
                            hasChartCards = this.ship.hasSystemCards('galactic_chart');
debug('UI', `🗺️ ViewManager G key: Card check result:`, hasChartCards);
                        } else {
                            hasChartCards = true; // Fallback for ships without card system
debug('UI', `🗺️ ViewManager G key: No card system - allowing access`);
                        }
                    } catch (error) {
                        console.warn('Chart card check failed:', error);
                        hasChartCards = false;
                    }
                    
debug('UI', `🗺️ ViewManager G key: Final hasChartCards result:`, hasChartCards);
                    
                    if (!hasChartCards) {
                        console.warn('Cannot use Galactic Chart: No chart cards installed');
                        if (this.starfieldManager && this.starfieldManager.showHUDError) {
                            this.starfieldManager.showHUDError(
                                'GALACTIC CHART CARDS MISSING',
                                'Install galactic chart cards to enable navigation'
                            );
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    // Play command sound for successful chart access
                    if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                        this.starfieldManager.playCommandSound();
                    }
                    
                    // Try to activate chart system for enhanced functionality (scanning)
                    // but allow basic viewing even if activation fails due to cooldown/energy
                    let chartFullyActivated = false;
                    if (chartSystem.canActivate(this.ship)) {
                        chartFullyActivated = chartSystem.activateChart(this.ship);
                        if (chartFullyActivated) {
debug('UTILITY', 'Galactic Chart fully activated with scanning capabilities');
                        }
                    } else {
debug('NAVIGATION', 'Galactic Chart opened in navigation-only mode (scanning on cooldown or insufficient energy)');
                    }
                    
                    // If scanner is visible, hide it first and deactivate the system
                    if (isLongRangeScannerVisible) {
debug('UTILITY', 'Hiding scanner before showing galactic chart');
                        const scannerSystem = this.ship.systems.get('long_range_scanner');
                        if (scannerSystem) {
                            scannerSystem.stopScan();
                        }
                        this.navigationSystemManager?.hideNavigationInterface();
                    }
debug('UTILITY', 'Setting view to GALACTIC');
                    this.setView(VIEW_TYPES.GALACTIC);
                }
            } else if (key === 'l') {
                // L key - Long Range Scanner only
                if (isDocked) {
                    return; // Early return - completely ignore the key when docked
                }
                
                event.preventDefault();
                event.stopPropagation();
                
                // Get the long range scanner system from ship
                const scannerSystem = this.ship.systems.get('long_range_scanner');
                
                if (this.navigationSystemManager?.longRangeScanner && this.navigationSystemManager.longRangeScanner.isVisible()) {
debug('UTILITY', 'Hiding Long Range Scanner');
                    // Stop scanning when hiding scanner
                    if (scannerSystem) {
                        scannerSystem.stopScan();
                    }
                    this.navigationSystemManager.longRangeScanner.hide();
                } else {
                    // Check if scanner system is operational
                    if (!scannerSystem) {
                        console.warn('No Long Range Scanner system found on ship');
                        if (this.starfieldManager && this.starfieldManager.showHUDError) {
                            this.starfieldManager.showHUDError(
                                'LONG RANGE SCANNER UNAVAILABLE',
                                'System not installed on this ship'
                            );
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    if (!scannerSystem.canActivate(this.ship)) {
                        if (!scannerSystem.isOperational()) {
                            console.warn('Cannot activate Long Range Scanner: System damaged or offline');
                            if (this.starfieldManager && this.starfieldManager.showHUDError) {
                                this.starfieldManager.showHUDError(
                                    'LONG RANGE SCANNER DAMAGED',
                                    'Repair system to enable scanner operations'
                                );
                            }
                        } else {
                            console.warn('Cannot activate Long Range Scanner: Insufficient energy');
                            if (this.starfieldManager && this.starfieldManager.showHUDError) {
                                this.starfieldManager.showHUDError(
                                    'INSUFFICIENT ENERGY',
                                    'Need 20 energy units to activate scanner'
                                );
                            }
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    // Play command sound
                    if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                        this.starfieldManager.playCommandSound();
                    }
                    
                    // Start scanning operation
                    const scanStarted = scannerSystem.startScan(this.ship);
                    if (!scanStarted) {
                        console.warn('Failed to start Long Range Scanner');
                        return;
                    }
                    
                    // Hide other navigation interfaces
                    if (isGalacticChartVisible) {
debug('UTILITY', 'Hiding galactic chart before showing scanner');
                        const chartSystem = this.ship.systems.get('galactic_chart');
                        if (chartSystem) {
                            chartSystem.deactivateChart();
                        }
                        this.galacticChart.hide(false);
                    }
                    
                    // Hide Star Charts if visible
                    if (this.navigationSystemManager?.starChartsUI && this.navigationSystemManager.starChartsUI.isVisible()) {
                        this.navigationSystemManager.starChartsUI.hide();
                    }
                    
debug('UTILITY', 'Showing Long Range Scanner');
                    this.navigationSystemManager?.longRangeScanner.show();
                }
            } else if (key === 'c') {
                // C key - Star Charts
                if (isDocked) {
                    return; // Early return - completely ignore the key when docked
                }
                
                event.preventDefault();
                event.stopPropagation();
                
                if (this.navigationSystemManager?.starChartsUI && this.navigationSystemManager.starChartsUI.isVisible()) {
debug('UTILITY', 'Hiding Star Charts');
                    this.navigationSystemManager.starChartsUI.hide();
                } else {
                    // Check if Star Charts system is available
                    if (!this.navigationSystemManager?.starChartsManager || !this.navigationSystemManager.starChartsManager.isEnabled()) {
                        console.warn('Star Charts system not available');
                        if (this.starfieldManager && this.starfieldManager.showHUDError) {
                            this.starfieldManager.showHUDError(
                                'STAR CHARTS UNAVAILABLE',
                                'System not initialized or failed'
                            );
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    // Check if ship has Star Charts cards
                    let hasStarChartsCards = false;
                    try {
                        if (this.ship.hasSystemCards && typeof this.ship.hasSystemCards === 'function') {
                            hasStarChartsCards = this.ship.hasSystemCards('star_charts');
debug('UI', `🗺️ ViewManager C key: Star Charts card check result:`, hasStarChartsCards);
                        } else {
                            // Fallback for synchronous check
                            if (this.ship.hasSystemCardsSync && typeof this.ship.hasSystemCardsSync === 'function') {
                                hasStarChartsCards = this.ship.hasSystemCardsSync('star_charts');
debug('UI', `🗺️ ViewManager C key: Star Charts card check (sync) result:`, hasStarChartsCards);
                            }
                        }
                    } catch (error) {
                        console.error('Error checking Star Charts cards:', error);
                    }
                    
                    if (!hasStarChartsCards) {
                        console.warn('Cannot use Star Charts: No star charts cards installed');
                        if (this.starfieldManager && this.starfieldManager.showHUDError) {
                            this.starfieldManager.showHUDError(
                                'STAR CHARTS CARDS MISSING',
                                'Install star charts cards to enable navigation'
                            );
                        }
                        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                            this.starfieldManager.playCommandFailedSound();
                        }
                        return;
                    }
                    
                    // Play command sound
                    if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                        this.starfieldManager.playCommandSound();
                    }
                    
                    // Hide other navigation interfaces
                    if (isGalacticChartVisible) {
debug('UTILITY', 'Hiding galactic chart before showing Star Charts');
                        const chartSystem = this.ship.systems.get('galactic_chart');
                        if (chartSystem) {
                            chartSystem.deactivateChart();
                        }
                        this.galacticChart.hide(false);
                    }
                    
                    // Hide Long Range Scanner if visible
                    if (this.navigationSystemManager.longRangeScanner && this.navigationSystemManager.longRangeScanner.isVisible()) {
                        const scannerSystem = this.ship.systems.get('long_range_scanner');
                        if (scannerSystem) {
                            scannerSystem.stopScan();
                        }
                        this.navigationSystemManager.longRangeScanner.hide();
                    }
                    
debug('UTILITY', 'Showing Star Charts');
                    this.navigationSystemManager?.starChartsUI.show();
                }
            } else if (key === 's' && !isDocked) {
                // Shield toggle - DISABLED (now handled by StarfieldManager)
                // The shield toggle is now handled by StarfieldManager to avoid conflicts
                // and ensure only one shield handler is active
                event.preventDefault();
                event.stopPropagation();
                
                // Let StarfieldManager handle shield toggles
debug('COMBAT', 'Shield key pressed - handled by StarfieldManager');
                
                /* DISABLED - avoid double shield toggle
                // Get shields system from ship
                const shieldsSystem = this.ship.systems.get('shields');
                if (shieldsSystem) {
                    // Play command sound only if shields exist
                    if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                        this.starfieldManager.playCommandSound();
                    }
                    
                    const newState = shieldsSystem.toggleShields();
debug('COMBAT', `Shields ${newState ? 'UP' : 'DOWN'} - Energy consumption: ${shieldsSystem.getEnergyConsumptionRate().toFixed(2)}/sec`);
                    
                    // Show shield status in console for feedback
                    const status = shieldsSystem.getStatus();
debug('COMBAT', `Shield strength: ${status.currentShieldStrength.toFixed(2)}/${status.maxShieldStrength.toFixed(2)} - Damage absorption: ${(status.damageAbsorption * 100).toFixed(1)}%`);
                } else {
                    // Play fail sound if shields don't exist
                    if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                        this.starfieldManager.playCommandFailedSound();
                    }
debug('COMBAT', 'No shields system found on ship - install shield cards');
                }
                */
            } else if (key === ' ' && !isDocked) {
                // Space key is now the active weapon firing key - handled by StarfieldManager
                // No longer show legacy message, just prevent default behavior
                event.preventDefault();
                event.stopPropagation();
            } else if (key === 'd') {
                // Damage Control Interface toggle - DISABLED (now handled by StarfieldManager)
                // The new SimplifiedDamageControl interface is handled by StarfieldManager
                // to avoid conflicts and ensure only one damage control interface is active
                event.preventDefault();
                event.stopPropagation();
                
                // Let StarfieldManager handle damage control interface
debug('COMBAT', 'Damage control key pressed - handled by StarfieldManager');
            } else if (!isDocked && key === 'f' && (this.currentView === VIEW_TYPES.AFT || isGalacticChartVisible || isLongRangeScannerVisible)) {
                event.preventDefault();
                event.stopPropagation();
                this.setView(VIEW_TYPES.FORE);
            } else if (!isDocked && key === 'a' && (this.currentView === VIEW_TYPES.FORE || isGalacticChartVisible || isLongRangeScannerVisible)) {
                event.preventDefault();
                event.stopPropagation();
                this.setView(VIEW_TYPES.AFT);
            }
        });
    }

    setView(viewType) {
        debug('UTILITY', 'setView called:', {
            viewType,
            currentView: this.currentView,
            isGalacticVisible: this.galacticChart.isVisible(),
            isLongRangeScannerVisible: this.navigationSystemManager?.isNavigationVisible(),
            isDocked: this.starfieldManager?.isDocked
        });
        
        if (this.editMode) return;
        
        // Store last non-modal view when switching to a modal view
        if (viewType === VIEW_TYPES.GALACTIC || viewType === VIEW_TYPES.SCANNER) {
            if (this.currentView === VIEW_TYPES.FORE || this.currentView === VIEW_TYPES.AFT) {
                this.lastNonModalView = this.currentView;
            }
        }
        
        // Special handling for galactic view toggle
        if (viewType === VIEW_TYPES.GALACTIC) {
            const chartSystem = this.ship.systems.get('galactic_chart');
            
            if (this.galacticChart.isVisible()) {
                // Deactivate chart system when hiding
                if (chartSystem) {
                    chartSystem.deactivateChart();
                }
                this.galacticChart.hide(true);
                return;
            } else {
                // Check if chart system can be activated (already handled in G key binding)
                // This is a secondary check for programmatic setView calls
                if (chartSystem && chartSystem.canActivate(this.ship)) {
                    // Activate chart system if not already active
                    if (!chartSystem.isChartActive) {
                        chartSystem.activateChart(this.ship);
                    }
                }
                
                this.galacticChart.show();
                this.previousView = this.currentView;
                this.savedCameraState.position.copy(this.camera.position);
                this.savedCameraState.quaternion.copy(this.camera.quaternion);
                this.currentView = viewType;
                // Notify StarfieldManager of view change
                if (this.starfieldManager) {
                    this.starfieldManager.setView(viewType.toUpperCase());
                }
                return;
            }
        }
        
        // Special handling for scanner view toggle
        if (viewType === VIEW_TYPES.SCANNER) {
            const scannerSystem = this.ship.systems.get('long_range_scanner');
            
            if (this.navigationSystemManager?.isNavigationVisible()) {
                // Stop scanning when hiding scanner
                if (scannerSystem) {
                    scannerSystem.stopScan();
                }
                this.navigationSystemManager?.hideNavigationInterface();
                return;
            } else {
                // Check if scanner system can be activated (already handled in L key binding)
                // This is a secondary check for programmatic setView calls
                if (scannerSystem && scannerSystem.canActivate(this.ship)) {
                    // Start scanning operation if not already scanning
                    if (!scannerSystem.isScanning) {
                        scannerSystem.startScan(this.ship);
                    }
                }
                
                this.navigationSystemManager?.showNavigationInterface();
                this.previousView = this.currentView;
                this.savedCameraState.position.copy(this.camera.position);
                this.savedCameraState.quaternion.copy(this.camera.quaternion);
                this.currentView = viewType;
                
                // Notify StarfieldManager of view change
                if (this.starfieldManager) {
                    this.starfieldManager.setView(viewType.toUpperCase());
                }
                return;
            }
        }
        
        // Don't store previous view if we're already in that view
        if (this.currentView === viewType) {
debug('UTILITY', 'Already in requested view, returning');
            return;
        }
        
        // Hide all crosshairs first
        this.frontCrosshair.style.display = 'none';
        this.aftCrosshair.style.display = 'none';
        
        switch(viewType) {
            case VIEW_TYPES.FORE:
                if (this.currentView === VIEW_TYPES.GALACTIC || this.currentView === VIEW_TYPES.SCANNER) {
                    this.camera.position.copy(this.savedCameraState.position);
                    this.camera.quaternion.copy(this.savedCameraState.quaternion);
                } else {
                    this.setFrontView();
                }
                // Deactivate systems when switching away from modal views
                const chartSystem = this.ship.systems.get('galactic_chart');
                if (chartSystem) {
                    chartSystem.deactivateChart();
                }
                const scannerSystem = this.ship.systems.get('long_range_scanner');
                if (scannerSystem) {
                    scannerSystem.stopScan();
                }
                this.galacticChart.hide(false);
                this.navigationSystemManager?.hideNavigationInterface();
                // Only show crosshair if not docked
                if (!this.starfieldManager?.isDocked) {
                    this.frontCrosshair.style.display = 'block';
                }
                break;
            case VIEW_TYPES.AFT:
                if (this.currentView === VIEW_TYPES.GALACTIC || this.currentView === VIEW_TYPES.SCANNER) {
                    this.camera.position.copy(this.savedCameraState.position);
                    this.camera.quaternion.copy(this.savedCameraState.quaternion);
                    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
                    euler.y += Math.PI;
                    this.camera.quaternion.setFromEuler(euler);
                } else {
                    this.setAftView();
                }
                // Deactivate systems when switching away from modal views
                const chartSystemAft = this.ship.systems.get('galactic_chart');
                if (chartSystemAft) {
                    chartSystemAft.deactivateChart();
                }
                const scannerSystemAft = this.ship.systems.get('long_range_scanner');
                if (scannerSystemAft) {
                    scannerSystemAft.stopScan();
                }
                this.galacticChart.hide(false);
                this.navigationSystemManager?.hideNavigationInterface();
                // Only show crosshair if not docked
                if (!this.starfieldManager?.isDocked) {
                    this.aftCrosshair.style.display = 'block';
                }
                break;
        }
        
        // Update the current view BEFORE notifying StarfieldManager
        this.currentView = viewType;
        
        // Notify StarfieldManager of view change
        if (this.starfieldManager) {
            this.starfieldManager.setView(viewType.toUpperCase());
        }
    }

    setFrontView() {
        // Show front crosshair
        this.frontCrosshair.style.display = 'block';
        this.aftCrosshair.style.display = 'none';
        
        // Rotate camera 180 degrees around the up vector
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
        euler.y += Math.PI;
        this.camera.quaternion.setFromEuler(euler);
    }

    setAftView() {
        // Show aft crosshair
        this.aftCrosshair.style.display = 'block';
        this.frontCrosshair.style.display = 'none';
        
        // Rotate camera 180 degrees around the up vector
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
        euler.y += Math.PI;
        this.camera.quaternion.setFromEuler(euler);
    }

    setEditMode(enabled) {
        this.editMode = enabled;
        
        if (enabled) {
            // Hide crosshairs in edit mode
            this.frontCrosshair.style.display = 'none';
            this.aftCrosshair.style.display = 'none';
            
            // Enable orbit controls for edit mode
            this.controls.enabled = true;
            this.controls.enableDamping = true;
            this.controls.enableRotate = true;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
            
            // Disable auto-rotate even in edit mode to prevent spinning
            if (this.controls.autoRotate !== undefined) {
                this.controls.autoRotate = false;
            }
            
            // Set target to origin for planet editing
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        } else {
            // Disable orbit controls for free movement
            this.controls.enabled = false;
            this.controls.enableDamping = false;
            this.controls.enableRotate = false;
            this.controls.enablePan = false;
            this.controls.enableZoom = true;
            
            // Restore current view without affecting position
            this.setView(this.currentView);
        }
    }

    restorePreviousView() {
        console.log('restorePreviousView called:', {
            currentView: this.currentView,
            previousView: this.previousView,
            lastNonModalView: this.lastNonModalView,
            isDocked: this.starfieldManager?.isDocked
        });
        
        // Don't restore if we're not in galactic or scanner view
        if (this.currentView !== VIEW_TYPES.GALACTIC && this.currentView !== VIEW_TYPES.SCANNER) {
debug('UTILITY', 'Not in galactic or scanner view, returning');
            return;
        }
        
        // Hide the appropriate view and deactivate systems without triggering another view restoration
        if (this.currentView === VIEW_TYPES.GALACTIC) {
            const chartSystem = this.ship.systems.get('galactic_chart');
            if (chartSystem) {
                chartSystem.deactivateChart();
            }
            this.galacticChart.hide(false);
        } else if (this.currentView === VIEW_TYPES.SCANNER) {
            const scannerSystem = this.ship.systems.get('long_range_scanner');
            if (scannerSystem) {
                scannerSystem.stopScan();
            }
            this.longRangeScanner.hide(false);
        }
        
        // If docked, restore to previous view or force FORE
        if (this.starfieldManager?.isDocked) {
debug('UTILITY', 'Ship is docked, restoring to previous view or FORE');
            const validView = (this.previousView === VIEW_TYPES.FORE || this.previousView === VIEW_TYPES.AFT) ? 
                this.previousView : VIEW_TYPES.FORE;
                
            // Restore the camera state first
            this.camera.position.copy(this.savedCameraState.position);
            this.camera.quaternion.copy(this.savedCameraState.quaternion);
            
            // Update the current view
            this.currentView = validView;
            
            // Ensure crosshairs are hidden
            this.frontCrosshair.style.display = 'none';
            this.aftCrosshair.style.display = 'none';
            
            // Notify StarfieldManager of view change
            if (this.starfieldManager) {
                this.starfieldManager.setView(validView.toUpperCase());
            }
            
            return;
        }
        
        // Use lastNonModalView if coming from a modal view, otherwise use previousView
        let viewToRestore = (this.previousView === VIEW_TYPES.GALACTIC || this.previousView === VIEW_TYPES.SCANNER) 
            ? this.lastNonModalView 
            : (this.previousView || VIEW_TYPES.FORE);
            
debug('UTILITY', 'Restoring to view:', viewToRestore);
        
        // Restore the camera state
        this.camera.position.copy(this.savedCameraState.position);
        this.camera.quaternion.copy(this.savedCameraState.quaternion);
        
        // If restoring to AFT view and not docked, apply the 180-degree rotation
        if (viewToRestore === VIEW_TYPES.AFT && !this.starfieldManager?.isDocked) {
            const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
            euler.y += Math.PI;
            this.camera.quaternion.setFromEuler(euler);
        }
        
        // Update crosshairs based on docked state
        const showCrosshairs = !this.starfieldManager?.isDocked;
        this.frontCrosshair.style.display = showCrosshairs && viewToRestore === VIEW_TYPES.FORE ? 'block' : 'none';
        this.aftCrosshair.style.display = showCrosshairs && viewToRestore === VIEW_TYPES.AFT ? 'block' : 'none';
        
        // Update the current view and notify StarfieldManager
        this.currentView = viewToRestore;
        
        if (this.starfieldManager) {
            // Convert view type to uppercase before passing to starfieldManager
            this.starfieldManager.setView(viewToRestore.toUpperCase());
        }
    }

    // Update method to get current ship energy (backward compatibility)
    getShipEnergy() {
        return this.ship.currentEnergy;
    }

    // Update method to update ship energy (backward compatibility)
    updateShipEnergy(amount) {
        const oldEnergy = this.ship.currentEnergy;
        this.ship.currentEnergy = Math.max(0, this.ship.currentEnergy + amount);
debug('UTILITY', `Ship energy updated: ${oldEnergy.toFixed(2)} -> ${this.ship.currentEnergy.toFixed(2)} (change: ${amount.toFixed(2)})`);
        return this.ship.currentEnergy;
    }

    // Add new method to get ship status
    getShipStatus() {
        return this.ship.getStatus();
    }

    // Add new method to access ship directly
    getShip() {
        return this.ship;
    }

    dispose() {
        // Clean up DOM elements
        if (this.crosshairContainer && this.crosshairContainer.parentNode) {
            this.crosshairContainer.parentNode.removeChild(this.crosshairContainer);
        }
        if (this.galacticChart) {
            this.galacticChart.dispose();
        }
        if (this.navigationSystemManager) {
            this.navigationSystemManager.destroy();
        }
        if (this.subspaceRadio) {
            this.subspaceRadio.dispose();
        }
    }

    getGalacticChart() {
        return this.galacticChart;
    }

    /**
     * Update the view manager state
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        // Update ship systems
        if (this.ship) {
            this.ship.update(deltaTime);
            
            // Update galactic chart system specifically for energy consumption
            const chartSystem = this.ship.systems.get('galactic_chart');
            if (chartSystem) {
                chartSystem.update(deltaTime / 1000, this.ship); // Convert to seconds
            }
        }
        
        // Update subspace radio
        if (this.subspaceRadio) {
            this.subspaceRadio.update(deltaTime);
        }
        
        // Update warp drive manager
        if (this.warpDriveManager) {
            this.warpDriveManager.update(deltaTime);
        }
        
        // Update crosshair display
        this.updateCrosshairDisplay();
    }

    getCamera() {
        return this.camera;
    }

    /**
     * Initialize default ship systems using unified approach
     * This method now calls the unified initializeShipSystems from StarfieldManager 
     * to ensure consistent initialization across all code paths
     */
    initializeShipSystems() {
debug('UTILITY', 'ViewManager: Initializing ship systems using unified approach');
        
        // Ship class handles basic system setup in its constructor
        // But we need to initialize proper game systems for launch
        
        if (this.starfieldManager && typeof this.starfieldManager.initializeShipSystems === 'function') {
            // Use unified initialization method from StarfieldManager
            this.starfieldManager.initializeShipSystems().catch(error => {
                console.error('Failed to initialize ship systems via StarfieldManager:', error);
            });
debug('UTILITY', '✅ ViewManager: Ship systems initialized via StarfieldManager');
        } else {
            // Fallback for cases where StarfieldManager isn't available yet
debug('AI', 'ViewManager: StarfieldManager not available yet - ship systems will be initialized when StarfieldManager is set');
        }
    }
    
    /**
     * Test method to apply random damage to ship systems
     * Used for testing the Damage Control Interface
     */
    applyTestDamage() {
        const systems = Array.from(this.ship.systems.keys());
        if (systems.length === 0) return;
        
        // Randomly select 1-3 systems to damage
        const systemsToDamage = Math.floor(Math.random() * 3) + 1;
        const selectedSystems = [];
        
        for (let i = 0; i < systemsToDamage; i++) {
            const randomSystem = systems[Math.floor(Math.random() * systems.length)];
            if (!selectedSystems.includes(randomSystem)) {
                selectedSystems.push(randomSystem);
            }
        }
        
        // Apply random damage to selected systems
        for (const systemName of selectedSystems) {
            const system = this.ship.getSystem(systemName);
            if (system) {
                const damageAmount = Math.random() * 0.7 + 0.1; // 10% to 80% damage
                const beforeHealth = system.healthPercentage;
                system.takeDamage(system.maxHealth * damageAmount);
                const afterHealth = system.healthPercentage;
                
debug('COMBAT', `Applied ${(damageAmount * 100).toFixed(1)}% damage to ${systemName}: ${(beforeHealth * 100).toFixed(1)}% → ${(afterHealth * 100).toFixed(1)}%`);
                
                // Add to damage control log if available (old interface disabled)
                // if (this.damageControl) {
                //     this.damageControl.addLogEntry('damage', 
                //         `${this.damageControl.formatSystemName(systemName)} damaged: ${(beforeHealth * 100).toFixed(1)}% → ${(afterHealth * 100).toFixed(1)}%`
                //     );
                // }
            }
        }
        
debug('COMBAT', 'Test damage applied. Press D to open Damage Control Interface.');
        return selectedSystems;
    }
    
    /**
     * Get damage control interface - DISABLED
     * The old DamageControlInterface has been replaced with SimplifiedDamageControl
     * which is managed by StarfieldManager. Use StarfieldManager.damageControlInterface instead.
     * @returns {null} Always returns null as old interface is disabled
     */
    getDamageControl() {
        console.warn('getDamageControl() is deprecated - use StarfieldManager.damageControlInterface instead');
        return null;
    }

    /**
     * Update crosshair display based on current weapon range and target distance
     */
    updateCrosshairDisplay() {
        // Only update if crosshairs are visible and we have a ship
        if (!this.ship || (this.frontCrosshair.style.display === 'none' && this.aftCrosshair.style.display === 'none')) {
            return;
        }
        
        // Get current weapon range from the ACTIVE weapon slot (not first available)
        let currentWeaponRange = 0;
        let activeWeaponName = 'No Weapon';
        
        if (this.ship.weaponSystem && this.ship.weaponSystem.getActiveWeapon) {
            const activeWeapon = this.ship.weaponSystem.getActiveWeapon();
            if (activeWeapon && activeWeapon.equippedWeapon) {
                // Convert weapon range from meters to kilometers for targeting service
                const weaponRangeMeters = activeWeapon.equippedWeapon.range || 30000;
                currentWeaponRange = weaponRangeMeters / 1000; // Convert meters to km
                activeWeaponName = activeWeapon.equippedWeapon.name;
            }
        }
        
        // Track last weapon for comparison
        if (!this.lastLoggedWeapon || this.lastLoggedWeapon !== activeWeaponName) {
            this.lastLoggedWeapon = activeWeaponName;
            // Debug removed to prevent console spam
        }
        
        // Default state - no target in sights
        let targetState = 'none';
        let targetFaction = null;
        let targetShip = null;
        let targetDistance = null;
        
        // Only check for targets if we have a weapon and access to the scene
        if (currentWeaponRange > 0 && this.starfieldManager?.scene) {
            // Use the active camera (fore/aft) to match firing logic and crosshair
            const camera = getActiveCamera(this.ship) || this.starfieldManager.camera;
            
            const targetingResult = targetingService.getCurrentTarget({
                camera: camera,
                weaponRange: currentWeaponRange, // In kilometers (converted from meters)
                requestedBy: 'crosshair_display',
                enableFallback: false // Crosshair only shows precise targets
            });

            // Apply results to ViewManager state
            targetState = targetingResult.crosshairState;
            targetShip = targetingResult.targetShip;
            targetDistance = targetingResult.targetDistance;
            
            if (targetShip) {
                targetFaction = this.getFactionColor(targetShip);
            }
        }
        
        // Apply visual changes based on target state and faction
        this.applyCrosshairStyle(this.frontCrosshairElements, targetState, targetFaction, targetShip, targetDistance);
        this.applyCrosshairStyle(this.aftCrosshairElements, targetState, targetFaction, targetShip, targetDistance);
    }
    
    /**
     * Get faction color for any target (ships, planets, moons, stations)
     * @param {Object} target - Target object (ship or celestial body)
     * @returns {string} Faction color hex code
     */
    getFactionColor(target) {
        if (!target) return '#ffffff'; // White for unknown
        
        // Handle ship objects (have diplomacy property)
        if (target.diplomacy || target.faction) {
            const diplomacy = target.diplomacy || target.faction;
            
            switch(diplomacy) {
                case 'enemy':
                case 'hostile':
                    return '#ff3333'; // Red for enemies
                case 'friendly':
                case 'ally':
                    return '#44ff44'; // Green for friendlies
                case 'neutral':
                    return '#ffff44'; // Yellow for neutrals
                case 'unknown':
                    return '#44ffff'; // Cyan for unknown
                default:
                    return '#ff3333'; // Default to red (assume hostile if unknown)
            }
        }
        
        // Handle celestial bodies (planets, moons, stars) - assign default faction colors
        if (target.type) {
            switch(target.type) {
                case 'star':
                    return '#ffff44'; // Yellow for stars (neutral)
                case 'planet':
                    return '#44ff44'; // Green for planets (friendly/habitable)
                case 'moon':
                    return '#44ffff'; // Cyan for moons (unknown/neutral)
                case 'station':
                case 'space_station':
                    return '#44ff44'; // Green for stations (friendly)
                default:
                    return '#ffffff'; // White for unknown objects
            }
        }
        
        // Handle named celestial bodies without type
        if (target.name) {
            const name = target.name.toLowerCase();
            if (name.includes('star') || name.includes('sun')) {
                return '#ffff44'; // Yellow for stars
            } else if (name.includes('planet')) {
                return '#44ff44'; // Green for planets
            } else if (name.includes('moon')) {
                return '#44ffff'; // Cyan for moons
            }
        }
        
        return '#ffffff'; // Default white for unknown
    }
    
    /**
     * Apply crosshair styling based on target state and faction
     * @param {Array} elements - Array of crosshair elements to style
     * @param {string} state - Target state: 'none', 'inRange', 'closeRange', 'outRange'
     * @param {string} factionColor - Faction color hex code, null if no target
     * @param {Object} targetShip - Target ship object, null if no target
     * @param {number} targetDistance - Distance to target in km, null if no target
     */
    applyCrosshairStyle(elements, state, factionColor = null, targetShip = null, targetDistance = null) {
        // Use faction color if target detected, otherwise white for empty space
        const baseColor = factionColor || '#ffffff';
        
        // Get the crosshair container to add/remove additional elements
        const container = elements[0]?.parentElement;
        if (!container || !elements.length) return;
        
        // Remove any existing target info indicators
        const existingIndicators = container.querySelectorAll('.target-info, .range-indicator');
        existingIndicators.forEach(indicator => indicator.remove());
        
        // Apply different crosshair shapes based on target state
        // Use faction color for all states to preserve faction-based identification
        switch(state) {
            case 'none':
                // No target - standard + crosshair (range now shown in weapon HUD)
                this.setCrosshairShape(container, 'standard', baseColor, 0.6);
                break;
                
            case 'inRange':
                // Target in range - dynamic circular reticle using faction color
                this.setCrosshairShape(container, 'dynamicTarget', baseColor, 1.0);
                break;
                
            case 'closeRange':
                // Target close to range - show standard crosshair (no target circle to avoid confusion)
                // Only show target circle when actually in range and can be hit
                this.setCrosshairShape(container, 'standard', baseColor, 0.8);
                break;
                
            case 'outRange':
                // Target out of range - show standard crosshair (no target circle)
                this.setCrosshairShape(container, 'standard', baseColor, 0.6);
                break;
                
            default:
                // Unknown state - show standard crosshair  
                this.setCrosshairShape(container, 'standard', baseColor, 0.6);
                break;
        }
    }
    
    /**
     * Set crosshair shape based on target state
     * @param {HTMLElement} container - Crosshair container
     * @param {string} shapeType - 'standard', 'inRange', 'closeRange', 'outRange'
     * @param {string} color - Color for crosshair
     * @param {number} opacity - Opacity level
     */
    setCrosshairShape(container, shapeType, color, opacity) {
        // Clear existing crosshair elements
        container.querySelectorAll('.crosshair-element').forEach(el => el.remove());
        
        const baseStyle = `
            position: absolute;
            background: ${color};
            box-shadow: 0 0 4px ${color};
            opacity: ${opacity};
        `;
        
        // Check if this is the aft crosshair container
        const isAftCrosshair = container === this.aftCrosshair;
        
        switch(shapeType) {
            case 'standard':
                if (isAftCrosshair) {
                    // Aft view - only horizontal lines (-- --)
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: 18px; height: 2px; transform: translateY(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: 18px; height: 2px; transform: translateY(-50%);
                        "></div>
                    `;
                } else {
                    // Front view - classic + crosshair
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: calc(50% - 8px); height: 2px; transform: translateY(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: calc(50% - 8px); height: 2px; transform: translateY(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 0; left: 50%; height: calc(50% - 8px); width: 2px; transform: translateX(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            bottom: 0; left: 50%; height: calc(50% - 8px); width: 2px; transform: translateX(-50%);
                        "></div>
                    `;
                }
                break;
                
            case 'inRange':
                // Target in range - dashed circle with center dot for precision targeting
                container.innerHTML += `
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: 40px; height: 40px;
                        border: 2px dashed ${color}; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                        background: transparent;
                    "></div>
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: 4px; height: 4px; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                    "></div>
                `;
                break;
                
            case 'closeRange':
                if (isAftCrosshair) {
                    // Aft view - enhanced horizontal lines for close range
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: 22px; height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: 22px; height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                    `;
                } else {
                    // Front view - + with extended tips for close range
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: calc(50% - 4px); height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: calc(50% - 4px); height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 0; left: 50%; height: calc(50% - 4px); width: 2px; transform: translateX(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            bottom: 0; left: 50%; height: calc(50% - 4px); width: 2px; transform: translateX(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                    `;
                }
                break;
                
            case 'outRange':
                if (isAftCrosshair) {
                    // Aft view - angled horizontal lines for out of range
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: 18px; height: 2px; 
                            transform: translateY(-50%) rotate(15deg); transform-origin: right center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: 18px; height: 2px; 
                            transform: translateY(-50%) rotate(-15deg); transform-origin: left center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                    `;
                } else {
                    // Front view - angled cross for out of range
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: calc(50% - 8px); height: 2px; 
                            transform: translateY(-50%) rotate(30deg); transform-origin: right center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: calc(50% - 8px); height: 2px; 
                            transform: translateY(-50%) rotate(30deg); transform-origin: left center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 0; left: 50%; height: calc(50% - 8px); width: 2px; 
                            transform: translateX(-50%) rotate(30deg); transform-origin: center bottom;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            bottom: 0; left: 50%; height: calc(50% - 8px); width: 2px; 
                            transform: translateX(-50%) rotate(30deg); transform-origin: center top;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                    `;
                }
                break;
                
            case 'dynamicTarget':
                // Dynamic circular reticle that scales based on active weapon properties
                const weaponCircleSize = this.calculateWeaponCircleSize();
                const innerDotSize = Math.max(4, weaponCircleSize / 10);
                
                container.innerHTML += `
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: ${weaponCircleSize}px; height: ${weaponCircleSize}px;
                        border: 2px dashed ${color}; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                        background: transparent; animation: rotate 3s linear infinite;
                    "></div>
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: ${innerDotSize}px; height: ${innerDotSize}px; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                    "></div>
                `;
                break;
        }
        
        // Update the elements array reference
        if (container === this.frontCrosshair) {
            this.frontCrosshairElements = Array.from(container.querySelectorAll('.crosshair-element'));
        } else if (container === this.aftCrosshair) {
            this.aftCrosshairElements = Array.from(container.querySelectorAll('.crosshair-element'));
        }
    }
    
    /**
     * Calculate circle size for dynamic target reticle based on active weapon
     * @returns {number} Circle diameter in pixels
     */
    calculateWeaponCircleSize() {
        // Default size if no weapon
        let baseSize = 40;
        
        if (this.ship?.weaponSystem?.getActiveWeapon) {
            const activeWeapon = this.ship.weaponSystem.getActiveWeapon();
            if (activeWeapon?.equippedWeapon) {
                const weapon = activeWeapon.equippedWeapon;
                
                // Base size calculation on weapon range (primary factor)
                const rangeKm = weapon.range / 1000;
                const rangeFactor = Math.min(rangeKm / 50, 2.0); // Scale up to 2x for long range weapons
                
                // Add blast radius factor for splash weapons
                let blastFactor = 1.0;
                if (weapon.blastRadius && weapon.blastRadius > 0) {
                    blastFactor = 1.0 + (weapon.blastRadius / 100); // Scale up based on blast radius
                }
                
                // Weapon type factor for visual distinction
                let typeFactor = 1.0;
                if (weapon.weaponType === 'scan-hit') {
                    typeFactor = 0.8; // Smaller for energy weapons (precise)
                } else if (weapon.blastRadius > 0) {
                    typeFactor = 1.4; // Larger for splash weapons
                } else {
                    typeFactor = 1.1; // Medium for direct-hit projectiles
                }
                
                // Calculate final size: base * range * blast * type factors
                baseSize = Math.round(40 * rangeFactor * blastFactor * typeFactor);
                
                // Clamp between reasonable limits
                baseSize = Math.max(30, Math.min(baseSize, 120));
            }
        }
        
        return baseSize;
    }
    
    /**
     * Add weapon range indicator when no target is present
     * @param {HTMLElement} container - Crosshair container
     * @param {string} color - Color for the indicator
     */
    addWeaponRangeIndicator(container, color) {
        // Get active weapon info
        let weaponInfo = 'No Weapon';
        if (this.ship?.weaponSystem?.getActiveWeapon) {
            const activeWeapon = this.ship.weaponSystem.getActiveWeapon();
            if (activeWeapon?.equippedWeapon) {
                const rangeKm = (activeWeapon.equippedWeapon.range / 1000).toFixed(1);
                weaponInfo = `${activeWeapon.equippedWeapon.name} (${rangeKm}km)`;
            }
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'range-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            color: ${color};
            font-family: 'Courier New', monospace;
            font-size: 10px;
            text-align: center;
            opacity: 0.7;
            pointer-events: none;
            white-space: nowrap;
            text-shadow: 0 0 3px ${color};
        `;
        indicator.textContent = weaponInfo;
        container.appendChild(indicator);
    }
    
    /**
     * Add range status indicator for targets
     * @param {HTMLElement} container - Crosshair container  
     * @param {string} status - Status text
     * @param {string} color - Color for the indicator
     */
    addRangeStatusIndicator(container, status, color) {
        const indicator = document.createElement('div');
        indicator.className = 'range-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            color: ${color};
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
            opacity: 0.9;
            pointer-events: none;
            white-space: nowrap;
            text-shadow: 0 0 4px ${color};
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 4px;
            border-radius: 2px;
        `;
        indicator.textContent = status;
        container.appendChild(indicator);
    }
    
    /**
     * Add corner brackets around crosshairs
     * @param {HTMLElement} container - Crosshair container
     * @param {string} color - Color for the brackets
     * @param {string} style - 'solid' or 'pulse'
     */
    addCornerBrackets(container, color, style) {
        const brackets = [
            // Top-left bracket
            { top: '10px', left: '10px', borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
            // Top-right bracket  
            { top: '10px', right: '10px', borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
            // Bottom-left bracket
            { bottom: '10px', left: '10px', borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
            // Bottom-right bracket
            { bottom: '10px', right: '10px', borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }
        ];
        
        brackets.forEach(bracketStyle => {
            const bracket = document.createElement('div');
            bracket.className = 'range-indicator bracket';
            bracket.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                pointer-events: none;
            `;
            
            // Apply bracket-specific styling
            Object.assign(bracket.style, bracketStyle);
            
            // Add pulsing animation if needed
            if (style === 'pulse') {
                bracket.style.animation = 'pulse 1s infinite';
            }
            
            container.appendChild(bracket);
        });
    }
    
    /**
     * Add a ring around crosshairs
     * @param {HTMLElement} container - Crosshair container
     * @param {string} color - Color for the ring
     * @param {string} style - 'solid' or 'dashed'
     */
    addRangeRing(container, color, style) {
        const ring = document.createElement('div');
        ring.className = 'range-indicator ring';
        ring.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 80px;
            height: 80px;
            border: 2px ${style} ${color};
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            opacity: 0.7;
            box-shadow: 0 0 6px ${color};
        `;
        
        container.appendChild(ring);
    }

    /**
     * Switch to a different ship type and reinitialize systems
     * @param {string} shipType - The new ship type to switch to
     */
    async switchShip(shipType) {
debug('UTILITY', `🔄 ViewManager: Switching ship from ${this.ship.shipType} to ${shipType}`);
        
        // Store current energy level to preserve it during switch
        const currentEnergyPercent = this.ship.currentEnergy / Math.max(this.ship.maxEnergy, 1);
        
        // Create new ship instance
        const oldShip = this.ship;
        this.ship = new Ship(shipType);
        
        // Restore energy as a percentage of max energy
        this.ship.currentEnergy = Math.max(100, this.ship.maxEnergy * currentEnergyPercent);
        
        // CRITICAL FIX: Load saved card configuration from PlayerData
        // This ensures that installed cards like impulse_engines are properly loaded
        try {
            // Import PlayerData and CardInventoryUI to access saved configurations
            const module = await import('../ui/CardInventoryUI.js');
            const CardInventoryUI = module.default;
            const playerData = CardInventoryUI.getPlayerData();
            
            if (playerData) {
                const savedConfig = playerData.getShipConfiguration(shipType);
debug('UI', `📦 Loading saved configuration for ${shipType}:`, savedConfig.size, 'cards');
                
                // Load the configuration into the ship's CardSystemIntegration
                if (this.ship.cardSystemIntegration && savedConfig.size > 0) {
                    // Clear existing cards and load from saved configuration
                    this.ship.cardSystemIntegration.installedCards.clear();
                    
                    // CRITICAL FIX: Also clear any existing weapon system to prevent stale data
                    if (this.ship.weaponSystem) {
                        debug('COMBAT', '🔫 Clearing existing weapon system during ship switch');
                        this.ship.weaponSystem = null;
                    }
                    if (this.ship.weaponSyncManager) {
                        debug('COMBAT', '🔫 Clearing weapon sync manager during ship switch');
                        this.ship.weaponSyncManager.weaponSystem = null;
                        this.ship.weaponSyncManager.weapons.clear();
                    }
                    
                    savedConfig.forEach((cardData, slotId) => {
                        if (cardData && cardData.cardType) {
                            this.ship.cardSystemIntegration.installedCards.set(slotId, {
                                cardType: cardData.cardType,
                                level: cardData.level || 1
                            });
debug('UI', `🃏 Loaded card: ${cardData.cardType} (Lv.${cardData.level || 1}) in slot ${slotId}`);
                        }
                    });
                    
                    // Initialize systems from the loaded cards
                    // Only create systems if they haven't been created yet (prevent duplicates)
                    const hasExistingSystems = this.ship.systems && this.ship.systems.size > 0;
                    debug('SYSTEM_FLOW', `🔍 ViewManager check: systems=${this.ship.systems}, size=${this.ship.systems?.size || 'undefined'}, hasExisting=${hasExistingSystems}`);

                    if (!hasExistingSystems) {
                        debug('SYSTEM_FLOW', '🚀 ViewManager creating systems from saved config');
                        await this.ship.cardSystemIntegration.createSystemsFromCards();
                    } else {
                        debug('SYSTEM_FLOW', '⏭️ Skipping system creation from saved config - systems already exist');
                    }
                    
                    // Re-initialize cargo holds from updated cards
                    if (this.ship.cargoHoldManager) {
                        this.ship.cargoHoldManager.initializeFromCards();
debug('UTILITY', '🚛 Cargo holds initialized from saved configuration');
                    }
                    
debug('UI', '✅ Card systems initialized from saved configuration');
                    
                } else {
debug('UI', `⚠️ No saved configuration found for ${shipType}, installing basic starter cards`);
                    
                    // CRITICAL: Install basic starter cards when no saved config exists
                    // This ensures every ship has essential systems like impulse_engines
                    if (this.ship.cardSystemIntegration) {
                        this.ship.cardSystemIntegration.installedCards.clear();
                        
                        // Install essential starter cards using centralized configuration
                        const starterCards = getStarterCardsArray(shipType);
                        
                        starterCards.forEach(({ slotId, cardType, level }) => {
                            this.ship.cardSystemIntegration.installedCards.set(slotId, {
                                cardType: cardType,
                                level: level
                            });
debug('UI', `🃏 Installed starter card: ${cardType} (Lv.${level}) in slot ${slotId}`);
                        });
                        
                        // Initialize systems from starter cards
                        // Only create systems if they haven't been created yet (prevent duplicates)
                        const hasExistingSystems = this.ship.systems && this.ship.systems.size > 0;
                        debug('SYSTEM_FLOW', `🔍 ViewManager starter check: systems=${this.ship.systems}, size=${this.ship.systems?.size || 'undefined'}, hasExisting=${hasExistingSystems}`);

                        if (!hasExistingSystems) {
                            debug('SYSTEM_FLOW', '🚀 ViewManager creating systems from starter cards');
                            await this.ship.cardSystemIntegration.createSystemsFromCards();
                        } else {
                            debug('SYSTEM_FLOW', '⏭️ Skipping system creation from starter cards - systems already exist');
                        }
                        
                        // Re-initialize cargo holds from starter cards
                        if (this.ship.cargoHoldManager) {
                            this.ship.cargoHoldManager.initializeFromCards();
debug('UI', '🚛 Cargo holds initialized from starter cards');
                        }
                        
debug('UI', '✅ Starter card systems initialized');
                    }
                }
                
                // Verify impulse engines are loaded
                const impulseEngines = this.ship.getSystem('impulse_engines');
                if (impulseEngines) {
debug('UTILITY', '✅ Impulse engines loaded successfully:', impulseEngines.isOperational());
                } else {
                    console.error('❌ Impulse engines still not found after configuration loading');
                }
            }
        } catch (error) {
            console.error('❌ Error loading saved configuration:', error);
        }
        
        // Update SubspaceRadio with new ship reference
        if (this.subspaceRadio) {
            this.subspaceRadio.ship = this.ship;
        }
        
        // Update StarfieldManager ship reference if available
        if (this.starfieldManager) {
            this.starfieldManager.ship = this.ship;
            
            // Set StarfieldManager reference on new ship
            if (typeof this.ship.setStarfieldManager === 'function') {
                this.ship.setStarfieldManager(this.starfieldManager);
            }
            
            // Update damage control HUD with new ship
            if (this.starfieldManager.damageControlHUD) {
                this.starfieldManager.damageControlHUD.ship = this.ship;
            }
        }
        
        // Initialize ship systems for the new ship - but prevent duplicate initialization
        if (!this.shipSystemsInitialized) {
            this.initializeShipSystems();
            this.shipSystemsInitialized = true;
        } else {
debug('UTILITY', 'ViewManager: Ship systems already initialized, skipping duplicate initialization');
            
            // Still trigger StarfieldManager ship system refresh for new ship
            if (this.starfieldManager && typeof this.starfieldManager.initializeShipSystems === 'function') {
debug('UTILITY', '🔄 ViewManager: Refreshing StarfieldManager systems for new ship');
                this.starfieldManager.initializeShipSystems();
            }
        }
        
debug('UTILITY', `✅ ViewManager: Ship switched to ${shipType}`, this.ship.getStatus());
    }
}

export default ViewManager; 