// Planet generation Web Worker

// Import required modules
importScripts('./perlin.js');

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'generateTerrain':
            const { vertices, params } = data;
            const result = generateTerrainData(vertices, params);
            self.postMessage({ type: 'terrainGenerated', data: result });
            break;
            
        case 'generateNoise':
            const { x, y, z, noiseParams } = data;
            const noiseValue = generateNoiseValue(x, y, z, noiseParams);
            self.postMessage({ type: 'noiseGenerated', data: noiseValue });
            break;
    }
};

function generateTerrainData(vertices, params) {
    const { terrainHeight, noiseScale, octaves, persistence, lacunarity } = params;
    const newPositions = new Float32Array(vertices.length);
    const colorData = new Float32Array(vertices.length);
    
    // First pass: Calculate base positions and store original normals
    const originalNormals = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        
        // Store normalized vector as original normal
        const length = Math.sqrt(x * x + y * y + z * z);
        originalNormals[i] = x / length;
        originalNormals[i + 1] = y / length;
        originalNormals[i + 2] = z / length;
    }
    
    // Second pass: Apply terrain deformation along original normals
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        
        // Use original normal for consistent displacement direction
        const nx = originalNormals[i];
        const ny = originalNormals[i + 1];
        const nz = originalNormals[i + 2];
        
        // Generate smoother noise value
        let noiseValue = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let j = 0; j < octaves; j++) {
            const sampleX = x * noiseScale * frequency;
            const sampleY = y * noiseScale * frequency;
            const sampleZ = z * noiseScale * frequency;
            
            noiseValue += amplitude * noise.perlin3(sampleX, sampleY, sampleZ);
            maxValue += amplitude;
            
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        // Normalize noise value
        noiseValue = (noiseValue / maxValue + 1) / 2;
        
        // Apply smoother height variation
        const height = 1 + (noiseValue * 0.8 + 0.2) * terrainHeight;
        
        // Displace along original normal
        newPositions[i] = x * height;
        newPositions[i + 1] = y * height;
        newPositions[i + 2] = z * height;
        
        // Calculate color based on height and slope
        const heightFactor = (height - 1) / terrainHeight;
        
        // Calculate slope factor
        const normalizedX = x / Math.sqrt(x * x + y * y + z * z);
        const normalizedY = y / Math.sqrt(x * x + y * y + z * z);
        const normalizedZ = z / Math.sqrt(x * x + y * y + z * z);
        const slopeFactor = Math.abs(normalizedY); // Use Y component for slope
        
        // Base colors for different height ranges
        let r, g, b;
        if (heightFactor < 0.3) {
            // Low terrain (darker, more blue)
            r = 0.2 + heightFactor * 0.3;
            g = 0.3 + heightFactor * 0.3;
            b = 0.6 + heightFactor * 0.2;
        } else if (heightFactor > 0.7) {
            // High terrain (whiter)
            const whiteness = (heightFactor - 0.7) / 0.3;
            r = 0.5 + whiteness * 0.5;
            g = 0.6 + whiteness * 0.4;
            b = 0.7 + whiteness * 0.3;
        } else {
            // Mid terrain (green-blue)
            r = 0.3 + heightFactor * 0.2;
            g = 0.5 + heightFactor * 0.2;
            b = 0.4 + heightFactor * 0.3;
        }
        
        // Adjust colors based on slope
        const slopeInfluence = 0.3;
        r = r * (1 - slopeInfluence) + r * slopeFactor * slopeInfluence;
        g = g * (1 - slopeInfluence) + g * slopeFactor * slopeInfluence;
        b = b * (1 - slopeInfluence) + b * slopeFactor * slopeInfluence;
        
        // Store colors
        colorData[i] = r;
        colorData[i + 1] = g;
        colorData[i + 2] = b;
    }
    
    return {
        positions: newPositions,
        colors: colorData
    };
}

function generateNoiseValue(x, y, z, params) {
    const { noiseScale, octaves, persistence, lacunarity } = params;
    
    // Scale coordinates
    const nx = x * noiseScale;
    const ny = y * noiseScale;
    const nz = z * noiseScale;
    
    // Generate noise value
    let noiseValue = 0;
    let amplitude = 1;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
        const sampleX = nx * frequency;
        const sampleY = ny * frequency;
        const sampleZ = nz * frequency;
        
        noiseValue += amplitude * noise.perlin3(sampleX, sampleY, sampleZ);
        
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    
    return (noiseValue + 1) / 2;
} 