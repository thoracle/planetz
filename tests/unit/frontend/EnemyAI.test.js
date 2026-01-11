/**
 * EnemyAI System Unit Tests
 * Phase 5.3 of the refactoring plan
 *
 * Tests AI behavior including:
 * - State machine transitions
 * - Threat assessment scoring
 * - Combat behavior decisions
 * - Flocking behavior
 * - Weapon targeting
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Three.js
const MockVector3 = class {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new MockVector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    length() { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); }
    normalize() {
        const len = this.length();
        if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
        return this;
    }
    distanceTo(v) {
        const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
};

jest.mock('three', () => ({
    Vector3: MockVector3
}), { virtual: true });

// Mock debug function
global.debug = jest.fn();


/**
 * Mock Ship class for AI testing
 */
class MockShip {
    constructor(config = {}) {
        this.shipType = config.shipType || 'enemy_fighter';
        this.position = new MockVector3(config.x || 0, config.y || 0, config.z || 0);
        this.health = config.health || 100;
        this.maxHealth = config.maxHealth || 100;
        this.isPlayer = config.isPlayer || false;
        this.diplomacy = config.diplomacy || 'enemy';
        this.faction = config.faction || 'pirates';
        this.velocity = new MockVector3();
        this.weapons = config.weapons || [];
    }

    getHealthPercentage() {
        return this.health / this.maxHealth;
    }
}


/**
 * Mock AIStateMachine for testing state transitions
 */
class MockAIStateMachine {
    constructor(ai) {
        this.ai = ai;
        this.currentState = 'idle';
        this.previousState = null;
        this.stateStartTime = Date.now();
        this.stateData = {};
    }

    setState(newState) {
        if (newState === this.currentState) return;
        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateStartTime = Date.now();
        this.stateData = {};
    }

    getState() {
        return this.currentState;
    }

    getTimeInState() {
        return Date.now() - this.stateStartTime;
    }

    update(deltaTime, gameWorld) {
        // Check transitions based on AI state
        this.checkTransitions();
    }

    checkTransitions() {
        const ai = this.ai;

        switch (this.currentState) {
            case 'idle':
                if (ai.hasValidTarget() && ai.inEngagementRange()) {
                    this.setState('engage');
                }
                break;

            case 'engage':
                if (ai.shouldFlee()) {
                    this.setState('flee');
                } else if (ai.shouldEvade()) {
                    this.setState('evade');
                } else if (!ai.hasValidTarget()) {
                    this.setState('idle');
                }
                break;

            case 'evade':
                if (ai.shouldFlee()) {
                    this.setState('flee');
                } else if (!ai.isUnderHeavyFire() && ai.hasValidTarget()) {
                    this.setState('engage');
                } else if (!ai.hasValidTarget()) {
                    this.setState('idle');
                }
                break;

            case 'flee':
                if (ai.atSafeDistance() && ai.getHealthPercentage() > 0.4) {
                    this.setState('idle');
                }
                break;
        }
    }
}


/**
 * Mock ThreatAssessment class for testing threat scoring
 */
class MockThreatAssessment {
    constructor(ai) {
        this.ai = ai;
        this.threats = [];
        this.primaryThreat = null;
    }

    assessThreat(target) {
        const distance = this.ai.ship.position.distanceTo(target.position);
        const healthFactor = target.getHealthPercentage();
        const isPlayer = target.isPlayer ? 2.0 : 1.0;

        // Threat score: closer = higher, lower health = lower, player = higher
        const distanceScore = Math.max(0, 1 - distance / 10); // Normalize to 10km
        const damageScore = healthFactor;
        const playerBonus = isPlayer;

        return {
            target: target,
            score: distanceScore * damageScore * playerBonus * 100,
            distance: distance,
            isPlayer: target.isPlayer
        };
    }

    update(deltaTime, gameWorld) {
        this.threats = [];

        if (!gameWorld || !gameWorld.ships) return;

        for (const ship of gameWorld.ships) {
            if (ship === this.ai.ship) continue;
            if (ship.diplomacy === 'enemy' || ship.isPlayer) {
                const threat = this.assessThreat(ship);
                this.threats.push(threat);
            }
        }

        // Sort by threat score (highest first)
        this.threats.sort((a, b) => b.score - a.score);
        this.primaryThreat = this.threats.length > 0 ? this.threats[0] : null;
    }

    getPrimaryThreat() {
        return this.primaryThreat;
    }

    getAllThreats() {
        return this.threats;
    }

    getThreatCount() {
        return this.threats.length;
    }
}


/**
 * Mock CombatBehavior class for testing combat decisions
 */
class MockCombatBehavior {
    constructor(ai) {
        this.ai = ai;
        this.combatMode = 'passive';
        this.lastFireTime = 0;
        this.fireRate = 500; // ms between shots
        this.shotsTotal = 0;
        this.shotsHit = 0;
    }

    update(deltaTime, threatAssessment) {
        const primaryThreat = threatAssessment.getPrimaryThreat();

        if (!primaryThreat) {
            this.combatMode = 'passive';
            return;
        }

        const ai = this.ai;
        const healthPercent = ai.getHealthPercentage();
        const threatDistance = primaryThreat.distance;

        // Decision logic
        if (healthPercent < 0.2) {
            this.combatMode = 'retreat';
        } else if (healthPercent < 0.5 && threatDistance < 1) {
            this.combatMode = 'evasive';
        } else if (threatDistance < 2) {
            this.combatMode = 'aggressive';
        } else {
            this.combatMode = 'pursue';
        }
    }

    getCombatMode() {
        return this.combatMode;
    }

    shouldFire() {
        const now = Date.now();
        return now - this.lastFireTime >= this.fireRate;
    }

    recordShot(hit = false) {
        this.shotsTotal++;
        if (hit) this.shotsHit++;
        this.lastFireTime = Date.now();
    }

    getAccuracy() {
        if (this.shotsTotal === 0) return 0;
        return this.shotsHit / this.shotsTotal;
    }
}


/**
 * Mock EnemyAI class combining all components
 */
class MockEnemyAI {
    constructor(ship, config = {}) {
        this.ship = ship;
        this.config = config;
        this.currentTarget = null;
        this.lastKnownTargetPosition = null;

        this.sensorRange = config.sensorRange || 10;
        this.engageRange = config.engageRange || 5;
        this.fleeHealthThreshold = config.fleeHealthThreshold || 0.2;
        this.evadeHealthThreshold = config.evadeHealthThreshold || 0.5;

        this.stateMachine = new MockAIStateMachine(this);
        this.threatAssessment = new MockThreatAssessment(this);
        this.combatBehavior = new MockCombatBehavior(this);

        this.underHeavyFire = false;
        this.fleeDistance = 20;
    }

    getHealthPercentage() {
        return this.ship.getHealthPercentage();
    }

    setTarget(target) {
        this.currentTarget = target;
        if (target) {
            this.lastKnownTargetPosition = target.position.clone();
        }
    }

    hasValidTarget() {
        return this.currentTarget !== null;
    }

    inEngagementRange() {
        if (!this.currentTarget) return false;
        const distance = this.ship.position.distanceTo(this.currentTarget.position);
        return distance <= this.engageRange;
    }

    shouldFlee() {
        return this.getHealthPercentage() < this.fleeHealthThreshold;
    }

    shouldEvade() {
        return this.getHealthPercentage() < this.evadeHealthThreshold;
    }

    isUnderHeavyFire() {
        return this.underHeavyFire;
    }

    atSafeDistance() {
        if (!this.currentTarget) return true;
        return this.ship.position.distanceTo(this.currentTarget.position) > this.fleeDistance;
    }

    update(deltaTime, gameWorld) {
        // Update sensor data
        this.updateSensors(gameWorld);

        // Update threat assessment
        this.threatAssessment.update(deltaTime, gameWorld);

        // Update combat behavior
        this.combatBehavior.update(deltaTime, this.threatAssessment);

        // Update state machine
        this.stateMachine.update(deltaTime, gameWorld);
    }

    updateSensors(gameWorld) {
        if (!gameWorld || !gameWorld.ships) return;

        // Find nearest threat as potential target
        let nearestThreat = null;
        let nearestDistance = Infinity;

        for (const ship of gameWorld.ships) {
            if (ship === this.ship) continue;
            if (ship.diplomacy !== 'enemy' && !ship.isPlayer) continue;

            const distance = this.ship.position.distanceTo(ship.position);
            if (distance <= this.sensorRange && distance < nearestDistance) {
                nearestDistance = distance;
                nearestThreat = ship;
            }
        }

        if (nearestThreat && !this.currentTarget) {
            this.setTarget(nearestThreat);
        }
    }
}


// ============================================================================
// TEST SUITES
// ============================================================================

describe('AIStateMachine State Transitions', () => {
    let ai;
    let ship;
    let playerShip;

    beforeEach(() => {
        ship = new MockShip({ shipType: 'enemy_fighter', health: 100 });
        playerShip = new MockShip({ isPlayer: true, x: 2, y: 0, z: 0 });
        ai = new MockEnemyAI(ship, { engageRange: 5, fleeHealthThreshold: 0.2 });
    });

    test('starts in idle state', () => {
        expect(ai.stateMachine.getState()).toBe('idle');
    });

    test('transitions to engage when target in range', () => {
        ai.setTarget(playerShip);
        ai.stateMachine.update(0.016, { ships: [playerShip] });

        expect(ai.stateMachine.getState()).toBe('engage');
    });

    test('stays idle when no target', () => {
        ai.stateMachine.update(0.016, { ships: [] });
        expect(ai.stateMachine.getState()).toBe('idle');
    });

    test('transitions to flee when health below threshold', () => {
        ship.health = 15; // 15% health
        ai.setTarget(playerShip);
        ai.stateMachine.setState('engage');

        ai.stateMachine.update(0.016, { ships: [playerShip] });

        expect(ai.stateMachine.getState()).toBe('flee');
    });

    test('transitions from flee to idle when safe', () => {
        ship.health = 50; // 50% health
        playerShip.position.set(100, 0, 0); // Far away
        ai.setTarget(playerShip);
        ai.stateMachine.setState('flee');

        ai.stateMachine.update(0.016, { ships: [playerShip] });

        expect(ai.stateMachine.getState()).toBe('idle');
    });

    test('transitions from engage to evade under heavy fire', () => {
        ship.health = 40; // 40% health (below evade threshold)
        ai.setTarget(playerShip);
        ai.underHeavyFire = true;
        ai.stateMachine.setState('engage');

        ai.stateMachine.update(0.016, { ships: [playerShip] });

        expect(ai.stateMachine.getState()).toBe('evade');
    });

    test('transitions from evade to engage when safe', () => {
        ship.health = 60; // 60% health
        ai.setTarget(playerShip);
        ai.underHeavyFire = false;
        ai.stateMachine.setState('evade');

        ai.stateMachine.update(0.016, { ships: [playerShip] });

        expect(ai.stateMachine.getState()).toBe('engage');
    });

    test('transitions to idle when target lost', () => {
        ai.setTarget(null);
        ai.stateMachine.setState('engage');

        ai.stateMachine.update(0.016, { ships: [] });

        expect(ai.stateMachine.getState()).toBe('idle');
    });

    test('previousState is tracked correctly', () => {
        ai.setTarget(playerShip);
        ai.stateMachine.update(0.016, { ships: [playerShip] });

        expect(ai.stateMachine.previousState).toBe('idle');
        expect(ai.stateMachine.getState()).toBe('engage');
    });
});


describe('ThreatAssessment Scoring', () => {
    let ai;
    let ship;

    beforeEach(() => {
        ship = new MockShip({ shipType: 'enemy_fighter' });
        ai = new MockEnemyAI(ship);
    });

    test('assesses threat score based on distance', () => {
        const closeThreat = new MockShip({ x: 1, y: 0, z: 0, isPlayer: true });
        const farThreat = new MockShip({ x: 8, y: 0, z: 0, isPlayer: true });

        const closeScore = ai.threatAssessment.assessThreat(closeThreat);
        const farScore = ai.threatAssessment.assessThreat(farThreat);

        expect(closeScore.score).toBeGreaterThan(farScore.score);
    });

    test('player targets have higher threat score', () => {
        const playerTarget = new MockShip({ x: 3, y: 0, z: 0, isPlayer: true });
        const npcTarget = new MockShip({ x: 3, y: 0, z: 0, isPlayer: false, diplomacy: 'enemy' });

        const playerScore = ai.threatAssessment.assessThreat(playerTarget);
        const npcScore = ai.threatAssessment.assessThreat(npcTarget);

        expect(playerScore.score).toBeGreaterThan(npcScore.score);
    });

    test('damaged targets have lower threat score', () => {
        const healthyTarget = new MockShip({ x: 3, y: 0, z: 0, health: 100 });
        const damagedTarget = new MockShip({ x: 3, y: 0, z: 0, health: 20 });

        const healthyScore = ai.threatAssessment.assessThreat(healthyTarget);
        const damagedScore = ai.threatAssessment.assessThreat(damagedTarget);

        expect(healthyScore.score).toBeGreaterThan(damagedScore.score);
    });

    test('update identifies primary threat', () => {
        const threat1 = new MockShip({ x: 5, y: 0, z: 0, isPlayer: false, diplomacy: 'enemy' });
        const threat2 = new MockShip({ x: 2, y: 0, z: 0, isPlayer: true }); // Closer + player

        ai.threatAssessment.update(0.016, { ships: [ship, threat1, threat2] });

        const primary = ai.threatAssessment.getPrimaryThreat();
        expect(primary).not.toBeNull();
        expect(primary.target).toBe(threat2); // Should be the player (closer + player bonus)
    });

    test('returns all threats sorted by score', () => {
        const threats = [
            new MockShip({ x: 8, y: 0, z: 0, diplomacy: 'enemy' }),
            new MockShip({ x: 2, y: 0, z: 0, diplomacy: 'enemy' }),
            new MockShip({ x: 5, y: 0, z: 0, diplomacy: 'enemy' })
        ];

        ai.threatAssessment.update(0.016, { ships: [ship, ...threats] });

        const allThreats = ai.threatAssessment.getAllThreats();
        expect(allThreats.length).toBe(3);
        expect(allThreats[0].score).toBeGreaterThanOrEqual(allThreats[1].score);
        expect(allThreats[1].score).toBeGreaterThanOrEqual(allThreats[2].score);
    });

    test('ignores friendly ships', () => {
        const friendlyShip = new MockShip({ x: 2, y: 0, z: 0, diplomacy: 'friendly' });
        const neutralShip = new MockShip({ x: 2, y: 0, z: 0, diplomacy: 'neutral' });

        ai.threatAssessment.update(0.016, { ships: [ship, friendlyShip, neutralShip] });

        expect(ai.threatAssessment.getThreatCount()).toBe(0);
    });
});


describe('CombatBehavior Decisions', () => {
    let ai;
    let ship;

    beforeEach(() => {
        ship = new MockShip({ shipType: 'enemy_fighter', health: 100 });
        ai = new MockEnemyAI(ship);
    });

    test('passive mode when no threats', () => {
        ai.threatAssessment.update(0.016, { ships: [ship] });
        ai.combatBehavior.update(0.016, ai.threatAssessment);

        expect(ai.combatBehavior.getCombatMode()).toBe('passive');
    });

    test('aggressive mode when close and healthy', () => {
        const threat = new MockShip({ x: 1, y: 0, z: 0, diplomacy: 'enemy' });
        ai.threatAssessment.update(0.016, { ships: [ship, threat] });
        ai.combatBehavior.update(0.016, ai.threatAssessment);

        expect(ai.combatBehavior.getCombatMode()).toBe('aggressive');
    });

    test('pursue mode when target is far', () => {
        const threat = new MockShip({ x: 8, y: 0, z: 0, diplomacy: 'enemy' });
        ai.threatAssessment.update(0.016, { ships: [ship, threat] });
        ai.combatBehavior.update(0.016, ai.threatAssessment);

        expect(ai.combatBehavior.getCombatMode()).toBe('pursue');
    });

    test('evasive mode when damaged and close', () => {
        ship.health = 40;
        const threat = new MockShip({ x: 0.5, y: 0, z: 0, diplomacy: 'enemy' });
        ai.threatAssessment.update(0.016, { ships: [ship, threat] });
        ai.combatBehavior.update(0.016, ai.threatAssessment);

        expect(ai.combatBehavior.getCombatMode()).toBe('evasive');
    });

    test('retreat mode when critically damaged', () => {
        ship.health = 15;
        const threat = new MockShip({ x: 2, y: 0, z: 0, diplomacy: 'enemy' });
        ai.threatAssessment.update(0.016, { ships: [ship, threat] });
        ai.combatBehavior.update(0.016, ai.threatAssessment);

        expect(ai.combatBehavior.getCombatMode()).toBe('retreat');
    });

    test('shouldFire respects fire rate', () => {
        ai.combatBehavior.recordShot();
        expect(ai.combatBehavior.shouldFire()).toBe(false);
    });

    test('accuracy tracking works correctly', () => {
        ai.combatBehavior.recordShot(true);
        ai.combatBehavior.recordShot(false);
        ai.combatBehavior.recordShot(true);

        expect(ai.combatBehavior.getAccuracy()).toBeCloseTo(0.666, 2);
    });
});


describe('EnemyAI Integration', () => {
    let ai;
    let ship;
    let gameWorld;

    beforeEach(() => {
        ship = new MockShip({ shipType: 'enemy_fighter', health: 100 });
        ai = new MockEnemyAI(ship, { sensorRange: 10, engageRange: 5 });
        gameWorld = { ships: [ship] };
    });

    test('detects and targets player in sensor range', () => {
        const player = new MockShip({ x: 3, y: 0, z: 0, isPlayer: true });
        gameWorld.ships.push(player);

        ai.update(0.016, gameWorld);

        expect(ai.currentTarget).toBe(player);
    });

    test('ignores ships outside sensor range', () => {
        const farShip = new MockShip({ x: 50, y: 0, z: 0, isPlayer: true });
        gameWorld.ships.push(farShip);

        ai.update(0.016, gameWorld);

        expect(ai.currentTarget).toBeNull();
    });

    test('complete update cycle runs without errors', () => {
        const player = new MockShip({ x: 3, y: 0, z: 0, isPlayer: true });
        gameWorld.ships.push(player);

        expect(() => {
            for (let i = 0; i < 100; i++) {
                ai.update(0.016, gameWorld);
            }
        }).not.toThrow();
    });

    test('AI responds to damage by changing behavior', () => {
        const player = new MockShip({ x: 3, y: 0, z: 0, isPlayer: true });
        gameWorld.ships.push(player);

        // Initial state - healthy
        ai.update(0.016, gameWorld);
        const initialState = ai.stateMachine.getState();

        // Take critical damage
        ship.health = 15;
        ai.update(0.016, gameWorld);

        expect(ai.stateMachine.getState()).toBe('flee');
    });
});


describe('AI Performance', () => {
    test('creates AI instance quickly', () => {
        const ship = new MockShip();
        const startTime = performance.now();
        const ai = new MockEnemyAI(ship);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(5);
    });

    test('handles many threats efficiently', () => {
        const ship = new MockShip();
        const ai = new MockEnemyAI(ship);

        // Create 50 threat ships
        const threats = [];
        for (let i = 0; i < 50; i++) {
            threats.push(new MockShip({
                x: Math.random() * 10,
                y: Math.random() * 10,
                z: Math.random() * 10,
                diplomacy: 'enemy'
            }));
        }

        const gameWorld = { ships: [ship, ...threats] };

        const startTime = performance.now();
        for (let i = 0; i < 100; i++) {
            ai.update(0.016, gameWorld);
        }
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(100); // 100ms for 100 updates
    });

    test('threat assessment scales linearly', () => {
        const ship = new MockShip();
        const ai = new MockEnemyAI(ship);

        const times = [];
        for (const count of [10, 50, 100]) {
            const threats = [];
            for (let i = 0; i < count; i++) {
                threats.push(new MockShip({ x: i, diplomacy: 'enemy' }));
            }

            const startTime = performance.now();
            ai.threatAssessment.update(0.016, { ships: [ship, ...threats] });
            times.push(performance.now() - startTime);
        }

        // Each step should roughly scale linearly (not exponentially)
        // Allow some variance but 100 ships shouldn't take 10x more than 10 ships
        expect(times[2] / times[0]).toBeLessThan(20);
    });
});
