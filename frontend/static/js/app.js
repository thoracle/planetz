import * as THREE from 'three';
import PlanetGenerator from './planetGenerator.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Atmosphere } from './Atmosphere.js';
import { Cloud } from './Cloud.js';
import { ViewManager } from './views/ViewManager.js';
import { StarfieldManager } from './views/StarfieldManager.js';
import { SolarSystemManager } from './SolarSystemManager.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Initialize clock for animation timing
    const clock = new THREE.Clock();
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('scene-container');
    
    if (!container) {
        console.error('Could not find scene-container element!');
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

    // Initialize FPS counter with fixed positioning but hidden
    const stats = new Stats();
    stats.dom.style.cssText = `
        position: fixed !important;
        top: 70px !important;
        left: 10px !important;
        display: none;
        z-index: 1000;
        pointer-events: none;
    `;
    document.body.appendChild(stats.dom);
    
    // Create debug info panel with fixed positioning but hidden
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = `
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
    uiContainer.appendChild(debugInfo);
    
    // Debug visibility states
    let debugVisible = false;
    let editMode = false;
    
    // Create helper objects
    const axesHelper = new THREE.AxesHelper(5);
    const gridHelper = new THREE.GridHelper(10, 10);
    
    // Initially hide helpers
    axesHelper.visible = false;
    gridHelper.visible = false;
    
    // Add helpers to scene
    scene.add(axesHelper);
    scene.add(gridHelper);
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
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
    const viewManager = new ViewManager(scene, camera, controls);

    // Initialize StarfieldManager
    const starfieldManager = new StarfieldManager(scene, camera);

    // Initialize SolarSystemManager
    const solarSystemManager = new SolarSystemManager(scene, camera);

    // Connect ViewManager and StarfieldManager
    viewManager.setStarfieldManager(starfieldManager);
    
    // Connect StarfieldManager and SolarSystemManager
    starfieldManager.setSolarSystemManager(solarSystemManager);

    // Generate initial star system
    solarSystemManager.generateStarSystem().then(success => {
        if (success) {
            console.log('Star system generated successfully');
        } else {
            console.error('Failed to generate star system');
        }
    });

    // Debug logging function for mouse events
    function logMouseEvent(type, event) {
        if (!debugVisible) return;
        console.debug(`Mouse ${type}:`, {
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
        });
    }

    // Add debug logging for initial mouse button configuration
    console.debug('THREE.MOUSE values:', {
        LEFT: THREE.MOUSE.LEFT,
        MIDDLE: THREE.MOUSE.MIDDLE,
        RIGHT: THREE.MOUSE.RIGHT,
        ROTATE: THREE.MOUSE.ROTATE,
        DOLLY: THREE.MOUSE.DOLLY,
        PAN: THREE.MOUSE.PAN
    });

    // Always use left mouse button for all camera actions
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = undefined;
    controls.mouseButtons.RIGHT = undefined;

    // Simplified modifier-based camera controls for MacBook/trackpad
    function updateControlScheme(event) {
        if (!editMode) return;

        // Determine which modifier is held
        const isOption = event.altKey;
        const isCommand = event.metaKey;
        const isOptionCommand = event.altKey && event.metaKey;

        // Only allow one mode at a time (priority: Option+Command > Command > Option)
        if (isOptionCommand) {
            // Option+Command+Drag: Rotate
            controls.enablePan = false;
            controls.enableRotate = false;
            if (typeof controls.enableCameraRotate === 'function') {
                controls.enableCameraRotate(true);
            }
        } else if (isCommand) {
            // Command+Drag: Pan
            controls.enablePan = true;
            controls.enableRotate = false;
            if (typeof controls.enableCameraRotate === 'function') {
                controls.enableCameraRotate(false);
            }
        } else if (isOption) {
            // Option+Drag: Orbit
            controls.enablePan = false;
            controls.enableRotate = true;
            if (typeof controls.enableCameraRotate === 'function') {
                controls.enableCameraRotate(false);
            }
        } else {
            // No modifier: disable all
            controls.enablePan = false;
            controls.enableRotate = false;
            if (typeof controls.enableCameraRotate === 'function') {
                controls.enableCameraRotate(false);
            }
        }
    }

    // Handle key combinations for camera controls
    document.addEventListener('keydown', (event) => {
        updateControlScheme(event);
        // Prevent default browser behaviors when using modifier keys in edit mode
        if (editMode && (event.metaKey || event.altKey || event.ctrlKey)) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        // Always update control scheme on keyup
        updateControlScheme(event);
    });

    // Remove all dynamic remapping from mousedown/mouseup handlers
    // Only keep terraforming logic for mousedown with no modifier
    container.addEventListener('mousedown', (event) => {
        logMouseEvent('down', event);
        // Only handle terraforming if in edit mode and no modifier keys
        const hasModifier = event.altKey || event.metaKey || event.ctrlKey;
        if (editMode) {
            if (hasModifier) {
                // Let OrbitControls handle the event
                return;
            }
            event.preventDefault();
            event.stopPropagation();  // Prevent event from reaching OrbitControls
            handleTerraforming(event);
            const handleMouseMove = (moveEvent) => {
                const hasModifier = moveEvent.altKey || moveEvent.metaKey || moveEvent.ctrlKey;
                if (!hasModifier) {
                    moveEvent.preventDefault();
                    moveEvent.stopPropagation();  // Prevent event from reaching OrbitControls
                    handleTerraforming(moveEvent);
                }
            };
            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    }, { capture: true });

    // Remove all dynamic mouse button logic from mousemove/mouseup
    // Let OrbitControls handle camera movement when a modifier is held

    // Handle wheel events only when in edit mode
    container.addEventListener('wheel', (event) => {
        if (!editMode) return;

        const now = performance.now();
        if (now - lastWheelLogTime > 100) {
            console.debug('Wheel event:', {
                delta: {
                    x: event.deltaX,
                    y: event.deltaY,
                    mode: event.deltaMode
                },
                modifiers: {
                    ctrl: event.ctrlKey,
                    alt: event.altKey,
                    meta: event.metaKey,
                    shift: event.shiftKey
                },
                editMode: editMode,
                camera: {
                    zoom: camera.zoom,
                    position: camera.position.clone().toArray(),
                    distance: camera.position.length()
                }
            });
            lastWheelLogTime = now;
        }

        // Handle zooming
        const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
        const isTwoFingerGesture = Math.abs(event.deltaX) > 0;

        if (hasModifier || isTwoFingerGesture) {
            controls.enabled = true;
            controls.enableZoom = true;
            event.preventDefault();
            event.stopPropagation();
        } else {
            controls.enabled = false;
            controls.enableZoom = false;
        }
    }, { passive: false });

    // Handle touch events
    let touchStartTime = 0;
    let touchStartDistance = 0;
    
    container.addEventListener('touchstart', (event) => {
        if (!editMode) return;
        
        touchStartTime = performance.now();
        if (event.touches.length === 2) {
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            controls.enabled = true;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (event) => {
        if (!editMode) return;
        
        if (event.touches.length === 2) {
            event.preventDefault();
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const deltaDistance = distance - touchStartDistance;
            
            // Enable zooming for two-finger pinch
            controls.enabled = true;
            controls.enableZoom = true;
            
            // Update touch start distance for next move event
            touchStartDistance = distance;
        }
    }, { passive: false });

    container.addEventListener('touchend', (event) => {
        if (!editMode) return;
        
        const touchEndTime = performance.now();
        const touchDuration = touchEndTime - touchStartTime;
        
        // Reset controls after touch
        if (event.touches.length === 0) {
            controls.enabled = false;
            controls.enableZoom = false;
            touchStartDistance = 0;
        }
        
        console.debug('Touch interaction ended:', {
            duration: touchDuration,
            remainingTouches: event.touches.length,
            controls: {
                enabled: controls.enabled,
                enableZoom: controls.enableZoom
            }
        });
    });

    // Prevent context menu in edit mode to avoid interfering with controls
    container.addEventListener('contextmenu', (event) => {
        if (editMode) {
            event.preventDefault();
        }
    });

    // Handle terraforming clicks
    container.addEventListener('mousedown', (event) => {
        logMouseEvent('down', event);
        
        // Only handle terraforming if in edit mode and no modifier keys
        const hasModifier = event.altKey || event.metaKey || event.ctrlKey;
        if (editMode) {
            if (hasModifier) {
                // Let OrbitControls handle the event
                return;
            }
            
            event.preventDefault();
            event.stopPropagation();  // Prevent event from reaching OrbitControls
            handleTerraforming(event);
            
            const handleMouseMove = (moveEvent) => {
                const hasModifier = moveEvent.altKey || moveEvent.metaKey || moveEvent.ctrlKey;
                if (!hasModifier) {
                    moveEvent.preventDefault();
                    moveEvent.stopPropagation();  // Prevent event from reaching OrbitControls
                    handleTerraforming(moveEvent);
                }
            };
            
            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    }, { capture: true });  // Use capture phase to handle event before OrbitControls

    // Set up GUI controls with fixed positioning
    console.log('Setting up GUI...');
    const gui = new dat.GUI({ autoPlace: false });
    gui.domElement.style.display = 'none';
    
    // Create a fixed container for the GUI
    const guiContainer = document.createElement('div');
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
    console.log('Creating planet generator...');
    const planetGenerator = new PlanetGenerator(64);
    console.log('Planet generator created with params:', planetGenerator.params);

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
    console.log('Creating initial geometry...');
    const geometryParams = {
        subdivisionLevel: 4,  // Default subdivision level
        radius: 1
    };
    let geometry = new THREE.IcosahedronGeometry(geometryParams.radius, geometryParams.subdivisionLevel);

    // Create initial planet mesh
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    
    console.log('Initial planet mesh created:', {
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
            console.log('Planet type changed to:', value);
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
            console.log('Terrain height changed to:', value);
            planetGenerator.params.terrainHeight = value;
            updatePlanetGeometry();
        });
    terrainHeightController.__li.setAttribute('title', 'Controls the maximum height of terrain features. Higher values create more dramatic elevation changes.');
    
    const noiseScaleController = controlsFolder.add(planetGenerator.params, 'noiseScale', 0.1, 2.0)
        .name('Noise Scale')
        .onChange((value) => {
            console.log('Noise scale changed to:', value);
            planetGenerator.params.noiseScale = value;
            updatePlanetGeometry();
        });
    noiseScaleController.__li.setAttribute('title', 'Controls the size of terrain features. Lower values create larger features, higher values create smaller details.');
    
    const octavesController = controlsFolder.add(planetGenerator.params, 'octaves', 1, 8, 1)
        .name('Noise Octaves')
        .onChange((value) => {
            console.log('Octaves changed to:', value);
            planetGenerator.params.octaves = value;
            updatePlanetGeometry();
        });
    octavesController.__li.setAttribute('title', 'Number of noise layers. Higher values add more detail and complexity to the terrain.');
    
    const persistenceController = controlsFolder.add(planetGenerator.params, 'persistence', 0.1, 1.0)
        .name('Noise Persistence')
        .onChange((value) => {
            console.log('Persistence changed to:', value);
            planetGenerator.params.persistence = value;
            updatePlanetGeometry();
        });
    persistenceController.__li.setAttribute('title', 'Controls how much each octave contributes to the overall shape. Higher values make smaller details more prominent.');
    
    const lacunarityController = controlsFolder.add(planetGenerator.params, 'lacunarity', 0.1, 4.0)
        .name('Noise Lacunarity')
        .onChange((value) => {
            console.log('Lacunarity changed to:', value);
            planetGenerator.params.lacunarity = value;
            updatePlanetGeometry();
        });
    lacunarityController.__li.setAttribute('title', 'Controls how much detail is added in each octave. Higher values create more varied terrain features.');

    // Add texture controls
    const textureFolder = gui.addFolder('Texture Settings');
    const roughnessController = textureFolder.add(planetColors[planetTypes.currentType], 'roughness', 0.1, 1.0)
        .name('Surface Roughness')
        .onChange((value) => {
            console.log('Roughness changed to:', value);
            planetColors[planetTypes.currentType].roughness = value;
            updatePlanetGeometry();
        });
    roughnessController.__li.setAttribute('title', 'Controls how pronounced the surface details are. Higher values create more dramatic surface variations.');
    
    const detailScaleController = textureFolder.add(planetColors[planetTypes.currentType], 'detailScale', 0.5, 5.0)
        .name('Detail Scale')
        .onChange((value) => {
            console.log('Detail scale changed to:', value);
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
            console.log('Ocean enabled:', value);
            if (planet.oceanMesh) {
                planet.oceanMesh.visible = value;
            }
        });
    oceanFolder.add(oceanParams, 'wavesEnabled')
        .name('Enable Waves')
        .onChange((value) => {
            console.log('Waves enabled:', value);
        });
    oceanFolder.add(oceanParams, 'depth', 0, 0.5)
        .name('Ocean Depth')
        .onChange((value) => {
            console.log('Ocean depth changed to:', value);
            updatePlanetGeometry();
        });
    oceanFolder.addColor(oceanParams, 'color')
        .name('Ocean Color')
        .onChange((value) => {
            console.log('Ocean color changed to:', value);
            waterMaterial.color.setHex(value);
        });
    oceanFolder.add(oceanParams, 'waveHeight', 0, 0.1)
        .name('Wave Height')
        .onChange((value) => {
            console.log('Wave height changed to:', value);
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.waveHeight.value = value;
            }
        });
    oceanFolder.add(oceanParams, 'waveSpeed', 0.1, 5.0)
        .name('Wave Speed')
        .onChange((value) => {
            console.log('Wave speed changed to:', value);
        });
    oceanFolder.add(oceanParams, 'waveFrequency', 0.5, 5.0)
        .name('Wave Frequency')
        .onChange((value) => {
            console.log('Wave frequency changed to:', value);
        });
    oceanFolder.add(oceanParams, 'foamThreshold', 0.1, 1.0)
        .name('Foam Threshold')
        .onChange((value) => {
            console.log('Foam threshold changed to:', value);
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.foamThreshold.value = value;
            }
        });
    oceanFolder.add(oceanParams, 'foamIntensity', 0.0, 1.0)
        .name('Foam Intensity')
        .onChange((value) => {
            console.log('Foam intensity changed to:', value);
            if (waterMaterial.userData.shader) {
                waterMaterial.userData.shader.uniforms.foamIntensity.value = value;
            }
        });
    oceanFolder.open();
    
    // Add a button to generate a new planet
    const newPlanetButton = {
        generateNewPlanet: function() {
            console.log('Generating new planet...');
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
            console.log('Subdivision level changed to:', value);
            updatePlanetGeometry();
        });
    geometryFolder.open();
    
    // Function to handle terraforming
    function handleTerraforming(event) {
        if (!editMode) {
            console.log('Terraforming blocked: Not in edit mode');
            return;
        }

        // Calculate mouse position in normalized device coordinates
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        console.log('Terraforming attempt:', {
            mouseNormalized: { x: mouse.x, y: mouse.y },
            shiftKey: event.shiftKey,
            mode: event.shiftKey ? 'lower' : 'raise'
        });

        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);

        // Find intersections with the planet
        const intersects = raycaster.intersectObject(planet);
        
        if (intersects.length > 0) {
            console.log('Hit detected:', {
                distance: intersects[0].distance,
                point: intersects[0].point.toArray(),
                normal: intersects[0].face.normal.toArray()
            });
            
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
                
                console.log('Geometry updated after terraforming');
                updateDebugInfo(); // Update debug info after geometry changes
            }
        } else {
            console.log('No intersection with planet');
        }
    }

    // Function to toggle debug visibility
    function toggleDebugMode() {
        debugVisible = !debugVisible;
        stats.dom.style.display = debugVisible ? 'block' : 'none';
        debugInfo.style.display = debugVisible ? 'block' : 'none';
        updateDebugInfo();
    }
    
    // Function to toggle edit mode
    function toggleEditMode() {
        editMode = !editMode;
        viewManager.setEditMode(editMode);
        
        // Update debug visibility
        axesHelper.visible = editMode;
        gridHelper.visible = editMode;
        
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
                updateGUIControls(firstBody); // Update GUI controls for the first body
                
                // Update GUI title with proper name format
                let bodyName = 'Unnamed Body';
                if (firstBody === solarSystemManager.celestialBodies.get('star')) {
                    if (solarSystemManager.starSystem && solarSystemManager.starSystem.star_name) {
                        bodyName = `${solarSystemManager.starSystem.star_name} (Star)`;
                    }
                } else {
                    for (const [key, body] of solarSystemManager.celestialBodies.entries()) {
                        if (body === firstBody) {
                            if (key.startsWith('planet_')) {
                                const planetIndex = parseInt(key.split('_')[1]);
                                const planet = solarSystemManager.starSystem?.planets?.[planetIndex];
                                if (planet && planet.planet_name) {
                                    bodyName = `${planet.planet_name} (Planet)`;
                                }
                            } else if (key.startsWith('moon_')) {
                                const [_, planetIndex, moonIndex] = key.split('_').map(Number);
                                const planet = solarSystemManager.starSystem?.planets?.[planetIndex];
                                const moon = planet?.moons?.[moonIndex];
                                if (moon && moon.moon_name) {
                                    bodyName = `${moon.moon_name} (Moon)`;
                                }
                            }
                            break;
                        }
                    }
                }
                guiTitle.textContent = bodyName;
            }
        } else {
            document.body.classList.remove('edit-mode');
            guiContainer.style.display = 'none';
            gui.domElement.style.display = 'none';
        }
        
        // Update debug info
        updateDebugInfo();
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey) {
            if (event.key === 'd') {
                event.preventDefault();
                toggleDebugMode();
            } else if (event.key === 'e') {
                event.preventDefault();
                toggleEditMode();
            }
        } else if (editMode && event.key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            cycleCelestialBody();
            return false;
        }
    }, true);
    
    console.log('Container dimensions:', {
        width: container.clientWidth,
        height: container.clientHeight
    });
    
    // Function to create fresh geometry
    function createPlanetGeometry() {
        console.log('Creating fresh geometry with subdivision level:', geometryParams.subdivisionLevel);
        const newGeometry = new THREE.IcosahedronGeometry(geometryParams.radius, geometryParams.subdivisionLevel);
            return newGeometry;
    }
    
    // Function to update planet geometry and colors
    function updatePlanetGeometry() {
        console.log('Starting planet geometry update...');
        
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
        if (debugVisible) {
            let html = '';
            
            // Add solar system info
            const solarSystemInfo = solarSystemManager.getDebugInfo();
            for (const [key, value] of Object.entries(solarSystemInfo)) {
                html += `${key}: ${value}<br>`;
            }
            
            // Add camera position
            const pos = camera.position;
            html += `<br>Camera Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>`;
            
            debugInfo.innerHTML = html;
        }
    }
    
    // Initial geometry update
    updatePlanetGeometry();
    
    // Add lights
    console.log('Setting up lights...');
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 3;
    
    console.log('Camera position:', {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    });

    // Create atmosphere
    console.log('Creating atmosphere...');
    const atmosphere = new Atmosphere(geometryParams.radius);
    scene.add(atmosphere.mesh);

    // Create cloud layer
    console.log('Creating cloud layer...');
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
            console.log('Rayleigh changed');
        });

    atmosphereFolder.add(atmosphere.material.uniforms.mieCoefficient, 'value', 0, 0.1)
        .name('Mie Coefficient')
        .onChange(() => {
            console.log('Mie coefficient changed');
        });

    atmosphereFolder.add(atmosphere.material.uniforms.mieDirectionalG, 'value', 0, 1)
        .name('Mie Directional G')
        .onChange(() => {
            console.log('Mie directional G changed');
        });

    atmosphereFolder.add(atmosphere.material.uniforms.sunIntensity, 'value', 0, 50)
        .name('Sun Intensity')
        .onChange(() => {
            console.log('Sun intensity changed');
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
            console.log('Atmosphere color changed');
        });

    // Add scale control
    const atmosphereScale = { value: 1.1 };
    atmosphereFolder.add(atmosphereScale, 'value', 1.01, 1.5)
        .name('Atmosphere Scale')
        .onChange((value) => {
            atmosphere.mesh.scale.set(value, value, value);
            atmosphere.setAtmosphereRadius(geometryParams.radius * value);
            console.log('Atmosphere scale changed');
        });

    atmosphereFolder.open();

    // Add cloud controls to GUI
    const cloudFolder = gui.addFolder('Clouds');
    
    cloudFolder.add(clouds.material.uniforms.coverage, 'value', 0, 1)
        .name('Cloud Coverage')
        .onChange((value) => {
            clouds.setCoverage(value);
            console.log('Cloud coverage changed');
        });

    cloudFolder.add(clouds.material.uniforms.density, 'value', 0, 1)
        .name('Cloud Density')
        .onChange((value) => {
            clouds.setDensity(value);
            console.log('Cloud density changed');
        });

    cloudFolder.add(clouds.material.uniforms.cloudSpeed, 'value', 0, 2)
        .name('Cloud Speed')
        .onChange((value) => {
            clouds.setCloudSpeed(value);
            console.log('Cloud speed changed');
        });

    cloudFolder.add(clouds.material.uniforms.turbulence, 'value', 0, 2)
        .name('Turbulence')
        .onChange((value) => {
            clouds.setTurbulence(value);
            console.log('Cloud turbulence changed');
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
            console.log('Cloud color changed');
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
        console.log('Window resized');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // Animation loop
    function animate() {
        const deltaTime = clock.getDelta();
        requestAnimationFrame(animate);
        
        // Only update controls in edit mode
        if (editMode) {
            controls.update();
        }
        
        // Update starfield
        starfieldManager.update(deltaTime);
        
        // Update solar system
        solarSystemManager.update(deltaTime);
        
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
        
        // Update chunk manager (scene presence and culling)
        if (planetGenerator && planetGenerator.chunkManager) {
            planetGenerator.chunkManager.updateSceneRepresentation(camera);
        }
        
        // Update debug info if visible
        if (debugVisible) {
            updateDebugInfo();
        }
        
        // Render scene
        renderer.render(scene, camera);
        stats.update();
    }
    
    // Start animation loop
    console.log('Starting animation loop...');
    animate();

    // --- Camera Roll (Option+Command+Drag) Implementation ---
    let isRolling = false;
    let lastRollX = 0;
    const rollSensitivity = 0.01; // radians per pixel
    let controlsEnabledBeforeRoll = true;

    renderer.domElement.addEventListener('mousedown', (event) => {
        if (!editMode) return;
        console.debug('[Roll Debug] mousedown', {
            altKey: event.altKey,
            metaKey: event.metaKey,
            button: event.button,
            buttons: event.buttons
        });
        if ((event.button === 0 || event.button === 2) && event.altKey && event.metaKey) {
            isRolling = true;
            lastRollX = event.clientX;
            controlsEnabledBeforeRoll = controls.enabled;
            controls.enabled = false; // Temporarily disable OrbitControls
            controls._screenSpacePanningBeforeRoll = controls.screenSpacePanning;
            controls.screenSpacePanning = false; // Prevent OrbitControls from snapping up vector
            console.debug('[Roll Debug] Roll mode STARTED');
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
            console.debug('[Roll Debug] Rolling', { deltaX, rollAngle: -deltaX * rollSensitivity });
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
            console.debug('[Roll Debug] Roll mode ENDED');
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
        
        console.log('Cycling to body:', {
            currentBody,
            nextBody,
            currentIndex,
            nextIndex,
            totalBodies: bodies.length,
            starSystem: solarSystemManager.starSystem,
            celestialBodies: Array.from(solarSystemManager.celestialBodies.entries())
        });
        
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
                    console.log('Found body key:', { key, body, starSystem: solarSystemManager.starSystem });
                    if (key === 'star') {
                        if (solarSystemManager.starSystem && solarSystemManager.starSystem.star_name) {
                            bodyName = `${solarSystemManager.starSystem.star_name} (Star)`;
                        } else {
                            console.warn('Star system or star name missing:', solarSystemManager.starSystem);
                        }
                    } else if (key.startsWith('planet_')) {
                        const planetIndex = parseInt(key.split('_')[1]);
                        const planet = solarSystemManager.starSystem?.planets?.[planetIndex];
                        if (planet && planet.planet_name) {
                            bodyName = `${planet.planet_name} (Planet)`;
                        } else {
                            console.warn('Planet data missing:', { planetIndex, planet });
                        }
                    } else if (key.startsWith('moon_')) {
                        const [_, planetIndex, moonIndex] = key.split('_').map(Number);
                        const planet = solarSystemManager.starSystem?.planets?.[planetIndex];
                        const moon = planet?.moons?.[moonIndex];
                        if (moon && moon.moon_name) {
                            bodyName = `${moon.moon_name} (Moon)`;
                        } else {
                            console.warn('Moon data missing:', { planetIndex, moonIndex, planet, moon });
                        }
                    }
                    break;
                }
            }
            if (!foundKey) {
                console.warn('Body not found in celestialBodies map:', nextBody);
            }
        } else {
            console.warn('nextBody is null or undefined');
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
            console.warn('No body key found for:', body);
            return;
        }
        
        console.log('Updating GUI controls for body:', { bodyKey, body });
        
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
}); 