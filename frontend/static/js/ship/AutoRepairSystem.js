/**
 * Auto-Repair System - Simplified damage control without repair kits
 * Provides emergency triage repairs in space using priority queues
 * 
 * Features:
 * - Simplified 10-point priority system (distribute 10 points among systems)
 * - Setting one system to 9 leaves 1 point, setting to 8 leaves 2 points, etc.
 * - Very slow repair rate (emergency triage only)
 * - No consumable items or inventory management
 * - Designed to get systems barely functional, not fully repaired
 */

export default class AutoRepairSystem {
    constructor(ship) {
        this.ship = ship;
        this.repairQueue = []; // Array of {systemName, priority}
        this.repairRate = 0.005; // 0.5% per second (very slow - 200 seconds for full repair)
        this.isActive = false;
        this.currentTarget = null;
        
        // Default priorities (simplified 10-point system)
        this.defaultPriorities = {
            'impulse_engines': 10,  // Start with impulse engines as priority
            'warp_drive': 0,        // All others start at 0
            'shields': 0,           
            'weapons': 0,           
            'target_computer': 0,   
            'energy_reactor': 0,    
            'hull_plating': 0,      
            'long_range_scanner': 0,
            'subspace_radio': 0,    
            'galactic_chart': 0     
        };
        
        this.priorities = { ...this.defaultPriorities };
        
        console.log('Auto-Repair System initialized with emergency triage protocols');
    }
    
    /**
     * Set repair priorities for systems
     * @param {Object} priorities - {systemName: priority} where priority 0-10 (0 = disabled)
     */
    setRepairPriorities(priorities) {
        this.priorities = { ...priorities };
        this.updateRepairQueue();
        console.log('Repair priorities updated:', this.priorities);
    }
    
    /**
     * Update the repair queue based on current priorities and system states
     */
    updateRepairQueue() {
        this.repairQueue = [];
        
        // Build queue from systems that need repair and have priority > 0
        for (const [systemName, system] of this.ship.systems) {
            const priority = this.priorities[systemName] || 0;
            if (priority > 0 && system.healthPercentage < 1.0) {
                this.repairQueue.push({
                    systemName,
                    priority,
                    health: system.healthPercentage
                });
            }
        }
        
        // Sort by priority (higher first), then by health (lower first for triage)
        this.repairQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.health - b.health; // Lower health first (more urgent)
        });
        
        // Update current target
        this.currentTarget = this.repairQueue.length > 0 ? this.repairQueue[0].systemName : null;
    }
    
    /**
     * Start auto-repair system
     */
    start() {
        this.isActive = true;
        this.updateRepairQueue();
        console.log('Auto-repair system ACTIVATED - Emergency triage protocols engaged');
    }
    
    /**
     * Stop auto-repair system
     */
    stop() {
        this.isActive = false;
        this.currentTarget = null;
        console.log('Auto-repair system DEACTIVATED');
    }
    
    /**
     * Toggle auto-repair system
     * @returns {boolean} New active state
     */
    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
        return this.isActive;
    }
    
    /**
     * Update auto-repair system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Update repair queue periodically to handle priority changes
        this.updateRepairQueue();
        
        if (!this.currentTarget || this.repairQueue.length === 0) return;
        
        const system = this.ship.getSystem(this.currentTarget);
        if (!system || system.healthPercentage >= 1.0) {
            // Current target is fully repaired or doesn't exist, update queue
            this.updateRepairQueue();
            return;
        }
        
        // Apply repair
        const repairAmount = this.repairRate * (deltaTime / 1000);
        const beforeHealth = system.healthPercentage;
        system.repair(repairAmount);
        const afterHealth = system.healthPercentage;
        
        // Log significant repair milestones
        const beforePercent = Math.floor(beforeHealth * 100);
        const afterPercent = Math.floor(afterHealth * 100);
        
        if (beforePercent !== afterPercent && afterPercent % 10 === 0) {
            console.log(`Auto-repair: ${this.currentTarget} reached ${afterPercent}% health`);
        }
        
        // Check if system is now functional (above 0% health)
        if (beforeHealth === 0 && afterHealth > 0) {
            console.log(`Auto-repair: ${this.currentTarget} restored to minimal functionality`);
        }
    }
    
    /**
     * Get current repair status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isActive: this.isActive,
            currentTarget: this.currentTarget,
            queueLength: this.repairQueue.length,
            repairRate: this.repairRate,
            priorities: { ...this.priorities },
            queue: [...this.repairQueue]
        };
    }
    
    /**
     * Get estimated time to repair current target to functional level (10%)
     * @returns {number} Estimated seconds, or null if no target
     */
    getEstimatedRepairTime() {
        if (!this.currentTarget) return null;
        
        const system = this.ship.getSystem(this.currentTarget);
        if (!system) return null;
        
        const currentHealth = system.healthPercentage;
        const targetHealth = Math.min(0.1, 1.0); // Repair to 10% or full if already above 10%
        
        if (currentHealth >= targetHealth) return 0;
        
        const healthNeeded = targetHealth - currentHealth;
        return Math.ceil(healthNeeded / this.repairRate);
    }
    
    /**
     * Reset priorities to defaults
     */
    resetPriorities() {
        this.priorities = { ...this.defaultPriorities };
        this.updateRepairQueue();
        console.log('Repair priorities reset to defaults');
    }
    
    /**
     * Set priority for a specific system
     * @param {string} systemName - Name of the system
     * @param {number} priority - Priority level (0-10, 0 = disabled)
     */
    setSystemPriority(systemName, priority) {
        this.priorities[systemName] = Math.max(0, Math.min(10, priority));
        this.updateRepairQueue();
    }
    
    /**
     * Get priority for a specific system
     * @param {string} systemName - Name of the system
     * @returns {number} Priority level (0-10)
     */
    getSystemPriority(systemName) {
        return this.priorities[systemName] || 0;
    }

    /**
     * Get priority for a specific system (alias for compatibility)
     * @param {string} systemName - Name of the system
     * @returns {number} Priority level (0-10)
     */
    getPriority(systemName) {
        return this.getSystemPriority(systemName);
    }

    /**
     * Set priority for a specific system with simplified 10-point system
     * @param {string} systemName - Name of the system
     * @param {number} priority - Priority level (0-10, 0 = disabled)
     */
    setPriority(systemName, priority) {
        const newPriority = Math.max(0, Math.min(10, priority));
        const oldPriority = this.priorities[systemName] || 0;
        
        // Calculate current total without this system
        const currentTotalWithoutThisSystem = this.getTotalPriority() - oldPriority;
        
        // Check if the new priority would exceed the 10-point limit
        if (currentTotalWithoutThisSystem + newPriority > 10) {
            // Need to reduce other systems to make room
            const excessPoints = (currentTotalWithoutThisSystem + newPriority) - 10;
            
            // Reduce other systems proportionally
            const otherSystems = Object.keys(this.priorities).filter(name => name !== systemName);
            const totalOtherPriority = currentTotalWithoutThisSystem;
            
            if (totalOtherPriority > 0) {
                // Reduce each system proportionally
                for (const otherSystem of otherSystems) {
                    const currentPriority = this.priorities[otherSystem] || 0;
                    const proportion = currentPriority / totalOtherPriority;
                    const reduction = excessPoints * proportion;
                    this.priorities[otherSystem] = Math.max(0, currentPriority - reduction);
                }
            } else {
                // If no other systems have priority, just set them all to 0
                for (const otherSystem of otherSystems) {
                    this.priorities[otherSystem] = 0;
                }
            }
        }
        
        // Set this system to the requested priority
        this.priorities[systemName] = newPriority;
        
        const finalTotal = this.getTotalPriority();
        const remainingPoints = 10 - finalTotal;
        
        console.log(`Priority system: ${systemName} set to ${newPriority}, total: ${finalTotal}/10, ${remainingPoints} points remaining`);
        
        this.updateRepairQueue();
    }

    /**
     * Get current repair target
     * @returns {string|null} Name of system being repaired, or null
     */
    getCurrentRepairTarget() {
        return this.currentTarget;
    }

    /**
     * Get total priority points allocated
     * @returns {number} Sum of all priority values
     */
    getTotalPriority() {
        return Object.values(this.priorities).reduce((sum, priority) => sum + priority, 0);
    }

    /**
     * Get remaining priority points available for allocation
     * @returns {number} Points remaining (10 - total allocated)
     */
    getRemainingPriority() {
        return 10 - this.getTotalPriority();
    }

    /**
     * Distribute remaining points to a specific system
     * @param {string} systemName - Name of the system to give remaining points to
     */
    allocateRemainingPoints(systemName) {
        const remaining = this.getRemainingPriority();
        if (remaining > 0) {
            this.priorities[systemName] = (this.priorities[systemName] || 0) + remaining;
            console.log(`Allocated ${remaining} remaining points to ${systemName}`);
            this.updateRepairQueue();
        }
    }
} 