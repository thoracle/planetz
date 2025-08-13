# Wireframe Object Specifications

## 🌌 Overview

This document defines the wireframe shapes and visual representations for all objects in the PlanetZ universe, including our new space stations, celestial bodies, and faction-specific installations. These wireframes are used in the targeting computer, proximity detector, and physics debug systems.

---

## 🎯 Existing Wireframe System

### **Current Object Types & Shapes**

#### **Celestial Bodies**
- **Stars**: Custom star geometry (multi-pointed star pattern)
- **Planets**: IcosahedronGeometry (20-sided polyhedron)
- **Moons**: OctahedronGeometry (8-sided diamond shape)
- **Default Objects**: IcosahedronGeometry with subdivision

#### **Ships & Targets**
- **Enemy Ships**: BoxGeometry (cube wireframe)
- **Target Dummies**: BoxGeometry (cube wireframe)
- **Player Ship**: (follows enemy ship pattern)

#### **Radar Blips (3D Mode)**
- **Ships**: ConeGeometry (triangle pointing up)
- **Planets**: Large SphereGeometry
- **Moons**: Small SphereGeometry
- **Stars**: OctahedronGeometry
- **Default**: BoxGeometry

---

## 🛰️ New Space Station Wireframes

### **Research & Development Stations**

#### **Research Lab**
- **Wireframe**: `DodecahedronGeometry(radius, 0)` (12-sided scientific polyhedron)
- **Color**: `0x00ffff` (cyan - scientific/research theme)
- **Radar Blip**: `TetrahedronGeometry` (4-sided pyramid)
- **Scale Factor**: 1.2x (larger than standard objects)

#### **Listening Post**
- **Wireframe**: `TetrahedronGeometry(radius, 0)` (4-sided pyramid)
- **Color**: `0x9932cc` (purple - intelligence/surveillance)
- **Radar Blip**: `ConeGeometry` (radio antenna shape)
- **Scale Factor**: 0.8x (smaller, stealthy)

#### **Orbital Telescope**
- **Wireframe**: `CylinderGeometry(radius*0.6, radius*0.6, radius*2, 8)` (cylinder)
- **Color**: `0x4169e1` (royal blue - observation)
- **Radar Blip**: `CylinderGeometry` (telescope tube)
- **Scale Factor**: 1.5x height multiplier

---

### **Industrial & Production Stations**

#### **Asteroid Mine**
- **Wireframe**: Custom angular geometry (irregular asteroid-like shape)
- **Color**: `0x8b4513` (saddle brown - mining/earth)
- **Radar Blip**: `DodecahedronGeometry` (complex mining structure)
- **Scale Factor**: 1.5x (large industrial facility)

#### **Refinery**
- **Wireframe**: `TorusGeometry` - donut shapped
- **Color**: `0xff4500` (orange red - industrial heat)
- **Radar Blip**: `BoxGeometry` (industrial block)
- **Scale Factor**: 1.3x (substantial industrial facility)

#### **Factory**
- **Wireframe**: Connected `BoxGeometry` modules in linear arrangement
- **Color**: `0x708090` (slate gray - manufacturing)
- **Radar Blip**: `BoxGeometry` (industrial structure)
- **Scale Factor**: 1.4x (large manufacturing complex)

#### **Shipyard**
- **Wireframe**: Massive scaffold structure using `EdgesGeometry` of elongated box
- **Color**: `0x2e8b57` (sea green - construction)
- **Radar Blip**: `BoxGeometry` stretched (construction framework)
- **Scale Factor**: 2.0x (massive construction facility)

---

### **Military & Defense Stations**

#### **Defense Platform**
- **Wireframe**: `OctahedronGeometry` with weapon spikes
- **Color**: `0xff0000` (red - military threat)
- **Radar Blip**: `OctahedronGeometry` (defensive structure)
- **Scale Factor**: 1.2x (fortified military installation)

#### **Prison**
- **Wireframe**: `BoxGeometry` with grid pattern overlay
- **Color**: `0x696969` (dim gray - institutional)
- **Radar Blip**: `BoxGeometry` (secure facility)
- **Scale Factor**: 1.1x (secure containment facility)

#### **Repair Station**
- **Wireframe**: Cross-shaped structure using connected cylinders
- **Color**: `0x32cd32` (lime green - medical/repair)
- **Radar Blip**: Cross shape (aid station symbol)
- **Scale Factor**: 1.3x (service facility)

---

### **Infrastructure & Logistics Stations**

#### **Communications Array**
- **Wireframe**: Multiple `ConeGeometry` arranged in array pattern
- **Color**: `0x00bfff` (deep sky blue - communications)
- **Radar Blip**: `ConeGeometry` (antenna/transmitter)
- **Scale Factor**: 1.0x with extended height

#### **Storage Depot**
- **Wireframe**: Large `BoxGeometry` with smaller attached modules
- **Color**: `0xdaa520` (goldenrod - cargo/commerce)
- **Radar Blip**: `BoxGeometry` (storage container)
- **Scale Factor**: 1.6x (massive storage capacity)

#### **Frontier Outpost**
- **Wireframe**: Cluster of connected spheres (`SphereGeometry`)
- **Color**: `0xcd853f` (peru - frontier/exploration)
- **Radar Blip**: `SphereGeometry` (modular outpost)
- **Scale Factor**: 1.0x (versatile size)

---

## 🏛️ Faction-Specific Visual Modifications

### **Terran Republic Alliance (TRA)**
- **Color Modifier**: Brighter, cleaner lines with blue undertones
- **Pattern**: Geometric precision, clean edges
- **Special Effect**: Subtle glow effect on wireframes

### **Zephyrian Collective**
- **Color Modifier**: Crystal-like prismatic edges with purple/cyan shifts
- **Pattern**: Organic flowing lines, crystalline structures
- **Special Effect**: Pulsing opacity to simulate harmonic resonance

### **Free Trader Consortium**
- **Color Modifier**: Practical gray-blue tones with wear patterns
- **Pattern**: Functional, boxy designs with visible modifications
- **Special Effect**: Occasional color flicker (improvised equipment)

### **Draconis Imperium**
- **Color Modifier**: Dark red with gold accents
- **Pattern**: Angular, aggressive geometry with weapon protrusions
- **Special Effect**: Sharp, intimidating wireframe emphasis

### **Nexus Corporate Syndicate**
- **Color Modifier**: Sleek silver-white with blue highlights
- **Pattern**: Streamlined, efficient designs with AI aesthetics
- **Special Effect**: Scanning line animations

### **Ethereal Wanderers**
- **Color Modifier**: Soft, flowing pastels with white edges
- **Pattern**: Organic, curved structures with peaceful symmetry
- **Special Effect**: Gentle breathing pulse animation

### **Crimson Raider Clans**
- **Color Modifier**: Harsh red with battle damage patterns
- **Pattern**: Irregular, improvised structures with visible weapons
- **Special Effect**: Aggressive, jagged wireframe distortion

### **Shadow Consortium**
- **Color Modifier**: Dark purple-black with minimal visibility
- **Pattern**: Sleek, hidden structures designed for stealth
- **Special Effect**: Intermittent visibility (cloaking technology)

### **Void Cult**
- **Color Modifier**: Sickly green-black with corruption effects
- **Pattern**: Twisted, unnatural geometry suggesting cosmic horror
- **Special Effect**: Unsettling flicker and distortion

---

## 🪐 Enhanced Celestial Body Wireframes

### **Gas Giants**
- **Wireframe**: `SphereGeometry` with horizontal band patterns
- **Color**: Based on atmospheric composition
  - Jupiter-type: `0xffa500` (orange)
  - Saturn-type: `0xf0e68c` (khaki)
  - Neptune-type: `0x4169e1` (royal blue)
  - Uranus-type: `0x40e0d0` (turquoise)

### **Asteroid Fields**
- **Wireframe**: Multiple small `DodecahedronGeometry` instances
- **Color**: `0x8b7d6b` (dark khaki - rock/metal)
- **Pattern**: Irregular clustering with size variation

### **Nebulae**
- **Wireframe**: `IcosahedronGeometry` with high subdivision for organic shape
- **Color**: Varies by nebula type
  - Emission: `0xff69b4` (hot pink)
  - Reflection: `0x87ceeb` (sky blue)
  - Dark: `0x2f4f4f` (dark slate gray)

### **Comets**
- **Wireframe**: `SphereGeometry` with trailing `ConeGeometry` tail
- **Color**: `0xf5f5dc` (beige core) + `0x00ffff` (cyan tail)
- **Special Effect**: Tail points away from nearest star

---

## 💻 Implementation Code Examples

### **Space Station Wireframe Creator**

```javascript
/**
 * Create wireframe geometry for space stations
 * @param {string} stationType - Type of space station
 * @param {number} radius - Base radius for scaling
 * @param {string} faction - Faction for color/style modifications
 * @returns {THREE.Object3D} Wireframe object
 */
function createStationWireframe(stationType, radius, faction = 'neutral') {
    let geometry;
    let color;
    
    switch (stationType) {
        case 'research_lab':
            geometry = new THREE.DodecahedronGeometry(radius, 0);
            color = 0x00ffff;
            break;
            
        case 'listening_post':
            geometry = new THREE.TetrahedronGeometry(radius, 0);
            color = 0x9932cc;
            break;
            
        case 'orbital_telescope':
            geometry = new THREE.CylinderGeometry(radius*0.6, radius*0.6, radius*2, 8);
            color = 0x4169e1;
            break;
            
        case 'asteroid_mine':
            geometry = createIrregularAsteroidGeometry(radius);
            color = 0x8b4513;
            break;
            
        case 'refinery':
            geometry = createRefineryGeometry(radius);
            color = 0xff4500;
            break;
            
        case 'factory':
            geometry = createFactoryGeometry(radius);
            color = 0x708090;
            break;
            
        case 'shipyard':
            geometry = createShipyardGeometry(radius);
            color = 0x2e8b57;
            break;
            
        case 'defense_platform':
            geometry = createDefensePlatformGeometry(radius);
            color = 0xff0000;
            break;
            
        case 'prison':
            geometry = createPrisonGeometry(radius);
            color = 0x696969;
            break;
            
        case 'repair_station':
            geometry = createRepairStationGeometry(radius);
            color = 0x32cd32;
            break;
            
        case 'communications_array':
            geometry = createCommunicationsGeometry(radius);
            color = 0x00bfff;
            break;
            
        case 'storage_depot':
            geometry = createStorageDepotGeometry(radius);
            color = 0xdaa520;
            break;
            
        case 'frontier_outpost':
            geometry = createFrontierOutpostGeometry(radius);
            color = 0xcd853f;
            break;
            
        default:
            geometry = new THREE.BoxGeometry(radius, radius, radius);
            color = 0xffffff;
    }
    
    // Apply faction color modifications
    color = applyFactionColorModifier(color, faction);
    
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
        color: color,
        linewidth: 1,
        transparent: true,
        opacity: 0.8
    });
    
    const wireframe = new THREE.LineSegments(edgesGeometry, material);
    
    // Apply faction-specific effects
    applyFactionEffects(wireframe, faction);
    
    // Clean up temporary geometry
    geometry.dispose();
    edgesGeometry.dispose();
    
    return wireframe;
}

/**
 * Apply faction-specific color modifications
 */
function applyFactionColorModifier(baseColor, faction) {
    const color = new THREE.Color(baseColor);
    
    switch (faction) {
        case 'terran_republic_alliance':
            // Brighter with blue undertones
            color.multiplyScalar(1.1);
            color.b = Math.min(1.0, color.b * 1.2);
            break;
            
        case 'zephyrian_collective':
            // Purple/cyan shift
            color.r = Math.min(1.0, color.r * 1.1);
            color.b = Math.min(1.0, color.b * 1.3);
            break;
            
        case 'draconis_imperium':
            // Dark red with gold accents
            color.r = Math.min(1.0, color.r * 1.2);
            color.g = Math.max(0.3, color.g * 0.8);
            break;
            
        case 'nexus_corporate':
            // Sleek silver-white
            color.multiplyScalar(1.2);
            break;
            
        case 'crimson_raiders':
            // Harsh red
            color.r = Math.min(1.0, color.r * 1.4);
            color.g = Math.max(0.2, color.g * 0.6);
            color.b = Math.max(0.2, color.b * 0.6);
            break;
            
        case 'shadow_consortium':
            // Dark purple-black
            color.multiplyScalar(0.6);
            color.b = Math.min(1.0, color.b * 1.3);
            break;
            
        case 'void_cult':
            // Sickly green-black
            color.r = Math.max(0.2, color.r * 0.5);
            color.g = Math.min(1.0, color.g * 1.1);
            color.b = Math.max(0.2, color.b * 0.5);
            break;
    }
    
    return color.getHex();
}

/**
 * Apply faction-specific visual effects
 */
function applyFactionEffects(wireframe, faction) {
    switch (faction) {
        case 'zephyrian_collective':
            // Pulsing opacity for harmonic resonance
            wireframe.userData.pulseAnimation = true;
            break;
            
        case 'nexus_corporate':
            // Scanning line animation
            wireframe.userData.scanAnimation = true;
            break;
            
        case 'ethereal_wanderers':
            // Gentle breathing pulse
            wireframe.userData.breatheAnimation = true;
            break;
            
        case 'shadow_consortium':
            // Intermittent visibility (cloaking)
            wireframe.userData.cloakAnimation = true;
            break;
            
        case 'void_cult':
            // Unsettling flicker
            wireframe.userData.flickerAnimation = true;
            break;
    }
}
```

### **Complex Station Geometry Creators**

```javascript
/**
 * Create irregular asteroid-like geometry for mining stations
 */
function createIrregularAsteroidGeometry(radius) {
    const geometry = new THREE.DodecahedronGeometry(radius, 0);
    const positions = geometry.attributes.position.array;
    
    // Add random displacement to vertices for irregular shape
    for (let i = 0; i < positions.length; i += 3) {
        const vertex = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
        const displacement = (Math.random() - 0.5) * radius * 0.3;
        vertex.normalize().multiplyScalar(radius + displacement);
        
        positions[i] = vertex.x;
        positions[i+1] = vertex.y;
        positions[i+2] = vertex.z;
    }
    
    geometry.attributes.position.needsUpdate = true;
    return geometry;
}

/**
 * Create shipyard scaffold geometry
 */
function createShipyardGeometry(radius) {
    const group = new THREE.Group();
    
    // Main framework
    const mainFrame = new THREE.BoxGeometry(radius * 3, radius * 0.5, radius * 0.5);
    const crossFrame1 = new THREE.BoxGeometry(radius * 0.5, radius * 2, radius * 0.5);
    const crossFrame2 = new THREE.BoxGeometry(radius * 0.5, radius * 0.5, radius * 2);
    
    // Combine geometries to create scaffold structure
    const combinedGeometry = new THREE.BufferGeometry();
    // ... geometry combination logic
    
    return combinedGeometry;
}

/**
 * Create communications array geometry
 */
function createCommunicationsGeometry(radius) {
    const group = new THREE.Group();
    
    // Multiple antenna cones
    for (let i = 0; i < 4; i++) {
        const antenna = new THREE.ConeGeometry(radius * 0.3, radius * 1.5, 6);
        const angle = (i / 4) * Math.PI * 2;
        antenna.translate(
            Math.cos(angle) * radius * 0.7,
            0,
            Math.sin(angle) * radius * 0.7
        );
        group.add(new THREE.Mesh(antenna));
    }
    
    // Central hub
    const hub = new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, radius * 0.3, 8);
    group.add(new THREE.Mesh(hub));
    
    // Merge geometries
    return mergeGroupGeometries(group);
}
```

---

## 🎨 Color Coding System

### **Universal Color Meanings**
- **Red (`0xff0000`)**: Military/Hostile/Dangerous
- **Blue (`0x0000ff`)**: Scientific/Research/Peaceful
- **Green (`0x00ff00`)**: Medical/Repair/Life Support
- **Yellow (`0xffff00`)**: Commerce/Trade/Civilian
- **Purple (`0x800080`)**: Intelligence/Surveillance/Mysterious
- **Orange (`0xffa500`)**: Industrial/Manufacturing/Energy
- **Cyan (`0x00ffff`)**: Communications/Data/Technology
- **White (`0xffffff`)**: Neutral/Unknown/Standard

### **Faction Color Schemes**
- **TRA**: Blue-white with clean lines
- **Zephyrian**: Purple-cyan with organic flow
- **Free Traders**: Gray-yellow with practical styling
- **Draconis**: Red-gold with aggressive angles
- **Nexus Corporate**: Silver-blue with tech aesthetics
- **Ethereal**: Soft pastels with peaceful curves
- **Crimson Raiders**: Harsh red with battle damage
- **Shadow Consortium**: Dark purple with stealth effects
- **Void Cult**: Sickly green with corruption distortion

---

## 🔧 Integration Points

### **Targeting Computer Integration**
```javascript
// Update TargetComputerManager.js createTargetWireframe method
if (info && info.stationType) {
    wireframeGeometry = createStationWireframe(info.stationType, radius, info.faction);
} else if (info && info.celestialType) {
    wireframeGeometry = createCelestialWireframe(info.celestialType, radius);
}
```

### **Proximity Detector Integration**
```javascript
// Update ProximityDetector3D.js createBlip method
if (obj.stationType) {
    blipGeometry = getStationBlipGeometry(obj.stationType, blipSize);
} else if (obj.celestialType) {
    blipGeometry = getCelestialBlipGeometry(obj.celestialType, blipSize);
}
```

### **Physics Debug Integration**
```javascript
// Update PhysicsManager.js createDebugWireframe method
if (entityMetadata.stationType) {
    geometry = createStationWireframe(entityMetadata.stationType, radius, entityMetadata.faction);
}
```

---

*This wireframe specification provides a comprehensive visual language for all objects in the PlanetZ universe, ensuring consistent and meaningful representation across all game systems while maintaining faction identity and object functionality.*
