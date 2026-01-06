/**
 * VMCrosshairManager - Crosshair rendering and targeting display
 * Extracted from ViewManager.js to reduce file size.
 *
 * Handles:
 * - Crosshair creation (front +, aft --)
 * - Targeting state display
 * - Faction color coding
 * - Dynamic weapon reticle sizing
 */

import { debug } from '../../debug.js';
import { targetingService } from '../../services/TargetingService.js';
import { getActiveCamera } from '../../ship/systems/services/AimResolver.js';

export class VMCrosshairManager {
    constructor(viewManager) {
        this.vm = viewManager;

        // Crosshair elements
        this.crosshairContainer = null;
        this.frontCrosshair = null;
        this.aftCrosshair = null;
        this.frontCrosshairElements = [];
        this.aftCrosshairElements = [];
        this._crosshairStyleElement = null;

        // Track last weapon for comparison
        this.lastLoggedWeapon = null;
    }

    /**
     * Create crosshair elements for front and aft views
     */
    createCrosshairs() {
        // Create container for crosshairs
        this.crosshairContainer = document.createElement('div');
        this.crosshairContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1000;
        `;

        // Create front view crosshair (+)
        this.frontCrosshair = document.createElement('div');
        this.frontCrosshair.style.cssText = `
            width: 60px;
            height: 60px;
            position: relative;
            display: none;
        `;

        this.frontCrosshair.innerHTML = `
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                left: 0;
                width: calc(50% - 8px);
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                right: 0;
                width: calc(50% - 8px);
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                top: 0;
                left: 50%;
                height: calc(50% - 8px);
                width: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateX(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                bottom: 0;
                left: 50%;
                height: calc(50% - 8px);
                width: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateX(-50%);
            "></div>
        `;

        // Create aft view crosshair (-- --)
        this.aftCrosshair = document.createElement('div');
        this.aftCrosshair.style.cssText = `
            width: 60px;
            height: 40px;
            position: relative;
            display: none;
        `;

        this.aftCrosshair.innerHTML = `
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                left: 0;
                width: 18px;
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
            <div class="crosshair-element" style="
                position: absolute;
                top: 50%;
                right: 0;
                width: 18px;
                height: 2px;
                background: #00ff41;
                box-shadow: 0 0 4px #00ff41;
                transform: translateY(-50%);
            "></div>
        `;

        this.crosshairContainer.appendChild(this.frontCrosshair);
        this.crosshairContainer.appendChild(this.aftCrosshair);
        document.body.appendChild(this.crosshairContainer);

        // Add CSS for crosshair animations
        this._crosshairStyleElement = document.createElement('style');
        this._crosshairStyleElement.id = 'view-manager-crosshair-styles';
        this._crosshairStyleElement.textContent = `
            @keyframes pulse {
                0% { opacity: 0.9; }
                50% { opacity: 0.6; }
                100% { opacity: 0.9; }
            }
            @keyframes rotate {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(this._crosshairStyleElement);

        // Get references to crosshair elements after DOM creation
        this.frontCrosshairElements = Array.from(this.frontCrosshair.querySelectorAll('.crosshair-element'));
        this.aftCrosshairElements = Array.from(this.aftCrosshair.querySelectorAll('.crosshair-element'));
    }

    /**
     * Update crosshair display based on current weapon range and target distance
     */
    updateCrosshairDisplay() {
        const ship = this.vm.ship;

        // Only update if crosshairs are visible and we have a ship
        if (!ship || (this.frontCrosshair.style.display === 'none' && this.aftCrosshair.style.display === 'none')) {
            return;
        }

        // Get current weapon range from the ACTIVE weapon slot
        let currentWeaponRange = 0;
        let activeWeaponName = 'No Weapon';

        if (ship.weaponSystem && ship.weaponSystem.getActiveWeapon) {
            const activeWeapon = ship.weaponSystem.getActiveWeapon();
            if (activeWeapon && activeWeapon.equippedWeapon) {
                const weaponRangeMeters = activeWeapon.equippedWeapon.range || 30000;
                currentWeaponRange = weaponRangeMeters / 1000; // Convert meters to km
                activeWeaponName = activeWeapon.equippedWeapon.name;
            }
        }

        // Track last weapon for comparison
        if (!this.lastLoggedWeapon || this.lastLoggedWeapon !== activeWeaponName) {
            this.lastLoggedWeapon = activeWeaponName;
        }

        // Default state - no target in sights
        let targetState = 'none';
        let targetFaction = null;
        let targetShip = null;
        let targetDistance = null;

        // Only check for targets if we have a weapon and access to the scene
        if (currentWeaponRange > 0 && this.vm.starfieldManager?.scene) {
            const camera = getActiveCamera(ship) || this.vm.starfieldManager.camera;

            const targetingResult = targetingService.getCurrentTarget({
                camera: camera,
                weaponRange: currentWeaponRange,
                requestedBy: 'crosshair_display',
                enableFallback: false
            });

            targetState = targetingResult.crosshairState;
            targetShip = targetingResult.targetShip;
            targetDistance = targetingResult.targetDistance;

            if (targetShip) {
                targetFaction = this.getFactionColor(targetShip);
            }
        }

        // Apply visual changes based on target state and faction
        this.applyCrosshairStyle(this.frontCrosshairElements, targetState, targetFaction, targetShip, targetDistance);
        this.applyCrosshairStyle(this.aftCrosshairElements, targetState, targetFaction, targetShip, targetDistance);
    }

    /**
     * Get faction color for any target (ships, planets, moons, stations)
     */
    getFactionColor(target) {
        if (!target) return '#ffffff';

        // Handle ship objects (have diplomacy property)
        if (target.diplomacy || target.faction) {
            const diplomacy = target.diplomacy || target.faction;

            switch(diplomacy) {
                case 'enemy':
                case 'hostile':
                    return '#ff3333';
                case 'friendly':
                case 'ally':
                    return '#44ff44';
                case 'neutral':
                    return '#ffff44';
                case 'unknown':
                    return '#44ffff';
                default:
                    return '#ff3333';
            }
        }

        // Handle celestial bodies
        if (target.type) {
            switch(target.type) {
                case 'star':
                    return '#ffff44';
                case 'planet':
                    return '#44ff44';
                case 'moon':
                    return '#44ffff';
                case 'station':
                case 'space_station':
                    return '#44ff44';
                default:
                    return '#ffffff';
            }
        }

        // Handle named celestial bodies without type
        if (target.name) {
            const name = target.name.toLowerCase();
            if (name.includes('star') || name.includes('sun')) {
                return '#ffff44';
            } else if (name.includes('planet')) {
                return '#44ff44';
            } else if (name.includes('moon')) {
                return '#44ffff';
            }
        }

        return '#ffffff';
    }

    /**
     * Apply crosshair styling based on target state and faction
     */
    applyCrosshairStyle(elements, state, factionColor = null, targetShip = null, targetDistance = null) {
        const baseColor = factionColor || '#ffffff';
        const container = elements[0]?.parentElement;
        if (!container || !elements.length) return;

        // Remove any existing target info indicators
        const existingIndicators = container.querySelectorAll('.target-info, .range-indicator');
        existingIndicators.forEach(indicator => indicator.remove());

        switch(state) {
            case 'none':
                this.setCrosshairShape(container, 'standard', baseColor, 0.6);
                break;
            case 'inRange':
                this.setCrosshairShape(container, 'dynamicTarget', baseColor, 1.0);
                break;
            case 'closeRange':
                this.setCrosshairShape(container, 'standard', baseColor, 0.8);
                break;
            case 'outRange':
                this.setCrosshairShape(container, 'standard', baseColor, 0.6);
                break;
            default:
                this.setCrosshairShape(container, 'standard', baseColor, 0.6);
                break;
        }
    }

    /**
     * Set crosshair shape based on target state
     */
    setCrosshairShape(container, shapeType, color, opacity) {
        container.querySelectorAll('.crosshair-element').forEach(el => el.remove());

        const baseStyle = `
            position: absolute;
            background: ${color};
            box-shadow: 0 0 4px ${color};
            opacity: ${opacity};
        `;

        const isAftCrosshair = container === this.aftCrosshair;

        switch(shapeType) {
            case 'standard':
                if (isAftCrosshair) {
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: 18px; height: 2px; transform: translateY(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: 18px; height: 2px; transform: translateY(-50%);
                        "></div>
                    `;
                } else {
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: calc(50% - 8px); height: 2px; transform: translateY(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: calc(50% - 8px); height: 2px; transform: translateY(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 0; left: 50%; height: calc(50% - 8px); width: 2px; transform: translateX(-50%);
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            bottom: 0; left: 50%; height: calc(50% - 8px); width: 2px; transform: translateX(-50%);
                        "></div>
                    `;
                }
                break;

            case 'inRange':
                container.innerHTML += `
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: 40px; height: 40px;
                        border: 2px dashed ${color}; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                        background: transparent;
                    "></div>
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: 4px; height: 4px; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                    "></div>
                `;
                break;

            case 'closeRange':
                if (isAftCrosshair) {
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: 22px; height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: 22px; height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                    `;
                } else {
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: calc(50% - 4px); height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: calc(50% - 4px); height: 2px; transform: translateY(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 0; left: 50%; height: calc(50% - 4px); width: 2px; transform: translateX(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            bottom: 0; left: 50%; height: calc(50% - 4px); width: 2px; transform: translateX(-50%);
                            box-shadow: 0 0 6px ${color}; animation: pulse 1s infinite;
                        "></div>
                    `;
                }
                break;

            case 'outRange':
                if (isAftCrosshair) {
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: 18px; height: 2px;
                            transform: translateY(-50%) rotate(15deg); transform-origin: right center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: 18px; height: 2px;
                            transform: translateY(-50%) rotate(-15deg); transform-origin: left center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                    `;
                } else {
                    container.innerHTML += `
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; left: 0; width: calc(50% - 8px); height: 2px;
                            transform: translateY(-50%) rotate(30deg); transform-origin: right center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 50%; right: 0; width: calc(50% - 8px); height: 2px;
                            transform: translateY(-50%) rotate(30deg); transform-origin: left center;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            top: 0; left: 50%; height: calc(50% - 8px); width: 2px;
                            transform: translateX(-50%) rotate(30deg); transform-origin: center bottom;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                        <div class="crosshair-element" style="${baseStyle}
                            bottom: 0; left: 50%; height: calc(50% - 8px); width: 2px;
                            transform: translateX(-50%) rotate(30deg); transform-origin: center top;
                            box-shadow: 0 0 4px ${color};
                        "></div>
                    `;
                }
                break;

            case 'dynamicTarget':
                const weaponCircleSize = this.calculateWeaponCircleSize();
                const innerDotSize = Math.max(4, weaponCircleSize / 10);

                container.innerHTML += `
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: ${weaponCircleSize}px; height: ${weaponCircleSize}px;
                        border: 2px dashed ${color}; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                        background: transparent; animation: rotate 3s linear infinite;
                    "></div>
                    <div class="crosshair-element" style="${baseStyle}
                        top: 50%; left: 50%; width: ${innerDotSize}px; height: ${innerDotSize}px; border-radius: 50%;
                        transform: translate(-50%, -50%); box-shadow: 0 0 8px ${color};
                    "></div>
                `;
                break;
        }

        // Update the elements array reference
        if (container === this.frontCrosshair) {
            this.frontCrosshairElements = Array.from(container.querySelectorAll('.crosshair-element'));
        } else if (container === this.aftCrosshair) {
            this.aftCrosshairElements = Array.from(container.querySelectorAll('.crosshair-element'));
        }
    }

    /**
     * Calculate circle size for dynamic target reticle based on active weapon
     */
    calculateWeaponCircleSize() {
        let baseSize = 40;
        const ship = this.vm.ship;

        if (ship?.weaponSystem?.getActiveWeapon) {
            const activeWeapon = ship.weaponSystem.getActiveWeapon();
            if (activeWeapon?.equippedWeapon) {
                const weapon = activeWeapon.equippedWeapon;

                const rangeKm = weapon.range / 1000;
                const rangeFactor = Math.min(rangeKm / 50, 2.0);

                let blastFactor = 1.0;
                if (weapon.blastRadius && weapon.blastRadius > 0) {
                    blastFactor = 1.0 + (weapon.blastRadius / 100);
                }

                let typeFactor = 1.0;
                if (weapon.weaponType === 'scan-hit') {
                    typeFactor = 0.8;
                } else if (weapon.blastRadius > 0) {
                    typeFactor = 1.4;
                } else {
                    typeFactor = 1.1;
                }

                baseSize = Math.round(40 * rangeFactor * blastFactor * typeFactor);
                baseSize = Math.max(30, Math.min(baseSize, 120));
            }
        }

        return baseSize;
    }

    /**
     * Add weapon range indicator when no target is present
     */
    addWeaponRangeIndicator(container, color) {
        let weaponInfo = 'No Weapon';
        const ship = this.vm.ship;

        if (ship?.weaponSystem?.getActiveWeapon) {
            const activeWeapon = ship.weaponSystem.getActiveWeapon();
            if (activeWeapon?.equippedWeapon) {
                const rangeKm = (activeWeapon.equippedWeapon.range / 1000).toFixed(1);
                weaponInfo = `${activeWeapon.equippedWeapon.name} (${rangeKm}km)`;
            }
        }

        const indicator = document.createElement('div');
        indicator.className = 'range-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            color: ${color};
            font-family: 'Courier New', monospace;
            font-size: 10px;
            text-align: center;
            opacity: 0.7;
            pointer-events: none;
            white-space: nowrap;
            text-shadow: 0 0 3px ${color};
        `;
        indicator.textContent = weaponInfo;
        container.appendChild(indicator);
    }

    /**
     * Add range status indicator for targets
     */
    addRangeStatusIndicator(container, status, color) {
        const indicator = document.createElement('div');
        indicator.className = 'range-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            color: ${color};
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
            opacity: 0.9;
            pointer-events: none;
            white-space: nowrap;
            text-shadow: 0 0 4px ${color};
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 4px;
            border-radius: 2px;
        `;
        indicator.textContent = status;
        container.appendChild(indicator);
    }

    /**
     * Add corner brackets around crosshairs
     */
    addCornerBrackets(container, color, style) {
        const brackets = [
            { top: '10px', left: '10px', borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
            { top: '10px', right: '10px', borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
            { bottom: '10px', left: '10px', borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
            { bottom: '10px', right: '10px', borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }
        ];

        brackets.forEach(bracketStyle => {
            const bracket = document.createElement('div');
            bracket.className = 'range-indicator bracket';
            bracket.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                pointer-events: none;
            `;

            Object.assign(bracket.style, bracketStyle);

            if (style === 'pulse') {
                bracket.style.animation = 'pulse 1s infinite';
            }

            container.appendChild(bracket);
        });
    }

    /**
     * Add a ring around crosshairs
     */
    addRangeRing(container, color, style) {
        const ring = document.createElement('div');
        ring.className = 'range-indicator ring';
        ring.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 80px;
            height: 80px;
            border: 2px ${style} ${color};
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            opacity: 0.7;
            box-shadow: 0 0 6px ${color};
        `;

        container.appendChild(ring);
    }

    /**
     * Dispose of crosshair resources
     */
    dispose() {
        // Remove crosshair style element
        if (this._crosshairStyleElement && this._crosshairStyleElement.parentNode) {
            this._crosshairStyleElement.parentNode.removeChild(this._crosshairStyleElement);
            this._crosshairStyleElement = null;
        }

        // Clean up DOM elements
        if (this.crosshairContainer && this.crosshairContainer.parentNode) {
            this.crosshairContainer.parentNode.removeChild(this.crosshairContainer);
        }

        this.crosshairContainer = null;
        this.frontCrosshair = null;
        this.aftCrosshair = null;
        this.frontCrosshairElements = null;
        this.aftCrosshairElements = null;
    }
}
