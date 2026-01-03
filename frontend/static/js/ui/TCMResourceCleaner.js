/**
 * TCMResourceCleaner
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles cleanup and disposal of all TCM resources.
 *
 * Features:
 * - Disposes all sub-managers
 * - Cleans up Three.js resources (geometries, materials, scenes)
 * - Removes DOM elements (HUD, reticle, panels)
 * - Clears target arrays and references
 * - Aborts event listeners via AbortController
 */

import { debug } from '../debug.js';

export class TCMResourceCleaner {
    /**
     * Create a TCMResourceCleaner
     * @param {Object} targetComputerManager - Reference to parent TCM for cleanup
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Clean up all resources
     */
    dispose() {
        debug('TARGETING', '⚡ TargetComputerManager disposal started...');

        // Abort all event listeners registered with AbortController
        this.abortEventListeners();

        // Stop wireframe animation
        this.tcm.stopWireframeAnimation();

        // Clean up all sub-managers
        this.disposeSubManagers();

        // Clean up Three.js resources
        this.disposeThreeJsResources();

        // Clean up UI elements
        this.disposeUIElements();

        // Clear target arrays and references
        this.clearTargetState();

        debug('TARGETING', '✅ TargetComputerManager disposal complete');
    }

    /**
     * Abort all event listeners registered with AbortController
     */
    abortEventListeners() {
        if (this.tcm._abortController) {
            this.tcm._abortController.abort();
            this.tcm._abortController = null;
        }
    }

    /**
     * Dispose all sub-managers
     */
    disposeSubManagers() {
        // Clean up TargetingFeedbackManager (handles timers and audio)
        if (this.tcm.targetingFeedbackManager) {
            this.tcm.targetingFeedbackManager.dispose();
        }

        // Clean up TargetOutlineManager
        if (this.tcm.targetOutlineManager) {
            this.tcm.targetOutlineManager.dispose();
        }

        // Clean up HUDStatusManager
        if (this.tcm.hudStatusManager) {
            this.tcm.hudStatusManager.dispose();
        }

        // Clean up TargetIdManager
        if (this.tcm.targetIdManager) {
            this.tcm.targetIdManager.dispose();
        }

        // Clear known targets cache (delegated to TargetListManager)
        if (this.tcm.targetListManager) {
            this.tcm.targetListManager.dispose();
        }

        // Clean up TargetStateManager
        if (this.tcm.targetStateManager) {
            this.tcm.targetStateManager.dispose();
        }

        // Clean up DestroyedTargetHandler
        if (this.tcm.destroyedTargetHandler) {
            this.tcm.destroyedTargetHandler.dispose();
        }

        // Clean up TargetHUDController
        if (this.tcm.targetHUDController) {
            this.tcm.targetHUDController.dispose();
        }

        // Clean up TargetComputerToggle
        if (this.tcm.targetComputerToggle) {
            this.tcm.targetComputerToggle.dispose();
        }

        // Clean up TargetWireframeCreator
        if (this.tcm.targetWireframeCreator) {
            this.tcm.targetWireframeCreator.dispose();
        }

        // Clean up ClickCycleHandler
        if (this.tcm.clickCycleHandler) {
            this.tcm.clickCycleHandler.dispose();
        }

        // Clean up TargetHUDBuilder
        if (this.tcm.targetHUDBuilder) {
            this.tcm.targetHUDBuilder.dispose();
        }

        // Clean up TargetUpdateLoop
        if (this.tcm.targetUpdateLoop) {
            this.tcm.targetUpdateLoop.dispose();
        }

        // Clean up TargetDisplayUpdater
        if (this.tcm.targetDisplayUpdater) {
            this.tcm.targetDisplayUpdater.dispose();
        }
    }

    /**
     * Dispose Three.js resources (renderers, scenes, geometries, materials)
     */
    disposeThreeJsResources() {
        // Clean up wireframe renderer
        if (this.tcm.wireframeRenderer) {
            this.tcm.wireframeRenderer.dispose();
            this.tcm.wireframeRenderer = null;
        }

        // Clean up sub-system wireframe renderer
        if (this.tcm.subSystemWireframeRenderer) {
            this.tcm.subSystemWireframeRenderer.dispose();
            this.tcm.subSystemWireframeRenderer = null;
        }

        // Clean up target wireframe
        this.disposeTargetWireframe();

        // Clean up wireframe scene children
        this.disposeWireframeScene();

        // Clean up sub-system wireframe scene
        this.disposeSubSystemWireframeScene();
    }

    /**
     * Dispose target wireframe geometry and material
     */
    disposeTargetWireframe() {
        if (this.tcm.targetWireframe) {
            if (this.tcm.wireframeScene) {
                this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
            }
            if (this.tcm.targetWireframe.geometry) {
                this.tcm.targetWireframe.geometry.dispose();
            }
            if (this.tcm.targetWireframe.material) {
                if (Array.isArray(this.tcm.targetWireframe.material)) {
                    this.tcm.targetWireframe.material.forEach(material => material.dispose());
                } else {
                    this.tcm.targetWireframe.material.dispose();
                }
            }
            this.tcm.targetWireframe = null;
        }
    }

    /**
     * Dispose wireframe scene and all children
     */
    disposeWireframeScene() {
        if (this.tcm.wireframeScene) {
            while (this.tcm.wireframeScene.children.length > 0) {
                const child = this.tcm.wireframeScene.children[0];
                this.tcm.wireframeScene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.tcm.wireframeScene = null;
        }
    }

    /**
     * Dispose sub-system wireframe scene and all children
     */
    disposeSubSystemWireframeScene() {
        if (this.tcm.subSystemWireframeScene) {
            while (this.tcm.subSystemWireframeScene.children.length > 0) {
                const child = this.tcm.subSystemWireframeScene.children[0];
                this.tcm.subSystemWireframeScene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.tcm.subSystemWireframeScene = null;
        }
    }

    /**
     * Dispose UI elements (HUD, reticle, panels, arrows)
     */
    disposeUIElements() {
        // Clean up target HUD
        if (this.tcm.targetHUD && this.tcm.targetHUD.parentNode) {
            this.tcm.targetHUD.parentNode.removeChild(this.tcm.targetHUD);
            this.tcm.targetHUD = null;
        }

        // Clean up target reticle
        if (this.tcm.targetReticle && this.tcm.targetReticle.parentNode) {
            this.tcm.targetReticle.parentNode.removeChild(this.tcm.targetReticle);
            this.tcm.targetReticle = null;
        }

        // Clean up sub-system panel
        if (this.tcm.subSystemPanel && this.tcm.subSystemPanel.parentNode) {
            this.tcm.subSystemPanel.parentNode.removeChild(this.tcm.subSystemPanel);
            this.tcm.subSystemPanel = null;
        }

        // Clean up direction arrows
        Object.values(this.tcm.directionArrows).forEach(arrow => {
            if (arrow && arrow.parentNode) {
                arrow.parentNode.removeChild(arrow);
            }
        });
        this.tcm.directionArrows = {};

        // Clean up target outline
        this.tcm.clearTargetOutline();
    }

    /**
     * Clear target arrays and null out references
     */
    clearTargetState() {
        // Clear target arrays
        this.tcm.targetObjects = [];
        this.tcm.validTargets = [];
        this.tcm.subTargetIndicators = [];
        this.tcm.targetableAreas = [];

        // Null out references
        this.tcm.currentTarget = null;
        this.tcm.previousTarget = null;
        this.tcm.targetedObject = null;
        this.tcm.scene = null;
        this.tcm.camera = null;
        this.tcm.viewManager = null;
        this.tcm.solarSystemManager = null;
    }
}
