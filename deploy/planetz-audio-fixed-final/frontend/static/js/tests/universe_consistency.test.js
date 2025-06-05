const THREE = require('three');
const { GalacticChart } = require('../views/GalacticChart.js');
const { StarfieldManager } = require('../views/StarfieldManager.js');
const { SolarSystemManager } = require('../SolarSystemManager.js');

// Mock GalacticChart
jest.mock('../views/GalacticChart.js', () => ({
    GalacticChart: jest.fn().mockImplementation((viewManager) => ({
        viewManager,
        universe: null,
        currentSystemIndex: null,
        shipSystemIndex: 0,
        show: jest.fn(),
        hide: jest.fn(),
        setCurrentSystem: jest.fn(),
        getStarSystemForSector: jest.fn((sector) => {
            if (sector === 'A0') {
                return {
                    star_name: 'Test Star',
                    star_type: 'Class-G',
                    planets: [
                        {
                            planet_name: 'Test Planet 1',
                            planet_type: 'Class-M',
                            moons: []
                        },
                        {
                            planet_name: 'Test Planet 2',
                            planet_type: 'Class-K',
                            moons: [
                                {
                                    moon_name: 'Test Moon 1',
                                    moon_type: 'rocky'
                                }
                            ]
                        }
                    ]
                };
            }
            return null;
        })
    }))
}));

// Mock THREE.WebGLRenderer before tests
jest.mock('three', () => {
    const THREE = jest.requireActual('three');
    return {
        ...THREE,
        WebGLRenderer: jest.fn().mockImplementation(() => ({
            domElement: {
                style: {},
                width: 800,
                height: 600,
                getContext: () => ({
                    getExtension: () => null,
                    getParameter: () => null,
                    createBuffer: () => null,
                    bindBuffer: () => null,
                    bufferData: () => null
                })
            },
            setSize: jest.fn(),
            setClearColor: jest.fn(),
            render: jest.fn(),
            dispose: jest.fn(),
            shadowMap: {},
            setPixelRatio: jest.fn(),
            getContext: jest.fn()
        }))
    };
});

describe('Universe Data Consistency Tests', () => {
    let scene, camera, viewManager, starfieldManager, solarSystemManager, galacticChart;
    let universeData;

    beforeAll(async () => {
        // Set up THREE.js environment
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create mock ViewManager
        viewManager = {
            setView: jest.fn(),
            restorePreviousView: jest.fn(),
            starfieldManager: null
        };

        // Mock universe data
        universeData = [{
            sector: 'A0',
            star_name: 'Test Star',
            star_type: 'Class-G',
            planets: [
                {
                    planet_name: 'Test Planet 1',
                    planet_type: 'Class-M',
                    moons: []
                },
                {
                    planet_name: 'Test Planet 2',
                    planet_type: 'Class-K',
                    moons: [
                        {
                            moon_name: 'Test Moon 1',
                            moon_type: 'rocky'
                        }
                    ]
                }
            ]
        }];

        // Initialize managers
        solarSystemManager = new SolarSystemManager(scene, camera);
        starfieldManager = new StarfieldManager(scene, camera, viewManager);
        galacticChart = new GalacticChart(viewManager);

        // Connect managers
        viewManager.starfieldManager = starfieldManager;
        starfieldManager.setSolarSystemManager(solarSystemManager);
        
        // Share universe data with all components
        solarSystemManager.universe = universeData;
        galacticChart.universe = universeData;
    });

    test('Universe data is shared correctly between components', async () => {
        expect(solarSystemManager.universe).toBeTruthy();
        expect(galacticChart.universe).toBeTruthy();
        expect(solarSystemManager.universe).toBe(galacticChart.universe);
    });

    test('Sector A0 star system matches across all components', async () => {
        const sector = 'A0';
        
        // Get star system from galactic chart
        const chartSystem = galacticChart.getStarSystemForSector(sector);
        expect(chartSystem).toBeTruthy();
        
        // Generate star system in SolarSystemManager
        await solarSystemManager.generateStarSystem(sector);
        expect(solarSystemManager.starSystem).toBeTruthy();
        
        // Compare star data
        expect(solarSystemManager.starSystem.star_name).toBe(chartSystem.star_name);
        expect(solarSystemManager.starSystem.star_type).toBe(chartSystem.star_type);
        
        // Get celestial bodies from StarfieldManager
        await starfieldManager.updateTargetList();
        const targetBodies = starfieldManager.targetObjects;
        
        // Verify star data matches
        const starTarget = targetBodies.find(t => t.type === chartSystem.star_type);
        expect(starTarget).toBeTruthy();
        expect(starTarget.name).toBe(chartSystem.star_name);
        
        // Verify planet count matches (excluding star)
        const planetTargets = targetBodies.filter(t => t.type !== chartSystem.star_type);
        expect(planetTargets.length).toBe(chartSystem.planets.length);
        
        // Verify each planet matches
        for (const planet of chartSystem.planets) {
            const matchingTarget = targetBodies.find(t => t.name === planet.planet_name);
            expect(matchingTarget).toBeTruthy();
            expect(matchingTarget.type).toBe(planet.planet_type);
        }
    });

    test('Celestial body info is consistent across components', async () => {
        const sector = 'A0';
        await solarSystemManager.generateStarSystem(sector);
        const bodies = solarSystemManager.getCelestialBodies();
        
        for (const [key, body] of bodies.entries()) {
            const info = solarSystemManager.getCelestialBodyInfo(body);
            expect(info.name).toBeTruthy();
            expect(info.type).toBeTruthy();
            
            // Find matching body in galactic chart data
            const chartSystem = galacticChart.getStarSystemForSector(sector);
            if (info.type === 'star') {
                expect(info.name).toBe(chartSystem.star_name);
                expect(info.classification).toBe(chartSystem.star_type);
            } else {
                const planet = chartSystem.planets.find(p => p.planet_name === info.name);
                if (planet) {
                    expect(info.type).toBe('planet');
                    expect(info.classification).toBe(planet.planet_type);
                } else {
                    // Check if it's a moon
                    const [type, planetIndex, moonIndex] = key.split('_');
                    if (type === 'moon') {
                        const parentPlanet = chartSystem.planets[parseInt(planetIndex)];
                        const moon = parentPlanet.moons[parseInt(moonIndex)];
                        expect(moon.moon_name).toBe(info.name);
                        expect(info.type).toBe('moon');
                        expect(info.classification).toBe(moon.moon_type);
                    }
                }
            }
        }
    });

    test('Tab targeting list matches galactic chart data', async () => {
        const sector = 'A0';
        await solarSystemManager.generateStarSystem(sector);
        await starfieldManager.updateTargetList();
        const targets = starfieldManager.targetObjects;
        const chartSystem = galacticChart.getStarSystemForSector(sector);
        
        // Check star
        const starTarget = targets.find(t => t.type === chartSystem.star_type);
        expect(starTarget.name).toBe(chartSystem.star_name);
        
        // Check each planet
        for (const planet of chartSystem.planets) {
            const planetTarget = targets.find(t => t.name === planet.planet_name);
            expect(planetTarget).toBeTruthy();
            expect(planetTarget.type).toBe(planet.planet_type);
        }
    });

    test('SolarSystemManager handles celestial body limits correctly', async () => {
        const sector = 'A0';
        const chartSystem = galacticChart.getStarSystemForSector(sector);
        
        // Count total celestial bodies
        let totalBodies = 1;  // Start with 1 for the star
        chartSystem.planets.forEach(planet => {
            totalBodies++;  // Add planet
            totalBodies += planet.moons ? planet.moons.length : 0;  // Add moons
        });
        
        // Generate the system in SolarSystemManager
        await solarSystemManager.generateStarSystem(sector);
        
        // Get all celestial bodies
        const bodies = solarSystemManager.getCelestialBodies();
        
        // Verify the count matches
        expect(bodies.size).toBe(totalBodies);
        
        // Verify each body has required properties
        for (const [key, body] of bodies.entries()) {
            const info = solarSystemManager.getCelestialBodyInfo(body);
            expect(info.name).toBeTruthy();
            expect(info.type).toBeTruthy();
            expect(body.position).toBeTruthy();
            expect(Array.isArray(body.position.toArray())).toBe(true);
            expect(body.position.toArray().length).toBe(3);
        }
    });

    test('SolarSystemManager handles generation errors gracefully', async () => {
        // Test with invalid sector
        await expect(solarSystemManager.generateStarSystem('Z9')).resolves.not.toThrow();
        
        // Test with missing universe data
        solarSystemManager.universe = null;
        await expect(solarSystemManager.generateStarSystem('A0')).resolves.not.toThrow();
        
        // Test with malformed universe data
        solarSystemManager.universe = [{
            sector: 'A0',
            star_name: 'Test',
            star_type: 'red dwarf',
            planets: null  // Missing planets array
        }];
        await expect(solarSystemManager.generateStarSystem('A0')).resolves.not.toThrow();
        
        // Test with excessive celestial bodies
        solarSystemManager.universe = [{
            sector: 'A0',
            star_name: 'Test',
            star_type: 'red dwarf',
            planets: Array(20).fill({
                planet_name: 'Test Planet',
                planet_type: 'rocky',
                moons: Array(10).fill({
                    moon_name: 'Test Moon',
                    moon_type: 'rocky'
                })
            })
        }];
        await solarSystemManager.generateStarSystem('A0');
        const bodies = solarSystemManager.getCelestialBodies();
        expect(bodies.size).toBeLessThan(100);  // Reasonable limit
    });
}); 