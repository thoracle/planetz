// Spatial Grid Unit Test
// Comprehensive test to identify discovery system issues

class SpatialGridTester {
    constructor() {
        this.gridSize = 50; // 50km per cell as used in StarChartsManager
        this.spatialGrid = new Map();
        this.testResults = [];
    }

    // Replicate the grid key calculation from StarChartsManager
    getGridKey(position) {
        const [x, y, z] = position;
        const gx = Math.floor(x / this.gridSize);
        const gy = Math.floor(y / this.gridSize);
        const gz = Math.floor(z / this.gridSize);
        return `${gx},${gy},${gz}`;
    }

    // Add object to spatial grid
    addToSpatialGrid(obj, position) {
        const gridKey = this.getGridKey(position);
        if (!this.spatialGrid.has(gridKey)) {
            this.spatialGrid.set(gridKey, []);
        }
        this.spatialGrid.get(gridKey).push({
            id: obj.id,
            name: obj.name,
            position: position,
            gridKey: gridKey
        });
    }

    // Replicate getNearbyObjects logic
    getNearbyObjects(playerPosition, radius) {
        const [px, py, pz] = playerPosition.map(coord => Math.floor(coord / this.gridSize));
        const gridRadius = Math.ceil(radius / this.gridSize) + 2; // Using the fixed buffer
        
        const nearbyObjects = [];
        let cellsSearched = 0;
        let cellsWithObjects = 0;

        for (let x = px - gridRadius; x <= px + gridRadius; x++) {
            for (let y = py - gridRadius; y <= py + gridRadius; y++) {
                for (let z = pz - gridRadius; z <= pz + gridRadius; z++) {
                    const cellKey = `${x},${y},${z}`;
                    cellsSearched++;
                    
                    const cellObjects = this.spatialGrid.get(cellKey);
                    if (cellObjects && cellObjects.length > 0) {
                        cellsWithObjects++;
                        // Filter by actual distance
                        const inRangeObjects = cellObjects.filter(obj => {
                            const distance = this.calculateDistance(obj.position, playerPosition);
                            return distance <= radius;
                        });
                        nearbyObjects.push(...inRangeObjects);
                    }
                }
            }
        }

        return {
            objects: nearbyObjects,
            cellsSearched,
            cellsWithObjects,
            gridRadius,
            playerGridKey: this.getGridKey(playerPosition)
        };
    }

    // Calculate 3D distance
    calculateDistance(pos1, pos2) {
        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        const dz = pos1[2] - pos2[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Test with actual station data from the logs
    runTests() {
        console.log('🧪 === SPATIAL GRID UNIT TEST ===');
        
        // Test stations from your logs (using actual positions)
        const testStations = [
            { id: 'a0_hermes_refinery', name: 'Hermes Refinery', pos: [-27.58, -0.08, 27.58] },
            { id: 'a0_terra_station', name: 'Terra Station', pos: [100.00, -0.88, 0.00] },
            { id: 'a0_helios_solar_array', name: 'Helios Solar Array', pos: [-41.31, 0.00, 41.31] },
            { id: 'a0_callisto_defense', name: 'Callisto Defense Platform', pos: [-90.93, 0.61, -52.50] },
            { id: 'a0_europa_mining', name: 'Europa Mining Station', pos: [52.50, 0.61, 90.93] },
            { id: 'a0_ganymede_research', name: 'Ganymede Research Facility', pos: [90.93, -0.61, 52.50] },
            { id: 'a0_io_industrial', name: 'Io Industrial Complex', pos: [-52.50, -0.61, -90.93] },
            { id: 'a0_titan_outpost', name: 'Titan Outpost', pos: [41.31, 0.00, -41.31] },
            { id: 'a0_ceres_depot', name: 'Ceres Supply Depot', pos: [0.00, 0.88, -100.00] },
            { id: 'a0_vesta_shipyard', name: 'Vesta Shipyard', pos: [-100.00, 0.88, 0.00] }
        ];

        // Add all stations to spatial grid
        console.log('📊 Adding stations to spatial grid...');
        testStations.forEach(station => {
            this.addToSpatialGrid(station, station.pos);
            console.log(`   Added ${station.name} at ${station.pos.join(', ')} -> grid key: ${this.getGridKey(station.pos)}`);
        });

        console.log(`📊 Total grid cells used: ${this.spatialGrid.size}`);

        // Test player positions from your logs
        const testPlayerPositions = [
            { name: 'Near Hermes Refinery', pos: [-31.63, 0.57, 25.51] },
            { name: 'Near Terra Station', pos: [94.99, -0.90, 0.67] },
            { name: 'Near Callisto Defense', pos: [-87.24, 0.86, -49.63] },
            { name: 'Center position', pos: [0, 0, 0] },
            { name: 'Edge case position', pos: [49.9, 49.9, 49.9] } // Near grid boundary
        ];

        console.log('\n🔍 Testing discovery from different positions...');
        
        testPlayerPositions.forEach(testPos => {
            console.log(`\n--- Testing from: ${testPos.name} at [${testPos.pos.join(', ')}] ---`);
            
            const result = this.getNearbyObjects(testPos.pos, 10); // 10km discovery radius
            
            console.log(`🔍 Player grid key: ${result.playerGridKey}`);
            console.log(`🔍 Grid radius: ${result.gridRadius} (searching ${result.cellsSearched} cells)`);
            console.log(`🔍 Cells with objects: ${result.cellsWithObjects}`);
            console.log(`🔍 Objects found within 10km: ${result.objects.length}`);
            
            result.objects.forEach(obj => {
                const distance = this.calculateDistance(obj.position, testPos.pos);
                console.log(`   ✅ ${obj.name}: ${distance.toFixed(2)}km (grid: ${obj.gridKey})`);
            });

            // Check for stations that should be discoverable but weren't found
            const missedStations = testStations.filter(station => {
                const distance = this.calculateDistance(station.pos, testPos.pos);
                const found = result.objects.some(obj => obj.id === station.id);
                return distance <= 10 && !found;
            });

            if (missedStations.length > 0) {
                console.log(`   ❌ MISSED STATIONS (within 10km but not found):`);
                missedStations.forEach(station => {
                    const distance = this.calculateDistance(station.pos, testPos.pos);
                    const stationGridKey = this.getGridKey(station.pos);
                    console.log(`      ${station.name}: ${distance.toFixed(2)}km (grid: ${stationGridKey})`);
                });
            }
        });

        // Test grid boundary edge cases
        console.log('\n🧪 Testing grid boundary edge cases...');
        this.testGridBoundaries();

        console.log('\n✅ Unit test complete!');
    }

    testGridBoundaries() {
        // Test positions right at grid boundaries
        const boundaryTests = [
            { name: 'Grid boundary 0,0,0 -> 1,0,0', playerPos: [49.9, 0, 0], stationPos: [50.1, 0, 0] },
            { name: 'Grid boundary negative', playerPos: [-0.1, 0, 0], stationPos: [0.1, 0, 0] },
            { name: 'Grid boundary with Y axis', playerPos: [0, 49.9, 0], stationPos: [0, 50.1, 0] }
        ];

        boundaryTests.forEach(test => {
            // Clear grid and add single test station
            this.spatialGrid.clear();
            this.addToSpatialGrid({ id: 'test_station', name: 'Test Station' }, test.stationPos);
            
            const distance = this.calculateDistance(test.playerPos, test.stationPos);
            const result = this.getNearbyObjects(test.playerPos, 10);
            
            console.log(`🧪 ${test.name}:`);
            console.log(`   Distance: ${distance.toFixed(2)}km`);
            console.log(`   Player grid: ${this.getGridKey(test.playerPos)}`);
            console.log(`   Station grid: ${this.getGridKey(test.stationPos)}`);
            console.log(`   Found: ${result.objects.length > 0 ? 'YES' : 'NO'}`);
            
            if (distance <= 10 && result.objects.length === 0) {
                console.log(`   ❌ BOUNDARY BUG: Station should be found but wasn't!`);
            }
        });
    }
}

// Run the test
const tester = new SpatialGridTester();
tester.runTests();
