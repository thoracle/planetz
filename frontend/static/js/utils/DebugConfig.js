/**
 * Debug Configuration Utility
 * Controls console logging levels to reduce spam
 */

export const DEBUG_LEVELS = {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    VERBOSE: 5
};

export const DEBUG_CATEGORIES = {
    CARD_CREATION: 'card_creation',
    CARD_GENERATION: 'card_generation',
    CARD_DISCOVERY: 'card_discovery',
    INVENTORY: 'inventory',
    DRAG_DROP: 'drag_drop',
    SHIP_CONFIG: 'ship_config',
    SYSTEM_DAMAGE: 'system_damage',
    WEAPONS: 'weapons',
    WARP: 'warp',
    GENERAL: 'general'
};

// Global debug configuration
export const DEBUG_CONFIG = {
    // Global debug level
    globalLevel: DEBUG_LEVELS.INFO,
    
    // Category-specific levels
    categories: {
        [DEBUG_CATEGORIES.CARD_CREATION]: DEBUG_LEVELS.WARN,     // Reduce NFT card creation spam
        [DEBUG_CATEGORIES.CARD_GENERATION]: DEBUG_LEVELS.WARN,   // Reduce card generation spam
        [DEBUG_CATEGORIES.CARD_DISCOVERY]: DEBUG_LEVELS.INFO,    // Keep discovery messages
        [DEBUG_CATEGORIES.INVENTORY]: DEBUG_LEVELS.INFO,         // Keep inventory messages
        [DEBUG_CATEGORIES.DRAG_DROP]: DEBUG_LEVELS.DEBUG,        // Keep drag/drop for debugging
        [DEBUG_CATEGORIES.SHIP_CONFIG]: DEBUG_LEVELS.INFO,       // Keep ship config messages
        [DEBUG_CATEGORIES.SYSTEM_DAMAGE]: DEBUG_LEVELS.INFO,     // Keep damage messages
        [DEBUG_CATEGORIES.WEAPONS]: DEBUG_LEVELS.INFO,           // Keep weapon messages
        [DEBUG_CATEGORIES.WARP]: DEBUG_LEVELS.INFO,              // Keep warp messages
        [DEBUG_CATEGORIES.GENERAL]: DEBUG_LEVELS.INFO            // Default for uncategorized
    }
};

/**
 * Debug logger with level and category filtering
 */
export class DebugLogger {
    static log(level, category, message, ...args) {
        const globalLevel = DEBUG_CONFIG.globalLevel;
        const categoryLevel = DEBUG_CONFIG.categories[category] || DEBUG_CONFIG.categories[DEBUG_CATEGORIES.GENERAL];
        
        // Check if we should log this message
        if (level > globalLevel || level > categoryLevel) {
            return;
        }
        
        // Format the message with category prefix
        const prefix = this.getLevelPrefix(level);
        const categoryPrefix = category ? `[${category.toUpperCase()}]` : '';
        const fullMessage = `${prefix}${categoryPrefix} ${message}`;
        
        // Use appropriate console method
        switch (level) {
            case DEBUG_LEVELS.ERROR:
                console.error(fullMessage, ...args);
                break;
            case DEBUG_LEVELS.WARN:
                console.warn(fullMessage, ...args);
                break;
            case DEBUG_LEVELS.INFO:
                console.info(fullMessage, ...args);
                break;
            case DEBUG_LEVELS.DEBUG:
            case DEBUG_LEVELS.VERBOSE:
                console.log(fullMessage, ...args);
                break;
            default:
                console.log(fullMessage, ...args);
        }
    }
    
    static getLevelPrefix(level) {
        switch (level) {
            case DEBUG_LEVELS.ERROR: return '❌ ';
            case DEBUG_LEVELS.WARN: return '⚠️ ';
            case DEBUG_LEVELS.INFO: return 'ℹ️ ';
            case DEBUG_LEVELS.DEBUG: return '🔍 ';
            case DEBUG_LEVELS.VERBOSE: return '📝 ';
            default: return '';
        }
    }
    
    // Convenience methods
    static error(category, message, ...args) {
        this.log(DEBUG_LEVELS.ERROR, category, message, ...args);
    }
    
    static warn(category, message, ...args) {
        this.log(DEBUG_LEVELS.WARN, category, message, ...args);
    }
    
    static info(category, message, ...args) {
        this.log(DEBUG_LEVELS.INFO, category, message, ...args);
    }
    
    static debug(category, message, ...args) {
        this.log(DEBUG_LEVELS.DEBUG, category, message, ...args);
    }
    
    static verbose(category, message, ...args) {
        this.log(DEBUG_LEVELS.VERBOSE, category, message, ...args);
    }
}

/**
 * Update debug configuration at runtime
 */
export function setDebugLevel(category, level) {
    if (category === 'global') {
        DEBUG_CONFIG.globalLevel = level;
    } else {
        DEBUG_CONFIG.categories[category] = level;
    }
}

/**
 * Get current debug configuration
 */
export function getDebugConfig() {
    return { ...DEBUG_CONFIG };
}

/**
 * Disable all logging (for production)
 */
export function disableAllLogging() {
    DEBUG_CONFIG.globalLevel = DEBUG_LEVELS.NONE;
}

/**
 * Enable verbose logging (for debugging)
 */
export function enableVerboseLogging() {
    DEBUG_CONFIG.globalLevel = DEBUG_LEVELS.VERBOSE;
    Object.keys(DEBUG_CONFIG.categories).forEach(category => {
        DEBUG_CONFIG.categories[category] = DEBUG_LEVELS.VERBOSE;
    });
} 