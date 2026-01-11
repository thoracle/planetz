/**
 * MissionRenderer - Handles UI rendering for mission panels
 * Extracted from MissionStatusHUD.js to reduce file size and improve modularity.
 *
 * @module MissionRenderer
 */

import { debug } from '../debug.js';

/**
 * @typedef {Object} ObjectiveIcon
 * @property {string} symbol - Icon symbol character
 * @property {string} color - CSS color string
 */

/**
 * @typedef {Object} MissionObjective
 * @property {string} id - Objective ID
 * @property {string} description - Objective description
 * @property {string} [status] - Objective status (PENDING, COMPLETED, ACTIVE, FAILED)
 * @property {string} [state] - Raw state from API
 * @property {boolean} [is_achieved] - Whether objective is achieved
 * @property {boolean} [is_optional] - Whether objective is optional
 * @property {boolean} [isOptional] - Whether objective is optional (normalized)
 * @property {number|Object} [progress] - Progress value or object
 * @property {string} [waypointId] - ID of associated waypoint for navigation
 */

/**
 * @typedef {Object} NormalizedObjective
 * @property {string} id - Objective ID
 * @property {string} description - Objective description
 * @property {string} status - Normalized status (PENDING, COMPLETED, ACTIVE, FAILED)
 * @property {boolean} isOptional - Whether objective is optional
 * @property {string} [state] - Raw state from API
 * @property {number|Object} [progress] - Progress value or object
 * @property {string} [waypointId] - ID of associated waypoint
 */

/**
 * @typedef {Object} MissionData
 * @property {string} id - Mission ID
 * @property {string} title - Mission title
 * @property {string} client - Client name
 * @property {string} [location] - Mission location
 * @property {string} [timeRemaining] - Formatted time remaining
 * @property {boolean} expanded - Whether panel is expanded
 * @property {MissionObjective[]} objectives - Mission objectives
 */

/**
 * @typedef {Object} MissionRewards
 * @property {number} [credits] - Credit reward
 * @property {Object} [factionBonuses] - Faction standing changes
 * @property {Object} [cards] - Card rewards
 * @property {number} [cards.count] - Number of cards
 * @property {string[]} [cards.names] - Card names
 * @property {string[]} [cards.types] - Card types
 */

/**
 * @typedef {import('../ui/MissionStatusHUD.js').MissionStatusHUD} MissionStatusHUD
 */

/**
 * Icon and color mappings for objective statuses
 * @type {Object<string, ObjectiveIcon>}
 */
const OBJECTIVE_ICONS = {
    COMPLETED: { symbol: '✓', color: '#00ff41' },
    ACTIVE: { symbol: '●', color: '#ffff44' },
    PENDING: { symbol: '○', color: '#888888' },
    FAILED: { symbol: '✗', color: '#ff4444' },
    OPTIONAL: { symbol: '◇', color: '#ffff44' },
    LOCKED: { symbol: '🔒', color: '#666666' }
};

/**
 * Faction display name mappings
 * @type {Object<string, string>}
 */
const FACTION_NAMES = {
    'terran_republic_alliance': 'TRA',
    'explorers_guild': 'Explorers Guild',
    'traders_guild': 'Traders Guild',
    'friendly': 'Allied Forces',
    'neutral': 'Independent',
    'enemy': 'Hostile Forces'
};

/**
 * Card type display name mappings
 * @type {Object<string, string>}
 */
const CARD_TYPE_NAMES = {
    'scanner': 'Scanner Module Card',
    'long_range_sensor': 'Long Range Sensor Card',
    'shield_generator': 'Shield Generator Card',
    'weapon_system': 'Weapon System Card',
    'engine_upgrade': 'Engine Upgrade Card',
    'cargo_expansion': 'Cargo Expansion Card',
    'navigation_computer': 'Navigation Computer Card',
    'communication_array': 'Communication Array Card'
};

/**
 * Renderer class for mission UI components
 */
export class MissionRenderer {
    /** @type {MissionStatusHUD} Reference to parent HUD */
    hud;

    /**
     * Create a new MissionRenderer
     * @param {MissionStatusHUD} hud - Reference to parent HUD
     */
    constructor(hud) {
        this.hud = hud;
    }

    /**
     * Create individual mission panel
     * @param {MissionData} mission - Mission data
     * @param {number} index - Mission index
     * @returns {HTMLDivElement} Panel element
     */
    createMissionPanel(mission, index) {
        const panel = document.createElement('div');
        panel.className = 'mission-panel';
        panel.style.cssText = `
            background: rgba(0, 40, 0, 0.3);
            border: 1px solid #00ff41;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 10px;
            transition: all 0.3s ease;
        `;

        // Panel header with mission title and expand/collapse
        const header = this.createMissionHeader(mission, index);
        panel.appendChild(header);

        // Mission details (collapsible)
        const details = this.createMissionDetails(mission);
        panel.appendChild(details);

        // Add hover effects
        panel.addEventListener('mouseenter', () => {
            panel.style.background = 'rgba(0, 60, 0, 0.4)';
        });
        panel.addEventListener('mouseleave', () => {
            panel.style.background = 'rgba(0, 40, 0, 0.3)';
        });

        return panel;
    }

    /**
     * Create mission header with title and expand/collapse
     * @param {MissionData} mission - Mission data
     * @param {number} index - Mission index
     * @returns {HTMLDivElement} Header element
     */
    createMissionHeader(mission, index) {
        const header = document.createElement('div');
        header.className = 'mission-header-panel';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            margin-bottom: 10px;
        `;

        // Expand/collapse icon and title
        const titleSection = document.createElement('div');
        titleSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        `;

        const expandIcon = document.createElement('span');
        expandIcon.textContent = mission.expanded ? '▼' : '▲';
        expandIcon.style.cssText = `
            color: #00ff41;
            font-size: 12px;
            transition: transform 0.2s ease;
        `;

        const title = document.createElement('span');
        title.style.cssText = `
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
        `;
        title.textContent = mission.title;

        titleSection.appendChild(expandIcon);
        titleSection.appendChild(title);

        // Mission progress indicator
        const progress = document.createElement('div');
        progress.style.cssText = `
            color: #ffff44;
            font-size: 14px;
        `;
        progress.textContent = this.getMissionProgress(mission);

        header.appendChild(titleSection);
        header.appendChild(progress);

        // Toggle expand/collapse on click
        header.addEventListener('click', () => {
            mission.expanded = !mission.expanded;

            // Save the expanded state to preserve user preference
            this.hud.expandedStates.set(mission.id, mission.expanded);

            expandIcon.textContent = mission.expanded ? '▼' : '▲';
            const details = header.nextElementSibling;
            details.style.display = mission.expanded ? 'block' : 'none';

            debug('UI', `Mission ${mission.id} ${mission.expanded ? 'expanded' : 'collapsed'} by user`);
        });

        return header;
    }

    /**
     * Create mission details section
     * @param {MissionData} mission - Mission data
     * @returns {HTMLDivElement} Details element
     */
    createMissionDetails(mission) {
        const details = document.createElement('div');
        details.className = 'mission-details';
        details.style.cssText = `
            display: ${mission.expanded ? 'block' : 'none'};
            padding-left: 20px;
        `;

        // Mission info
        const info = document.createElement('div');
        info.style.cssText = `
            margin-bottom: 10px;
            font-size: 14px;
            color: #cccccc;
        `;
        info.innerHTML = `
            Client: ${mission.client}<br>
            ${mission.location ? `Location: ${mission.location}<br>` : ''}
            ${mission.timeRemaining ? `Time Remaining: ${mission.timeRemaining}` : ''}
        `;
        details.appendChild(info);

        // Objectives
        const objectivesTitle = document.createElement('div');
        objectivesTitle.style.cssText = `
            color: #00ff41;
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        objectivesTitle.textContent = 'OBJECTIVES:';
        details.appendChild(objectivesTitle);

        // Objective list
        const objectiveList = document.createElement('div');
        objectiveList.style.cssText = `
            margin-left: 10px;
        `;

        mission.objectives.forEach(objective => {
            const objElement = this.createObjectiveElement(objective);
            objectiveList.appendChild(objElement);
        });

        details.appendChild(objectiveList);

        return details;
    }

    /**
     * Create individual objective element
     * @param {MissionObjective} objective - Objective data
     * @returns {HTMLDivElement} Objective element
     */
    createObjectiveElement(objective) {
        // Normalize objective data from backend format
        const normalizedObjective = this.normalizeObjective(objective);

        const objElement = document.createElement('div');
        objElement.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            font-size: 14px;
        `;

        // Icon and description
        const description = document.createElement('div');
        description.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
        `;

        const icon = this.getObjectiveIcon(normalizedObjective.status);
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon.symbol;
        iconSpan.style.color = icon.color;

        // Check if this is a waypoint objective AND it's active
        const isActive = normalizedObjective.state === 'active' || normalizedObjective.status === 'ACTIVE';
        if (normalizedObjective.waypointId && isActive) {
            // Create clickable waypoint link for ACTIVE waypoints only
            const waypointLink = document.createElement('a');
            waypointLink.textContent = normalizedObjective.description;
            waypointLink.style.cssText = `
                color: #00ff88;
                text-decoration: underline;
                cursor: pointer;
            `;

            waypointLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.hud.targetWaypoint(normalizedObjective.waypointId);
            });

            description.appendChild(iconSpan);
            description.appendChild(waypointLink);
        } else {
            // Regular non-waypoint objective or inactive waypoint
            const descText = document.createElement('span');
            descText.textContent = normalizedObjective.description;
            descText.style.color = normalizedObjective.isOptional ? '#ffff44' : '#ffffff';

            description.appendChild(iconSpan);
            description.appendChild(descText);
        }

        // Status
        const status = document.createElement('div');
        status.style.cssText = `
            color: ${icon.color};
            font-size: 13px;
            text-transform: uppercase;
        `;
        status.textContent = this.getObjectiveStatus(normalizedObjective);

        objElement.appendChild(description);
        objElement.appendChild(status);

        return objElement;
    }

    /**
     * Create rewards section to append under objectives
     * @param {MissionRewards} rewards - Rewards earned
     * @param {string} missionId - Mission ID
     * @returns {HTMLDivElement} Rewards section element
     */
    createRewardsSection(rewards, missionId) {
        const rewardsSection = document.createElement('div');
        rewardsSection.className = 'mission-rewards-section';
        rewardsSection.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #00ff41;
        `;

        // Check if there are any rewards to display
        const hasCredits = rewards.credits && rewards.credits > 0;
        const hasFactionRep = rewards.factionBonuses && Object.keys(rewards.factionBonuses).length > 0;
        const hasCards = rewards.cards && rewards.cards.count > 0;
        const hasRewards = hasCredits || hasFactionRep || hasCards;

        if (hasRewards) {
            // Rewards header
            const rewardsHeader = document.createElement('div');
            rewardsHeader.style.cssText = `
                color: #00ff41;
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 10px;
                text-shadow: 0 0 5px #00ff41;
            `;
            rewardsHeader.textContent = 'REWARDS:';
            rewardsSection.appendChild(rewardsHeader);

            // Rewards list
            const rewardsList = document.createElement('div');
            rewardsList.className = 'rewards-list';
            rewardsList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 5px;
                margin-bottom: 15px;
            `;

            // Add individual rewards
            if (hasCredits) {
                rewardsList.appendChild(this.createRewardItem('💰', `${rewards.credits.toLocaleString()} Credits`));
            }

            if (hasFactionRep) {
                Object.entries(rewards.factionBonuses).forEach(([faction, amount]) => {
                    const factionName = this.getFactionDisplayName(faction);
                    rewardsList.appendChild(this.createRewardItem('🎖️', `+${amount} ${factionName} Rep`));
                });
            }

            if (hasCards) {
                // Show individual card names if available, otherwise show count
                if (rewards.cards.names && rewards.cards.names.length > 0) {
                    rewards.cards.names.forEach(cardName => {
                        rewardsList.appendChild(this.createRewardItem('🃏', cardName));
                    });
                } else if (rewards.cards.types && rewards.cards.types.length > 0) {
                    // Fallback: show card types if names not available
                    rewards.cards.types.forEach(cardType => {
                        const formattedType = this.formatCardTypeName(cardType);
                        rewardsList.appendChild(this.createRewardItem('🃏', formattedType));
                    });
                } else {
                    // Final fallback: show count
                    const cardText = `${rewards.cards.count} NFT Card${rewards.cards.count > 1 ? 's' : ''}`;
                    rewardsList.appendChild(this.createRewardItem('🃏', cardText));
                }
            }

            rewardsSection.appendChild(rewardsList);
        }

        // OK button (always shown for completed missions)
        const okButton = document.createElement('button');
        okButton.className = 'mission-ok-button';
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
            transition: all 0.3s ease;
            text-transform: uppercase;
            width: 100%;
            margin-top: 10px;
        `;

        // Add hover effect
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

        // Add click handler
        okButton.addEventListener('click', () => {
            this.hud.removeMission(missionId);
        });

        rewardsSection.appendChild(okButton);

        return rewardsSection;
    }

    /**
     * Create individual reward item element
     * @param {string} icon - Reward icon emoji
     * @param {string} text - Reward text description
     * @returns {HTMLDivElement} Reward item element
     */
    createRewardItem(icon, text) {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ffffff;
            font-size: 12px;
        `;

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '14px';
        iconSpan.textContent = icon;

        const textSpan = document.createElement('span');
        textSpan.textContent = text;

        item.appendChild(iconSpan);
        item.appendChild(textSpan);

        return item;
    }

    /**
     * Get objective icon and color based on status
     * @param {string} status - Objective status (PENDING, COMPLETED, ACTIVE, FAILED, OPTIONAL, LOCKED)
     * @returns {ObjectiveIcon} Icon symbol and color
     */
    getObjectiveIcon(status) {
        return OBJECTIVE_ICONS[status] || OBJECTIVE_ICONS.PENDING;
    }

    /**
     * Convert backend objective data to frontend format
     * @param {MissionObjective} objective - Raw objective data from API
     * @returns {NormalizedObjective} Normalized objective for UI display
     */
    normalizeObjective(objective) {
        const achieved = (objective.is_achieved === true)
            || (objective.status === 'COMPLETED')
            || (typeof objective.progress === 'number' && objective.progress >= 1);
        const status = achieved ? 'COMPLETED' : (objective.status || 'PENDING');

        return {
            ...objective,
            status: status,
            isOptional: objective.is_optional || false
        };
    }

    /**
     * Get objective status text
     * @param {NormalizedObjective} objective - Normalized objective
     * @returns {string} Status text (e.g., "[COMPLETE]", "[PENDING]")
     */
    getObjectiveStatus(objective) {
        if (objective.status === 'COMPLETED') return '[COMPLETE]';
        if (objective.status === 'ACTIVE' && objective.progress) return `[${objective.progress}]`;
        if (objective.status === 'FAILED') return '[FAILED]';
        if (objective.isOptional) return '[BONUS]';
        return '[PENDING]';
    }

    /**
     * Get mission progress summary
     * @param {MissionData} mission - Mission data
     * @returns {string} Progress text (e.g., "2/3")
     */
    getMissionProgress(mission) {
        const normalizedObjectives = mission.objectives.map(obj => this.normalizeObjective(obj));
        const completed = normalizedObjectives.filter(obj => obj.status === 'COMPLETED').length;
        const total = normalizedObjectives.filter(obj => !obj.isOptional).length;
        return `${completed}/${total}`;
    }

    /**
     * Show message when no active missions
     * @param {HTMLElement} contentArea - Content container element
     * @returns {void}
     */
    showNoMissionsMessage(contentArea) {
        contentArea.innerHTML = `
            <div style="
                text-align: center;
                color: #888888;
                font-size: 16px;
                padding: 20px;
                font-style: italic;
            ">
                No active missions<br>
                <span style="font-size: 14px; margin-top: 10px; display: block;">
                    Visit a station's Mission Board to accept missions
                </span>
            </div>
        `;
    }

    /**
     * Show error message
     * @param {HTMLElement} contentArea - Content container element
     * @param {string} message - Error message to display
     * @returns {void}
     */
    showErrorMessage(contentArea, message) {
        contentArea.innerHTML = `
            <div style="
                text-align: center;
                color: #ff4444;
                font-size: 14px;
                padding: 20px;
            ">
                Error: ${message}
            </div>
        `;
    }

    /**
     * Get display name for faction
     * @param {string} factionId - Faction identifier
     * @returns {string} Display name
     */
    getFactionDisplayName(factionId) {
        return FACTION_NAMES[factionId] || factionId || 'Unknown';
    }

    /**
     * Format card type name for display
     * @param {string} cardType - Card type identifier
     * @returns {string} Formatted display name
     */
    formatCardTypeName(cardType) {
        return CARD_TYPE_NAMES[cardType] || this.capitalizeWords(cardType.replace(/_/g, ' ')) + ' Card';
    }

    /**
     * Capitalize words in a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeWords(str) {
        return str.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }
}

export default MissionRenderer;
