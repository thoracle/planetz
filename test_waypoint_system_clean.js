/**
 * 🎯 CLEAN WAYPOINT TEST
 * Simple, working waypoint system test
 */

console.log('🎯 Starting Clean Waypoint Test...');

// Create waypoints
window.waypoints = [
    {
        name: 'Helios Solar Array',
        position: { x: -24.53, y: 1.17, z: 31.85 },
        audioFile: 'station_hail.wav',
        message: 'Alliance research facility responding. Solar energy research data transmitted.',
        triggerDistance: 50.0,
        triggered: false,
        active: true
    },
    {
        name: 'Hermes Refinery',
        position: { x: -32.31, y: 1.17, z: 28.31 },
        audioFile: 'trader_greeting.wav',
        message: 'Free Trader Consortium facility. Rare metals processing active.',
        triggerDistance: 50.0,
        triggered: false,
        active: true
    }
];

console.log('✅ Waypoints created');

// Get ship position function
function getShipPosition() {
    try {
        if (window.ship && window.ship.position) {
            return window.ship.position;
        }
        if (window.starfieldManager && window.starfieldManager.starfieldView && window.starfieldManager.starfieldView.ship) {
            return window.starfieldManager.starfieldView.ship.position;
        }
        return null;
    } catch (e) {
        console.log('Error getting ship position:', e);
        return null;
    }
}

// Manual trigger functions
window.triggerHelios = function() {
    console.log('🎯 Triggering Helios Solar Array...');
    const audio = new Audio('/static/video/station_hail.wav');
    audio.volume = 0.8;
    audio.play().then(() => {
        console.log('✅ Helios audio playing');
    }).catch(e => {
        console.log('❌ Helios audio failed:', e);
    });
    alert('☀️ Helios Solar Array Discovered!\n\n"Alliance research facility responding. Solar energy research data transmitted."');
};

window.triggerHermes = function() {
    console.log('🎯 Triggering Hermes Refinery...');
    const audio = new Audio('/static/video/trader_greeting.wav');
    audio.volume = 0.8;
    audio.play().then(() => {
        console.log('✅ Hermes audio playing');
    }).catch(e => {
        console.log('❌ Hermes audio failed:', e);
    });
    alert('🏭 Hermes Refinery Discovered!\n\n"Free Trader Consortium facility. Rare metals processing active."');
};

window.triggerTerraPrime = function() {
    console.log('🎯 Triggering Terra Prime...');
    const audio = new Audio('/static/video/discovery_chime.wav');
    audio.volume = 0.8;
    audio.play().then(() => {
        console.log('✅ Terra Prime audio playing');
    }).catch(e => {
        console.log('❌ Terra Prime audio failed:', e);
    });
    alert('🌍 Terra Prime Discovered!\n\n"Beautiful Earth-like world detected. Beginning planetary scan..."');
};

// Distance calculation
function calculateDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) + 
        Math.pow(pos1.y - pos2.y, 2) + 
        Math.pow(pos1.z - pos2.z, 2)
    );
}

// Check waypoints
function checkWaypoints() {
    const shipPos = getShipPosition();
    if (!shipPos) {
        console.log('❌ No ship position available');
        return;
    }
    
    console.log('📍 Ship position:', shipPos);
    
    window.waypoints.forEach(waypoint => {
        const distance = calculateDistance(shipPos, waypoint.position);
        console.log(`📏 Distance to ${waypoint.name}: ${distance.toFixed(2)} units`);
        
        if (distance <= waypoint.triggerDistance && !waypoint.triggered) {
            console.log(`🎯 ${waypoint.name} TRIGGERED!`);
            waypoint.triggered = true;
            
            const audio = new Audio(`/static/video/${waypoint.audioFile}`);
            audio.volume = 0.8;
            audio.play();
            
            alert(`🎯 ${waypoint.name} Discovered!\n\n"${waypoint.message}"`);
        }
    });
}

// Start monitoring
let monitorInterval = setInterval(checkWaypoints, 3000);

window.stopWaypointMonitor = function() {
    clearInterval(monitorInterval);
    console.log('🛑 Waypoint monitoring stopped');
};

console.log('🎮 WAYPOINT SYSTEM READY!');
console.log('🎯 Manual triggers:');
console.log('- triggerHelios()');
console.log('- triggerHermes()');
console.log('- triggerTerraPrime()');
console.log('- stopWaypointMonitor()');
console.log('🚀 Navigate close to stations or use manual triggers!');
