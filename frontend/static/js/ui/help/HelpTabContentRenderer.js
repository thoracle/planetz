/**
 * HelpTabContentRenderer - Handles tab content generation for Help Interface
 * Extracted from HelpInterface.js to reduce file size.
 *
 * Handles:
 * - Achievements tab content generation
 * - Ships log tab content
 * - Collection tab content (card display and upgrades)
 * - About tab content
 */

import { debug } from '../../debug.js';

export class HelpTabContentRenderer {
    constructor(helpInterface) {
        this.helpInterface = helpInterface;
    }

    /**
     * Refresh the ship's log display with latest entries
     */
    refreshShipsLogDisplay() {
        try {
            const shipsLogTab = document.getElementById('ships-log-tab');
            if (shipsLogTab) {
                shipsLogTab.innerHTML = this.generateShipsLogContent();
            }
        } catch (error) {
            debug('UI', 'Error refreshing ships log display:', error);
        }
    }

    /**
     * Refresh the achievements display with latest data
     */
    refreshAchievementsDisplay() {
        try {
            debug('P1', '🔄 Refreshing achievements display');
            const achievementsTab = document.getElementById('achievements-tab');
            if (achievementsTab) {
                achievementsTab.innerHTML = this.generateAchievementsContent();
                debug('P1', '✅ Achievements display refreshed');
            } else {
                debug('P1', '❌ Achievements tab element not found');
            }
        } catch (error) {
            debug('P1', '❌ Error refreshing achievements display:', error);
        }
    }

    /**
     * Generate Achievements content
     */
    generateAchievementsContent() {
        try {
            // Check if achievement system is available
            if (!window.achievementSystem) {
                debug('P1', '❌ Achievement system not available in generateAchievementsContent');
                return `
                    <div class="achievements-loading">
                        <div class="achievements-header">
                            <h3>🏆 PILOT ACHIEVEMENTS</h3>
                            <div class="system-status">Achievement system initializing...</div>
                        </div>
                        <div class="tech-notes">
                            <div class="note-entry">• Achievement system loading</div>
                            <div class="note-entry">• Please wait for initialization</div>
                        </div>
                    </div>
                `;
            }

            debug('P1', '✅ Achievement system found, generating content');
            const stats = window.achievementSystem.getStatistics();
            const explorationAchievements = window.achievementSystem.getAchievementsByCategory('exploration');

            debug('P1', `📊 Achievement stats: ${stats.unlocked}/${stats.total} (${stats.percentage}%)`);
            debug('P1', `🔍 Exploration achievements: ${explorationAchievements.length}`);

            return `
                <div class="achievements-container">
                    <div class="achievements-header">
                        <h3>🏆 PILOT ACHIEVEMENTS</h3>
                        <div class="system-status">Track your progress and unlock new capabilities</div>
                        <div class="achievement-stats">
                            <span class="stat-item">Progress: ${stats.unlocked}/${stats.total} (${stats.percentage}%)</span>
                        </div>
                    </div>

                    <div class="achievement-categories">
                        <div class="achievement-category">
                            <h4>🔍 EXPLORATION ACHIEVEMENTS</h4>
                            <div class="achievement-list">
                                ${explorationAchievements.map(achievement => this.renderAchievement(achievement)).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="tech-notes">
                        <div class="notes-header">ACHIEVEMENT SYSTEM STATUS</div>
                        <div class="note-entry">• Discover objects in space to unlock exploration achievements</div>
                        <div class="note-entry">• Achievement notifications appear in HUD and ship's log</div>
                        <div class="note-entry">• Unlocked achievements provide credit rewards</div>
                    </div>
                </div>
            `;
        } catch (error) {
            debug('P1', '❌ Error generating achievements content:', error);
            return `
                <div class="achievements-error">
                    <div class="achievements-header">
                        <h3>🏆 PILOT ACHIEVEMENTS</h3>
                        <div class="system-status">Error loading achievement data</div>
                    </div>
                    <div class="tech-notes">
                        <div class="note-entry">• Achievement system error</div>
                        <div class="note-entry">• Please refresh and try again</div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Render a single achievement
     */
    renderAchievement(achievement) {
        const progress = achievement.progress;
        const isUnlocked = progress.unlocked;
        const percentage = Math.round(progress.percentage);
        const tier = achievement.tier;

        return `
            <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${tier.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name" style="color: ${tier.color}">
                        ${achievement.name}
                    </div>
                    <div class="achievement-description">
                        ${achievement.description}
                    </div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%; background-color: ${tier.color}"></div>
                        </div>
                        <div class="progress-text">
                            ${progress.current}/${progress.target} ${isUnlocked ? '✅' : ''}
                        </div>
                    </div>
                    ${isUnlocked && progress.unlockedAt ? `
                        <div class="achievement-unlocked">
                            Unlocked: ${new Date(progress.unlockedAt).toLocaleDateString()}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Generate Ship's Log content
     */
    generateShipsLogContent() {
        // Get recent log entries from the global ship log
        const recentEntries = window.shipLog ? window.shipLog.getRecentEntries(15) : [];
        const totalEntries = window.shipLog ? window.shipLog.entries.length : 0;

        // Generate log entries HTML
        const logEntriesHTML = recentEntries.length > 0
            ? recentEntries.map(entry => {
                const typeClass = entry.type === 'ephemeral' ? 'log-entry-ephemeral' : 'log-entry-system';
                const typeIcon = entry.type === 'ephemeral' ? '📡' : '•';
                return `<div class="note-entry ${typeClass}">${typeIcon} [${entry.stardate}] ${entry.message}</div>`;
            }).join('')
            : '<div class="note-entry">• No log entries available</div>';

        return `
            <div class="manual-section">
                <div class="section-header">SHIP'S LOG</div>
                <div class="system-status">
                    Log entries are automatically recorded during flight operations
                    ${window.gameConfig?.verbose ? ' • Ephemeral messages included' : ' • Ephemeral messages disabled'}
                </div>

                <div class="tech-notes">
                    <div class="notes-header">RECENT ENTRIES</div>
                    ${logEntriesHTML}
                </div>

                <div class="system-status-footer">
                    <div class="status-line">LOG STATUS: ACTIVE</div>
                    <div class="status-line">ENTRIES: ${totalEntries} TOTAL</div>
                    <div class="status-line">VERBOSE MODE: ${window.gameConfig?.verbose ? 'ENABLED' : 'DISABLED'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate Collection content
     */
    generateCollectionContent() {
        // Get credits from global playerCredits if available
        let credits = 0;
        try {
            if (window.playerCredits && window.playerCredits.getCredits) {
                credits = window.playerCredits.getCredits();
            }
        } catch (error) {
            debug('UI', 'Could not get player credits:', error);
        }

        return `
            <div class="manual-section">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>CARD COLLECTION</span>
                    <span style="font-size: 14px; color: #00ff41;">CREDITS: ${credits.toLocaleString()}</span>
                </div>

                <div class="system-status">Card inventory and upgrade management</div>

                <div class="collection-grid-simple">
                    ${this.generateSimpleCardList()}
                </div>

                <div class="tech-notes">
                    <div class="notes-header">COLLECTION STATUS</div>
                    <div class="note-entry">• Access full collection interface at docking stations</div>
                    <div class="note-entry">• Upgrade cards when you have sufficient duplicates</div>
                    <div class="note-entry">• Higher level cards provide better performance</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate a simple card list from the single source of truth
     */
    generateSimpleCardList() {
        // SINGLE SOURCE OF TRUTH: Use the singleton CardInventoryUI instance
        let cardData = [];

        try {
            // Get the singleton instance - this is the single source of truth for all card data
            const cardInventoryUI = window.cardInventoryUI;

            if (cardInventoryUI && cardInventoryUI.inventory) {
                const discoveredCards = cardInventoryUI.inventory.getDiscoveredCards();

                cardData = discoveredCards.map(stack => {
                    const rarity = stack.sampleCard.rarity;
                    debug('UI', `Card: ${stack.name}, Rarity: ${rarity}, Type: ${stack.sampleCard.cardType}`);
                    return {
                        name: stack.name,
                        count: stack.count,
                        level: stack.level,
                        cardType: stack.sampleCard.cardType,
                        rarity: rarity,
                        icon: stack.sampleCard.getIcon(),
                        canUpgrade: this.checkCanUpgrade(stack),
                        isNew: this.isCardNew(stack.sampleCard.cardType),
                        hasQuantityIncrease: this.hasQuantityIncrease(stack.sampleCard.cardType)
                    };
                });

            } else {
                debug('UI', '❌ ESC Collection: CardInventoryUI singleton not available');
            }
        } catch (error) {
            debug('UI', 'Could not access card inventory:', error);
        }

        if (cardData.length === 0) {
            return `
                <div class="weapon-entry" style="text-align: center; padding: 20px;">
                    <span style="color: #66ff66; font-style: italic;">
                        Card collection data not available.<br>
                        Visit a docking station to view your full collection.
                    </span>
                </div>
            `;
        }

        return `
            <div class="collection-card-grid">
                ${cardData.map(card => `
                    <div class="collection-card-item ${card.isNew ? 'has-new-badge' : ''}" data-rarity="${card.rarity}">
                        <div class="card-header">
                            <div class="card-icon">${card.icon}</div>
                            ${card.isNew ?
                                '<div class="new-badge">NEW</div>' :
                                `<div class="card-count-badge" ${card.hasQuantityIncrease ? 'style="background-color: #ff4444; color: white; font-weight: bold; animation: pulse-red 2s infinite;"' : ''}>x${card.count}</div>`
                            }
                        </div>
                        <div class="card-body">
                            <div class="card-name">${card.name}</div>
                            <div class="card-level">Level ${card.level}</div>
                            <div class="card-rarity">${card.rarity.toUpperCase()}</div>
                        </div>
                        <div class="card-footer">
                            ${card.canUpgrade ?
                                `<button class="upgrade-button" onclick="window.helpInterface.upgradeCard('${card.cardType}')">⬆️ UPGRADE TO LEVEL ${card.level + 1}</button>` :
                                `<div class="card-status">${card.level >= 5 ? '🏆 MAX LEVEL' : 'Ready'}</div>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Simple check if a card can be upgraded (without complex dependencies)
     */
    checkCanUpgrade(stack) {
        const upgradeCosts = {
            2: { cards: 3, credits: 1000 },
            3: { cards: 6, credits: 5000 },
            4: { cards: 12, credits: 15000 },
            5: { cards: 24, credits: 50000 }
        };

        const nextLevel = stack.level + 1;
        const maxLevel = 5;

        if (nextLevel > maxLevel) return false;

        const cost = upgradeCosts[nextLevel];
        if (!cost) return false;

        const hasEnoughCards = stack.count >= cost.cards;

        // Try to check credits
        let hasEnoughCredits = false;
        try {
            if (window.playerCredits && window.playerCredits.canAfford) {
                hasEnoughCredits = window.playerCredits.canAfford(cost.credits);
            }
        } catch (error) {
            // Assume false if we can't check
        }

        return hasEnoughCards && hasEnoughCredits;
    }

    /**
     * Check if a card should show the NEW badge (from CardInventoryUI system)
     */
    isCardNew(cardType) {
        try {
            if (window.cardInventoryUI && window.cardInventoryUI.isCardNew) {
                return window.cardInventoryUI.isCardNew(cardType);
            }

            // Fallback: check localStorage directly
            const lastShopVisit = parseInt(localStorage.getItem('planetz_last_shop_visit') || '0');
            const newCardTimestamps = JSON.parse(localStorage.getItem('planetz_new_card_timestamps') || '{}');
            const cardTimestamp = newCardTimestamps[cardType];
            return cardTimestamp && cardTimestamp > lastShopVisit;
        } catch (error) {
            debug('UI', 'Error checking if card is new:', error);
            return false;
        }
    }

    /**
     * Check if a card has a quantity increase (red badge from CardInventoryUI system)
     */
    hasQuantityIncrease(cardType) {
        try {
            if (window.cardInventoryUI && window.cardInventoryUI.hasQuantityIncrease) {
                return window.cardInventoryUI.hasQuantityIncrease(cardType);
            }

            // Fallback: check localStorage directly
            const quantityIncreaseTimestamps = JSON.parse(localStorage.getItem('planetz_quantity_increase_timestamps') || '{}');
            return !!quantityIncreaseTimestamps[cardType];
        } catch (error) {
            debug('UI', 'Error checking quantity increase:', error);
            return false;
        }
    }

    /**
     * Upgrade a card from the help screen collection
     */
    upgradeCard(cardType) {
        debug('P1', `🔧 Attempting to upgrade card: ${cardType}`);

        try {
            // Try to use the CardInventoryUI upgrade system
            if (window.cardInventoryUI && window.cardInventoryUI.upgradeCard) {
                const success = window.cardInventoryUI.upgradeCard(cardType);
                if (success) {
                    debug('P1', `✅ Successfully upgraded ${cardType}`);

                    // Play upgrade sound if available
                    if (window.cardInventoryUI.playUpgradeSound) {
                        window.cardInventoryUI.playUpgradeSound();
                    }

                    // Refresh the collection display after a short delay
                    setTimeout(() => {
                        this.refreshCollectionDisplay();
                    }, 100);

                    return true;
                } else {
                    debug('P1', `❌ Failed to upgrade ${cardType} - insufficient resources`);
                    return false;
                }
            } else {
                debug('P1', '❌ CardInventoryUI not available for upgrade');
                return false;
            }
        } catch (error) {
            debug('P1', `❌ Error upgrading card ${cardType}:`, error);
            return false;
        }
    }

    /**
     * Refresh the collection display with latest inventory data
     */
    refreshCollectionDisplay() {
        try {
            const collectionTab = document.getElementById('collection-tab');
            if (collectionTab) {
                collectionTab.innerHTML = this.generateCollectionContent();
            }
        } catch (error) {
            debug('UI', 'Error refreshing collection display:', error);
        }
    }

    /**
     * Generate About content
     */
    generateAboutContent() {
        return `
            <div class="manual-section">
                <div class="section-header">STAR FUCKERS</div>
                <div class="system-status">The Retro Space Shooter you never knew you needed.</div>
            </div>

            <div class="manual-section">
                <div class="section-header">DEVELOPMENT TEAM</div>
                <div class="tech-notes">
                    <div class="note-entry">Game Design & Direction: Thor Alexander</div>
                    <div class="note-entry">Programming: Claude / Cursor</div>
                    <div class="note-entry">Art: Midjourney</div>
                    <div class="note-entry">Voice Acting: Chatterbox</div>
                </div>
            </div>

            <div class="manual-section">
                <div class="section-header">INSPIRATION</div>
                <div class="tech-notes">
                    <div class="note-entry">Star Raiders</div>
                    <div class="note-entry">Elite ('84)</div>
                    <div class="note-entry">Wing Commander: Privateer</div>
                    <div class="note-entry">Freelancer</div>
                </div>
            </div>

            <div class="manual-section">
                <div class="section-header">SPECIAL THANKS</div>
                <div class="tech-notes">
                    <div class="note-entry">To all space trading game pioneers</div>
                    <div class="note-entry">Open source community</div>
                    <div class="note-entry">Beta testers and players</div>
                </div>
            </div>
        `;
    }
}
