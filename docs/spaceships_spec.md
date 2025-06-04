<<<<<<< HEAD
## Design Specification: Upgradable and Damageable Spaceship Feature for Space Shooter Game

### Overview
The spaceship feature allows players to pilot one of five distinct ship types, inspired by Elite, Privateer, and Freelancer, with upgradable and damageable systems. Players fly one ship at a time, upgrading systems to enhance performance and tailoring it to their playstyle. Nine critical systems can take damage, impacting gameplay, with limited in-space repair capabilities and full repairs available at space stations. A damage report screen provides real-time system status. The system emphasizes strategic trade-offs in upgrades, repairs, and ship roles, balancing speed, firepower, armor, and cargo capacity.
Core Ship Types
Five ship classes offer distinct roles, with base stats reflecting their strengths and weaknesses. Players select one ship to pilot, with options to purchase or unlock others.
Scout
Role: Fast, agile recon vessel for exploration and evasion.

Base Stats:
Speed: High (90/100)

Armor: Low (20/100)

Firepower: Low (30/100)

Cargo Capacity: Very Low (10 units)

Description: Prioritizes speed and maneuverability for hit-and-run tactics and scouting. Weak in durability and cargo.

Playstyle: Suited for players valuing speed and exploration over combat or trading.

Light Fighter
Role: Balanced combat vessel for dogfights and skirmishes.

Base Stats:
Speed: Medium-High (70/100)

Armor: Medium-Low (40/100)

Firepower: Medium (60/100)

Cargo Capacity: Low (20 units)

Description: Versatile fighter with decent firepower and agility, limited in cargo and armor.

Playstyle: Ideal for dogfighting and tactical combat.

Heavy Fighter
Role: Durable combat ship for prolonged engagements.

Base Stats:
Speed: Medium-Low (50/100)

Armor: High (80/100)

Firepower: High (80/100)

Cargo Capacity: Low (15 units)

Description: Built for sustained combat with strong weapons and armor, sacrificing speed and cargo.

Playstyle: Suited for players who prefer tanking damage and heavy firepower.

Light Freighter
Role: Versatile trading vessel with moderate combat capability.

Base Stats:
Speed: Medium (60/100)

Armor: Medium (50/100)

Firepower: Medium-Low (40/100)

Cargo Capacity: Medium-High (80 units)

Description: Balances cargo capacity with defensive and offensive capabilities.

Playstyle: Appeals to traders needing some combat ability.

Heavy Freighter
Role: High-capacity trading vessel for bulk cargo.

Base Stats:
Speed: Low (30/100)

Armor: Medium-High (70/100)

Firepower: Low (20/100)

Cargo Capacity: Very High (150 units)

Description: Maximizes cargo hauling with strong armor but minimal speed and firepower.

Playstyle: Best for trading and logistics, relying on escorts or defenses.

Upgradable Systems
Each ship has five upgradable systems, allowing customization within its role. Upgrades are purchased, looted, or crafted and installed at space stations or shipyards. Upgrades have tiers (Basic, Advanced, Elite) with increasing costs and benefits, consuming power grid and slots.
Engines (Impulse Engines)
Function: Affects sublight speed and maneuverability.

Upgrade Options:
Basic Thrusters: +10% speed, +5% maneuverability.

Advanced Thrusters: +20% speed, +10% maneuverability.

Elite Thrusters: +30% speed, +15% maneuverability.

Trade-offs: Higher-tier engines increase energy consumption, reducing power for weapons or shields.

Constraints: Scouts and Light Fighters access higher-tier engines; Heavy Freighters are limited to lower tiers.

Weapons (Main Weapons and Missile Tubes)
Function: Determines firepower, including weapon type and firing rate.

Upgrade Options:
Basic Weapons: Standard lasers, moderate damage, low energy cost.

Advanced Weapons: Plasma cannons, high damage, moderate energy cost.

Elite Weapons: Missile launchers/turrets, very high damage, high energy cost.

Trade-offs: High-damage weapons reduce energy for shields or engines; freighters have fewer slots (2-3 vs. 4-6 for fighters).

Constraints: Missile Tubes are a separate slot type, limited to 1-2 for fighters, 0-1 for freighters.

Shields (Deflector Shields)
Function: Absorbs damage before hull/armor is affected.

Upgrade Options:
Basic Shields: 1000 HP, slow recharge.

Advanced Shields: 2000 HP, moderate recharge.

Elite Shields: 3000 HP, fast recharge.

Trade-offs: Stronger shields drain energy, reducing weapon or engine performance.

Constraints: Heavy Fighters and Freighters support higher-tier shields; Scouts have lower capacity.

Armor
Function: Reduces damage to hull after shields are depleted.

Upgrade Options:
Basic Plating: +10% damage resistance.

Advanced Plating: +20% damage resistance.

Elite Plating: +30% damage resistance.

Trade-offs: Heavier armor reduces speed and maneuverability.

Constraints: Heavy Fighters and Freighters equip higher-tier armor; Scouts are limited to lighter plating.

Cargo Hold
Function: Increases cargo capacity for trading or mission items.

Upgrade Options:
Basic Hold: +20 units.

Advanced Hold: +50 units.

Elite Hold: +100 units.

Trade-offs: Larger holds reduce speed and increase energy costs for shields or engines.

Constraints: Freighters equip higher-tier holds; Fighters and Scouts are capped at lower tiers.

Damageable Systems
Nine critical systems can take damage, affecting gameplay. Damage is tracked as a percentage (0% = fully functional, 100% = disabled), with partial damage reducing effectiveness proportionally.
Impulse Engines
Function: Controls sublight speed and maneuverability.

Damage Effect:
Reduces speed and maneuverability (e.g., 50% damage = 50% speed reduction).

At 100% damage, ship moves at 10% base speed.

Gameplay Impact: Hinders evasion and pursuit, critical for Scouts and Light Fighters.

Warp Drive
Function: Enables faster-than-light travel between systems.

Damage Effect:
Reduces warp speed or increases charge-up time (e.g., 50% damage = 50% slower warp).

At 100% damage, warp travel is disabled.

Gameplay Impact: Limits long-distance travel, affecting trading and exploration.

Long Range Scanner
Function: Detects distant objects, enemies, or points of interest.

Damage Effect:
Reduces scan range and accuracy (e.g., 50% damage = 50% scan range).

At 100% damage, only short-range sensors function.

Gameplay Impact: Hampers exploration and threat detection, critical for Scouts.

Galactic Chart
Function: Provides navigation data, including star maps and waypoints.

Damage Effect:
Corrupts map data, reducing visibility (e.g., 50% damage = partial map fog).

At 100% damage, map is inaccessible, forcing manual navigation.

Gameplay Impact: Disrupts trading and mission navigation, especially for Freighters.

Targeting Computer
Function: Enhances weapon accuracy and lock-on for guided weapons.

Damage Effect:
Reduces accuracy and lock-on speed (e.g., 50% damage = 50% accuracy penalty).

At 100% damage, guided weapons cannot lock on; manual aim accuracy halved.

Gameplay Impact: Weakens combat effectiveness, critical for Fighters.

Subspace Radio
Function: Enables communication with NPCs, stations, and factions.

Damage Effect:
Reduces range and clarity (e.g., 50% damage = garbled messages, shorter range).

At 100% damage, communication is disabled.

Gameplay Impact: Limits mission updates and distress calls, affecting all playstyles.

Missile Tubes
Function: Fires guided or unguided missiles.

Damage Effect:
Reduces firing rate or capacity (e.g., 50% damage = 50% slower reload).

At 100% damage, missile tubes are inoperable.

Gameplay Impact: Reduces burst damage, significant for Heavy Fighters.

Main Weapons
Function: Primary weapon system (lasers, plasma cannons, etc.).

Damage Effect:
Reduces damage output and firing rate (e.g., 50% damage = 50% reduced damage).

At 100% damage, main weapons are disabled.

Gameplay Impact: Cripples combat capability, critical for Fighters.

Deflector Shields
Function: Absorbs incoming damage before hull/armor.

Damage Effect:
Reduces shield capacity and recharge rate (e.g., 50% damage = 50% shield HP).

At 100% damage, shields are offline.

Gameplay Impact: Increases vulnerability, especially for Heavy Fighters and Freighters.

Damage Mechanics
Damage Sources: Systems take damage from enemy weapons, collisions, environmental hazards (e.g., radiation, asteroids), or critical hits (5% chance per hull hit, dealing 10-20% damage to a specific system).

Damage Application:
Damage is distributed randomly across systems when hull is hit after shields are depleted.

Environmental hazards may target specific systems (e.g., radiation damages Warp Drive, Scanner).

Status Tiers:
0-25% Damage: Minor impairment, slight performance reduction.

26-50% Damage: Moderate impairment, noticeable performance drop.

51-75% Damage: Severe impairment, significant functionality loss.

76-100% Damage: Critical impairment, system barely functional or disabled.

Feedback: Visual cues (e.g., sparking consoles) and audio (e.g., warning alarms) indicate damage.

Repair Mechanics
In-Space Repairs:
Method: Players use “Repair Kits” (consumable items) to restore 10-25% system health (based on kit quality: Basic, Advanced, Elite).

Limitations:
Players carry 3-5 kits, depending on cargo capacity.

Repairs take 30-60 seconds per kit, cannot be done in combat, and are limited to one system at a time.

Acquisition: Kits are purchased, looted, or crafted.

Trade-offs: Kits compete with cargo space, forcing prioritization.

Station Repairs:
Method: Docking at a station allows full repairs for credits.

Mechanics:
Costs scale with damage severity and ship class (e.g., Heavy Freighter repairs are pricier).

Full repairs take 1-5 minutes, with instant repair options for extra credits.

Some stations require faction reputation or upgrades for repair access.

Strategic Considerations: Players must balance using limited kits in space or docking for full repairs, prioritizing systems based on mission needs.

Damage Report Screen
Purpose: Displays real-time status of all damageable systems and manages repairs.

Layout:
System List: Lists all nine systems with:
Name, icon, and health bar (0-100%, color-coded: green = 0-25%, yellow = 26-50%, orange = 51-75%, red = 76-100%).

Performance penalty (e.g., “Impulse Engines: 60% damage, -60% speed”).

Repair Interface:
Button to apply Repair Kits (shows available kits and quality).

Timer/progress bar for in-space repairs.

Station repair cost and time estimates when docked.

Alerts: Flashing indicators or pop-ups for critical damage (76-100%).

Visuals: 3D ship schematic highlighting damaged systems; tooltips explain functions and effects.

Access: Via ship management menu or hotkey.

Feedback: Audio cues (e.g., “Warning: Shields Critical”) and visual effects (e.g., flickering HUD).

Upgrade and Damage Integration
Upgrades Impact Damage:
Higher-tier systems (e.g., Elite Shields) have more health (e.g., +20% base durability) but are costlier to repair.

Damaged systems reduce upgrade effectiveness (e.g., 50% damaged Elite Thrusters perform like Basic Thrusters).

Power Grid: Damaged systems may draw less power, freeing it for other systems, but reduce overall performance.

Repair Costs: Upgraded systems cost more to repair (e.g., Elite Shields = 2x Basic Shield repair cost).

Upgrade Mechanics
Acquisition: Upgrades are purchased, looted, or crafted using resources (e.g., alloys, circuits).

Installation: Requires shipyard, takes 1-5 minutes or credits to fast-track.

Compatibility: Ships have power grid and slot limits; upgrades consume both, forcing balance.

Progression: Higher-tier upgrades are locked behind player level, faction reputation, or missions.

Customization: Players can save loadouts for quick swapping.

Balance Considerations
Trade-offs: Upgrades enhance one system at the cost of others (e.g., maxed engines reduce weapon output). Damage forces further prioritization.

Economy: Upgrade and repair costs scale with tier and ship class.

Gameplay Impact: Upgrades and repairs enhance mission viability but preserve ship role identity (e.g., Scouts can’t become tanks).

Damage Balance: Systems like Warp Drive or Shields are critical, making their damage high-stakes but not game-ending.

User Interface
Ship Management Screen:
Displays stats, equipped upgrades, slots, power grid, and damage status.

Drag-and-drop for upgrades; repair options for damaged systems.

Visual indicators for trade-offs (e.g., red bar for overloaded power grid) and damage.

Upgrade Market:
Lists upgrades with stats, costs, and compatibility; filters by ship class, system, or tier.

Damage Report Screen: As described above, integrated into the ship management menu.

Feedback: Tooltips explain trade-offs, damage effects, and repair options.

Technical Notes
Data Structure: Ship stat block (JSON/XML) includes base stats, slots, power grid, and system health. Upgrades and damage modify values dynamically.

Balancing: Use formulas (e.g., Speed = BaseSpeed × (1 + EngineBonus - ArmorPenalty - DamagePenalty)).

Storage: Save ship configurations, upgrades, and damage status in the game database.

Testing: Ensure upgrades and damage don’t break ship roles; test repair balance for accessibility.

Future Considerations
Modularity: Add cosmetic upgrades or faction-specific parts.

Dynamic Events: Rare upgrades or repair kits via limited-time missions.

Cross-Ship Progression: Allow upgrade transfers between ships with conversion costs.

Environmental Hazards: Expand hazard types (e.g., EMPs targeting Targeting Computer) for variety.

This specification integrates upgradable and damageable systems, creating a dynamic, strategic experience that aligns with the spirit of Elite, Privateer, and Freelancer.
=======
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

### Universal Slot System ✅ IMPLEMENTED

#### Simplified Slot Design ✅ COMPLETED
- ✅ **Universal Slots**: All systems occupy exactly 1 slot regardless of type
- ✅ **No Hardpoint Types**: Eliminated specialized weapon/utility/engine hardpoints
- ✅ **Slot Availability**: Determined by ship class (Scout: 15, Heavy Freighter: 20)
- ✅ **Free Installation**: Systems can be installed/removed within slot constraints
- ✅ **Build Validation**: Essential systems required (engines, reactor, hull plating)

#### Ship Classes and Slot Counts ✅ IMPLEMENTED
- ✅ **Scout**: 15 slots - Fast, agile recon vessel with 2 weapon slots
- ✅ **Light Fighter**: 16 slots - Balanced combat vessel with 3 weapon slots
- ✅ **Heavy Fighter**: 18 slots - Durable combat ship with 4 weapon slots
- ✅ **Light Freighter**: 17 slots - Versatile trading vessel with 2 weapon slots
- ✅ **Heavy Freighter**: 20 slots - High-capacity cargo hauler with 1 weapon slot

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

### Next Phase: Enhancement Features 🔄 PLANNED

#### Autofire System (In Progress)
- ✅ **Autofire Toggle**: \ key enables/disables autofire mode
- 🔄 **Automatic Targeting**: Target selection and range validation
- 🔄 **Priority System**: Closest enemy first targeting

#### Advanced Features (Planned)
- 🔄 **Mission System**: Procedural missions with card rewards
- 🔄 **Trading System**: Station-based card trading
- 🔄 **Ship Purchasing**: Buy new ship types with credits
- 🔄 **Content Expansion**: Additional ship types and card varieties

**✅ IMPLEMENTATION STATUS**: Core system 100% complete and fully integrated into main game.

This specification creates a compelling card collection system that combines the addictive mechanics of Clash Royale with the strategic depth of space combat simulation, while maintaining a clear path to full NFT integration.
>>>>>>> feature/spaceships

