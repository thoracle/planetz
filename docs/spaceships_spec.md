## Design Specification: Upgradable and Damageable Spaceship Feature for Space Shooter Game

### Overview
The spaceship feature allows players to pilot one of five distinct ship types, inspired by Elite, Privateer, and Freelancer, with upgradable and damageable systems. Players fly one ship at a time, upgrading systems to enhance performance and tailoring it to their playstyle. Nine critical systems can take damage, impacting gameplay, with limited in-space repair capabilities and full repairs available at space stations. A damage report screen provides real-time system status. The system emphasizes strategic trade-offs in upgrades, repairs, and ship roles, balancing speed, firepower, armor, and cargo capacity.

#### Overview
We will employ a gear based progression system where players define their ship through sloted NFT item cards. These cards, collected from loot drops and missions or traded on marketplaces like OpenSea, are equipped in their ships slots. An item card collection supports flexible build loadouts. The game uses a stacking inventory and skips skill trees, focusing on accessibility and gear based progression while avoiding inventory tetris and a trashy economy where the player has to throw out items he can't fit in his inventory.  

#### Card Types and Abilities
- **Card Definition**: NFT item cards with stats, abilities, and XP level/faction prerequisites.
- **Ability Types**:
  - **Passive Abilities**: Constant boosts applied when equipped (ex: Shield Generator grants +50 Shield Boost when installed.  Doesn't require any action on the players part beyond installing the gear card in a slot).
  - **Active Abilities**: Abilities invoked in combat/exploration.  ex: Laser Cannon, Player installs the laser gear card in an open slot, the weapon is now shown and he presses the space button to fire it.
  - XP and Faction prerequisites are checked before an item can be installed. This will be a post-MVP feature addition.

## Card Collecting and Upgrades
- Gear is upgraded by collecting multiple version of the same card associated with the gear.
- Once the required number of cards are collected the card's upgrade option is made available.
- Upgrades require a set amount of in-game credits.
- Once gear is upgrades it's stats and capabilities increase to match the new level of the gear.

## Hardpoint Slots
- Ship types come in different chasis types that determine the number of hard points available.  Different gear cards can be slotted into the these hard points to customize the look and capability of each ship.
- Slots don't have any pre-assigned type and can accept any type of gear card.
- Builds are tested against some basic rules to prevent broken builds.  Ships that fail these rule checks can not be launched into space until gear is swapped to pass the checks.  ex: Ship must have at least one engine card slotted.

## NFT Card HUD
- We will use a stacking inventory design where all cards of the same type stack in a single slot.  This does imply that we can not support socketed item design.
- We will use a pokedex like design where we flag some of these card stacks to be locked and greyed out until the player finds the first card of this type.  Advanced cards will be mystery stacks that are not revealed until the player finds the first card of this type.
- The main use of this UI will be to drag and drop NFT cards to and from the ship slots ui.
- NFT Trading is handled via external websites like OpenSea and not a feature that we need to support in-game.
- Crypto Wallet support will be delayed until post MVP.

##Core Ship Types
- Based on the above chasis, slots and card collections we have the functionality needed to create different ship in a data driven fashion. 
-Five ship classes offer distinct roles, with base stats reflecting their strengths and weaknesses. Players select one ship to pilot, with options to purchase or unlock others.

#Scout
Role: Fast, agile recon vessel for exploration, evasion and stealth attacks.

Base Stats:
Speed: High (90/100)

Armor: Low (20/100)

Firepower: Low (30/100)

Cargo Capacity: Very Low (10 units)

Hardpoints: Very low (2 hard points)

Description: Prioritizes speed and maneuverability for hit-and-run tactics and scouting. Weak in durability and cargo.

Playstyle: Suited for players valuing speed and exploration over combat or trading.

# Light Fighter
Role: Balanced combat vessel for dogfights and skirmishes.

Base Stats:
Speed: Medium-High (70/100)

Armor: Medium-Low (40/100)

Firepower: Medium (60/100)

Cargo Capacity: Low (20 units)

Hardpoints: Low (5 hard points)

Description: Versatile fighter with decent firepower and agility, limited in cargo and armor.

Playstyle: Ideal for dogfighting and tactical combat.

# Heavy Fighter
Role: Durable combat ship for prolonged engagements.

Base Stats:
Speed: Medium-Low (50/100)

Armor: High (80/100)

Firepower: High (80/100)

Cargo Capacity: Low (15 units)

Hardpoints: Medium (8 hard points)

Description: Built for sustained combat with strong weapons and armor, sacrificing speed and cargo.

Playstyle: Suited for players who prefer tanking damage and heavy firepower.

#Light Freighter
Role: Versatile trading vessel with moderate combat capability.

Base Stats:
Speed: Medium (60/100)

Armor: Medium (50/100)

Firepower: Medium-Low (40/100)

Cargo Capacity: Medium-High (80 units)

Hardpoints: Low (6 hard points)

Description: Balances cargo capacity with defensive and offensive capabilities.

Playstyle: Appeals to traders needing some combat ability.

# Heavy Freighter
Role: High-capacity trading vessel for bulk cargo.

Base Stats:
Speed: Low (30/100)

Armor: Medium-High (70/100)

Firepower: Low (20/100)

Cargo Capacity: Very High (150 units)

Hardpoints: High (10 hard points)

Description: Maximizes cargo hauling with strong armor but minimal speed and firepower.

Playstyle: Best for trading and logistics, relying on escorts or defenses.

## Upgradable Systems
Each ship has five upgradable systems, allowing customization within its role. Upgrades are purchased, looted or traded and installed at space stations or shipyards. Upgrades have rarity (Rare, Legendary, Mythic) with increasing costs and benefits, consuming power and slots.

# Engines (Impulse Engines)
Function: Affects sublight speed and maneuverability.

Upgrade Options:
Level 2 Thrusters: +10% speed, +5% maneuverability.

Level 3 Thrusters: +20% speed, +10% maneuverability.

Level 4 Thrusters: +30% speed, +15% maneuverability.

Level 5 Thrusters: +40% speed, +25% maneuverability.

Trade-offs: Higher-level engines increase energy consumption, reducing power for weapons or shields.


# Laser Weapons
Function: Primary line of sight attack.

Upgrade Options:
Level 2 Weapons: Standard lasers, moderate damage, low energy cost.

Level 3 Weapons: Laser cannons, high damage, moderate energy cost.

Level 4 Weapons: Laser Turrets, very high damage, high energy cost.

Level 5 Weapons: Double fire Laser Turrets, very high damage, very high energy cost.

Trade-offs: High-damage weapons reduce energy for shields or engines; freighters have fewer slots (2-3 vs. 4-6 for fighters).


# Missile Tubes
Function: Longer range, explosive splash damage. Use consumable ammo instead of energy.

Upgrade Options:
Level 2 Missile Tubes: Can fire up to Standard Missile, moderate damage, low ammo cost, short range.

Level 3 Missile Tubes: Can fire up to Extended Missile, high damage, moderate ammo cost, medium range.

Level 4 Missile Tubes: Can fire up to Homing Missile, very high damage, high ammo cost, long range.

Level 5 Missile Tubes: Can fire up to Unjammable Homing Missile, very high damage, high ammo cost, very long range.

Trade-offs: Use consumable ammo for weapons, must restock when ammo is used up.

Constraints: Missile Tubes are a separate slot type, limited to 1-2 for fighters, 0-1 for freighters.

# Shields (Deflector Shields)
Function: Absorbs damage before hull/armor is affected.

Upgrade Options:
Level 2 Shields: 1000 HP, slow recharge.

Level 3 Shields: 2000 HP, moderate recharge.

Level 4 Shields: 3000 HP, fast recharge.

Level 5 Shields: 5000 HP, very fast recharge.

Trade-offs: Stronger shields require more shield generators installed in hard points, active shields drain energy.

Constraints: Based on number of hard points Heavy Fighters and Freighters support higher-level shields; Scouts have lower capacity.

# Armor (Hull Plating)
Function: Reduces damage to hull after shields are depleted.

Upgrade Options:
Level 2 Plating: +10% damage resistance.

Level 3 Plating: +20% damage resistance.

Level 4 Plating: +30% damage resistance.

Level 5 Plating: +50% damage resistance.

Trade-offs: Heavier armor reduces speed and maneuverability.

Constraints: Amount of plating limited by Hard points Heavy Fighters and Freighters equip higher amount of armor; Scouts are limited to very little plating.

Cargo Hold
Function: Increases cargo capacity for trading or mission items.

Upgrade Options:
Level 2 Hold: +20 units.

Level 3 Hold: +50 units.

Level 4 Hold: +100 units.

Level 5 Hold: +200 units.

Trade-offs: Larger holds reduce speed and increase energy costs for shields or engines.

Constraints: Restricted by number of hard-points. Freighters equip higher number of holds; Fighters and Scouts are capped at lower amounts.

## Damageable Systems
Targetable systems can take damage, affecting gameplay. Damage is tracked as a percentage (0% = fully functional, 100% = disabled), with partial damage reducing effectiveness proportionally.

#Impulse Engines
Function: Controls sublight speed and maneuverability.

Damage Effect:
Reduces speed and maneuverability (e.g., 50% damage = 50% speed reduction).

At 100% damage, ship moves at 10% base speed.

Gameplay Impact: Hinders evasion and pursuit, critical for Scouts and Light Fighters.

#Warp Drive
Function: Enables faster-than-light travel between systems.

Damage Effect:
Increase warp cost and increases warp cool-down time (e.g., 50% damage = 50% more costly warp).

At 100% damage, warp travel is disabled.

Gameplay Impact: Limits long-distance travel, affecting trading and exploration.

#Long Range Scanner
Function: Detects distant objects in the solar system, enemies, or points of interest.

Damage Effect:
Reduces scan range and accuracy (e.g., 50% damage = 50% scan range).

At 100% damage, long range scanner does not function.

Gameplay Impact: Hampers exploration and threat detection, critical for Scouts.

#Subspace Radio
Function: Provides updates to ship movment and distress calls.

Damage Effect:
Corrupts Galactic Chart data, reducing visibility (e.g., 50% damage = partial map fog).

At 100% damage, Galactic Chart is no longer updated, forcing manual navigation.

Gameplay Impact: Limits tactical awareness and reception range of distress calls, affecting all playstyles.

#Targeting Computer
Function: Enhances weapon accuracy and lock-on for guided missiles, detects range to target.

Damage Effect:
Reduces accuracy and lock-on speed of missiles (e.g., 50% damage = 50% accuracy penalty).

At 100% damage, guided missiles cannot home and become line of sight.

Gameplay Impact: Weakens combat effectiveness, critical for Fighters.


#Missile Tubes
Function: Fires guided or unguided missiles.

Damage Effect:
Reduces firing rate or capacity (e.g., 50% damage = 50% slower reload).

At 100% damage, missile tubes are inoperable.

Gameplay Impact: Reduces burst damage, significant for Heavy Fighters.

#Laser Weapons
Function: Primary line of sight weapon systems (lasers, plasma cannons, etc.).

Damage Effect:
Reduces damage output and firing rate (e.g., 50% damage = 50% reduced damage).

At 100% damage, laser weapons are disabled.

Gameplay Impact: Cripples combat capability, critical for Fighters.

#Deflector Shields
Function: Absorbs incoming damage before hull/armor.

Damage Effect:
Reduces shield capacity and recharge rate (e.g., 50% damage = 50% shield HP).

At 100% damage, shields are offline.

Gameplay Impact: Increases vulnerability, especially for Heavy Fighters and Freighters.

## Damage Mechanics
Damage Sources: Systems take damage from enemy weapons, collisions, environmental hazards (e.g., radiation, asteroids), or critical hits (5% chance per hull hit, dealing 10-20% damage to a specific system).

Damage Application:
Damage is distributed randomly across systems when hull is hit after shields are depleted.

Environmental hazards may target specific systems (e.g., radiation damages Warp Drive, Scanner).

Status Tiers:
0-25% Damage: Minor impairment, slight performance reduction.

26-50% Damage: Moderate impairment, noticeable performance drop.

51-75% Damage: Severe impairment, significant functionality loss.

76-100% Damage: Critical impairment, system barely functional or disabled.

Feedback: Visual cues (e.g., camera shake, sparking consoles) and audio (e.g., warning alarms) indicate damage.

Repair Mechanics
In-Space Repairs:
Method: Players use “Nanobot Repair Kits” (consumable items) to restore 10-25% system health (based on kit quality: Level 1-5).

Limitations:
Players carry number of nanobot repair kits depending on cargo capacity.

Repairs consume kits, the repairs are prioritized via Damage Control HUD with a set of sliders in a callback to Star Trek. Divert more kits to repair lasers instead of shields.  This creates opportunities for tactile decisions around what to repair first.

Acquisition: Kits are purchased, looted, or traded.

Trade-offs: Kits compete with cargo space, forcing prioritization.

Station Repairs:
Method: Docking at a station allows full rapid repairs for credits.

Mechanics:
Costs scale with damage severity and ship class (e.g., Heavy Freighter repairs are pricier).

Full repairs take 1-5 minutes, with instant repair options for extra credits.

Some stations require better faction reputation for rapid repair access.  

Strategic Considerations: Players must balance using limited kits in space or docking for full repairs, prioritizing systems based on mission needs.

Damage Report Screen
Purpose: Displays real-time status of all damageable systems and manages repairs.

Layout:
System List: Lists all Targetable systems with:
Name, icon, and health bar (0-100%, color-coded: red = 0-25%, orange = 26-50%, yellow = 51-75%, green = 76-100%).

Performance penalty (e.g., “Impulse Engines: 40% healthy, -60% speed”).

Repair Interface:
Sliders to prioritize Repair Kits per system.

Timer/progress bar for in-space repairs via consumption of repair kits.

Station repair cost and time estimates when docked.

Alerts: Scrolling ticker tap for notification of damage type and damage %.

Visuals: 3D ship schematic highlighting damaged systems; tooltips explain functions and effects.

Access: Toggle Damage Control view by pressing D key.

Feedback: Audio cues (e.g., “Warning: Shields Critical”) and visual effects (e.g., flickering HUD).

Upgrade and Damage Integration
Upgrades Impact Damage:
Higher-tier systems (e.g., Level 4 Shields) have more health (e.g., +20% base durability) but are costlier to repair.

Damaged systems reduce upgrade effectiveness (e.g., 50% damaged Level 4 Thrusters perform like Level 2 Thrusters).

Repair Costs: Upgraded systems cost more to repair (e.g., Level 4 Shields = 2x Level 2 Shield repair cost).

Upgrade Mechanics
Acquisition: Upgrades are purchased, looted, or traded.

Installation: Requires shipyard, takes 1-5 minutes or credits to fast-track.

Progression: Higher level upgrades are locked behind player level, faction reputation, or missions.

##Customization: Players can save loadouts for quick swapping.

Balance Considerations
Trade-offs: Upgrades enhance one system at the cost of others (e.g., maxed engines reduce weapon output). Damage forces further prioritization.

Economy: Upgrade and repair costs scale with gear level and ship class.

Gameplay Impact: Upgrades and repairs enhance mission viability but preserve ship role identity (e.g., Scouts can’t become tanks).

Damage Balance: Systems like Warp Drive or Shields are critical, making their damage high-stakes but not game-ending.

##User Interface
#Ship Management Screen:
Displays differnt ships available, stats, equipped upgrades, slots and damage status per system.

Drag-and-drop for upgrades; repair options for damaged systems.

Visual indicators for trade-offs and damage.

Upgrade Market:
Lists upgrades with stats, costs, and compatibility; filters by ship class, system, or tier.

Damage Report Screen: As described above, integrated into the ship management menu.

Feedback: Tooltips explain trade-offs, damage effects, and repair options.

Technical Notes
Data Structure: Ship stat block (JSON) includes base stats, slots and system health. Upgrades and damage modify values dynamically.

Balancing: Use formulas (e.g., Speed = BaseSpeed × (1 + EngineBonus - ArmorPenalty - DamagePenalty)).

Storage: Save ship configurations, upgrades, and damage status in the game database.

Testing: Ensure upgrades and damage don’t break ship roles; test repair balance for accessibility.

##Future Considerations
Modularity: Add cosmetic upgrades or faction-specific parts.

Dynamic Events: Rare upgrades or repair kits via limited-time missions.

Cross-Ship Progression: Allow upgrade transfers between ships with conversion costs.

Environmental Hazards: Expand hazard types (e.g., EMPs targeting Targeting Computer) for variety.

This specification integrates upgradable and damageable systems, creating a dynamic, strategic experience that aligns with the spirit of Elite, Privateer, and Freelancer.

