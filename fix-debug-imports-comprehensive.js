#!/usr/bin/env node

/**
 * COMPREHENSIVE DEBUG IMPORT PATH FIXER
 * Fixes all incorrect debug.js import paths across the entire codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsRoot = path.join(__dirname, 'frontend/static/js');
const debugFile = path.join(jsRoot, 'debug.js');

console.log('🔧 COMPREHENSIVE DEBUG IMPORT PATH FIXER');
console.log('=======================================');
console.log(`JS Root: ${jsRoot}`);
console.log(`Debug file: ${debugFile}`);
console.log('');

if (!fs.existsSync(debugFile)) {
    console.error('❌ debug.js file not found at expected location!');
    process.exit(1);
}

let totalFilesFixed = 0;
let totalImportsFixed = 0;

/**
 * Get the correct relative path from a file to debug.js
 */
function getCorrectImportPath(filePath) {
    const relativePath = path.relative(path.dirname(filePath), debugFile);
    // Convert Windows backslashes to forward slashes for ES modules
    const normalizedPath = relativePath.replace(/\\/g, '/');
    // Ensure it starts with ./ or ../ but not ./..
    if (normalizedPath.startsWith('./../')) {
        return normalizedPath.substring(2); // Remove the leading './'
    }
    if (!normalizedPath.startsWith('./') && !normalizedPath.startsWith('../')) {
        return './' + normalizedPath;
    }
    return normalizedPath;
}

/**
 * Fix debug imports in a single file
 */
function fixDebugImportsInFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let fixesInFile = 0;

        // Pattern to match debug.js imports with incorrect paths
        const importPattern = /import\s+{[^}]*}\s+from\s+['"`]([^'"`]*debug\.js)['"`];?/g;

        const newContent = content.replace(importPattern, (match, importPath) => {
            console.log(`  Found import: '${importPath}' in ${path.relative(jsRoot, filePath)}`);

            const correctPath = getCorrectImportPath(filePath);

            // Skip if already correct
            if (importPath === correctPath) {
                console.log(`    ✅ Already correct: '${importPath}'`);
                return match;
            }

            fixesInFile++;
            modified = true;

            console.log(`    🔧 ${path.relative(jsRoot, filePath)}: '${importPath}' → '${correctPath}'`);
            return match.replace(importPath, correctPath);
        });

        if (modified) {
            fs.writeFileSync(filePath, newContent);
            totalFilesFixed++;
            totalImportsFixed += fixesInFile;
        }

        return fixesInFile;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}: ${error.message}`);
        return 0;
    }
}

/**
 * Recursively process all JavaScript files in a directory
 */
function processDirectory(dirPath, dirName = '') {
    console.log(`📁 Processing ${dirName || 'root js/'} directory...`);

    let filesProcessed = 0;
    let fixesInDir = 0;

    function walkDirectory(currentPath) {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Skip node_modules and other irrelevant directories
                if (!item.startsWith('.') && item !== 'node_modules') {
                    walkDirectory(fullPath);
                }
            } else if (item.endsWith('.js') && item !== 'debug.js') {
                const fixes = fixDebugImportsInFile(fullPath);
                if (fixes > 0) {
                    fixesInDir += fixes;
                }
                filesProcessed++;
            }
        }
    }

    walkDirectory(dirPath);
    console.log(`  ✅ ${dirName} directory: ${fixesInDir} fixes in ${filesProcessed} files`);
    console.log('');
    return fixesInDir;
}

/**
 * Main execution
 */
function main() {
    console.log('🔍 Scanning for files with debug.js imports...\n');

    // Process each subdirectory
    const directories = [
        { path: path.join(jsRoot, 'ui'), name: 'ui/' },
        { path: path.join(jsRoot, 'views'), name: 'views/' },
        { path: path.join(jsRoot, 'ship'), name: 'ship/' },
        { path: path.join(jsRoot, 'ai'), name: 'ai/' },
        { path: path.join(jsRoot, 'services'), name: 'services/' },
        { path: path.join(jsRoot, 'utils'), name: 'utils/' },
        { path: jsRoot, name: 'root js/' } // Process root last
    ];

    for (const dir of directories) {
        if (fs.existsSync(dir.path)) {
            processDirectory(dir.path, dir.name);
        } else {
            console.log(`⚠️  Directory ${dir.name} not found, skipping...`);
        }
    }

    // Final summary
    console.log('=======================================');
    console.log('🎯 FIX SUMMARY');
    console.log('=======================================');
    console.log(`📁 Files modified: ${totalFilesFixed}`);
    console.log(`🔧 Import paths fixed: ${totalImportsFixed}`);
    console.log('');

    if (totalImportsFixed > 0) {
        console.log('✅ All debug.js import paths have been corrected!');
        console.log('🚀 Server should now load without 404 errors');
        console.log('');
        console.log('💡 Next steps:');
        console.log('   1. Restart your Flask server');
        console.log('   2. Refresh your browser');
        console.log('   3. Check browser console for remaining errors');
    } else {
        console.log('✅ No incorrect debug.js imports found!');
    }

    console.log('=======================================');
}

main();
