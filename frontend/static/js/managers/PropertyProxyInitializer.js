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
}
