/**
 * Help Interface - Shows all game controls and key bindings
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
        
        console.log('Help Interface shown');
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
        
        console.log('Help Interface hidden');
    }

    /**
     * Create the help interface
     */
    createInterface() {
        // Remove existing interface
        if (this.container) {
            this.container.remove();
        }

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'help-interface';
        this.container.innerHTML = `
            <div class="help-modal">
                <div class="help-header">
                    <h2>GAME CONTROLS & KEY BINDINGS</h2>
                    <button class="help-close-btn" onclick="window.helpInterface.hide()">✕</button>
                </div>
                <div class="help-content">
                    <div class="help-section">
                        <h3>BASIC NAVIGATION</h3>
                        <div class="help-controls">
                            <div class="help-control">
                                <span class="help-key">F</span>
                                <span class="help-desc">Switch to Forward View</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">A</span>
                                <span class="help-desc">Switch to Aft View</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">I</span>
                                <span class="help-desc">Toggle Intel Display</span>
                            </div>
                        </div>
                    </div>

                    <div class="help-section">
                        <h3>SHIP MOVEMENT</h3>
                        <div class="help-controls">
                            <div class="help-control">
                                <span class="help-key">1-9</span>
                                <span class="help-desc">Set Impulse Speed (1=slowest, 9=fastest)</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">0</span>
                                <span class="help-desc">Full Stop (Impulse 0)</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">Arrow Keys</span>
                                <span class="help-desc">Maneuver ship (rotation)</span>
                            </div>
                        </div>
                    </div>

                    <div class="help-section">
                        <h3>SHIP SYSTEMS</h3>
                        <div class="help-controls">
                            <div class="help-control">
                                <span class="help-key">S</span>
                                <span class="help-desc">Toggle Shields On/Off</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">G</span>
                                <span class="help-desc">Toggle Galactic Chart</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">L</span>
                                <span class="help-desc">Toggle Long Range Scanner</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">R</span>
                                <span class="help-desc">Toggle Subspace Radio</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">D</span>
                                <span class="help-desc">Toggle Damage Control Interface</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">H</span>
                                <span class="help-desc">Toggle This Help Screen</span>
                            </div>
                        </div>
                    </div>

                    <div class="help-section">
                        <h3>COMBAT</h3>
                        <div class="help-controls">
                            <div class="help-control">
                                <span class="help-key">T</span>
                                <span class="help-desc">Toggle Target Computer</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">Tab</span>
                                <span class="help-desc">Cycle Through Targets</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">&lt;</span>
                                <span class="help-desc">Previous Target System</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">&gt;</span>
                                <span class="help-desc">Next Target System</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">Space</span>
                                <span class="help-desc">Fire Weapons</span>
                            </div>
                            <div class="help-control disabled">
                                <span class="help-key">Enter</span>
                                <span class="help-desc">Fire Missiles (Not Yet Implemented)</span>
                            </div>
                        </div>
                    </div>

                    <div class="help-section">
                        <h3>DEBUG COMMANDS</h3>
                        <div class="help-controls">
                            <div class="help-control">
                                <span class="help-key">Ctrl+Shift+V</span>
                                <span class="help-desc">Damage Random Systems</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">Ctrl+Shift+M</span>
                                <span class="help-desc">Damage Hull</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">Ctrl+Shift+N</span>
                                <span class="help-desc">Drain Energy</span>
                            </div>
                            <div class="help-control">
                                <span class="help-key">Ctrl+Shift+B</span>
                                <span class="help-desc">Repair All Systems</span>
                            </div>
                        </div>
                    </div>



                    <div class="help-section">
                        <h3>ENERGY MANAGEMENT</h3>
                        <div class="help-info">
                            <p><strong>Energy Consumption:</strong></p>
                            <ul>
                                <li>Systems consume energy per second when active</li>
                                <li>Impulse engines: Variable consumption (1x to 15x based on speed)</li>
                                <li>Shields: 25.0 energy/sec when active</li>
                                <li>Target Computer: 7.2 energy/sec when active</li>
                                <li>Long Range Scanner: Energy/sec when scanning</li>
                                <li>Subspace Radio: 7.2 energy/sec when transmitting</li>
                                <li>Weapons: Energy per shot (instant consumption)</li>
                            </ul>
                        </div>
                    </div>

                    <div class="help-section">
                        <h3>SYSTEM DAMAGE EFFECTS</h3>
                        <div class="help-info">
                            <ul>
                                <li><strong>Impulse Engines:</strong> Critical damage limits max speed to Impulse 3</li>
                                <li><strong>Shields:</strong> Reduced protection when damaged</li>
                                <li><strong>Weapons:</strong> Reduced damage and accuracy when damaged</li>
                                <li><strong>Target Computer:</strong> Sub-targeting disabled when damaged</li>
                                <li><strong>Long Range Scanner:</strong> Reduced scan range when damaged</li>
                                <li><strong>Subspace Radio:</strong> Limited galactic chart access when damaged</li>
                                <li><strong>Warp Drive:</strong> Cannot warp when critically damaged</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.container);
        
        // Add styles
        this.addStyles();
        
        // Make interface globally accessible
        window.helpInterface = this;
        
        // Add escape key handler
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
     * Add CSS styles for the help interface
     */
    addStyles() {
        if (document.getElementById('help-interface-styles')) return;

        const style = document.createElement('style');
        style.id = 'help-interface-styles';
        style.textContent = `
            .help-interface {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: "Courier New", monospace;
                color: #00ff41;
            }

            .help-modal {
                background: rgba(0, 20, 0, 0.95);
                border: 2px solid #00ff41;
                border-radius: 8px;
                width: 90%;
                max-width: 1000px;
                max-height: 90%;
                overflow-y: auto;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
            }

            .help-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #00ff41;
                background: rgba(0, 255, 65, 0.1);
            }

            .help-header h2 {
                margin: 0;
                color: #00ff41;
                font-size: 24px;
                text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
            }

            .help-close-btn {
                background: transparent;
                border: 1px solid #00ff41;
                color: #00ff41;
                font-size: 20px;
                width: 30px;
                height: 30px;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .help-close-btn:hover {
                background: rgba(0, 255, 65, 0.2);
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }

            .help-content {
                padding: 20px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                gap: 30px;
            }

            .help-section {
                background: rgba(0, 255, 65, 0.05);
                border: 1px solid rgba(0, 255, 65, 0.3);
                border-radius: 6px;
                padding: 20px;
            }

            .help-section h3 {
                margin: 0 0 15px 0;
                color: #00ff41;
                font-size: 18px;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
                border-bottom: 1px solid rgba(0, 255, 65, 0.3);
                padding-bottom: 8px;
            }

            .help-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .help-control {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 8px 0;
            }

            .help-control.disabled {
                opacity: 0.5;
            }

            .help-control.disabled .help-key {
                background: rgba(128, 128, 128, 0.2);
                border-color: #666;
                color: #666;
                box-shadow: none;
            }

            .help-control.disabled .help-desc {
                color: #666;
                font-style: italic;
            }

            .help-key {
                background: rgba(0, 255, 65, 0.2);
                border: 1px solid #00ff41;
                border-radius: 4px;
                padding: 4px 8px;
                font-weight: bold;
                min-width: 80px;
                text-align: center;
                font-size: 12px;
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.2);
            }

            .help-desc {
                flex: 1;
                font-size: 14px;
                color: #ccffcc;
            }

            .help-info {
                color: #ccffcc;
                font-size: 14px;
                line-height: 1.6;
            }

            .help-info p {
                margin: 0 0 10px 0;
                color: #00ff41;
                font-weight: bold;
            }

            .help-info ul {
                margin: 0;
                padding-left: 20px;
            }

            .help-info li {
                margin-bottom: 8px;
            }

            .help-info strong {
                color: #00ff41;
            }

            /* Scrollbar styling */
            .help-modal::-webkit-scrollbar {
                width: 8px;
            }

            .help-modal::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
            }

            .help-modal::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 65, 0.5);
                border-radius: 4px;
            }

            .help-modal::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 65, 0.7);
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .help-content {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .help-modal {
                    width: 95%;
                    margin: 10px;
                }
                
                .help-header h2 {
                    font-size: 20px;
                }
                
                .help-section {
                    padding: 15px;
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