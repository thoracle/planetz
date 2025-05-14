import * as THREE from 'three';
import { CloudShader } from './shaders/clouds.js';

export class Cloud {
    // Permutation table
    p = new Array(512);

    constructor(planetRadius = 1.0, cloudScale = 1.02) {
        console.log('Initializing Cloud system...');
        
        // Initialize permutation table first
        this.initPermutationTable();

        // Store initial parameters
        this.planetRadius = planetRadius;
        this.cloudScale = cloudScale;

        // Create geometry for cloud layer (slightly larger than planet)
        // Increase the scale to lift clouds higher above terrain
        this.cloudScale = 1.05;  // Increased from 1.02
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
                sunDirection: { value: new THREE.Vector3(5, 5, 5) },
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
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendSrcAlpha: THREE.SrcAlphaFactor,
            blendDstAlpha: THREE.OneMinusSrcAlphaFactor
        });

        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Set render order to ensure proper transparency
        // Ensure clouds render after terrain but before atmosphere
        this.mesh.renderOrder = 1;  // Changed from 2
        
        // Set default parameters
        this.setPlanetRadius(planetRadius);
        this.setCoverage(0.5);
        this.setDensity(0.5);
        
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
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size * 4; i += 4) {
            const x = (i / 4) % size;
            const y = Math.floor((i / 4) / size);
            
            // Use multiple frequencies for more natural cloud shapes
            const frequencies = [4, 8, 16];
            let value = 0;
            
            // Layer multiple noise frequencies
            for (let f = 0; f < frequencies.length; f++) {
                const frequency = frequencies[f];
                const nx = x / size * frequency;
                const ny = y / size * frequency;
                
                let layerValue = 0;
                let amplitude = 1.0 / (f + 1);  // Decrease amplitude for higher frequencies
                
                // Add multiple octaves for each frequency
                for (let o = 0; o < 3; o++) {
                    const freq = Math.pow(2, o);
                    layerValue += this.noise2D(nx * freq, ny * freq) * amplitude;
                    amplitude *= 0.5;
                }
                
                value += layerValue;
            }
            
            // Normalize to 0-1 range
            value = (value + frequencies.length) / (frequencies.length * 2);
            
            // Add contrast and shape
            value = Math.pow(value, 1.7);  // Sharpen cloud edges
            value = Math.max(0, Math.min(1, value * 1.3 - 0.15));  // Increase contrast
            
            const pixel = Math.floor(value * 255);
            data[i] = pixel;     // R
            data[i + 1] = pixel; // G
            data[i + 2] = pixel; // B
            data[i + 3] = 255;   // A
        }
        
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        return texture;
    }

    generateNoiseTexture() {
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size * 4; i += 4) {
            const x = (i / 4) % size;
            const y = Math.floor((i / 4) / size);
            
            // Use Perlin noise instead of random for smoother variation
            const nx = x / size * 8;
            const ny = y / size * 8;
            let value = this.noise2D(nx, ny);
            
            // Add a second octave
            value += this.noise2D(nx * 2, ny * 2) * 0.5;
            
            // Normalize and add contrast
            value = (value + 1.5) / 3;
            value = Math.pow(value, 1.2);
            
            const pixel = Math.floor(value * 255);
            data[i] = pixel;     // R
            data[i + 1] = pixel; // G
            data[i + 2] = pixel; // B
            data[i + 3] = 255;   // A
        }
        
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
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