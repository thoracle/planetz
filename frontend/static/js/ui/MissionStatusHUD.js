import { debug } from '../debug.js';
import { MissionAPIService } from '../services/MissionAPIService.js';
import { MissionRenderer } from '../managers/MissionRenderer.js';
import { MissionStateManager } from '../managers/MissionStateManager.js';

/**
 * MissionStatusHUD - In-game mission tracking interface
 * Positioned in upper-right corner, toggled with M key
 * Shows active missions and objectives with real-time updates
 *
 * Refactored to delegate to:
 * - MissionRenderer: UI panel and component rendering
 * - MissionStateManager: Mission state and data processing
 */
export class MissionStatusHUD {
    constructor(starfieldManager, missionManager) {
        this.starfieldManager = starfieldManager;
        this.missionManager = missionManager;
        this.isVisible = false;
        this.activeMissions = [];
        this.updateInterval = null;

        // Use global Mission API Service (shared with waypoint system)
        this.missionAPI = window.missionAPI || new MissionAPIService();

        // UI components
        this.hudContainer = null;
        this.missionPanels = new Map();
        this.lastUpdateTime = 0;

        // Track expanded state of missions to preserve user preferences
        this.expandedStates = new Map();

        // Track missions showing completion to prevent refresh interference
        this.missionsShowingCompletion = new Set();

        // Update frequency (2Hz = every 500ms)
        this.updateFrequency = 500;

        // Track timeouts for cleanup
        this.activeTimeouts = new Set();

        // Bound event handlers for cleanup
        this._boundHandlers = {
            closeButtonClick: null,
            closeButtonMouseEnter: null,
            closeButtonMouseLeave: null
        };

        // Store missionAPI event handler references for cleanup
        this._missionAPIHandlers = {
            missionAccepted: null,
            missionCompleted: null,
            objectiveCompleted: null
        };

        // Store reference to close button for cleanup
        this.closeButton = null;

        // Initialize extracted modules
        this.renderer = new MissionRenderer(this);
        this.stateManager = new MissionStateManager(this);

        this.initialize();
    }

    initialize() {
        this.createHUDContainer();
        this.setupEventListeners();
        debug('UI', 'MissionStatusHUD: Initialized');

        // Make globally accessible for testing
        window.missionStatusHUD = this;
    }

    /**
     * Create the main HUD container with positioning and styling
     */
    createHUDContainer() {
        this.hudContainer = document.createElement('div');
        this.hudContainer.className = 'mission-status-hud';
        this.hudContainer.style.cssText = `
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
            z-index: 1001;
            display: none;
            user-select: none;
            backdrop-filter: blur(2px);
            overflow-y: auto;
        `;

        this.createHeader();
        this.createContent();

        document.body.appendChild(this.hudContainer);
        debug('AI', 'MissionStatusHUD: Container created');
    }

    /**
     * Create header with title and close button
     */
    createHeader() {
        this.headerArea = document.createElement('div');
        this.headerArea.className = 'mission-header';
        this.headerArea.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #00ff41;
        `;

        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: #00ff41;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        title.innerHTML = '◉ MISSION STATUS';

        // Close button
        this.closeButton = document.createElement('div');
        this.closeButton.style.cssText = `
            color: #ffffff;
            cursor: pointer;
            font-size: 16px;
            padding: 4px 8px;
            border: 1px solid #00ff41;
            border-radius: 3px;
            background: rgba(0, 255, 65, 0.1);
            transition: all 0.2s ease;
        `;
        this.closeButton.textContent = '[M] CLOSE';

        // Create bound handlers for cleanup
        this._boundHandlers.closeButtonClick = () => this.toggle();
        this._boundHandlers.closeButtonMouseEnter = () => {
            if (this.closeButton) {
                this.closeButton.style.background = 'rgba(0, 255, 65, 0.3)';
            }
        };
        this._boundHandlers.closeButtonMouseLeave = () => {
            if (this.closeButton) {
                this.closeButton.style.background = 'rgba(0, 255, 65, 0.1)';
            }
        };

        this.closeButton.addEventListener('click', this._boundHandlers.closeButtonClick);
        this.closeButton.addEventListener('mouseenter', this._boundHandlers.closeButtonMouseEnter);
        this.closeButton.addEventListener('mouseleave', this._boundHandlers.closeButtonMouseLeave);

        this.headerArea.appendChild(title);
        this.headerArea.appendChild(this.closeButton);
        this.hudContainer.appendChild(this.headerArea);
    }

    /**
     * Create content area for mission panels
     */
    createContent() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'mission-content';
        this.contentArea.style.cssText = `
            max-height: 320px;
            overflow-y: auto;
        `;

        // Initially show no missions message
        this.renderer.showNoMissionsMessage(this.contentArea);

        this.hudContainer.appendChild(this.contentArea);
    }

    /**
     * Show the HUD
     */
    show() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.hudContainer.style.display = 'block';
            debug('UI', 'MissionStatusHUD: Shown');

            // Start periodic updates
            this.startUpdates();
            // Initial load of missions
            this.refreshMissions();
        }
        return true;
    }

    /**
     * Hide the HUD
     */
    hide() {
        if (this.isVisible) {
            this.isVisible = false;
            this.hudContainer.style.display = 'none';
            debug('UI', 'MissionStatusHUD: Hidden');

            // Stop updates
            this.stopUpdates();
        }
        return true;
    }

    /**
     * Toggle HUD visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.hudContainer.style.display = this.isVisible ? 'block' : 'none';

        debug('UI', `MissionStatusHUD: ${this.isVisible ? 'Enabled' : 'Disabled'}`);

        if (this.isVisible) {
            this.startUpdates();
            this.refreshMissions();
        } else {
            this.stopUpdates();
        }

        return true;
    }

    /**
     * Start periodic mission updates
     */
    startUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.stateManager.updateMissionStatus();
        }, this.updateFrequency);

        debug('UI', 'MissionStatusHUD: Started periodic updates');
    }

    /**
     * Stop periodic updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        debug('UI', 'MissionStatusHUD: Stopped periodic updates');
    }

    /**
     * Create a tracked timeout that can be cleaned up on destroy
     */
    _createTrackedTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.activeTimeouts.delete(timeoutId);
            callback();
        }, delay);
        this.activeTimeouts.add(timeoutId);
        return timeoutId;
    }

    /**
     * Clear all tracked timeouts
     */
    _clearAllTimeouts() {
        this.activeTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts.clear();
    }

    // Delegate to MissionStateManager
    async refreshMissions() {
        return this.stateManager.refreshMissions();
    }

    updateMissionsData(updatedMissions) {
        return this.stateManager.updateMissionsData(updatedMissions);
    }

    async showMissionCompletion(missionId, missionData, rewards) {
        return this.stateManager.showMissionCompletion(missionId, missionData, rewards);
    }

    removeMission(missionId) {
        return this.stateManager.removeMission(missionId);
    }

    /**
     * Render all active missions
     */
    renderMissions() {
        // Preserve existing panels that have rewards sections (completed missions)
        const panelsToPreserve = new Map();
        this.missionPanels.forEach((panel, missionId) => {
            const hasRewardsSection = panel.querySelector('.mission-rewards-section');
            const isInCompletionSet = this.missionsShowingCompletion.has(missionId);

            if (hasRewardsSection || isInCompletionSet) {
                panelsToPreserve.set(missionId, panel);
                debug('UI', `Preserving panel with rewards section: ${missionId}`);
            }
        });

        // Clear content but preserve panels with rewards
        this.contentArea.innerHTML = '';
        this.missionPanels.clear();

        if (this.activeMissions.length === 0) {
            this.renderer.showNoMissionsMessage(this.contentArea);
            return;
        }

        this.activeMissions.forEach((mission, index) => {
            let panel;

            // Use preserved panel if it exists, otherwise create new one
            if (panelsToPreserve.has(mission.id)) {
                panel = panelsToPreserve.get(mission.id);
                debug('UI', `Reusing preserved panel for mission: ${mission.id}`);
            } else {
                panel = this.renderer.createMissionPanel(mission, index);
            }

            this.contentArea.appendChild(panel);
            this.missionPanels.set(mission.id, panel);
        });
    }

    /**
     * Target a waypoint by ID
     */
    targetWaypoint(waypointId) {
        debug('MISSIONS', `MISSION HUD: Targeting waypoint: ${waypointId}`);

        if (!window.targetComputerManager) {
            debug('MISSIONS', 'MISSION HUD: targetComputerManager not available');
            return false;
        }

        if (!window.targetComputerManager.targetWaypointViaCycle) {
            debug('MISSIONS', 'MISSION HUD: targetWaypointViaCycle method not available');
            return false;
        }

        const success = window.targetComputerManager.targetWaypointViaCycle(waypointId);

        if (success) {
            debug('MISSIONS', `MISSION HUD: Waypoint targeted successfully: ${waypointId}`);
        } else {
            debug('MISSIONS', `MISSION HUD: Failed to target waypoint: ${waypointId}`);
        }

        return success;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create bound handlers for missionAPI events
        this._missionAPIHandlers.missionAccepted = (data) => {
            debug('UI', 'MissionStatusHUD: Mission accepted', data.mission);
            this.refreshMissions();
        };

        this._missionAPIHandlers.missionCompleted = (data) => {
            debug('UI', 'MissionStatusHUD: Mission completed', data.mission);
            this.refreshMissions();

            // Play mission completion audio
            this.playMissionCompletionAudio();

            // Show mission completion UI
            if (this.starfieldManager && this.starfieldManager.showMissionComplete) {
                this.starfieldManager.showMissionComplete(data.mission.id, this.stateManager.createCompletionData(data.mission));
            }
        };

        this._missionAPIHandlers.objectiveCompleted = (data) => {
            debug('UI', 'MissionStatusHUD: Objective completed', data);

            // Play objective completion audio
            this.playObjectiveCompletionAudio();

            // Use direct update if we have mission data, otherwise refresh from API
            if (data.mission && Array.isArray([data.mission])) {
                this.updateMissionsData([data.mission]);
            } else {
                this.refreshMissions();
            }
        };

        // Listen to mission API events
        this.missionAPI.addEventListener('missionAccepted', this._missionAPIHandlers.missionAccepted);
        this.missionAPI.addEventListener('missionCompleted', this._missionAPIHandlers.missionCompleted);
        this.missionAPI.addEventListener('objectiveCompleted', this._missionAPIHandlers.objectiveCompleted);

        debug('UI', 'MissionStatusHUD: Event listeners ready');
    }

    /**
     * Get visibility status
     */
    get visible() {
        return this.isVisible;
    }

    /**
     * Update player data in mission API
     */
    updatePlayerData(playerData) {
        if (this.missionAPI) {
            this.missionAPI.updatePlayerData(playerData);
        }
    }

    /**
     * Set player location in mission API
     */
    setPlayerLocation(location) {
        if (this.missionAPI) {
            this.missionAPI.setPlayerLocation(location);
        }
    }

    /**
     * Get mock missions for testing
     */
    getMockMissions() {
        return [
            {
                id: 'mission_001',
                title: 'ELIMINATE RAIDER SQUADRON',
                client: 'Terra Defense Force',
                location: 'Sol Inner',
                timeRemaining: '15:42',
                expanded: true,
                objectives: [
                    { description: 'Locate raider squadron', status: 'COMPLETED', isOptional: false },
                    { description: 'Eliminate 5 raider ships', status: 'ACTIVE', progress: '3/5', isOptional: false },
                    { description: 'Return to Terra Station', status: 'PENDING', isOptional: false }
                ]
            },
            {
                id: 'mission_002',
                title: 'CARGO DELIVERY RUN',
                client: 'Free Traders Union',
                location: 'Ceres → Europa',
                expanded: false,
                objectives: [
                    { description: 'Pick up cargo from Ceres', status: 'COMPLETED', isOptional: false },
                    { description: 'Deliver to Europa Station', status: 'ACTIVE', isOptional: false },
                    { description: 'Avoid pirate ambush', status: 'PENDING', isOptional: true }
                ]
            }
        ];
    }

    /**
     * Play audio when an objective is completed
     */
    playObjectiveCompletionAudio() {
        try {
            if (window.targetComputerManager && window.targetComputerManager.playAudio) {
                window.targetComputerManager.playAudio('frontend/static/audio/blurb.mp3');
                debug('MISSIONS', 'Played objective completion audio: blurb.mp3');
            } else {
                const audio = new Audio('static/audio/blurb.mp3');
                audio.volume = 0.7;
                audio.play().catch(() => {
                    debug('MISSIONS', 'Could not play objective completion audio');
                });
                debug('MISSIONS', 'Played objective completion audio (fallback): blurb.mp3');
            }
        } catch (error) {
            debug('MISSIONS', `Error playing objective completion audio: ${error.message}`);
        }
    }

    /**
     * Play audio when a mission is completed
     */
    playMissionCompletionAudio() {
        try {
            if (window.targetComputerManager && window.targetComputerManager.playAudio) {
                window.targetComputerManager.playAudio('frontend/static/audio/success.wav');
                debug('MISSIONS', 'Played mission completion audio: success.wav');
            } else {
                const audio = new Audio('static/audio/success.wav');
                audio.volume = 0.8;
                audio.play().catch(() => {
                    debug('MISSIONS', 'Could not play mission completion audio');
                });
                debug('MISSIONS', 'Played mission completion audio (fallback): success.wav');
            }
        } catch (error) {
            debug('MISSIONS', `Error playing mission completion audio: ${error.message}`);
        }
    }

    /**
     * Clean up all resources
     */
    destroy() {
        // Stop periodic updates
        this.stopUpdates();

        // Clear all tracked timeouts
        this._clearAllTimeouts();

        // Remove closeButton event listeners
        if (this.closeButton && this._boundHandlers) {
            this.closeButton.removeEventListener('click', this._boundHandlers.closeButtonClick);
            this.closeButton.removeEventListener('mouseenter', this._boundHandlers.closeButtonMouseEnter);
            this.closeButton.removeEventListener('mouseleave', this._boundHandlers.closeButtonMouseLeave);
        }
        this._boundHandlers = null;

        // Remove missionAPI event listeners
        if (this.missionAPI && this._missionAPIHandlers) {
            if (this._missionAPIHandlers.missionAccepted) {
                this.missionAPI.removeEventListener('missionAccepted', this._missionAPIHandlers.missionAccepted);
            }
            if (this._missionAPIHandlers.missionCompleted) {
                this.missionAPI.removeEventListener('missionCompleted', this._missionAPIHandlers.missionCompleted);
            }
            if (this._missionAPIHandlers.objectiveCompleted) {
                this.missionAPI.removeEventListener('objectiveCompleted', this._missionAPIHandlers.objectiveCompleted);
            }
        }
        this._missionAPIHandlers = null;

        // Clear Maps and Sets
        if (this.missionPanels) {
            this.missionPanels.clear();
            this.missionPanels = null;
        }
        if (this.expandedStates) {
            this.expandedStates.clear();
            this.expandedStates = null;
        }
        if (this.missionsShowingCompletion) {
            this.missionsShowingCompletion.clear();
            this.missionsShowingCompletion = null;
        }

        // Remove HUD container from DOM
        if (this.hudContainer && this.hudContainer.parentNode) {
            this.hudContainer.parentNode.removeChild(this.hudContainer);
        }

        // Clear global reference
        if (window.missionStatusHUD === this) {
            window.missionStatusHUD = null;
        }

        // Null out all references
        this.hudContainer = null;
        this.headerArea = null;
        this.contentArea = null;
        this.closeButton = null;
        this.activeMissions = null;
        this.starfieldManager = null;
        this.missionManager = null;
        this.missionAPI = null;
        this.renderer = null;
        this.stateManager = null;

        debug('UI', 'MissionStatusHUD destroyed - all resources cleaned up');
    }

    /**
     * Alias for destroy() for consistency with other UI components
     */
    dispose() {
        this.destroy();
    }
}
