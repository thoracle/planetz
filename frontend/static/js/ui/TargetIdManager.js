/**
 * TargetIdManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages target ID normalization and discovery status checking.
 *
 * Features:
 * - Sector-prefixed ID generation for all targets
 * - Star Charts ID compatibility
 * - Discovery status checking via StarChartsManager
 * - Target data normalization
 */

import { debug } from '../debug.js';

export class TargetIdManager {
    /**
     * Create a TargetIdManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Discovery status cache to prevent spam logging
        this._lastDiscoveryStatus = {};
    }

    /**
     * UNIVERSAL TARGET NORMALIZATION: Normalize target ID before any processing
     * This ensures ALL targets get proper sector-prefixed IDs regardless of source
     * @param {Object} targetData - Target data to normalize
     * @param {string} fallbackKey - Optional fallback key for ID generation
     * @returns {Object} Normalized target data with proper ID
     */
    normalizeTarget(targetData, fallbackKey = null) {
        if (!targetData) return targetData;

        // Clone to avoid modifying original
        const normalizedTarget = { ...targetData };

        // Apply unified ID normalization
        const normalizedId = this.normalizeTargetId(targetData, fallbackKey);
        if (normalizedId) {
            normalizedTarget.id = normalizedId;
        }

        return normalizedTarget;
    }

    /**
     * UNIFIED ID NORMALIZATION: Convert any target ID to proper sector-prefixed format
     * This is the SINGLE SOURCE OF TRUTH for target ID generation
     * @param {Object} targetData - Target data object
     * @param {string} fallbackKey - Optional fallback key
     * @returns {string|null} Normalized sector-prefixed ID
     */
    normalizeTargetId(targetData, fallbackKey = null) {
        if (!targetData) return null;

        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';

        // If target already has a proper sector-prefixed ID, return it
        if (targetData.id && typeof targetData.id === 'string' && targetData.id.match(/^[A-Z]\d+_/)) {
            return targetData.id;
        }

        // Generate sector-prefixed ID based on name and type
        if (targetData.name) {
            const cleanName = targetData.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
            let normalizedName;

            // Special handling for common celestial bodies
            switch (cleanName.toLowerCase()) {
                case 'terra prime':
                    normalizedName = 'terra_prime';
                    break;
                case 'luna':
                    normalizedName = 'luna';
                    break;
                case 'europa':
                    normalizedName = 'europa';
                    break;
                case 'sol':
                    normalizedName = 'star';
                    break;
                default:
                    normalizedName = cleanName.toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-z0-9_]/g, '');
                    break;
            }

            return `${currentSector}_${normalizedName}`;
        }

        // Fallback using key if provided
        if (fallbackKey) {
            const normalizedKey = fallbackKey.replace(/^(station_|planet_|moon_|star_)/, '');
            return `${currentSector}_${normalizedKey}`;
        }

        return null;
    }

    /**
     * Construct object ID for discovery system compatibility
     * Uses the existing normalizeTargetId method for consistency
     * @param {Object} targetData - Target data object
     * @returns {string|null} Object ID
     */
    constructObjectId(targetData) {
        return this.normalizeTargetId(targetData);
    }

    /**
     * Construct a proper sector-prefixed ID from target data (DEPRECATED - use normalizeTargetId)
     * @param {Object} targetData - Target data object
     * @returns {string|null} Star Charts compatible ID
     */
    constructStarChartsId(targetData) {
        if (!targetData) return null;

        // Get current sector from solarSystemManager
        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';
        const sectorPrefix = `${currentSector}_`;

        // If already has proper sector prefix, return it
        let objectId = targetData.id;
        if (objectId && objectId.toString().startsWith(sectorPrefix)) {
            return objectId;
        }

        if (!targetData.name) return null;

        // Clean the name by removing faction suffixes like "(friendly)", "(neutral)", etc.
        const cleanName = targetData.name.replace(/\s*\([^)]*\)\s*$/, '').trim();

        // Special handling for common celestial bodies
        let normalizedName;
        switch (cleanName.toLowerCase()) {
            case 'terra prime':
                normalizedName = 'terra_prime';
                break;
            case 'luna':
                normalizedName = 'luna';
                break;
            case 'europa':
                normalizedName = 'europa';
                break;
            case 'sol':
                normalizedName = 'star';
                break;
            default:
                // Construct ID from cleaned name for Star Charts compatibility
                // Remove invalid characters like # and replace spaces with underscores
                normalizedName = cleanName.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, ''); // Remove any non-alphanumeric characters except underscore
                break;
        }

        // Prevent double sector prefixes
        const lowerPrefix = sectorPrefix.toLowerCase();
        if (normalizedName.startsWith(lowerPrefix)) {
            return typeof normalizedName === 'string' ? normalizedName.replace(new RegExp(`^${lowerPrefix}`, 'i'), sectorPrefix) : normalizedName;
        } else {
            return `${sectorPrefix}${normalizedName}`;
        }
    }

    /**
     * Check if an object is discovered using StarChartsManager
     * @param {Object} targetData - Target data to check
     * @returns {boolean} True if discovered
     */
    isObjectDiscovered(targetData) {
        // Try to get StarChartsManager through viewManager
        const starChartsManager = this.tcm.viewManager?.navigationSystemManager?.starChartsManager;
        if (!starChartsManager) {
            // If no StarChartsManager available, assume discovered (fallback behavior)
            return true;
        }

        // Use consolidated ID construction method
        const objectId = this.constructStarChartsId(targetData);
        if (!objectId) {
            // If we can't determine object ID, assume discovered
            return true;
        }

        // Check discovery status - ALWAYS get fresh status, don't rely on cache
        const isDiscovered = starChartsManager.isDiscovered(objectId);

        // Only log discovery status changes (with heavy rate limiting to prevent spam)
        if (this._lastDiscoveryStatus[objectId] !== isDiscovered) {
            // Only log 0.1% of status changes to prevent spam
            if (Math.random() < 0.001) {
                debug('TARGETING', `Discovery status changed: ${objectId} -> ${isDiscovered}`);
            }
            this._lastDiscoveryStatus[objectId] = isDiscovered;

            // Clean up old entries to prevent memory leak (keep only last 100 entries)
            const entries = Object.keys(this._lastDiscoveryStatus);
            if (entries.length > 100) {
                const toDelete = entries.slice(0, entries.length - 100);
                toDelete.forEach(key => delete this._lastDiscoveryStatus[key]);
            }
        }

        return isDiscovered;
    }

    /**
     * Clear discovery status cache
     */
    clearDiscoveryCache() {
        this._lastDiscoveryStatus = {};
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this._lastDiscoveryStatus = {};
    }
}
