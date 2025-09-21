// Test script to create a visible test circle in Star Charts
// Run this in the browser console

console.log('🧪 Testing SVG Visibility...');

// Find the Star Charts SVG
const svg = document.querySelector('#starchart-svg');
if (!svg) {
    console.log('❌ Star Charts SVG not found. Open Star Charts first (press G)');
    return;
}

console.log('✅ Found Star Charts SVG');

// Create a test circle that should be VERY visible
const testCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
testCircle.setAttribute('cx', '100');
testCircle.setAttribute('cy', '100');
testCircle.setAttribute('r', '50');
testCircle.setAttribute('fill', 'rgba(255, 0, 0, 0.9)');
testCircle.setAttribute('stroke', 'yellow');
testCircle.setAttribute('stroke-width', '10');
testCircle.setAttribute('stroke-dasharray', '15,5');
testCircle.style.zIndex = '99999';
testCircle.style.opacity = '1';
testCircle.style.visibility = 'visible';
testCircle.setAttribute('class', 'test-circle');

// Add it to the SVG
svg.appendChild(testCircle);

console.log('✅ Added test circle to Star Charts');
console.log('🎯 You should see a LARGE red circle with yellow dashed border at position (100, 100)');
console.log('💡 If you see this circle, the SVG is working and hit boxes should be visible too');

// Remove the test circle after 5 seconds
setTimeout(() => {
    if (testCircle.parentNode) {
        testCircle.parentNode.removeChild(testCircle);
        console.log('🧹 Test circle removed');
    }
}, 5000);
