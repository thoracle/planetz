console.log('🧪 Testing moon positioning fix...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== MOON POSITIONING FIX TEST ===');
    
    // Check if required managers exist
    const sm = window.starfieldManager;
    const solarSystemManager = sm?.solarSystemManager;
    
    if (!sm || !solarSystemManager) {
        console.error('❌ Required managers not found');
        console.log('StarfieldManager:', !!sm);
        console.log('SolarSystemManager:', !!solarSystemManager);
        return;
    }
    
    console.log('✅ All managers found');
    
    // Test the new moon positioning
    console.log('\n📋 MOON POSITIONING ANALYSIS:');
    
    const celestialBodies = solarSystemManager.getCelestialBodies();
    const planets = new Map();
    const moons = new Map();
    
    // Collect planets and moons
    celestialBodies.forEach((body, bodyId) => {
        if (bodyId.startsWith('planet_')) {
            planets.set(bodyId, body);
        } else if (bodyId.startsWith('moon_')) {
            moons.set(bodyId, body);
        }
    });
    
    console.log(`📊 Found ${planets.size} planets and ${moons.size} moons`);
    
    // Analyze each planet-moon system
    planets.forEach((planet, planetId) => {
        const planetIndex = planetId.split('_')[1];
        const planetInfo = solarSystemManager.getCelestialBodyInfo(planet);
        const planetName = planetInfo?.name || planetId;
        
        console.log(`\n🪐 ANALYZING ${planetName.toUpperCase()}:`);
        console.log(`   Position: (${planet.position.x.toFixed(1)}, ${planet.position.y.toFixed(1)}, ${planet.position.z.toFixed(1)})`);
        console.log(`   Planet docking range: 4.0km`);
        console.log(`   Planet launch positioning: ~8.0km from surface`);
        
        // Find moons for this planet
        const planetMoons = [];
        moons.forEach((moon, moonId) => {
            const [_, moonPlanetIndex, moonIndex] = moonId.split('_');
            if (moonPlanetIndex === planetIndex) {
                planetMoons.push({ moon, moonId, moonIndex });
            }
        });
        
        if (planetMoons.length === 0) {
            console.log(`   No moons found for ${planetName}`);
            return;
        }
        
        planetMoons.forEach(({ moon, moonId, moonIndex }) => {
            const moonInfo = solarSystemManager.getCelestialBodyInfo(moon);
            const moonName = moonInfo?.name || moonId;
            
            // Calculate distance from planet
            const distanceFromPlanet = planet.position.distanceTo(moon.position);
            
            console.log(`\n  🌙 ${moonName}:`);
            console.log(`     Distance from ${planetName}: ${distanceFromPlanet.toFixed(1)}km`);
            console.log(`     Moon docking range: 1.5km`);
            
            // Check if moon is safely positioned
            const safeMinDistance = 8.0 + 1.5 + 2.0; // planet launch + moon docking + safety margin
            const isSafe = distanceFromPlanet >= safeMinDistance;
            
            if (isSafe) {
                console.log(`     ✅ SAFE: Moon is ${(distanceFromPlanet - safeMinDistance).toFixed(1)}km beyond minimum safe distance`);
            } else {
                console.log(`     ⚠️  RISKY: Moon is ${(safeMinDistance - distanceFromPlanet).toFixed(1)}km too close`);
                console.log(`        Minimum safe distance: ${safeMinDistance.toFixed(1)}km`);
            }
        });
    });
    
    // Test launch positioning
    console.log('\n🚀 LAUNCH POSITIONING TEST:');
    console.log('- When you dock with a planet, you orbit at 4.0km');
    console.log('- When you launch, you should be positioned at ~8-12km from planet surface');
    console.log('- Moons should now be at minimum 8.0km+ from planets');
    console.log('- This should prevent docking modal conflicts when launching');
    
    // Player position analysis
    const playerPos = sm.camera.position;
    console.log(`\n📍 CURRENT PLAYER POSITION: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})`);
    
    // Check nearby objects
    let nearbyTargets = [];
    celestialBodies.forEach((body, bodyId) => {
        if (bodyId.startsWith('planet_') || bodyId.startsWith('moon_')) {
            const distance = sm.calculateDistance(playerPos, body.position);
            const bodyInfo = solarSystemManager.getCelestialBodyInfo(body);
            const bodyName = bodyInfo?.name || bodyId;
            const bodyType = bodyId.startsWith('planet_') ? 'planet' : 'moon';
            const dockingRange = bodyType === 'planet' ? 4.0 : 1.5;
            
            if (distance <= dockingRange * 3) { // Show objects within 3x docking range
                nearbyTargets.push({
                    name: bodyName,
                    type: bodyType,
                    distance: distance,
                    dockingRange: dockingRange,
                    inRange: distance <= dockingRange
                });
            }
        }
    });
    
    if (nearbyTargets.length > 0) {
        console.log('\n🎯 NEARBY CELESTIAL BODIES:');
        nearbyTargets.sort((a, b) => a.distance - b.distance);
        
        nearbyTargets.forEach(target => {
            const status = target.inRange ? '🔴 IN DOCKING RANGE' : '🟢 OUT OF RANGE';
            console.log(`   ${target.type === 'planet' ? '🪐' : '🌙'} ${target.name}: ${target.distance.toFixed(1)}km ${status}`);
            console.log(`      Docking range: ${target.dockingRange}km`);
        });
    } else {
        console.log('\n🎯 No nearby celestial bodies detected');
    }
    
    console.log('\n✅ Moon positioning analysis complete!');
    console.log('Expected result: Moons should now be far enough from planets to avoid');
    console.log('docking modal conflicts when launching from planetary surfaces.');
    
}, 3000); // Wait 3 seconds for everything to load 