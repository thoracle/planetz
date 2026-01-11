/**
 * Scene Setup for the PlanetZ game.
 * Extracted from app.js to reduce file size and improve modularity.
 *
 * Handles:
 * - Three.js scene, camera, and renderer creation
 * - OrbitControls initialization
 * - UI container creation
 * - Resize handling
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { debug } from '../debug.js';

/**
 * Scene setup result object
 * @typedef {Object} SceneSetupResult
 * @property {THREE.Scene} scene - The Three.js scene
 * @property {THREE.PerspectiveCamera} camera - The camera
 * @property {THREE.WebGLRenderer} renderer - The WebGL renderer
 * @property {OrbitControls} controls - Orbit controls
 * @property {THREE.Clock} clock - Animation clock
 * @property {HTMLElement} container - Scene container element
 * @property {HTMLElement} uiContainer - UI container element
 */

/**
 * Create the basic Three.js scene setup
 * @returns {SceneSetupResult|null} Scene setup result or null if container not found
 */
export function createSceneSetup() {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Initialize clock for animation timing
    const clock = new THREE.Clock();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // Get scene container
    const container = document.getElementById('scene-container');
    if (!container) {
        debug('P1', 'Could not find scene-container element!');
        return null;
    }

    // Create UI container for all UI elements
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    uiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
    `;
    document.body.appendChild(uiContainer);

    // Renderer setup with safe dimensions
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const initialWidth = Math.max(1, container.clientWidth || window.innerWidth || 800);
    const initialHeight = Math.max(1, container.clientHeight || window.innerHeight || 600);
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Initialize OrbitControls (disabled by default for free movement)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    controls.enableDamping = false;
    controls.screenSpacePanning = true;
    controls.enableZoom = true;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.panSpeed = 1.0;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 3.0;
    controls.target = new THREE.Vector3(0, 0, 0);
    controls.update();

    // Remove all dynamic mouse button remapping
    controls.mouseButtons = {
        LEFT: null,
        MIDDLE: null,
        RIGHT: null
    };

    debug('UTILITY', 'Scene setup complete');

    return {
        scene,
        camera,
        renderer,
        controls,
        clock,
        container,
        uiContainer
    };
}

/**
 * Set up window resize handler
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.WebGLRenderer} renderer
 * @param {HTMLElement} container
 */
export function setupResizeHandler(camera, renderer, container) {
    const handleResize = () => {
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Return cleanup function
    return () => {
        window.removeEventListener('resize', handleResize);
    };
}

/**
 * Create a GUI container with fixed positioning
 * @param {string} id - Container ID
 * @param {string} position - 'left' or 'right'
 * @returns {HTMLElement} The container element
 */
export function createGuiContainer(id, position = 'right') {
    const guiContainer = document.createElement('div');
    guiContainer.id = id;
    guiContainer.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        ${position}: 10px !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
        display: none;
    `;
    document.body.appendChild(guiContainer);
    return guiContainer;
}
