/**
 * Unit tests for GameObject core modules.
 * Tests GameObject, GameObjectFactory, and GameObjectRegistry.
 */

import { GameObject, GameObjectType } from '../../../frontend/static/js/core/GameObject.js';
import { GameObjectFactory, GameObjectFactoryClass } from '../../../frontend/static/js/core/GameObjectFactory.js';
import { GameObjectRegistry, GameObjectRegistryClass } from '../../../frontend/static/js/core/GameObjectRegistry.js';

describe('GameObjectType Constants', () => {
  it('should have all object types defined', () => {
    expect(GameObjectType.STAR).toBe('star');
    expect(GameObjectType.PLANET).toBe('planet');
    expect(GameObjectType.MOON).toBe('moon');
    expect(GameObjectType.STATION).toBe('station');
    expect(GameObjectType.BEACON).toBe('beacon');
    expect(GameObjectType.SHIP).toBe('ship');
  });

  it('should have 6 types total', () => {
    expect(Object.keys(GameObjectType)).toHaveLength(6);
  });
});

describe('GameObject Class', () => {
  const validConfig = {
    id: 'test-001',
    type: GameObjectType.PLANET,
    name: 'Test Planet',
    sector: 'A0',
    position: { x: 100, y: 50, z: 200 }
  };

  describe('Constructor', () => {
    it('should create object with required fields', () => {
      const obj = new GameObject(validConfig);

      expect(obj.id).toBe('test-001');
      expect(obj.type).toBe(GameObjectType.PLANET);
      expect(obj.name).toBe('Test Planet');
      expect(obj.sector).toBe('A0');
    });

    it('should set position correctly', () => {
      const obj = new GameObject(validConfig);
      const pos = obj.position;

      expect(pos.x).toBe(100);
      expect(pos.y).toBe(50);
      expect(pos.z).toBe(200);
    });

    it('should default discovered to false', () => {
      const obj = new GameObject(validConfig);
      expect(obj.discovered).toBe(false);
    });

    it('should accept optional faction', () => {
      const obj = new GameObject({
        ...validConfig,
        faction: 'Terran Republic Alliance'
      });
      expect(obj.faction).toBe('Terran Republic Alliance');
    });

    it('should accept optional classification', () => {
      const obj = new GameObject({
        ...validConfig,
        classification: 'Class-M'
      });
      expect(obj.classification).toBe('Class-M');
    });
  });

  describe('Fail-Fast Validation', () => {
    it('should throw on missing config', () => {
      expect(() => new GameObject()).toThrow('config is required');
    });

    it('should throw on missing id', () => {
      expect(() => new GameObject({ type: 'planet', name: 'Test', sector: 'A0', position: { x: 0, y: 0, z: 0 } }))
        .toThrow('id is required');
    });

    it('should throw on missing type', () => {
      expect(() => new GameObject({ id: 'test', name: 'Test', sector: 'A0', position: { x: 0, y: 0, z: 0 } }))
        .toThrow('type is required');
    });

    it('should throw on invalid type', () => {
      expect(() => new GameObject({ id: 'test', type: 'invalid', name: 'Test', sector: 'A0', position: { x: 0, y: 0, z: 0 } }))
        .toThrow('invalid type');
    });

    it('should throw on missing name', () => {
      expect(() => new GameObject({ id: 'test', type: 'planet', sector: 'A0', position: { x: 0, y: 0, z: 0 } }))
        .toThrow('name is required');
    });

    it('should throw on missing sector', () => {
      expect(() => new GameObject({ id: 'test', type: 'planet', name: 'Test', position: { x: 0, y: 0, z: 0 } }))
        .toThrow('sector is required');
    });

    it('should throw on missing position', () => {
      expect(() => new GameObject({ id: 'test', type: 'planet', name: 'Test', sector: 'A0' }))
        .toThrow('valid position');
    });

    it('should throw on invalid position', () => {
      expect(() => new GameObject({ id: 'test', type: 'planet', name: 'Test', sector: 'A0', position: 'invalid' }))
        .toThrow('valid position');
    });
  });

  describe('Immutable Properties', () => {
    it('id should be immutable', () => {
      const obj = new GameObject(validConfig);
      // Attempting to change id should have no effect
      expect(() => { obj.id = 'new-id'; }).toThrow();
    });

    it('type should be immutable', () => {
      const obj = new GameObject(validConfig);
      expect(() => { obj.type = 'ship'; }).toThrow();
    });

    it('name should be immutable', () => {
      const obj = new GameObject(validConfig);
      expect(() => { obj.name = 'New Name'; }).toThrow();
    });

    it('sector should be immutable', () => {
      const obj = new GameObject(validConfig);
      expect(() => { obj.sector = 'B1'; }).toThrow();
    });
  });

  describe('Mutable Properties', () => {
    it('should allow changing position', () => {
      const obj = new GameObject(validConfig);
      obj.position = { x: 500, y: 600, z: 700 };

      expect(obj.position.x).toBe(500);
      expect(obj.position.y).toBe(600);
      expect(obj.position.z).toBe(700);
    });

    it('should return copy of position to prevent mutation', () => {
      const obj = new GameObject(validConfig);
      const pos1 = obj.position;
      pos1.x = 999;

      // Original should not be affected
      expect(obj.position.x).toBe(100);
    });

    it('should allow changing discovered state', () => {
      const obj = new GameObject(validConfig);
      expect(obj.discovered).toBe(false);

      obj.discovered = true;
      expect(obj.discovered).toBe(true);
    });

    it('should allow changing faction', () => {
      const obj = new GameObject(validConfig);
      obj.faction = 'Void Cult';
      expect(obj.faction).toBe('Void Cult');
    });

    it('should allow changing classification', () => {
      const obj = new GameObject(validConfig);
      obj.classification = 'Class-L';
      expect(obj.classification).toBe('Class-L');
    });

    it('should reject invalid position', () => {
      const obj = new GameObject(validConfig);
      const originalPos = obj.position;

      // Try to set invalid position (should be rejected)
      obj.position = null;
      expect(obj.position).toEqual(originalPos);

      obj.position = { invalid: 'data' };
      expect(obj.position).toEqual(originalPos);
    });
  });

  describe('Three.js Integration', () => {
    it('should get and set threeObject', () => {
      const obj = new GameObject(validConfig);
      expect(obj.threeObject).toBeNull();

      const mockMesh = {
        position: { set: jest.fn() },
        userData: {}
      };

      obj.threeObject = mockMesh;
      expect(obj.threeObject).toBe(mockMesh);
    });

    it('should link gameObject to threeObject userData', () => {
      const obj = new GameObject(validConfig);
      const mockMesh = {
        position: { set: jest.fn() },
        userData: {}
      };

      obj.threeObject = mockMesh;

      expect(mockMesh.userData.gameObject).toBe(obj);
      expect(mockMesh.userData.gameObjectId).toBe(obj.id);
    });

    it('should sync position changes with threeObject', () => {
      const obj = new GameObject(validConfig);
      const mockMesh = {
        position: { set: jest.fn() },
        userData: {}
      };

      obj.threeObject = mockMesh;
      obj.position = { x: 10, y: 20, z: 30 };

      expect(mockMesh.position.set).toHaveBeenCalledWith(10, 20, 30);
    });
  });

  describe('Computed Diplomacy', () => {
    it('should return unknown for undiscovered objects', () => {
      const obj = new GameObject({
        ...validConfig,
        faction: 'Crimson Raider Clans'
      });
      expect(obj.diplomacy).toBe('unknown');
    });

    it('should return neutral for objects without faction', () => {
      const obj = new GameObject({
        ...validConfig,
        discovered: true
      });
      expect(obj.diplomacy).toBe('neutral');
    });

    it('should return neutral for stars', () => {
      const obj = new GameObject({
        ...validConfig,
        type: GameObjectType.STAR,
        faction: 'Crimson Raider Clans'
      });
      expect(obj.diplomacy).toBe('neutral');
    });

    it('isHostile should return true for enemy objects', () => {
      const obj = new GameObject({
        ...validConfig,
        faction: 'Void Cult',
        discovered: true
      });
      expect(obj.isHostile).toBe(true);
    });

    it('isFriendly should return true for friendly objects', () => {
      const obj = new GameObject({
        ...validConfig,
        faction: 'Terran Republic Alliance',
        discovered: true
      });
      expect(obj.isFriendly).toBe(true);
    });
  });

  describe('Metadata', () => {
    it('should store and retrieve metadata', () => {
      const obj = new GameObject(validConfig);
      obj.setMeta('population', 1000000);
      obj.setMeta('government', 'Democracy');

      expect(obj.getMeta('population')).toBe(1000000);
      expect(obj.getMeta('government')).toBe('Democracy');
    });

    it('should return undefined for missing metadata', () => {
      const obj = new GameObject(validConfig);
      expect(obj.getMeta('nonexistent')).toBeUndefined();
    });

    it('getAllMeta should return copy of metadata', () => {
      const obj = new GameObject(validConfig);
      obj.setMeta('key', 'value');

      const meta = obj.getAllMeta();
      meta.key = 'changed';

      expect(obj.getMeta('key')).toBe('value');
    });
  });

  describe('Event Listeners', () => {
    it('should notify on property change', () => {
      const obj = new GameObject(validConfig);
      const listener = jest.fn();

      obj.onChange('discovered', listener);
      obj.discovered = true;

      expect(listener).toHaveBeenCalledWith(false, true, obj);
    });

    it('should allow unsubscribing', () => {
      const obj = new GameObject(validConfig);
      const listener = jest.fn();

      const unsubscribe = obj.onChange('discovered', listener);
      unsubscribe();

      obj.discovered = true;
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const obj = new GameObject(validConfig);
      const badListener = jest.fn(() => { throw new Error('test'); });
      const goodListener = jest.fn();

      obj.onChange('discovered', badListener);
      obj.onChange('discovered', goodListener);

      expect(() => {
        obj.discovered = true;
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const obj = new GameObject({
        ...validConfig,
        faction: 'Test Faction',
        classification: 'Class-M',
        discovered: true
      });
      obj.setMeta('population', 5000);

      const json = obj.toJSON();

      expect(json.id).toBe('test-001');
      expect(json.type).toBe(GameObjectType.PLANET);
      expect(json.name).toBe('Test Planet');
      expect(json.sector).toBe('A0');
      expect(json.faction).toBe('Test Faction');
      expect(json.discovered).toBe(true);
      expect(json.metadata.population).toBe(5000);
    });

    it('should deserialize from JSON', () => {
      const original = new GameObject({
        ...validConfig,
        discovered: true
      });
      original.setMeta('key', 'value');

      const json = original.toJSON();
      const restored = GameObject.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.type).toBe(original.type);
      expect(restored.discovered).toBe(original.discovered);
      expect(restored.getMeta('key')).toBe('value');
    });
  });

  describe('Utility Methods', () => {
    it('distanceTo should calculate correct distance', () => {
      const obj = new GameObject({
        ...validConfig,
        position: { x: 0, y: 0, z: 0 }
      });

      expect(obj.distanceTo({ x: 3, y: 4, z: 0 })).toBe(5);
      expect(obj.distanceTo({ x: 0, y: 0, z: 10 })).toBe(10);
    });

    it('toString should return formatted string', () => {
      const obj = new GameObject(validConfig);
      expect(obj.toString()).toBe('GameObject(planet:Test Planet@A0)');
    });
  });
});

describe('GameObjectRegistry', () => {
  let registry;

  beforeEach(() => {
    // Use a fresh instance for each test
    registry = new GameObjectRegistryClass();
    registry.setCurrentSector('A0');
  });

  const createTestObject = (overrides = {}) => {
    return new GameObject({
      id: 'test-' + Math.random().toString(36).substr(2, 9),
      type: GameObjectType.PLANET,
      name: 'Test Object',
      sector: 'A0',
      position: { x: 0, y: 0, z: 0 },
      ...overrides
    });
  };

  describe('Registration', () => {
    it('should register an object', () => {
      const obj = createTestObject({ id: 'reg-001' });
      registry.register(obj);

      expect(registry.has('reg-001')).toBe(true);
      expect(registry.getById('reg-001')).toBe(obj);
    });

    it('should throw on invalid object', () => {
      expect(() => registry.register(null)).toThrow();
      expect(() => registry.register({ name: 'no id' })).toThrow();
    });

    it('should handle duplicate registration', () => {
      const obj = createTestObject({ id: 'dup-001' });
      registry.register(obj);

      // Should return existing object, not throw
      const result = registry.register(obj);
      expect(result).toBe(obj);
    });

    it('should update indexes on registration', () => {
      const obj = createTestObject({
        id: 'idx-001',
        type: GameObjectType.STATION,
        faction: 'Test Faction'
      });
      registry.register(obj);

      expect(registry.getByType(GameObjectType.STATION)).toContain(obj);
      expect(registry.getBySector('A0')).toContain(obj);
      expect(registry.getByFaction('Test Faction')).toContain(obj);
    });
  });

  describe('Unregistration', () => {
    it('should unregister by ID', () => {
      const obj = createTestObject({ id: 'unreg-001' });
      registry.register(obj);

      const result = registry.unregister('unreg-001');

      expect(result).toBe(true);
      expect(registry.has('unreg-001')).toBe(false);
    });

    it('should unregister by object', () => {
      const obj = createTestObject({ id: 'unreg-002' });
      registry.register(obj);

      const result = registry.unregister(obj);

      expect(result).toBe(true);
      expect(registry.has('unreg-002')).toBe(false);
    });

    it('should return false for non-existent object', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });

    it('should update indexes on unregistration', () => {
      const obj = createTestObject({
        id: 'idx-002',
        faction: 'Test Faction'
      });
      registry.register(obj);
      registry.unregister(obj);

      expect(registry.getByFaction('Test Faction')).not.toContain(obj);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      registry.register(createTestObject({ id: 'q1', type: GameObjectType.PLANET, sector: 'A0', faction: 'Faction A' }));
      registry.register(createTestObject({ id: 'q2', type: GameObjectType.STATION, sector: 'A0', faction: 'Faction B' }));
      registry.register(createTestObject({ id: 'q3', type: GameObjectType.PLANET, sector: 'B1', faction: 'Faction A' }));
      registry.register(createTestObject({ id: 'q4', type: GameObjectType.SHIP, sector: 'A0', faction: 'Faction A' }));
    });

    it('getByType should return objects of specific type', () => {
      const planets = registry.getByType(GameObjectType.PLANET);
      expect(planets).toHaveLength(2);
    });

    it('getBySector should return objects in specific sector', () => {
      const sectorA0 = registry.getBySector('A0');
      expect(sectorA0).toHaveLength(3);
    });

    it('getByFaction should return objects of specific faction', () => {
      const factionA = registry.getByFaction('Faction A');
      expect(factionA).toHaveLength(3);
    });

    it('getAll should return all objects', () => {
      expect(registry.getAll()).toHaveLength(4);
    });

    it('count should return total count', () => {
      expect(registry.count).toBe(4);
    });

    it('find should filter by predicate', () => {
      const result = registry.find(obj => obj.type === GameObjectType.PLANET);
      expect(result).toHaveLength(2);
    });

    it('findOne should return first match', () => {
      const result = registry.findOne(obj => obj.type === GameObjectType.SHIP);
      expect(result).not.toBeNull();
      expect(result.type).toBe(GameObjectType.SHIP);
    });

    it('findOne should return null if no match', () => {
      const result = registry.findOne(obj => obj.type === 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Discovery Queries', () => {
    beforeEach(() => {
      const obj1 = createTestObject({ id: 'd1' });
      const obj2 = createTestObject({ id: 'd2' });
      obj1._discovered = true;
      obj2._discovered = false;
      registry.register(obj1);
      registry.register(obj2);
    });

    it('getDiscovered should return discovered objects', () => {
      const discovered = registry.getDiscovered();
      expect(discovered).toHaveLength(1);
      expect(discovered[0].id).toBe('d1');
    });

    it('getUndiscovered should return undiscovered objects', () => {
      const undiscovered = registry.getUndiscovered();
      expect(undiscovered).toHaveLength(1);
      expect(undiscovered[0].id).toBe('d2');
    });

    it('getHostile should return enemy objects', () => {
      const hostile = createTestObject({
        id: 'h1',
        faction: 'Void Cult',
        discovered: true
      });
      const friendly = createTestObject({
        id: 'h2',
        faction: 'Terran Republic Alliance',
        discovered: true
      });

      registry.register(hostile);
      registry.register(friendly);

      const hostiles = registry.getHostile();
      expect(hostiles.length).toBeGreaterThanOrEqual(1);
      expect(hostiles.some(o => o.id === 'h1')).toBe(true);
    });

    it('getFriendly should return friendly objects', () => {
      const friendly = createTestObject({
        id: 'f1',
        faction: 'Terran Republic Alliance',
        discovered: true
      });
      const hostile = createTestObject({
        id: 'f2',
        faction: 'Crimson Raider Clans',
        discovered: true
      });

      registry.register(friendly);
      registry.register(hostile);

      const friendlies = registry.getFriendly();
      expect(friendlies.length).toBeGreaterThanOrEqual(1);
      expect(friendlies.some(o => o.id === 'f1')).toBe(true);
    });

    it('getHostile should filter by sector', () => {
      const hostile1 = createTestObject({
        id: 'hs1',
        sector: 'A0',
        faction: 'Void Cult',
        discovered: true
      });
      const hostile2 = createTestObject({
        id: 'hs2',
        sector: 'B1',
        faction: 'Void Cult',
        discovered: true
      });

      registry.register(hostile1);
      registry.register(hostile2);

      const sectorHostiles = registry.getHostile('A0');
      expect(sectorHostiles.some(o => o.id === 'hs1')).toBe(true);
      expect(sectorHostiles.some(o => o.id === 'hs2')).toBe(false);
    });

    it('getFriendly should filter by sector', () => {
      const friendly1 = createTestObject({
        id: 'fs1',
        sector: 'A0',
        faction: 'Terran Republic Alliance',
        discovered: true
      });
      const friendly2 = createTestObject({
        id: 'fs2',
        sector: 'B1',
        faction: 'Terran Republic Alliance',
        discovered: true
      });

      registry.register(friendly1);
      registry.register(friendly2);

      const sectorFriendlies = registry.getFriendly('A0');
      expect(sectorFriendlies.some(o => o.id === 'fs1')).toBe(true);
      expect(sectorFriendlies.some(o => o.id === 'fs2')).toBe(false);
    });
  });

  describe('Faction Change Tracking', () => {
    it('should update faction index when faction changes', () => {
      const obj = createTestObject({
        id: 'fc1',
        faction: 'Terran Republic Alliance'
      });
      registry.register(obj);

      // Initially in Terran faction
      expect(registry.getByFaction('Terran Republic Alliance').some(o => o.id === 'fc1')).toBe(true);

      // Change faction
      obj.faction = 'Void Cult';

      // Now in Void Cult faction
      expect(registry.getByFaction('Void Cult').some(o => o.id === 'fc1')).toBe(true);
      expect(registry.getByFaction('Terran Republic Alliance').some(o => o.id === 'fc1')).toBe(false);
    });

    it('should handle faction being set to null', () => {
      const obj = createTestObject({
        id: 'fc2',
        faction: 'Scientists Consortium'
      });
      registry.register(obj);

      expect(registry.getByFaction('Scientists Consortium').some(o => o.id === 'fc2')).toBe(true);

      // Set to null
      obj.faction = null;

      expect(registry.getByFaction('Scientists Consortium').some(o => o.id === 'fc2')).toBe(false);
    });

    it('should handle faction being set from null', () => {
      const obj = createTestObject({
        id: 'fc3'
        // No faction initially
      });
      registry.register(obj);

      // Set faction
      obj.faction = 'Free Trader Consortium';

      expect(registry.getByFaction('Free Trader Consortium').some(o => o.id === 'fc3')).toBe(true);
    });
  });

  describe('Sector Management', () => {
    it('should track current sector', () => {
      registry.setCurrentSector('B1');
      expect(registry.currentSector).toBe('B1');
    });

    it('clearSector should remove objects from specific sector', () => {
      registry.register(createTestObject({ id: 's1', sector: 'A0' }));
      registry.register(createTestObject({ id: 's2', sector: 'B1' }));

      registry.clearSector('A0');

      expect(registry.getBySector('A0')).toHaveLength(0);
      expect(registry.getBySector('B1')).toHaveLength(1);
    });

    it('clearAll should remove all objects', () => {
      registry.register(createTestObject({ id: 'c1' }));
      registry.register(createTestObject({ id: 'c2' }));

      registry.clearAll();

      expect(registry.count).toBe(0);
    });
  });

  describe('Event Listeners', () => {
    it('should notify on add', () => {
      const listener = jest.fn();
      registry.on('add', listener);

      const obj = createTestObject({ id: 'evt-1' });
      registry.register(obj);

      expect(listener).toHaveBeenCalledWith(obj);
    });

    it('should notify on remove', () => {
      const listener = jest.fn();
      const obj = createTestObject({ id: 'evt-2' });
      registry.register(obj);

      registry.on('remove', listener);
      registry.unregister(obj);

      expect(listener).toHaveBeenCalledWith(obj);
    });

    it('should notify on clear', () => {
      const listener = jest.fn();
      registry.on('clear', listener);

      registry.clearAll();

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = registry.on('add', listener);
      unsubscribe();

      registry.register(createTestObject({ id: 'evt-3' }));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Stats', () => {
    it('should return accurate statistics', () => {
      registry.register(createTestObject({ id: 'st1', type: GameObjectType.PLANET, faction: 'Faction A' }));
      registry.register(createTestObject({ id: 'st2', type: GameObjectType.STATION, faction: 'Faction B' }));

      const stats = registry.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byType[GameObjectType.PLANET]).toBe(1);
      expect(stats.byType[GameObjectType.STATION]).toBe(1);
      expect(stats.byFaction['Faction A']).toBe(1);
    });
  });
});

describe('GameObjectFactory', () => {
  let factory;

  beforeEach(() => {
    // Use a fresh factory for each test
    factory = new GameObjectFactoryClass();
    factory.initialize('A0');
    // Clear singleton registry
    GameObjectRegistry.clearAll();
    GameObjectRegistry.setCurrentSector('A0');
  });

  describe('Initialization', () => {
    it('should require initialization before use', () => {
      const uninitializedFactory = new GameObjectFactoryClass();
      expect(() => {
        uninitializedFactory.createPlanet({ name: 'Test', position: { x: 0, y: 0, z: 0 } });
      }).toThrow('not initialized');
    });

    it('should initialize with sector', () => {
      expect(factory.currentSector).toBe('A0');
    });

    it('should allow sector changes', () => {
      factory.setSector('B1');
      expect(factory.currentSector).toBe('B1');
    });
  });

  describe('createStar', () => {
    it('should create star with required fields', () => {
      const star = factory.createStar({
        name: 'Sol',
        position: { x: 0, y: 0, z: 0 }
      });

      expect(star.type).toBe(GameObjectType.STAR);
      expect(star.name).toBe('Sol');
      expect(star.faction).toBe('Neutral');
      expect(star.discovered).toBe(true); // Stars always discovered
    });

    it('should throw on missing name', () => {
      expect(() => {
        factory.createStar({ position: { x: 0, y: 0, z: 0 } });
      }).toThrow('name is required');
    });

    it('should throw on missing position', () => {
      expect(() => {
        factory.createStar({ name: 'Test' });
      }).toThrow('valid position');
    });
  });

  describe('createPlanet', () => {
    it('should create planet with required fields', () => {
      const planet = factory.createPlanet({
        name: 'Earth',
        position: { x: 100, y: 0, z: 0 }
      });

      expect(planet.type).toBe(GameObjectType.PLANET);
      expect(planet.name).toBe('Earth');
      expect(planet.discovered).toBe(false);
    });

    it('should store optional metadata', () => {
      const planet = factory.createPlanet({
        name: 'Terra Prime',
        position: { x: 100, y: 0, z: 0 },
        faction: 'Terran Republic Alliance',
        government: 'Democracy',
        economy: 'Industrial',
        population: 1000000
      });

      expect(planet.getMeta('government')).toBe('Democracy');
      expect(planet.getMeta('economy')).toBe('Industrial');
      expect(planet.getMeta('population')).toBe(1000000);
    });
  });

  describe('createMoon', () => {
    it('should create moon with required fields', () => {
      const moon = factory.createMoon({
        name: 'Luna',
        position: { x: 110, y: 10, z: 0 }
      });

      expect(moon.type).toBe(GameObjectType.MOON);
      expect(moon.name).toBe('Luna');
      expect(moon.faction).toBe('Neutral');
    });

    it('should store parent planet metadata', () => {
      const moon = factory.createMoon({
        name: 'Titan',
        position: { x: 200, y: 20, z: 0 },
        parentPlanet: 'Saturn',
        government: 'Colony',
        economy: 'Mining'
      });

      expect(moon.getMeta('parentPlanet')).toBe('Saturn');
      expect(moon.getMeta('government')).toBe('Colony');
      expect(moon.getMeta('economy')).toBe('Mining');
    });
  });

  describe('createStation', () => {
    it('should create station with required fields', () => {
      const station = factory.createStation({
        name: 'Alpha Station',
        position: { x: 50, y: 50, z: 0 },
        faction: 'Terran Republic Alliance'
      });

      expect(station.type).toBe(GameObjectType.STATION);
      expect(station.faction).toBe('Terran Republic Alliance');
      expect(station.getMeta('canDock')).toBe(true);
    });

    it('should require faction for stations', () => {
      expect(() => {
        factory.createStation({
          name: 'Test Station',
          position: { x: 0, y: 0, z: 0 }
        });
      }).toThrow('faction is required');
    });
  });

  describe('createShip', () => {
    it('should create ship with required fields', () => {
      const ship = factory.createShip({
        name: 'ISS Enterprise',
        faction: 'Terran Republic Alliance',
        shipType: 'Light Fighter',
        position: { x: 200, y: 100, z: 50 }
      });

      expect(ship.type).toBe(GameObjectType.SHIP);
      expect(ship.discovered).toBe(true); // Ships always discovered
      expect(ship.getMeta('shipType')).toBe('Light Fighter');
    });

    it('should require shipType for ships', () => {
      expect(() => {
        factory.createShip({
          name: 'Test Ship',
          faction: 'Test',
          position: { x: 0, y: 0, z: 0 }
        });
      }).toThrow('shipType is required');
    });
  });

  describe('createBeacon', () => {
    it('should create beacon with required fields', () => {
      const beacon = factory.createBeacon({
        name: 'Nav Beacon Alpha',
        position: { x: 500, y: 0, z: 0 }
      });

      expect(beacon.type).toBe(GameObjectType.BEACON);
      expect(beacon.faction).toBe('Neutral');
    });
  });

  describe('createBatch', () => {
    it('should create multiple objects', () => {
      const data = [
        { name: 'Planet 1', position: { x: 100, y: 0, z: 0 } },
        { name: 'Planet 2', position: { x: 200, y: 0, z: 0 } },
        { name: 'Planet 3', position: { x: 300, y: 0, z: 0 } }
      ];

      const planets = factory.createBatch('planet', data);

      expect(planets).toHaveLength(3);
      expect(planets[0].name).toBe('Planet 1');
      expect(planets[2].name).toBe('Planet 3');
    });

    it('should skip invalid objects in batch', () => {
      const data = [
        { name: 'Valid', position: { x: 100, y: 0, z: 0 } },
        { position: { x: 200, y: 0, z: 0 } }, // Missing name
        { name: 'Also Valid', position: { x: 300, y: 0, z: 0 } }
      ];

      const planets = factory.createBatch('planet', data);

      expect(planets).toHaveLength(2);
    });
  });

  describe('Position Normalization', () => {
    it('should reject array positions (validation before normalization)', () => {
      // Note: _normalizePosition can handle arrays, but validation runs first
      // and rejects non-object positions. This is current factory behavior.
      expect(() => factory.createPlanet({
        name: 'Array Position',
        position: [100, 200, 300]
      })).toThrow('valid position {x, y, z} is required');
    });

    it('should handle partial positions', () => {
      const planet = factory.createPlanet({
        name: 'Partial Position',
        position: { x: 100 }
      });

      expect(planet.position.x).toBe(100);
      expect(planet.position.y).toBe(0);
      expect(planet.position.z).toBe(0);
    });
  });

  describe('Registry Integration', () => {
    it('should register created objects', () => {
      const planet = factory.createPlanet({
        name: 'Registered Planet',
        position: { x: 100, y: 0, z: 0 }
      });

      expect(GameObjectRegistry.has(planet.id)).toBe(true);
    });
  });

  describe('Stats', () => {
    it('should return factory statistics', () => {
      factory.createPlanet({ name: 'P1', position: { x: 0, y: 0, z: 0 } });

      const stats = factory.getStats();

      expect(stats.initialized).toBe(true);
      expect(stats.currentSector).toBe('A0');
      expect(stats.registry).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('should clear all objects on reset', () => {
      factory.createPlanet({ name: 'P1', position: { x: 0, y: 0, z: 0 } });
      factory.reset();

      expect(GameObjectRegistry.count).toBe(0);
    });
  });
});
