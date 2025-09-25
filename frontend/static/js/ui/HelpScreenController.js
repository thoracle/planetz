/**
 * Help Screen 2.0 - Modern modal help system with game pause/resume
 * Replaces the old HelpInterface with a comprehensive tabbed modal
 */
export class HelpScreenController {
    constructor(starfieldManager) {
        try {
            this.starfieldManager = starfieldManager;
            this.isOpen = false;
            this.currentTab = 'controls';
            this.modal = null;
            
            // Track what we paused for safe resume
            this.pausedState = {
                inputEnabled: true,
                audioVolumes: new Map(),
                wasAnimating: false
            };
            
            // Animation loop control
            this.gameAnimationId = null;
            this.isGamePaused = false;
            
        } catch (error) {
            console.error('HelpScreenController constructor error:', error);
            throw error;
        }
    }

    /**
     * Initialize the help screen system
     */
    initialize() {
        try {
            // Only create modal if it doesn't exist (avoid double creation)
            if (!this.modal) {
                this.createModal();
            } else {
            }
            this.bindEvents();
            if (typeof debug === 'function') {
            }
        } catch (error) {
            console.error('❌ Failed to initialize help screen:', error);
            if (typeof debug === 'function') {
                console.error('❌ Failed to initialize help screen:', error);
            } else {
                console.error('Failed to initialize help screen:', error);
            }
            throw error;
        }
    }

    /**
     * Toggle help screen open/closed
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open the help screen modal
     */
    open() {
        if (this.isOpen) {
            return;
        }
        
        try {
            this.pauseGame();
            this.showModal();
            this.isOpen = true;
            
            // Focus management for accessibility
            this.focusModal();
            
            if (typeof debug === 'function') {
                console.log('✅ Help screen opened');
            }
        } catch (error) {
            console.error('❌ Failed to open help screen:', error);
            if (typeof debug === 'function') {
                console.error('❌ Failed to open help screen:', error);
            } else {
                console.error('Failed to open help screen:', error);
            }
            // Failsafe - ensure game resumes if open failed
            this.resumeGame();
        }
    }

    /**
     * Close the help screen modal
     */
    close() {
        if (!this.isOpen) return;
        
        try {
            this.hideModal();
            this.resumeGame();
            this.isOpen = false;
            
            // Return focus to game
            this.returnFocusToGame();
            
            if (typeof debug === 'function') {
                console.log('✅ Help screen closed');
            }
        } catch (error) {
            if (typeof debug === 'function') {
                console.error('❌ Failed to close help screen:', error);
            } else {
                console.error('Failed to close help screen:', error);
            }
            // Force close anyway
            this.isOpen = false;
            this.resumeGame();
        }
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabId) {
        if (!this.isOpen) return;
        
        try {
            // Update tab buttons
            const tabButtons = this.modal.querySelectorAll('.help-tab-button');
            tabButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
            
            // Update tab content
            const tabContents = this.modal.querySelectorAll('.help-tab-content');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.dataset.tab === tabId);
            });
            
            this.currentTab = tabId;
        } catch (error) {
            console.error('❌ Failed to switch tab:', error);
        }
    }

    /**
     * Pause all game systems (but NOT audio like original)
     */
    pauseGame() {
        
        try {
            // Store current state
            this.pausedState.inputEnabled = this.starfieldManager.inputEnabled;
            this.pausedState.wasAnimating = !!this.starfieldManager.animationId;
            
            // Disable input
            this.starfieldManager.inputEnabled = false;
            
            // DON'T pause audio - original HelpInterface doesn't pause audio
            
            this.isGamePaused = true;
        } catch (error) {
            console.error('❌ Failed to pause game:', error);
        }
    }

    /**
     * Resume all game systems
     */
    resumeGame() {
        
        try {
            // Restore input
            this.starfieldManager.inputEnabled = this.pausedState.inputEnabled;
            
            // DON'T restore audio - we didn't pause it
            
            this.isGamePaused = false;
        } catch (error) {
            console.error('❌ Failed to resume game:', error);
        }
    }

    /**
     * Duck audio during help screen
     */
    duckAudio() {
        try {
            if (this.starfieldManager.audioManager) {
                // Store original playing states and pause all audio
                const audioManager = this.starfieldManager.audioManager;
                
                // Pause engine audio
                if (audioManager.engineAudio && !audioManager.engineAudio.paused) {
                    this.pausedState.audioVolumes.set('engine', true);
                    audioManager.engineAudio.pause();
                }
                
                // Pause ambient audio
                if (audioManager.ambientAudio && !audioManager.ambientAudio.paused) {
                    this.pausedState.audioVolumes.set('ambient', true);
                    audioManager.ambientAudio.pause();
                }
                
                // Pause any other audio sources
                if (audioManager.weaponAudio && !audioManager.weaponAudio.paused) {
                    this.pausedState.audioVolumes.set('weapon', true);
                    audioManager.weaponAudio.pause();
                }
            }
        } catch (error) {
            console.warn('⚠️ Audio pausing failed (non-critical):', error);
        }
    }

    /**
     * Restore audio after help screen
     */
    restoreAudio() {
        try {
            if (this.starfieldManager.audioManager) {
                const audioManager = this.starfieldManager.audioManager;
                
                // Resume previously playing audio
                if (audioManager.engineAudio && this.pausedState.audioVolumes.has('engine')) {
                    audioManager.engineAudio.play().catch(e => console.warn('Engine audio resume failed:', e));
                }
                
                if (audioManager.ambientAudio && this.pausedState.audioVolumes.has('ambient')) {
                    audioManager.ambientAudio.play().catch(e => console.warn('Ambient audio resume failed:', e));
                }
                
                if (audioManager.weaponAudio && this.pausedState.audioVolumes.has('weapon')) {
                    audioManager.weaponAudio.play().catch(e => console.warn('Weapon audio resume failed:', e));
                }
                
                // Clear stored playing states
                this.pausedState.audioVolumes.clear();
            }
        } catch (error) {
            console.warn('⚠️ Audio restoration failed (non-critical):', error);
        }
    }

    /**
     * Add CSS styles for the help screen interface (exact copy from HelpInterface)
     */
    addHelpScreenStyles() {
        if (document.getElementById('help-screen-styles')) return;

        const style = document.createElement('style');
        style.id = 'help-screen-styles';
        style.textContent = `
            .help-screen-interface {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: "Courier New", monospace;
                color: #00ff41;
                animation: powerOn 0.3s ease-in;
            }

            @keyframes powerOn {
                0% { opacity: 0; filter: brightness(2) blur(2px); }
                100% { opacity: 1; filter: brightness(1) blur(0); }
            }

            .help-screen-display {
                background: rgba(0, 20, 0, 0.98);
                border: 3px solid #00ff41;
                border-radius: 12px;
                width: 90%;
                max-width: 1200px;
                max-height: 90%;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.1);
                position: relative;
            }

            .help-screen-display::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: 
                    repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(0, 255, 65, 0.03) 2px,
                        rgba(0, 255, 65, 0.03) 4px
                    );
                pointer-events: none;
                z-index: 1;
            }

            .manual-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 25px;
                border-bottom: 2px solid #00ff41;
                background: rgba(0, 255, 65, 0.15);
                position: relative;
                z-index: 2;
            }

            .manual-title {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .ship-designation {
                font-size: 28px;
                font-weight: bold;
                color: #00ff41;
                text-shadow: 0 0 15px rgba(0, 255, 65, 0.8);
                letter-spacing: 2px;
            }

            .manual-type {
                font-size: 14px;
                color: #66ff66;
                letter-spacing: 1px;
                opacity: 0.8;
            }

            .manual-close-btn {
                background: rgba(0, 255, 65, 0.1);
                border: 2px solid #00ff41;
                color: #00ff41;
                font-size: 14px;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 6px;
                font-family: "Courier New", monospace;
                font-weight: bold;
                transition: all 0.2s;
                letter-spacing: 1px;
            }

            .manual-close-btn:hover {
                background: rgba(0, 255, 65, 0.2);
                box-shadow: 0 0 15px rgba(0, 255, 65, 0.5);
                text-shadow: 0 0 8px rgba(0, 255, 65, 0.8);
            }

            .manual-content {
                padding: 25px;
                position: relative;
                z-index: 2;
                line-height: 1.4;
                flex: 1;
                overflow-y: auto;
                min-height: 0;
            }

            .manual-section {
                background: rgba(0, 255, 65, 0.08);
                border: 1px solid rgba(0, 255, 65, 0.4);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                position: relative;
            }

            .section-header {
                margin: 0 0 15px 0;
                color: #00ff41;
                font-size: 16px;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(0, 255, 65, 0.6);
                border-bottom: 1px solid rgba(0, 255, 65, 0.5);
                padding-bottom: 8px;
                letter-spacing: 1px;
            }

            .help-screen-display .credits-wrapper {
                display: block !important;
                width: 100% !important;
                padding: 10px !important;
            }

            .help-screen-display .credits-block {
                display: block !important;
                margin-bottom: 25px !important;
                padding: 15px !important;
                background: rgba(0, 255, 65, 0.05) !important;
                border: 1px solid rgba(0, 255, 65, 0.2) !important;
                border-radius: 6px !important;
                clear: both !important;
            }

            .help-screen-display .credits-header {
                color: #00ff41 !important;
                font-size: 14px !important;
                font-weight: bold !important;
                margin: 0 0 12px 0 !important;
                text-shadow: 0 0 8px rgba(0, 255, 65, 0.6) !important;
                letter-spacing: 2px !important;
                text-transform: uppercase !important;
                display: block !important;
                border-bottom: 1px solid rgba(0, 255, 65, 0.3) !important;
                padding-bottom: 6px !important;
            }

            .help-screen-display .credits-line {
                color: #ccffcc !important;
                font-size: 13px !important;
                margin: 0 0 8px 0 !important;
                padding: 2px 0 !important;
                display: block !important;
                line-height: 1.4 !important;
                clear: both !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }

            .help-screen-display .credits-line:last-child {
                margin-bottom: 0 !important;
            }

            /* Tab Navigation */
            .help-screen-display .help-tabs {
                display: flex !important;
                border-bottom: 2px solid rgba(0, 255, 65, 0.3) !important;
                margin-bottom: 20px !important;
                background: rgba(0, 255, 65, 0.05) !important;
            }

            .help-screen-display .help-tab-button {
                background: transparent !important;
                border: none !important;
                color: #66ff66 !important;
                font-family: "Courier New", monospace !important;
                font-size: 13px !important;
                font-weight: bold !important;
                padding: 12px 20px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                letter-spacing: 1px !important;
                text-transform: uppercase !important;
                border-bottom: 2px solid transparent !important;
            }

            .help-screen-display .help-tab-button:hover {
                background: rgba(0, 255, 65, 0.1) !important;
                color: #00ff41 !important;
            }

            .help-screen-display .help-tab-button.active {
                color: #00ff41 !important;
                background: rgba(0, 255, 65, 0.15) !important;
                border-bottom-color: #00ff41 !important;
                text-shadow: 0 0 8px rgba(0, 255, 65, 0.6) !important;
            }

            /* Tab Content */
            .help-screen-display .help-tab-content {
                display: none !important;
            }

            .help-screen-display .help-tab-content.active {
                display: block !important;
            }

            /* Pilot's Log Styles */
            .help-screen-display .pilots-log-section {
                display: block !important;
            }

            .help-screen-display .log-header {
                color: #00ff41 !important;
                font-size: 16px !important;
                font-weight: bold !important;
                margin: 0 0 20px 0 !important;
                text-shadow: 0 0 8px rgba(0, 255, 65, 0.6) !important;
                letter-spacing: 2px !important;
                text-transform: uppercase !important;
                border-bottom: 1px solid rgba(0, 255, 65, 0.5) !important;
                padding-bottom: 8px !important;
            }

            .help-screen-display .log-entry {
                background: rgba(0, 255, 65, 0.05) !important;
                border: 1px solid rgba(0, 255, 65, 0.2) !important;
                border-radius: 4px !important;
                padding: 12px !important;
                margin-bottom: 10px !important;
            }

            .help-screen-display .log-timestamp {
                color: #66ff66 !important;
                font-size: 11px !important;
                margin-bottom: 4px !important;
            }

            .help-screen-display .log-event {
                color: #ccffcc !important;
                font-size: 13px !important;
            }

            .help-screen-display .log-placeholder {
                text-align: center !important;
                padding: 30px !important;
                color: #66ff66 !important;
                font-style: italic !important;
            }

            .help-screen-display .placeholder-text {
                font-size: 14px !important;
                margin-bottom: 8px !important;
            }

            .help-screen-display .placeholder-subtext {
                font-size: 12px !important;
                opacity: 0.7 !important;
            }

            /* Achievements Styles */
            .help-screen-display .achievements-section {
                display: block !important;
            }

            .help-screen-display .achievements-header {
                color: #00ff41 !important;
                font-size: 16px !important;
                font-weight: bold !important;
                margin: 0 0 20px 0 !important;
                text-shadow: 0 0 8px rgba(0, 255, 65, 0.6) !important;
                letter-spacing: 2px !important;
                text-transform: uppercase !important;
                border-bottom: 1px solid rgba(0, 255, 65, 0.5) !important;
                padding-bottom: 8px !important;
            }

            .help-screen-display .achievement-category {
                background: rgba(0, 255, 65, 0.05) !important;
                border: 1px solid rgba(0, 255, 65, 0.2) !important;
                border-radius: 6px !important;
                padding: 15px !important;
                margin-bottom: 15px !important;
            }

            .help-screen-display .category-header {
                color: #00ff41 !important;
                font-size: 14px !important;
                font-weight: bold !important;
                margin-bottom: 10px !important;
                letter-spacing: 1px !important;
            }

            .help-screen-display .progress-bar {
                background: rgba(0, 0, 0, 0.5) !important;
                border: 1px solid rgba(0, 255, 65, 0.3) !important;
                border-radius: 3px !important;
                height: 12px !important;
                margin-bottom: 5px !important;
                overflow: hidden !important;
            }

            .help-screen-display .progress-fill {
                background: linear-gradient(90deg, #00ff41, #66ff66) !important;
                height: 100% !important;
                transition: width 0.3s ease !important;
            }

            .help-screen-display .progress-text {
                color: #ccffcc !important;
                font-size: 12px !important;
            }

            .help-screen-display .achievements-placeholder {
                text-align: center !important;
                padding: 30px !important;
                color: #66ff66 !important;
                font-style: italic !important;
            }

            /* Scan Line Animation */
            .help-screen-display .scan-line {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: 2px !important;
                background: linear-gradient(90deg, transparent, #00ff41, transparent) !important;
                animation: scanLine 2s linear infinite !important;
                opacity: 0.6 !important;
            }

            @keyframes scanLine {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 0.6; }
                100% { transform: translateY(400px); opacity: 0; }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Create the modal HTML structure
     */
    createModal() {
        
        // Add the CSS styles first (like HelpInterface does)
        this.addHelpScreenStyles();
        
        // Create single modal element (no backdrop needed - it's built into the CSS)
        this.modal = document.createElement('div');
        this.modal.className = 'help-screen-interface';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'help-screen-title');
        
        this.modal.innerHTML = `
            <div class="help-screen-display">
                <div class="manual-header">
                    <div class="manual-title">
                        <div class="ship-designation">STAR FUCKERS</div>
                        <div class="manual-type">The Retro Space Shooter you never knew you needed.</div>
                    </div>
                    <div class="manual-info">
                        <button class="manual-close-btn" aria-label="Close help screen">[ ESC ]</button>
                    </div>
                </div>
                
                <div class="help-tabs">
                    <button class="help-tab-button active" data-tab="help">Help</button>
                    <button class="help-tab-button" data-tab="pilots-log">Pilot's Log</button>
                    <button class="help-tab-button" data-tab="achievements">Achievements</button>
                    <button class="help-tab-button" data-tab="about">About</button>
                </div>
                
                <div class="manual-content">
                    <div class="help-tab-content active" data-tab="help">
                        ${this.getHelpContent()}
                    </div>
                    
                    <div class="help-tab-content" data-tab="pilots-log">
                        ${this.getPilotsLogContent()}
                    </div>
                    
                    <div class="help-tab-content" data-tab="achievements">
                        ${this.getAchievementsContent()}
                    </div>
                    
                    <div class="help-tab-content" data-tab="about">
                        ${this.getAboutContent()}
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM but keep hidden initially
        document.body.appendChild(this.modal);
        this.modal.style.display = 'none';
        
    }

    /**
     * Show the modal with animation
     */
    showModal() {
        if (!this.modal) {
            console.error('❌ No modal element to show');
            return;
        }
        
        // Use the same approach as the working HelpInterface
        this.modal.style.display = 'flex';
        
    }

    /**
     * Hide the modal with animation
     */
    hideModal() {
        if (!this.modal) return;
        
        // Use the same approach as HelpInterface
        this.modal.style.display = 'none';
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.modal) return;
        
        // Close button (using the new class name from our HelpInterface approach)
        const closeButton = this.modal.querySelector('.manual-close-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
        
        // Tab buttons
        const tabButtons = this.modal.querySelectorAll('.help-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });
        
        // Modal background click to close (click on the interface itself, not the display)
        this.modal.addEventListener('click', (event) => {
            // Only close if clicking on the background (not the display content)
            if (event.target === this.modal) {
                this.close();
            }
        });
        
        // Keyboard navigation
        this.modal.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        if (!this.modal || !tabId) return;
        
        try {
            // Update tab buttons
            const tabButtons = this.modal.querySelectorAll('.help-tab-button');
            tabButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
            
            // Update tab content
            const tabContents = this.modal.querySelectorAll('.help-tab-content');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.dataset.tab === tabId);
            });
            
            this.currentTab = tabId;
        } catch (error) {
            console.error('❌ Failed to switch tab:', error);
        }
    }

    /**
     * Handle keyboard events within modal
     */
    handleKeydown(event) {
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.close();
                break;
                
            case 'Tab':
                // Handle tab navigation within modal
                this.handleTabNavigation(event);
                break;
                
            case '1':
            case '2':
            case '3':
            case '4':
                event.preventDefault();
                const tabs = ['help', 'pilots-log', 'achievements', 'about'];
                const tabIndex = parseInt(event.key) - 1;
                if (tabs[tabIndex]) {
                    this.switchTab(tabs[tabIndex]);
                }
                break;
        }
    }

    /**
     * Handle tab navigation for accessibility
     */
    handleTabNavigation(event) {
        const focusableElements = this.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Focus the modal for accessibility
     */
    focusModal() {
        if (this.modal) {
            const firstButton = this.modal.querySelector('.help-tab-button');
            if (firstButton) {
                firstButton.focus();
            }
        }
    }

    /**
     * Return focus to game after closing
     */
    returnFocusToGame() {
        // Focus the game canvas or body
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.focus();
        } else {
            document.body.focus();
        }
    }

    /**
     * Get current stardate for display
     */
    getStardate() {
        const now = new Date();
        const year = now.getFullYear();
        const dayOfYear = Math.floor((now - new Date(year, 0, 0)) / 86400000);
        return `${year}.${dayOfYear.toString().padStart(3, '0')}`;
    }

    /**
     * Get fallback content when ship context is not available
     */
    getFallbackContent() {
        return `
            <div class="scan-line"></div>
            <div class="manual-section">
                <h3 class="section-header">[ SHIP SYSTEMS OFFLINE ]</h3>
                <div class="warning-text">Unable to access ship systems. Please ensure proper connection to ship's computer.</div>
            </div>
        `;
    }

    /**
     * Get Help tab content (exact copy of original HelpInterface structure)
     */
    getHelpContent() {
        const context = this.getShipContext();
        if (!context) {
            return `
                <div class="scan-line"></div>
                <div class="manual-section">
                    <h3 class="section-header">[ SHIP SYSTEMS OFFLINE ]</h3>
                    <div class="warning-text">Unable to access ship systems. Please ensure proper connection to ship's computer.</div>
                </div>
            `;
        }

        // Use the exact same structure as HelpInterface
        const shipTypeDisplay = context.shipType.replace('_', ' ').toUpperCase();
        
        return `
            <div class="scan-line"></div>
            ${this.generateBasicControlsSection()}
            ${this.generateMovementSection(context)}
            ${this.generateSystemsSection(context)}
            ${this.generateCombatSection(context)}
            ${this.generateAdvancedSection(context)}
            
            <div class="system-status-footer">
                <div class="status-line">SYSTEMS ONLINE: ${Object.keys(context.availableSystems).length} / ${context.equippedWeapons.length > 0 ? Object.keys(context.availableSystems).length + 1 : Object.keys(context.availableSystems).length}</div>
                <div class="status-line">MANUAL ACCESS: AUTHORIZED</div>
            </div>
        `;
    }

    /**
     * Get ship context for help content (exact copy from HelpInterface)
     */
    getShipContext() {
        const ship = this.starfieldManager?.viewManager?.getShip();
        if (!ship) return null;

        // Get the most current ship type - check multiple sources
        let shipType = ship.shipType;
        
        // Check docking interface for current ship type (most reliable when in docking mode)
        if (this.starfieldManager?.viewManager?.dockingInterface?.currentShipType) {
            shipType = this.starfieldManager.viewManager.dockingInterface.currentShipType;
        }
        
        // Also check card inventory UI directly if available
        if (this.starfieldManager?.viewManager?.dockingInterface?.cardInventoryUI?.currentShipType) {
            shipType = this.starfieldManager.viewManager.dockingInterface.cardInventoryUI.currentShipType;
        }
        
        // Check if there's a global cardInventoryUI reference
        if (window.cardInventoryUI?.currentShipType) {
            shipType = window.cardInventoryUI.currentShipType;
        }
        
        // Fallback to checking the ship's configuration if available
        if (!shipType && ship.shipConfig?.shipType) {
            shipType = ship.shipConfig.shipType;
        }
        
        // Final fallback
        if (!shipType) {
            shipType = 'unknown_ship';
        }

        const availableSystems = {};
        const equippedWeapons = [];
        
        // Check which systems are available based on cards
        const systemsToCheck = [
            'impulse_engines', 'warp_drive', 'shields', 'target_computer',
            'long_range_scanner', 'subspace_radio', 'galactic_chart', 'star_charts', 'radar'
        ];
        
        for (const systemName of systemsToCheck) {
            const system = ship.getSystem(systemName);
            if (system && ship.hasSystemCardsSync && ship.hasSystemCardsSync(systemName)) {
                availableSystems[systemName] = {
                    level: system.level,
                    isOperational: typeof system.isOperational === 'function' ? system.isOperational() : system.isOperational,
                    health: Math.round(system.healthPercentage * 100)
                };
            }
        }
        
        // Get equipped weapons
        if (ship.weaponSystem) {
            for (let i = 0; i < ship.weaponSystem.weaponSlots.length; i++) {
                const slot = ship.weaponSystem.weaponSlots[i];
                if (!slot.isEmpty && slot.equippedWeapon) {
                    equippedWeapons.push({
                        name: slot.equippedWeapon.name,
                        type: slot.equippedWeapon.cardType,
                        level: slot.equippedWeapon.level,
                        slotIndex: i
                    });
                }
            }
        }
        
        return {
            ship,
            shipType: shipType,
            availableSystems,
            equippedWeapons,
            hasTargetComputer: availableSystems.target_computer?.isOperational,
            hasWeapons: equippedWeapons.length > 0,
            hasSubTargeting: availableSystems.target_computer?.level >= 2
        };
    }

    /**
     * Get Pilot's Log tab content
     */
    getPilotsLogContent() {
        return `
            <div class="pilots-log-section">
                <div class="log-header">PILOT ACTIVITY LOG</div>
                <div class="log-entry">
                    <div class="log-timestamp">Stardate ${this.getStardate()}</div>
                    <div class="log-event">Help System 2.0 accessed</div>
                </div>
                <div class="log-entry">
                    <div class="log-timestamp">Stardate ${this.getStardate()}</div>
                    <div class="log-event">Game session initiated</div>
                </div>
                <div class="log-placeholder">
                    <div class="placeholder-text">Additional log entries will appear as you play...</div>
                    <div class="placeholder-subtext">• Docking operations • Combat encounters • Mission completions</div>
                </div>
            </div>
        `;
    }

    /**
     * Get Achievements tab content
     */
    getAchievementsContent() {
        return `
            <div class="achievements-section">
                <div class="achievements-header">ACHIEVEMENT PROGRESS</div>
                
                <div class="achievement-category">
                    <div class="category-header">COMBAT VICTORIES</div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 20%"></div>
                        </div>
                        <div class="progress-text">2 / 10 (Bronze Tier)</div>
                    </div>
                </div>
                
                <div class="achievement-category">
                    <div class="category-header">STATION VISITS</div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0 / 5 (Bronze Tier)</div>
                    </div>
                </div>
                
                <div class="achievement-category">
                    <div class="category-header">DISCOVERIES</div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0 / 3 (Bronze Tier)</div>
                    </div>
                </div>
                
                <div class="achievements-placeholder">
                    <div class="placeholder-text">Achievement system coming soon...</div>
                    <div class="placeholder-subtext">Bronze • Silver • Gold • Platinum trophies</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate basic controls section (exact copy from original HelpInterface)
     */
    generateBasicControlsSection() {
        return `
            <div class="manual-section">
                <h3 class="section-header">[ BASIC NAVIGATION ]</h3>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">F</span>
                        <span class="control-desc">Forward View</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">A</span>
                        <span class="control-desc">Aft View</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">ESC</span>
                        <span class="control-desc">Toggle Technical Manual</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">D</span>
                        <span class="control-desc">Diplomacy Report</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">O</span>
                        <span class="control-desc">Operations Report</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate movement section (from original HelpInterface)
     */
    generateMovementSection(context) {
        if (!context || !context.availableSystems.impulse_engines) {
            return `
                <div class="manual-section disabled-section">
                    <h3 class="section-header">[ IMPULSE PROPULSION - OFFLINE ]</h3>
                    <div class="warning-text">WARNING: No impulse engine cards detected</div>
                </div>
            `;
        }

        const engine = context.availableSystems.impulse_engines;
        const maxSpeed = engine.health < 50 ? 3 : 9;
        
        return `
            <div class="manual-section">
                <h3 class="section-header">[ IMPULSE PROPULSION - LEVEL ${engine.level} ]</h3>
                <div class="system-status">Engine Status: ${engine.health}% • Max Speed: Impulse ${maxSpeed}</div>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">1-${maxSpeed}</span>
                        <span class="control-desc">Set Impulse Speed</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">0</span>
                        <span class="control-desc">Full Stop</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">+ / =</span>
                        <span class="control-desc">Increase Speed</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">- / _</span>
                        <span class="control-desc">Decrease Speed</span>
                    </div>
                </div>
                ${engine.health < 75 ? '<div class="caution-text">CAUTION: Engine damage detected - reduced performance</div>' : ''}
            </div>
        `;
    }

    /**
     * Generate systems section (exact copy from original HelpInterface)
     */
    generateSystemsSection(context) {
        let systemsHTML = `
            <div class="manual-section">
                <h3 class="section-header">[ SHIP SYSTEMS ]</h3>
                <div class="control-grid">
        `;

        // Shields
        if (context.availableSystems.shields) {
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">S</span>
                    <span class="control-desc">Shield Control (Lv.${context.availableSystems.shields.level})</span>
                </div>
            `;
        }

        // Long Range Scanner
        if (context.availableSystems.long_range_scanner) {
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">L</span>
                    <span class="control-desc">Long Range Scanner (Lv.${context.availableSystems.long_range_scanner.level})</span>
                </div>
            `;
        }

        // Star Charts
        if (context.availableSystems.star_charts) {
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">C</span>
                    <span class="control-desc">Star Charts Navigation System (Lv.${context.availableSystems.star_charts.level})</span>
                </div>
            `;
        }

        // Subspace Radio
        if (context.availableSystems.subspace_radio) {
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">R</span>
                    <span class="control-desc">Subspace Radio (Lv.${context.availableSystems.subspace_radio.level})</span>
                </div>
            `;
        }

        // Proximity Detector (Radar) - check both system and cards
        const hasRadarSystem = context.availableSystems.radar;
        const hasRadarCards = context.ship.hasSystemCardsSync && context.ship.hasSystemCardsSync('radar');
        
        if (hasRadarSystem || hasRadarCards) {
            const level = hasRadarSystem ? context.availableSystems.radar.level : 1;
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">P</span>
                    <span class="control-desc">Proximity Detector (Lv.${level})</span>
                </div>
                <div class="control-entry">
                    <span class="key-binding">+ / -</span>
                    <span class="control-desc">Proximity Detector Zoom In/Out</span>
                </div>
                <div class="control-entry">
                    <span class="key-binding">\\</span>
                    <span class="control-desc">Toggle 3D/Top-Down View Mode</span>
                </div>
            `;
        }

        // Galactic Chart
        if (context.availableSystems.galactic_chart) {
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">G</span>
                    <span class="control-desc">Galactic Chart (Lv.${context.availableSystems.galactic_chart.level})</span>
                </div>
            `;
        }

        // Intel (if target computer is available)
        if (context.hasTargetComputer) {
            systemsHTML += `
                <div class="control-entry">
                    <span class="key-binding">I</span>
                    <span class="control-desc">Intel Display</span>
                </div>
            `;
        }

        systemsHTML += `
                </div>
            </div>
        `;

        return systemsHTML;
    }

    /**
     * Generate combat section (from original HelpInterface)
     */
    generateCombatSection(context) {
        return `
            <div class="manual-section">
                <h3 class="section-header">[ COMBAT SYSTEMS ]</h3>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Z</span>
                        <span class="control-desc">Previous Weapon</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">X</span>
                        <span class="control-desc">Next Weapon</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Q</span>
                        <span class="control-desc">Create Target Dummies</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">F</span>
                        <span class="control-desc">Fore View</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">A</span>
                        <span class="control-desc">Aft View</span>
                    </div>
                </div>
                <div class="weapon-loadout">
                    <div class="loadout-header">CURRENT LOADOUT</div>
                    ${context && context.equippedWeapons ? context.equippedWeapons.map((weapon, index) => 
                        `<div class="weapon-entry">
                            <span class="weapon-slot">${index + 1}</span>
                            <span class="weapon-name">${weapon.toUpperCase()}</span>
                            <span class="weapon-level">Level 1</span>
                        </div>`
                    ).join('') : '<div class="weapon-entry">No weapons detected</div>'}
                </div>
            </div>
        `;
    }

    /**
     * Generate advanced section (from original HelpInterface)
     */
    generateAdvancedSection(context) {
        return `
            <div class="manual-section">
                <h3 class="section-header">[ ADVANCED OPERATIONS ]</h3>
                <div class="tech-notes">
                    <div class="notes-header">OPERATIONAL NOTES</div>
                    <div class="note-entry">• Docking is automatic when approaching stations</div>
                    <div class="note-entry">• Beam weapons provide instant hit with sub-system targeting</div>
                    <div class="note-entry">• Projectile weapons use physics-based flight paths</div>
                    <div class="note-entry">• Emergency stop available with backslash (\\) key</div>
                </div>
            </div>
        `;
    }

    /**
     * Get controls tab content (legacy method, now unused)
     */
    getControlsContent() {
        return `
            <div class="controls-section">
                <h3>Flight Controls</h3>
                <div class="control-grid">
                    <div class="control-item">
                        <span class="key">W A S D</span>
                        <span class="desc">Ship Movement</span>
                    </div>
                    <div class="control-item">
                        <span class="key">Arrow Keys</span>
                        <span class="desc">Ship Rotation</span>
                    </div>
                    <div class="control-item">
                        <span class="key">1-9</span>
                        <span class="desc">Speed Control</span>
                    </div>
                    <div class="control-item">
                        <span class="key">0</span>
                        <span class="desc">Full Stop</span>
                    </div>
                </div>
            </div>
            
            <div class="controls-section">
                <h3>Combat Systems</h3>
                <div class="control-grid">
                    <div class="control-item">
                        <span class="key">Tab</span>
                        <span class="desc">Cycle Targets</span>
                    </div>
                    <div class="control-item">
                        <span class="key">Space</span>
                        <span class="desc">Fire Weapons</span>
                    </div>
                    <div class="control-item">
                        <span class="key">Z / X</span>
                        <span class="desc">Previous/Next Weapon</span>
                    </div>
                    <div class="control-item">
                        <span class="key">Q</span>
                        <span class="desc">Spawn Target Dummy</span>
                    </div>
                </div>
            </div>
            
            <div class="controls-section">
                <h3>Navigation & UI</h3>
                <div class="control-grid">
                    <div class="control-item">
                        <span class="key">M</span>
                        <span class="desc">Star Charts</span>
                    </div>
                    <div class="control-item">
                        <span class="key">O</span>
                        <span class="desc">Operations HUD</span>
                    </div>
                    <div class="control-item">
                        <span class="key">W</span>
                        <span class="desc">Target Computer</span>
                    </div>
                    <div class="control-item">
                        <span class="key">ESC</span>
                        <span class="desc">Help Screen (this)</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get about tab content
     */
    getAboutContent() {
        return `
            <div class="credits-wrapper">
                <div class="credits-block">
                    <div class="credits-header">DEVELOPMENT TEAM</div>
                    <div class="credits-line">Game Design & Direction: Thor Alexander</div>
                    <div class="credits-line">Programming: Claude / Cursor</div>
                    <div class="credits-line">Art Director: Midjourney</div>
                    <div class="credits-line">Voice Acting: Chatterbox</div>
                </div>
                
                <div class="credits-block">
                    <div class="credits-header">INSPIRATION</div>
                    <div class="credits-line">Star Raiders</div>
                    <div class="credits-line">Elite ('84)</div>
                    <div class="credits-line">Wing Commander: Privateer</div>
                    <div class="credits-line">Freelancer</div>
                </div>
                
                <div class="credits-block">
                    <div class="credits-header">SPECIAL THANKS</div>
                    <div class="credits-line">To all space trading game pioneers</div>
                    <div class="credits-line">Open source community</div>
                    <div class="credits-line">Beta testers and players</div>
                </div>
            </div>
        `;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        try {
            if (this.isOpen) {
                this.close();
            }
            
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            
            this.modal = null;
            
        } catch (error) {
            console.error('❌ Failed to destroy help screen:', error);
        }
    }
}
