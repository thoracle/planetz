// Debug script to inspect hit box elements in the DOM
// Run this in the browser console

console.log('🔍 DEBUG: Inspecting Hit Box Elements...');

// Check if debug mode is enabled
const debugMode = localStorage.getItem('star_charts_debug_hitboxes') === 'true';
console.log(`Debug mode enabled: ${debugMode}`);

if (!debugMode) {
    console.log('❌ Debug mode is disabled. Run enableHitBoxDebug() first.');
    return;
}

// Find all hit box elements
const hitBoxes = document.querySelectorAll('.starchart-hitbox');
console.log(`Found ${hitBoxes.length} hit box elements in DOM`);

if (hitBoxes.length === 0) {
    console.log('❌ No hit box elements found. Star Charts might not be rendered yet.');
    console.log('💡 Try opening Star Charts (press G) and then run this script again.');
    return;
}

// Inspect the first few hit boxes
console.log('\n🔍 Inspecting first 3 hit boxes:');
for (let i = 0; i < Math.min(3, hitBoxes.length); i++) {
    const hitBox = hitBoxes[i];
    console.log(`\nHit Box ${i + 1}:`);
    console.log(`  Tag: ${hitBox.tagName}`);
    console.log(`  Fill: ${hitBox.getAttribute('fill')}`);
    console.log(`  Stroke: ${hitBox.getAttribute('stroke')}`);
    console.log(`  Stroke Width: ${hitBox.getAttribute('stroke-width')}`);
    console.log(`  Stroke Dasharray: ${hitBox.getAttribute('stroke-dasharray')}`);
    console.log(`  CX: ${hitBox.getAttribute('cx')}`);
    console.log(`  CY: ${hitBox.getAttribute('cy')}`);
    console.log(`  R: ${hitBox.getAttribute('r')}`);
    console.log(`  Z-Index: ${hitBox.style.zIndex}`);
    console.log(`  Opacity: ${hitBox.style.opacity}`);
    console.log(`  Visibility: ${hitBox.style.visibility}`);
    console.log(`  Computed Style:`, window.getComputedStyle(hitBox));
}

// Check if hit boxes are visible
console.log('\n🎯 Visibility Check:');
const visibleHitBoxes = Array.from(hitBoxes).filter(hb => {
    const fill = hb.getAttribute('fill');
    return fill && fill.includes('255, 0, 0');
});

console.log(`Visible hit boxes: ${visibleHitBoxes.length}/${hitBoxes.length}`);

if (visibleHitBoxes.length > 0) {
    console.log('✅ Hit boxes have red fill - they should be visible!');
    console.log('💡 If you still don\'t see them, try:');
    console.log('  1. Zoom in/out on Star Charts');
    console.log('  2. Check if they\'re behind other elements');
    console.log('  3. Look for very small red circles');
} else {
    console.log('❌ No hit boxes have red fill - debug mode not working properly');
}

// Check SVG viewport
const svg = document.querySelector('#starchart-svg');
if (svg) {
    console.log('\n📐 SVG Viewport:');
    console.log(`  Width: ${svg.getAttribute('width')}`);
    console.log(`  Height: ${svg.getAttribute('height')}`);
    console.log(`  ViewBox: ${svg.getAttribute('viewBox')}`);
} else {
    console.log('❌ SVG element not found');
}
