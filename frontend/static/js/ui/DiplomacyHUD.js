import { debug } from '../debug.js';

/**
 * Diplomacy HUD - Shows faction standings and diplomatic relations
 */

export default class DiplomacyHUD {
    constructor(starfieldManager, containerElement) {
        this.starfieldManager = starfieldManager;
        this.container = containerElement || document.body;
        this.isVisible = false;
        this.elements = {};
        this.updateInterval = null;

        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 500px;
            max-height: 70vh;
            overflow-y: auto;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 15px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
            backdrop-filter: blur(2px);
        `;

        this.createHeader();
        this.createFactionList();

        // Add CSS for faction colors and styling
        this.addStyles();
    }

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 10px;
        `;

        const title = document.createElement('h2');
        title.textContent = '🏛️ DIPLOMACY REPORT';
        title.style.cssText = `
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #00ff41;
            text-shadow: 0 0 10px #00ff41;
        `;

        const subtitle = document.createElement('div');
        subtitle.textContent = 'Current Faction Standings';
        subtitle.style.cssText = `
            font-size: 12px;
            color: #cccccc;
            opacity: 0.8;
        `;

        header.appendChild(title);
        header.appendChild(subtitle);
        this.container.appendChild(header);
    }

    createFactionList() {
        const factionList = document.createElement('div');
        factionList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Get faction standings from ship
        const ship = this.starfieldManager?.ship;
        const factionStandings = ship?.factionStandings || {};

        // Define faction information with icons
        const factionInfo = {
            'terran_republic_alliance': {
                name: 'Terran Republic Alliance',
                shortName: 'TRA',
                color: '#00ff41',
                description: 'Human space federation',
                icon: '🏛️'  // Government building
            },
            'traders_guild': {
                name: 'Traders Guild',
                shortName: 'TRG',
                color: '#ffff44',
                description: 'Commercial organization',
                icon: '💰'  // Money/coin
            },
            'scientists_consortium': {
                name: 'Scientists Consortium',
                shortName: 'SCI',
                color: '#00aaff',
                description: 'Research organization',
                icon: '🔬'  // Laboratory/science
            },
            'explorers_guild': {
                name: 'Explorers Guild',
                shortName: 'EXP',
                color: '#ffaa00',
                description: 'Exploration organization',
                icon: '🧭'  // Compass/navigation
            },
            'mercenary_fleet': {
                name: 'Mercenary Fleet',
                shortName: 'MFC',
                color: '#ff4444',
                description: 'Independent contractors',
                icon: '⚔️'  // Sword/combat
            }
        };

        // Create faction entries
        Object.entries(factionInfo).forEach(([key, info]) => {
            const standing = factionStandings[key] || 0;
            const factionEntry = this.createFactionEntry(key, info, standing);
            factionList.appendChild(factionEntry);
        });

        this.container.appendChild(factionList);
        this.elements.factionList = factionList;
    }

    createFactionEntry(factionKey, factionInfo, standing) {
        const entry = document.createElement('div');
        entry.style.cssText = `
            background: rgba(0, 40, 0, 0.3);
            border: 1px solid ${factionInfo.color};
            padding: 10px;
            border-radius: 4px;
            transition: all 0.3s ease;
        `;

        // Calculate reputation level and color
        const repLevel = this.getReputationLevel(standing);

        entry.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <span style="
                        font-size: 16px;
                        margin-right: 4px;
                    ">${factionInfo.icon}</span>
                    <span style="
                        color: ${factionInfo.color};
                        font-weight: bold;
                        font-size: 16px;
                    ">${factionInfo.shortName}</span>
                    <span style="
                        color: #ffffff;
                        font-size: 12px;
                    ">${factionInfo.name}</span>
                </div>
                <div style="
                    color: ${repLevel.color};
                    font-weight: bold;
                    font-size: 12px;
                ">${repLevel.text}</div>
            </div>
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="
                    color: #cccccc;
                    font-size: 11px;
                ">${factionInfo.description}</div>
                <div style="
                    color: ${standing >= 0 ? '#44ff44' : '#ff4444'};
                    font-weight: bold;
                    font-size: 14px;
                ">${standing > 0 ? '+' : ''}${standing}</div>
            </div>
        `;

        return entry;
    }

    getReputationLevel(standing) {
        if (standing >= 50) {
            return { text: 'ALLIED', color: '#00ff41' };
        } else if (standing >= 25) {
            return { text: 'FRIENDLY', color: '#44ff44' };
        } else if (standing >= 10) {
            return { text: 'NEUTRAL', color: '#ffff44' };
        } else if (standing >= -10) {
            return { text: 'CAUTIOUS', color: '#ffaa44' };
        } else if (standing >= -25) {
            return { text: 'HOSTILE', color: '#ff4444' };
        } else {
            return { text: 'AT WAR', color: '#ff3333' };
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .diplomacy-hud::-webkit-scrollbar {
                width: 8px;
            }
            .diplomacy-hud::-webkit-scrollbar-track {
                background: rgba(0, 255, 65, 0.1);
                border-radius: 4px;
            }
            .diplomacy-hud::-webkit-scrollbar-thumb {
                background: #00ff41;
                border-radius: 4px;
            }
            .diplomacy-hud::-webkit-scrollbar-thumb:hover {
                background: #00cc33;
            }

            /* Faction reputation colors */
            .rep-allied { color: #00ff41; font-weight: bold; }
            .rep-friendly { color: #44ff44; font-weight: bold; }
            .rep-neutral { color: #ffff44; font-weight: bold; }
            .rep-cautious { color: #ffaa44; font-weight: bold; }
            .rep-hostile { color: #ff4444; font-weight: bold; }
            .rep-at-war { color: #ff3333; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'block';

        // Start updating faction standings
        this.startUpdates();
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';

        // Stop updates
        this.stopUpdates();
    }

    startUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Update every 2 seconds
        this.updateInterval = setInterval(() => {
            this.updateFactionStandings();
        }, 2000);
    }

    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateFactionStandings() {
        if (!this.isVisible) return;

        // Clear existing faction list
        if (this.elements.factionList) {
            this.elements.factionList.innerHTML = '';
        }

        // Recreate faction list with updated standings
        this.createFactionList();
    }

    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Get visibility status
     */
    get visible() {
        return this.isVisible;
    }
}

// Make it globally accessible for key bindings
if (typeof window !== 'undefined') {
    window.DiplomacyHUD = DiplomacyHUD;
}
