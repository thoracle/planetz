/**
 * MissionStateManager - Handles mission state and data processing
 * Extracted from MissionStatusHUD.js to reduce file size and improve modularity.
 *
 * @module MissionStateManager
 */

import { debug } from '../debug.js';

/**
 * Manager class for mission state and data operations
 */
export class MissionStateManager {
    /**
     * Create a new MissionStateManager
     * @param {MissionStatusHUD} hud - Reference to parent HUD
     */
    constructor(hud) {
        this.hud = hud;
    }

    /**
     * Refresh missions from mission API
     * @returns {Promise<void>}
     */
    async refreshMissions() {
        // Skip refresh if any missions are showing completion rewards
        if (this.hud.missionsShowingCompletion && this.hud.missionsShowingCompletion.size > 0) {
            debug('MISSIONS', `Refresh blocked - ${this.hud.missionsShowingCompletion.size} missions showing completion rewards`);
            return;
        }

        debug('MISSIONS', 'Refresh proceeding - no missions showing completion rewards');

        try {
            // Get active missions from API
            const apiMissions = await this.hud.missionAPI.getActiveMissions();

            // Preserve completed missions that are showing completion screens
            const completedMissionsShowingRewards = this.hud.activeMissions.filter(mission => {
                const panel = this.hud.missionPanels.get(mission.id);
                const hasRewardsSection = panel && panel.querySelector('.mission-rewards-section');
                const isMarkedCompleted = mission.status === 'completed';
                const hasFlaggedRewardsSection = mission.hasRewardsSection === true;
                const isInCompletionSet = this.hud.missionsShowingCompletion.has(mission.id);

                return (isMarkedCompleted || hasRewardsSection || hasFlaggedRewardsSection || isInCompletionSet) && this.hud.missionPanels.has(mission.id);
            });

            // Combine API missions with completed missions showing rewards
            this.hud.activeMissions = [...apiMissions, ...completedMissionsShowingRewards];

            this.hud.renderMissions();
            debug('MISSIONS', `Refreshed ${this.hud.activeMissions.length} active missions (${apiMissions.length} active + ${completedMissionsShowingRewards.length} completed)`);
        } catch (error) {
            debug('MISSIONS', `Error refreshing missions: ${error.message}`);
            this.hud.renderer.showErrorMessage(this.hud.contentArea, 'Failed to load missions');

            // Fallback to mock data for testing
            debug('UI', 'MissionStatusHUD: Using mock data as fallback');
            this.hud.activeMissions = this.hud.getMockMissions();
            this.hud.renderMissions();
        }
    }

    /**
     * Update missions data directly with provided mission objects
     * Avoids race conditions with API calls when we already have fresh data
     * @param {Array} updatedMissions - Array of mission objects
     */
    updateMissionsData(updatedMissions) {
        try {
            // Process missions for UI display
            this.hud.activeMissions = updatedMissions.map(mission => this.processMissionForUI(mission));

            this.hud.renderMissions();
            debug('MISSIONS', `Updated with ${this.hud.activeMissions.length} missions directly`);
        } catch (error) {
            debug('MISSIONS', `Error updating missions data: ${error.message}`);
            // Fallback to refresh if direct update fails
            this.refreshMissions();
        }
    }

    /**
     * Update mission status (called periodically)
     */
    updateMissionStatus() {
        if (!this.hud.isVisible) return;

        // Update mission progress, timers, distances, etc.
        this.hud.activeMissions.forEach(mission => {
            this.updateMissionPanel(mission);
        });
    }

    /**
     * Update individual mission panel
     * @param {Object} mission - Mission data
     */
    updateMissionPanel(mission) {
        const panel = this.hud.missionPanels.get(mission.id);
        if (!panel) return;

        // Update time remaining if applicable
        if (mission.timeRemaining) {
            // Simulate countdown (in real implementation, this would come from mission manager)
            const parts = mission.timeRemaining.split(':');
            let minutes = parseInt(parts[0]);
            let seconds = parseInt(parts[1]);

            seconds--;
            if (seconds < 0) {
                seconds = 59;
                minutes--;
            }

            if (minutes >= 0) {
                mission.timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        // Re-render the panel with updated data
        const newPanel = this.hud.renderer.createMissionPanel(mission, Array.from(this.hud.missionPanels.keys()).indexOf(mission.id));
        panel.replaceWith(newPanel);
        this.hud.missionPanels.set(mission.id, newPanel);
    }

    /**
     * Process mission data from API for UI display
     * @param {Object} mission - Raw mission data
     * @returns {Object} Processed mission for UI
     */
    processMissionForUI(mission) {
        // Preserve expanded state if it exists, otherwise default to false
        const wasExpanded = this.hud.expandedStates.get(mission.id) || false;

        // Check if we already have this mission in our local array with completion status
        const existingMission = this.hud.activeMissions.find(m => m.id === mission.id);
        const preservedStatus = existingMission?.status;
        const preservedRewardsFlag = existingMission?.hasRewardsSection;

        const clientName = mission.client || mission.issuer || 'Unknown Client';

        const processedMission = {
            id: mission.id,
            title: mission.title,
            client: clientName,
            location: mission.location,
            timeRemaining: this.calculateTimeRemaining(mission),
            expanded: wasExpanded,
            status: preservedStatus || mission.status,
            hasRewardsSection: preservedRewardsFlag,
            objectives: mission.objectives?.map(obj => ({
                id: obj.id,
                description: obj.description,
                status: obj.state?.toUpperCase() || 'PENDING',
                progress: obj.progress || null,
                isOptional: obj.optional || false
            })) || []
        };

        // Copy other preserved fields if they exist
        if (existingMission) {
            if (existingMission.completedAt) processedMission.completedAt = existingMission.completedAt;
            if (existingMission.rewards) processedMission.rewards = existingMission.rewards;
            if (existingMission.completionData) processedMission.completionData = existingMission.completionData;
        }

        return processedMission;
    }

    /**
     * Calculate time remaining for mission
     * @param {Object} mission - Mission data
     * @returns {string|null} Time remaining string or null
     */
    calculateTimeRemaining(mission) {
        if (!mission.time_limit) return null;

        const now = new Date();
        const deadline = new Date(mission.time_limit);
        const remaining = deadline - now;

        if (remaining <= 0) return '00:00';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Show mission completion rewards in the mission panel
     * @param {string} missionId - Mission ID
     * @param {Object} missionData - Mission data
     * @param {Object} rewards - Rewards earned
     */
    async showMissionCompletion(missionId, missionData, rewards) {
        try {
            debug('MISSIONS', `showMissionCompletion called for: ${missionId}`);
            debug('MISSIONS', `HUD visible=${this.hud.isVisible}`);

            if (!this.hud.isVisible) {
                debug('MISSIONS', 'Auto-opening HUD for rewards display');
                this.hud.show();
            } else {
                // Force display even if already "visible"
                this.hud.show();
            }

            // Small delay to ensure HUD is fully rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            const panel = this.hud.missionPanels.get(missionId);
            if (!panel) {
                debug('MISSIONS', `Panel not found for mission: ${missionId}`);
                return;
            }

            debug('MISSIONS', `Panel found for: ${missionId}`);

            // Block refreshes and mark the mission as completed
            this.hud.missionsShowingCompletion.add(missionId);
            debug('MISSIONS', `Added to completion tracking, size: ${this.hud.missionsShowingCompletion.size}`);

            const mission = this.hud.activeMissions.find(m => m.id === missionId);
            if (mission) {
                mission.status = 'completed';
                mission.completedAt = Date.now();
                mission.rewards = rewards;
                mission.completionData = missionData;
                mission.hasRewardsSection = true;
                debug('MISSIONS', `Marked mission as completed in HUD: ${missionId}`);
            } else {
                debug('MISSIONS', 'Mission not found in activeMissions array');
            }

            // Find the mission details section
            const detailsSection = panel.querySelector('.mission-details');
            if (!detailsSection) {
                debug('MISSIONS', `Mission details section not found in panel: ${missionId}`);
                return;
            }

            // Check if rewards section already exists
            const existingRewardsSection = detailsSection.querySelector('.mission-rewards-section');
            if (existingRewardsSection) {
                debug('MISSIONS', `Rewards section already exists for mission: ${missionId}`);
                return;
            }

            // Create and add rewards section
            debug('MISSIONS', 'Creating rewards section');
            const rewardsSection = this.hud.renderer.createRewardsSection(rewards, missionId);
            detailsSection.appendChild(rewardsSection);

            // Update panel styling for completion
            panel.style.background = 'rgba(0, 60, 0, 0.4)';
            panel.style.border = '2px solid #00ff41';
            panel.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';

            // Make rewards section visible with highlighting
            rewardsSection.style.background = 'rgba(0, 100, 0, 0.5)';
            rewardsSection.style.border = '2px solid #00ff41';
            rewardsSection.style.padding = '15px';
            rewardsSection.style.margin = '10px 0';

            debug('MISSIONS', `Added rewards section to mission panel: ${missionId}`);

            // Verify the rewards section is still there after a short delay
            this.hud._createTrackedTimeout(() => {
                const stillExists = detailsSection.querySelector('.mission-rewards-section');
                if (!stillExists) {
                    debug('MISSIONS', `Rewards section was removed for ${missionId}`);
                }
            }, 1000);

        } catch (error) {
            debug('MISSIONS', `Error in showMissionCompletion: ${error.message}`);
        }
    }

    /**
     * Remove mission from HUD (called by OK button)
     * @param {string} missionId - Mission ID to remove
     */
    removeMission(missionId) {
        debug('MISSIONS', `Removing completed mission from HUD: ${missionId}`);

        // Remove from completion tracking to allow refreshes again
        this.hud.missionsShowingCompletion.delete(missionId);
        debug('MISSIONS', 'Removed mission from completion tracking, allowing refreshes');

        const panel = this.hud.missionPanels.get(missionId);
        if (panel) {
            // Fade out animation
            panel.style.transition = 'all 0.3s ease';
            panel.style.opacity = '0';
            panel.style.transform = 'translateX(100%)';

            // Remove after animation
            this.hud._createTrackedTimeout(() => {
                if (panel.parentNode) {
                    panel.parentNode.removeChild(panel);
                }
                this.hud.missionPanels.delete(missionId);

                // Clean up expanded state tracking
                this.hud.expandedStates.delete(missionId);

                // Remove from active missions list
                this.hud.activeMissions = this.hud.activeMissions.filter(m => m.id !== missionId);

                // Delete from caches
                this.deleteMissionFromCaches(missionId);

                // Show no missions message if empty
                if (this.hud.activeMissions.length === 0) {
                    this.hud.renderer.showNoMissionsMessage(this.hud.contentArea);
                }

                debug('MISSIONS', 'Mission fully removed, refreshes can resume');
            }, 300);
        }
    }

    /**
     * Delete mission from all caches (called after user dismisses completion)
     * @param {string} missionId - Mission ID to delete
     */
    deleteMissionFromCaches(missionId) {
        debug('UI', `Deleting mission from caches: ${missionId}`);

        // Remove from MissionAPI cache
        if (window.missionAPI && window.missionAPI.activeMissions) {
            const removed = window.missionAPI.activeMissions.delete(missionId);
            debug('UI', `Removed from MissionAPI cache: ${removed ? 'SUCCESS' : 'NOT FOUND'}`);
        }

        // Remove from MissionEventHandler cache
        if (window.missionEventHandler && window.missionEventHandler.activeMissions) {
            const localRemoved = window.missionEventHandler.activeMissions.delete(missionId);
            debug('UI', `Removed from local cache: ${localRemoved ? 'SUCCESS' : 'NOT FOUND'}`);
        }

        debug('UI', `Mission ${missionId} fully deleted from all caches`);
    }

    /**
     * Create completion data for mission completion UI
     * @param {Object} mission - Mission data
     * @returns {Object} Completion data
     */
    createCompletionData(mission) {
        const completedObjectives = mission.objectives?.filter(obj => obj.is_achieved === true).length || 0;
        const totalObjectives = mission.objectives?.filter(obj => !obj.optional).length || 1;
        const bonusObjectives = mission.objectives?.filter(obj => obj.optional && obj.is_achieved === true).length || 0;
        const totalBonusObjectives = mission.objectives?.filter(obj => obj.optional).length || 0;

        return {
            completionTime: this.calculateCompletionTime(mission),
            timeLimit: mission.time_limit || null,
            bonusObjectives: {
                completed: bonusObjectives,
                total: totalBonusObjectives
            },
            rewards: {
                credits: mission.rewards?.credits || 1000,
                cards: mission.rewards?.cards || [],
                factionStanding: mission.rewards?.faction_standing || {}
            },
            statistics: {
                objectivesCompleted: `${completedObjectives}/${totalObjectives}`,
                completionRate: `${Math.round((completedObjectives / totalObjectives) * 100)}%`,
                bonusCompleted: `${bonusObjectives}/${totalBonusObjectives}`
            }
        };
    }

    /**
     * Calculate mission completion time
     * @param {Object} mission - Mission data
     * @returns {string} Completion time string
     */
    calculateCompletionTime(mission) {
        if (!mission.accepted_at) return 'Unknown';

        const startTime = new Date(mission.accepted_at);
        const endTime = new Date();
        const duration = endTime - startTime;

        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

export default MissionStateManager;
