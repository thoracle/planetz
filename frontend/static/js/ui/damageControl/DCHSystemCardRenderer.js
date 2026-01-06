/**
 * DCHSystemCardRenderer - System card UI rendering
 * Extracted from DamageControlHUD.js to reduce file size.
 *
 * Handles:
 * - System card creation with health bars
 * - Speed control buttons for impulse engines
 * - Toggle buttons for active systems
 */

import { debug } from '../../debug.js';

export class DCHSystemCardRenderer {
    constructor(hud) {
        this.hud = hud;
    }

    // Convenience accessors
    get ship() { return this.hud.ship; }
    get elements() { return this.hud.elements; }

    /**
     * Create a system card with health bar and controls
     * @param {string} systemName - Name of the system
     * @param {Object} systemData - System data object
     */
    createSystemCard(systemName, systemData) {
        const systemCard = document.createElement('div');
        systemCard.style.cssText = `
            padding: 10px;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 65px;
        `;

        // Left side - system info
        const systemInfo = document.createElement('div');
        systemInfo.style.cssText = `flex: 1; margin-right: 10px;`;

        // System name
        const displayName = this.hud.getDisplayName(systemName);
        const healthPercentage = Math.round(systemData.health * 100);
        const isDamaged = healthPercentage < 100;
        const isOperational = systemData.canBeActivated;
        const hasValidCard = systemData.hasValidCard !== false;

        // Determine status color based on card availability and system health
        let statusColor = '#555'; // Default for unavailable
        if (hasValidCard) {
            statusColor = isDamaged ? '#ff6b6b' : (isOperational ? '#00ff41' : '#ffaa00');
        }

        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `
            font-weight: bold;
            margin-bottom: 6px;
            color: ${statusColor};
            font-size: 13px;
        `;
        nameDiv.textContent = displayName;
        systemInfo.appendChild(nameDiv);

        // Health bar container
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.cssText = `
            width: 100%;
            max-width: 200px;
            height: 6px;
            background-color: #333;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 6px;
            border: 1px solid #555;
        `;

        // Health bar fill
        const healthBar = document.createElement('div');
        let healthBarColor = '#ff4444'; // Red for damaged
        if (healthPercentage >= 75) healthBarColor = '#00ff41'; // Green for healthy
        else if (healthPercentage >= 50) healthBarColor = '#ffaa00'; // Yellow for moderate
        else if (healthPercentage >= 25) healthBarColor = '#ff8800'; // Orange for low

        healthBar.style.cssText = `
            height: 100%;
            background-color: ${healthBarColor};
            width: ${healthPercentage}%;
            transition: width 0.3s ease, background-color 0.3s ease;
        `;
        healthBarContainer.appendChild(healthBar);
        systemInfo.appendChild(healthBarContainer);

        // System details with real energy data
        const detailsDiv = document.createElement('div');
        detailsDiv.style.cssText = `
            font-size: 11px;
            color: #aaa;
            line-height: 1.2;
        `;

        let statusText = 'UNAVAILABLE';
        if (hasValidCard) {
            statusText = isOperational ? 'OPERATIONAL' : 'OFFLINE';
            if (isDamaged) statusText = 'DAMAGED';
        }

        // Get real energy consumption from the system
        const realEnergyConsumption = this.hud.getRealEnergyConsumption(systemName);

        detailsDiv.innerHTML = `
            Status: <span style="color: ${statusColor}">${statusText}</span><br>
            Health: ${healthPercentage}%<br>
            Energy: ${realEnergyConsumption}/sec${hasValidCard ? '' : '<br><span style="color: #ff6b6b;">No Card</span>'}
        `;
        systemInfo.appendChild(detailsDiv);

        systemCard.appendChild(systemInfo);

        // Right side - toggle button or speed controls (only for non-passive systems)
        if (systemName === 'impulse_engines') {
            // Special handling for impulse engines - create speed control buttons
            const speedControls = this.createSpeedControls(systemName, isDamaged, hasValidCard);
            if (speedControls) {
                systemCard.appendChild(speedControls);
            }
        } else {
            // Regular toggle button for other systems
            const toggleButton = this.createToggleButton(systemName, isDamaged, hasValidCard);
            if (toggleButton) {
                systemCard.appendChild(toggleButton);
            }
        }

        this.elements.systemsList.appendChild(systemCard);
    }

    /**
     * Create speed control buttons for impulse engines
     * @param {string} systemName - Name of the system
     * @param {boolean} isDamaged - Whether system is damaged
     * @param {boolean} hasValidCard - Whether system has a valid card
     * @returns {HTMLElement|null} Speed controls container or null
     */
    createSpeedControls(systemName, isDamaged, hasValidCard) {
        const ship = this.ship;
        const impulseEngines = ship?.getSystem('impulse_engines');

        if (!impulseEngines) {
            return null;
        }

        const currentSpeed = impulseEngines.getImpulseSpeed();
        const maxSpeed = impulseEngines.getMaxImpulseSpeed();

        // Create container for speed controls
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        `;

        // Create speed display
        const speedDisplay = document.createElement('div');
        speedDisplay.style.cssText = `
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            color: #00ff41;
            padding: 2px 4px;
            margin-bottom: 2px;
        `;
        speedDisplay.textContent = currentSpeed === 0 ? 'STOP' : `IMP ${currentSpeed}`;

        // Create button stack container
        const buttonStack = document.createElement('div');
        buttonStack.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
        `;

        // Create increase button
        const increaseButton = document.createElement('button');
        increaseButton.innerHTML = '+';
        increaseButton.className = 'impulse-speed-btn';
        increaseButton.dataset.action = 'increase';
        increaseButton.dataset.systemName = systemName;

        // Create decrease button
        const decreaseButton = document.createElement('button');
        decreaseButton.innerHTML = '−';
        decreaseButton.className = 'impulse-speed-btn';
        decreaseButton.dataset.action = 'decrease';
        decreaseButton.dataset.systemName = systemName;

        // Style both buttons
        [decreaseButton, increaseButton].forEach(button => {
            const isDisabled = !hasValidCard;
            const canDecrease = currentSpeed > 0;
            const canIncrease = currentSpeed < maxSpeed;

            if (button === decreaseButton && (!canDecrease || isDisabled)) {
                button.disabled = true;
            } else if (button === increaseButton && (!canIncrease || isDisabled)) {
                button.disabled = true;
            }

            button.style.cssText = `
                width: 38px;
                height: 22px;
                border: 1px solid #00ff41;
                border-radius: 3px;
                background: rgba(0, 255, 65, 0.2);
                color: #00ff41;
                font-size: 16px;
                font-weight: bold;
                cursor: ${button.disabled ? 'not-allowed' : 'pointer'};
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                opacity: ${button.disabled ? 0.5 : 1};
                line-height: 1;
            `;

            // Add hover effects for enabled buttons
            if (!button.disabled) {
                const mouseEnterHandler = () => {
                    button.style.backgroundColor = 'rgba(0, 255, 65, 0.4)';
                    button.style.boxShadow = '0 0 8px rgba(0, 255, 65, 0.5)';
                };
                const mouseLeaveHandler = () => {
                    button.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
                    button.style.boxShadow = 'none';
                };
                button.addEventListener('mouseenter', mouseEnterHandler);
                button.addEventListener('mouseleave', mouseLeaveHandler);
                this.hud._buttonHandlers.set(button, { mouseenter: mouseEnterHandler, mouseleave: mouseLeaveHandler });
            }
        });

        // Assemble the button stack
        buttonStack.appendChild(increaseButton);
        buttonStack.appendChild(decreaseButton);

        controlsContainer.appendChild(speedDisplay);
        controlsContainer.appendChild(buttonStack);

        return controlsContainer;
    }

    /**
     * Create toggle button for a system
     * @param {string} systemName - Name of the system
     * @param {boolean} isDamaged - Whether system is damaged
     * @param {boolean} hasValidCard - Whether system has a valid card
     * @returns {HTMLElement|null} Toggle button or null for passive systems
     */
    createToggleButton(systemName, isDamaged, hasValidCard) {
        const button = document.createElement('button');
        button.className = 'damage-control-toggle-btn';
        button.dataset.systemName = systemName;

        const system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;
        const isActive = this.hud.toggleHandler.getSystemActiveState(systemName, system);

        let buttonText = 'OFF';
        let backgroundColor = '#4a2a2a';
        let textColor = '#ff4444';
        let isDisabled = false;

        // Check if this is a passive system
        const passiveSystems = ['energy_reactor', 'impulse_engines', 'warp_drive', 'cargo_hold', 'hull_plating'];
        if (passiveSystems.includes(systemName)) {
            return null;
        }

        if (isActive) {
            buttonText = 'ON';
            backgroundColor = '#2a4a2a';
            textColor = '#00ff41';
        } else {
            buttonText = 'OFF';
            backgroundColor = '#4a2a2a';
            textColor = '#ff4444';
        }

        if (!hasValidCard) {
            isDisabled = true;
        }

        button.dataset.isActive = isActive;

        button.style.cssText = `
            padding: 8px 12px;
            border: 1px solid #555;
            border-radius: 3px;
            background-color: ${backgroundColor};
            color: ${textColor};
            font-size: 10px;
            font-weight: bold;
            cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
            transition: all 0.2s ease;
            min-width: 55px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        button.textContent = buttonText;
        button.disabled = isDisabled;

        // Hover effects
        if (!isDisabled && !isDamaged) {
            const mouseEnterHandler = () => {
                if (!isDisabled) {
                    button.style.transform = 'scale(1.05)';
                    const currentIsActive = button.dataset.isActive === 'true';
                    if (currentIsActive) {
                        button.style.borderColor = '#00ff41';
                    } else {
                        button.style.borderColor = '#ff4444';
                    }
                }
            };
            const mouseLeaveHandler = () => {
                button.style.transform = 'scale(1)';
                button.style.borderColor = '#555';
            };
            button.addEventListener('mouseenter', mouseEnterHandler);
            button.addEventListener('mouseleave', mouseLeaveHandler);
            this.hud._buttonHandlers.set(button, { mouseenter: mouseEnterHandler, mouseleave: mouseLeaveHandler });
        }

        return button;
    }
}
