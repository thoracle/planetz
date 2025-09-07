/**
 * Unified Player Credits Manager
 * 
 * Centralizes all credit management across the game to ensure consistency
 * between missions, market, repair services, and ship upgrades.
 */

export class PlayerCredits {
    constructor() {
        // Starting credits amount
        this.credits = 50000;
        
        // Track all UI elements that display credits for automatic updates
        this.creditDisplays = new Set();
        
        // Transaction history for debugging
        this.transactionHistory = [];
        
        console.log('💰 PlayerCredits: Initialized with', this.credits, 'credits');
    }
    
    /**
     * Get current credits
     * @returns {number} Current credit balance
     */
    getCredits() {
        return this.credits;
    }
    
    /**
     * Set credits to specific amount (use for resets/cheats)
     * @param {number} amount - New credit amount
     */
    setCredits(amount) {
        const oldCredits = this.credits;
        this.credits = Math.max(0, Number(amount) || 0);
        
        this.logTransaction('SET', 0, this.credits, `Reset from ${oldCredits} to ${this.credits}`);
        this.updateDisplays();
        
        console.log(`💰 PlayerCredits: Set to ${this.credits} (was ${oldCredits})`);
    }
    
    /**
     * Add credits (from missions, sales, etc.)
     * @param {number} amount - Amount to add
     * @param {string} reason - Reason for transaction
     * @returns {boolean} Success
     */
    addCredits(amount, reason = 'Unknown') {
        amount = Number(amount) || 0;
        if (amount <= 0) return false;
        
        const oldCredits = this.credits;
        this.credits += amount;
        
        this.logTransaction('ADD', amount, this.credits, reason);
        this.updateDisplays();
        
        console.log(`💰 PlayerCredits: +${amount} credits (${reason}) - Total: ${this.credits}`);
        return true;
    }
    
    /**
     * Spend credits (for purchases, repairs, etc.)
     * @param {number} amount - Amount to spend
     * @param {string} reason - Reason for transaction
     * @returns {boolean} Success (false if insufficient funds)
     */
    spendCredits(amount, reason = 'Unknown') {
        amount = Number(amount) || 0;
        if (amount <= 0) return false;
        
        if (this.credits < amount) {
            console.warn(`💰 PlayerCredits: Insufficient funds - Need ${amount}, have ${this.credits}`);
            return false;
        }
        
        const oldCredits = this.credits;
        this.credits -= amount;
        
        this.logTransaction('SPEND', -amount, this.credits, reason);
        this.updateDisplays();
        
        console.log(`💰 PlayerCredits: -${amount} credits (${reason}) - Total: ${this.credits}`);
        return true;
    }
    
    /**
     * Check if player has enough credits
     * @param {number} amount - Amount to check
     * @returns {boolean} Whether player can afford it
     */
    canAfford(amount) {
        return this.credits >= (Number(amount) || 0);
    }
    
    /**
     * Register a UI element that displays credits for automatic updates
     * @param {HTMLElement} element - Element to update
     * @param {Function} updateCallback - Optional custom update function
     */
    registerDisplay(element, updateCallback = null) {
        if (!element) return;
        
        const display = {
            element: element,
            updateCallback: updateCallback || ((el, credits) => {
                el.textContent = credits.toLocaleString();
            })
        };
        
        this.creditDisplays.add(display);
        
        // Update immediately
        display.updateCallback(element, this.credits);
        
        console.log('💰 PlayerCredits: Registered display element');
    }
    
    /**
     * Unregister a display element
     * @param {HTMLElement} element - Element to unregister
     */
    unregisterDisplay(element) {
        this.creditDisplays.forEach(display => {
            if (display.element === element) {
                this.creditDisplays.delete(display);
            }
        });
    }
    
    /**
     * Update all registered display elements
     */
    updateDisplays() {
        this.creditDisplays.forEach(display => {
            try {
                if (display.element && display.element.isConnected) {
                    display.updateCallback(display.element, this.credits);
                } else {
                    // Remove disconnected elements
                    this.creditDisplays.delete(display);
                }
            } catch (error) {
                console.warn('💰 PlayerCredits: Error updating display:', error);
            }
        });
    }
    
    /**
     * Log transaction for debugging and history
     * @param {string} type - Transaction type (ADD, SPEND, SET)
     * @param {number} amount - Amount changed
     * @param {number} newBalance - New balance after transaction
     * @param {string} reason - Reason for transaction
     */
    logTransaction(type, amount, newBalance, reason) {
        const transaction = {
            timestamp: new Date().toISOString(),
            type: type,
            amount: amount,
            newBalance: newBalance,
            reason: reason
        };
        
        this.transactionHistory.push(transaction);
        
        // Keep only last 100 transactions
        if (this.transactionHistory.length > 100) {
            this.transactionHistory.shift();
        }
    }
    
    /**
     * Get transaction history
     * @param {number} limit - Max number of recent transactions
     * @returns {Array} Transaction history
     */
    getTransactionHistory(limit = 10) {
        return this.transactionHistory.slice(-limit);
    }
    
    /**
     * Reset credits to starting amount (for game restart)
     */
    reset() {
        this.setCredits(50000);
        this.transactionHistory = [];
        console.log('💰 PlayerCredits: Reset to starting amount');
    }
    
    /**
     * Get formatted credits string
     * @returns {string} Formatted credits with commas
     */
    getFormattedCredits() {
        return this.credits.toLocaleString();
    }
    
    /**
     * Serialize credits data for saving
     * @returns {Object} Serializable data
     */
    serialize() {
        return {
            credits: this.credits,
            transactionHistory: this.transactionHistory
        };
    }
    
    /**
     * Load credits data from save
     * @param {Object} data - Saved data
     */
    deserialize(data) {
        if (data && typeof data.credits === 'number') {
            this.credits = data.credits;
            this.transactionHistory = data.transactionHistory || [];
            this.updateDisplays();
            console.log('💰 PlayerCredits: Loaded from save data -', this.credits, 'credits');
        }
    }
}

// Create global singleton instance
export const playerCredits = new PlayerCredits();

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
    window.playerCredits = playerCredits;
}
