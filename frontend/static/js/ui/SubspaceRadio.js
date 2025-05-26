/**
 * SubspaceRadio - Ticker tape style notification system
 * Displays scrolling messages across the bottom of the screen
 * Toggleable with R key, integrates with ship's subspace radio system
 */

export default class SubspaceRadio {
    constructor(ship) {
        this.ship = ship;
        this.starfieldManager = null; // Will be set by ViewManager
        this.isVisible = false;
        this.isEnabled = false;
        this.currentMessage = '';
        this.messageQueue = [];
        this.scrollPosition = 0;
        this.scrollSpeed = 1; // pixels per frame
        this.messageWidth = 0;
        this.containerWidth = 0;
        this.isScrolling = false; // Track if a message is currently scrolling
        this.wasManuallyDeactivated = false; // Track if user manually deactivated vs system failure
        
        // Message categories and their colors
        this.messageTypes = {
            navigation: '#00ff41',    // Green - navigation/traffic
            trade: '#ffff00',         // Yellow - commerce/trade
            military: '#ff6600',      // Orange - military/security
            emergency: '#ff4444',     // Bright Red - emergency/distress
            system: '#00ffff',        // Cyan - system status/intel
            general: '#ffffff'        // White - general messages
        };
        
        // Predefined message pool
        this.messagePool = [
            // Navigation & Traffic Control
            { text: "Sector A4 traffic control: Heavy freighter convoy passing through grid 7-9, maintain safe distance", type: "navigation" },
            { text: "Navigation warning: Solar storm activity detected in Sector B2, recommend alternate routes", type: "navigation" },
            { text: "Hyperspace beacon offline in Sector C6, use manual navigation protocols", type: "navigation" },
            { text: "Traffic advisory: Increased shipping activity in core sectors, expect delays", type: "navigation" },
            { text: "Jump gate maintenance scheduled for Sector D5, temporary closure 0800-1200 hours", type: "navigation" },
            
            // Trade & Commerce
            { text: "Commodity prices updated: Dilithium crystals up 12% at Starbase Alpha", type: "trade" },
            { text: "Trade route disruption: Pirate activity reported along the Centauri shipping lanes", type: "trade" },
            { text: "New trade agreement signed between Federation and Klingon Empire, tariffs reduced", type: "trade" },
            { text: "Market alert: Rare earth metals in high demand, premium prices offered", type: "trade" },
            { text: "Trading post Beta-9 reports full cargo bays, seeking immediate transport contracts", type: "trade" },
            
            // Military & Security
            { text: "Fleet Command: All vessels maintain yellow alert status in contested sectors", type: "military" },
            { text: "Security bulletin: Unidentified ships detected near the neutral zone", type: "military" },
            { text: "Patrol update: Sector sweep complete, no hostile contacts detected", type: "military" },
            { text: "Defense grid online: All stations report ready status", type: "military" },
            { text: "Border patrol: Increased surveillance in outer rim territories", type: "military" },
            
            // Emergency & Distress
            { text: "Mayday relay: Civilian transport requesting assistance in grid 4-7", type: "emergency" },
            { text: "Medical emergency: Hospital ship en route to mining colony Beta-7", type: "emergency" },
            { text: "Search and rescue: Missing explorer vessel last seen in asteroid field", type: "emergency" },
            { text: "Emergency broadcast: Evacuation procedures in effect for Station Gamma", type: "emergency" },
            { text: "Distress signal detected: Automated beacon from coordinates 127.4, 89.2", type: "emergency" },
            
            // System Status & Maintenance
            { text: "Starbase maintenance: Docking bay 3 offline for repairs, use alternate berths", type: "system" },
            { text: "Subspace relay station performing routine diagnostics, expect brief interruptions", type: "system" },
            { text: "Orbital platform reports all systems nominal, docking clearance granted", type: "system" },
            { text: "Communication array upgrade complete, improved signal strength in outer sectors", type: "system" },
            { text: "Power grid maintenance: Temporary brownouts possible in industrial sectors", type: "system" },
            
            // General Information
            { text: "Galactic Standard Time: 2387.156.14:32 - Current stardate synchronized", type: "general" },
            { text: "Weather advisory: Ion storms predicted in the Vega system, shield modifications recommended", type: "general" },
            { text: "Cultural exchange: Vulcan science delegation arriving at Deep Space 9", type: "general" },
            { text: "Scientific discovery: New exoplanet discovered in the Kepler-442 system", type: "general" },
            { text: "Diplomatic mission: Peace talks scheduled between warring factions in Sector F8", type: "general" }
        ];
        
        this.messageInterval = null;
        this.lastMessageTime = 0;
        this.messageDelay = 15000; // 15 seconds between messages
        
        this.createUI();
        this.bindEvents();
        
        console.log('SubspaceRadio initialized');
    }
    
    setStarfieldManager(manager) {
        this.starfieldManager = manager;
    }
    
    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'subspace-radio';
        this.container.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: rgba(0, 0, 0, 0.8);
            border-top: 1px solid #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            color: #00ff41;
            overflow: hidden;
            z-index: 1500;
            display: none;
            box-shadow: 0 -2px 10px rgba(0, 255, 65, 0.2);
        `;
        
        // Create scrolling text container
        this.textContainer = document.createElement('div');
        this.textContainer.style.cssText = `
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            white-space: nowrap;
            transition: none;
            padding: 0 20px;
        `;
        
        // Create status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.style.cssText = `
            position: absolute;
            top: 2px;
            right: 10px;
            font-size: 10px;
            color: #00ff41;
            opacity: 0.7;
        `;
        this.statusIndicator.textContent = 'SUBSPACE RADIO';
        
        this.container.appendChild(this.textContainer);
        this.container.appendChild(this.statusIndicator);
        document.body.appendChild(this.container);
        
        // Get container width for scrolling calculations
        this.containerWidth = window.innerWidth;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.containerWidth = window.innerWidth;
        });
    }
    
    bindEvents() {
        // Bind R key for toggle
        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'r') {
                this.toggle();
            }
        });
    }
    
    toggle() {
        if (!this.ship) {
            console.warn('No ship available for subspace radio');
            return;
        }
        
        const subspaceRadio = this.ship.getSystem('subspace_radio');
        if (!subspaceRadio) {
            console.warn('No subspace radio system found on ship');
            return;
        }
        
        // Play command sound for the toggle action
        if (this.starfieldManager && this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        if (this.isVisible) {
            this.hide();
            // Deactivate the system - this is a manual deactivation
            if (subspaceRadio.isActive) {
                this.wasManuallyDeactivated = true;
                subspaceRadio.deactivateRadio();
            }
        } else {
            // Check if system can be activated
            if (!subspaceRadio.canActivate(this.ship)) {
                if (!subspaceRadio.isOperational()) {
                    console.warn('Cannot activate Subspace Radio: System damaged or offline');
                } else {
                    console.warn('Cannot activate Subspace Radio: Insufficient energy');
                }
                return;
            }
            
            // Activate the system - clear manual deactivation flag
            this.wasManuallyDeactivated = false;
            if (subspaceRadio.activateRadio(this.ship)) {
                this.show();
            } else {
                console.warn('Failed to activate Subspace Radio');
            }
        }
    }
    
    show() {
        this.isVisible = true;
        this.isEnabled = true;
        this.container.style.display = 'block';
        
        // Update status indicator based on system health
        this.updateStatusIndicator();
        
        // Start message cycling
        this.startMessageCycle();
        
        console.log('Subspace Radio activated');
    }
    
    hide() {
        this.isVisible = false;
        this.isEnabled = false;
        this.container.style.display = 'none';
        
        // Stop message cycling
        this.stopMessageCycle();
        
        console.log('Subspace Radio deactivated');
    }
    
    startMessageCycle() {
        // Clear any existing interval
        this.stopMessageCycle();
        
        // Show first message immediately
        this.showNextMessage();
        
        // Set up interval for subsequent messages
        this.messageInterval = setInterval(() => {
            this.showNextMessage();
        }, this.messageDelay);
    }
    
    stopMessageCycle() {
        if (this.messageInterval) {
            clearInterval(this.messageInterval);
            this.messageInterval = null;
        }
    }
    
    showNextMessage() {
        if (!this.isEnabled) return;
        
        // Check if system is operational before showing messages
        if (this.ship) {
            const subspaceRadio = this.ship.getSystem('subspace_radio');
            if (!subspaceRadio || !subspaceRadio.isOperational()) {
                // System is destroyed, don't show new messages
                return;
            }
        }
        
        // If a message is currently scrolling, queue the next message instead
        if (this.isScrolling) {
            const message = this.getRandomMessage();
            this.messageQueue.push(message);
            return;
        }
        
        // Check if there are queued messages first
        let message;
        if (this.messageQueue.length > 0) {
            message = this.messageQueue.shift();
        } else {
            message = this.getRandomMessage();
        }
        
        this.displayMessage(message);
    }
    
    getRandomMessage() {
        // Add some context-aware message selection based on game state
        let availableMessages = [...this.messagePool];
        
        // Try to get intel-based messages from current star system
        const intelMessages = this.generateIntelMessages();
        if (intelMessages.length > 0) {
            availableMessages = [...availableMessages, ...intelMessages];
        }
        
        // Filter messages based on ship status or location if needed
        // For now, just return random message from expanded pool
        const randomIndex = Math.floor(Math.random() * availableMessages.length);
        return availableMessages[randomIndex];
    }
    
    generateIntelMessages() {
        const intelMessages = [];
        
        // Get current star system data from starfield manager
        if (!this.starfieldManager || !this.starfieldManager.solarSystemManager) {
            return intelMessages;
        }
        
        const solarSystemManager = this.starfieldManager.solarSystemManager;
        const starSystem = solarSystemManager.starSystem;
        
        if (!starSystem) {
            return intelMessages;
        }
        
        const currentSector = solarSystemManager.getCurrentSector();
        
        // Generate star-based intel messages
        if (starSystem.star_name && starSystem.intel_brief) {
            intelMessages.push({
                text: `Intel Report - ${currentSector}: ${starSystem.intel_brief}`,
                type: 'system'
            });
            
            // Add star description as navigation info
            if (starSystem.description) {
                intelMessages.push({
                    text: `Navigation Advisory - ${starSystem.star_name}: ${starSystem.description}`,
                    type: 'navigation'
                });
            }
        }
        
        // Generate planet-based intel messages
        if (starSystem.planets && Array.isArray(starSystem.planets)) {
            starSystem.planets.forEach((planet, index) => {
                if (planet.intel_brief) {
                    // Determine message type based on diplomacy status
                    let messageType = 'general';
                    if (planet.diplomacy === 'enemy') {
                        messageType = 'military';
                    } else if (planet.diplomacy === 'friendly') {
                        messageType = 'trade';
                    } else if (planet.diplomacy === 'unknown') {
                        messageType = 'navigation';
                    }
                    
                    intelMessages.push({
                        text: `Planetary Intel - ${planet.planet_name || `Planet ${index + 1}`}: ${planet.intel_brief}`,
                        type: messageType
                    });
                }
                
                // Add planet descriptions as general information
                if (planet.description) {
                    intelMessages.push({
                        text: `Survey Data - ${planet.planet_name || `Planet ${index + 1}`}: ${planet.description}`,
                        type: 'general'
                    });
                }
                
                // Generate moon-based intel messages
                if (planet.moons && Array.isArray(planet.moons)) {
                    planet.moons.forEach((moon, moonIndex) => {
                        if (moon.intel_brief) {
                            let moonMessageType = 'general';
                            if (moon.diplomacy === 'enemy') {
                                moonMessageType = 'military';
                            } else if (moon.diplomacy === 'friendly') {
                                moonMessageType = 'trade';
                            }
                            
                            intelMessages.push({
                                text: `Lunar Intel - ${moon.moon_name || `Moon ${moonIndex + 1}`}: ${moon.intel_brief}`,
                                type: moonMessageType
                            });
                        }
                        
                        // Add moon descriptions
                        if (moon.description) {
                            intelMessages.push({
                                text: `Lunar Survey - ${moon.moon_name || `Moon ${moonIndex + 1}`}: ${moon.description}`,
                                type: 'general'
                            });
                        }
                    });
                }
            });
        }
        
        // Generate strategic intelligence based on system composition
        if (starSystem.planets && starSystem.planets.length > 0) {
            const friendlyPlanets = starSystem.planets.filter(p => p.diplomacy === 'friendly').length;
            const enemyPlanets = starSystem.planets.filter(p => p.diplomacy === 'enemy').length;
            const neutralPlanets = starSystem.planets.filter(p => p.diplomacy === 'neutral').length;
            const unknownPlanets = starSystem.planets.filter(p => p.diplomacy === 'unknown').length;
            
            // Generate strategic overview messages
            if (enemyPlanets > friendlyPlanets) {
                intelMessages.push({
                    text: `Strategic Alert - ${currentSector}: Hostile territory detected. ${enemyPlanets} enemy installations identified. Recommend enhanced defensive posture.`,
                    type: 'military'
                });
            } else if (friendlyPlanets > 0) {
                intelMessages.push({
                    text: `Trade Opportunity - ${currentSector}: ${friendlyPlanets} allied worlds available for commerce. Favorable trade conditions expected.`,
                    type: 'trade'
                });
            }
            
            if (unknownPlanets > 2) {
                intelMessages.push({
                    text: `Exploration Notice - ${currentSector}: ${unknownPlanets} uncharted worlds detected. First contact protocols recommended.`,
                    type: 'navigation'
                });
            }
            
            // Technology level analysis
            const advancedWorlds = starSystem.planets.filter(p => 
                p.technology === 'Intergalactic' || p.technology === 'Interstellar'
            ).length;
            
            if (advancedWorlds > 0) {
                intelMessages.push({
                    text: `Technology Report - ${currentSector}: ${advancedWorlds} advanced civilizations detected. Potential for technology exchange opportunities.`,
                    type: 'system'
                });
            }
            
            // Economic analysis
            const industrialWorlds = starSystem.planets.filter(p => 
                p.economy === 'Industrial' || p.economy === 'Technological'
            ).length;
            
            if (industrialWorlds > 0) {
                intelMessages.push({
                    text: `Economic Analysis - ${currentSector}: ${industrialWorlds} industrial centers identified. Repair and upgrade services likely available.`,
                    type: 'trade'
                });
            }
        }
        
        return intelMessages;
    }
    
    displayMessage(message) {
        // Don't start a new message if one is already scrolling
        if (this.isScrolling) {
            this.messageQueue.push(message);
            return;
        }
        
        // Check if system is operational before displaying messages
        if (this.ship) {
            const subspaceRadio = this.ship.getSystem('subspace_radio');
            if (!subspaceRadio || !subspaceRadio.isOperational()) {
                // System is destroyed, don't display new messages
                return;
            }
        }
        
        this.currentMessage = message;
        
        // Enhanced formatting for intel-based messages
        let displayText = message.text;
        if (typeof message === 'object' && message.text && message.text.includes('Intel Report') || 
            message.text.includes('Planetary Intel') || 
            message.text.includes('Lunar Intel') ||
            message.text.includes('Strategic Alert') ||
            message.text.includes('Trade Opportunity') ||
            message.text.includes('Exploration Notice') ||
            message.text.includes('Technology Report') ||
            message.text.includes('Economic Analysis') ||
            message.text.includes('Navigation Advisory') ||
            message.text.includes('Survey Data') ||
            message.text.includes('Lunar Survey')) {
            
            // Add timestamp for intel messages
            const timestamp = new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Add priority indicator based on message type
            let priorityIndicator = '';
            switch (message.type) {
                case 'military':
                    priorityIndicator = '[PRIORITY]';
                    break;
                case 'system':
                    priorityIndicator = '[INTEL]';
                    break;
                case 'trade':
                    priorityIndicator = '[COMMERCE]';
                    break;
                case 'navigation':
                    priorityIndicator = '[NAV]';
                    break;
                default:
                    priorityIndicator = '[INFO]';
            }
            
            displayText = `${timestamp} ${priorityIndicator} ${message.text}`;
        }
        
        // Set text content and color
        this.textContainer.textContent = displayText;
        this.textContainer.style.color = this.messageTypes[message.type] || this.messageTypes.general;
        
        // Reset scroll position
        this.scrollPosition = this.containerWidth;
        this.textContainer.style.left = this.scrollPosition + 'px';
        
        // Get text width for scrolling
        this.messageWidth = this.textContainer.offsetWidth;
        
        // Start scrolling animation
        this.startScrolling();
    }
    
    startScrolling() {
        this.isScrolling = true;
        
        const scroll = () => {
            if (!this.isEnabled) {
                this.isScrolling = false;
                return;
            }
            
            // Check if system is still operational during scrolling
            if (this.ship) {
                const subspaceRadio = this.ship.getSystem('subspace_radio');
                if (!subspaceRadio || !subspaceRadio.isOperational()) {
                    // System was destroyed during scrolling, stop immediately
                    this.isScrolling = false;
                    this.textContainer.textContent = '';
                    return;
                }
            }
            
            this.scrollPosition -= this.scrollSpeed;
            this.textContainer.style.left = this.scrollPosition + 'px';
            
            // Check if message has completely scrolled off screen
            if (this.scrollPosition < -this.messageWidth) {
                // Message finished scrolling
                this.isScrolling = false;
                
                // Check if there are queued messages to display
                if (this.messageQueue.length > 0) {
                    const nextMessage = this.messageQueue.shift();
                    // Use setTimeout to avoid immediate recursion
                    setTimeout(() => this.displayMessage(nextMessage), 100);
                }
                return;
            }
            
            // Continue scrolling
            requestAnimationFrame(scroll);
        };
        
        requestAnimationFrame(scroll);
    }
    
    // Method to add custom messages (for game events)
    addMessage(text, type = 'general') {
        const message = { text, type };
        
        // If currently showing messages, queue it
        if (this.isEnabled) {
            this.messageQueue.push(message);
        }
    }
    
    // Method to add urgent messages that display immediately
    addUrgentMessage(text, type = 'emergency') {
        if (this.isEnabled) {
            const message = { text, type };
            // Urgent messages go to the front of the queue
            this.messageQueue.unshift(message);
            
            // If nothing is currently scrolling, start the urgent message immediately
            if (!this.isScrolling) {
                const urgentMessage = this.messageQueue.shift();
                this.displayMessage(urgentMessage);
            }
        }
    }
    
    // Update method called from game loop
    update(deltaTime) {
        // Check if subspace radio system is still operational
        if (this.isVisible && this.ship) {
            const subspaceRadio = this.ship.getSystem('subspace_radio');
            if (!subspaceRadio) {
                // System completely missing, hide radio
                this.hide();
            } else if (!subspaceRadio.isActive && this.wasManuallyDeactivated) {
                // System was manually deactivated by user, hide radio
                this.hide();
            } else {
                // System exists, update status indicator regardless of active state
                this.updateStatusIndicator();
                
                // If system is destroyed/not operational, stop message cycling but keep HUD visible
                if (!subspaceRadio.isOperational()) {
                    // Stop message cycling for destroyed systems
                    this.stopMessageCycle();
                    this.isEnabled = false; // Disable new messages but keep HUD visible
                    
                    // Clear any current scrolling message
                    if (this.isScrolling) {
                        this.isScrolling = false;
                        this.textContainer.textContent = '';
                    }
                } else if (subspaceRadio.isActive) {
                    // System is operational and active, ensure message cycling is active
                    if (!this.isEnabled) {
                        this.isEnabled = true;
                        this.startMessageCycle();
                    }
                } else {
                    // System is operational but not active (e.g., insufficient energy), stop messages
                    this.stopMessageCycle();
                    this.isEnabled = false;
                    
                    // Clear any current scrolling message
                    if (this.isScrolling) {
                        this.isScrolling = false;
                        this.textContainer.textContent = '';
                    }
                }
            }
        }
    }
    
    dispose() {
        this.stopMessageCycle();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        console.log('SubspaceRadio disposed');
    }
    
    /**
     * Update the status indicator text based on system damage state
     */
    updateStatusIndicator() {
        if (!this.ship) return;
        
        const subspaceRadio = this.ship.getSystem('subspace_radio');
        if (!subspaceRadio) {
            this.statusIndicator.textContent = 'SUBSPACE RADIO - OFFLINE';
            this.statusIndicator.style.color = '#ff4444';
            return;
        }
        
        // Import system states for comparison
        import('../ship/System.js').then(({ SYSTEM_STATES }) => {
            const systemState = subspaceRadio.state;
            
            switch (systemState) {
                case SYSTEM_STATES.OPERATIONAL:
                    this.statusIndicator.textContent = 'SUBSPACE RADIO';
                    this.statusIndicator.style.color = '#00ff41'; // Green
                    break;
                case SYSTEM_STATES.DAMAGED:
                    this.statusIndicator.textContent = 'SUBSPACE RADIO - DAMAGED';
                    this.statusIndicator.style.color = '#ffff00'; // Yellow
                    break;
                case SYSTEM_STATES.CRITICAL:
                    this.statusIndicator.textContent = 'SUBSPACE RADIO - DAMAGED';
                    this.statusIndicator.style.color = '#ffff00'; // Yellow
                    break;
                case SYSTEM_STATES.DISABLED:
                    this.statusIndicator.textContent = 'SUBSPACE RADIO - DESTROYED';
                    this.statusIndicator.style.color = '#ff4444'; // Bright Red
                    break;
                default:
                    this.statusIndicator.textContent = 'SUBSPACE RADIO';
                    this.statusIndicator.style.color = '#00ff41';
                    break;
            }
        }).catch(error => {
            console.warn('Could not import SYSTEM_STATES:', error);
            // Fallback to health percentage check
            const healthPercentage = subspaceRadio.healthPercentage;
            
            if (healthPercentage <= 0) {
                this.statusIndicator.textContent = 'SUBSPACE RADIO - DESTROYED';
                this.statusIndicator.style.color = '#ff4444'; // Bright Red
            } else if (healthPercentage <= 0.5) {
                this.statusIndicator.textContent = 'SUBSPACE RADIO - DAMAGED';
                this.statusIndicator.style.color = '#ffff00'; // Yellow
            } else {
                this.statusIndicator.textContent = 'SUBSPACE RADIO';
                this.statusIndicator.style.color = '#00ff41'; // Green
            }
        });
    }
} 