/**
 * Damage Control Interface - Ship system status and repair management
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * 
 * Provides:
 * - System status display with damage levels
 * - Repair priority management
 * - Visual damage indicators
 * - Repair cost estimates
 * - Real-time system monitoring
 */

export default class DamageControlInterface {
    constructor() {
        this.isVisible = false;
        this.ship = null;
        this.isDocked = false;
        this.selectedSystem = null;
        this.refreshInterval = null;
        
        // Repair kits simulation (would be loaded from ship data)
        this.repairKits = {
            basic: { count: 5, repairAmount: 0.25, cost: 100 },
            advanced: { count: 2, repairAmount: 0.50, cost: 250 },
            emergency: { count: 1, repairAmount: 1.0, cost: 500 }
        };
        
        // Damage log for notifications
        this.damageLog = [];
        this.maxLogEntries = 50;
        
        // Bind event handlers to maintain proper 'this' context
        this.boundKeyHandler = this.handleKeyPress.bind(this);
        
        console.log('Damage Control Interface initialized');
    }
    
    /**
     * Set the ship instance to monitor
     * @param {Ship} ship - Ship instance
     */
    setShip(ship) {
        this.ship = ship;
        console.log('Damage Control Interface connected to ship:', ship?.shipType);
    }
    
    /**
     * Set docking status
     * @param {boolean} docked - Whether ship is docked
     */
    setDockingStatus(docked) {
        this.isDocked = docked;
        if (this.isVisible && docked) {
            this.hide(); // Auto-hide when docking
        }
    }
    
    /**
     * Toggle the damage control interface visibility
     * @returns {boolean} True if interface was shown, false if hidden or couldn't show
     */
    toggle() {
        if (this.isDocked) {
            this.showError('Damage Control Interface unavailable while docked');
            return false;
        }
        
        if (this.isVisible) {
            this.hide();
            return false;
        } else {
            this.show();
            return true;
        }
    }
    
    /**
     * Show the damage control interface
     */
    show() {
        if (this.isDocked) {
            this.showError('Cannot access Damage Control while docked');
            return;
        }
        
        if (!this.ship) {
            this.showError('No ship data available');
            return;
        }
        
        this.isVisible = true;
        this.createInterface();
        this.startRefresh();
        
        console.log('Damage Control Interface shown');
    }
    
    /**
     * Hide the damage control interface
     */
    hide() {
        this.isVisible = false;
        this.stopRefresh();
        this.removeInterface();
        
        console.log('Damage Control Interface hidden');
    }
    
    /**
     * Create the damage control interface DOM elements
     */
    createInterface() {
        // Remove any existing interface
        this.removeInterface();
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'damage-control-overlay';
        overlay.className = 'damage-control-overlay';
        
        // Create main container
        const container = document.createElement('div');
        container.id = 'damage-control-container';
        container.className = 'damage-control-container';
        
        // Create interface content
        container.innerHTML = this.createInterfaceHTML();
        
        // Add to overlay
        overlay.appendChild(container);
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Add CSS if not already added
        this.addCSS();
        
        // Bind events
        this.bindEvents();
        
        // Initial data update
        this.updateInterface();
    }
    
    /**
     * Create the HTML structure for the interface
     * @returns {string} HTML content
     */
    createInterfaceHTML() {
        return `
            <div class="damage-control-header">
                <div class="view-label">View: DAMAGE</div>
            </div>
            
            <button class="close-button" onclick="window.damageControl?.hide()">✕</button>
            
            <div class="damage-control-content">
                <div class="systems-panel">
                    <div class="systems-grid" id="systems-grid">
                        <!-- Systems will be populated here -->
                    </div>
                </div>
                
                <div class="details-panel">
                    <div class="system-details" id="system-details">
                        <p>Select a system to view details</p>
                    </div>
                    
                    <div class="repair-section" id="repair-section">
                        <div class="repair-kits">
                            <div class="repair-kit" data-type="basic">
                                <span class="kit-name">Basic Repair Kit</span>
                                <span class="kit-info">Repairs 25% | Cost: 100 credits</span>
                                <span class="kit-count">Available: ${this.repairKits.basic.count}</span>
                                <button class="repair-button" onclick="window.damageControl?.performRepair('basic')">Use</button>
                            </div>
                            <div class="repair-kit" data-type="advanced">
                                <span class="kit-name">Advanced Repair Kit</span>
                                <span class="kit-info">Repairs 50% | Cost: 250 credits</span>
                                <span class="kit-count">Available: ${this.repairKits.advanced.count}</span>
                                <button class="repair-button" onclick="window.damageControl?.performRepair('advanced')">Use</button>
                            </div>
                            <div class="repair-kit" data-type="emergency">
                                <span class="kit-name">Emergency Repair Kit</span>
                                <span class="kit-info">Full Repair | Cost: 500 credits</span>
                                <span class="kit-count">Available: ${this.repairKits.emergency.count}</span>
                                <button class="repair-button" onclick="window.damageControl?.performRepair('emergency')">Use</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="damage-log-panel">
                    <div class="damage-log" id="damage-log">
                        <!-- Damage log entries will be populated here -->
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update the interface with current ship data
     */
    updateInterface() {
        if (!this.isVisible || !this.ship) return;
        
        this.updateSystemsGrid();
        this.updateSystemDetails();
        this.updateRepairSection();
        this.updateDamageLog();
    }
    
    /**
     * Update the systems grid
     */
    updateSystemsGrid() {
        const systemsGrid = document.getElementById('systems-grid');
        if (!systemsGrid) return;
        
        const shipStatus = this.ship.getStatus();
        
        // Create ship status header
        const statusHeader = document.createElement('div');
        statusHeader.className = 'ship-status-header';
        statusHeader.innerHTML = `
            <div class="status-title">${shipStatus.shipType.replace('_', ' ').toUpperCase()}</div>
            <div class="status-info">
                <span class="hull-status ${this.getStatusClass(shipStatus.hull.percentage)}">
                    Hull: ${shipStatus.hull.current}/${shipStatus.hull.max} (${shipStatus.hull.percentage.toFixed(1)}%)
                </span>
                <span class="energy-status ${this.getStatusClass(shipStatus.energy.percentage)}">
                    Energy: ${shipStatus.energy.current.toFixed(0)}/${shipStatus.energy.max} (${shipStatus.energy.percentage.toFixed(1)}%)
                </span>
            </div>
        `;
        
        systemsGrid.innerHTML = '';
        systemsGrid.appendChild(statusHeader);
        
        // Create system cards
        for (const [systemName, systemStatus] of Object.entries(shipStatus.systems)) {
            const systemCard = this.createSystemCard(systemName, systemStatus);
            systemsGrid.appendChild(systemCard);
        }
    }
    
    /**
     * Create a system status card
     * @param {string} systemName - Name of the system
     * @param {Object} systemStatus - System status data
     * @returns {HTMLElement} System card element
     */
    createSystemCard(systemName, systemStatus) {
        const card = document.createElement('div');
        card.className = `system-card ${this.getSystemStatusClass(systemStatus)}`;
        card.dataset.systemName = systemName;
        
        const healthPercent = (systemStatus.health * 100).toFixed(1);
        const statusIcon = this.getSystemStatusIcon(systemStatus);
        const healthClass = this.getStatusClass(healthPercent);
        
        card.innerHTML = `
            <div class="system-header">
                <span class="system-icon">${statusIcon}</span>
                <span class="system-name">${this.formatSystemName(systemName)}</span>
            </div>
            <div class="system-info">
                <div class="health-bar">
                    <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
                </div>
                <div class="system-stats">
                    <span class="health-text">${healthPercent}%</span>
                    <span class="level-text">L${systemStatus.level}</span>
                </div>
            </div>
            <div class="system-status">
                <span class="status-text">${this.getSystemStatusText(systemStatus)}</span>
            </div>
        `;
        
        // Add click handler
        card.addEventListener('click', () => this.selectSystem(systemName));
        
        return card;
    }
    
    /**
     * Update system details panel
     */
    updateSystemDetails() {
        const detailsPanel = document.getElementById('system-details');
        if (!detailsPanel || !this.selectedSystem) {
            if (detailsPanel) {
                detailsPanel.innerHTML = '<h3>System Details</h3><p>Select a system to view details</p>';
            }
            return;
        }
        
        const system = this.ship.getSystem(this.selectedSystem);
        const shipStatus = this.ship.getStatus();
        const systemStatus = shipStatus.systems[this.selectedSystem];
        
        if (!system || !systemStatus) return;
        
        const systemData = system.getStatus();
        
        detailsPanel.innerHTML = `
            <div class="system-details-header">${this.formatSystemName(this.selectedSystem)} Details</div>
            <div class="detail-grid">
                <div class="detail-row">
                    <span class="detail-label">Health:</span>
                    <span class="detail-value ${this.getStatusClass(systemStatus.health * 100)}">${(systemStatus.health * 100).toFixed(1)}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Level:</span>
                    <span class="detail-value">Level ${systemStatus.level}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">State:</span>
                    <span class="detail-value status-${system.state}">${system.state}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Effectiveness:</span>
                    <span class="detail-value">${(system.getEffectiveness() * 100).toFixed(1)}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Operational:</span>
                    <span class="detail-value">${system.isOperational() ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Active:</span>
                    <span class="detail-value">${systemStatus.isActive ? '🟢 Yes' : '⚪ No'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Energy Usage:</span>
                    <span class="detail-value">${system.getEnergyConsumptionRate?.()} /sec</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Slot Cost:</span>
                    <span class="detail-value">${systemData.slotCost || 1}</span>
                </div>
            </div>
            
            ${this.getSystemSpecificDetails(this.selectedSystem, system)}
        `;
    }
    
    /**
     * Get system-specific details
     * @param {string} systemName - Name of the system
     * @param {System} system - System instance
     * @returns {string} HTML for system-specific details
     */
    getSystemSpecificDetails(systemName, system) {
        const systemData = system.getStatus();
        
        switch (systemName) {
            case 'warp_drive':
                return `
                    <div class="system-specific">
                        <h4>Warp Drive Capabilities</h4>
                        <div class="detail-row">
                            <span class="detail-label">Max Warp Factor:</span>
                            <span class="detail-value">${systemData.maxWarpFactor}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Current Factor:</span>
                            <span class="detail-value">${systemData.warpFactor}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Cooldown:</span>
                            <span class="detail-value">${(systemData.cooldownTime / 1000).toFixed(1)}s</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Can Warp:</span>
                            <span class="detail-value">${systemData.canWarp ? '✅ Yes' : '❌ No'}</span>
                        </div>
                    </div>
                `;
            case 'shields':
                return `
                    <div class="system-specific">
                        <h4>Shield Status</h4>
                        <div class="detail-row">
                            <span class="detail-label">Shield Capacity:</span>
                            <span class="detail-value">${systemData.maxShieldCapacity || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Current Shields:</span>
                            <span class="detail-value">${systemData.currentShieldCapacity || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Recharge Rate:</span>
                            <span class="detail-value">${systemData.rechargeRate || 'N/A'}/sec</span>
                        </div>
                    </div>
                `;
            case 'weapons':
                return `
                    <div class="system-specific">
                        <h4>Weapon Systems</h4>
                        <div class="detail-row">
                            <span class="detail-label">Damage Output:</span>
                            <span class="detail-value">${systemData.damageOutput || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Fire Rate:</span>
                            <span class="detail-value">${systemData.fireRate || 'N/A'}/sec</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Energy per Shot:</span>
                            <span class="detail-value">${systemData.energyPerShot || 'N/A'}</span>
                        </div>
                    </div>
                `;
            case 'impulse_engines':
                return `
                    <div class="system-specific">
                        <h4>Engine Performance</h4>
                        <div class="detail-row">
                            <span class="detail-label">Speed Bonus:</span>
                            <span class="detail-value">${((systemData.speedBonus || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Max Impulse:</span>
                            <span class="detail-value">${systemData.maxImpulse || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Current Impulse:</span>
                            <span class="detail-value">${systemData.currentImpulse || 0}</span>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }
    
    /**
     * Update repair section
     */
    updateRepairSection() {
        const repairSection = document.getElementById('repair-section');
        if (!repairSection) return;
        
        if (!this.selectedSystem) {
            repairSection.innerHTML = `
                <div class="repair-section-header">Repair Options</div>
                <p>Select a system to view repair options</p>
            `;
            return;
        }
        
        const system = this.ship.getSystem(this.selectedSystem);
        if (!system) return;
        
        const healthPercent = system.healthPercentage * 100;
        
        repairSection.innerHTML = `
            <div class="repair-section-header">Repair Options</div>
            <div class="repair-kits">
                <div class="repair-kit" data-type="basic">
                    <span class="kit-name">Basic Repair Kit</span>
                    <span class="kit-info">Repairs 25% | Cost: 100 credits</span>
                    <span class="kit-count">Available: ${this.repairKits.basic.count}</span>
                    <button class="repair-button" onclick="window.damageControl?.performRepair('basic')">Use</button>
                </div>
                <div class="repair-kit" data-type="advanced">
                    <span class="kit-name">Advanced Repair Kit</span>
                    <span class="kit-info">Repairs 50% | Cost: 250 credits</span>
                    <span class="kit-count">Available: ${this.repairKits.advanced.count}</span>
                    <button class="repair-button" onclick="window.damageControl?.performRepair('advanced')">Use</button>
                </div>
                <div class="repair-kit" data-type="emergency">
                    <span class="kit-name">Emergency Repair Kit</span>
                    <span class="kit-info">Full Repair | Cost: 500 credits</span>
                    <span class="kit-count">Available: ${this.repairKits.emergency.count}</span>
                    <button class="repair-button" onclick="window.damageControl?.performRepair('emergency')">Use</button>
                </div>
            </div>
        `;
        
        // Update repair kit availability and enable/disable buttons
        for (const [kitType, kitData] of Object.entries(this.repairKits)) {
            const kitElement = repairSection.querySelector(`[data-type="${kitType}"]`);
            const button = kitElement?.querySelector('.repair-button');
            const countElement = kitElement?.querySelector('.kit-count');
            
            if (countElement) {
                countElement.textContent = `Available: ${kitData.count}`;
            }
            
            if (button) {
                const canRepair = kitData.count > 0 && healthPercent < 100;
                button.disabled = !canRepair;
                button.textContent = canRepair ? 'Use' : (kitData.count === 0 ? 'None' : 'Full');
            }
        }
    }
    
    /**
     * Update damage log
     */
    updateDamageLog() {
        const logPanel = document.getElementById('damage-log');
        if (!logPanel) return;
        
        let logHTML = '<div class="damage-log-header">Damage Log</div>';
        
        // Show recent log entries
        const recentEntries = this.damageLog.slice(-10).reverse();
        
        if (recentEntries.length === 0) {
            logHTML += '<div class="log-entry info">No recent damage reports</div>';
        } else {
            for (const entry of recentEntries) {
                logHTML += `
                    <div class="log-entry ${entry.type}">
                        <span class="log-time">${entry.timestamp}</span>
                        <span class="log-message">${entry.message}</span>
                    </div>
                `;
            }
        }
        
        logPanel.innerHTML = logHTML;
    }
    
    /**
     * Select a system for detailed view
     * @param {string} systemName - Name of the system to select
     */
    selectSystem(systemName) {
        // Remove previous selection
        document.querySelectorAll('.system-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to new system
        const selectedCard = document.querySelector(`[data-system-name="${systemName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.selectedSystem = systemName;
        this.updateSystemDetails();
        this.updateRepairSection();
        
        console.log('Selected system:', systemName);
    }
    
    /**
     * Perform repair on selected system
     * @param {string} kitType - Type of repair kit to use
     */
    performRepair(kitType) {
        if (!this.selectedSystem || !this.ship) {
            this.showError('No system selected');
            return;
        }
        
        const kit = this.repairKits[kitType];
        if (!kit || kit.count <= 0) {
            this.showError('Repair kit not available');
            return;
        }
        
        const system = this.ship.getSystem(this.selectedSystem);
        if (!system) {
            this.showError('System not found');
            return;
        }
        
        if (system.healthPercentage >= 1.0) {
            this.showError('System is already at full health');
            return;
        }
        
        // Perform repair
        const beforeHealth = system.healthPercentage * 100;
        system.repair(kit.repairAmount);
        const afterHealth = system.healthPercentage * 100;
        
        // Consume repair kit
        kit.count--;
        
        // Add to damage log
        this.addLogEntry('repair', `Repaired ${this.formatSystemName(this.selectedSystem)} from ${beforeHealth.toFixed(1)}% to ${afterHealth.toFixed(1)}%`);
        
        // Update interface
        this.updateInterface();
        
        console.log(`Repaired ${this.selectedSystem} with ${kitType} kit`);
    }
    
    /**
     * Add entry to damage log
     * @param {string} type - Type of entry (damage, repair, info)
     * @param {string} message - Log message
     */
    addLogEntry(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        
        this.damageLog.push({
            type,
            message,
            timestamp
        });
        
        // Limit log size
        if (this.damageLog.length > this.maxLogEntries) {
            this.damageLog.shift();
        }
    }
    
    /**
     * Start automatic refresh
     */
    startRefresh() {
        this.refreshInterval = setInterval(() => {
            this.updateInterface();
        }, 1000); // Update every second
    }
    
    /**
     * Stop automatic refresh
     */
    stopRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', this.boundKeyHandler);
        
        // Click outside to close
        const overlay = document.getElementById('damage-control-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hide();
                }
            });
        }
    }
    
    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyPress(event) {
        if (!this.isVisible) return;
        
        switch (event.key.toLowerCase()) {
            case 'd':
            case 'escape':
            case 'a':
            case 'f':
                this.hide();
                event.preventDefault();
                break;
            case 'g':
                // Close damage control and activate galactic chart
                this.hide();
                this.activateGalacticChart();
                event.preventDefault();
                break;
            case 'l':
                // Close damage control and activate long range scanner
                this.hide();
                this.activateLongRangeScanner();
                event.preventDefault();
                break;
        }
    }
    
    /**
     * Activate galactic chart system
     */
    activateGalacticChart() {
        if (!this.ship) {
            console.warn('No ship available for galactic chart activation');
            return;
        }
        
        const chartSystem = this.ship.getSystem('galactic_chart');
        if (!chartSystem) {
            console.warn('No galactic chart system found on ship');
            return;
        }
        
        // Check if chart system can be activated
        if (!chartSystem.canActivate(this.ship)) {
            if (!chartSystem.isOperational()) {
                console.warn('Cannot activate Galactic Chart: System damaged or offline');
            } else {
                console.warn('Cannot activate Galactic Chart: Insufficient energy');
            }
            return;
        }
        
        // Activate the chart system
        if (chartSystem.activateChart(this.ship)) {
            // Trigger the view change through ViewManager if available
            if (window.viewManager) {
                window.viewManager.setView('GALACTIC');
            }
            console.log('Galactic Chart activated from Damage Control');
        } else {
            console.warn('Failed to activate Galactic Chart');
        }
    }
    
    /**
     * Activate long range scanner system
     */
    activateLongRangeScanner() {
        if (!this.ship) {
            console.warn('No ship available for long range scanner activation');
            return;
        }
        
        const scannerSystem = this.ship.getSystem('long_range_scanner');
        if (!scannerSystem) {
            console.warn('No long range scanner system found on ship');
            return;
        }
        
        // Check if scanner system can be activated
        if (!scannerSystem.canActivate(this.ship)) {
            if (!scannerSystem.isOperational()) {
                console.warn('Cannot activate Long Range Scanner: System damaged or offline');
            } else {
                console.warn('Cannot activate Long Range Scanner: Insufficient energy');
            }
            return;
        }
        
        // Start scanning operation
        const scanStarted = scannerSystem.startScan(this.ship);
        if (scanStarted) {
            // Trigger the view change through ViewManager if available
            if (window.viewManager) {
                window.viewManager.setView('SCANNER');
            }
            console.log('Long Range Scanner activated from Damage Control');
        } else {
            console.warn('Failed to start Long Range Scanner');
        }
    }
    
    /**
     * Remove interface from DOM
     */
    removeInterface() {
        const overlay = document.getElementById('damage-control-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.boundKeyHandler);
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.warn('Damage Control Interface:', message);
        this.addLogEntry('error', message);
        
        // Could also show a toast notification here
    }
    
    // Utility methods for formatting and styling
    
    getStatusClass(percentage) {
        if (percentage >= 75) return 'status-good';
        if (percentage >= 50) return 'status-fair';
        if (percentage >= 25) return 'status-poor';
        return 'status-critical';
    }
    
    getSystemStatusClass(systemStatus) {
        const health = systemStatus.health * 100;
        if (!systemStatus.canBeActivated) return 'system-disabled';
        if (health >= 75) return 'system-good';
        if (health >= 50) return 'system-fair';
        if (health >= 25) return 'system-poor';
        return 'system-critical';
    }
    
    getSystemStatusIcon(systemStatus) {
        if (!systemStatus.canBeActivated) return '💀';
        if (systemStatus.isActive) return '🟢';
        const health = systemStatus.health * 100;
        if (health >= 75) return '🔵';
        if (health >= 50) return '🟡';
        if (health >= 25) return '🟠';
        return '🔴';
    }
    
    getSystemStatusText(systemStatus) {
        if (!systemStatus.canBeActivated) return 'DISABLED';
        if (systemStatus.isActive) return 'ACTIVE';
        const health = systemStatus.health * 100;
        if (health >= 75) return 'NOMINAL';
        if (health >= 50) return 'DAMAGED';
        if (health >= 25) return 'CRITICAL';
        return 'FAILING';
    }
    
    formatSystemName(systemName) {
        return systemName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    /**
     * Add CSS styles for the interface
     */
    addCSS() {
        if (document.getElementById('damage-control-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'damage-control-styles';
        style.textContent = `
            .damage-control-overlay {
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
            
            .damage-control-container {
                width: 90%;
                max-width: 1200px;
                height: 80%;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #00ff41;
                border-radius: 0;
                display: flex;
                flex-direction: column;
                color: #00ff41;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
                position: relative;
                overflow: hidden;
            }
            
            .damage-control-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(
                    transparent 50%,
                    rgba(0, 255, 65, 0.03) 50%
                );
                background-size: 100% 4px;
                pointer-events: none;
                z-index: 1000;
            }
            
            .damage-control-header {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 10px 20px;
                position: relative;
            }
            
            .view-label {
                color: #00ff41;
                font-family: "Courier New", monospace;
                font-size: 20px;
                text-align: center;
                border: 1px solid #00ff41;
                padding: 5px 10px;
                min-width: 120px;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .close-button {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(0, 20, 0, 0.5);
                border: 1px solid #00ff41;
                color: #00ff41;
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 0;
                font-family: inherit;
                font-size: 16px;
                z-index: 1000;
                transition: all 0.2s ease;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-button:hover {
                background: #00ff41;
                color: #000;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .damage-control-content {
                flex: 1;
                display: grid;
                grid-template-columns: 1fr 300px 250px;
                gap: 15px;
                padding: 15px;
                overflow: hidden;
            }
            
            .systems-panel, .details-panel, .damage-log-panel {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid #00ff41;
                border-radius: 0;
                padding: 15px;
                overflow-y: auto;
            }
            
            .ship-status-header {
                grid-column: 1 / -1;
                background: rgba(0, 20, 0, 0.5);
                border: 1px solid #00ff41;
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 0;
            }
            
            .status-title {
                font-size: 18px;
                font-weight: bold;
                color: #00ff41;
                text-align: center;
                margin-bottom: 8px;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
                letter-spacing: 1px;
            }
            
            .status-info {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                gap: 20px;
            }
            
            .hull-status, .energy-status {
                flex: 1;
                text-align: center;
            }
            
            .systems-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
            }
            
            .system-card {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid #00ff41;
                border-radius: 0;
                padding: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .system-card:hover {
                border-color: #00ff41;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
                background: rgba(0, 255, 65, 0.1);
                transform: translateY(-1px);
            }
            
            .system-card.selected {
                border-color: #00ff41;
                box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
                background: rgba(0, 255, 65, 0.2);
                border-width: 2px;
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
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .health-bar {
                width: 100%;
                height: 8px;
                background: rgba(0, 255, 65, 0.2);
                border: 1px solid #00ff41;
                border-radius: 0;
                overflow: hidden;
                margin-bottom: 5px;
            }
            
            .health-fill {
                height: 100%;
                background: #00ff41;
                transition: width 0.3s ease;
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
            }
            
            .health-fill.critical {
                background: #ff4444;
                box-shadow: 0 0 5px rgba(255, 68, 68, 0.5);
            }
            
            .health-fill.poor {
                background: #ff8800;
                box-shadow: 0 0 5px rgba(255, 136, 0, 0.5);
            }
            
            .health-fill.fair {
                background: #ffff00;
                box-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
            }
            
            .system-info {
                margin-bottom: 5px;
            }
            
            .system-stats {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
            }
            
            .system-status {
                font-size: 10px;
                text-align: center;
                opacity: 0.8;
            }
            
            .system-good { border-color: #00ff41; }
            .system-fair { border-color: #ffff00; }
            .system-poor { border-color: #ff8800; }
            .system-critical { border-color: #ff4444; }
            .system-disabled { border-color: #666666; opacity: 0.6; }
            
            .detail-grid {
                display: grid;
                gap: 8px;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 3px 0;
                border-bottom: 1px solid rgba(0, 255, 65, 0.3);
            }
            
            .detail-label {
                color: rgba(0, 255, 65, 0.8);
                font-size: 13px;
            }
            
            .detail-value {
                color: #00ff41;
                font-size: 13px;
                font-weight: bold;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .status-good { color: #00ff41; }
            .status-fair { color: #ffff00; }
            .status-poor { color: #ff8800; }
            .status-critical { color: #ff4444; }
            
            .status-operational { color: #00ff41; }
            .status-critical { color: #ffff00; }
            .status-disabled { color: #ff4444; }
            
            .system-specific {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #00ff41;
            }
            
            .system-details-header, .repair-section-header, .damage-log-header {
                margin: 0 0 15px 0;
                color: #00ff41;
                border-bottom: 1px solid #00ff41;
                padding-bottom: 8px;
                font-size: 16px;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
                letter-spacing: 1px;
                font-weight: bold;
            }
            
            .system-specific h4 {
                margin: 0 0 10px 0;
                color: #00ff41;
                font-size: 16px;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
                letter-spacing: 1px;
            }
            
            .repair-section {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #00ff41;
            }
            
            .repair-kits {
                display: grid;
                gap: 10px;
            }
            
            .repair-kit {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid #00ff41;
                border-radius: 0;
                padding: 10px;
                display: grid;
                grid-template-columns: 1fr auto;
                grid-template-rows: auto auto;
                gap: 5px;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            
            .repair-kit:hover {
                background: rgba(0, 255, 65, 0.1);
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.2);
            }
            
            .kit-name {
                font-weight: bold;
                color: #00ff41;
            }
            
            .repair-button {
                grid-row: 1 / 3;
                background: rgba(0, 20, 0, 0.5);
                border: 1px solid #00ff41;
                color: #00ff41;
                padding: 8px 12px;
                border-radius: 0;
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                transition: all 0.2s ease;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .repair-button:hover:not(:disabled) {
                background: #00ff41;
                color: #000;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
                text-shadow: none;
            }
            
            .repair-button:disabled {
                background: rgba(100, 100, 100, 0.2);
                border-color: #666666;
                color: #999999;
                cursor: not-allowed;
                text-shadow: none;
            }
            
            .kit-info, .kit-count {
                color: rgba(0, 255, 65, 0.8);
                font-size: 11px;
            }
            
            .damage-log {
                display: flex;
                flex-direction: column;
                gap: 5px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .damage-log::-webkit-scrollbar,
            .systems-panel::-webkit-scrollbar,
            .details-panel::-webkit-scrollbar {
                width: 8px;
            }
            
            .damage-log::-webkit-scrollbar-track,
            .systems-panel::-webkit-scrollbar-track,
            .details-panel::-webkit-scrollbar-track {
                background: rgba(0, 255, 65, 0.1);
                border-radius: 0;
            }
            
            .damage-log::-webkit-scrollbar-thumb,
            .systems-panel::-webkit-scrollbar-thumb,
            .details-panel::-webkit-scrollbar-thumb {
                background-color: #00ff41;
                border-radius: 0;
                border: 2px solid transparent;
                background-clip: content-box;
            }
            
            .log-entry {
                background: rgba(0, 20, 0, 0.2);
                border-left: 3px solid #00ff41;
                padding: 6px 10px;
                border-radius: 0;
                font-size: 12px;
                margin-bottom: 2px;
                transition: all 0.2s ease;
            }
            
            .log-entry:hover {
                background: rgba(0, 255, 65, 0.1);
            }
            
            .log-entry.damage { border-left-color: #ff4444; }
            .log-entry.repair { border-left-color: #00ff41; }
            .log-entry.info { border-left-color: #00ff41; }
            .log-entry.error { border-left-color: #ff8800; }
            
            .log-time {
                color: rgba(0, 255, 65, 0.6);
                font-size: 10px;
                margin-right: 8px;
            }
            
            .log-message {
                color: #00ff41;
            }
            
            .damage-control-footer {
                padding: 12px 20px;
                border-top: 1px solid #00ff41;
                background: rgba(0, 20, 0, 0.3);
                text-align: center;
                font-size: 14px;
                color: rgba(0, 255, 65, 0.8);
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            @media (max-width: 1024px) {
                .damage-control-content {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto auto;
                }
                
                .systems-grid {
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
} 