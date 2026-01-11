/**
 * Debug utilities for the PlanetZ game.
 * Extracted from app.js to reduce file size and improve modularity.
 *
 * Contains:
 * - DebugManager class for Three.js debug info (stats, axes, grid)
 * - Debug window functions (testNotification, checkDiscoveries, testHUD, checkActiveProjectiles)
 */

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { debug } from '../debug.js';

/**
 * Three.js Debug Manager
 * Handles FPS stats, debug info panel, axes helper, and grid helper
 */
export class DebugManager {
    constructor() {
        this.stats = new Stats();
        this.debugInfo = document.createElement('div');
        this.visible = false;
        this.axesHelper = new THREE.AxesHelper(5);
        this.gridHelper = new THREE.GridHelper(10, 10);
        this.scene = null;

        // References to managers (set after initialization)
        this._viewManager = null;
        this._solarSystemManager = null;

        // Configure stats
        this.stats.dom.style.cssText = `
            position: fixed !important;
            top: 70px !important;
            left: 10px !important;
            display: none;
            z-index: 1000;
            pointer-events: none;
        `;

        // Configure debug info
        this.debugInfo.style.cssText = `
            position: fixed !important;
            top: 120px !important;
            left: 10px !important;
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 5px;
            display: none;
            pointer-events: auto;
            transform: none !important;
        `;

        // Configure helpers
        this.axesHelper.visible = false;
        this.gridHelper.visible = false;
    }

    /**
     * Initialize debug manager with scene and UI container
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {HTMLElement} uiContainer - Container for UI elements
     */
    initialize(scene, uiContainer) {
        this.scene = scene;
        document.body.appendChild(this.stats.dom);
        uiContainer.appendChild(this.debugInfo);
        scene.add(this.axesHelper);
        scene.add(this.gridHelper);
    }

    /**
     * Set manager references for debug info
     * @param {ViewManager} viewManager
     * @param {SolarSystemManager} solarSystemManager
     */
    setManagers(viewManager, solarSystemManager) {
        this._viewManager = viewManager;
        this._solarSystemManager = solarSystemManager;
    }

    /**
     * Toggle debug visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.stats.dom.style.display = this.visible ? 'block' : 'none';
        this.debugInfo.style.display = this.visible ? 'block' : 'none';
        this.updateInfo();
    }

    /**
     * Update debug info display
     */
    updateInfo() {
        if (!this.visible) return;

        let html = '';

        // Add solar system info if available
        if (this._solarSystemManager && this._solarSystemManager.getDebugInfo) {
            const solarSystemInfo = this._solarSystemManager.getDebugInfo();
            for (const [key, value] of Object.entries(solarSystemInfo)) {
                html += `${key}: ${value}<br>`;
            }
        }

        // Add camera position if available
        if (this._viewManager && this._viewManager.camera) {
            const pos = this._viewManager.camera.position;
            html += `<br>Camera Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>`;
        }

        this.debugInfo.innerHTML = html;
    }

    /**
     * Set edit mode (shows/hides axes and grid helpers)
     * @param {boolean} enabled
     */
    setEditMode(enabled) {
        this.axesHelper.visible = enabled;
        this.gridHelper.visible = enabled;
    }

    /**
     * Update method called each frame
     */
    update() {
        if (this.visible) {
            this.updateInfo();
        }
        this.stats.update();
    }
}

/**
 * Set up debug window functions for console access
 * These functions are exposed on window for manual testing/debugging
 */
export function setupDebugWindowFunctions() {
    // Test achievement notification system
    window.testNotification = () => {
        debug('P1', 'Testing achievement notification system');
        if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
            debug('P1', 'StarfieldManager found, showing test notification');
            window.starfieldManager.showHUDEphemeral(
                'Test Achievement!',
                'This is a test notification',
                5000
            );
            return 'Test notification sent!';
        } else {
            debug('P1', 'StarfieldManager or showHUDEphemeral not available');
            return 'Notification system not available';
        }
    };

    // Check discovery status
    window.checkDiscoveries = () => {
        if (window.starfieldManager && window.starfieldManager.navigationSystemManager) {
            const starCharts = window.starfieldManager.navigationSystemManager.starChartsManager;
            if (starCharts) {
                const discoveryCount = starCharts.discoveredObjects ? starCharts.discoveredObjects.size : 0;
                debug('STAR_CHARTS', `Current discoveries: ${discoveryCount}`);

                if (starCharts.discoveredObjects && starCharts.discoveredObjects.size > 0) {
                    debug('STAR_CHARTS', 'Discovered objects:');
                    Array.from(starCharts.discoveredObjects).slice(0, 5).forEach((id, i) => {
                        debug('STAR_CHARTS', `  ${i + 1}: ${id}`);
                    });
                }

                return `Found ${discoveryCount} discoveries`;
            } else {
                return 'StarChartsManager not available';
            }
        } else {
            return 'Navigation system not available';
        }
    };

    // Test HUD ephemeral system
    window.testHUD = () => {
        debug('P1', 'Testing HUD ephemeral system');

        if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
            debug('P1', 'StarfieldManager ready, showing test HUD message');

            window.starfieldManager.showHUDEphemeral(
                'ACHIEVEMENT TEST',
                'This notification should be visible at the top center of your screen!',
                10000
            );

            setTimeout(() => {
                const hudElement = window.starfieldManager.hudEphemeralElement;
                if (hudElement) {
                    debug('P1', `HUD element exists: display=${hudElement.style.display}`);
                } else {
                    debug('P1', 'No HUD element found');
                }
            }, 500);

            return 'HUD test message sent!';
        } else {
            debug('P1', 'StarfieldManager not ready yet');
            return 'StarfieldManager not ready yet';
        }
    };

    // Check active projectiles
    window.checkActiveProjectiles = () => {
        if (!window.activeProjectiles) {
            debug('INSPECTION', 'PROJECTILE DEBUG: No activeProjectiles array found');
            return;
        }

        debug('INSPECTION', `PROJECTILE DEBUG: ${window.activeProjectiles.length} active projectiles`);
        window.activeProjectiles.forEach((projectile, index) => {
            const flightTimeMs = Date.now() - (projectile.launchTimeMs || projectile.launchTime || 0);
            debug('INSPECTION', `  ${index + 1}. ${projectile.weaponName || 'Unknown'} - Flight time: ${(flightTimeMs/1000).toFixed(1)}s, Active: ${projectile.isActive ? projectile.isActive() : 'N/A'}, Detonated: ${projectile.hasDetonated || false}`);
        });
    };

    debug('P1', 'Debug window functions initialized');
}
