import * as THREE from 'three';

class WarpEffects {
    constructor(scene) {
        this.scene = scene;
        this.camera = null;
        this.initialized = false;
        this.minWarpFactor = 1.0;
        this.maxWarpFactor = 9.9;
        this.warpProgress = 0;
        this.warpDuration = 12000; // Total duration: 12 seconds
        this.arrivalTime = 8000;   // Arrival at 8 seconds
        this.warpStartTime = 0;
        this.isWarping = false;
        this.hasArrived = false;   // Track arrival separately from completion

        // Audio setup
        this.listener = new THREE.AudioListener();
        this.audioLoader = new THREE.AudioLoader();
        this.warpSound = new THREE.Audio(this.listener);
        this.warpRedAlertSound = new THREE.Audio(this.listener);
        this.soundLoaded = false;
        this.redAlertSoundLoaded = false;
        
        // Load the warp sounds
        console.log('Loading warp sounds...');
        this.audioLoader.load(
            '/audio/warp.wav',
            (buffer) => {
                console.log('Warp sound loaded successfully');
                this.warpSound.setBuffer(buffer);
                this.warpSound.setLoop(false);
                this.warpSound.setVolume(1.0);
                this.soundLoaded = true;
            },
            (progress) => {
                console.log(`Loading warp sound: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading warp sound:', error);
            }
        );

        this.audioLoader.load(
            '/audio/warp-redalert.wav',
            (buffer) => {
                console.log('Red alert warp sound loaded successfully');
                this.warpRedAlertSound.setBuffer(buffer);
                this.warpRedAlertSound.setLoop(false);
                this.warpRedAlertSound.setVolume(1.0);
                this.redAlertSoundLoaded = true;
            },
            (progress) => {
                console.log(`Loading red alert warp sound: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading red alert warp sound:', error);
            }
        );
    }

    initialize(scene, camera) {
        if (this.initialized) return;
        
        this.scene = scene;
        this.camera = camera;
        
        // Add audio listener to camera
        if (this.camera) {
            console.log('Adding audio listener to camera');
            this.camera.add(this.listener);
        } else {
            console.warn('No camera available for audio listener');
        }
        
        // Single container for all effects
        this.container = new THREE.Group();
        this.scene.add(this.container);
        
        // Create more streaks for denser effect
        this.streaks = [];
        for (let i = 0; i < 2000; i++) {
            const streak = this.createStreak();
            this.streaks.push(streak);
            this.container.add(streak);
        }
        
        // Create rings instead of wireframe tunnel
        this.rings = [];
        const ringCount = 40;
        const ringSpacing = 50;
        
        for (let i = 0; i < ringCount; i++) {
            const geometry = new THREE.RingGeometry(30, 31, 64);
            const material = new THREE.MeshBasicMaterial({
                color: 0xaaffff,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.position.z = -i * ringSpacing;
            this.rings.push(ring);
            this.container.add(ring);
        }
        
        // Initially hide effects
        this.container.visible = false;
        
        this.initialized = true;
        console.log('WarpEffects initialized with scene and camera');
    }

    createStreak() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: 0xaaffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(geometry, material);
        this.resetStreak(line);
        return line;
    }

    resetStreak(streak) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 75;
        const z = -800 + Math.random() * 1600;
        
        const positions = streak.geometry.attributes.position.array;
        positions[0] = Math.cos(angle) * radius;
        positions[1] = Math.sin(angle) * radius;
        positions[2] = z;
        
        // Make streaks more horizontal by reducing Y difference
        positions[3] = positions[0] * 0.9; // Less X narrowing
        positions[4] = positions[1] * 0.3; // More Y narrowing
        positions[5] = z + 240;
        
        streak.geometry.attributes.position.needsUpdate = true;
    }

    normalizeWarpFactor(warpFactor) {
        const clampedWarp = Math.max(this.minWarpFactor, Math.min(this.maxWarpFactor, warpFactor));
        return (clampedWarp - this.minWarpFactor) / (this.maxWarpFactor - this.minWarpFactor);
    }

    showAll(destinationSystem) {
        if (!this.initialized) return;
        this.container.visible = true;
        this.warpStartTime = Date.now();
        this.isWarping = true;
        this.warpProgress = 0;
        this.hasArrived = false;  // Reset arrival state
        
        // Check if destination system has enemy presence
        const hasEnemyPresence = this.checkEnemyPresence(destinationSystem);
        
        // Play appropriate warp sound
        if (hasEnemyPresence && this.redAlertSoundLoaded && !this.warpRedAlertSound.isPlaying) {
            this.warpRedAlertSound.play();
        } else if (this.soundLoaded && !this.warpSound.isPlaying) {
            this.warpSound.play();
        }
    }

    hideAll() {
        if (!this.initialized) return;
        this.container.visible = false;
        this.streaks.forEach(streak => this.resetStreak(streak));
        this.rings.forEach(ring => {
            ring.material.opacity = 0;
            ring.position.z = -(this.rings.indexOf(ring) * 50);
        });
        this.isWarping = false;
        this.warpProgress = 0;
        this.hasArrived = false;  // Reset arrival state
        
        // Stop sounds if playing
        if (this.warpSound.isPlaying) {
            console.log('Stopping warp sound');
            this.warpSound.stop();
        }
        if (this.warpRedAlertSound.isPlaying) {
            console.log('Stopping red alert warp sound');
            this.warpRedAlertSound.stop();
        }
    }

    checkEnemyPresence(system) {
        if (!system || !system.planets) return false;
        
        // Check all planets and their moons for enemy diplomacy
        return system.planets.some(planet => {
            if (planet.diplomacy?.toLowerCase() === 'enemy') return true;
            
            // Check moons if they exist
            if (planet.moons && Array.isArray(planet.moons)) {
                return planet.moons.some(moon => moon.diplomacy?.toLowerCase() === 'enemy');
            }
            return false;
        });
    }

    getSpeedMultiplier(normalizedTime) {
        // Acceleration phase (0-2 seconds)
        if (normalizedTime < 2000) {
            return THREE.MathUtils.smoothstep(normalizedTime / 2000, 0, 1) * 2.0;
        }
        // Full speed phase (2-8 seconds, arrival point)
        else if (normalizedTime < this.arrivalTime) {
            return 2.0;
        }
        // Sharp deceleration at arrival, then gradual fade (8-12 seconds)
        else {
            // Initial sharp drop at arrival
            const initialDrop = 0.4; // Drop to 40% intensity immediately at arrival
            
            // Then fade out the remaining intensity over the final 4 seconds
            const t = 1 - ((normalizedTime - this.arrivalTime) / (this.warpDuration - this.arrivalTime));
            return Math.max(0, initialDrop * Math.pow(t, 2) * 2.0);
        }
    }

    update(deltaTime, warpFactor) {
        if (!this.initialized || !this.camera || !this.isWarping) return;

        const currentTime = Date.now();
        const elapsedTime = currentTime - this.warpStartTime;
        const normalizedTime = Math.min(elapsedTime, this.warpDuration);
        this.warpProgress = normalizedTime / this.warpDuration;
        
        // Check for arrival point
        if (!this.hasArrived && normalizedTime >= this.arrivalTime) {
            this.hasArrived = true;
            // Create a flash effect at arrival
            this.rings.forEach(ring => {
                ring.material.opacity = 1.0;
                ring.scale.multiplyScalar(1.5);
            });
            this.streaks.forEach(streak => {
                streak.material.opacity = 1.0;
            });
        }

        const speedMultiplier = this.getSpeedMultiplier(normalizedTime);
        const intensity = this.normalizeWarpFactor(warpFactor);

        // Calculate fade factor for post-arrival
        const fadeMultiplier = normalizedTime > this.arrivalTime ?
            Math.pow(1 - ((normalizedTime - this.arrivalTime) / (this.warpDuration - this.arrivalTime)), 2) : 1;

        // Update sound playback rate based on speed
        if (this.soundLoaded && this.warpSound.isPlaying) {
            const playbackRate = 0.8 + (speedMultiplier * 0.4);
            this.warpSound.setPlaybackRate(playbackRate);
            
            // Adjust volume for arrival and fade
            if (this.hasArrived) {
                this.warpSound.setVolume(fadeMultiplier);
            }
        }

        // Update container position
        this.container.position.copy(this.camera.position);
        this.container.position.z -= 100;
        
        // Update rings
        this.rings.forEach((ring, index) => {
            const ringSpeed = deltaTime * (this.hasArrived ? 1.0 : 2.0) * speedMultiplier;
            ring.position.z += ringSpeed;
            
            const distanceFactor = Math.abs(ring.position.z) / 800;
            const scale = 1 + distanceFactor * speedMultiplier * (this.hasArrived ? 4 : 8);
            ring.scale.set(scale, scale, 1);
            
            const opacityFactor = 1 - (Math.abs(ring.position.z) / 1600);
            ring.material.opacity = intensity * speedMultiplier * opacityFactor * 0.5 * fadeMultiplier;
            
            if (ring.position.z > 800) {
                ring.position.z = -800;
            }
        });
        
        // Update streaks
        const baseSpeed = deltaTime * 5.0 * (1 + intensity * (this.hasArrived ? 4 : 8));
        const speed = baseSpeed * speedMultiplier;
        
        this.streaks.forEach(streak => {
            const positions = streak.geometry.attributes.position.array;
            positions[2] += speed;
            positions[5] += speed;
            
            if (positions[2] > 1600) {
                this.resetStreak(streak);
            }
            
            streak.geometry.attributes.position.needsUpdate = true;
            
            const brightnessMultiplier = 0.3 + speedMultiplier * 0.7;
            streak.material.opacity = Math.min(1.0, intensity * brightnessMultiplier * fadeMultiplier);
        });

        // Only hide everything after the full duration
        if (elapsedTime >= this.warpDuration) {
            this.hideAll();
        }
    }
}

export default WarpEffects; 