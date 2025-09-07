import { debug } from '../debug.js';

/**
 * CommunicationHUD - NPC Communication Interface
 * Displays animated avatar, name, and subtitle dialogue for mission and AI systems
 * Positioned in upper-left between energy display and target CPU
 */

export class CommunicationHUD {
    constructor(starfieldManager, container) {
        this.starfieldManager = starfieldManager;
        this.container = container;
        this.isVisible = false;
        this.currentMessage = null;
        this.animationInterval = null;
        this.messageQueue = [];
        this.isProcessingMessage = false;
        
        // Animation state
        this.avatarAnimationFrame = 0;
        this.animationFrames = 8; // Number of wireframe animation frames
        this.typingInterval = null; // active typewriter interval
        this.hideTimeout = null; // scheduled hide timeout
        // Test/demo mode flag (off by default)
        this.enableTestSequence = false;
        
        // Video mode toggle state (default to video mode)
        this.videoMode = true;
        this.videoElement = null;
        this.audioElement = null;
        
        // Effects toggle state (scan lines + faction colors disabled by default)
        this.effectsEnabled = false;
        
        this.initialize();
    }
    
    initialize() {
        this.createCommunicationContainer();
        this.setupEventListeners();
debug('UI', 'CommunicationHUD: Initialized');
        
        // Make this instance globally accessible for console testing
        window.communicationHUD = this;
        
        // Add test method for mission communications
        this.testMissionComm = () => {
debug('MISSIONS', 'Testing mission communication...');
            this.showMessage(
                'Capt. Cooper',
                'Mission objective completed. Proceed to extraction point for debrief.',
                {
                    channel: 'MISSION.1',
                    status: '■ SUCCESS',
                    duration: 6000,
                    signalStrength: '█████████',
                    faction: 'friendly',
                    audioType: 'mission'
                }
            );
debug('UTILITY', 'Test message sent, dialogue text element:', this.dialogueText);
        };
        
        // Add test methods for different factions
        this.testHostileComm = () => {
            this.showMessage(
                'Raider Captain',
                'You picked the wrong sector to fly through, pilot!',
                {
                    faction: 'enemy',
                    duration: 5000,
                    audioType: 'hostile'
                }
            );
        };
        
        this.testNeutralComm = () => {
            this.showMessage(
                'Trade Station Alpha',
                'Welcome to our trading post. Please state your business.',
                {
                    faction: 'neutral',
                    duration: 5000,
                    audioType: 'neutral'
                }
            );
        };
        
        // Add simple test that sets text directly
        this.testDirectText = () => {
debug('UI', 'Testing direct text display...');
            if (!this.isVisible) {
                this.isVisible = true;
                this.commContainer.style.display = 'block';
            }
            this.updateSpeakerStyling('Test Speaker', 'friendly');
            this.dialogueText.textContent = 'This is a direct text test - no typewriter effect.';
debug('UTILITY', 'Direct text set, element:', this.dialogueText);
debug('UTILITY', 'Text content:', this.dialogueText.textContent);
debug('UI', 'Text area visible:', this.textArea.style.display !== 'none');
        };
        
        // Add test for delivery completion with audio
        this.testDeliveryComplete = () => {
debug('UI', 'Testing delivery completion with audio...');
            this.showMessage(
                'Capt. Cooper',
                'Delivery confirmed. Medical supplies received and accounted for. Thank you for your service.',
                {
                    faction: 'friendly',
                    duration: 8000,
                    isDeliveryComplete: true
                }
            );
        };
        
        // Add test for effects toggle
        this.testEffectsToggle = () => {
debug('UI', 'Testing effects toggle...');
debug('UI', `Current effects state: ${this.effectsEnabled ? 'ENABLED' : 'DISABLED'}`);
            this.toggleEffects();
debug('UI', `New effects state: ${this.effectsEnabled ? 'ENABLED' : 'DISABLED'}`);
        };
        
        // Add manual audio initialization for testing
        this.initAudio = () => {
debug('UTILITY', '🔊 Manually initializing all audio elements...');
            if (this.audioElements) {
                const initPromises = Object.entries(this.audioElements).map(([type, audio]) => {
                    // Store original volume and set to 0 for silent initialization
                    const originalVolume = audio.volume;
                    audio.volume = 0;
                    
                    return audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        // Restore original volume
                        audio.volume = originalVolume;
debug('UTILITY', `🔊 ${type} audio initialized`);
                    }).catch(e => {
                        // Restore original volume even on error
                        audio.volume = originalVolume;
                        console.warn(`🔊 ${type} audio initialization failed:`, e);
                    });
                });
                
                Promise.all(initPromises).then(() => {
                    this.audioInitialized = true;
debug('UTILITY', '🔊 All audio contexts initialized successfully');
                });
            }
        };
    }
    
    /**
     * Create the main communication container with retro styling
     */
    createCommunicationContainer() {
        this.commContainer = document.createElement('div');
        this.commContainer.className = 'communication-container';
        this.commContainer.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            width: 200px;
            height: 320px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00ff41;
            border-radius: 4px;
            font-family: 'VT323', monospace;
            color: #00ff41;
            padding: 10px;
            box-shadow: 
                0 0 20px rgba(0, 255, 65, 0.3),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
            z-index: 1000;
            display: none;
            user-select: none;
            backdrop-filter: blur(2px);
            overflow: hidden;
        `;
        
        // Add scan line overlay effects
        this.addScanLineEffects();
        
        // Create main content area with avatar and right-side info
        this.createContentArea();
        
        this.container.appendChild(this.commContainer);
debug('AI', 'CommunicationHUD: Container created');
    }
    
    /**
     * Add scan line effects to the communication container
     */
    addScanLineEffects() {
        // Add CSS styles for scan line effects
        this.addScanLineStyles();
        
        // Create static scan line overlay (repeating lines)
        const scanLineOverlay = document.createElement('div');
        scanLineOverlay.className = 'comm-scan-lines';
        scanLineOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 65, 0.03) 2px,
                rgba(0, 255, 65, 0.03) 4px
            );
            pointer-events: none;
            z-index: 1;
        `;
        
        // Create animated scan line (positioned to start at video area)
        this.animatedScanLine = document.createElement('div');
        this.animatedScanLine.className = 'comm-scan-line';
        this.animatedScanLine.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            width: 200px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ff41, transparent);
            animation: commScanLine 2s linear infinite;
            opacity: 0.6;
            pointer-events: none;
            z-index: 2;
        `;
        
        this.commContainer.appendChild(scanLineOverlay);
        this.commContainer.appendChild(this.animatedScanLine);
    }
    
    /**
     * Add CSS styles for scan line animations
     */
    addScanLineStyles() {
        if (document.getElementById('comm-scan-line-styles')) return;

        const style = document.createElement('style');
        style.id = 'comm-scan-line-styles';
        style.textContent = `
            @keyframes commScanLine {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 0.6; }
                100% { transform: translateY(150px); opacity: 0; }
            }
        `;

        document.head.appendChild(style);
    }
    
    /**
     * Update scan line color to match faction
     */
    updateScanLineColor(color) {
        if (this.animatedScanLine) {
            this.animatedScanLine.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
        }
    }
    
    /**
     * Update video tint to match faction color
     */
    updateVideoTint(color) {
        if (this.videoElement) {
            // Convert hex color to HSL to calculate hue rotation
            const hueRotation = this.getHueRotationForColor(color);
            this.videoElement.style.filter = `sepia(100%) hue-rotate(${hueRotation}deg) saturate(200%) brightness(0.8)`;
        }
    }
    
    /**
     * Calculate hue rotation needed to achieve target color
     */
    getHueRotationForColor(color) {
        // Map common faction colors to hue rotations
        // Base sepia tone is around 39° hue, so we adjust from there
        switch(color.toLowerCase()) {
            case '#ff3333': // Red (enemy)
                return 0; // Red is close to sepia base
            case '#00ff41': // Green (friendly) 
                return 90; // Rotate to green
            case '#ffff00': // Yellow (neutral)
                return 50; // Rotate to yellow
            case '#44ffff': // Cyan (corporate)
                return 180; // Rotate to cyan
            case '#ff44ff': // Magenta (ethereal)
                return 270; // Rotate to magenta
            case '#d0d0d0': // Gray (unknown)
                return 0; // Keep neutral
            default:
                // For custom colors, try to calculate approximate hue
                return this.calculateHueFromHex(color);
        }
    }
    
    /**
     * Calculate approximate hue rotation from hex color
     */
    calculateHueFromHex(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 90; // Default to green
        
        // Simple hue calculation - this is approximate
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const delta = max - min;
        
        if (delta === 0) return 0; // Gray
        
        let hue = 0;
        if (max === rgb.r) {
            hue = ((rgb.g - rgb.b) / delta) % 6;
        } else if (max === rgb.g) {
            hue = (rgb.b - rgb.r) / delta + 2;
        } else {
            hue = (rgb.r - rgb.g) / delta + 4;
        }
        
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
        
        // Adjust for sepia base (subtract ~39° and clamp)
        return (hue - 39 + 360) % 360;
    }

    
    /**
     * Create main content area with avatar and bottom info panel
     */
    createContentArea() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'comm-content';
        this.contentArea.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 300px;
            gap: 5px;
        `;
        
        // Avatar area (wireframe animated) - now larger
        this.createAvatarArea();
        
        // Speaker name under video
        this.createSpeakerNameArea();
        
        // Text area for dialogue
        this.createTextArea();
        
        this.commContainer.appendChild(this.contentArea);
    }
    
    /**
     * Create animated wireframe avatar area
     */
    createAvatarArea() {
        this.avatarArea = document.createElement('div');
        this.avatarArea.className = 'comm-avatar';
        this.avatarArea.style.cssText = `
            width: 200px;
            height: 150px;
            border: 1px solid #00ff41;
            background: rgba(0, 40, 0, 0.3);
            position: relative;
            overflow: hidden;
            flex-shrink: 0;
        `;
        
        // Create SVG for wireframe avatar animation
        this.avatarSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.avatarSVG.setAttribute('width', '200');
        this.avatarSVG.setAttribute('height', '150');
        this.avatarSVG.setAttribute('viewBox', '0 0 200 150');
        this.avatarSVG.style.cssText = `
            position: absolute;
            top: 0px;
            left: 0px;
            display: none;
        `;
        
        // Create wireframe head shape
        this.createWireframeHead();
        
        this.avatarArea.appendChild(this.avatarSVG);
        
        // Create video element for test video mode
        this.createVideoElement();
        
        this.contentArea.appendChild(this.avatarArea);
    }
    
    /**
     * Create wireframe head with animated elements
     */
    createWireframeHead() {
        // Head outline (oval)
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        head.setAttribute('cx', '100');
        head.setAttribute('cy', '75');
        head.setAttribute('rx', '34');
        head.setAttribute('ry', '42');
        head.setAttribute('fill', 'none');
        head.setAttribute('stroke', '#00ff41');
        head.setAttribute('stroke-width', '1');
        head.setAttribute('opacity', '0.8');
        this.avatarSVG.appendChild(head);
        
        // Eyes (animated dots)
        this.leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.leftEye.setAttribute('cx', '86');
        this.leftEye.setAttribute('cy', '61');
        this.leftEye.setAttribute('r', '4');
        this.leftEye.setAttribute('fill', '#00ff41');
        this.avatarSVG.appendChild(this.leftEye);
        
        this.rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.rightEye.setAttribute('cx', '114');
        this.rightEye.setAttribute('cy', '61');
        this.rightEye.setAttribute('r', '4');
        this.rightEye.setAttribute('fill', '#00ff41');
        this.avatarSVG.appendChild(this.rightEye);
        
        // Mouth (animated line)
        this.mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.mouth.setAttribute('d', 'M 79 89 Q 100 98 121 89');
        this.mouth.setAttribute('fill', 'none');
        this.mouth.setAttribute('stroke', '#00ff41');
        this.mouth.setAttribute('stroke-width', '2.5');
        this.avatarSVG.appendChild(this.mouth);
        
        // Nose (small line)
        const nose = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        nose.setAttribute('x1', '100');
        nose.setAttribute('y1', '71');
        nose.setAttribute('x2', '100');
        nose.setAttribute('y2', '81');
        nose.setAttribute('stroke', '#00ff41');
        nose.setAttribute('stroke-width', '1');
        nose.setAttribute('opacity', '0.6');
        this.avatarSVG.appendChild(nose);
        
        // Facial features grid (wireframe effect)
        const gridLines = [
            'M 68 43 L 132 43', // Forehead
            'M 68 71 L 132 71', // Mid-face
            'M 68 99 L 132 99', // Lower face
            'M 74 35 L 74 105', // Left side
            'M 100 35 L 100 105', // Center
            'M 126 35 L 126 105'  // Right side
        ];
        
        gridLines.forEach(d => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', d);
            line.setAttribute('stroke', '#00ff41');
            line.setAttribute('stroke-width', '0.5');
            line.setAttribute('opacity', '0.3');
            this.avatarSVG.appendChild(line);
        });
    }
    
    /**
     * Create video element for test video mode
     */
    createVideoElement() {
        this.videoElement = document.createElement('video');
        this.videoElement.style.cssText = `
            position: absolute;
            top: 0px;
            left: 0px;
            width: 200px;
            height: 150px;
            object-fit: cover;
            display: block;
            filter: sepia(100%) hue-rotate(90deg) saturate(200%) brightness(0.8);
        `;
        this.videoElement.src = 'static/video/cooper_comms_talking_001.mov';
        this.videoElement.loop = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        
        // Create audio elements for different communication types
        this.createAudioElements();
        
        this.avatarArea.appendChild(this.videoElement);
    }
    
    /**
     * Create audio elements for different communication types
     */
    createAudioElements() {
        // Create audio elements for different faction types
        this.audioElements = {
            delivery: this.createSingleAudioElement('static/video/cooper_delivery_ok_001.wav'),
            hostile: this.createSingleAudioElement('static/video/cooper_taunt_pilot_001.wav'),
            neutral: this.createSingleAudioElement('static/video/cooper_welcome_trading_post_001.wav'),
            mission: this.createSingleAudioElement('static/video/cooper_mission_complete_001.wav')
        };
        
        // Keep reference to delivery audio for backward compatibility
        this.audioElement = this.audioElements.delivery;
        
        // Initialize audio context on first user interaction
        this.audioInitialized = false;
        this.initializeAudioOnInteraction();
    }
    
    /**
     * Create a single audio element with standard settings
     */
    createSingleAudioElement(src) {
        try {
            const audio = document.createElement('audio');
            audio.src = src;
            audio.preload = 'auto';
            audio.volume = 0.7;
            audio.muted = false;
            
            // Add error handling for audio loading
            audio.addEventListener('error', (e) => {
                console.warn(`🔊 CommunicationHUD: Audio loading error for ${src}:`, e);
            });
            
            // Add to container but keep hidden
            this.avatarArea.appendChild(audio);
            
debug('UI', `🔊 CommunicationHUD: Created audio element for ${src}`);
            return audio;
        } catch (error) {
            console.error(`🔊 CommunicationHUD: Failed to create audio element for ${src}:`, error);
            return null;
        }
    }
    
    /**
     * Initialize audio playback on first user interaction
     */
    initializeAudioOnInteraction() {
        const initAudio = () => {
            if (!this.audioInitialized && this.audioElements) {
                // Try to initialize all audio elements (silently)
                const initPromises = Object.values(this.audioElements).map(audio => {
                    // Store original volume and set to 0 for silent initialization
                    const originalVolume = audio.volume;
                    audio.volume = 0;
                    
                    return audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        // Restore original volume
                        audio.volume = originalVolume;
                    }).catch(e => {
                        // Restore original volume even on error
                        audio.volume = originalVolume;
                        console.warn('🔊 CommunicationHUD: Audio element initialization failed:', e);
                    });
                });
                
                Promise.all(initPromises).then(() => {
                    this.audioInitialized = true;
debug('UI', '🔊 CommunicationHUD: All audio contexts initialized');
                });
                
                // Remove event listeners after initialization
                document.removeEventListener('click', initAudio);
                document.removeEventListener('keydown', initAudio);
            }
        };
        
        // Listen for any user interaction to initialize audio
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
    }
    
    /**
     * Play audio based on communication type
     */
    playAudioForType(audioType) {
debug('UI', `🔊 CommunicationHUD: playAudioForType called with "${audioType}"`);
debug('AI', `🔊 CommunicationHUD: audioElements available:`, Object.keys(this.audioElements || {}));
debug('UI', `🔊 CommunicationHUD: audioInitialized:`, this.audioInitialized);
        
        if (!this.audioElements || !this.audioElements[audioType]) {
            console.warn(`🔊 CommunicationHUD: Audio element for type "${audioType}" not available`);
            return;
        }
        
        const audio = this.audioElements[audioType];
        if (!audio) {
            console.warn(`🔊 CommunicationHUD: Audio element for "${audioType}" is null or undefined`);
            return;
        }
        
        // Always attempt to play - browser will handle autoplay restrictions
debug('UI', `🔊 CommunicationHUD: Attempting to play ${audioType} audio element:`, audio);
        audio.currentTime = 0; // Reset to start
        audio.play().then(() => {
debug('UI', `🔊 CommunicationHUD: Playing ${audioType} audio`);
            // Mark as initialized if it wasn't already (successful play means user has interacted)
            if (!this.audioInitialized) {
                this.audioInitialized = true;
debug('UI', `🔊 CommunicationHUD: Audio marked as initialized after successful play`);
            }
        }).catch(e => {
            console.warn(`🔊 CommunicationHUD: ${audioType} audio play failed:`, e);
            if (!this.audioInitialized) {
debug('UI', `🔊 CommunicationHUD: Setting up audio initialization for future user interaction`);
                this.initializeAudioOnInteraction();
            }
        });
    }
    
    /**
     * Play delivery completion audio with proper error handling (backward compatibility)
     */
    playDeliveryAudio() {
debug('UI', '🔊 CommunicationHUD: playDeliveryAudio called');
        this.playAudioForType('delivery');
    }
    
    /**
     * Create speaker name area with faction-based styling
     */
    createSpeakerNameArea() {
        this.speakerNameArea = document.createElement('div');
        this.speakerNameArea.className = 'comm-speaker-name';
        this.speakerNameArea.style.cssText = `
            width: 100%;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            color: #000000;
            background: #D0D0D0;
            border: 1px solid #D0D0D0;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        this.speakerNameArea.textContent = 'UNKNOWN CONTACT';
        
        this.contentArea.appendChild(this.speakerNameArea);
    }
    
    /**
     * Create text area for dialogue display
     */
    createTextArea() {
        this.textArea = document.createElement('div');
        this.textArea.className = 'comm-text';
        this.textArea.style.cssText = `
            flex: 1;
            min-height: 30px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            overflow: hidden;
            padding: 5px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(0, 255, 65, 0.3);
        `;
        
        // Main dialogue text
        this.dialogueText = document.createElement('div');
        this.dialogueText.className = 'dialogue-text';
        this.dialogueText.style.cssText = `
            font-size: 14px;
            line-height: 1.4;
            color: #ffffff;
            text-shadow: 0 0 3px #00ff41;
            word-wrap: break-word;
            overflow-y: auto;
            min-height: 20px;
            max-height: 80px;
            padding-right: 5px;
        `;
        this.dialogueText.textContent = 'Incoming transmission...';
        
        this.textArea.appendChild(this.dialogueText);
        this.contentArea.appendChild(this.textArea);
    }
    

    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Future event listeners for mission system integration
debug('UI', 'CommunicationHUD: Event listeners ready');
    }
    
    /**
     * Get faction color based on diplomacy status
     */
    getFactionColor(faction) {
        if (!faction) return '#D0D0D0'; // Default gray
        
        const factionLower = faction.toLowerCase();
        
        switch(factionLower) {
            case 'enemy':
            case 'hostile':
            case 'raider':
            case 'pirate':
                return '#ff3333'; // Red for enemies
            case 'friendly':
            case 'ally':
            case 'alliance':
            case 'terran republic alliance':
                return '#00ff41'; // Green for friendlies
            case 'neutral':
            case 'civilian':
            case 'trader':
            case 'free trader consortium':
                return '#ffff00'; // Yellow for neutrals
            case 'corporate':
            case 'nexus corporate syndicate':
                return '#44ffff'; // Cyan for corporate
            case 'unknown':
                return '#D0D0D0'; // Gray for unknown
            default:
                // Try to determine from NPC name patterns
                return this.getFactionColorFromName(faction);
        }
    }
    
    /**
     * Convert hex color to RGB object
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 255, b: 65}; // Default to green if parsing fails
    }

    /**
     * Determine faction from NPC name patterns
     */
    getFactionColorFromName(name) {
        if (!name) return '#D0D0D0';
        
        const nameLower = name.toLowerCase();
        
        // Enemy patterns
        if (nameLower.includes('raider') || nameLower.includes('pirate') || 
            nameLower.includes('hostile') || nameLower.includes('bandit')) {
            return '#ff3333'; // Red
        }
        
        // Friendly patterns
        if (nameLower.includes('admiral') || nameLower.includes('commander') || 
            nameLower.includes('captain') || nameLower.includes('alliance')) {
            return '#00ff41'; // Green
        }
        
        // Neutral/Trade patterns
        if (nameLower.includes('trader') || nameLower.includes('merchant') || 
            nameLower.includes('station') || nameLower.includes('control')) {
            return '#ffff00'; // Yellow
        }
        
        // Corporate patterns
        if (nameLower.includes('corporate') || nameLower.includes('nexus') || 
            nameLower.includes('executive') || nameLower.includes('director')) {
            return '#44ffff'; // Cyan
        }
        
        return '#D0D0D0'; // Default gray
    }
    
    /**
     * Update speaker name styling based on faction
     */
    updateSpeakerStyling(name, faction) {
        // Store current speaker info for effects toggle
        this.currentSpeakerName = name;
        this.currentSpeakerFaction = faction;
        
        const color = this.getFactionColor(faction);
        
        // Always update speaker name area and HUD styling with faction colors
        this.speakerNameArea.textContent = (name || 'UNKNOWN CONTACT').toUpperCase();
        this.speakerNameArea.style.background = color;
        this.speakerNameArea.style.borderColor = color;
        this.speakerNameArea.style.color = '#000000'; // Always black text for readability
        
        // Always update HUD container border and accent colors to match faction
        this.commContainer.style.borderColor = color;
        
        // Always update avatar area border to match
        this.avatarArea.style.borderColor = color;
        
        // Always update box shadow to match faction color
        const rgb = this.hexToRgb(color);
        this.commContainer.style.boxShadow = `
            0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3),
            inset 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)
        `;
        
        // Always update scan line color to match faction
        this.updateScanLineColor(color);
        
        // Always update SVG wireframe colors to match faction
        this.updateWireframeColors(color);
        
        // Only apply video tint if effects are enabled
        if (this.effectsEnabled) {
            this.updateVideoTint(color);
        } else {
            // Remove video tinting when effects are disabled
            if (this.videoElement) {
                this.videoElement.style.filter = 'none';
            }
        }
    }
    
    /**
     * Update SVG wireframe colors to match faction
     */
    updateWireframeColors(color) {
        if (!this.avatarSVG) return;
        
        // Update all SVG elements to use the faction color
        const svgElements = this.avatarSVG.querySelectorAll('*');
        svgElements.forEach(element => {
            if (element.getAttribute('stroke')) {
                element.setAttribute('stroke', color);
            }
            if (element.getAttribute('fill') && element.getAttribute('fill') !== 'none') {
                element.setAttribute('fill', color);
            }
        });
    }
    
    /**
     * Toggle between enhanced effects (scan lines + faction colors) and raw video
     */
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        
        if (this.effectsEnabled) {
            // Enable enhanced effects
            this.enableEnhancedEffects();
debug('UI', 'CommunicationHUD: Enhanced effects ENABLED (video tint + scan lines)');
        } else {
            // Disable enhanced effects - show raw video
            this.disableEnhancedEffects();
debug('UI', 'CommunicationHUD: Enhanced effects DISABLED (raw video, no scan lines)');
        }
        
        this.playCommandSound();
        return true;
    }
    
    /**
     * Enable enhanced effects (video tint + scan lines)
     */
    enableEnhancedEffects() {
        // Show scan line effects
        if (this.animatedScanLine) {
            this.animatedScanLine.style.display = 'block';
        }
        const scanLineOverlay = this.commContainer.querySelector('.comm-scan-lines');
        if (scanLineOverlay) {
            scanLineOverlay.style.display = 'block';
        }
        
        // Re-apply video tinting
        if (this.videoElement && this.currentSpeakerFaction) {
            this.updateVideoTint(this.getFactionColor(this.currentSpeakerFaction));
        }
    }
    
    /**
     * Disable enhanced effects (remove video tint + scan lines)
     */
    disableEnhancedEffects() {
        // Hide scan line effects
        if (this.animatedScanLine) {
            this.animatedScanLine.style.display = 'none';
        }
        const scanLineOverlay = this.commContainer.querySelector('.comm-scan-lines');
        if (scanLineOverlay) {
            scanLineOverlay.style.display = 'none';
        }
        
        // Remove video tinting
        if (this.videoElement) {
            this.videoElement.style.filter = 'none';
        }
    }

    
    /**
     * Toggle communication HUD visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.commContainer.style.display = this.isVisible ? 'block' : 'none';
        
debug('UI', `🗣️ CommunicationHUD: ${this.isVisible ? 'Enabled' : 'Disabled'}`);
        
        // Play command sound for toggle
        this.playCommandSound();
        
        if (this.isVisible) {
            // Start test animation and dialogue (disabled by default)
            if (this.enableTestSequence) {
                this.startTestSequence();
            }
            
            // Start video (always in video mode now)
            if (this.videoElement) {
                this.videoElement.play().catch(e => {
                    console.warn('🗣️ CommunicationHUD: Video play failed:', e);
                });
            }
        } else {
            // Stop animations and video
            this.stopAnimations();
            if (this.videoElement) {
                this.videoElement.pause();
            }
            if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement.currentTime = 0;
            }
        }
        
        return true;
    }
    
    /**
     * Start test sequence with animation and dialogue
     */
    startTestSequence() {
debug('UI', 'CommunicationHUD: Starting test sequence');
        
        // Set test NPC info with faction styling
        this.updateSpeakerStyling('ADMIRAL CHEN', 'friendly');
        
        // Start avatar animation
        this.startAvatarAnimation();
        
        // Start test dialogue sequence
        this.startTestDialogue();
    }
    
    /**
     * Start avatar animation (blinking eyes, mouth movement)
     */
    startAvatarAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        
        this.animationInterval = setInterval(() => {
            this.avatarAnimationFrame = (this.avatarAnimationFrame + 1) % this.animationFrames;
            this.updateAvatarFrame();
        }, 200); // 5fps animation
    }
    
    /**
     * Update avatar animation frame
     */
    updateAvatarFrame() {
        const frame = this.avatarAnimationFrame;
        
        // Blinking animation (eyes disappear for 1 frame every 8 frames)
        if (frame === 6) {
            this.leftEye.setAttribute('opacity', '0');
            this.rightEye.setAttribute('opacity', '0');
        } else {
            this.leftEye.setAttribute('opacity', '1');
            this.rightEye.setAttribute('opacity', '1');
        }
        
        // Mouth movement animation (talking)
        const mouthShapes = [
            'M 79 89 Q 100 98 121 89', // Neutral
            'M 79 89 Q 100 93 121 89', // Slightly open
            'M 79 91 Q 100 102 121 91', // More open
            'M 79 89 Q 100 95 121 89', // Medium
            'M 79 89 Q 100 98 121 89', // Neutral
            'M 79 87 Q 100 93 121 87', // Slight variation
            'M 79 91 Q 100 100 121 91', // Open again
            'M 79 89 Q 100 98 121 89'  // Back to neutral
        ];
        
        this.mouth.setAttribute('d', mouthShapes[frame]);
        
        // Subtle head grid animation (scanning effect)
        const opacity = 0.3 + Math.sin(frame * 0.5) * 0.1;
        this.avatarSVG.querySelectorAll('path[opacity="0.3"]').forEach(line => {
            line.setAttribute('opacity', opacity.toFixed(2));
        });
    }
    
    /**
     * Start test dialogue sequence
     */
    startTestDialogue() {
        const testMessages = [
            "Commander, we're receiving your transmission.",
            "Your navigation beacon approach looks good.",
            "Proceed to waypoint Alpha-7 for further orders.",
            "Watch for enemy contacts in this sector.",
            "Admiral Chen out."
        ];
        
        this.messageQueue = [...testMessages];
        this.processNextMessage();
    }
    
    /**
     * Process next message in queue
     */
    processNextMessage() {
        if (this.messageQueue.length === 0 || this.isProcessingMessage) {
            return;
        }
        
        this.isProcessingMessage = true;
        const message = this.messageQueue.shift();
        
        // Typewriter effect
        this.typewriterEffect(message, () => {
            this.isProcessingMessage = false;
            
            // Auto-advance after 3 seconds or manual advance
            setTimeout(() => {
                if (this.isVisible && this.messageQueue.length > 0) {
                    this.processNextMessage();
                } else if (this.messageQueue.length === 0) {
                    // End of sequence - fade out after 2 seconds
                    setTimeout(() => {
                        if (this.isVisible) {
                            this.dialogueText.textContent = 'Transmission ended.';
                        }
                    }, 2000);
                }
            }, 3000);
        });
    }
    
    /**
     * Typewriter effect for dialogue
     */
    typewriterEffect(text, callback) {
        // Stop any previous interval to avoid interleaving characters from old messages
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        this.dialogueText.textContent = '';
        let index = 0;
        
        this.typingInterval = setInterval(() => {
            this.dialogueText.textContent += text[index] || '';
            index++;
            
            if (index >= text.length) {
                clearInterval(this.typingInterval);
                this.typingInterval = null;
                if (callback) callback();
            }
        }, 50); // Typing speed
    }
    
    /**
     * Stop all animations
     */
    stopAnimations() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        this.messageQueue = [];
        this.isProcessingMessage = false;
    }
    
    /**
     * Show message from mission/AI system
     */
    showMessage(npcName, message, options = {}) {
        const {
            channel = 'COMM.1',
            signalStrength = '████████░',
            status = '■ LIVE',
            duration = 10000,
            faction = null,
            isDeliveryComplete = false,
            audioType = null
        } = options;
        
        if (!this.isVisible) {
            // Show without auto-running the test sequence
            this.isVisible = true;
            this.commContainer.style.display = 'block';
debug('UI', 'CommunicationHUD: Enabled');
            this.playCommandSound();
        }
        
        // Play communication sound if audio manager is available
        this.playCommSound();
        
        // Cancel any pending hide from a previous message
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // Update speaker name with faction-based styling
        const speakerName = npcName || 'MISSION CONTROL';
        const speakerFaction = faction || this.getFactionColorFromName(speakerName);
        this.updateSpeakerStyling(speakerName, speakerFaction);
        
        // Reset any pending test queue and animations before showing real message
        this.messageQueue = [];
        this.isProcessingMessage = false;
        
        // Start video (always in video mode now)
        if (this.videoElement) {
            // Start video (looped)
            this.videoElement.play().catch(e => {
                console.warn('🗣️ CommunicationHUD: Video play failed:', e);
            });
            
            // Play appropriate audio based on type or delivery completion
            if (isDeliveryComplete) {
                this.playDeliveryAudio();
            } else if (audioType) {
                this.playAudioForType(audioType);
            }
        }
        // Ensure message is a clean string to avoid gibberish rendering
        const coerceToString = (val) => {
            if (typeof val === 'string') return val;
            try { return JSON.stringify(val); } catch (e) { return String(val); }
        };
        const sanitize = (text) => {
            if (typeof text !== 'string') return 'Transmission received. Mission update acknowledged.';
            // Remove non-printable characters and template braces, collapse whitespace
            return text
                .replace(/[{}]/g, '')
                .replace(/[\u0000-\u001F\u007F\u0080-\u009F]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };
        const safeMessage = sanitize(coerceToString(message));
        this.typewriterEffect(
            safeMessage.length ? safeMessage : 'Transmission received. Mission update acknowledged.',
            () => {
                // Start visibility timer AFTER typing completes
                if (duration > 0) {
                    this.hideTimeout = setTimeout(() => {
                        this.hide();
                    }, duration);
                }
            }
        );
    }
    
    /**
     * Hide communication HUD
     */
    hide() {
        if (this.isVisible) {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
            this.toggle();
        }
    }
    
    /**
     * Check if communication HUD is visible
     */
    get visible() {
        return this.isVisible;
    }

    /**
     * Play communication sound using the starfield audio manager
     */
    playCommSound() {
        // Try to access audio manager through starfield manager or global
        const audioManager = this.starfieldManager?.audioManager || window.starfieldAudioManager;
        if (audioManager && typeof audioManager.playSound === 'function') {
            // Only play if user has interacted (to prevent startup audio)
            if (audioManager.userHasInteracted) {
debug('UI', 'CommunicationHUD: Playing comm sound (user has interacted)');
                audioManager.playSound('blurb', 0.6); // Use blurb sound at 60% volume
            } else {
debug('UI', 'CommunicationHUD: Skipping comm sound (no user interaction yet)');
            }
        } else {
debug('AI', 'CommunicationHUD: Audio manager not available');
        }
    }

    /**
     * Play command sound for successful toggle
     */
    playCommandSound() {
        const audioManager = this.starfieldManager?.audioManager || window.starfieldAudioManager;
        if (audioManager && typeof audioManager.playSound === 'function') {
            // Only play if user has interacted (to prevent startup audio)
            if (audioManager.userHasInteracted) {
debug('UI', 'CommunicationHUD: Playing command sound (user has interacted)');
                audioManager.playSound('command', 0.5);
            } else {
debug('UI', 'CommunicationHUD: Skipping command sound (no user interaction yet)');
            }
        }
    }
}
