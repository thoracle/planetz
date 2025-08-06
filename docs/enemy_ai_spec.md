Enemy AI Specification
1. Overview
The enemy AI controls the behavior of enemy ships in a 3D space environment. The AI is responsible for navigation, combat, faction-based interactions, and group dynamics using flocking behaviors. Ships operate under a faction system that dictates their relationships with other entities (player, NPCs, or other factions). The AI emphasizes emergent behavior, tactical variety, and responsiveness to create challenging yet predictable encounters that fit the retro aesthetic.
2. Ship Types and Roles
Each ship type has distinct characteristics, roles, and behaviors to create varied gameplay. All ships use a modular AI system with shared components (navigation, combat, faction logic) tailored to their role.  Enemy Ships use the same gear cards as the player to equip their ships. Different ship types have differnt gear loadouts. This provides targetable systems for the players and enemy-ai to choose during combat based on stategies.

Ship Type

Role

Attributes

AI Behavior

Scout

Fast, lightly armed recon ship. Detects threats and reports to patrols.

High speed, low health, weak weapons, high sensors.

Evades combat, prioritizes escape, calls for backup if attacked. Uses hit-and-run tactics if forced to engage.

Light Fighter

Agile combat ship for skirmishes and escorts.

Moderate speed, moderate health, light weapons, good maneuverability.

Aggressive, prioritizes dogfighting, targets weak enemies, retreats if heavily damaged.

Heavy Fighter

Durable combat ship for sustained engagements.

Moderate speed, high health, heavy weapons, moderate maneuverability.

Engages head-on, prioritizes high-threat targets (e.g., player), protects freighters or carriers.

Carrier

Mobile base that launches/retrieves fighters, warps away if threatened.

Low speed, high health, minimal weapons, targetable landing bay.

Deploys fighters, avoids direct combat, warps out if landing bay or hull is critically damaged.

Light Freighter

Lightly armed cargo hauler, often escorted.

Moderate speed, moderate health, light weapons, carries valuable cargo.

Avoids combat, flees if attacked, calls for escorts if available. Drops cargo if desperate.

Heavy Freighter

Heavily armored cargo hauler, critical to faction supply lines.

Low speed, high health, moderate weapons, carries high-value cargo.

Defends itself, relies on escorts, attempts to flee or surrender if overwhelmed.

Targetable Landing Bay (Carrier): The carrier’s landing bay is a weak point with lower health than the main hull. Destroying it prevents fighter launches/retrievals, forcing the carrier to retreat or warp out immediately.

Cargo Mechanics: Freighters may drop cargo containers (lootable by the player) if heavily damaged or when surrendering. Heavy freighters have a higher chance of dropping rare cargo.

3. Faction System
The faction system governs how ships interact with other entities (player, NPCs, or other factions). Each ship belongs to a faction with a disposition toward others, affecting their behavior.
Disposition

Behavior

Friendly

Assists the target if under attack by neutral or hostile ships. Escorts or defends allied ships.

Neutral

Buzzes (flies close to inspect) but does not attack unless provoked. Ignores unless attacked.

Hostile

Attacks on sight, prioritizes high-threat targets (e.g., player or enemy faction ships).

Faction Logic:
Ships check the faction status of nearby entities (within sensor range) every few seconds.

Friendly ships will form defensive formations around allies under attack, prioritizing the protection of freighters or carriers.

Neutral ships perform a “buzz” maneuver: approach within a set distance (e.g., 500 meters), orbit briefly, then resume patrol unless attacked.

Hostile ships engage immediately, using role-specific tactics (e.g., scouts evade, heavy fighters charge).

Faction disposition can shift dynamically (e.g., a neutral ship becomes hostile if attacked by the player).

4. Encounter Types
Enemy ships appear in three encounter types, each with distinct AI group behaviors:
Encounter Type

Composition

AI Behavior

Solo

Single ship (any type).

Operates independently based on role. Scouts flee, fighters engage, freighters evade.

Patrol

2–5 ships (mix of scouts, light/heavy fighters).

Uses flocking for coordinated movement, splits to engage multiple targets if needed.

Formation

6–12 ships (includes freighters or carrier).

Structured hierarchy: fighters escort freighters/carrier, scouts patrol perimeter.

Dynamic Scaling: Encounter size and difficulty scale based on player progression (e.g., stronger ships or larger formations in later game areas).

Carrier Formations: Carriers always spawn with 2–4 fighters in formation. If the carrier’s landing bay is damaged, surviving fighters become more aggressive, losing their retreat option.

5. Flocking and Steering Behaviors
Ships use flocking movement based on Craig Reynolds’ Boid model, adapted for 3D space combat. Each ship follows three core steering behaviors, weighted by ship type and role:
Behavior

Description

Weight by Ship Type

Separation

Avoids crowding other ships to prevent collisions.

High for scouts/light fighters, moderate for others.

Alignment

Matches velocity and orientation with nearby allies for cohesive movement.

High for patrols/formations, low for solo ships.

Cohesion

Moves toward the center of mass of nearby allies to maintain group structure.

High for formations, moderate for patrols, low for solo.

Additional Behaviors:
Pursuit: Chases a target (hostile or neutral for buzzing) using predictive pathing to intercept.

Evasion: Performs evasive maneuvers (barrel rolls, sharp turns) to avoid incoming fire or obstacles.

Orbiting: Used by neutral ships during buzzing or fighters escorting freighters/carriers. Ships maintain a set distance and orbit the target.

Fleeing: Scouts and freighters prioritize fleeing when health drops below a threshold (e.g., 30%). Carriers attempt to warp out if health or landing bay is critical.

Flocking Parameters:
Sensor Range: Determines how far a ship detects allies for flocking (e.g., 1000m for fighters, 2000m for scouts).

Weight Tuning: Each ship type has a unique blend of steering weights to reflect its role (e.g., scouts prioritize separation and evasion, heavy fighters prioritize alignment and pursuit).

Formation Patterns: Formations use predefined patterns (e.g., V-shape for patrols, spherical escort around freighters/carriers) with dynamic adjustments based on combat state.

6. Combat AI
Combat behavior is role-specific but follows a shared decision-making framework:
State Machine:
Idle: Patrols or follows formation path, scans for targets.

Engage: Attacks hostile targets, prioritizes based on threat level (e.g., player > enemy fighters > freighters).

Evade: Performs evasive maneuvers if under heavy fire or low health.

Flee: Attempts to escape to a safe distance or warp out (carriers only).

Buzz: Approaches neutral targets, orbits briefly, then resumes idle state.

Threat Assessment:
Ships evaluate targets based on distance, damage output, and faction status.

Heavy fighters and carriers prioritize high-damage targets (e.g., player or enemy heavy fighters).

Scouts and freighters prioritize evasion over engagement.

Tactical Modifiers:
Flanking: Light fighters attempt to flank targets, attacking from side or rear vectors.

Swarm Tactics: Patrols with multiple light fighters swarm a single target, splitting attention to overwhelm.

Defensive Posture: Heavy fighters and carriers position themselves between allies (e.g., freighters) and threats.

Cooldowns: Weapons have firing cooldowns to prevent spamming, encouraging tactical positioning.

Carrier-Specific Logic:
Launches 1–2 fighters every 30–60 seconds if threats are detected, up to a cap (e.g., 6 active fighters).  There is a cooldown time on respawning fighters after they have been destroyed.

Recalls fighters if no threats remain or if preparing to warp out.

Warps out if health < 20% or landing bay is destroyed, with a 10-second charge-up animation (vulnerable during this period).

7. AI Decision Loop
The AI operates on a finite state machine with periodic updates to balance performance and responsiveness:
Update Frequency: 10–20 Hz for navigation and flocking, 2–5 Hz for faction checks and threat assessment.

Decision Flow:
Sense: Detect nearby entities (allies, enemies, neutrals) within sensor range.

Evaluate: Check faction status, health, and threat levels to determine state (idle, engage, evade, etc.).

Act: Execute steering behaviors, combat actions, or special maneuvers (e.g., buzzing, warping).

Communicate: Share threat data with nearby allies (e.g., scouts report player position to patrols).

8. Implementation Considerations
Performance Optimization:
Use spatial partitioning (e.g., octrees) to limit sensor checks to nearby entities.

Reduce update frequency for distant ships or non-combat states (e.g., idle freighters).

Pool fighter spawns from carriers to avoid instantiation overhead.

Tuning Variables:
Expose steering weights, sensor ranges, and health thresholds to a configuration file for easy balancing.

Allow designers to adjust encounter spawn rates and faction dispositions per game region.

Debugging Tools:
Visualize flocking vectors (separation, alignment, cohesion) in-game for tuning.

Log AI state transitions and faction interactions for debugging erratic behavior.

Retro Aesthetic:
Limit AI complexity to maintain a Star Raiders-like feel: predictable but challenging patterns, avoid overly perfect aim or omniscient behavior.

Use visual cues (e.g., carrier warp charge-up glow, fighter launch animations) to telegraph AI actions to the player.

9. Example Scenarios
Solo Scout Encounter:
A scout detects the player (neutral faction), buzzes them by orbiting at 500m, then resumes patrol. If the player attacks, the scout evades and calls a nearby patrol (2 light fighters) for backup.

Patrol Ambush:
A patrol of 3 light fighters and 1 heavy fighter detects the player (hostile). Light fighters swarm and flank, while the heavy fighter engages head-on. If a light fighter’s health drops below 30%, it attempts to flee.

Carrier Convoy:
A carrier, 2 heavy fighters, and 1 light freighter move in formation. The player attacks the freighter (hostile). The carrier launches 2 light fighters, heavy fighters defend the freighter, and the carrier prepares to warp out if its landing bay takes 50% damage.

10. Extensibility
Future Features:
Add rare “ace” pilots with unique behaviors (e.g., advanced flanking, taunting comms).

Introduce faction-specific traits (e.g., pirate factions prioritize looting, military factions use rigid formations).

Support dynamic events (e.g., distress calls from freighters spawning reinforcements).


Allow custom formation patterns via configuration files.

This spec provides a robust foundation for enemy AI that balances tactical depth, retro simplicity, and emergent group dynamics. Let me know if you need further details, such as specific pseudocode for flocking algorithms, combat decision trees, or integration with a particular game engine!

Explain flocking behaviors

Flocking behaviors are a set of rules used to simulate the natural, coordinated movement of groups of entities, like birds, fish, or, in your case, enemy ships in a space shooter game. They create the illusion of intelligent group movement without requiring complex individual decision-making. The concept was formalized by Craig Reynolds in 1986 with his "Boids" model, which is widely used in games and simulations. Below, I’ll explain the core flocking behaviors, their application to your retro space shooter’s enemy AI, and how they integrate with the ship types and faction system you described.
Core Flocking Behaviors
Flocking is driven by three primary steering behaviors that each entity (ship) calculates based on its neighbors within a defined sensor range (e.g., 1000–2000 meters for your ships). These behaviors are combined with weighted priorities to produce smooth, cohesive group movement in 3D space.
Separation:
Purpose: Prevents ships from colliding or crowding each other.

How it Works: Each ship calculates a repulsion vector away from nearby allies that are too close (within a defined "personal space" radius, e.g., 100 meters). The closer the neighbor, the stronger the repulsion.

Formula (Simplified): For each neighbor within the separation radius, compute a vector pointing away from the neighbor, scaled inversely by distance (e.g., force = (position - neighbor_position) / distance).

Game Application:
Scouts and light fighters prioritize separation to maintain agility and avoid clustering during dogfights.

Heavy fighters and freighters have lower separation weights, as they’re less agile and can tolerate closer proximity.

Prevents unrealistic pile-ups, especially in tight formations or when evading attacks.

Alignment:
Purpose: Ensures ships move in the same general direction and speed as their allies, creating coordinated group movement.

How it Works: Each ship calculates the average velocity (direction and speed) of nearby allies within its sensor range and adjusts its own velocity to match.

Formula (Simplified): Compute the average velocity of neighbors (avg_velocity = sum(neighbor_velocities) / count) and steer toward it (steering = avg_velocity - current_velocity).

Game Application:
High alignment weight for patrols and formations to maintain V-shapes or escort patterns (e.g., fighters protecting a freighter).

Scouts have lower alignment weight when solo, allowing erratic, evasive movement.

Reinforces the retro aesthetic by creating predictable but visually appealing group patterns, like Star Raiders enemy squadrons.

Cohesion:
Purpose: Keeps the group together by pulling ships toward the center of mass of nearby allies.

How it Works: Each ship calculates the average position of neighbors within sensor range (the "center of mass") and steers toward it.

Formula (Simplified): Compute the center of mass (center = sum(neighbor_positions) / count) and steer toward it (steering = center - current_position).

Game Application:
High cohesion for carrier-led formations to keep fighters and freighters tightly grouped.

Lower cohesion for patrols, allowing more flexible spacing during combat.

Ensures freighters stay near escorts and carriers don’t drift too far from their fighters.

Additional Steering Behaviors for Combat
To adapt flocking for your space shooter’s combat scenarios, additional behaviors complement the core trio, tailored to ship roles and faction interactions:
Pursuit:
Purpose: Allows ships to chase hostile targets (e.g., the player or enemy faction ships).

How it Works: Ships predict the target’s future position based on its current velocity and steer toward that point, rather than the target’s current position.

Game Application:
Light fighters use pursuit for aggressive dogfighting, aiming to intercept the player.

Heavy fighters combine pursuit with alignment to maintain formation while engaging.

Scouts use pursuit sparingly, only when forced to engage.

Evasion:
Purpose: Helps ships avoid incoming fire, obstacles, or superior threats.

How it Works: Ships calculate a vector away from the threat (e.g., incoming projectiles or a high-damage enemy) and perform randomized maneuvers (e.g., barrel rolls, sharp turns).

Game Application:
Scouts and freighters prioritize evasion when health drops below 30%, using high separation to break away from groups.

Light fighters use evasion during hit-and-run tactics, dodging while repositioning for attacks.

Orbiting:
Purpose: Enables ships to circle a target, used for buzzing neutrals or escorting allies.

How it Works: Ships maintain a fixed distance (e.g., 500 meters for buzzing) and steer to follow a circular path around the target, combining cohesion (to stay near) and separation (to avoid collision).

Game Application:
Neutral ships buzz the player by orbiting briefly before resuming patrol.

Fighters escorting freighters or carriers orbit at a set distance, adjusting for combat threats.

Integration with Ship Types and Faction System
Each ship type uses a unique blend of these behaviors, tuned via weights to reflect its role and faction dynamics. Below is how flocking behaviors are applied to your ship types:
Ship Type

Separation

Alignment

Cohesion

Pursuit

Evasion

Orbiting

Scout

High (agile, avoids clustering)

Low (independent when solo)

Low (solo or loose patrols)

Low (prefers evasion)

High (evades when threatened)

High (buzzing neutrals)

Light Fighter

High (maintains agility)

Moderate (coordinates in patrols)

Moderate (stays with group)

High (aggressive dogfighting)

Moderate (dodges in combat)

Moderate (escorts or buzzes)

Heavy Fighter

Moderate (tolerates proximity)

High (maintains formation)

High (protects allies)

High (engages head-on)

Low (tanks damage)

Low (rarely orbits)

Carrier

Low (large, slow)

Moderate (leads formation)

High (keeps fighters close)

None (avoids combat)

Moderate (warps out)

None (no orbiting)

Light Freighter

Moderate (avoids escorts)

Moderate (stays with escorts)

High (needs protection)

None (avoids combat)

High (flees when attacked)

None (no orbiting)

Heavy Freighter

Low (bulky, slow)

Moderate (stays with escorts)

High (needs protection)

Low (defends self)

Moderate (flees or surrenders)

None (no orbiting)

Faction Influence:
Friendly: Ships increase cohesion and alignment to defend or escort allies under attack, forming tighter formations.

Neutral: Ships use orbiting for buzzing, with high separation to avoid accidental collisions with the player or other neutrals.

Hostile: Ships prioritize pursuit and reduce cohesion to spread out and flank targets, creating chaotic but tactically engaging battles.

Implementation Details
Sensor Range: Each ship has a sensor radius (e.g., 1000m for fighters, 2000m for scouts) to detect neighbors for flocking and targets for combat. Only ships within this range influence steering calculations.

Weight Blending: Behaviors are combined using normalized weights (e.g., separation: 0.4, alignment: 0.3, cohesion: 0.2, pursuit: 0.1). Weights adjust dynamically based on state (e.g., increase evasion weight when health < 30%).

3D Space Adaptation: Unlike 2D boids, ships operate in 3D. Steering vectors are calculated in 3D space, with roll, pitch, and yaw adjustments to maintain orientation (retro aesthetic: avoid overly smooth turns, use sharp, jerky motions for fighters).

Performance Optimization:
Use spatial partitioning (e.g., octrees) to limit neighbor checks to nearby ships.

Cap the number of neighbors considered (e.g., 5–10 closest allies) to reduce CPU load.

Update flocking calculations at 10–20 Hz, with lower frequency (2–5 Hz) for non-combat states.

Formation Patterns:
Patrols use V-shape or line formations, with scouts at the edges and heavy fighters at the center.

Carrier formations use a spherical escort pattern, with fighters orbiting at fixed distances.

Freighter convoys position escorts in a cylindrical pattern around the freighter.

Example in Action
Patrol Encounter: A patrol of 3 light fighters and 1 heavy fighter detects the player (hostile). The light fighters use high pursuit and separation to swarm and flank, performing evasive rolls when targeted. The heavy fighter uses high alignment and cohesion to stay centered, engaging head-on. If the player damages a light fighter, its evasion weight increases, causing it to break formation and flee.

Carrier Formation: A carrier with 2 heavy fighters and 1 light freighter moves in a tight formation (high cohesion). The heavy fighters orbit the freighter and carrier, using moderate alignment to maintain a spherical pattern. If the player attacks, the carrier launches up to 3 light fighters, which use pursuit to chase the player while maintaining loose cohesion with the group.

Neutral Buzz: A scout (neutral) detects the player, uses orbiting to approach and circle at 500m, then resumes patrol with low alignment and cohesion, as it’s not part of a group.

Challenges and Solutions
Challenge: Ships getting stuck or over-correcting in tight spaces (e.g., near asteroids).
Solution: Add an obstacle avoidance behavior that applies a strong repulsion vector when detecting terrain or debris within a short range (e.g., 200m).

Challenge: Balancing flocking with combat so ships don’t feel robotic or overly predictable.
Solution: Introduce randomization in steering weights (e.g., ±10% variance) and occasional “personality” quirks (e.g., a light fighter briefly breaks formation to perform a risky flank).

Challenge: Retro aesthetic vs. modern smoothness.
Solution: Use discrete, snappy movements (e.g., quantized turn angles) for fighters and scouts to mimic Star Raiders, while carriers and freighters move more ponderously.

Extensibility
Custom Formations: Allow designers to define new formation patterns (e.g., wedge, diamond) via configuration files.

Dynamic Weights: Enable ships to adjust flocking weights based on combat intensity (e.g., increase separation during heavy fire).

Faction-Specific Flocking: Add faction traits, like pirate ships using looser, chaotic formations or military ships using rigid, grid-like patterns.

