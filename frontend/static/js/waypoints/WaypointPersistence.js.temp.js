/**
 * WaypointPersistence - Waypoint save/load system
 * 
 * Handles persistence of waypoint data using localStorage and optional
 * file-based backup. Ensures waypoint state survives browser refresh.
 */

// Storage keys
const STORAGE_KEYS = {
    WAYPOINTS: 'planetz_waypoints',
    WAYPOINT_CHAINS: 'planetz_waypoint_chains',
    WAYPOINT_METRICS: 'planetz_waypoint_metrics',
    WAYPOINT_CONFIG: 'planetz_waypoint_config'
};

// Persistence configuration
const PERSISTENCE_CONFIG = {
    autoSaveInterval: 30000,    // Auto-save every 30 seconds
    maxBackupFiles: 5,          // Keep 5 backup files
    compressionEnabled: true,   // Compress data before storage
    encryptionEnabled: false    // Encryption (future feature)
};

export class WaypointPersistence {
    constructor() {
        this.autoSaveTimer = null;
        this.lastSaveTime = null;
        this.saveInProgress = false;
        this.loadInProgress = false;
        
        // Performance metrics
        this.saveMetrics = {
            totalSaves: 0,
            totalSaveTime: 0,
            lastSaveSize: 0,
            errors: 0
        };
        
        this.loadMetrics = {
            totalLoads: 0,
            totalLoadTime: 0,
            lastLoadSize: 0,
            errors: 0
        };

        debug('WAYPOINTS', '💾 WaypointPersistence initialized');
        
        // Start auto-save if enabled
        this.startAutoSave();
    }

    /**
     * Save waypoints to storage
     * @param {Map} waypoints - Active waypoints map
     * @param {Map} chains - Waypoint chains map
     * @returns {Promise<boolean>} - Success status
     */
    async saveWaypoints(waypoints, chains = new Map()) {
        if (this.saveInProgress) {
            debug('WAYPOINTS', '⚠️ Save already in progress, skipping');
            return false;
        }

        const startTime = performance.now();
        this.saveInProgress = true;

        try {
            // Convert maps to serializable objects
            const waypointData = this.serializeWaypoints(waypoints);
            const chainData = this.serializeChains(chains);
            
            // Create save package
            const savePackage = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                waypoints: waypointData,
                chains: chainData,
                metadata: {
                    totalWaypoints: waypoints.size,
                    totalChains: chains.size,
                    saveSource: 'WaypointPersistence'
                }
            };

            // Compress if enabled
            const serializedData = PERSISTENCE_CONFIG.compressionEnabled ? 
                this.compressData(savePackage) : JSON.stringify(savePackage);

            // Save to localStorage
            localStorage.setItem(STORAGE_KEYS.WAYPOINTS, serializedData);
            
            // Update metrics
            const saveTime = performance.now() - startTime;
            this.saveMetrics.totalSaves++;
            this.saveMetrics.totalSaveTime += saveTime;
            this.saveMetrics.lastSaveSize = serializedData.length;
            this.lastSaveTime = new Date();

            debug('WAYPOINTS', `💾 Saved ${waypoints.size} waypoints, ${chains.size} chains (${saveTime.toFixed(2)}ms, ${serializedData.length} bytes)`);
            
            return true;

        } catch (error) {
            this.saveMetrics.errors++;
            console.error('Failed to save waypoints:', error);
            return false;
            
        } finally {
            this.saveInProgress = false;
        }
    }

    /**
     * Load waypoints from storage
     * @returns {Promise<Object>} - Loaded data {waypoints, chains}
     */
    async loadWaypoints() {
        if (this.loadInProgress) {
            debug('WAYPOINTS', '⚠️ Load already in progress, skipping');
            return { waypoints: new Map(), chains: new Map() };
        }

        const startTime = performance.now();
        this.loadInProgress = true;

        try {
            const serializedData = localStorage.getItem(STORAGE_KEYS.WAYPOINTS);
            
            if (!serializedData) {
                debug('WAYPOINTS', '💾 No saved waypoint data found');
                return { waypoints: new Map(), chains: new Map() };
            }

            // Decompress if needed
            const savePackage = PERSISTENCE_CONFIG.compressionEnabled ? 
                this.decompressData(serializedData) : JSON.parse(serializedData);

            // Validate save package
            if (!this.validateSavePackage(savePackage)) {
                throw new Error('Invalid save package format');
            }

            // Deserialize data
            const waypoints = this.deserializeWaypoints(savePackage.waypoints);
            const chains = this.deserializeChains(savePackage.chains);

            // Update metrics
            const loadTime = performance.now() - startTime;
            this.loadMetrics.totalLoads++;
            this.loadMetrics.totalLoadTime += loadTime;
            this.loadMetrics.lastLoadSize = serializedData.length;

            debug('WAYPOINTS', `💾 Loaded ${waypoints.size} waypoints, ${chains.size} chains (${loadTime.toFixed(2)}ms, ${serializedData.length} bytes)`);
            
            return { waypoints, chains };

        } catch (error) {
            this.loadMetrics.errors++;
            console.error('Failed to load waypoints:', error);
            
            // Return empty data on error
            return { waypoints: new Map(), chains: new Map() };
            
        } finally {
            this.loadInProgress = false;
        }
    }

    /**
     * Save waypoint metrics
     * @param {Object} metrics - Metrics data
     */
    saveMetrics(metrics) {
        try {
            const metricsData = {
                timestamp: new Date().toISOString(),
                ...metrics,
                persistence: {
                    save: this.saveMetrics,
                    load: this.loadMetrics
                }
            };

            localStorage.setItem(STORAGE_KEYS.WAYPOINT_METRICS, JSON.stringify(metricsData));
            debug('WAYPOINTS', '📊 Saved waypoint metrics');
            
        } catch (error) {
            console.error('Failed to save waypoint metrics:', error);
        }
    }

    /**
     * Load waypoint metrics
     * @returns {Object|null} - Metrics data or null
     */
    loadMetrics() {
        try {
            const serializedData = localStorage.getItem(STORAGE_KEYS.WAYPOINT_METRICS);
            return serializedData ? JSON.parse(serializedData) : null;
            
        } catch (error) {
            console.error('Failed to load waypoint metrics:', error);
            return null;
        }
    }

    /**
     * Clear all waypoint data from storage
     */
    clearStorage() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            debug('WAYPOINTS', '🗑️ Cleared all waypoint storage');
            
        } catch (error) {
            console.error('Failed to clear waypoint storage:', error);
        }
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (window.waypointManager) {
                this.saveWaypoints(
                    window.waypointManager.activeWaypoints,
                    window.waypointManager.waypointChains
                );
            }
        }, PERSISTENCE_CONFIG.autoSaveInterval);

        debug('WAYPOINTS', `⏰ Auto-save started (${PERSISTENCE_CONFIG.autoSaveInterval}ms interval)`);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            debug('WAYPOINTS', '⏰ Auto-save stopped');
        }
    }

    // ========== SERIALIZATION METHODS ==========

    /**
     * Serialize waypoints map to object
     * @param {Map} waypoints - Waypoints map
     * @returns {Object} - Serialized waypoints
     */
    serializeWaypoints(waypoints) {
        const serialized = {};
        
        for (const [id, waypoint] of waypoints) {
            // Only save persistent waypoint data
            serialized[id] = {
                id: waypoint.id,
                name: waypoint.name,
                missionId: waypoint.missionId,
                position: waypoint.position,
                triggerRadius: waypoint.triggerRadius,
                type: waypoint.type,
                status: waypoint.status,
                actions: waypoint.actions,
                metadata: waypoint.metadata,
                createdAt: waypoint.createdAt.toISOString(),
                
                // Only save interruption data if it exists
                ...(waypoint.interruptedAt && {
                    interruptedAt: waypoint.interruptedAt.toISOString(),
                    interruptionDuration: waypoint.interruptionDuration
                }),
                
                // Only save trigger data if it exists
                ...(waypoint.triggeredAt && {
                    triggeredAt: waypoint.triggeredAt.toISOString()
                })
            };
        }
        
        return serialized;
    }

    /**
     * Deserialize waypoints object to map
     * @param {Object} waypointData - Serialized waypoints
     * @returns {Map} - Waypoints map
     */
    deserializeWaypoints(waypointData) {
        const waypoints = new Map();
        
        for (const [id, data] of Object.entries(waypointData)) {
            // Reconstruct waypoint object
            const waypoint = {
                ...data,
                createdAt: new Date(data.createdAt),
                triggeredAt: data.triggeredAt ? new Date(data.triggeredAt) : null,
                interruptedAt: data.interruptedAt ? new Date(data.interruptedAt) : null,
                resumedAt: null // Reset on load
            };
            
            // Reset certain statuses on load
            if (waypoint.status === WaypointStatus.TRIGGERED) {
                waypoint.status = WaypointStatus.COMPLETED;
            }
            
            waypoints.set(id, waypoint);
        }
        
        return waypoints;
    }

    /**
     * Serialize chains map to object
     * @param {Map} chains - Chains map
     * @returns {Object} - Serialized chains
     */
    serializeChains(chains) {
        const serialized = {};
        
        for (const [id, chain] of chains) {
            serialized[id] = {
                chainId: chain.chainId,
                missionId: chain.missionId,
                waypointIds: chain.waypointIds,
                currentIndex: chain.currentIndex,
                status: chain.status
            };
        }
        
        return serialized;
    }

    /**
     * Deserialize chains object to map
     * @param {Object} chainData - Serialized chains
     * @returns {Map} - Chains map
     */
    deserializeChains(chainData) {
        const chains = new Map();
        
        for (const [id, data] of Object.entries(chainData)) {
            chains.set(id, data);
        }
        
        return chains;
    }

    // ========== COMPRESSION METHODS ==========

    /**
     * Compress data using simple string compression
     * @param {Object} data - Data to compress
     * @returns {string} - Compressed data
     */
    compressData(data) {
        // Simple compression using JSON.stringify with minimal whitespace
        // In a real implementation, you might use LZ-string or similar
        const jsonString = JSON.stringify(data);
        
        // Basic compression: remove unnecessary whitespace and use shorter keys
        return jsonString
            .replace(/\s+/g, ' ')
            .replace(/": "/g, '":"')
            .replace(/", "/g, '","');
    }

    /**
     * Decompress data
     * @param {string} compressedData - Compressed data
     * @returns {Object} - Decompressed data
     */
    decompressData(compressedData) {
        // For simple compression, just parse the JSON
        return JSON.parse(compressedData);
    }

    // ========== VALIDATION METHODS ==========

    /**
     * Validate save package format
     * @param {Object} savePackage - Save package to validate
     * @returns {boolean} - Whether package is valid
     */
    validateSavePackage(savePackage) {
        if (!savePackage || typeof savePackage !== 'object') {
            return false;
        }

        // Check required fields
        const requiredFields = ['version', 'timestamp', 'waypoints', 'chains'];
        for (const field of requiredFields) {
            if (!(field in savePackage)) {
                debug('WAYPOINTS', `⚠️ Missing required field in save package: ${field}`);
                return false;
            }
        }

        // Check version compatibility
        if (savePackage.version !== '1.0') {
            debug('WAYPOINTS', `⚠️ Unsupported save package version: ${savePackage.version}`);
            return false;
        }

        return true;
    }

    // ========== UTILITY METHODS ==========

    /**
     * Get storage usage information
     * @returns {Object} - Storage usage info
     */
    getStorageInfo() {
        const info = {
            totalSize: 0,
            itemSizes: {},
            available: true
        };

        try {
            for (const [name, key] of Object.entries(STORAGE_KEYS)) {
                const data = localStorage.getItem(key);
                const size = data ? data.length : 0;
                info.itemSizes[name] = size;
                info.totalSize += size;
            }

            // Estimate available space (rough approximation)
            const testKey = 'planetz_storage_test';
            const testData = 'x'.repeat(1024); // 1KB test
            
            try {
                localStorage.setItem(testKey, testData);
                localStorage.removeItem(testKey);
                info.available = true;
            } catch (e) {
                info.available = false;
            }

        } catch (error) {
            console.error('Failed to get storage info:', error);
            info.available = false;
        }

        return info;
    }

    /**
     * Export waypoint data for backup
     * @returns {string} - Exported data as JSON string
     */
    exportData() {
        try {
            const exportData = {};
            
            for (const [name, key] of Object.entries(STORAGE_KEYS)) {
                const data = localStorage.getItem(key);
                if (data) {
                    exportData[name] = data;
                }
            }

            exportData.exportTimestamp = new Date().toISOString();
            exportData.exportVersion = '1.0';

            return JSON.stringify(exportData, null, 2);

        } catch (error) {
            console.error('Failed to export waypoint data:', error);
            return null;
        }
    }

    /**
     * Import waypoint data from backup
     * @param {string} importData - Imported data as JSON string
     * @returns {boolean} - Success status
     */
    importData(importData) {
        try {
            const data = JSON.parse(importData);
            
            // Validate import data
            if (!data.exportVersion || !data.exportTimestamp) {
                throw new Error('Invalid import data format');
            }

            // Import each storage item
            for (const [name, key] of Object.entries(STORAGE_KEYS)) {
                if (data[name]) {
                    localStorage.setItem(key, data[name]);
                }
            }

            debug('WAYPOINTS', `📥 Imported waypoint data from ${data.exportTimestamp}`);
            return true;

        } catch (error) {
            console.error('Failed to import waypoint data:', error);
            return false;
        }
    }

    /**
     * Get persistence statistics
     * @returns {Object} - Persistence statistics
     */
    getStatistics() {
        return {
            save: {
                ...this.saveMetrics,
                averageSaveTime: this.saveMetrics.totalSaves > 0 ? 
                    this.saveMetrics.totalSaveTime / this.saveMetrics.totalSaves : 0
            },
            load: {
                ...this.loadMetrics,
                averageLoadTime: this.loadMetrics.totalLoads > 0 ? 
                    this.loadMetrics.totalLoadTime / this.loadMetrics.totalLoads : 0
            },
            lastSaveTime: this.lastSaveTime,
            autoSaveEnabled: this.autoSaveTimer !== null,
            storageInfo: this.getStorageInfo()
        };
    }

    /**
     * Cleanup old data and optimize storage
     */
    cleanup() {
        try {
            // This could implement cleanup of old backup files,
            // compression of old data, etc.
            debug('WAYPOINTS', '🧹 Storage cleanup completed');
            
        } catch (error) {
            console.error('Failed to cleanup waypoint storage:', error);
        }
    }
}

// Global persistence instance
let persistenceInstance = null;

/**
 * Get or create global persistence instance
 * @returns {WaypointPersistence} - Persistence instance
 */
export function getWaypointPersistence() {
    if (!persistenceInstance) {
        persistenceInstance = new WaypointPersistence();
    }
    return persistenceInstance;
}

module.exports = WaypointPersistence;
