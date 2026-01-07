/**
 * SCMDiscoveryProcessor - Discovery processing and notification logic
 * Extracted from StarChartsManager.js to reduce file size.
 *
 * Handles:
 * - Discovery radius checking
 * - Batch discovery processing
 * - Discovery notifications
 * - Discovery state management
 * - PHASE 4: Syncs with GameObject.discovered state
 */

import { debug } from '../../debug.js';
import { DistanceCalculator } from '../../utils/DistanceCalculator.js';
import { GameObjectRegistry } from '../../core/GameObjectRegistry.js';

export class SCMDiscoveryProcessor {
    constructor(manager) {
        this.manager = manager;
        this._recentNotifications = new Map();
    }

    // Convenience accessors
    get discoveredObjects() { return this.manager.discoveredObjects; }
    get discoveryMetadata() { return this.manager.discoveryMetadata; }
    get discoveryTypes() { return this.manager.discoveryTypes; }
    get lastDiscoveryTime() { return this.manager.lastDiscoveryTime; }
    get performanceMetrics() { return this.manager.performanceMetrics; }
    get config() { return this.manager.config; }
    get viewManager() { return this.manager.viewManager; }
    get currentSector() { return this.manager.currentSector; }

    /**
     * Check discovery radius for nearby objects
     */
    checkDiscoveryRadius() {
        const now = Date.now();
        if (now - this.manager.lastDiscoveryCheck < this.manager.discoveryInterval) {
            return;
        }

        const startTime = performance.now();

        try {
            const playerPosition = this.manager.getPlayerPosition();
            if (!playerPosition) return;

            const discoveryRadius = this.manager.getEffectiveDiscoveryRadius();
            const nearbyObjects = this.manager.spatialGridHandler.getNearbyObjects(playerPosition, discoveryRadius);

            if (nearbyObjects.length > 0) {
                debug('STAR_CHARTS', `Discovery check: ${nearbyObjects.length} objects within ${discoveryRadius.toFixed(0)}km radius`);
                debug('STAR_CHARTS', `Nearby objects: ${nearbyObjects.map(obj => obj.name || obj.id).join(', ')}`);
            }

            this.batchProcessDiscoveries(nearbyObjects, playerPosition, discoveryRadius);
            this.manager.lastDiscoveryCheck = now;

        } catch (error) {
            debug('P1', 'Discovery check failed:', error);
        }

        const checkTime = performance.now() - startTime;
        this.performanceMetrics.discoveryCheckTime.push(checkTime);

        if (checkTime > 16) {
            debug('PERFORMANCE', `Discovery check exceeding frame budget: ${checkTime.toFixed(2)}ms`);
        }

        if (this.performanceMetrics.discoveryCheckTime.length > 100) {
            this.performanceMetrics.discoveryCheckTime.shift();
        }
    }

    /**
     * Process discoveries in batches to avoid frame drops
     */
    batchProcessDiscoveries(objects, playerPosition, discoveryRadius) {
        const undiscovered = objects.filter(obj => !this.isDiscovered(obj.id));
        const inRange = undiscovered.filter(obj => this.isWithinRange(obj, playerPosition, discoveryRadius));
        const discoveries = inRange.slice(0, this.config.maxDiscoveriesPerFrame);

        if (undiscovered.length > 0) {
            undiscovered.forEach(obj => {
                const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
                const distance = this.calculateDistance(objPos, playerPosition);
                const withinRange = this.isWithinRange(obj, playerPosition, discoveryRadius);

                debug('STAR_CHARTS', `   Has cartesianPosition: ${!!obj.cartesianPosition}`);

                if (withinRange) {
                    debug('STAR_CHARTS', `IN RANGE: ${obj.id} (${obj.type}) at ${distance.toFixed(1)}km - ready for discovery`);
                }
            });
        }

        if (discoveries.length > 0) {
            debug('STAR_CHARTS', `Discovery batch: ${inRange.length} in range -> ${discoveries.length} processing`);

            discoveries.forEach((obj, index) => {
                if (index === 0) {
                    this.processDiscovery(obj);
                } else {
                    const timeoutId = setTimeout(() => {
                        this.processDiscovery(obj);
                    }, index * 2000);
                    this.manager._pendingTimeouts.add(timeoutId);
                }
            });
        }
    }

    /**
     * Calculate distance between two positions
     */
    calculateDistance(pos1, pos2) {
        return DistanceCalculator.calculate(pos1, pos2);
    }

    /**
     * Check if object is within discovery range
     */
    isWithinRange(object, playerPosition, discoveryRadius) {
        const objPos = object.cartesianPosition || object.position || [0, 0, 0];

        if (!objPos || (Array.isArray(objPos) && objPos.length < 2)) {
            debug('STAR_CHARTS', `Invalid position for ${object.id}: ${objPos}`);
            return false;
        }

        const playerPos = this.ensure3DPosition(playerPosition);
        const distance = this.calculateDistance(objPos, playerPos);
        return distance <= discoveryRadius;
    }

    /**
     * Ensure position is 3D by adding z=0 if missing
     */
    ensure3DPosition(position) {
        if (!position || !Array.isArray(position)) {
            return [0, 0, 0];
        }

        if (position.length === 2) {
            return [position[0], position[1], 0];
        }

        return position;
    }

    /**
     * Process a new object discovery
     */
    processDiscovery(object) {
        this.addDiscoveredObject(object.id);
        this.performanceMetrics.discoveryCount++;
        debug('UTILITY', `Discovered: ${object.name} (${object.type})`);
    }

    /**
     * Get discovery category for pacing system
     */
    getDiscoveryCategory(objectType) {
        for (const [category, config] of Object.entries(this.discoveryTypes)) {
            if (config.types.includes(objectType)) {
                return category;
            }
        }
        return 'background';
    }

    /**
     * Check if discovery should trigger notification
     */
    shouldNotifyDiscovery(objectType) {
        return true; // Always notify for testing
    }

    /**
     * Show discovery notification
     */
    showDiscoveryNotification(object, category) {
        const notificationKey = `${object.id}_${object.name}`;
        const now = Date.now();
        const lastNotification = this._recentNotifications.get(notificationKey);

        if (lastNotification && (now - lastNotification) < 5000) {
            debug('STAR_CHARTS', `NOTIFICATION COOLDOWN: Skipping duplicate for ${object.name}`);
            return;
        }

        this._recentNotifications.set(notificationKey, now);
        debug('STAR_CHARTS', `SHOWING DISCOVERY NOTIFICATION: ${object.name} discovered!`);

        // Cleanup old entries
        if (this._recentNotifications.size > 50) {
            const entries = Array.from(this._recentNotifications.entries());
            const toDelete = entries.slice(0, entries.length - 50);
            toDelete.forEach(([key]) => this._recentNotifications.delete(key));
        }

        const config = this.discoveryTypes[category];

        // Play audio if specified
        if (config.audio) {
            this._playDiscoveryAudio(config.audio);
        }

        // Show notification
        const message = `${object.name} discovered!`;

        if (config.notification === 'prominent') {
            this.showProminentNotification(message);
        } else if (config.notification === 'subtle') {
            this.showSubtleNotification(message);
        } else {
            debug('STAR_CHARTS', message);
        }
    }

    _playDiscoveryAudio(audioFile) {
        let played = false;
        try {
            if (window.audioManager && typeof window.audioManager.playSound === 'function') {
                window.audioManager.playSound(audioFile);
                played = true;
            }
        } catch (e) {
            // Fall through to fallback
        }
        if (!played) {
            try {
                const audio = new Audio('/static/audio/blurb.mp3');
                audio.volume = 0.8;
                audio.play().catch(() => {});
            } catch (e) {
                // Ignore audio errors
            }
        }
    }

    /**
     * Show prominent discovery notification
     */
    showProminentNotification(message) {
        debug('STAR_CHARTS', `DISCOVERY NOTIFICATION: ${message}`);

        // Method 1: Use StarfieldManager's ephemeral HUD
        if (this.viewManager?.starfieldManager?.showHUDEphemeral) {
            try {
                this.viewManager.starfieldManager.showHUDEphemeral('DISCOVERY', message, 4000);
                debug('STAR_CHARTS', `Discovery notification sent to Ephemeral HUD`);
                return;
            } catch (e) {
                debug('STAR_CHARTS', `Ephemeral HUD notification failed: ${e.message}`);
            }
        }

        // Method 2: WeaponHUD fallback
        if (this.viewManager?.starfieldManager?.weaponHUD?.showUnifiedMessage) {
            try {
                this.viewManager.starfieldManager.weaponHUD.showUnifiedMessage(
                    message, 5000, 3, '#00ff41', '#00ff41', 'rgba(0, 0, 0, 0.9)'
                );
                debug('STAR_CHARTS', `Discovery notification sent to WeaponHUD`);
                return;
            } catch (e) {
                debug('STAR_CHARTS', `WeaponHUD notification failed: ${e.message}`);
            }
        }

        // Method 3: Create DOM element fallback
        this._createDOMNotification(message, 'prominent');
    }

    /**
     * Show subtle discovery notification
     */
    showSubtleNotification(message) {
        if (this.viewManager?.starfieldManager?.showHUDEphemeral) {
            this.viewManager.starfieldManager.showHUDEphemeral('DISCOVERY', message, 3000);
        } else {
            this._createDOMNotification(message, 'subtle');
        }
    }

    _createDOMNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `star-charts-discovery-notification ${type}`;
        notification.textContent = message;

        const isProminent = type === 'prominent';
        Object.assign(notification.style, {
            position: 'fixed',
            top: isProminent ? '20px' : '60px',
            left: isProminent ? '50%' : 'auto',
            right: isProminent ? 'auto' : '20px',
            transform: isProminent ? 'translateX(-50%)' : 'none',
            backgroundColor: isProminent ? 'rgba(0, 255, 68, 0.9)' : 'rgba(255, 255, 68, 0.7)',
            color: '#000',
            padding: '10px 20px',
            borderRadius: '5px',
            fontSize: isProminent ? '16px' : '14px',
            fontWeight: 'bold',
            zIndex: '10000',
            animation: 'fadeInOut 3s ease-in-out'
        });

        document.body.appendChild(notification);

        const timeoutId = setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        this.manager._pendingTimeouts.add(timeoutId);
    }

    /**
     * Check if object has been discovered
     * PHASE 4: Checks GameObject.discovered first, falls back to legacy Set
     */
    isDiscovered(input) {
        if (!input) {
            return false;
        }

        // Normalize ID for lookups
        let normalizedId = null;
        if (typeof input === 'string') {
            normalizedId = input.replace(/^a0_/i, 'A0_');
        } else if (typeof input === 'object' && this.manager.targetComputerManager?.constructObjectId) {
            const objectId = this.manager.targetComputerManager.constructObjectId(input);
            if (objectId) {
                normalizedId = objectId.replace(/^a0_/i, 'A0_');
            }
        }

        if (!normalizedId) {
            return false;
        }

        // PHASE 6: Check GameObject.discovered (single source of truth)
        const gameObject = GameObjectRegistry.getById(normalizedId);
        if (gameObject) {
            return gameObject.discovered === true;
        }

        // PHASE 6 FALLBACK: discoveredObjects Set still needed for:
        // - Objects created before GameObjectFactory integration
        // - Cross-sector persistence (registry is per-sector)
        if (this.discoveredObjects && this.discoveredObjects.has(normalizedId)) {
            debug('STAR_CHARTS', `FALLBACK: ${normalizedId} not in registry, using discoveredObjects Set`);
            return true;
        }

        return false;
    }

    /**
     * Add object to discovered list with metadata
     */
    addDiscoveredObject(objectId, discoveryMethod = 'proximity', source = 'player') {
        let normalizedId = typeof objectId === 'string' ? objectId : String(objectId);

        // Normalize ID
        normalizedId = normalizedId.replace(/^a0_/i, 'A0_');
        normalizedId = normalizedId.replace(/^A0_beacon_A0_/i, 'A0_');
        normalizedId = normalizedId.replace(/^A0_A0_/i, 'A0_');
        normalizedId = normalizedId.replace(/^A0_beacon_(navigation_beacon_)/, 'A0_$1');
        normalizedId = normalizedId.replace(/navigation_beacon_#(\d+)/, 'navigation_beacon_$1');
        normalizedId = normalizedId.replace(/^A0_station_/, 'A0_');

        debug('STAR_CHARTS', `ID NORMALIZATION: "${objectId}" -> "${normalizedId}"`);

        // Check if already discovered
        if (this.discoveredObjects.has(normalizedId)) {
            debug('STAR_CHARTS', `DUPLICATE DISCOVERY BLOCKED: ${normalizedId}`);
            const existing = this.discoveryMetadata.get(normalizedId);
            if (existing) {
                existing.lastSeen = new Date().toISOString();
                existing.source = source;
            }
            return;
        }

        // PHASE 4: Update GameObject.discovered state (single source of truth)
        const gameObject = GameObjectRegistry.getById(normalizedId);
        if (gameObject) {
            gameObject.discovered = true;
            debug('STAR_CHARTS', `Set GameObject.discovered = true for: ${normalizedId}`);
        } else {
            debug('STAR_CHARTS', `No GameObject found in registry for: ${normalizedId}`);
        }

        // DUAL-WRITE: Keep legacy Set in sync until Phase 6
        this.discoveredObjects.add(normalizedId);
        debug('STAR_CHARTS', `FIRST DISCOVERY: ${normalizedId} - Total: ${this.discoveredObjects.size}`);

        // Secondary lock for notification phase
        if (!this.manager._discoveryInProgress) this.manager._discoveryInProgress = new Set();
        if (this.manager._discoveryInProgress.has(normalizedId)) {
            debug('STAR_CHARTS', `NOTIFICATION IN PROGRESS: ${normalizedId} - skipping`);
            return;
        }
        this.manager._discoveryInProgress.add(normalizedId);

        // Add discovery metadata
        const discoveryData = {
            discoveredAt: new Date().toISOString(),
            discoveryMethod: discoveryMethod,
            source: source,
            sector: this.currentSector,
            firstDiscovered: true
        };

        this.discoveryMetadata.set(normalizedId, discoveryData);
        this.manager.saveDiscoveryState();
        debug('STAR_CHARTS', `DISCOVERED: ${normalizedId} (${discoveryMethod}) - Total: ${this.discoveredObjects.size}`);

        // Update achievement progress
        this.manager.updateAchievementProgress();

        // Get object data for notification
        const objectData = this.manager.getObjectById(objectId);
        if (objectData) {
            debug('STAR_CHARTS', `Object data found: ${objectData.name} (${objectData.type})`);

            if (this.shouldNotifyDiscovery(objectData.type)) {
                const category = this.getDiscoveryCategory(objectData.type);
                debug('STAR_CHARTS', `Discovery category: ${category}`);
                this.showDiscoveryNotification(objectData, category);
            }
        } else {
            debug('STAR_CHARTS', `No object data found for ${objectId}`);
        }

        // Trigger discovery callbacks
        this.manager.triggerDiscoveryCallbacks(normalizedId, discoveryData);

        // Force immediate target computer sync
        if (this.viewManager?.navigationSystemManager?.starChartsTargetComputerIntegration) {
            this.viewManager.navigationSystemManager.starChartsTargetComputerIntegration.syncTargetData();
            debug('STAR_CHARTS', `Triggered target computer sync for: ${normalizedId}`);
        }

        // Cleanup
        const timeoutId = setTimeout(() => {
            if (this.manager._discoveryInProgress) {
                this.manager._discoveryInProgress.delete(normalizedId);
            }
        }, 100);
        this.manager._pendingTimeouts.add(timeoutId);
    }
}
