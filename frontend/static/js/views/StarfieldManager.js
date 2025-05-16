import * as THREE from 'three';

export class StarfieldManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.maxSpeed = 9;
        this.acceleration = 2.0; // Units per second
        this.deceleration = 1.5; // Units per second
        this.energy = 9999;
        this.velocity = new THREE.Vector3();
        this.rotationSpeed = 2.0; // Radians per second
        this.cameraDirection = new THREE.Vector3();
        this.cameraRight = new THREE.Vector3();
        this.cameraUp = new THREE.Vector3();
        this.mouseSensitivity = 0.002;
        this.mouseRotation = new THREE.Vector2();
        this.isMouseLookEnabled = true;
        this.view = 'FORE'; // Add view state - can be 'FORE' or 'AFT'
        
        // Create starfield with quadruple density
        this.starCount = 8000;  // Doubled again from 4000
        this.starfield = this.createStarfield();
        this.scene.add(this.starfield);
        
        // Create speed indicator
        this.createSpeedIndicator();
        
        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.starCount * 3);
        const colors = new Float32Array(this.starCount * 3);
        const sizes = new Float32Array(this.starCount);
        
        // Create sprite texture for stars
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        const sprite = new THREE.Texture(canvas);
        sprite.needsUpdate = true;
        
        for (let i = 0; i < this.starCount; i++) {
            // Random position in a large sphere around the camera
            const radius = 100 + Math.random() * 900; // Stars between 100 and 1000 units away
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Brighter white colors with slight blue tint
            const brightness = 0.9 + Math.random() * 0.1; // Much brighter base
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = brightness + 0.1; // Slight blue tint
            
            // Larger, more varied sizes
            sizes[i] = (1 + Math.random() * 3) * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            map: sprite,
            depthWrite: false
        });
        
        return new THREE.Points(geometry, material);
    }

    createSpeedIndicator() {
        // Create individual boxes for each stat in the correct order: Energy, View, Speed
        const stats = ['Energy', 'View', 'Speed'].map((label, index) => {
            const box = document.createElement('div');
            box.style.cssText = `
                position: fixed;
                top: 10px;
                color: #00ff41;
                font-family: "Courier New", monospace;
                font-size: 20px;
                text-align: ${index === 0 ? 'left' : index === 1 ? 'center' : 'right'};
                pointer-events: none;
                z-index: 1000;
                ${index === 0 ? 'left: 10px;' : index === 1 ? 'left: 50%; transform: translateX(-50%);' : 'right: 10px;'}
                border: 1px solid #00ff41;
                padding: 5px 10px;
                min-width: 120px;
                background: rgba(0, 0, 0, 0.5);
            `;
            return box;
        });
        
        this.energyBox = stats[0];
        this.viewBox = stats[1];
        this.speedBox = stats[2];
        
        stats.forEach(box => document.body.appendChild(box));

        this.updateSpeedIndicator();
    }

    updateSpeedIndicator() {
        // Convert speed to impulse format
        let speedText;
        const currentSpeedLevel = Math.round(this.currentSpeed);
        
        if (currentSpeedLevel === 0) {
            speedText = "Full Stop";
        } else {
            // Display the exact impulse number matching the key pressed
            speedText = `Impulse ${currentSpeedLevel}`;
        }
        
        this.speedBox.textContent = `Speed: ${speedText}`;
        this.energyBox.textContent = `Energy: ${this.energy}`;
        this.viewBox.textContent = `View: ${this.view}`;
    }

    bindKeyEvents() {
        // Track which keys are currently pressed
        this.keysPressed = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false
        };

        document.addEventListener('keydown', (event) => {
            // Speed control (0-9)
            if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[0-9]$/.test(event.key)) {
                this.targetSpeed = parseInt(event.key);
                return;
            }
            
            // Track arrow key states
            if (event.key in this.keysPressed) {
                this.keysPressed[event.key] = true;
                event.preventDefault();
            }
        });

        document.addEventListener('keyup', (event) => {
            // Update key states
            if (event.key in this.keysPressed) {
                this.keysPressed[event.key] = false;
                event.preventDefault();
            }
        });
    }

    bindMouseEvents() {
        document.addEventListener('mousemove', (event) => {
            if (this.isMouseLookEnabled && event.buttons === 1) { // Left mouse button
                this.mouseRotation.x -= event.movementX * this.mouseSensitivity;
                this.mouseRotation.y -= event.movementY * this.mouseSensitivity;
                
                // Clamp vertical rotation
                this.mouseRotation.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseRotation.y));
                
                // Apply rotation to camera
                const euler = new THREE.Euler(this.mouseRotation.y, this.mouseRotation.x, 0, 'YXZ');
                this.camera.quaternion.setFromEuler(euler);
            }
        });
    }

    update(deltaTime) {
        if (!deltaTime) deltaTime = 1/60;
        
        // Update speed with acceleration/deceleration
        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + this.acceleration * deltaTime);
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - this.deceleration * deltaTime);
        }
        
        // Update speed indicator
        this.updateSpeedIndicator();
        
        // Handle rotation based on arrow keys
        if (this.keysPressed.ArrowLeft) {
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(this.camera.up, this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }
        if (this.keysPressed.ArrowRight) {
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(this.camera.up, -this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }
        if (this.keysPressed.ArrowUp) {
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(right, -this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }
        if (this.keysPressed.ArrowDown) {
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(right, this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }

        // Get camera orientation vectors
        this.camera.getWorldDirection(this.cameraDirection);
        
        // Move based on current speed and view
        if (this.currentSpeed > 0) {
            // Calculate movement - direction based on view
            const moveDirection = this.view === 'AFT' ? -1 : 1;
            
            // Apply speed multipliers based on impulse level
            let speedMultiplier = 1;
            switch (Math.round(this.currentSpeed)) {
                case 9: speedMultiplier = 5.0; break;   // 5x faster
                case 8: speedMultiplier = 4.0; break;   // 4x faster
                case 7: speedMultiplier = 3.0; break;   // 3x faster
                case 6: speedMultiplier = 2.0; break;   // 2x faster
                case 5: speedMultiplier = 1.5; break;   // 1.5x faster
                case 4: speedMultiplier = 1.25; break;  // 1.25x faster
                default: speedMultiplier = 1.0;         // normal speed
            }
            
            this.velocity.copy(this.cameraDirection).multiplyScalar(this.currentSpeed * deltaTime * speedMultiplier * moveDirection);
            
            // Move camera
            this.camera.position.add(this.velocity);
            this.camera.updateMatrixWorld();
            
            // Update starfield
            const positions = this.starfield.geometry.attributes.position;
            const cameraPos = this.camera.position;
            
            for (let i = 0; i < this.starCount; i++) {
                const i3 = i * 3;
                const starPos = new THREE.Vector3(
                    positions.array[i3],
                    positions.array[i3 + 1],
                    positions.array[i3 + 2]
                );
                
                // If star is too far, reset it closer to the camera
                if (starPos.distanceTo(cameraPos) > 1000) {
                    // Reset star to a random position in a sphere around the camera
                    const radius = 100;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos((Math.random() * 2) - 1);
                    
                    positions.array[i3] = cameraPos.x + radius * Math.sin(phi) * Math.cos(theta);
                    positions.array[i3 + 1] = cameraPos.y + radius * Math.sin(phi) * Math.sin(theta);
                    positions.array[i3 + 2] = cameraPos.z + radius * Math.cos(phi);
                }
                
                // Move star based on velocity (creates motion effect)
                positions.array[i3] -= this.velocity.x;
                positions.array[i3 + 1] -= this.velocity.y;
                positions.array[i3 + 2] -= this.velocity.z;
            }
            
            positions.needsUpdate = true;
            
            // Update star sizes based on speed
            const sizes = this.starfield.geometry.attributes.size;
            const speedFactor = this.currentSpeed / this.maxSpeed;
            for (let i = 0; i < this.starCount; i++) {
                sizes.array[i] = (1 + speedFactor * 2) * Math.random() * 2;
            }
            sizes.needsUpdate = true;
        }
    }

    dispose() {
        // Clean up UI elements
        if (this.speedBox && this.speedBox.parentNode) {
            this.speedBox.parentNode.removeChild(this.speedBox);
        }
        if (this.energyBox && this.energyBox.parentNode) {
            this.energyBox.parentNode.removeChild(this.energyBox);
        }
        if (this.viewBox && this.viewBox.parentNode) {
            this.viewBox.parentNode.removeChild(this.viewBox);
        }
        if (this.starfield) {
            this.scene.remove(this.starfield);
            this.starfield.geometry.dispose();
            this.starfield.material.dispose();
        }
    }

    // Add this method to create the star sprite texture
    createStarSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        return canvas;
    }

    // Add method to update view state from ViewManager
    setView(viewType) {
        this.view = viewType.toUpperCase();
        this.updateSpeedIndicator();
    }
} 