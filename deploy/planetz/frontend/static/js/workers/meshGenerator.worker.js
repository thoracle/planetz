// Message types
const MESSAGE_TYPES = {
    GENERATE_MESH: 'generateMesh',
    ERROR: 'error',
    SUCCESS: 'success',
    PROGRESS: 'progress'
};

// Helper function to convert HSL to RGB
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
}

// Function to calculate LOD level based on distance
function calculateLODLevel(distance) {
    // More granular LOD levels with smooth transitions
    if (distance < 10) return 1;      // Full detail (1:1)
    if (distance < 20) return 1.5;    // Slight reduction (2:3)
    if (distance < 30) return 2;      // Half detail (1:2)
    if (distance < 50) return 3;      // Quarter detail (1:4)
    if (distance < 80) return 4;      // Eighth detail (1:8)
    return 6;                         // Minimum detail (1:16)
}

// Function to check if a chunk might contain surface
function chunkMightContainSurface(startX, endX, startY, endY, startZ, endZ, densityField, size) {
    let hasPositive = false;
    let hasNegative = false;
    
    // Sample corners and center of chunk
    const points = [
        [startX, startY, startZ],
        [endX-1, startY, startZ],
        [startX, endY-1, startZ],
        [endX-1, endY-1, startZ],
        [startX, startY, endZ-1],
        [endX-1, startY, endZ-1],
        [startX, endY-1, endZ-1],
        [endX-1, endY-1, endZ-1],
        [(startX + endX) >> 1, (startY + endY) >> 1, (startZ + endZ) >> 1]
    ];
    
    for (const [x, y, z] of points) {
        if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) continue;
        const index = x * size * size + y * size + z;
        if (index >= densityField.length) continue;
        
        const density = densityField[index];
        if (density > 0.05) hasPositive = true;
        if (density < -0.05) hasNegative = true;
        
        if (hasPositive && hasNegative) return true;
    }
    
    return false;
}

// Helper class for vertex attributes
class VertexData {
    constructor(position, normal, color) {
        this.position = position;
        this.normal = normal;
        this.color = color;
        this.quadric = new Float32Array(10); // 4x4 symmetric matrix stored as 10 unique elements
        this.references = 1;
    }

    clone() {
        return new VertexData(
            [...this.position],
            [...this.normal],
            [...this.color]
        );
    }
}

// Calculate error quadric for a vertex and its normal
function calculateQuadric(position, normal) {
    const [x, y, z] = position;
    const [nx, ny, nz] = normal;
    const d = -(nx * x + ny * y + nz * z);
    
    // Calculate quadric matrix elements (4x4 symmetric matrix stored as 10 unique elements)
    const quadric = new Float32Array(10);
    quadric[0] = nx * nx;  // a11
    quadric[1] = nx * ny;  // a12
    quadric[2] = nx * nz;  // a13
    quadric[3] = nx * d;   // a14
    quadric[4] = ny * ny;  // a22
    quadric[5] = ny * nz;  // a23
    quadric[6] = ny * d;   // a24
    quadric[7] = nz * nz;  // a33
    quadric[8] = nz * d;   // a34
    quadric[9] = d * d;    // a44
    
    return quadric;
}

// Calculate error for a potential vertex position using quadric
function calculateQuadricError(position, quadric) {
    const [x, y, z] = position;
    let error = 0;
    
    error += quadric[0] * x * x; // a11 * x^2
    error += 2 * quadric[1] * x * y; // 2 * a12 * xy
    error += 2 * quadric[2] * x * z; // 2 * a13 * xz
    error += 2 * quadric[3] * x; // 2 * a14 * x
    error += quadric[4] * y * y; // a22 * y^2
    error += 2 * quadric[5] * y * z; // 2 * a23 * yz
    error += 2 * quadric[6] * y; // 2 * a24 * y
    error += quadric[7] * z * z; // a33 * z^2
    error += 2 * quadric[8] * z; // 2 * a34 * z
    error += quadric[9]; // a44
    
    return error;
}

// Enhanced mesh simplification function
function simplifyMesh(vertices, normals, colors, targetRatio = 0.5) {
    // Convert input arrays to vertex data objects
    const vertexDataArray = [];
    for (let i = 0; i < vertices.length; i += 3) {
        const vertexData = new VertexData(
            [vertices[i], vertices[i + 1], vertices[i + 2]],
            [normals[i], normals[i + 1], normals[i + 2]],
            [colors[i], colors[i + 1], colors[i + 2]]
        );
        
        // Calculate initial quadric for vertex
        vertexData.quadric = calculateQuadric(vertexData.position, vertexData.normal);
        vertexDataArray.push(vertexData);
    }

    const targetVertexCount = Math.max(100, Math.floor(vertexDataArray.length * targetRatio));
    
    // Build vertex pairs and calculate their costs
    const pairs = new Map();
    for (let i = 0; i < vertexDataArray.length; i++) {
        const v1 = vertexDataArray[i];
        
        // Find potential pairs within a reasonable distance
        for (let j = i + 1; j < vertexDataArray.length; j++) {
            const v2 = vertexDataArray[j];
            
            // Calculate distance between vertices
            const dx = v1.position[0] - v2.position[0];
            const dy = v1.position[1] - v2.position[1];
            const dz = v1.position[2] - v2.position[2];
            const distSq = dx * dx + dy * dy + dz * dz;
            
            // Only consider pairs within reasonable distance
            if (distSq > 4) continue;
            
            // Calculate optimal position for merged vertex
            const newPos = [
                (v1.position[0] + v2.position[0]) / 2,
                (v1.position[1] + v2.position[1]) / 2,
                (v1.position[2] + v2.position[2]) / 2
            ];
            
            // Sum quadrics
            const combinedQuadric = new Float32Array(10);
            for (let k = 0; k < 10; k++) {
                combinedQuadric[k] = v1.quadric[k] + v2.quadric[k];
            }
            
            // Calculate error for merged vertex
            const error = calculateQuadricError(newPos, combinedQuadric);
            
            // Add pair to consideration if error is acceptable
            const key = `${i},${j}`;
            pairs.set(key, { v1: i, v2: j, error, position: newPos });
        }
    }

    // Sort pairs by error
    const sortedPairs = Array.from(pairs.values()).sort((a, b) => a.error - b.error);
    
    // Merge vertices until target count is reached
    const merged = new Set();
    while (vertexDataArray.length - merged.size > targetVertexCount && sortedPairs.length > 0) {
        const pair = sortedPairs.shift();
        if (merged.has(pair.v1) || merged.has(pair.v2)) continue;
        
        // Merge vertices
        const v1 = vertexDataArray[pair.v1];
        const v2 = vertexDataArray[pair.v2];
        
        // Calculate interpolated attributes
        const t = 0.5; // Could be weighted based on quadric errors
        const newNormal = [
            v1.normal[0] * (1 - t) + v2.normal[0] * t,
            v1.normal[1] * (1 - t) + v2.normal[1] * t,
            v1.normal[2] * (1 - t) + v2.normal[2] * t
        ];
        const len = Math.sqrt(newNormal[0] * newNormal[0] + newNormal[1] * newNormal[1] + newNormal[2] * newNormal[2]);
        newNormal[0] /= len;
        newNormal[1] /= len;
        newNormal[2] /= len;
        
        const newColor = [
            v1.color[0] * (1 - t) + v2.color[0] * t,
            v1.color[1] * (1 - t) + v2.color[1] * t,
            v1.color[2] * (1 - t) + v2.color[2] * t
        ];
        
        // Update v1 with merged data
        v1.position = pair.position;
        v1.normal = newNormal;
        v1.color = newColor;
        v1.references += v2.references;
        
        // Mark v2 as merged
        merged.add(pair.v2);
    }

    // Build final arrays
    const newVertices = [];
    const newNormals = [];
    const newColors = [];
    
    vertexDataArray.forEach((vertex, index) => {
        if (!merged.has(index)) {
            newVertices.push(...vertex.position);
            newNormals.push(...vertex.normal);
            newColors.push(...vertex.color);
        }
    });

    return {
        vertices: newVertices,
        normals: newNormals,
        colors: newColors,
        vertexCount: newVertices.length / 3
    };
}

// Calculate terrain complexity for a region
function calculateTerrainComplexity(startX, endX, startY, endY, startZ, endZ, densityField, size) {
    try {
        let variationSum = 0;
        let sampleCount = 0;
        const step = Math.max(1, Math.floor((endX - startX) / 8)); // Sample at most 8x8x8 points

        for (let x = startX; x < endX; x += step) {
            for (let y = startY; y < endY; y += step) {
                for (let z = startZ; z < endZ; z += step) {
                    if (x >= size || y >= size || z >= size) continue;
                    
                    const index = x * size * size + y * size + z;
                    if (index >= densityField.length) continue;
                    
                    const density = densityField[index];
                    if (typeof density !== 'number') continue;
                    
                    // Check neighbors for density variation
                    const neighbors = [
                        [x+step, y, z], [x-step, y, z],
                        [x, y+step, z], [x, y-step, z],
                        [x, y, z+step], [x, y, z-step]
                    ];

                    for (const [nx, ny, nz] of neighbors) {
                        if (nx < 0 || nx >= size || ny < 0 || ny >= size || nz < 0 || nz >= size) continue;
                        const nIndex = nx * size * size + ny * size + nz;
                        if (nIndex >= densityField.length) continue;
                        
                        const neighborDensity = densityField[nIndex];
                        if (typeof neighborDensity !== 'number') continue;
                        
                        variationSum += Math.abs(density - neighborDensity);
                        sampleCount++;
                    }
                }
            }
        }

        return sampleCount > 0 ? Math.min(1, variationSum / sampleCount) : 0;
    } catch (error) {
        console.error('Error in calculateTerrainComplexity:', error);
        return 0; // Return safe default
    }
}

// Enhanced LOD calculation
function calculateAdaptiveLODLevel(distance, viewAngle, complexity) {
    try {
        // Validate inputs
        distance = Math.max(0, Number(distance) || 0);
        viewAngle = Math.max(-1, Math.min(1, Number(viewAngle) || 1));
        complexity = Math.max(0, Math.min(1, Number(complexity) || 0));

        // Base LOD level from distance
        let lodLevel;
        if (distance < 10) {
            lodLevel = 1;      // Full detail
        } else if (distance < 20) {
            lodLevel = 1.5;    // Slight reduction
        } else if (distance < 30) {
            lodLevel = 2;      // Half detail
        } else if (distance < 50) {
            lodLevel = 3;      // Quarter detail
        } else if (distance < 80) {
            lodLevel = 4;      // Eighth detail
        } else {
            lodLevel = 6;      // Minimum detail
        }

        // Adjust based on view angle with safety checks
        const angleMultiplier = 1 + (1 - Math.abs(viewAngle)) * 0.5;
        lodLevel *= angleMultiplier;

        // Adjust based on terrain complexity
        const complexityFactor = Math.max(0.5, Math.min(1.5, 1 - complexity * 2));
        lodLevel *= complexityFactor;

        // Ensure LOD level stays within reasonable bounds
        return Math.max(1, Math.min(8, lodLevel));
    } catch (error) {
        console.error('Error in calculateAdaptiveLODLevel:', error);
        return 1; // Return safest LOD level
    }
}

// Process the density field in smaller chunks
async function processChunk(startX, endX, startY, endY, startZ, endZ, densityField, size, verticesData, normalsData, colorsData, lodLevel) {
    try {
        let hasSurface = false;
        const step = Math.max(1, Math.floor(lodLevel));
        const shouldAddDetail = lodLevel > 1 && lodLevel < 2;

        // Use TypedArrays for better memory efficiency
        const chunkSize = endX - startX;
        const maxVertices = Math.ceil((chunkSize / step) ** 3 * 1.5);
        
        // Pre-allocate arrays with estimated size
        const tempVertices = new Float32Array(maxVertices * 3);
        const tempNormals = new Float32Array(maxVertices * 3);
        const tempColors = new Float32Array(maxVertices * 3);
        let vertexCount = 0;

        // Define neighbors lookup array once
        const neighbors = [
            [-1, 0, 0], [1, 0, 0],
            [0, -1, 0], [0, 1, 0],
            [0, 0, -1], [0, 0, 1]
        ];

        // Quick surface check before detailed processing
        let hasSignChange = false;
        for (let x = startX; x < endX; x += step * 2) {
            for (let y = startY; y < endY; y += step * 2) {
                for (let z = startZ; z < endZ; z += step * 2) {
                    if (x >= size || y >= size || z >= size) continue;
                    const index = x * size * size + y * size + z;
                    const density = densityField[index];
                    
                    for (const [nx, ny, nz] of neighbors) {
                        const checkX = x + nx * step;
                        const checkY = y + ny * step;
                        const checkZ = z + nz * step;
                        
                        if (checkX < 0 || checkX >= size || 
                            checkY < 0 || checkY >= size || 
                            checkZ < 0 || checkZ >= size) continue;
                            
                        const nIndex = checkX * size * size + checkY * size + checkZ;
                        const neighborDensity = densityField[nIndex];
                        
                        if (Math.sign(density) !== Math.sign(neighborDensity)) {
                            hasSignChange = true;
                            break;
                        }
                    }
                    if (hasSignChange) break;
                }
                if (hasSignChange) break;
            }
            if (hasSignChange) break;
        }

        // Skip detailed processing if no surface found
        if (!hasSignChange) {
            return 0;
        }

        // Process the chunk in detail
        for (let x = startX; x < endX; x += step) {
            for (let y = startY; y < endY; y += step) {
                for (let z = startZ; z < endZ; z += step) {
                    const index = x * size * size + y * size + z;
                    const density = densityField[index];
                    
                    if (Math.abs(density) > 1.0) continue;
                    
                    let isSurface = false;
                    for (const [nx, ny, nz] of neighbors) {
                        const checkX = x + nx;
                        const checkY = y + ny;
                        const checkZ = z + nz;
                        
                        if (checkX < 0 || checkX >= size || 
                            checkY < 0 || checkY >= size || 
                            checkZ < 0 || checkZ >= size) continue;
                            
                        const nIndex = checkX * size * size + checkY * size + checkZ;
                        const neighborDensity = densityField[nIndex];
                        
                        if (Math.sign(neighborDensity) !== Math.sign(density)) {
                            isSurface = true;
                            hasSurface = true;
                            break;
                        }
                    }
                    
                    if (!isSurface) continue;

                    // Add vertex data
                    if (vertexCount >= maxVertices) {
                        verticesData.push(...tempVertices.slice(0, vertexCount * 3));
                        normalsData.push(...tempNormals.slice(0, vertexCount * 3));
                        colorsData.push(...tempColors.slice(0, vertexCount * 3));
                        vertexCount = 0;
                    }

                    const vIndex = vertexCount * 3;
                    tempVertices[vIndex] = x;
                    tempVertices[vIndex + 1] = y;
                    tempVertices[vIndex + 2] = z;

                    // Calculate normal
                    const dx = x + 1 < size ? densityField[(x+1) * size * size + y * size + z] - 
                              (x - 1 >= 0 ? densityField[(x-1) * size * size + y * size + z] : density) : 0;
                    const dy = y + 1 < size ? densityField[x * size * size + (y+1) * size + z] -
                              (y - 1 >= 0 ? densityField[x * size * size + (y-1) * size + z] : density) : 0;
                    const dz = z + 1 < size ? densityField[x * size * size + y * size + (z+1)] -
                              (z - 1 >= 0 ? densityField[x * size * size + y * size + (z-1)] : density) : 0;

                    const length = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    tempNormals[vIndex] = length > 0 ? -dx/length : 0;
                    tempNormals[vIndex + 1] = length > 0 ? -dy/length : 1;
                    tempNormals[vIndex + 2] = length > 0 ? -dz/length : 0;

                    // Calculate color
                    const height = y / size;
                    const [r, g, b] = hslToRgb(0.6 - height * 0.3, 0.8, 0.5);
                    tempColors[vIndex] = r;
                    tempColors[vIndex + 1] = g;
                    tempColors[vIndex + 2] = b;

                    vertexCount++;
                }
            }

            // Yield periodically to prevent blocking
            if (x % (step * 2) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Copy remaining data
        if (vertexCount > 0) {
            verticesData.push(...tempVertices.slice(0, vertexCount * 3));
            normalsData.push(...tempNormals.slice(0, vertexCount * 3));
            colorsData.push(...tempColors.slice(0, vertexCount * 3));
        }

        return vertexCount;
    } catch (error) {
        console.error('Error in processChunk:', error);
        throw error;
    }
}

// Handle incoming messages
self.onmessage = async function(e) {
    try {
        const { type, data } = e.data;

        if (type !== MESSAGE_TYPES.GENERATE_MESH) {
            throw new Error(`Unknown message type: ${type}`);
        }

        if (!data) {
            throw new Error('Worker received message with no data field.');
        }

        const { densityField, size, distance, viewAngle = 1 } = data;
        
        // Validate input parameters
        if (!densityField || !densityField.length) {
            throw new Error('Invalid or empty density field');
        }
        if (typeof size !== 'number' || size <= 0) {
            throw new Error(`Invalid size parameter: ${size}`);
        }
        if (densityField.length !== size * size * size) {
            throw new Error(`Density field length (${densityField.length}) does not match size^3 (${size * size * size})`);
        }

        // Calculate terrain complexity with error handling
        let complexity;
        try {
            complexity = calculateTerrainComplexity(0, size, 0, size, 0, size, densityField, size);
        } catch (error) {
            console.warn('Failed to calculate terrain complexity:', error);
            complexity = 0.5; // Use default value
        }
        
        // Calculate adaptive LOD level with error handling
        let lodLevel;
        try {
            lodLevel = calculateAdaptiveLODLevel(distance || 0, viewAngle, complexity);
        } catch (error) {
            console.warn('Failed to calculate LOD level:', error);
            lodLevel = 1; // Use default value
        }

        // Generate vertices, normals, and colors
        const verticesData = [];
        const normalsData = [];
        const colorsData = [];

        // Process the density field in smaller chunks with progress tracking
        const chunkSize = 8; // Process 8x8x8 chunks at a time
        const numChunks = Math.ceil(size / chunkSize);
        let processedChunks = 0;
        let totalVertices = 0;
        const totalChunks = numChunks * numChunks * numChunks;

        // Regular progress updates
        const progressInterval = setInterval(() => {
            self.postMessage({
                type: MESSAGE_TYPES.PROGRESS,
                data: {
                    progress: processedChunks / totalChunks,
                    verticesFound: totalVertices
                }
            });
        }, 100);

        try {
            for (let cx = 0; cx < numChunks; cx++) {
                const startX = cx * chunkSize;
                const endX = Math.min(startX + chunkSize, size);
                
                for (let cy = 0; cy < numChunks; cy++) {
                    const startY = cy * chunkSize;
                    const endY = Math.min(startY + chunkSize, size);
                    
                    for (let cz = 0; cz < numChunks; cz++) {
                        const startZ = cz * chunkSize;
                        const endZ = Math.min(startZ + chunkSize, size);
                        
                        let verticesAdded = 0;
                        try {
                            verticesAdded = await processChunk(
                                startX, endX,
                                startY, endY,
                                startZ, endZ,
                                densityField, size,
                                verticesData, normalsData, colorsData,
                                lodLevel
                            );
                        } catch (error) {
                            console.warn(`Failed to process chunk (${cx},${cy},${cz}):`, error);
                            // Continue with next chunk
                        }
                        
                        totalVertices += verticesAdded;
                        processedChunks++;

                        // Yield to prevent blocking
                        if (processedChunks % 4 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                }
            }
        } finally {
            clearInterval(progressInterval);
        }

        // Handle case where no vertices were generated
        if (totalVertices === 0) {
            self.postMessage({
                type: MESSAGE_TYPES.SUCCESS,
                data: {
                    vertices: new Float32Array(0),
                    normals: new Float32Array(0),
                    colors: new Float32Array(0),
                    vertexCount: 0,
                    lodLevel: lodLevel
                }
            });
            return;
        }

        // Update simplification ratio based on adaptive LOD
        let finalMesh;
        try {
            if (totalVertices > 1000) {
                const baseRatio = Math.max(0.2, Math.min(0.8, 10 / (distance || 1)));
                const adaptiveRatio = baseRatio * (1 / lodLevel) * (1 + complexity);
                const finalRatio = Math.max(0.1, Math.min(0.9, adaptiveRatio));
                finalMesh = simplifyMesh(verticesData, normalsData, colorsData, finalRatio);
            } else {
                finalMesh = {
                    vertices: verticesData,
                    normals: normalsData,
                    colors: colorsData,
                    vertexCount: totalVertices
                };
            }
        } catch (error) {
            console.warn('Failed to simplify mesh:', error);
            // Fall back to unsimplified mesh
            finalMesh = {
                vertices: verticesData,
                normals: normalsData,
                colors: colorsData,
                vertexCount: totalVertices
            };
        }

        // Validate final mesh data
        if (!finalMesh.vertices || !finalMesh.normals || !finalMesh.colors) {
            throw new Error('Invalid mesh data after processing');
        }

        if (finalMesh.vertices.length % 3 !== 0) {
            throw new Error('Vertex data length is not a multiple of 3');
        }

        if (finalMesh.vertices.length !== finalMesh.normals.length || 
            finalMesh.vertices.length !== finalMesh.colors.length) {
            throw new Error('Mismatched lengths in mesh attributes');
        }

        // Convert to Float32Array before posting
        try {
            const vertices = new Float32Array(finalMesh.vertices);
            const normals = new Float32Array(finalMesh.normals);
            const colors = new Float32Array(finalMesh.colors);

            self.postMessage({
                type: MESSAGE_TYPES.SUCCESS,
                data: {
                    vertices: vertices,
                    normals: normals,
                    colors: colors,
                    vertexCount: finalMesh.vertexCount,
                    lodLevel: lodLevel
                }
            }, [vertices.buffer, normals.buffer, colors.buffer]);
        } catch (error) {
            throw new Error(`Failed to create final mesh buffers: ${error.message}`);
        }

    } catch (error) {
        console.error('[Worker] Error during mesh generation:', error);
        self.postMessage({
            type: MESSAGE_TYPES.ERROR,
            errorMessage: error.message || String(error)
        });
    }
}; 