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
        
        this.initialize();
    }
    
    initialize() {
        this.createCommunicationContainer();
        this.setupEventListeners();
        console.log('🗣️ CommunicationHUD: Initialized');
        
        // Make this instance globally accessible for console testing
        window.communicationHUD = this;
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
            width: 320px;
            height: 120px;
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
        
        // Create header with NPC name
        this.createHeader();
        
        // Create main content area with avatar and text
        this.createContentArea();
        
        // Create footer with status indicators
        this.createFooter();
        
        this.container.appendChild(this.commContainer);
        console.log('🗣️ CommunicationHUD: Container created');
    }
    
    /**
     * Create header with NPC name and status
     */
    createHeader() {
        this.headerArea = document.createElement('div');
        this.headerArea.className = 'comm-header';
        this.headerArea.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            height: 20px;
        `;
        
        // NPC name display
        this.npcNameDisplay = document.createElement('div');
        this.npcNameDisplay.className = 'npc-name';
        this.npcNameDisplay.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
        `;
        this.npcNameDisplay.textContent = 'UNKNOWN CONTACT';
        
        // Communication status
        this.commStatus = document.createElement('div');
        this.commStatus.className = 'comm-status';
        this.commStatus.style.cssText = `
            font-size: 12px;
            opacity: 0.8;
            color: #ffff44;
        `;
        this.commStatus.textContent = '■ LIVE';
        
        this.headerArea.appendChild(this.npcNameDisplay);
        this.headerArea.appendChild(this.commStatus);
        this.commContainer.appendChild(this.headerArea);
    }
    
    /**
     * Create main content area with avatar and dialogue
     */
    createContentArea() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'comm-content';
        this.contentArea.style.cssText = `
            display: flex;
            height: 60px;
            gap: 10px;
        `;
        
        // Avatar area (wireframe animated)
        this.createAvatarArea();
        
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
            width: 60px;
            height: 60px;
            border: 1px solid #00ff41;
            background: rgba(0, 40, 0, 0.3);
            position: relative;
            overflow: hidden;
            flex-shrink: 0;
        `;
        
        // Create SVG for wireframe avatar animation
        this.avatarSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.avatarSVG.setAttribute('width', '58');
        this.avatarSVG.setAttribute('height', '58');
        this.avatarSVG.setAttribute('viewBox', '0 0 58 58');
        this.avatarSVG.style.cssText = `
            position: absolute;
            top: 1px;
            left: 1px;
        `;
        
        // Create wireframe head shape
        this.createWireframeHead();
        
        this.avatarArea.appendChild(this.avatarSVG);
        this.contentArea.appendChild(this.avatarArea);
    }
    
    /**
     * Create wireframe head with animated elements
     */
    createWireframeHead() {
        // Head outline (oval)
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        head.setAttribute('cx', '29');
        head.setAttribute('cy', '32');
        head.setAttribute('rx', '18');
        head.setAttribute('ry', '22');
        head.setAttribute('fill', 'none');
        head.setAttribute('stroke', '#00ff41');
        head.setAttribute('stroke-width', '1');
        head.setAttribute('opacity', '0.8');
        this.avatarSVG.appendChild(head);
        
        // Eyes (animated dots)
        this.leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.leftEye.setAttribute('cx', '23');
        this.leftEye.setAttribute('cy', '26');
        this.leftEye.setAttribute('r', '2');
        this.leftEye.setAttribute('fill', '#00ff41');
        this.avatarSVG.appendChild(this.leftEye);
        
        this.rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.rightEye.setAttribute('cx', '35');
        this.rightEye.setAttribute('cy', '26');
        this.rightEye.setAttribute('r', '2');
        this.rightEye.setAttribute('fill', '#00ff41');
        this.avatarSVG.appendChild(this.rightEye);
        
        // Mouth (animated line)
        this.mouth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.mouth.setAttribute('d', 'M 21 38 Q 29 42 37 38');
        this.mouth.setAttribute('fill', 'none');
        this.mouth.setAttribute('stroke', '#00ff41');
        this.mouth.setAttribute('stroke-width', '1.5');
        this.avatarSVG.appendChild(this.mouth);
        
        // Nose (small line)
        const nose = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        nose.setAttribute('x1', '29');
        nose.setAttribute('y1', '30');
        nose.setAttribute('x2', '29');
        nose.setAttribute('y2', '34');
        nose.setAttribute('stroke', '#00ff41');
        nose.setAttribute('stroke-width', '1');
        nose.setAttribute('opacity', '0.6');
        this.avatarSVG.appendChild(nose);
        
        // Facial features grid (wireframe effect)
        const gridLines = [
            'M 15 20 L 43 20', // Forehead
            'M 15 30 L 43 30', // Mid-face
            'M 15 40 L 43 40', // Lower face
            'M 20 15 L 20 45', // Left side
            'M 29 15 L 29 45', // Center
            'M 38 15 L 38 45'  // Right side
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
     * Create text area for dialogue display
     */
    createTextArea() {
        this.textArea = document.createElement('div');
        this.textArea.className = 'comm-text';
        this.textArea.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
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
            overflow: hidden;
            max-height: 56px;
        `;
        this.dialogueText.textContent = 'Incoming transmission...';
        
        this.textArea.appendChild(this.dialogueText);
        this.contentArea.appendChild(this.textArea);
    }
    
    /**
     * Create footer with transmission info
     */
    createFooter() {
        this.footerArea = document.createElement('div');
        this.footerArea.className = 'comm-footer';
        this.footerArea.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            height: 14px;
            font-size: 12px;
            opacity: 0.7;
        `;
        
        // Channel info
        this.channelInfo = document.createElement('div');
        this.channelInfo.textContent = 'CH: 127.5 MHz';
        
        // Signal strength
        this.signalStrength = document.createElement('div');
        this.signalStrength.textContent = 'SIG: ████▓░░░';
        
        this.footerArea.appendChild(this.channelInfo);
        this.footerArea.appendChild(this.signalStrength);
        this.commContainer.appendChild(this.footerArea);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Future event listeners for mission system integration
        console.log('🗣️ CommunicationHUD: Event listeners ready');
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
            // Start test animation and dialogue
            this.startTestSequence();
        } else {
            // Stop animations
            this.stopAnimations();
        }
        
        return true;
    }
    
    /**
     * Start test sequence with animation and dialogue
     */
    startTestSequence() {
        console.log('🗣️ CommunicationHUD: Starting test sequence');
        
        // Set test NPC info
        this.npcNameDisplay.textContent = 'ADMIRAL CHEN';
        this.commStatus.textContent = '■ SECURE';
        this.channelInfo.textContent = 'CH: FLEET.1';
        this.signalStrength.textContent = 'SIG: ████████░';
        
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
            'M 21 38 Q 29 42 37 38', // Neutral
            'M 21 38 Q 29 40 37 38', // Slightly open
            'M 21 39 Q 29 44 37 39', // More open
            'M 21 38 Q 29 41 37 38', // Medium
            'M 21 38 Q 29 42 37 38', // Neutral
            'M 21 37 Q 29 40 37 37', // Slight variation
            'M 21 39 Q 29 43 37 39', // Open again
            'M 21 38 Q 29 42 37 38'  // Back to neutral
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
        this.dialogueText.textContent = '';
        let index = 0;
        
        const typeInterval = setInterval(() => {
            this.dialogueText.textContent += text[index];
            index++;
            
            if (index >= text.length) {
                clearInterval(typeInterval);
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
            duration = 5000
        } = options;
        
        if (!this.isVisible) {
            this.toggle();
        }
        
        // Play communication sound if audio manager is available
        this.playCommSound();
        
        this.npcNameDisplay.textContent = npcName.toUpperCase();
        this.commStatus.textContent = status;
        this.channelInfo.textContent = `CH: ${channel}`;
        this.signalStrength.textContent = `SIG: ${signalStrength}`;
        
        this.startAvatarAnimation();
        this.typewriterEffect(message);
        
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }
    
    /**
     * Hide communication HUD
     */
    hide() {
        if (this.isVisible) {
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
