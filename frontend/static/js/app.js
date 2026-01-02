import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import PlanetGenerator from './planetGenerator.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Atmosphere } from './Atmosphere.js';
import { Cloud } from './Cloud.js';
import { ViewManager } from './views/ViewManager.js';
import { StarfieldManager } from './views/StarfieldManager.js';
import { SolarSystemManager } from './SolarSystemManager.js';
import { WeaponEffectsManager } from './ship/systems/WeaponEffectsManager.js';
import SpatialManager from './SpatialManager.js';
import SimpleCollisionManager from './SimpleCollisionManager.js';
import SimpleDockingManager from './SimpleDockingManager.js';
import './ship/systems/services/HitScanService.js'; // Load Three.js hit scan service
import './ship/systems/services/SimpleProjectileService.js'; // Load simplified projectile system
import './utils/ErrorReporter.js'; // Error reporting system for debugging
import { SmartDebugManager } from './utils/DebugManager.js'; // Smart debug logging system
import { debug } from './debug.js';

// VERSION TRACKING
const APP_VERSION = '2.1.0-atomic-discovery';
const APP_BUILD_DATE = '2025-09-30T20:30:00Z';
debug('P1', `🎮 PLANETZ v${APP_VERSION} (${APP_BUILD_DATE})`);

// Global configuration for verbose logging
window.gameConfig = window.gameConfig || {};
window.gameConfig.verbose = window.gameConfig.verbose !== undefined ? window.gameConfig.verbose : true; // Default: true
debug('P1', `📋 Verbose logging enabled: ${window.gameConfig.verbose}`);

// Global function to toggle verbose mode
window.toggleVerbose = function() {
    window.gameConfig.verbose = !window.gameConfig.verbose;
    debug('P1', `🔧 Verbose mode ${window.gameConfig.verbose ? 'ENABLED' : 'DISABLED'}`);

    // Refresh ship's log display if it's currently visible
    if (window.shipLog) {
        window.shipLog.refreshLogDisplay();
    }
    
    return window.gameConfig.verbose;
};

// Initialize Ship's Log system
import './utils/ShipLog.js';

// Initialize Achievement System
import { getAchievementSystem } from './systems/AchievementSystem.js';

// Waypoints System Imports
import { WaypointManager } from './waypoints/WaypointManager.js';
import { WaypointKeyboardHandler } from './waypoints/WaypointKeyboardHandler.js';

// Global variables for warp control mode
let warpControlMode = false;
let warpGui = null;
let warpGuiContainer = null;
let editMode = false;
let gui = null;
let guiContainer = null;

// Global variables for managers
let viewManager = null;
let solarSystemManager = null;
let debugManager = null;
let smartDebugManager = null;
let spatialManager = null;
let collisionManager = null;
let dockingManager = null;
let waypointManager = null;
let waypointKeyboardHandler = null;

/**
 * Initialize Three.js-based spatial and collision systems
 * Replaces Ammo.js physics with simple, performant Three.js systems
 */
function initializeThreeJSSystems(scene) {
debug('UTILITY', '🌌 Initializing Three.js spatial and collision systems...');
    
    // Create spatial manager for object tracking
    spatialManager = new SpatialManager();
    window.spatialManager = spatialManager;
    
    // Create collision manager for raycast and collision detection
    collisionManager = new SimpleCollisionManager(scene, spatialManager);
    window.collisionManager = collisionManager;
    
debug('UTILITY', '✅ Three.js systems initialized successfully');
    return true;
}

// Function to update debug info
function updateDebugInfo() {
    if (debugManager) {
        debugManager.updateInfo();
    }
}

// Debug Manager class
class DebugManager {
    constructor() {
        this.stats = new Stats();
        this.debugInfo = document.createElement('div');
        this.visible = false;
        this.axesHelper = new THREE.AxesHelper(5);
        this.gridHelper = new THREE.GridHelper(10, 10);
        
        // Configure stats
        this.stats.dom.style.cssText = `
            position: fixed !important;
            top: 70px !important;
            left: 10px !important;
            display: none;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // Configure debug info
        this.debugInfo.style.cssText = `
            position: fixed !important;
            top: 120px !important;
            left: 10px !important;
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 5px;
            display: none;
            pointer-events: auto;
            transform: none !important;
        `;
        
        // Configure helpers
        this.axesHelper.visible = false;
        this.gridHelper.visible = false;
    }
    
    initialize(scene, uiContainer) {
        document.body.appendChild(this.stats.dom);
        uiContainer.appendChild(this.debugInfo);
        scene.add(this.axesHelper);
        scene.add(this.gridHelper);
    }
    
    toggle() {
        this.visible = !this.visible;
        this.stats.dom.style.display = this.visible ? 'block' : 'none';
        this.debugInfo.style.display = this.visible ? 'block' : 'none';
        this.updateInfo();
    }
    
    updateInfo() {
        if (!this.visible) return;
        
        let html = '';
        
        // Add solar system info if available
        if (solarSystemManager && solarSystemManager.getDebugInfo) {
            const solarSystemInfo = solarSystemManager.getDebugInfo();
            for (const [key, value] of Object.entries(solarSystemInfo)) {
                html += `${key}: ${value}<br>`;
            }
        }
        
        // Add camera position if available
        if (viewManager && viewManager.camera) {
            const pos = viewManager.camera.position;
            html += `<br>Camera Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>`;
        }
        
        this.debugInfo.innerHTML = html;
    }
    
    setEditMode(enabled) {
        this.axesHelper.visible = enabled;
        this.gridHelper.visible = enabled;
    }
    
    update() {
        if (this.visible) {
            this.updateInfo();
        }
        this.stats.update();
    }
}

// Global functions for mode toggles
function toggleDebugMode() {
    if (!debugManager) return;
    debugManager.toggle();
}

function toggleEditMode() {
    editMode = !editMode;
    viewManager.setEditMode(editMode);
    
    // If enabling edit mode, ensure warp control mode is off
    if (editMode && warpControlMode) {
        warpControlMode = false;
        warpGuiContainer.style.display = 'none';
        warpGui.domElement.style.display = 'none';
        document.body.classList.remove('warp-control-mode');
    }
    
    // Update debug visibility
    if (debugManager) {
        debugManager.setEditMode(editMode);
    }
    
    // Update UI
    if (editMode) {
        document.body.classList.add('edit-mode');
        guiContainer.style.display = 'block';
        gui.domElement.style.display = 'block';
        
        // Initialize with the first celestial body
        const bodies = solarSystemManager.getCelestialBodies();
        if (bodies.length > 0) {
            const firstBody = bodies[0];
            solarSystemManager.setCurrentEditBody(firstBody);
            updateGUIControls(firstBody);
            updateGuiTitle(firstBody);
        }
    } else {
        document.body.classList.remove('edit-mode');
        guiContainer.style.display = 'none';
        gui.domElement.style.display = 'none';
    }
    
    // Update debug info
    updateDebugInfo();
}

function toggleWarpControlMode() {
    if (!warpGui) return; // Guard against calling before initialization
    
    warpControlMode = !warpControlMode;
    
    // If enabling warp control mode, ensure edit mode is off
    if (warpControlMode && editMode) {
        editMode = false;
        viewManager.setEditMode(false);
        guiContainer.style.display = 'none';
        gui.domElement.style.display = 'none';
        document.body.classList.remove('edit-mode');
        if (debugManager) {
            debugManager.setEditMode(false);
        }
    }
    
    // Update UI
    if (warpControlMode) {
        document.body.classList.add('warp-control-mode');
        warpGuiContainer.style.display = 'block';
        warpGui.domElement.style.display = 'block';
    } else {
        document.body.classList.remove('warp-control-mode');
        warpGuiContainer.style.display = 'none';
        warpGui.domElement.style.display = 'none';
    }
}

// Add global keyboard event listener
document.addEventListener('keydown', (event) => {
    // Global TAB detection test
    if (event.key === 'Tab') {
        debug('TARGETING', `🎯 GLOBAL TAB detected in app.js - editMode: ${editMode}`);
    }
    // Handle Ctrl/Cmd key combinations
    if (event.ctrlKey || event.metaKey) {
        if (event.key === 'u') {
            event.preventDefault();
            toggleDebugMode();
        } else if (event.key === 'e') {
            event.preventDefault();
            toggleEditMode();
        } else if (event.key === 'w') {
            event.preventDefault();
            toggleWarpControlMode();
        }
    } else if (editMode && event.key === 'Tab') {
        debug('TARGETING', `🎯 TAB intercepted by edit mode - blocking game TAB handler`);
        event.preventDefault();
        event.stopPropagation();
        cycleCelestialBody();
        return false;
    }
}, true);

document.addEventListener('DOMContentLoaded', async () => {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Initialize clock for animation timing
    const clock = new THREE.Clock();
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('scene-container');
    
    if (!container) {
        debug('P1', 'Could not find scene-container element!');
        return;
    }
    
    // Create a fixed container for all UI elements
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

    // Initialize smart debug logging system
    smartDebugManager = new SmartDebugManager();

    // Initialize Three.js debug manager (for stats, axes, grid, etc.)
    debugManager = new DebugManager();
    debugManager.initialize(scene, uiContainer);

    // Set up global debug function to use smartDebugManager
    window.debug = (channel, message) => {
        if (smartDebugManager) {
            smartDebugManager.debug(channel, message);
        } else {

        }
    };

    // Set up global access to debug manager
    smartDebugManager.setupGlobalAccess();

    // Initialize Achievement System
    try {
        const achievementSystem = getAchievementSystem();
        debug('P1', '🏆 Achievement system initialized successfully');
        
        // Add global test functions
        window.testNotification = () => {
            debug('P1', '🧪 Testing achievement notification system');
            if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
                debug('P1', '✅ StarfieldManager found, showing test notification');
                window.starfieldManager.showHUDEphemeral(
                    '🏆 Test Achievement!',
                    '🥉 This is a test notification',
                    5000
                );
                return 'Test notification sent!';
            } else {
                debug('P1', '❌ StarfieldManager or showHUDEphemeral not available');
                debug('P1', `StarfieldManager available: ${!!window.starfieldManager}`);
                debug('P1', `showHUDEphemeral available: ${!!(window.starfieldManager && window.starfieldManager.showHUDEphemeral)}`);
                return 'Notification system not available';
            }
        };
        
        // Add discovery status check
        window.checkDiscoveries = () => {
            if (window.starfieldManager && window.starfieldManager.navigationSystemManager) {
                const starCharts = window.starfieldManager.navigationSystemManager.starChartsManager;
                if (starCharts) {
                    const discoveryCount = starCharts.discoveredObjects ? starCharts.discoveredObjects.size : 0;
                    debug('STAR_CHARTS', `Current discoveries: ${discoveryCount}`);

                    // List some discovered objects
                    if (starCharts.discoveredObjects && starCharts.discoveredObjects.size > 0) {
                        debug('STAR_CHARTS', 'Discovered objects:');
                        Array.from(starCharts.discoveredObjects).slice(0, 5).forEach((id, i) => {
                            debug('STAR_CHARTS', `  ${i + 1}: ${id}`);
                        });
                    }
                    
                    return `Found ${discoveryCount} discoveries`;
                } else {
                    return 'StarChartsManager not available';
                }
            } else {
                return 'Navigation system not available';
            }
        };
        
        // Add a simple HUD test function
        window.testHUD = () => {
            debug('P1', '🧪 Testing HUD ephemeral system');
            debug('P1', 'Testing HUD notification...');
            
            // Wait for StarfieldManager to be ready
            const checkStarfield = () => {
                if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
                    debug('P1', '✅ StarfieldManager ready, showing test HUD message');
                    
                    // Show a very visible test message
                    window.starfieldManager.showHUDEphemeral(
                        '🚨 ACHIEVEMENT TEST 🚨',
                        'This notification should be visible at the top center of your screen!',
                        10000  // 10 seconds duration
                    );
                    
                    // Check if the element was created and is visible
                    setTimeout(() => {
                        const hudElement = window.starfieldManager.hudEphemeralElement;
                        if (hudElement) {
                            debug('P1', `📱 HUD element exists: display=${hudElement.style.display}, visibility=${hudElement.style.visibility}`);
                            debug('P1', `📱 HUD element position: top=${hudElement.style.top}, left=${hudElement.style.left}`);
                            debug('P1', `📱 HUD element z-index: ${hudElement.style.zIndex}`);
                            debug('P1', `📱 HUD element content: ${hudElement.textContent?.substring(0, 100)}`);
                            
                            // Make it extra visible for testing
                            hudElement.style.backgroundColor = 'red';
                            hudElement.style.fontSize = '20px';
                            hudElement.style.border = '5px solid yellow';
                            
                        } else {
                            debug('P1', '❌ No HUD element found');
                        }
                    }, 500);
                    
                    return 'HUD test message sent with enhanced visibility!';
                } else {
                    debug('P1', '⏳ StarfieldManager not ready yet');
                    return 'StarfieldManager not ready yet';
                }
            };
            
            return checkStarfield();
        };
        
    } catch (error) {
        debug('P1', `❌ Failed to initialize achievement system: ${error.message}`);
    }

    // Renderer setup with safe dimensions
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // Ensure container has valid dimensions before setting renderer size
    const initialWidth = Math.max(1, container.clientWidth || window.innerWidth || 800);
    const initialHeight = Math.max(1, container.clientHeight || window.innerHeight || 600);

    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Initialize OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false; // Start with controls disabled for free movement
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
    
    // Initialize ViewManager
    viewManager = new ViewManager(scene, camera, controls);
    
    // Expose viewManager globally for debugging
    window.viewManager = viewManager;

    // Initialize StarfieldManager and connect it to ViewManager
    const starfieldManager = new StarfieldManager(scene, camera, viewManager, THREE);
    viewManager.setStarfieldManager(starfieldManager);
    
    // Expose StarfieldManager globally for debugging and test scripts
    window.starfieldManager = starfieldManager;
    
    // Set initialization flag to indicate StarfieldManager is available
    window.starfieldManagerReady = true;

    // Three.js systems are ready immediately (no loading required)
debug('UI', '🌌 Three.js spatial systems ready - no loading required');
    
    // Initialize Three.js-based systems (replaces Ammo.js physics)
    const systemsInitialized = initializeThreeJSSystems(scene);
    if (systemsInitialized) {
debug('UTILITY', '✅ Three.js spatial and collision systems ready');
        window.spatialManagerReady = true;
        window.collisionManagerReady = true;
        
        // Now that spatial systems are ready, initialize SimpleDockingManager
        if (starfieldManager && typeof starfieldManager.initializeSimpleDocking === 'function') {
            starfieldManager.initializeSimpleDocking();
        }
    } else {
        debug('P1', '❌ Failed to initialize Three.js systems');
        window.spatialManagerReady = false;
        window.collisionManagerReady = false;
    }

    // Initialize SolarSystemManager and connect it to StarfieldManager
    solarSystemManager = new SolarSystemManager(scene, camera);
    starfieldManager.setSolarSystemManager(solarSystemManager);
    viewManager.setSolarSystemManager(solarSystemManager);

    // Initialize Waypoints System
    debug('WAYPOINTS', '🎯 Initializing Waypoints System...');
    try {
        waypointManager = new WaypointManager();
        window.waypointManager = waypointManager;
        
        waypointKeyboardHandler = new WaypointKeyboardHandler(waypointManager);
        window.waypointKeyboardHandler = waypointKeyboardHandler;
        
        debug('WAYPOINTS', '✅ Waypoints System initialized successfully');
    } catch (error) {
        debug('P1', `❌ Failed to initialize Waypoints System: ${error.message}`);
    }

    // Verify managers are properly connected
    if (!viewManager.areManagersReady()) {
        debug('P1', 'Failed to initialize managers properly');
        return;
    }

    // Initialize the universe and then generate the initial star system
    try {
        await viewManager.galacticChart.fetchUniverseData();
    
        // Ensure universe data is shared with SolarSystemManager
        if (viewManager.galacticChart.universe) {
            solarSystemManager.universe = viewManager.galacticChart.universe;
            // Generate initial star system for sector A0
            const success = await solarSystemManager.generateStarSystem('A0');
            if (success) {
                
                // Wait longer to ensure all celestial bodies and stations are fully created
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // CRITICAL FIX: Refresh spatial grid after system generation
                // The spatial grid was initialized before stations were created
                if (viewManager.navigationSystemManager?.starChartsManager) {
                    viewManager.navigationSystemManager.starChartsManager.refreshSpatialGrid();
                    debug('UTILITY', '✅ Spatial grid refreshed after system generation');
                } else {
                    debug('UTILITY', '❌ Could not refresh spatial grid - StarChartsManager not found');
                }
                
                // Force an immediate update of the target list to include celestial bodies
                if (starfieldManager?.targetComputerManager) {
                    starfieldManager.targetComputerManager.updateTargetList();
                    
                    // Verify the target list was updated
                    const targetCount = starfieldManager.targetComputerManager.targetObjects?.length || 0;
                    
                    // If no targets found, try again after a short delay
                    if (targetCount === 0) {
                        setTimeout(() => {
                            starfieldManager.targetComputerManager.updateTargetList();
                        }, 500);
                    }
                }
            } else {
                debug('P1', '❌ Failed to generate star system');
            }
        } else {
            debug('P1', '❌ Failed to fetch universe data');
        }
    } catch (error) {
        debug('P1', `❌ Error during initialization: ${error.message}`);
    }

    // Set up GUI controls with fixed positioning
    gui = new dat.GUI({ autoPlace: false });
    gui.domElement.style.display = 'none';
    
    // Create a fixed container for the GUI
    guiContainer = document.createElement('div');
    guiContainer.id = 'gui-container';
    guiContainer.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        transform: none !important;
        pointer-events: auto;
        display: none;
        padding-top: 90px;
    `;
    
    // Add title element for current celestial body
    const guiTitle = document.createElement('div');
    guiTitle.id = 'gui-title';
    guiTitle.style.cssText = `
        color: white;
        font-family: monospace;
        font-size: 16px;
        text-align: center;
        background: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border-radius: 5px;
        position: absolute;
        top: 50px;
        left: 0;
        right: 0;
        z-index: 1001;
    `;
    guiContainer.appendChild(guiTitle);
    
    // Style the GUI element itself
    gui.domElement.style.cssText = `
        position: relative !important;
        transform: none !important;
        width: 300px !important;
    `;
    
    // Add GUI to our containers
    guiContainer.appendChild(gui.domElement);
    uiContainer.appendChild(guiContainer);
    
    const controlsFolder = gui.addFolder('Planet Generation');
    
    // Create planet generator
    const planetGenerator = new PlanetGenerator(64);

    // Create material first
    const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        shininess: 15,
        flatShading: true
    });

    // Create water material
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
                
                // Calculate foam based on wave height and slope
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
                
                // Add foam
                vec3 foam = foamColor * vFoam * foamIntensity;
                diffuseColor.rgb = mix(diffuseColor.rgb, foam, vFoam);
                `
            );
            
            waterMaterial.userData.shader = shader;
        }
    });

    // Ocean parameters
    const oceanParams = {
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

    // Wave animation parameters
    let waveTime = 0;
    const waveVertices = [];

    // Set up chunk manager with scene and material
    planetGenerator.chunkManager.setScene(scene);
    planetGenerator.chunkManager.setMaterial(material);

    // Planet type selection
    const planetTypes = {
        currentType: 'Class-M',
        types: ['Class-M', 'Class-L', 'Class-H', 'Class-D', 'Class-J', 'Class-K', 'Class-N', 'Class-Y']
    };

    // Planet type descriptions
    const planetDescriptions = {
        'Class-M': 'Earth-like planet with nitrogen-oxygen atmosphere and liquid water',
        'Class-L': 'Marginally habitable planet with carbon dioxide atmosphere',
        'Class-H': 'Desert planet with hot, thin atmosphere',
        'Class-D': 'Moon-like planetoid with no atmosphere',
        'Class-J': 'Gas giant with thick hydrogen-helium atmosphere',
        'Class-K': 'Adaptable for habitation with terraforming',
        'Class-N': 'Sulfuric planet with thick atmosphere and high pressure',
        'Class-Y': 'Demon-class planet with toxic atmosphere and extreme temperatures'
    };

    // Planet type colors (base colors)
    const planetColors = {
        'Class-M': { 
            base: 0x4a9eff, 
            high: 0xffffff, 
            low: 0x1a4a7f,
            detail: 0x2d5a8e,
            slope: 0x3a6ea5,
            roughness: 0.7,
            detailScale: 2.0,
            hasOceans: true,
            atmosphere: {
                color: new THREE.Vector3(0.18, 0.39, 0.89),    // Earth-like blue
                rayleigh: 0.15,
                mieCoefficient: 0.005,
                mieDirectionalG: 0.85,
                sunIntensity: 2.5,
                scale: 1.1
            }
        },
        'Class-L': { 
            base: 0x8b4513, 
            high: 0xd2691e, 
            low: 0x3d1f0d,
            detail: 0x6b3419,
            slope: 0x7d4a2d,
            roughness: 0.8,
            detailScale: 2.5,
            hasOceans: true, // Minimal oceans
            atmosphere: {
                color: new THREE.Vector3(0.6, 0.3, 0.2),      // Reddish-brown
                rayleigh: 0.25,
                mieCoefficient: 0.008,
                mieDirectionalG: 0.8,
                sunIntensity: 3.0,
                scale: 1.15
            }
        },
        'Class-H': { 
            base: 0xd2691e, 
            high: 0xffd700, 
            low: 0x8b4513,
            detail: 0xb3591a,
            slope: 0xc46b2d,
            roughness: 0.9,
            detailScale: 3.0,
            hasOceans: false, // Desert planet
            atmosphere: {
                color: new THREE.Vector3(0.8, 0.5, 0.2),      // Dusty orange
                rayleigh: 0.3,
                mieCoefficient: 0.01,
                mieDirectionalG: 0.75,
                sunIntensity: 4.0,
                scale: 1.08
            }
        },
        'Class-D': { 
            base: 0x800000, 
            high: 0xff4500, 
            low: 0x400000,
            detail: 0x600000,
            slope: 0x700000,
            roughness: 1.0,
            detailScale: 3.5,
            hasOceans: false, // Moon-like
            atmosphere: {
                color: new THREE.Vector3(0.7, 0.2, 0.1),      // Toxic red
                rayleigh: 0.4,
                mieCoefficient: 0.015,
                mieDirectionalG: 0.7,
                sunIntensity: 3.5,
                scale: 1.2
            }
        },
        'Class-J': { 
            base: 0xffd700, 
            high: 0xffffff, 
            low: 0xdaa520,
            detail: 0xe6c200,
            slope: 0xf0d000,
            roughness: 0.6,
            detailScale: 1.5,
            hasOceans: false, // Gas giant
            atmosphere: {
                color: new THREE.Vector3(0.9, 0.7, 0.3),      // Gas giant yellow
                rayleigh: 0.5,
                mieCoefficient: 0.02,
                mieDirectionalG: 0.9,
                sunIntensity: 5.0,
                scale: 1.3
            }
        },
        'Class-K': { 
            base: 0xa0522d, 
            high: 0xd2691e, 
            low: 0x6b3419,
            detail: 0x8b4513,
            slope: 0x9c5a2d,
            roughness: 0.85,
            detailScale: 2.2,
            hasOceans: false, // Barren
            atmosphere: {
                color: new THREE.Vector3(0.4, 0.3, 0.2),      // Thin brownish
                rayleigh: 0.1,
                mieCoefficient: 0.003,
                mieDirectionalG: 0.8,
                sunIntensity: 2.0,
                scale: 1.05
            }
        },
        'Class-N': { 
            base: 0xdaa520, 
            high: 0xffd700, 
            low: 0x8b6914,
            detail: 0xc49b1a,
            slope: 0xd4ab2d,
            roughness: 0.75,
            detailScale: 1.8,
            hasOceans: false, // Sulfuric
            atmosphere: {
                color: new THREE.Vector3(0.6, 0.6, 0.4),      // Saturn-like yellow
                rayleigh: 0.35,
                mieCoefficient: 0.012,
                mieDirectionalG: 0.85,
                sunIntensity: 4.0,
                scale: 1.25
            }
        },
        'Class-Y': { 
            base: 0x8b0000, 
            high: 0xff0000, 
            low: 0x4d0000,
            detail: 0x6b0000,
            slope: 0x7d0000,
            roughness: 1.0,
            detailScale: 4.0,
            hasOceans: false, // Demon class
            atmosphere: {
                color: new THREE.Vector3(0.8, 0.1, 0.1),      // Extreme red
                rayleigh: 0.6,
                mieCoefficient: 0.025,
                mieDirectionalG: 0.65,
                sunIntensity: 6.0,
                scale: 1.4
            }
        }
    };

    // Create initial geometry
debug('UTILITY', 'Creating initial geometry...');
    const geometryParams = {
        subdivisionLevel: 4,  // Default subdivision level
        radius: 1
    };
    let geometry = new THREE.IcosahedronGeometry(geometryParams.radius, geometryParams.subdivisionLevel);

    // Create initial planet mesh
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    
    debug('STAR_CHARTS', 'Initial planet mesh created:', {
        vertices: geometry.attributes.position.count,
        faces: geometry.index ? geometry.index.count / 3 : 0,
        subdivisionLevel: geometryParams.subdivisionLevel
    });

    // Terraforming parameters
    const terraformParams = {
        brushSize: 0.1,
        brushStrength: 0.05,
        brushFalloff: 0.5
    };

    // Raycaster for terraforming
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Add terraforming controls to GUI
    const terraformFolder = gui.addFolder('Terraforming');
    terraformFolder.add(terraformParams, 'brushSize', 0.01, 0.5).name('Brush Size');
    terraformFolder.add(terraformParams, 'brushStrength', 0.01, 0.2).name('Brush Strength');
    terraformFolder.add(terraformParams, 'brushFalloff', 0.1, 2.0).name('Brush Falloff');
    terraformFolder.open();

    // Add planet type dropdown with tooltip
    const typeController = controlsFolder.add(planetTypes, 'currentType', planetTypes.types)
        .name('Planet Type')
        .onChange((value) => {

            typeController.__li.setAttribute('title', planetDescriptions[value]);
            
            if (planetGenerator.applyPlanetClass(value)) {
                // Update all GUI controllers to reflect new parameters
                for (const controller of controlsFolder.__controllers) {
                    if (controller !== typeController) {
                        const property = controller.property;
                        if (property in planetGenerator.params) {
                            controller.setValue(planetGenerator.params[property]);
                        }
                    }
                }

                // Apply atmospheric settings for the planet type
                const atmosphereSettings = planetColors[value].atmosphere;
                atmosphere.setRayleighColor(atmosphereSettings.color);
                atmosphere.setRayleigh(atmosphereSettings.rayleigh);
                atmosphere.setMieCoefficient(atmosphereSettings.mieCoefficient);
                atmosphere.setMieDirectionalG(atmosphereSettings.mieDirectionalG);
                atmosphere.setSunIntensity(atmosphereSettings.sunIntensity);
                
                // Update atmosphere scale
                const newScale = atmosphereSettings.scale;
                atmosphere.mesh.scale.set(newScale, newScale, newScale);
                atmosphere.setAtmosphereRadius(geometryParams.radius * newScale);

                // Enable/disable oceans based on planet type
                oceanParams.enabled = planetColors[value].hasOceans;
                if (planet.oceanMesh) {
                    planet.oceanMesh.visible = oceanParams.enabled;
                }
                
                // Update ocean GUI controllers
                for (const controller of oceanFolder.__controllers) {
                    if (controller.property === 'enabled') {
                        controller.setValue(oceanParams.enabled);
                    }
                }
                
                // Update cloud settings
                const cloudSettings = planetColors[value].clouds;
                clouds.setCoverage(cloudSettings.coverage);
                clouds.setDensity(cloudSettings.density);
                clouds.setCloudColor(cloudSettings.color);
                clouds.setCloudSpeed(cloudSettings.speed);
                clouds.setTurbulence(cloudSettings.turbulence);
                clouds.mesh.visible = cloudSettings.enabled !== false;

                // Update cloud GUI controllers
                for (const controller of cloudFolder.__controllers) {
                    if (controller.property === 'value') {
                        if (controller.__li.innerText.includes('Coverage')) {
                            controller.setValue(cloudSettings.coverage);
                        } else if (controller.__li.innerText.includes('Density')) {
                            controller.setValue(cloudSettings.density);
                        } else if (controller.__li.innerText.includes('Speed')) {
                            controller.setValue(cloudSettings.speed);
                        } else if (controller.__li.innerText.includes('Turbulence')) {
                            controller.setValue(cloudSettings.turbulence);
                        }
                    } else if (controller.property === 'color') {
                        const color = new THREE.Color(
                            cloudSettings.color.x,
                            cloudSettings.color.y,
                            cloudSettings.color.z
                        );
                        controller.setValue('#' + color.getHexString());
                    }
                }

                updatePlanetGeometry();
            }
        });

    // Set initial tooltip
    typeController.__li.setAttribute('title', planetDescriptions[planetTypes.currentType]);

    // Add cursor style to the dropdown
    const selectElement = typeController.domElement.querySelector('select');
    if (selectElement) {
        selectElement.style.cursor = 'pointer';
    }

    // Add cursor style to all controllers
    controlsFolder.__controllers.forEach(controller => {
        const elements = controller.domElement.querySelectorAll('input, select');
        elements.forEach(element => {
            element.style.cursor = 'pointer';
        });
        });

    // Add controls for planet parameters
    const terrainHeightController = controlsFolder.add(planetGenerator.params, 'terrainHeight', 0, 0.5)
        .name('Terrain Height')
        .onChange((value) => {
debug('AI', 'Terrain height changed to:', value);
            planetGenerator.params.terrainHeight = value;
            updatePlanetGeometry();
        });
    terrainHeightController.__li.setAttribute('title', 'Controls the maximum height of terrain features. Higher values create more dramatic elevation changes.');
    
    const noiseScaleController = controlsFolder.add(planetGenerator.params, 'noiseScale', 0.1, 2.0)
        .name('Noise Scale')
        .onChange((value) => {
debug('UTILITY', 'Noise scale changed to:', value);
            planetGenerator.params.noiseScale = value;
            updatePlanetGeometry();
        });
    noiseScaleController.__li.setAttribute('title', 'Controls the size of terrain features. Lower values create larger features, higher values create smaller details.');
    
    const octavesController = controlsFolder.add(planetGenerator.params, 'octaves', 1, 8, 1)
        .name('Noise Octaves')
        .onChange((value) => {
debug('UTILITY', 'Octaves changed to:', value);
            planetGenerator.params.octaves = value;
            updatePlanetGeometry();
        });
    octavesController.__li.setAttribute('title', 'Number of noise layers. Higher values add more detail and complexity to the terrain.');
    
    const persistenceController = controlsFolder.add(planetGenerator.params, 'persistence', 0.1, 1.0)
        .name('Noise Persistence')
        .onChange((value) => {
debug('UTILITY', 'Persistence changed to:', value);
            planetGenerator.params.persistence = value;
            updatePlanetGeometry();
        });
    persistenceController.__li.setAttribute('title', 'Controls how much each octave contributes to the overall shape. Higher values make smaller details more prominent.');
    
    const lacunarityController = controlsFolder.add(planetGenerator.params, 'lacunarity', 0.1, 4.0)
        .name('Noise Lacunarity')
        .onChange((value) => {
debug('UTILITY', 'Lacunarity changed to:', value);
            planetGenerator.params.lacunarity = value;
            updatePlanetGeometry();
        });
    lacunarityController.__li.setAttribute('title', 'Controls how much detail is added in each octave. Higher values create more varied terrain features.');

    // Add texture controls
    const textureFolder = gui.addFolder('Texture Settings');
    const roughnessController = textureFolder.add(planetColors[planetTypes.currentType], 'roughness', 0.1, 1.0)
        .name('Surface Roughness')
        .onChange((value) => {
debug('UTILITY', 'Roughness changed to:', value);
            planetColors[planetTypes.currentType].roughness = value;
            updatePlanetGeometry();
        });
    roughnessController.__li.setAttribute('title', 'Controls how pronounced the surface details are. Higher values create more dramatic surface variations.');
    
    const detailScaleController = textureFolder.add(planetColors[planetTypes.currentType], 'detailScale', 0.5, 5.0)
        .name('Detail Scale')
        .onChange((value) => {
debug('AI', 'Detail scale changed to:', value);
            planetColors[planetTypes.currentType].detailScale = value;
            updatePlanetGeometry();
        });
    detailScaleController.__li.setAttribute('title', 'Controls the size of surface details. Higher values create smaller, more frequent surface features.');
    textureFolder.open();
    
    // Add ocean controls
    const oceanFolder = gui.addFolder('Ocean Settings');
    oceanFolder.add(oceanParams, 'enabled')
        .name('Enable Ocean')
        .onChange((value) => {
debug('UTILITY', 'Ocean enabled:', value);
            if (planet.oceanMesh) {
                planet.oceanMesh.visible = value;
            }
        });
    oceanFolder.add(oceanParams, 'wavesEnabled')
        .name('Enable Waves')
        .onChange((value) => {
debug('UTILITY', 'Waves enabled:', value);
        });
    oceanFolder.add(oceanParams, 'depth', 0, 0.5)
        .name('Ocean Depth')
        .onChange((value) => {
debug('UTILITY', 'Ocean depth changed to:', value);
            updatePlanetGeometry();
        });
    oceanFolder.addColor(oceanParams, 'color')
        .name('Ocean Color')
        .onChange((value) => {
debug('UTILITY', 'Ocean color changed to:', value);
            waterMaterial.color.setHex(value);
        });
    oceanFolder.add(oceanParams, 'waveHeight', 0, 0.1)
        .name('Wave Height')
        .onChange((value) => {
debug('UTILITY', 'Wave height changed to:', value);
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.waveHeight.value = value;
            }
        });
    oceanFolder.add(oceanParams, 'waveSpeed', 0.1, 5.0)
        .name('Wave Speed')
        .onChange((value) => {
debug('UTILITY', 'Wave speed changed to:', value);
        });
    oceanFolder.add(oceanParams, 'waveFrequency', 0.5, 5.0)
        .name('Wave Frequency')
        .onChange((value) => {
debug('UTILITY', 'Wave frequency changed to:', value);
        });
    oceanFolder.add(oceanParams, 'foamThreshold', 0.1, 1.0)
        .name('Foam Threshold')
        .onChange((value) => {
debug('UTILITY', 'Foam threshold changed to:', value);
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.foamThreshold.value = value;
            }
        });
    oceanFolder.add(oceanParams, 'foamIntensity', 0.0, 1.0)
        .name('Foam Intensity')
        .onChange((value) => {
debug('UTILITY', 'Foam intensity changed to:', value);
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.foamIntensity.value = value;
            }
        });
    oceanFolder.open();
    
    // Add a button to generate a new planet
    const newPlanetButton = {
        generateNewPlanet: function() {
debug('UTILITY', 'Generating new planet...');
            planetGenerator.generateNewSeed();
            updatePlanetGeometry();
        }
    };
    controlsFolder.add(newPlanetButton, 'generateNewPlanet').name('New Seed');
    
    controlsFolder.open();
    
    // Add geometry controls to GUI
    const geometryFolder = gui.addFolder('Geometry');
    geometryFolder.add(geometryParams, 'subdivisionLevel', 1, 100, 1)
        .name('Smoothness')
        .onChange((value) => {
debug('UTILITY', 'Subdivision level changed to:', value);
            updatePlanetGeometry();
        });
    geometryFolder.open();
    
    // Function to handle terraforming
    function handleTerraforming(event) {
        if (!editMode) {
debug('UTILITY', 'Terraforming blocked: Not in edit mode');
            return;
        }

        // Calculate mouse position in normalized device coordinates
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        debug('UTILITY', `Terraforming attempt: mouseNormalized=(${mouse.x.toFixed(2)}, ${mouse.y.toFixed(2)}), shiftKey=${event.shiftKey}, mode=${event.shiftKey ? 'lower' : 'raise'}`);

        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);

        // Find intersections with the planet
        const intersects = raycaster.intersectObject(planet);
        
        if (intersects.length > 0) {
            debug('UTILITY', `Hit detected: distance=${intersects[0].distance.toFixed(2)}, point=[${intersects[0].point.toArray().map(v => v.toFixed(2)).join(', ')}]`);
            
            const hitPoint = intersects[0].point;
            const hitNormal = intersects[0].face.normal;
            
            // Get the geometry
            const geometry = planet.geometry;
            const positions = geometry.attributes.position;
            const colors = geometry.attributes.color;
            
            // Determine if we're raising or lowering terrain
            const isLowering = event.shiftKey;
            const strength = isLowering ? -terraformParams.brushStrength : terraformParams.brushStrength;
            
            // Create a sphere of influence around the hit point
            const brushRadius = terraformParams.brushSize;
            const maxDisplacement = strength;
            
            let verticesModified = false;
            
            // Update vertices within brush radius
            for (let i = 0; i < positions.count; i++) {
                const vertex = new THREE.Vector3(
                    positions.getX(i),
                    positions.getY(i),
                    positions.getZ(i)
                );
                
                // Calculate distance from hit point
                const distanceToHit = vertex.distanceTo(hitPoint);
                
                if (distanceToHit < brushRadius) {
                    verticesModified = true;
                    
                    // Calculate falloff based on distance (smooth step function)
                    const t = distanceToHit / brushRadius;
                    const falloff = 1 - (t * t * (3 - 2 * t)); // Smooth step interpolation
                    
                    // Calculate displacement direction (blend between hit normal and vertex normal)
                    const vertexNormal = vertex.clone().normalize();
                    const blendedNormal = new THREE.Vector3()
                        .addVectors(hitNormal, vertexNormal)
                        .normalize();
                    
                    // Apply displacement
                    const displacement = blendedNormal.multiplyScalar(maxDisplacement * falloff);
                    vertex.add(displacement);
                    
                    // Update position
                    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
                    
                    // Update color based on new height and slope
                    const height = vertex.length();
                    const heightFactor = (height - 1) / planetGenerator.params.terrainHeight;
                    const planetColor = planetColors[planetTypes.currentType];
                    
                    // Calculate slope factor
                    const slopeFactor = Math.max(0, 1 - Math.abs(vertexNormal.dot(new THREE.Vector3(0, 1, 0))));
                    
                    // Calculate detail noise
                    const detailNoise = planetGenerator.generateNoise(
                        vertex.x * planetColor.detailScale,
                        vertex.y * planetColor.detailScale,
                        vertex.z * planetColor.detailScale
                    ) * planetColor.roughness;
                    
                    const color = new THREE.Color();
                    if (heightFactor < 0.3) {
                        color.setHex(planetColor.low);
                    } else if (heightFactor > 0.7) {
                        color.setHex(planetColor.high);
                    } else {
                        color.setHex(planetColor.base);
                    }
                    
                    // Blend with slope color
                    const slopeColor = new THREE.Color(planetColor.slope);
                    color.lerp(slopeColor, slopeFactor * 0.5);
                    
                    // Add detail texture
                    const detailColor = new THREE.Color(planetColor.detail);
                    color.lerp(detailColor, detailNoise * 0.3);
                    
                    colors.setXYZ(i, color.r, color.g, color.b);
                }
            }
            
            if (verticesModified) {
                // Update geometry
                positions.needsUpdate = true;
                colors.needsUpdate = true;
                geometry.computeVertexNormals();
                
                // Update ocean mesh if enabled
                if (oceanParams.enabled && planet.oceanMesh) {
                    const oceanGeometry = new THREE.IcosahedronGeometry(1 + oceanParams.depth, geometryParams.subdivisionLevel);
                    planet.oceanMesh.geometry.dispose();
                    planet.oceanMesh.geometry = oceanGeometry;
                }
                
                updateDebugInfo(); // Update debug info after geometry changes
            }
        } else {
debug('UTILITY', 'No intersection with planet');
        }
    }

    // Debug mode is now handled by the DebugManager class
    
    // Function to toggle edit mode
    function toggleEditMode() {
        editMode = !editMode;
        viewManager.setEditMode(editMode);
        
        // If enabling edit mode, ensure warp control mode is off
        if (editMode && warpControlMode) {
            warpControlMode = false;
            warpGuiContainer.style.display = 'none';
            warpGui.domElement.style.display = 'none';
            document.body.classList.remove('warp-control-mode');
        }
        
        // Update debug visibility
        if (debugManager) {
            debugManager.setEditMode(editMode);
        }
        
        // Update UI
        if (editMode) {
            document.body.classList.add('edit-mode');
            guiContainer.style.display = 'block';
            gui.domElement.style.display = 'block';
            
            // Initialize with the first celestial body
            const bodies = solarSystemManager.getCelestialBodies();
            if (bodies.length > 0) {
                const firstBody = bodies[0];
                solarSystemManager.setCurrentEditBody(firstBody);
                updateGUIControls(firstBody);
                updateGuiTitle(firstBody);
            }
        } else {
            document.body.classList.remove('edit-mode');
            guiContainer.style.display = 'none';
            gui.domElement.style.display = 'none';
        }
        
        // Update debug info
        updateDebugInfo();
    }
    
    // Duplicate keyboard shortcuts removed - handled by global listener above
    
    debug('UTILITY', 'Container dimensions:', {
        width: container.clientWidth,
        height: container.clientHeight
    });
    
    // Function to create fresh geometry
    function createPlanetGeometry() {
debug('UTILITY', 'Creating fresh geometry with subdivision level:', geometryParams.subdivisionLevel);
        const newGeometry = new THREE.IcosahedronGeometry(geometryParams.radius, geometryParams.subdivisionLevel);
            return newGeometry;
    }
    
    // Function to update planet geometry and colors
    function updatePlanetGeometry() {
        
        // Create and validate new geometry
        const newGeometry = createPlanetGeometry();
        planet.geometry.dispose();
        planet.geometry = newGeometry;
        
        // Get current parameters
        const { terrainHeight, noiseScale, octaves, persistence, lacunarity } = planetGenerator.params;
        
        // Apply terrain deformation
        const positions = newGeometry.attributes.position;
        const newPositions = new Float32Array(positions.count * 3);
        const colorArray = new Float32Array(positions.count * 3);
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Calculate distance from center (normalized to 0-1 range)
            const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
            
            // Base density (negative inside planet, positive outside)
            let density = 1.0 - distanceFromCenter;
            let height = 1.0;
            
            // Add noise only if we're near the surface
            if (Math.abs(density) < 0.1) {
                // Scale coordinates for noise
                const nx = x * noiseScale;
                const ny = y * noiseScale;
                const nz = z * noiseScale;
                
                // Generate noise value
                let noiseValue = 0;
                let amplitude = 1;
                let frequency = 1;
                
                for (let j = 0; j < octaves; j++) {
                    const sampleX = nx * frequency;
                    const sampleY = ny * frequency;
                    const sampleZ = nz * frequency;
                    
                    noiseValue += amplitude * planetGenerator.generateNoise(sampleX, sampleY, sampleZ);
                    
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }
                
                // Normalize noise value to 0-1 range
                noiseValue = (noiseValue + 1) / 2;
                
                // Apply terrain height
                height = 1 + noiseValue * terrainHeight;
            }
            
            // Update vertex position
            newPositions[i * 3] = x * height;
            newPositions[i * 3 + 1] = y * height;
            newPositions[i * 3 + 2] = z * height;
            
            // Calculate height factor for coloring
            const heightFactor = (height - 1) / terrainHeight;
            
            // Calculate slope factor
            const normal = new THREE.Vector3(x, y, z).normalize();
            const slopeFactor = Math.max(0, 1 - Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))));
            
            // Get planet type colors
            const colors = planetColors[planetTypes.currentType];
            
            // Calculate detail noise for texture
            const detailNoise = planetGenerator.generateNoise(
                x * colors.detailScale,
                y * colors.detailScale,
                z * colors.detailScale
            ) * colors.roughness;
            
            // Interpolate color based on height
            const color = new THREE.Color();
            if (heightFactor < 0.3) {
                color.setHex(colors.low);
            } else if (heightFactor > 0.7) {
                color.setHex(colors.high);
            } else {
                color.setHex(colors.base);
            }
            
            // Blend with slope color
            const slopeColor = new THREE.Color(colors.slope);
            color.lerp(slopeColor, slopeFactor * 0.5);
            
            // Add detail texture
            const detailColor = new THREE.Color(colors.detail);
            color.lerp(detailColor, detailNoise * 0.3);
            
            // Store colors
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
        }
        
        // Update geometry with new positions and colors
        newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        newGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        newGeometry.computeVertexNormals();
        
        // Create or update ocean mesh if enabled
        if (oceanParams.enabled) {
            // Create a sphere geometry for the ocean
            const oceanGeometry = new THREE.IcosahedronGeometry(1 + oceanParams.depth, geometryParams.subdivisionLevel);
            
            // Store original vertices for wave animation
            if (!waveVertices.length) {
                const positions = oceanGeometry.attributes.position;
                for (let i = 0; i < positions.count; i++) {
                    waveVertices.push(
                        positions.getX(i),
                        positions.getY(i),
                        positions.getZ(i)
                    );
                }
            }
            
            // If ocean mesh doesn't exist, create it
            if (!planet.oceanMesh) {
                planet.oceanMesh = new THREE.Mesh(oceanGeometry, waterMaterial);
                planet.oceanMesh.renderOrder = 0;  // Ocean should render first
                scene.add(planet.oceanMesh);
            } else {
                // Update existing ocean mesh
                planet.oceanMesh.geometry.dispose();
                planet.oceanMesh.geometry = oceanGeometry;
            }
            
            // Make ocean mesh visible
            planet.oceanMesh.visible = true;
        } else if (planet.oceanMesh) {
            // Hide ocean mesh if disabled
            planet.oceanMesh.visible = false;
        }
        
        // Update debug info
        updateDebugInfo();
    }
    
    // Function to update debug info
    function updateDebugInfo() {
        if (debugManager) {
            debugManager.updateInfo();
        }
    }
    
    // Initial geometry update
    updatePlanetGeometry();
    
    // Add lights
debug('UTILITY', 'Setting up lights...');
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 3;
    
    debug('UTILITY', 'Camera position:', {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    });

    // Create atmosphere
debug('UTILITY', 'Creating atmosphere...');
    const atmosphere = new Atmosphere(geometryParams.radius);
    scene.add(atmosphere.mesh);

    // Create cloud layer
debug('UTILITY', 'Creating cloud layer...');
    const clouds = new Cloud(geometryParams.radius);
    scene.add(clouds.mesh);

    // Sync atmosphere sun position with light
    atmosphere.setSunPosition(light.position);

    // Add atmosphere controls to GUI
    const atmosphereFolder = gui.addFolder('Atmosphere');
    
    // Basic controls
    atmosphereFolder.add(atmosphere.material.uniforms.rayleigh, 'value', 0, 4)
        .name('Rayleigh')
        .onChange(() => {
debug('UTILITY', 'Rayleigh changed');
        });

    atmosphereFolder.add(atmosphere.material.uniforms.mieCoefficient, 'value', 0, 0.1)
        .name('Mie Coefficient')
        .onChange(() => {
debug('UTILITY', 'Mie coefficient changed');
        });

    atmosphereFolder.add(atmosphere.material.uniforms.mieDirectionalG, 'value', 0, 1)
        .name('Mie Directional G')
        .onChange(() => {
debug('UTILITY', 'Mie directional G changed');
        });

    atmosphereFolder.add(atmosphere.material.uniforms.sunIntensity, 'value', 0, 50)
        .name('Sun Intensity')
        .onChange(() => {
debug('UTILITY', 'Sun intensity changed');
        });

    // Add color control
    const rayleighColorObj = {
        color: '#' + new THREE.Color(
            atmosphere.material.uniforms.rayleighColor.value.x,
            atmosphere.material.uniforms.rayleighColor.value.y,
            atmosphere.material.uniforms.rayleighColor.value.z
        ).getHexString()
    };

    atmosphereFolder.addColor(rayleighColorObj, 'color')
        .name('Atmosphere Color')
        .onChange((value) => {
            const color = new THREE.Color(value);
            atmosphere.setRayleighColor(new THREE.Vector3(color.r, color.g, color.b));
debug('UTILITY', 'Atmosphere color changed');
        });

    // Add scale control
    const atmosphereScale = { value: 1.1 };
    atmosphereFolder.add(atmosphereScale, 'value', 1.01, 1.5)
        .name('Atmosphere Scale')
        .onChange((value) => {
            atmosphere.mesh.scale.set(value, value, value);
            atmosphere.setAtmosphereRadius(geometryParams.radius * value);
debug('UTILITY', 'Atmosphere scale changed');
        });

    atmosphereFolder.open();

    // Add cloud controls to GUI
    const cloudFolder = gui.addFolder('Clouds');
    
    cloudFolder.add(clouds.material.uniforms.coverage, 'value', 0, 1)
        .name('Cloud Coverage')
        .onChange((value) => {
            clouds.setCoverage(value);
debug('UTILITY', 'Cloud coverage changed');
        });

    cloudFolder.add(clouds.material.uniforms.density, 'value', 0, 1)
        .name('Cloud Density')
        .onChange((value) => {
            clouds.setDensity(value);
debug('UTILITY', 'Cloud density changed');
        });

    cloudFolder.add(clouds.material.uniforms.cloudSpeed, 'value', 0, 2)
        .name('Cloud Speed')
        .onChange((value) => {
            clouds.setCloudSpeed(value);
debug('UTILITY', 'Cloud speed changed');
        });

    cloudFolder.add(clouds.material.uniforms.turbulence, 'value', 0, 2)
        .name('Turbulence')
        .onChange((value) => {
            clouds.setTurbulence(value);
debug('UTILITY', 'Cloud turbulence changed');
        });

    // Add cloud color control
    const cloudColorObj = {
        color: '#ffffff'
    };

    cloudFolder.addColor(cloudColorObj, 'color')
        .name('Cloud Color')
        .onChange((value) => {
            const color = new THREE.Color(value);
            clouds.setCloudColor(new THREE.Vector3(color.r, color.g, color.b));
debug('UTILITY', 'Cloud color changed');
        });

    cloudFolder.open();

    // Add cloud settings to planet types
    Object.keys(planetColors).forEach(type => {
        planetColors[type].clouds = {
            enabled: type !== 'Class-D', // Disable clouds for moon-like planets
            coverage: type === 'Class-M' ? 0.6 :    // Earth-like, moderate cloud cover
                      type === 'Class-L' ? 0.4 :    // Marginal, sparse clouds
                      type === 'Class-H' ? 0.2 :    // Desert, very sparse clouds
                      type === 'Class-D' ? 0.0 :    // Moon-like, no clouds
                      type === 'Class-J' ? 0.95 :   // Gas giant, nearly complete coverage
                      type === 'Class-K' ? 0.15 :   // Barren, minimal clouds
                      type === 'Class-N' ? 0.85 :   // Ringed, significant cloud layers
                      type === 'Class-Y' ? 0.98 : 0.5,  // Demon extreme, complete toxic coverage
            
            density: type === 'Class-M' ? 0.4 :     // Earth-like, moderate density
                    type === 'Class-L' ? 0.3 :      // Marginal, thin clouds
                    type === 'Class-H' ? 0.15 :     // Desert, very thin clouds
                    type === 'Class-D' ? 0.8 :      // Demon, thick toxic clouds
                    type === 'Class-J' ? 0.9 :      // Gas giant, very dense
                    type === 'Class-K' ? 0.1 :      // Barren, extremely thin
                    type === 'Class-N' ? 0.7 :      // Ringed, moderately dense
                    type === 'Class-Y' ? 0.95 : 0.5,  // Demon extreme, extremely dense
            
            color: type === 'Class-M' ? new THREE.Vector3(0.98, 0.98, 1.0) :    // Earth-like white with slight blue tint
                   type === 'Class-L' ? new THREE.Vector3(0.8, 0.75, 0.7) :     // Marginal, dusty brown
                   type === 'Class-H' ? new THREE.Vector3(0.95, 0.85, 0.7) :    // Desert, sandy beige
                   type === 'Class-D' ? new THREE.Vector3(0.6, 0.2, 0.15) :     // Demon, deep toxic red
                   type === 'Class-J' ? new THREE.Vector3(0.9, 0.85, 0.6) :     // Gas giant, rich yellow-cream
                   type === 'Class-K' ? new THREE.Vector3(0.7, 0.7, 0.7) :      // Barren, grey
                   type === 'Class-N' ? new THREE.Vector3(0.85, 0.8, 0.65) :    // Ringed, pale golden
                   type === 'Class-Y' ? new THREE.Vector3(0.7, 0.1, 0.05) : new THREE.Vector3(1, 1, 1),  // Demon extreme, deep crimson
            
            speed: type === 'Class-M' ? 1.0 :       // Earth-like, moderate wind speeds
                   type === 'Class-L' ? 1.4 :       // Marginal, faster winds
                   type === 'Class-H' ? 1.8 :       // Desert, strong winds
                   type === 'Class-D' ? 0.6 :       // Demon, slow toxic clouds
                   type === 'Class-J' ? 2.5 :       // Gas giant, extreme wind speeds
                   type === 'Class-K' ? 0.4 :       // Barren, minimal winds
                   type === 'Class-N' ? 1.6 :       // Ringed, significant winds
                   type === 'Class-Y' ? 0.3 : 1.0,  // Demon extreme, very slow thick clouds
            
            turbulence: type === 'Class-M' ? 0.8 :    // Earth-like, moderate turbulence
                       type === 'Class-L' ? 1.2 :     // Marginal, increased turbulence
                       type === 'Class-H' ? 1.6 :     // Desert, high turbulence from heat
                       type === 'Class-D' ? 1.4 :     // Demon, chaotic toxic atmosphere
                       type === 'Class-J' ? 2.0 :     // Gas giant, extreme turbulence
                       type === 'Class-K' ? 0.3 :     // Barren, minimal turbulence
                       type === 'Class-N' ? 1.3 :     // Ringed, moderate-high turbulence
                       type === 'Class-Y' ? 1.8 : 1.0  // Demon extreme, violent turbulence
        };

        // Update atmosphere parameters to match planet types
        planetColors[type].atmosphere = {
            color: type === 'Class-M' ? new THREE.Vector3(0.18, 0.39, 0.89) :    // Earth-like blue
                   type === 'Class-L' ? new THREE.Vector3(0.5, 0.3, 0.2) :       // Marginal reddish-brown
                   type === 'Class-H' ? new THREE.Vector3(0.7, 0.5, 0.3) :       // Desert dusty orange
                   type === 'Class-D' ? new THREE.Vector3(0.6, 0.15, 0.1) :      // Demon toxic red
                   type === 'Class-J' ? new THREE.Vector3(0.8, 0.7, 0.4) :       // Gas giant rich yellow
                   type === 'Class-K' ? new THREE.Vector3(0.3, 0.3, 0.3) :       // Barren grey
                   type === 'Class-N' ? new THREE.Vector3(0.5, 0.5, 0.3) :       // Ringed pale yellow
                   type === 'Class-Y' ? new THREE.Vector3(0.7, 0.1, 0.05) :      // Demon extreme deep red
                   new THREE.Vector3(0.18, 0.39, 0.89),                          // Default
            
            rayleigh: type === 'Class-M' ? 0.15 :     // Earth-like moderate scattering
                     type === 'Class-L' ? 0.25 :      // Marginal increased scattering
                     type === 'Class-H' ? 0.1 :       // Desert thin atmosphere
                     type === 'Class-D' ? 0.4 :       // Demon thick toxic
                     type === 'Class-J' ? 0.5 :       // Gas giant very thick
                     type === 'Class-K' ? 0.05 :      // Barren minimal atmosphere
                     type === 'Class-N' ? 0.35 :      // Ringed thick atmosphere
                     type === 'Class-Y' ? 0.6 : 0.15, // Demon extreme densest
            
            mieCoefficient: type === 'Class-M' ? 0.005 :   // Earth-like clear
                          type === 'Class-L' ? 0.008 :     // Marginal dusty
                          type === 'Class-H' ? 0.012 :     // Desert very dusty
                          type === 'Class-D' ? 0.015 :     // Demon particle-heavy
                          type === 'Class-J' ? 0.02 :      // Gas giant extremely dense
                          type === 'Class-K' ? 0.002 :     // Barren very clear
                          type === 'Class-N' ? 0.01 :      // Ringed moderately dense
                          type === 'Class-Y' ? 0.025 : 0.005,  // Demon extreme particle-rich
            
            mieDirectionalG: type === 'Class-M' ? 0.85 :   // Earth-like moderate forward scatter
                           type === 'Class-L' ? 0.8 :      // Marginal more diffuse
                           type === 'Class-H' ? 0.75 :     // Desert highly diffuse
                           type === 'Class-D' ? 0.7 :      // Demon chaotic scatter
                           type === 'Class-J' ? 0.9 :      // Gas giant strong forward scatter
                           type === 'Class-K' ? 0.8 :      // Barren standard scatter
                           type === 'Class-N' ? 0.85 :     // Ringed moderate scatter
                           type === 'Class-Y' ? 0.65 : 0.85,  // Demon extreme chaotic
            
            sunIntensity: type === 'Class-M' ? 2.5 :    // Earth-like moderate
                        type === 'Class-L' ? 3.0 :      // Marginal brighter
                        type === 'Class-H' ? 4.0 :      // Desert intense
                        type === 'Class-D' ? 3.5 :      // Demon filtered
                        type === 'Class-J' ? 5.0 :      // Gas giant brightest
                        type === 'Class-K' ? 2.0 :      // Barren dim
                        type === 'Class-N' ? 4.0 :      // Ringed bright
                        type === 'Class-Y' ? 6.0 : 2.5,  // Demon extreme intense
            
            scale: type === 'Class-M' ? 1.1 :     // Earth-like moderate
                  type === 'Class-L' ? 1.15 :     // Marginal thicker
                  type === 'Class-H' ? 1.08 :     // Desert thin
                  type === 'Class-D' ? 1.2 :      // Demon thick
                  type === 'Class-J' ? 1.3 :      // Gas giant very thick
                  type === 'Class-K' ? 1.05 :     // Barren minimal
                  type === 'Class-N' ? 1.25 :     // Ringed thick
                  type === 'Class-Y' ? 1.4 : 1.1  // Demon extreme thickest
        };
    });

    cloudFolder.open();

    // Handle window resize
    window.addEventListener('resize', () => {
        // console.log('Window resized'); // Reduce console spam
        
        // Ensure container exists and has valid dimensions
        if (!container) return;
        
        const w = Math.max(1, container.clientWidth || window.innerWidth || 1);
        const h = Math.max(1, container.clientHeight || window.innerHeight || 1);
        
        // Validate dimensions before setting
        if (w <= 0 || h <= 0) {
            debug('P1', `Invalid resize dimensions: w=${w}, h=${h}, containerWidth=${container.clientWidth}, containerHeight=${container.clientHeight}`);
            return;
        }
        
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    
    // Animation loop
    function animate() {
        const deltaTime = clock.getDelta();
        requestAnimationFrame(animate);
        
        // Only update controls in edit mode
        if (editMode) {
            controls.update();
        }
        
        // Update all managers
        viewManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        solarSystemManager.update(deltaTime);
        debugManager.update();
        
        // Update spatial and collision systems
        if (spatialManager) {
            spatialManager.update(deltaTime);
        }
        if (collisionManager) {
            collisionManager.update(deltaTime);
        }
        
        // Update simple projectile system  
        if (window.simpleProjectileManager) {
            window.simpleProjectileManager.update();
        }
        
        // Update physics projectiles
        if (window.activeProjectiles && window.activeProjectiles.length > 0) {
            // Update and clean up projectiles
            window.activeProjectiles = window.activeProjectiles.filter(projectile => {
                if (projectile.isActive && typeof projectile.update === 'function') {
                    try {
                        projectile.update(deltaTime * 1000); // Convert to milliseconds
                        return projectile.isActive(); // Keep active projectiles
                    } catch (error) {
                        debug('P1', `Error updating projectile: ${error.message}`);
                        // Clean up failed projectile
                        if (typeof projectile.cleanup === 'function') {
                            projectile.cleanup();
                        }
                        return false; // Remove failed projectile
                    }
                } else {
                    // Clean up inactive projectiles
                    if (typeof projectile.cleanup === 'function') {
                        projectile.cleanup();
                    }
                    return false; // Remove inactive projectile
                }
            });
        }
        
        // Update wave animation if enabled
        if (oceanParams.enabled && oceanParams.wavesEnabled && planet.oceanMesh) {
            waveTime += 0.01 * oceanParams.waveSpeed;
            const positions = planet.oceanMesh.geometry.attributes.position;
            const normals = planet.oceanMesh.geometry.attributes.normal;
            
            // Update shader uniforms
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.waveTime.value = waveTime;
                waterMaterial.userData.shader.uniforms.waveHeight.value = oceanParams.waveHeight;
            }
            
            for (let i = 0; i < positions.count; i++) {
                const x = waveVertices[i * 3];
                const y = waveVertices[i * 3 + 1];
                const z = waveVertices[i * 3 + 2];
                
                // Calculate wave displacement
                const distance = Math.sqrt(x * x + y * y + z * z);
                const wave = Math.sin(waveTime + distance * oceanParams.waveFrequency) * oceanParams.waveHeight;
                
                // Apply wave displacement along normal
                positions.setXYZ(
                    i,
                    x + normals.getX(i) * wave,
                    y + normals.getY(i) * wave,
                    z + normals.getZ(i) * wave
                );
            }
            
            positions.needsUpdate = true;
            planet.oceanMesh.geometry.computeVertexNormals();
        }
        
        // Update clouds
        clouds.update();
        clouds.setSunDirection(light.position);
        
        // Update atmosphere and sync sun position
        atmosphere.setSunPosition(light.position);
        atmosphere.update(camera);
        
        // Update chunk manager with throttling to prevent worker spam
        if (planetGenerator && planetGenerator.chunkManager) {
            // Throttle chunk manager updates to prevent excessive worker creation
            const now = Date.now();
            if (!planetGenerator.chunkManager.lastUpdateTime || now - planetGenerator.chunkManager.lastUpdateTime > 100) {
                planetGenerator.chunkManager.updateSceneRepresentation(camera);
                planetGenerator.chunkManager.lastUpdateTime = now;
            }
        }
        
        // Update debug info if visible
        if (debugManager.visible) {
            updateDebugInfo();
        }
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Start animation loop
debug('UTILITY', 'Starting animation loop...');
    animate();

    // --- Camera Roll (Option+Command+Drag) Implementation ---
    let isRolling = false;
    let lastRollX = 0;
    const rollSensitivity = 0.01; // radians per pixel
    let controlsEnabledBeforeRoll = true;

    renderer.domElement.addEventListener('mousedown', (event) => {
        if (!editMode) return;
        // debug('INSPECTION', '[Roll Debug] mousedown', {
        //     altKey: event.altKey,
        //     metaKey: event.metaKey,
        //     button: event.button,
        //     buttons: event.buttons
        // });
        if ((event.button === 0 || event.button === 2) && event.altKey && event.metaKey) {
            isRolling = true;
            lastRollX = event.clientX;
            controlsEnabledBeforeRoll = controls.enabled;
            controls.enabled = false; // Temporarily disable OrbitControls
            controls._screenSpacePanningBeforeRoll = controls.screenSpacePanning;
            controls.screenSpacePanning = false; // Prevent OrbitControls from snapping up vector

            event.preventDefault();
        }
    }, true);

    renderer.domElement.addEventListener('mousemove', (event) => {
        if (!editMode) return;
        if (isRolling) {
            const deltaX = event.clientX - lastRollX;
            lastRollX = event.clientX;
            // Rotate camera's up vector around the view axis
            const viewDir = new THREE.Vector3();
            camera.getWorldDirection(viewDir);
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(viewDir, -deltaX * rollSensitivity);
            camera.up.applyQuaternion(q);
            camera.up.normalize();
            controls.target = controls.target.clone(); // Force OrbitControls to recalc
            controls.update();

            event.preventDefault();
        }
    }, true);

    renderer.domElement.addEventListener('mouseup', (event) => {
        if (isRolling) {
            isRolling = false;
            controls.enabled = controlsEnabledBeforeRoll; // Restore OrbitControls
            controls.screenSpacePanning = controls._screenSpacePanningBeforeRoll !== undefined ? controls._screenSpacePanningBeforeRoll : true;
            delete controls._screenSpacePanningBeforeRoll;
            controls.update();

            event.preventDefault();
        }
    }, true);

    // Function to cycle through celestial bodies
    function cycleCelestialBody() {
        const bodies = solarSystemManager.getCelestialBodies();
        if (bodies.length === 0) return;

        const currentBody = solarSystemManager.getCurrentEditBody();
        const currentIndex = currentBody ? bodies.indexOf(currentBody) : -1;
        const nextIndex = (currentIndex + 1) % bodies.length;
        const nextBody = bodies[nextIndex];
        
        debug('UTILITY', `Cycling to body: currentIndex=${currentIndex}, nextIndex=${nextIndex}, totalBodies=${bodies.length}`);
        
        // Update the current edit body
        solarSystemManager.setCurrentEditBody(nextBody);
        
        // Update GUI title with body name and type
        let bodyName = 'Unnamed Body';
        if (nextBody) {
            // Find the key for this body in the celestialBodies map
            let foundKey = null;
            for (const [key, body] of solarSystemManager.celestialBodies.entries()) {
                if (body === nextBody) {
                    foundKey = key;
debug('UTILITY', 'Found body key:', { key, body, starSystem: solarSystemManager.starSystem });
                    if (key === 'star') {
                        if (solarSystemManager.starSystem && solarSystemManager.starSystem.star_name) {
                            bodyName = `${solarSystemManager.starSystem.star_name} (Star)`;
                        } else {
                            debug('P1', 'Star system or star name missing');
                        }
                    } else if (key.startsWith('planet_')) {
                        const planetIndex = parseInt(key.split('_')[1]);
                        const planet = solarSystemManager.starSystem?.planets?.[planetIndex];
                        if (planet && planet.planet_name) {
                            bodyName = `${planet.planet_name} (Planet)`;
                        } else {
                            debug('P1', `Planet data missing: planetIndex=${planetIndex}`);
                        }
                    } else if (key.startsWith('moon_')) {
                        const [_, planetIndex, moonIndex] = key.split('_').map(Number);
                        const planet = solarSystemManager.starSystem?.planets?.[planetIndex];
                        const moon = planet?.moons?.[moonIndex];
                        if (moon && moon.moon_name) {
                            bodyName = `${moon.moon_name} (Moon)`;
                        } else {
                            debug('P1', `Moon data missing: planetIndex=${planetIndex}, moonIndex=${moonIndex}`);
                        }
                    }
                    break;
                }
            }
            if (!foundKey) {
                debug('P1', 'Body not found in celestialBodies map');
            }
        } else {
            debug('P1', 'nextBody is null or undefined');
        }
        guiTitle.textContent = bodyName;
        
        // Update GUI controls for the new body
        updateGUIControls(nextBody);
    }

    // Function to update GUI controls for a specific body
    function updateGUIControls(body) {
        // Remove all existing folders
        while (gui.__folders && Object.keys(gui.__folders).length > 0) {
            const folderName = Object.keys(gui.__folders)[0];
            const folder = gui.__folders[folderName];
            if (folder) {
                folder.close();
                gui.removeFolder(folder);
            }
        }
        
        // Find the key for this body in the celestialBodies map
        let bodyKey = null;
        for (const [key, value] of solarSystemManager.celestialBodies.entries()) {
            if (value === body) {
                bodyKey = key;
                break;
            }
        }
        
        if (!bodyKey) {
            debug('P1', 'No body key found for body');
            return;
        }
        
debug('UI', 'Updating GUI controls for body:', { bodyKey, body });
        
        // Add new controls based on body type
        if (bodyKey === 'star') {
            // Add star-specific controls
            const starFolder = gui.addFolder('Star Properties');
            const starParams = {
                temperature: 5000, // Default star temperature
                radius: body.geometry.parameters.radius
            };
            
            starFolder.add(starParams, 'temperature', 1000, 10000)
                .name('Temperature')
                .onChange((value) => {
                    // Update star material color based on temperature
                    const color = new THREE.Color();
                    color.setHSL(0.1 + (value - 1000) / 9000 * 0.1, 1, 0.5);
                    body.material.color = color;
                    body.material.emissive = color;
                });
                
            starFolder.add(starParams, 'radius', 0.1, 10)
                .name('Radius')
                .onChange((value) => {
                    // Update star geometry
                    const newGeometry = new THREE.SphereGeometry(value, 32, 32);
                    body.geometry.dispose();
                    body.geometry = newGeometry;
                });
                
            starFolder.open();
        } else if (bodyKey.startsWith('planet_')) {
            const planetIndex = bodyKey.split('_')[1];
            // Add planet-specific controls
            const planetFolder = gui.addFolder('Planet Properties');
            const planetParams = {
                radius: body.geometry.parameters.radius,
                rotationSpeed: solarSystemManager.rotationSpeeds.get(bodyKey) || 1.0,
                orbitSpeed: solarSystemManager.orbitalSpeeds.get(bodyKey) || 1.0
            };
            
            planetFolder.add(planetParams, 'radius', 0.1, 5)
                .name('Radius')
                .onChange((value) => {
                    // Update planet geometry
                    const newGeometry = new THREE.SphereGeometry(value, 32, 32);
                    body.geometry.dispose();
                    body.geometry = newGeometry;
                });
                
            planetFolder.add(planetParams, 'rotationSpeed', 0, 10)
                .name('Rotation Speed')
                .onChange((value) => {
                    // Store rotation speed for animation loop
                    solarSystemManager.rotationSpeeds.set(bodyKey, value);
                });
                
            planetFolder.add(planetParams, 'orbitSpeed', 0, 10)
                .name('Orbit Speed')
                .onChange((value) => {
                    // Store orbit speed for animation loop
                    solarSystemManager.orbitalSpeeds.set(bodyKey, value);
                });
                
            planetFolder.open();
        } else if (bodyKey.startsWith('moon_')) {
            const [_, planetIndex, moonIndex] = bodyKey.split('_');
            // Add moon-specific controls
            const moonFolder = gui.addFolder('Moon Properties');
            const moonParams = {
                radius: body.geometry.parameters.radius,
                rotationSpeed: solarSystemManager.rotationSpeeds.get(bodyKey) || 1.0,
                orbitSpeed: solarSystemManager.orbitalSpeeds.get(bodyKey) || 1.0
            };
            
            moonFolder.add(moonParams, 'radius', 0.1, 2)
                .name('Radius')
                .onChange((value) => {
                    // Update moon geometry
                    const newGeometry = new THREE.SphereGeometry(value, 32, 32);
                    body.geometry.dispose();
                    body.geometry = newGeometry;
                });
                
            moonFolder.add(moonParams, 'rotationSpeed', 0, 10)
                .name('Rotation Speed')
                .onChange((value) => {
                    // Store rotation speed for animation loop
                    solarSystemManager.rotationSpeeds.set(bodyKey, value);
                });
                
            moonFolder.add(moonParams, 'orbitSpeed', 0, 10)
                .name('Orbit Speed')
                .onChange((value) => {
                    // Store orbit speed for animation loop
                    solarSystemManager.orbitalSpeeds.set(bodyKey, value);
                });
                
            moonFolder.open();
        }
    }

    // Initialize warp control GUI
    warpGui = new dat.GUI({ autoPlace: false });
    warpGui.domElement.style.display = 'none';

    // Create a fixed container for the warp GUI
    warpGuiContainer = document.createElement('div');
    warpGuiContainer.id = 'warp-gui-container';
    warpGuiContainer.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        transform: none !important;
        pointer-events: auto;
        display: none;
        padding-top: 90px;
    `;

    // Add title element for warp controls
    const warpGuiTitle = document.createElement('div');
    warpGuiTitle.id = 'warp-gui-title';
    warpGuiTitle.textContent = 'Warp Drive Controls';
    warpGuiTitle.style.cssText = `
        color: white;
        font-family: monospace;
        font-size: 16px;
        text-align: center;
        background: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border-radius: 5px;
        position: absolute;
        top: 50px;
        left: 0;
        right: 0;
        z-index: 1001;
    `;
    warpGuiContainer.appendChild(warpGuiTitle);

    // Style the warp GUI element itself
    warpGui.domElement.style.cssText = `
        position: relative !important;
        transform: none !important;
        width: 300px !important;
    `;

    // Add warp GUI to our containers
    warpGuiContainer.appendChild(warpGui.domElement);
    uiContainer.appendChild(warpGuiContainer);

    // Create warp drive control folders
    const warpDriveFolder = warpGui.addFolder('Warp Drive');
    const warpEffectsFolder = warpGui.addFolder('Warp Effects');
    const impulseFolder = warpGui.addFolder('Impulse Drive');
    const starfieldFolder = warpGui.addFolder('Starfield');
    const shipPerformanceFolder = warpGui.addFolder('Ship Performance');

    // Add warp drive controls
    const maxWarpController = warpDriveFolder.add(viewManager.warpDriveManager.warpDrive, 'maxWarpFactor', 1.0, 9.9)
        .name('Max Warp Factor')
        .onChange((value) => {
debug('UTILITY', 'Max warp factor changed:', value);
        });
    maxWarpController.__li.setAttribute('title', 'Maximum warp speed achievable by the ship. Higher values allow faster interstellar travel.');

    const energyController = warpDriveFolder.add(viewManager.warpDriveManager.warpDrive, 'energyConsumptionRate', 0.1, 2.0)
        .name('Energy Consumption')
        .onChange((value) => {
debug('UTILITY', 'Energy consumption rate changed:', value);
        });
    energyController.__li.setAttribute('title', 'Rate at which the warp drive consumes ship energy. Higher values drain energy faster but may improve performance.');

    const cooldownController = warpDriveFolder.add(viewManager.warpDriveManager.warpDrive, 'cooldownTime', 5, 60)
        .name('Cooldown Time (s)')
        .onChange((value) => {
debug('UTILITY', 'Warp drive cooldown time changed:', value);
        });
    cooldownController.__li.setAttribute('title', 'Time in seconds required between warp jumps to allow the drive to cool down and recharge.');

    // Add warp effects controls
    const warpEffects = viewManager.warpDriveManager.warpEffects;
    const warpEffectsParams = {
        warpDuration: warpEffects.warpDuration,
        arrivalTime: warpEffects.arrivalTime,
        streakCount: warpEffects.streaks ? warpEffects.streaks.length : 2000,
        ringCount: warpEffects.rings ? warpEffects.rings.length : 40,
        effectColor: '#aaffff',
        warpSoundVolume: 1.0,
        redAlertVolume: 1.0
    };

    const durationController = warpEffectsFolder.add(warpEffectsParams, 'warpDuration', 8000, 20000)
        .name('Effect Duration (ms)')
        .onChange((value) => {
            warpEffects.warpDuration = value;
debug('UTILITY', 'Warp effect duration changed:', value);
        });
    durationController.__li.setAttribute('title', 'Duration of the warp effect animation in milliseconds. Longer durations create more dramatic warp sequences.');

    const arrivalController = warpEffectsFolder.add(warpEffectsParams, 'arrivalTime', 4000, 15000)
        .name('Arrival Time (ms)')
        .onChange((value) => {
            warpEffects.arrivalTime = value;
debug('UTILITY', 'Warp arrival time changed:', value);
        });
    arrivalController.__li.setAttribute('title', 'Time until arrival at destination during warp. Affects the timing of the warp exit sequence.');

    const streakController = warpEffectsFolder.add(warpEffectsParams, 'streakCount', 500, 5000)
        .name('Streak Density')
        .onChange((value) => {
            // Recreate streaks with new count
            if (warpEffects.container) {
                // Remove old streaks
                warpEffects.streaks.forEach(streak => {
                    warpEffects.container.remove(streak);
                    streak.geometry.dispose();
                    streak.material.dispose();
                });
                
                // Create new streaks
                warpEffects.streaks = [];
                for (let i = 0; i < value; i++) {
                    const streak = warpEffects.createStreak();
                    warpEffects.streaks.push(streak);
                    warpEffects.container.add(streak);
                }
            }
debug('UTILITY', 'Warp streak count changed:', value);
        });
    streakController.__li.setAttribute('title', 'Number of light streaks during warp. Higher values create a denser, more intense warp effect.');

    const ringController = warpEffectsFolder.add(warpEffectsParams, 'ringCount', 10, 100)
        .name('Ring Count')
        .onChange((value) => {
            // Recreate rings with new count
            if (warpEffects.container) {
                // Remove old rings
                warpEffects.rings.forEach(ring => {
                    warpEffects.container.remove(ring);
                    ring.geometry.dispose();
                    ring.material.dispose();
                });
                
                // Create new rings
                warpEffects.rings = [];
                const ringSpacing = 50;
                for (let i = 0; i < value; i++) {
                    const geometry = new THREE.RingGeometry(30, 31, 64);
                    const material = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(warpEffectsParams.effectColor),
                        transparent: true,
                        opacity: 0,
                        side: THREE.DoubleSide,
                        blending: THREE.AdditiveBlending
                    });
                    const ring = new THREE.Mesh(geometry, material);
                    ring.position.z = -i * ringSpacing;
                    warpEffects.rings.push(ring);
                    warpEffects.container.add(ring);
                }
            }
debug('UTILITY', 'Warp ring count changed:', value);
        });
    ringController.__li.setAttribute('title', 'Number of warp rings displayed during travel. More rings create a more pronounced tunnel effect.');

    const colorController = warpEffectsFolder.addColor(warpEffectsParams, 'effectColor')
        .name('Effect Color')
        .onChange((value) => {
            const color = new THREE.Color(value);
            // Update streak colors
            warpEffects.streaks.forEach(streak => {
                streak.material.color = color;
            });
            // Update ring colors
            warpEffects.rings.forEach(ring => {
                ring.material.color = color;
            });
debug('UTILITY', 'Warp effect color changed:', value);
        });
    colorController.__li.setAttribute('title', 'Color of the warp effect visuals. Customize the appearance of streaks and rings during warp travel.');

    const warpSoundController = warpEffectsFolder.add(warpEffectsParams, 'warpSoundVolume', 0, 1)
        .name('Warp Sound Volume')
        .onChange((value) => {
            if (warpEffects.warpSound) {
                warpEffects.warpSound.setVolume(value);
            }
debug('UTILITY', 'Warp sound volume changed:', value);
        });
    warpSoundController.__li.setAttribute('title', 'Volume of the warp drive sound effects. Adjust for the desired audio intensity during warp.');

    const alertSoundController = warpEffectsFolder.add(warpEffectsParams, 'redAlertVolume', 0, 1)
        .name('Red Alert Volume')
        .onChange((value) => {
            if (warpEffects.warpRedAlertSound) {
                warpEffects.warpRedAlertSound.setVolume(value);
            }
debug('UTILITY', 'Red alert volume changed:', value);
        });
    alertSoundController.__li.setAttribute('title', 'Volume of the red alert sound during emergency warp procedures.');

    // Add ship performance controls
    const shipPerformance = {
        acceleration: starfieldManager.acceleration,
        deceleration: starfieldManager.deceleration,
        rotationSpeed: starfieldManager.rotationSpeed,
        mouseSensitivity: starfieldManager.mouseSensitivity
    };

    const accelController = shipPerformanceFolder.add(shipPerformance, 'acceleration', 0.01, 0.1)
        .name('Acceleration')
        .onChange((value) => {
            starfieldManager.acceleration = value;
debug('UTILITY', 'Ship acceleration changed:', value);
        });
    accelController.__li.setAttribute('title', 'Rate at which the ship increases speed. Higher values mean faster acceleration.');

    const decelController = shipPerformanceFolder.add(shipPerformance, 'deceleration', 0.01, 0.1)
        .name('Deceleration')
        .onChange((value) => {
            starfieldManager.deceleration = value;
debug('UTILITY', 'Ship deceleration changed:', value);
        });
    decelController.__li.setAttribute('title', 'Rate at which the ship decreases speed. Higher values mean faster braking.');

    const turnRateController = shipPerformanceFolder.add(shipPerformance, 'rotationSpeed', 0.005, 0.05)
        .name('Turn Rate')
        .onChange((value) => {
            starfieldManager.rotationSpeed = value;
debug('UTILITY', 'Ship rotation speed changed:', value);
        });
    turnRateController.__li.setAttribute('title', 'Speed at which the ship rotates when turning. Higher values increase maneuverability.');

    // Add starfield density control
    const starfieldParams = {
        starCount: starfieldManager.starCount
    };

    const densityController = starfieldFolder.add(starfieldParams, 'starCount', 5000, 500000)
        .name('Star Density')
        .onChange((value) => {
            starfieldManager.starCount = value;
            starfieldManager.recreateStarfield();
debug('UTILITY', 'Starfield density changed:', value);
        });
    densityController.__li.setAttribute('title', 'Number of visible stars in space. Higher values create a denser star field but may impact performance.');

    // Add impulse drive controls
    const impulseSettings = {
        velocityKeys: {
            0: 0,
            1: 0.25,
            2: 0.50,
            3: 1,
            4: 1.2,
            5: 2.0,
            6: 6.0,
            7: 25,
            8: 37,
            9: 43
        }
    };

    // Add tooltips for each impulse velocity control
    for (let i = 0; i <= 9; i++) {
        const velocityController = impulseFolder.add(impulseSettings.velocityKeys, i.toString(), 0, 50)
            .name(`Impulse ${i} Velocity`)
            .onChange((value) => {
debug('UTILITY', `Impulse velocity for key ${i} changed:`, value);
            });
        velocityController.__li.setAttribute('title', `Speed setting for Impulse ${i}. Press ${i} key to engage this velocity (in metrons per second).`);
    }

    // Open all folders by default
    warpDriveFolder.open();
    warpEffectsFolder.open();
    impulseFolder.open();
    starfieldFolder.open();
    shipPerformanceFolder.open();

    // Function to toggle warp control mode
    function toggleWarpControlMode() {
        if (!warpGui) return; // Guard against calling before initialization
        
        warpControlMode = !warpControlMode;
        
        // If enabling warp control mode, ensure edit mode is off
        if (warpControlMode && editMode) {
            editMode = false;
            viewManager.setEditMode(false);
            guiContainer.style.display = 'none';
            gui.domElement.style.display = 'none';
            document.body.classList.remove('edit-mode');
            if (debugManager) {
                debugManager.setEditMode(false);
            }
        }
        
        // Update UI
        if (warpControlMode) {
            document.body.classList.add('warp-control-mode');
            warpGuiContainer.style.display = 'block';
            warpGui.domElement.style.display = 'block';
        } else {
            document.body.classList.remove('warp-control-mode');
            warpGuiContainer.style.display = 'none';
            warpGui.domElement.style.display = 'none';
        }
    }

    // Duplicate keyboard shortcuts removed - handled by global listener above

    // Debug logging function for mouse events
    function logMouseEvent(type, event) {
        if (!smartDebugManager || !smartDebugManager.config.global.enabled) return;
        debug('INSPECTION', `Mouse ${type}: ${JSON.stringify({
            button: event.button,
            buttons: event.buttons,
            modifiers: {
                ctrl: event.ctrlKey,
                alt: event.altKey,
                meta: event.metaKey,
                shift: event.shiftKey
            },
            editMode: editMode,
            controls: {
                enabled: controls.enabled,
                enableRotate: controls.enableRotate,
                enablePan: controls.enablePan,
                enableZoom: controls.enableZoom
            }
        })}`);
    }
}); 

// Make classes available globally for other modules
window.THREE = THREE;
window.WeaponEffectsManager = WeaponEffectsManager;

// Make spatial and collision managers available globally when created
function setGlobalSpatialManagers(spatial, collision) {
    window.spatialManager = spatial;
    window.collisionManager = collision;
debug('UTILITY', 'Spatial and collision managers made globally available');
}

// Add projectile debugging console command
window.checkActiveProjectiles = () => {
    if (!window.activeProjectiles) {
debug('INSPECTION', 'PROJECTILE DEBUG: No activeProjectiles array found');
        return;
    }
    
debug('INSPECTION', `PROJECTILE DEBUG: ${window.activeProjectiles.length} active projectiles`);
    window.activeProjectiles.forEach((projectile, index) => {
        const flightTimeMs = Date.now() - (projectile.launchTimeMs || projectile.launchTime || 0);
        debug('INSPECTION', `  ${index + 1}. ${projectile.weaponName || 'Unknown'} - Flight time: ${(flightTimeMs/1000).toFixed(1)}s, Active: ${projectile.isActive ? projectile.isActive() : 'N/A'}, Detonated: ${projectile.hasDetonated || false}`);
    });
}; 