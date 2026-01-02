/**
 * StarChartsNotifier
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles Star Charts UI notification when targets change.
 *
 * Features:
 * - Notifies Star Charts UI of target changes
 * - Centers Star Charts view on new target
 * - Handles target lookup by ID and name
 * - Uses requestAnimationFrame for smooth updates
 */

import { debug } from '../debug.js';

export class StarChartsNotifier {
    /**
     * Create a StarChartsNotifier
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Notify Star Charts UI of target change and center on new target
     * Called when target changes via TAB cycling or other means
     */
    notifyStarChartsOfTargetChange() {
        debug('TARGETING', `notifyStarChartsOfTargetChange() called`);

        // Check if Star Charts is open and available
        // The UI is stored as starChartsUI in NavigationSystemManager
        const starChartsUI = this.tcm.viewManager?.navigationSystemManager?.starChartsUI;

        debug('TARGETING', `starChartsUI exists: ${!!starChartsUI}`);
        debug('TARGETING', `starChartsUI.isVisible: ${starChartsUI?.isVisible}`);

        if (starChartsUI && starChartsUI.isVisible) {
            const currentTarget = this.tcm.currentTarget;
            debug('TARGETING', `BEFORE Star Charts render - current target: ${currentTarget?.name || 'none'} (ID: ${currentTarget?.id || 'none'})`);

            // Use requestAnimationFrame to ensure render happens on next frame
            requestAnimationFrame(() => {
                debug('TARGETING', `FRAME render - current target: ${currentTarget?.name || 'none'} (ID: ${currentTarget?.id || 'none'})`);

                // Center on the new target (like clicking on it would do)
                if (currentTarget && currentTarget.name) {
                    // Try to find the target object for centering
                    let targetObject = null;

                    // First try to get it from Star Charts database
                    if (currentTarget.id) {
                        targetObject = starChartsUI.starChartsManager.getObjectData(currentTarget.id);
                    }

                    // If not found, try to find by name
                    if (!targetObject && currentTarget.name) {
                        targetObject = starChartsUI.findObjectByName(currentTarget.name);
                    }

                    // If we found the target object, center on it
                    if (targetObject) {
                        starChartsUI.centerOnTarget(targetObject);
                        debug('TARGETING', `TAB: Centered Star Charts on new target: ${currentTarget.name}`);
                    } else {
                        // Just render without centering if target not found in Star Charts
                        starChartsUI.render();
                        debug('TARGETING', `TAB: Target ${currentTarget.name} not found in Star Charts, rendered without centering`);
                    }
                } else {
                    // No target, just render
                    starChartsUI.render();
                }

                debug('TARGETING', `AFTER frame Star Charts render - notified of target change`);
            });
        } else {
            debug('TARGETING', `Star Charts not available for notification - not visible or not initialized`);
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
