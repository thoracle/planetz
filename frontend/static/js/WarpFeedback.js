class WarpFeedback {
    constructor() {
        // Create warning modal container
        this.warningModal = document.createElement('div');
        this.warningModal.className = 'warning-popup';
        this.warningModal.style.display = 'none';
        document.body.appendChild(this.warningModal);

        // Create energy indicator
        this.energyIndicator = document.createElement('div');
        this.energyIndicator.className = 'energy-indicator';
        this.energyIndicator.style.display = 'none';
        document.body.appendChild(this.energyIndicator);

        // Create progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'warp-progress';
        this.progressBar.style.display = 'none';
        document.body.appendChild(this.progressBar);

        // Track cooldown display state
        this.isCooldownDisplayed = false;
    }

    /**
     * Show warning modal with custom message
     * @param {string} title - Warning title
     * @param {string} message - Warning message
     * @param {Function} onClose - Callback when modal is closed
     */
    showWarning(title, message, onClose = null) {
        this.warningModal.innerHTML = `
            <div class="warning-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <button class="warning-close">OK</button>
            </div>
        `;
        this.warningModal.style.display = 'flex';

        const closeButton = this.warningModal.querySelector('.warning-close');
        closeButton.addEventListener('click', () => {
            this.warningModal.style.display = 'none';
            if (onClose) onClose();
        });
    }

    /**
     * Update energy indicator
     * @param {number} currentEnergy - Current energy level
     * @param {number} maxEnergy - Maximum energy level
     * @param {number} requiredEnergy - Energy required for current operation
     */
    updateEnergyIndicator(currentEnergy, maxEnergy, requiredEnergy = 0) {
        // Don't show energy indicator during warp navigation
        if (this.isCooldownDisplayed) {
            return;
        }

        const percentage = (currentEnergy / maxEnergy) * 100;
        const hasEnoughEnergy = currentEnergy >= requiredEnergy;

        this.energyIndicator.innerHTML = `
            <div class="energy-bar">
                <div class="energy-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="energy-text">
                Energy: ${currentEnergy.toFixed(2)}/${maxEnergy.toFixed(2)}
                ${requiredEnergy > 0 ? `<br>Required: ${requiredEnergy.toFixed(2)}` : ''}
            </div>
        `;

        this.energyIndicator.className = `energy-indicator ${hasEnoughEnergy ? 'sufficient' : 'insufficient'}`;
    }

    /**
     * Update warp progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} phase - Current warp phase
     */
    updateProgress(progress, phase) {
        // Debug log when cooldown first appears
        if (phase.includes('Cooldown') && !this.isCooldownDisplayed) {
            console.log('[Debug] Cooldown display activated:', { 
                phase, 
                progress,
                isVisible: this.progressBar.style.display,
                currentHTML: this.progressBar.innerHTML
            });
            this.isCooldownDisplayed = true;
            
            // Ensure progress bar is visible for cooldown
            this.progressBar.style.display = 'block';
            this.energyIndicator.style.display = 'none'; // Hide energy indicator during cooldown
        }

        // Update progress bar content
        this.progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">
                ${phase}: ${Math.round(progress)}%
            </div>
        `;

        // Ensure progress bar is visible
        this.progressBar.style.display = 'block';
    }

    /**
     * Hide all feedback elements
     */
    hideAll() {
        // Debug log when cooldown is hidden
        if (this.isCooldownDisplayed) {
            console.log('[Debug] Cooldown display deactivated:', {
                wasVisible: this.progressBar.style.display,
                currentHTML: this.progressBar.innerHTML
            });
            this.isCooldownDisplayed = false;
        }

        // Hide all elements and their containers
        this.warningModal.style.display = 'none';
        this.energyIndicator.style.display = 'none';
        this.progressBar.style.display = 'none';
        
        // Clear any remaining content
        this.progressBar.innerHTML = '';
        this.energyIndicator.innerHTML = '';
    }

    /**
     * Show all feedback elements
     */
    showAll() {
        console.log('[Debug] Showing all feedback elements:', {
            wasVisible: this.progressBar.style.display,
            isCooldownDisplayed: this.isCooldownDisplayed
        });

        // Only show progress bar during warp
        this.progressBar.style.display = 'block';
        this.energyIndicator.style.display = 'none';
    }
}

export default WarpFeedback;

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .energy-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff41;
        color: #00ff41;
        padding: 10px;
        font-family: "Courier New", monospace;
        z-index: 1000;
    }

    .energy-indicator.insufficient {
        border-color: #ff0000;
        color: #ff0000;
    }

    .energy-bar {
        width: 200px;
        height: 10px;
        background: rgba(0, 255, 65, 0.2);
        margin-bottom: 5px;
    }

    .energy-fill {
        height: 100%;
        background: #00ff41;
        transition: width 0.3s ease;
    }

    .energy-indicator.insufficient .energy-fill {
        background: #ff0000;
    }

    /* Reuse energy indicator styles for main energy HUD */
    .energy-hud {
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff41;
        color: #00ff41;
        padding: 10px;
        font-family: "Courier New", monospace;
        z-index: 1000;
    }

    .energy-hud .energy-bar {
        width: 200px;
        height: 10px;
        background: rgba(0, 255, 65, 0.2);
        margin-bottom: 5px;
    }

    .energy-hud .energy-fill {
        height: 100%;
        background: #00ff41;
        transition: width 0.3s ease;
    }

    .energy-hud.insufficient {
        border-color: #ff0000;
        color: #ff0000;
    }

    .energy-hud.insufficient .energy-fill {
        background: #ff0000;
    }

    .warp-progress {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff41;
        color: #00ff41;
        padding: 10px;
        font-family: "Courier New", monospace;
        z-index: 1000;
        width: 300px;
    }

    .progress-bar {
        width: 100%;
        height: 10px;
        background: rgba(0, 255, 65, 0.2);
        margin-bottom: 5px;
    }

    .progress-fill {
        height: 100%;
        background: #00ff41;
        transition: width 0.3s ease;
    }
`;
document.head.appendChild(style); 