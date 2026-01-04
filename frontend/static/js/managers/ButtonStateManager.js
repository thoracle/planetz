/**
 * ButtonStateManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles dock button CSS injection and button state tracking.
 *
 * Features:
 * - Inject dock button CSS styles
 * - Track button states (dock, scan, trade)
 * - Update action buttons based on target
 */

import { debug } from '../debug.js';

// Dock button CSS styles
const DOCK_BUTTON_CSS = `
    .dock-button {
        background: #00aa41;
        color: #000 !important;
        border: none;
        padding: 6px 15px;
        cursor: pointer;
        font-family: "Courier New", monospace;
        font-weight: bold;
        border-radius: 4px;
        transition: all 0.2s ease-in-out;
        pointer-events: auto;
        z-index: 1005;
        width: 100%;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 0 10px rgba(0, 170, 65, 0.3);
        position: relative;
    }
    .dock-button:hover {
        filter: brightness(1.2);
        transform: scale(1.02);
        box-shadow: 0 0 15px rgba(0, 170, 65, 0.5);
    }
    .dock-button.launch {
        background: #aa4100;
        box-shadow: 0 0 10px rgba(170, 65, 0, 0.3);
    }
    .dock-button.launch:hover {
        background: #cc4f00;
        box-shadow: 0 0 15px rgba(170, 65, 0, 0.5);
    }
`;

export class ButtonStateManager {
    /**
     * Create a ButtonStateManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.styleElement = null;

        // Button state tracking
        this.currentButtonState = {
            hasDockButton: false,
            isDocked: false,
            hasScanButton: false,
            hasTradeButton: false
        };
    }

    /**
     * Inject dock button CSS into the document head
     */
    injectDockButtonCSS() {
        const style = document.createElement('style');
        style.textContent = DOCK_BUTTON_CSS;
        document.head.appendChild(style);
        this.styleElement = style;
    }

    /**
     * Get current button state
     * @returns {Object} Current button state
     */
    getButtonState() {
        return this.currentButtonState;
    }

    /**
     * Update action buttons based on current target
     * @param {Object} currentTargetData - Current target data
     * @param {Object} info - Additional target info
     */
    updateActionButtons(currentTargetData, info) {
        // Dock button removed - docking is now handled by the DockingModal
        // which shows when conditions are met (distance, speed, etc.)

        // Clear existing buttons since we no longer show dock button
        this.sfm.targetComputerManager.clearActionButtons();

        // Reset button state
        this.currentButtonState = {
            hasDockButton: false,
            isDocked: this.sfm.isDocked,
            hasScanButton: false,
            hasTradeButton: false
        };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
        }
        this.sfm = null;
    }
}
