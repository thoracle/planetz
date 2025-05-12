// Main application code
document.addEventListener('DOMContentLoaded', () => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('scene-container');
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Create planet generator
    const planetGenerator = new PlanetGenerator(64);

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
    let geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        shininess: 15,
        flatShading: true
    });

    // Create initial planet mesh
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    
    // Function to create fresh geometry
    function createPlanetGeometry() {
        const newGeometry = new THREE.IcosahedronGeometry(1, 4);
        return newGeometry;
    }
    
    // Function to update planet geometry and colors
    function updatePlanetGeometry() {
        // Create fresh geometry
        const newGeometry = createPlanetGeometry();
        const positions = newGeometry.attributes.position.array;
        let colors = new Float32Array(positions.length);
        let maxDisplacement = -Infinity;
        let minDisplacement = Infinity;
        let displacements = [];

        // First pass: calculate displacement range
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            const gx = Math.floor((x + 1) * 31.5);
            const gy = Math.floor((y + 1) * 31.5);
            const gz = Math.floor((z + 1) * 31.5);
            
            const density = planetGenerator.getDensityAt(gx, gy, gz);
            const displacement = density * planetGenerator.params.terrainHeight;
            displacements.push(displacement);
            
            maxDisplacement = Math.max(maxDisplacement, displacement);
            minDisplacement = Math.min(minDisplacement, displacement);
            
            // Apply displacement
            positions[i] *= 1 + displacement;
            positions[i + 1] *= 1 + displacement;
            positions[i + 2] *= 1 + displacement;
        }

        // Second pass: apply colors based on height
        const currentColors = planetColors[planetTypes.currentType];
        const baseColor = new THREE.Color(currentColors.base);
        const highColor = new THREE.Color(currentColors.high);
        const lowColor = new THREE.Color(currentColors.low);

        for (let i = 0; i < positions.length; i += 3) {
            const displacement = displacements[i / 3];
            const t = (displacement - minDisplacement) / (maxDisplacement - minDisplacement);
            
            let color = new THREE.Color();
            if (t > 0.5) {
                // Blend between base and high color
                color.lerpColors(baseColor, highColor, (t - 0.5) * 2);
            } else {
                // Blend between low and base color
                color.lerpColors(lowColor, baseColor, t * 2);
            }
            
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        // Update geometry
        newGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        newGeometry.computeVertexNormals();
        
        // Clean up old geometry and update mesh
        if (planet.geometry) {
            planet.geometry.dispose();
        }
        planet.geometry = newGeometry;
    }
    
    // Initial geometry update
    updatePlanetGeometry();
    
    // Add lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 3;
    
    // Set up GUI controls
    const gui = new dat.GUI();
    const controls = gui.addFolder('Planet Generation');

    // Add planet type dropdown with tooltip
    const typeController = controls.add(planetTypes, 'currentType', planetTypes.types)
        .name('Planet Type')
        .onChange((value) => {
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
                typeController.domElement.parentElement.setAttribute('title', description);
                
                // Update planet geometry and colors
                updatePlanetGeometry();
            }
        });

    // Set initial tooltip
    const initialDescription = planetGenerator.planetClasses[planetTypes.currentType].description;
    typeController.domElement.parentElement.setAttribute('title', initialDescription);
    
    // Add parameter controllers
    const noiseScaleController = controls.add(planetGenerator.params, 'noiseScale', 0.1, 5.0).name('Noise Scale')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    const octavesController = controls.add(planetGenerator.params, 'octaves', 1, 8, 1).name('Octaves')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    const persistenceController = controls.add(planetGenerator.params, 'persistence', 0.1, 1.0).name('Persistence')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    const terrainHeightController = controls.add(planetGenerator.params, 'terrainHeight', 0.0, 1.0).name('Terrain Height')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    controls.add({
        regenerate: () => {
            planetGenerator.params.seed = Math.random() * 10000;
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        }
    }, 'regenerate').name('New Seed');
    
    controls.open();
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        planet.rotation.y += 0.005;
        renderer.render(scene, camera);
    }
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
}); 