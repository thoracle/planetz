/**
 * SimpleMissionRewards - No-bullshit mission completion overlay
 * Replaces the complex Mission HUD integration with a simple, reliable overlay
 */

import { debug } from '../debug.js';

export class SimpleMissionRewards {
    // Track active overlay's event handlers for cleanup
    static _activeOverlay = null;
    static _activeHandlers = null;

    static showCompletion(missionId, missionData, rewards) {
        debug('MISSIONS', `🎉 Creating Mission HUD overlay for mission: ${missionId}`);
        
        // Remove any existing overlay with proper cleanup
        SimpleMissionRewards._cleanup();

        // Create simple overlay positioned over Mission HUD
        const overlay = document.createElement('div');
        overlay.id = 'mission-rewards-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 120px;
            right: 15px;
            width: 320px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00ff41;
            border-radius: 4px;
            font-family: 'VT323', monospace;
            color: #00ff41;
            padding: 15px;
            box-shadow: 
                0 0 20px rgba(0, 255, 65, 0.3),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
            backdrop-filter: blur(2px);
            z-index: 10000;
            user-select: none;
            overflow-y: auto;
        `;

        // Create title bar (empty, just for visual separation)
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            background: rgba(0, 40, 0, 0.8);
            margin: -15px -15px 15px -15px;
            padding: 5px 15px;
            border-bottom: 1px solid #00ff41;
            height: 10px;
        `;

        // Create rewards panel content
        const panel = document.createElement('div');
        panel.style.cssText = `
            color: #00ff41;
            text-align: center;
        `;

        // Mission title
        const title = document.createElement('h2');
        title.textContent = missionData?.title || 'Deep Space Survey Mission';
        title.style.cssText = `
            font-size: 14px;
            margin: 0 0 15px 0;
            color: #ffffff;
            font-weight: normal;
        `;

        // Rewards section
        const rewardsDiv = document.createElement('div');
        
        // Build card rewards dynamically from actual rewards data
        let cardRewardsHTML = '';
        if (rewards?.cards?.names && rewards.cards.names.length > 0) {
            for (const cardName of rewards.cards.names) {
                cardRewardsHTML += `🃏 ${cardName}<br>`;
            }
        } else {
            // Fallback for old format
            cardRewardsHTML = `🃏 Deep Space Scanner Mk-II<br>🃏 Long Range Sensor Array<br>`;
        }
        
        rewardsDiv.innerHTML = `
            <h3 style="font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">REWARDS EARNED:</h3>
            <div style="font-size: 13px; line-height: 1.4; text-align: left; margin-bottom: 15px;">
                💰 ${rewards?.credits?.toLocaleString() || '250'} Credits<br>
                🎖️ +3 TRA Faction Rep<br>
                ${cardRewardsHTML}
            </div>
        `;

        // OK button
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: linear-gradient(135deg, #00ff41, #00cc33);
            border: none;
            color: #000000;
            padding: 8px 20px;
            font-family: 'VT323', monospace;
            font-size: 14px;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            text-transform: uppercase;
            transition: all 0.3s ease;
            width: 100%;
        `;

        // Store handlers for cleanup
        const handlers = {
            mouseenter: () => {
                okButton.style.background = 'linear-gradient(135deg, #00cc33, #009922)';
                okButton.style.color = '#ffffff';
                okButton.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.6)';
            },
            mouseleave: () => {
                okButton.style.background = 'linear-gradient(135deg, #00ff41, #00cc33)';
                okButton.style.color = '#000000';
                okButton.style.boxShadow = 'none';
            },
            click: () => {
                // Remove mission from Mission HUD if it exists
                if (window.starfieldManager?.missionStatusHUD) {
                    window.starfieldManager.missionStatusHUD.removeMission(missionId);
                }

                debug('MISSIONS', '✅ Overlay dismissed and mission removed');

                // Clean up properly
                SimpleMissionRewards._cleanup();
            },
            keydown: null // Will be set below
        };

        // ESC key to close
        handlers.keydown = (event) => {
            if (event.key === 'Escape') {
                handlers.click();
            }
        };

        // Attach event listeners
        okButton.addEventListener('mouseenter', handlers.mouseenter);
        okButton.addEventListener('mouseleave', handlers.mouseleave);
        okButton.addEventListener('click', handlers.click);
        document.addEventListener('keydown', handlers.keydown);

        // Store references for cleanup
        SimpleMissionRewards._activeOverlay = overlay;
        SimpleMissionRewards._activeHandlers = { okButton, handlers };

        // Assemble overlay
        panel.appendChild(title);
        panel.appendChild(rewardsDiv);
        panel.appendChild(okButton);
        
        overlay.appendChild(titleBar);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        debug('MISSIONS', '✅ Mission HUD overlay created and displayed');

        // Focus the OK button for keyboard accessibility
        okButton.focus();
    }

    /**
     * Clean up active overlay and event listeners
     */
    static _cleanup() {
        // Remove event listeners from button
        if (SimpleMissionRewards._activeHandlers) {
            const { okButton, handlers } = SimpleMissionRewards._activeHandlers;

            if (okButton) {
                okButton.removeEventListener('mouseenter', handlers.mouseenter);
                okButton.removeEventListener('mouseleave', handlers.mouseleave);
                okButton.removeEventListener('click', handlers.click);
            }

            if (handlers.keydown) {
                document.removeEventListener('keydown', handlers.keydown);
            }

            SimpleMissionRewards._activeHandlers = null;
        }

        // Remove overlay from DOM
        if (SimpleMissionRewards._activeOverlay) {
            if (SimpleMissionRewards._activeOverlay.parentNode) {
                SimpleMissionRewards._activeOverlay.remove();
            }
            SimpleMissionRewards._activeOverlay = null;
        }

        // Also check for orphaned overlay by ID
        const existingOverlay = document.getElementById('mission-rewards-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    /**
     * Dispose of all resources - for consistency with other UI components
     */
    static dispose() {
        debug('MISSIONS', '🧹 SimpleMissionRewards disposing...');
        SimpleMissionRewards._cleanup();
        debug('MISSIONS', '🧹 SimpleMissionRewards disposed');
    }

    /**
     * Alias for dispose()
     */
    static destroy() {
        SimpleMissionRewards.dispose();
    }
}

// Make it globally accessible
window.SimpleMissionRewards = SimpleMissionRewards;
