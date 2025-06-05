import * as THREE from 'three';
import { GalacticChart } from '../views/GalacticChart';
import { ViewManager } from '../views/ViewManager';
import { StarfieldManager } from '../views/StarfieldManager';
import { SolarSystemManager } from '../SolarSystemManager';

// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            {
                star_name: "Dasedferaz",
                star_type: "yellow dwarf",
                sector: "A0",
                planets: [
                    { name: "Kroandphapri", type: "Class-J" }
                ]
            },
            {
                star_name: "Betarix",
                star_type: "red giant",
                sector: "B1",
                planets: []
            }
        ])
    })
);

describe('Galactic Chart', () => {
    let scene, camera, controls, viewManager, starfieldManager, solarSystemManager, galacticChart;
    
    beforeEach(() => {
        // Reset fetch mock
        fetch.mockClear();
        
        // Set up DOM elements
        document.body.innerHTML = `
            <div id="galactic-chart">
                <div class="grid-container"></div>
                <div class="sector-info"></div>
            </div>
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
        
        // Initialize GalacticChart with the DOM elements
        galacticChart = new GalacticChart(viewManager);
        galacticChart.gridContainer = document.querySelector('.grid-container');
        galacticChart.sectorInfo = document.querySelector('.sector-info');
    });

    describe('Universe Data Management', () => {
        test('fetches universe data from API', async () => {
            await galacticChart.fetchUniverseData();
            
            expect(fetch).toHaveBeenCalledWith('/api/generate_universe');
            expect(galacticChart.universe).toBeTruthy();
            expect(galacticChart.universe.length).toBe(2);
        });

        test('shares universe data with SolarSystemManager', async () => {
            await galacticChart.fetchUniverseData();
            
            // Get the SolarSystemManager through the ViewManager's StarfieldManager
            const solarSystemManager = viewManager.starfieldManager.solarSystemManager;
            
            expect(solarSystemManager.universe).toBeTruthy();
            expect(solarSystemManager.universe).toEqual(galacticChart.universe);
        });

        test('handles API errors gracefully', async () => {
            // Mock a failed API call
            fetch.mockImplementationOnce(() => Promise.reject('API Error'));
            
            await expect(galacticChart.fetchUniverseData()).rejects.toThrow();
        });
    });

    describe('Sector Management', () => {
        test('finds star system by sector', async () => {
            await galacticChart.fetchUniverseData();
            
            const systemA0 = galacticChart.getStarSystemForSector('A0');
            expect(systemA0).toBeTruthy();
            expect(systemA0.star_name).toBe('Dasedferaz');
            
            const systemB1 = galacticChart.getStarSystemForSector('B1');
            expect(systemB1).toBeTruthy();
            expect(systemB1.star_name).toBe('Betarix');
        });

        test('returns null for non-existent sector', async () => {
            await galacticChart.fetchUniverseData();
            
            const nonExistentSystem = galacticChart.getStarSystemForSector('Z9');
            expect(nonExistentSystem).toBeNull();
        });
    });

    describe('Grid Management', () => {
        test('updates grid with universe data', async () => {
            await galacticChart.fetchUniverseData();
            
            // Mock the grid update method
            const updateGridSpy = jest.spyOn(galacticChart, 'updateGrid');
            
            // Trigger a grid update
            galacticChart.updateGrid();
            
            expect(updateGridSpy).toHaveBeenCalled();
            expect(galacticChart.gridContainer.children.length).toBeGreaterThan(0);
        });

        test('clears grid when no universe data', () => {
            // Mock the grid update method
            const updateGridSpy = jest.spyOn(galacticChart, 'updateGrid');
            
            // Clear universe data and update grid
            galacticChart.universe = null;
            galacticChart.updateGrid();
            
            expect(updateGridSpy).toHaveBeenCalled();
            expect(galacticChart.gridContainer.children.length).toBe(0);
        });
    });

    describe('Integration with Navigation', () => {
        test('updates current sector based on position', async () => {
            await galacticChart.fetchUniverseData();
            
            // Mock the position calculation to return sector A0
            starfieldManager.calculateCurrentSector = jest.fn().mockReturnValue('A0');
            
            // Update position
            starfieldManager.updateCurrentSector();
            
            // Verify sector was updated
            expect(solarSystemManager.getCurrentSector()).toBe('A0');
        });

        test('generates new star system when entering new sector', async () => {
            await galacticChart.fetchUniverseData();
            
            // Mock the generateStarSystem method
            const generateStarSystemSpy = jest.spyOn(solarSystemManager, 'generateStarSystem');
            
            // Simulate entering a new sector
            starfieldManager.calculateCurrentSector = jest.fn().mockReturnValue('B1');
            starfieldManager.updateCurrentSector();
            
            expect(generateStarSystemSpy).toHaveBeenCalledWith('B1');
        });
    });
}); 