import { debug } from '../debug.js';

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
        
        // Predefined message pool - Updated for Planetz Universe
        this.messagePool = [
            // Navigation & Traffic Control
            { text: "Sol System Traffic Control: Heavy freighter convoy departing Terra Prime, all vessels maintain 15km clearance", type: "navigation" },
            { text: "Navigation warning: Solar storm activity detected near Jupiter's magnetosphere, recommend alternate routes through asteroid belt", type: "navigation" },
            { text: "Hyperspace beacon offline at Mars Orbital Station, use manual navigation protocols for inner system transit", type: "navigation" },
            { text: "Traffic advisory: Increased Free Trader Consortium shipping to Europa Station, expect delays at docking bays", type: "navigation" },
            { text: "Jump gate maintenance scheduled for Luna Station, temporary closure 0800-1200 Sol Standard Time", type: "navigation" },
            { text: "Asteroid belt mining operations active in Sector 7, mining vessels have right of way", type: "navigation" },
            { text: "Ceres Research Lab requesting clear approach vector for incoming Zephyrian Collective science vessel", type: "navigation" },
            
            // Trade & Commerce - Updated for new factions
            { text: "Free Trader Consortium price update: Rare earth minerals up 18% at Europa Station", type: "trade" },
            { text: "Trade route disruption: Crimson Raider Clan activity reported along the Outer Rim shipping lanes", type: "trade" },
            { text: "New trade agreement signed between Terran Republic Alliance and Zephyrian Collective, crystal technology exports increased", type: "trade" },
            { text: "Market alert: Exotic matter in high demand for Nexus Corporate research projects, premium prices offered", type: "trade" },
            { text: "Mining Station Alpha reports full dilithium cargo holds, seeking immediate transport contracts to Alliance worlds", type: "trade" },
            { text: "Scientists Consortium offering technology exchange program at Ceres Research Lab", type: "trade" },
            { text: "Draconis Imperium trade embargo lifted on rare metal exports, markets expected to surge", type: "trade" },
            
            // Military & Security - Alliance focus
            { text: "Alliance Command: All vessels maintain yellow alert status in contested outer rim territories", type: "military" },
            { text: "Security bulletin: Shadow Consortium infiltrator ships detected near Alliance defensive perimeter", type: "military" },
            { text: "Patrol update: Captain James Sullivan reports sector sweep complete, no Void Cult contacts detected", type: "military" },
            { text: "Defense grid online: Luna Station, Mars Orbital, and Europa Station report ready status", type: "military" },
            { text: "Admiral Sarah Chen: Increased patrols authorized for frontier colonies after recent Raider attacks", type: "military" },
            { text: "Border patrol: Unknown vessels probing Ethereal Wanderer territory boundaries", type: "military" },
            { text: "Military intelligence: Crimson Raider Clan fleet movements detected in Sector 12", type: "military" },
            
            // Emergency & Distress
            { text: "Mayday relay: Civilian transport 'Stellar Hope' requesting assistance near Europa Station", type: "emergency" },
            { text: "Medical emergency: Alliance hospital ship en route to mining colony under Raider attack", type: "emergency" },
            { text: "Search and rescue: Missing explorer vessel 'Deep Survey' last seen in uncharted system", type: "emergency" },
            { text: "Emergency broadcast: Evacuation procedures in effect for Frontier Station Omega due to Void Cult incursion", type: "emergency" },
            { text: "Distress signal detected: Automated beacon from coordinates 247.9, 156.3 - possible Architect artifact site", type: "emergency" },
            { text: "Priority medical: Dr. Marcus Webb requesting immediate transport to alien artifact excavation site", type: "emergency" },
            
            // System Status & Maintenance
            { text: "Terra Prime Starbase maintenance: Docking bay 7 offline for repairs, use alternate berths", type: "system" },
            { text: "Luna Station subspace relay performing routine diagnostics, expect brief communication interruptions", type: "system" },
            { text: "Mars Orbital Platform reports all systems nominal, docking clearance granted for Alliance vessels", type: "system" },
            { text: "Ceres Research Lab communication array upgrade complete, improved sensor range for deep space monitoring", type: "system" },
            { text: "Europa Station power grid maintenance: Temporary restrictions on industrial fabrication systems", type: "system" },
            { text: "Mining Station Alpha reactor efficiency optimized, production capacity increased by 15%", type: "system" },
            
            // Faction-Specific Intelligence
            { text: "Zephyrian Collective harmonic transmission detected: Crystal formations showing increased resonance activity", type: "system" },
            { text: "Draconis Imperium border status: Military exercises concluded, trade routes reopened", type: "military" },
            { text: "Nexus Corporate Syndicate research bulletin: Breakthrough in quantum drive efficiency announced", type: "general" },
            { text: "Ethereal Wanderer fleet spotted in deep space: Purpose unknown, maintaining peaceful trajectory", type: "navigation" },
            { text: "Scientists Consortium discovery: Ancient Architect ruins found on asteroid designation SC-4471", type: "general" },
            
            // Mission Giver Activities
            { text: "Ambassador Elena Rodriguez scheduling diplomatic escort missions to neutral territories", type: "general" },
            { text: "Director Lisa Park coordinating multi-system defense initiative from Earth Orbital Command", type: "military" },
            { text: "Captain Morrison reporting successful medical supply delivery to frontier mining colonies", type: "trade" },
            { text: "Admiral Sarah Chen authorizing exploration contracts for uncharted system survey", type: "general" },
            
            // World Events & General Information
            { text: "Sol Standard Time: 2387.203.16:45 - All stations synchronized to Earth Orbital Command", type: "general" },
            { text: "Space weather advisory: Ion storms predicted near Outer Rim, enhanced shielding recommended", type: "general" },
            { text: "Cultural exchange: Zephyrian meditation crystals arriving at Terra Prime for diplomatic exhibition", type: "general" },
            { text: "Scientific breakthrough: New hyperdrive efficiency improvements tested at Ceres Research Lab", type: "general" },
            { text: "Diplomatic mission: Peace negotiations scheduled between Free Traders and mining guild representatives", type: "general" },
            { text: "Archaeological report: Architect artifact analysis reveals advanced quantum manipulation technology", type: "general" },
            { text: "Galactic news: Crimson Raider Clans reportedly developing new stealth technology", type: "military" },
            { text: "Economic update: Alliance credits maintain stability despite recent Outer Rim conflicts", type: "trade" }
        ];
        
        this.messageInterval = null;
        this.lastMessageTime = 0;
        this.messageDelay = 15000; // 15 seconds between messages
        
        this.createUI();
        this.bindEvents();
        
debug('UTILITY', 'SubspaceRadio initialized');
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
            z-index: 900;
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
            // Add HUD error message for missing system
debug('AI', 'SubspaceRadio toggle: starfieldManager available?', !!this.starfieldManager);
            if (this.starfieldManager && this.starfieldManager.showHUDEphemeral) {
                this.starfieldManager.showHUDEphemeral(
                    'SUBSPACE RADIO UNAVAILABLE',
                    'System not installed on this ship'
                );
            } else {
                console.warn('StarfieldManager not available for HUD ephemeral display');
            }
            if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                this.starfieldManager.playCommandFailedSound();
            }
            return;
        }

        if (this.isVisible) {
            // Deactivating - always play command sound
            if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                this.starfieldManager.playCommandSound();
            }
            
            this.hide();
            // Deactivate the system - this is a manual deactivation
            if (subspaceRadio.isActive) {
                this.wasManuallyDeactivated = true;
                subspaceRadio.deactivateRadio();
            }
        } else {
            // Activating - check if system can be activated
            if (!subspaceRadio.canActivate(this.ship)) {
                // System can't be activated - play command failed sound
                if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
                    this.starfieldManager.playCommandFailedSound();
                }
                
                // Show specific error message in HUD
                if (!subspaceRadio.isOperational()) {
                    console.warn('Cannot activate Subspace Radio: System damaged or offline');
                    if (this.starfieldManager && this.starfieldManager.showHUDEphemeral) {
                        this.starfieldManager.showHUDEphemeral(
                            'SUBSPACE RADIO OFFLINE',
                            'System damaged or offline - repair required'
                        );
                    }
                } else if (!this.ship.hasSystemCardsSync('subspace_radio')) {
                    console.warn('Cannot activate Subspace Radio: No subspace radio card installed');
                    if (this.starfieldManager && this.starfieldManager.showHUDEphemeral) {
                        this.starfieldManager.showHUDEphemeral(
                            'SUBSPACE RADIO UNAVAILABLE',
                            'No Subspace Radio card installed in ship slots'
                        );
                    }
                } else {
                    console.warn('Cannot activate Subspace Radio: Insufficient energy');
                    if (this.starfieldManager && this.starfieldManager.showHUDEphemeral) {
                        this.starfieldManager.showHUDEphemeral(
                            'SUBSPACE RADIO ACTIVATION FAILED',
                            'Insufficient energy - need 15 energy units'
                        );
                    }
                }
                return;
            }
            
            // System can be activated - play command sound
            if (this.starfieldManager && this.starfieldManager.playCommandSound) {
                this.starfieldManager.playCommandSound();
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
        
debug('UI', 'Subspace Radio activated');
    }
    
    hide() {
        this.isVisible = false;
        this.isEnabled = false;
        this.container.style.display = 'none';
        
        // Stop message cycling
        this.stopMessageCycle();
        
debug('UI', 'Subspace Radio deactivated');
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
        
        // Add mission-related chatter
        this.addMissionRelatedChatter(intelMessages);
        
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

    addMissionRelatedChatter(intelMessages) {
        // Generate dynamic chatter based on current mission activities
        const missionChatter = [
            { text: "Mission Control: Elimination contracts available in contested sectors, suitable for experienced pilots", type: "military" },
            { text: "Traders Guild bulletin: Delivery missions showing increased demand for frontier colony supplies", type: "trade" },
            { text: "Scientists Consortium: Exploration surveys needed for recently discovered system anomalies", type: "general" },
            { text: "Alliance Command: Escort missions prioritized due to increased raider activity in trade corridors", type: "military" },
            { text: "Freelance dispatch: High-value cargo transport contracts available at Terra Prime", type: "trade" },
            { text: "Research update: Archaeological expeditions seeking experienced pilots for artifact recovery", type: "general" },
            { text: "Security alert: Bounty hunters advised that elimination targets have been updated in system database", type: "military" },
            { text: "Trade commission: New commercial routes established between Alliance and Zephyrian territories", type: "trade" },
            { text: "Mission advisory: Long-range exploration contracts now offering enhanced compensation packages", type: "general" },
            { text: "Diplomatic corps: Escort assignments available for high-ranking officials traveling to neutral space", type: "general" }
        ];
        
        // Add 2-3 mission-related messages to the intel pool
        const selectedChatter = missionChatter.sort(() => 0.5 - Math.random()).slice(0, 3);
        intelMessages.push(...selectedChatter);
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
        
debug('UI', 'SubspaceRadio disposed');
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