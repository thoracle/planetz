Specification: Integrating Ammo.js into Single-Player Retro Space Shooter
Overview
The retro space shooter is a 3D single-player game using Three.js for rendering, Flask/Python3 for serving static assets or configuration, and Ammo.js (Bullet physics engine port) for physics-based features. This specification outlines the integration of Ammo.js for:
Spatial Tracking and Search: Track and query spaceships, stations, and planets in a 3D sector.

Collision Detection: Enable physics-based collisions for dynamic spaceships.

Weapon Fire Mechanics: Support scan-hit (lasers) and projectile/splash damage (missiles) with physics.

1. Spatial Tracking and Search
Objective: Track and query positions of spaceships (dynamic), stations (static), and planets (static) in a 3D sector for gameplay mechanics like targeting and proximity detection.
Requirements
Entities: Spaceships, stations, and planets with position, orientation, and bounding volumes.

Spatial Data Structure: Use an efficient structure (e.g., octree) for querying nearby entities.

Integration with Ammo.js: Use Ammo.js for bounding volume calculations and spatial queries.

Single-Player: All logic runs client-side; Flask serves static data (e.g., level configurations).

Implementation Details
Ammo.js Setup:
Initialize Ammo.js physics world with zero gravity (btVector3(0, 0, 0)) for space.

Create rigid bodies for entities:
Spaceships: btBoxShape or btSphereShape for collision bounds.

Stations: btCompoundShape for complex static structures.

Planets: btSphereShape with large radius.

Use btDiscreteDynamicsWorld for physics simulation.

Example:
javascript

Ammo().then((AmmoLib) => {
  Ammo = AmmoLib;
  const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
  physicsWorld.setGravity(new Ammo.btVector3(0, 0, 0));
});

Spatial Tracking:
Store entity transforms (position, quaternion) in Ammo.js rigid bodies.

Sync transforms with Three.js Object3D for rendering.

Maintain a JavaScript object mapping rigid bodies to metadata (e.g., type, ID, health).

Spatial Search:
Use an octree (e.g., three-octree or custom) for coarse queries.

For precise queries, use Ammo.js btGhostObject with an AABB to find nearby entities:
javascript

const ghost = new Ammo.btGhostObject();
ghost.setCollisionShape(new Ammo.btBoxShape(new Ammo.btVector3(1000, 1000, 1000)));
ghost.getWorldTransform().setTranslation(playerPosition);
physicsWorld.addCollisionObject(ghost);
const overlaps = [];
for (let i = 0; i < ghost.getNumOverlappingObjects(); i++) {
  overlaps.push(ghost.getOverlappingObject(i).userData);
}
physicsWorld.removeCollisionObject(ghost);
Ammo.destroy(ghost);

Flask Integration:
Flask serves static JSON files for level data (e.g., /static/levels/sector1.json) with entity positions, types, and properties.

Example:
python

from flask import Flask, send_from_directory
app = Flask(__name__)
@app.route('/static/levels/<path:filename>')
def serve_level(filename):
    return send_from_directory('static/levels', filename)

Client fetches level data via fetch:
javascript

fetch('/static/levels/sector1.json')
  .then(response => response.json())
  .then(data => initializeEntities(data.entities));

Performance:
Update physics at 60 Hz to match rendering.

Use btDbvtBroadphase for efficient broad-phase collision detection.

Deactivate distant entities (>5000 units) from physics updates to save CPU.

Deliverables
Ammo.js physics world with entity rigid bodies.

Octree and btGhostObject-based spatial query system.

Flask route for serving static level data.

2. Collision Detection for Dynamic Ships
Objective: Enable physics-based collision detection and response for dynamic spaceships interacting with other ships, stations, and planets.
Requirements
Dynamic Ships: Player and AI-controlled ships with physics-driven movement.

Collision Types: Ship-to-ship, ship-to-station, and ship-to-planet collisions.

Physics Response: Apply damage or bouncing based on collision.

Single-Player: All collision logic is client-side.

Implementation Details
Ammo.js Setup:
Assign btRigidBody to each spaceship with btBoxShape or btSphereShape.

Set mass (e.g., 1000 kg) for dynamic ships; stations/planets have zero mass (static).

Configure restitution (e.g., 0.3) for bouncy collisions.

Example:
javascript

const shape = new Ammo.btBoxShape(new Ammo.btVector3(5, 5, 5));
const transform = new Ammo.btTransform();
transform.setIdentity();
transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
const motionState = new Ammo.btDefaultMotionState(transform);
const inertia = new Ammo.btVector3(0, 0, 0);
shape.calculateLocalInertia(mass, inertia);
const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, inertia);
const rigidBody = new Ammo.btRigidBody(rbInfo);
physicsWorld.addRigidBody(rigidBody);
rigidBody.userData = { type: 'ship', id: entityId, health: 100 };

Collision Detection:
Use Ammo.js btCollisionDispatcher to detect collisions.

Implement a collision callback to process events:
javascript

physicsWorld.setContactPairTestCallback((bodyA, bodyB) => {
  const entityA = bodyA.userData, entityB = bodyB.userData;
  if (entityA.type === 'ship' && entityB.type === 'ship') {
    const impulse = calculateCollisionImpulse(bodyA, bodyB);
    applyDamage(entityA, entityB, impulse);
  }
});

Collision Response:
Calculate damage based on relative velocity and mass (e.g., damage = impulse * 0.1).

Update entity health locally and trigger game events (e.g., explosion if health <= 0).

Optionally apply angular velocity for spinning effects.

Performance:
Disable physics for distant ships (>5000 units) using physicsWorld.removeRigidBody.

Use simplified collision shapes (e.g., spheres) for AI ships to reduce computation.

Deliverables
Ammo.js rigid bodies for dynamic ships with collision detection.

Client-side collision callback for damage application.

3. Weapon Fire Mechanics
Objective: Implement scan-hit (lasers) and projectile/splash damage (missiles) weapons using Ammo.js for physics interactions.
Requirements
Scan-Hit Weapons (Lasers): Instant hit detection via raycasting.

Projectile Weapons (Missiles): Physical projectiles with splash damage on impact.

Physics Integration: Use Ammo.js for projectile motion and collision detection.

Single-Player: All logic is client-side; Flask serves weapon configurations if needed.

Implementation Details
Scan-Hit Weapons (Lasers):
Use Ammo.js raycasting for hit detection, synced with Three.js for visualization.

Perform raycast from weapon origin:
javascript

const rayStart = weaponPosition;
const rayEnd = rayStart.clone().add(direction.multiplyScalar(1000));
const rayCallback = new Ammo.ClosestRayResultCallback(rayStart, rayEnd);
physicsWorld.rayTest(rayStart, rayEnd, rayCallback);
if (rayCallback.hasHit()) {
  const hitBody = rayCallback.get_m_collisionObject();
  const hitEntity = hitBody.userData;
  hitEntity.health -= laserDamage;
  if (hitEntity.health <= 0) triggerExplosion(hitEntity);
}
Ammo.destroy(rayCallback);

Projectile Weapons (Missiles):
Create btRigidBody for each missile with btSphereShape (radius 1).

Set initial velocity and add to physics world:
javascript

const missileShape = new Ammo.btSphereShape(1);
const transform = new Ammo.btTransform();
transform.setIdentity();
transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
const motionState = new Ammo.btDefaultMotionState(transform);
const inertia = new Ammo.btVector3(0, 0, 0);
missileShape.calculateLocalInertia(10, inertia);
const missileBody = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(10, motionState, missileShape, inertia));
missileBody.setLinearVelocity(new Ammo.btVector3(direction.x * 100, direction.y * 100, direction.z * 100));
missileBody.userData = { type: 'missile', damage: 50 };
physicsWorld.addRigidBody(missileBody);

On collision, detect nearby objects for splash damage:
javascript

physicsWorld.setContactPairTestCallback((bodyA, bodyB) => {
  if (bodyA.userData.type === 'missile') {
    const collisionPoint = bodyA.getWorldTransform().getOrigin();
    const explosionShape = new Ammo.btSphereShape(splashRadius);
    const ghost = new Ammo.btGhostObject();
    ghost.setCollisionShape(explosionShape);
    ghost.getWorldTransform().setOrigin(collisionPoint);
    physicsWorld.addCollisionObject(ghost);
    for (let i = 0; i < ghost.getNumOverlappingObjects(); i++) {
      const entity = ghost.getOverlappingObject(i).userData;
      entity.health -= calculateSplashDamage(entity, collisionPoint);
      if (entity.health <= 0) triggerExplosion(entity);
    }
    physicsWorld.removeCollisionObject(ghost);
    physicsWorld.removeRigidBody(bodyA);
    Ammo.destroy(ghost);
    Ammo.destroy(bodyA);
  }
});

Flask Integration:
Flask serves static weapon configurations (e.g., /static/weapons.json) with properties like damage, speed, and splash radius.

Example:
javascript

fetch('/static/weapons.json')
  .then(response => response.json())
  .then(data => initializeWeapons(data.weapons));

Performance:
Cap active missiles (e.g., 50) to prevent physics overload.

Remove missile rigid bodies after collision or timeout (e.g., 5 seconds).

Use simplified raycasting for lasers to minimize CPU load.

Deliverables
Ammo.js raycasting for laser weapons.

Missile rigid bodies with splash damage via ghost objects.

Flask route for serving static weapon configurations.

General Integration Notes
Ammo.js Initialization: Same as above, with zero-gravity physics world.

Sync with Three.js:
Update Three.js objects from Ammo.js transforms each frame:
javascript

physicsWorld.stepSimulation(deltaTime, 10);
for (let entity of entities) {
  const transform = new Ammo.btTransform();
  entity.rigidBody.getMotionState().getWorldTransform(transform);
  const origin = transform.getOrigin();
  entity.threeObject.position.set(origin.x(), origin.y(), origin.z());
  const quaternion = transform.getRotation();
  entity.threeObject.quaternion.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
}

Flask Role:
Serve static assets (e.g., level data, weapon configs) via /static routes.

No real-time communication; all game logic runs client-side.

Error Handling:
Validate loaded JSON data for correct entity/weapon properties.

Clean up Ammo.js objects (e.g., btVector3, btTransform) to prevent memory leaks.

Testing:
Test spatial queries with 100+ entities for performance.

Simulate ship collisions at various speeds to verify damage.

Test laser and missile mechanics with multiple targets for accuracy.

Dependencies
Ammo.js: Include via CDN or npm (ammo.js).

Three.js: For rendering and raycasting (already in use).

Flask: For serving static JSON files (e.g., levels, weapons).

three-octree (optional): For spatial partitioning if not using a custom octree.

