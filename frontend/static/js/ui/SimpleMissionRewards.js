/**
 * SimpleMissionRewards - No-bullshit mission completion overlay
 * Replaces the complex Mission HUD integration with a simple, reliable overlay
 */

export class SimpleMissionRewards {
    static showCompletion(missionId, missionData, rewards) {
        console.log('🎉 SIMPLE REWARDS: Creating Mission HUD overlay for mission:', missionId);
        
        // Remove any existing overlay
        const existingOverlay = document.getElementById('mission-rewards-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

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
        rewardsDiv.innerHTML = `
            <h3 style="font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">REWARDS EARNED:</h3>
            <div style="font-size: 13px; line-height: 1.4; text-align: left; margin-bottom: 15px;">
                💰 ${rewards?.credits?.toLocaleString() || '250'} Credits<br>
                🎖️ +3 TRA Faction Rep<br>
                🃏 Deep Space Scanner Mk-II<br>
                🃏 Long Range Sensor Array
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

        // Button hover effects
        okButton.addEventListener('mouseenter', () => {
            okButton.style.background = 'linear-gradient(135deg, #00cc33, #009922)';
            okButton.style.color = '#ffffff';
            okButton.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.6)';
        });

        okButton.addEventListener('mouseleave', () => {
            okButton.style.background = 'linear-gradient(135deg, #00ff41, #00cc33)';
            okButton.style.color = '#000000';
            okButton.style.boxShadow = 'none';
        });

        okButton.addEventListener('click', () => {
            overlay.remove();
            
            // Remove mission from Mission HUD if it exists
            if (window.starfieldManager?.missionStatusHUD) {
                window.starfieldManager.missionStatusHUD.removeMission(missionId);
            }
            
            console.log('✅ SIMPLE REWARDS: Overlay dismissed and mission removed');
        });

        // ESC key to close
        const escHandler = (event) => {
            if (event.key === 'Escape') {
                okButton.click();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Assemble overlay
        panel.appendChild(title);
        panel.appendChild(rewardsDiv);
        panel.appendChild(okButton);
        
        overlay.appendChild(titleBar);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        console.log('✅ SIMPLE REWARDS: Mission HUD overlay created and displayed');
        
        // Focus the OK button for keyboard accessibility
        okButton.focus();
    }
}

// Make it globally accessible
window.SimpleMissionRewards = SimpleMissionRewards;
