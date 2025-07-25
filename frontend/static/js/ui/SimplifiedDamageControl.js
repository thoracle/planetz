/**
 * Simplified Damage Control Interface - Priority-based auto-repair system
 * Replaces repair kits with priority queues for emergency triage
 * 
 * Features:
 * - Priority sliders for each system (0-10)
 * - Auto-repair toggle
 * - Current repair target display
 * - Estimated repair times
 * - System status overview
 */

import { getSystemDisplayName } from '../ship/System.js';

export default class SimplifiedDamageControl {
    constructor() {
        this.isVisible = false;
        this.ship = null;
        this.isDocked = false;
        this.refreshInterval = null;
        
        // Bind event handlers
        this.boundKeyHandler = this.handleKeyPress.bind(this);
        
        console.log('Simplified Damage Control Interface initialized');
    }
    
    /**
     * Show the damage control interface
     * @param {Ship} ship - Ship instance to manage
     * @param {boolean} isDocked - Whether ship is currently docked
     */
    show(ship, isDocked = false) {
        if (this.isVisible) return false;
        
        this.ship = ship;
        this.isDocked = isDocked;
        this.isVisible = true;
        
        this.createInterface();
        this.updateInterface();
        
        // Start refresh timer
        this.refreshInterval = setInterval(() => {
            this.updateInterface();
        }, 1000); // Update every second
        
        // Add keyboard listener
        document.addEventListener('keydown', this.boundKeyHandler);
        
        console.log('Simplified Damage Control interface opened');
        return true;
    }
    
    /**
     * Hide the damage control interface
     */
    hide() {
        if (!this.isVisible) return false;
        
        this.isVisible = false;
        
        // Remove interface
        const overlay = document.getElementById('simplified-damage-control-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Clear refresh timer
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Remove keyboard listener
        document.removeEventListener('keydown', this.boundKeyHandler);
        
        console.log('Simplified Damage Control interface closed');
        return true;
    }
    
    /**
     * Toggle the damage control interface
     * @param {Ship} ship - Ship instance
     * @param {boolean} isDocked - Whether ship is docked
     * @returns {boolean} New visibility state
     */
    toggle(ship, isDocked = false) {
        if (this.isVisible) {
            return !this.hide();
        } else {
            return this.show(ship, isDocked);
        }
    }
    
    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyPress(event) {
        if (event.key === 'Escape' || event.key === 'd' || event.key === 'D') {
            this.hide();
            event.preventDefault();
        }
    }
    
    /**
     * Create the interface HTML structure
     */
    createInterface() {
        // Add CSS if not already present
        this.addCSS();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'simplified-damage-control-overlay';
        overlay.className = 'simplified-damage-control-overlay';
        
        overlay.innerHTML = this.createInterfaceHTML();
        
        document.body.appendChild(overlay);
    }
    
    /**
     * Create the HTML structure for the interface
     * @returns {string} HTML content
     */
    createInterfaceHTML() {
        return `
            <div class="simplified-damage-control-container">
                <div class="damage-control-header">
                    <div class="view-label">DAMAGE CONTROL - EMERGENCY TRIAGE</div>
                    <button class="close-button" onclick="window.simplifiedDamageControl?.hide()">✕</button>
                </div>
                
                <div class="damage-control-content">
                    <div class="auto-repair-panel">
                        <div class="panel-header">Auto-Repair System</div>
                        <div class="auto-repair-controls">
                            <button id="auto-repair-toggle" class="auto-repair-button" onclick="window.simplifiedDamageControl?.toggleAutoRepair()">
                                ACTIVATE
                            </button>
                            <div class="auto-repair-status">
                                <div class="status-line">Status: <span id="repair-status">INACTIVE</span></div>
                                <div class="status-line">Target: <span id="repair-target">None</span></div>
                                <div class="status-line">ETA: <span id="repair-eta">--</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="systems-panel">
                        <div class="panel-header">System Priorities</div>
                        <div class="systems-grid" id="systems-grid">
                            <!-- Systems will be populated here -->
                        </div>
                    </div>
                    
                    <div class="repair-queue-panel">
                        <div class="panel-header">Repair Queue</div>
                        <div class="repair-queue" id="repair-queue">
                            <!-- Queue will be populated here -->
                        </div>
                    </div>
                </div>
                
                <div class="damage-control-footer">
                    <div class="help-text">
                        Emergency repairs are SLOW (0.5%/sec) - Use stations for full repairs | 
                        ESC or D to close
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update the interface with current data
     */
    updateInterface() {
        if (!this.isVisible || !this.ship || !this.ship.autoRepairSystem) return;
        
        this.updateAutoRepairStatus();
        this.updateSystemsGrid();
        this.updateRepairQueue();
    }
    
    /**
     * Update auto-repair system status
     */
    updateAutoRepairStatus() {
        const status = this.ship.autoRepairSystem.getStatus();
        
        // Update toggle button
        const toggleButton = document.getElementById('auto-repair-toggle');
        if (toggleButton) {
            toggleButton.textContent = status.isActive ? 'DEACTIVATE' : 'ACTIVATE';
            toggleButton.className = `auto-repair-button ${status.isActive ? 'active' : 'inactive'}`;
        }
        
        // Update status display
        const statusElement = document.getElementById('repair-status');
        if (statusElement) {
            statusElement.textContent = status.isActive ? 'ACTIVE' : 'INACTIVE';
            statusElement.className = status.isActive ? 'status-active' : 'status-inactive';
        }
        
        // Update current target
        const targetElement = document.getElementById('repair-target');
        if (targetElement) {
            targetElement.textContent = status.currentTarget ? 
                this.formatSystemName(status.currentTarget) : 'None';
        }
        
        // Update ETA
        const etaElement = document.getElementById('repair-eta');
        if (etaElement) {
            const eta = this.ship.autoRepairSystem.getEstimatedRepairTime();
            if (eta !== null && eta > 0) {
                const minutes = Math.floor(eta / 60);
                const seconds = eta % 60;
                etaElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                etaElement.textContent = '--';
            }
        }
    }
    
    /**
     * Update systems grid with priority sliders
     */
    updateSystemsGrid() {
        const grid = document.getElementById('systems-grid');
        if (!grid) return;
        
        if (!this.ship) {
            grid.innerHTML = '<div class="error-message">No ship data available</div>';
            return;
        }
        
        let html = '';
        
        // Get all ship systems
        const shipStatus = this.ship.getStatus();
        console.log('🔧 ALL ship systems (unfiltered):', Object.keys(shipStatus.systems));
        
        // NEW APPROACH: Show ALL systems except individual weapon systems
        // Individual weapons are shown in the unified weapon system display
        const systemsToDisplay = {};
        const skippedSystems = [];
        
        for (const [systemName, systemData] of Object.entries(shipStatus.systems)) {
            // Skip individual weapon systems since we show the unified weapon system separately
            if (this.isWeaponSystem(systemName)) {
                skippedSystems.push(systemName);
                console.log(`🔧 Skipping individual weapon system: ${systemName} (shown in unified weapons)`);
            } else {
                // Include ALL non-weapon systems - engines, shields, hull, life support, etc.
                systemsToDisplay[systemName] = systemData;
                console.log(`🔧 Including system: ${systemName} (Health: ${(systemData.health * 100).toFixed(1)}%)`);
            }
        }
        
        console.log('🔧 Systems to display:', Object.keys(systemsToDisplay));
        console.log('🔧 Systems skipped (individual weapons):', skippedSystems);
        
        // Add the unified WeaponSystemCore if it exists
        if (this.ship.weaponSystem) {
            const weaponSystemStatus = this.getWeaponSystemStatus();
            if (weaponSystemStatus) {
                const priority = this.ship.autoRepairSystem.getSystemPriority('weapons');
                const healthPercent = (weaponSystemStatus.health * 100).toFixed(1);
                const statusClass = this.getSystemStatusClass(weaponSystemStatus);
                const statusIcon = this.getSystemStatusIcon(weaponSystemStatus);
                
                html += `
                    <div class="system-card ${statusClass}">
                        <div class="system-header">
                            <span class="system-icon">${statusIcon}</span>
                            <span class="system-name">Weapon Systems (${weaponSystemStatus.equippedWeapons}/${weaponSystemStatus.maxWeaponSlots})</span>
                        </div>
                        <div class="health-bar">
                            <div class="health-fill ${this.getHealthBarClass(weaponSystemStatus.health)}" 
                                 style="width: ${healthPercent}%"></div>
                        </div>
                        <div class="system-info">
                            <div class="health-text">${healthPercent}% Health</div>
                            <div class="weapon-details">
                                <div class="weapon-list">
                                    ${this.getWeaponListHTML()}
                                </div>
                            </div>
                            <div class="priority-control">
                                <label>Priority:</label>
                                <input type="range" 
                                       min="0" max="10" 
                                       value="${priority}"
                                       class="priority-slider"
                                       onchange="window.starfieldManager.ship.autoRepairSystem.setSystemPriority('weapons', this.value)">
                                <span class="priority-value">${priority}</span>
                            </div>
                        </div>
                    </div>
                `;
                console.log('🔧 Added unified weapon system display');
            }
        }
        
        // Generate HTML for each non-weapon system
        for (const [systemName, systemData] of Object.entries(systemsToDisplay)) {
            console.log(`🔧 Processing system: ${systemName}`);
            
            const priority = this.ship.autoRepairSystem.getSystemPriority(systemName);
            const healthPercent = (systemData.health * 100).toFixed(1);
            const statusClass = this.getSystemStatusClass(systemData);
            const statusIcon = this.getSystemStatusIcon(systemData);
            const formattedName = this.formatSystemName(systemName);
            const isDamaged = systemData.health < 1.0;
            
            html += `
                <div class="system-card ${statusClass}">
                    <div class="system-header">
                        <span class="system-icon">${statusIcon}</span>
                        <span class="system-name">${formattedName} (Lvl ${systemData.level || 1})</span>
                    </div>
                    <div class="health-bar">
                        <div class="health-fill ${this.getHealthBarClass(systemData.health)}" 
                             style="width: ${healthPercent}%"></div>
                    </div>
                    <div class="system-info">
                        <div class="health-text">${healthPercent}% Health</div>
                        ${isDamaged ? `
                            <div class="repair-controls">
                                <button class="manual-repair-btn" 
                                        onclick="window.starfieldManager.ship.autoRepairSystem.requestManualRepair('${systemName}')">
                                    Manual Repair
                                </button>
                            </div>
                        ` : ''}
                        <div class="priority-control">
                            <label>Priority:</label>
                            <input type="range" 
                                   min="0" max="10" 
                                   value="${priority}"
                                   class="priority-slider"
                                   onchange="window.starfieldManager.ship.autoRepairSystem.setSystemPriority('${systemName}', this.value)">
                            <span class="priority-value">${priority}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const totalSystems = Object.keys(systemsToDisplay).length + (this.ship.weaponSystem ? 1 : 0);
        console.log(`🔧 Displayed ${totalSystems} systems (${Object.keys(systemsToDisplay).length} individual + ${this.ship.weaponSystem ? 1 : 0} unified weapons)`);
        
        grid.innerHTML = html || '<div class="no-systems">No systems available</div>';
    }
    
    /**
     * Add event listeners for priority sliders
     */
    addSliderEventListeners() {
        const sliders = document.querySelectorAll('.priority-slider');
        console.log(`Adding event listeners to ${sliders.length} sliders`);
        
        sliders.forEach(slider => {
            slider.addEventListener('input', (event) => {
                const systemName = event.target.dataset.system;
                const priority = parseInt(event.target.value);
                
                console.log(`Slider moved: ${systemName} = ${priority}`);
                
                // Update the priority value display immediately
                const valueSpan = event.target.nextElementSibling;
                if (valueSpan) {
                    valueSpan.textContent = priority;
                }
                
                // Set the priority in the auto-repair system
                this.setPriority(systemName, priority);
            });
        });
    }

    /**
     * Update repair queue display
     */
    updateRepairQueue() {
        const queueElement = document.getElementById('repair-queue');
        if (!queueElement) return;
        
        const status = this.ship.autoRepairSystem.getStatus();
        
        if (status.queue.length === 0) {
            queueElement.innerHTML = '<div class="queue-empty">No systems queued for repair</div>';
            return;
        }
        
        let html = '';
        status.queue.forEach((item, index) => {
            const isCurrent = index === 0;
            const healthPercent = (item.health * 100).toFixed(1);
            
            html += `
                <div class="queue-item ${isCurrent ? 'current' : ''}">
                    <div class="queue-position">${index + 1}</div>
                    <div class="queue-system">
                        <div class="queue-name">${this.formatSystemName(item.systemName)}</div>
                        <div class="queue-health">${healthPercent}% health</div>
                    </div>
                    <div class="queue-priority">P${item.priority}</div>
                </div>
            `;
        });
        
        queueElement.innerHTML = html;
    }
    
    /**
     * Toggle auto-repair system
     */
    toggleAutoRepair() {
        if (!this.ship || !this.ship.autoRepairSystem) return;
        
        this.ship.autoRepairSystem.toggle();
        this.updateInterface();
    }
    
    /**
     * Set priority for a system
     * @param {string} systemName - Name of the system
     * @param {string|number} priority - Priority value (0-10)
     */
    setPriority(systemName, priority) {
        console.log(`Setting priority for ${systemName} to ${priority}`);
        
        if (!this.ship || !this.ship.autoRepairSystem) {
            console.warn('Ship or auto-repair system not available');
            return;
        }
        
        const priorityNum = parseInt(priority);
        this.ship.autoRepairSystem.setSystemPriority(systemName, priorityNum);
        console.log(`Priority set successfully for ${systemName}: ${priorityNum}`);
        
        // Update interface to reflect changes
        this.updateInterface();
    }
    
    /**
     * Format system name for display
     * @param {string} systemName - Raw system name
     * @returns {string} Formatted name
     */
    formatSystemName(systemName) {
        // Special handling for weapons - check if we have unified weapon system
        if (systemName === 'weapons' && this.ship) {
            // First try to get from individual weapon system (legacy support)
            const weaponsSystem = this.ship.getSystem('weapons');
            if (weaponsSystem && weaponsSystem.levelStats && weaponsSystem.level) {
                const levelStats = weaponsSystem.levelStats[weaponsSystem.level];
                if (levelStats && levelStats.weaponType) {
                    return levelStats.weaponType;
                }
            }
            
            // Fallback to unified weapon system
            if (this.ship.weaponSystem) {
                const weaponStatus = this.ship.weaponSystem.getStatus();
                if (weaponStatus.equippedWeapons > 0) {
                    return `Weapon Systems (${weaponStatus.equippedWeapons}/${weaponStatus.maxWeaponSlots})`;
                } else {
                    return 'Weapon Systems (No Weapons Equipped)';
                }
            }
        }
        
        return getSystemDisplayName(systemName);
    }
    
    /**
     * Get CSS class for system status
     */
    getSystemStatusClass(systemStatus) {
        if (!systemStatus.canBeActivated) return 'system-disabled';
        const health = systemStatus.health * 100;
        if (health >= 75) return 'system-good';
        if (health >= 50) return 'system-fair';
        if (health >= 25) return 'system-poor';
        return 'system-critical';
    }
    
    /**
     * Get icon for system status
     */
    getSystemStatusIcon(systemStatus) {
        if (!systemStatus.canBeActivated) return '💀';
        if (systemStatus.isActive) return '🟢';
        const health = systemStatus.health * 100;
        if (health >= 75) return '🔵';
        if (health >= 50) return '🟡';
        if (health >= 25) return '🟠';
        return '🔴';
    }
    
    /**
     * Get CSS class for health bar
     */
    getHealthBarClass(health) {
        const healthPercent = health * 100;
        if (healthPercent >= 75) return 'good';
        if (healthPercent >= 50) return 'fair';
        if (healthPercent >= 25) return 'poor';
        return 'critical';
    }
    
    /**
     * Add CSS styles for the interface
     */
    addCSS() {
        if (document.getElementById('simplified-damage-control-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'simplified-damage-control-styles';
        style.textContent = `
            .simplified-damage-control-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'VT323', monospace;
            }
            
            .simplified-damage-control-container {
                width: 90%;
                max-width: 1200px;
                height: 80%;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #00ff41;
                display: flex;
                flex-direction: column;
                color: #00ff41;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
            }
            
            .damage-control-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #00ff41;
                background: rgba(0, 20, 0, 0.3);
            }
            
            .view-label {
                color: #00ff41;
                font-size: 18px;
                font-weight: bold;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            }
            
            .close-button {
                background: rgba(0, 20, 0, 0.5);
                border: 1px solid #00ff41;
                color: #00ff41;
                padding: 8px 12px;
                cursor: pointer;
                font-family: inherit;
                font-size: 16px;
                transition: all 0.2s ease;
            }
            
            .close-button:hover {
                background: #00ff41;
                color: #000;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .damage-control-content {
                flex: 1;
                display: grid;
                grid-template-columns: 300px 1fr 250px;
                gap: 15px;
                padding: 15px;
                overflow: hidden;
            }
            
            .auto-repair-panel, .systems-panel, .repair-queue-panel {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid #00ff41;
                padding: 15px;
                overflow-y: auto;
            }
            
            .panel-header {
                font-size: 16px;
                font-weight: bold;
                color: #00ff41;
                border-bottom: 1px solid #00ff41;
                padding-bottom: 8px;
                margin-bottom: 15px;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            }
            
            .auto-repair-controls {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .auto-repair-button {
                background: rgba(0, 20, 0, 0.5);
                border: 2px solid #00ff41;
                color: #00ff41;
                padding: 12px 20px;
                font-family: inherit;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .auto-repair-button:hover {
                background: rgba(0, 255, 65, 0.1);
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .auto-repair-button.active {
                background: rgba(0, 255, 65, 0.2);
                border-color: #00ff41;
                box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
            }
            
            .auto-repair-status {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .status-line {
                font-size: 14px;
                color: rgba(0, 255, 65, 0.8);
            }
            
            .status-active {
                color: #00ff41;
                font-weight: bold;
            }
            
            .status-inactive {
                color: #666;
            }
            
            .systems-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }
            
            .system-card {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid #00ff41;
                padding: 12px;
                transition: all 0.3s ease;
            }
            
            .system-card:hover {
                background: rgba(0, 255, 65, 0.1);
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .system-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .system-icon {
                font-size: 16px;
            }
            
            .system-name {
                font-weight: bold;
                font-size: 14px;
                color: #00ff41;
            }
            
            .health-bar {
                width: 100%;
                height: 8px;
                background: rgba(0, 255, 65, 0.2);
                border: 1px solid #00ff41;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .health-fill {
                height: 100%;
                transition: width 0.3s ease;
            }
            
            .health-fill.good {
                background: #00ff41;
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
            }
            
            .health-fill.fair {
                background: #ffff00;
                box-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
            }
            
            .health-fill.poor {
                background: #ff8800;
                box-shadow: 0 0 5px rgba(255, 136, 0, 0.5);
            }
            
            .health-fill.critical {
                background: #ff4444;
                box-shadow: 0 0 5px rgba(255, 68, 68, 0.5);
            }
            
            .system-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .health-text {
                font-size: 12px;
                color: rgba(0, 255, 65, 0.8);
            }
            
            .priority-control {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
            }
            
            .priority-control label {
                color: rgba(0, 255, 65, 0.8);
                min-width: 50px;
            }
            
            .priority-slider {
                flex: 1;
                height: 4px;
                background: rgba(0, 255, 65, 0.2);
                outline: none;
                border: none;
                cursor: pointer;
            }
            
            .priority-slider::-webkit-slider-thumb {
                appearance: none;
                width: 12px;
                height: 12px;
                background: #00ff41;
                cursor: pointer;
                border-radius: 0;
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
            }
            
            .priority-value {
                color: #00ff41;
                font-weight: bold;
                min-width: 20px;
                text-align: center;
            }
            
            .repair-queue {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .queue-empty {
                color: rgba(0, 255, 65, 0.6);
                text-align: center;
                font-style: italic;
                padding: 20px;
            }
            
            .queue-item {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid rgba(0, 255, 65, 0.3);
                padding: 8px;
                font-size: 12px;
            }
            
            .queue-item.current {
                border-color: #00ff41;
                background: rgba(0, 255, 65, 0.1);
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            }
            
            .queue-position {
                background: #00ff41;
                color: #000;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 10px;
            }
            
            .queue-system {
                flex: 1;
            }
            
            .queue-name {
                color: #00ff41;
                font-weight: bold;
            }
            
            .queue-health {
                color: rgba(0, 255, 65, 0.7);
                font-size: 10px;
            }
            
            .queue-priority {
                color: #00ff41;
                font-weight: bold;
            }
            
            .damage-control-footer {
                padding: 12px 20px;
                border-top: 1px solid #00ff41;
                background: rgba(0, 20, 0, 0.3);
                text-align: center;
                font-size: 12px;
                color: rgba(0, 255, 65, 0.8);
            }
            
            .help-text {
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .system-good { border-color: #00ff41; }
            .system-fair { border-color: #ffff00; }
            .system-poor { border-color: #ff8800; }
            .system-critical { border-color: #ff4444; }
            .system-disabled { border-color: #666666; opacity: 0.6; }
            
            /* Weapon details styling */
            .weapon-details {
                margin: 8px 0;
                padding: 8px;
                background: rgba(0, 20, 0, 0.2);
                border: 1px solid rgba(0, 255, 65, 0.3);
                border-radius: 4px;
            }
            
            .weapon-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .weapon-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 2px;
                font-size: 12px;
            }
            
            .weapon-item.active-weapon {
                background: rgba(0, 255, 65, 0.2);
                border: 1px solid rgba(0, 255, 65, 0.5);
            }
            
            .weapon-item.empty {
                color: #666;
                font-style: italic;
            }
            
            .weapon-slot-number {
                display: inline-block;
                width: 18px;
                height: 18px;
                line-height: 18px;
                text-align: center;
                background: rgba(0, 255, 65, 0.3);
                border-radius: 2px;
                font-weight: bold;
                font-size: 10px;
            }
            
            .weapon-name {
                flex: 1;
                color: rgba(0, 255, 65, 0.9);
            }
            
            .active-indicator {
                color: #00ff41;
                font-weight: bold;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.8);
            }
            
            .no-weapons {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 8px;
            }
            
            @media (max-width: 1024px) {
                .damage-control-content {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto auto;
                }
                
                .systems-grid {
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Force immediate interface refresh (called externally when ship changes)
     */
    forceRefresh() {
        if (this.isVisible) {
            this.updateInterface();
        }
    }

    /**
     * Get unified weapon system status from WeaponSystemCore
     * @returns {Object|null} Weapon system status compatible with damage control
     */
    getWeaponSystemStatus() {
        if (!this.ship.weaponSystem) return null;
        
        const weaponStatus = this.ship.weaponSystem.getStatus();
        
        // Create a status object compatible with the damage control system
        // For unified weapon system, use default full health unless specifically damaged
        let overallHealth = 1.0; // Default to full health
        let canBeActivated = true;
        let isActive = true; // Weapon system is always "active" if it exists
        
        // The unified weapon system doesn't have individual health tracking yet
        // so we'll use full health for now
        
        return {
            health: overallHealth,
            isActive: isActive,
            canBeActivated: canBeActivated,
            level: 1, // Weapon system level
            systemType: 'weapons',
            equippedWeapons: weaponStatus.equippedWeapons,
            maxWeaponSlots: weaponStatus.maxWeaponSlots,
            activeSlotIndex: weaponStatus.activeSlotIndex
        };
    }

    /**
     * Generate HTML for weapon list display
     * @returns {string} HTML for weapon list
     */
    getWeaponListHTML() {
        if (!this.ship.weaponSystem || !this.ship.weaponSystem.weaponSlots) {
            return '<div class="no-weapons">No weapons equipped</div>';
        }
        
        let html = '';
        for (const slot of this.ship.weaponSystem.weaponSlots) {
            if (!slot.isEmpty && slot.equippedWeapon) {
                const weapon = slot.equippedWeapon;
                const isActive = slot.slotIndex === this.ship.weaponSystem.activeSlotIndex;
                const activeClass = isActive ? 'active-weapon' : '';
                
                html += `
                    <div class="weapon-item ${activeClass}">
                        <span class="weapon-slot-number">${slot.slotIndex + 1}</span>
                        <span class="weapon-name">${weapon.name}</span>
                        ${isActive ? '<span class="active-indicator">●</span>' : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="weapon-item empty">
                        <span class="weapon-slot-number">${slot.slotIndex + 1}</span>
                        <span class="weapon-name">Empty Slot</span>
                    </div>
                `;
            }
        }
        
        return html;
    }

    /**
     * Check if a system name represents an individual weapon system
     * @param {string} systemName - Name of the system
     * @returns {boolean} True if it's an individual weapon system
     */
    isWeaponSystem(systemName) {
        const weaponSystems = [
            // Legacy weapon system
            'weapons',
            // Scan-hit weapons (energy weapons)
            'laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array',
            'disruptor_cannon', 'particle_beam',
            // Splash-damage weapons (projectile weapons)
            'standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine'
        ];
        return weaponSystems.includes(systemName);
    }

    /**
     * Check if a system is repairable (has health and can be damaged)
     * @param {string} systemName - Name of the system
     * @returns {boolean} True if the system is repairable
     */
    isRepairableSystem(systemName) {
        // Most ship systems are repairable, except for some special cases
        const nonRepairableSystems = ['hull', 'cargo']; // Add more if needed
        return !nonRepairableSystems.includes(systemName);
    }
} 