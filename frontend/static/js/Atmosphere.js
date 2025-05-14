import * as THREE from 'three';
import { AtmosphereShader } from './shaders/atmosphere.js';

export class Atmosphere {
    constructor(planetRadius = 1.0, atmosphereScale = 1.1) {
        // Create geometry for atmosphere (slightly larger than planet)
        this.geometry = new THREE.IcosahedronGeometry(planetRadius * atmosphereScale, 4);
        
        // Create material with custom shader
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                ...AtmosphereShader.uniforms,
                sunPosition: { value: new THREE.Vector3(5, 5, 5) },
                rayleighColor: { value: new THREE.Vector3(0.18, 0.39, 0.89) }
            },
            vertexShader: AtmosphereShader.vertexShader,
            fragmentShader: AtmosphereShader.fragmentShader,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor
        });

        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Set default parameters
        this.setPlanetRadius(planetRadius);
        this.setAtmosphereRadius(planetRadius * atmosphereScale);
        
        // Set initial values for better visibility
        this.setRayleigh(0.15);
        this.setMieCoefficient(0.005);
        this.setMieDirectionalG(0.85);
        this.setSunIntensity(2.5);
    }

    setPlanetRadius(radius) {
        this.material.uniforms.planetRadius.value = radius;
    }

    setAtmosphereRadius(radius) {
        this.material.uniforms.atmosphereRadius.value = radius;
    }

    setSunPosition(position) {
        this.material.uniforms.sunPosition.value.copy(position);
    }

    setRayleigh(value) {
        this.material.uniforms.rayleigh.value = value;
    }

    setMieCoefficient(value) {
        this.material.uniforms.mieCoefficient.value = value;
    }

    setMieDirectionalG(value) {
        this.material.uniforms.mieDirectionalG.value = value;
    }

    setSunIntensity(value) {
        this.material.uniforms.sunIntensity.value = value;
    }

    setRayleighColor(color) {
        this.material.uniforms.rayleighColor.value.copy(color);
    }

    update(camera) {
        // Update any time-based or camera-based effects here if needed
        this.mesh.position.copy(camera.position);
    }
} 