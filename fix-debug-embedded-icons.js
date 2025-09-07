#!/usr/bin/env node

/**
 * Fix Debug Embedded Icons Script
 *
 * This script finds all debug() calls with embedded icons in the message text
 * and removes them, since SmartDebugManager automatically adds icons based on channel.
 */

import fs from 'fs';
import path from 'path';

// Define the icon emojis used by SmartDebugManager
const iconEmojis = [
    '🎯', '🗺️', '🔍', '🗣️', '🔧', '🤖', '👆', '🚀', '⚔️', '🧭', '📡', '💰', '💵', '🏗️', '🧪', '🔴',
    '⚠️', '🛡️', '🗑️', '👁️', '⌨️', '⚙️', '🛰️', '🔗', '🗂️'
];

// Function to recursively find all JS files
function findJSFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            findJSFiles(fullPath, files);
        } else if (stat.isFile() && item.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

function fixEmbeddedIcons() {
    console.log('🔧 Starting to fix embedded icons in debug calls...');

    // Find all JavaScript files in the frontend directory
    const files = findJSFiles('frontend/static/js');

    let totalFiles = 0;
    let totalFixes = 0;

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            let updatedContent = content;
            let fileFixes = 0;

            // Create regex patterns for each icon
            for (const icon of iconEmojis) {
                const escapedIcon = icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Pattern 1: debug('channel', 'icon message')
                const pattern1 = new RegExp(`debug\\s*\\(\\s*['"]([^'"]*)['"]\\s*,\\s*['"]${escapedIcon}\\s+([^'"]*)['"]\\s*\\)`, 'g');
                updatedContent = updatedContent.replace(pattern1, (match, channel, message) => {
                    fileFixes++;
                    return `debug('${channel}', '${message}')`;
                });

                // Pattern 2: debug('channel', 'icon message', ...other args)
                const pattern2 = new RegExp(`debug\\s*\\(\\s*['"]([^'"]*)['"]\\s*,\\s*['"]${escapedIcon}\\s+([^'"]*)['"]\\s*,`, 'g');
                updatedContent = updatedContent.replace(pattern2, (match, channel, message) => {
                    fileFixes++;
                    return `debug('${channel}', '${message}',`;
                });
            }

            if (fileFixes > 0) {
                fs.writeFileSync(file, updatedContent, 'utf8');
                console.log(`✅ Fixed ${fileFixes} debug calls in ${file}`);
                totalFiles++;
                totalFixes += fileFixes;
            }
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }

    console.log(`\n🎉 Completed! Fixed ${totalFixes} debug calls across ${totalFiles} files.`);
    console.log('🔧 SmartDebugManager will now automatically add the appropriate icons.');
}

fixEmbeddedIcons();