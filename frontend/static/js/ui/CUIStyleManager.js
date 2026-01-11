/**
 * CUIStyleManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Manages dynamic CSS styles for card inventory UI.
 *
 * Features:
 * - NEW badge styles with pulse animation
 * - Quantity increase badge styles
 * - Card glow effects
 */

export class CUIStyleManager {
    constructor() {
        this.stylesAdded = false;
    }

    /**
     * Add CSS styles for NEW and quantity badges
     */
    addBadgeStyles() {
        // Check if styles already exist
        if (document.getElementById('new-badge-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'new-badge-styles';
        style.textContent = `
            .new-badge {
                position: absolute;
                top: 5px;
                right: 5px;
                background: linear-gradient(45deg, #ff4444, #ff6666);
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 8px;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                animation: newBadgePulse 2s infinite;
                font-family: 'VT323', monospace;
                letter-spacing: 1px;
            }

            @keyframes newBadgePulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 0.8;
                }
            }

            .card-stack.has-new-badge {
                position: relative;
            }

            .card-stack.has-new-badge::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #ff4444, #ff6666, #ff4444);
                border-radius: 8px;
                z-index: -1;
                animation: newCardGlow 3s infinite;
            }

            @keyframes newCardGlow {
                0%, 100% {
                    opacity: 0.3;
                }
                50% {
                    opacity: 0.6;
                }
            }
        `;
        document.head.appendChild(style);
        this.stylesAdded = true;
    }

    /**
     * Remove badge styles (for cleanup)
     */
    removeBadgeStyles() {
        const style = document.getElementById('new-badge-styles');
        if (style) {
            style.remove();
            this.stylesAdded = false;
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.removeBadgeStyles();
    }
}

// Singleton instance
let styleManagerInstance = null;

export function getStyleManager() {
    if (!styleManagerInstance) {
        styleManagerInstance = new CUIStyleManager();
    }
    return styleManagerInstance;
}
