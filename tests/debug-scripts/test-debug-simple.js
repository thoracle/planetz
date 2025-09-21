// Simple test for Smart Debug System
// This can be run independently to verify the system works

console.log('=== Smart Debug System Simple Test ===');

// Mock localStorage for testing
global.localStorage = {
    data: {},
    getItem: function(key) {
        return this.data[key] || null;
    },
    setItem: function(key, value) {
        this.data[key] = value;
    },
    removeItem: function(key) {
        delete this.data[key];
    }
};

// Mock window for browser globals
global.window = {
    debugToggle: null,
    debugEnable: null,
    debugDisable: null,
    debugStats: null,
    debugStates: null,
    debugReset: null,
    debugList: null,
    smartDebugManager: null
};

// Import and test the SmartDebugManager
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the DebugManager file
const debugManagerPath = path.join(__dirname, 'frontend/static/js/utils/DebugManager.js');
const debugManagerCode = fs.readFileSync(debugManagerPath, 'utf8');

// Convert ES6 module to CommonJS for testing
const convertedCode = debugManagerCode
    .replace('export class SmartDebugManager', 'class SmartDebugManager')
    .replace('export { SmartDebugManager };', '');

// Create a test function
const testCode = `
${convertedCode}

// Create test instance
const debugManager = new SmartDebugManager();
console.log('✅ SmartDebugManager created successfully');

// Test debug function
debugManager.debug('🎯 TARGETING', 'Test message');
debugManager.debug('🚀 MISSIONS', 'Mission test');
debugManager.debug('🔴 P1', 'Priority test');
debugManager.debug('🧪 TESTING', 'Disabled channel test');

console.log('\\n=== Channel States ===');
const states = debugManager.getChannelStates();
Object.entries(states).forEach(([channel, enabled]) => {
    console.log(\`\${enabled ? '✅' : '❌'} \${channel}\`);
});

console.log('\\n=== Test Complete ===');
`;

// Execute the test
try {
    eval(testCode);
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}
