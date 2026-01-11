#!/usr/bin/env node
/**
 * PlanetZ Build Script
 * Uses esbuild for fast JavaScript bundling
 *
 * Usage:
 *   npm run build          - Development build
 *   npm run build:prod     - Production build (minified)
 *   npm run build:analyze  - Build with bundle analysis
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Configuration
const isProd = process.env.NODE_ENV === 'production';
const shouldAnalyze = process.argv.includes('--analyze');
const srcDir = path.join(__dirname, '..', 'frontend', 'static', 'js');
const outDir = path.join(__dirname, '..', 'dist', 'js');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Build configuration
const buildConfig = {
    entryPoints: [path.join(srcDir, 'app.js')],
    bundle: true,
    outfile: path.join(outDir, 'app.bundle.js'),
    minify: isProd,
    sourcemap: !isProd,
    target: ['es2020'],
    format: 'esm',
    platform: 'browser',
    // External dependencies (loaded via CDN)
    external: ['three'],
    // Define environment variables
    define: {
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development')
    },
    // Loader for different file types
    loader: {
        '.js': 'js',
        '.json': 'json'
    },
    // Logging
    logLevel: 'info',
    // Metafile for bundle analysis
    metafile: shouldAnalyze
};

async function build() {
    console.log(`\n🚀 Building PlanetZ (${isProd ? 'production' : 'development'})...\n`);

    const startTime = Date.now();

    try {
        const result = await esbuild.build(buildConfig);

        const duration = Date.now() - startTime;

        // Get output file size
        const outputFile = path.join(outDir, 'app.bundle.js');
        if (fs.existsSync(outputFile)) {
            const stats = fs.statSync(outputFile);
            const sizeKB = (stats.size / 1024).toFixed(2);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log(`\n✅ Build completed in ${duration}ms`);
            console.log(`📦 Output: ${outputFile}`);
            console.log(`📊 Size: ${sizeKB} KB (${sizeMB} MB)`);

            if (isProd) {
                console.log(`🔒 Minified: Yes`);
            }
            if (!isProd) {
                console.log(`🗺️  Sourcemap: Yes`);
            }
        }

        // Bundle analysis
        if (shouldAnalyze && result.metafile) {
            const analysisFile = path.join(outDir, 'bundle-analysis.json');
            fs.writeFileSync(analysisFile, JSON.stringify(result.metafile, null, 2));
            console.log(`\n📈 Bundle analysis saved to: ${analysisFile}`);

            // Print top modules by size
            console.log('\n📊 Top modules by size:');
            const outputs = result.metafile.outputs;
            for (const [outputPath, output] of Object.entries(outputs)) {
                if (output.inputs) {
                    const sortedInputs = Object.entries(output.inputs)
                        .sort((a, b) => b[1].bytesInOutput - a[1].bytesInOutput)
                        .slice(0, 10);

                    sortedInputs.forEach(([inputPath, info], index) => {
                        const sizeKB = (info.bytesInOutput / 1024).toFixed(2);
                        console.log(`  ${index + 1}. ${inputPath}: ${sizeKB} KB`);
                    });
                }
            }
        }

        // Copy static assets
        copyStaticAssets();

        console.log('\n✨ Build successful!\n');
        return true;

    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

function copyStaticAssets() {
    const assetsDir = path.join(__dirname, '..', 'frontend', 'static');
    const distDir = path.join(__dirname, '..', 'dist');

    // Copy CSS
    const cssSource = path.join(assetsDir, 'css');
    const cssDest = path.join(distDir, 'css');
    if (fs.existsSync(cssSource)) {
        copyDirectory(cssSource, cssDest);
        console.log(`📁 Copied CSS to ${cssDest}`);
    }

    // Copy images
    const imagesSource = path.join(assetsDir, 'images');
    const imagesDest = path.join(distDir, 'images');
    if (fs.existsSync(imagesSource)) {
        copyDirectory(imagesSource, imagesDest);
        console.log(`📁 Copied images to ${imagesDest}`);
    }

    // Copy audio
    const audioSource = path.join(assetsDir, 'audio');
    const audioDest = path.join(distDir, 'audio');
    if (fs.existsSync(audioSource)) {
        copyDirectory(audioSource, audioDest);
        console.log(`📁 Copied audio to ${audioDest}`);
    }
}

function copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Run build
build();
