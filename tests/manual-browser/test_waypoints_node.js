#!/usr/bin/env node

/**
 * 🎯 Waypoints System Node.js Test Suite
 * Tests the waypoints system modules directly in Node.js environment
 */

const fs = require('fs');
const path = require('path');

// Mock browser globals for Node.js testing
global.window = {};
global.document = {
    addEventListener: () => {},
    dispatchEvent: () => {}
};
global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};
global.console = console;

// Mock Three.js Vector3 for position handling
global.THREE = {
    Vector3: class Vector3 {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        
        distanceTo(other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dz = this.z - other.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        
        copy(other) {
            this.x = other.x;
            this.y = other.y;
            this.z = other.z;
            return this;
        }
        
        clone() {
            return new THREE.Vector3(this.x, this.y, this.z);
        }
    }
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    failures: []
};

function assert(condition, message) {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        console.log(`✅ ${message}`);
        return true;
    } else {
        testResults.failed++;
        testResults.failures.push(message);
        console.log(`❌ ${message}`);
        return false;
    }
}

function loadModule(modulePath) {
    try {
        const fullPath = path.join(__dirname, modulePath);
        const code = fs.readFileSync(fullPath, 'utf8');
        
        // Remove ES6 import/export statements for Node.js compatibility
        const nodeCode = code
            .replace(/export\s+default\s+/g, 'module.exports = ')
            .replace(/export\s+\{[^}]+\}/g, '')
            .replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*/g, '');
        
        // Create a temporary file and require it
        const tempPath = fullPath + '.temp.js';
        fs.writeFileSync(tempPath, nodeCode);
        
        const module = require(tempPath);
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
        
        return module;
    } catch (error) {
        console.error(`Failed to load module ${modulePath}:`, error.message);
        return null;
    }
}

async function runTests() {
    console.log('🎯 Starting Waypoints System Node.js Tests\n');
    
    // Mock dependencies
    global.window.targetComputerManager = {
        currentTarget: null,
        interruptedWaypoint: null,
        waypointInterruptionTime: null,
        
        setTarget(target) {
            if (this.currentTarget && this.currentTarget.startsWith('waypoint_')) {
                this.interruptedWaypoint = this.currentTarget;
                this.waypointInterruptionTime = Date.now();
            }
            this.currentTarget = target;
        },
        
        setVirtualTarget(waypointId) {
            this.currentTarget = waypointId;
        },
        
        isCurrentTargetWaypoint() {
            return this.currentTarget && this.currentTarget.startsWith('waypoint_');
        },
        
        resumeInterruptedWaypoint() {
            if (this.interruptedWaypoint) {
                this.currentTarget = this.interruptedWaypoint;
                this.interruptedWaypoint = null;
                this.waypointInterruptionTime = null;
                return true;
            }
            return false;
        },
        
        hasInterruptedWaypoint() {
            return !!this.interruptedWaypoint;
        },
        
        getInterruptedWaypoint() {
            return this.interruptedWaypoint;
        },
        
        clearInterruptedWaypoint() {
            this.interruptedWaypoint = null;
            this.waypointInterruptionTime = null;
        }
    };

    global.window.missionEventHandler = {
        awardRewards: async (params) => {
            console.log('Mock reward awarded:', params);
            return { success: true };
        }
    };

    global.window.audioManager = {
        playAudio: async (audioId, volume = 1.0) => {
            console.log(`Mock audio played: ${audioId} at volume ${volume}`);
        }
    };

    global.window.showNotification = function(title, message, duration = 5000, type = 'info') {
        console.log(`Mock notification: [${type}] ${title}: ${message} (${duration}ms)`);
    };

    // Test 1: Load core modules
    console.log('📦 Testing Module Loading...');
    
    try {
        // Load ActionRegistry first (no dependencies)
        const ActionRegistry = loadModule('frontend/static/js/waypoints/ActionRegistry.js');
        assert(ActionRegistry !== null, 'ActionRegistry module loaded');
        
        // Load action classes
        const SpawnShipsAction = loadModule('frontend/static/js/waypoints/actions/SpawnShipsAction.js');
        assert(SpawnShipsAction !== null, 'SpawnShipsAction module loaded');
        
        const ShowMessageAction = loadModule('frontend/static/js/waypoints/actions/ShowMessageAction.js');
        assert(ShowMessageAction !== null, 'ShowMessageAction module loaded');
        
        const GiveRewardAction = loadModule('frontend/static/js/waypoints/actions/GiveRewardAction.js');
        assert(GiveRewardAction !== null, 'GiveRewardAction module loaded');
        
        // Load other core modules
        const WaypointPersistence = loadModule('frontend/static/js/waypoints/WaypointPersistence.js');
        assert(WaypointPersistence !== null, 'WaypointPersistence module loaded');
        
        console.log('');
        
        // Test 2: ActionRegistry functionality
        console.log('🎬 Testing ActionRegistry...');
        
        if (ActionRegistry) {
            const registry = new ActionRegistry();
            assert(typeof registry.register === 'function', 'ActionRegistry has register method');
            assert(typeof registry.create === 'function', 'ActionRegistry has create method');
            
            // Test registration
            if (SpawnShipsAction) {
                registry.register('spawn_ships', SpawnShipsAction);
                assert(registry.actions['spawn_ships'] === SpawnShipsAction, 'SpawnShipsAction registered correctly');
            }
            
            if (ShowMessageAction) {
                registry.register('show_message', ShowMessageAction);
                assert(registry.actions['show_message'] === ShowMessageAction, 'ShowMessageAction registered correctly');
            }
            
            if (GiveRewardAction) {
                registry.register('give_reward', GiveRewardAction);
                assert(registry.actions['give_reward'] === GiveRewardAction, 'GiveRewardAction registered correctly');
            }
        }
        
        console.log('');
        
        // Test 3: Action creation and execution
        console.log('⚡ Testing Action Creation & Execution...');
        
        if (ActionRegistry && SpawnShipsAction) {
            const registry = new ActionRegistry();
            registry.register('spawn_ships', SpawnShipsAction);
            
            const spawnAction = registry.create('spawn_ships', {
                shipType: 'enemy_fighter',
                minCount: 2,
                maxCount: 4,
                formation: 'triangle'
            });
            
            assert(spawnAction !== null, 'SpawnShipsAction created successfully');
            assert(typeof spawnAction.execute === 'function', 'SpawnShipsAction has execute method');
            
            // Test execution (should not throw)
            try {
                const result = await spawnAction.execute();
                assert(true, 'SpawnShipsAction executed without errors');
            } catch (error) {
                assert(false, `SpawnShipsAction execution failed: ${error.message}`);
            }
        }
        
        if (ActionRegistry && ShowMessageAction) {
            const registry = new ActionRegistry();
            registry.register('show_message', ShowMessageAction);
            
            const messageAction = registry.create('show_message', {
                title: 'Test Message',
                message: 'This is a test message',
                duration: 3000,
                audioFileId: 'test_audio'
            });
            
            assert(messageAction !== null, 'ShowMessageAction created successfully');
            
            try {
                const result = await messageAction.execute();
                assert(true, 'ShowMessageAction executed without errors');
            } catch (error) {
                assert(false, `ShowMessageAction execution failed: ${error.message}`);
            }
        }
        
        if (ActionRegistry && GiveRewardAction) {
            const registry = new ActionRegistry();
            registry.register('give_reward', GiveRewardAction);
            
            const rewardAction = registry.create('give_reward', {
                rewardPackageId: 'test_reward',
                bonusMultiplier: 1.5,
                message: 'Test reward message'
            });
            
            assert(rewardAction !== null, 'GiveRewardAction created successfully');
            
            try {
                const result = await rewardAction.execute();
                assert(true, 'GiveRewardAction executed without errors');
            } catch (error) {
                assert(false, `GiveRewardAction execution failed: ${error.message}`);
            }
        }
        
        console.log('');
        
        // Test 4: Persistence functionality
        console.log('💾 Testing Persistence...');
        
        if (WaypointPersistence) {
            const persistence = new WaypointPersistence();
            assert(typeof persistence.saveWaypointState === 'function', 'Persistence has saveWaypointState method');
            assert(typeof persistence.loadWaypointState === 'function', 'Persistence has loadWaypointState method');
            
            // Test save/load cycle
            const testWaypoint = {
                id: 'test_waypoint',
                name: 'Test Waypoint',
                status: 'ACTIVE',
                position: [100, 0, 100]
            };
            
            try {
                await persistence.saveWaypointState('test_waypoint', testWaypoint);
                assert(true, 'Waypoint state saved successfully');
                
                const loaded = await persistence.loadWaypointState('test_waypoint');
                assert(loaded !== null, 'Waypoint state loaded successfully');
                assert(loaded.id === 'test_waypoint', 'Loaded waypoint has correct ID');
            } catch (error) {
                assert(false, `Persistence test failed: ${error.message}`);
            }
        }
        
        console.log('');
        
        // Test 5: Target Computer Integration
        console.log('🎯 Testing Target Computer Integration...');
        
        const targetManager = global.window.targetComputerManager;
        
        // Test waypoint targeting
        targetManager.setVirtualTarget('waypoint_test_1');
        assert(targetManager.currentTarget === 'waypoint_test_1', 'Waypoint targeted correctly');
        assert(targetManager.isCurrentTargetWaypoint(), 'Current target recognized as waypoint');
        
        // Test interruption
        targetManager.setTarget('enemy_ship');
        assert(targetManager.currentTarget === 'enemy_ship', 'Target changed to enemy ship');
        assert(targetManager.hasInterruptedWaypoint(), 'Interrupted waypoint detected');
        assert(targetManager.getInterruptedWaypoint() === 'waypoint_test_1', 'Correct waypoint stored as interrupted');
        
        // Test resumption
        const resumed = targetManager.resumeInterruptedWaypoint();
        assert(resumed === true, 'Interrupted waypoint resumed successfully');
        assert(targetManager.currentTarget === 'waypoint_test_1', 'Waypoint re-targeted correctly');
        assert(!targetManager.hasInterruptedWaypoint(), 'Interruption state cleared');
        
        console.log('');
        
    } catch (error) {
        console.error('Test execution failed:', error);
        assert(false, `Test suite failed with error: ${error.message}`);
    }
    
    // Print results
    console.log('📊 Test Results Summary:');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.failures.forEach((failure, index) => {
            console.log(`${index + 1}. ${failure}`);
        });
    }
    
    if (testResults.failed === 0) {
        console.log('\n🎉 All tests passed! Waypoints system is working correctly.');
        process.exit(0);
    } else {
        console.log('\n⚠️ Some tests failed. Please check the implementation.');
        process.exit(1);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
