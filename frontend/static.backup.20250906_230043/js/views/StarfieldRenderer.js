/**
 * StarfieldRenderer - Handles all starfield creation and management
 * 
 * This class is responsible for:
 * - Creating the main starfield with configurable star count
 * - Managing star sprites and textures
 * - Providing fallback starfield creation
 * - Handling starfield recreation and updates
 * - Managing individual star positioning and properties
 * 
 * Extracted from StarfieldManager to improve code organization and maintainability.
 */
export class StarfieldRenderer {
    constructor(scene, THREE, starCount = 50000) {
        this.scene = scene;
        this.THREE = THREE;
        this.starCount = starCount;
        this.starfield = null;
        
        console.log('🌟 StarfieldRenderer initialized with', starCount, 'stars');
    }

    /**
     * Create the main starfield with procedurally generated stars
     * @returns {THREE.Points} The starfield mesh
     */
    createStarfield() {
        try {
            // Validate star count before proceeding
            if (typeof this.starCount !== 'number' || isNaN(this.starCount)) {
                console.warn('Invalid starCount:', this.starCount, 'falling back to 5000');
                this.starCount = 5000;
            }

            // Ensure minimum and maximum values for star count
            const validStarCount = Math.max(5000, Math.min(500000, Math.floor(this.starCount)));
            if (validStarCount !== this.starCount) {
                this.starCount = validStarCount;
            }

            const geometry = new this.THREE.BufferGeometry();
            const positions = new Float32Array(validStarCount * 3);
            const colors = new Float32Array(validStarCount * 3);
            const sizes = new Float32Array(validStarCount);
            
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
            
            const sprite = new this.THREE.Texture(canvas);
            sprite.needsUpdate = true;

            let validVertices = 0;
            const minRadius = 100;
            const maxRadius = 1000;
            
            // Create all star positions
            for (let i = 0; i < validStarCount; i++) {
                try {
                    // Generate random spherical coordinates
                    const radius = minRadius + Math.random() * (maxRadius - minRadius);
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos((Math.random() * 2) - 1);
                    
                    // Convert to Cartesian coordinates
                    const x = radius * Math.sin(phi) * Math.cos(theta);
                    const y = radius * Math.sin(phi) * Math.sin(theta);
                    const z = radius * Math.cos(phi);
                    
                    // Validate each coordinate
                    if (!isFinite(x) || !isFinite(y) || !isFinite(z) ||
                        isNaN(x) || isNaN(y) || isNaN(z)) {
                        throw new Error('Invalid coordinate calculation');
                    }
                    
                    // Store valid position
                    positions[validVertices * 3] = x;
                    positions[validVertices * 3 + 1] = y;
                    positions[validVertices * 3 + 2] = z;
                    
                    // Set color (brighter white with slight blue tint)
                    const brightness = 0.9 + Math.random() * 0.1;
                    colors[validVertices * 3] = brightness;
                    colors[validVertices * 3 + 1] = brightness;
                    colors[validVertices * 3 + 2] = brightness + 0.1;
                    
                    // Set size
                    sizes[validVertices] = (1 + Math.random() * 3) * 2;
                    
                    validVertices++;
                } catch (error) {
                    console.warn('Failed to create vertex', i, error);
                    continue;
                }
            }
            
            // If we have no valid vertices, throw error
            if (validVertices === 0) {
                throw new Error('No valid vertices created');
            }
            
            // Trim arrays to actual size if needed
            if (validVertices < validStarCount) {
                console.warn(`Created ${validVertices} valid stars out of ${validStarCount} attempted`);
                const trimmedPositions = new Float32Array(positions.buffer, 0, validVertices * 3);
                const trimmedColors = new Float32Array(colors.buffer, 0, validVertices * 3);
                const trimmedSizes = new Float32Array(sizes.buffer, 0, validVertices);
                
                geometry.setAttribute('position', new this.THREE.BufferAttribute(trimmedPositions, 3));
                geometry.setAttribute('color', new this.THREE.BufferAttribute(trimmedColors, 3));
                geometry.setAttribute('size', new this.THREE.BufferAttribute(trimmedSizes, 1));
            } else {
                geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
            }
            
            // Verify geometry before creating mesh
            geometry.computeBoundingSphere();
            if (!geometry.boundingSphere || isNaN(geometry.boundingSphere.radius)) {
                throw new Error('Failed to compute valid bounding sphere');
            }
            
            const material = new this.THREE.PointsMaterial({
                size: 1,
                vertexColors: true,
                transparent: true,
                opacity: 1,
                sizeAttenuation: true,
                blending: this.THREE.AdditiveBlending,
                map: sprite,
                depthWrite: false
            });
            
            return new this.THREE.Points(geometry, material);
            
        } catch (error) {
            console.error('Error in createStarfield:', error);
            // Create a minimal fallback starfield
            return this.createFallbackStarfield();
        }
    }

    /**
     * Create a fallback starfield with simpler geometry
     * @returns {THREE.Points} The fallback starfield mesh
     */
    createFallbackStarfield() {
        const geometry = new this.THREE.BufferGeometry();
        const positions = new Float32Array(5000 * 3);
        const colors = new Float32Array(5000 * 3);
        const sizes = new Float32Array(5000);

        // Create a simple cube distribution of stars
        for (let i = 0; i < 5000; i++) {
            // Position stars in a cube formation (-500 to 500 on each axis)
            positions[i * 3] = (Math.random() - 0.5) * 1000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;

            // White color
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;

            // Uniform size
            sizes[i] = 2;
        }

        geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));

        const material = new this.THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true,
            depthWrite: false
        });

        return new this.THREE.Points(geometry, material);
    }

    /**
     * Create a star sprite texture for enhanced visual effects
     * @returns {HTMLCanvasElement} The star sprite canvas
     */
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

    /**
     * Create a star-shaped geometry for wireframe display
     * @param {number} radius - The radius of the star
     * @returns {THREE.BufferGeometry} - The star geometry
     */
    createStarGeometry(radius) {
        const geometry = new this.THREE.BufferGeometry();
        const vertices = [];
        
        // Create a simpler 3D star with radiating lines from center
        const numPoints = 8; // Number of star points
        const center = [0, 0, 0];
        
        // Create star points radiating outward in multiple directions
        const directions = [
            // Primary axes
            [1, 0, 0], [-1, 0, 0],    // X axis
            [0, 1, 0], [0, -1, 0],    // Y axis  
            [0, 0, 1], [0, 0, -1],    // Z axis
            
            // Diagonal directions for more star-like appearance
            [0.707, 0.707, 0], [-0.707, -0.707, 0],     // XY diagonal
            [0.707, 0, 0.707], [-0.707, 0, -0.707],     // XZ diagonal
            [0, 0.707, 0.707], [0, -0.707, -0.707],     // YZ diagonal
            
            // Additional points for fuller star shape
            [0.577, 0.577, 0.577], [-0.577, -0.577, -0.577],  // 3D diagonals
            [0.577, -0.577, 0.577], [-0.577, 0.577, -0.577],
        ];
        
        // Create lines from center to each star point
        directions.forEach(direction => {
            // Line from center to outer point
            vertices.push(center[0], center[1], center[2]);
            vertices.push(
                direction[0] * radius,
                direction[1] * radius, 
                direction[2] * radius
            );
        });
        
        // Create some connecting lines between points for more complex star pattern
        const outerPoints = directions.map(dir => [
            dir[0] * radius,
            dir[1] * radius,
            dir[2] * radius
        ]);
        
        // Connect some outer points to create star pattern
        for (let i = 0; i < 6; i += 2) {
            // Connect opposite primary axis points
            vertices.push(outerPoints[i][0], outerPoints[i][1], outerPoints[i][2]);
            vertices.push(outerPoints[i + 1][0], outerPoints[i + 1][1], outerPoints[i + 1][2]);
        }
        
        // Convert vertices array to Float32Array and set as position attribute
        const vertexArray = new Float32Array(vertices);
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertexArray, 3));
        
        return geometry;
    }

    /**
     * Reset a star to a random position within the starfield radius
     * @param {THREE.Object3D} star - The star object to reset
     */
    resetStar(star) {
        // Reset star to a random position within the starfield radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 1000 * Math.random();

        star.position.x = radius * Math.sin(phi) * Math.cos(theta);
        star.position.y = radius * Math.sin(phi) * Math.sin(theta);
        star.position.z = radius * Math.cos(phi);
    }

    /**
     * Recreate the starfield with new density
     * @param {number} newStarCount - Optional new star count
     */
    recreateStarfield(newStarCount = null) {
        // Update star count if provided
        if (newStarCount !== null) {
            this.starCount = newStarCount;
        }
        
        // Remove old starfield
        if (this.starfield) {
            this.scene.remove(this.starfield);
            if (this.starfield.geometry) {
                this.starfield.geometry.dispose();
            }
            if (this.starfield.material) {
                this.starfield.material.dispose();
            }
        }
        
        // Create new starfield with updated star count
        try {
            this.starfield = this.createStarfield();
            if (this.starfield) {
                this.scene.add(this.starfield);
                console.log('🌟 Starfield recreated with', this.starCount, 'stars');
            }
        } catch (error) {
            console.error('Error recreating starfield:', error);
            // Fallback to minimum star count if there's an error
            this.starCount = 5000;
            this.starfield = this.createStarfield();
            this.scene.add(this.starfield);
        }
    }

    /**
     * Initialize the starfield and add it to the scene
     * @returns {THREE.Points} The created starfield
     */
    initialize() {
        this.starfield = this.createStarfield();
        if (this.starfield) {
            this.scene.add(this.starfield);
            console.log('🌟 Starfield initialized and added to scene');
        }
        return this.starfield;
    }

    /**
     * Update the star count and recreate if needed
     * @param {number} newStarCount - The new star count
     */
    setStarCount(newStarCount) {
        if (newStarCount !== this.starCount) {
            this.starCount = newStarCount;
            this.recreateStarfield();
        }
    }

    /**
     * Get the current starfield mesh
     * @returns {THREE.Points} The current starfield
     */
    getStarfield() {
        return this.starfield;
    }

    /**
     * Get the current star count
     * @returns {number} The current star count
     */
    getStarCount() {
        return this.starCount;
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.starfield) {
            this.scene.remove(this.starfield);
            if (this.starfield.geometry) {
                this.starfield.geometry.dispose();
            }
            if (this.starfield.material) {
                this.starfield.material.dispose();
            }
            this.starfield = null;
        }
        console.log('🌟 StarfieldRenderer disposed');
    }
} 