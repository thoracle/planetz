/**
 * Unit tests for FactionStandingsManager.
 * Tests faction standings, diplomacy calculations, and event notifications.
 */

import {
  FactionStandingsManager,
  FactionStandingsManagerClass,
  Factions,
  DiplomacyStatus
} from '../../../frontend/static/js/core/FactionStandingsManager.js';

describe('Factions Constants', () => {
  it('should have all major factions defined', () => {
    expect(Factions.TERRAN_REPUBLIC).toBe('Terran Republic Alliance');
    expect(Factions.ZEPHYRIAN).toBe('Zephyrian Collective');
    expect(Factions.SCIENTISTS).toBe('Scientists Consortium');
    expect(Factions.FREE_TRADERS).toBe('Free Trader Consortium');
    expect(Factions.NEXUS_CORP).toBe('Nexus Corporate Syndicate');
    expect(Factions.ETHEREAL).toBe('Ethereal Wanderers');
    expect(Factions.DRACONIS).toBe('Draconis Imperium');
    expect(Factions.CRIMSON_RAIDERS).toBe('Crimson Raider Clans');
    expect(Factions.SHADOW).toBe('Shadow Consortium');
    expect(Factions.VOID_CULT).toBe('Void Cult');
    expect(Factions.NEUTRAL).toBe('Neutral');
  });

  it('should have 11 factions total', () => {
    expect(Object.keys(Factions)).toHaveLength(11);
  });
});

describe('DiplomacyStatus Constants', () => {
  it('should have all diplomacy statuses', () => {
    expect(DiplomacyStatus.ENEMY).toBe('enemy');
    expect(DiplomacyStatus.NEUTRAL).toBe('neutral');
    expect(DiplomacyStatus.FRIENDLY).toBe('friendly');
  });
});

describe('FactionStandingsManager Singleton', () => {
  beforeEach(() => {
    // Reset to default standings before each test
    FactionStandingsManager.reset();
  });

  describe('Default Standings', () => {
    it('should start player faction (Terran Republic) as friendly', () => {
      const standing = FactionStandingsManager.getStanding(Factions.TERRAN_REPUBLIC);
      expect(standing).toBe(50);
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.TERRAN_REPUBLIC))
        .toBe(DiplomacyStatus.FRIENDLY);
    });

    it('should start allies as friendly', () => {
      expect(FactionStandingsManager.getStanding(Factions.ZEPHYRIAN)).toBe(30);
      expect(FactionStandingsManager.getStanding(Factions.SCIENTISTS)).toBe(25);

      expect(FactionStandingsManager.getDiplomacyStatus(Factions.ZEPHYRIAN))
        .toBe(DiplomacyStatus.FRIENDLY);
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.SCIENTISTS))
        .toBe(DiplomacyStatus.FRIENDLY);
    });

    it('should start neutral factions as neutral', () => {
      expect(FactionStandingsManager.getStanding(Factions.FREE_TRADERS)).toBe(0);
      expect(FactionStandingsManager.getStanding(Factions.NEXUS_CORP)).toBe(0);
      expect(FactionStandingsManager.getStanding(Factions.ETHEREAL)).toBe(0);

      expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
        .toBe(DiplomacyStatus.NEUTRAL);
    });

    it('should start hostile factions as enemies', () => {
      expect(FactionStandingsManager.getStanding(Factions.CRIMSON_RAIDERS)).toBe(-50);
      expect(FactionStandingsManager.getStanding(Factions.SHADOW)).toBe(-60);
      expect(FactionStandingsManager.getStanding(Factions.VOID_CULT)).toBe(-75);

      expect(FactionStandingsManager.getDiplomacyStatus(Factions.CRIMSON_RAIDERS))
        .toBe(DiplomacyStatus.ENEMY);
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.VOID_CULT))
        .toBe(DiplomacyStatus.ENEMY);
    });

    it('should start Draconis as neutral (slightly hostile but above threshold)', () => {
      expect(FactionStandingsManager.getStanding(Factions.DRACONIS)).toBe(-10);
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.DRACONIS))
        .toBe(DiplomacyStatus.NEUTRAL);
    });
  });

  describe('getStanding', () => {
    it('should return 0 for null/undefined faction', () => {
      expect(FactionStandingsManager.getStanding(null)).toBe(0);
      expect(FactionStandingsManager.getStanding(undefined)).toBe(0);
    });

    it('should return 0 for unknown faction', () => {
      expect(FactionStandingsManager.getStanding('Unknown Faction XYZ')).toBe(0);
    });

    it('should handle case-insensitive faction names', () => {
      const standing = FactionStandingsManager.getStanding('terran republic alliance');
      expect(standing).toBe(50);
    });
  });

  describe('getDiplomacyStatus', () => {
    it('should return neutral for null/undefined faction', () => {
      expect(FactionStandingsManager.getDiplomacyStatus(null))
        .toBe(DiplomacyStatus.NEUTRAL);
      expect(FactionStandingsManager.getDiplomacyStatus(undefined))
        .toBe(DiplomacyStatus.NEUTRAL);
    });

    it('should always return neutral for Neutral faction', () => {
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.NEUTRAL))
        .toBe(DiplomacyStatus.NEUTRAL);
      expect(FactionStandingsManager.getDiplomacyStatus('Neutral'))
        .toBe(DiplomacyStatus.NEUTRAL);
    });

    it('should use correct thresholds', () => {
      // Set standings at exact thresholds
      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, -25, 'test');
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
        .toBe(DiplomacyStatus.ENEMY);

      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, -24, 'test');
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
        .toBe(DiplomacyStatus.NEUTRAL);

      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 25, 'test');
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
        .toBe(DiplomacyStatus.FRIENDLY);

      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 24, 'test');
      expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
        .toBe(DiplomacyStatus.NEUTRAL);
    });
  });

  describe('modifyStanding', () => {
    it('should modify standing by delta', () => {
      const initial = FactionStandingsManager.getStanding(Factions.FREE_TRADERS);
      expect(initial).toBe(0);

      const result = FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 10, 'helped traders');

      expect(result.oldStanding).toBe(0);
      expect(result.newStanding).toBe(10);
      expect(FactionStandingsManager.getStanding(Factions.FREE_TRADERS)).toBe(10);
    });

    it('should clamp standing to [-100, 100]', () => {
      // Try to go above 100
      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 90, 'test');
      const result1 = FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 50, 'test');
      expect(result1.newStanding).toBe(100);

      // Try to go below -100
      FactionStandingsManager.setStanding(Factions.CRIMSON_RAIDERS, -90, 'test');
      const result2 = FactionStandingsManager.modifyStanding(Factions.CRIMSON_RAIDERS, -50, 'test');
      expect(result2.newStanding).toBe(-100);
    });

    it('should detect diplomacy changes', () => {
      // Start neutral, become enemy
      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 0, 'test');
      const result1 = FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, -30, 'attack');
      expect(result1.diplomacyChanged).toBe(true);

      // Stay enemy
      const result2 = FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, -10, 'attack again');
      expect(result2.diplomacyChanged).toBe(false);
    });

    it('should return no change for null faction', () => {
      const result = FactionStandingsManager.modifyStanding(null, 10, 'test');
      expect(result.oldStanding).toBe(0);
      expect(result.newStanding).toBe(0);
      expect(result.diplomacyChanged).toBe(false);
    });

    it('should return no change for Neutral faction', () => {
      const result = FactionStandingsManager.modifyStanding(Factions.NEUTRAL, 50, 'test');
      expect(result.oldStanding).toBe(0);
      expect(result.newStanding).toBe(0);
    });
  });

  describe('setStanding', () => {
    it('should set standing to specific value', () => {
      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 75, 'set test');
      expect(FactionStandingsManager.getStanding(Factions.FREE_TRADERS)).toBe(75);
    });
  });

  describe('Bulk Operations', () => {
    it('getAllStandings should return all standings', () => {
      const standings = FactionStandingsManager.getAllStandings();

      expect(standings[Factions.TERRAN_REPUBLIC]).toBe(50);
      expect(standings[Factions.VOID_CULT]).toBe(-75);
      expect(Object.keys(standings).length).toBeGreaterThanOrEqual(11);
    });

    it('getAllDiplomacy should return all diplomacy statuses', () => {
      const diplomacy = FactionStandingsManager.getAllDiplomacy();

      expect(diplomacy[Factions.TERRAN_REPUBLIC]).toBe(DiplomacyStatus.FRIENDLY);
      expect(diplomacy[Factions.VOID_CULT]).toBe(DiplomacyStatus.ENEMY);
      expect(diplomacy[Factions.FREE_TRADERS]).toBe(DiplomacyStatus.NEUTRAL);
    });

    it('getHostileFactions should return enemy factions', () => {
      const hostiles = FactionStandingsManager.getHostileFactions();

      expect(hostiles).toContain(Factions.CRIMSON_RAIDERS);
      expect(hostiles).toContain(Factions.SHADOW);
      expect(hostiles).toContain(Factions.VOID_CULT);
      expect(hostiles).not.toContain(Factions.TERRAN_REPUBLIC);
    });

    it('getFriendlyFactions should return friendly factions', () => {
      const friendlies = FactionStandingsManager.getFriendlyFactions();

      expect(friendlies).toContain(Factions.TERRAN_REPUBLIC);
      expect(friendlies).toContain(Factions.ZEPHYRIAN);
      expect(friendlies).toContain(Factions.SCIENTISTS);
      expect(friendlies).not.toContain(Factions.VOID_CULT);
    });
  });

  describe('reset', () => {
    it('should restore default standings', () => {
      // Modify some standings
      FactionStandingsManager.setStanding(Factions.TERRAN_REPUBLIC, -50, 'test');
      FactionStandingsManager.setStanding(Factions.VOID_CULT, 100, 'test');

      // Reset
      FactionStandingsManager.reset();

      // Check defaults restored
      expect(FactionStandingsManager.getStanding(Factions.TERRAN_REPUBLIC)).toBe(50);
      expect(FactionStandingsManager.getStanding(Factions.VOID_CULT)).toBe(-75);
    });

    it('should clear history', () => {
      // Make some changes
      FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 10, 'test');

      // Reset
      FactionStandingsManager.reset();

      // History should be empty
      expect(FactionStandingsManager.getHistory()).toHaveLength(0);
    });
  });

  describe('Persistence', () => {
    it('should save and load standings', () => {
      // Modify standings
      FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 50, 'helped');

      // Save
      FactionStandingsManager.save('testKey');

      // Reset
      FactionStandingsManager.reset();
      expect(FactionStandingsManager.getStanding(Factions.FREE_TRADERS)).toBe(0);

      // Load
      const loaded = FactionStandingsManager.load('testKey');
      expect(loaded).toBe(true);
      expect(FactionStandingsManager.getStanding(Factions.FREE_TRADERS)).toBe(50);

      // Cleanup
      localStorage.removeItem('testKey');
    });

    it('should return false when loading non-existent key', () => {
      const loaded = FactionStandingsManager.load('nonExistentKey');
      expect(loaded).toBe(false);
    });

    it('should handle corrupted save data gracefully', () => {
      localStorage.setItem('corruptedKey', 'not valid json{{{');
      const loaded = FactionStandingsManager.load('corruptedKey');
      expect(loaded).toBe(false);

      // Cleanup
      localStorage.removeItem('corruptedKey');
    });

    it('should handle save data without standings', () => {
      localStorage.setItem('noStandingsKey', JSON.stringify({ savedAt: Date.now() }));
      const loaded = FactionStandingsManager.load('noStandingsKey');
      expect(loaded).toBe(false);

      // Cleanup
      localStorage.removeItem('noStandingsKey');
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners on standing change', () => {
      const listener = jest.fn();
      const unsubscribe = FactionStandingsManager.onStandingChanged(listener);

      FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 10, 'test');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        faction: Factions.FREE_TRADERS,
        oldStanding: 0,
        newStanding: 10,
        reason: 'test'
      }));

      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = FactionStandingsManager.onStandingChanged(listener);

      // First call - should be notified
      FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 5, 'test1');
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Second call - should NOT be notified
      FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 5, 'test2');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      FactionStandingsManager.onStandingChanged(badListener);
      FactionStandingsManager.onStandingChanged(goodListener);

      // Should not throw
      expect(() => {
        FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 5, 'test');
      }).not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('History', () => {
    it('should record standing changes', () => {
      FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 10, 'trade mission');
      FactionStandingsManager.modifyStanding(Factions.CRIMSON_RAIDERS, -5, 'combat');

      const history = FactionStandingsManager.getHistory(10);

      expect(history.length).toBeGreaterThanOrEqual(2);

      const lastChange = history[history.length - 1];
      expect(lastChange.faction).toBe(Factions.CRIMSON_RAIDERS);
      expect(lastChange.reason).toBe('combat');
    });

    it('should limit history length', () => {
      // Make many changes
      for (let i = 0; i < 150; i++) {
        FactionStandingsManager.modifyStanding(Factions.FREE_TRADERS, 1, `change ${i}`);
      }

      const history = FactionStandingsManager.getHistory(200);

      // Should be limited to maxHistoryLength (100)
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Stats', () => {
    it('should return accurate statistics', () => {
      const stats = FactionStandingsManager.getStats();

      expect(stats.totalFactions).toBe(11);
      expect(stats.hostile).toBeGreaterThanOrEqual(3); // At least Raiders, Shadow, Void Cult
      expect(stats.friendly).toBeGreaterThanOrEqual(3); // At least Terran, Zephyrian, Scientists
      expect(stats.neutral + stats.hostile + stats.friendly).toBe(stats.totalFactions);
    });
  });
});

describe('FactionStandingsManagerClass (non-singleton)', () => {
  it('should be instantiable for testing', () => {
    const manager = new FactionStandingsManagerClass();

    expect(manager.getStanding(Factions.TERRAN_REPUBLIC)).toBe(50);
  });

  it('should have independent state from singleton', () => {
    const manager = new FactionStandingsManagerClass();

    manager.setStanding(Factions.TERRAN_REPUBLIC, -100, 'test');

    // Singleton should not be affected
    expect(FactionStandingsManager.getStanding(Factions.TERRAN_REPUBLIC)).toBe(50);
    expect(manager.getStanding(Factions.TERRAN_REPUBLIC)).toBe(-100);
  });
});

describe('Diplomacy Threshold Edge Cases', () => {
  beforeEach(() => {
    FactionStandingsManager.reset();
  });

  it('exactly at -25 should be enemy', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, -25, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.ENEMY);
  });

  it('exactly at -26 should be enemy', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, -26, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.ENEMY);
  });

  it('exactly at -24 should be neutral', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, -24, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.NEUTRAL);
  });

  it('exactly at 25 should be friendly', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 25, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.FRIENDLY);
  });

  it('exactly at 24 should be neutral', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 24, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.NEUTRAL);
  });

  it('at -100 should be enemy', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, -100, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.ENEMY);
  });

  it('at 100 should be friendly', () => {
    FactionStandingsManager.setStanding(Factions.FREE_TRADERS, 100, 'test');
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.FRIENDLY);
  });

  it('at 0 should be neutral', () => {
    expect(FactionStandingsManager.getDiplomacyStatus(Factions.FREE_TRADERS))
      .toBe(DiplomacyStatus.NEUTRAL);
  });
});
