/**
 * DockingModal - Modal interface for docking operations
 * Shows when docking conditions are met and ship is at correct speed
 */

export default class DockingModal {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.modal = null;
        this.isVisible = false;
        this.currentTarget = null;
        this.checkInterval = null;
        this.targetMonitorInterval = null;
        
        // Target preservation
        this.backupTarget = null;
        this.originalStarfieldTarget = null;
        this.targetVerificationId = null;
        
        // Cooldown tracking for cancelled targets
        this.cancelledTargets = new Map(); // targetName -> timestamp
        this.cooldownDuration = 30000; // 30 seconds cooldown
        
        // Debug state tracking to prevent spam - separated by message type
        this.lastDebugState = {
            nearbyCount: 0,
            closestTarget: null,
            distance: null,
            inRange: false,
            lastLogTime: 0
        };
        this.debugThrottleMs = 1000; // Main throttle: 1 second
        this.scanThrottleMs = 10000; // Scan throttle: 10 seconds for detailed scans
        this.lastScanLogTime = 0; // Separate timing for scan logs
        
        this.createModal();
        this.bindEvents();
        
        // Check docking conditions every 100ms when not docked
        this.startDockingCheck();
        
        // Start monitoring the target to see if it gets lost
        this.startTargetMonitoring();
        
        // Store reference to prevent loss
        this.preserveTargetReference();
        
        // NEW: Clean up old cancelled targets every 30 seconds
        this.startCooldownCleanup();
    }
    
    createModal() {
        // Create modal backdrop
        this.modal = document.createElement('div');
        this.modal.className = 'docking-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            font-family: "Courier New", monospace;
        `;
        
        // Create modal content
        const content = document.createElement('div');
        content.className = 'docking-modal-content';
        content.style.cssText = `
            background: rgba(0, 30, 0, 0.95);
            border: 3px solid #00ff41;
            border-radius: 8px;
            padding: 27px;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
            animation: dockingModalFadeIn 0.3s ease-out;
        `;
        
        // Create modal header
        const header = document.createElement('h2');
        header.style.cssText = `
            color: #00ff41;
            margin: 0 0 20px 0;
            font-size: 21.6px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 10px #00ff41;
        `;
        header.textContent = 'DOCKING AVAILABLE';
        
        // Create target info
        this.targetInfo = document.createElement('div');
        this.targetInfo.style.cssText = `
            color: #cccccc;
            margin: 0 0 20px 0;
            font-size: 14.4px;
            line-height: 1.4;
        `;
        
        // Create status info
        this.statusInfo = document.createElement('div');
        this.statusInfo.style.cssText = `
            color: #88ff88;
            margin: 0 0 30px 0;
            font-size: 12.6px;
            line-height: 1.6;
            padding: 13.5px;
            background: rgba(0, 255, 65, 0.1);
            border: 1px solid rgba(0, 255, 65, 0.3);
            border-radius: 4px;
        `;
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 20px;
            justify-content: center;
        `;
        
        // Create dock button
        this.dockButton = document.createElement('button');
        this.dockButton.style.cssText = `
            background: #00aa41;
            color: #000;
            border: none;
            padding: 10.8px 27px;
            font-family: "Courier New", monospace;
            font-size: 14.4px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 0 15px rgba(0, 170, 65, 0.4);
        `;
        this.dockButton.textContent = 'DOCK';
        
        // Create cancel button
        this.cancelButton = document.createElement('button');
        this.cancelButton.style.cssText = `
            background: transparent;
            color: #ff4444;
            border: 2px solid #ff4444;
            padding: 10.8px 27px;
            font-family: "Courier New", monospace;
            font-size: 14.4px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        this.cancelButton.textContent = 'CANCEL';
        
        // Add hover effects
        this.dockButton.addEventListener('mouseenter', () => {
            this.dockButton.style.filter = 'brightness(1.2)';
            this.dockButton.style.transform = 'scale(1.05)';
            this.dockButton.style.boxShadow = '0 0 20px rgba(0, 170, 65, 0.6)';
        });
        
        this.dockButton.addEventListener('mouseleave', () => {
            this.dockButton.style.filter = 'brightness(1)';
            this.dockButton.style.transform = 'scale(1)';
            this.dockButton.style.boxShadow = '0 0 15px rgba(0, 170, 65, 0.4)';
        });
        
        this.cancelButton.addEventListener('mouseenter', () => {
            this.cancelButton.style.background = '#ff4444';
            this.cancelButton.style.color = '#000';
            this.cancelButton.style.transform = 'scale(1.05)';
        });
        
        this.cancelButton.addEventListener('mouseleave', () => {
            this.cancelButton.style.background = 'transparent';
            this.cancelButton.style.color = '#ff4444';
            this.cancelButton.style.transform = 'scale(1)';
        });
        
        // Assemble modal
        buttonContainer.appendChild(this.dockButton);
        buttonContainer.appendChild(this.cancelButton);
        
        content.appendChild(header);
        content.appendChild(this.targetInfo);
        content.appendChild(this.statusInfo);
        content.appendChild(buttonContainer);
        
        this.modal.appendChild(content);
        document.body.appendChild(this.modal);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dockingModalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        // Dock button click
        this.dockButton.addEventListener('click', () => {
            console.log('🖱️ DOCK BUTTON CLICKED');
            console.log('🖱️ Event listener this.currentTarget:', this.currentTarget);
            console.log('🖱️ Event listener starfieldManager.currentTarget:', this.starfieldManager.currentTarget);
            console.log('🖱️ Modal isVisible:', this.isVisible);
            this.handleDock();
        });
        
        // Cancel button click
        this.cancelButton.addEventListener('click', () => {
            console.log('🖱️ CANCEL BUTTON CLICKED');
            console.log('🖱️ Cancel - this.currentTarget:', this.currentTarget);
            console.log('🖱️ Cancel - starfieldManager.currentTarget:', this.starfieldManager.currentTarget);
            
            // NEW: Record this target as cancelled to prevent immediate re-triggering
            const targetToRecord = this.currentTarget || this.starfieldManager.currentTarget;
            if (targetToRecord) {
                // Try to get target name from multiple sources
                const targetName = targetToRecord.name || 
                                 this.starfieldManager.solarSystemManager?.getCelestialBodyInfo(targetToRecord)?.name ||
                                 targetToRecord.userData?.name ||
                                 'unknown_target';
                
                const now = Date.now();
                this.cancelledTargets.set(targetName, now);
                console.log(`⏰ Added cooldown for target "${targetName}" - will not show modal again for ${this.cooldownDuration/1000} seconds`);
                
                // Also log for debugging - what kind of target object we have
                console.log('🔍 Target object keys:', Object.keys(targetToRecord));
                console.log('🔍 Target object:', targetToRecord);
            } else {
                console.warn('⚠️ No target to record for cooldown');
            }
            
            this.hide();
        });
        
        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                console.log('🖱️ BACKDROP CLICKED');
                
                // Add cooldown for backdrop click cancellation
                const targetToRecord = this.currentTarget || this.starfieldManager.currentTarget;
                if (targetToRecord) {
                    const targetName = targetToRecord.name || 
                                     this.starfieldManager.solarSystemManager?.getCelestialBodyInfo(targetToRecord)?.name ||
                                     targetToRecord.userData?.name ||
                                     'unknown_target';
                    
                    const now = Date.now();
                    this.cancelledTargets.set(targetName, now);
                    console.log(`⏰ Added cooldown for target "${targetName}" (backdrop click) - will not show modal again for ${this.cooldownDuration/1000} seconds`);
                }
                
                this.hide();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                console.log('⌨️ ESCAPE KEY PRESSED');
                
                // Add cooldown for escape key cancellation
                const targetToRecord = this.currentTarget || this.starfieldManager.currentTarget;
                if (targetToRecord) {
                    const targetName = targetToRecord.name || 
                                     this.starfieldManager.solarSystemManager?.getCelestialBodyInfo(targetToRecord)?.name ||
                                     targetToRecord.userData?.name ||
                                     'unknown_target';
                    
                    const now = Date.now();
                    this.cancelledTargets.set(targetName, now);
                    console.log(`⏰ Added cooldown for target "${targetName}" (escape key) - will not show modal again for ${this.cooldownDuration/1000} seconds`);
                }
                
                this.hide();
            }
        });
    }
    
    startDockingCheck() {
        // Check every 100ms for docking conditions
        this.checkInterval = setInterval(() => {
            this.checkDockingConditions();
        }, 100);
    }
    
    checkDockingConditions() {
        // Don't check if already docked or modal is showing
        if (this.starfieldManager.isDocked || this.isVisible) {
            return;
        }
        
        // Check if undock cooldown is active
        if (this.starfieldManager.undockCooldown && Date.now() < this.starfieldManager.undockCooldown) {
            // Only log occasionally to avoid spam
            if (!this.lastUndockCooldownLog || (Date.now() - this.lastUndockCooldownLog) > 5000) {
                const remaining = Math.ceil((this.starfieldManager.undockCooldown - Date.now()) / 1000);
                // Removed debug log - was causing spam
                this.lastUndockCooldownLog = Date.now();
            }
            return;
        }
        
        // Get nearby dockable objects
        const nearbyDockableObjects = this.findNearbyDockableObjects();
        
        if (nearbyDockableObjects.length === 0) {
            // Only log when state changes from having targets to no targets
            if (this.lastDebugState.nearbyCount > 0) {
                // Removed debug log - was causing spam
                this.lastDebugState.nearbyCount = 0;
                this.lastDebugState.closestTarget = null;
                this.lastDebugState.inRange = false;
            }
            
            // Clear cooldowns for targets that are no longer nearby (player moved away)
            if (this.cancelledTargets.size > 0) {
                let clearedCount = 0;
                for (const [targetName, timestamp] of this.cancelledTargets.entries()) {
                    // Check if we're now far from all dockable objects
                    // This allows the player to approach again after moving away
                    this.cancelledTargets.delete(targetName);
                    clearedCount++;
                    // Removed debug log - was causing spam
                }
                // Removed debug log - was causing spam
            }
            
            return; // No dockable objects nearby
        }
        
        // Use the closest dockable object
        const target = nearbyDockableObjects[0]; // Already sorted by distance
        const targetInfo = {
            ...nearbyDockableObjects[0].info,
            name: target.name // Ensure targetInfo has the correct name
        };
        const distance = nearbyDockableObjects[0].distance;
        const currentSpeed = this.starfieldManager.currentSpeed;
        const inRange = distance <= (targetInfo.dockingRange || 4.0);
        
        // Check if we should log debug info (only on state changes or throttled intervals)
        const now = Date.now();
        const stateChanged = (
            this.lastDebugState.nearbyCount !== nearbyDockableObjects.length ||
            this.lastDebugState.closestTarget !== target?.name ||
            Math.abs(this.lastDebugState.distance - distance) > 0.1 ||
            this.lastDebugState.inRange !== inRange
        );
        const throttleTimePassed = (now - this.lastDebugState.lastLogTime) > this.debugThrottleMs;
        
        // Only log detailed conditions when state changes, not continuously
        if (stateChanged) {
            // Removed debug logs - were causing spam
            
            // Update debug state
            this.lastDebugState = {
                nearbyCount: nearbyDockableObjects.length,
                closestTarget: target?.name,
                distance: distance,
                inRange: inRange,
                lastLogTime: now
            };
        }
        
        // Don't show for hostile targets
        if (targetInfo.diplomacy?.toLowerCase() === 'enemy') {
            if (stateChanged) {
                // Removed debug log - was causing spam
            }
            return;
        }
        
        // Check if this target was recently cancelled (cooldown check)
        const targetName = target.name || 
                          targetInfo?.name ||
                          target.userData?.name ||
                          'unknown_target';
        const cancelTimestamp = this.cancelledTargets.get(targetName);
        if (cancelTimestamp) {
            const timeSinceCancelled = Date.now() - cancelTimestamp;
            const remainingCooldown = this.cooldownDuration - timeSinceCancelled;
            
            if (remainingCooldown > 0) {
                if (stateChanged) {
                    // Removed debug log - was causing spam
                }
                return;
            } else {
                // Cooldown expired, remove it from the map
                this.cancelledTargets.delete(targetName);
                // Keep this important state change log
                console.log(`✅ Cooldown expired for target "${targetName}" - modal can appear again`);
            }
        }
        
        // Check if within docking range (REMOVED speed requirement - modal will auto-reduce speed)
        if (inRange) {
            // NEW: Check if player is going too fast - don't show modal if speed > 1
            if (currentSpeed > 1) {
                if (stateChanged) {
                    // Removed debug log - was causing spam
                }
                return;
            }
            
            // Removed debug logs - were causing spam
            this.show(target, targetInfo, distance, currentSpeed);
        }
    }
    
    // Find nearby dockable objects automatically (no targeting required)
    findNearbyDockableObjects() {
        const nearbyObjects = [];
        const playerPosition = this.starfieldManager.camera.position;
        
        // Check if we have a solar system manager
        if (!this.starfieldManager.solarSystemManager) {
            return nearbyObjects;
        }
        
        // Get celestial bodies using the proper method
        const celestialBodies = this.starfieldManager.solarSystemManager.getCelestialBodies();
        if (!celestialBodies || celestialBodies.size === 0) {
            return nearbyObjects;
        }
        
        // Separate throttling for different types of logs
        const now = Date.now();
        const shouldLogScan = (now - this.lastScanLogTime) > this.scanThrottleMs; // Every 10 seconds max
        const shouldLogStateChange = (now - this.lastDebugState.lastLogTime) > this.debugThrottleMs; // Every 1 second max
        
        if (shouldLogScan) {
            // Removed debug log - was causing spam
            this.lastScanLogTime = now;
        }
        
        // Track scan results for state change detection
        let foundInRange = false;
        let closestDistance = Infinity;
        let closestTarget = null;
        
        // Iterate through all celestial bodies in the current system (Map.forEach)
        celestialBodies.forEach((body, bodyId) => {
            // Only consider planets and moons (skip star)
            if (!bodyId.startsWith('planet_') && !bodyId.startsWith('moon_')) {
                return;
            }
            
            // Determine body type from the ID
            const bodyType = bodyId.startsWith('planet_') ? 'planet' : 'moon';
            
            // Get detailed info about this celestial body
            const bodyInfo = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(body);
            
            // Skip hostile targets
            if (bodyInfo && bodyInfo.diplomacy?.toLowerCase() === 'enemy') {
                return;
            }
            
            // Calculate distance
            const distance = this.starfieldManager.calculateDistance(playerPosition, body.position);
            
            // Determine docking range based on type
            let dockingRange = 1.5; // Default for moons
            if (bodyType === 'planet') {
                dockingRange = 4.0;
            }
            
            // Add dockingRange to the bodyInfo for consistency
            if (bodyInfo) {
                bodyInfo.dockingRange = dockingRange;
            }
            
            // Track closest target for state detection
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = body.name || bodyId;
            }
            
            // Check if within docking range
            if (distance <= dockingRange) {
                foundInRange = true;
                nearbyObjects.push({
                    ...body, // Include all body properties (name, position, etc.)
                    name: bodyInfo?.name || body.name || bodyId, // Ensure name is always present
                    type: bodyType, // Explicitly set the type
                    info: bodyInfo,
                    distance: distance,
                    dockingRange: dockingRange
                });
                
                // Removed debug logs - were causing spam
            }
        });
        
        // Sort by distance (closest first)
        nearbyObjects.sort((a, b) => a.distance - b.distance);
        
        // Detect state changes for important logging
        const stateChanged = (
            this.lastDebugState.nearbyCount !== nearbyObjects.length ||
            this.lastDebugState.closestTarget !== closestTarget ||
            this.lastDebugState.inRange !== foundInRange
        );
        
        // Only log count when it changes or during periodic full scans
        if (stateChanged && shouldLogStateChange) {
            // Removed debug logs - were causing spam
        } else if (shouldLogScan) {
            // Removed debug log - was causing spam
        }
        
        // Update state for next check
        if (stateChanged) {
            this.lastDebugState.nearbyCount = nearbyObjects.length;
            this.lastDebugState.closestTarget = closestTarget;
            this.lastDebugState.inRange = foundInRange;
        }
        
        return nearbyObjects;
    }
    
    show(target, targetInfo, distance, currentSpeed) {
        console.log('🎬 DockingModal.show() called with:', {target, targetInfo, distance});
        
        if (this.isVisible) {
            console.log('⚠️ Modal already visible, skipping show()');
            return;
        }
        
        // Enhanced target preservation - store multiple references
        this.currentTarget = target;
        this.backupTarget = target; // Immediate backup
        this.originalStarfieldTarget = this.starfieldManager.currentTarget; // Store original reference
        
        // Create unique verification ID for this docking session
        this.targetVerificationId = Math.random().toString(36).substr(2, 9);
        
        // Tag the target with our verification ID
        if (target) {
            target._dockingModalId = this.targetVerificationId;
            console.log('🔒 Target tagged with verification ID:', this.targetVerificationId);
        }
        
        console.log('🎯 Target references preserved:');
        console.log('  - currentTarget:', this.currentTarget?.name);
        console.log('  - backupTarget:', this.backupTarget?.name);
        console.log('  - originalStarfieldTarget:', this.originalStarfieldTarget?.name);
        console.log('  - verification ID:', this.targetVerificationId);
        
        this.isVisible = true;
        
        // Resolve target info if not provided and normalize fields
        let info = targetInfo;
        if (!info) {
            const resolved = this.starfieldManager.solarSystemManager?.getCelestialBodyInfo(target);
            info = resolved || {};
        }
        const name = info.name || target?.userData?.name || 'Unknown';
        const type = info.type || target?.userData?.type || 'Unknown';
        const diplomacyStatus = (info.diplomacy || info.faction || 'Unknown').toString();
        const diplomacyColor = this.getDiplomacyColor(diplomacyStatus);
        
        this.targetInfo.innerHTML = `
            <div><strong>Target:</strong> ${name}</div>
            <div><strong>Type:</strong> ${type}</div>
            <div><strong>Faction:</strong> <span style="color: ${diplomacyColor};">${diplomacyStatus}</span></div>
        `;
        
        // Display station services instead of docking requirements
        const servicesHTML = this.getStationServices({ ...info, name, type }, diplomacyStatus, diplomacyColor);
        
        this.statusInfo.innerHTML = servicesHTML;
        
        // Show modal
        this.modal.style.display = 'flex';
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Start target monitoring to detect any loss
        this.startTargetMonitoring();
        
        console.log('✅ Modal displayed successfully');
    }
    
    startTargetMonitoring() {
        // Clear any existing monitoring
        if (this.targetMonitorInterval) {
            clearInterval(this.targetMonitorInterval);
        }

        // Track consecutive null checks to avoid false warnings
        let consecutiveNullChecks = 0;
        const maxNullChecks = 3; // Allow 3 consecutive null checks before warning

        // Monitor target every 500ms while modal is visible
        this.targetMonitorInterval = setInterval(() => {
            if (!this.isVisible) {
                clearInterval(this.targetMonitorInterval);
                this.targetMonitorInterval = null;
                return;
            }

            const modalTarget = this.currentTarget;
            const sfmTarget = this.starfieldManager.currentTarget;

            // Check if both targets are null or missing critical data
            const modalTargetValid = modalTarget && modalTarget.position;
            const sfmTargetValid = sfmTarget && sfmTarget.position;

            if (!modalTargetValid && !sfmTargetValid) {
                consecutiveNullChecks++;
                
                // Only warn after multiple consecutive null checks to avoid false alarms
                if (consecutiveNullChecks >= maxNullChecks) {
                    console.warn('🚨 TARGET LOST! (Consecutive null checks: ' + consecutiveNullChecks + ')', {
                        modalTarget: modalTarget?.name || 'null',
                        sfmTarget: sfmTarget?.name || 'null',
                        modalTargetValid,
                        sfmTargetValid
                    });
                    
                    // Try to restore target before giving up
                    if (this.restoreTargetReference()) {
                        console.log('✅ Target restored from backup');
                        consecutiveNullChecks = 0; // Reset counter after successful restore
                    } else {
                        // If we can't restore after max attempts, show error and close modal
                        if (consecutiveNullChecks >= maxNullChecks + 2) {
                            this.updateStatusWithError('Target connection lost - modal will close');
                            return;
                        }
                    }
                }
            } else {
                // Reset counter if we have valid targets
                consecutiveNullChecks = 0;
            }
        }, 500);
    }
    
    hide() {
        if (!this.isVisible) {
            return;
        }
        
        this.isVisible = false;
        this.currentTarget = null;
        this.backupTarget = null; // Clear backup reference
        this.originalStarfieldTarget = null; // Clear original reference
        this.targetVerificationId = null; // Clear verification ID
        this.modal.style.display = 'none';
        
        // Clear target monitoring
        if (this.targetMonitorInterval) {
            clearInterval(this.targetMonitorInterval);
            this.targetMonitorInterval = null;
        }
        
        console.log('🚫 Modal hidden, all target references cleared');
    }
    
    updateStatusWithError(errorMessage) {
        // Update status info to show error
        this.statusInfo.innerHTML = `
            <div style="color: #ff4444;">✗ ${errorMessage}</div>
            <div style="color: #888888; margin-top: 10px; font-size: 12px;">
                Modal will close automatically or press CANCEL to close now
            </div>
        `;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (this.isVisible) {
                this.hide();
            }
        }, 3000);
    }
    
    getStationServices(targetInfo, diplomacyStatus, diplomacyColor) {
        // Define available services based on target type and diplomacy
        const services = [];
        
        // Basic services available at all friendly/neutral stations
        if (diplomacyStatus.toLowerCase() !== 'hostile' && diplomacyStatus.toLowerCase() !== 'enemy') {
            services.push({
                name: 'Repair Services',
                description: 'Hull and system repairs',
                icon: '🔧',
                available: true
            });
            
            services.push({
                name: 'Energy Recharge',
                description: 'Full energy restoration',
                icon: '⚡',
                available: true
            });
            
            services.push({
                name: 'Ship Refitting',
                description: 'Upgrade ship systems',
                icon: '🛠️',
                available: true
            });
        }
        
        // Advanced services based on target type
        if (targetInfo.type === 'planet') {
            services.push({
                name: 'Trade Exchange',
                description: 'Buy/sell commodities',
                icon: '💰',
                available: diplomacyStatus.toLowerCase() === 'friendly'
            });
            
            services.push({
                name: 'Mission Board',
                description: 'Available contracts',
                icon: '📋',
                available: diplomacyStatus.toLowerCase() !== 'hostile'
            });
        }
        
        // Special services for friendly locations
        if (diplomacyStatus.toLowerCase() === 'friendly') {
            services.push({
                name: 'Ship Storage',
                description: 'Secure ship storage',
                icon: '🏪',
                available: true
            });
        }
        
        // Hostile/Limited services
        if (diplomacyStatus.toLowerCase() === 'hostile' || diplomacyStatus.toLowerCase() === 'enemy') {
            services.push({
                name: 'Emergency Repairs',
                description: 'Limited repair services',
                icon: '🚨',
                available: true,
                note: 'At premium rates'
            });
        }
        
        // Generate HTML for services
        let servicesHTML = `
            <div style="margin-bottom: 15px;">
                <div style="font-size: 16px; font-weight: bold; color: ${diplomacyColor}; margin-bottom: 8px;">
                    STATION SERVICES
                </div>
            </div>
        `;
        
        if (services.length === 0) {
            servicesHTML += `
                <div style="color: #ff4444; text-align: center; padding: 10px;">
                    ⚠️ NO SERVICES AVAILABLE<br>
                    <span style="font-size: 12px;">Hostile territory</span>
                </div>
            `;
        } else {
            servicesHTML += services.map(service => {
                const statusColor = service.available ? '#44ff44' : '#888888';
                const statusIcon = service.available ? '✓' : '✗';
                
                return `
                    <div style="display: flex; align-items: center; margin-bottom: 8px; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 3px;">
                        <span style="font-size: 16px; margin-right: 8px;">${service.icon}</span>
                        <div style="flex: 1;">
                            <div style="color: ${statusColor}; font-weight: bold;">
                                ${statusIcon} ${service.name}
                            </div>
                            <div style="font-size: 11px; color: #aaa;">
                                ${service.description}${service.note ? ` (${service.note})` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        return servicesHTML;
    }

    getDiplomacyColor(diplomacyStatus) {
        switch (diplomacyStatus.toLowerCase()) {
            case 'friendly':
            case 'allied':
                return '#00ff00'; // Bright green
            case 'neutral':
                return '#88ff88'; // Default green
            case 'hostile':
            case 'enemy':
                return '#ff4444'; // Red
            case 'cautious':
            case 'wary':
                return '#ffaa00'; // Orange
            default:
                return '#88ff88'; // Default green
        }
    }
    
    handleDock() {
        console.log('🚀 DOCK button pressed - starting docking process');
        
        let targetToUse = null;
        
        // First, try to use the modal's preserved target
        if (this.currentTarget && this.currentTarget._dockingModalId === this.targetVerificationId) {
            console.log('✅ Using verified modal target:', this.currentTarget.name);
            targetToUse = this.currentTarget;
        } else if (this.currentTarget) {
            console.log('⚠️ Modal target verification failed, trying backup restoration');
            
            // Try to restore from backup
            if (this.restoreTargetReference()) {
                console.log('✅ Target restored from backup');
                targetToUse = this.currentTarget;
            } else {
                console.warn('❌ Failed to restore target from backup');
            }
        } else {
            console.warn('❌ No currentTarget in modal, trying alternative methods');
            
            // Try to restore from backup first
            if (this.restoreTargetReference()) {
                console.log('✅ Target restored from backup methods');
                targetToUse = this.currentTarget;
            } else if (this.starfieldManager.currentTarget) {
                console.log('✅ Using StarfieldManager current target');
                targetToUse = this.starfieldManager.currentTarget;
                this.currentTarget = targetToUse; // Store it in modal
            }
        }
        
        // Final validation - ensure we have a valid target
        if (!targetToUse) {
            console.error('❌ CRITICAL: No target available for docking');
            console.error('❌ Modal target:', this.currentTarget);
            console.error('❌ StarfieldManager target:', this.starfieldManager.currentTarget);
            console.error('❌ Backup target:', this.backupTarget);
            this.updateStatusWithError('No target available for docking - please reopen modal');
            return;
        }
        
        // Additional validation - check target has required properties
        if (!targetToUse.position) {
            console.error('❌ Target missing position property:', targetToUse);
            this.updateStatusWithError('Invalid target data - please reopen modal');
            return;
        }
        
        console.log('🎯 Using target for docking:', {
            name: targetToUse.name,
            position: targetToUse.position,
            hasPosition: !!targetToUse.position,
            verificationId: targetToUse._dockingModalId
        });
        
        // Use the same validation logic as the original dock button
        if (this.starfieldManager.canDockWithLogging(targetToUse)) {
            console.log('✅ Docking validation passed - proceeding with dock');
            
            // ONLY hide modal AFTER successful docking validation
            this.hide();
            
            // Use dockWithDebug for better debugging/logging
            this.starfieldManager.dockWithDebug(targetToUse);
        } else {
            console.warn('❌ Docking validation failed');
            
            // Handle docking failure with proper feedback - keep modal open
            const info = this.starfieldManager.solarSystemManager?.getCelestialBodyInfo(targetToUse);
            const distance = this.starfieldManager.calculateDistance(
                this.starfieldManager.camera.position,
                targetToUse.position
            );
            
            // Calculate docking range for display
            const dockingRange = info?.type === 'planet' ? 4.0 : 1.5;
            
            console.log('📊 Docking failure details:', {
                distance: distance.toFixed(2),
                maxRange: dockingRange,
                currentSpeed: this.starfieldManager.currentSpeed,
                targetType: info?.type
            });
            
            if (distance > dockingRange) {
                // Keep modal open and update status to show error
                this.updateStatusWithError(`Docking failed: Distance ${distance.toFixed(1)}km > ${dockingRange}km range`);
                console.warn(`Docking failed - Distance: ${distance.toFixed(2)}km (max: ${dockingRange}km), Speed: ${this.starfieldManager.currentSpeed}`);
            } else {
                // Keep modal open and update status to show error - likely speed issue
                this.updateStatusWithError(`Docking failed: Speed too high (current: ${this.starfieldManager.currentSpeed})`);
                console.warn(`Docking failed - Distance: ${distance.toFixed(2)}km (max: ${dockingRange}km), Speed: ${this.starfieldManager.currentSpeed}`);
            }
        }
    }
    
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        if (this.targetMonitorInterval) {
            clearInterval(this.targetMonitorInterval);
            this.targetMonitorInterval = null;
        }
        
        // NEW: Clear cooldown cleanup interval
        if (this.cooldownCleanupInterval) {
            clearInterval(this.cooldownCleanupInterval);
            this.cooldownCleanupInterval = null;
        }
        
        // NEW: Clear cancelled targets map
        if (this.cancelledTargets) {
            this.cancelledTargets.clear();
            this.cancelledTargets = null;
        }
        
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        
        this.modal = null;
        this.currentTarget = null;
        this.backupTarget = null;
        this.originalStarfieldTarget = null; // Clean up new backup reference
        this.targetVerificationId = null;
        this.starfieldManager = null;
        
        // Removed debug log - was causing spam
    }
    
    preserveTargetReference() {
        // Store multiple backup references to prevent loss during the docking check loop
        if (this.currentTarget) {
            this.backupTarget = this.currentTarget;
            // Removed debug log - was causing spam
            
            // Also store the StarfieldManager's current target as additional backup
            if (this.starfieldManager.currentTarget) {
                this.originalStarfieldTarget = this.starfieldManager.currentTarget;
                // Removed debug log - was causing spam
            }
        }
    }
    
    restoreTargetReference() {
        // Try multiple restoration methods in order of preference
        if (!this.currentTarget) {
            // First try: restore from immediate backup
            if (this.backupTarget) {
                this.currentTarget = this.backupTarget;
                // Removed debug log - was causing spam
                return true;
            }
            
            // Second try: restore from original StarfieldManager target
            if (this.originalStarfieldTarget) {
                this.currentTarget = this.originalStarfieldTarget;
                // Removed debug log - was causing spam
                return true;
            }
            
            // Third try: get current StarfieldManager target (may have changed)
            if (this.starfieldManager.currentTarget) {
                this.currentTarget = this.starfieldManager.currentTarget;
                // Removed debug log - was causing spam
                return true;
            }
            
            console.warn('❌ Failed to restore target reference - all backup methods failed');
            return false;
        }
        
        // Target already exists, no restoration needed
        return true;
    }
    
    // NEW: Clean up old cancelled targets every 30 seconds
    startCooldownCleanup() {
        this.cooldownCleanupInterval = setInterval(() => {
            const now = Date.now();
            this.cancelledTargets.forEach((timestamp, targetName) => {
                if (now - timestamp > this.cooldownDuration) {
                    this.cancelledTargets.delete(targetName);
                    // Removed debug log - was causing spam
                }
            });
        }, 30000);
    }
    
    // Handle cancel cooldown to prevent spamming the modal
    handleCancelCooldown(target) {
        // Implementation of handleCancelCooldown method
    }
} 