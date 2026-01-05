/**
 * CUIModalManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles modals and notifications for the card inventory system.
 *
 * Features:
 * - Cargo contents modal
 * - Cargo dump confirmation modal
 * - Trade notifications
 * - Generic modal creation utilities
 */

import { debug } from '../debug.js';

export class CUIModalManager {
    /**
     * Create a CUIModalManager
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Show cargo dump notification
     * @param {Array} dumpedCargo - Array of dumped cargo items
     */
    showCargoDumpNotification(dumpedCargo) {
        let cargoList = dumpedCargo.map(item => `${item.quantity}x ${item.name}`).join(', ');
        if (cargoList.length > 80) {
            cargoList = cargoList.substring(0, 77) + '...';
        }

        const message = `⚠️ Cargo Dumped: ${cargoList}`;

        this.showTradeNotification(message, 'warning');
    }

    /**
     * Show trading notification
     * @param {string} message - Message to display
     * @param {string} type - Notification type (info, success, error, warning)
     */
    showTradeNotification(message, type = 'info') {
        // Create centered modal notification
        const modal = document.createElement('div');
        modal.className = `trade-notification-modal ${type}`;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 15000;
            font-family: 'VT323', 'Courier New', monospace;
        `;

        const colors = {
            'info': '#00ff41',
            'success': '#44ff44',
            'error': '#ff4444',
            'warning': '#ffff44'
        };

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 3px solid ${colors[type]};
            border-radius: 12px;
            padding: 30px 40px;
            max-width: 600px;
            width: 80%;
            text-align: center;
            box-shadow: 0 0 30px rgba(${type === 'error' ? '255, 68, 68' : type === 'warning' ? '255, 255, 68' : '0, 255, 65'}, 0.3);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            color: ${colors[type]};
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
        `;

        const typeLabels = {
            'info': '🔵 Information',
            'success': '✅ Success',
            'error': '❌ Error',
            'warning': '⚠️ Warning'
        };
        header.textContent = typeLabels[type];

        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            color: #ffffff;
            font-size: 18px;
            line-height: 1.5;
            margin-bottom: 25px;
        `;
        messageEl.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.style.cssText = `
            background: linear-gradient(135deg, ${colors[type]}, ${colors[type]}dd);
            border: 2px solid ${colors[type]};
            color: #000000;
            font-family: 'VT323', 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            padding: 10px 30px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        content.appendChild(header);
        content.appendChild(messageEl);
        content.appendChild(closeButton);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Auto-close after 5 seconds
        this.cui._setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 5000);
    }

    /**
     * Show cargo contents modal for a cargo hold slot
     * @param {string} slotId - Slot ID
     * @param {Object} cargoManager - Cargo manager instance
     * @returns {Promise<boolean>} Whether to cancel the removal
     */
    async showCargoContentsModal(slotId, cargoManager) {
        return new Promise((resolve) => {
            // Find which cargo hold this slot maps to
            const holdMap = cargoManager.getCargoHoldSlotMap();
            let holdSlot = null;

            for (const [holdKey, mappedSlotId] of Object.entries(holdMap)) {
                if (mappedSlotId === slotId) {
                    holdSlot = holdKey;
                    break;
                }
            }

            if (!holdSlot) {
                debug('UI', `No cargo hold mapping found for slot ${slotId}`);
                resolve(false);
                return;
            }

            const holdContents = cargoManager.getHoldContents(slotId);

            if (!holdContents || holdContents.length === 0) {
                debug('UI', `No cargo in hold ${holdSlot}`);
                resolve(false);
                return;
            }

            // Create modal styles
            const style = document.createElement('style');
            style.textContent = `
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 15000;
                font-family: 'VT323', 'Courier New', monospace;
                animation: modalFadeIn 0.3s ease;
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 3px solid #ff4444;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                animation: modalSlideIn 0.3s ease;
                box-shadow: 0 0 30px rgba(255, 68, 68, 0.3);
            `;

            // Header
            const header = document.createElement('h2');
            header.style.cssText = `
                color: #ff4444;
                margin: 0 0 20px 0;
                font-size: 28px;
                text-transform: uppercase;
            `;
            header.textContent = '⚠️ CARGO HOLD NOT EMPTY';

            // Message
            const message = document.createElement('p');
            message.style.cssText = `
                color: #ffffff;
                font-size: 18px;
                margin-bottom: 20px;
                line-height: 1.5;
            `;
            message.textContent = `This cargo hold contains items. You must dump the cargo before removing the card:`;

            // Cargo list
            const cargoList = document.createElement('div');
            cargoList.style.cssText = `
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid #666;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                max-height: 200px;
                overflow-y: auto;
            `;

            holdContents.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #333;
                    color: #00ff41;
                    font-size: 16px;
                `;
                itemDiv.innerHTML = `
                    <span>${item.name}</span>
                    <span>x${item.quantity}</span>
                `;
                cargoList.appendChild(itemDiv);
            });

            // Warning
            const warning = document.createElement('p');
            warning.style.cssText = `
                color: #ffff44;
                font-size: 14px;
                margin-bottom: 25px;
            `;
            warning.textContent = '⚠️ Dumped cargo will be lost forever!';

            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 20px;
            `;

            // Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'CANCEL';
            cancelButton.style.cssText = `
                background: linear-gradient(135deg, #333 0%, #555 100%);
                border: 2px solid #888;
                color: #ffffff;
                font-family: 'VT323', 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                padding: 12px 25px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
            `;

            // Dump button
            const dumpButton = document.createElement('button');
            dumpButton.textContent = 'DUMP CARGO & REMOVE';
            dumpButton.style.cssText = `
                background: linear-gradient(135deg, #cc3333 0%, #ff4444 100%);
                border: 2px solid #ff4444;
                color: #ffffff;
                font-family: 'VT323', 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                padding: 12px 25px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 180px;
                box-shadow: 0 0 15px rgba(255, 68, 68, 0.3);
            `;

            // Add hover effects
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = 'linear-gradient(135deg, #444 0%, #666 100%)';
                cancelButton.style.borderColor = '#aaa';
                cancelButton.style.transform = 'scale(1.05)';
            });

            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = 'linear-gradient(135deg, #333 0%, #555 100%)';
                cancelButton.style.borderColor = '#888';
                cancelButton.style.transform = 'scale(1)';
            });

            dumpButton.addEventListener('mouseenter', () => {
                dumpButton.style.background = 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)';
                dumpButton.style.transform = 'scale(1.05)';
                dumpButton.style.boxShadow = '0 0 25px rgba(255, 68, 68, 0.5)';
            });

            dumpButton.addEventListener('mouseleave', () => {
                dumpButton.style.background = 'linear-gradient(135deg, #cc3333 0%, #ff4444 100%)';
                dumpButton.style.transform = 'scale(1)';
                dumpButton.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.3)';
            });

            // Add event handlers
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
                resolve(true); // Cancel removal
            });

            dumpButton.addEventListener('click', () => {
                // Dump cargo and proceed with removal
                const dumpResult = cargoManager.dumpCargoInHold(slotId);
                debug('UI', `Dumped cargo from hold ${holdSlot} (slot ${slotId}):`, dumpResult);

                document.body.removeChild(modal);
                document.head.removeChild(style);

                // Show dump confirmation
                this.showCargoDumpNotification(dumpResult.dumpedCargo);

                resolve(false); // Proceed with removal
            });

            // Assemble modal
            modalContent.appendChild(header);
            modalContent.appendChild(message);
            modalContent.appendChild(cargoList);
            modalContent.appendChild(warning);
            modalContent.appendChild(buttonContainer);
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(dumpButton);
            modal.appendChild(modalContent);

            // Add to page
            document.body.appendChild(modal);

            // Focus on cancel button by default
            cancelButton.focus();
        });
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
