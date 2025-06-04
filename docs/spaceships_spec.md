## Design Specification: NFT Card Collection Spaceship System ✅ IMPLEMENTED

### Overview
The spaceship feature allows players to pilot one of five distinct ship types, with upgradable and damageable systems powered by an NFT card collection system inspired by Clash Royale. Players collect cards through loot drops and missions, stack identical cards to upgrade systems, and customize their ships through a universal slot system. The game emphasizes strategic collection, deck building, and tactical combat with meaningful damage consequences.

**✅ STATUS**: Fully implemented with drag-and-drop interface, multi-ship ownership, station integration, and WeaponSyncManager for unified weapon initialization.

### NFT Card Collection System ✅ IMPLEMENTED

#### Pseudo-NFT Implementation (MVP)
For initial development, we implement a pseudo-NFT system that mimics real NFT behavior:
- ✅ Each card has a unique token ID and metadata
- ✅ Cards are never consumed or destroyed during upgrades
- ✅ Cards accumulate in a crypto wallet simulation
- 🔄 Future integration with real NFT marketplaces (OpenSea, etc.)

#### Card Stacking Mechanics (Clash Royale Style) ✅ IMPLEMENTED
- ✅ **Card Stacking**: All cards of the same type stack together in inventory
- ✅ **Upgrade Requirements**: Multiple cards of the same type required for upgrades
  - Level 1→2: 3x cards
  - Level 2→3: 6x cards  
  - Level 3→4: 12x cards
  - Level 4→5: 24x cards
- ✅ **Card Preservation**: Cards are never consumed, only accumulated
- ✅ **No Stack Limits**: Unlimited cards per type can be collected

#### Discovery and Rarity System ✅ IMPLEMENTED
- ✅ **Undiscovered Cards**: Shown as silhouettes to build anticipation
- ✅ **Pokédex-Style Discovery**: Cards unlock full art and details when first found
- ✅ **Rarity by Drop Rates**: Controlled by availability, not card variants
  - Common: 70% drop rate
  - Rare: 20% drop rate
  - Epic: 8% drop rate
  - Legendary: 2% drop rate
- ✅ **System Inventory**: Game maintains stock of available NFTs for drops
- ✅ **Depletion Handling**: Alternative drops when specific types run out

### Ship Classes ✅ IMPLEMENTED

#### Five Distinct Ship Types
Each ship class offers distinct roles with balanced slot distributions and weapon capabilities:

1. ✅ **Scout**: 15 slots - Fast, agile recon vessel with 2 weapon slots
   - Base Stats: High speed, low armor, minimal firepower, very low cargo
   - Role: Exploration, hit-and-run tactics, reconnaissance
   - Strengths: Speed and maneuverability, excellent for scouting
   - Weaknesses: Fragile, limited combat capability

2. ✅ **Light Fighter**: 16 slots - Balanced combat vessel with 3 weapon slots
   - Base Stats: Medium-high speed, medium-low armor, medium firepower, low cargo
   - Role: Dogfighting, tactical combat, versatile operations
   - Strengths: Good balance of speed and firepower
   - Weaknesses: Limited armor and cargo capacity

3. ✅ **Heavy Fighter**: 18 slots - Durable combat ship with 4 weapon slots
   - Base Stats: Medium-low speed, high armor, high firepower, low cargo
   - Role: Prolonged engagements, heavy combat, assault missions
   - Strengths: High durability and maximum firepower
   - Weaknesses: Slow, limited cargo for trading

4. ✅ **Light Freighter**: 17 slots - Versatile trading vessel with 2 weapon slots
   - Base Stats: Medium speed, medium armor, medium-low firepower, medium-high cargo
   - Role: Trading, cargo transport, balanced operations
   - Strengths: Good cargo capacity with combat capability
   - Weaknesses: Moderate performance in all areas

5. ✅ **Heavy Freighter**: 20 slots - High-capacity cargo hauler with 1 weapon slot
   - Base Stats: Low speed, medium-high armor, low firepower, very high cargo
   - Role: Bulk cargo transport, logistics operations
   - Strengths: Maximum cargo capacity and good armor
   - Weaknesses: Slow, minimal firepower, relies on escorts

### Universal Slot System ✅ IMPLEMENTED

#### Simplified Slot Design ✅ COMPLETED
- ✅ **Universal Slots**: All systems occupy exactly 1 slot regardless of type
- ✅ **No Hardpoint Types**: Eliminated specialized weapon/utility/engine hardpoints
- ✅ **Slot Availability**: Determined by ship class (Scout: 15, Heavy Freighter: 20)
- ✅ **Free Installation**: Systems can be installed/removed within slot constraints
- ✅ **Build Validation**: Essential systems required (engines, reactor, hull plating)

### Card Types and System Integration ✅ IMPLEMENTED

#### Essential Systems (Required for Launch) ✅ IMPLEMENTED
1. ✅ **Hull Plating** - Provides hull hit points and damage resistance
2. ✅ **Energy Reactor** - Provides energy capacity and recharge rate
3. ✅ **Impulse Engines** - Enables movement and maneuverability
4. ✅ **Cargo Hold** - Provides cargo storage capacity

#### Combat Systems ✅ IMPLEMENTED
1. ✅ **Laser Cannon** - Primary energy weapons (various types)
2. ✅ **Plasma Cannon** - High-damage energy weapons
3. ✅ **Pulse Cannon** - Burst-fire energy weapons
4. ✅ **Phaser Array** - Wide-beam area effect weapons
5. ✅ **Standard Missile** - Basic projectile weapons
6. ✅ **Homing Missile** - Tracking projectile weapons
7. ✅ **Photon Torpedo** - High-damage explosive weapons
8. ✅ **Proximity Mine** - Deployable explosive devices

#### Utility Systems ✅ IMPLEMENTED
1. ✅ **Warp Drive** - Faster-than-light travel capability
2. ✅ **Long Range Scanner** - Detection and exploration
3. ✅ **Subspace Radio** - Communication and galactic chart updates
4. ✅ **Target Computer** - Weapon accuracy and sub-targeting (Level 3+)
5. ✅ **Shield Generator** - Armor rating when active
6. ✅ **Shields** - Deflector shield system with energy consumption

### Inventory Interface Design ✅ IMPLEMENTED

#### Card Collection Display ✅ COMPLETED
- ✅ **Grid Layout**: Visual card display with stack counters
- ✅ **Silhouette System**: Undiscovered cards shown as mysterious outlines
- ✅ **Stack Counters**: Show quantity of each card type owned
- ✅ **Upgrade Indicators**: Visual cues when enough cards for upgrade
- ✅ **Drag-and-Drop**: Cards can be dragged to ship slots with visual feedback

#### Ship Configuration Interface ✅ COMPLETED
- ✅ **Ship Selection**: Choose from owned ships (station-only)
- ✅ **Slot Management**: Visual representation of ship slots with type icons
- ✅ **Real-time Validation**: Immediate feedback on build validity
- ✅ **Launch Prevention**: Invalid builds cannot launch from station
- ✅ **Persistent Configurations**: Ship loadouts saved between sessions

### Upgrade System ✅ IMPLEMENTED

#### Card-Based Progression ✅ COMPLETED
- ✅ **Collection Requirements**: Multiple cards needed per upgrade level
- ✅ **Credit Costs**: In-game currency required alongside cards
- ✅ **Progressive Scaling**: Higher levels require exponentially more cards
- ✅ **Stat Improvements**: Each level provides meaningful stat boosts

#### Upgrade Mechanics ✅ IMPLEMENTED
```
✅ Level 1 (Base): 1x card (starting level)
✅ Level 2: 3x cards + 1,000 credits
✅ Level 3: 6x cards + 5,000 credits  
✅ Level 4: 12x cards + 15,000 credits
✅ Level 5: 24x cards + 50,000 credits
```

### Ship Management ✅ IMPLEMENTED

#### Multi-Ship Collection ✅ COMPLETED
- ✅ **Ship Ownership**: Players can own multiple ships
- ✅ **Station Access**: All owned ships accessible from any station
- ✅ **Ship Swapping**: Change active ship only when docked
- ✅ **Configuration Saving**: Ship loadouts persist between sessions

#### Build Validation Rules ✅ IMPLEMENTED
- ✅ **Essential Systems**: Must have hull plating, reactor, engines
- ✅ **Energy Balance**: Active systems cannot exceed energy generation
- ✅ **Slot Limits**: Cannot exceed ship's slot capacity
- ✅ **Launch Blocking**: Invalid builds prevent undocking

### Damage and Repair System ✅ IMPLEMENTED

#### System Health and Effects ✅ COMPLETED
- ✅ **Health Percentage**: 0-100% health per system
- ✅ **Performance Scaling**: Damage reduces effectiveness proportionally
- ✅ **Critical Thresholds**: 
  - 0-25%: Minor impairment
  - 26-50%: Moderate reduction
  - 51-75%: Severe limitation
  - 76-100%: Critical/disabled

#### Damageable Systems ✅ IMPLEMENTED
1. ✅ **Impulse Engines** - Controls sublight speed and maneuverability
2. ✅ **Warp Drive** - Enables faster-than-light travel between systems
3. ✅ **Long Range Scanner** - Detects distant objects and threats
4. ✅ **Galactic Chart** - Provides navigation data and star maps
5. ✅ **Target Computer** - Enhances weapon accuracy and sub-targeting
6. ✅ **Subspace Radio** - Enables communication and intel updates
7. ✅ **Weapons** - Primary combat systems (various types)
8. ✅ **Shields** - Deflector shield systems for damage absorption
9. ✅ **Hull Plating** - Structural integrity and damage resistance

#### Repair Mechanics ✅ IMPLEMENTED
- ✅ **Nanobot Repair Kits**: Consumable items for in-space repairs
- ✅ **Priority System**: Damage Control interface with repair sliders
- ✅ **Station Repairs**: Full restoration for credits when docked
- ✅ **Repair Costs**: Scale with system level and ship class

### User Interface Components ✅ IMPLEMENTED

#### Damage Control Interface (Press 'D') ✅ COMPLETED
- ✅ **System Status**: Real-time health display for all systems
- ✅ **Repair Management**: Priority sliders for repair kit allocation
- ✅ **Damage Log**: Scrolling ticker of recent damage events
- ✅ **Station Integration**: Repair cost estimates when docked

#### Card Inventory Interface ✅ COMPLETED
- ✅ **Drag-and-Drop**: Card installation from inventory
- ✅ **Real-time Preview**: Immediate stat updates
- ✅ **Build Validation**: Live feedback on configuration validity
- ✅ **Two-Panel Layout**: Ship slots (left) and inventory (right)
- ✅ **Shop Mode**: Accessible from station docking interface

### Energy Management ✅ IMPLEMENTED

#### Simplified Energy System ✅ COMPLETED
- ✅ **Centralized Pool**: Single energy source for all systems
- ✅ **Direct Consumption**: Systems consume energy when active
- ✅ **Auto-Deactivation**: Systems shut down when energy insufficient
- ✅ **Variable Consumption**: Impulse engines scale 1x to 15x with speed
- ✅ **No Power Grid**: Eliminated complex power allocation mechanics

### Technical Implementation ✅ IMPLEMENTED

#### Data Structures ✅ COMPLETED
```javascript
// NFT Card Structure - IMPLEMENTED
{
  tokenId: "unique_identifier",
  cardType: "laser_cannon",
  rarity: "rare",
  quantity: 1,
  discovered: true,
  metadata: {
    name: "Laser Cannon",
    description: "Standard energy weapon",
    image: "card_image_url",
    attributes: []
  }
}

// Ship Configuration - IMPLEMENTED
{
  shipType: "heavy_fighter",
  installedSystems: {
    slot1: { cardType: "laser_cannon", level: 3 },
    slot2: { cardType: "shield_generator", level: 2 }
  },
  name: "Player Ship Name"
}
```

#### Persistence Strategy ✅ IMPLEMENTED
- ✅ **Session Persistence**: Configuration saved in browser storage
- ✅ **Multi-Ship Persistence**: Each ship's configuration saved separately
- ✅ **Card Collection**: Inventory state maintained across sessions
- 🔄 **Future Migration**: Designed for easy blockchain integration

### Balance Considerations ✅ TESTED

#### Economic Balance ✅ IMPLEMENTED
- ✅ **Drop Rate Tuning**: Ensure progression feels rewarding
- ✅ **Credit Scaling**: Upgrade costs create meaningful choices
- ✅ **Rarity Distribution**: Legendary cards remain special

#### Gameplay Balance ✅ IMPLEMENTED
- ✅ **Ship Role Identity**: Upgrades enhance but don't eliminate weaknesses
- ✅ **Slot Limitations**: Ships maintain distinct roles through slot counts
- ✅ **Energy Balance**: Systems require meaningful energy trade-offs

### Integration Status ✅ COMPLETED

#### Station Integration ✅ IMPLEMENTED
- ✅ **Repair Interface**: Complete repair services with faction pricing
- ✅ **Inventory Access**: "SHIP INVENTORY" button in docking interface
- ✅ **Ship Switching**: Real-time ship type changes in inventory
- ✅ **Configuration Persistence**: Changes saved automatically

#### Main Game Integration ✅ COMPLETED
- ✅ **System Effectiveness**: Cards directly affect ship performance
- ✅ **Energy Integration**: Card-based energy reactors provide ship power
- ✅ **Damage Integration**: Card systems take damage and require repair
- ✅ **Combat Integration**: Card-based weapons fully functional

### Advanced Features ✅ IMPLEMENTED

#### Weapon System Integration ✅ COMPLETED
- ✅ **WeaponSyncManager**: Unified weapon initialization system
- ✅ **Card-Based Weapons**: All weapons derive from installed cards
- ✅ **Weapon Slot Management**: Proper slot assignment and validation
- ✅ **Equipment Synchronization**: Fixed post-docking weapon sync issues

#### Target Computer Integration ✅ IMPLEMENTED
- ✅ **Sub-System Targeting**: Level 3+ target computers enable sub-targeting
- ✅ **Intel Integration**: Advanced computers provide tactical information
- ✅ **Weapon Accuracy**: Card level affects targeting precision

### Next Phase: Enhancement Features 🔄 COMPLETED

#### Autofire System ✅ IMPLEMENTED
- ✅ **Autofire Toggle**: \ key enables/disables autofire mode
- ✅ **Automatic Target Selection**: Closest enemy targeting
- ✅ **Range Validation**: Proper target lock requirements

#### Ship Launch System ✅ IMPLEMENTED
- ✅ **Equipment Synchronization**: Fixed card system refresh during launch
- ✅ **System Initialization**: Proper async initialization sequence
- ✅ **Undock Cooldown**: Enhanced user feedback with countdown timer

**✅ IMPLEMENTATION STATUS**: Core system 100% complete and fully integrated into main game.

This specification creates a compelling card collection system that combines the addictive mechanics of Clash Royale with the strategic depth of space combat simulation, while maintaining a clear path to full NFT integration.

