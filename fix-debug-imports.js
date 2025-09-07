#!/usr/bin/env node

/**
 * FIX DEBUG IMPORTS - Batch Tool
 * Automatically adds debug utility imports to all files with debug() calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if a file already imports the debug utility
 */
function hasDebugImport(content) {
    return content.includes("import { debug } from './debug.js'") ||
           content.includes('import { debug } from "./debug.js"');
}

/**
 * Add debug import to a file
 */
function addDebugImport(content, filePath) {
    const lines = content.split('\n');

    // Find the last import statement
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('import ') || line.startsWith('export ')) {
            lastImportIndex = i;
        } else if (line !== '' && !line.startsWith('//') && !line.startsWith('/*')) {
            // Stop at first non-import, non-comment, non-empty line
            break;
        }
    }

    if (lastImportIndex === -1) {
        // No imports found, add at the beginning
        lines.unshift("import { debug } from './debug.js';", '');
        return lines.join('\n');
    } else {
        // Add after the last import
        lines.splice(lastImportIndex + 1, 0, "import { debug } from './debug.js';");
        return lines.join('\n');
    }
}

/**
 * Process a single file
 */
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Skip if no debug calls
        if (!content.includes('debug(')) {
            return false;
        }

        // Skip if already has debug import
        if (hasDebugImport(content)) {
            console.log(`⏭️  ${path.relative(__dirname, filePath)} - Already has debug import`);
            return false;
        }

        // Add debug import
        const newContent = addDebugImport(content, filePath);
        fs.writeFileSync(filePath, newContent, 'utf8');

        console.log(`✅ ${path.relative(__dirname, filePath)} - Added debug import`);
        return true;

    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Find all JS files with debug() calls
 */
function findFilesWithDebugCalls() {
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
                    if (content.includes('debug(') && !content.includes('export class SmartDebugManager')) {
                        files.push(fullPath);
                    }
                } catch (error) {
                    console.warn(`⚠️  Could not read ${fullPath}:`, error.message);
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
    console.log('🔧 FIXING DEBUG IMPORTS - Batch Tool\n');
    console.log('This tool adds debug utility imports to all files with debug() calls\n');

    const files = findFilesWithDebugCalls();
    console.log(`📋 Found ${files.length} files with debug() calls\n`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
        const processed = processFile(file);
        if (processed) {
            processedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DEBUG IMPORTS FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Files processed: ${processedCount}`);
    console.log(`⏭️  Files skipped: ${skippedCount}`);
    console.log(`📁 Total files: ${files.length}`);
    console.log('='.repeat(60));

    if (processedCount > 0) {
        console.log('\n🎉 SUCCESS!');
        console.log('All files now have proper debug imports.');
        console.log('The ReferenceError: debug is not defined should be resolved!');
    } else {
        console.log('\nℹ️  No files needed processing.');
    }

    console.log('\n💡 Next steps:');
    console.log('1. Restart your game server');
    console.log('2. The debug system should work without ReferenceError');
    console.log('3. Try: debug("TESTING", "Hello World") in browser console');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
