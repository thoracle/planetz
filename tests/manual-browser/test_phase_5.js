#!/usr/bin/env node
/**
 * Phase 5: Star Charts and Target Computer Integration Test
 * ========================================================
 *
 * This script tests the integration between Star Charts and Target Computer
 * systems to ensure they work seamlessly together.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser environment for testing
global.window = {
    localStorage: {
        data: {},
        getItem(key) {
            return this.data[key] || null;
        },
        setItem(key, value) {
            this.data[key] = value;
        },
        removeItem(key) {
            delete this.data[key];
        },
        clear() {
            this.data = {};
        }
    }
};

global.console = {
    ...console,
    // Suppress logs during testing unless there's an error
    log: () => {},
    info: () => {},
    warn: (msg) => {
        if (msg.includes('❌') || msg.includes('Error')) {
            console.warn(msg);
        }
    },
    error: console.error
};

// Mock THREE.js
global.THREE = {
    Vector3: class Vector3 {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    },
    Scene: class Scene {},
    Camera: class Camera {},
    Object3D: class Object3D {
        constructor() {
            this.position = new global.THREE.Vector3();
            this.id = Math.random().toString(36).substr(2, 9);
        }
    }
};

class MockTargetComputerManager {
    constructor() {
        this.targets = new Map();
        this.currentTarget = null;
        this.knownTargets = new Map();
    }

    setTargetById(id) {
        if (this.knownTargets.has(id)) {
            this.currentTarget = { id, name: this.knownTargets.get(id).name };
            return true;
        }
        return false;
    }

    setTargetByName(name) {
        for (const [id, data] of this.knownTargets) {
            if (data.name === name) {
                this.currentTarget = { id, name };
                return true;
            }
        }
        return false;
    }
}

class MockSolarSystemManager {
    constructor() {
        this.ship = {
            position: new global.THREE.Vector3(0, 0, 0)
        };
    }
}

class MockViewManager {
    constructor() {
        this.starfieldManager = {
            targetComputerManager: null
        };
    }
}

async function testStarChartsTargetComputerIntegration() {
    console.log("🧪 Testing Star Charts ↔ Target Computer Integration...");

    try {
        // Import the integration module
        const { createStarChartsTargetComputerIntegration } = await import('./frontend/static/js/views/StarChartsTargetComputerIntegration.js');

        // Create mock managers
        const mockTargetComputer = new MockTargetComputerManager();
        const mockSolarSystem = new MockSolarSystemManager();
        const mockViewManager = new MockViewManager();

        // Create a minimal Star Charts manager mock
        class MockStarChartsManager {
            constructor() {
                this.objectDatabase = {
                    'A0_star': { id: 'A0_star', name: 'Central Star', type: 'star' },
                    'A0_terra_prime': { id: 'A0_terra_prime', name: 'Terra Prime', type: 'planet' }
                };
                this.discoveredObjects = new Set();
                this.discoveryMetadata = new Map();
                this.discoveryCallbacks = [];
                this.targetSelectionCallbacks = [];
            }

            isDiscovered(id) {
                return this.discoveredObjects.has(id);
            }

            getDiscoveryMetadata(id) {
                return this.discoveryMetadata.get(id) || null;
            }

            getObjectData(id) {
                return this.objectDatabase[id] || null;
            }

            addDiscoveryCallback(callback) {
                this.discoveryCallbacks.push(callback);
            }

            addTargetSelectionCallback(callback) {
                this.targetSelectionCallbacks.push(callback);
            }

            addDiscoveredObject(id, method = 'test', source = 'test') {
                if (!this.discoveredObjects.has(id)) {
                    this.discoveredObjects.add(id);
                    const discoveryData = {
                        discoveredAt: new Date().toISOString(),
                        discoveryMethod: method,
                        source: source,
                        sector: 'A0',
                        firstDiscovered: true
                    };
                    this.discoveryMetadata.set(id, discoveryData);

                    // Trigger callbacks
                    this.discoveryCallbacks.forEach(cb => cb(id, discoveryData));
                }
            }
        }

        const mockStarCharts = new MockStarChartsManager();
        mockViewManager.starfieldManager.targetComputerManager = mockTargetComputer;

        // Create integration
        const integration = createStarChartsTargetComputerIntegration(
            mockStarCharts,
            mockTargetComputer,
            mockSolarSystem
        );

        // Test 1: Basic integration activation
        assert(integration.isActive, "Integration should be active");
        console.log("   ✅ Integration activated successfully");

        // Test 2: Discovery callback registration
        let discoveryCallbackCalled = false;
        let discoveredObjectId = null;
        let discoveryDataReceived = null;

        integration.addDiscoveryCallback((objectId, data) => {
            discoveryCallbackCalled = true;
            discoveredObjectId = objectId;
            discoveryDataReceived = data;
        });

        // Simulate discovery
        mockStarCharts.addDiscoveredObject('A0_star', 'test', 'player');

        // Verify discovery callback was triggered
        assert(discoveryCallbackCalled, "Discovery callback should have been called");
        assert(discoveredObjectId === 'A0_star', "Correct object ID should be passed");
        assert(discoveryDataReceived.discoveryMethod === 'test', "Discovery method should be correct");
        console.log("   ✅ Discovery callback working correctly");

        // Test 3: Target synchronization
        // Add target to Target Computer via integration
        mockTargetComputer.knownTargets.set('A0_star', {
            id: 'A0_star',
            name: 'Central Star',
            type: 'star',
            discovered: true
        });

        // Simulate target selection from Star Charts
        let targetSelectionCalled = false;
        let selectedObjectId = null;

        integration.addTargetSelectionCallback((objectId) => {
            targetSelectionCalled = true;
            selectedObjectId = objectId;
        });

        // Trigger target selection through the integration
        integration.handleTargetSelection('A0_star');

        // Verify target selection callback
        assert(targetSelectionCalled, "Target selection callback should have been called");
        assert(selectedObjectId === 'A0_star', "Correct object ID should be selected");
        console.log("   ✅ Target selection integration working correctly");

        // Test 4: Enhanced target data
        const enhancedData = { test: 'enhanced', source: 'star_charts' };
        integration.enhancedTargets.set('A0_star', enhancedData);

        const retrievedData = integration.getEnhancedTargetData('A0_star');
        assert(retrievedData.test === 'enhanced', "Enhanced data should be retrievable");
        console.log("   ✅ Enhanced target data working correctly");

        // Test 5: Integration status
        const status = integration.getStatus();
        assert(status.active === true, "Integration should report as active");
        assert(status.starChartsAvailable === true, "Star Charts should be available");
        assert(status.targetComputerAvailable === true, "Target Computer should be available");
        console.log("   ✅ Integration status reporting correctly");

        // Cleanup
        integration.cleanup();

        console.log("   ✅ All Star Charts ↔ Target Computer integration tests passed");
        return true;

    } catch (error) {
        console.error("   ❌ Star Charts ↔ Target Computer integration test failed:", error);
        return false;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    console.log("🚀 Phase 5: Star Charts and Target Computer Integration Test Suite");
    console.log("=" * 70);

    const tests = [
        testStarChartsTargetComputerIntegration
    ];

    let passed = 0;
    const total = tests.length;

    for (const test of tests) {
        try {
            if (await test()) {
                passed++;
            }
            console.log();
        } catch (error) {
            console.error(`   ❌ Test crashed: ${error.message}`);
            console.log();
        }
    }

    console.log("=" * 70);
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log("🎉 All Phase 5 tests passed! Star Charts ↔ Target Computer integration working!");
        process.exit(0);
    } else {
        console.log("❌ Some Phase 5 tests failed. Please review the integration.");
        process.exit(1);
    }
}

// Run tests
main().catch(error => {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
});
