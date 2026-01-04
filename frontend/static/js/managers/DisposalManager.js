/**
 * DisposalManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles cleanup and disposal of all StarfieldManager resources.
 *
 * Features:
 * - Dispose all sub-managers and components
 * - Clean up UI elements and DOM nodes
 * - Clear intervals and timeouts
 * - Remove global references
 * - Clean up Three.js resources (geometry, materials)
 */

import { debug } from '../debug.js';

export class DisposalManager {
    /**
     * Create a DisposalManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Dispose of all StarfieldManager resources
     * This is the main cleanup method called when StarfieldManager is destroyed
     */
    dispose() {
        debug('UTILITY', '⚡ StarfieldManager disposal started...');

        // Abort all event listeners registered with AbortController
        this.disposeEventListeners();

        // Clean up UI components BEFORE managers (some UI cleanup needs manager access)
        this.disposeUIComponents();

        // Clean up all sub-managers
        this.disposeManagers();

        // Clean up intervals
        this.disposeIntervals();

        // Clean up Three.js resources
        this.disposeThreeJsResources();

        // Clean up UI elements
        this.disposeUIElements();

        // Remove global references
        this.disposeGlobalReferences();

        // Clear all pending timeouts
        this.disposeTimeouts();

        // Clear core references
        this.sfm.ship = null;
        this.sfm.scene = null;
        this.sfm.camera = null;
        this.sfm.viewManager = null;

        debug('UTILITY', '✅ StarfieldManager disposal complete');
    }

    /**
     * Dispose event listeners via AbortController
     */
    disposeEventListeners() {
        if (this.sfm._abortController) {
            this.sfm._abortController.abort();
            this.sfm._abortController = null;
        }
    }

    /**
     * Dispose all sub-managers
     */
    disposeManagers() {
        // Clean up TargetingInitManager (handles targetComputerManager, starChartsManager, proximityDetector3D)
        if (this.sfm.targetingInitManager) {
            this.sfm.targetingInitManager.dispose();
            this.sfm.targetingInitManager = null;
        }

        // Clean up UtilityManagersInitializer (handles 14 utility managers)
        if (this.sfm.utilityManagersInitializer) {
            this.sfm.utilityManagersInitializer.dispose();
            this.sfm.utilityManagersInitializer = null;
        }

        // Clean up CoreManagersInitializer (handles 10 core managers)
        if (this.sfm.coreManagersInitializer) {
            this.sfm.coreManagersInitializer.dispose();
            this.sfm.coreManagersInitializer = null;
        }

        // Clean up StateManagersInitializer (handles 3 state managers)
        if (this.sfm.stateManagersInitializer) {
            this.sfm.stateManagersInitializer.dispose();
            this.sfm.stateManagersInitializer = null;
        }

        // Clean up InputSystemsInitializer (handles 3 input/operations managers)
        if (this.sfm.inputSystemsInitializer) {
            this.sfm.inputSystemsInitializer.dispose();
            this.sfm.inputSystemsInitializer = null;
        }

        // Clean up HUDInitializer (handles 2 HUD managers)
        if (this.sfm.hudInitializer) {
            this.sfm.hudInitializer.dispose();
            this.sfm.hudInitializer = null;
        }

        // Clean up UIManagersInitializer (handles 3 UI managers)
        if (this.sfm.uiManagersInitializer) {
            this.sfm.uiManagersInitializer.dispose();
            this.sfm.uiManagersInitializer = null;
        }

        // Clean up InfrastructureInitializer (handles 4 infrastructure managers)
        if (this.sfm.infrastructureInitializer) {
            this.sfm.infrastructureInitializer.dispose();
            this.sfm.infrastructureInitializer = null;
        }

        // Clean up GameLogicInitializer (handles 2 game logic managers)
        if (this.sfm.gameLogicInitializer) {
            this.sfm.gameLogicInitializer.dispose();
            this.sfm.gameLogicInitializer = null;
        }

        // Clean up WeaponHUD
        if (this.sfm.weaponHUD) {
            if (typeof this.sfm.weaponHUD.dispose === 'function') {
                this.sfm.weaponHUD.dispose();
            }
            this.sfm.weaponHUD = null;
        }

        // Clean up HelpInterface
        if (this.sfm.helpInterface) {
            if (typeof this.sfm.helpInterface.dispose === 'function') {
                this.sfm.helpInterface.dispose();
            }
            this.sfm.helpInterface = null;
        }

        // Clean up RenderingInitManager (handles starfieldRenderer)
        if (this.sfm.renderingInitManager) {
            this.sfm.renderingInitManager.dispose();
            this.sfm.renderingInitManager = null;
        }

        // Clean up wireframe renderer
        if (this.sfm.wireframeRenderer) {
            this.sfm.wireframeRenderer.dispose();
            this.sfm.wireframeRenderer = null;
        }

    }

    /**
     * Dispose UI components (modals, HUDs)
     * Called BEFORE disposeManagers() to ensure managers are still available
     */
    disposeUIComponents() {
        // Note: dockingModal is now cleaned up by DockingUIManager.dispose() in disposeManagers()
        // Note: damageControlHUD and damageControlContainer are now cleaned up
        // by HUDContainerManager.dispose() in disposeManagers()

        // Clean up target dummy ships
        if (this.sfm.targetDummyManager) {
            this.sfm.clearTargetDummyShips();
        }
    }

    /**
     * Dispose intervals (repair, weapon HUD retry)
     */
    disposeIntervals() {
        // Clean up repair system interval
        if (this.sfm.repairUpdateInterval) {
            clearInterval(this.sfm.repairUpdateInterval);
            this.sfm.repairUpdateInterval = null;
        }

        // Clean up WeaponHUD retry interval
        if (this.sfm.weaponHUDRetryInterval) {
            clearInterval(this.sfm.weaponHUDRetryInterval);
            this.sfm.weaponHUDRetryInterval = null;
        }
    }

    /**
     * Dispose Three.js resources (geometry, materials)
     */
    disposeThreeJsResources() {
        if (this.sfm.targetWireframe) {
            if (this.sfm.wireframeScene) {
                this.sfm.wireframeScene.remove(this.sfm.targetWireframe);
            }
            if (this.sfm.targetWireframe.geometry) {
                this.sfm.targetWireframe.geometry.dispose();
            }
            if (this.sfm.targetWireframe.material) {
                if (Array.isArray(this.sfm.targetWireframe.material)) {
                    this.sfm.targetWireframe.material.forEach(material => material.dispose());
                } else {
                    this.sfm.targetWireframe.material.dispose();
                }
            }
            this.sfm.targetWireframe = null;
        }
    }

    /**
     * Dispose UI elements (HUDs, indicators)
     */
    disposeUIElements() {
        if (this.sfm.shipSystemsHUD && this.sfm.shipSystemsHUD.parentNode) {
            this.sfm.shipSystemsHUD.parentNode.removeChild(this.sfm.shipSystemsHUD);
            this.sfm.shipSystemsHUD = null;
        }
        if (this.sfm.speedIndicator && this.sfm.speedIndicator.parentNode) {
            this.sfm.speedIndicator.parentNode.removeChild(this.sfm.speedIndicator);
            this.sfm.speedIndicator = null;
        }
    }

    /**
     * Remove global window references
     * Now handled by InfrastructureInitializer.dispose()
     */
    disposeGlobalReferences() {
        // GlobalReferencesManager is now handled by InfrastructureInitializer
    }

    /**
     * Clear all pending timeouts via TimeoutManager
     * Now handled by InfrastructureInitializer.dispose()
     */
    disposeTimeouts() {
        // TimeoutManager is now handled by InfrastructureInitializer
    }
}
