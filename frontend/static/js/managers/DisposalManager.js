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

        // Clean up all sub-managers
        this.disposeManagers();

        // Clean up UI components
        this.disposeUIComponents();

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

        // Clean up AIInitManager (handles enemyAIManager)
        if (this.sfm.aiInitManager) {
            this.sfm.aiInitManager.dispose();
            this.sfm.aiInitManager = null;
        }

        // Clean up UtilityManagersInitializer (handles 14 utility managers)
        if (this.sfm.utilityManagersInitializer) {
            this.sfm.utilityManagersInitializer.dispose();
            this.sfm.utilityManagersInitializer = null;
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

        // Clean up MissionSystemCoordinator (handles all mission components)
        if (this.sfm.missionCoordinator) {
            this.sfm.missionCoordinator.dispose();
            this.sfm.missionCoordinator = null;
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

        // Clean up AudioInitManager (handles audioManager and listener)
        if (this.sfm.audioInitManager) {
            this.sfm.audioInitManager.dispose();
            this.sfm.audioInitManager = null;
        }

        // Intel HUD cleanup delegated to IntelDisplayManager
        if (this.sfm.intelDisplayManager) {
            this.sfm.intelDisplayManager.destroy();
        }

        // Clean up CommunicationManager
        if (this.sfm.communicationManagerDelegate) {
            this.sfm.communicationManagerDelegate.dispose();
            this.sfm.communicationManagerDelegate = null;
        }

        // Clean up FactionDiplomacyManager
        if (this.sfm.factionDiplomacyManager) {
            this.sfm.factionDiplomacyManager.dispose();
            this.sfm.factionDiplomacyManager = null;
        }

        // Clean up ButtonStateManager
        if (this.sfm._buttonStateManager) {
            this.sfm._buttonStateManager.dispose();
            this.sfm._buttonStateManager = null;
            this.sfm.buttonStateManager = null;
        }

        // Clean up UpdateLoopManager
        if (this.sfm.updateLoopManager) {
            this.sfm.updateLoopManager.dispose();
            this.sfm.updateLoopManager = null;
        }

        // Clean up MiscSystemManager
        if (this.sfm.miscSystemManager) {
            this.sfm.miscSystemManager.dispose();
            this.sfm.miscSystemManager = null;
        }

        // Clean up TargetStateManager
        if (this.sfm.targetStateManager) {
            this.sfm.targetStateManager.dispose();
            this.sfm.targetStateManager = null;
        }

        // Clean up CameraStateManager
        if (this.sfm.cameraStateManager) {
            this.sfm.cameraStateManager.dispose();
            this.sfm.cameraStateManager = null;
        }

        // Clean up DamageControlStateManager
        if (this.sfm.damageControlStateManager) {
            this.sfm.damageControlStateManager.dispose();
            this.sfm.damageControlStateManager = null;
        }

        // Clean up ViewStateManager
        if (this.sfm.viewStateManager) {
            this.sfm.viewStateManager.dispose();
            this.sfm.viewStateManager = null;
        }

        // Clean up HUDContainerManager
        if (this.sfm.hudContainerManager) {
            this.sfm.hudContainerManager.dispose();
            this.sfm.hudContainerManager = null;
        }

        // Clean up DockingUIManager
        if (this.sfm.dockingUIManager) {
            this.sfm.dockingUIManager.dispose();
            this.sfm.dockingUIManager = null;
        }

        // Clean up InterfaceInitManager
        if (this.sfm.interfaceInitManager) {
            this.sfm.interfaceInitManager.dispose();
            this.sfm.interfaceInitManager = null;
        }
    }

    /**
     * Dispose UI components (modals, HUDs)
     */
    disposeUIComponents() {
        // Note: dockingModal is now cleaned up by DockingUIManager.dispose() in disposeManagers()
        // Note: damageControlHUD and damageControlContainer are now cleaned up
        // by HUDContainerManager.dispose() in disposeManagers()

        // Clean up target dummy ships
        this.sfm.clearTargetDummyShips();
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
     * Delegated to GlobalReferencesManager
     */
    disposeGlobalReferences() {
        if (this.sfm.globalReferencesManager) {
            this.sfm.globalReferencesManager.dispose();
            this.sfm.globalReferencesManager = null;
        }
    }

    /**
     * Clear all pending timeouts via TimeoutManager
     */
    disposeTimeouts() {
        if (this.sfm.timeoutManager) {
            this.sfm.timeoutManager.dispose();
            this.sfm.timeoutManager = null;
        }
    }
}
