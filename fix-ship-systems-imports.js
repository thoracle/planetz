#!/usr/bin/env node

/**
 * FIX SHIP SYSTEMS IMPORTS - Correct debug.js import paths in ship/systems directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 FIXING SHIP SYSTEMS DEBUG IMPORTS\n');

// Files in ship/systems directory need '../../debug.js' instead of './debug.js'
const shipSystemsDir = path.join(__dirname, 'frontend/static/js/ship/systems');

function fixImportPaths(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== '.' && item !== '..') {
            // Recursively handle subdirectories
            fixImportPaths(fullPath);
        } else if (item.endsWith('.js')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const originalContent = content;

                // Replace './debug.js' with '../../debug.js'
                const newContent = content.replace(
                    /import\s*\{\s*debug\s*\}\s*from\s*['"`]\.\/debug\.js['"`]/g,
                    `import { debug } from '../../debug.js'`
                );

                if (newContent !== originalContent) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`✅ ${path.relative(__dirname, fullPath)} - Fixed import path`);
                }
            } catch (error) {
                console.log(`❌ Error processing ${path.relative(__dirname, fullPath)}: ${error.message}`);
            }
        }
    }
}

console.log('📋 Fixing import paths in ship/systems directory...\n');

try {
    fixImportPaths(shipSystemsDir);
    console.log('\n🎉 SHIP SYSTEMS IMPORTS FIXED!');
    console.log('All files in ship/systems now use correct debug.js import paths.');
} catch (error) {
    console.log(`❌ Error fixing imports: ${error.message}`);
}

console.log('\n🔍 VERIFYING FIXES...\n');

// Verify the fixes
function verifyFixes(dir) {
    const items = fs.readdirSync(dir);
    let fixedCount = 0;
    let totalCount = 0;

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== '.' && item !== '..') {
            const result = verifyFixes(fullPath);
            fixedCount += result.fixedCount;
            totalCount += result.totalCount;
        } else if (item.endsWith('.js')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                totalCount++;

                if (content.includes('../../debug.js')) {
                    fixedCount++;
                } else if (content.includes('./debug.js')) {
                    console.log(`❌ ${path.relative(__dirname, fullPath)} - Still has incorrect import`);
                }
            } catch (error) {
                console.log(`❌ Error reading ${path.relative(__dirname, fullPath)}: ${error.message}`);
            }
        }
    }

    return { fixedCount, totalCount };
}

const result = verifyFixes(shipSystemsDir);
console.log(`\n📊 VERIFICATION RESULTS:`);
console.log(`✅ Files with correct imports: ${result.fixedCount}/${result.totalCount}`);

if (result.fixedCount === result.totalCount) {
    console.log('\n🎉 ALL IMPORTS SUCCESSFULLY FIXED!');
    console.log('The 404 error for ship/systems/debug.js should now be resolved.');
} else {
    console.log(`\n⚠️  ${result.totalCount - result.fixedCount} files still have incorrect imports.`);
}

console.log('\n💡 WHAT WAS FIXED:');
console.log('❌ Before: import { debug } from \'./debug.js\' (resolved to ship/systems/debug.js)');
console.log('✅ After:  import { debug } from \'../../debug.js\' (resolves to static/js/debug.js)');

console.log('\n🚀 READY TO TEST!');
console.log('Refresh your browser - the ship/systems 404 errors should be gone!');
