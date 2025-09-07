#!/usr/bin/env node

/**
 * BATCH DEBUG MIGRATION TOOL
 * Comprehensive tool to migrate console.log statements to Smart Debug System
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for channel mappings
const CHANNEL_MAPPINGS = {
    // Error and critical messages
    ERROR_PATTERNS: [
        { pattern: /error|Error|ERROR/i, channel: 'P1' },
        { pattern: /failed|Failed|FAILED/i, channel: 'P1' },
        { pattern: /critical|Critical|CRITICAL/i, channel: 'P1' },
        { pattern: /exception|Exception|EXCEPTION/i, channel: 'P1' },
        { pattern: /null|undefined|NaN/i, channel: 'P1' }
    ],

    // Combat and targeting
    COMBAT_PATTERNS: [
        { pattern: /target|Target|TARGET/i, channel: 'TARGETING' },
        { pattern: /weapon|Weapon|WEAPON/i, channel: 'COMBAT' },
        { pattern: /combat|Combat|COMBAT/i, channel: 'COMBAT' },
        { pattern: /damage|Damage|DAMAGE/i, channel: 'COMBAT' },
        { pattern: /shield|Shield|SHIELD/i, channel: 'COMBAT' },
        { pattern: /fire|Fire|FIRE/i, channel: 'COMBAT' }
    ],

    // AI and navigation
    AI_PATTERNS: [
        { pattern: /ai|AI/i, channel: 'AI' },
        { pattern: /navigation|Navigation|NAV/i, channel: 'NAVIGATION' },
        { pattern: /formation|Formation|FORMATION/i, channel: 'AI' },
        { pattern: /flocking|Flocking|FLOCKING/i, channel: 'AI' },
        { pattern: /path|Path|PATH/i, channel: 'NAVIGATION' }
    ],

    // UI and interface
    UI_PATTERNS: [
        { pattern: /ui|UI|interface|Interface|INTERFACE/i, channel: 'UI' },
        { pattern: /hud|HUD|display|Display|DISPLAY/i, channel: 'UI' },
        { pattern: /card|Card|CARD/i, channel: 'UI' },
        { pattern: /inventory|Inventory|INVENTORY/i, channel: 'UI' },
        { pattern: /mission|Mission|MISSION/i, channel: 'MISSIONS' }
    ],

    // Performance and systems
    SYSTEM_PATTERNS: [
        { pattern: /performance|Performance|PERFORMANCE/i, channel: 'PERFORMANCE' },
        { pattern: /render|Render|RENDER/i, channel: 'RENDER' },
        { pattern: /physics|Physics|PHYSICS/i, channel: 'PHYSICS' },
        { pattern: /memory|Memory|MEMORY/i, channel: 'PERFORMANCE' },
        { pattern: /fps|FPS|frame|Frame|FRAME/i, channel: 'PERFORMANCE' }
    ],

    // Generic patterns (fallback)
    GENERIC_PATTERNS: [
        { pattern: /debug|Debug|DEBUG/i, channel: 'INSPECTION' },
        { pattern: /log|Log|LOG/i, channel: 'UTILITY' },
        { pattern: /init|Init|INIT/i, channel: 'UTILITY' },
        { pattern: /load|Load|LOAD/i, channel: 'UTILITY' },
        { pattern: /update|Update|UPDATE/i, channel: 'UTILITY' }
    ]
};

class BatchDebugMigrator {
    constructor() {
        this.stats = {
            filesProcessed: 0,
            statementsMigrated: 0,
            statementsSkipped: 0,
            errors: 0
        };
        this.results = {
            migrated: [],
            skipped: [],
            errors: []
        };
    }

    // Determine appropriate channel for a console.log statement
    determineChannel(content, filePath) {
        // Check error patterns first (highest priority)
        for (const { pattern, channel } of CHANNEL_MAPPINGS.ERROR_PATTERNS) {
            if (pattern.test(content)) {
                return channel;
            }
        }

        // Check combat patterns
        for (const { pattern, channel } of CHANNEL_MAPPINGS.COMBAT_PATTERNS) {
            if (pattern.test(content)) {
                return channel;
            }
        }

        // Check AI patterns
        for (const { pattern, channel } of CHANNEL_MAPPINGS.AI_PATTERNS) {
            if (pattern.test(content)) {
                return channel;
            }
        }

        // Check UI patterns
        for (const { pattern, channel } of CHANNEL_MAPPINGS.UI_PATTERNS) {
            if (pattern.test(content)) {
                return channel;
            }
        }

        // Check system patterns
        for (const { pattern, channel } of CHANNEL_MAPPINGS.SYSTEM_PATTERNS) {
            if (pattern.test(content)) {
                return channel;
            }
        }

        // Check generic patterns
        for (const { pattern, channel } of CHANNEL_MAPPINGS.GENERIC_PATTERNS) {
            if (pattern.test(content)) {
                return channel;
            }
        }

        // Default channel based on file type
        if (filePath.includes('/ui/') || filePath.includes('HUD') || filePath.includes('Interface')) {
            return 'UI';
        }
        if (filePath.includes('Manager') || filePath.includes('Controller')) {
            return 'UTILITY';
        }

        // Ultimate fallback
        return 'UTILITY';
    }

    // Extract the actual message content from console.log statement
    extractMessage(statement) {
        // Match console.log(anything) and extract the 'anything' part
        const match = statement.match(/console\.log\s*\(\s*(.+)\s*\)\s*;/);
        if (!match) return null;

        let content = match[1].trim();

        // Handle template literals
        if (content.startsWith('`') && content.endsWith('`')) {
            content = content.slice(1, -1);
        }

        // Handle string literals
        if ((content.startsWith('"') && content.endsWith('"')) ||
            (content.startsWith("'") && content.endsWith("'"))) {
            content = content.slice(1, -1);
        }

        return content;
    }

    // Migrate a single console.log statement
    migrateStatement(statement, filePath) {
        const message = this.extractMessage(statement);
        if (!message) {
            this.results.errors.push({
                file: filePath,
                statement: statement,
                error: 'Could not extract message'
            });
            return statement; // Return unchanged
        }

        const channel = this.determineChannel(message, filePath);

        // Skip if it's already a debug statement or contains debug() call
        if (statement.includes('debug(') || statement.includes('window.debug')) {
            this.results.skipped.push({
                file: filePath,
                statement: statement,
                reason: 'Already migrated'
            });
            return statement;
        }

        // Skip very verbose or complex statements
        if (statement.includes('JSON.stringify') || statement.length > 200) {
            this.results.skipped.push({
                file: filePath,
                statement: statement,
                reason: 'Complex statement - manual review needed'
            });
            return statement;
        }

        // Extract arguments from console.log call
        const argMatch = statement.match(/console\.log\s*\(\s*(.+)\s*\)\s*;/);
        if (!argMatch) {
            this.results.errors.push({
                file: filePath,
                statement: statement,
                error: 'Could not parse console.log arguments'
            });
            return statement;
        }

        const args = argMatch[1];

        // Handle single string argument
        if (args.startsWith('"') || args.startsWith("'") || args.startsWith('`')) {
            const migratedStatement = `debug('${channel}', ${args});`;
            this.results.migrated.push({
                file: filePath,
                original: statement,
                migrated: migratedStatement,
                channel: channel
            });
            return migratedStatement;
        }

        // Handle multiple arguments - convert to template string
        const migratedStatement = `debug('${channel}', \`${args.replace(/`/g, '\\`')}\`);`;

        this.results.migrated.push({
            file: filePath,
            original: statement,
            migrated: migratedStatement,
            channel: channel
        });

        return migratedStatement;
    }

    // Process a single file
    async processFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let modified = false;
            let migratedCount = 0;

            console.log(`📄 Processing: ${filePath}`);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check if line contains console.log
                if (line.includes('console.log(') && !line.startsWith('//')) {
                    const originalStatement = line;
                    const migratedStatement = this.migrateStatement(originalStatement, filePath);

                    if (migratedStatement !== originalStatement) {
                        lines[i] = migratedStatement;
                        modified = true;
                        migratedCount++;
                    }
                }
            }

            // Write back if modified
            if (modified) {
                const newContent = lines.join('\n');
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`  ✅ Migrated ${migratedCount} statements`);
            } else {
                console.log(`  ⏭️  No migrations needed`);
            }

            this.stats.filesProcessed++;
            this.stats.statementsMigrated += migratedCount;

        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
            this.stats.errors++;
            this.results.errors.push({
                file: filePath,
                error: error.message
            });
        }
    }

    // Find all JavaScript files with console.log statements
    findFilesWithConsoleLog() {
        const result = [];
        const frontendStaticDir = path.join(__dirname, 'frontend', 'static');

        function scanDirectory(dir) {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    scanDirectory(filePath);
                } else if (file.endsWith('.js')) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.includes('console.log(')) {
                            result.push(filePath);
                        }
                    } catch (error) {
                        console.warn(`⚠️  Could not read ${filePath}:`, error.message);
                    }
                }
            }
        }

        scanDirectory(frontendStaticDir);
        return result;
    }

    // Main migration process
    async runMigration() {
        console.log('🚀 Starting Batch Debug Migration...\n');

        const files = this.findFilesWithConsoleLog();
        console.log(`📋 Found ${files.length} files with console.log statements\n`);

        // Process files in batches to avoid overwhelming the system
        const batchSize = 5;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(files.length/batchSize)}`);

            await Promise.all(batch.map(file => this.processFile(file)));

            // Small delay between batches
            if (i + batchSize < files.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.printSummary();
    }

    // Print comprehensive summary
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));

        console.log(`\n📁 Files Processed: ${this.stats.filesProcessed}`);
        console.log(`✅ Statements Migrated: ${this.stats.statementsMigrated}`);
        console.log(`⏭️  Statements Skipped: ${this.stats.statementsSkipped}`);
        console.log(`❌ Errors: ${this.stats.errors}`);

        // Channel breakdown
        const channelStats = {};
        this.results.migrated.forEach(item => {
            channelStats[item.channel] = (channelStats[item.channel] || 0) + 1;
        });

        console.log('\n📊 Channel Distribution:');
        Object.entries(channelStats)
            .sort(([,a], [,b]) => b - a)
            .forEach(([channel, count]) => {
                console.log(`  ${channel}: ${count} statements`);
            });

        // Top files by migration count
        const fileStats = {};
        this.results.migrated.forEach(item => {
            fileStats[item.file] = (fileStats[item.file] || 0) + 1;
        });

        console.log('\n📄 Top Files by Migration Count:');
        Object.entries(fileStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([file, count]) => {
                console.log(`  ${path.relative(__dirname, file)}: ${count} statements`);
            });

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            this.results.errors.slice(0, 5).forEach(error => {
                console.log(`  ${path.relative(__dirname, error.file)}: ${error.error}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎯 Migration Complete! Ready for testing.');
        console.log('='.repeat(60));
    }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const migrator = new BatchDebugMigrator();
    migrator.runMigration().catch(console.error);
}

export default BatchDebugMigrator;
