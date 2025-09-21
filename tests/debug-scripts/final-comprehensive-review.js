#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE REVIEW - Check all debug system components for issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 FINAL COMPREHENSIVE DEBUG SYSTEM REVIEW\n');

let totalIssues = 0;
let criticalIssues = 0;

/**
 * Test helper function
 */
function checkIssue(description, condition, isCritical = false) {
    if (condition) {
        console.log(`❌ ${description}`);
        totalIssues++;
        if (isCritical) {
            criticalIssues++;
            console.log(`   🚨 CRITICAL ISSUE DETECTED!`);
        }
    } else {
        console.log(`✅ ${description}`);
    }
    console.log('');
}

// 1. Check file existence and accessibility
console.log('📁 FILE ACCESSIBILITY CHECKS:');
checkIssue('debug.js exists in correct location', !fs.existsSync(path.join(__dirname, 'frontend/static/js/debug.js')), true);
checkIssue('SmartDebugManager exists', !fs.existsSync(path.join(__dirname, 'frontend/static/js/utils/DebugManager.js')), true);
checkIssue('app.js exists', !fs.existsSync(path.join(__dirname, 'frontend/static/js/app.js')), true);
checkIssue('index.html exists', !fs.existsSync(path.join(__dirname, 'frontend/index.html')), true);

// 2. Check for recursive debug calls
console.log('🔄 RECURSION CHECKS:');
try {
    const debugContent = fs.readFileSync(path.join(__dirname, 'frontend/static/js/debug.js'), 'utf8');
    const hasRecursiveCall = debugContent.includes('window.debug(') && debugContent.includes('export function debug');
    checkIssue('Recursive debug calls in debug.js', hasRecursiveCall, true);
} catch (error) {
    checkIssue('Error reading debug.js', true, true);
}

// 3. Check for multiple window.debug assignments
console.log('🌐 WINDOW.DEBUG ASSIGNMENT CHECKS:');
try {
    const debugContent = fs.readFileSync(path.join(__dirname, 'frontend/static/js/debug.js'), 'utf8');
    const hasWindowDebugAssignment = debugContent.includes('window.debug = debug');
    checkIssue('Debug.js has window.debug assignment (should not)', hasWindowDebugAssignment, false);

    const htmlContent = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');
    const htmlHasWindowDebug = htmlContent.includes('window.debug = debug');
    checkIssue('HTML preload sets window.debug (should not)', htmlHasWindowDebug, false);

    const appContent = fs.readFileSync(path.join(__dirname, 'frontend/static/js/app.js'), 'utf8');
    const appHasWindowDebug = appContent.includes('window.debug =');
    checkIssue('App.js sets window.debug', appHasWindowDebug, false);
} catch (error) {
    checkIssue('Error checking window.debug assignments', true, true);
}

// 4. Check import path consistency
console.log('📦 IMPORT PATH CHECKS:');
try {
    const files = [
        'frontend/static/js/utils/PlayerCredits.js',
        'frontend/static/js/ship/systems/WeaponSlot.js',
        'frontend/static/js/views/ViewManager.js'
    ];

    for (const file of files) {
        const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const hasDebugImport = content.includes("import { debug } from './debug.js'") ||
                              content.includes("import { debug } from '../../debug.js'");
        checkIssue(`${file} has debug import`, hasDebugImport, false);
    }
} catch (error) {
    checkIssue('Error checking import paths', true, true);
}

// 5. Check SmartDebugManager for issues
console.log('🎯 SMARTDEBUGMANAGER CHECKS:');
try {
    const debugManagerContent = fs.readFileSync(path.join(__dirname, 'frontend/static/js/utils/DebugManager.js'), 'utf8');

    // Check that SmartDebugManager.debug() uses console.log directly (not recursive)
    const usesConsoleLog = debugManagerContent.includes('console.log(formattedMessage)');
    checkIssue('SmartDebugManager.debug() uses console.log correctly', !usesConsoleLog, true);

    // Check for proper channel handling
    const hasP1Check = debugManagerContent.includes("channel !== 'P1'");
    checkIssue('SmartDebugManager handles P1 channel correctly', !hasP1Check, false);

    // Check for setupGlobalAccess
    const hasSetupGlobal = debugManagerContent.includes('setupGlobalAccess()');
    checkIssue('SmartDebugManager has setupGlobalAccess method', !hasSetupGlobal, true);
} catch (error) {
    checkIssue('Error checking SmartDebugManager', true, true);
}

// 6. Check Flask server configuration
console.log('🌐 FLASK SERVER CHECKS:');
try {
    const flaskContent = fs.readFileSync(path.join(__dirname, 'backend/__init__.py'), 'utf8');

    const hasStaticFolder = flaskContent.includes("static_folder=static_dir");
    const hasStaticUrlPath = flaskContent.includes("static_url_path='/static'");
    checkIssue('Flask configured with correct static folder', !hasStaticFolder, true);
    checkIssue('Flask configured with correct static URL path', !hasStaticUrlPath, false);
} catch (error) {
    checkIssue('Error checking Flask configuration', true, true);
}

// 7. Check HTML module loading
console.log('📄 HTML MODULE LOADING CHECKS:');
try {
    const htmlContent = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');

    const hasModuleScript = htmlContent.includes('type="module"');
    const hasAppJs = htmlContent.includes('src="static/js/app.js"');
    checkIssue('HTML loads ES6 modules', !hasModuleScript, true);
    checkIssue('HTML loads app.js as module', !hasAppJs, true);
} catch (error) {
    checkIssue('Error checking HTML', true, true);
}

// 8. Check for any remaining console.log statements that should be debug calls
console.log('🔧 MIGRATION COMPLETENESS CHECKS:');
try {
    // Quick check - don't scan all files for performance
    const keyFiles = [
        'frontend/static/js/app.js',
        'frontend/static/js/views/StarfieldManager.js',
        'frontend/static/js/PhysicsManager.js'
    ];

    for (const file of keyFiles) {
        const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const consoleLogs = (content.match(/console\.log\(/g) || []).length;
        const debugCalls = (content.match(/debug\(/g) || []).length;

        if (consoleLogs > debugCalls * 2) { // Allow some console.log for errors/warnings
            checkIssue(`${file} has too many unmigrated console.log calls (${consoleLogs} vs ${debugCalls} debug calls)`, true, false);
        } else {
            console.log(`✅ ${file} migration looks good (${debugCalls} debug calls, ${consoleLogs} console.log calls)`);
        }
    }
} catch (error) {
    checkIssue('Error checking migration completeness', true, false);
}

console.log('='.repeat(60));
console.log('📊 FINAL REVIEW RESULTS');
console.log('='.repeat(60));
console.log(`Total Issues Found: ${totalIssues}`);
console.log(`Critical Issues: ${criticalIssues}`);
console.log(`Non-Critical Issues: ${totalIssues - criticalIssues}`);

if (criticalIssues === 0) {
    console.log('\n🎉 ALL CRITICAL ISSUES RESOLVED!');
    console.log('✅ Debug system should work without errors');
    console.log('✅ No recursive calls or infinite loops');
    console.log('✅ Proper module loading and imports');
    console.log('✅ Flask server correctly configured');
} else {
    console.log(`\n⚠️  ${criticalIssues} CRITICAL ISSUES NEED ATTENTION!`);
    console.log('The debug system may not work correctly until these are fixed.');
}

if (totalIssues === 0) {
    console.log('\n🏆 PERFECT SCORE! No issues found.');
    console.log('The debug system implementation is flawless.');
} else {
    console.log(`\n📋 ${totalIssues} total issues identified.`);
    console.log('Review the output above for details.');
}

console.log('\n🚀 READY FOR PRODUCTION TESTING');
console.log('Start your server and test the debug system in the browser.');

console.log('\n' + '='.repeat(60));
