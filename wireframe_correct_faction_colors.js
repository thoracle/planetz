/**
 * 🎯 WIREFRAME CORRECT FACTION COLORS
 * 
 * Uses the actual faction colors from docs/restart.md:
 * - enemy: '#ff3333' (Red for hostile)
 * - neutral: '#ffff44' (Yellow for neutral)  
 * - friendly: '#44ff44' (Green for friendly)
 * - unknown: '#44ffff' (Cyan for unknown)
 */

console.log('🔧 Applying correct faction colors from docs/restart.md...');

function applyCorrectFactionColors() {
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return false;
    }

    const tcm = window.targetComputerManager;

    // ========== CORRECT FACTION COLORS FROM DOCS ==========
    
    const FACTION_COLORS = {
        enemy: '#ff3333',     // Red for hostile
        neutral: '#ffff44',   // Yellow for neutral  
        friendly: '#44ff44',  // Green for friendly
        unknown: '#44ffff'    // Cyan for unknown
    };

    // ========== ENHANCED WIREFRAME CREATION WITH CORRECT FACTION COLORS ==========
    
    tcm.createTargetWireframe = function() {
        if (!this.scene || !this.THREE || !this.currentTarget) return;
        
        // Remove existing wireframe
        if (this.targetWireframe) {
            this.scene.remove(this.targetWireframe);
            this.targetWireframe = null;
        }
        
        // Handle waypoints specially (keep magenta)
        if (this.currentTarget.isWaypoint) {
            this.createWaypointWireframe();
            return;
        }
        
        // ========== DETERMINE FACTION COLOR ==========
        
        let wireframeColor = FACTION_COLORS.unknown; // Default cyan for unknown
        let wireframeSize = 1.0;
        
        // Get faction color based on diplomacy status
        if (this.currentTarget.diplomacy) {
            const diplomacy = this.currentTarget.diplomacy.toLowerCase();
            
            switch (diplomacy) {
                case 'friendly':
                case 'allied':
                case 'ally':
                    wireframeColor = FACTION_COLORS.friendly; // Green
                    break;
                case 'neutral':
                case 'civilian':
                case 'independent':
                    wireframeColor = FACTION_COLORS.neutral; // Yellow
                    break;
                case 'hostile':
                case 'enemy':
                case 'pirate':
                    wireframeColor = FACTION_COLORS.enemy; // Red
                    break;
                case 'unknown':
                default:
                    wireframeColor = FACTION_COLORS.unknown; // Cyan
            }
        } else if (this.currentTarget.faction) {
            // Fallback to faction if no diplomacy
            const faction = this.currentTarget.faction.toLowerCase();
            
            // Map factions to diplomacy status
            switch (faction) {
                case 'alliance':
                case 'terran':
                case 'earth':
                case 'friendly':
                    wireframeColor = FACTION_COLORS.friendly; // Green
                    break;
                case 'neutral':
                case 'civilian':
                case 'independent':
                case 'trade':
                case 'trader':
                case 'corporate':
                    wireframeColor = FACTION_COLORS.neutral; // Yellow
                    break;
                case 'pirate':
                case 'hostile':
                case 'enemy':
                case 'raider':
                    wireframeColor = FACTION_COLORS.enemy; // Red
                    break;
                case 'unknown':
                default:
                    wireframeColor = FACTION_COLORS.unknown; // Cyan
            }
        } else {
            // Try to infer from target name as last resort
            const targetName = (this.currentTarget.name || '').toLowerCase();
            
            if (targetName.includes('pirate') || targetName.includes('raider') || 
                targetName.includes('hostile') || targetName.includes('enemy')) {
                wireframeColor = FACTION_COLORS.enemy; // Red
            } else if (targetName.includes('alliance') || targetName.includes('terran') || 
                      targetName.includes('friendly')) {
                wireframeColor = FACTION_COLORS.friendly; // Green
            } else if (targetName.includes('neutral') || targetName.includes('civilian') || 
                      targetName.includes('trade') || targetName.includes('beacon')) {
                wireframeColor = FACTION_COLORS.neutral; // Yellow
            } else {
                wireframeColor = FACTION_COLORS.unknown; // Cyan (default)
            }
        }
        
        // ========== WIREFRAME GEOMETRY BASED ON TARGET TYPE ==========
        
        let geometry;
        const targetType = this.currentTarget.type || 'unknown';
        const targetName = this.currentTarget.name || '';
        
        if (targetName.toLowerCase().includes('beacon')) {
            // Navigation beacons - octahedron wireframe (from docs)
            geometry = new this.THREE.OctahedronGeometry(wireframeSize);
        } else if (targetName.toLowerCase().includes('dummy') || targetName.toLowerCase().includes('target')) {
            // Target dummies - cube wireframe
            geometry = new this.THREE.BoxGeometry(wireframeSize * 2, wireframeSize * 2, wireframeSize * 2);
        } else if (targetType === 'ship' || targetName.toLowerCase().includes('ship')) {
            // Ships - octahedron wireframe
            geometry = new this.THREE.OctahedronGeometry(wireframeSize);
        } else if (targetType === 'station' || targetName.toLowerCase().includes('station') || 
                   targetName.toLowerCase().includes('outpost') || targetName.toLowerCase().includes('complex') ||
                   targetName.toLowerCase().includes('base') || targetName.toLowerCase().includes('platform')) {
            // Stations - larger cube wireframe
            geometry = new this.THREE.BoxGeometry(wireframeSize * 3, wireframeSize * 2, wireframeSize * 3);
        } else if (targetType === 'planet' || targetName.toLowerCase().includes('prime') || 
                   targetName.toLowerCase().includes('luna') || targetName.toLowerCase().includes('europa') ||
                   targetName.toLowerCase().includes('callisto') || targetName.toLowerCase().includes('sol') ||
                   targetName.toLowerCase().includes('mars') || targetName.toLowerCase().includes('venus')) {
            // Planets/celestial bodies - large sphere wireframe (icosahedron from docs)
            geometry = new this.THREE.IcosahedronGeometry(wireframeSize * 2, 1);
        } else {
            // Default - simple sphere
            geometry = new this.THREE.SphereGeometry(wireframeSize, 8, 6);
        }
        
        // Create wireframe material with correct faction color
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
            diplomacy: this.currentTarget.diplomacy,
            faction: this.currentTarget.faction,
            baseScale: scale,
            isStatic: false // Regular wireframes can animate
        };
        
        this.targetWireframe.layers.enable(0);
        this.targetWireframe.renderOrder = 1000;
        this.targetWireframe.frustumCulled = false;
        
        this.scene.add(this.targetWireframe);
        
        const diplomacyInfo = this.currentTarget.diplomacy || this.currentTarget.faction || 'inferred from name';
        console.log(`🎯 Created ${targetType} wireframe (${wireframeColor}, diplomacy: ${diplomacyInfo}) for ${this.currentTarget.name}`);
    };

    // ========== WAYPOINT WIREFRAME (UNCHANGED - KEEP MAGENTA) ==========
    
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

    console.log('✅ Correct faction colors applied from docs/restart.md');
    return true;
}

// ========== TEST CORRECT FACTION COLORS ==========

window.testCorrectFactionColors = function() {
    console.log('🎯 Testing correct faction-based wireframe colors...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    console.log('🎮 Correct Faction Color Guide (from docs/restart.md):');
    console.log('  🔴 Enemy/Hostile: Red (#ff3333)');
    console.log('  🟡 Neutral/Civilian: Yellow (#ffff44)');
    console.log('  🟢 Friendly/Allied: Green (#44ff44)');
    console.log('  🔵 Unknown: Cyan (#44ffff)');
    console.log('  🟣 Waypoints: Magenta (#ff00ff)');
    
    // Show current target info
    if (tcm.currentTarget) {
        console.log(`\n📍 Current Target: ${tcm.currentTarget.name}`);
        console.log(`   Diplomacy: ${tcm.currentTarget.diplomacy || 'not set'}`);
        console.log(`   Faction: ${tcm.currentTarget.faction || 'not set'}`);
        console.log(`   Type: ${tcm.currentTarget.type || 'unknown'}`);
        console.log(`   Is Waypoint: ${tcm.currentTarget.isWaypoint ? 'Yes' : 'No'}`);
        
        if (tcm.targetWireframe) {
            console.log(`   Wireframe: ✅ Present`);
            if (tcm.targetWireframe.material) {
                const color = tcm.targetWireframe.material.color;
                const hexColor = `#${color.getHexString()}`;
                console.log(`   Color: ${hexColor} (r=${color.r.toFixed(2)}, g=${color.g.toFixed(2)}, b=${color.b.toFixed(2)})`);
                
                // Identify the diplomacy based on color
                let identifiedDiplomacy = 'Unknown';
                if (hexColor === '#ff3333') identifiedDiplomacy = 'Enemy/Hostile';
                else if (hexColor === '#ffff44') identifiedDiplomacy = 'Neutral/Civilian';
                else if (hexColor === '#44ff44') identifiedDiplomacy = 'Friendly/Allied';
                else if (hexColor === '#44ffff') identifiedDiplomacy = 'Unknown';
                else if (hexColor === '#ff00ff') identifiedDiplomacy = 'Waypoint';
                
                console.log(`   Identified Diplomacy: ${identifiedDiplomacy}`);
            }
        } else {
            console.log(`   Wireframe: ❌ Missing`);
        }
    } else {
        console.log('\n📍 No target selected');
    }
    
    console.log('\n🎮 Press TAB to cycle through targets and see correct faction colors!');
};

// ========== AUTO-APPLY FIX ==========

// Apply the fix immediately
const success = applyCorrectFactionColors();

if (success) {
    console.log('🎉 Correct faction colors applied successfully!');
    console.log('🎮 Available functions:');
    console.log('  testCorrectFactionColors() - Test correct faction-based colors');
    
    // Auto-test correct faction colors
    setTimeout(() => {
        if (window.testCorrectFactionColors) {
            window.testCorrectFactionColors();
        }
    }, 1000);
} else {
    console.log('❌ Failed to apply correct faction colors');
}
