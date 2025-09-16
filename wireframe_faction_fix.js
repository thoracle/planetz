/**
 * 🎯 WIREFRAME FACTION COLOR FIX
 * 
 * Fixes wireframes to use proper faction-based colors
 * instead of arbitrary type-based colors
 */

console.log('🔧 Fixing wireframes to use faction-based colors...');

function fixWireframeFactionColors() {
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;

    // ========== ENHANCED WIREFRAME CREATION WITH FACTION COLORS ==========
    
    tcm.createTargetWireframe = function() {
        if (!this.scene || !this.THREE || !this.currentTarget) return;
        
        // Remove existing wireframe
        if (this.targetWireframe) {
            this.scene.remove(this.targetWireframe);
            this.targetWireframe = null;
        }
        
        // Handle waypoints specially
        if (this.currentTarget.isWaypoint) {
            this.createWaypointWireframe();
            return;
        }
        
        // ========== FACTION-BASED WIREFRAME COLORS ==========
        
        let geometry;
        let wireframeColor = '#00ff00'; // Default green fallback
        let wireframeSize = 1.0;
        
        // Get faction color from the target
        if (this.currentTarget.faction) {
            // Use the target's faction property
            const faction = this.currentTarget.faction.toLowerCase();
            
            switch (faction) {
                case 'alliance':
                case 'terran':
                case 'earth':
                    wireframeColor = '#0099ff'; // Blue for Alliance/Terran
                    break;
                case 'mars':
                case 'martian':
                    wireframeColor = '#ff4400'; // Red-orange for Mars
                    break;
                case 'jupiter':
                case 'jovian':
                    wireframeColor = '#ffaa00'; // Orange for Jupiter
                    break;
                case 'belt':
                case 'belter':
                case 'asteroid':
                    wireframeColor = '#888888'; // Gray for Belt
                    break;
                case 'independent':
                case 'neutral':
                case 'civilian':
                    wireframeColor = '#00ff00'; // Green for Independent/Neutral
                    break;
                case 'pirate':
                case 'hostile':
                case 'enemy':
                    wireframeColor = '#ff0000'; // Red for Hostile
                    break;
                case 'corporate':
                case 'trade':
                case 'trader':
                    wireframeColor = '#ffff00'; // Yellow for Corporate/Trade
                    break;
                default:
                    wireframeColor = '#00ff00'; // Default green
            }
        } else if (this.currentTarget.diplomacy) {
            // Fallback to diplomacy status
            const diplomacy = this.currentTarget.diplomacy.toLowerCase();
            
            switch (diplomacy) {
                case 'friendly':
                case 'allied':
                    wireframeColor = '#00ff00'; // Green for friendly
                    break;
                case 'neutral':
                    wireframeColor = '#ffff00'; // Yellow for neutral
                    break;
                case 'hostile':
                case 'enemy':
                    wireframeColor = '#ff0000'; // Red for hostile
                    break;
                default:
                    wireframeColor = '#00ff00'; // Default green
            }
        } else {
            // Try to infer faction from target name
            const targetName = (this.currentTarget.name || '').toLowerCase();
            
            if (targetName.includes('alliance') || targetName.includes('terran') || 
                targetName.includes('earth') || targetName.includes('luna') || 
                targetName.includes('sol')) {
                wireframeColor = '#0099ff'; // Blue for Alliance/Terran
            } else if (targetName.includes('mars') || targetName.includes('phobos')) {
                wireframeColor = '#ff4400'; // Red-orange for Mars
            } else if (targetName.includes('jupiter') || targetName.includes('europa') || 
                      targetName.includes('callisto') || targetName.includes('ganymede')) {
                wireframeColor = '#ffaa00'; // Orange for Jupiter
            } else if (targetName.includes('belt') || targetName.includes('ceres') || 
                      targetName.includes('vesta') || targetName.includes('asteroid')) {
                wireframeColor = '#888888'; // Gray for Belt
            } else if (targetName.includes('beacon') || targetName.includes('navigation')) {
                wireframeColor = '#ffff00'; // Yellow for navigation aids
            } else if (targetName.includes('pirate') || targetName.includes('raider')) {
                wireframeColor = '#ff0000'; // Red for pirates
            } else {
                wireframeColor = '#00ff00'; // Default green for unknown/neutral
            }
        }
        
        // ========== WIREFRAME GEOMETRY BASED ON TARGET TYPE ==========
        
        const targetType = this.currentTarget.type || 'unknown';
        const targetName = this.currentTarget.name || '';
        
        if (targetName.toLowerCase().includes('beacon')) {
            // Navigation beacons - sphere wireframe
            geometry = new this.THREE.SphereGeometry(wireframeSize, 8, 6);
        } else if (targetName.toLowerCase().includes('dummy') || targetName.toLowerCase().includes('target')) {
            // Target dummies - cube wireframe
            geometry = new this.THREE.BoxGeometry(wireframeSize * 2, wireframeSize * 2, wireframeSize * 2);
        } else if (targetType === 'ship' || targetName.toLowerCase().includes('ship')) {
            // Ships - octahedron wireframe
            geometry = new this.THREE.OctahedronGeometry(wireframeSize);
        } else if (targetType === 'station' || targetName.toLowerCase().includes('station') || 
                   targetName.toLowerCase().includes('outpost') || targetName.toLowerCase().includes('complex')) {
            // Stations - larger cube wireframe
            geometry = new this.THREE.BoxGeometry(wireframeSize * 3, wireframeSize * 2, wireframeSize * 3);
        } else if (targetType === 'planet' || targetName.toLowerCase().includes('prime') || 
                   targetName.toLowerCase().includes('luna') || targetName.toLowerCase().includes('europa') ||
                   targetName.toLowerCase().includes('callisto') || targetName.toLowerCase().includes('sol')) {
            // Planets/celestial bodies - large sphere wireframe
            geometry = new this.THREE.SphereGeometry(wireframeSize * 2, 12, 8);
        } else {
            // Default - simple sphere
            geometry = new this.THREE.SphereGeometry(wireframeSize, 8, 6);
        }
        
        // Create wireframe material with faction color
        const material = new this.THREE.MeshBasicMaterial({
            color: wireframeColor,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        
        // Create wireframe mesh
        this.targetWireframe = new this.THREE.Mesh(geometry, material);
        
        // Position wireframe at target location
        if (this.currentTarget.object3D && this.currentTarget.object3D.position) {
            this.targetWireframe.position.copy(this.currentTarget.object3D.position);
        } else if (this.currentTarget.position) {
            this.targetWireframe.position.set(
                this.currentTarget.position.x,
                this.currentTarget.position.y,
                this.currentTarget.position.z
            );
        }
        
        // Scale based on target size or distance
        let scale = 1.0;
        if (this.currentTarget.distance) {
            scale = Math.max(0.5, Math.min(2.0, this.currentTarget.distance / 50));
        }
        this.targetWireframe.scale.setScalar(scale);
        
        // Set wireframe properties for visibility
        this.targetWireframe.userData = {
            isTargetWireframe: true,
            targetType: targetType,
            faction: this.currentTarget.faction,
            baseScale: scale,
            isStatic: false // Regular wireframes can animate
        };
        
        this.targetWireframe.layers.enable(0);
        this.targetWireframe.renderOrder = 1000;
        this.targetWireframe.frustumCulled = false;
        
        this.scene.add(this.targetWireframe);
        
        const factionInfo = this.currentTarget.faction || 'inferred from name';
        console.log(`🎯 Created ${targetType} wireframe (${wireframeColor}, faction: ${factionInfo}) for ${this.currentTarget.name}`);
    };

    // ========== WAYPOINT WIREFRAME (UNCHANGED) ==========
    
    tcm.createWaypointWireframe = function() {
        if (!this.scene || !this.THREE || !this.currentTarget?.isWaypoint) return;
        
        // Remove existing wireframe
        if (this.targetWireframe) {
            this.scene.remove(this.targetWireframe);
            this.targetWireframe = null;
        }
        
        // Create waypoint wireframe - diamond/rhombus shape
        const geometry = new this.THREE.BufferGeometry();
        
        // Smaller diamond vertices (60% of original size)
        const size = 0.6; // 60% smaller
        const vertices = new Float32Array([
            // Top pyramid
            0, 2*size, 0,    // top
            -1*size, 0, 0,   // left
            0, 0, 1*size,    // front
            
            0, 2*size, 0,    // top
            0, 0, 1*size,    // front
            1*size, 0, 0,    // right
            
            0, 2*size, 0,    // top
            1*size, 0, 0,    // right
            0, 0, -1*size,   // back
            
            0, 2*size, 0,    // top
            0, 0, -1*size,   // back
            -1*size, 0, 0,   // left
            
            // Bottom pyramid
            0, -2*size, 0,   // bottom
            0, 0, 1*size,    // front
            -1*size, 0, 0,   // left
            
            0, -2*size, 0,   // bottom
            1*size, 0, 0,    // right
            0, 0, 1*size,    // front
            
            0, -2*size, 0,   // bottom
            0, 0, -1*size,   // back
            1*size, 0, 0,    // right
            
            0, -2*size, 0,   // bottom
            -1*size, 0, 0,   // left
            0, 0, -1*size,   // back
        ]);
        
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertices, 3));
        
        // Create wireframe material with waypoint colors (magenta)
        const material = new this.THREE.MeshBasicMaterial({
            color: window.WAYPOINT_COLORS.primary,
            wireframe: true,
            transparent: true,
            opacity: 0.9
        });
        
        // Create wireframe mesh
        this.targetWireframe = new this.THREE.Mesh(geometry, material);
        
        // Position wireframe at waypoint location
        this.targetWireframe.position.set(
            this.currentTarget.position.x,
            this.currentTarget.position.y,
            this.currentTarget.position.z
        );
        
        // Scale based on trigger radius but 60% smaller
        const scale = Math.max(0.6, (this.currentTarget.triggerRadius / 10) * 0.6);
        this.targetWireframe.scale.setScalar(scale);
        
        // Static wireframe - no animation
        this.targetWireframe.userData = {
            isWaypointWireframe: true,
            isStatic: true
        };
        
        this.scene.add(this.targetWireframe);
        
        console.log('🎯 Created waypoint wireframe (diamond, magenta, 60% smaller, static)');
    };

    console.log('✅ Wireframe faction colors fixed');
    return true;
}

// ========== TEST FACTION COLORS ==========

window.testFactionColors = function() {
    console.log('🎯 Testing faction-based wireframe colors...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    console.log('🎮 Faction Color Guide:');
    console.log('  🔵 Alliance/Terran: Blue (#0099ff)');
    console.log('  🔴 Mars/Martian: Red-Orange (#ff4400)');
    console.log('  🟠 Jupiter/Jovian: Orange (#ffaa00)');
    console.log('  ⚫ Belt/Asteroid: Gray (#888888)');
    console.log('  🟢 Independent/Neutral: Green (#00ff00)');
    console.log('  🔴 Hostile/Pirate: Red (#ff0000)');
    console.log('  🟡 Corporate/Trade: Yellow (#ffff00)');
    console.log('  🟣 Waypoints: Magenta (#ff00ff)');
    
    // Show current target info
    if (tcm.currentTarget) {
        console.log(`\n📍 Current Target: ${tcm.currentTarget.name}`);
        console.log(`   Faction: ${tcm.currentTarget.faction || 'not set'}`);
        console.log(`   Diplomacy: ${tcm.currentTarget.diplomacy || 'not set'}`);
        console.log(`   Type: ${tcm.currentTarget.type || 'unknown'}`);
        console.log(`   Is Waypoint: ${tcm.currentTarget.isWaypoint ? 'Yes' : 'No'}`);
        
        if (tcm.targetWireframe) {
            console.log(`   Wireframe: ✅ Present`);
            if (tcm.targetWireframe.material) {
                const color = tcm.targetWireframe.material.color;
                const hexColor = `#${color.getHexString()}`;
                console.log(`   Color: ${hexColor} (r=${color.r.toFixed(2)}, g=${color.g.toFixed(2)}, b=${color.b.toFixed(2)})`);
                
                // Identify the faction based on color
                let identifiedFaction = 'Unknown';
                if (hexColor === '#0099ff') identifiedFaction = 'Alliance/Terran';
                else if (hexColor === '#ff4400') identifiedFaction = 'Mars/Martian';
                else if (hexColor === '#ffaa00') identifiedFaction = 'Jupiter/Jovian';
                else if (hexColor === '#888888') identifiedFaction = 'Belt/Asteroid';
                else if (hexColor === '#00ff00') identifiedFaction = 'Independent/Neutral';
                else if (hexColor === '#ff0000') identifiedFaction = 'Hostile/Pirate';
                else if (hexColor === '#ffff00') identifiedFaction = 'Corporate/Trade';
                else if (hexColor === '#ff00ff') identifiedFaction = 'Waypoint';
                
                console.log(`   Identified Faction: ${identifiedFaction}`);
            }
        } else {
            console.log(`   Wireframe: ❌ Missing`);
        }
    } else {
        console.log('\n📍 No target selected');
    }
    
    console.log('\n🎮 Press TAB to cycle through targets and see faction colors!');
};

// ========== AUTO-APPLY FIX ==========

// Apply the fix immediately
const success = fixWireframeFactionColors();

if (success) {
    console.log('🎉 Wireframe faction color fix applied successfully!');
    console.log('🎮 Available functions:');
    console.log('  testFactionColors() - Test faction-based colors');
    
    // Auto-test faction colors
    setTimeout(() => {
        if (window.testFactionColors) {
            window.testFactionColors();
        }
    }, 1000);
} else {
    console.log('❌ Failed to apply wireframe faction color fix');
}
