// Debug script to manually test coordinate calculations
// Run this in browser console to verify calculations

console.log('🔧 Coordinate Debug Test');

// Test the Helios Solar Array coordinates from debug logs
const heliosPos = [-299.38288125302387, -0.7697263269411749, 19.232535262877057];
const gridSize = 50;

console.log('Helios Solar Array:');
console.log(`Position: [${heliosPos.map(p => p.toFixed(2)).join(', ')}]`);
console.log(`Grid Size: ${gridSize}`);

// Manual grid key calculation
const hx = Math.floor(heliosPos[0] / gridSize);
const hy = Math.floor(heliosPos[1] / gridSize);
const hz = Math.floor(heliosPos[2] / gridSize);
const hGridKey = `${hx},${hy},${hz}`;

console.log(`Expected Grid Key: ${hGridKey}`);
console.log(`Grid Coordinates: (${hx}, ${hy}, ${hz})`);

// Check what grid cell range this corresponds to
const hMinX = hx * gridSize;
const hMaxX = (hx + 1) * gridSize;
const hMinY = hy * gridSize;
const hMaxY = (hy + 1) * gridSize;
const hMinZ = hz * gridSize;
const hMaxZ = (hz + 1) * gridSize;

console.log(`Grid Cell Range: X[${hMinX} to ${hMaxX}], Y[${hMinY} to ${hMaxY}], Z[${hMinZ} to ${hMaxZ}]`);

// Test Hermes Refinery
const hermesPos = [205.61005424660075, 6.894818065088227, 218.45939117536213];

console.log('\nHermes Refinery:');
console.log(`Position: [${hermesPos.map(p => p.toFixed(2)).join(', ')}]`);

// Manual grid key calculation
const mx = Math.floor(hermesPos[0] / gridSize);
const my = Math.floor(hermesPos[1] / gridSize);
const mz = Math.floor(hermesPos[2] / gridSize);
const mGridKey = `${mx},${my},${mz}`;

console.log(`Expected Grid Key: ${mGridKey}`);
console.log(`Grid Coordinates: (${mx}, ${my}, ${mz})`);

// Test A0_star
const starPos = [0, 0, 0];

console.log('\nA0 Star:');
console.log(`Position: [${starPos.join(', ')}]`);

// Manual grid key calculation
const sx = Math.floor(starPos[0] / gridSize);
const sy = Math.floor(starPos[1] / gridSize);
const sz = Math.floor(starPos[2] / gridSize);
const sGridKey = `${sx},${sy},${sz}`;

console.log(`Expected Grid Key: ${sGridKey}`);
console.log(`Grid Coordinates: (${sx}, ${sy}, ${sz})`);

console.log('\n🔧 Coordinate debug complete!');
