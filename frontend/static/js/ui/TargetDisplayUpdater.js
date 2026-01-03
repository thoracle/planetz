/**
 * TargetDisplayUpdater
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles updating the target computer's display information.
 *
 * Features:
 * - Updates target info display based on current target
 * - Handles discovery status checks and wireframe recreation
 * - Generates sub-target HTML for sub-system targeting
 * - Updates HUD colors based on diplomacy
 * - Manages hull health display for ships/stations
 */

import { debug } from '../debug.js';

export class TargetDisplayUpdater {
    /**
     * Create a TargetDisplayUpdater
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
        this._lastLoggedTarget = null;
    }

    /**
     * Update target display information
     * Main entry point for display updates
     */
    updateTargetDisplay() {
        // Only log when target actually changes
        if (this._lastLoggedTarget !== this.tcm.currentTarget?.name) {
            debug('TARGETING', `🎯 TARGET_SWITCH: updateTargetDisplay() - target: ${this.tcm.currentTarget?.name || 'none'}, type: ${this.tcm.currentTarget?.type || 'unknown'}`);
            this._lastLoggedTarget = this.tcm.currentTarget?.name;
        }

        if (!this.tcm.targetComputerEnabled) {
            debug('INSPECTION', `🔍 Target display update skipped - target computer disabled`);
            return;
        }

        // Don't update display during power-up animation
        if (this.tcm.isPoweringUp) {
            debug('TARGETING', `🎯 updateTargetDisplay: Skipping due to power-up animation`);
            return;
        }

        // Check if we need to recreate wireframe due to discovery status change
        this.checkDiscoveryStatusChange();

        // Handle case where no target is selected
        if (!this.tcm.currentTarget) {
            this.showNoTargetDisplay();
            return;
        }

        // Get target position safely FIRST - before getting currentTargetData
        // This prevents the race condition where we get target data, set HUD colors,
        // then discover the target has no valid position and gets cleared
        const targetPos = this.tcm.getTargetPosition(this.tcm.currentTarget);
        if (!targetPos) {
            debug('P1', '🎯 Cannot calculate distance for range check - invalid target position');
            // Clear the target immediately to prevent inconsistent state
            this.tcm.clearCurrentTarget();
            return;
        }

        const currentTargetData = this.tcm.getCurrentTargetData();
        // Debug logging for target data issues
        if (!currentTargetData) {
            debug('TARGETING', `No currentTargetData for target: ${this.tcm.currentTarget?.name || 'unknown'}, targetIndex: ${this.tcm.targetIndex}, targetObjects.length: ${this.tcm.targetObjects.length}`);
            return;
        }

        const distance = this.tcm.calculateDistance(this.tcm.camera.position, targetPos);

        // Get target info for diplomacy status and actions
        const { info, isEnemyShip } = this.resolveTargetInfo(currentTargetData);

        // Update HUD border color based on diplomacy using consolidated logic
        const diplomacyColor = this.resolveDiplomacyColor(currentTargetData);

        this.tcm.targetHUD.style.borderColor = diplomacyColor;

        // Update wireframe container border color to match
        if (this.tcm.wireframeContainer) {
            this.tcm.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Get sub-target information
        const subTargetHTML = this.generateSubTargetHTML(currentTargetData, info, isEnemyShip, diplomacyColor);

        // Clear outOfRange flag if target is back within normal range
        this.checkRangeStatus(currentTargetData, distance);

        // Format distance for display
        const formattedDistance = currentTargetData.outOfRange ? 'Out of Range' : this.tcm.formatDistance(distance);

        // Create hull health section for enemy ships and stations
        const hullHealthSection = this.generateHullHealthSection(currentTargetData, info, isEnemyShip);

        // Determine text and background colors based on target type
        const { textColor, backgroundColor } = this.resolveDisplayColors(isEnemyShip, diplomacyColor);

        // Get display name and type based on discovery status
        const { displayName, displayType } = this.resolveDisplayNameAndType(currentTargetData, info, isEnemyShip);

        if (window?.DEBUG_TCM) debug('TARGETING', `🎯 DEBUG: Setting targetInfoDisplay.innerHTML with name: "${displayName}", type: "${displayType}", distance: "${formattedDistance}"`);

        // Update main target info display
        this.tcm.targetInfoDisplay.innerHTML = `
            <div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 12px;">${displayName}</div>
                <div style="font-size: 10px;">${displayType}</div>
                <div style="font-size: 10px;">${formattedDistance}</div>
                ${hullHealthSection}
            </div>
        `;

        // Update sub-system panel content and show/hide based on availability
        this.updateSubSystemPanel(subTargetHTML, diplomacyColor);

        if (window?.DEBUG_TCM) debug('TARGETING', `🎯 DEBUG: targetInfoDisplay.innerHTML set to:`, this.tcm.targetInfoDisplay.innerHTML.substring(0, 200) + '...');

        // Update status icons with diplomacy color
        const isObjectDiscovered = this.isTargetDiscovered(currentTargetData);
        this.tcm.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info, isObjectDiscovered);

        // Ensure hull/subsystem labels use black for friendly/neutral, white for hostile
        this.updateLabelColors(isEnemyShip);

        // Update action buttons based on target type
        this.tcm.updateActionButtons(currentTargetData, info);

        // Update reticle color based on faction
        this.tcm.updateReticleColor(diplomacyColor);
    }

    /**
     * Check if wireframe needs recreation due to discovery status change
     */
    checkDiscoveryStatusChange() {
        const targetDataForDiscoveryCheck = this.tcm.getCurrentTargetData();
        if (targetDataForDiscoveryCheck && this.tcm.currentTarget) {
            const currentDiscoveryStatus = targetDataForDiscoveryCheck.isShip || this.tcm.isObjectDiscovered(targetDataForDiscoveryCheck);

            // Store the last known discovery status for this target
            if (this.tcm.currentTarget._lastDiscoveryStatus === undefined) {
                this.tcm.currentTarget._lastDiscoveryStatus = currentDiscoveryStatus;
                debug('TARGETING', `🎯 Initial discovery status for ${targetDataForDiscoveryCheck.name}: ${currentDiscoveryStatus}`);
            } else if (this.tcm.currentTarget._lastDiscoveryStatus !== currentDiscoveryStatus) {
                // Discovery status changed - recreate wireframe with new colors
                debug('TARGETING', `🎯 Discovery status changed for ${targetDataForDiscoveryCheck.name}: ${this.tcm.currentTarget._lastDiscoveryStatus} -> ${currentDiscoveryStatus}`);
                this.tcm.currentTarget._lastDiscoveryStatus = currentDiscoveryStatus;

                // Clear existing wireframe first - CRITICAL FIX: Use wireframeScene not main scene
                if (this.tcm.targetWireframe) {
                    this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
                    if (this.tcm.targetWireframe.geometry) {
                        this.tcm.targetWireframe.geometry.dispose();
                    }
                    if (this.tcm.targetWireframe.material) {
                        this.tcm.targetWireframe.material.dispose();
                    }
                    this.tcm.targetWireframe = null;
                }

                // Recreate wireframe with updated discovery status
                this.tcm.createTargetWireframe();
                debug('TARGETING', `🎯 Wireframe recreated for discovery status change: ${targetDataForDiscoveryCheck.name}`);
            }
        }
    }

    /**
     * Show "No Target Selected" display
     */
    showNoTargetDisplay() {
        this.tcm.targetInfoDisplay.innerHTML = `
            <div style="background-color: #2a2a2a; color: #D0D0D0; padding: 8px; border-radius: 4px; margin-bottom: 8px; text-align: center; border: 1px solid #555555;">
                <div style="font-weight: bold; font-size: 12px;">No Target Selected</div>
                <div style="font-size: 10px;">Press TAB to cycle targets</div>
            </div>
        `;
        this.tcm.hideTargetReticle();
        // Hide service icons when there is no current target
        if (this.tcm.statusIconsContainer) {
            this.tcm.statusIconsContainer.style.display = 'none';
        }
    }

    /**
     * Resolve target info for diplomacy status and actions
     * @param {Object} currentTargetData - Current target data
     * @returns {Object} Object containing info and isEnemyShip
     */
    resolveTargetInfo(currentTargetData) {
        let info = null;
        let isEnemyShip = false;

        if (window?.DEBUG_TCM) debug('TARGETING', `🎯 DEBUG: About to get target info for currentTarget:`, this.tcm.currentTarget?.name, 'currentTargetData:', currentTargetData?.name);

        // First, try to get enhanced target info from the ship's TargetComputer system
        const ship = this.tcm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const enhancedTargetInfo = targetComputer?.getCurrentTargetInfo();

        if (enhancedTargetInfo) {
            // Use the comprehensive target information from TargetComputer
            info = enhancedTargetInfo;
            // Use consolidated diplomacy logic instead of old hardcoded check
            const diplomacy = this.tcm.getTargetDiplomacy(currentTargetData);
            isEnemyShip = diplomacy === 'enemy' && currentTargetData?.isShip;

        } else if (currentTargetData.isShip && currentTargetData.ship) {
            // Use consolidated diplomacy logic for ships and target dummies
            const diplomacy = this.tcm.getTargetDiplomacy(currentTargetData);
            isEnemyShip = diplomacy === 'enemy';
            info = {
                type: 'enemy_ship',
                diplomacy: diplomacy,
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
        } else {
            // Final fallback: Prefer the processed target data; fall back to solar system info using the underlying object
            const targetObject = this.tcm.currentTarget?.object || this.tcm.currentTarget;
            const bodyInfo = this.tcm.solarSystemManager.getCelestialBodyInfo(targetObject) || {};
            // Prefer Star Charts/target list data for name/type
            const preferredName = currentTargetData?.name || bodyInfo.name;
            const preferredType = currentTargetData?.type || bodyInfo.type;
            info = { ...bodyInfo, name: preferredName, type: preferredType };
            // For non-ship targets, use consolidated diplomacy logic
            const diplomacy = this.tcm.getTargetDiplomacy(currentTargetData || bodyInfo);
            isEnemyShip = diplomacy === 'enemy';
        }

        if (window?.DEBUG_TCM) debug('INSPECTION', `🎯 DEBUG: Final info object:`, info);

        return { info, isEnemyShip };
    }

    /**
     * Resolve diplomacy color based on target data
     * @param {Object} currentTargetData - Current target data
     * @returns {string} Hex color code
     */
    resolveDiplomacyColor(currentTargetData) {
        // SPECIAL CASE: Handle waypoints first (always magenta)
        const isWaypointForColors = currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual;
        let diplomacyColor = '#44ffff'; // Default teal for unknown

        if (isWaypointForColors) {
            diplomacyColor = '#ff00ff'; // Magenta for waypoints
            debug('WAYPOINTS', `🎨 Using magenta HUD color for waypoint: ${currentTargetData?.name}`);
        } else {
            // Check discovery status first - undiscovered objects should always show as unknown
            // Also check if object has valid position - objects without positions should show as unknown
            const hasValidPosition = this.tcm.getTargetPosition(currentTargetData) !== null;
            const isObjectDiscoveredForDiplomacy = currentTargetData?.isShip || (this.tcm.isObjectDiscovered(currentTargetData) && hasValidPosition);
            const diplomacy = isObjectDiscoveredForDiplomacy ? this.tcm.getTargetDiplomacy(currentTargetData) : 'unknown';

            if (diplomacy === 'enemy') {
                diplomacyColor = '#ff3333'; // Enemy red
            } else if (diplomacy === 'neutral') {
                diplomacyColor = '#ffff00'; // Neutral yellow (includes stars via getTargetDiplomacy)
            } else if (diplomacy === 'friendly') {
                diplomacyColor = '#00ff41'; // Friendly green
            } else if (diplomacy === 'unknown') {
                diplomacyColor = '#44ffff'; // Unknown teal
            }
        }

        return diplomacyColor;
    }

    /**
     * Check if target is discovered
     * @param {Object} currentTargetData - Current target data
     * @returns {boolean} Whether target is discovered
     */
    isTargetDiscovered(currentTargetData) {
        const isWaypoint = currentTargetData?.isVirtual || currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint;
        const hasValidPositionForDisplay = this.tcm.getTargetPosition(currentTargetData) !== null;
        return currentTargetData?.isShip || isWaypoint || (this.tcm.isObjectDiscovered(currentTargetData) && hasValidPositionForDisplay);
    }

    /**
     * Generate sub-target HTML for sub-system targeting
     * @param {Object} currentTargetData - Current target data
     * @param {Object} info - Target info
     * @param {boolean} isEnemyShip - Whether target is enemy ship
     * @param {string} diplomacyColor - Diplomacy color
     * @returns {string} Sub-target HTML
     */
    generateSubTargetHTML(currentTargetData, info, isEnemyShip, diplomacyColor) {
        // Get sub-target information from player's targeting computer
        const playerShip = this.tcm.viewManager?.getShip();
        const targetComputerForSubTargets = playerShip?.getSystem('target_computer');
        let subTargetHTML = '';

        // Add sub-target information if available and target is discovered
        const isTargetDiscovered = currentTargetData?.discovered === true; // Only true if explicitly discovered

        // Debug logging for subsystem targeting (for undiscovered objects)
        if ((currentTargetData?.discovered === false || currentTargetData?._isUndiscovered) && Math.random() < 0.1) {
            debug('TARGETING', `🚫 SUBSYSTEM CHECK for undiscovered ${currentTargetData.name}`, {
                discovered: currentTargetData.discovered,
                _isUndiscovered: currentTargetData._isUndiscovered,
                isTargetDiscovered: isTargetDiscovered,
                hasSubTargeting: targetComputerForSubTargets?.hasSubTargeting(),
                willShowSubsystems: targetComputerForSubTargets && targetComputerForSubTargets.hasSubTargeting() && (currentTargetData?.isShip || isTargetDiscovered)
            });
        }

        if (targetComputerForSubTargets && targetComputerForSubTargets.hasSubTargeting() && (currentTargetData?.isShip || isTargetDiscovered)) {
            // For enemy ships and space stations, use actual sub-targeting
            const isSpaceStation = this.isSpaceStation(info, currentTargetData);

            // Only log for target dummies to debug the sub-targeting issue
            if (currentTargetData.name && currentTargetData.name.includes('Target Dummy')) {
                if (window?.DEBUG_TCM) debug('TARGETING', `🎯 Sub-targeting check: isEnemyShip=${isEnemyShip}, currentTargetData.ship=${!!currentTargetData.ship}, isSpaceStation=${isSpaceStation}`);
                if (window?.DEBUG_TCM) debug('TARGETING', `🎯 Sub-targeting DEBUG: isShip=${currentTargetData.isShip}, type=${currentTargetData.type}, ship=${!!currentTargetData.ship}, isTargetDummy=${currentTargetData.ship?.isTargetDummy}`);
            }

            if ((isEnemyShip && currentTargetData.ship) || isSpaceStation) {
                if (targetComputerForSubTargets.currentSubTarget) {
                    subTargetHTML = this.generateCurrentSubTargetHTML(targetComputerForSubTargets, isEnemyShip, diplomacyColor);
                } else {
                    // Show available sub-targets count
                    subTargetHTML = this.generateAvailableSubTargetsHTML(targetComputerForSubTargets, diplomacyColor);
                }
            }
        }

        return subTargetHTML;
    }

    /**
     * Check if target is a space station
     * @param {Object} info - Target info
     * @param {Object} currentTargetData - Current target data
     * @returns {boolean} Whether target is a space station
     */
    isSpaceStation(info, currentTargetData) {
        return info?.type === 'station' ||
            (info?.type && (
                info.type.toLowerCase().includes('station') ||
                info.type.toLowerCase().includes('complex') ||
                info.type.toLowerCase().includes('platform') ||
                info.type.toLowerCase().includes('facility') ||
                info.type.toLowerCase().includes('base')
            )) ||
            currentTargetData.type === 'station' ||
            (currentTargetData.type && (
                currentTargetData.type.toLowerCase().includes('station') ||
                currentTargetData.type.toLowerCase().includes('complex') ||
                currentTargetData.type.toLowerCase().includes('platform') ||
                currentTargetData.type.toLowerCase().includes('facility') ||
                currentTargetData.type.toLowerCase().includes('base')
            )) ||
            (this.tcm.currentTarget?.userData?.isSpaceStation);
    }

    /**
     * Generate HTML for current sub-target
     * @param {Object} targetComputer - Target computer system
     * @param {boolean} isEnemyShip - Whether target is enemy ship
     * @param {string} diplomacyColor - Diplomacy color
     * @returns {string} Sub-target HTML
     */
    generateCurrentSubTargetHTML(targetComputer, isEnemyShip, diplomacyColor) {
        const subTarget = targetComputer.currentSubTarget;
        // Handle both decimal (0-1) and percentage (0-100) health formats
        let healthPercent;
        if (subTarget.health <= 1) {
            // Decimal format (0-1), multiply by 100
            healthPercent = Math.round(subTarget.health * 100);
        } else {
            // Already percentage format (0-100), use as-is
            healthPercent = Math.round(subTarget.health);
        }
        // Ensure it's within valid range
        healthPercent = Math.max(0, Math.min(100, healthPercent));

        // Get accuracy and damage bonuses
        const accuracyBonus = Math.round(targetComputer.getSubTargetAccuracyBonus() * 100);
        const damageBonus = Math.round(targetComputer.getSubTargetDamageBonus() * 100);

        // Create health bar display matching main hull health style
        const healthBarSection = `
            <div style="margin-top: 8px; padding: 4px 0;">
                <div class="tcm-subsystem-label" style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">${subTarget.displayName}: ${healthPercent}%</div>
                <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                    <div style="background-color: white; height: 100%; width: ${healthPercent}%; transition: width 0.3s ease;"></div>
                </div>
            </div>`;

        return `
            <div style="
                background-color: ${isEnemyShip ? '#ff0000' : diplomacyColor};
                color: ${isEnemyShip ? 'white' : '#000000'};
                padding: 6px;
                border-radius: 4px;
                margin-top: 4px;
                font-weight: bold;
            ">
                <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                ${healthBarSection}
                <div style="font-size: 10px; opacity: 0.8; margin-top: 6px;">
                    <span>Acc:</span> <span>+${accuracyBonus}%</span> •
                    <span>Dmg:</span> <span>+${damageBonus}%</span>
                </div>
                <div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                    Z X to cycle sub-targets
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML for available sub-targets count
     * @param {Object} targetComputer - Target computer system
     * @param {string} diplomacyColor - Diplomacy color
     * @returns {string} Available sub-targets HTML
     */
    generateAvailableSubTargetsHTML(targetComputer, diplomacyColor) {
        const availableTargets = targetComputer.availableSubTargets.length;
        if (availableTargets > 0) {
            return `
                <div style="
                    background-color: ${diplomacyColor};
                    color: #000000;
                    padding: 6px;
                    border-radius: 4px;
                    margin-top: 4px;
                    font-weight: bold;
                ">
                    <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                    <div style="font-size: 11px; opacity: 0.8;">
                        ${availableTargets} targetable systems detected
                    </div>
                    <div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                        Z X to cycle sub-targets
                    </div>
                </div>
            `;
        }
        return '';
    }

    /**
     * Check and update range status
     * @param {Object} currentTargetData - Current target data
     * @param {number} distance - Distance to target
     */
    checkRangeStatus(currentTargetData, distance) {
        if (currentTargetData?.outOfRange && distance <= 150) {
            debug('TARGETING', `Target ${currentTargetData.name} back in range (${distance.toFixed(1)}km) - clearing outOfRange flag`);
            currentTargetData.outOfRange = false;

            // Also clear the flag in the original target object in targetObjects array
            if (this.tcm.targetIndex >= 0 && this.tcm.targetIndex < this.tcm.targetObjects.length) {
                const originalTargetData = this.tcm.targetObjects[this.tcm.targetIndex];
                if (originalTargetData) {
                    originalTargetData.outOfRange = false;
                }
            }
        }
    }

    /**
     * Generate hull health section HTML
     * @param {Object} currentTargetData - Current target data
     * @param {Object} info - Target info
     * @param {boolean} isEnemyShip - Whether target is enemy ship
     * @returns {string} Hull health HTML
     */
    generateHullHealthSection(currentTargetData, info, isEnemyShip) {
        if (isEnemyShip && currentTargetData.ship) {
            const currentHull = currentTargetData.ship.currentHull || 0;
            const maxHull = currentTargetData.ship.maxHull || 1;
            const hullPercentage = maxHull > 0 ? (currentHull / maxHull) * 100 : 0;

            // More accurate hull percentage display - don't round to 0% unless actually 0
            let displayPercentage;
            if (hullPercentage === 0) {
                displayPercentage = 0;
            } else if (hullPercentage < 1) {
                displayPercentage = Math.ceil(hullPercentage); // Always show at least 1% if hull > 0
            } else {
                displayPercentage = Math.round(hullPercentage);
            }

            return `
                <div style="margin-top: 8px; padding: 4px 0;">
                    <div class="tcm-hull-label" style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${displayPercentage}%</div>
                    <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                        <div style="background-color: white; height: 100%; width: ${hullPercentage}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>`;
        }

        // Check for station hull using Hull Plating sub-system
        const isStation = this.isSpaceStation(info, currentTargetData);
        const isTargetDiscovered = currentTargetData?.discovered === true;

        if (isStation && isTargetDiscovered) {
            const ship = this.tcm.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            const hullSystem = targetComputer?.availableSubTargets?.find(s => s.systemName === 'hull_plating');

            if (hullSystem) {
                let raw = (typeof hullSystem.healthPercentage === 'number') ? hullSystem.healthPercentage : hullSystem.health;
                let hullPercent = 0;
                if (typeof raw === 'number') {
                    hullPercent = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
                }
                hullPercent = Math.max(0, Math.min(100, hullPercent));

                return `
                    <div style="margin-top: 8px; padding: 4px 0;">
                        <div class="tcm-hull-label" style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${hullPercent}%</div>
                        <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                            <div style="background-color: white; height: 100%; width: ${hullPercent}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>`;
            }
        }

        return '';
    }

    /**
     * Resolve display colors based on target type
     * @param {boolean} isEnemyShip - Whether target is enemy ship
     * @param {string} diplomacyColor - Diplomacy color
     * @returns {Object} Object with textColor and backgroundColor
     */
    resolveDisplayColors(isEnemyShip, diplomacyColor) {
        let textColor, backgroundColor;
        if (isEnemyShip) {
            // White text on solid red background for hostile enemies
            textColor = 'white';
            backgroundColor = '#ff0000';
        } else {
            // Friendly (green) and Neutral (yellow) should use black text
            backgroundColor = diplomacyColor;
            const isYellow = backgroundColor.toLowerCase() === '#ffff00';
            const isGreen = backgroundColor.toLowerCase() === '#00ff41';
            textColor = (isYellow || isGreen) ? 'black' : 'white';
        }
        return { textColor, backgroundColor };
    }

    /**
     * Resolve display name and type based on discovery status
     * @param {Object} currentTargetData - Current target data
     * @param {Object} info - Target info
     * @param {boolean} isEnemyShip - Whether target is enemy ship
     * @returns {Object} Object with displayName and displayType
     */
    resolveDisplayNameAndType(currentTargetData, info, isEnemyShip) {
        // Check discovery status to determine if we should show real name or "Unknown"
        // SPECIAL CASE: Waypoints are always considered "discovered" since they're mission targets
        const isObjectDiscovered = this.isTargetDiscovered(currentTargetData);

        let displayName;
        if (!isObjectDiscovered && !currentTargetData?.isShip) {
            // Undiscovered non-ship objects show as "Unknown"
            displayName = 'Unknown';
        } else {
            // Discovered objects or ships show their real name
            displayName = currentTargetData?.name || info?.name || 'Unknown Target';
        }

        let displayType;
        if (!isObjectDiscovered && !currentTargetData?.isShip) {
            // Undiscovered non-ship objects show type as "Unknown"
            displayType = 'Unknown';
        } else {
            // Discovered objects or ships show their real type
            displayType = (currentTargetData?.type || info?.type || 'Unknown');
            if (isEnemyShip && info?.shipType) {
                displayType = info.shipType;
            }
        }

        return { displayName, displayType };
    }

    /**
     * Update sub-system panel content and visibility
     * @param {string} subTargetHTML - Sub-target HTML content
     * @param {string} diplomacyColor - Diplomacy color
     */
    updateSubSystemPanel(subTargetHTML, diplomacyColor) {
        if (subTargetHTML && subTargetHTML.trim()) {
            // Update sub-system panel content
            this.tcm.subSystemContent.innerHTML = `
                ${subTargetHTML}
            `;

            // Update sub-system wireframe based on current sub-target
            const playerShip = this.tcm.viewManager?.getShip();
            const targetComputerForWireframe = playerShip?.getSystem('target_computer');
            if (targetComputerForWireframe && targetComputerForWireframe.currentSubTarget) {
                const subTarget = targetComputerForWireframe.currentSubTarget;
                this.tcm.updateSubSystemWireframe(subTarget.systemName, subTarget.health, diplomacyColor);
            }

            // Show the sub-system panel with animation
            this.tcm.showSubSystemPanel();

            // Update sub-system panel border color to match main HUD
            this.tcm.updateSubSystemPanelColor(diplomacyColor);
        } else {
            // Clear wireframe when no sub-systems available
            this.tcm.updateSubSystemWireframe(null);

            // Hide the sub-system panel with animation
            this.tcm.hideSubSystemPanel();
        }
    }

    /**
     * Update label colors for hull and subsystem labels
     * @param {boolean} isEnemyShip - Whether target is enemy ship
     */
    updateLabelColors(isEnemyShip) {
        const hullLabels = this.tcm.targetInfoDisplay.querySelectorAll('.tcm-hull-label');
        hullLabels.forEach(lbl => {
            if (!isEnemyShip) {
                lbl.style.color = 'black';
            } else {
                lbl.style.color = 'white';
            }
        });
        const subsystemLabels = this.tcm.targetInfoDisplay.querySelectorAll('.tcm-subsystem-label');
        subsystemLabels.forEach(lbl => {
            if (!isEnemyShip) {
                lbl.style.color = 'black';
            } else {
                lbl.style.color = 'white';
            }
        });
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this._lastLoggedTarget = null;
    }
}
