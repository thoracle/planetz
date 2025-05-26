## Design Specification: NFT Card Collection Spaceship System

### Overview
The spaceship feature allows players to pilot one of five distinct ship types, with upgradable and damageable systems powered by an NFT card collection system inspired by Clash Royale. Players collect cards through loot drops and missions, stack identical cards to upgrade systems, and customize their ships through a universal slot system. The game emphasizes strategic collection, deck building, and tactical combat with meaningful damage consequences.

### NFT Card Collection System

#### Pseudo-NFT Implementation (MVP)
For initial development, we implement a pseudo-NFT system that mimics real NFT behavior:
- Each card has a unique token ID and metadata
- Cards are never consumed or destroyed during upgrades
- Cards accumulate in a crypto wallet simulation
- Future integration with real NFT marketplaces (OpenSea, etc.)

#### Card Stacking Mechanics (Clash Royale Style)
- **Card Stacking**: All cards of the same type stack together in inventory
- **Upgrade Requirements**: Multiple cards of the same type required for upgrades
  - Level 1→2: 3x cards
  - Level 2→3: 6x cards  
  - Level 3→4: 12x cards
  - Level 4→5: 24x cards
- **Card Preservation**: Cards are never consumed, only accumulated
- **No Stack Limits**: Unlimited cards per type can be collected

#### Discovery and Rarity System
- **Undiscovered Cards**: Shown as silhouettes to build anticipation
- **Pokédex-Style Discovery**: Cards unlock full art and details when first found
- **Rarity by Drop Rates**: Controlled by availability, not card variants
  - Common: 70% drop rate
  - Rare: 20% drop rate
  - Epic: 8% drop rate
  - Legendary: 2% drop rate
- **System Inventory**: Game maintains stock of available NFTs for drops
- **Depletion Handling**: Alternative drops when specific types run out

### Universal Slot System

#### Simplified Slot Design
- **Universal Slots**: All systems occupy exactly 1 slot regardless of type
- **No Hardpoint Types**: Eliminated specialized weapon/utility/engine hardpoints
- **Slot Availability**: Determined by ship class (Scout: 6 slots, Heavy Freighter: 18 slots)
- **Free Installation**: Systems can be installed/removed within slot constraints
- **Build Validation**: Essential systems required (engines, reactor, hull plating)

#### Ship Classes and Slot Counts
- **Scout**: 6 slots - Fast, agile recon vessel
- **Light Fighter**: 10 slots - Balanced combat vessel  
- **Heavy Fighter**: 14 slots - Durable combat ship
- **Light Freighter**: 12 slots - Versatile trading vessel
- **Heavy Freighter**: 18 slots - High-capacity cargo hauler

### Card Types and System Integration

#### Essential Systems (Required for Launch)
1. **Hull Plating** - Provides hull hit points and damage resistance
2. **Energy Reactor** - Provides energy capacity and recharge rate
3. **Impulse Engines** - Enables movement and maneuverability
4. **Cargo Hold** - Provides cargo storage capacity

#### Combat Systems
1. **Laser Cannon** - Primary energy weapons (various types)
2. **Plasma Cannon** - High-damage energy weapons
3. **Missile Launcher** - Explosive projectile weapons
4. **Shield Generator** - Energy shields for protection

#### Utility Systems
1. **Warp Drive** - Faster-than-light travel capability
2. **Long Range Scanner** - Detection and exploration
3. **Subspace Radio** - Communication and galactic chart updates
4. **Target Computer** - Weapon accuracy and sub-targeting

### Inventory Interface Design

#### Card Collection Display
- **Grid Layout**: Visual card display with stack counters
- **Silhouette System**: Undiscovered cards shown as mysterious outlines
- **Stack Counters**: Show quantity of each card type owned
- **Upgrade Indicators**: Visual cues when enough cards for upgrade
- **Drag-and-Drop**: Cards can be dragged to ship slots

#### Ship Configuration Interface
- **Ship Selection**: Choose from owned ships (station-only)
- **Slot Management**: Visual representation of ship slots
- **Real-time Validation**: Immediate feedback on build validity
- **Launch Prevention**: Invalid builds cannot launch from station

### Upgrade System

#### Card-Based Progression
- **Collection Requirements**: Multiple cards needed per upgrade level
- **Credit Costs**: In-game currency required alongside cards
- **Progressive Scaling**: Higher levels require exponentially more cards
- **Stat Improvements**: Each level provides meaningful stat boosts

#### Upgrade Mechanics
```
Level 1 (Base): 1x card (starting level)
Level 2: 3x cards + 1,000 credits
Level 3: 6x cards + 5,000 credits  
Level 4: 12x cards + 15,000 credits
Level 5: 24x cards + 50,000 credits
```

### Ship Management

#### Multi-Ship Collection
- **Ship Ownership**: Players can own multiple ships
- **Station Access**: All owned ships accessible from any station
- **Ship Swapping**: Change active ship only when docked
- **Configuration Saving**: Ship loadouts persist between sessions

#### Build Validation Rules
- **Essential Systems**: Must have hull plating, reactor, engines
- **Energy Balance**: Active systems cannot exceed energy generation
- **Slot Limits**: Cannot exceed ship's slot capacity
- **Launch Blocking**: Invalid builds prevent undocking

### Damage and Repair System

#### System Health and Effects
- **Health Percentage**: 0-100% health per system
- **Performance Scaling**: Damage reduces effectiveness proportionally
- **Critical Thresholds**: 
  - 0-25%: Minor impairment
  - 26-50%: Moderate reduction
  - 51-75%: Severe limitation
  - 76-100%: Critical/disabled

#### Repair Mechanics
- **Nanobot Repair Kits**: Consumable items for in-space repairs
- **Priority System**: Damage Control interface with repair sliders
- **Station Repairs**: Full restoration for credits when docked
- **Repair Costs**: Scale with system level and ship class

### User Interface Components

#### Damage Control Interface (Press 'D')
- **System Status**: Real-time health display for all systems
- **Repair Management**: Priority sliders for repair kit allocation
- **Damage Log**: Scrolling ticker of recent damage events
- **Station Integration**: Repair cost estimates when docked

#### Ship Editor (Ctrl-S) - Future Feature
- **Modal Overlay**: Similar to Planet Editor interface
- **Drag-and-Drop**: Card installation from inventory
- **Real-time Preview**: Immediate stat updates
- **Build Validation**: Live feedback on configuration validity

### Energy Management

#### Simplified Energy System
- **Centralized Pool**: Single energy source for all systems
- **Direct Consumption**: Systems consume energy when active
- **Auto-Deactivation**: Systems shut down when energy insufficient
- **No Power Grid**: Eliminated complex power allocation mechanics

### Technical Implementation

#### Data Structures
```javascript
// NFT Card Structure
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

// Ship Configuration
{
  shipType: "heavy_fighter",
  installedSystems: {
    slot1: { cardType: "laser_cannon", level: 3 },
    slot2: { cardType: "shield_generator", level: 2 }
  },
  name: "Player Ship Name"
}
```

#### Persistence Strategy
- **No Persistence Required**: MVP focuses on session-based gameplay
- **Future Migration**: Designed for easy blockchain integration
- **Local Storage**: Temporary save system for development

### Balance Considerations

#### Economic Balance
- **Drop Rate Tuning**: Ensure progression feels rewarding
- **Credit Scaling**: Upgrade costs create meaningful choices
- **Rarity Distribution**: Legendary cards remain special

#### Gameplay Balance
- **Ship Role Identity**: Upgrades enhance but don't eliminate weaknesses
- **Strategic Choices**: Limited slots force meaningful decisions
- **Damage Consequences**: System damage creates tactical challenges

### Future NFT Integration

#### Blockchain Preparation
- **ERC-721 Compatibility**: Token structure ready for blockchain
- **Metadata Standards**: Compliant with NFT marketplace requirements
- **Wallet Integration**: Hooks prepared for crypto wallet connection
- **Marketplace Support**: Ready for OpenSea and similar platforms

#### Trading Ecosystem
- **External Trading**: Players trade on third-party marketplaces
- **No In-Game Trading**: Eliminates need for internal marketplace
- **Ownership Verification**: Blockchain provides authenticity
- **Cross-Platform Value**: NFTs retain value outside game

This specification creates a compelling card collection system that combines the addictive mechanics of Clash Royale with the strategic depth of space combat simulation, while maintaining a clear path to full NFT integration.

