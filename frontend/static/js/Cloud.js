import * as THREE from 'three';
import { CloudShader } from './shaders/clouds.js';

export class Cloud {
    // Permutation table
    p = new Array(512);

    constructor(planetRadius = 1.0, cloudScale = 1.06) {
        console.log('Initializing Cloud system...');
        
        // Initialize permutation table first
        this.initPermutationTable();

        // Store initial parameters
        this.planetRadius = planetRadius;
        this.cloudScale = cloudScale;

        // Create geometry for cloud layer (slightly larger than planet)
        this.geometry = new THREE.IcosahedronGeometry(planetRadius * this.cloudScale, 4);
        
        // Create noise textures
        console.log('Generating cloud textures...');
        this.cloudTexture = this.generateCloudTexture();
        this.noiseTexture = this.generateNoiseTexture();
        
        // Create material with custom shader
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                cloudTexture: { value: this.cloudTexture },
                noiseTexture: { value: this.noiseTexture },
                coverage: { value: 0.5 },
                density: { value: 0.5 },
                time: { value: 0.0 },
                planetRadius: { value: planetRadius },
                sunDirection: { value: new THREE.Vector3(5, 5, 5).normalize() },
                cloudColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                cloudSpeed: { value: 1.0 },
                turbulence: { value: 1.0 }
            },
            vertexShader: CloudShader.vertexShader,
            fragmentShader: CloudShader.fragmentShader,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor
        });

        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Set render order to ensure proper transparency
        this.mesh.renderOrder = 2;  // Clouds should render second
        
        // Set default parameters with slightly adjusted values for better visuals
        this.setPlanetRadius(planetRadius);
        this.setCoverage(0.6);  // Slightly higher default coverage
        this.setDensity(0.4);   // Slightly lower default density for more variation
        this.setCloudColor(new THREE.Vector3(0.98, 0.98, 1.0));  // Slightly blue-tinted white
        
        // Initialize time
        this.time = 0;
        
        console.log('Cloud system initialized:', {
            geometry: {
                vertices: this.geometry.attributes.position.count,
                radius: planetRadius * this.cloudScale
            },
            textures: {
                cloudTexture: this.cloudTexture ? 'created' : 'failed',
                noiseTexture: this.noiseTexture ? 'created' : 'failed'
            },
            material: {
                uniforms: this.material.uniforms
            }
        });
    }

    generateCloudTexture() {
        const size = 512;  // Increased from 256 for better detail
        const data = new Uint8Array(size * size * 4);
        const frequencies = [2, 4, 8, 16];  // Define frequencies at the start
        
        // Create Gaussian blur function
        const gaussianBlur = (x, y, sigma) => {
            return Math.exp(-(x * x + y * y) / (2.0 * sigma * sigma)) / (2.0 * Math.PI * sigma * sigma);
        };
        
        // Generate base noise
        const baseNoise = new Array(size * size);
        for (let i = 0; i < size * size; i++) {
            const x = i % size;
            const y = Math.floor(i / size);
            
            // Use multiple frequencies for more natural cloud shapes
            let value = 0;
            
            // Layer multiple noise frequencies with smoother blending
            for (let f = 0; f < frequencies.length; f++) {
                const frequency = frequencies[f];
                const nx = x / size * frequency;
                const ny = y / size * frequency;
                
                let layerValue = 0;
                let amplitude = 1.0 / Math.pow(2, f);  // Smoother amplitude falloff
                
                // Add multiple octaves for each frequency
                for (let o = 0; o < 4; o++) {  // Increased octaves
                    const freq = Math.pow(2, o);
                    layerValue += this.noise2D(nx * freq, ny * freq) * amplitude;
                    amplitude *= 0.6;  // Gentler amplitude reduction
                }
                
                value += layerValue;
            }
            
            baseNoise[i] = value;
        }
        
        // Apply Gaussian blur for softer edges
        const blurRadius = 3;
        const blurSigma = 1.5;
        
        for (let i = 0; i < size * size * 4; i += 4) {
            const x = (i / 4) % size;
            const y = Math.floor((i / 4) / size);
            
            let blurredValue = 0;
            let weightSum = 0;
            
            // Apply blur kernel
            for (let bx = -blurRadius; bx <= blurRadius; bx++) {
                for (let by = -blurRadius; by <= blurRadius; by++) {
                    const sampleX = (x + bx + size) % size;
                    const sampleY = (y + by + size) % size;
                    const weight = gaussianBlur(bx, by, blurSigma);
                    
                    blurredValue += baseNoise[sampleY * size + sampleX] * weight;
                    weightSum += weight;
                }
            }
            
            let value = blurredValue / weightSum;
            
            // Normalize to 0-1 range
            value = (value + frequencies.length) / (frequencies.length * 2);
            
            // Add contrast and shape for puffiness
            value = Math.pow(value, 1.5);  // Softer power for gentler contrast
            value = Math.max(0, Math.min(1, value * 1.2));  // Subtle contrast boost
            
            // Add subtle variation for more natural look
            const variation = this.noise2D(x / size * 4, y / size * 4) * 0.1;
            value = Math.max(0, Math.min(1, value + variation));
            
            const pixel = Math.floor(value * 255);
            data[i] = pixel;     // R
            data[i + 1] = pixel; // G
            data[i + 2] = pixel; // B
            data[i + 3] = 255;   // A
        }
        
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;  // Enable texture filtering
        texture.minFilter = THREE.LinearMipmapLinearFilter;  // Enable mipmapping
        texture.generateMipmaps = true;  // Generate mipmaps for better scaling
        texture.needsUpdate = true;
        return texture;
    }

    generateNoiseTexture() {
        const size = 512;  // Increased from 256 for better detail
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size * 4; i += 4) {
            const x = (i / 4) % size;
            const y = Math.floor((i / 4) / size);
            
            // Use multiple octaves of Perlin noise for smoother variation
            const nx = x / size * 8;
            const ny = y / size * 8;
            let value = 0;
            let amplitude = 1.0;
            
            // Add multiple octaves with gentler falloff
            for (let o = 0; o < 4; o++) {
                const freq = Math.pow(2, o);
                value += this.noise2D(nx * freq, ny * freq) * amplitude;
                amplitude *= 0.65;  // Gentler amplitude reduction
            }
            
            // Normalize and add subtle contrast
            value = (value + 1.5) / 3;
            value = Math.pow(value, 1.2);  // Gentle contrast adjustment
            
            const pixel = Math.floor(value * 255);
            data[i] = pixel;     // R
            data[i + 1] = pixel; // G
            data[i + 2] = pixel; // B
            data[i + 3] = 255;   // A
        }
        
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;  // Enable texture filtering
        texture.minFilter = THREE.LinearMipmapLinearFilter;  // Enable mipmapping
        texture.generateMipmaps = true;  // Generate mipmaps for better scaling
        texture.needsUpdate = true;
        return texture;
    }

    noise2D(x, y) {
        // Simple 2D noise function
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;
        
        return this.lerp(v,
            this.lerp(u,
                this.grad(this.p[A], x, y),
                this.grad(this.p[B], x - 1, y)
            ),
            this.lerp(u,
                this.grad(this.p[A + 1], x, y - 1),
                this.grad(this.p[B + 1], x - 1, y - 1)
            )
        );
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 15;
        const grad_x = 1 + (h & 7);  // Gradient value from 1-8
        const grad_y = 1 + (h >> 3);  // Gradient value from 1-8
        return ((h & 1) ? grad_x : -grad_x) * x + ((h & 2) ? grad_y : -grad_y) * y;
    }

    initPermutationTable() {
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        for (let i = 0; i < 256; i++) {
            this.p[i + 256] = this.p[i];
        }
    }

    setPlanetRadius(radius) {
        this.material.uniforms.planetRadius.value = radius;
        this.material.needsUpdate = true;
    }

    setCoverage(value) {
        console.log('Setting cloud coverage:', value);
        this.material.uniforms.coverage.value = value;
        this.material.needsUpdate = true;
    }

    setDensity(value) {
        console.log('Setting cloud density:', value);
        this.material.uniforms.density.value = value;
        this.material.needsUpdate = true;
    }

    setSunDirection(direction) {
        this.material.uniforms.sunDirection.value.copy(direction);
        this.material.needsUpdate = true;
    }

    setCloudColor(color) {
        console.log('Setting cloud color:', color);
        this.material.uniforms.cloudColor.value.copy(color);
        this.material.needsUpdate = true;
    }

    setCloudSpeed(value) {
        console.log('Setting cloud speed:', value);
        // Apply exponential scaling for more dramatic high speeds
        this.material.uniforms.cloudSpeed.value = value;
        this.material.needsUpdate = true;
    }

    setTurbulence(value) {
        console.log('Setting cloud turbulence:', value);
        // Apply exponential scaling for more dramatic turbulence
        this.material.uniforms.turbulence.value = Math.pow(value, 1.5);
        this.material.needsUpdate = true;
    }

    update() {
        // Update time-based effects with more dramatic scaling
        // Increase time increment for faster base movement
        this.time += 0.002;  // Doubled from 0.001
        
        // Apply non-linear scaling to make high speeds more dramatic
        const speedScale = Math.pow(this.material.uniforms.cloudSpeed.value, 2.0);
        this.material.uniforms.time.value = this.time * speedScale;
        
        // Ensure cloud layer maintains proper scale relative to planet
        const scale = this.cloudScale;
        if (this.mesh.scale.x !== scale) {
            this.mesh.scale.set(scale, scale, scale);
        }
    }
} 