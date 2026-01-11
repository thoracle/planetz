/**
 * Planet Editor Setup for the PlanetZ game.
 * Extracted from app.js - handles dat.gui planet editor controls.
 *
 * This module contains optional development/debugging functionality
 * for editing planets, oceans, atmosphere, and terraforming.
 */

import * as THREE from 'three';
import PlanetGenerator from '../planetGenerator.js';
import { Atmosphere } from '../Atmosphere.js';
import { Cloud } from '../Cloud.js';
import { debug } from '../debug.js';

// Planet type configuration (Star Trek classification)
export const PLANET_TYPES = ['Class-M', 'Class-L', 'Class-H', 'Class-D', 'Class-J', 'Class-K', 'Class-N', 'Class-Y'];

export const PLANET_DESCRIPTIONS = {
    'Class-M': 'Earth-like planet with nitrogen-oxygen atmosphere and liquid water',
    'Class-L': 'Marginally habitable planet with carbon dioxide atmosphere',
    'Class-H': 'Desert planet with hot, thin atmosphere',
    'Class-D': 'Moon-like planetoid with no atmosphere',
    'Class-J': 'Gas giant with thick hydrogen-helium atmosphere',
    'Class-K': 'Adaptable for habitation with terraforming',
    'Class-N': 'Sulfuric planet with thick atmosphere and high pressure',
    'Class-Y': 'Demon-class planet with toxic atmosphere and extreme temperatures'
};

export const PLANET_COLORS = {
    'Class-M': {
        base: 0x4a9eff, high: 0xffffff, low: 0x1a4a7f,
        detail: 0x2d5a8e, slope: 0x3a6ea5, roughness: 0.7,
        detailScale: 2.0, hasOceans: true,
        atmosphere: { color: new THREE.Vector3(0.18, 0.39, 0.89), rayleigh: 0.15, mieCoefficient: 0.005, mieDirectionalG: 0.85, sunIntensity: 2.5, scale: 1.1 }
    },
    'Class-L': {
        base: 0x8b4513, high: 0xd2691e, low: 0x3d1f0d,
        detail: 0x6b3419, slope: 0x7d4a2d, roughness: 0.8,
        detailScale: 2.5, hasOceans: true,
        atmosphere: { color: new THREE.Vector3(0.6, 0.3, 0.2), rayleigh: 0.25, mieCoefficient: 0.008, mieDirectionalG: 0.8, sunIntensity: 3.0, scale: 1.15 }
    },
    'Class-H': {
        base: 0xd2691e, high: 0xffd700, low: 0x8b4513,
        detail: 0xb3591a, slope: 0xc46b2d, roughness: 0.9,
        detailScale: 3.0, hasOceans: false,
        atmosphere: { color: new THREE.Vector3(0.8, 0.5, 0.2), rayleigh: 0.3, mieCoefficient: 0.01, mieDirectionalG: 0.75, sunIntensity: 4.0, scale: 1.08 }
    },
    'Class-D': {
        base: 0x800000, high: 0xff4500, low: 0x400000,
        detail: 0x600000, slope: 0x700000, roughness: 1.0,
        detailScale: 3.5, hasOceans: false,
        atmosphere: { color: new THREE.Vector3(0.7, 0.2, 0.1), rayleigh: 0.4, mieCoefficient: 0.015, mieDirectionalG: 0.7, sunIntensity: 3.5, scale: 1.2 }
    },
    'Class-J': {
        base: 0xffd700, high: 0xffffff, low: 0xdaa520,
        detail: 0xe6c200, slope: 0xf0d000, roughness: 0.6,
        detailScale: 1.5, hasOceans: false,
        atmosphere: { color: new THREE.Vector3(0.9, 0.7, 0.3), rayleigh: 0.5, mieCoefficient: 0.02, mieDirectionalG: 0.9, sunIntensity: 5.0, scale: 1.3 }
    },
    'Class-K': {
        base: 0xa0522d, high: 0xd2691e, low: 0x6b3419,
        detail: 0x8b4513, slope: 0x9c5a2d, roughness: 0.85,
        detailScale: 2.2, hasOceans: false,
        atmosphere: { color: new THREE.Vector3(0.4, 0.3, 0.2), rayleigh: 0.1, mieCoefficient: 0.003, mieDirectionalG: 0.8, sunIntensity: 2.0, scale: 1.05 }
    },
    'Class-N': {
        base: 0xdaa520, high: 0xffd700, low: 0x8b6914,
        detail: 0xc49b1a, slope: 0xd4ab2d, roughness: 0.75,
        detailScale: 1.8, hasOceans: false,
        atmosphere: { color: new THREE.Vector3(0.6, 0.6, 0.4), rayleigh: 0.35, mieCoefficient: 0.012, mieDirectionalG: 0.85, sunIntensity: 4.0, scale: 1.25 }
    },
    'Class-Y': {
        base: 0x8b0000, high: 0xff0000, low: 0x4d0000,
        detail: 0x6b0000, slope: 0x7d0000, roughness: 1.0,
        detailScale: 4.0, hasOceans: false,
        atmosphere: { color: new THREE.Vector3(0.8, 0.1, 0.1), rayleigh: 0.6, mieCoefficient: 0.025, mieDirectionalG: 0.65, sunIntensity: 6.0, scale: 1.4 }
    }
};

/**
 * Create default ocean parameters
 * @returns {Object} Ocean parameters
 */
export function createOceanParams() {
    return {
        enabled: true,
        wavesEnabled: true,
        depth: 0.03,
        color: 0x0077be,
        waveHeight: 0.02,
        waveSpeed: 1.0,
        waveFrequency: 2.0,
        foamThreshold: 0.7,
        foamIntensity: 0.5
    };
}

/**
 * Create water material with shader
 * @param {THREE.Scene} scene
 * @returns {THREE.MeshPhongMaterial}
 */
export function createWaterMaterial(scene) {
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x0077be,
        transparent: true,
        opacity: 0.8,
        shininess: 100,
        specular: 0x111111,
        envMap: scene.background,
        reflectivity: 0.5,
        side: THREE.DoubleSide,
        onBeforeCompile: (shader) => {
            shader.uniforms.foamColor = { value: new THREE.Color(0xffffff) };
            shader.uniforms.foamThreshold = { value: 0.7 };
            shader.uniforms.foamIntensity = { value: 0.5 };
            shader.uniforms.waveHeight = { value: 0.02 };
            shader.uniforms.waveTime = { value: 0 };

            shader.vertexShader = `
                varying vec3 vPosition;
                varying float vFoam;
                uniform float waveTime;
                uniform float waveHeight;
                uniform float foamThreshold;

                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vPosition = position;
                float wave = sin(waveTime + length(position) * 2.0) * waveHeight;
                float slope = 1.0 - abs(dot(normal, vec3(0.0, 1.0, 0.0)));
                vFoam = smoothstep(foamThreshold, 1.0, wave * slope);
                `
            );

            shader.fragmentShader = `
                varying vec3 vPosition;
                varying float vFoam;
                uniform vec3 foamColor;
                uniform float foamIntensity;

                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                vec3 foam = foamColor * vFoam * foamIntensity;
                diffuseColor.rgb = mix(diffuseColor.rgb, foam, vFoam);
                `
            );

            waterMaterial.userData.shader = shader;
        }
    });

    return waterMaterial;
}

/**
 * Create planet material
 * @returns {THREE.MeshPhongMaterial}
 */
export function createPlanetMaterial() {
    return new THREE.MeshPhongMaterial({
        vertexColors: true,
        shininess: 15,
        flatShading: true
    });
}

/**
 * Create planet generator
 * @returns {PlanetGenerator}
 */
export function createPlanetGenerator() {
    return new PlanetGenerator(64);
}

/**
 * Planet Editor class for managing planet editing GUI
 */
export class PlanetEditor {
    constructor(scene, camera, uiContainer) {
        this.scene = scene;
        this.camera = camera;
        this.uiContainer = uiContainer;

        this.planetGenerator = createPlanetGenerator();
        this.material = createPlanetMaterial();
        this.waterMaterial = createWaterMaterial(scene);
        this.oceanParams = createOceanParams();

        this.currentType = 'Class-M';
        this.waveTime = 0;
        this.waveVertices = [];

        this.gui = null;
        this.guiContainer = null;
        this.planet = null;
        this.atmosphere = null;
        this.clouds = null;
        this.light = null;

        this.geometryParams = {
            subdivisionLevel: 4,
            radius: 1
        };
    }

    /**
     * Initialize the planet editor (call after scene is set up)
     * @param {dat.GUI} gui - dat.gui instance
     * @param {HTMLElement} guiContainer
     */
    initialize(gui, guiContainer) {
        this.gui = gui;
        this.guiContainer = guiContainer;

        // Create initial geometry
        const geometry = new THREE.IcosahedronGeometry(
            this.geometryParams.radius,
            this.geometryParams.subdivisionLevel
        );

        // Create planet mesh
        this.planet = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.planet);

        // Set up lighting
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(5, 3, 5);
        this.scene.add(this.light);
        this.scene.add(new THREE.AmbientLight(0x404040));

        // Create atmosphere and clouds
        this.atmosphere = new Atmosphere(this.scene, this.camera, this.planet, this.light);
        this.clouds = new Cloud(this.scene, this.planet);

        debug('UTILITY', 'Planet editor initialized');
    }

    /**
     * Update method called each frame
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this.planet) return;

        // Update wave animation if enabled
        if (this.oceanParams.enabled && this.oceanParams.wavesEnabled && this.planet.oceanMesh) {
            this.waveTime += 0.01 * this.oceanParams.waveSpeed;

            if (this.waterMaterial.userData.shader) {
                this.waterMaterial.userData.shader.uniforms.waveTime.value = this.waveTime;
                this.waterMaterial.userData.shader.uniforms.waveHeight.value = this.oceanParams.waveHeight;
            }
        }

        // Update clouds
        if (this.clouds) {
            this.clouds.update();
            if (this.light) {
                this.clouds.setSunDirection(this.light.position);
            }
        }

        // Update atmosphere
        if (this.atmosphere && this.light) {
            this.atmosphere.setSunPosition(this.light.position);
            this.atmosphere.update(this.camera);
        }

        // Update chunk manager
        if (this.planetGenerator && this.planetGenerator.chunkManager) {
            const now = Date.now();
            if (!this.planetGenerator.chunkManager.lastUpdateTime ||
                now - this.planetGenerator.chunkManager.lastUpdateTime > 100) {
                this.planetGenerator.chunkManager.updateSceneRepresentation(this.camera);
                this.planetGenerator.chunkManager.lastUpdateTime = now;
            }
        }
    }
}
