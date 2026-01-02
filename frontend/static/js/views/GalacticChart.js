import * as THREE from 'three';
import { VIEW_TYPES } from './ViewManager.js';
import { debug } from '../debug.js';

export class GalacticChart {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this.universe = null;
        this.currentSystemIndex = null;
        this.shipSystemIndex = 0;  // Set initial position to A0 (index 0)
        this._isVisible = false;  // Add internal visibility state

        // Memory leak prevention: track event handlers for cleanup
        this._boundKeydownHandler = null;
        this._boundCloseHandler = null;
        this._cellClickHandlers = new Map(); // Map cell element -> handler
        this._cellMouseEnterHandlers = new Map();
        this._cellMouseLeaveHandlers = new Map();

        // Create the modal container
        this.container = document.createElement('div');
        this.container.className = 'galactic-chart';

        // Create the close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = 'X';
        this.closeButton.className = 'close-button';
        this.container.appendChild(this.closeButton);

        // Create main content wrapper
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'content-wrapper';
        this.container.appendChild(this.contentWrapper);

        // Create grid container
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'grid-container';
        this.contentWrapper.appendChild(this.gridContainer);

        // Create sector info container
        this.sectorInfo = document.createElement('div');
        this.sectorInfo.className = 'sector-info';
        this.contentWrapper.appendChild(this.sectorInfo);

        // Create system details panel at the bottom
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'system-details';
        this.container.appendChild(this.detailsPanel);

        // Initialize grid
        this.initializeGrid();

        // Add event listeners (store for cleanup)
        this._boundCloseHandler = () => {
            this.viewManager.restorePreviousView();
            this.hide(false);
        };
        this.closeButton.addEventListener('click', this._boundCloseHandler);

        this._boundKeydownHandler = (event) => {
            if (this.container.classList.contains('visible')) {
                const key = event.key.toLowerCase();
                if (key === 'g' || key === 'escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.viewManager.restorePreviousView();
                } else if (key === 'a') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.viewManager.setView(VIEW_TYPES.AFT);
                } else if (key === 'f') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.viewManager.setView(VIEW_TYPES.FORE);
                }
            }
        };
        document.addEventListener('keydown', this._boundKeydownHandler);

        // Add to document
        document.body.appendChild(this.container);
    }

    initializeGrid() {
        // Clear existing grid and event handlers
        this._cleanupCellHandlers();
        this.gridContainer.innerHTML = '';

        // Add empty cell for top-left corner
        const cornerCell = document.createElement('div');
        cornerCell.className = 'grid-corner';
        cornerCell.innerHTML = '&nbsp;';
        this.gridContainer.appendChild(cornerCell);

        // Add header row (0-8)
        for (let i = 0; i < 9; i++) {
            const header = document.createElement('div');
            header.textContent = i;
            header.className = 'grid-header';
            this.gridContainer.appendChild(header);
        }

        // Add row labels (A-J) and grid cells
        for (let row = 0; row < 10; row++) {
            // Add row label
            const rowLabel = document.createElement('div');
            rowLabel.textContent = String.fromCharCode(65 + row);
            rowLabel.className = 'grid-row-label';
            this.gridContainer.appendChild(rowLabel);

            // Add cells for this row
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = String(row);
                cell.dataset.col = String(col);
                cell.dataset.sector = `${String.fromCharCode(65 + row)}${col}`;
                
                // Add click event listener (track for cleanup)
                const clickHandler = () => {
                    const index = row * 9 + col;
                    if (this.universe && this.universe[index]) {
                        this.setCurrentSystem(index);
                    }
                };
                cell.addEventListener('click', clickHandler);
                this._cellClickHandlers.set(cell, clickHandler);

                this.gridContainer.appendChild(cell);
            }
        }
    }

    /**
     * Clean up cell event handlers
     */
    _cleanupCellHandlers() {
        // Remove click handlers
        for (const [cell, handler] of this._cellClickHandlers) {
            cell.removeEventListener('click', handler);
        }
        this._cellClickHandlers.clear();

        // Remove mouseenter handlers
        for (const [cell, handler] of this._cellMouseEnterHandlers) {
            cell.removeEventListener('mouseenter', handler);
        }
        this._cellMouseEnterHandlers.clear();

        // Remove mouseleave handlers
        for (const [cell, handler] of this._cellMouseLeaveHandlers) {
            cell.removeEventListener('mouseleave', handler);
        }
        this._cellMouseLeaveHandlers.clear();
    }

    async show() {
        debug('UI', 'GalacticChart.show called:', {
            isVisible: this._isVisible,
            hasVisibleClass: this.container.classList.contains('visible')
        });
        
        // Only show and fetch data if not already visible
        if (!this._isVisible) {
debug('UTILITY', 'Showing galactic chart and fetching data');
            this._isVisible = true;
            this.container.classList.add('visible');
            this.detailsPanel.style.display = 'none';  // Ensure details panel is hidden initially
            
            try {
                await this.fetchUniverseData();
            } catch (error) {
                debug('P1', 'Error showing galactic chart:', error);
                // If fetch fails, hide the chart and restore previous view
                this.hide(true);
                return;
            }
        } else {
debug('UTILITY', 'Galactic chart already visible, skipping show');
        }
    }

    hide(shouldRestoreView = false) {
        debug('UTILITY', 'GalacticChart.hide called:', {
            isVisible: this._isVisible,
            hasVisibleClass: this.container.classList.contains('visible'),
            shouldRestoreView
        });
        
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
            this.detailsPanel.style.display = 'none';
            if (shouldRestoreView && this.viewManager) {
debug('UTILITY', 'Restoring previous view from hide');
                this.viewManager.restorePreviousView();
            }
        }
    }

    isVisible() {
        return this._isVisible;
    }

    async fetchUniverseData() {
        try {
            const response = await fetch('/api/generate_universe');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const rawData = await response.json();
            if (!rawData || !Array.isArray(rawData)) {
                throw new Error('Invalid universe data format');
            }

            // Get the Galactic Chart system from the ship
            const ship = this.viewManager.getShip();
            const chartSystem = ship ? ship.systems.get('galactic_chart') : null;
            
            // Process universe data through the chart system (applies damage effects)
            if (chartSystem && chartSystem.isOperational()) {
                this.universe = chartSystem.processUniverseData(rawData);
                
                const systemStatus = chartSystem.getStatus();
debug('UTILITY', `Galactic Chart data processed - Range: ${systemStatus.dataRange}%, Accuracy: ${systemStatus.accuracy}%`);
                
                // Show warning if data is limited due to damage
                if (systemStatus.dataRange < 100 || systemStatus.accuracy < 100) {
                    debug('NAVIGATION', `Chart system performance degraded - showing ${systemStatus.dataRange}% of systems with ${systemStatus.accuracy}% accuracy`);
                }
            } else {
                // Fallback to raw data if no chart system (shouldn't happen)
debug('NAVIGATION', 'No Galactic Chart system installed - using basic navigation data');
                this.universe = rawData;
            }
            
            this.updateGrid();
            
            // Wait for managers to be ready
            if (!this.viewManager.areManagersReady()) {
                throw new Error('Managers not properly initialized');
            }
            
            // Get the SolarSystemManager safely
            const solarSystemManager = this.viewManager.getSolarSystemManager();
            
            // No longer share universe data - we use API for system generation
            debug('STAR_CHARTS', 'Universe data loaded:', {
                universeSize: this.universe.length,
                processedBySystems: !!chartSystem,
                firstSystem: this.universe[0]?.star_name
            });

            return this.universe;
        } catch (error) {
            debug('P1', 'Error fetching universe data:', error);
            // Re-throw the error to be handled by the caller
            throw error;
        }
    }

    updateGrid() {
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        cells.forEach((cell, index) => {
            if (this.universe[index]) {
                const system = this.universe[index];
                const planetCount = system.planets.length;
                cell.textContent = planetCount;
                
                // If this is the current ship location, show "You are here"
                if (index === this.shipSystemIndex) {
                    cell.title = "You are here";
                } else {
                    // Calculate warp energy required
                    const currentRow = Math.floor(this.shipSystemIndex / 9);
                    const currentCol = this.shipSystemIndex % 9;
                    const targetRow = Math.floor(index / 9);
                    const targetCol = index % 9;
                    
                    // Calculate Manhattan distance between cells
                    const distance = Math.abs(targetRow - currentRow) + Math.abs(targetCol - currentCol);
                    const warpEnergy = Math.pow(distance, 2) * 50; // Square the distance and multiply by 50
                    
                    // Get current ship energy from the view manager
                    const currentEnergy = this.viewManager.getShipEnergy();
                    
                    // Create custom tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip';
                    tooltip.innerHTML = `Warp Energy Required: ${warpEnergy.toFixed(2)}`;
                    if (warpEnergy > currentEnergy) {
                        tooltip.classList.add('insufficient');
                    }
                    
                    // Remove any existing tooltip
                    const existingTooltip = cell.querySelector('.custom-tooltip');
                    if (existingTooltip) {
                        cell.removeChild(existingTooltip);
                    }
                    
                    // Add the new tooltip
                    cell.appendChild(tooltip);

                    // Remove existing hover handlers if any (prevent memory leak)
                    if (this._cellMouseEnterHandlers.has(cell)) {
                        cell.removeEventListener('mouseenter', this._cellMouseEnterHandlers.get(cell));
                    }
                    if (this._cellMouseLeaveHandlers.has(cell)) {
                        cell.removeEventListener('mouseleave', this._cellMouseLeaveHandlers.get(cell));
                    }

                    // Add hover events (track for cleanup)
                    const mouseEnterHandler = () => {
                        // Get the cell's position
                        const cellRect = cell.getBoundingClientRect();

                        // Create tooltip but keep it hidden initially
                        tooltip.style.display = 'block';
                        tooltip.style.visibility = 'hidden';

                        // Get tooltip dimensions
                        const tooltipRect = tooltip.getBoundingClientRect();

                        // Check available space
                        const spaceBelow = window.innerHeight - cellRect.bottom;
                        const spaceAbove = cellRect.top;

                        // Position tooltip based on available space
                        if (spaceBelow < tooltipRect.height + 10 && spaceAbove > tooltipRect.height + 10) {
                            // Position above
                            tooltip.style.top = 'auto';
                            tooltip.style.bottom = '100%';
                            tooltip.style.marginTop = '0';
                            tooltip.style.marginBottom = '5px';
                            tooltip.style.transform = 'translateX(-50%)';
                            tooltip.style.setProperty('--arrow-top', 'auto');
                            tooltip.style.setProperty('--arrow-bottom', '0');
                            tooltip.style.setProperty('--arrow-border-color', 'transparent transparent #00ff41 transparent');
                        } else {
                            // Position below
                            tooltip.style.top = '100%';
                            tooltip.style.bottom = 'auto';
                            tooltip.style.marginTop = '5px';
                            tooltip.style.marginBottom = '0';
                            tooltip.style.transform = 'translateX(-50%)';
                            tooltip.style.setProperty('--arrow-top', '0');
                            tooltip.style.setProperty('--arrow-bottom', 'auto');
                            tooltip.style.setProperty('--arrow-border-color', 'transparent transparent #00ff41 transparent');
                        }

                        // Check horizontal positioning
                        const spaceRight = window.innerWidth - cellRect.left;
                        const spaceLeft = cellRect.right;

                        if (spaceRight < tooltipRect.width / 2) {
                            // Adjust for right edge
                            tooltip.style.left = 'auto';
                            tooltip.style.right = '0';
                            tooltip.style.transform = 'translateX(0)';
                        } else if (spaceLeft < tooltipRect.width / 2) {
                            // Adjust for left edge
                            tooltip.style.left = '0';
                            tooltip.style.right = 'auto';
                            tooltip.style.transform = 'translateX(0)';
                        } else {
                            // Center the tooltip
                            tooltip.style.left = '50%';
                            tooltip.style.right = 'auto';
                            tooltip.style.transform = 'translateX(-50%)';
                        }

                        // Make tooltip visible after positioning
                        tooltip.style.visibility = 'visible';
                    };
                    cell.addEventListener('mouseenter', mouseEnterHandler);
                    this._cellMouseEnterHandlers.set(cell, mouseEnterHandler);

                    const mouseLeaveHandler = () => {
                        tooltip.style.display = 'none';
                    };
                    cell.addEventListener('mouseleave', mouseLeaveHandler);
                    this._cellMouseLeaveHandlers.set(cell, mouseLeaveHandler);
                }
                
                // Clear existing state classes
                cell.classList.remove('current-system', 'ship-location');
                
                // Apply appropriate classes
                if (index === this.currentSystemIndex) {
                    cell.classList.add('current-system');
                }
                if (index === this.shipSystemIndex) {
                    cell.classList.add('ship-location');
                }
            } else {
                cell.textContent = '';
                // Remove any existing tooltip
                const existingTooltip = cell.querySelector('.custom-tooltip');
                if (existingTooltip) {
                    cell.removeChild(existingTooltip);
                }
            }
        });
    }

    setCurrentSystem(systemIndex) {
        // Remove current system highlight from previous cell
        if (this.currentSystemIndex !== null) {
            const cells = this.gridContainer.querySelectorAll('.grid-cell');
            cells[this.currentSystemIndex].classList.remove('current-system');
        }

        this.currentSystemIndex = systemIndex;

        // Add highlight to new current system cell
        if (systemIndex !== null) {
            const cells = this.gridContainer.querySelectorAll('.grid-cell');
            cells[systemIndex].classList.add('current-system');
        }

        // Update details if the system exists
        if (systemIndex !== null && this.universe && this.universe[systemIndex]) {
            this.showSystemDetails(this.universe[systemIndex]);
        } else {
            // Hide details panel if no system is selected
            this.detailsPanel.style.display = 'none';
        }
    }

    getCoordinatesString(index) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        return `${String.fromCharCode(65 + row)}${col}`;
    }

    showSystemDetails(system) {
        const systemIndex = this.universe.findIndex(s => s.star_name === system.star_name);
        const coordinates = this.getCoordinatesString(systemIndex);
        const isCurrentSector = coordinates === this.getCoordinatesString(this.shipSystemIndex);
        
        // Calculate warp energy required if not current sector
        let warpEnergy = 0;
        if (!isCurrentSector) {
            const currentRow = Math.floor(this.shipSystemIndex / 9);
            const currentCol = this.shipSystemIndex % 9;
            const targetRow = Math.floor(systemIndex / 9);
            const targetCol = systemIndex % 9;
            const distance = Math.abs(targetRow - currentRow) + Math.abs(targetCol - currentCol);
            warpEnergy = Math.pow(distance, 2) * 50;
        }
        
        // Show the details panel
        this.detailsPanel.style.display = 'block';
        
        // Create the header section with reordered elements and action buttons
        const headerHtml = `
            <div class="system-header">
                <div class="system-title">
                    <span class="star-name">${system.star_name}</span>
                    <span class="star-type">(${system.star_type})</span>
                </div>
                <div class="system-actions">
                    <button class="action-button probe-button" ${isCurrentSector ? 'disabled' : ''}>Probe</button>
                    <button class="action-button warp-button" ${isCurrentSector ? 'disabled' : ''}>Warp</button>
                </div>
            </div>
        `;

        // Create the planets table with detailed information
        const planetsTableHtml = `
            <div class="system-content">
                <div class="planets-table">
                    <div class="table-header">
                        <div class="col">Destination</div>
                        <div class="col">Type</div>
                        <div class="col">Diplomacy</div>
                        <div class="col">Government</div>
                        <div class="col">Economy</div>
                        <div class="col">Technology</div>
                    </div>
                    <div class="table-body">
                        ${system.planets.map(planet => `
                            <div class="table-row">
                                <div class="col">${planet.planet_name}</div>
                                <div class="col">${planet.planet_type}</div>
                                <div class="col ${planet.diplomacy?.toLowerCase() === 'enemy' ? 'diplomacy-hostile' : `diplomacy-${planet.diplomacy?.toLowerCase() || 'neutral'}`}">${planet.diplomacy || 'Neutral'}</div>
                                <div class="col">${planet.government || 'None'}</div>
                                <div class="col">${planet.economy || 'None'}</div>
                                <div class="col">${planet.technology || 'None'}</div>
                            </div>
                            ${planet.moons.map(moon => `
                                <div class="table-row moon-row">
                                    <div class="col">${moon.moon_name}</div>
                                    <div class="col">${moon.moon_type}</div>
                                    <div class="col ${moon.diplomacy?.toLowerCase() === 'enemy' ? 'diplomacy-hostile' : `diplomacy-${moon.diplomacy?.toLowerCase() || 'neutral'}`}">${moon.diplomacy || 'Neutral'}</div>
                                    <div class="col">${moon.government || 'None'}</div>
                                    <div class="col">${moon.economy || 'None'}</div>
                                    <div class="col">${moon.technology || 'None'}</div>
                                </div>
                            `).join('')}
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Update the details panel content
        this.detailsPanel.innerHTML = headerHtml + planetsTableHtml;

        // Add event listeners for the buttons
        const probeButton = this.detailsPanel.querySelector('.probe-button');
        const warpButton = this.detailsPanel.querySelector('.warp-button');

        if (probeButton && !isCurrentSector) {
            probeButton.addEventListener('click', () => {
debug('UTILITY', 'Probe initiated for system:', system.star_name);
                // FUTURE: Launch probe to scan unexplored systems
            });
        }

        if (warpButton && !isCurrentSector) {
            warpButton.addEventListener('click', () => {
debug('UTILITY', `🚀 WARP BUTTON CLICKED: Starting warp validation...`);
                
                // Check if ship is docked
                if (this.viewManager.starfieldManager.isDocked) {
debug('UTILITY', `🚀 WARP BLOCKED: Ship is docked`);
                    this.viewManager.warpFeedback.showWarning(
                        'Cannot Warp While Docked',
                        'You must launch from the planet or moon before engaging warp drive.',
                        () => {
                            // Keep the galactic chart visible after warning is closed
                            this.show();
                        }
                    );
                    return;
                }

                // Check if ship has a warp drive system installed
                const ship = this.viewManager.getShip();
                const warpDriveSystem = ship ? ship.systems.get('warp_drive') : null;
                
debug('INSPECTION', `🚀 WARP DEBUG: Ship exists: ${!!ship}, WarpDrive system exists: ${!!warpDriveSystem}`);
                
                if (!warpDriveSystem) {
debug('UTILITY', `🚀 WARP BLOCKED: No warp drive system found`);
                    this.viewManager.warpFeedback.showWarning(
                        'Warp Drive Not Installed',
                        'This ship requires a warp drive system to travel between star systems. Install a warp drive card to enable interstellar travel.',
                        () => {
                            // Keep the galactic chart visible after warning is closed
                            this.show();
                        }
                    );
                    return;
                }
                
                if (!warpDriveSystem.isOperational()) {
debug('UTILITY', `🚀 WARP BLOCKED: Warp drive system not operational`);
                    this.viewManager.warpFeedback.showWarning(
                        'Warp Drive Damaged',
                        'The warp drive system is damaged and requires repair before interstellar travel is possible.',
                        () => {
                            // Keep the galactic chart visible after warning is closed
                            this.show();
                        }
                    );
                    return;
                }
                
                // Check if ship has warp drive cards installed
                if (ship && ship.hasSystemCardsSync) {
                    let hasWarpCards = false;
                    try {
                        // Add debug logging for warp drive validation
debug('UI', `🚀 WARP DEBUG: Checking warp drive cards for system...`);
                        
                        // Check what cards are actually installed
                        if (ship.cardSystemIntegration && ship.cardSystemIntegration.installedCards) {
                            const installedCards = Array.from(ship.cardSystemIntegration.installedCards.values());
debug('UI', `🚀 WARP DEBUG: Installed cards:`, installedCards.map(card => `${card.cardType} (L${card.level})`));
                            
                            // Check specifically for warp drive cards
                            const warpCards = installedCards.filter(card => card.cardType === 'warp_drive');
debug('UI', `🚀 WARP DEBUG: Warp drive cards found:`, warpCards.length, warpCards);
                        }
                        
                        if (ship.debugSystemCards) {
                            ship.debugSystemCards('warp_drive');
                        }
                        
                        const cardCheck = ship.hasSystemCardsSync('warp_drive');
                        if (typeof cardCheck === 'boolean') {
                            hasWarpCards = cardCheck;
                        } else if (cardCheck && typeof cardCheck === 'object') {
                            hasWarpCards = cardCheck.hasCards;
                        }

debug('UI', `🚀 WARP DEBUG: Card check result: hasWarpCards=${hasWarpCards}, cardCheck=`, cardCheck);
                    } catch (error) {
                        debug('NAVIGATION', 'Warp drive card check failed:', error);
                        hasWarpCards = false;
                    }
                    
                    if (!hasWarpCards) {
debug('UI', `🚀 WARP BLOCKED: No warp drive cards found`);
                        this.viewManager.warpFeedback.showWarning(
                            'Warp Drive Cards Missing',
                            'Warp drive cards are required for interstellar travel. Install warp drive cards in your ship to enable this functionality.',
                            () => {
                                // Keep the galactic chart visible after warning is closed
                                this.show();
                            }
                        );
                        return;
                    }
                }

                const currentEnergy = this.viewManager.getShipEnergy();
                const requiredEnergy = warpEnergy;
                
debug('AI', `🚀 WARP DEBUG: Energy check - Required: ${requiredEnergy}, Available: ${currentEnergy}`);
                
                if (requiredEnergy > currentEnergy) {
debug('UTILITY', `🚀 WARP BLOCKED: Insufficient energy`);
                    this.viewManager.warpFeedback.showWarning(
                        'Insufficient Energy',
                        `Required: ${requiredEnergy.toFixed(2)} energy units\n\nAvailable: ${currentEnergy.toFixed(2)} energy units`,
                        () => {
                            // Keep the galactic chart visible after warning is closed
                            this.show();
                        }
                    );
                } else {
debug('UTILITY', `🚀 WARP SUCCESS: All validations passed, initiating warp to:`, coordinates);
debug('UTILITY', 'Warp initiated to system:', coordinates);
                    // Hide the galactic chart
                    this.hide();
                    // Initiate the warp process
                    this.viewManager.warpDriveManager.navigateToSector(coordinates);
                }
            });
        }
    }

    // Add method to set ship's location
    setShipLocation(systemIndex) {
        // Convert sector string to index if needed (e.g., "B0" -> 9)
        if (typeof systemIndex === 'string') {
            const row = systemIndex.charCodeAt(0) - 65; // Convert A->0, B->1, etc.
            const col = parseInt(systemIndex.slice(1));
            systemIndex = row * 9 + col;
debug('UTILITY', 'Converted sector', systemIndex, 'to index:', systemIndex);
        }

        // Ensure grid is initialized
        if (!this.gridContainer.children.length) {
debug('UTILITY', 'Grid not initialized, initializing now');
            this.initializeGrid();
        }

        // Remove ship location from previous cell
        if (this.shipSystemIndex !== null) {
            const cells = this.gridContainer.querySelectorAll('.grid-cell');
            if (cells[this.shipSystemIndex]) {
                cells[this.shipSystemIndex].classList.remove('ship-location');
            }
        }

        this.shipSystemIndex = systemIndex;

        // Add ship location to new cell
        if (systemIndex !== null) {
            const cells = this.gridContainer.querySelectorAll('.grid-cell');
            if (cells[systemIndex]) {
                cells[systemIndex].classList.add('ship-location');
            } else {
                debug('NAVIGATION', 'Grid cell not found for index:', systemIndex);
            }
        }

        // Update grid to ensure proper combined state styling
        this.updateGrid();
    }

    // Add method to get star system for a sector
    getStarSystemForSector(sector) {
        if (!this.universe) return null;
        
        // Find the star system with matching sector
        return this.universe.find(system => system.sector === sector);
    }

    dispose() {
        debug('UI', '🧹 Disposing GalacticChart...');

        // Remove document-level event listener
        if (this._boundKeydownHandler) {
            document.removeEventListener('keydown', this._boundKeydownHandler);
            this._boundKeydownHandler = null;
        }

        // Remove close button handler
        if (this._boundCloseHandler && this.closeButton) {
            this.closeButton.removeEventListener('click', this._boundCloseHandler);
            this._boundCloseHandler = null;
        }

        // Clean up all cell handlers
        this._cleanupCellHandlers();

        // Remove container from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Null out references
        this.container = null;
        this.closeButton = null;
        this.contentWrapper = null;
        this.gridContainer = null;
        this.sectorInfo = null;
        this.detailsPanel = null;
        this.viewManager = null;
        this.universe = null;

        debug('UI', '🧹 GalacticChart disposed');
    }

    /**
     * Alias for dispose() for consistency with other components
     */
    destroy() {
        this.dispose();
    }
} 