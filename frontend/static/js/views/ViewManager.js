import * as THREE from 'three';
import { GalacticChart } from './GalacticChart.js';
import { LongRangeScanner } from './LongRangeScanner.js';
import WarpFeedback from '../WarpFeedback.js';
import WarpDriveManager from '../WarpDriveManager.js';
import Ship from '../ship/Ship.js';
import Shields from '../ship/systems/Shields.js';

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
        
        // Initialize Ship instance (replacing simple shipEnergy)
        this.ship = new Ship('heavy_fighter');
        // Maintain backward compatibility by setting ship energy to existing value
        this.ship.currentEnergy = 9999;
        
        // Initialize default ship systems
        this.initializeShipSystems();
        
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
        
        // Initialize feedback systems
        this.warpFeedback = new WarpFeedback();
        
        // Initialize warp drive manager
        this.warpDriveManager = new WarpDriveManager(scene, camera, this);
        
        // Create crosshairs
        this.createCrosshairs();
        
        // Create galactic chart and ensure it's hidden
        this.galacticChart = new GalacticChart(this);
        
        // Create long range scanner and ensure it's hidden
        this.longRangeScanner = new LongRangeScanner(this);
        
        // Set initial view state - this will also set this.currentView
        this.setView(VIEW_TYPES.FORE);
        
        // Bind keyboard events
        this.bindKeyEvents();
        
        console.log('ViewManager initialized with Ship:', this.ship.getStatus());
    }

    setStarfieldManager(manager) {
        this.starfieldManager = manager;
    }

    // Add method to set SolarSystemManager
    setSolarSystemManager(manager) {
        this.solarSystemManager = manager;
        console.log('SolarSystemManager set in ViewManager');
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
        this.frontCrosshair.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 0;
                width: calc(50% - 8px);
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                right: 0;
                width: calc(50% - 8px);
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div style="
                position: absolute;
                top: 0;
                left: 50%;
                height: calc(50% - 8px);
                width: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateX(-50%);
            "></div>
            <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                height: calc(50% - 8px);
                width: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateX(-50%);
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 4px;
                height: 4px;
                background: #00ff41;
                border-radius: 50%;
                box-shadow: 0 0 4px #00ff41;
                transform: translate(-50%, -50%);
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
        this.aftCrosshair.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 0;
                width: 18px;
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                right: 0;
                width: 18px;
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 4px;
                height: 4px;
                background: #00ff41;
                border-radius: 50%;
                box-shadow: 0 0 4px #00ff41;
                transform: translate(-50%, -50%);
            "></div>
        `;
        
        this.crosshairContainer.appendChild(this.frontCrosshair);
        this.crosshairContainer.appendChild(this.aftCrosshair);
        document.body.appendChild(this.crosshairContainer);
    }

    bindKeyEvents() {
        document.addEventListener('keydown', (event) => {
            if (this.editMode) return; // Ignore view changes in edit mode
            
            const key = event.key.toLowerCase();
            const isGalacticChartVisible = this.galacticChart.isVisible();
            const isLongRangeScannerVisible = this.longRangeScanner.isVisible();
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
                
                if (isGalacticChartVisible) {
                    console.log('Restoring previous view');
                    this.galacticChart.hide(true);
                } else {
                    // If scanner is visible, hide it first
                    if (isLongRangeScannerVisible) {
                        console.log('Hiding scanner before showing galactic chart');
                        this.longRangeScanner.hide(false);
                    }
                    console.log('Setting view to GALACTIC');
                    this.setView(VIEW_TYPES.GALACTIC);
                }
            } else if (key === 'l') {
                // Block long range scanner completely when docked
                if (isDocked) {
                    return; // Early return - completely ignore the key when docked
                }
                
                event.preventDefault();
                event.stopPropagation();
                
                if (isLongRangeScannerVisible) {
                    console.log('Restoring previous view');
                    this.longRangeScanner.hide(true);
                } else {
                    // If galactic chart is visible, hide it first
                    if (isGalacticChartVisible) {
                        console.log('Hiding galactic chart before showing scanner');
                        this.galacticChart.hide(false);
                    }
                    console.log('Setting view to SCANNER');
                    this.setView(VIEW_TYPES.SCANNER);
                }
            } else if (key === 's' && !isDocked) {
                // Shield toggle - only when not docked
                event.preventDefault();
                event.stopPropagation();
                
                // Play command sound like other command keys
                if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                    this.starfieldManager.playCommandSound();
                }
                
                // Get shields system from ship
                const shieldsSystem = this.ship.systems.get('shields');
                if (shieldsSystem) {
                    const newState = shieldsSystem.toggleShields();
                    console.log(`Shields ${newState ? 'UP' : 'DOWN'} - Energy consumption: ${shieldsSystem.getEnergyConsumptionRate().toFixed(2)}/sec`);
                    
                    // Show shield status in console for feedback
                    const status = shieldsSystem.getStatus();
                    console.log(`Shield strength: ${status.currentShieldStrength.toFixed(2)}/${status.maxShieldStrength.toFixed(2)} - Damage absorption: ${(status.damageAbsorption * 100).toFixed(1)}%`);
                } else {
                    console.log('No shields system found on ship');
                }
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
        console.log('setView called:', {
            viewType,
            currentView: this.currentView,
            isGalacticVisible: this.galacticChart.isVisible(),
            isLongRangeScannerVisible: this.longRangeScanner.isVisible(),
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
            if (this.galacticChart.isVisible()) {
                this.galacticChart.hide(true);
                return;
            } else {
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
            if (this.longRangeScanner.isVisible()) {
                this.longRangeScanner.hide();
                return;
            } else {
                this.longRangeScanner.show();
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
            console.log('Already in requested view, returning');
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
                this.galacticChart.hide(false);
                this.longRangeScanner.hide();
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
                this.galacticChart.hide(false);
                this.longRangeScanner.hide();
                // Only show crosshair if not docked
                if (!this.starfieldManager?.isDocked) {
                    this.aftCrosshair.style.display = 'block';
                }
                break;
        }
        
        // Update the current view BEFORE notifying StarfieldManager
        this.currentView = viewType;
        console.log('Updated current view to:', this.currentView);
        
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
            console.log('Not in galactic or scanner view, returning');
            return;
        }
        
        // Hide the appropriate view without triggering another view restoration
        if (this.currentView === VIEW_TYPES.GALACTIC) {
            this.galacticChart.hide(false);
        } else if (this.currentView === VIEW_TYPES.SCANNER) {
            this.longRangeScanner.hide(false);
        }
        
        // If docked, restore to previous view or force FORE
        if (this.starfieldManager?.isDocked) {
            console.log('Ship is docked, restoring to previous view or FORE');
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
            
        console.log('Restoring to view:', viewToRestore);
        
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
        console.log('Updated current view to:', this.currentView);
        
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
        console.log(`Ship energy updated: ${oldEnergy.toFixed(2)} -> ${this.ship.currentEnergy.toFixed(2)} (change: ${amount.toFixed(2)})`);
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
        if (this.longRangeScanner) {
            this.longRangeScanner.dispose();
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
        }
        
        // Update warp drive manager
        if (this.warpDriveManager) {
            this.warpDriveManager.update(deltaTime);
        }
    }

    getCamera() {
        return this.camera;
    }

    /**
     * Initialize default ship systems
     */
    initializeShipSystems() {
        // Add shields system (Level 1)
        const shields = new Shields(1);
        this.ship.addSystem('shields', shields);
        
        console.log('Ship systems initialized - shields added');
    }
}

export default ViewManager; 