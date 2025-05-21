import * as THREE from 'three';

class WarpEffects {
    constructor(scene) {
        this.scene = scene;
        
        // Star trail system
        this.starTrails = new StarTrailSystem(scene);
        
        // Engine glow effect
        this.engineGlow = new EngineGlowEffect(scene);
        
        // Starfield stretch effect
        this.starfieldStretch = new StarfieldStretch(scene);
        
        // Light speed effect
        this.lightSpeedEffect = new LightSpeedTransition(scene);
        
        // Effect parameters
        this.intensity = 0;
        this.targetIntensity = 0;
        this.transitionSpeed = 2.0;
        
        // Camera shake parameters
        this.cameraShake = {
            intensity: 0,
            duration: 0,
            frequency: 0.1,
            decay: 0.9
        };
    }

    /**
     * Update all warp effects
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     * @param {number} warpFactor - Current warp factor
     */
    update(deltaTime, warpFactor) {
        // Calculate target intensity based on warp factor
        this.targetIntensity = Math.min(1.0, warpFactor / 9.9);
        
        // Smoothly transition current intensity
        const transition = this.transitionSpeed * (deltaTime / 1000);
        if (this.intensity < this.targetIntensity) {
            this.intensity = Math.min(this.targetIntensity, this.intensity + transition);
        } else if (this.intensity > this.targetIntensity) {
            this.intensity = Math.max(this.targetIntensity, this.intensity - transition);
        }
        
        // Update individual effects
        this.starTrails.update(deltaTime, this.intensity, warpFactor);
        this.engineGlow.update(deltaTime, this.intensity, warpFactor);
        this.starfieldStretch.update(deltaTime, this.intensity, warpFactor);
        this.lightSpeedEffect.update(deltaTime, this.intensity);
        
        // Update camera shake
        this.updateCameraShake(deltaTime, warpFactor);
        
        // Trigger camera shake during warp
        if (this.intensity > 0.8 && this.cameraShake.duration <= 0) {
            this.triggerCameraShake(0.1, 1000);
        }
    }

    /**
     * Update camera shake effect
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     * @param {number} warpFactor - Current warp factor
     */
    updateCameraShake(deltaTime, warpFactor) {
        if (this.cameraShake.duration > 0) {
            this.cameraShake.duration -= deltaTime;
            this.cameraShake.intensity *= this.cameraShake.decay;
            
            // Apply shake to camera
            const shakeX = Math.sin(Date.now() * this.cameraShake.frequency) * this.cameraShake.intensity;
            const shakeY = Math.cos(Date.now() * this.cameraShake.frequency) * this.cameraShake.intensity;
            
            this.scene.camera.position.x += shakeX;
            this.scene.camera.position.y += shakeY;
        }
    }

    /**
     * Trigger camera shake effect
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in milliseconds
     */
    triggerCameraShake(intensity, duration) {
        this.cameraShake.intensity = intensity;
        this.cameraShake.duration = duration;
    }

    /**
     * Show all warp effects
     */
    showAll() {
        // Show star trails
        this.starTrails.trails.forEach(trail => {
            trail.visible = true;
        });
        
        // Show engine glow
        if (this.engineGlow.glow) {
            this.engineGlow.glow.visible = true;
        }
        if (this.engineGlow.outerGlow) {
            this.engineGlow.outerGlow.visible = true;
        }
        this.engineGlow.particles.forEach(particle => {
            particle.visible = true;
        });
        
        // Show starfield stretch
        this.starfieldStretch.stars.forEach(star => {
            star.visible = true;
        });
        
        // Show light speed effect
        if (this.lightSpeedEffect.tunnel) {
            this.lightSpeedEffect.tunnel.visible = true;
        }
    }

    /**
     * Hide all warp effects
     */
    hideAll() {
        // Hide star trails
        this.starTrails.trails.forEach(trail => {
            trail.visible = false;
        });
        
        // Hide engine glow
        if (this.engineGlow.glow) {
            this.engineGlow.glow.visible = false;
        }
        if (this.engineGlow.outerGlow) {
            this.engineGlow.outerGlow.visible = false;
        }
        this.engineGlow.particles.forEach(particle => {
            particle.visible = false;
        });
        
        // Hide starfield stretch
        this.starfieldStretch.stars.forEach(star => {
            star.visible = false;
        });
        
        // Hide light speed effect
        if (this.lightSpeedEffect.tunnel) {
            this.lightSpeedEffect.tunnel.visible = false;
        }
    }
}

class StarTrailSystem {
    constructor(scene) {
        this.scene = scene;
        this.trails = [];
        this.maxTrails = 200; // Increased number of trails
        this.trailLength = 100; // Increased trail length
        this.trailWidth = 2;
        this.trailColor = new THREE.Color(0xffffff);
        
        // Trail parameters
        this.minSpeed = 0.5;
        this.maxSpeed = 2.0;
        this.spreadAngle = Math.PI / 4; // 45 degrees spread
        
        // Create initial star trails
        this.initializeTrails();
    }

    initializeTrails() {
        for (let i = 0; i < this.maxTrails; i++) {
            const trail = this.createTrail();
            this.trails.push(trail);
            this.scene.add(trail);
        }
    }

    createTrail() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.trailLength * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: this.trailColor,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Line(geometry, material);
    }

    update(deltaTime, intensity, warpFactor) {
        // Update each trail
        this.trails.forEach((trail, index) => {
            const positions = trail.geometry.attributes.position.array;
            
            // Shift positions
            for (let i = positions.length - 1; i >= 3; i--) {
                positions[i] = positions[i - 3];
            }
            
            // Calculate new position with spread
            const angle = (index / this.maxTrails) * Math.PI * 2;
            const spread = (Math.random() - 0.5) * this.spreadAngle;
            const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
            
            const x = Math.cos(angle + spread) * 1000 * intensity;
            const y = Math.sin(angle + spread) * 1000 * intensity;
            const z = -1000 * intensity * speed * warpFactor;
            
            positions[0] = x;
            positions[1] = y;
            positions[2] = z;
            
            // Update geometry
            trail.geometry.attributes.position.needsUpdate = true;
            
            // Update opacity and color based on intensity and warp factor
            const hue = 0.6 + (warpFactor / 9.9) * 0.1; // Blue to purple shift
            trail.material.color.setHSL(hue, 1, 0.5);
            trail.material.opacity = 0.5 * intensity * (1 + warpFactor / 9.9);
        });
    }
}

class EngineGlowEffect {
    constructor(scene) {
        this.scene = scene;
        this.glow = null;
        this.particles = [];
        this.maxParticles = 50;
        this.initializeGlow();
        this.initializeParticles();
    }

    initializeGlow() {
        // Create main glow sphere
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        
        this.glow = new THREE.Mesh(geometry, material);
        this.scene.add(this.glow);
        
        // Create outer glow
        const outerGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        
        this.outerGlow = new THREE.Mesh(outerGeometry, outerMaterial);
        this.scene.add(this.outerGlow);
    }

    initializeParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            const particle = this.createParticle();
            this.particles.push(particle);
            this.scene.add(particle);
        }
    }

    createParticle() {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const particle = new THREE.Mesh(geometry, material);
        this.resetParticle(particle);
        return particle;
    }

    resetParticle(particle) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.5;
        particle.position.x = Math.cos(angle) * radius;
        particle.position.y = Math.sin(angle) * radius;
        particle.position.z = -1;
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            -0.05 - Math.random() * 0.05
        );
        particle.life = 1.0;
    }

    update(deltaTime, intensity, warpFactor) {
        // Update main glow
        if (this.glow) {
            const scale = 1 + intensity * 2;
            this.glow.scale.set(scale, scale, scale);
            this.glow.material.opacity = 0.5 * intensity;
            
            // Update color based on warp factor
            const hue = 0.5 + (warpFactor / 9.9) * 0.1; // Cyan to blue shift
            this.glow.material.color.setHSL(hue, 1, 0.5);
        }
        
        // Update outer glow
        if (this.outerGlow) {
            const scale = 1.5 + intensity * 3;
            this.outerGlow.scale.set(scale, scale, scale);
            this.outerGlow.material.opacity = 0.2 * intensity;
            this.outerGlow.material.color.copy(this.glow.material.color);
        }
        
        // Update particles
        this.particles.forEach(particle => {
            // Update position
            particle.position.add(particle.velocity);
            
            // Update life
            particle.life -= deltaTime * 0.001;
            
            // Update size and opacity
            const scale = 0.1 + particle.life * 0.2;
            particle.scale.set(scale, scale, scale);
            particle.material.opacity = 0.8 * particle.life * intensity;
            
            // Reset dead particles
            if (particle.life <= 0) {
                this.resetParticle(particle);
            }
        });
    }
}

class StarfieldStretch {
    constructor(scene) {
        this.scene = scene;
        this.stars = [];
        this.maxStars = 1000;
        this.initializeStars();
    }

    initializeStars() {
        for (let i = 0; i < this.maxStars; i++) {
            const star = this.createStar();
            this.stars.push(star);
            this.scene.add(star);
        }
    }

    createStar() {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const star = new THREE.Mesh(geometry, material);
        this.resetStar(star);
        return star;
    }

    resetStar(star) {
        // Random position in a sphere
        const radius = 1000 + Math.random() * 1000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        star.position.x = radius * Math.sin(phi) * Math.cos(theta);
        star.position.y = radius * Math.sin(phi) * Math.sin(theta);
        star.position.z = radius * Math.cos(phi);
        
        // Random size
        const size = 0.1 + Math.random() * 0.2;
        star.scale.set(size, size, size);
        
        // Random brightness
        star.material.opacity = 0.5 + Math.random() * 0.5;
    }

    update(deltaTime, intensity, warpFactor) {
        this.stars.forEach(star => {
            // Calculate distance from center
            const distance = star.position.length();
            
            // Stretch factor based on intensity and warp factor
            const stretchFactor = 1 + intensity * warpFactor * 2;
            
            // Apply stretching
            const direction = star.position.clone().normalize();
            const newPosition = direction.multiplyScalar(distance * stretchFactor);
            star.position.copy(newPosition);
            
            // Update size and opacity based on stretching
            const stretchRatio = newPosition.length() / distance;
            const newSize = star.scale.x * (1 + (stretchRatio - 1) * 0.5);
            star.scale.set(newSize, newSize, newSize);
            
            // Update opacity
            star.material.opacity = Math.min(1, star.material.opacity * (1 + (stretchRatio - 1) * 0.2));
            
            // Reset stars that are too far
            if (newPosition.length() > 5000) {
                this.resetStar(star);
            }
        });
    }
}

class LightSpeedTransition {
    constructor(scene) {
        this.scene = scene;
        this.tunnel = null;
        this.initializeTunnel();
    }

    initializeTunnel() {
        // Create tunnel geometry
        const geometry = new THREE.CylinderGeometry(1000, 1000, 2000, 32, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        
        this.tunnel = new THREE.Mesh(geometry, material);
        this.scene.add(this.tunnel);
    }

    update(deltaTime, intensity) {
        if (this.tunnel) {
            // Update tunnel opacity
            this.tunnel.material.opacity = intensity * 0.5;
            
            // Update tunnel scale
            const scale = 1 + intensity * 2;
            this.tunnel.scale.set(scale, scale, scale);
            
            // Rotate tunnel
            this.tunnel.rotation.z += deltaTime * 0.001;
            
            // Update color based on intensity
            const hue = 0.5 + intensity * 0.1; // Cyan to blue shift
            this.tunnel.material.color.setHSL(hue, 1, 0.5);
        }
    }
}

export default WarpEffects; 