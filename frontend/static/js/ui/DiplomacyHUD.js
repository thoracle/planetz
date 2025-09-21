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

        // Initialize tab state
        this.activeTab = 'player';
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        this.updateDisplay();
    }

    updateDisplay() {
        // Clear existing content
        this.container.innerHTML = '';

        // Recreate header
        this.createHeader();

        // Create content based on active tab
        if (this.activeTab === 'player') {
            this.createFactionList();
        } else if (this.activeTab === 'matrix') {
            this.createFactionMatrix();
        }
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
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #00ff41;
            text-shadow: 0 0 10px #00ff41;
        `;

        // Create tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
        `;

        const tab1 = document.createElement('button');
        tab1.textContent = 'Player Standings';
        tab1.style.cssText = `
            background: ${this.activeTab === 'player' ? '#00ff41' : 'rgba(0, 255, 65, 0.2)'};
            color: ${this.activeTab === 'player' ? '#000000' : '#00ff41'};
            border: 1px solid #00ff41;
            padding: 5px 15px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        `;
        tab1.onclick = () => this.switchTab('player');

        const tab2 = document.createElement('button');
        tab2.textContent = 'Faction Matrix';
        tab2.style.cssText = `
            background: ${this.activeTab === 'matrix' ? '#00ff41' : 'rgba(0, 255, 65, 0.2)'};
            color: ${this.activeTab === 'matrix' ? '#000000' : '#00ff41'};
            border: 1px solid #00ff41;
            padding: 5px 15px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        `;
        tab2.onclick = () => this.switchTab('matrix');

        tabsContainer.appendChild(tab1);
        tabsContainer.appendChild(tab2);

        header.appendChild(title);
        header.appendChild(tabsContainer);
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

        // Define faction information with simple vector icons
        const factionInfo = {
            'terran_republic_alliance': {
                name: 'Terran Republic Alliance',
                shortName: 'TRA',
                color: '#00ff41',
                description: 'Human space federation',
                icon: '◈'  // Diamond (government/authority)
            },
            'traders_guild': {
                name: 'Traders Guild',
                shortName: 'TRG',
                color: '#ffff44',
                description: 'Commercial organization',
                icon: '◊'  // Lozenge (commerce/trade)
            },
            'scientists_consortium': {
                name: 'Scientists Consortium',
                shortName: 'SCI',
                color: '#00aaff',
                description: 'Research organization',
                icon: '▲'  // Triangle (research/science)
            },
            'explorers_guild': {
                name: 'Explorers Guild',
                shortName: 'EXP',
                color: '#ffaa00',
                description: 'Exploration organization',
                icon: '★'  // Star (exploration/navigation)
            },
            'mercenary_fleet': {
                name: 'Mercenary Fleet',
                shortName: 'MFC',
                color: '#ff4444',
                description: 'Independent contractors',
                icon: '▴'  // Small triangle (combat/military)
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

    createFactionMatrix() {
        const matrixContainer = document.createElement('div');
        matrixContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Faction-to-Faction Relations';
        title.style.cssText = `
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #00ff41;
            text-align: center;
        `;

        matrixContainer.appendChild(title);

        // Define factions in order
        const factions = [
            { key: 'terran_republic_alliance', info: this.factionInfo['terran_republic_alliance'] },
            { key: 'traders_guild', info: this.factionInfo['traders_guild'] },
            { key: 'scientists_consortium', info: this.factionInfo['scientists_consortium'] },
            { key: 'explorers_guild', info: this.factionInfo['explorers_guild'] },
            { key: 'mercenary_fleet', info: this.factionInfo['mercenary_fleet'] }
        ];

        // Create matrix table
        const table = document.createElement('table');
        table.style.cssText = `
            border-collapse: collapse;
            font-size: 11px;
            text-align: center;
        `;

        // Create header row
        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th')); // Empty corner cell

        factions.forEach(faction => {
            const th = document.createElement('th');
            th.textContent = faction.info.shortName;
            th.style.cssText = `
                padding: 8px 6px;
                color: ${faction.info.color};
                font-weight: bold;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(0, 40, 0, 0.5);
            `;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Create data rows
        factions.forEach(rowFaction => {
            const row = document.createElement('tr');

            // Row header
            const rowHeader = document.createElement('th');
            rowHeader.textContent = rowFaction.info.shortName;
            rowHeader.style.cssText = `
                padding: 8px 6px;
                color: ${rowFaction.info.color};
                font-weight: bold;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(0, 40, 0, 0.5);
            `;
            row.appendChild(rowHeader);

            // Data cells
            factions.forEach(colFaction => {
                const td = document.createElement('td');
                let relationship = 'NEUTRAL';

                if (rowFaction.key === colFaction.key) {
                    relationship = 'SELF';
                    td.textContent = '—';
                    td.style.cssText = `
                        padding: 8px 6px;
                        color: #888888;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        background: rgba(0, 20, 0, 0.3);
                    `;
                } else {
                    // For now, use a simple relationship model
                    // In a full implementation, factions would have relationships with each other
                    relationship = 'NEUTRAL';
                    td.textContent = 'N/A';
                    td.style.cssText = `
                        padding: 8px 6px;
                        color: #666666;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        background: rgba(0, 20, 0, 0.2);
                    `;
                }

                row.appendChild(td);
            });

            table.appendChild(row);
        });

        matrixContainer.appendChild(table);

        const note = document.createElement('div');
        note.textContent = 'Note: Faction-to-faction relationships not yet implemented';
        note.style.cssText = `
            margin-top: 10px;
            font-size: 10px;
            color: #888888;
            font-style: italic;
            text-align: center;
        `;

        matrixContainer.appendChild(note);
        this.container.appendChild(matrixContainer);
    }

    createFactionEntry(factionKey, factionInfo, standing) {
        const entry = document.createElement('div');
        entry.style.cssText = `
            background: rgba(0, 40, 0, 0.3);
            border: 2px solid ${repLevel.color};
            padding: 10px;
            border-radius: 4px;
            transition: all 0.3s ease;
        `;

        // Clamp standing to -100 to +100 range
        const clampedStanding = Math.max(-100, Math.min(100, standing));

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
                        color: ${repLevel.text === 'HOSTILE' || repLevel.text === 'AT WAR' ? '#ff4444' : factionInfo.color};
                    ">${factionInfo.icon}</span>
                    <span style="
                        color: ${repLevel.text === 'HOSTILE' || repLevel.text === 'AT WAR' ? '#ff4444' : factionInfo.color};
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
                margin-bottom: 8px;
            ">
                <div style="
                    color: #cccccc;
                    font-size: 11px;
                ">${factionInfo.description}</div>
                <div style="
                    color: ${clampedStanding >= 0 ? '#44ff44' : '#ff4444'};
                    font-weight: bold;
                    font-size: 14px;
                ">${clampedStanding > 0 ? '+' : ''}${clampedStanding}%</div>
            </div>
            <!-- Reputation Progress Bar -->
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 5px;
            ">
                <div style="
                    font-size: 10px;
                    color: #888888;
                    width: 20px;
                    text-align: right;
                ">-100</div>
                <div style="
                    position: relative;
                    width: 200px;
                    height: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    overflow: hidden;
                ">
                    <!-- Filled background -->
                    <div style="
                        position: absolute;
                        left: 50%;
                        top: 0;
                        width: ${Math.abs(clampedStanding) * 0.5}%;
                        height: 100%;
                        background: ${clampedStanding >= 0 ?
                            'linear-gradient(90deg, rgba(68, 255, 68, 0.3) 0%, rgba(68, 255, 68, 0.6) 100%)' :
                            'linear-gradient(90deg, rgba(255, 68, 68, 0.3) 0%, rgba(255, 68, 68, 0.6) 100%)'};
                        border-radius: ${clampedStanding >= 0 ? '3px 0 0 3px' : '0 3px 3px 0'};
                        transition: all 0.3s ease;
                    "></div>
                    <!-- Center line -->
                    <div style="
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 1px;
                        height: 100%;
                        background: rgba(255, 255, 255, 0.4);
                    "></div>
                    <!-- Position marker -->
                    <div style="
                        position: absolute;
                        left: ${50 + (clampedStanding / 100) * 50}%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 4px;
                        height: 16px;
                        background: ${clampedStanding >= 0 ? '#44ff44' : '#ff4444'};
                        border: 1px solid rgba(255, 255, 255, 0.8);
                        border-radius: 2px;
                        box-shadow: 0 0 4px ${clampedStanding >= 0 ? '#44ff44' : '#ff4444'};
                    "></div>
                </div>
                <div style="
                    font-size: 10px;
                    color: #888888;
                    width: 20px;
                    text-align: left;
                ">+100</div>
            </div>
        `;

        return entry;
    }

    getReputationLevel(standing) {
        // Clamp standing to -100 to +100 range
        const clampedStanding = Math.max(-100, Math.min(100, standing));

        if (clampedStanding >= 80) {
            return { text: 'ALLIED', color: '#00ff41' };
        } else if (clampedStanding >= 60) {
            return { text: 'FRIENDLY', color: '#44ff44' };
        } else if (clampedStanding >= -20) {
            return { text: 'NEUTRAL', color: '#ffff44' };
        } else if (clampedStanding >= -60) {
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
            .rep-hostile { color: #ff4444; font-weight: bold; }
            .rep-at-war { color: #ff3333; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.updateDisplay();

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
