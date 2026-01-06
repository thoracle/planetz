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
import { getStarterCardsArray } from '../ship/ShipConfigs.js';
import { debug } from '../debug.js';
import { VMCrosshairManager } from './viewManager/VMCrosshairManager.js';
import { VMKeyboardHandler, VIEW_TYPES as VM_VIEW_TYPES } from './viewManager/VMKeyboardHandler.js';

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

        // Memory leak prevention: track event handlers and DOM elements for cleanup
        this._globalReferences = ['navigationSystemManager', 'starChartsManager'];

        // Initialize extracted handlers
        this.crosshairManager = new VMCrosshairManager(this);
        this.keyboardHandler = new VMKeyboardHandler(this);
        
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
        
        // Create crosshairs via handler
        this.crosshairManager.createCrosshairs();
        // Store references for backwards compatibility
        this.crosshairContainer = this.crosshairManager.crosshairContainer;
        this.frontCrosshair = this.crosshairManager.frontCrosshair;
        this.aftCrosshair = this.crosshairManager.aftCrosshair;
        this.frontCrosshairElements = this.crosshairManager.frontCrosshairElements;
        this.aftCrosshairElements = this.crosshairManager.aftCrosshairElements;
        
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
        
        // Bind keyboard events via handler
        this.keyboardHandler.bindKeyEvents();
        
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
        debug('UTILITY', '🧹 Disposing ViewManager...');

        // Dispose handlers
        if (this.keyboardHandler) {
            this.keyboardHandler.dispose();
        }
        if (this.crosshairManager) {
            this.crosshairManager.dispose();
        }

        // Clean up global window references
        if (typeof window !== 'undefined') {
            for (const refName of this._globalReferences) {
                if (window[refName]) {
                    delete window[refName];
                }
            }
        }

        // Dispose subsystems
        if (this.galacticChart) {
            this.galacticChart.dispose();
        }
        if (this.navigationSystemManager) {
            this.navigationSystemManager.destroy();
        }
        if (this.subspaceRadio) {
            this.subspaceRadio.dispose();
        }
        if (this.warpFeedback && this.warpFeedback.dispose) {
            this.warpFeedback.dispose();
        }
        if (this.warpDriveManager && this.warpDriveManager.dispose) {
            this.warpDriveManager.dispose();
        }

        // Null out references
        this.crosshairContainer = null;
        this.frontCrosshair = null;
        this.aftCrosshair = null;
        this.frontCrosshairElements = null;
        this.aftCrosshairElements = null;
        this.galacticChart = null;
        this.navigationSystemManager = null;
        this.longRangeScanner = null;
        this.subspaceRadio = null;
        this.warpFeedback = null;
        this.warpDriveManager = null;
        this.ship = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.starfieldManager = null;
        this.solarSystemManager = null;

        debug('UTILITY', '🧹 ViewManager disposed');
    }

    /**
     * Alias for dispose() for consistency with other components
     */
    destroy() {
        this.dispose();
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
        this.crosshairManager.updateCrosshairDisplay();
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
                debug('P1', 'Failed to initialize ship systems via StarfieldManager:', error);
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
        debug('UTILITY', 'getDamageControl() is deprecated - use StarfieldManager.damageControlInterface instead');
        return null;
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
                    debug('P1', '❌ Impulse engines still not found after configuration loading');
                }
            }
        } catch (error) {
            debug('P1', '❌ Error loading saved configuration:', error);
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