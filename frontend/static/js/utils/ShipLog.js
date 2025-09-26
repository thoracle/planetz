import { debug } from '../debug.js';

/**
 * ShipLog - Manages ship's log entries including ephemeral messages
 */
export class ShipLog {
    constructor() {
        this.entries = [];
        this.maxEntries = 100;
        
        // Initialize with default startup entries
        this.addEntry('system', 'System startup completed - All systems nominal');
        this.addEntry('system', 'Navigation computer online - Coordinates locked');
        this.addEntry('system', 'Weapon systems armed and ready');
        this.addEntry('system', 'Communications array operational');
        
        debug('UI', 'ShipLog initialized');
    }
    
    /**
     * Add an entry to the ship's log
     * @param {string} type - Entry type ('system', 'ephemeral', 'mission', 'combat', etc.)
     * @param {string} message - Log message
     * @param {string} title - Optional title for the entry
     */
    addEntry(type, message, title = null) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            message: message,
            title: title,
            timestamp: timestamp,
            stardate: this.generateStardate()
        };
        
        this.entries.unshift(entry); // Add to beginning (most recent first)
        
        // Limit log size
        if (this.entries.length > this.maxEntries) {
            this.entries.pop();
        }
        
        debug('UI', `📝 Ship's log entry added: [${type}] ${message}`);
        
        // Refresh ship's log display if it's currently visible
        this.refreshLogDisplay();
    }
    
    /**
     * Add ephemeral message to log (only if verbose mode is enabled)
     * @param {string} title - Message title
     * @param {string} message - Message content
     */
    addEphemeralEntry(title, message) {
        if (!window.gameConfig?.verbose) {
            return; // Don't log if verbose mode is disabled
        }
        
        const logMessage = title ? `${title}: ${message}` : message;
        this.addEntry('ephemeral', logMessage, title);
    }
    
    /**
     * Get recent entries for display
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Array of log entries
     */
    getRecentEntries(limit = 20) {
        return this.entries.slice(0, limit);
    }
    
    /**
     * Get entries by type
     * @param {string} type - Entry type to filter by
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Array of filtered log entries
     */
    getEntriesByType(type, limit = 20) {
        return this.entries.filter(entry => entry.type === type).slice(0, limit);
    }
    
    /**
     * Generate a stardate for log entries
     * @returns {string} Formatted stardate
     */
    generateStardate() {
        const now = new Date();
        const year = now.getFullYear();
        const dayOfYear = Math.floor((now - new Date(year, 0, 0)) / (1000 * 60 * 60 * 24));
        const timeOfDay = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
        
        return `${year}.${dayOfYear.toString().padStart(3, '0')}.${Math.floor(timeOfDay * 100).toString().padStart(2, '0')}`;
    }
    
    /**
     * Refresh the ship's log display if it's currently visible
     */
    refreshLogDisplay() {
        if (window.helpInterface && window.helpInterface.isVisible) {
            const logTab = document.getElementById('ships-log-tab');
            if (logTab && window.helpInterface.currentTab === 'ships-log') {
                // Refresh the ship's log content
                logTab.innerHTML = window.helpInterface.generateShipsLogContent();
            }
        }
    }
    
    /**
     * Clear all log entries
     */
    clearLog() {
        this.entries = [];
        debug('UI', 'Ship\'s log cleared');
        this.refreshLogDisplay();
    }
    
    /**
     * Export log entries as text
     * @returns {string} Formatted log text
     */
    exportLog() {
        let logText = '=== SHIP\'S LOG EXPORT ===\n\n';
        
        this.entries.forEach(entry => {
            logText += `[${entry.stardate}] [${entry.type.toUpperCase()}] ${entry.message}\n`;
        });
        
        return logText;
    }
}

// Create global ship log instance
window.shipLog = new ShipLog();

export default ShipLog;
