import * as THREE from 'three';

export class GalacticChart {
    constructor(viewManager) {
        this.viewManager = viewManager;
        
        // Create the modal container
        this.container = document.createElement('div');
        this.container.className = 'galactic-chart';

        // Create the close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = 'X';
        this.closeButton.className = 'close-button';
        this.container.appendChild(this.closeButton);

        // Create the grid container
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'grid-container';
        this.container.appendChild(this.gridContainer);

        // Add header row (0-9)
        for (let i = 0; i < 10; i++) {
            const header = document.createElement('div');
            header.textContent = i;
            header.className = 'grid-header';
            this.gridContainer.appendChild(header);
        }

        // Add grid cells (A-Z rows)
        for (let row = 0; row < 26; row++) {
            // Add row label (A-Z)
            const rowLabel = document.createElement('div');
            rowLabel.textContent = String.fromCharCode(65 + row);
            rowLabel.className = 'grid-row-label';
            this.gridContainer.appendChild(rowLabel);

            // Add cells for this row
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                this.gridContainer.appendChild(cell);
            }
        }

        // Add event listeners
        this.closeButton.addEventListener('click', () => {
            // When closing via X button, restore the previous view through ViewManager
            this.viewManager.restorePreviousView();
            this.hide(false); // Hide without triggering another view restoration
        });
        
        document.addEventListener('keydown', (event) => {
            if (this.container.style.display === 'block') {
                const key = event.key.toLowerCase();
                if (key === 'g' || key === 'a' || key === 'f' || key === 'escape') {
                    // Hide the chart first
                    this.hide(false);
                    
                    // If A or F was pressed, switch to that view
                    if (key === 'a') {
                        this.viewManager.setView(this.viewManager.VIEW_TYPES.AFT);
                    } else if (key === 'f') {
                        this.viewManager.setView(this.viewManager.VIEW_TYPES.FRONT);
                    } else {
                        // For G or Escape, restore the previous view
                        this.viewManager.restorePreviousView();
                    }
                }
            }
        });

        // Add to document
        document.body.appendChild(this.container);
    }

    show() {
        this.container.style.display = 'block';
    }

    hide(shouldRestoreView = false) {
        this.container.style.display = 'none';
        // Only restore the previous view if explicitly requested
        if (shouldRestoreView && this.viewManager) {
            this.viewManager.restorePreviousView();
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 