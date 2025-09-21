// Simple test for old DebugManager (Three.js debugging)
// This tests the stats, axes, grid functionality

console.log('=== Old DebugManager Test ===');

// Mock Three.js objects
global.THREE = {
    AxesHelper: class {
        constructor(size) {
            this.size = size;
            this.visible = false;
        }
    },
    GridHelper: class {
        constructor(size, divisions) {
            this.size = size;
            this.divisions = divisions;
            this.visible = false;
        }
    }
};

// Mock Stats
global.Stats = class {
    constructor() {
        this.dom = { style: {} };
    }
    update() {
        // Mock update
    }
};

// Mock document
global.document = {
    createElement: () => ({
        style: {},
        innerHTML: ''
    }),
    body: {
        appendChild: () => {}
    }
};

// Extract the old DebugManager class from app.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appJsPath = path.join(__dirname, 'frontend/static/js/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Extract the DebugManager class (between "class DebugManager {" and the closing "}")
const debugManagerMatch = appJsContent.match(/class DebugManager \{[\s\S]*?\n\}/);
const debugManagerCode = debugManagerMatch[0];

// Create test function
const testCode = `
${debugManagerCode}

// Create test instance
const debugManager = new DebugManager();
console.log('✅ Old DebugManager created successfully');

// Test initialization
const mockScene = { add: () => {} };
const mockUiContainer = { appendChild: () => {} };
debugManager.initialize(mockScene, mockUiContainer);
console.log('✅ Old DebugManager initialized successfully');

// Test update method
debugManager.update();
console.log('✅ Old DebugManager update() works');

// Test toggle
debugManager.toggle();
console.log('✅ Old DebugManager toggle() works');

console.log('=== Old DebugManager Test Complete ===');
`;

// Execute the test
try {
    eval(testCode);
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}
