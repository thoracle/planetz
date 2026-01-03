/**
 * TargetHUDBuilder
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles the construction of the target computer HUD and its components.
 *
 * Features:
 * - Creates main target HUD container
 * - Creates target info display with click zones
 * - Creates status icons container with service icons
 * - Creates action buttons container
 * - Assembles all HUD components
 */

import { debug } from '../debug.js';

export class TargetHUDBuilder {
    /**
     * Create a TargetHUDBuilder
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Build the complete target computer HUD
     * Creates all HUD elements and assembles them
     */
    buildTargetComputerHUD() {
        // Create main target HUD container - match original position and styling
        this.tcm.targetHUD = document.createElement('div');
        this.tcm.targetHUD.style.cssText = `
            position: fixed;
            bottom: 50px;
            left: 10px;
            width: 200px;
            height: auto;
            border: 2px solid #D0D0D0;
            background: rgba(0, 0, 0, 0.7);
            color: #D0D0D0;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
            transition: border-color 0.3s ease;
            overflow: visible;
            cursor: pointer;
        `;

        // Create wireframe display - delegates to WireframeRenderer
        this.tcm.wireframeRendererManager.createWireframeDisplay();
        // Expose elements for backwards compatibility
        this.tcm.wireframeContainer = this.tcm.wireframeRendererManager.wireframeContainer;
        this.tcm.wireframeRenderer = this.tcm.wireframeRendererManager.wireframeRenderer;
        this.tcm.wireframeScene = this.tcm.wireframeRendererManager.wireframeScene;
        this.tcm.wireframeCamera = this.tcm.wireframeRendererManager.wireframeCamera;

        // Create target info display
        this.createTargetInfoDisplay();

        // Create status icons container
        this.createStatusIconsContainer();

        // Create action buttons container
        this.createActionButtonsContainer();

        // Create direction arrows for off-screen targets
        this.tcm.createDirectionArrows();

        // Add scan line effects to sync with comm HUD
        this.tcm.addTargetScanLineEffects();

        // Assemble the HUD - match original order
        this.tcm.targetHUD.appendChild(this.tcm.wireframeContainer);
        this.tcm.targetHUD.appendChild(this.tcm.targetInfoDisplay);
        this.tcm.targetHUD.appendChild(this.tcm.statusIconsContainer);
        this.tcm.targetHUD.appendChild(this.tcm.actionButtonsContainer);

        // Create and add sub-system panel to main HUD (positioned absolutely to the right)
        // Delegates to SubSystemPanelManager
        this.tcm.subSystemPanelManager.createSubSystemPanel(this.tcm.targetHUD, this.tcm._abortController);
        // Expose DOM elements for backwards compatibility
        this.tcm.subSystemPanel = this.tcm.subSystemPanelManager.subSystemPanel;
        this.tcm.subSystemWireframeContainer = this.tcm.subSystemPanelManager.subSystemWireframeContainer;
        this.tcm.subSystemWireframeRenderer = this.tcm.subSystemPanelManager.subSystemWireframeRenderer;
        this.tcm.subSystemWireframeScene = this.tcm.subSystemPanelManager.subSystemWireframeScene;
        this.tcm.subSystemWireframeCamera = this.tcm.subSystemPanelManager.subSystemWireframeCamera;
        this.tcm.subSystemContent = this.tcm.subSystemPanelManager.subSystemContent;

        document.body.appendChild(this.tcm.targetHUD);
    }

    /**
     * Create the target info display with click zones for TAB/SHIFT-TAB functionality
     */
    createTargetInfoDisplay() {
        this.tcm.targetInfoDisplay = document.createElement('div');
        this.tcm.targetInfoDisplay.style.cssText = `
            width: 100%;
            text-align: left;
            margin-bottom: 10px;
            pointer-events: auto;
            position: relative;
            z-index: 10000;
            cursor: pointer;
        `;

        // Ensure all child elements don't block clicks by setting pointer-events: none on children
        const targetInfoStyle = document.createElement('style');
        targetInfoStyle.textContent = `
            .target-info-display * {
                pointer-events: none;
            }
            .status-icons-container * {
                pointer-events: none;
            }
            .action-buttons-container * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(targetInfoStyle);
        this.tcm.targetInfoDisplay.className = 'target-info-display';

        // Forward any clicks on the main container to the targetInfoDisplay for seamless interaction
        this.tcm.targetHUD.addEventListener('click', (event) => {
            // Always forward clicks to targetInfoDisplay for consistent behavior
            // This handles clicks on child elements within the info display
            const newEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: event.clientX,
                clientY: event.clientY
            });
            this.tcm.targetInfoDisplay.dispatchEvent(newEvent);
        }, { signal: this.tcm._abortController.signal });

        this.tcm.targetInfoDisplay.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const rect = this.tcm.targetInfoDisplay.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const halfWidth = rect.width / 2;

            if (clickX < halfWidth) {
                // Left half - same as SHIFT-TAB (previous target)
                this.tcm.cycleToPreviousTarget();
            } else {
                // Right half - same as TAB (next target)
                this.tcm.cycleToNextTarget();
            }
        }, { signal: this.tcm._abortController.signal });
    }

    /**
     * Create the status icons container with service icons
     */
    createStatusIconsContainer() {
        this.tcm.statusIconsContainer = document.createElement('div');
        this.tcm.statusIconsContainer.style.cssText = `
            width: 100%;
            text-align: center;
            margin-bottom: 10px;
            display: flex;
            justify-content: center;
            gap: 15px;
            font-size: 16px;
            position: relative;
            z-index: 1003;
            cursor: pointer;
        `;
        this.tcm.statusIconsContainer.className = 'status-icons-container';

        // New station service icons (5):
        this.tcm.serviceIcons = {
            // Combine Repair & Refuel with Energy Recharge: keep name of former, icon of latter
            repairRefuel: this.createIcon('⚡', 'Repair & Refuel'),
            shipRefit: this.createIcon('🛠️', 'Ship Refitting'),
            tradeExchange: this.createIcon('💰', 'Trade Exchange'),
            missionBoard: this.createIcon('📋', 'Mission Board')
        };
        Object.values(this.tcm.serviceIcons).forEach(icon => this.tcm.statusIconsContainer.appendChild(icon));
    }

    /**
     * Create an icon with tooltip and hover effects
     * @param {string} symbol - The icon symbol
     * @param {string} tooltip - The tooltip text
     * @returns {HTMLElement} The icon element
     */
    createIcon(symbol, tooltip) {
        const icon = document.createElement('div');
        icon.style.cssText = `
            cursor: help;
            opacity: 0.8;
            transition: all 0.2s ease;
            position: relative;
            width: 24px;
            height: 24px;
            border: 1px solid #D0D0D0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: "Courier New", monospace;
            font-size: 14px;
            text-shadow: 0 0 4px #D0D0D0;
            box-shadow: 0 0 4px rgba(208, 208, 208, 0.4);
        `;
        icon.innerHTML = symbol;
        icon.title = tooltip;

        // Add hover effects (with abort signal for cleanup)
        icon.addEventListener('mouseenter', () => {
            icon.style.opacity = '1';
            icon.style.transform = 'scale(1.1)';
            // Box shadow will be updated by updateStatusIcons with diplomacy color
        }, { signal: this.tcm._abortController.signal });

        icon.addEventListener('mouseleave', () => {
            icon.style.opacity = '0.8';
            icon.style.transform = 'scale(1)';
            // Box shadow will be updated by updateStatusIcons with diplomacy color
        }, { signal: this.tcm._abortController.signal });

        return icon;
    }

    /**
     * Create the action buttons container
     */
    createActionButtonsContainer() {
        this.tcm.actionButtonsContainer = document.createElement('div');
        this.tcm.actionButtonsContainer.style.cssText = `
            width: 100%;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            position: relative;
            z-index: 1004;
            cursor: pointer;
        `;
        this.tcm.actionButtonsContainer.className = 'action-buttons-container';
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose - DOM elements are cleaned up by TCM
    }
}
