document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
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

    // Initialize FPS counter with fixed positioning
    const stats = new Stats();
    stats.dom.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        left: 10px !important;
        transform: none !important;
        display: none;
        pointer-events: auto;
    `;
    uiContainer.appendChild(stats.dom);
    
    // Create debug info panel with fixed positioning
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = `
        position: fixed !important;
        top: 70px !important;
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
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.panSpeed = 1.0;        // Adjust pan sensitivity
    controls.rotateSpeed = 1.0;     // Adjust rotation sensitivity
    
    // Disable controls by default (will be enabled only with modifier keys)
    controls.enabled = false;

    // Define control schemes
    const controlSchemes = {
        none: {
            LEFT: undefined,
            MIDDLE: undefined,
            RIGHT: undefined
        },
        pan: {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: undefined,
            RIGHT: undefined
        },
        rotate: {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: undefined,
            RIGHT: undefined
        }
    };

    // Prevent context menu in edit mode
    container.addEventListener('contextmenu', (event) => {
        if (editMode) {
            event.preventDefault();
        }
    });

    // Add debug logging for control events
    controls.addEventListener('start', function(event) {
        console.log('Controls interaction started:', {
            type: event.type,
            target: {
                position: camera.position.clone().toArray(),
                rotation: camera.rotation.clone().toArray()
            },
            editMode: editMode,
            currentMouseButtons: { ...controls.mouseButtons }
        });
    });

    controls.addEventListener('end', function(event) {
        console.log('Controls interaction ended:', {
            type: event.type,
            target: {
                position: camera.position.clone().toArray(),
                rotation: camera.rotation.clone().toArray()
            },
            editMode: editMode,
            currentMouseButtons: { ...controls.mouseButtons }
        });
    });

    // Only log significant changes to avoid spam
    let lastLogTime = 0;
    let lastPosition = new THREE.Vector3();
    let lastRotation = new THREE.Euler();
    
    controls.addEventListener('change', function(event) {
        const now = performance.now();
        const positionChanged = !camera.position.equals(lastPosition);
        const rotationChanged = !camera.rotation.equals(lastRotation);
        
        // Only log if significant time has passed or significant change occurred
        if (now - lastLogTime > 100 && (positionChanged || rotationChanged)) {
            console.log('Controls changed:', {
                type: event.type,
                camera: {
                    position: camera.position.clone().toArray(),
                    rotation: camera.rotation.clone().toArray(),
                    distance: camera.position.length()
                },
                controls: {
                    target: controls.target.clone().toArray(),
                    zoom: camera.zoom
                },
                editMode: editMode
            });
            
            lastLogTime = now;
            lastPosition.copy(camera.position);
            lastRotation.copy(camera.rotation);
        }
    });
    
    // Handle key combinations for camera controls
    document.addEventListener('keydown', (event) => {
        if (editMode) {
            // Enable controls when Option, Command, or Control is held
            const hasModifier = event.altKey || event.metaKey || event.ctrlKey;
            controls.enabled = hasModifier;
            
            if (!hasModifier) {
                Object.assign(controls.mouseButtons, controlSchemes.none);
                return;
            }

            let scheme = controlSchemes.none;

            // Determine the control scheme based on modifier keys
            if (event.ctrlKey) {
                scheme = controlSchemes.rotate;   // Control: Rotate
            } else if (event.metaKey && !event.altKey) {
                scheme = controlSchemes.pan;      // Command alone: Pan
            } else if (event.altKey && !event.metaKey) {
                scheme = controlSchemes.rotate;   // Option alone: Orbit
            }

            // Update the control scheme
            Object.assign(controls.mouseButtons, scheme);
            
            console.log('Control mode changed:', {
                scheme: scheme === controlSchemes.pan ? 'PAN' : 
                        scheme === controlSchemes.rotate ? 'ROTATE' : 'NONE',
                trigger: {
                    key: event.key,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    metaKey: event.metaKey
                },
                editMode: editMode
            });
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (editMode) {
            // Check if any modifier is still held
            const hasModifier = event.altKey || event.metaKey || event.ctrlKey;
            controls.enabled = hasModifier;
            
            if (!hasModifier) {
                Object.assign(controls.mouseButtons, controlSchemes.none);
                return;
            }

            let scheme = controlSchemes.none;

            // Determine the control scheme based on remaining modifier keys
            if (event.ctrlKey) {
                scheme = controlSchemes.rotate;   // Control: Rotate
            } else if (event.metaKey && !event.altKey) {
                scheme = controlSchemes.pan;      // Command alone: Pan
            } else if (event.altKey && !event.metaKey) {
                scheme = controlSchemes.rotate;   // Option alone: Orbit
            }

            // Update the control scheme
            Object.assign(controls.mouseButtons, scheme);
            
            console.log('Control mode reset:', {
                scheme: scheme === controlSchemes.pan ? 'PAN' : 
                        scheme === controlSchemes.rotate ? 'ROTATE' : 'NONE',
                trigger: {
                    key: event.key,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    metaKey: event.metaKey
                },
                editMode: editMode
            });
        }
    });

    // Set initial control mode
    Object.assign(controls.mouseButtons, controlSchemes.none);
    console.log('Initial control mode set:', {
        mode: 'NONE',
        mouseButtons: { ...controls.mouseButtons },
        editMode: editMode
    });

    // Add mouse event debugging with rate limiting
    let lastMouseLogTime = 0;
    
    function logMouseEvent(eventName, event) {
        const now = performance.now();
        if (now - lastMouseLogTime > 100) { // Log at most every 100ms
            console.log(`Mouse ${eventName}:`, {
                button: event.button,
                buttons: event.buttons,
                coords: {
                    client: { x: event.clientX, y: event.clientY },
                    relative: {
                        x: ((event.clientX - container.getBoundingClientRect().left) / container.clientWidth) * 2 - 1,
                        y: -((event.clientY - container.getBoundingClientRect().top) / container.clientHeight) * 2 + 1
                    }
                },
                modifiers: {
                    ctrl: event.ctrlKey,
                    alt: event.altKey,
                    meta: event.metaKey,
                    shift: event.shiftKey
                },
                editMode: editMode,
                controls: {
                    enabled: controls.enabled,
                    mouseButtons: { ...controls.mouseButtons }
                }
            });
            lastMouseLogTime = now;
        }
    }

    // Configure two-finger zoom and wheel behavior
    controls.touches = {
        ONE: undefined,           // No action for one finger
        TWO: THREE.TOUCH.DOLLY   // Two fingers for zooming
    };

    // Handle wheel events only when in edit mode
    container.addEventListener('wheel', (event) => {
        if (!editMode) return;

        const now = performance.now();
        if (now - lastWheelLogTime > 100) { // Log at most every 100ms
            console.log('Wheel event:', {
                delta: {
                    y: event.deltaY,
                    mode: event.deltaMode
                },
                modifiers: {
                    ctrl: event.ctrlKey,
                    alt: event.altKey,
                    meta: event.metaKey
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

        // Allow zooming with two-finger gesture or when a modifier key is held
        if (event.ctrlKey || event.altKey || event.metaKey || Math.abs(event.deltaX) > 0) {
            // This is likely a two-finger gesture or modifier key is held
            controls.enabled = true;
        } else {
            event.preventDefault();
            event.stopPropagation();
            controls.enabled = false;
        }
    }, { passive: false });

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
    `;
    
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
        'Class-M': { base: 0x4a9eff, high: 0xffffff, low: 0x1a4a7f },
        'Class-L': { base: 0x8b4513, high: 0xd2691e, low: 0x3d1f0d },
        'Class-H': { base: 0xd2691e, high: 0xffd700, low: 0x8b4513 },
        'Class-D': { base: 0x800000, high: 0xff4500, low: 0x400000 },
        'Class-J': { base: 0xffd700, high: 0xffffff, low: 0xdaa520 },
        'Class-K': { base: 0xa0522d, high: 0xd2691e, low: 0x6b3419 },
        'Class-N': { base: 0xdaa520, high: 0xffd700, low: 0x8b6914 },
        'Class-Y': { base: 0x8b0000, high: 0xff0000, low: 0x4d0000 }
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
            // Update the tooltip when value changes
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
    controlsFolder.add(planetGenerator.params, 'terrainHeight', 0, 0.5)
        .name('Terrain Height')
        .onChange((value) => {
            console.log('Terrain height changed to:', value);
            planetGenerator.params.terrainHeight = value;
            updatePlanetGeometry();
        });
    
    controlsFolder.add(planetGenerator.params, 'noiseScale', 0.1, 2.0)
        .name('Noise Scale')
        .onChange((value) => {
            console.log('Noise scale changed to:', value);
            planetGenerator.params.noiseScale = value;
            updatePlanetGeometry();
        });
    
    controlsFolder.add(planetGenerator.params, 'octaves', 1, 8, 1)
        .name('Noise Octaves')
        .onChange((value) => {
            console.log('Octaves changed to:', value);
            planetGenerator.params.octaves = value;
            updatePlanetGeometry();
        });
    
    controlsFolder.add(planetGenerator.params, 'persistence', 0.1, 1.0)
        .name('Noise Persistence')
        .onChange((value) => {
            console.log('Persistence changed to:', value);
            planetGenerator.params.persistence = value;
            updatePlanetGeometry();
        });
    
    controlsFolder.add(planetGenerator.params, 'lacunarity', 0.1, 4.0)
        .name('Noise Lacunarity')
        .onChange((value) => {
            console.log('Lacunarity changed to:', value);
            planetGenerator.params.lacunarity = value;
            updatePlanetGeometry();
        });
    
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
                    
                    // Update color based on new height
                    const height = vertex.length();
                    const heightFactor = (height - 1) / planetGenerator.params.terrainHeight;
                    const planetColor = planetColors[planetTypes.currentType];
                    
                    const color = new THREE.Color();
                    if (heightFactor < 0.3) {
                        color.setHex(planetColor.low);
                    } else if (heightFactor > 0.7) {
                        color.setHex(planetColor.high);
                    } else {
                        color.setHex(planetColor.base);
                    }
                    
                    colors.setXYZ(i, color.r, color.g, color.b);
                }
            }
            
            if (verticesModified) {
                // Update geometry
                positions.needsUpdate = true;
                colors.needsUpdate = true;
                geometry.computeVertexNormals();
                
                console.log('Geometry updated after terraforming');
                updateDebugInfo(); // Update debug info after geometry changes
            }
        } else {
            console.log('No intersection with planet');
        }
    }

    // Function to toggle debug visibility
    function toggleDebug() {
        debugVisible = !debugVisible;
        stats.dom.style.display = debugVisible ? 'block' : 'none';
        debugInfo.style.display = debugVisible ? 'block' : 'none';
        updateDebugInfo();
    }
    
    // Function to toggle edit mode
    function toggleEditMode() {
        editMode = !editMode;
        console.log('Edit mode toggled:', {
            editMode: editMode,
            controlsEnabled: controls.enabled
        });
        axesHelper.visible = editMode;
        gridHelper.visible = editMode;
        guiContainer.style.display = editMode ? 'block' : 'none';
        gui.domElement.style.display = editMode ? 'block' : 'none';
        controls.enabled = editMode;
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey) {
            if (event.key === 'd') {
                event.preventDefault(); // Prevent default browser behavior
                toggleDebug();
            } else if (event.key === 'e') {
                event.preventDefault(); // Prevent default browser behavior
                toggleEditMode();
            }
        }
    });
    
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
        
        // Update chunks within view radius
        const radius = 100; // Reduced from 1000 to 100 for better performance
        planetGenerator.chunkManager.updateChunksInRadius(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            radius
        );

        // Update planet mesh with new geometry
        const newGeometry = createPlanetGeometry();
        planet.geometry.dispose();
        planet.geometry = newGeometry;
        
        // Get current parameters
        const { terrainHeight, noiseScale, octaves, persistence, lacunarity } = planetGenerator.params;
        
        // Apply terrain deformation
        const positions = newGeometry.attributes.position;
        const newPositions = new Float32Array(positions.count * 3);
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Calculate distance from center (normalized to 0-1 range)
            const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
            
            // Base density (negative inside planet, positive outside)
            let density = 1.0 - distanceFromCenter;
            
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
                const height = 1 + noiseValue * terrainHeight;
                
                // Update vertex position
                newPositions[i * 3] = x * height;
                newPositions[i * 3 + 1] = y * height;
                newPositions[i * 3 + 2] = z * height;
            } else {
                // Keep original position for points far from surface
                newPositions[i * 3] = x;
                newPositions[i * 3 + 1] = y;
                newPositions[i * 3 + 2] = z;
            }
        }
        
        // Update geometry with new positions
        newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        newGeometry.computeVertexNormals();
        
        // Update colors based on planet type
        const colors = planetColors[planetTypes.currentType];
        const colorArray = new Float32Array(newGeometry.attributes.position.count * 3);
        
        for (let i = 0; i < newGeometry.attributes.position.count; i++) {
            const x = newGeometry.attributes.position.getX(i);
            const y = newGeometry.attributes.position.getY(i);
            const z = newGeometry.attributes.position.getZ(i);
            
            // Calculate height factor based on position
            const height = Math.sqrt(x * x + y * y + z * z);
            const heightFactor = (height - 1) / terrainHeight; // Normalize height factor
            
            // Interpolate color based on height
            const color = new THREE.Color();
            if (heightFactor < 0.3) {
                color.setHex(colors.low);
            } else if (heightFactor > 0.7) {
                color.setHex(colors.high);
            } else {
                color.setHex(colors.base);
            }
            
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
        }
        
        newGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        // Update debug info after geometry changes
        updateDebugInfo();
    }
    
    // Function to update debug info
    function updateDebugInfo() {
        if (debugVisible) {
            const geometry = planet.geometry;
            const vertexCount = geometry.attributes.position.count;
            const triangleCount = geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
            
            debugInfo.innerHTML = `
                Vertices: ${vertexCount.toLocaleString()}<br>
                Triangles: ${Math.floor(triangleCount).toLocaleString()}<br>
                Subdivision Level: ${geometryParams.subdivisionLevel}<br>
            `;

            // Log geometry details for debugging
            console.log('Geometry stats:', {
                vertices: vertexCount,
                triangles: triangleCount,
                hasIndex: !!geometry.index,
                indexCount: geometry.index ? geometry.index.count : 0,
                subdivisionLevel: geometryParams.subdivisionLevel
            });
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
    
    // Handle window resize
    window.addEventListener('resize', () => {
        console.log('Window resized');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // Animation loop
    function animate() {
        if (debugVisible) {
            stats.begin();
        }
        
        requestAnimationFrame(animate);
        
        // Update controls
        if (editMode) {
            controls.update();
        }
        
        // Update chunks
        planetGenerator.chunkManager.updateChunksInRadius(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            100
        );
        
        renderer.render(scene, camera);
        
        if (debugVisible) {
            stats.end();
            updateDebugInfo(); // Update debug info every frame
        }
    }
    
    // Start animation loop
    console.log('Starting animation loop...');
    animate();
}); 