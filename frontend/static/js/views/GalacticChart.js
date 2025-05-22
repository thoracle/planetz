import * as THREE from 'three';
import { VIEW_TYPES } from './ViewManager.js';

export class GalacticChart {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this.universe = null;
        this.currentSystemIndex = null;
        this.shipSystemIndex = 0;  // Set initial position to A0 (index 0)
        this._isVisible = false;  // Add internal visibility state
        
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

        // Add event listeners
        this.closeButton.addEventListener('click', () => {
            this.viewManager.restorePreviousView();
            this.hide(false);
        });
        
        document.addEventListener('keydown', (event) => {
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
        });

        // Add to document
        document.body.appendChild(this.container);
    }

    initializeGrid() {
        // Clear existing grid
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
                
                // Add click event listener
                cell.addEventListener('click', () => {
                    const index = row * 9 + col;
                    if (this.universe && this.universe[index]) {
                        this.setCurrentSystem(index);
                    }
                });

                this.gridContainer.appendChild(cell);
            }
        }
    }

    async show() {
        console.log('GalacticChart.show called:', {
            isVisible: this._isVisible,
            hasVisibleClass: this.container.classList.contains('visible')
        });
        
        // Only show and fetch data if not already visible
        if (!this._isVisible) {
            console.log('Showing galactic chart and fetching data');
            this._isVisible = true;
            this.container.classList.add('visible');
            this.detailsPanel.style.display = 'none';  // Ensure details panel is hidden initially
            
            try {
                await this.fetchUniverseData();
            } catch (error) {
                console.error('Error showing galactic chart:', error);
                // If fetch fails, hide the chart and restore previous view
                this.hide(true);
                return;
            }
        } else {
            console.log('Galactic chart already visible, skipping show');
        }
    }

    hide(shouldRestoreView = false) {
        console.log('GalacticChart.hide called:', {
            isVisible: this._isVisible,
            hasVisibleClass: this.container.classList.contains('visible'),
            shouldRestoreView
        });
        
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
            this.detailsPanel.style.display = 'none';
            if (shouldRestoreView && this.viewManager) {
                console.log('Restoring previous view from hide');
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
            
            const data = await response.json();
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid universe data format');
            }

            this.universe = data;
            this.updateGrid();
            
            // Wait for managers to be ready
            if (!this.viewManager.areManagersReady()) {
                throw new Error('Managers not properly initialized');
            }
            
            // Get the SolarSystemManager safely
            const solarSystemManager = this.viewManager.getSolarSystemManager();
            
            // No longer share universe data - we use API for system generation
            console.log('Universe data loaded:', {
                universeSize: this.universe.length,
                firstSystem: this.universe[0]?.star_name
            });

            return this.universe;
        } catch (error) {
            console.error('Error fetching universe data:', error);
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
                    tooltip.innerHTML = `Warp Energy Required: ${warpEnergy}`;
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
                    
                    // Add hover events
                    cell.addEventListener('mouseenter', () => {
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
                    });
                    
                    cell.addEventListener('mouseleave', () => {
                        tooltip.style.display = 'none';
                    });
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
                console.log('Probe initiated for system:', system.star_name);
                // TODO: Implement probe functionality
            });
        }

        if (warpButton && !isCurrentSector) {
            warpButton.addEventListener('click', () => {
                if (warpButton && !isCurrentSector) {
                    const currentEnergy = this.viewManager.getShipEnergy();
                    const requiredEnergy = warpEnergy;
                    
                    if (requiredEnergy > currentEnergy) {
                        this.viewManager.warpFeedback.showWarning(
                            'Insufficient Energy',
                            `Required: ${requiredEnergy} energy units\n\nAvailable: ${currentEnergy} energy units`,
                            () => {
                                // Keep the galactic chart visible after warning is closed
                                this.show();
                            }
                        );
                    } else {
                        console.log('Warp initiated to system:', coordinates);
                        // Hide the galactic chart
                        this.hide();
                        // Initiate the warp process
                        this.viewManager.warpDriveManager.navigateToSector(coordinates);
                    }
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
            console.log('Converted sector', systemIndex, 'to index:', systemIndex);
        }

        // Ensure grid is initialized
        if (!this.gridContainer.children.length) {
            console.log('Grid not initialized, initializing now');
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
                console.log('Updated ship location to index:', systemIndex);
            } else {
                console.warn('Grid cell not found for index:', systemIndex);
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
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 