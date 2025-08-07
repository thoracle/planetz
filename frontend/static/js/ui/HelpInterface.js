/**
 * Help Interface - Context-sensitive ship tech manual
 * Shows controls and key bindings based on equipped systems and cards
 */
export class HelpInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.container = null;
        
        console.log('HelpInterface initialized');
    }

    /**
     * Show the help interface
     */
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.createInterface();
        
        console.log('Ship Tech Manual displayed');
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
        
        console.log('Ship Tech Manual closed');
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
            'long_range_scanner', 'subspace_radio', 'galactic_chart', 'radar'
        ];
        
        for (const systemName of systemsToCheck) {
            const system = ship.getSystem(systemName);
            if (system && ship.hasSystemCardsSync && ship.hasSystemCardsSync(systemName)) {
                availableSystems[systemName] = {
                    level: system.level,
                    isOperational: system.isOperational(),
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
                
                <div class="manual-content">
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
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.container);
        
        // Add styles
        this.addTechManualStyles();
        
        // Make interface globally accessible
        window.helpInterface = this;
        
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
                        <span class="key-binding">H</span>
                        <span class="control-desc">Toggle Technical Manual</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">D</span>
                        <span class="control-desc">Damage Control Interface</span>
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
                        <span class="control-desc">Cycle Targets</span>
                    </div>
            `;

            // Sub-targeting (Level 2+)
            if (context.hasSubTargeting) {
                combatHTML += `
                    <div class="control-entry">
                        <span class="key-binding">&lt; &gt;</span>
                        <span class="control-desc">Sub-System Targeting</span>
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
                        <span class="key-binding">Z / X</span>
                        <span class="control-desc">Cycle Weapons</span>
                    </div>
                    <div class="control-entry">
                        <span class="key-binding">C</span>
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
                
                <div class="tech-notes">
                    <div class="notes-header">Technical Notes:</div>
                    <div class="note-entry">• Systems require appropriate cards to function</div>
                    <div class="note-entry">• Damaged systems operate at reduced efficiency</div>
                    <div class="note-entry">• Energy consumption varies by system level</div>
                    <div class="note-entry">• Sub-targeting requires Level 2+ Target Computer</div>
                    <div class="note-entry">• Debug modes are for development and testing</div>
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
                    <div class="basic-help">Press H to access ship technical manual when systems are online</div>
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
                max-height: 90%;
                overflow-y: auto;
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
            }

            .scan-line {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00ff41, transparent);
                animation: scanLine 2s linear infinite;
                opacity: 0.6;
            }

            @keyframes scanLine {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 0.6; }
                100% { transform: translateY(400px); opacity: 0; }
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
        `;

        document.head.appendChild(style);
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
        
        console.log('HelpInterface disposed');
    }
} 