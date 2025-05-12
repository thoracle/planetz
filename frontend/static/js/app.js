// Main application code
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
    
    console.log('Container dimensions:', {
        width: container.clientWidth,
        height: container.clientHeight
    });
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    console.log('Renderer initialized:', {
        width: renderer.domElement.width,
        height: renderer.domElement.height,
        pixelRatio: renderer.getPixelRatio()
    });
    
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

    // Planet type colors (base colors)
    const planetColors = {
        'Class-M': { base: 0x4a9eff, high: 0xffffff, low: 0x1a4a7f },  // Blue-green with white peaks and deep blue valleys
        'Class-L': { base: 0x8b4513, high: 0xd2691e, low: 0x3d1f0d },  // Brown with orange peaks and dark brown valleys
        'Class-H': { base: 0xd2691e, high: 0xffd700, low: 0x8b4513 },  // Desert orange with gold peaks and brown valleys
        'Class-D': { base: 0x800000, high: 0xff4500, low: 0x400000 },  // Maroon with orange-red peaks and dark maroon valleys
        'Class-J': { base: 0xffd700, high: 0xffffff, low: 0xdaa520 },  // Gold with white peaks and golden valleys
        'Class-K': { base: 0xa0522d, high: 0xd2691e, low: 0x6b3419 },  // Sienna with orange peaks and dark brown valleys
        'Class-N': { base: 0xdaa520, high: 0xffd700, low: 0x8b6914 },  // Goldenrod with gold peaks and dark gold valleys
        'Class-Y': { base: 0x8b0000, high: 0xff0000, low: 0x4d0000 }   // Dark red with bright red peaks and very dark red valleys
    };
    
    // Create initial geometry and material
    console.log('Creating initial geometry...');
    let geometry = new THREE.IcosahedronGeometry(1, 4);

    // Create initial planet mesh
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    
    console.log('Initial planet mesh created:', {
        vertices: geometry.attributes.position.count,
        faces: geometry.index ? geometry.index.count / 3 : 0
    });
    
    // Function to create fresh geometry
    function createPlanetGeometry() {
        console.log('Creating fresh geometry...');
        const newGeometry = new THREE.IcosahedronGeometry(1, 4);
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
    
    // Set up GUI controls
    console.log('Setting up GUI...');
    const gui = new dat.GUI();
    const controls = gui.addFolder('Planet Generation');

    // Add planet type dropdown with tooltip
    const typeController = controls.add(planetTypes, 'currentType', planetTypes.types)
        .name('Planet Type')
        .onChange((value) => {
            console.log('Planet type changed to:', value);
            if (planetGenerator.applyPlanetClass(value)) {
                // Update all GUI controllers to reflect new parameters
                for (const controller of controls.__controllers) {
                    if (controller !== typeController) {
                        const property = controller.property;
                        if (property in planetGenerator.params) {
                            controller.setValue(planetGenerator.params[property]);
                        }
                    }
                }
                
                // Update tooltip with description
                const planetClass = planetGenerator.planetClasses[value];
                const description = planetClass.description;
                updatePlanetGeometry();
            }
        });

    // Add controls for planet parameters
    controls.add(planetGenerator.params, 'terrainHeight', 0, 0.5)
        .name('Terrain Height')
        .onChange((value) => {
            console.log('Terrain height changed to:', value);
            planetGenerator.params.terrainHeight = value;
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'noiseScale', 0.1, 2.0)
        .name('Noise Scale')
        .onChange((value) => {
            console.log('Noise scale changed to:', value);
            planetGenerator.params.noiseScale = value;
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'octaves', 1, 8, 1)
        .name('Noise Octaves')
        .onChange((value) => {
            console.log('Octaves changed to:', value);
            planetGenerator.params.octaves = value;
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'persistence', 0.1, 1.0)
        .name('Noise Persistence')
        .onChange((value) => {
            console.log('Persistence changed to:', value);
            planetGenerator.params.persistence = value;
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'lacunarity', 0.1, 4.0)
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
    controls.add(newPlanetButton, 'generateNewPlanet').name('New Seed');
    
    controls.open();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        console.log('Window resized');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // Animation loop
    let lastUpdate = 0;
    const updateInterval = 1000; // Update chunks every second
    
    function animate() {
        requestAnimationFrame(animate);
        
        const now = Date.now();
        if (now - lastUpdate > updateInterval) {
            // Update chunks based on camera position
            updatePlanetGeometry();
            lastUpdate = now;
        }
        
        // Render the scene
        renderer.render(scene, camera);
    }
    
    // Start animation loop
    console.log('Starting animation loop...');
    animate();
}); 