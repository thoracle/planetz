/**
 * PropertyProxyInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles Object.defineProperty setup for backwards compatibility proxies.
 *
 * These proxies allow external code to access manager state directly
 * on StarfieldManager while the actual state lives in sub-managers.
 */

export class PropertyProxyInitializer {
    /**
     * Initialize all property proxies on StarfieldManager
     * @param {Object} sfm - StarfieldManager instance
     */
    static initialize(sfm) {
        // Docking state proxies
        PropertyProxyInitializer.initializeDockingProxies(sfm);

        // Keyboard/input proxies
        PropertyProxyInitializer.initializeInputProxies(sfm);

        // Ship movement proxies
        PropertyProxyInitializer.initializeMovementProxies(sfm);

        // Intel display proxies
        PropertyProxyInitializer.initializeIntelProxies(sfm);

        // Target dummy proxies
        PropertyProxyInitializer.initializeTargetDummyProxies(sfm);

        // Target outline proxies
        PropertyProxyInitializer.initializeTargetOutlineProxies(sfm);

        // Button state proxies
        PropertyProxyInitializer.initializeButtonStateProxies(sfm);

        // Target state proxies
        PropertyProxyInitializer.initializeTargetStateProxies(sfm);

        // Camera state proxies
        PropertyProxyInitializer.initializeCameraStateProxies(sfm);

        // Damage control state proxies
        PropertyProxyInitializer.initializeDamageControlStateProxies(sfm);

        // View state proxies
        PropertyProxyInitializer.initializeViewStateProxies(sfm);

        // Mission system proxies
        PropertyProxyInitializer.initializeMissionProxies(sfm);

        // HUD container proxies
        PropertyProxyInitializer.initializeHUDContainerProxies(sfm);

        // Docking UI proxies
        PropertyProxyInitializer.initializeDockingUIProxies(sfm);

        // Interface proxies
        PropertyProxyInitializer.initializeInterfaceProxies(sfm);

        // Targeting system proxies
        PropertyProxyInitializer.initializeTargetingProxies(sfm);

        // Rendering system proxies
        PropertyProxyInitializer.initializeRenderingProxies(sfm);

        // AI system proxies
        PropertyProxyInitializer.initializeAIProxies(sfm);

        // Utility managers proxies
        PropertyProxyInitializer.initializeUtilityManagersProxies(sfm);
    }

    /**
     * Docking-related property proxies
     */
    static initializeDockingProxies(sfm) {
        Object.defineProperty(sfm, 'isDocked', {
            get: () => sfm.dockingOperationsManager.isDocked,
            set: (val) => { sfm.dockingOperationsManager.isDocked = val; }
        });
        Object.defineProperty(sfm, 'dockedTo', {
            get: () => sfm.dockingOperationsManager.dockedTo,
            set: (val) => { sfm.dockingOperationsManager.dockedTo = val; }
        });
        Object.defineProperty(sfm, 'orbitRadius', {
            get: () => sfm.dockingOperationsManager.orbitRadius,
            set: (val) => { sfm.dockingOperationsManager.orbitRadius = val; }
        });
        Object.defineProperty(sfm, 'orbitAngle', {
            get: () => sfm.dockingOperationsManager.orbitAngle,
            set: (val) => { sfm.dockingOperationsManager.orbitAngle = val; }
        });
        Object.defineProperty(sfm, 'orbitSpeed', {
            get: () => sfm.dockingOperationsManager.orbitSpeed,
            set: (val) => { sfm.dockingOperationsManager.orbitSpeed = val; }
        });
        Object.defineProperty(sfm, 'dockingRange', {
            get: () => sfm.dockingOperationsManager.dockingRange,
            set: (val) => { sfm.dockingOperationsManager.dockingRange = val; }
        });
        Object.defineProperty(sfm, 'undockCooldown', {
            get: () => sfm.dockingOperationsManager.undockCooldown,
            set: (val) => { sfm.dockingOperationsManager.undockCooldown = val; }
        });
    }

    /**
     * Keyboard/input property proxies
     */
    static initializeInputProxies(sfm) {
        Object.defineProperty(sfm, 'keys', {
            get: () => sfm.keyboardInputManager.keys,
            set: (val) => { sfm.keyboardInputManager.keys = val; }
        });
    }

    /**
     * Ship movement property proxies
     */
    static initializeMovementProxies(sfm) {
        Object.defineProperty(sfm, 'targetSpeed', {
            get: () => sfm.shipMovementController.targetSpeed,
            set: (val) => { sfm.shipMovementController.targetSpeed = val; }
        });
        Object.defineProperty(sfm, 'currentSpeed', {
            get: () => sfm.shipMovementController.currentSpeed,
            set: (val) => { sfm.shipMovementController.currentSpeed = val; }
        });
        Object.defineProperty(sfm, 'maxSpeed', {
            get: () => sfm.shipMovementController.maxSpeed,
            set: (val) => { sfm.shipMovementController.maxSpeed = val; }
        });
        Object.defineProperty(sfm, 'acceleration', {
            get: () => sfm.shipMovementController.acceleration,
            set: (val) => { sfm.shipMovementController.acceleration = val; }
        });
        Object.defineProperty(sfm, 'deceleration', {
            get: () => sfm.shipMovementController.deceleration,
            set: (val) => { sfm.shipMovementController.deceleration = val; }
        });
        Object.defineProperty(sfm, 'decelerating', {
            get: () => sfm.shipMovementController.decelerating,
            set: (val) => { sfm.shipMovementController.decelerating = val; }
        });
        Object.defineProperty(sfm, 'rotationVelocity', {
            get: () => sfm.shipMovementController.rotationVelocity,
            set: (val) => { sfm.shipMovementController.rotationVelocity = val; }
        });
        Object.defineProperty(sfm, 'rotationAcceleration', {
            get: () => sfm.shipMovementController.rotationAcceleration,
            set: (val) => { sfm.shipMovementController.rotationAcceleration = val; }
        });
        Object.defineProperty(sfm, 'rotationDeceleration', {
            get: () => sfm.shipMovementController.rotationDeceleration,
            set: (val) => { sfm.shipMovementController.rotationDeceleration = val; }
        });
        Object.defineProperty(sfm, 'maxRotationSpeed', {
            get: () => sfm.shipMovementController.maxRotationSpeed,
            set: (val) => { sfm.shipMovementController.maxRotationSpeed = val; }
        });
        Object.defineProperty(sfm, 'shipHeading', {
            get: () => sfm.shipMovementController.shipHeading,
            set: (val) => { sfm.shipMovementController.shipHeading = val; }
        });
    }

    /**
     * Intel display property proxies
     */
    static initializeIntelProxies(sfm) {
        Object.defineProperty(sfm, 'intelVisible', {
            get: () => sfm.intelDisplayManager.intelVisible,
            set: (val) => { sfm.intelDisplayManager.intelVisible = val; }
        });
        Object.defineProperty(sfm, 'intelAvailable', {
            get: () => sfm.intelDisplayManager.intelAvailable,
            set: (val) => { sfm.intelDisplayManager.intelAvailable = val; }
        });
        Object.defineProperty(sfm, 'intelHUD', {
            get: () => sfm.intelDisplayManager.intelHUD
        });
    }

    /**
     * Target dummy property proxies
     */
    static initializeTargetDummyProxies(sfm) {
        Object.defineProperty(sfm, 'targetDummyShips', {
            get: () => sfm.targetDummyManager.targetDummyShips,
            set: (val) => { sfm.targetDummyManager.targetDummyShips = val; }
        });
        Object.defineProperty(sfm, 'dummyShipMeshes', {
            get: () => sfm.targetDummyManager.dummyShipMeshes,
            set: (val) => { sfm.targetDummyManager.dummyShipMeshes = val; }
        });
    }

    /**
     * Target outline property proxies
     */
    static initializeTargetOutlineProxies(sfm) {
        Object.defineProperty(sfm, 'outlineEnabled', {
            get: () => sfm.targetOutlineManager.outlineEnabled,
            set: (val) => { sfm.targetOutlineManager.outlineEnabled = val; }
        });
        Object.defineProperty(sfm, 'targetOutline', {
            get: () => sfm.targetOutlineManager.targetOutline,
            set: (val) => { sfm.targetOutlineManager.targetOutline = val; }
        });
        Object.defineProperty(sfm, 'targetOutlineObject', {
            get: () => sfm.targetOutlineManager.targetOutlineObject,
            set: (val) => { sfm.targetOutlineManager.targetOutlineObject = val; }
        });
        Object.defineProperty(sfm, 'outlineDisabledUntilManualCycle', {
            get: () => sfm.targetOutlineManager.outlineDisabledUntilManualCycle,
            set: (val) => { sfm.targetOutlineManager.outlineDisabledUntilManualCycle = val; }
        });
    }

    /**
     * Button state property proxies
     */
    static initializeButtonStateProxies(sfm) {
        Object.defineProperty(sfm, 'currentButtonState', {
            get: () => sfm._buttonStateManager.currentButtonState,
            set: (val) => { sfm._buttonStateManager.currentButtonState = val; }
        });
    }

    /**
     * Target state property proxies
     */
    static initializeTargetStateProxies(sfm) {
        Object.defineProperty(sfm, 'targetComputerEnabled', {
            get: () => sfm.targetStateManager.targetComputerEnabled,
            set: (val) => { sfm.targetStateManager.targetComputerEnabled = val; }
        });
        Object.defineProperty(sfm, 'currentTarget', {
            get: () => sfm.targetStateManager.currentTarget,
            set: (val) => { sfm.targetStateManager.currentTarget = val; }
        });
        Object.defineProperty(sfm, 'targetIndex', {
            get: () => sfm.targetStateManager.targetIndex,
            set: (val) => { sfm.targetStateManager.targetIndex = val; }
        });
        Object.defineProperty(sfm, 'targetObjects', {
            get: () => sfm.targetStateManager.targetObjects,
            set: (val) => { sfm.targetStateManager.targetObjects = val; }
        });
        Object.defineProperty(sfm, 'targetWireframe', {
            get: () => sfm.targetStateManager.targetWireframe,
            set: (val) => { sfm.targetStateManager.targetWireframe = val; }
        });
        Object.defineProperty(sfm, 'targetReticle', {
            get: () => sfm.targetStateManager.targetReticle,
            set: (val) => { sfm.targetStateManager.targetReticle = val; }
        });
        Object.defineProperty(sfm, 'lastSortTime', {
            get: () => sfm.targetStateManager.lastSortTime,
            set: (val) => { sfm.targetStateManager.lastSortTime = val; }
        });
        Object.defineProperty(sfm, 'sortInterval', {
            get: () => sfm.targetStateManager.sortInterval,
            set: (val) => { sfm.targetStateManager.sortInterval = val; }
        });
        Object.defineProperty(sfm, 'lastArrowState', {
            get: () => sfm.targetStateManager.lastArrowState,
            set: (val) => { sfm.targetStateManager.lastArrowState = val; }
        });
        Object.defineProperty(sfm, 'lastButtonStateLog', {
            get: () => sfm.targetStateManager.lastButtonStateLog,
            set: (val) => { sfm.targetStateManager.lastButtonStateLog = val; }
        });
    }

    /**
     * Camera state property proxies
     */
    static initializeCameraStateProxies(sfm) {
        Object.defineProperty(sfm, 'velocity', {
            get: () => sfm.cameraStateManager.velocity,
            set: (val) => { sfm.cameraStateManager.velocity = val; }
        });
        Object.defineProperty(sfm, 'rotationSpeed', {
            get: () => sfm.cameraStateManager.rotationSpeed,
            set: (val) => { sfm.cameraStateManager.rotationSpeed = val; }
        });
        Object.defineProperty(sfm, 'cameraDirection', {
            get: () => sfm.cameraStateManager.cameraDirection,
            set: (val) => { sfm.cameraStateManager.cameraDirection = val; }
        });
        Object.defineProperty(sfm, 'cameraRight', {
            get: () => sfm.cameraStateManager.cameraRight,
            set: (val) => { sfm.cameraStateManager.cameraRight = val; }
        });
        Object.defineProperty(sfm, 'cameraUp', {
            get: () => sfm.cameraStateManager.cameraUp,
            set: (val) => { sfm.cameraStateManager.cameraUp = val; }
        });
        Object.defineProperty(sfm, 'mouseSensitivity', {
            get: () => sfm.cameraStateManager.mouseSensitivity,
            set: (val) => { sfm.cameraStateManager.mouseSensitivity = val; }
        });
        Object.defineProperty(sfm, 'mouseRotation', {
            get: () => sfm.cameraStateManager.mouseRotation,
            set: (val) => { sfm.cameraStateManager.mouseRotation = val; }
        });
        Object.defineProperty(sfm, 'isMouseLookEnabled', {
            get: () => sfm.cameraStateManager.isMouseLookEnabled,
            set: (val) => { sfm.cameraStateManager.isMouseLookEnabled = val; }
        });
    }

    /**
     * Damage control state property proxies
     */
    static initializeDamageControlStateProxies(sfm) {
        Object.defineProperty(sfm, 'damageControlVisible', {
            get: () => sfm.damageControlStateManager.damageControlVisible,
            set: (val) => { sfm.damageControlStateManager.damageControlVisible = val; }
        });
        Object.defineProperty(sfm, 'isDamageControlOpen', {
            get: () => sfm.damageControlStateManager.isDamageControlOpen,
            set: (val) => { sfm.damageControlStateManager.isDamageControlOpen = val; }
        });
        Object.defineProperty(sfm, 'shouldUpdateDamageControl', {
            get: () => sfm.damageControlStateManager.shouldUpdateDamageControl,
            set: (val) => { sfm.damageControlStateManager.shouldUpdateDamageControl = val; }
        });
        Object.defineProperty(sfm, 'weaponHUDConnected', {
            get: () => sfm.damageControlStateManager.weaponHUDConnected,
            set: (val) => { sfm.damageControlStateManager.weaponHUDConnected = val; }
        });
        Object.defineProperty(sfm, 'debugMode', {
            get: () => sfm.damageControlStateManager.debugMode,
            set: (val) => { sfm.damageControlStateManager.debugMode = val; }
        });
        Object.defineProperty(sfm, 'lastOutlineUpdate', {
            get: () => sfm.damageControlStateManager.lastOutlineUpdate,
            set: (val) => { sfm.damageControlStateManager.lastOutlineUpdate = val; }
        });
        Object.defineProperty(sfm, 'previousTarget', {
            get: () => sfm.damageControlStateManager.previousTarget,
            set: (val) => { sfm.damageControlStateManager.previousTarget = val; }
        });
    }

    /**
     * View state property proxies
     */
    static initializeViewStateProxies(sfm) {
        Object.defineProperty(sfm, 'view', {
            get: () => sfm.viewStateManager.view,
            set: (val) => { sfm.viewStateManager.view = val; }
        });
        Object.defineProperty(sfm, 'previousView', {
            get: () => sfm.viewStateManager.previousView,
            set: (val) => { sfm.viewStateManager.previousView = val; }
        });
    }

    /**
     * Mission system property proxies (read-only access to MissionSystemCoordinator components)
     */
    static initializeMissionProxies(sfm) {
        Object.defineProperty(sfm, 'missionAPI', {
            get: () => sfm.missionCoordinator.missionAPI
        });
        Object.defineProperty(sfm, 'missionEventService', {
            get: () => sfm.missionCoordinator.missionEventService
        });
        Object.defineProperty(sfm, 'missionStatusHUD', {
            get: () => sfm.missionCoordinator.missionStatusHUD
        });
        Object.defineProperty(sfm, 'missionCompletionUI', {
            get: () => sfm.missionCoordinator.missionCompletionUI
        });
        Object.defineProperty(sfm, 'missionNotificationHandler', {
            get: () => sfm.missionCoordinator.missionNotificationHandler
        });
        Object.defineProperty(sfm, 'missionEventHandler', {
            get: () => sfm.missionCoordinator.missionEventHandler
        });
    }

    /**
     * HUD container property proxies
     */
    static initializeHUDContainerProxies(sfm) {
        Object.defineProperty(sfm, 'damageControlContainer', {
            get: () => sfm.hudContainerManager.damageControlContainer,
            set: (val) => { sfm.hudContainerManager.damageControlContainer = val; }
        });
        Object.defineProperty(sfm, 'damageControlHUD', {
            get: () => sfm.hudContainerManager.damageControlHUD,
            set: (val) => { sfm.hudContainerManager.damageControlHUD = val; }
        });
        Object.defineProperty(sfm, 'diplomacyContainer', {
            get: () => sfm.hudContainerManager.diplomacyContainer,
            set: (val) => { sfm.hudContainerManager.diplomacyContainer = val; }
        });
        Object.defineProperty(sfm, 'diplomacyHUD', {
            get: () => sfm.hudContainerManager.diplomacyHUD,
            set: (val) => { sfm.hudContainerManager.diplomacyHUD = val; }
        });
    }

    /**
     * Docking UI property proxies
     */
    static initializeDockingUIProxies(sfm) {
        Object.defineProperty(sfm, 'dockingInterface', {
            get: () => sfm.dockingUIManager.dockingInterface,
            set: (val) => { sfm.dockingUIManager.dockingInterface = val; }
        });
        Object.defineProperty(sfm, 'dockingSystemManager', {
            get: () => sfm.dockingUIManager.dockingSystemManager,
            set: (val) => { sfm.dockingUIManager.dockingSystemManager = val; }
        });
        Object.defineProperty(sfm, 'dockingModal', {
            get: () => sfm.dockingUIManager.dockingModal,
            set: (val) => { sfm.dockingUIManager.dockingModal = val; }
        });
        Object.defineProperty(sfm, 'physicsDockingManager', {
            get: () => sfm.dockingUIManager.physicsDockingManager,
            set: (val) => { sfm.dockingUIManager.physicsDockingManager = val; }
        });
    }

    /**
     * Interface property proxies
     */
    static initializeInterfaceProxies(sfm) {
        Object.defineProperty(sfm, 'helpInterface', {
            get: () => sfm.interfaceInitManager.helpInterface,
            set: (val) => { sfm.interfaceInitManager.helpInterface = val; }
        });
        Object.defineProperty(sfm, 'communicationHUD', {
            get: () => sfm.interfaceInitManager.communicationHUD,
            set: (val) => { sfm.interfaceInitManager.communicationHUD = val; }
        });
    }

    /**
     * Targeting system property proxies
     */
    static initializeTargetingProxies(sfm) {
        Object.defineProperty(sfm, 'targetComputerManager', {
            get: () => sfm.targetingInitManager.targetComputerManager,
            set: (val) => { sfm.targetingInitManager.targetComputerManager = val; }
        });
        Object.defineProperty(sfm, 'starChartsManager', {
            get: () => sfm.targetingInitManager.starChartsManager,
            set: (val) => { sfm.targetingInitManager.starChartsManager = val; }
        });
        Object.defineProperty(sfm, 'proximityDetector3D', {
            get: () => sfm.targetingInitManager.proximityDetector3D,
            set: (val) => { sfm.targetingInitManager.proximityDetector3D = val; }
        });
    }

    /**
     * Rendering system property proxies
     */
    static initializeRenderingProxies(sfm) {
        Object.defineProperty(sfm, 'starfieldRenderer', {
            get: () => sfm.renderingInitManager.starfieldRenderer,
            set: (val) => { sfm.renderingInitManager.starfieldRenderer = val; }
        });
    }

    /**
     * AI system property proxies
     */
    static initializeAIProxies(sfm) {
        Object.defineProperty(sfm, 'enemyAIManager', {
            get: () => sfm.aiInitManager.enemyAIManager,
            set: (val) => { sfm.aiInitManager.enemyAIManager = val; }
        });
    }

    /**
     * Utility managers property proxies
     */
    static initializeUtilityManagersProxies(sfm) {
        Object.defineProperty(sfm, 'targetDummyManager', {
            get: () => sfm.utilityManagersInitializer.targetDummyManager,
            set: (val) => { sfm.utilityManagersInitializer.targetDummyManager = val; }
        });
        Object.defineProperty(sfm, 'targetOutlineManager', {
            get: () => sfm.utilityManagersInitializer.targetOutlineManager,
            set: (val) => { sfm.utilityManagersInitializer.targetOutlineManager = val; }
        });
        Object.defineProperty(sfm, 'destroyedTargetHandler', {
            get: () => sfm.utilityManagersInitializer.destroyedTargetHandler,
            set: (val) => { sfm.utilityManagersInitializer.destroyedTargetHandler = val; }
        });
        Object.defineProperty(sfm, 'reticleManager', {
            get: () => sfm.utilityManagersInitializer.reticleManager,
            set: (val) => { sfm.utilityManagersInitializer.reticleManager = val; }
        });
        Object.defineProperty(sfm, 'systemLifecycleManager', {
            get: () => sfm.utilityManagersInitializer.systemLifecycleManager,
            set: (val) => { sfm.utilityManagersInitializer.systemLifecycleManager = val; }
        });
        Object.defineProperty(sfm, 'hudMessageManager', {
            get: () => sfm.utilityManagersInitializer.hudMessageManager,
            set: (val) => { sfm.utilityManagersInitializer.hudMessageManager = val; }
        });
        Object.defineProperty(sfm, 'cargoDeliveryHandler', {
            get: () => sfm.utilityManagersInitializer.cargoDeliveryHandler,
            set: (val) => { sfm.utilityManagersInitializer.cargoDeliveryHandler = val; }
        });
        Object.defineProperty(sfm, 'waypointTestManager', {
            get: () => sfm.utilityManagersInitializer.waypointTestManager,
            set: (val) => { sfm.utilityManagersInitializer.waypointTestManager = val; }
        });
        Object.defineProperty(sfm, 'commandAudioManager', {
            get: () => sfm.utilityManagersInitializer.commandAudioManager,
            set: (val) => { sfm.utilityManagersInitializer.commandAudioManager = val; }
        });
        Object.defineProperty(sfm, 'weaponHUDManager', {
            get: () => sfm.utilityManagersInitializer.weaponHUDManager,
            set: (val) => { sfm.utilityManagersInitializer.weaponHUDManager = val; }
        });
        Object.defineProperty(sfm, 'statusBarManager', {
            get: () => sfm.utilityManagersInitializer.statusBarManager,
            set: (val) => { sfm.utilityManagersInitializer.statusBarManager = val; }
        });
        Object.defineProperty(sfm, 'subTargetDisplayManager', {
            get: () => sfm.utilityManagersInitializer.subTargetDisplayManager,
            set: (val) => { sfm.utilityManagersInitializer.subTargetDisplayManager = val; }
        });
        Object.defineProperty(sfm, 'debugCommandManager', {
            get: () => sfm.utilityManagersInitializer.debugCommandManager,
            set: (val) => { sfm.utilityManagersInitializer.debugCommandManager = val; }
        });
        Object.defineProperty(sfm, 'sectorManager', {
            get: () => sfm.utilityManagersInitializer.sectorManager,
            set: (val) => { sfm.utilityManagersInitializer.sectorManager = val; }
        });
    }
}
