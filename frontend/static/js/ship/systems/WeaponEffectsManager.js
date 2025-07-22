/**
 * WeaponEffectsManager - Core system for managing all weapon visual and audio effects
 * Provides arcade-style retro effects matching the Elite vector aesthetic
 * Supports 60fps performance with effect culling and object pooling
 */

export class WeaponEffectsManager {
    constructor(scene, camera, audioContext = null) {
        console.log('🎆 WeaponEffectsManager constructor called');
        console.log('  - Scene:', !!scene);
        console.log('  - Camera:', !!camera);
        console.log('  - AudioContext:', !!audioContext);
        console.log('  - AudioContext state:', audioContext?.state || 'N/A');
        
        this.scene = scene;
        this.camera = camera;
        this.audioContext = audioContext;
        
        // Get THREE reference (use global pattern like other files)
        this.THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!this.THREE) {
            const availableGlobals = {
                windowTHREE: !!window.THREE,
                globalTHREE: typeof THREE !== 'undefined',
                scene: !!scene,
                camera: !!camera
            };
            console.error('THREE.js not available for WeaponEffectsManager. Available globals:', availableGlobals);
            
            // Instead of throwing, create a fallback mode
            this.fallbackMode = true;
            console.log('🎆 WeaponEffectsManager: Entering fallback mode');
            this.initializeFallbackMode();
            return;
        }
        
        this.fallbackMode = false;
        console.log('🎆 WeaponEffectsManager: Entering full mode');
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
        console.log('🎆 WeaponEffectsManager: Initializing full mode...');
        
        // Effect collections
        this.muzzleFlashes = [];
        this.laserBeams = [];
        this.projectiles = [];
        this.explosions = [];
        this.activeEffects = new Set();
        
        // NEW: Particle trail system
        this.particleTrails = new Map(); // Map projectile ID to trail data
        this.particleSystems = []; // Active particle systems for updating
        
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
        
        // Effect configuration (will be exposed to ship editor)
        this.effectConfig = {
            muzzleFlash: {
                duration: 0.08, // seconds - reduced from 0.15 for subtlety
                scale: 0.4, // reduced from 1.0 for smaller flash
                intensity: 0.3 // reduced from 1.0 for lower opacity
            },
            laserBeam: {
                duration: 0.8, // seconds - tunable
                thickness: 0.02, // tunable
                intensity: 1.0,
                fadeTime: 0.6
            },
            missile: {
                trailIntensity: 1.0, // tunable
                trailDuration: 2.0,
                particleCount: 15
            },
            explosion: {
                scale: 1.0,
                duration: 1.5
            }
        };
        
        // Initialize audio system
        console.log('🎆 WeaponEffectsManager: Starting audio initialization...');
        this.initializeAudio();
        
        console.log('WeaponEffectsManager initialized in full mode');
    }
    
    /**
     * Set up user interaction detection for browser audio policies
     */
    setupUserInteractionDetection() {
        // Check if StarfieldAudioManager is handling user interaction detection
        const starfieldAudioManager = window.starfieldAudioManager;
        if (starfieldAudioManager) {
            // Use the global user interaction detection
            console.log('🔗 WeaponEffectsManager: Using global StarfieldAudioManager for user interaction detection');
            
            // Set up a periodic check to sync with the global state
            const checkInteractionState = () => {
                if (!this.userHasInteracted && starfieldAudioManager.hasUserInteracted()) {
                    this.userHasInteracted = true;
                    console.log('👆 WeaponEffectsManager: User interaction detected via StarfieldAudioManager');
                    
                    // Resume AudioContext if suspended
                    this.ensureAudioContextResumed();
                }
            };
            
            // Check immediately and then periodically
            checkInteractionState();
            this.interactionCheckInterval = setInterval(checkInteractionState, 100);
        } else {
            // Fallback to local user interaction detection if StarfieldAudioManager not available
            console.log('⚠️ WeaponEffectsManager: StarfieldAudioManager not available, using local user interaction detection');
            
            const trackInteraction = () => {
                if (!this.userHasInteracted) {
                    this.userHasInteracted = true;
                    console.log('👆 WeaponEffectsManager: User interaction detected - weapon audio should work now');
                    
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
        console.log('🎵 WeaponEffectsManager: Starting audio initialization...');
        
        try {
            if (!this.audioContext) {
                console.warn('WeaponEffectsManager: No audio context available for weapon sounds');
                console.log('🎵 Falling back to HTML5 audio...');
                this.useFallbackAudio = true;
                this.audioInitialized = true; // Mark as initialized to allow HTML5 fallback
                return;
            }

            console.log('🎵 Loading weapon audio effects...');
            console.log('🎵 AudioContext state:', this.audioContext.state);

            // Try to resume audio context
            await this.ensureAudioContextResumed();

            // Load weapon audio from static directory
            const audioBasePath = 'static/audio/';
            console.log(`🔍 Loading weapon audio from: ${audioBasePath}`);
            const soundFiles = [
                { type: 'lasers', file: `${audioBasePath}lasers.wav` },
                { type: 'photons', file: `${audioBasePath}photons.wav` },
                { type: 'missiles', file: `${audioBasePath}missiles.wav` },
                { type: 'mines', file: `${audioBasePath}mines.mp3` },
                { type: 'explosion', file: `${audioBasePath}explosion.wav` },
                { type: 'death', file: `${audioBasePath}death.wav` },
                { type: 'success', file: `${audioBasePath}success.wav` }
            ];

            console.log(`🎵 Loading weapon audio files...`);

            const loadPromises = soundFiles.map(sound => this.loadSound(sound.type, sound.file));
            await Promise.all(loadPromises);
            
            console.log(`✅ Loaded ${this.audioBuffers.size} weapon audio effects - ready to fire!`);
            
            // Log sound duration configuration once
            console.log(`🔊 WEAPON AUDIO CONFIG: Laser sound duration = 0.5s (increased for full audibility)`);
            
            this.audioInitialized = true;
            
        } catch (error) {
            console.error('WeaponEffectsManager: Failed to initialize audio:', error);
            console.log('🎵 Falling back to HTML5 audio due to initialization failure...');
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
                console.log('WeaponEffectsManager: Audio context resumed');
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
        console.log(`🎵 WeaponEffectsManager.playSound called: ${soundType}, volume=${volume}`);
        console.log(`🎵 System state: audioInitialized=${this.audioInitialized}, audioContext=${!!this.audioContext}, buffers=${this.audioBuffers.size}`);
        console.log(`🎵 Has buffer for ${soundType}: ${this.audioBuffers.has(soundType)}`);
        console.log(`🎵 User interaction detected: ${this.userHasInteracted}`);
        
        // Check user interaction for browser audio policies
        if (!this.userHasInteracted) {
            console.warn('⚠️ WeaponEffectsManager: No user interaction detected - sound may not play due to browser policy');
        }
        
        // Use HTML5 audio fallback if Web Audio API isn't available or failed
        if (this.useFallbackAudio || !this.audioInitialized || !this.audioContext || !this.audioBuffers.has(soundType)) {
            console.log(`🎵 Using HTML5 fallback for ${soundType}: fallback=${this.useFallbackAudio}, initialized=${this.audioInitialized}, context=${!!this.audioContext}, hasBuffer=${this.audioBuffers.has(soundType)}`);
            this.playHTML5Sound(soundType, volume);
            return;
        }
        
        try {
            console.log(`🎵 Attempting Web Audio playback for ${soundType}`);
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
                console.log(`🎵 Playing ${(durationPercentage * 100).toFixed(0)}% of ${soundType} (${actualDuration.toFixed(2)}s of ${audioBuffer.duration.toFixed(2)}s)`);
            }
            
            // For laser sounds, play only the first part (0.5 seconds - increased for full audibility)
            if (soundType === 'lasers') {
                const laserDuration = actualDuration || 0.5; // Increased from 0.2s for full audibility
                console.log(`🎵 Laser audio buffer duration: ${audioBuffer.duration.toFixed(3)}s, playing: ${laserDuration}s`);
                source.start(0, 0, laserDuration);
                console.log(`🎵 Playing laser sound for ${laserDuration}s`);
            } else if (actualDuration !== null) {
                // For other sounds with duration specified, play from start with duration limit
                source.start(0, 0, actualDuration);
                console.log(`🎵 Playing ${soundType} for ${actualDuration}s`);
            } else {
                source.start();
                console.log(`🎵 Playing full ${soundType} sound`);
            }
            
            // Clean up after sound finishes
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            
            this.audioSources.push(source);
            console.log(`✅ Web Audio playback started for ${soundType}`);
            
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
        console.log(`🎵 WeaponEffectsManager.playHTML5Sound called: ${soundType}, volume=${volume}`);
        
        try {
            const audioBasePath = 'static/audio/';
            const audioMap = {
                'lasers': `${audioBasePath}lasers.wav`,
                'photons': `${audioBasePath}photons.wav`,
                'missiles': `${audioBasePath}missiles.wav`,
                'explosion': `${audioBasePath}explosion.wav`,
                'success': `${audioBasePath}success.wav`,
                'mines': `${audioBasePath}mines.mp3`,
                'death': `${audioBasePath}death.wav`
            };
            
            if (audioMap[soundType]) {
                console.log(`🎵 HTML5: Playing ${soundType} from: ${audioMap[soundType]}`);
                
                const audio = new Audio(audioMap[soundType]);
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().then(() => {
                    console.log(`✅ HTML5: Successfully played ${soundType}`);
                }).catch(error => {
                    // Only log error if this is the first failure
                    if (!this.html5AudioWarningShown) {
                        console.warn('HTML5 audio play failed (autoplay policy):', error.message);
                        this.html5AudioWarningShown = true;
                    }
                });
            } else {
                console.warn(`🎵 HTML5: No audio mapping found for sound type: ${soundType}`);
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
        console.log(`🔫 WeaponEffectsManager: Firing ${weaponType} -> audio type: ${audioType}`);
        console.log(`🔫 Audio system status: initialized=${this.audioInitialized}, buffers=${this.audioBuffers.size}, fallback=${this.useFallbackAudio}`);
        
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
        
        console.log(`Created laser beam for ${weaponType}, distance: ${distance.toFixed(1)}`);
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
                console.log(`💥 Explosion suppressed: Hit too far from center (${distanceFromCenter.toFixed(1)}km > ${proximityThresholdKm.toFixed(1)}km)`);
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
        
        // Play corresponding sound
        const soundType = explosionType === 'death' ? 'death' : 'explosion';
        this.playSound(soundType, position);
        
        console.log(`Created ${explosionType} explosion at`, position, `radius: ${(radius * 0.00625).toFixed(3)} (25% larger)`);
    }
    
    /**
     * Create particle trail for a projectile (missiles, torpedoes, etc.)
     * @param {string} projectileId Unique identifier for the projectile
     * @param {string} projectileType Type of projectile ('homing_missile', 'photon_torpedo', 'proximity_mine')
     * @param {Vector3} startPosition Starting position of the trail
     * @param {Object} projectileObject Reference to the Three.js projectile object for position tracking
     * @returns {Object} Particle trail data for updating
     */
    createProjectileTrail(projectileId, projectileType, startPosition, projectileObject) {
        if (this.fallbackMode) {
            console.warn('WeaponEffectsManager: createProjectileTrail called in fallback mode');
            return null;
        }
        
        // Configuration based on projectile type
        // Particle trail configurations for different projectile types
        const configs = {
            homing_missile: {
                particleCount: 30, // Increased from 20 for denser trail
                trailDuration: 5000, // Increased from 3000ms for longer trails
                color: 0xff4444, // Red
                size: 1.2, // Increased size
                engineGlow: true,
                engineColor: 0xff0000,
                emissiveColor: 0x440000
            },
            photon_torpedo: {
                particleCount: 35, // Increased from 25 for denser trail  
                trailDuration: 7000, // Increased from 4000ms for longer trails
                color: 0x4444ff, // Blue
                size: 1.6, // Increased size
                engineGlow: true,
                engineColor: 0x0000ff,
                emissiveColor: 0x000044
            },
            proximity_mine: {
                particleCount: 15, // Increased from 8 for more visible trail
                trailDuration: 4000, // Increased from 2000ms for longer trails
                color: 0xff8800, // Orange
                size: 0.8, // Increased size  
                engineGlow: false,
                engineColor: null,
                emissiveColor: null
            }
        };
        
        const config = configs[projectileType] || configs.homing_missile;
        
        // Create particle system
        const particleGeometry = new this.THREE.BufferGeometry();
        const positions = new Float32Array(config.particleCount * 3);
        const colors = new Float32Array(config.particleCount * 3);
        const sizes = new Float32Array(config.particleCount);
        
        // Initialize particles
        for (let i = 0; i < config.particleCount; i++) {
            // Start all particles at projectile position
            positions[i * 3] = startPosition.x;
            positions[i * 3 + 1] = startPosition.y;
            positions[i * 3 + 2] = startPosition.z;
            
            // Set colors
            const color = new this.THREE.Color(config.color);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Set sizes
            sizes[i] = config.size * (0.5 + Math.random() * 0.5);
        }
        
        particleGeometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
        
        // Create particle material - simplified without per-particle alpha for now
        const particleMaterial = new this.THREE.PointsMaterial({
            size: config.size * 2, // Make particles more visible
            vertexColors: true,
            transparent: true,
            opacity: 0.9, // Higher opacity for visibility
            blending: this.THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true // Size based on distance
        });
        
        // Create particle system
        const particleSystem = new this.THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);
        
        console.log(`🚀 Created particle system at position:`, startPosition);
        console.log(`🚀 Particle count: ${config.particleCount}, size: ${config.size}`);
        console.log(`🚀 Particle system added to scene:`, !!this.scene);
        
        // Create engine glow if enabled
        let engineGlow = null;
        if (config.engineGlow) {
            engineGlow = this.createEngineGlow(startPosition, config.engineColor, config.emissiveColor);
            this.scene.add(engineGlow);
            console.log(`🚀 Created engine glow at position:`, startPosition);
        }
        
        // Track trail data
        const trailData = {
            id: projectileId,
            type: projectileType,
            particleSystem: particleSystem,
            engineGlow: engineGlow,
            projectileObject: projectileObject,
            config: config,
            positions: positions,
            particleHistory: [], // Store recent positions for trail effect
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            creationTime: Date.now() // Added creation time
        };
        
        this.particleTrails.set(projectileId, trailData);
        this.particleSystems.push(trailData);
        this.activeEffects.add(particleSystem);
        
        if (engineGlow) {
            this.activeEffects.add(engineGlow);
        }
        
        console.log(`🚀 Created particle trail for ${projectileType}: ${config.particleCount} particles`);
        return trailData;
    }
    
    /**
     * Create engine glow effect for projectiles
     * @param {Vector3} position Engine position
     * @param {number} color Main color
     * @param {number} emissiveColor Emissive color (for materials that support it)
     * @returns {Mesh} Engine glow mesh
     */
    createEngineGlow(position, color, emissiveColor) {
        const glowGeometry = new this.THREE.SphereGeometry(1.5, 8, 6);
        
        // Use MeshLambertMaterial which supports emissive property
        const glowMaterial = new this.THREE.MeshLambertMaterial({
            color: color,
            emissive: emissiveColor,
            transparent: true,
            opacity: 0.6,
            blending: this.THREE.AdditiveBlending
        });
        
        const engineGlow = new this.THREE.Mesh(glowGeometry, glowMaterial);
        engineGlow.position.copy(position);
        
        return engineGlow;
    }
    
    /**
     * Update particle trail for a moving projectile
     * @param {string} projectileId Projectile identifier
     * @param {Vector3} newPosition Current projectile position
     */
    updateProjectileTrail(projectileId, newPosition) {
        if (this.fallbackMode) return;
        
        const trailData = this.particleTrails.get(projectileId);
        if (!trailData) return;
        
        const now = Date.now();
        const deltaTime = (now - trailData.lastUpdateTime) / 1000; // seconds
        trailData.lastUpdateTime = now;
        
        // Update particle history
        trailData.particleHistory.unshift({
            position: newPosition.clone(),
            time: now
        });
        
        // Remove old history beyond trail length
        const maxHistoryTime = trailData.config.trailDuration * 1000;
        trailData.particleHistory = trailData.particleHistory.filter(
            entry => (now - entry.time) < maxHistoryTime
        );
        
        // Update particle positions along trail
        const positions = trailData.positions;
        const particleCount = trailData.config.particleCount;
        const history = trailData.particleHistory;
        
        for (let i = 0; i < particleCount; i++) {
            const historyIndex = Math.floor((i / particleCount) * history.length);
            
            if (historyIndex < history.length) {
                const historyEntry = history[historyIndex];
                positions[i * 3] = historyEntry.position.x;
                positions[i * 3 + 1] = historyEntry.position.y;
                positions[i * 3 + 2] = historyEntry.position.z;
            } else {
                // No history for this particle, place it at current position (invisible)
                positions[i * 3] = newPosition.x;
                positions[i * 3 + 1] = newPosition.y;
                positions[i * 3 + 2] = newPosition.z;
            }
        }
        
        // Update GPU buffers
        trailData.particleSystem.geometry.attributes.position.needsUpdate = true;
        
        // Update overall trail opacity based on age
        const trailAge = (now - trailData.startTime) / (trailData.config.trailDuration * 1000);
        const opacity = Math.max(0.3, 0.9 - trailAge * 0.6); // Fade from 0.9 to 0.3
        trailData.particleSystem.material.opacity = opacity;
        
        // Update engine glow position
        if (trailData.engineGlow) {
            trailData.engineGlow.position.copy(newPosition);
            
            // Animate engine glow pulsing
            const pulseFactor = 0.8 + 0.2 * Math.sin(now * 0.01);
            trailData.engineGlow.scale.setScalar(pulseFactor);
        }
        
        console.log(`🔄 Updated trail ${projectileId}: ${history.length} history points, opacity: ${opacity.toFixed(2)}`);
    }
    
    /**
     * Remove particle trail for a destroyed projectile
     * @param {string} projectileId Projectile identifier
     */
    removeProjectileTrail(projectileId) {
        if (this.fallbackMode) return;
        
        const trailData = this.particleTrails.get(projectileId);
        if (!trailData) return;
        
        // Don't immediately remove trails - let them persist for minimum visibility time
        const currentTime = Date.now();
        const trailAge = currentTime - trailData.creationTime;
        const minimumPersistenceTime = 2000; // Minimum 2 seconds visibility
        
        if (trailAge < minimumPersistenceTime) {
            // Mark trail for delayed cleanup but don't remove immediately
            trailData.pendingDestruction = true;
            trailData.destructionTime = currentTime + (minimumPersistenceTime - trailAge);
            console.log(`⏳ Trail ${projectileId} marked for delayed cleanup - will persist ${(minimumPersistenceTime - trailAge)/1000}s more`);
            return;
        }
        
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
        
        console.log(`🧹 Removed particle trail for projectile: ${projectileId}`);
    }
    
    /**
     * Update all active particle trails automatically
     * @param {number} deltaTime Time elapsed in seconds
     */
    updateParticleTrails(deltaTime) {
        if (this.fallbackMode) return;
        
        const currentTime = Date.now();
        
        // Update each active particle trail by getting position from its projectile object
        for (const trailData of this.particleSystems) {
            if (trailData.projectileObject && trailData.projectileObject.position) {
                // Update trail with current projectile position
                this.updateProjectileTrail(trailData.id, trailData.projectileObject.position);
            }
        }
        
        // Clean up trails marked for delayed destruction
        const trailsToDestroy = [];
        for (const [projectileId, trailData] of this.particleTrails) {
            if (trailData.pendingDestruction && currentTime >= trailData.destructionTime) {
                trailsToDestroy.push(projectileId);
            }
        }
        
        // Actually remove the trails that have waited long enough
        trailsToDestroy.forEach(projectileId => {
            console.log(`🧹 Delayed cleanup: removing trail for ${projectileId}`);
            
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
            }
        });
        
        // Clean up trails for destroyed projectiles (if not using projectile objects)
        for (const [projectileId, trailData] of this.particleTrails) {
            // Check if projectile object still exists and is valid
            if (trailData.projectileObject && trailData.projectileObject.hasDetonated) {
                console.log(`🧹 Projectile ${projectileId} has detonated - marking trail for cleanup`);
                // Don't immediately remove - let removeProjectileTrail handle the timing
                this.removeProjectileTrail(projectileId);
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
            console.log(`🎉 Playing ${(durationPercentage * 100).toFixed(0)}% of success sound for system destruction`);
        } else {
            console.log('🎉 Playing full success sound for enemy destruction');
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
        
        // NEW: Update particle trails
        this.updateParticleTrails(deltaTime);
        
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
            'heavy_torpedo': { muzzle: 0xFF0000, beam: 0xFF0000 },     // Red
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
            'heavy_torpedo': 'missiles',
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
            console.log(`Updated ${effectType} configuration:`, config);
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
        
        console.log('WeaponEffectsManager cleaned up');
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