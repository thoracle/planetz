import { debug } from '../debug.js';

/**
 * CardInventoryUI class - Drag-and-drop interface for card inventory management
 * 
 * Features:
 * - Card inventory UI with grid layout
 * - Ship slot interface for card installation
 * - Card transfer system between inventory and slots
 * - Visual feedback for valid drops and build validation
 */

import CardInventory from '../ship/CardInventory.js';
import { CARD_TYPES, CARD_ICONS } from '../ship/NFTCard.js';
import { SHIP_CONFIGS, getAvailableShipTypes, getStarterCards } from '../ship/ShipConfigs.js';
import NFTCard from '../ship/NFTCard.js';
import { playerCredits } from '../utils/PlayerCredits.js';

// Simple player data structure for ship ownership
class PlayerData {
    constructor() {
        this.ownedShips = new Set(['starter_ship']); // Player starts with starter ship
        // this.credits = 50000; // Removed - using unified credits system
        this.shipConfigurations = new Map(); // Store equipped cards for each ship
        
        // Initialize starter ship using centralized starter card configuration
        const starterCards = getStarterCards('starter_ship');
        const starterCardMap = new Map();
        Object.entries(starterCards).forEach(([slotId, cardData]) => {
            starterCardMap.set(slotId, cardData);
        });
        this.shipConfigurations.set('starter_ship', starterCardMap);
    }
    
    /**
     * Add a ship to the player's collection
     * @param {string} shipType - Ship type to add
     */
    addShip(shipType) {
        this.ownedShips.add(shipType);
        // Initialize empty configuration for new ship
        if (!this.shipConfigurations.has(shipType)) {
            this.shipConfigurations.set(shipType, new Map());
        }
    }
    
    /**
     * Check if player owns a specific ship
     * @param {string} shipType - Ship type to check
     * @returns {boolean}
     */
    ownsShip(shipType) {
        return this.ownedShips.has(shipType);
    }
    
    /**
     * Get list of owned ships
     * @returns {Array<string>}
     */
    getOwnedShips() {
        return Array.from(this.ownedShips);
    }
    
    /**
     * Purchase a ship if player has enough credits
     * @param {string} shipType - Ship type to purchase
     * @param {number} cost - Cost of the ship
     * @returns {boolean} - Whether purchase was successful
     */
    purchaseShip(shipType, cost) {
        if (playerCredits.canAfford(cost) && !this.ownedShips.has(shipType)) {
            if (playerCredits.spendCredits(cost, `Purchase ship: ${shipType}`)) {
                this.addShip(shipType);
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get ship configuration (equipped cards)
     * @param {string} shipType - Ship type
     * @returns {Map} - Map of slotId -> cardData
     */
    getShipConfiguration(shipType) {
        return this.shipConfigurations.get(shipType) || new Map();
    }
    
    /**
     * Save ship configuration (equipped cards)
     * @param {string} shipType - Ship type
     * @param {Map} configuration - Map of slotId -> cardData
     */
    saveShipConfiguration(shipType, configuration) {
        this.shipConfigurations.set(shipType, new Map(configuration));
    }
    
    /**
     * Install a card in a specific ship's slot
     * @param {string} shipType - Ship type
     * @param {string} slotId - Slot identifier
     * @param {Object} cardData - Card data {cardType, level}
     */
    installCardInShip(shipType, slotId, cardData) {
        if (!this.shipConfigurations.has(shipType)) {
            this.shipConfigurations.set(shipType, new Map());
        }
        this.shipConfigurations.get(shipType).set(slotId, cardData);
    }
    
    /**
     * Remove a card from a specific ship's slot
     * @param {string} shipType - Ship type
     * @param {string} slotId - Slot identifier
     */
    removeCardFromShip(shipType, slotId) {
        const config = this.shipConfigurations.get(shipType);
        if (config) {
            config.delete(slotId);
        }
    }
}

// Global player data instance
const playerData = new PlayerData();

export default class CardInventoryUI {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = containerId ? document.getElementById(containerId) : null;
        this.inventory = new CardInventory();
        this.shipSlots = new Map(); // Map of slotId -> card
        // this.credits = 50000; // Removed - using unified credits system
        this.currentShipType = 'starter_ship';
        this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
        this.isShopMode = false;
        this.dockedLocation = null;
        this.dockingInterface = null;
        
        // Track NEW card badges
        this.lastShopVisit = this.getLastShopVisit();
        this.newCardTimestamps = this.getNewCardTimestamps();
        
        // Track quantity increases (red badges)
        this.quantityIncreaseTimestamps = this.getQuantityIncreaseTimestamps();
        
        // Audio setup for upgrade sounds
        this.initializeAudio();
        
        // Set global reference for button onclick handlers
        window.cardInventoryUI = this;
        
        // Only check for container if containerId was provided
        if (containerId && !this.container) {
            console.error(`Container with id '${containerId}' not found`);
            return;
        }
        
        // Only initialize UI if we have a container or if containerId is null (shop mode)
        if (this.container || containerId === null) {
            this.init();
        }
    }

    /**
     * Get the timestamp of the last shop visit from localStorage
     */
    getLastShopVisit() {
        const stored = localStorage.getItem('planetz_last_shop_visit');
        return stored ? parseInt(stored) : 0;
    }

    /**
     * Save the current timestamp as the last shop visit
     */
    saveLastShopVisit() {
        const now = Date.now();
        localStorage.setItem('planetz_last_shop_visit', now.toString());
        this.lastShopVisit = now;
    }

    /**
     * Get the timestamps when cards were awarded from localStorage
     */
    getNewCardTimestamps() {
        const stored = localStorage.getItem('planetz_new_card_timestamps');
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Get the quantity increase timestamps from localStorage
     */
    getQuantityIncreaseTimestamps() {
        const stored = localStorage.getItem('planetz_quantity_increase_timestamps');
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Save the new card timestamps to localStorage
     */
    saveNewCardTimestamps() {
        localStorage.setItem('planetz_new_card_timestamps', JSON.stringify(this.newCardTimestamps));
    }

    /**
     * Save the quantity increase timestamps to localStorage
     */
    saveQuantityIncreaseTimestamps() {
        localStorage.setItem('planetz_quantity_increase_timestamps', JSON.stringify(this.quantityIncreaseTimestamps));
    }

    /**
     * Mark a card as newly awarded
     * @param {string} cardType - The type of card that was awarded
     */
    markCardAsNew(cardType) {
        this.newCardTimestamps[cardType] = Date.now();
        this.saveNewCardTimestamps();
    }

    /**
     * Check if a card should show the NEW badge
     * @param {string} cardType - The type of card to check
     * @returns {boolean} True if the card should show NEW badge
     */
    isCardNew(cardType) {
        const cardTimestamp = this.newCardTimestamps[cardType];
        return cardTimestamp && cardTimestamp > this.lastShopVisit;
    }

    /**
     * Mark a card as having a quantity increase
     * @param {string} cardType - The type of card that had a quantity increase
     */
    markCardQuantityIncrease(cardType) {
        console.log(`🔴 MARKING: Setting quantity increase for ${cardType}`);
        console.log(`🔴 MARKING: Before - quantityIncreaseTimestamps:`, this.quantityIncreaseTimestamps);
        this.quantityIncreaseTimestamps[cardType] = Date.now();
        console.log(`🔴 MARKING: After - quantityIncreaseTimestamps:`, this.quantityIncreaseTimestamps);
        this.saveQuantityIncreaseTimestamps();
        console.log(`🔴 MARKING: Saved to localStorage`);
    }

    /**
     * Check if a card has a quantity increase
     * @param {string} cardType - The type of card to check
     * @returns {boolean} - True if the card has a quantity increase
     */
    hasQuantityIncrease(cardType) {
        return this.quantityIncreaseTimestamps.hasOwnProperty(cardType);
    }

    /**
     * Clear NEW status for all cards (called when shop is opened)
     */
    clearNewCardStatus() {
        // Update last shop visit to current time
        this.saveLastShopVisit();
        // No need to clear timestamps - they'll be compared against the new lastShopVisit
    }

    /**
     * Clear quantity increase status for all cards (called when collection is opened)
     */
    clearQuantityIncreaseStatus() {
        this.quantityIncreaseTimestamps = {};
        this.saveQuantityIncreaseTimestamps();
    }

    /**
     * Initialize audio components for upgrade sounds
     */
    initializeAudio() {
debug('UTILITY', '🔊 Initializing upgrade audio...');
        
        try {
            // Initialize THREE.js audio context if not already available
            if (typeof window.THREE !== 'undefined' && window.THREE.AudioListener) {
                // THREE.js audio available
                this.audioListener = new window.THREE.AudioListener();
                this.upgradeSound = new window.THREE.Audio(this.audioListener);
                this.upgradeSoundLoaded = false;
                
                // Load upgrade sound with fallback paths
                const audioLoader = new window.THREE.AudioLoader();
                
                this.loadAudio(audioLoader, 'static/audio/blurb.mp3');
            } else {
                console.warn('⚠️ THREE.js not available for audio initialization, using fallback');
                this.upgradeSoundLoaded = false;
                // Use fallback HTML5 audio
                this.initializeFallbackAudio();
            }
        } catch (error) {
            console.error('❌ Error initializing upgrade audio:', error);
            this.upgradeSoundLoaded = false;
            // Use fallback HTML5 audio
            this.initializeFallbackAudio();
        }
    }

    /**
     * Load audio
     */
    loadAudio(audioLoader, audioPath) {
        audioLoader.load(
            audioPath,
            (buffer) => {
                this.upgradeSound.setBuffer(buffer);
                this.upgradeSound.setVolume(0.7);
                this.upgradeSoundLoaded = true;
            },
            (progress) => {
                // Loading progress (silent)
            },
            (error) => {
                console.error('❌ Error loading upgrade sound:', error);
                this.upgradeSoundLoaded = false;
                // Try fallback HTML5 audio
                this.initializeFallbackAudio();
            }
        );
    }

    /**
     * Initialize fallback HTML5 audio
     */
    initializeFallbackAudio() {
debug('NAVIGATION', '🔄 Initializing fallback HTML5 audio with path detection...');
        try {
            // Use static audio directory path
            this.fallbackAudio = new Audio('static/audio/blurb.mp3');
            this.fallbackAudio.volume = 0.7;
            this.fallbackAudio.preload = 'auto';
            
            // Create audio pool for rapid successive plays
            this.audioPool = [];
            this.audioPoolSize = 5; // Increase pool size for better reliability
            this.audioPoolIndex = 0; // Round-robin index
            this.audioElementUseCount = []; // Track usage for health monitoring
            this.maxUsesPerElement = 10; // Regenerate elements after this many uses
            
                    // Track user interaction for browser audio policies
        this.userHasInteracted = false;
        this.audioWarningShown = false; // Track if we've shown the audio warning
        this.setupUserInteractionTracking();
            
            this.fallbackAudio.addEventListener('canplaythrough', () => {
debug('UTILITY', '✅ Fallback audio loaded successfully');
                this.fallbackAudioLoaded = true;
                
                // Pre-create audio pool for better rapid playback
                this.createAudioPool();
            });
            
            this.fallbackAudio.addEventListener('error', (e) => {
                console.error('❌ Fallback audio loading failed:', e);
                this.fallbackAudioLoaded = false;
            });
            
        } catch (error) {
            console.error('❌ Error initializing fallback audio:', error);
            this.fallbackAudioLoaded = false;
        }
    }

    /**
     * Create or recreate the audio pool
     */
    createAudioPool() {
debug('UI', 'Creating audio pool...');
        this.audioPool = [];
        this.audioElementUseCount = [];
        
        for (let i = 0; i < this.audioPoolSize; i++) {
            this.createAudioElement(i);
        }
debug('UI', `✅ Audio pool created with ${this.audioPool.length} elements`);
    }

    /**
     * Create a single audio element for the pool
     */
    createAudioElement(index) {
        // Use static audio directory path
        const audioBasePath = 'static/audio/';
        const audioClone = new Audio(`${audioBasePath}blurb.mp3`);
        audioClone.volume = 0.7;
        audioClone.preload = 'auto';
        this.audioElementUseCount[index] = 0;
        
        // Add event listeners for debugging and health monitoring
        audioClone.addEventListener('play', () => {
debug('UI', `🎵 Audio ${index} started playing (use #${this.audioElementUseCount[index] + 1})`);
        });
        
        audioClone.addEventListener('ended', () => {
debug('UI', `🎵 Audio ${index} finished playing`);
        });
        
        audioClone.addEventListener('error', (e) => {
            console.error(`❌ Audio ${index} error:`, e);
            // Immediately recreate this element after a delay
            setTimeout(() => this.recreateAudioElement(index), 100);
        });
        
        // Monitor for potential corruption - if an element gets stuck
        audioClone.addEventListener('stalled', () => {
            console.warn(`⚠️ Audio ${index} stalled - may need recreation`);
        });
        
        audioClone.addEventListener('suspend', () => {
            console.warn(`⚠️ Audio ${index} suspended - may need recreation`);
        });
        
        this.audioPool[index] = audioClone;
debug('NAVIGATION', `🔧 Created audio element ${index} (dev path)`);
    }

    /**
     * Recreate a specific audio element that may be corrupted
     */
    recreateAudioElement(index) {
debug('UI', `🔄 Recreating potentially corrupted audio element ${index}`);
        
        // Clean up old element
        if (this.audioPool[index]) {
            this.audioPool[index].src = '';
            this.audioPool[index].load();
        }
        
        // Create new element
        this.createAudioElement(index);
    }

    /**
     * Check if an audio element is healthy and recreate if needed
     */
    checkAudioElementHealth(index) {
        const audio = this.audioPool[index];
        const useCount = this.audioElementUseCount[index];
        
        // More aggressive corruption detection - recreate after fewer uses
        const maxUsesThreshold = Math.max(2, this.maxUsesPerElement / 2); // Use half the max, minimum 2
        if (useCount >= maxUsesThreshold) {
debug('UI', `🔄 Audio element ${index} reached threshold (${useCount}/${maxUsesThreshold}), recreating...`);
            this.recreateAudioElement(index);
            return false; // Don't use this element this time
        }
        
        // Check if element is in a bad state
        if (!audio || audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
            console.warn(`⚠️ Audio element ${index} unhealthy, recreating...`);
            this.recreateAudioElement(index);
            return false;
        }
        
        // Check for silent corruption - element exists but may not actually play sound
        if (this.detectSilentCorruption(audio, index)) {
            console.warn(`🔇 Audio element ${index} appears silently corrupted, recreating...`);
            this.recreateAudioElement(index);
            return false;
        }
        
        return true;
    }

    /**
     * Detect silent audio corruption where the element reports success but produces no sound
     */
    detectSilentCorruption(audio, index) {
        // Check if audio duration is invalid (common corruption sign)
        if (isNaN(audio.duration) || audio.duration === 0) {
            console.warn(`⚠️ Audio ${index} has invalid duration: ${audio.duration}`);
            return true;
        }
        
        // Check if audio source is missing or corrupted
        if (!audio.src || audio.src === '') {
            console.warn(`⚠️ Audio ${index} missing source`);
            return true;
        }
        
        // Check readyState - if it's dropped below HAVE_ENOUGH_DATA, it may be corrupted
        if (audio.readyState < 2) {
            console.warn(`⚠️ Audio ${index} readyState dropped to ${audio.readyState}`);
            return true;
        }
        
        // Check if volume has been mysteriously set to 0 (corruption symptom)
        if (audio.volume === 0) {
            console.warn(`⚠️ Audio ${index} volume is 0 (possible corruption)`);
            audio.volume = 0.7; // Try to restore volume
            return true; // Still recreate to be safe
        }
        
        return false;
    }

    /**
     * Set up user interaction tracking for browser audio policies
     */
    setupUserInteractionTracking() {
        // Check if StarfieldAudioManager is handling user interaction detection
        const starfieldAudioManager = window.starfieldAudioManager;
        if (starfieldAudioManager) {
            // Use the global user interaction detection
debug('UI', 'Using global StarfieldAudioManager for user interaction detection');
            
            // Set up a periodic check to sync with the global state
            const checkInteractionState = () => {
                if (!this.userHasInteracted && starfieldAudioManager.hasUserInteracted()) {
                    this.userHasInteracted = true;
debug('UI', 'User interaction detected via StarfieldAudioManager');
                    
                    // Resume AudioContext if suspended
                    if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                        this.audioListener.context.resume().then(() => {
debug('UI', '🔊 AudioContext resumed after user interaction');
                        });
                    }
                }
            };
            
            // Check immediately and then periodically
            checkInteractionState();
            this.interactionCheckInterval = setInterval(checkInteractionState, 100);
        } else {
            // Fallback to local user interaction detection if StarfieldAudioManager not available
debug('AI', 'StarfieldAudioManager not available, using local user interaction detection');
            
            const trackInteraction = () => {
                if (!this.userHasInteracted) {
                    this.userHasInteracted = true;
debug('UI', 'User interaction detected - audio should work now');
                    
                    // Resume AudioContext if suspended
                    if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                        this.audioListener.context.resume().then(() => {
debug('UI', '🔊 AudioContext resumed after user interaction');
                        });
                    }
                }
            };
            
            // Track various user interactions
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, trackInteraction, { once: false });
            });
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.interactionCheckInterval) {
            clearInterval(this.interactionCheckInterval);
            this.interactionCheckInterval = null;
        }
    }

    /**
     * Play upgrade success sound with improved reliability
     */
    playUpgradeSound() {
debug('UI', '🎵 Attempting to play upgrade sound...');
        
        // Check user interaction for browser policies - only show warning once per session
        if (!this.userHasInteracted) {
            // Check if StarfieldAudioManager has already shown the warning
            const starfieldAudioManager = window.starfieldAudioManager;
            if (starfieldAudioManager && !starfieldAudioManager.hasWarningBeenShown()) {
                debug('UTILITY', 'No user interaction detected - sound may not play due to browser policy');
                starfieldAudioManager.markWarningShown();
            } else if (!starfieldAudioManager && !this.audioWarningShown) {
                debug('UTILITY', 'No user interaction detected - sound may not play due to browser policy');
                this.audioWarningShown = true;
            }
        }
        
        try {
            // Try THREE.js audio first
            if (this.upgradeSoundLoaded && this.upgradeSound && !this.upgradeSound.isPlaying) {
debug('UI', '🎵 Playing THREE.js upgrade sound');
                
                // Ensure AudioContext is running before playing sounds
                if (this.audioListener.context.state === 'suspended') {
                    this.audioListener.context.resume().then(() => {
                        this.upgradeSound.play();
debug('UI', '✅ Playing upgrade success sound (blurb.mp3) via THREE.js');
                    });
                } else {
                    this.upgradeSound.play();
debug('UI', '✅ Playing upgrade success sound (blurb.mp3) via THREE.js');
                }
                return;
            }
            
            // Try fallback HTML5 audio with improved pooling and health checking
            if (this.fallbackAudioLoaded && this.audioPool && this.audioPool.length > 0) {
debug('UI', '🎵 Playing fallback HTML5 upgrade sound');
                
                // Get current pool index BEFORE incrementing
                const originalPoolIndex = this.audioPoolIndex;
                let currentPoolIndex = originalPoolIndex;
                let attemptsRemaining = this.audioPoolSize; // Try all elements if needed
                
                while (attemptsRemaining > 0) {
                    // Check if this audio element is healthy
                    if (!this.checkAudioElementHealth(currentPoolIndex)) {
                        console.warn(`⚠️ Audio element ${currentPoolIndex} unhealthy, trying next...`);
                        currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                        attemptsRemaining--;
                        continue;
                    }
                    
                    const audioToPlay = this.audioPool[currentPoolIndex];
                    
                    // Increment use count for health monitoring
                    this.audioElementUseCount[currentPoolIndex]++;
                    
                    // Update pool index for next use
                    this.audioPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                    
debug('UI', `🎵 Using audio pool slot ${currentPoolIndex} (next will be ${this.audioPoolIndex}) [use #${this.audioElementUseCount[currentPoolIndex]}]`);
                    
                    // Ensure audio exists and is ready
                    if (!audioToPlay) {
                        console.error(`❌ Audio pool slot ${currentPoolIndex} is null/undefined`);
                        this.recreateAudioElement(currentPoolIndex);
                        currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                        attemptsRemaining--;
                        continue;
                    }
                    
                    // Perform final health check before playing
                    if (this.detectSilentCorruption(audioToPlay, currentPoolIndex)) {
                        console.warn(`🔇 Last-minute corruption detected for audio ${currentPoolIndex}, skipping...`);
                        this.recreateAudioElement(currentPoolIndex);
                        currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                        attemptsRemaining--;
                        continue;
                    }
                    
                    if (audioToPlay.readyState >= 2) { // HAVE_ENOUGH_DATA
                        // Reset audio to beginning and ensure it's not already playing
                        if (!audioToPlay.paused) {
                            audioToPlay.pause();
                        }
                        audioToPlay.currentTime = 0;
                        
                        // Double-check volume before playing
                        if (audioToPlay.volume !== 0.7) {
debug('UI', `🔧 Resetting audio ${currentPoolIndex} volume from ${audioToPlay.volume} to 0.7`);
                            audioToPlay.volume = 0.7;
                        }
                        
                        const playPromise = audioToPlay.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                // Playing upgrade sound
                                
                                // Set up a corruption detection timeout
                                setTimeout(() => {
                                    if (audioToPlay.paused && audioToPlay.currentTime === 0) {
                                        console.warn(`🔇 Audio ${currentPoolIndex} may have failed silently - recreating for next use`);
                                        this.recreateAudioElement(currentPoolIndex);
                                    }
                                }, 100); // Check after 100ms
                                
                            }).catch((error) => {
                                console.error(`❌ HTML5 audio play failed for pool ${currentPoolIndex}:`, error);
                                console.error('Error details:', {
                                    name: error.name,
                                    message: error.message,
                                    code: error.code,
                                    audioState: {
                                        readyState: audioToPlay.readyState,
                                        paused: audioToPlay.paused,
                                        currentTime: audioToPlay.currentTime,
                                        duration: audioToPlay.duration,
                                        networkState: audioToPlay.networkState,
                                        error: audioToPlay.error
                                    }
                                });
                                
                                // Mark this element for recreation and try next
                                this.recreateAudioElement(currentPoolIndex);
                                if (attemptsRemaining > 1) {
debug('UI', `🔄 Trying next audio element...`);
                                    currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                                    attemptsRemaining--;
                                    // Recursive call to try next element
                                    setTimeout(() => this.playUpgradeSound(), 10);
                                } else {
                                    // All elements failed, try alternative playback
                                    this.tryAlternativeAudioPlayback();
                                }
                            });
                        }
                        return; // Successfully attempted playback
                    } else {
                        console.warn(`⚠️ Audio pool ${currentPoolIndex} not ready (readyState: ${audioToPlay.readyState}), trying to load...`);
                        audioToPlay.load();
                        audioToPlay.addEventListener('canplaythrough', () => {
                            audioToPlay.currentTime = 0;
                            audioToPlay.play().then(() => {
debug('UTILITY', `✅ Audio pool ${currentPoolIndex} played after loading`);
                            }).catch(err => {
                                console.error(`❌ Audio pool ${currentPoolIndex} play failed after loading:`, err);
                                this.recreateAudioElement(currentPoolIndex);
                            });
                        }, { once: true });
                        return; // Attempted to load and play
                    }
                }
                
                // If we get here, all audio elements failed
                console.error(`❌ All audio elements failed, recreating pool...`);
                this.createAudioPool();
                this.tryAlternativeAudioPlayback();
                return;
            }
            
            // Fallback to original method if pool isn't available yet
            if (this.fallbackAudioLoaded && this.fallbackAudio) {
debug('UI', '🎵 Playing fallback HTML5 upgrade sound (original method)');
                this.playOriginalFallbackAudio();
                return;
            }
            
            // If no audio method worked, try creating new instance
            this.tryAlternativeAudioPlayback();
            
        } catch (error) {
            console.error('❌ Error playing upgrade sound:', error);
            this.tryAlternativeAudioPlayback();
        }
    }

    /**
     * Play original fallback audio method
     */
    playOriginalFallbackAudio() {
        try {
            this.fallbackAudio.currentTime = 0;
            
            const playPromise = this.fallbackAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
debug('UI', '✅ Playing upgrade success sound (blurb.mp3) via HTML5 audio (original)');
                }).catch((error) => {
                    console.error('❌ Original HTML5 audio play failed:', error);
                    this.tryAlternativeAudioPlayback();
                });
            }
        } catch (error) {
            console.error('❌ Original fallback audio error:', error);
            this.tryAlternativeAudioPlayback();
        }
    }

    /**
     * Try alternative audio playback methods
     */
    tryAlternativeAudioPlayback() {
debug('NAVIGATION', '🔄 Trying alternative audio playback with path fallback...');
        
        try {
            // Method 1: Create fresh Audio instance
            const immediateAudio = new Audio('static/audio/blurb.mp3');
            immediateAudio.volume = 0.7;
            
            // Add a small delay to ensure browser readiness
            setTimeout(() => {
                const playPromise = immediateAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
debug('UI', '✅ Emergency audio playback successful');
                    }).catch(err => {
                        console.error('❌ Emergency audio playback failed:', err);
                        // Method 2: Try Web Audio API if available
                        this.tryWebAudioPlayback();
                    });
                }
            }, 10);
            
        } catch (emergencyError) {
            console.error('❌ Emergency audio creation failed:', emergencyError);
            this.tryWebAudioPlayback();
        }
    }

    /**
     * Try Web Audio API as last resort
     */
    tryWebAudioPlayback() {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
debug('NAVIGATION', '🔊 Trying Web Audio API with path fallback...');
            
            try {
                const AudioCtx = AudioContext || webkitAudioContext;
                const audioContext = new AudioCtx();
                
                // Load and play audio
                fetch('static/audio/blurb.mp3')
                    .then(response => response.arrayBuffer())
                    .then(data => audioContext.decodeAudioData(data))
                    .then(audioBuffer => {
                        const source = audioContext.createBufferSource();
                        const gainNode = audioContext.createGain();
                        
                        source.buffer = audioBuffer;
                        gainNode.gain.value = 0.7;
                        
                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        source.start();
debug('UI', '✅ Web Audio API playback successful');
                    })
                    .catch(error => {
                        console.error('❌ Web Audio API failed:', error);
                        console.warn('💔 All audio playback methods failed');
                    });
                    
            } catch (webAudioError) {
                console.error('❌ Web Audio API not supported:', webAudioError);
                console.warn('💔 All audio playback methods failed');
            }
        } else {
            console.warn('💔 All audio playback methods failed - no Web Audio API support');
        }
    }

    /**
     * Static method to access player data
     * @returns {PlayerData} The global player data instance
     */
    static getPlayerData() {
        return playerData;
    }

    /**
     * Add a ship to the player's collection
     * @param {string} shipType - Ship type to add
     */
    addShipToPlayer(shipType) {
        if (SHIP_CONFIGS[shipType]) {
            playerData.addShip(shipType);
            
            // Refresh the ship selector if we're in shop mode
            if (this.isShopMode) {
                const shipSelector = document.getElementById('ship-type-select');
                if (shipSelector) {
                    shipSelector.innerHTML = this.createShipTypeOptions();
                }
            }
        } else {
            console.warn(`Cannot add unknown ship type: ${shipType}`);
        }
    }

    init() {
        // Only create UI if we have a container
        if (this.container) {
            this.createUI();
            this.setupEventListeners();
            
            // Only load test data and render if we haven't loaded a ship configuration
            if (!this.currentShipType || this.shipSlots.size === 0) {
                this.loadTestData();
                this.render();
            } else {
                // Only update the inventory portion, not the ship slots
                this.renderInventoryGrid();
                this.updateCollectionStats();
                this.updateCreditsDisplay();
                this.renderShipSlots();
            }
        } else {
            // For temporary instances, just load test data without UI
            this.loadTestData();
        }
    }

    /**
     * Show the card inventory as a station shop
     * @param {Object} dockedLocation - The location where the ship is docked
     * @param {Object} dockingInterface - Reference to the station menu to return to
     */
    showAsShop(dockedLocation, dockingInterface) {
        this.isShopMode = true;
        this.dockedLocation = dockedLocation;
        this.dockingInterface = dockingInterface;
        
        // Store reference globally for button handlers
        window.cardInventoryUI = this;
        
        // Get current ship from starfieldManager to set the ship selector correctly
        let currentShip = null;
        if (dockingInterface && dockingInterface.starfieldManager) {
            currentShip = dockingInterface.starfieldManager.ship;
            if (currentShip && currentShip.shipType) {
                this.currentShipType = currentShip.shipType;
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
                
                // Validate that the player owns this ship, if not fall back to first owned ship
                this.validateCurrentShipOwnership();
            }
        }
        
        // Create shop container
        this.createShopContainer();
        
        this.createUI();
        this.setupEventListeners();
        
        // Only load test data if we haven't done so yet
        const hasTestData = this.inventory && this.inventory.getDiscoveredCards().length > 0;
        if (!hasTestData) {
            this.loadTestData();
        }
        
        // Only load ship configuration from actual ship if we don't already have cards loaded
        // This prevents overwriting cards that the user has installed in the UI
        const hasShipSlots = this.shipSlots && this.shipSlots.size > 0;
        if (!hasShipSlots) {
            if (currentShip) {
                this.loadCurrentShipConfiguration(currentShip);
            } else if (this.currentShipType) {
                // Fallback to stored configuration if no current ship available
                this.loadShipConfiguration(this.currentShipType);
            }
        }
        
        // Always render to update the display
        this.render();
        
        // Set the ship selector dropdown to the current ship type
        const shipSelector = document.getElementById('ship-type-select');
        if (shipSelector && this.currentShipType) {
            shipSelector.value = this.currentShipType;
        }
        
        // Clear NEW card status when shop is opened
        this.clearNewCardStatus();
        
        // Reload quantity increase timestamps from localStorage before displaying
        this.quantityIncreaseTimestamps = this.getQuantityIncreaseTimestamps();
        console.log('🔍 COLLECTION: Reloaded quantity increase timestamps from localStorage:', this.quantityIncreaseTimestamps);
        console.log('🔍 COLLECTION: Raw localStorage for verification:', localStorage.getItem('planetz_quantity_increase_timestamps'));
        
        // Clear quantity increase status after a delay to let user see red badges first
        setTimeout(() => {
            console.log('🔍 COLLECTION: Clearing quantity increase timestamps after delay');
            this.clearQuantityIncreaseStatus();
        }, 5000); // 5 second delay to see red badges
        
        // Show the shop
        this.shopContainer.style.display = 'block';
        
debug('UI', 'Card shop opened at:', dockedLocation);
debug('UI', 'Docking interface reference stored:', !!this.dockingInterface);
    }

    /**
     * Validate that the current ship type is owned by the player
     * If not, fall back to the first owned ship
     */
    validateCurrentShipOwnership() {
        if (!playerData.ownsShip(this.currentShipType)) {
            const ownedShips = playerData.getOwnedShips();
            if (ownedShips.length > 0) {
                console.warn(`Player doesn't own ${this.currentShipType}, falling back to ${ownedShips[0]}`);
                this.currentShipType = ownedShips[0];
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
            } else {
                console.error('Player owns no ships! Adding starter ship as fallback.');
                playerData.addShip('starter_ship');
                this.currentShipType = 'starter_ship';
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
            }
        }
    }

    /**
     * Hide the shop and return to station menu
     */
    hideShop() {
debug('UI', 'Hiding shop...');
debug('AI', 'Shop container exists:', !!this.shopContainer);
debug('UI', 'Docking interface exists:', !!this.dockingInterface);
debug('UI', 'Docked location exists:', !!this.dockedLocation);
        
        if (this.shopContainer && this.shopContainer.parentNode) {
            this.shopContainer.parentNode.removeChild(this.shopContainer);
            this.shopContainer = null;
        }
        
        // Clean up credits display
        const creditsDisplay = document.getElementById('credits-display');
        if (creditsDisplay && creditsDisplay.parentNode) {
            creditsDisplay.parentNode.removeChild(creditsDisplay);
        }
        
        this.isShopMode = false;
        
        // Return to station menu
        if (this.dockingInterface) {
debug('UI', 'Attempting to show station menu...');
            try {
                this.dockingInterface.returnToStationMenu();
debug('UI', 'Successfully returned to station menu');
            } catch (error) {
                console.error('Error showing station menu:', error);
            }
        } else {
            console.error('Cannot return to station menu - missing docking interface reference');
        }
        
debug('UI', 'Card shop closed');
    }

    /**
     * Create the shop container for station mode
     */
    createShopContainer() {
        // Remove existing shop container
        if (this.shopContainer) {
            this.hideShop();
        }
        
        // Create shop container
        this.shopContainer = document.createElement('div');
        
        this.shopContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.95) !important;
            color: #00ff41 !important;
            font-family: 'VT323', monospace !important;
            z-index: 1000 !important;
            display: none !important;
            overflow-y: auto !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;
        
        // Set container reference for createUI
        this.container = this.shopContainer;
        
        // Add to document
        document.body.appendChild(this.shopContainer);
    }

    /**
     * Load test data for demonstration
     */
    loadTestData() {
debug('UI', 'Loading test data for card inventory...');
        
        // Generate some random cards for testing
        for (let i = 0; i < 15; i++) {
            const card = this.inventory.generateRandomCard();
            this.inventory.addCard(card);
        }
        
        // Add essential core system cards that players need guaranteed access to
        const specificCards = [
            // Core propulsion systems
            'impulse_engines',
            'warp_drive',
            
            // Essential defense systems
            'shields',
            'shield_generator',
            'hull_plating',
            
            // Core weapon systems - energy weapons
            'laser_cannon',
            'plasma_cannon',
            'pulse_cannon',
            'phaser_array',
            
            // Core weapon systems - projectile weapons
            'standard_missile',
            'homing_missile',
            'photon_torpedo',
            'proximity_mine',
            
            // Essential navigation and communication systems
            'galactic_chart',           // Required for G key functionality
            'long_range_scanner',       // Required for L key functionality  
            'subspace_radio',           // Required for R key functionality
            'target_computer',          // Required for T key functionality
            
            // Proximity detection systems
            'basic_radar',              // Required for P key proximity detector functionality
            'advanced_radar',           // Enhanced radar capabilities
            'tactical_radar',           // Advanced tactical radar system
            
            // Advanced Intel Systems (for Intel I key functionality)
            'tactical_computer',        // Level 3+ target computer with basic intel capabilities
            
            // Core power and utility systems
            'energy_reactor',
            'cargo_hold'
        ];
        
        specificCards.forEach(cardType => {
            const card = this.inventory.generateSpecificCard(cardType, 'common');
            this.inventory.addCard(card);
        });
        
        // Add MANY more impulse engines to allow upgrading to higher levels
        // Level 5 engine (max impulse 9) needs 20 cards total
        // So we'll add 25 cards to allow for some experimentation
debug('UI', 'Adding 25 impulse engine cards for high-level upgrades...');
        for (let i = 0; i < 25; i++) {
            const impulseEngine = this.inventory.generateSpecificCard('impulse_engines', 'common');
            this.inventory.addCard(impulseEngine);
        }
        
        // Also add multiple energy reactors for upgrading
        for (let i = 0; i < 15; i++) {
            const reactor = this.inventory.generateSpecificCard('energy_reactor', 'common');
            this.inventory.addCard(reactor);
        }
        
        // Add multiple weapon cards for upgrading  
        for (let i = 0; i < 10; i++) {
            const laser = this.inventory.generateSpecificCard('laser_cannon', 'common');
            this.inventory.addCard(laser);
            
            const plasma = this.inventory.generateSpecificCard('plasma_cannon', 'common');
            this.inventory.addCard(plasma);
        }
        
        // Add multiple target computer cards for upgrading to Level 3+ for sub-targeting
        // Level 1→2 needs 3 cards, Level 2→3 needs 6 cards = 9 total for Level 3
        // Add 12 cards to allow for experimentation and future upgrades
debug('TARGETING', 'Adding 12 target computer cards for sub-targeting upgrades...');
        for (let i = 0; i < 12; i++) {
            const targetComputer = this.inventory.generateSpecificCard('target_computer', 'common');
            this.inventory.addCard(targetComputer);
        }
        
        // Add multiple radar cards for upgrading proximity detector system
debug('UI', 'Adding 10 radar cards for proximity detector upgrades...');
        for (let i = 0; i < 10; i++) {
            const basicRadar = this.inventory.generateSpecificCard('basic_radar', 'common');
            this.inventory.addCard(basicRadar);
        }
        
debug('UTILITY', 'Test data loaded with high-level upgrade capabilities');
    }

    /**
     * Add CSS styles for NEW badge
     */
    addNewBadgeStyles() {
        // Check if styles already exist
        if (document.getElementById('new-badge-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'new-badge-styles';
        style.textContent = `
            .new-badge {
                position: absolute;
                top: 5px;
                right: 5px;
                background: linear-gradient(45deg, #ff4444, #ff6666);
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 8px;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                animation: newBadgePulse 2s infinite;
                font-family: 'VT323', monospace;
                letter-spacing: 1px;
            }
            
            @keyframes newBadgePulse {
                0%, 100% { 
                    transform: scale(1);
                    opacity: 1;
                }
                50% { 
                    transform: scale(1.1);
                    opacity: 0.8;
                }
            }
            
            .card-stack.has-new-badge {
                position: relative;
            }
            
            .card-stack.has-new-badge::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #ff4444, #ff6666, #ff4444);
                border-radius: 8px;
                z-index: -1;
                animation: newCardGlow 3s infinite;
            }
            
            @keyframes newCardGlow {
                0%, 100% { 
                    opacity: 0.3;
                }
                50% { 
                    opacity: 0.6;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create the UI elements
     */
    createUI() {
        if (!this.container) {
            console.warn('Cannot create UI - no container available');
            return;
        }

        this.container.innerHTML = '';
        
        // Add NEW badge CSS styles
        this.addNewBadgeStyles();
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-inventory-header';
        header.innerHTML = `
            <h2>${this.isShopMode ? 'SHIP UPGRADE SHOP' : 'SHIP COLLECTION'}</h2>
            ${this.isShopMode ? 
                `<button onclick="cardInventoryUI.hideShop()" class="close-shop-btn">← RETURN TO STATION MENU</button>` : 
                `<button onclick="cardInventoryUI.hideInventory()" class="close-inventory-btn">← RETURN TO STATION MENU</button>`
            }
        `;
        this.container.appendChild(header);

        // Create main content area with proper two-panel structure
        const mainContent = document.createElement('div');
        mainContent.className = 'inventory-main';
        this.container.appendChild(mainContent);

        if (this.isShopMode) {
            // Shop mode: Create ship selector, then two-panel layout (ship slots LEFT, inventory RIGHT)
            this.createShipSlotsPanel();
            this.createInventoryPanel();
        } else {
            // Normal mode: Create two-panel layout (ship slots LEFT, inventory RIGHT)
            this.createShipSlotsPanel();
            this.createInventoryPanel();
        }
        
        // Create collection stats (outside the main grid)
        this.createCollectionStats();
        
        // Set up drag and drop event listeners
        this.setupEventListeners();
    }

    /**
     * Create ship slots panel (left side in normal mode)
     */
    createShipSlotsPanel() {
        const panel = document.createElement('div');
        panel.className = 'ship-slots-panel';
        panel.innerHTML = `
            <h3>SHIP CONFIGURATION</h3>
            <div class="ship-type-selection">
                <label>Ship Type:</label>
                <select id="ship-type-select" onchange="cardInventoryUI.switchShip(this.value)">
                    ${this.createShipTypeOptions()}
                </select>
            </div>
            <div class="ship-slots-grid" id="ship-slots-grid">
                <!-- Ship slots will be populated by renderShipSlots() -->
            </div>
        `;
        this.container.querySelector('.inventory-main').appendChild(panel);
        
        // Render the ship slots immediately
        this.renderShipSlots();
    }

    /**
     * Create inventory panel (right side)
     */
    createInventoryPanel() {
        const panel = document.createElement('div');
        panel.className = 'inventory-panel';
        panel.innerHTML = `
            <h3>COLLECTION</h3>
            <div class="inventory-grid" id="inventory-grid">
                <!-- Collection cards will be populated by renderInventoryGrid() -->
            </div>
        `;
        this.container.querySelector('.inventory-main').appendChild(panel);
    }

    /**
     * Create ship selector dropdown
     */
    createShipSelector() {
        const selector = document.createElement('div');
        selector.className = 'ship-selector';
        selector.innerHTML = `
            <h3>SELECT SHIP</h3>
            <select id="ship-type-select" onchange="cardInventoryUI.switchShip(this.value)">
                ${this.createShipTypeOptions()}
            </select>
        `;
        this.container.querySelector('.inventory-main').appendChild(selector);
    }

    /**
     * Create ship type options for dropdown
     */
    createShipTypeOptions() {
        // For testing, show all available ship types instead of just owned ships
        const allShipTypes = Object.keys(SHIP_CONFIGS);
        return allShipTypes.map(shipType => {
            const config = SHIP_CONFIGS[shipType];
            return `<option value="${shipType}" ${shipType === this.currentShipType ? 'selected' : ''}>
                ${config ? config.name : shipType}
            </option>`;
        }).join('');
    }

    /**
     * Create ship stats display
     */
    createShipStats() {
        const stats = document.createElement('div');
        stats.className = 'ship-stats';
        stats.id = 'ship-stats';
        this.container.querySelector('.inventory-main').appendChild(stats);
    }

    /**
     * Create inventory grid (deprecated - use createInventoryPanel instead)
     */
    createInventoryGrid() {
        // This method is kept for backward compatibility but should not be used
        console.warn('createInventoryGrid is deprecated, use createInventoryPanel instead');
    }

    /**
     * Create collection stats display
     */
    createCollectionStats() {
        const stats = document.createElement('div');
        stats.className = 'collection-stats';
        stats.id = 'collection-stats';
        this.container.appendChild(stats); // Append to main container, not inventory-main
    }

    /**
     * Create ship configuration panel with ship slots (deprecated - use createShipSlotsPanel)
     */
    createShipConfigurationPanel() {
        // This method is kept for backward compatibility
        this.createShipSlotsPanel();
    }

    /**
     * Render ship slots based on current ship configuration
     */
    renderShipSlots() {
        const slotsGrid = document.getElementById('ship-slots-grid');
        if (!slotsGrid) return;
        
        const config = this.currentShipConfig;
        if (!config) {
            slotsGrid.innerHTML = '<div class="error">Ship configuration not found</div>';
            return;
        }
        
        // Create slot type mapping (slot index to slot type)
        const slotTypes = this.generateSlotTypeMapping(config);
        
        // Create slots based on ship configuration
        const slots = [];
        for (let i = 0; i < config.systemSlots; i++) {
            const slotType = slotTypes[i] || 'utility'; // Default to utility if not mapped
            const equippedCard = this.shipSlots.get(i.toString());
            
            const slotContent = equippedCard ? 
                `<div class="installed-card" data-card-type="${equippedCard.cardType}">
                    <div class="card-icon">${equippedCard.getIcon()}</div>
                    <div class="card-name">${equippedCard.getDisplayName()}</div>
                    <div class="card-level">Lv.${equippedCard.level || 1}</div>
                    <button class="remove-card-btn" onclick="cardInventoryUI.removeCard('${i}')">×</button>
                </div>` :
                `<div class="empty-slot">
                    <div class="slot-type-icon">${this.getSlotTypeIcon(slotType)}</div>
                    <div class="slot-type-label">${slotType.toUpperCase()}</div>
                    <div class="slot-number">Slot ${i + 1}</div>
                </div>`;
                
            slots.push(`
                <div class="ship-slot" 
                     data-slot-id="${i}"
                     data-slot-type="${slotType}"
                     ondrop="cardInventoryUI.handleDrop(event)"
                     ondragover="cardInventoryUI.handleDragOver(event)"
                     ondragenter="cardInventoryUI.handleDragEnter(event)"
                     ondragleave="cardInventoryUI.handleDragLeave(event)">
                    ${slotContent}
                </div>
            `);
        }
        
        slotsGrid.innerHTML = slots.join('');
        
debug('RENDER', `🔧 Rendered ${config.systemSlots} ship slots for ${config.name}`);
    }
    
    /**
     * Generate slot type mapping based on ship configuration
     */
    generateSlotTypeMapping(config) {
        const slotTypes = {};
        let currentSlot = 0;
        
        if (config.slotConfig) {
            // Use the slotConfig to assign slot types
            Object.entries(config.slotConfig).forEach(([slotType, count]) => {
                for (let i = 0; i < count; i++) {
                    slotTypes[currentSlot] = slotType;
                    currentSlot++;
                }
            });
        }
        
        // Fill remaining slots with 'utility' type
        while (currentSlot < config.systemSlots) {
            slotTypes[currentSlot] = 'utility';
            currentSlot++;
        }
        
        return slotTypes;
    }
    
    /**
     * Get icon for slot type
     */
    getSlotTypeIcon(slotType) {
        const slotIcons = {
            engines: '🚀',
            reactor: '⚡',
            weapons: '⚔️',
            utility: '🔧',
            warpDrive: '🌀',
            shields: '🛡️',
            scanner: '📡',
            radio: '📻',
            galacticChart: '🗺️',
            targetComputer: '🎯',
            missileTubes: '🚀'
        };
        return slotIcons[slotType] || '🔧';
    }

    /**
     * Setup event listeners for drag and drop
     */
    setupEventListeners() {
        // Add drag start event listeners to all cards
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card-stack')) {
                this.handleDragStart(e);
            }
        });
        
        // Add drag end event listeners
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('card-stack')) {
                this.handleDragEnd(e);
            }
        });
        
debug('UI', 'Drag and drop event listeners set up');
    }

    /**
     * Handle drag start
     */
    handleDragStart(e) {
        const cardElement = e.target;
        const cardType = cardElement.dataset.cardType;
        const cardLevel = cardElement.dataset.cardLevel;
        const cardRarity = cardElement.dataset.cardRarity;
        
        // Store drag data
        const dragData = {
            cardType: cardType,
            level: parseInt(cardLevel) || 1,
            rarity: cardRarity || 'common'
        };
        
        // Store in both dataTransfer and class property
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        this.currentDragData = dragData; // Store for dragenter events
        
        // Set drag effect
        e.dataTransfer.effectAllowed = 'move';
        
        // Add visual feedback
        cardElement.classList.add('dragging');
        
debug('UI', `🚀 Started dragging ${cardType} (Lv.${dragData.level})`);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        const cardElement = e.target;
        cardElement.classList.remove('dragging');
        
        // Clear current drag data
        this.currentDragData = null;
        
        // Clean up any remaining drag feedback on ALL slots
        document.querySelectorAll('.ship-slot').forEach(slot => {
            slot.classList.remove('valid-drop', 'invalid-drop');
        });
    }

    /**
     * Handle drag over (must prevent default to allow drop)
     */
    handleDragOver(e) {
        e.preventDefault();
        return false;
    }

    /**
     * Handle drag enter with slot type validation
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        const slot = e.currentTarget;
        const slotType = slot.dataset.slotType;
        
        // Clear any existing feedback classes first
        slot.classList.remove('valid-drop', 'invalid-drop');
        
        // Check if slot is empty
        const isEmpty = slot.querySelector('.empty-slot') !== null;
        if (!isEmpty) {
            slot.classList.add('invalid-drop');
            return;
        }
        
        // Use stored drag data (dataTransfer.getData() doesn't work reliably in dragenter)
        if (this.currentDragData) {
            const dragCardType = this.currentDragData.cardType;
            const isCompatible = this.isCardCompatibleWithSlot(dragCardType, slotType);
            
            if (isCompatible) {
                slot.classList.add('valid-drop');
            } else {
                slot.classList.add('invalid-drop');
            }
        } else {
            slot.classList.add('invalid-drop');
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const slot = e.currentTarget;
        
        // Only remove classes if we're actually leaving the slot
        // Check if the related target is within this slot
        if (!slot.contains(e.relatedTarget)) {
            slot.classList.remove('valid-drop', 'invalid-drop');
        }
    }

    /**
     * Handle drop with slot type validation
     */
    async handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const slot = e.currentTarget;
        const slotId = slot.dataset.slotId;
        const slotType = slot.dataset.slotType;
        
        // Clean up drag feedback immediately
        slot.classList.remove('valid-drop', 'invalid-drop');
        
        // Check if slot is occupied
        const isEmpty = slot.querySelector('.empty-slot') !== null;
        if (!isEmpty) {
debug('UI', `❌ Cannot drop card - slot ${slotId} is already occupied`);
            return false;
        }
        
        try {
            // Get drag data
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            // Validate card type compatibility with slot type
            if (!this.isCardCompatibleWithSlot(dragData.cardType, slotType)) {
debug('UI', `❌ Cannot drop ${dragData.cardType} card in ${slotType} slot - incompatible types`);
                return false;
            }
            
            // Create and install the card
            const card = this.inventory.generateSpecificCard(dragData.cardType, dragData.rarity);
            card.level = dragData.level;
            
            // Install card in slot
            this.shipSlots.set(slotId, card);
            
debug('UI', `✅ Installed ${card.cardType} in ${slotType} slot ${slotId}`);
            
            // CRITICAL FIX: Sync with ship's CardSystemIntegration.installedCards Map
            // This prevents the orphaned systems cleanup from removing essential systems
            if (window.viewManager && window.viewManager.ship && window.viewManager.ship.cardSystemIntegration) {
                window.viewManager.ship.cardSystemIntegration.installedCards.set(slotId, {
                    cardType: card.cardType,
                    level: card.level
                });
debug('UI', `🔗 Synced card with ship's CardSystemIntegration: ${card.cardType} (Lv.${card.level})`);
                
                // Refresh ship systems from the updated card configuration
                try {
                    await window.viewManager.ship.cardSystemIntegration.createSystemsFromCards();
                    
                    // Re-initialize cargo holds from updated cards
                    if (window.viewManager.ship.cargoHoldManager) {
                        window.viewManager.ship.cargoHoldManager.initializeFromCards();
debug('UI', '🚛 Cargo holds refreshed after card installation');
                    }
                    
debug('UI', '🔄 Ship systems refreshed after card installation');
                } catch (error) {
                    console.error('⚠️ Failed to refresh ship systems:', error);
                }
            } else {
                console.warn('⚠️ Could not sync with ship CardSystemIntegration - ship may not be available');
            }

            // Save the configuration to ensure changes persist
            this.saveCurrentShipConfiguration();
            
            // Update the slot display
            this.renderShipSlots();
            
debug('UI', `Configuration saved with ${this.shipSlots.size} total cards`);
            
        } catch (error) {
            console.error('❌ Failed to drop card:', error);
        }
        
        return false;
    }

    /**
     * Check if a card type is compatible with a slot type
     */
    isCardCompatibleWithSlot(cardType, slotType) {
        const cardToSlotMapping = {
            // Engine slot cards
            'impulse_engines': ['engines'],
            'quantum_drive': ['engines'],
            'dimensional_shifter': ['engines'],
            'temporal_engine': ['engines'],
            'gravity_well_drive': ['engines'],
            
            // Reactor/Power slot cards
            'energy_reactor': ['reactor'],
            'quantum_reactor': ['reactor'],
            'dark_matter_core': ['reactor'],
            'antimatter_generator': ['reactor'],
            'crystalline_matrix': ['reactor'],
            
            // Weapon slot cards
            'laser_cannon': ['weapons'],
            'pulse_cannon': ['weapons'],
            'plasma_cannon': ['weapons'],
            'phaser_array': ['weapons'],
            'disruptor_cannon': ['weapons'],
            'particle_beam': ['weapons'],
            'ion_storm_cannon': ['weapons'],
            'graviton_beam': ['weapons'],
            'quantum_torpedo': ['weapons'],
            'singularity_launcher': ['weapons'],
            'void_ripper': ['weapons'],
            'nanite_swarm': ['weapons'],
            // Projectile weapons
            'standard_missile': ['weapons'],
            'homing_missile': ['weapons'],
            'photon_torpedo': ['weapons'],
            'proximity_mine': ['weapons'],
            
            // Utility slot cards (most flexible)
            'hull_plating': ['utility'],
            'adaptive_armor': ['utility'],  // Advanced armor
            'shield_generator': ['utility'],
            'shields': ['utility'],
            'phase_shield': ['utility'],
            'quantum_barrier': ['utility'],
            'temporal_deflector': ['utility'],
            'cargo_hold': ['utility'],
            'reinforced_cargo_hold': ['utility'],
            'shielded_cargo_hold': ['utility'],
            'warp_drive': ['utility'],
            'long_range_scanner': ['utility'],
            'quantum_scanner': ['utility'],  // Advanced scanner
            'dimensional_radar': ['utility'],
            'basic_radar': ['utility'],
            'advanced_radar': ['utility'],
            'tactical_radar': ['utility'],
            'subspace_radio': ['utility'],
            'galactic_chart': ['utility'],
            'target_computer': ['utility'],
            'tactical_computer': ['utility'],
            'combat_computer': ['utility'],
            'strategic_computer': ['utility'],
            'precognition_array': ['utility'],
            'psionic_amplifier': ['utility'],
            'neural_interface': ['utility'],
            
            // Alien Technology (utility only)
            'zephyrian_crystal': ['utility'],
            'vorthan_mind_link': ['utility'],
            'nexus_harmonizer': ['utility'],
            'ethereal_conduit': ['utility'],
            
            // Experimental Systems (utility only)
            'probability_drive': ['utility'],
            'chaos_field_gen': ['utility'],
            'reality_anchor': ['utility'],
            'entropy_reverser': ['utility']
        };
        
        const allowedSlots = cardToSlotMapping[cardType] || ['utility']; // Default to utility
        return allowedSlots.includes(slotType);
    }

    /**
     * Check if a cargo hold card can be removed safely
     * @param {Object} card - The card being removed
     * @param {number} slotId - The slot ID
     * @returns {boolean} True if removal should be cancelled
     */
    async checkCargoHoldRemoval(card, slotId) {
debug('UI', `🛡️ CARGO CHECK: Checking ${card.cardType} in slot ${slotId}`);
        
        // Check if this is a cargo hold card
        const cargoHoldTypes = ['cargo_hold', 'reinforced_cargo_hold', 'shielded_cargo_hold'];
        if (!cargoHoldTypes.includes(card.cardType)) {
debug('UI', `🛡️ CARGO CHECK: ${card.cardType} is not a cargo hold card`);
            return false; // Not a cargo hold, proceed with normal removal
        }
        
debug('UI', `🛡️ CARGO CHECK: ${card.cardType} is a cargo hold card, checking for cargo...`);
        
        // Check if ship has cargo manager and if hold contains cargo
        if (!window.viewManager || !window.viewManager.ship || !window.viewManager.ship.cargoHoldManager) {
debug('AI', `🛡️ CARGO CHECK: No cargo manager available`);
            return false; // No cargo manager, proceed with removal
        }
        
        const cargoManager = window.viewManager.ship.cargoHoldManager;
debug('UI', `🛡️ CARGO CHECK: Found cargo manager with ${cargoManager.cargoHolds.size} holds`);
        
        // Find which cargo hold slot this card corresponds to
        let holdSlot = null;
debug('UI', `🛡️ CARGO CHECK: Looking for card slot ${slotId} in cargo holds`);
        for (const [holdSlotId, hold] of cargoManager.cargoHolds) {
debug('UI', `🛡️ CARGO CHECK: Checking hold ${holdSlotId} with slotId ${hold.slotId}`);
            if (hold.slotId === slotId) {
                holdSlot = holdSlotId;
debug('UI', `🛡️ CARGO CHECK: Found matching hold slot ${holdSlot}`);
                break;
            }
        }
        
        if (holdSlot === null) {
debug('UI', `🛡️ CARGO CHECK: No matching hold found for slot ${slotId}`);
            return false; // Hold not found, proceed with removal
        }
        
        // Check if hold contains cargo (use the actual card slot ID, not the hold map key)
        const hasCargo = cargoManager.hasCargoInHold(slotId);
debug('UI', `🛡️ CARGO CHECK: Hold ${holdSlot} (card slot ${slotId}) has cargo: ${hasCargo}`);
        if (!hasCargo) {
debug('UI', `🛡️ CARGO CHECK: Hold ${holdSlot} (card slot ${slotId}) is empty, proceeding with removal`);
            return false; // No cargo in hold, proceed with removal
        }
        
        // Get cargo contents for display (use the actual card slot ID)
        const cargoContents = cargoManager.getCargoInHold(slotId);
debug('AI', `🛡️ CARGO CHECK: Hold ${holdSlot} (card slot ${slotId}) contains ${cargoContents.length} cargo types`);
        
debug('UI', `🛡️ CARGO CHECK: Showing removal confirmation modal...`);
        // Show confirmation modal
        const result = await this.showCargoRemovalConfirmation(card, slotId, holdSlot, cargoContents, cargoManager);
debug('UI', `🛡️ CARGO CHECK: Modal returned ${result} (true = cancel removal, false = proceed)`);
        return result;
    }
    
    /**
     * Show cargo removal confirmation modal
     * @param {Object} card - The card being removed
     * @param {number} slotId - The slot ID
     * @param {number} holdSlot - The cargo hold slot
     * @param {Array} cargoContents - List of cargo items
     * @param {Object} cargoManager - Cargo manager reference
     * @returns {boolean} True if removal should be cancelled
     */
    async showCargoRemovalConfirmation(card, slotId, holdSlot, cargoContents, cargoManager) {
        return new Promise((resolve) => {
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'cargo-removal-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 20000;
                font-family: 'VT323', 'Courier New', monospace;
            `;
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 3px solid #ff4444;
                border-radius: 12px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 0 30px rgba(255, 68, 68, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.3);
                text-align: center;
                animation: modalSlideIn 0.3s ease-out;
            `;
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes modalSlideIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            // Create header
            const header = document.createElement('div');
            header.style.cssText = `
                color: #ff4444;
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 20px;
                text-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
            `;
            header.innerHTML = `⚠️ CARGO HOLD REMOVAL WARNING`;
            
            // Create message
            const message = document.createElement('div');
            message.style.cssText = `
                color: #ffffff;
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 25px;
            `;
            message.innerHTML = `
                <p style="margin-bottom: 15px;">You are attempting to remove a <span style="color: #00ff41; font-weight: bold;">${card.cardType.replace('_', ' ').toUpperCase()}</span> that contains cargo!</p>
                <p style="margin-bottom: 15px;">Removing this card will <span style="color: #ff4444; font-weight: bold;">DESTROY ALL CARGO</span> in this hold.</p>
            `;
            
            // Create cargo list
            const cargoList = document.createElement('div');
            cargoList.style.cssText = `
                background: rgba(0, 0, 0, 0.4);
                border: 2px solid #555;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
                max-height: 200px;
                overflow-y: auto;
            `;
            
            const cargoHeader = document.createElement('div');
            cargoHeader.style.cssText = `
                color: #ffff44;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                text-align: center;
            `;
            cargoHeader.textContent = 'CARGO TO BE DESTROYED:';
            cargoList.appendChild(cargoHeader);
            
            cargoContents.forEach(item => {
                const cargoItem = document.createElement('div');
                cargoItem.style.cssText = `
                    color: #ffffff;
                    font-size: 14px;
                    margin-bottom: 8px;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                `;
                cargoItem.innerHTML = `
                    <span style="color: #00ff41;">${item.name}</span> - 
                    <span style="color: #ffff44;">${item.quantity} units</span> 
                    (${item.volume} volume)
                `;
                cargoList.appendChild(cargoItem);
            });
            
            // Create warning
            const warning = document.createElement('div');
            warning.style.cssText = `
                color: #ff4444;
                font-size: 16px;
                font-weight: bold;
                margin: 20px 0;
                padding: 15px;
                background: rgba(255, 68, 68, 0.1);
                border: 2px solid #ff4444;
                border-radius: 8px;
            `;
            warning.textContent = '⚠️ THIS ACTION CANNOT BE UNDONE! ⚠️';
            
            // Create buttons container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 20px;
                justify-content: center;
                margin-top: 25px;
            `;
            
            // Create Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'CANCEL';
            cancelButton.style.cssText = `
                background: linear-gradient(135deg, #333 0%, #555 100%);
                border: 2px solid #888;
                color: #ffffff;
                font-family: 'VT323', 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                padding: 12px 25px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
            `;
            
            // Create Dump Cargo button
            const dumpButton = document.createElement('button');
            dumpButton.textContent = 'DUMP CARGO & REMOVE';
            dumpButton.style.cssText = `
                background: linear-gradient(135deg, #cc3333 0%, #ff4444 100%);
                border: 2px solid #ff4444;
                color: #ffffff;
                font-family: 'VT323', 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                padding: 12px 25px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 180px;
                box-shadow: 0 0 15px rgba(255, 68, 68, 0.3);
            `;
            
            // Add hover effects
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = 'linear-gradient(135deg, #444 0%, #666 100%)';
                cancelButton.style.borderColor = '#aaa';
                cancelButton.style.transform = 'scale(1.05)';
            });
            
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = 'linear-gradient(135deg, #333 0%, #555 100%)';
                cancelButton.style.borderColor = '#888';
                cancelButton.style.transform = 'scale(1)';
            });
            
            dumpButton.addEventListener('mouseenter', () => {
                dumpButton.style.background = 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)';
                dumpButton.style.transform = 'scale(1.05)';
                dumpButton.style.boxShadow = '0 0 25px rgba(255, 68, 68, 0.5)';
            });
            
            dumpButton.addEventListener('mouseleave', () => {
                dumpButton.style.background = 'linear-gradient(135deg, #cc3333 0%, #ff4444 100%)';
                dumpButton.style.transform = 'scale(1)';
                dumpButton.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.3)';
            });
            
            // Add event handlers
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
                resolve(true); // Cancel removal
            });
            
            dumpButton.addEventListener('click', () => {
                // Dump cargo and proceed with removal
                const dumpResult = cargoManager.dumpCargoInHold(slotId); // Use actual slot ID, not hold map key
debug('UI', `🗑️ Dumped cargo from hold ${holdSlot} (slot ${slotId}):`, dumpResult);
                
                document.body.removeChild(modal);
                document.head.removeChild(style);
                
                // Show dump confirmation
                this.showCargoDumpNotification(dumpResult.dumpedCargo);
                
                resolve(false); // Proceed with removal
            });
            
            // Assemble modal
            modalContent.appendChild(header);
            modalContent.appendChild(message);
            modalContent.appendChild(cargoList);
            modalContent.appendChild(warning);
            modalContent.appendChild(buttonContainer);
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(dumpButton);
            modal.appendChild(modalContent);
            
            // Add to page
            document.body.appendChild(modal);
            
            // Focus on cancel button by default
            cancelButton.focus();
        });
    }
    
    /**
     * Show notification after cargo is dumped
     */
    showCargoDumpNotification(dumpedCargo) {
        // Create notification using the existing trading notification system
        let cargoList = dumpedCargo.map(item => `${item.quantity}x ${item.name}`).join(', ');
        if (cargoList.length > 80) {
            cargoList = cargoList.substring(0, 77) + '...';
        }
        
        const message = `⚠️ Cargo Dumped: ${cargoList}`;
        
        // Use existing notification system from CommodityExchange
        this.showTradeNotification(message, 'warning');
    }
    
    /**
     * Show trading notification (borrowed from CommodityExchange)
     */
    showTradeNotification(message, type = 'info') {
        // Create centered modal notification
        const modal = document.createElement('div');
        modal.className = `trade-notification-modal ${type}`;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 15000;
            font-family: 'VT323', 'Courier New', monospace;
        `;
        
        const colors = {
            'info': '#00ff41',
            'success': '#44ff44',
            'error': '#ff4444',
            'warning': '#ffff44'
        };
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 3px solid ${colors[type]};
            border-radius: 12px;
            padding: 30px 40px;
            max-width: 600px;
            width: 80%;
            text-align: center;
            box-shadow: 0 0 30px rgba(${type === 'error' ? '255, 68, 68' : type === 'warning' ? '255, 255, 68' : '0, 255, 65'}, 0.3);
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            color: ${colors[type]};
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
        `;
        
        const typeLabels = {
            'info': '🔵 Information',
            'success': '✅ Success', 
            'error': '❌ Error',
            'warning': '⚠️ Warning'
        };
        header.textContent = typeLabels[type];
        
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            color: #ffffff;
            font-size: 18px;
            line-height: 1.5;
            margin-bottom: 25px;
        `;
        messageEl.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.style.cssText = `
            background: linear-gradient(135deg, ${colors[type]}, ${colors[type]}dd);
            border: 2px solid ${colors[type]};
            color: #000000;
            font-family: 'VT323', 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            padding: 10px 30px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        content.appendChild(header);
        content.appendChild(messageEl);
        content.appendChild(closeButton);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 5000);
    }

    /**
     * Remove a card from a ship slot
     */
    async removeCard(slotId) {
        const card = this.shipSlots.get(slotId);
        if (card) {
debug('UI', `🛡️ CARGO PROTECTION: Checking removal of ${card.cardType} from slot ${slotId}`);
            
            // Check if this is a cargo hold card with cargo
            if (await this.checkCargoHoldRemoval(card, slotId)) {
debug('UI', `🛡️ CARGO PROTECTION: Removal cancelled for ${card.cardType}`);
                return; // Removal cancelled or handled by cargo dump process
            }
            
debug('UI', `🛡️ CARGO PROTECTION: Proceeding with removal of ${card.cardType}`);
            // Remove from ship slots
            this.shipSlots.delete(slotId);
            
            // CRITICAL FIX: Sync with ship's CardSystemIntegration.installedCards Map
            // This ensures the ship's card tracking stays synchronized
            if (window.viewManager && window.viewManager.ship && window.viewManager.ship.cardSystemIntegration) {
                window.viewManager.ship.cardSystemIntegration.installedCards.delete(slotId);
debug('UI', `🔗 Removed card from ship's CardSystemIntegration: ${card.cardType}`);
                
                // Refresh ship systems from the updated card configuration
                try {
                    await window.viewManager.ship.cardSystemIntegration.createSystemsFromCards();
                    
                    // Re-initialize cargo holds from updated cards
                    if (window.viewManager.ship.cargoHoldManager) {
                        window.viewManager.ship.cargoHoldManager.initializeFromCards();
debug('UI', '🚛 Cargo holds refreshed after card removal');
                    }
                    
debug('UI', '🔄 Ship systems refreshed after card removal');
                } catch (error) {
                    console.error('⚠️ Failed to refresh ship systems:', error);
                }
            } else {
                console.warn('⚠️ Could not sync with ship CardSystemIntegration - ship may not be available');
            }
            
            // Save the configuration to ensure changes persist
            this.saveCurrentShipConfiguration();
            
            // Add back to inventory (optional - for now just re-render)
            // This would require more complex inventory management
            
            // Update the slot display
            this.renderShipSlots();
            
debug('UI', `🗑️ Removed ${card.cardType} from slot ${slotId}`);
debug('UI', `Configuration saved with ${this.shipSlots.size} total cards`);
        }
    }

    /**
     * Render the entire UI
     */
    render() {
        this.renderInventoryGrid();
        this.updateCollectionStats();
        this.updateCreditsDisplay();
        // Always render ship slots in both modes
        this.renderShipSlots();
    }

    /**
     * Render the inventory grid
     */
    renderInventoryGrid() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;

        const cards = this.inventory.getDiscoveredCards();
        
        grid.innerHTML = cards.map(stack => this.renderCardStack(stack)).join('');
    }

    /**
     * Render a single card stack
     */
    renderCardStack(stack) {
        const card = stack.sampleCard;
        const rarityColor = card.getRarityColor();
        
        // Calculate upgrade requirements
        const currentLevel = stack.level;
        const nextLevel = currentLevel + 1;
        const maxLevel = 5;
        const canUpgrade = nextLevel <= maxLevel;
        
        // Upgrade cost calculation based on spec
        const upgradeCosts = {
            2: { cards: 3, credits: 1000 },
            3: { cards: 6, credits: 5000 },
            4: { cards: 12, credits: 15000 },
            5: { cards: 24, credits: 50000 }
        };
        
        const upgradeCost = upgradeCosts[nextLevel];
        const hasEnoughCards = canUpgrade && stack.count >= upgradeCost?.cards;
        const hasEnoughCredits = canUpgrade && playerCredits.canAfford(upgradeCost?.credits || 0);
        const canAffordUpgrade = hasEnoughCards && hasEnoughCredits;
        
        // Determine the appropriate CSS class and button content
        let buttonClass = '';
        let buttonIcon = '';
        let buttonText = `Upgrade to Lv.${nextLevel}`;
        
        if (canAffordUpgrade) {
            buttonClass = 'upgrade-available';
            buttonIcon = '⬆️';
        } else if (!hasEnoughCards && !hasEnoughCredits) {
            buttonClass = 'upgrade-unavailable';
            buttonIcon = '⚫'; // Gray circle for unavailable
            buttonText = `Need Cards & Credits`;
        } else if (!hasEnoughCards) {
            buttonClass = 'insufficient-cards';
            buttonIcon = '⚫'; // Gray circle for insufficient
            buttonText = `Need ${upgradeCost.cards - stack.count} More Cards`;
        } else if (!hasEnoughCredits) {
            buttonClass = 'insufficient-credits';
            buttonIcon = '⚫'; // Gray circle for insufficient  
            buttonText = `Need ${(upgradeCost.credits - playerCredits.getCredits()).toLocaleString()} More Credits`;
        }
        
        // Create tooltip text for upgrade requirements
        const tooltipText = canUpgrade ? 
            `Upgrade to Level ${nextLevel}: ${upgradeCost.cards}x cards + ${upgradeCost.credits.toLocaleString()} credits` : 
            'Maximum level reached';
        
        // Upgrade button HTML
        const upgradeButton = canUpgrade ? `
            <button class="upgrade-btn ${buttonClass}" 
                    onclick="cardInventoryUI.upgradeCard('${card.cardType}')"
                    title="${tooltipText}"
                    ${!canAffordUpgrade ? 'disabled' : ''}>
                ${buttonIcon} ${buttonText}
            </button>
        ` : `
            <div class="max-level-indicator" title="${tooltipText}">🏆 MAX LEVEL</div>
        `;
        
        // Check if this card should show NEW badge
        const isNew = this.isCardNew(card.cardType);
        const newBadge = isNew ? '<div class="new-badge">NEW</div>' : '';
        
        // Check if this card has a quantity increase (red badge)
        const hasQuantityIncrease = this.hasQuantityIncrease(card.cardType);
        const countStyle = hasQuantityIncrease ? 'color: #ff4444; font-weight: bold;' : '';
        
        // Debug logging for red badge detection
        if (hasQuantityIncrease) {
            console.log(`🔴 RED BADGE: ${card.cardType} should show red badge (quantity increase detected)`);
        }
        
        return `
            <div class="card-stack ${isNew ? 'has-new-badge' : ''}" 
                 style="border-color: ${rarityColor}" 
                 draggable="true"
                 data-card-type="${card.cardType}"
                 data-card-level="${stack.level}"
                 data-card-rarity="${card.rarity}">
                <div class="card-icon">${card.getIcon()}</div>
                ${newBadge}
                <div class="card-name">${stack.name}</div>
                <div class="card-count" style="${countStyle}">x${stack.count}</div>
                <div class="card-level">Lv.${stack.level}</div>
                <div class="card-rarity" style="color: ${rarityColor}">${card.rarity.toUpperCase()}</div>
                ${upgradeButton}
            </div>
        `;
    }

    /**
     * Update collection statistics
     */
    updateCollectionStats() {
        const statsElement = document.getElementById('collection-stats');
        if (!statsElement) return;

        const stats = this.inventory.getCollectionStats();
        
        statsElement.innerHTML = `
            <h3>COLLECTION PROGRESS</h3>
            <div class="stats-grid">
                <div>Discovered: ${stats.discoveredCardTypes}/${stats.totalCardTypes}</div>
                <div>Completion: ${stats.completionPercentage.toFixed(1)}%</div>
                <div>Total Cards: ${stats.totalCardsCollected}</div>
            </div>
        `;
    }

    /**
     * Update credits display
     */
    updateCreditsDisplay() {
        if (this.isShopMode) {
            // Create or update credits display in shop mode
            let creditsDisplay = document.getElementById('credits-display');
            if (!creditsDisplay) {
                creditsDisplay = document.createElement('div');
                creditsDisplay.id = 'credits-display';
                creditsDisplay.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    border: 2px solid #00ff41;
                    padding: 15px 20px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #00ff41;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
                    z-index: 1001;
                `;
                document.body.appendChild(creditsDisplay);
            }
            creditsDisplay.innerHTML = `💰 Credits: ${playerCredits.getFormattedCredits()}`;
            
            // Register for automatic updates
            playerCredits.registerDisplay(creditsDisplay, (el, credits) => {
                el.innerHTML = `💰 Credits: ${credits.toLocaleString()}`;
            });
        }
        
debug('UI', `💰 Credits: ${playerCredits.getFormattedCredits()}`);
    }

    /**
     * Update ship stats display
     */
    updateShipStats() {
        const statsElement = document.getElementById('ship-stats');
        if (!statsElement) return;

        const config = this.currentShipConfig;
        
        statsElement.innerHTML = `
            <h3>${config.name.toUpperCase()}</h3>
            <div class="ship-info">
                <div>Type: ${this.currentShipType}</div>
                <div>Slots: ${config.systemSlots}</div>
                <div>Description: ${config.description}</div>
            </div>
        `;
    }

    /**
     * Switch to a different ship type
     * @param {string} shipType - Ship type to switch to
     */
    async switchShip(shipType) {
debug('UI', `Switching ship type from ${this.currentShipType} to ${shipType}`);
        
        // Save current configuration before switching
        this.saveCurrentShipConfiguration();
        
        // Update ship type and configuration
        this.currentShipType = shipType;
        this.currentShipConfig = SHIP_CONFIGS[shipType];
        
        // CRITICAL FIX: Add the ship to player's owned ships if not already owned
        // This prevents the "Player doesn't own X, falling back to starter_ship" issue
        if (!playerData.ownsShip(shipType)) {
            playerData.addShip(shipType);
debug('UI', `🛡️ Added ${shipType} to player's owned ships`);
        }
        
        // Clear current ship slots
        this.shipSlots.clear();
        
        // Load new ship configuration
        this.loadShipConfiguration(shipType);
        
        // Update UI - always render ship slots in both modes
        this.renderShipSlots();
        
        // **CRITICAL FIX**: Update the actual ship instance in ViewManager
        // This ensures the ship type persists when launching and docking
        if (this.dockingInterface?.starfieldManager?.viewManager) {
debug('UI', '🔄 CardInventoryUI: Updating ViewManager ship instance to', shipType);
            await this.dockingInterface.starfieldManager.viewManager.switchShip(shipType);
        } else {
            console.warn('⚠️ CardInventoryUI: ViewManager not available - ship instance not updated');
        }
        
debug('UI', `Ship switched to ${shipType}`);
    }

    /**
     * Save current ship configuration
     */
    saveCurrentShipConfiguration() {
        if (!this.currentShipType) return;
        
        const config = new Map();
        this.shipSlots.forEach((card, slotId) => {
            config.set(slotId, {
                cardType: card.cardType,
                level: card.level || 1
            });
        });
        
        playerData.saveShipConfiguration(this.currentShipType, config);
debug('UI', `Saved configuration for ${this.currentShipType}`);
    }

    /**
     * Load ship configuration from stored player data
     * @param {string} shipType - Ship type to load configuration for
     */
    loadShipConfiguration(shipType) {
debug('UTILITY', `Loading stored configuration for ${shipType}`);
        
        const config = playerData.getShipConfiguration(shipType);
        this.shipSlots.clear();
        
        // If no stored configuration exists and this is a starter ship, load default starter cards
        if (config.size === 0 && shipType === 'starter_ship') {
debug('UI', `No stored configuration found for ${shipType}, loading default starter cards`);
            
            const shipConfig = SHIP_CONFIGS[shipType];
            if (shipConfig && shipConfig.starterCards) {
                // Map starter card slots to proper slot indices based on slotConfig
                const slotTypeMapping = this.generateSlotTypeMapping(shipConfig);
                const slotTypeToIndex = {};
                
                // Create reverse mapping: slotType -> slot indices
                Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
                    if (!slotTypeToIndex[slotType]) {
                        slotTypeToIndex[slotType] = [];
                    }
                    slotTypeToIndex[slotType].push(parseInt(slotIndex));
                });
                
                // Load starter cards into appropriate slots
                Object.entries(shipConfig.starterCards).forEach(([starterSlotId, cardData]) => {
                    const cardType = cardData.cardType;
                    const level = cardData.level || 1;
                    
                    // Determine which slot type this card should go in
                    let targetSlotIndex = null;
                    
                    // Map card types to their preferred slot types
                    const cardToSlotMapping = {
                        'impulse_engines': 'engines',
                        'energy_reactor': 'reactor',
                        'laser_cannon': 'weapons',
                        'pulse_cannon': 'weapons',
                        'plasma_cannon': 'weapons',
                        'phaser_array': 'weapons',
                        'standard_missile': 'weapons',
                        'homing_missile': 'weapons',
                        'photon_torpedo': 'weapons',
                        'proximity_mine': 'weapons',
                        'target_computer': 'utility',
                        'basic_radar': 'utility',
                        'advanced_radar': 'utility',
                        'tactical_radar': 'utility',
                        'warp_drive': 'warpDrive',
                        'shields': 'shields',
                        'long_range_scanner': 'scanner',
                        'subspace_radio': 'radio',
                        'galactic_chart': 'galacticChart'
                    };
                    
                    const preferredSlotType = cardToSlotMapping[cardType] || 'utility';
                    
                    // Find the next available slot of the preferred type
                    if (slotTypeToIndex[preferredSlotType]) {
                        for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    // For weapons, only allow weapon slots - NO FALLBACK to utility
                    if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
                        console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                        return; // Skip this weapon instead of placing it in wrong slot type
                    }
                    
                    // For non-weapons, allow fallback to utility slots
                    if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                        for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    if (targetSlotIndex !== null) {
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = level;
                        this.shipSlots.set(targetSlotIndex.toString(), card);
debug('TARGETING', `Loaded default starter card ${cardType} (Lv.${level}) into slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                    } else {
                        console.error(`❌ FAILED: No available slot found for starter card ${cardType} - ship only has ${shipConfig.systemSlots} slots, ${this.shipSlots.size} already used`);
                    }
                });
            }
        } else {
            // Load from stored configuration
            // Handle both named slots (utility_1, engine_1, etc.) and numerical slots (0, 1, 2, etc.)
            
            // Check if this is a starter ship with named slots that need mapping
            if (shipType === 'starter_ship' && config.size > 0) {
                const shipConfig = SHIP_CONFIGS[shipType];
                const slotTypeMapping = this.generateSlotTypeMapping(shipConfig);
                const slotTypeToIndex = {};
                
                // Create reverse mapping: slotType -> slot indices
                Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
                    if (!slotTypeToIndex[slotType]) {
                        slotTypeToIndex[slotType] = [];
                    }
                    slotTypeToIndex[slotType].push(parseInt(slotIndex));
                });
                
                // Map named slots to slot types and find appropriate numerical slot
                const cardToSlotMapping = {
                    'impulse_engines': 'engines',
                    'energy_reactor': 'reactor',
                    'laser_cannon': 'weapons',
                    'pulse_cannon': 'weapons',
                    'plasma_cannon': 'weapons',
                    'phaser_array': 'weapons',
                    'standard_missile': 'weapons',
                    'homing_missile': 'weapons',
                    'photon_torpedo': 'weapons',
                    'proximity_mine': 'weapons',
                    'target_computer': 'utility',
                    'warp_drive': 'warpDrive',
                    'shields': 'shields',
                    'long_range_scanner': 'scanner',
                    'subspace_radio': 'radio',
                    'galactic_chart': 'galacticChart'
                };
                
                // Map named slots to numerical indices
                config.forEach((cardData, slotId) => {
                    const cardType = cardData.cardType;
                    const level = cardData.level || 1;
                    
                    // If slotId is numeric, use it directly
                    if (!isNaN(slotId)) {
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = level;
                        this.shipSlots.set(slotId, card);
debug('UI', `Loaded ${cardType} (Lv.${level}) from numeric slot ${slotId}`);
                        return;
                    }
                    
                    // Map named slots to slot types and find appropriate numerical slot
                    const cardToSlotMapping = {
                        'impulse_engines': 'engines',
                        'energy_reactor': 'reactor',
                        'laser_cannon': 'weapons',
                        'pulse_cannon': 'weapons',
                        'plasma_cannon': 'weapons',
                        'phaser_array': 'weapons',
                        'standard_missile': 'weapons',
                        'homing_missile': 'weapons',
                        'photon_torpedo': 'weapons',
                        'proximity_mine': 'weapons',
                        'target_computer': 'utility',
                        'warp_drive': 'warpDrive',
                        'shields': 'shields',
                        'long_range_scanner': 'scanner',
                        'subspace_radio': 'radio',
                        'galactic_chart': 'galacticChart'
                    };
                    
                    const preferredSlotType = cardToSlotMapping[cardType] || 'utility';
                    
                    // Find the next available slot of the preferred type
                    let targetSlotIndex = null;
                    if (slotTypeToIndex[preferredSlotType]) {
                        for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    // For weapons, only allow weapon slots - NO FALLBACK to utility
                    if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
                        console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                        return; // Skip this weapon instead of placing it in wrong slot type
                    }
                    
                    // For non-weapons, allow fallback to utility slots
                    if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                        for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    if (targetSlotIndex !== null) {
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = level;
                        this.shipSlots.set(targetSlotIndex.toString(), card);
debug('TARGETING', `Loaded ${cardType} (Lv.${level}) from named slot ${slotId} to slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                    } else {
                        console.error(`❌ FAILED: No available slot found for card ${cardType} from named slot ${slotId} - ship only has ${shipConfig.systemSlots} slots, ${this.shipSlots.size} already used`);
                    }
                });
            } else {
                // Load regular configuration with numerical slot indices
                config.forEach((cardData, slotId) => {
                    const card = this.inventory.generateSpecificCard(cardData.cardType, 'common');
                    card.level = cardData.level || 1;
                    this.shipSlots.set(slotId, card);
debug('UI', `Loaded ${cardData.cardType} (Lv.${card.level}) from stored slot ${slotId}`);
                });
            }
        }
        
debug('UI', `Loaded ${this.shipSlots.size} cards for ${shipType}`);
        
        // CRITICAL FIX: Sync loaded cards with ship's CardSystemIntegration.installedCards Map
        // This ensures the ship's card tracking is synchronized with the UI after loading
        if (window.viewManager && window.viewManager.ship && window.viewManager.ship.cardSystemIntegration) {
            window.viewManager.ship.cardSystemIntegration.installedCards.clear();
            
            this.shipSlots.forEach((card, slotId) => {
                window.viewManager.ship.cardSystemIntegration.installedCards.set(slotId, {
                    cardType: card.cardType,
                    level: card.level
                });
            });
            
debug('UI', `🔗 Synced ${this.shipSlots.size} cards with ship's CardSystemIntegration`);
        } else {
            console.warn('⚠️ Could not sync with ship CardSystemIntegration during load - ship may not be available');
        }
    }

    /**
     * Show inventory interface for ship configuration management
     */
    showAsInventory(dockedLocation, dockingInterface) {
        this.isShopMode = false;
        this.dockedLocation = dockedLocation;
        this.dockingInterface = dockingInterface;
        
        // Get current ship from starfieldManager to set the ship selector correctly
        let currentShip = null;
        if (dockingInterface && dockingInterface.starfieldManager) {
            currentShip = dockingInterface.starfieldManager.ship;
            if (currentShip && currentShip.shipType) {
                this.currentShipType = currentShip.shipType;
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
                
                // Validate that the player owns this ship, if not fall back to first owned ship
                this.validateCurrentShipOwnership();
            }
        }
        
        // Create inventory container
        this.createInventoryContainer();
        
        this.createUI();
        this.setupEventListeners();
        
        // Only load test data and render if we haven't loaded a ship configuration
        if (!this.currentShipType || this.shipSlots.size === 0) {
            this.loadTestData();
            this.render();
        } else {
            // Update both ship slots and inventory
            this.renderShipSlots();
            this.renderInventoryGrid();
            this.updateCollectionStats();
            this.updateCreditsDisplay();
        }
        
        // Load the current ship's actual configuration
        if (currentShip) {
            this.loadCurrentShipConfiguration(currentShip);
        } else if (this.currentShipType) {
            // Fallback to stored configuration if no current ship available
            this.loadShipConfiguration(this.currentShipType);
        }
        
        // Set the ship selector dropdown to the current ship type
        const shipSelector = document.getElementById('ship-type-select');
        if (shipSelector && this.currentShipType) {
            shipSelector.value = this.currentShipType;
        }
        
        // Show the inventory
        this.inventoryContainer.style.display = 'block';
        
debug('UI', 'Ship inventory opened at:', dockedLocation);
    }

    /**
     * Create the inventory container for normal mode
     */
    createInventoryContainer() {
        // Remove existing inventory container
        if (this.inventoryContainer) {
            this.hideInventory();
        }
        
        // Create inventory container
        this.inventoryContainer = document.createElement('div');
        
        this.inventoryContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.95) !important;
            color: #00ff41 !important;
            font-family: 'VT323', monospace !important;
            z-index: 1000 !important;
            display: none !important;
            overflow-y: auto !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;
        
        // Set container reference for createUI
        this.container = this.inventoryContainer;
        
        // Add to document
        document.body.appendChild(this.inventoryContainer);
    }

    /**
     * Hide the inventory and return to station menu
     */
    hideInventory() {
        if (this.inventoryContainer && this.inventoryContainer.parentNode) {
            this.inventoryContainer.parentNode.removeChild(this.inventoryContainer);
            this.inventoryContainer = null;
        }
        
        this.isShopMode = false;
        
        // Return to station menu
        if (this.dockingInterface) {
            this.dockingInterface.returnToStationMenu();
        }
        
debug('UI', 'Ship inventory closed');
    }

    /**
     * Load current ship configuration from the actual game ship
     * @param {Object} ship - The current ship object from the game
     */
    loadCurrentShipConfiguration(ship) {
        if (!ship) {
            console.warn('No ship provided to load configuration from');
            return;
        }
        
debug('UTILITY', `Loading current ship configuration from actual ship: ${ship.shipType}`);
        
        // Clear existing ship slots
        this.shipSlots.clear();
        
        // Check if this is a starter ship and use starterCards configuration
        const shipConfig = SHIP_CONFIGS[ship.shipType];
        if (shipConfig && shipConfig.starterCards) {
debug('UI', `Loading starter cards for ${ship.shipType}`);
            
            // Map starter card slots to proper slot indices based on slotConfig
            const slotTypeMapping = this.generateSlotTypeMapping(shipConfig);
            const slotTypeToIndex = {};
            
            // Create reverse mapping: slotType -> slot indices
            Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
                if (!slotTypeToIndex[slotType]) {
                    slotTypeToIndex[slotType] = [];
                }
                slotTypeToIndex[slotType].push(parseInt(slotIndex));
            });
            
            // Load starter cards into appropriate slots
            Object.entries(shipConfig.starterCards).forEach(([starterSlotId, cardData]) => {
                const cardType = cardData.cardType;
                const level = cardData.level || 1;
                
                // Determine which slot type this card should go in
                let targetSlotIndex = null;
                
                // Map card types to their preferred slot types
                const cardToSlotMapping = {
                    'impulse_engines': 'engines',
                    'energy_reactor': 'reactor',
                    'laser_cannon': 'weapons',
                    'pulse_cannon': 'weapons',
                    'plasma_cannon': 'weapons',
                    'phaser_array': 'weapons',
                    'standard_missile': 'weapons',
                    'homing_missile': 'weapons',
                    'photon_torpedo': 'weapons',
                    'proximity_mine': 'weapons',
                    'target_computer': 'utility',
                    'warp_drive': 'warpDrive',
                    'shields': 'shields',
                    'long_range_scanner': 'scanner',
                    'subspace_radio': 'radio',
                    'galactic_chart': 'galacticChart'
                };
                
                const preferredSlotType = cardToSlotMapping[cardType] || 'utility';
                
                // Find the next available slot of the preferred type
                if (slotTypeToIndex[preferredSlotType]) {
                    for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                        if (!this.shipSlots.has(slotIndex.toString())) {
                            targetSlotIndex = slotIndex;
                            break;
                        }
                    }
                }
                
                // For weapons, only allow weapon slots - NO FALLBACK to utility
                if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
                    console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                    return; // Skip this weapon instead of placing it in wrong slot type
                }
                
                // For non-weapons, allow fallback to utility slots
                if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                    for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                        if (!this.shipSlots.has(slotIndex.toString())) {
                            targetSlotIndex = slotIndex;
                            break;
                        }
                    }
                }
                
                if (targetSlotIndex !== null) {
                    const card = this.inventory.generateSpecificCard(cardType, 'common');
                    card.level = level;
                    this.shipSlots.set(targetSlotIndex.toString(), card);
debug('TARGETING', `Loaded default starter card ${cardType} (Lv.${level}) into slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                } else {
                    console.error(`❌ FAILED: No available slot found for starter card ${cardType} - ship only has ${shipConfig.systemSlots} slots, ${this.shipSlots.size} already used`);
                }
            });
        } else {
            // Fallback to legacy system loading for non-starter ships
debug('UTILITY', `Loading systems for non-starter ship: ${ship.shipType}`);
            
            // Mapping from system names to card types
            const systemToCardMapping = {
                'impulse_engines': 'impulse_engines',
                'warp_drive': 'warp_drive',
                'shields': 'shields',
                'laser_cannon': 'weapons',
                'plasma_cannon': 'plasma_cannon',
                'pulse_cannon': 'pulse_cannon',
                'phaser_array': 'weapons',
                'disruptor_cannon': 'disruptor_cannon',
                'particle_beam': 'particle_beam',
                'weapons': 'laser_cannon', // Legacy weapon system maps to laser cannon
                'long_range_scanner': 'long_range_scanner',
                'subspace_radio': 'subspace_radio',
                'galactic_chart': 'galactic_chart',
                'target_computer': 'target_computer',
                'hull_plating': 'hull_plating',
                'energy_reactor': 'energy_reactor',
                'shield_generator': 'shield_generator',
                'cargo_hold': 'cargo_hold',
                'missile_tubes': 'missile_tubes',
                'torpedo_launcher': 'torpedo_launcher'
            };
            
            // Get the ship's current systems
            if (ship.systems) {
                let slotIndex = 0;
                ship.systems.forEach((system, systemName) => {
                    const cardType = systemToCardMapping[systemName];
                    if (cardType && system && system.level) {
                        // Create a card representation of the installed system
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = system.level;
                        this.shipSlots.set(slotIndex.toString(), card);
debug('UI', `Loaded ${cardType} (Lv.${card.level}) from system ${systemName} in slot ${slotIndex}`);
                        slotIndex++;
                    } else if (!cardType) {
debug('UI', `No card mapping found for system: ${systemName}`);
                    } else if (!system.level) {
debug('UI', `System ${systemName} has no level property`);
                    }
                });
            }
        }
        
debug('UI', `Loaded ${this.shipSlots.size} cards from current ship`);
    }

    /**
     * Check if a card type is a weapon
     */
    isWeaponCard(cardType) {
        const weaponCards = [
            // Scan-hit weapons (lasers)
            'laser_cannon', 'pulse_cannon', 'plasma_cannon', 'phaser_array', 'disruptor_cannon', 
            'particle_beam', 'ion_storm_cannon', 'graviton_beam', 
            // Projectile weapons (missiles, torpedoes, mines)
            'standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine',
            // Legacy/other weapons
            'quantum_torpedo', 'singularity_launcher', 'void_ripper'
        ];
        return weaponCards.includes(cardType);
    }

    /**
     * Upgrade a card stack to the next level
     * @param {string} cardType - Type of card to upgrade
     */
    async upgradeCard(cardType) {
debug('UI', `🔧 UPGRADE CLICKED: Attempting to upgrade ${cardType}`);
debug('UI', `💰 Current credits: ${this.credits}`);
        
        // Get the card stack directly from inventory to ensure we're modifying the source data
        const cardStack = this.inventory.cardStacks.get(cardType);
        
        if (!cardStack) {
            console.error(`❌ Card stack not found: ${cardType}`);
            return;
        }
        
        if (!cardStack.discovered) {
            console.error(`❌ Cannot upgrade undiscovered card: ${cardType}`);
            return;
        }
        
        const currentLevel = cardStack.level;
        const nextLevel = currentLevel + 1;
        const maxLevel = 5;
        
debug('UI', `📊 Card ${cardType} - Current Level: ${currentLevel}, Next Level: ${nextLevel}, Count: ${cardStack.count}`);
        
        // Check if upgrade is possible
        if (nextLevel > maxLevel) {
            console.error(`❌ Card ${cardType} is already at maximum level ${maxLevel}`);
            return;
        }
        
        // Define upgrade costs (cards + credits)
        const upgradeCosts = {
            2: { cards: 3, credits: 1000 },
            3: { cards: 6, credits: 5000 },
            4: { cards: 12, credits: 15000 },
            5: { cards: 24, credits: 50000 }
        };
        
        const upgradeCost = upgradeCosts[nextLevel];
debug('UI', `💎 Upgrade to level ${nextLevel} requires: ${upgradeCost.cards} cards + ${upgradeCost.credits} credits`);
        
        // Validate requirements
        if (cardStack.count < upgradeCost.cards) {
            console.error(`❌ Not enough cards for upgrade. Have ${cardStack.count}, need ${upgradeCost.cards}`);
            return;
        }
        
        if (!playerCredits.canAfford(upgradeCost.credits)) {
            console.error(`❌ Not enough credits for upgrade. Have ${playerCredits.getCredits()}, need ${upgradeCost.credits}`);
            return;
        }
        
debug('UI', `✅ Requirements met! Proceeding with upgrade...`);
        
        // Perform the upgrade directly on the cardStack source data
        try {
            // Consume cards from the source card stack
            cardStack.count -= upgradeCost.cards;
debug('AI', `📦 Cards consumed: ${upgradeCost.cards}, remaining: ${cardStack.count}`);
            
            // Consume credits
            const creditsSpent = playerCredits.spendCredits(upgradeCost.credits, `Upgrade ${cardType} to level ${nextLevel}`);
            if (!creditsSpent) {
                console.error('❌ Failed to spend credits for upgrade');
                return;
            }
debug('AI', `💰 Credits consumed: ${upgradeCost.credits}, remaining: ${playerCredits.getCredits()}`);
            
            // Increase level in the source card stack
            cardStack.level = nextLevel;
            
            // Update any slotted cards of the same type to the new level
            let updatedSlotCount = 0;
            this.shipSlots.forEach((slottedCard, slotId) => {
                if (slottedCard.cardType === cardType) {
                    slottedCard.level = nextLevel;
                    updatedSlotCount++;
debug('UI', `🔧 Updated slotted ${cardType} in slot ${slotId} to level ${nextLevel}`);
                }
            });
            
            if (updatedSlotCount > 0) {
debug('UI', `🔧 Updated ${updatedSlotCount} slotted card(s) of type ${cardType} to level ${nextLevel}`);
                // Save the configuration to persist the level changes
                this.saveCurrentShipConfiguration();
            }
            
debug('UI', `✅ Successfully upgraded ${cardType} to level ${nextLevel}`);
debug('UI', `💳 Consumed ${upgradeCost.cards} cards and ${upgradeCost.credits} credits`);
debug('AI', `📦 Remaining cards: ${cardStack.count}, Credits: ${this.credits}`);
            
            // If we consumed all cards in the stack, mark as undiscovered but keep the level progress
            if (cardStack.count <= 0) {
debug('AI', `📦 Card stack ${cardType} depleted (Level ${cardStack.level} progress retained)`);
                // Don't remove from inventory, just set count to 0 - level progress is preserved
            }
            
            // Refresh ship systems and cargo holds to reflect the upgrade
            try {
                if (window.viewManager && window.viewManager.ship) {
                    const ship = window.viewManager.ship;
                    
                    // Refresh ship systems from updated card configuration
                    if (ship.cardSystemIntegration) {
                        await ship.cardSystemIntegration.createSystemsFromCards();
debug('UI', '🔄 Ship systems refreshed after card upgrade');
                        
                        // Re-initialize cargo holds from updated cards
                        if (ship.cargoHoldManager) {
                            ship.cargoHoldManager.initializeFromCards();
debug('UI', '🚛 Cargo holds refreshed after card upgrade');
                        }
                    }
                }
            } catch (error) {
                console.error('⚠️ Failed to refresh ship systems after upgrade:', error);
            }
            
            // Re-render the inventory to reflect changes
debug('UI', `🔄 Re-rendering inventory...`);
            this.render();
            
            // Play upgrade success sound
debug('UI', `🎵 Playing upgrade sound...`);
            this.playUpgradeSound();
            
        } catch (error) {
            console.error(`❌ Error during upgrade:`, error);
        }
    }

    /**
     * Static method to mark a card as newly awarded (can be called from anywhere)
     * @param {string} cardType - The type of card that was awarded
     */
    static markCardAsNewlyAwarded(cardType) {
        // Update the global instance if it exists
        if (window.cardInventoryUI) {
            window.cardInventoryUI.markCardAsNew(cardType);
        } else {
            // If no instance exists, store in localStorage directly
            const stored = localStorage.getItem('planetz_new_card_timestamps');
            const timestamps = stored ? JSON.parse(stored) : {};
            timestamps[cardType] = Date.now();
            localStorage.setItem('planetz_new_card_timestamps', JSON.stringify(timestamps));
        }
        debug('UI', `🆕 Card marked as NEW: ${cardType}`);
    }

    /**
     * Static method to mark a card as having a quantity increase (can be called from anywhere)
     * @param {string} cardType - The type of card that had a quantity increase
     */
    static markCardQuantityIncrease(cardType) {
        console.log(`🔴 STATIC: markCardQuantityIncrease called for ${cardType}`);
        
        // ALWAYS store directly to localStorage to ensure persistence
        // This bypasses any instance issues and guarantees the data is saved
        const stored = localStorage.getItem('planetz_quantity_increase_timestamps');
        console.log(`🔴 STATIC: Raw localStorage value:`, stored);
        const timestamps = stored ? JSON.parse(stored) : {};
        console.log(`🔴 STATIC: Parsed timestamps before update:`, timestamps);
        const timestamp = Date.now();
        timestamps[cardType] = timestamp;
        console.log(`🔴 STATIC: Timestamps after adding ${cardType}:`, timestamps);
        const jsonString = JSON.stringify(timestamps);
        console.log(`🔴 STATIC: JSON string to store:`, jsonString);
        localStorage.setItem('planetz_quantity_increase_timestamps', jsonString);
        
        // Verify it was stored
        const verification = localStorage.getItem('planetz_quantity_increase_timestamps');
        console.log(`🔴 STATIC: Verification - stored value:`, verification);
        console.log(`🔴 STATIC: Stored directly to localStorage:`, timestamps);
        
        // Also update the instance if it exists (for immediate UI updates)
        if (window.cardInventoryUI && window.cardInventoryUI.quantityIncreaseTimestamps) {
            window.cardInventoryUI.quantityIncreaseTimestamps[cardType] = Date.now();
            console.log(`🔴 STATIC: Also updated instance:`, window.cardInventoryUI.quantityIncreaseTimestamps);
        }
        
        debug('UI', `📈 Card marked as quantity increase: ${cardType}`);
    }
}

