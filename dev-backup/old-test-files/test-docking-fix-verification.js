console.log('🧪 Testing docking fix verification...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== DOCKING FIX VERIFICATION TEST ===');
    
    // Check if required managers exist
    const sm = window.starfieldManager;
    const ssm = sm?.solarSystemManager;
    
    if (!sm || !ssm) {
        console.error('❌ Required managers not found');
        return;
    }
    
    console.log('✅ Managers found');
    
    // Get celestial bodies
    const bodies = ssm.getCelestialBodies();
    if (!bodies || bodies.size === 0) {
        console.error('❌ No celestial bodies found');
        return;
    }
    
    console.log(`📍 Found ${bodies.size} celestial bodies`);
    
    // Test the getCelestialBodyInfo method with each body
    console.log('\n🔍 Testing getCelestialBodyInfo method:');
    bodies.forEach((body, key) => {
        console.log(`\n🎯 Testing ${key}:`);
        console.log(`  - Direct reference test: ${ssm.getCelestialBodyInfo(body) ? '✅' : '❌'}`);
        
        // Test with a copy that has same UUID but different reference
        const bodyCopy = { uuid: body.uuid, position: body.position };
        console.log(`  - UUID fallback test: ${ssm.getCelestialBodyInfo(bodyCopy) ? '✅' : '❌'}`);
        
        const info = ssm.getCelestialBodyInfo(body);
        if (info) {
            console.log(`  - Name: "${info.name}", Type: "${info.type}"`);
        }
    });
    
    console.log('\n🎯 Testing manual docking with planet:');
    const planet = Array.from(bodies.entries()).find(([key, _]) => key.startsWith('planet_'));
    if (planet) {
        const [key, body] = planet;
        console.log(`🌍 Found planet: ${key}`);
        
        // Test docking validation
        const targetInfo = ssm.getCelestialBodyInfo(body);
        console.log(`📋 Target info: ${targetInfo ? '✅' : '❌'}`);
        if (targetInfo) {
            console.log(`  - Name: "${targetInfo.name}"`);
            console.log(`  - Type: "${targetInfo.type}"`);
        }
        
        // Create a copy with same UUID (simulating the reference issue)
        const bodyCopy = { 
            uuid: body.uuid, 
            position: body.position,
            name: body.name,
            type: body.type
        };
        
        console.log('\n🔬 Testing DockingSystemManager validation:');
        const dsm = sm.dockingSystemManager;
        if (dsm) {
            const validation = dsm.validateDocking(sm.viewManager?.getShip(), bodyCopy, sm);
            console.log(`✅ Validation result: ${validation.canDock ? 'SUCCESS' : 'FAILED'}`);
            if (!validation.canDock) {
                console.log(`❌ Reasons: ${validation.reasons.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                console.log(`⚠️ Warnings: ${validation.warnings.join(', ')}`);
            }
        }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('✅ If you see UUID fallback tests passing, the fix is working!');
    
}, 3000);

console.log('✅ Docking fix verification test script loaded'); 