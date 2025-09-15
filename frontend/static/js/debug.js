/**
 * Debug Utility Module
 *
 * Provides a safe debug function that works before the global debug system is initialized.
 * All modules can import and use this instead of relying on window.debug being available.
 */

// Queue for debug calls made before SmartDebugManager is ready
let debugQueue = [];

// Flag to track if SmartDebugManager is initialized
let smartDebugReady = false;

/**
 * Process queued debug calls once SmartDebugManager is ready
 */
function processDebugQueue() {
    if (!smartDebugReady) return;

    while (debugQueue.length > 0) {
        const { channel, message } = debugQueue.shift();
        if (window.debug && typeof window.debug === 'function') {
            window.debug(channel, message);
        }
    }
}

/**
 * Safe debug function with fallback to console.log
 * @param {string} channel - Debug channel
 * @param {...any} args - Message arguments
 */
export function debug(channel, ...args) {
    const message = args.join(' ');

    // Check if SmartDebugManager is available via window.debug
    if (typeof window !== 'undefined' && window.debug && typeof window.debug === 'function') {
        try {
            // Mark as ready and process any queued calls
            if (!smartDebugReady) {
                smartDebugReady = true;
                processDebugQueue();
            }
            return window.debug(channel, message);
        } catch (error) {
            // Fallback if window.debug fails

        }
    }

    // Queue the debug call for later processing
    debugQueue.push({ channel, message });

    // Also do immediate fallback for critical debugging
    if (channel === 'P1') {

    }
}

/**
 * Check if debug system is initialized
 */
export function isDebugInitialized() {
    return typeof window !== 'undefined' && window.debug && typeof window.debug === 'function';
}

/**
 * Get current debug manager instance
 */
export function getDebugManager() {
    return typeof window !== 'undefined' ? window.smartDebugManager : null;
}

// Note: window.debug is set by SmartDebugManager in app.js
// This module provides the importable debug function for ES6 modules
