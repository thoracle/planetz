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
        
        this.initialize();
    }
    
    initialize() {
        this.createCommunicationContainer();
        this.setupEventListeners();
        console.log('🗣️ CommunicationHUD: Initialized');
        
        // Make this instance globally accessible for console testing
        window.communicationHUD = this;
        
        // Add test method for mission communications
        this.testMissionComm = () => {
            console.log('🧪 Testing mission communication...');
            this.showMessage(
                'Admiral Chen',
                'Mission objective completed. Proceed to extraction point for debrief.',
                {
                    channel: 'MISSION.1',
                    status: '■ SUCCESS',
                    duration: 6000,
                    signalStrength: '█████████',
                    faction: 'friendly'
                }
            );
            console.log('🧪 Test message sent, dialogue text element:', this.dialogueText);
        };
        
        // Add test methods for different factions
        this.testHostileComm = () => {
            this.showMessage(
                'Raider Captain',
                'You picked the wrong sector to fly through, pilot!',
                {
                    faction: 'enemy',
                    duration: 5000
                }
            );
        };
        
        this.testNeutralComm = () => {
            this.showMessage(
                'Trade Station Alpha',
                'Welcome to our trading post. Please state your business.',
                {
                    faction: 'neutral',
                    duration: 5000
                }
            );
        };
        
        // Add simple test that sets text directly
        this.testDirectText = () => {
            console.log('🧪 Testing direct text display...');
            if (!this.isVisible) {
                this.isVisible = true;
                this.commContainer.style.display = 'block';
            }
            this.updateSpeakerStyling('Test Speaker', 'friendly');
            this.dialogueText.textContent = 'This is a direct text test - no typewriter effect.';
            console.log('🧪 Direct text set, element:', this.dialogueText);
            console.log('🧪 Text content:', this.dialogueText.textContent);
            console.log('🧪 Text area visible:', this.textArea.style.display !== 'none');
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
        `;
        
        // Create main content area with avatar and right-side info
        this.createContentArea();
        
        this.container.appendChild(this.commContainer);
        console.log('🗣️ CommunicationHUD: Container created');
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
        `;
        this.videoElement.src = 'static/video/test_comms_001.MP4';
        this.videoElement.loop = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        
        this.avatarArea.appendChild(this.videoElement);
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
        console.log('🗣️ CommunicationHUD: Event listeners ready');
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
        const color = this.getFactionColor(faction);
        
        // Update speaker name area
        this.speakerNameArea.style.background = color;
        this.speakerNameArea.style.borderColor = color;
        this.speakerNameArea.style.color = '#000000'; // Always black text for readability
        this.speakerNameArea.textContent = (name || 'UNKNOWN CONTACT').toUpperCase();
        
        // Update HUD container border and accent colors to match faction
        this.commContainer.style.borderColor = color;
        
        // Update avatar area border to match
        this.avatarArea.style.borderColor = color;
        
        // Update box shadow to match faction color
        const rgb = this.hexToRgb(color);
        this.commContainer.style.boxShadow = `
            0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3),
            inset 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)
        `;
        
        // Update SVG wireframe colors to match faction
        this.updateWireframeColors(color);
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
     * Toggle between video mode and face animation mode
     */
    toggleVideoMode() {
        this.videoMode = !this.videoMode;
        
        if (this.videoMode) {
            // Switch to video mode
            this.avatarSVG.style.display = 'none';
            this.videoElement.style.display = 'block';
            this.videoElement.play().catch(e => {
                console.warn('🗣️ CommunicationHUD: Video play failed:', e);
            });
            console.log('🗣️ CommunicationHUD: Switched to video mode');
        } else {
            // Switch to face animation mode
            this.videoElement.style.display = 'none';
            this.videoElement.pause();
            this.avatarSVG.style.display = 'block';
            console.log('🗣️ CommunicationHUD: Switched to face animation mode');
        }
        
        this.playCommandSound();
        return true;
    }
    
    /**
     * Toggle communication HUD visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.commContainer.style.display = this.isVisible ? 'block' : 'none';
        
        console.log(`🗣️ CommunicationHUD: ${this.isVisible ? 'Enabled' : 'Disabled'}`);
        
        // Play command sound for toggle
        this.playCommandSound();
        
        if (this.isVisible) {
            // Start test animation and dialogue (disabled by default)
            if (this.enableTestSequence) {
                this.startTestSequence();
            }
            
            // Start appropriate display mode
            if (this.videoMode && this.videoElement) {
                this.videoElement.play().catch(e => {
                    console.warn('🗣️ CommunicationHUD: Video play failed:', e);
                });
            } else {
                this.startAvatarAnimation();
            }
        } else {
            // Stop animations and video
            this.stopAnimations();
            if (this.videoElement) {
                this.videoElement.pause();
            }
        }
        
        return true;
    }
    
    /**
     * Start test sequence with animation and dialogue
     */
    startTestSequence() {
        console.log('🗣️ CommunicationHUD: Starting test sequence');
        
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
            faction = null
        } = options;
        
        if (!this.isVisible) {
            // Show without auto-running the test sequence
            this.isVisible = true;
            this.commContainer.style.display = 'block';
            console.log('🗣️ CommunicationHUD: Enabled');
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
        
        // Start appropriate animation based on mode
        if (this.videoMode && this.videoElement) {
            this.videoElement.play().catch(e => {
                console.warn('🗣️ CommunicationHUD: Video play failed:', e);
            });
        } else {
            this.startAvatarAnimation();
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
            audioManager.playSound('blurb', 0.6); // Use blurb sound at 60% volume
        } else {
            console.log('🗣️ CommunicationHUD: Audio manager not available');
        }
    }

    /**
     * Play command sound for successful toggle
     */
    playCommandSound() {
        const audioManager = this.starfieldManager?.audioManager || window.starfieldAudioManager;
        if (audioManager && typeof audioManager.playSound === 'function') {
            audioManager.playSound('command', 0.5);
        }
    }
}
