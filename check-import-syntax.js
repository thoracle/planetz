#!/usr/bin/env node

/**
 * CHECK IMPORT SYNTAX - Verify all debug imports are correctly placed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if import statements are syntactically correct
 */
function checkImportSyntax(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check for malformed import statements
            if (line.includes('import { debug } from')) {
                // Check if this import is inside an object or other invalid context
                let braceCount = 0;
                let inObject = false;

                // Look backwards to see context
                for (let j = i - 1; j >= 0; j--) {
                    const prevLine = lines[j].trim();

                    // Count braces to detect if we're inside an object
                    braceCount += (prevLine.match(/\{/g) || []).length;
                    braceCount -= (prevLine.match(/\}/g) || []).length;

                    if (braceCount > 0) {
                        inObject = true;
                        break;
                    }

                    // Stop if we hit another import or export
                    if (prevLine.startsWith('import') || prevLine.startsWith('export')) {
                        break;
                    }
                }

                if (inObject) {
                    console.log(`❌ MALFORMED IMPORT in ${path.relative(__dirname, filePath)}:${i + 1}`);
                    console.log(`   Context: Import statement inside object/block`);
                    return false;
                }

                // Check if import statement is properly formed
                if (!line.endsWith(';')) {
                    console.log(`❌ MALFORMED IMPORT in ${path.relative(__dirname, filePath)}:${i + 1}`);
                    console.log(`   Missing semicolon: ${line}`);
                    return false;
                }
            }
        }

        return true;
    } catch (error) {
        console.log(`❌ ERROR reading ${path.relative(__dirname, filePath)}: ${error.message}`);
        return false;
    }
}

/**
 * Find all JS files with debug imports
 */
function findFilesWithDebugImports() {
    const files = [];

    function scanDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                scanDirectory(fullPath);
            } else if (item.endsWith('.js')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes("import { debug } from './debug.js'")) {
                        files.push(fullPath);
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        }
    }

    scanDirectory(path.join(__dirname, 'frontend', 'static'));
    return files;
}

/**
 * Main function
 */
function main() {
    console.log('🔍 CHECKING IMPORT SYNTAX...\n');

    const files = findFilesWithDebugImports();
    console.log(`📋 Found ${files.length} files with debug imports\n`);

    let validFiles = 0;
    let invalidFiles = 0;

    for (const file of files) {
        const isValid = checkImportSyntax(file);
        if (isValid) {
            validFiles++;
        } else {
            invalidFiles++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SYNTAX RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Valid imports: ${validFiles}`);
    console.log(`❌ Invalid imports: ${invalidFiles}`);
    console.log(`📁 Total files: ${files.length}`);

    if (invalidFiles === 0) {
        console.log('\n🎉 ALL IMPORTS ARE SYNTAX-CORRECT!');
        console.log('The debug system should work without syntax errors.');
    } else {
        console.log('\n⚠️  FOUND SYNTAX ERRORS!');
        console.log('Please fix the malformed imports before using the debug system.');
    }

    console.log('='.repeat(60));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
