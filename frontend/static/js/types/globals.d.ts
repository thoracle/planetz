/**
 * Global type declarations for the PlanetZ game
 * These declarations enable TypeScript to understand global variables used in the project.
 */

import type { MissionStatusHUD } from '../ui/MissionStatusHUD.js';

/**
 * Global window interface extensions for game systems
 */
interface Window {
    // Debug system
    debug: typeof import('../debug.js').debug;
    debugEnable: (...channels: string[]) => void;
    debugDisable: (...channels: string[]) => void;
    debugStatus: () => void;
    smartDebugManager: object;
    errorReporter: object;

    // Core managers
    starfieldManager: object;
    starfieldManagerReady: boolean;
    spatialManager: object;
    spatialManagerReady: boolean;
    collisionManager: object;
    targetComputerManager: object;

    // Mission system
    missionAPI: {
        activeMissions: Map<string, object>;
        getActiveMissions(): Promise<object[]>;
    };
    missionEventHandler: {
        activeMissions: Map<string, object>;
    };
    missionStatusHUD: MissionStatusHUD;

    // UI systems
    communicationHUD: object;
    shipLog: object;
    cardRewardAnimator: object;

    // Configuration
    useRealisticCollision: boolean;
}

/**
 * THREE.js type extensions
 * Extends THREE.Mesh with game-specific userData properties
 */
declare module 'three' {
    interface Object3D {
        name?: string;
        diplomacy?: string;
        faction?: string;
        userData: {
            gameObject?: object;
            gameObjectId?: string;
            name?: string;
            faction?: string;
            type?: string;
            description?: string;
            services?: string[];
            intel_brief?: string;
            discoveryRadius?: number;
            isSpaceStation?: boolean;
            canDock?: boolean;
            isBeacon?: boolean;
            id?: string;
            [key: string]: any;
        };
    }
}
