import { debug } from '../debug.js';
import { injectTechManualStyles, removeTechManualStyles } from './help/HelpStyles.js';
import { HelpTabContentRenderer } from './help/HelpTabContentRenderer.js';

/**
 * Help Interface - Context-sensitive ship tech manual
 * Shows controls and key bindings based on equipped systems and cards
 */
export class HelpInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.container = null;

        // Track style element for cleanup
        this._styleElement = null;

        // Track global debug helpers for cleanup
        this._globalHelpers = ['refreshHelpScreen', 'checkWeaponSystem', 'clearWeaponSystem'];

        // Track tab button handlers for cleanup
        this._tabHandlers = new Map();

        // Initialize extracted handlers
        this.tabContentRenderer = new HelpTabContentRenderer(this);

        debug('P1', '🔧 HelpInterface v2.0 - COMMIT 8bd0b7a - STARTER SHIP VERSION LOADED');
        debug('UI', 'HelpInterface initialized');
        
        // Debug helper for testing help screen refresh
        window.refreshHelpScreen = () => {
            if (window.starfieldManager?.helpInterface) {
                debug('UI', '🔄 Manually refreshing help screen...');
                window.starfieldManager.helpInterface.forceRefresh();
                debug('UI', '✅ Help screen refreshed');
            } else {
                debug('UI', '❌ Help interface not available');
            }
        };
        
        // Debug helper to check current weapon system state
        window.checkWeaponSystem = () => {
            const ship = window.starfieldManager?.viewManager?.getShip();
            if (!ship) {
                debug('UI', '❌ No ship found');
                return;
            }

            debug('UI', '🚀 Ship Info:');
            debug('UI', `  Type: ${ship.shipType}`);
            debug('UI', `  Docked: ${window.starfieldManager?.isDocked}`);
            debug('UI', `  Has weaponSystem: ${!!ship.weaponSystem}`);

            if (ship.weaponSystem) {
                debug('UI', '🔫 Weapon System:');
                debug('UI', `  Slots: ${ship.weaponSystem.weaponSlots?.length || 0}`);
                debug('UI', `  Active slot: ${ship.weaponSystem.activeSlotIndex}`);

                if (ship.weaponSystem.weaponSlots) {
                    ship.weaponSystem.weaponSlots.forEach((slot, i) => {
                        debug('UI', `  Slot ${i}: ${slot.isEmpty ? 'Empty' : slot.equippedWeapon?.name || 'Unknown'}`);
                    });
                }
            }

            if (ship.weapons) {
                debug('UI', `🗡️ Ship.weapons array: ${ship.weapons.length} items`);
            }

            if (ship.weaponSyncManager) {
                debug('UI', '🔄 WeaponSyncManager available');
            }
        };
        
        // Debug helper to manually clear and reinitialize weapon system
        window.clearWeaponSystem = async () => {
            const ship = window.starfieldManager?.viewManager?.getShip();
            if (!ship) {
                debug('UI', '❌ No ship found');
                return;
            }

            debug('UI', '🔫 Clearing weapon system...');

            // Clear weapon system
            if (ship.weaponSystem) {
                ship.weaponSystem = null;
                debug('UI', '✅ Cleared weaponSystem');
            }

            // Clear weapon sync manager
            if (ship.weaponSyncManager) {
                ship.weaponSyncManager.weaponSystem = null;
                ship.weaponSyncManager.weapons.clear();
                debug('UI', '✅ Cleared weaponSyncManager');
            }

            // Reinitialize weapon system
            if (ship.weaponSyncManager) {
                debug('UI', '🔄 Reinitializing weapon system...');
                ship.weaponSystem = await ship.weaponSyncManager.initializeWeapons();
                debug('UI', '✅ Weapon system reinitialized');

                // Check result
                window.checkWeaponSystem();
            }
        };
    }

    /**
     * Show the help interface
     */
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        // Always create fresh interface to ensure current weapon loadout is displayed
        this.createInterface();
        
        debug('UI', 'Ship Tech Manual displayed with current loadout');
    }

    /**
     * Force refresh the help interface (called when weapons change)
     */
    forceRefresh() {
        if (this.isVisible) {
            debug('UI', 'Force refreshing help screen with current weapon data');
            this.createInterface();
        }
    }

    /**
     * Refresh the help interface content (useful after weapon changes)
     */
    refresh() {
        if (this.isVisible) {
            // Recreate interface with current data
            this.createInterface();
            debug('UI', 'Help interface refreshed with current loadout');
        }
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
        if (!ship) {
            debug('UI', 'Help Screen: No ship found via starfieldManager.viewManager.getShip()');
            return null;
        }
        
        debug('UI', `Help Screen: Found ship type: ${ship.shipType}, docked: ${this.starfieldManager?.isDocked || 'unknown'}`);
        
        // Check if we're docked and if that affects weapon system access
        if (this.starfieldManager?.isDocked) {
            debug('UI', 'Help Screen: Ship is docked - checking weapon system availability');
        }

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
        
        // Get equipped weapons - ensure we get fresh data
        if (ship.weaponSystem) {
            debug('UI', `Help Screen: Found weapon system with ${ship.weaponSystem.weaponSlots.length} slots`);
            debug('UI', `Help Screen: Weapon system active slot: ${ship.weaponSystem.activeSlotIndex}`);
            
            // Check if weapon system is properly initialized
            if (ship.weaponSystem.weaponSlots && ship.weaponSystem.weaponSlots.length > 0) {
                for (let i = 0; i < ship.weaponSystem.weaponSlots.length; i++) {
                    const slot = ship.weaponSystem.weaponSlots[i];
                    debug('UI', `Slot ${i}: isEmpty=${slot.isEmpty}, weapon=${slot.equippedWeapon?.name || 'none'}, cardType=${slot.equippedWeapon?.cardType || 'none'}`);
                    
                    if (!slot.isEmpty && slot.equippedWeapon) {
                        equippedWeapons.push({
                            name: slot.equippedWeapon.name,
                            type: slot.equippedWeapon.cardType,
                            level: slot.equippedWeapon.level,
                            slotIndex: i
                        });
                    }
                }
            } else {
                debug('UI', 'Help Screen: Weapon system has no slots or empty slots array');
            }
            
            debug('UI', `Help Screen: Final equipped weapons list: ${JSON.stringify(equippedWeapons.map(w => w.name))}`);
        } else {
            debug('UI', 'Help Screen: No weapon system found on ship');
            
            // Try alternative ways to get weapon data
            if (ship.weapons) {
                debug('UI', `Help Screen: Found ship.weapons array with ${ship.weapons.length} items`);
            }
            if (ship.weaponSyncManager) {
                debug('UI', 'Help Screen: Found weaponSyncManager on ship');
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
        this._styleElement = injectTechManualStyles();
    }

    /**
     * Initialize tab switching functionality
     */
    initializeTabSwitching() {
        // Clear previous handlers if any
        this._cleanupTabHandlers();

        const tabButtons = this.container.querySelectorAll('.help-tab-button');
        const tabContents = this.container.querySelectorAll('.help-tab-content');

        tabButtons.forEach(button => {
            const handler = () => {
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
            };

            // Store handler for cleanup
            this._tabHandlers.set(button, handler);
            button.addEventListener('click', handler);
        });
    }

    /**
     * Clean up tab button handlers
     */
    _cleanupTabHandlers() {
        if (this._tabHandlers) {
            this._tabHandlers.forEach((handler, button) => {
                button.removeEventListener('click', handler);
            });
            this._tabHandlers.clear();
        }
    }

    // ========================================
    // Tab Content Methods (delegated to HelpTabContentRenderer)
    // ========================================

    refreshShipsLogDisplay() {
        this.tabContentRenderer.refreshShipsLogDisplay();
    }

    refreshAchievementsDisplay() {
        this.tabContentRenderer.refreshAchievementsDisplay();
    }

    generateAchievementsContent() {
        return this.tabContentRenderer.generateAchievementsContent();
    }

    renderAchievement(achievement) {
        return this.tabContentRenderer.renderAchievement(achievement);
    }

    generateShipsLogContent() {
        return this.tabContentRenderer.generateShipsLogContent();
    }

    generateCollectionContent() {
        return this.tabContentRenderer.generateCollectionContent();
    }

    generateSimpleCardList() {
        return this.tabContentRenderer.generateSimpleCardList();
    }

    checkCanUpgrade(stack) {
        return this.tabContentRenderer.checkCanUpgrade(stack);
    }

    isCardNew(cardType) {
        return this.tabContentRenderer.isCardNew(cardType);
    }

    hasQuantityIncrease(cardType) {
        return this.tabContentRenderer.hasQuantityIncrease(cardType);
    }

    upgradeCard(cardType) {
        return this.tabContentRenderer.upgradeCard(cardType);
    }

    refreshCollectionDisplay() {
        this.tabContentRenderer.refreshCollectionDisplay();
    }

    generateAboutContent() {
        return this.tabContentRenderer.generateAboutContent();
    }

    /**
     * Dispose of the help interface (alias for destroy)
     */
    dispose() {
        this.destroy();
    }

    /**
     * Comprehensive cleanup of all resources
     */
    destroy() {
        debug('UI', 'HelpInterface destroy() called - cleaning up all resources');

        // Clean up tab handlers before hiding
        this._cleanupTabHandlers();

        // Hide and remove container
        this.hide();

        // Remove key handler
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }

        // Remove style element
        if (this._styleElement && this._styleElement.parentNode) {
            this._styleElement.parentNode.removeChild(this._styleElement);
            this._styleElement = null;
        }

        // Remove global debug helpers
        this._globalHelpers.forEach(helperName => {
            if (window[helperName]) {
                delete window[helperName];
            }
        });

        // Remove global reference
        if (window.helpInterface === this) {
            delete window.helpInterface;
        }

        // Clear references
        this.starfieldManager = null;
        this.container = null;
        this.isVisible = false;
        this._tabHandlers = null;

        debug('UI', 'HelpInterface cleanup complete');
    }
} 