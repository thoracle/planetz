import { debug } from '../../debug.js';

/**
 * WeaponEffectsManager - Core system for managing all weapon visual and audio effects
 * Provides arcade-style retro effects matching the Elite vector aesthetic
 * Supports 60fps performance with effect culling and object pooling
 */

export class WeaponEffectsManager {
    constructor(scene, camera, audioContext = null) {
        this.scene = scene;
        this.camera = camera;
        this.audioContext = audioContext;
        
        // Get THREE reference (use global pattern like other files)
        this.THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        // Checking THREE.js availability
        
        if (!this.THREE) {
            console.error('THREE.js not available for WeaponEffectsManager');
            
            // Try to get THREE from scene if available
            if (scene && scene.constructor && scene.constructor.name === 'Scene') {
    
                // Scene exists, so THREE must be available somehow
                this.THREE = window.THREE || THREE;
    
            }
            
            if (!this.THREE) {
                // Instead of throwing, create a fallback mode
                this.fallbackMode = true;
debug('COMBAT', '🎆 WeaponEffectsManager: Fallback mode active');
                this.initializeFallbackMode();
                return;
            }
        }
        
        this.fallbackMode = false;
debug('COMBAT', '🎆 WeaponEffectsManager: Initialized successfully');
        this.initializeFullMode();
    }
    
    /**
     * Initialize in fallback mode when THREE.js is not available
     */
    initializeFallbackMode() {
        // Create minimal stub implementations for all public methods
        this.muzzleFlashes = [];
        this.laserBeams = [];
        this.projectiles = [];
        this.explosions = [];
        this.activeEffects = new Set();
        this.audioBuffers = new Map();
        this.audioSources = [];
        this.audioInitialized = false;
        this.effectConfig = {};
        
        console.warn('WeaponEffectsManager running in fallback mode - visual effects disabled');
    }
    
    /**
     * Initialize in full mode when THREE.js is available
     */
    initializeFullMode() {
debug('COMBAT', '🎆 WeaponEffectsManager: Initializing full mode...');
        
        // Effect collections
        this.muzzleFlashes = [];
        this.laserBeams = [];
        this.projectiles = [];
        this.explosions = [];
        this.activeEffects = new Set();
        
        // SIMPLIFIED: Basic particle trail system - no complex tracking
        this.staticTrails = []; // Simple array of trail objects
        
        // Audio system
        this.audioBuffers = new Map();
        this.audioSources = [];
        this.audioInitialized = false;
        this.useFallbackAudio = false;
        this.html5AudioWarningShown = false;
        
        // User interaction tracking for audio policy compliance
        this.userHasInteracted = false;
        this.setupUserInteractionDetection();
        
        // Performance settings
        this.maxEffectsPerType = 20;
        this.effectCullingDistance = 5000; // Don't render effects beyond this distance
        this.objectPools = {
            muzzleFlash: [],
            laserBeam: [],
            explosion: []
        };
        
        // SIMPLIFIED: Basic effect configuration
        this.effectConfig = {
            muzzleFlash: {
                duration: 0.08,
                scale: 0.4,
                intensity: 0.3
            },
            laserBeam: {
                duration: 0.8,
                thickness: 0.02,
                intensity: 1.0,
                fadeTime: 0.6
            },
            projectileTrail: {
                particleCount: 5, // Much fewer particles for simplicity
                trailDuration: 1500, // Shorter duration - 1.5 seconds
                fadeTime: 500 // Quick fade - 0.5 seconds
            },
            explosion: {
                scale: 1.0,
                duration: 1.5
            }
        };
        
        // Initialize audio system
debug('COMBAT', '🎆 WeaponEffectsManager: Starting audio initialization...');
        this.initializeAudio();
        
debug('COMBAT', 'WeaponEffectsManager initialized in full mode');
    }
    
    /**
     * Set up user interaction detection for browser audio policies
     */
    setupUserInteractionDetection() {
        // Check if StarfieldAudioManager is handling user interaction detection
        const starfieldAudioManager = window.starfieldAudioManager;
        if (starfieldAudioManager) {
            // Use the global user interaction detection
debug('COMBAT', 'WeaponEffectsManager: Using global StarfieldAudioManager for user interaction detection');
            
            // Set up a periodic check to sync with the global state
            const checkInteractionState = () => {
                if (!this.userHasInteracted && starfieldAudioManager.hasUserInteracted()) {
                    this.userHasInteracted = true;
debug('COMBAT', 'WeaponEffectsManager: User interaction detected via StarfieldAudioManager');
                    
                    // Resume AudioContext if suspended
                    this.ensureAudioContextResumed();
                }
            };
            
            // Check immediately and then periodically
            checkInteractionState();
            this.interactionCheckInterval = setInterval(checkInteractionState, 100);
        } else {
            // Fallback to local user interaction detection if StarfieldAudioManager not available
debug('COMBAT', 'WeaponEffectsManager: StarfieldAudioManager not available, using local user interaction detection');
            
            const trackInteraction = () => {
                if (!this.userHasInteracted) {
                    this.userHasInteracted = true;
debug('COMBAT', 'WeaponEffectsManager: User interaction detected - weapon audio should work now');
                    
                    // Resume AudioContext if suspended
                    this.ensureAudioContextResumed();
                }
            };
            
            // Track various user interactions
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, trackInteraction, { once: false });
            });
        }
    }
    
    /**
     * Initialize audio system
     */
    async initializeAudio() {
debug('COMBAT', '🎵 WeaponEffectsManager: Starting audio initialization...');
        
        try {
            if (!this.audioContext) {
                console.warn('WeaponEffectsManager: No audio context available for weapon sounds');
                this.useFallbackAudio = true;
                this.audioInitialized = true; // Mark as initialized to allow HTML5 fallback
                return;
            }

            // Try to resume audio context
            await this.ensureAudioContextResumed();

            // Load weapon audio from static directory
            const audioBasePath = 'static/audio/';
            const soundFiles = [
                { type: 'lasers', file: `${audioBasePath}lasers.wav` },
                { type: 'photons', file: `${audioBasePath}photons.wav` },
                { type: 'missiles', file: `${audioBasePath}missiles.wav` },
                { type: 'mines', file: `${audioBasePath}mines.mp3` },
                { type: 'explosion', file: `${audioBasePath}explosion.wav` },
                { type: 'torpedo-explosion', file: `${audioBasePath}explosion-01.mp3` },
                { type: 'death', file: `${audioBasePath}death.wav` },
                { type: 'success', file: `${audioBasePath}success.wav` }
            ];

            const loadPromises = soundFiles.map(sound => this.loadSound(sound.type, sound.file));
            await Promise.all(loadPromises);
            
            // Only log summary
            if (this.audioBuffers.size > 0) {
debug('COMBAT', `Weapon audio ready (${this.audioBuffers.size} effects)`);
            }
            
            this.audioInitialized = true;
            
        } catch (error) {
            console.error('WeaponEffectsManager: Failed to initialize audio:', error);
debug('AI', '🎵 Falling back to HTML5 audio due to initialization failure...');
            this.useFallbackAudio = true;
            this.audioInitialized = true; // Mark as initialized to allow HTML5 fallback
        }
    }
    
    /**
     * Ensure audio context is resumed (handles user interaction requirement)
     */
    async ensureAudioContextResumed() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
debug('COMBAT', 'WeaponEffectsManager: Audio context resumed');
            } catch (error) {
                console.warn('WeaponEffectsManager: Failed to resume audio context:', error);
            }
        }
    }
    


    /**
     * Load a single sound file
     * @param {string} type Sound type identifier
     * @param {string} file File path
     */
    async loadSound(type, file) {
        try {
            const response = await fetch(file);
            const arrayBuffer = await response.arrayBuffer();
            
            if (this.audioContext) {
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers.set(type, audioBuffer);
            }
        } catch (error) {
            console.warn(`Failed to load weapon audio: ${file}`, error);
        }
    }
    
    /**
     * Play weapon sound effect with 3D positioning
     * @param {string} soundType Type of sound ('lasers', 'photons', 'missiles', etc.)
     * @param {Vector3} position 3D position for spatial audio
     * @param {number} volume Volume multiplier (0.0 - 1.0)
     * @param {number} duration Optional duration to limit playback (for laser sounds)
     * @param {number} durationPercentage Optional percentage of the full audio to play (0.0 - 1.0)
     */
    playSound(soundType, position = null, volume = 1.0, duration = null, durationPercentage = null) {
        // Removed audio call log to prevent console spam
        // console.log(`🎵 WeaponEffectsManager.playSound called: ${soundType}, volume=${volume}`);
        // Removed audio state logs to prevent console spam
        // console.log(`🎵 System state: audioInitialized=${this.audioInitialized}, audioContext=${!!this.audioContext}, buffers=${this.audioBuffers.size}`);
        // console.log(`🎵 Has buffer for ${soundType}: ${this.audioBuffers.has(soundType)}`);
        // console.log(`🎵 User interaction detected: ${this.userHasInteracted}`);
        
        // Check user interaction for browser audio policies
        if (!this.userHasInteracted) {
            debug('UTILITY', 'WeaponEffectsManager: No user interaction detected - sound may not play due to browser policy');
        }
        
        // Use HTML5 audio fallback if Web Audio API isn't available or failed
        if (this.useFallbackAudio || !this.audioInitialized || !this.audioContext || !this.audioBuffers.has(soundType)) {
            this.playHTML5Sound(soundType, volume);
            return;
        }
        
        try {
            // Removed audio playback attempt log to prevent console spam  
            const audioBuffer = this.audioBuffers.get(soundType);
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = audioBuffer;
            gainNode.gain.value = Math.max(0, Math.min(1, volume));
            
            // Add 3D positioning if available
            if (position && this.audioContext.listener) {
                const panner = this.audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 100;
                panner.maxDistance = 2000;
                panner.rolloffFactor = 0.3;
                
                panner.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
                panner.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
                panner.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
                
                source.connect(panner);
                panner.connect(gainNode);
            } else {
                source.connect(gainNode);
            }
            
            gainNode.connect(this.audioContext.destination);
            
            // Calculate actual duration to play
            let actualDuration = duration;
            
            // If durationPercentage is specified, calculate duration based on audio buffer length
            if (durationPercentage !== null && audioBuffer) {
                actualDuration = audioBuffer.duration * Math.max(0, Math.min(1, durationPercentage));
                // Removed duration calculation log to prevent console spam
            }
            
            // For laser sounds, play only the first part (0.5 seconds - increased for full audibility)
            if (soundType === 'lasers') {
                const laserDuration = actualDuration || 0.5; // Increased from 0.2s for full audibility
                // Removed laser audio logging to prevent console spam
                source.start(0, 0, laserDuration);
                // console.log(`🎵 Playing laser sound for ${laserDuration}s`);
            } else if (actualDuration !== null) {
                // For other sounds with duration specified, play from start with duration limit
                source.start(0, 0, actualDuration);
                // Removed sound duration log to prevent console spam
            } else {
                source.start();
                // Removed full sound log to prevent console spam
            }
            
            // Clean up after sound finishes
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            
            this.audioSources.push(source);
            // Removed audio playback log to prevent console spam
            
        } catch (error) {
            console.warn(`Failed to play sound ${soundType}, falling back to HTML5:`, error);
            this.useFallbackAudio = true;
            this.playHTML5Sound(soundType, volume);
        }
    }
    
    /**
     * HTML5 Audio fallback for better compatibility
     * @param {string} soundType Type of sound
     * @param {number} volume Volume (0.0 - 1.0)
     */
    playHTML5Sound(soundType, volume = 0.5) {
        try {
            const audioBasePath = 'static/audio/';
            const audioMap = {
                'lasers': `${audioBasePath}lasers.wav`,
                'photons': `${audioBasePath}photons.wav`,
                'missiles': `${audioBasePath}missiles.wav`,
                'explosion': `${audioBasePath}explosion.wav`,
                'torpedo-explosion': `${audioBasePath}explosion-01.mp3`,
                'success': `${audioBasePath}success.wav`,
                'mines': `${audioBasePath}mines.mp3`,
                'death': `${audioBasePath}death.wav`
            };
            
            if (audioMap[soundType]) {
                const audio = new Audio(audioMap[soundType]);
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().catch(error => {
                    // Only log error if this is the first failure
                    if (!this.html5AudioWarningShown) {
                        console.warn('HTML5 audio play failed (autoplay policy):', error.message);
                        this.html5AudioWarningShown = true;
                    }
                });
            } else {
                console.warn(`HTML5: No audio mapping found for sound type: ${soundType}`);
            }
        } catch (error) {
            console.warn(`HTML5 audio fallback failed for ${soundType}:`, error);
        }
    }
    
    /**
     * Create muzzle flash effect at weapon position
     * @param {Vector3} position World position of weapon
     * @param {Vector3} direction Firing direction
     * @param {string} weaponType Type of weapon for effect styling
     * @param {number} soundDuration Optional duration for sound playback (for laser weapons)
     */
    createMuzzleFlash(position, direction, weaponType = 'laser', soundDuration = null) {
        if (this.fallbackMode) {
            console.warn('WeaponEffectsManager: createMuzzleFlash called in fallback mode');
            return;
        }
        
        // Ensure audio context is resumed on first user interaction
        this.ensureAudioContextResumed();
        
        // ALWAYS play audio even when visual muzzle flash is disabled
        const audioType = this.getAudioType(weaponType);
        
        // Removed weapon firing audio log to prevent console spam
        // console.log(`🔫 WeaponEffectsManager: Firing ${weaponType} -> audio type: ${audioType}`);
        // Removed audio system status log to prevent console spam  
        // console.log(`🔫 Audio system status: initialized=${this.audioInitialized}, buffers=${this.audioBuffers.size}, fallback=${this.useFallbackAudio}`);
        
        this.playSound(audioType, position, 1.0, soundDuration);
        
        // DISABLED: Muzzle flash spheres temporarily disabled (but audio still plays above)
        return;
        
        // Get effect from object pool or create new
        let flash = this.getPooledEffect('muzzleFlash');
        if (!flash) {
            flash = this.createMuzzleFlashGeometry();
        }
        
        // Configure flash based on weapon type
        const config = this.effectConfig.muzzleFlash;
        const colors = this.getWeaponColors(weaponType);
        
        flash.position.copy(position);
        flash.lookAt(position.clone().add(direction));
        flash.scale.set(config.scale, config.scale, config.scale);
        flash.material.color.setHex(colors.muzzle);
        flash.material.opacity = config.intensity;
        
        // Add to scene and track
        this.scene.add(flash);
        this.muzzleFlashes.push({
            mesh: flash,
            startTime: Date.now(),
            duration: config.duration * 1000,
            weaponType: weaponType
        });
        
        this.activeEffects.add(flash);
    }
    
    /**
     * Create laser beam effect for scan-hit weapons
     * @param {Vector3} startPos Starting position (weapon)
     * @param {Vector3} endPos End position (target or max range)
     * @param {string} weaponType Type of weapon
     */
    createLaserBeam(startPos, endPos, weaponType = 'laser') {
        if (this.fallbackMode) {
            console.warn('WeaponEffectsManager: createLaserBeam called in fallback mode');
            return;
        }
        
        // Get effect from object pool or create new
        let beam = this.getPooledEffect('laserBeam');
        if (!beam) {
            beam = this.createLaserBeamGeometry();
        }
        
        // Configure beam
        const config = this.effectConfig.laserBeam;
        const colors = this.getWeaponColors(weaponType);
        const distance = startPos.distanceTo(endPos);
        
        // Position and orient beam
        const midpoint = startPos.clone().add(endPos).multiplyScalar(0.5);
        beam.position.copy(midpoint);
        beam.lookAt(endPos);
        beam.scale.set(config.thickness, config.thickness, distance);
        
        // Set material properties
        beam.material.color.setHex(colors.beam);
        beam.material.opacity = config.intensity;
        
        // Add to scene and track
        this.scene.add(beam);
        this.laserBeams.push({
            mesh: beam,
            startTime: Date.now(),
            duration: config.duration * 1000,
            fadeTime: config.fadeTime * 1000,
            weaponType: weaponType,
            initialOpacity: config.intensity
        });
        
        this.activeEffects.add(beam);
        
debug('COMBAT', `Created laser beam for ${weaponType}, distance: ${distance.toFixed(1)}`);
    }
    
    /**
     * Create explosion effect at specified position
     * @param {Vector3} position Explosion center
     * @param {number} radius Blast radius in meters
     * @param {string} explosionType 'damage' or 'death'
     * @param {Vector3} targetCenter Optional target center for proximity check
     */
    createExplosion(position, radius = 50, explosionType = 'damage', targetCenter = null) {
        if (this.fallbackMode) {
            console.warn('WeaponEffectsManager: createExplosion called in fallback mode');
            return;
        }
        
        // Proximity check: only create explosion if hit is close to target center
        // Use a generous threshold based on hit detection radius, not explosion visual size
        if (targetCenter) {
            const distanceFromCenter = position.distanceTo(targetCenter);
            // Use 2.5km threshold to match the enlarged hit detection system
            const proximityThresholdKm = 2.5; // Fixed large threshold for hit detection compatibility
            
            if (distanceFromCenter > proximityThresholdKm) {
debug('UTILITY', `💥 Explosion suppressed: Hit too far from center (${distanceFromCenter.toFixed(1)}km > ${proximityThresholdKm.toFixed(1)}km)`);
                return; // Skip explosion if hit is too far from target center
            }
        }
        
        // Get effect from object pool or create new
        let explosion = this.getPooledEffect('explosion');
        if (!explosion) {
            explosion = this.createExplosionGeometry();
        }
        
        // Configure explosion (reduced scale for smaller explosions)
        const config = this.effectConfig.explosion;
        const colors = explosionType === 'death' ? 0x00FFFF : 0xFF4500; // Blue for death, orange for damage
        
        explosion.position.copy(position);
        explosion.scale.set(0.05, 0.05, 0.05); // Start even smaller (reduced from 0.1)
        explosion.material.color.setHex(colors);
        explosion.material.opacity = 0.8;
        
        // Add to scene and track (reduced target scale for smaller explosions)
        this.scene.add(explosion);
        this.explosions.push({
            mesh: explosion,
            startTime: Date.now(),
            duration: config.duration * 1000,
            targetScale: radius * config.scale * 0.00625, // 25% larger than previous (was 0.005, now 0.00625)
            explosionType: explosionType
        });
        
        this.activeEffects.add(explosion);
        
        // Play corresponding sound based on explosion type (skip for silent explosions)
        if (explosionType !== 'silent') {
            let soundType = 'explosion'; // Default
            if (explosionType === 'death') {
                soundType = 'death';
            } else if (explosionType === 'torpedo') {
                soundType = 'torpedo-explosion';
            }
            this.playSound(soundType, position);
        }
        
debug('UTILITY', `Created ${explosionType} explosion at`, position, `radius: ${(radius * 0.00625).toFixed(3)} (25% larger)`);
    }
    
    /**
     * IMPROVED: Create simple projectile trail for flight (restored for simple trails)
     * @param {string} projectileId Unique identifier for the projectile
     * @param {string} projectileType Type of projectile ('homing_missile', 'photon_torpedo', 'proximity_mine')
     * @param {Vector3} startPosition Starting position of the trail
     * @param {Object} projectileObject Reference to the Three.js projectile object for position tracking
     * @returns {Object} Particle trail data for updating
     */
    createProjectileTrail(projectileId, projectileType, startPosition, projectileObject) {
        // MESH-BASED TRAIL: Use small spheres instead of particles
        const timestamp = Date.now();
        // Silent trail creation
        
        const colors = {
            homing_missile: 0xff4444, // Red
            photon_torpedo: 0x44ffff, // Cyan  
            proximity_mine: 0xffff44  // Yellow
        };
        
        const color = colors[projectileType] || colors.homing_missile;
        const trailLength = 5; // Number of spheres in trail
        
        // Create a group to hold all trail spheres
        const trailGroup = new this.THREE.Group();
        const spheres = [];
        
        // Create small spheres for the trail
        for (let i = 0; i < trailLength; i++) {
            const sphereGeometry = new this.THREE.SphereGeometry(0.5, 8, 6); // Small sphere
            const sphereMaterial = new this.THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 1.0 - (i * 0.2) // Fade along trail
            });
            
            const sphere = new this.THREE.Mesh(sphereGeometry, sphereMaterial);
            
            // Position spheres at start position initially
            sphere.position.copy(startPosition);
            
            trailGroup.add(sphere);
            spheres.push(sphere);
        }
        
        this.scene.add(trailGroup);
        
        // Silent mesh trail creation
        
        const trailData = {
            id: projectileId,
            type: projectileType,
            system: trailGroup, // Use group instead of particles
            spheres: spheres,    // Store sphere references
            projectileObject: projectileObject,
            positions: [], // Will store position history
            particleHistory: [],
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };
        
        this.staticTrails.push(trailData);
        // Trail created silently
        return trailData;
    }

    /**
     * Remove projectile trail for cleanup
     * @param {string} projectileId Projectile identifier
     */
    removeProjectileTrail(projectileId) {
        const trailIndex = this.staticTrails.findIndex(trail => trail.id === projectileId);
        if (trailIndex !== -1) {
            const trail = this.staticTrails[trailIndex];
            
            // Stop following the projectile
            if (trail.projectileObject) {
                trail.projectileObject = null;
            }
            
            // Start fade-out
            trail.startTime = Date.now();
            trail.fadeDuration = 1000; // 1 second fade for better visibility
            
            // Silent trail stopping
        }
    }

    /**
     * IMPROVED: Update trails (both flight trails and static trails)
     * @param {number} deltaTime Time elapsed in seconds
     */
    updateStaticTrails(deltaTime) {
        const currentTime = Date.now();
        const trailsToRemove = [];
        
        for (let i = 0; i < this.staticTrails.length; i++) {
            const trail = this.staticTrails[i];
            
            // Active trail following projectile
            if (trail.projectileObject && trail.projectileObject.position && trail.particleHistory !== undefined) {
                // Only update every 50ms to reduce spam
                if (currentTime - trail.lastUpdateTime > 50) {
                    this.updateFlightTrail(trail, currentTime);
                }
            } else {
                // Trail has stopped following projectile - start fading out the mesh spheres
                const age = currentTime - trail.startTime;
                const fadeTime = trail.fadeDuration || 1000; // 1 second fade for mesh trails
                
                if (age > fadeTime) {
                    trailsToRemove.push(i);
                    this.scene.remove(trail.system);
                    
                    // Clean up mesh spheres properly
                    if (trail.spheres) {
                        trail.spheres.forEach(sphere => {
                            sphere.geometry.dispose();
                            sphere.material.dispose();
                        });
                    }
                } else {
                    // Fade out all spheres in the trail
                    const fadeProgress = age / fadeTime;
                    if (trail.spheres) {
                        trail.spheres.forEach(sphere => {
                            sphere.material.opacity = 1.0 * (1 - fadeProgress);
                        });
                    }
                }
            }
        }
        
        // Remove finished trails
        for (let i = trailsToRemove.length - 1; i >= 0; i--) {
            this.staticTrails.splice(trailsToRemove[i], 1);
        }
    }
    
    /**
     * Update a flight trail that follows a projectile
     * @param {Object} trail Trail data
     * @param {number} currentTime Current timestamp
     */
    updateFlightTrail(trail, currentTime) {
        if (!trail.projectileObject || !trail.projectileObject.position) {
            return;
        }
        
        trail.lastUpdateTime = currentTime;
        
        // Add current position to history
        trail.particleHistory.unshift({
            position: trail.projectileObject.position.clone(),
            time: currentTime
        });
        
        // Keep only recent history (1 second)
        const maxHistoryTime = 1000;
        trail.particleHistory = trail.particleHistory.filter(point => 
            currentTime - point.time < maxHistoryTime
        );
        
        // Update sphere positions along the trail
        if (trail.spheres && trail.particleHistory.length > 0) {
            const sphereCount = trail.spheres.length;
            
            for (let i = 0; i < sphereCount; i++) {
                const t = i / (sphereCount - 1); // 0 to 1
                const historyIndex = Math.floor(t * (trail.particleHistory.length - 1));
                const historyPoint = trail.particleHistory[historyIndex];
                
                if (historyPoint && trail.spheres[i]) {
                    trail.spheres[i].position.copy(historyPoint.position);
                }
            }
            
            // Optional: Log every 30 updates to reduce spam
            if (trail.particleHistory.length % 30 === 0) {
debug('AI', `🔍 MESH TRAIL: Updated ${sphereCount} spheres for ${trail.id}`);
            }
        }
    }
    
    /**
     * Update all active particle trails automatically
     * @param {number} deltaTime Time elapsed in seconds
     */
    updateParticleTrails(deltaTime) {
        if (this.fallbackMode) return;
        
        const currentTime = Date.now();
        
        // Update each active particle trail by getting position from its projectile object
        // FIXED: Iterate through this.particleTrails Map instead of this.particleSystems Array
        for (const [projectileId, trailData] of this.particleTrails) {
            // Only update trail position if projectile object still exists and hasn't been cleaned up
            if (trailData.projectileObject && trailData.projectileObject.position) {
                // Update trail with current projectile position
                this.updateProjectileTrail(trailData.id, trailData.projectileObject.position);
            } else if (trailData.projectileObject === null) {
                // Projectile has been cleaned up - stop updating position but keep trail visible
                // The trail will fade out naturally based on its age and persistence settings
                // No further position updates needed
            }
        }
        
        // Clean up trails marked for delayed destruction
        const trailsToDestroy = [];
        for (const [projectileId, trailData] of this.particleTrails) {
            if (trailData.pendingDestruction && currentTime >= trailData.destructionTime) {
                trailsToDestroy.push(projectileId);
            }
        }
        
        // Actually destroy the trails that are ready for cleanup
        for (const projectileId of trailsToDestroy) {
            const trailData = this.particleTrails.get(projectileId);
            if (trailData) {
                // Clean up trail data
                this.particleTrails.delete(projectileId);
                
                // Remove from particle systems array
                this.particleSystems = this.particleSystems.filter(system => system.id !== projectileId);
                
                // Remove visual elements from scene
                if (trailData.particleSystem && this.scene) {
                    this.scene.remove(trailData.particleSystem);
                }
                if (trailData.engineGlow && this.scene) {
                    this.scene.remove(trailData.engineGlow);
                }
                
                // Silent cleanup
            }
        }
    }
    
    /**
     * Play success sound when an enemy is destroyed
     * @param {Vector3} position 3D position for spatial audio (optional)
     * @param {number} volume Volume multiplier (0.0 - 1.0)
     * @param {number} durationPercentage Optional percentage of audio to play (0.0 - 1.0, defaults to full audio)
     */
    playSuccessSound(position = null, volume = 0.8, durationPercentage = null) {
        // Play the success sound effect with optional duration percentage
        this.playSound('success', position, volume, null, durationPercentage);
        
        if (durationPercentage !== null) {
debug('UTILITY', `🎉 Playing ${(durationPercentage * 100).toFixed(0)}% of success sound for system destruction`);
        } else {
debug('UTILITY', '🎉 Playing full success sound for enemy destruction');
        }
    }
    
    /**
     * Update all active effects (called from game loop)
     * @param {number} deltaTime Time elapsed in seconds
     */
    update(deltaTime) {
        if (this.fallbackMode) {
            return; // Silent return in fallback mode since this is called every frame
        }
        
        const now = Date.now();
        
        // Update muzzle flashes
        this.updateMuzzleFlashes(now);
        
        // Update laser beams
        this.updateLaserBeams(now);
        
        // Update explosions
        this.updateExplosions(now, deltaTime);
        
        // SIMPLIFIED: Update static trails instead of complex particle tracking
        this.updateStaticTrails(deltaTime);
        
        // Clean up finished effects
        this.cleanupFinishedEffects();
    }
    
    /**
     * Update muzzle flash effects
     * @param {number} now Current timestamp
     */
    updateMuzzleFlashes(now) {
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const flash = this.muzzleFlashes[i];
            const elapsed = now - flash.startTime;
            
            if (elapsed >= flash.duration) {
                // Effect finished - return to pool
                this.scene.remove(flash.mesh);
                this.activeEffects.delete(flash.mesh);
                this.returnToPool('muzzleFlash', flash.mesh);
                this.muzzleFlashes.splice(i, 1);
            } else {
                // Update flash (simple fade out)
                const progress = elapsed / flash.duration;
                flash.mesh.material.opacity = this.effectConfig.muzzleFlash.intensity * (1 - progress);
            }
        }
    }
    
    /**
     * Update laser beam effects
     * @param {number} now Current timestamp
     */
    updateLaserBeams(now) {
        for (let i = this.laserBeams.length - 1; i >= 0; i--) {
            const beam = this.laserBeams[i];
            const elapsed = now - beam.startTime;
            
            if (elapsed >= beam.duration) {
                // Effect finished - return to pool
                this.scene.remove(beam.mesh);
                this.activeEffects.delete(beam.mesh);
                this.returnToPool('laserBeam', beam.mesh);
                this.laserBeams.splice(i, 1);
            } else {
                // Update beam fade
                const fadeStart = beam.duration - beam.fadeTime;
                if (elapsed > fadeStart) {
                    const fadeProgress = (elapsed - fadeStart) / beam.fadeTime;
                    beam.mesh.material.opacity = beam.initialOpacity * (1 - fadeProgress);
                }
            }
        }
    }
    
    /**
     * Update explosion effects
     * @param {number} now Current timestamp
     * @param {number} deltaTime Time elapsed in seconds
     */
    updateExplosions(now, deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            const elapsed = now - explosion.startTime;
            
            if (elapsed >= explosion.duration) {
                // Effect finished - return to pool
                this.scene.remove(explosion.mesh);
                this.activeEffects.delete(explosion.mesh);
                this.returnToPool('explosion', explosion.mesh);
                this.explosions.splice(i, 1);
            } else {
                // Update explosion expansion and fade
                const progress = elapsed / explosion.duration;
                const scale = explosion.targetScale * this.easeOutQuart(progress);
                explosion.mesh.scale.set(scale, scale, scale);
                explosion.mesh.material.opacity = 0.8 * (1 - progress);
            }
        }
    }
    
    // Helper methods for object pooling, geometry creation, etc. continue below...
    
    /**
     * Get weapon-specific colors for effects
     * @param {string} weaponType Type of weapon
     * @returns {Object} Color configuration
     */
    getWeaponColors(weaponType) {
        const colorMap = {
            'laser_cannon': { muzzle: 0x00FFFF, beam: 0x00FFFF },      // Cyan
            'pulse_cannon': { muzzle: 0x00FFFF, beam: 0x00FFFF },      // Cyan
            'plasma_cannon': { muzzle: 0x00FF00, beam: 0x00FF00 },     // Green
            'phaser_array': { muzzle: 0xFF0080, beam: 0xFF0080 },      // Pink
            'standard_missile': { muzzle: 0xFFFF00, beam: 0xFFFF00 },  // Yellow
            'homing_missile': { muzzle: 0xFF8000, beam: 0xFF8000 },    // Orange
            'photon_torpedo': { muzzle: 0xFF0000, beam: 0xFF0000 },     // Red
            'proximity_mine': { muzzle: 0x8000FF, beam: 0x8000FF }     // Purple
        };
        
        return colorMap[weaponType] || { muzzle: 0xFFFFFF, beam: 0xFFFFFF }; // Default white
    }
    
    /**
     * Get audio type for weapon
     * @param {string} weaponType Type of weapon
     * @returns {string} Audio type key
     */
    getAudioType(weaponType) {
        const audioMap = {
            'laser_cannon': 'lasers',
            'pulse_cannon': 'lasers',
            'plasma_cannon': 'photons',
            'phaser_array': 'photons',
            'standard_missile': 'missiles',
            'homing_missile': 'missiles',
            'photon_torpedo': 'missiles',
            'proximity_mine': 'mines',
            'laser': 'lasers',
            'pulse': 'lasers',
            'plasma': 'photons',
            'phaser': 'photons',
            'scan-hit': 'lasers'
        };
        
        return audioMap[weaponType] || 'lasers'; // Default to lasers sound
    }
    
    /**
     * Create muzzle flash geometry
     * @returns {Mesh} Muzzle flash mesh
     */
    createMuzzleFlashGeometry() {
        // Small subtle sphere for arcade-style muzzle flash
        const geometry = new this.THREE.SphereGeometry(0.5, 8, 6); // reduced from 2 to 0.5
        const material = new this.THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.6, // reduced from 1.0 for more subtlety
            blending: this.THREE.AdditiveBlending
        });
        
        return new this.THREE.Mesh(geometry, material);
    }
    
    /**
     * Create laser beam geometry
     * @returns {Mesh} Laser beam mesh
     */
    createLaserBeamGeometry() {
        // Thin cylinder for laser beam
        const geometry = new this.THREE.CylinderGeometry(1, 1, 1, 6);
        const material = new this.THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 1.0,
            blending: this.THREE.AdditiveBlending
        });
        
        const mesh = new this.THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2; // Orient along Z-axis by default
        return mesh;
    }
    
    /**
     * Create explosion geometry
     * @returns {Mesh} Explosion mesh
     */
    createExplosionGeometry() {
        // Smaller, tighter expanding sphere for explosion
        const geometry = new this.THREE.SphereGeometry(0.5, 8, 6); // Smaller base size and fewer segments
        const material = new this.THREE.MeshBasicMaterial({
            color: 0xFF4500,
            transparent: true,
            opacity: 0.9, // Slightly more opaque for better visibility when small
            blending: this.THREE.AdditiveBlending,
            wireframe: true // Retro vector look
        });
        
        return new this.THREE.Mesh(geometry, material);
    }
    
    /**
     * Get effect from object pool
     * @param {string} effectType Type of effect
     * @returns {Mesh|null} Pooled effect or null
     */
    getPooledEffect(effectType) {
        const pool = this.objectPools[effectType];
        if (pool && pool.length > 0) {
            return pool.pop();
        }
        return null;
    }
    
    /**
     * Return effect to object pool
     * @param {string} effectType Type of effect
     * @param {Mesh} effect Effect mesh to return
     */
    returnToPool(effectType, effect) {
        const pool = this.objectPools[effectType];
        if (pool && pool.length < this.maxEffectsPerType) {
            // Reset effect properties
            effect.scale.set(1, 1, 1);
            effect.material.opacity = 1.0;
            effect.position.set(0, 0, 0);
            effect.rotation.set(0, 0, 0);
            
            pool.push(effect);
        }
    }
    
    /**
     * Clean up finished effects (performance optimization)
     */
    cleanupFinishedEffects() {
        // Clean up audio sources that have finished
        this.audioSources = this.audioSources.filter(source => {
            if (source.buffer && source.context.state !== 'closed') {
                return true;
            }
            return false;
        });
        
        // Limit active effects for performance
        if (this.activeEffects.size > this.maxEffectsPerType * 3) {
            console.warn(`High effect count: ${this.activeEffects.size}, consider reducing effect duration`);
        }
    }
    
    /**
     * Ease out quart function for smooth animations
     * @param {number} t Progress (0-1)
     * @returns {number} Eased value
     */
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    /**
     * Check if position is within culling distance
     * @param {Vector3} position Position to check
     * @returns {boolean} True if within culling distance
     */
    isWithinCullingDistance(position) {
        if (!this.camera) return true;
        
        const distance = this.camera.position.distanceTo(position);
        return distance <= this.effectCullingDistance;
    }
    
    /**
     * Update effect configuration (for ship editor integration)
     * @param {string} effectType Type of effect
     * @param {Object} config New configuration
     */
    updateEffectConfig(effectType, config) {
        if (this.effectConfig[effectType]) {
            Object.assign(this.effectConfig[effectType], config);
debug('UTILITY', `Updated ${effectType} configuration:`, config);
        }
    }
    
    /**
     * Get current effect configuration (for ship editor)
     * @param {string} effectType Type of effect
     * @returns {Object} Current configuration
     */
    getEffectConfig(effectType) {
        return this.effectConfig[effectType] ? { ...this.effectConfig[effectType] } : null;
    }
    
    /**
     * Stop all effects and clean up
     */
    cleanup() {
        // Stop all audio sources
        this.audioSources.forEach(source => {
            try {
                if (source.stop) source.stop();
            } catch (e) {
                // Ignore errors for already stopped sources
            }
        });
        this.audioSources = [];
        
        // Clean up interaction check interval
        if (this.interactionCheckInterval) {
            clearInterval(this.interactionCheckInterval);
            this.interactionCheckInterval = null;
        }
        
        // Remove all effects from scene
        this.activeEffects.forEach(effect => {
            this.scene.remove(effect);
        });
        
        // Clear all effect arrays
        this.muzzleFlashes = [];
        this.laserBeams = [];
        this.projectiles = [];
        this.explosions = [];
        this.activeEffects.clear();
        
debug('COMBAT', 'WeaponEffectsManager cleaned up');
    }
    
    /**
     * Get status information for debugging
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            audioInitialized: this.audioInitialized,
            audioBuffersLoaded: this.audioBuffers.size,
            activeEffects: this.activeEffects.size,
            muzzleFlashes: this.muzzleFlashes.length,
            laserBeams: this.laserBeams.length,
            explosions: this.explosions.length,
            audioSources: this.audioSources.length,
            poolSizes: {
                muzzleFlash: this.objectPools.muzzleFlash.length,
                laserBeam: this.objectPools.laserBeam.length,
                explosion: this.objectPools.explosion.length
            }
        };
    }
    
    /**
     * Check if audio system is ready for playback
     * @returns {boolean} True if audio is ready
     */
    isAudioReady() {
        return this.audioInitialized && this.audioContext && this.audioBuffers.size > 0;
    }
    
    /**
     * Check if user interaction has been detected
     * @returns {boolean} True if user has interacted
     */
    hasUserInteracted() {
        return this.userHasInteracted;
    }
} 