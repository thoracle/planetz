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
    
    // Create planet geometry
    let geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.MeshPhongMaterial({
        color: 0x4a9eff,
        shininess: 15,
        flatShading: true
    });
    
    // Function to update planet geometry
    function updatePlanetGeometry() {
        // Modify vertices based on density field
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Convert from [-1,1] to [0,63]
            const gx = Math.floor((x + 1) * 31.5);
            const gy = Math.floor((y + 1) * 31.5);
            const gz = Math.floor((z + 1) * 31.5);
            
            // Get density and modify vertex
            const density = planetGenerator.getDensityAt(gx, gy, gz);
            const displacement = density * planetGenerator.params.terrainHeight;
            
            // Apply displacement along normal
            positions[i] *= 1 + displacement;
            positions[i + 1] *= 1 + displacement;
            positions[i + 2] *= 1 + displacement;
        }
        
        // Update geometry
        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;
    }
    
    // Create initial planet mesh
    updatePlanetGeometry();
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    
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
    
    controls.add(planetGenerator.params, 'noiseScale', 0.1, 5.0).name('Noise Scale')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'octaves', 1, 8, 1).name('Octaves')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'persistence', 0.1, 1.0).name('Persistence')
        .onChange(() => {
            planetGenerator.generateDensityField();
            updatePlanetGeometry();
        });
    
    controls.add(planetGenerator.params, 'terrainHeight', 0.0, 1.0).name('Terrain Height')
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