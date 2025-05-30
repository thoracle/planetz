Weapons System Specification
1. Overview
The weapons system allows players to equip weapons to their ship via a card-based drag-and-drop interface, select active weapons using [, ] keys, fire them with the Enter key, and toggle autofire mode with the \ key. Weapons are categorized into two types: Scan-Hit (direct-fire energy weapons) and Splash-Damage (area-effect projectiles). Each weapon has attributes like damage, cooldown, range, and special properties (e.g., autofire compatibility, homing for missiles).
2. Weapon Slot and Card System Integration
Weapon Slots: Ships have a fixed number of weapon slots (e.g., 2–6, depending on ship class). Each slot can hold one weapon card dragged from the player’s inventory. Players can drive multiple copies of the same card to different slots.  ex: can drag the same "Laser Turret" card to three different weapon slots.

Card Properties: Each weapon card defines:
Weapon Type: Scan-Hit (e.g., laser cannon, plasma cannon) or Splash-Damage (e.g., missile, torpedo, mine).

Damage: Base damage value (e.g., 50 for laser, 200 for missile).

Cooldown: Time (in seconds) before the weapon can fire again (e.g., 0.5s for laser, 3s for torpedo). A value of 0 means no cool-down for this weapon and no cool-down indicator shown.

Range: Maximum engagement distance (e.g., 1000m for laser, 3000m for missile).

Autofire Property: Boolean (true/false) indicating if the weapon can fire in autofire mode. Available on higher level weapons.

Special Properties (type-specific):
Scan-Hit: Accuracy (chance to hit, e.g., 95%), energy cost (if tied to ship’s power system).

Splash-Damage: Blast radius (e.g., 50m for missile), homing capability (for higher-level missiles), target lock requirement.

Level/Tier: Higher-tier weapons have improved stats (e.g., higher damage, shorter cooldown, homing for missiles, autofire mode for turrets).

Card Visuals: Cards display key stats (damage, cooldown, range, type) and visual indicators (e.g., laser icon for Scan-Hit, explosion icon for Splash-Damage).

3. Weapon Selection Mechanic
Active Weapon Selection:
Players use the [ key to cycle to the previous weapon slot and the ] key to cycle to the next weapon slot.

Only one weapon slot is active at a time for manual firing.

Visual feedback: The active slot is highlighted in the ship’s HUD (e.g., a glowing border around the slot in the UI).

If no weapons are equipped, pressing Enter displays a message: “No weapons equipped.”

Slot Cycling:
Slots are numbered (e.g., Weapon 1, Weapon 2, …). Cycling wraps around (e.g., from Weapon 1 to last slot with [ or from last slot to Weapon 1 with ]).

Empty slots are skipped during cycling, ensuring only equipped weapons are selectable.

Firing:
Pressing the Enter key fires the currently selected weapon, provided it’s not in cooldown.

If the weapon is in cooldown, display a HUD cooldown bar and message (e.g., “{weapon_name} cooling down: 1.2s”).

For Splash-Damage weapons requiring a target (e.g., missiles), firing is disabled unless a valid target is locked, with a HUD message: “Target lock required.”

4. Autofire Mode
Toggle: Pressing the \ key toggles autofire mode on/off.
HUD indicator: Shows “Autofire: ON” or “Autofire: OFF” when toggled if weapon supports autofire.

Behavior:
When autofire is ON, all equipped weapons with the autofire property set to true attempt to fire automatically, provided:
The weapon is not in cooldown.

For Splash-Damage weapons, a valid target lock exists and the target is within engagement range.

Autofire prioritizes the closest valid target within range, based on the ship’s targeting system.

Scan-Hit weapons in autofire mode fire continuously (or at their cooldown rate) at the locked target.

Splash-Damage weapons (e.g., missiles) fire at their cooldown rate, respecting target lock and range requirements.

Manual Firing in Autofire Mode:
Players can still manually fire the selected weapon with Enter, even if autofire is ON, allowing mixed control (e.g., manually firing a missile while lasers autofire).

5. Weapon Types and Mechanics
(a) Scan-Hit Weapons
Description: Direct-fire energy weapons that hit instantly upon firing, requiring line-of-sight to the target.

Examples:
Laser Cannon: High accuracy (95%), low damage (50), short cooldown (0.5s), medium range (1000m), autofire: true.

Plasma Cannon: Moderate accuracy (80%), high damage (120), longer cooldown (1.5s), medium range (800m), autofire: true.

Mechanics:
Fires a straight-line projectile or beam that hits the target instantly (raycast-based).

Damage is applied to a single target, modified by accuracy (e.g., 95% chance to hit).

If tied to a power system, each shot consumes energy (e.g., 10 energy per laser shot).

Cooldown applies after each shot (or continuous for zero-cooldown weapons).

In autofire mode, fires at the locked target as soon as cooldown expires.

(b) Splash-Damage Weapons
Description: Projectile-based weapons that deal area-of-effect damage, often requiring a target lock.

Examples:
Missile (Standard): High damage (200), long cooldown (3s), long range (3000m), blast radius (50m), target lock required, autofire: false.

Homing Missile (High-Tier): High damage (250), medium cooldown (2s), long range (3500m), blast radius (60m), homing capability, target lock required, autofire: true.

Torpedo: Very high damage (400), very long cooldown (5s), medium range (2000m), large blast radius (100m), no homing, target lock required, autofire: false.

Mine: Moderate damage (150), long cooldown (4s), short range (500m), large blast radius (80m), no target lock (deploys in place), autofire: false.

Mechanics:
Standard Missiles/Torpedoes: Fire in a straight line toward the locked target. If no homing, they miss if the target moves out of the projectile’s path.

Homing Missiles: Automatically track the locked target within a defined arc (e.g., ±45°). Higher-tier missiles have better tracking (e.g., ±90° arc, faster turn rate).

Mines: Deploy at the ship’s location and detonate when an enemy enters the blast radius or after a timer (e.g., 10s).

Target Lock:
Players must lock onto a target using the ship’s targeting system (e.g., press T to lock the nearest enemy).

Homing missiles require a lock but continue tracking even if the target is changed mid-flight.  Missiles have a flight range not to be confused with target range.  When the flight range is reached by the missile it detonates.

Engagement Range: Weapons only fire (manually or autofire) if the target is within the weapon’s range.

Blast Radius: Damage is applied to all targets within the radius, with falloff (e.g., 100% damage at center, 25% at edge based on specific weapon properties).

Cooldown: Applies after firing, preventing immediate re-fire.

6. Example Weapon Cards
Name

Type

Damage

Cooldown

Range

Autofire

Special Properties

Laser Cannon

Scan-Hit

50

0.5s

1000m

True

95% accuracy, 10 energy/shot

Plasma Cannon

Scan-Hit

120

1.5s

800m

True

80% accuracy, 20 energy/shot

Standard Missile

Splash-Damage

200

3s

3000m

False

50m blast radius, target lock required

Homing Missile

Splash-Damage

250

2s

3500m

True

60m blast radius, homing, target lock

Torpedo

Splash-Damage

400

5s

2000m

False

100m blast radius, target lock

Proximity Mine

Splash-Damage

150

4s

500m

False

80m blast radius, no lock, 10s timer

7. Technical Implementation Notes
Weapon Selection:
Maintain an array of equipped weapon slots (weaponSlots[]).

Track the active slot index (activeSlot).

On [ press, decrement activeSlot (skip empty slots); on ] press, increment activeSlot.

On Enter press, call weaponSlots[activeSlot].Fire() if not in cooldown.

WeaponSlots will need to recalucated on undocking if the player swaps out weapons at a space station

Autofire:
Store autofire state (isAutofireOn: boolean).

On \ press, toggle isAutofireOn.

In the game’s update loop, if isAutofireOn, iterate through weaponSlots and call Fire() on each weapon where autofire == true, not in cooldown, and target conditions (lock, range) are met.

Cooldown:
Each weapon has a cooldownTimer (float). After firing, set to the weapon’s cooldown value and decrease by deltaTime each frame. Fire only if cooldownTimer <= 0.

Target Lock:
Use current target set by the targeting computer system. Check range and lock status before firing Splash-Damage weapons.

Homing missiles update their trajectory each frame to follow lockedTarget (using a steering algorithm, e.g., proportional navigation).

HUD:
Display active weapon highlight, next and previous weapon icons, and cooldown bars.

Show autofire status and target lock indicators.

Balancing:
Adjust damage, cooldown, and range to balance Scan-Hit (consistent, low damage) vs. Splash-Damage (high damage, situational).

Higher-tier weapons (e.g., homing missiles) should be rare or expensive to maintain progression.

8. Player Experience
Gameplay Flow:
Players equip weapons via drag-and-drop, cycle through them with [ ], and fire manually with Enter.

Toggle autofire with \ for hands-off combat, especially for Scan-Hit weapons like lasers.

Lock targets for missiles/torpedoes, with higher-tier homing missiles simplifying engagements.

Mines offer tactical options (e.g., deploying in chokepoints).

Feedback:
Visual: Weapon muzzle flash, missile trails, explosion effects for Splash-Damage.

Audio: Distinct sounds for lasers (pew-pew), plasma (deep hum), missiles (whoosh), explosions.

HUD: Clear indicators for active weapon, cooldown, autofire status, and target lock.

9. Future Considerations
Upgrades: Allow weapon cards to be upgraded (e.g., reduce cooldown, increase damage) via in-game resources.

Ammo: game does not support consummable items like ammo.  Weapon use is gated instead by cooldowns.

Enemy AI: Enemies use similar ship systems and weapon mechanics, with autofire for drones and homing missiles for advanced foes.

