#!/usr/bin/env node

/**
 * VERIFY DEBUG IMPORTS - Check that all debug.js imports are working
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsRoot = path.join(__dirname, 'frontend/static/js');
const debugFile = path.join(jsRoot, 'debug.js');

console.log('🔍 VERIFYING DEBUG IMPORTS');
console.log('==========================');
console.log(`JS Root: ${jsRoot}`);
console.log(`Debug file: ${debugFile}`);
console.log('');

let totalFiles = 0;
let correctImports = 0;
let incorrectImports = 0;
let filesWithImports = 0;

/**
 * Get the expected correct path from a file to debug.js
 */
function getExpectedPath(filePath) {
    const relativePath = path.relative(path.dirname(filePath), debugFile);
    const normalizedPath = relativePath.replace(/\\/g, '/');
    if (normalizedPath.startsWith('./../')) {
        return normalizedPath.substring(2);
    }
    if (!normalizedPath.startsWith('./') && !normalizedPath.startsWith('../')) {
        return './' + normalizedPath;
    }
    return normalizedPath;
}

/**
 * Check debug imports in a single file
 */
function checkDebugImportsInFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const importMatch = line.match(/import\s+{[^}]*}\s+from\s+['"`]([^'"`]*debug\.js)['"`];?/);

            if (importMatch) {
                const importPath = importMatch[1];
                const expectedPath = getExpectedPath(filePath);
                const relativeFilePath = path.relative(jsRoot, filePath);

                totalFiles++;
                filesWithImports++;

                if (importPath === expectedPath) {
                    correctImports++;
                    console.log(`✅ ${relativeFilePath}: '${importPath}' ✓`);
                } else {
                    incorrectImports++;
                    console.log(`❌ ${relativeFilePath}: '${importPath}' → '${expectedPath}' ✗`);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error reading ${filePath}: ${error.message}`);
    }
}

/**
 * Recursively check all JavaScript files
 */
function checkDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip node_modules and other irrelevant directories
            if (!item.startsWith('.') && item !== 'node_modules') {
                checkDirectory(fullPath);
            }
        } else if (item.endsWith('.js') && item !== 'debug.js') {
            checkDebugImportsInFile(fullPath);
        }
    }
}

console.log('🔍 Scanning for debug.js imports...\n');

// Check all directories
const directories = [
    path.join(jsRoot, 'ui'),
    path.join(jsRoot, 'views'),
    path.join(jsRoot, 'ship'),
    path.join(jsRoot, 'ai'),
    path.join(jsRoot, 'services'),
    path.join(jsRoot, 'utils'),
    jsRoot // root js directory
];

for (const dir of directories) {
    if (fs.existsSync(dir)) {
        checkDirectory(dir);
    }
}

console.log('\n==========================');
console.log('📊 VERIFICATION RESULTS');
console.log('==========================');
console.log(`📁 Files scanned: ${totalFiles}`);
console.log(`📦 Files with debug imports: ${filesWithImports}`);
console.log(`✅ Correct imports: ${correctImports}`);
console.log(`❌ Incorrect imports: ${incorrectImports}`);
console.log('');

if (incorrectImports === 0) {
    console.log('🎉 SUCCESS! All debug.js imports are correct!');
    console.log('🚀 The 404 errors should now be resolved.');
} else {
    console.log(`⚠️  ${incorrectImports} files still have incorrect debug.js imports.`);
    console.log('🔧 Run the fix script again to correct these.');
}

console.log('==========================');

// Additional verification - test actual HTTP requests
console.log('\n🌐 TESTING HTTP ACCESSIBILITY...\n');

const testUrls = [
    'http://localhost:5001/static/js/debug.js',
    'http://localhost:5001/static/js/ui/HelpInterface.js',
    'http://localhost:5001/static/js/views/StarfieldManager.js'
];

for (const url of testUrls) {
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log(`✅ ${url} - HTTP ${response.status}`);
        } else {
            console.log(`❌ ${url} - HTTP ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ ${url} - Error: ${error.message}`);
    }
}

console.log('\n🎯 VERIFICATION COMPLETE');
