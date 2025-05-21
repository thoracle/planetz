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
        document.body.appendChild(this.energyIndicator);

        // Create progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'warp-progress';
        document.body.appendChild(this.progressBar);

        // Create visual cues container
        this.visualCues = document.createElement('div');
        this.visualCues.className = 'visual-cues';
        document.body.appendChild(this.visualCues);

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
        const percentage = (currentEnergy / maxEnergy) * 100;
        const hasEnoughEnergy = currentEnergy >= requiredEnergy;

        this.energyIndicator.innerHTML = `
            <div class="energy-bar">
                <div class="energy-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="energy-text">
                Energy: ${Math.round(currentEnergy)}/${maxEnergy}
                ${requiredEnergy > 0 ? `<br>Required: ${requiredEnergy}` : ''}
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
            console.log('[Debug] Cooldown display activated:', { phase, progress });
            this.isCooldownDisplayed = true;
        }

        this.progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">
                ${phase}: ${Math.round(progress)}%
            </div>
        `;
    }

    /**
     * Show visual cues for warp state
     * @param {string} state - Current warp state
     * @param {number} intensity - Effect intensity (0-1)
     */
    showVisualCues(state, intensity) {
        const cues = {
            'accelerating': 'Accelerating to warp speed...',
            'warping': 'Warp speed achieved',
            'decelerating': 'Decelerating from warp...',
            'cooldown': 'Warp drive cooling down'
        };

        this.visualCues.innerHTML = `
            <div class="cue-text" style="opacity: ${intensity}">
                ${cues[state] || ''}
            </div>
        `;
    }

    /**
     * Hide all feedback elements
     */
    hideAll() {
        // Debug log when cooldown is hidden
        if (this.isCooldownDisplayed) {
            console.log('[Debug] Cooldown display deactivated');
            this.isCooldownDisplayed = false;
        }

        // Hide all elements and their containers
        this.warningModal.style.display = 'none';
        this.energyIndicator.style.display = 'none';
        this.progressBar.style.display = 'none';
        this.visualCues.style.display = 'none';
        
        // Clear any remaining content
        this.progressBar.innerHTML = '';
        this.energyIndicator.innerHTML = '';
        this.visualCues.innerHTML = '';
    }

    /**
     * Show all feedback elements
     */
    showAll() {
        this.energyIndicator.style.display = 'block';
        this.progressBar.style.display = 'block';
        this.visualCues.style.display = 'block';
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

    .visual-cues {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #00ff41;
        font-family: "Courier New", monospace;
        font-size: 24px;
        text-align: center;
        z-index: 1000;
        pointer-events: none;
    }

    .cue-text {
        background: rgba(0, 0, 0, 0.8);
        padding: 10px 20px;
        border: 1px solid #00ff41;
        transition: opacity 0.3s ease;
    }
`;
document.head.appendChild(style); 