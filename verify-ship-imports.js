#!/usr/bin/env node

/**
 * VERIFY SHIP SYSTEMS IMPORTS - Confirm all debug.js imports are correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 VERIFYING SHIP SYSTEMS DEBUG IMPORTS\n');

function checkImportPaths(dir) {
    const items = fs.readdirSync(dir);
    let totalFiles = 0;
    let correctImports = 0;
    let incorrectImports = 0;

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== '.' && item !== '..') {
            // Recursively check subdirectories
            const subResult = checkImportPaths(fullPath);
            totalFiles += subResult.totalFiles;
            correctImports += subResult.correctImports;
            incorrectImports += subResult.incorrectImports;
        } else if (item.endsWith('.js')) {
            totalFiles++;

            try {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Check for debug.js imports
                const debugImports = content.match(/import\s*\{\s*debug\s*\}\s*from\s*['"`][^'"`]*debug\.js['"`]/g);

                if (debugImports) {
                    for (const importStmt of debugImports) {
                        if (importStmt.includes('../../debug.js')) {
                            correctImports++;
                        } else {
                            incorrectImports++;
                            console.log(`❌ ${path.relative(__dirname, fullPath)}: ${importStmt.trim()}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`❌ Error reading ${path.relative(__dirname, fullPath)}: ${error.message}`);
                incorrectImports++;
            }
        }
    }

    return { totalFiles, correctImports, incorrectImports };
}

const shipSystemsDir = path.join(__dirname, 'frontend/static/js/ship/systems');

console.log('📋 Checking import paths...\n');

const result = checkImportPaths(shipSystemsDir);

console.log('\n📊 VERIFICATION RESULTS:');
console.log(`📁 Total files checked: ${result.totalFiles}`);
console.log(`✅ Correct imports: ${result.correctImports}`);
console.log(`❌ Incorrect imports: ${result.incorrectImports}`);

if (result.incorrectImports === 0) {
    console.log('\n🎉 ALL IMPORTS ARE CORRECT!');
    console.log('✅ No more ship/systems 404 errors should occur');
    console.log('✅ All files import from the correct path: ../../debug.js');
} else {
    console.log(`\n⚠️  ${result.incorrectImports} files still have incorrect imports.`);
    console.log('The 404 error may still occur for those files.');
}

console.log('\n🔍 PATH RESOLUTION:');
console.log('File location: frontend/static/js/ship/systems/[filename].js');
console.log('Import path:  ../../debug.js');
console.log('Resolves to:  frontend/static/js/debug.js ✅');
console.log('URL:         /static/js/debug.js ✅');

console.log('\n🚀 READY TO TEST!');
console.log('Refresh your browser - the ship/systems 404 errors should be resolved!');
