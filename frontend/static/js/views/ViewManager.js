import * as THREE from 'three';
import { GalacticChart } from './GalacticChart.js';

export const VIEW_TYPES = {
    FRONT: 'front',
    AFT: 'aft',
    GALACTIC: 'galactic'
};

export class ViewManager {
    constructor(scene, camera, controls) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.currentView = VIEW_TYPES.FRONT;
        this.previousView = VIEW_TYPES.FRONT;
        this.editMode = false;
        this.starfieldManager = null; // Will be set by setStarfieldManager
        
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
        
        // Create crosshairs
        this.createCrosshairs();
        
        // Create galactic chart
        this.galacticChart = new GalacticChart(this);
        
        // Bind keyboard events
        this.bindKeyEvents();
    }

    setStarfieldManager(manager) {
        this.starfieldManager = manager;
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
            width: 40px;
            height: 40px;
            position: relative;
            display: none;
        `;
        this.frontCrosshair.innerHTML = `
            <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: white;"></div>
            <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 100%; background: white;"></div>
        `;
        
        // Create aft view crosshair (-- --)
        this.aftCrosshair = document.createElement('div');
        this.aftCrosshair.style.cssText = `
            width: 80px;
            height: 40px;
            position: relative;
            display: none;
        `;
        this.aftCrosshair.innerHTML = `
            <div style="position: absolute; top: 50%; left: 0; width: 30%; height: 2px; background: white;"></div>
            <div style="position: absolute; top: 50%; right: 0; width: 30%; height: 2px; background: white;"></div>
        `;
        
        this.crosshairContainer.appendChild(this.frontCrosshair);
        this.crosshairContainer.appendChild(this.aftCrosshair);
        document.body.appendChild(this.crosshairContainer);
        
        // Show front crosshair by default
        this.frontCrosshair.style.display = 'block';
    }

    bindKeyEvents() {
        document.addEventListener('keydown', (event) => {
            if (this.editMode) return; // Ignore view changes in edit mode
            
            const key = event.key.toLowerCase();
            if (key === 'f' && this.currentView === VIEW_TYPES.AFT) {
                this.setView(VIEW_TYPES.FRONT);
            } else if (key === 'a' && this.currentView === VIEW_TYPES.FRONT) {
                this.setView(VIEW_TYPES.AFT);
            } else if (key === 'g') {
                this.setView(VIEW_TYPES.GALACTIC);
            }
        });
    }

    setView(viewType) {
        if (this.editMode) return; // Don't change views in edit mode
        
        // Don't store previous view if we're already in that view
        if (this.currentView === viewType) return;

        // Store previous view and camera state
        if (viewType === VIEW_TYPES.GALACTIC) {
            // When entering galactic view, save current state
            this.previousView = this.currentView;
            this.savedCameraState.position.copy(this.camera.position);
            this.savedCameraState.quaternion.copy(this.camera.quaternion);
        }
        
        // Hide all crosshairs first
        this.frontCrosshair.style.display = 'none';
        this.aftCrosshair.style.display = 'none';
        
        switch(viewType) {
            case VIEW_TYPES.FRONT:
                if (this.currentView === VIEW_TYPES.GALACTIC) {
                    // Restore camera state when coming from galactic view
                    this.camera.position.copy(this.savedCameraState.position);
                    this.camera.quaternion.copy(this.savedCameraState.quaternion);
                } else {
                    this.setFrontView();
                }
                this.galacticChart.hide(false); // Don't trigger view restoration
                this.frontCrosshair.style.display = 'block';
                break;
            case VIEW_TYPES.AFT:
                if (this.currentView === VIEW_TYPES.GALACTIC) {
                    // Restore camera state when coming from galactic view
                    this.camera.position.copy(this.savedCameraState.position);
                    this.camera.quaternion.copy(this.savedCameraState.quaternion);
                    // Then rotate 180 degrees since we're switching to aft
                    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
                    euler.y += Math.PI;
                    this.camera.quaternion.setFromEuler(euler);
                } else {
                    this.setAftView();
                }
                this.galacticChart.hide(false); // Don't trigger view restoration
                this.aftCrosshair.style.display = 'block';
                break;
            case VIEW_TYPES.GALACTIC:
                this.setGalacticView();
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

    setGalacticView() {
        // Hide crosshairs
        this.frontCrosshair.style.display = 'none';
        this.aftCrosshair.style.display = 'none';
        
        // Show galactic chart but keep the current camera view
        this.galacticChart.show();
        
        // Keep the current camera state
        // The 3D scene will continue to be visible through the semi-transparent overlay
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
        // Don't restore if we're not in galactic view
        if (this.currentView !== VIEW_TYPES.GALACTIC) return;
        
        // Default to FRONT view if no previous view is stored
        const viewToRestore = this.previousView || VIEW_TYPES.FRONT;
        
        // Hide the galactic chart without triggering another view restoration
        this.galacticChart.hide(false);
        
        // Restore the camera state
        this.camera.position.copy(this.savedCameraState.position);
        this.camera.quaternion.copy(this.savedCameraState.quaternion);
        
        // If restoring to AFT view, apply the 180-degree rotation
        if (viewToRestore === VIEW_TYPES.AFT) {
            const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
            euler.y += Math.PI;
            this.camera.quaternion.setFromEuler(euler);
        }
        
        // Update crosshairs
        this.frontCrosshair.style.display = viewToRestore === VIEW_TYPES.FRONT ? 'block' : 'none';
        this.aftCrosshair.style.display = viewToRestore === VIEW_TYPES.AFT ? 'block' : 'none';
        
        // Update the current view and notify StarfieldManager
        this.currentView = viewToRestore;
        if (this.starfieldManager) {
            this.starfieldManager.setView(viewToRestore.toUpperCase());
        }
    }

    dispose() {
        // Clean up DOM elements
        if (this.crosshairContainer && this.crosshairContainer.parentNode) {
            this.crosshairContainer.parentNode.removeChild(this.crosshairContainer);
        }
        if (this.galacticChart) {
            this.galacticChart.dispose();
        }
    }
} 