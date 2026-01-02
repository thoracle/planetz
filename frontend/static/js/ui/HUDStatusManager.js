/**
 * HUDStatusManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages status icons, action buttons, and scan line effects.
 *
 * Features:
 * - Service availability icons (repair, refit, trade, missions)
 * - Diplomacy-based color styling
 * - Scan line visual effects
 * - Action button management
 */

import { debug } from '../debug.js';

export class HUDStatusManager {
    /**
     * Create a HUDStatusManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Scan line element
        this.animatedScanLine = null;
    }

    /**
     * Add scan line effects to the target HUD that sync with comm HUD
     */
    addTargetScanLineEffects() {
        const targetHUD = this.tcm.targetHUD;
        if (!targetHUD) return;

        // Add CSS styles for scan line effects
        this.addTargetScanLineStyles();

        // Create static scan line overlay (repeating lines)
        const scanLineOverlay = document.createElement('div');
        scanLineOverlay.className = 'target-scan-lines';
        scanLineOverlay.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            width: 200px;
            height: 150px;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 65, 0.03) 2px,
                rgba(0, 255, 65, 0.03) 4px
            );
            pointer-events: none;
            z-index: 1;
        `;

        // Create animated scan line with delay to sync with comm HUD
        this.animatedScanLine = document.createElement('div');
        this.animatedScanLine.className = 'target-scan-line';
        this.animatedScanLine.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            width: 200px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ff41, transparent);
            animation: targetScanLine 2s linear infinite;
            animation-delay: 0.5s;
            opacity: 0.6;
            pointer-events: none;
            z-index: 2;
        `;

        targetHUD.appendChild(scanLineOverlay);
        targetHUD.appendChild(this.animatedScanLine);
    }

    /**
     * Add CSS styles for target scan line animations
     */
    addTargetScanLineStyles() {
        if (document.getElementById('target-scan-line-styles')) return;

        const style = document.createElement('style');
        style.id = 'target-scan-line-styles';
        style.textContent = `
            @keyframes targetScanLine {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 0.6; }
                100% { transform: translateY(150px); opacity: 0; }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Update status icons with diplomacy color and info
     * @param {number} distance - Distance to target
     * @param {string} diplomacyColor - CSS color string
     * @param {boolean} isEnemyShip - Whether target is an enemy ship
     * @param {Object} info - Target info object
     * @param {boolean} isObjectDiscovered - Whether target is discovered
     */
    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info, isObjectDiscovered) {
        const serviceIcons = this.tcm.serviceIcons;
        const statusIconsContainer = this.tcm.statusIconsContainer;

        // New service availability logic
        if (serviceIcons) {
            const isEnemy = (info?.diplomacy || '').toLowerCase() === 'enemy';
            const isStar = info?.type === 'star' || (this.tcm.getStarSystem && this.tcm.getStarSystem() && info?.name === this.tcm.getStarSystem().star_name);
            const isPlanet = info?.type === 'planet';
            const isWaypoint = this.tcm.currentTarget?.isWaypoint || this.tcm.currentTarget?.isVirtual || info?.type === 'waypoint';
            const canUse = !isEnemy && isObjectDiscovered && !isWaypoint; // Exclude waypoints from showing services

            const availability = isStar ? {
                repairRefuel: false,
                shipRefit: false,
                tradeExchange: false,
                missionBoard: false
            } : {
                repairRefuel: canUse,
                shipRefit: canUse,
                tradeExchange: canUse && isPlanet,
                missionBoard: canUse
            };

            Object.entries(serviceIcons).forEach(([key, icon]) => {
                const visible = !!availability[key];
                icon.style.display = visible ? 'flex' : 'none';
                icon.style.borderColor = diplomacyColor;
                icon.style.color = diplomacyColor;
                icon.style.textShadow = `0 0 4px ${diplomacyColor}`;
                icon.style.boxShadow = `0 0 4px ${diplomacyColor}`;
                icon.title = icon.title; // keep tooltip text
            });

            const anyVisible = !isStar && Object.entries(serviceIcons).some(([_, icon]) => icon.style.display !== 'none');
            statusIconsContainer.style.display = anyVisible ? 'flex' : 'none';
        }

        // Update reticle colors
        const corners = this.tcm.getTargetReticleCorners();
        Array.from(corners).forEach(corner => {
            corner.style.borderColor = diplomacyColor;
            corner.style.boxShadow = `0 0 2px ${diplomacyColor}`;
        });

        // Update target name and distance display colors
        if (this.tcm.targetNameDisplay) {
            this.tcm.targetNameDisplay.style.color = diplomacyColor;
            this.tcm.targetNameDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
        }
        if (this.tcm.targetDistanceDisplay) {
            this.tcm.targetDistanceDisplay.style.color = diplomacyColor;
            this.tcm.targetDistanceDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
        }

        // Update HUD and wireframe container colors to match diplomacy
        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.borderColor = diplomacyColor;
            this.tcm.targetHUD.style.color = diplomacyColor;
        }
        if (this.tcm.wireframeContainer) {
            this.tcm.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Update arrow colors to match diplomacy
        this.tcm.updateArrowColors(diplomacyColor);
    }

    /**
     * Update action buttons based on target type
     * @param {Object} currentTargetData - Current target data
     * @param {Object} info - Target info object
     */
    updateActionButtons(currentTargetData, info) {
        // Dock button removed - docking is now handled by the DockingModal
        // which shows when conditions are met (distance, speed, etc.)

        // Clear existing buttons since we no longer show dock button
        this.clearActionButtons();

        // Reset button state on StarfieldManager if it exists
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.currentButtonState = {
                hasDockButton: false,
                isDocked: this.tcm.viewManager.starfieldManager.isDocked || false,
                hasScanButton: false,
                hasTradeButton: false
            };
        }
    }

    /**
     * Clear action buttons container
     */
    clearActionButtons() {
        const actionButtonsContainer = this.tcm.actionButtonsContainer;
        if (actionButtonsContainer) {
            actionButtonsContainer.innerHTML = '';
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.animatedScanLine = null;
    }
}
