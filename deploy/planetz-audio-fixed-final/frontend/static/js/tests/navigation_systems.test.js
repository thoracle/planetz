import * as THREE from 'three';
import { StarfieldManager } from '../views/StarfieldManager';
import { SolarSystemManager } from '../SolarSystemManager';
import { ViewManager } from '../views/ViewManager';

// Mock THREE.js classes and functions
jest.mock('three', () => {
    const mockCanvas = {
        getContext: jest.fn(() => ({
            bindBuffer: jest.fn(),
            createBuffer: jest.fn(),
            bufferData: jest.fn()
        }))
    };
    
    const actualTHREE = jest.requireActual('three');
    return {
        ...actualTHREE,
        WebGLRenderer: jest.fn().mockImplementation(() => ({
            setSize: jest.fn(),
            setClearColor: jest.fn(),
            render: jest.fn(),
            domElement: mockCanvas
        })),
        Scene: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
            remove: jest.fn()
        })),
        PerspectiveCamera: jest.fn().mockImplementation(() => {
            const position = new actualTHREE.Vector3();
            return {
                position,
                quaternion: { setFromEuler: jest.fn() },
                updateMatrixWorld: jest.fn(),
                getWorldDirection: jest.fn(v => v.set(0, 0, -1)),
                copy: jest.fn(function(source) {
                    this.position.copy(source.position);
                    return this;
                })
            };
        }),
        Vector3: actualTHREE.Vector3,
        Vector2: actualTHREE.Vector2,
        Euler: actualTHREE.Euler,
        Quaternion: actualTHREE.Quaternion,
        Box3: jest.fn().mockImplementation(() => ({
            setFromObject: jest.fn(),
            getCenter: jest.fn(v => v.set(0, 0, 0)),
            getSize: jest.fn(v => v.set(1, 1, 1))
        })),
        BufferGeometry: jest.fn(),
        BufferAttribute: jest.fn(),
        Points: jest.fn(),
        PointsMaterial: jest.fn(),
        LineBasicMaterial: jest.fn(),
        LineSegments: jest.fn(),
        WireframeGeometry: jest.fn(),
        DirectionalLight: jest.fn(),
        AmbientLight: jest.fn(),
        Texture: jest.fn()
    };
});

// Mock DOM elements
beforeAll(() => {
    // Create mock DOM elements
    const mockGridContainer = document.createElement('div');
    mockGridContainer.className = 'grid-container';
    document.body.appendChild(mockGridContainer);
});

describe('Navigation Systems', () => {
    let scene, camera, controls, viewManager, starfieldManager, solarSystemManager;
    
    beforeEach(() => {
        // Set up DOM elements that the managers expect
        document.body.innerHTML = `
            <div class="grid-container"></div>
            <div class="sector-info"></div>
            <div class="target-hud" style="display: none;"></div>
            <div class="target-list"></div>
            <div class="speed-indicator"></div>
            <div class="view-indicator">FORE</div>
        `;
        
        // Initialize Three.js components
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera();
        controls = { enabled: true };
        
        // Initialize managers
        viewManager = new ViewManager(scene, camera, controls);
        starfieldManager = new StarfieldManager(scene, camera, viewManager);
        solarSystemManager = new SolarSystemManager(scene, camera);
        
        // Connect managers
        viewManager.setStarfieldManager(starfieldManager);
        starfieldManager.setSolarSystemManager(solarSystemManager);
        
        // Mock celestial bodies for testing
        const mockBodies = new Map();
        mockBodies.set('star_0', {
            position: new THREE.Vector3(0, 0, 0),
            geometry: new THREE.BufferGeometry(),
            name: 'Dasedferaz',
            type: 'yellow dwarf'
        });
        mockBodies.set('planet_0', {
            position: new THREE.Vector3(10, 0, 0),
            geometry: new THREE.BufferGeometry(),
            name: 'Kroandphapri',
            type: 'Class-J'
        });
        
        // Mock SolarSystemManager methods
        solarSystemManager.getCelestialBodies = jest.fn().mockReturnValue(mockBodies);
        solarSystemManager.getCelestialBodyInfo = jest.fn().mockImplementation((body) => ({
            name: body.name,
            type: body.type
        }));

        // Initialize target computer elements
        starfieldManager.targetHUD = document.querySelector('.target-hud');
        starfieldManager.targetList = document.querySelector('.target-list');
        starfieldManager.speedIndicator = document.querySelector('.speed-indicator');
        starfieldManager.viewIndicator = document.querySelector('.view-indicator');
    });

    describe('Targeting Computer', () => {
        test('toggles target computer display', () => {
            starfieldManager.toggleTargetComputer();
            expect(starfieldManager.targetComputerEnabled).toBe(true);
            expect(starfieldManager.targetHUD.style.display).toBe('block');
            
            starfieldManager.toggleTargetComputer();
            expect(starfieldManager.targetComputerEnabled).toBe(false);
            expect(starfieldManager.targetHUD.style.display).toBe('none');
        });

        test('cycles through available targets', () => {
            starfieldManager.toggleTargetComputer();
            starfieldManager.cycleTarget();
            
            expect(starfieldManager.targetIndex).toBe(0);
            expect(starfieldManager.currentTarget).toBeTruthy();
            
            starfieldManager.cycleTarget();
            expect(starfieldManager.targetIndex).toBe(1);
        });

        test('updates target list with celestial bodies', () => {
            starfieldManager.updateTargetList();
            expect(starfieldManager.targetObjects.length).toBe(2);
            expect(starfieldManager.targetObjects[0].name).toBe('Dasedferaz');
            expect(starfieldManager.targetObjects[1].name).toBe('Kroandphapri');
        });
    });

    describe('Impulse Engine Navigation', () => {
        test('accelerates to target speed', () => {
            const deltaTime = 1/60;
            
            // Set target speed to impulse 5
            starfieldManager.targetSpeed = 5;
            
            // Update a few frames
            for (let i = 0; i < 10; i++) {
                starfieldManager.update(deltaTime);
            }
            
            expect(starfieldManager.currentSpeed).toBeGreaterThan(0);
            expect(starfieldManager.currentSpeed).toBeLessThanOrEqual(5);
        });

        test('decelerates when target speed is reduced', () => {
            const deltaTime = 1/60;
            
            // First accelerate to impulse 5
            starfieldManager.targetSpeed = 5;
            for (let i = 0; i < 10; i++) {
                starfieldManager.update(deltaTime);
            }
            
            // Then reduce to impulse 2
            starfieldManager.targetSpeed = 2;
            const speedBeforeDecel = starfieldManager.currentSpeed;
            
            // Update a few more frames
            for (let i = 0; i < 10; i++) {
                starfieldManager.update(deltaTime);
            }
            
            expect(starfieldManager.currentSpeed).toBeLessThan(speedBeforeDecel);
            expect(starfieldManager.currentSpeed).toBeGreaterThan(2);
        });

        test('applies correct speed multipliers', () => {
            const deltaTime = 1/60;
            
            // Test impulse 9 (5x multiplier)
            starfieldManager.targetSpeed = 9;
            starfieldManager.currentSpeed = 9;
            starfieldManager.update(deltaTime);
            
            const velocity9 = starfieldManager.velocity.length();
            
            // Test impulse 5 (1.5x multiplier)
            starfieldManager.targetSpeed = 5;
            starfieldManager.currentSpeed = 5;
            starfieldManager.update(deltaTime);
            
            const velocity5 = starfieldManager.velocity.length();
            
            expect(velocity9 / velocity5).toBeCloseTo(5/1.5, 1);
        });
    });

    describe('View Management', () => {
        test('toggles between FORE and AFT views', () => {
            // Start in FORE view
            expect(starfieldManager.view).toBe('FORE');
            
            // Switch to AFT view
            starfieldManager.setView('AFT');
            expect(starfieldManager.view).toBe('AFT');
            
            // Switch back to FORE view
            starfieldManager.setView('FORE');
            expect(starfieldManager.view).toBe('FORE');
        });

        test('inverts movement direction in AFT view', () => {
            const deltaTime = 1/60;
            starfieldManager.targetSpeed = 5;
            starfieldManager.currentSpeed = 5;
            
            // Record movement in FORE view
            const initialPosition = camera.position.clone();
            starfieldManager.update(deltaTime);
            const foreMovement = camera.position.clone().sub(initialPosition);
            
            // Reset position and switch to AFT view
            camera.position.copy(initialPosition);
            starfieldManager.setView('AFT');
            starfieldManager.update(deltaTime);
            const aftMovement = camera.position.clone().sub(initialPosition);
            
            // Movement should be in opposite directions
            expect(foreMovement.dot(aftMovement)).toBeLessThan(0);
        });

        test('hides target reticle in AFT view', () => {
            starfieldManager.toggleTargetComputer();
            starfieldManager.cycleTarget();
            
            // Switch to AFT view
            starfieldManager.setView('AFT');
            starfieldManager.updateTargetDisplay();
            
            expect(starfieldManager.targetReticle.style.display).toBe('none');
        });
    });
}); 