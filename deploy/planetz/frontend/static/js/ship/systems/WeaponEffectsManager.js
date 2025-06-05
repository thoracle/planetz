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
            this.initializeFallbackMode();
            return;
        }
        
        this.fallbackMode = false;
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
        // Effect collections
        this.muzzleFlashes = [];
        this.laserBeams = [];
        this.projectiles = [];
        this.explosions = [];
        this.activeEffects = new Set();
        
        // Audio system
        this.audioBuffers = new Map();
        this.audioSources = [];
        this.audioInitialized = false;
        this.useFallbackAudio = false;
        this.html5AudioWarningShown = false;
        this.safariAudioEnabled = false;
        
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
        this.initializeAudio();
        
        // Check for Safari and add audio enabler if needed
        this.setupSafariAudioSupport();
        
        console.log('WeaponEffectsManager initialized in full mode');
    }
    
    /**
     * Initialize audio system
     */
    async initializeAudio() {
        try {
            if (!this.audioContext) {
                console.warn('WeaponEffectsManager: No audio context available for weapon sounds');
                return;
            }

            console.log('🎵 Loading weapon audio effects...');

            // Try to resume audio context
            await this.ensureAudioContextResumed();

            // Load weapon sound files (corrected paths)
            const soundFiles = [
                { type: 'lasers', file: 'static/audio/lasers.wav' },
                { type: 'photons', file: 'static/audio/photons.wav' },
                { type: 'missiles', file: 'static/audio/missiles.wav' },
                { type: 'mines', file: 'static/audio/mines.mp3' },
                { type: 'explosion', file: 'static/audio/explosion.wav' },
                { type: 'death', file: 'static/audio/death.wav' },
                { type: 'success', file: 'static/audio/success.wav' }
            ];

            const loadPromises = soundFiles.map(sound => this.loadSound(sound.type, sound.file));
            await Promise.all(loadPromises);
            
            console.log(`✅ Loaded ${Object.keys(this.audioBuffers).length} weapon audio effects - ready to fire!`);
            
            // Log sound duration configuration once
            console.log(`🔊 WEAPON AUDIO CONFIG: Laser sound duration = 0.05s (reduced for very rapid fire)`);
            
            this.audioInitialized = true;
            
        } catch (error) {
            console.error('WeaponEffectsManager: Failed to initialize audio:', error);
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
     * Play weapon sound effect with Safari compatibility
     * @param {string} soundType Type of sound ('lasers', 'photons', 'missiles', etc.)
     * @param {Vector3} position 3D position for spatial audio
     * @param {number|object} volume Volume multiplier (0.0 - 1.0) - handles object volume bug
     * @param {number} duration Optional duration to limit playback (for laser sounds)
     * @param {number} durationPercentage Optional percentage of the full audio to play (0.0 - 1.0)
     */
    playSound(soundType, position = null, volume = 1.0, duration = null, durationPercentage = null) {
        // Fix volume parameter if it's an object (Safari autoplay policy bug fix)
        let fixedVolume = volume;
        if (typeof volume === 'object') {
            fixedVolume = 0.5; // Default to 50% volume
        } else if (typeof volume !== 'number') {
            fixedVolume = 0.5;
        }
        
        // Safari compatibility: Use HTML5 audio for better compatibility
        if (this.useFallbackAudio || !this.audioInitialized || !this.audioContext || !this.audioBuffers.has(soundType)) {
            this.playHTML5Sound(soundType, fixedVolume);
            return;
        }
        
        try {
            const audioBuffer = this.audioBuffers.get(soundType);
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = audioBuffer;
            gainNode.gain.value = Math.max(0, Math.min(1, fixedVolume));
            
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
            
            // For laser sounds, play only the first part (0.05 seconds - reduced for very rapid fire)
            if (soundType === 'lasers') {
                const laserDuration = actualDuration || 0.05; // Reduced from 0.125s to 0.05s for very rapid fire
                source.start(0, 0, laserDuration);
            } else if (actualDuration !== null) {
                // For other sounds with duration specified, play from start with duration limit
                source.start(0, 0, actualDuration);
            } else {
                source.start();
            }
            
            // Clean up after sound finishes
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            
            this.audioSources.push(source);
            
        } catch (error) {
            console.warn(`Failed to play sound ${soundType}, falling back to HTML5:`, error);
            this.useFallbackAudio = true;
            this.playHTML5Sound(soundType, fixedVolume);
        }
    }
    
    /**
     * HTML5 Audio fallback for Safari compatibility
     * @param {string} soundType Type of sound
     * @param {number} volume Volume (0.0 - 1.0)
     */
    playHTML5Sound(soundType, volume = 0.5) {
        try {
            const audioMap = {
                'lasers': 'static/audio/lasers.wav',
                'photons': 'static/audio/photons.wav',
                'missiles': 'static/audio/missiles.wav',
                'explosion': 'static/audio/explosion.wav',
                'success': 'static/audio/success.wav',
                'mines': 'static/audio/mines.mp3',
                'death': 'static/audio/death.wav'
            };
            
            if (audioMap[soundType]) {
                const audio = new Audio(audioMap[soundType]);
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().catch(e => {
                    // Only log error if this is the first failure
                    if (!this.html5AudioWarningShown) {
                        console.warn('HTML5 audio play failed (Safari autoplay policy):', e.message);
                        this.html5AudioWarningShown = true;
                        
                        // Show Safari audio enable button if available
                        if (this.showAudioButton) {
                            this.showAudioButton();
                        }
                    }
                });
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
        this.playSound(audioType, position, 0.7, soundDuration);
        
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
            'proximity_mine': 'mines'
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
     * Setup Safari audio support with user interaction button
     */
    setupSafariAudioSupport() {
        // Detect Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isSafari) {
            console.log('🍎 Safari detected - setting up audio compatibility');
            
            // Create audio enable button (initially hidden)
            const audioButton = document.createElement('button');
            audioButton.id = 'safari-audio-enabler';
            audioButton.textContent = '🔊 Enable Audio';
            audioButton.style.position = 'fixed';
            audioButton.style.top = '10px';
            audioButton.style.right = '10px';
            audioButton.style.zIndex = '10000';
            audioButton.style.padding = '10px 15px';
            audioButton.style.backgroundColor = '#ff6600';
            audioButton.style.color = 'white';
            audioButton.style.border = 'none';
            audioButton.style.borderRadius = '5px';
            audioButton.style.fontSize = '14px';
            audioButton.style.cursor = 'pointer';
            audioButton.style.display = 'none';
            audioButton.style.fontFamily = 'Arial, sans-serif';
            audioButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            
            // Show button on first audio attempt
            this.showAudioButton = () => {
                if (!this.safariAudioEnabled && audioButton.style.display === 'none') {
                    audioButton.style.display = 'block';
                    console.log('🔊 Audio enable button shown for Safari');
                }
            };
            
            // Handle button click
            audioButton.addEventListener('click', () => {
                console.log('🎯 Safari audio enable button clicked');
                
                // Test HTML5 audio to unlock Safari
                const testAudio = new Audio('static/audio/lasers.wav');
                testAudio.volume = 0.1;
                
                testAudio.play().then(() => {
                    console.log('✅ Safari audio unlocked successfully');
                    this.safariAudioEnabled = true;
                    audioButton.remove();
                    
                    // Enable HTML5 fallback mode for Safari
                    this.useFallbackAudio = true;
                    
                }).catch(e => {
                    console.log('❌ Safari audio unlock failed:', e.message);
                    audioButton.textContent = '❌ Audio Blocked - Check Settings';
                    setTimeout(() => {
                        audioButton.textContent = '🔊 Enable Audio';
                    }, 3000);
                });
            });
            
            document.body.appendChild(audioButton);
        }
    }
} 