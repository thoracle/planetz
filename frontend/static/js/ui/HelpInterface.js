import { debug } from '../debug.js';

/**
 * Help Interface - Context-sensitive ship tech manual
 * Shows controls and key bindings based on equipped systems and cards
 */
export class HelpInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.container = null;
        
        debug('P1', '🔧 HelpInterface v2.0 - COMMIT 8bd0b7a - STARTER SHIP VERSION LOADED');
        debug('UI', 'HelpInterface initialized');
    }

    /**
     * Show the help interface
     */
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.createInterface();
        
debug('UI', 'Ship Tech Manual displayed');
    }

    /**
     * Hide the help interface
     */
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        // Remove key handler when hiding
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        
debug('UI', 'Ship Tech Manual closed');
    }

    /**
     * Get ship and available systems for context-sensitive display
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
     * Create the context-sensitive tech manual interface
     */
    createInterface() {
        // Remove existing interface
        if (this.container) {
            this.container.remove();
        }

        const context = this.getShipContext();
        if (!context) {
            this.createFallbackInterface();
            return;
        }

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'tech-manual-interface';
        
        const shipTypeDisplay = context.shipType.replace('_', ' ').toUpperCase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        
        this.container.innerHTML = `
            <div class="tech-manual-display">
                <div class="scan-line"></div>
                <div class="manual-header">
                    <div class="manual-title">
                        <span class="ship-designation">${shipTypeDisplay}</span>
                        <span class="manual-type">TECHNICAL MANUAL</span>
                    </div>
                    <div class="manual-info">
                        <span class="timestamp">REF: ${timestamp}</span>
                        <button class="manual-close-btn" onclick="window.helpInterface.hide()">[ ESC ]</button>
                    </div>
                </div>
                
                <div class="help-tabs">
                    <button class="help-tab-button active" data-tab="help">HELP</button>
                    <button class="help-tab-button" data-tab="ships-log">SHIP'S LOG</button>
                    <button class="help-tab-button" data-tab="achievements">ACHIEVEMENTS</button>
                    <button class="help-tab-button" data-tab="collection">COLLECTION</button>
                    <button class="help-tab-button" data-tab="about">ABOUT</button>
                </div>
                
                <div class="manual-content">
                    <div class="help-tab-content active" id="help-tab">
                        ${this.generateBasicControlsSection()}
                        ${this.generateMovementSection(context)}
                        ${this.generateSystemsSection(context)}
                        ${this.generateCombatSection(context)}
                        ${this.generateAdvancedSection(context)}
                        
                        <div class="system-status-footer">
                            <div class="status-line">SYSTEMS ONLINE: ${Object.keys(context.availableSystems).length} / ${context.equippedWeapons.length > 0 ? Object.keys(context.availableSystems).length + 1 : Object.keys(context.availableSystems).length}</div>
                            <div class="status-line">MANUAL ACCESS: AUTHORIZED</div>
                        </div>
                    </div>
                    
                    <div class="help-tab-content" id="ships-log-tab">
                        ${this.generateShipsLogContent()}
                    </div>
                    
                    <div class="help-tab-content" id="achievements-tab">
                        ${this.generateAchievementsContent()}
                    </div>
                    
                    <div class="help-tab-content" id="collection-tab">
                        ${this.generateCollectionContent()}
                    </div>
                    
                    <div class="help-tab-content" id="about-tab">
                        ${this.generateAboutContent()}
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.container);
        
        // Add tab switching functionality
        this.initializeTabSwitching();
        
        // Add styles
        this.addTechManualStyles();
        
        // Make interface globally accessible
        window.helpInterface = this;
        
        // Track current tab for dynamic updates
        this.currentTab = 'help';
        
        // Add escape key handler
        this.addKeyHandler();
    }

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

    generateMovementSection(context) {
        if (!context.availableSystems.impulse_engines) {
            return `
                <div class="manual-section disabled-section">
                    <h3 class="section-header">[ IMPULSE PROPULSION - OFFLINE ]</h3>
                    <div class="warning-text">WARNING: No impulse engine cards detected</div>
                </div>
            `;
        }

        const engine = context.availableSystems.impulse_engines;
        const maxSpeed = engine.health < 50 ? 3 : 9; // Critical damage limits speed
        
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
                        <span class="key-binding">← ↑ ↓ →</span>
                        <span class="control-desc">Attitude Control</span>
                    </div>
                </div>
                ${engine.health < 75 ? '<div class="caution-text">CAUTION: Engine damage detected - reduced performance</div>' : ''}
            </div>
        `;
    }

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

    generateCombatSection(context) {
        if (!context.hasTargetComputer && !context.hasWeapons) {
            return `
                <div class="manual-section disabled-section">
                    <h3 class="section-header">[ COMBAT SYSTEMS - OFFLINE ]</h3>
                    <div class="warning-text">WARNING: No targeting computer or weapons detected</div>
                </div>
            `;
        }

        let combatHTML = `
            <div class="manual-section">
                <h3 class="section-header">[ COMBAT SYSTEMS ]</h3>
        `;

        // Target Computer section
        if (context.hasTargetComputer) {
            const tc = context.availableSystems.target_computer;
            combatHTML += `
                <div class="subsystem-header">Target Computer - Level ${tc.level}</div>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">T</span>
                        <span class="control-desc">Toggle Target Computer</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Tab</span>
                        <span class="control-desc">Cycle Targets (Next)</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Shift+Tab</span>
                        <span class="control-desc">Cycle Targets (Previous)</span>
                    </div>
            `;

            // Sub-targeting (Level 2+)
            if (context.hasSubTargeting) {
                combatHTML += `
                    <div class="control-entry">
                        <span class="key-binding">Z</span>
                        <span class="control-desc">Target Sub-System (Prev)</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">X</span>
                        <span class="control-desc">Target Sub-System (Next)</span>
                    </div>
                `;
            }

            combatHTML += `</div>`;
        }

        // Weapons section
        if (context.hasWeapons) {
            combatHTML += `
                <div class="subsystem-header">Weapon Systems</div>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Space</span>
                        <span class="control-desc">Fire Active Weapon</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">&lt;</span>
                        <span class="control-desc">Previous Weapon</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">&gt;</span>
                        <span class="control-desc">Next Weapon</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">/</span>
                        <span class="control-desc">Toggle Autofire</span>
                    </div>
                </div>
                
                <div class="weapon-loadout">
                    <div class="loadout-header">Current Loadout:</div>
            `;

            context.equippedWeapons.forEach((weapon, index) => {
                combatHTML += `
                    <div class="weapon-entry">
                        <span class="weapon-slot">[${index + 1}]</span>
                        <span class="weapon-name">${weapon.name}</span>
                        <span class="weapon-level">Lv.${weapon.level}</span>
                    </div>
                `;
            });

            combatHTML += `</div>`;
        }

        combatHTML += `</div>`;
        return combatHTML;
    }

    generateAdvancedSection(context) {
        return `
            <div class="manual-section">
                <h3 class="section-header">[ ADVANCED OPERATIONS ]</h3>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Q</span>
                        <span class="control-desc">Create Training Targets</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+Shift+B</span>
                        <span class="control-desc">Emergency Repair All</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+Shift+V</span>
                        <span class="control-desc">Simulate Random System Damage</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+Shift+M</span>
                        <span class="control-desc">Simulate Hull Damage</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+Shift+N</span>
                        <span class="control-desc">Simulate Energy Drain</span>
                    </div>
                </div>
                
                <h4 class="subsection-header">[ DEBUG & DEVELOPER ]</h4>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+U</span>
                        <span class="control-desc">Debug Mode (FPS stats, system info)</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+O</span>
                        <span class="control-desc">Weapon Debug (hit detection spheres)</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+E</span>
                        <span class="control-desc">Edit Mode (development)</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Ctrl+W</span>
                        <span class="control-desc">Warp Control Mode</span>
                    </div>
                </div>
                
                <h4 class="subsection-header">[ AI DEBUG CONTROLS ]</h4>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+A</span>
                        <span class="control-desc">Toggle AI Debug Mode</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+E</span>
                        <span class="control-desc">Force All AIs to Engage</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+I</span>
                        <span class="control-desc">Force All AIs to Idle</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+F</span>
                        <span class="control-desc">Force All AIs to Flee</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+S</span>
                        <span class="control-desc">Show AI Statistics</span>
                    </div>
                </div>
                
                <h4 class="subsection-header">[ FLOCKING & FORMATIONS ]</h4>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+V</span>
                        <span class="control-desc">Create V-Formation</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+C</span>
                        <span class="control-desc">Create Column Formation</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+L</span>
                        <span class="control-desc">Create Line Abreast Formation</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+B</span>
                        <span class="control-desc">Show Flocking Statistics</span>
                    </div>
                </div>
                
                <h4 class="subsection-header">[ COMBAT DEBUGGING ]</h4>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+T</span>
                        <span class="control-desc">Show Combat Statistics</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+W</span>
                        <span class="control-desc">Show Weapon Targeting Debug</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+X</span>
                        <span class="control-desc">Force AIs to Target Player</span>
                    </div>
                </div>
                
                <h4 class="subsection-header">[ PERFORMANCE & VISUALIZATION ]</h4>
                <div class="control-grid">
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+P</span>
                        <span class="control-desc">Show Performance Statistics</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">Cmd+Shift+D</span>
                        <span class="control-desc">Toggle Debug Visualization</span>
                    </div>
                </div>
                
                <div class="tech-notes">
                    <div class="notes-header">Technical Notes:</div>
                    <div class="note-entry">• Systems require appropriate cards to function</div>
                    <div class="note-entry">• Damaged systems operate at reduced efficiency</div>
                    <div class="note-entry">• Energy consumption varies by system level</div>
                    <div class="note-entry">• Sub-targeting requires Level 2+ Target Computer</div>
                    <div class="note-entry">• Debug modes are for development and testing</div>
                    <div class="note-entry">• AI debug controls require spawned enemies (Q key)</div>
                    <div class="note-entry">• AI statistics display in browser console</div>
                    <div class="note-entry">• Formations require 2+ AI ships to function</div>
                    <div class="note-entry">• Flocking behaviors work automatically once enabled</div>
                    <div class="note-entry">• Combat debugging shows AI decision making</div>
                    <div class="note-entry">• Weapon targeting displays firing solutions</div>
                    <div class="note-entry">• Performance stats show LOD and frame timing</div>
                    <div class="note-entry">• Debug visualization overlays AI behavior in 3D</div>
                </div>
            </div>
        `;
    }

    createFallbackInterface() {
        // Fallback for when ship context is not available
        this.container = document.createElement('div');
        this.container.className = 'tech-manual-interface';
        this.container.innerHTML = `
            <div class="tech-manual-display">
                <div class="scan-line"></div>
                <div class="manual-header">
                    <div class="manual-title">
                        <span class="ship-designation">SHIP</span>
                        <span class="manual-type">TECHNICAL MANUAL</span>
                    </div>
                    <div class="manual-info">
                        <button class="manual-close-btn" onclick="window.helpInterface.hide()">[ ESC ]</button>
                    </div>
                </div>
                <div class="manual-content">
                    <div class="warning-text">WARNING: Ship systems not accessible</div>
                    <div class="basic-help">Press ESC to access ship technical manual when systems are online</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        this.addTechManualStyles();
        window.helpInterface = this;
        this.addKeyHandler();
    }

    /**
     * Add escape key handler
     */
    addKeyHandler() {
        this.keyHandler = (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
                event.preventDefault();
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }

    /**
     * Add CSS styles for the tech manual interface
     */
    addTechManualStyles() {
        if (document.getElementById('tech-manual-styles')) return;

        const style = document.createElement('style');
        style.id = 'tech-manual-styles';
        style.textContent = `
            .tech-manual-interface {
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

            .tech-manual-display {
                background: rgba(0, 20, 0, 0.98);
                border: 3px solid #00ff41;
                border-radius: 12px;
                width: 90%;
                max-width: 1200px;
                height: 80vh;
                max-height: 700px;
                min-height: 600px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 30px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.1);
                position: relative;
            }

            .tech-manual-display::before {
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

            .manual-info {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            }

            .timestamp {
                font-size: 12px;
                color: #66ff66;
                opacity: 0.7;
                font-family: monospace;
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

            .scan-line {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00ff41, transparent);
                animation: scanLine 3s linear infinite;
                opacity: 0.6;
                z-index: 5;
                pointer-events: none;
            }

            @keyframes scanLine {
                0% { 
                    transform: translateY(0); 
                    opacity: 0; 
                }
                10% { 
                    opacity: 0.6; 
                }
                90% { 
                    opacity: 0.6; 
                }
                100% { 
                    transform: translateY(700px); 
                    opacity: 0; 
                }
            }

            .manual-section {
                background: rgba(0, 255, 65, 0.08);
                border: 1px solid rgba(0, 255, 65, 0.4);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                position: relative;
            }

            .manual-section.disabled-section {
                background: rgba(255, 65, 65, 0.08);
                border-color: rgba(255, 65, 65, 0.4);
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

            .disabled-section .section-header {
                color: #ff4141;
                text-shadow: 0 0 8px rgba(255, 65, 65, 0.6);
                border-bottom-color: rgba(255, 65, 65, 0.5);
            }

            .subsection-header {
                margin: 20px 0 12px 0;
                color: #99ff99;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 0 0 6px rgba(153, 255, 153, 0.6);
                border-bottom: 1px dotted rgba(153, 255, 153, 0.4);
                padding-bottom: 6px;
                letter-spacing: 0.5px;
            }

            .system-status {
                font-size: 12px;
                color: #66ff66;
                margin-bottom: 12px;
                padding: 8px 12px;
                background: rgba(0, 255, 65, 0.1);
                border-left: 3px solid #00ff41;
                border-radius: 0 4px 4px 0;
            }

            .subsystem-header {
                font-size: 14px;
                color: #00ff41;
                font-weight: bold;
                margin: 15px 0 10px 0;
                padding-left: 12px;
                border-left: 2px solid #00ff41;
            }

            .control-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 8px;
                margin-bottom: 15px;
            }

            .control-entry {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 8px 12px;
                background: rgba(0, 255, 65, 0.05);
                border-radius: 4px;
                border-left: 2px solid transparent;
                transition: all 0.2s;
            }

            .control-entry:hover {
                background: rgba(0, 255, 65, 0.1);
                border-left-color: #00ff41;
            }

            .control-entry.disabled {
                opacity: 0.5;
                background: rgba(128, 128, 128, 0.05);
            }

            .key-binding {
                background: rgba(0, 255, 65, 0.2);
                border: 1px solid #00ff41;
                border-radius: 4px;
                padding: 6px 10px;
                font-weight: bold;
                min-width: 70px;
                text-align: center;
                font-size: 12px;
                box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
                text-shadow: 0 0 4px rgba(0, 255, 65, 0.8);
                font-family: "Courier New", monospace;
            }

            .control-desc {
                flex: 1;
                font-size: 14px;
                color: #ccffcc;
            }

            .weapon-loadout {
                margin-top: 15px;
                padding: 15px;
                background: rgba(0, 255, 65, 0.06);
                border: 1px dashed rgba(0, 255, 65, 0.3);
                border-radius: 6px;
            }

            .loadout-header {
                font-size: 13px;
                color: #00ff41;
                font-weight: bold;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .weapon-entry {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 6px 0;
                font-size: 13px;
                border-bottom: 1px solid rgba(0, 255, 65, 0.1);
            }

            .weapon-entry:last-child {
                border-bottom: none;
            }

            .weapon-slot {
                color: #00ff41;
                font-weight: bold;
                min-width: 30px;
            }

            .weapon-name {
                flex: 1;
                color: #ccffcc;
            }

            .weapon-level {
                color: #66ff66;
                font-size: 11px;
            }

            .tech-notes {
                margin-top: 15px;
                padding: 15px;
                background: rgba(0, 255, 65, 0.04);
                border: 1px solid rgba(0, 255, 65, 0.2);
                border-radius: 6px;
            }

            .notes-header {
                font-size: 13px;
                color: #00ff41;
                font-weight: bold;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .note-entry {
                font-size: 12px;
                color: #99ff99;
                margin-bottom: 6px;
                padding-left: 8px;
                border-left: 1px solid rgba(0, 255, 65, 0.3);
            }

            .system-status-footer {
                margin-top: 25px;
                padding: 15px;
                background: rgba(0, 255, 65, 0.08);
                border: 1px solid rgba(0, 255, 65, 0.3);
                border-radius: 6px;
                text-align: center;
            }

            .status-line {
                font-size: 12px;
                color: #66ff66;
                margin-bottom: 4px;
                letter-spacing: 1px;
            }

            .warning-text {
                color: #ff4141;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(255, 65, 65, 0.6);
                text-align: center;
                padding: 15px;
                background: rgba(255, 65, 65, 0.1);
                border: 1px solid rgba(255, 65, 65, 0.3);
                border-radius: 6px;
                margin: 10px 0;
            }

            .caution-text {
                color: #ffa500;
                font-weight: bold;
                font-size: 12px;
                margin-top: 8px;
                padding: 8px 12px;
                background: rgba(255, 165, 0, 0.1);
                border: 1px solid rgba(255, 165, 0, 0.3);
                border-radius: 4px;
            }

            .basic-help {
                text-align: center;
                color: #66ff66;
                font-size: 14px;
                margin: 20px 0;
            }

            /* Scrollbar styling */
            .tech-manual-display::-webkit-scrollbar {
                width: 10px;
            }

            .tech-manual-display::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.5);
                border-radius: 5px;
            }

            .tech-manual-display::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 65, 0.6);
                border-radius: 5px;
                border: 1px solid rgba(0, 255, 65, 0.8);
            }

            .tech-manual-display::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 65, 0.8);
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .manual-content {
                    padding: 15px;
                }
                
                .tech-manual-display {
                    width: 95%;
                    margin: 10px;
                }
                
                .ship-designation {
                    font-size: 22px;
                }
                
                .manual-section {
                    padding: 15px;
                }

                .control-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* Tab System */
            .help-tabs {
                display: flex;
                border-bottom: 2px solid rgba(0, 255, 65, 0.3);
                margin-bottom: 0;
                background: rgba(0, 255, 65, 0.05);
                flex-shrink: 0;
                height: 50px;
            }

            .help-tab-button {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid rgba(0, 255, 65, 0.4);
                border-bottom: none;
                color: #00ff41;
                padding: 12px 20px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
                text-transform: uppercase;
                letter-spacing: 1px;
                position: relative;
                margin-right: 2px;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
            }

            .help-tab-button:last-child {
                margin-right: 0;
            }

            .help-tab-button:hover {
                background: rgba(0, 255, 65, 0.15);
                border-color: #00ff41;
                text-shadow: 0 0 10px #00ff41;
                box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
            }

            .help-tab-button.active {
                background: rgba(0, 255, 65, 0.25);
                border-color: #00ff41;
                color: #ffffff;
                text-shadow: 0 0 15px #00ff41;
                box-shadow: 
                    inset 0 -3px 0 #00ff41,
                    0 0 15px rgba(0, 255, 65, 0.4),
                    inset 0 0 20px rgba(0, 255, 65, 0.1);
                z-index: 1;
            }

            .help-tab-content {
                display: none;
                animation: fadeIn 0.3s ease;
                height: 100%;
                overflow-y: auto;
            }

            .help-tab-content.active {
                display: block;
                height: 100%;
                overflow-y: auto;
            }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Collection Card Styling - Scoped to help interface */
                .tech-manual-interface .collection-card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 15px;
                    padding: 15px 0;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .tech-manual-interface .collection-card-item {
                    background: rgba(0, 0, 0, 0.4);
                    border: 2px solid rgba(0, 255, 65, 0.4);
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    min-height: 160px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .tech-manual-interface .collection-card-item::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(0, 255, 65, 0.02) 2px,
                        rgba(0, 255, 65, 0.02) 4px
                    );
                    pointer-events: none;
                }

                .tech-manual-interface .collection-card-item:hover {
                    border-color: #00ff41;
                    background: rgba(0, 255, 65, 0.1);
                    box-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
                    transform: translateY(-2px);
                }

                /* Rarity-based border colors and background tinting */
                .tech-manual-interface .collection-card-item[data-rarity="common"] {
                    border-color: rgba(128, 128, 128, 0.6);
                    background: rgba(128, 128, 128, 0.15);
                }
                .tech-manual-interface .collection-card-item[data-rarity="rare"] {
                    border-color: rgba(0, 150, 255, 0.6);
                    background: rgba(0, 150, 255, 0.15);
                }
                .tech-manual-interface .collection-card-item[data-rarity="epic"] {
                    border-color: rgba(163, 53, 238, 0.6);
                    background: rgba(163, 53, 238, 0.15);
                }
                .tech-manual-interface .collection-card-item[data-rarity="legendary"] {
                    border-color: rgba(255, 165, 0, 0.6);
                    background: rgba(255, 165, 0, 0.15);
                }

                .tech-manual-interface .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    position: relative;
                    z-index: 1;
                }

                .tech-manual-interface .card-icon {
                    font-size: 24px;
                    filter: drop-shadow(0 0 5px rgba(0, 255, 65, 0.5));
                    margin-right: auto;
                    flex-shrink: 0;
                }

                .tech-manual-interface .card-count-badge {
                    background: rgba(0, 255, 65, 0.3);
                    color: #00ff41;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    border: 1px solid rgba(0, 255, 65, 0.5);
                    text-shadow: 0 0 3px rgba(0, 255, 65, 0.8);
                    margin-left: auto;
                    flex-shrink: 0;
                }

                .tech-manual-interface .card-body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    position: relative;
                    z-index: 1;
                }

                .tech-manual-interface .card-name {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    font-weight: bold;
                    color: #ffffff;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    text-shadow: 0 0 3px rgba(0, 255, 65, 0.5);
                    line-height: 1.2;
                }

                .tech-manual-interface .card-level {
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    color: #00ff41;
                    font-weight: bold;
                }

                .tech-manual-interface .card-rarity {
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    opacity: 0.8;
                }

                .tech-manual-interface .card-rarity {
                    color: #888;
                }
                .tech-manual-interface .collection-card-item[data-rarity="rare"] .card-rarity {
                    color: #0096ff;
                }
                .tech-manual-interface .collection-card-item[data-rarity="epic"] .card-rarity {
                    color: #a335ee;
                }
                .tech-manual-interface .collection-card-item[data-rarity="legendary"] .card-rarity {
                    color: #ffa500;
                }

                .tech-manual-interface .card-footer {
                    margin-top: 8px;
                    position: relative;
                    z-index: 1;
                }

                .tech-manual-interface .upgrade-button {
                    background: rgba(0, 255, 65, 0.2);
                    border: 1px solid #00ff41;
                    color: #00ff41;
                    padding: 4px 8px;
                    font-size: 9px;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    width: 100%;
                    transition: all 0.2s ease;
                    animation: pulse-upgrade 2s infinite;
                }

                .tech-manual-interface .upgrade-button:hover {
                    background: rgba(0, 255, 65, 0.3);
                    box-shadow: 0 0 8px rgba(0, 255, 65, 0.4);
                    text-shadow: 0 0 5px #00ff41;
                }

                .tech-manual-interface .card-status {
                    text-align: center;
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                    color: #66ff66;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                @keyframes pulse-upgrade {
                    0%, 100% { 
                        box-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
                    }
                    50% { 
                        box-shadow: 0 0 12px rgba(0, 255, 65, 0.6);
                    }
                }

                /* NEW Badge Styling - matches card-count-badge shape and position exactly */
                .tech-manual-interface .new-badge {
                    background: linear-gradient(45deg, #ff4444, #ff6666);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    border: 1px solid #ff4444;
                    text-shadow: 0 0 3px rgba(255, 68, 68, 0.8);
                    animation: pulse-new 2s infinite;
                    box-shadow: 0 0 10px rgba(255, 68, 68, 0.6);
                    margin-left: auto;
                    flex-shrink: 0;
                }

                .tech-manual-interface .has-new-badge {
                    position: relative;
                }

                .tech-manual-interface .has-new-badge::before {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    background: linear-gradient(45deg, #ff4444, #ff6666, #ff4444);
                    border-radius: 10px;
                    z-index: -1;
                    animation: pulse-new-border 2s infinite;
                }

                @keyframes pulse-new {
                    0%, 100% { 
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% { 
                        transform: scale(1.1);
                        opacity: 0.8;
                    }
                }

                @keyframes pulse-new-border {
                    0%, 100% { 
                        opacity: 0.3;
                    }
                    50% { 
                        opacity: 0.6;
                    }
                }

                @keyframes pulse-red {
                    0%, 100% { 
                        background-color: #ff4444;
                        transform: scale(1);
                    }
                    50% { 
                        background-color: #ff6666;
                        transform: scale(1.05);
                    }
                }

                /* Ship's Log Entry Styling */
                .tech-manual-interface .log-entry-system {
                    color: #00ff41;
                }

                .tech-manual-interface .log-entry-ephemeral {
                    color: #ffaa00;
                    font-style: italic;
                    background: rgba(255, 170, 0, 0.1);
                    padding: 2px 4px;
                    border-left: 2px solid #ffaa00;
                    margin: 2px 0;
                }

                .tech-manual-interface .log-entry-ephemeral::before {
                    content: '';
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    background: #ffaa00;
                    border-radius: 50%;
                    margin-right: 6px;
                    animation: pulse-ephemeral 2s infinite;
                }

                @keyframes pulse-ephemeral {
                    0%, 100% { 
                        opacity: 0.6;
                        transform: scale(1);
                    }
                    50% { 
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }

                /* Achievement Styles */
                .achievements-container {
                    padding: 20px;
                }

                .achievements-header {
                    margin-bottom: 20px;
                    border-bottom: 1px solid rgba(0, 255, 65, 0.3);
                    padding-bottom: 10px;
                }

                .achievements-header h3 {
                    color: #00ff41;
                    margin: 0 0 10px 0;
                    font-size: 18px;
                }

                .achievement-stats {
                    color: #00dd88;
                    font-size: 14px;
                }

                .achievement-category {
                    margin-bottom: 25px;
                }

                .achievement-category h4 {
                    color: #00ff41;
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    border-bottom: 1px solid rgba(0, 255, 65, 0.2);
                    padding-bottom: 5px;
                }

                .achievement-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .achievement-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    background: rgba(0, 20, 0, 0.4);
                    border: 1px solid rgba(0, 255, 65, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    transition: all 0.3s ease;
                }

                .achievement-item.unlocked {
                    border-color: rgba(0, 255, 65, 0.6);
                    background: rgba(0, 255, 65, 0.05);
                    box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
                }

                .achievement-item.locked {
                    opacity: 0.7;
                }

                .achievement-icon {
                    font-size: 24px;
                    min-width: 32px;
                    text-align: center;
                }

                .achievement-info {
                    flex: 1;
                }

                .achievement-name {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 5px;
                }

                .achievement-description {
                    color: #cccccc;
                    font-size: 14px;
                    margin-bottom: 10px;
                }

                .achievement-progress {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 5px;
                }

                .progress-bar {
                    flex: 1;
                    height: 8px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(0, 255, 65, 0.3);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    transition: width 0.3s ease;
                    border-radius: 3px;
                }

                .progress-text {
                    color: #00dd88;
                    font-size: 12px;
                    min-width: 80px;
                    text-align: right;
                }

                .achievement-unlocked {
                    color: #888;
                    font-size: 12px;
                    font-style: italic;
                }

                .achievements-loading, .achievements-error {
                    text-align: center;
                    padding: 40px;
                    color: #00dd88;
                }
            `;
            
            document.head.appendChild(style);
        }

    /**
     * Initialize tab switching functionality
     */
    initializeTabSwitching() {
        const tabButtons = this.container.querySelectorAll('.help-tab-button');
        const tabContents = this.container.querySelectorAll('.help-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const targetContent = this.container.querySelector(`#${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // Update current tab tracking
                this.currentTab = targetTab;
                
                // Refresh dynamic content for specific tabs
                if (targetTab === 'ships-log') {
                    this.refreshShipsLogDisplay();
                } else if (targetTab === 'collection') {
                    this.refreshCollectionDisplay();
                } else if (targetTab === 'achievements') {
                    this.refreshAchievementsDisplay();
                }
                
                debug('UI', `Switched to tab: ${targetTab}`);
            });
        });
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

    /**
     * Dispose of the help interface
     */
    dispose() {
        this.hide();
        
        // Remove key handler
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        
        // Remove global reference
        if (window.helpInterface === this) {
            delete window.helpInterface;
        }
        
debug('UI', 'HelpInterface disposed');
    }
} 