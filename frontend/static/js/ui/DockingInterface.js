/**
 * DockingInterface - UI for services available while docked at planets/moons
 */
export class DockingInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.dockedLocation = null;
        
        this.createDockingUI();
    }

    createDockingUI() {
        // Create main docking interface container
        this.container = document.createElement('div');
        this.container.className = 'docking-interface';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            min-height: 300px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ff41;
            color: #00ff41;
            font-family: "Courier New", monospace;
            padding: 20px;
            display: none;
            z-index: 2000;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        `;

        // Create header section
        this.header = document.createElement('div');
        this.header.className = 'docking-header';
        this.header.style.cssText = `
            text-align: center;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 15px;
            margin-bottom: 20px;
        `;

        // Create services section
        this.servicesContainer = document.createElement('div');
        this.servicesContainer.className = 'docking-services';
        this.servicesContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        // Create action buttons
        this.createActionButtons();

        // Assemble the interface
        this.container.appendChild(this.header);
        this.container.appendChild(this.servicesContainer);

        // Add to document
        document.body.appendChild(this.container);

        // Add CSS styles
        this.addStyles();
    }

    createActionButtons() {
        // Launch button
        this.launchButton = this.createServiceButton(
            'LAUNCH',
            'Return to your ship and launch into space',
            'launch-button',
            () => this.handleLaunch()
        );

        // Repair button
        this.repairButton = this.createServiceButton(
            'REPAIR SHIP',
            'Repair hull damage and system malfunctions',
            'repair-button',
            () => this.handleRepair()
        );

        // Shop button
        this.shopButton = this.createServiceButton(
            'SYSTEM SHOP',
            'Purchase and upgrade ship systems',
            'shop-button',
            () => this.handleShop()
        );

        // Add buttons to services container
        this.servicesContainer.appendChild(this.launchButton);
        this.servicesContainer.appendChild(this.repairButton);
        this.servicesContainer.appendChild(this.shopButton);
    }

    createServiceButton(title, description, className, clickHandler) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = `service-button ${className}`;
        buttonContainer.style.cssText = `
            background: rgba(0, 255, 65, 0.1);
            border: 1px solid #00ff41;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 3px;
        `;

        buttonContainer.innerHTML = `
            <div class="service-title" style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
                ${title}
            </div>
            <div class="service-description" style="font-size: 12px; opacity: 0.8;">
                ${description}
            </div>
        `;

        // Add click handler
        buttonContainer.addEventListener('click', clickHandler);

        // Add hover effects
        buttonContainer.addEventListener('mouseenter', () => {
            buttonContainer.style.background = 'rgba(0, 255, 65, 0.2)';
            buttonContainer.style.transform = 'scale(1.02)';
            buttonContainer.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
        });

        buttonContainer.addEventListener('mouseleave', () => {
            buttonContainer.style.background = 'rgba(0, 255, 65, 0.1)';
            buttonContainer.style.transform = 'scale(1)';
            buttonContainer.style.boxShadow = 'none';
        });

        return buttonContainer;
    }

    show(dockedLocation) {
        this.dockedLocation = dockedLocation;
        this.isVisible = true;
        
        // Update header with location info
        this.updateHeader();
        
        // Update button availability based on location
        this.updateButtonStates();
        
        // Show the interface
        this.container.style.display = 'block';
        
        console.log('Docking interface shown for:', dockedLocation);
    }

    hide() {
        this.isVisible = false;
        this.dockedLocation = null;
        this.container.style.display = 'none';
        console.log('Docking interface hidden');
    }

    updateHeader() {
        if (!this.dockedLocation) return;

        // Get location info from solar system manager
        const info = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(this.dockedLocation);
        
        this.header.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 8px;">DOCKED AT</div>
            <div style="font-size: 24px; font-weight: bold; color: #ffffff;">${info?.name || 'Unknown Location'}</div>
            <div style="font-size: 14px; margin-top: 5px; opacity: 0.8;">
                ${info?.type?.toUpperCase() || 'UNKNOWN'} • ${info?.diplomacy?.toUpperCase() || 'NEUTRAL'}
            </div>
        `;
    }

    updateButtonStates() {
        if (!this.dockedLocation) return;

        // If you can dock, you can use all services
        // Hostile planets won't allow docking in the first place
        
        // All services are always available when docked
        [this.launchButton, this.repairButton, this.shopButton].forEach(button => {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            button.title = ''; // Clear any disabled tooltips
        });
    }

    handleLaunch() {
        console.log('Launch button clicked from docking interface');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Hide docking interface
        this.hide();
        
        // Trigger undocking
        this.starfieldManager.undock();
    }

    handleRepair() {
        console.log('Repair service requested');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // TODO: Implement repair functionality
        // For now, show a placeholder message
        console.log('Repair services coming soon! Hull and system repairs will be available here.');
    }

    handleShop() {
        console.log('System shop requested');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // TODO: Implement shop functionality
        // For now, show a placeholder message
        console.log('System shop coming soon! Upgrade and purchase ship systems here.');
    }

    addStyles() {
        // Add CSS for additional styling
        const style = document.createElement('style');
        style.textContent = `
            .docking-interface .service-button.launch-button {
                border-color: #00aa41;
            }
            
            .docking-interface .service-button.launch-button:hover {
                border-color: #00ff41;
                background: rgba(0, 170, 65, 0.2) !important;
            }
            
            .docking-interface .service-button.repair-button {
                border-color: #ffaa00;
                color: #ffaa00;
            }
            
            .docking-interface .service-button.repair-button:hover {
                border-color: #ffcc00;
                background: rgba(255, 170, 0, 0.1) !important;
            }
            
            .docking-interface .service-button.shop-button {
                border-color: #0099ff;
                color: #0099ff;
            }
            
            .docking-interface .service-button.shop-button:hover {
                border-color: #00bbff;
                background: rgba(0, 153, 255, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 