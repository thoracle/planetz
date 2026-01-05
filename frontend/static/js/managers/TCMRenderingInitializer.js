/**
 * TCMRenderingInitializer
 *
 * Extracted from TargetComputerManager to reduce constructor size.
 * Handles initialization of UI and rendering systems.
 *
 * Features:
 * - Consolidates 7 UI/rendering manager instantiations
 * - Provides centralized access to rendering managers
 * - Provides cleanup on disposal
 */

import { DirectionArrowRenderer } from '../ui/DirectionArrowRenderer.js';
import { TargetReticleManager } from '../ui/TargetReticleManager.js';
import { SubSystemPanelManager } from '../ui/SubSystemPanelManager.js';
import { WireframeRenderer } from '../ui/WireframeRenderer.js';
import { TargetHUDBuilder } from '../ui/TargetHUDBuilder.js';
import { HUDStatusManager } from '../ui/HUDStatusManager.js';
import { TargetDisplayUpdater } from '../ui/TargetDisplayUpdater.js';
import { debug } from '../debug.js';

export class TCMRenderingInitializer {
    /**
     * Create a TCMRenderingInitializer
     * @param {Object} targetComputerManager - Reference to parent TargetComputerManager
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // UI/Rendering managers
        this.directionArrowRenderer = null;
        this.targetReticleManager = null;
        this.subSystemPanelManager = null;
        this.wireframeRendererManager = null;
        this.targetHUDBuilder = null;
        this.hudStatusManager = null;
        this.targetDisplayUpdater = null;
    }

    /**
     * Initialize all UI/rendering managers
     */
    initialize() {
        // Initialize DirectionArrowRenderer
        this.directionArrowRenderer = new DirectionArrowRenderer(this.tcm);

        // Initialize TargetReticleManager
        this.targetReticleManager = new TargetReticleManager(this.tcm);

        // Initialize SubSystemPanelManager
        this.subSystemPanelManager = new SubSystemPanelManager(this.tcm);

        // Initialize WireframeRenderer
        this.wireframeRendererManager = new WireframeRenderer(this.tcm);

        // Initialize TargetHUDBuilder
        this.targetHUDBuilder = new TargetHUDBuilder(this.tcm);

        // Initialize HUDStatusManager
        this.hudStatusManager = new HUDStatusManager(this.tcm);

        // Initialize TargetDisplayUpdater
        this.targetDisplayUpdater = new TargetDisplayUpdater(this.tcm);

        debug('UTILITY', 'TCMRenderingInitializer: 7 UI/rendering managers initialized');
    }

    /**
     * Dispose of all UI/rendering managers
     */
    dispose() {
        const managers = [
            'directionArrowRenderer',
            'targetReticleManager',
            'subSystemPanelManager',
            'wireframeRendererManager',
            'targetHUDBuilder',
            'hudStatusManager',
            'targetDisplayUpdater'
        ];

        for (const managerName of managers) {
            if (this[managerName]) {
                if (typeof this[managerName].dispose === 'function') {
                    this[managerName].dispose();
                }
                this[managerName] = null;
            }
        }

        this.tcm = null;
    }
}
