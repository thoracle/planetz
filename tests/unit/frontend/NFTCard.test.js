/**
 * Unit tests for NFTCard class.
 * Tests card creation, stacking logic (Clash Royale mechanics), and metadata.
 */

import NFTCard, {
  CARD_RARITY,
  CARD_TYPES,
  DROP_RATES,
  CARD_DISPLAY_NAMES,
  CARD_ICONS,
  RARITY_CARD_POOLS,
  UPGRADE_REQUIREMENTS
} from '../../../frontend/static/js/ship/NFTCard.js';

describe('NFTCard Constants', () => {
  describe('CARD_RARITY', () => {
    it('should have all rarity levels', () => {
      expect(CARD_RARITY.COMMON).toBe('common');
      expect(CARD_RARITY.RARE).toBe('rare');
      expect(CARD_RARITY.EPIC).toBe('epic');
      expect(CARD_RARITY.LEGENDARY).toBe('legendary');
    });

    it('should have exactly 4 rarity levels', () => {
      expect(Object.keys(CARD_RARITY)).toHaveLength(4);
    });
  });

  describe('DROP_RATES', () => {
    it('should sum to 100%', () => {
      const total = Object.values(DROP_RATES).reduce((sum, rate) => sum + rate, 0);
      expect(total).toBe(100);
    });

    it('should have correct drop rates per rarity', () => {
      expect(DROP_RATES[CARD_RARITY.COMMON]).toBe(70);
      expect(DROP_RATES[CARD_RARITY.RARE]).toBe(20);
      expect(DROP_RATES[CARD_RARITY.EPIC]).toBe(8);
      expect(DROP_RATES[CARD_RARITY.LEGENDARY]).toBe(2);
    });
  });

  describe('CARD_TYPES', () => {
    it('should have core ship systems', () => {
      expect(CARD_TYPES.HULL_PLATING).toBe('hull_plating');
      expect(CARD_TYPES.ENERGY_REACTOR).toBe('energy_reactor');
      expect(CARD_TYPES.SHIELD_GENERATOR).toBe('shield_generator');
      expect(CARD_TYPES.CARGO_HOLD).toBe('cargo_hold');
    });

    it('should have weapon systems', () => {
      expect(CARD_TYPES.LASER_CANNON).toBe('laser_cannon');
      expect(CARD_TYPES.PLASMA_CANNON).toBe('plasma_cannon');
      expect(CARD_TYPES.PHOTON_TORPEDO).toBe('photon_torpedo');
    });

    it('should have operational systems', () => {
      expect(CARD_TYPES.IMPULSE_ENGINES).toBe('impulse_engines');
      expect(CARD_TYPES.WARP_DRIVE).toBe('warp_drive');
      expect(CARD_TYPES.SHIELDS).toBe('shields');
    });

    it('should have sensor systems', () => {
      expect(CARD_TYPES.LONG_RANGE_SCANNER).toBe('long_range_scanner');
      expect(CARD_TYPES.TARGET_COMPUTER).toBe('target_computer');
      expect(CARD_TYPES.SUBSPACE_RADIO).toBe('subspace_radio');
    });
  });

  describe('UPGRADE_REQUIREMENTS (Clash Royale mechanics)', () => {
    it('should have level 1 require 0 cards', () => {
      expect(UPGRADE_REQUIREMENTS[1]).toBe(0);
    });

    it('should have exponential card requirements', () => {
      expect(UPGRADE_REQUIREMENTS[2]).toBe(3);
      expect(UPGRADE_REQUIREMENTS[3]).toBe(6);
      expect(UPGRADE_REQUIREMENTS[4]).toBe(12);
      expect(UPGRADE_REQUIREMENTS[5]).toBe(24);
    });

    it('should double requirements each level after 2', () => {
      expect(UPGRADE_REQUIREMENTS[3]).toBe(UPGRADE_REQUIREMENTS[2] * 2);
      expect(UPGRADE_REQUIREMENTS[4]).toBe(UPGRADE_REQUIREMENTS[3] * 2);
      expect(UPGRADE_REQUIREMENTS[5]).toBe(UPGRADE_REQUIREMENTS[4] * 2);
    });
  });

  describe('RARITY_CARD_POOLS', () => {
    it('should have pools for all rarities', () => {
      expect(RARITY_CARD_POOLS[CARD_RARITY.COMMON]).toBeDefined();
      expect(RARITY_CARD_POOLS[CARD_RARITY.RARE]).toBeDefined();
      expect(RARITY_CARD_POOLS[CARD_RARITY.EPIC]).toBeDefined();
      expect(RARITY_CARD_POOLS[CARD_RARITY.LEGENDARY]).toBeDefined();
    });

    it('should have common pool contain only basic systems', () => {
      const commonPool = RARITY_CARD_POOLS[CARD_RARITY.COMMON];
      expect(commonPool).toContain(CARD_TYPES.LASER_CANNON);
      expect(commonPool).toContain(CARD_TYPES.IMPULSE_ENGINES);
      // Exotic systems should NOT be in common pool
      expect(commonPool).not.toContain(CARD_TYPES.QUANTUM_REACTOR);
      expect(commonPool).not.toContain(CARD_TYPES.VOID_RIPPER);
    });

    it('should have legendary pool contain exotic systems', () => {
      const legendaryPool = RARITY_CARD_POOLS[CARD_RARITY.LEGENDARY];
      expect(legendaryPool).toContain(CARD_TYPES.QUANTUM_REACTOR);
      expect(legendaryPool).toContain(CARD_TYPES.VOID_RIPPER);
      expect(legendaryPool).toContain(CARD_TYPES.TEMPORAL_ENGINE);
    });

    it('should have higher rarities include more card types', () => {
      const commonCount = RARITY_CARD_POOLS[CARD_RARITY.COMMON].length;
      const rareCount = RARITY_CARD_POOLS[CARD_RARITY.RARE].length;
      const epicCount = RARITY_CARD_POOLS[CARD_RARITY.EPIC].length;
      const legendaryCount = RARITY_CARD_POOLS[CARD_RARITY.LEGENDARY].length;

      expect(rareCount).toBeGreaterThan(commonCount);
      expect(epicCount).toBeGreaterThan(rareCount);
      expect(legendaryCount).toBeGreaterThan(epicCount);
    });
  });
});

describe('NFTCard Class', () => {
  describe('Constructor', () => {
    it('should create a card with valid type and default rarity', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON);

      expect(card.cardType).toBe(CARD_TYPES.LASER_CANNON);
      expect(card.rarity).toBe(CARD_RARITY.COMMON);
      expect(card.quantity).toBe(1);
      expect(card.discovered).toBe(false);
    });

    it('should create a card with specified rarity', () => {
      const card = new NFTCard(CARD_TYPES.PLASMA_CANNON, CARD_RARITY.EPIC);

      expect(card.cardType).toBe(CARD_TYPES.PLASMA_CANNON);
      expect(card.rarity).toBe(CARD_RARITY.EPIC);
    });

    it('should create a card with specified token ID', () => {
      const customTokenId = '0xabc123def456';
      const card = new NFTCard(CARD_TYPES.SHIELDS, CARD_RARITY.RARE, customTokenId);

      expect(card.tokenId).toBe(customTokenId);
    });

    it('should auto-generate token ID if not provided', () => {
      const card = new NFTCard(CARD_TYPES.HULL_PLATING);

      expect(card.tokenId).toBeDefined();
      expect(card.tokenId).toMatch(/^0x[a-z0-9]+$/);
    });

    it('should throw error for invalid card type', () => {
      expect(() => {
        new NFTCard('invalid_type');
      }).toThrow('Invalid card type: invalid_type');
    });

    it('should throw error for invalid rarity', () => {
      expect(() => {
        new NFTCard(CARD_TYPES.LASER_CANNON, 'mythical');
      }).toThrow('Invalid rarity: mythical');
    });

    it('should set creation timestamp', () => {
      const before = Date.now();
      const card = new NFTCard(CARD_TYPES.IMPULSE_ENGINES);
      const after = Date.now();

      expect(card.createdAt).toBeGreaterThanOrEqual(before);
      expect(card.createdAt).toBeLessThanOrEqual(after);
    });

    it('should initialize metadata', () => {
      const card = new NFTCard(CARD_TYPES.ENERGY_REACTOR, CARD_RARITY.LEGENDARY);

      expect(card.metadata).toBeDefined();
      expect(card.metadata.name).toBe('Energy Reactor');
      expect(card.metadata.description).toContain('legendary');
      expect(card.metadata.attributes).toBeInstanceOf(Array);
    });
  });

  describe('Token ID Generation', () => {
    it('should generate unique token IDs', () => {
      const card1 = new NFTCard(CARD_TYPES.LASER_CANNON);
      const card2 = new NFTCard(CARD_TYPES.LASER_CANNON);

      expect(card1.tokenId).not.toBe(card2.tokenId);
    });

    it('should generate token IDs starting with 0x', () => {
      const card = new NFTCard(CARD_TYPES.SHIELDS);

      expect(card.tokenId.startsWith('0x')).toBe(true);
    });
  });

  describe('Discovery System', () => {
    it('should start as undiscovered', () => {
      const card = new NFTCard(CARD_TYPES.WARP_DRIVE);

      expect(card.isDiscovered()).toBe(false);
    });

    it('should be discoverable', () => {
      const card = new NFTCard(CARD_TYPES.WARP_DRIVE);
      card.discover();

      expect(card.isDiscovered()).toBe(true);
    });

    it('should not change state on multiple discovers', () => {
      const card = new NFTCard(CARD_TYPES.WARP_DRIVE);
      card.discover();
      card.discover();

      expect(card.isDiscovered()).toBe(true);
      expect(card.discovered).toBe(true);
    });
  });

  describe('Display Methods', () => {
    it('should return correct display name', () => {
      const card = new NFTCard(CARD_TYPES.TARGET_COMPUTER);

      expect(card.getDisplayName()).toBe('Target Computer');
    });

    it('should return correct icon', () => {
      const weaponCard = new NFTCard(CARD_TYPES.LASER_CANNON);
      const engineCard = new NFTCard(CARD_TYPES.IMPULSE_ENGINES);
      const reactorCard = new NFTCard(CARD_TYPES.ENERGY_REACTOR);

      expect(weaponCard.getIcon()).toBe('⚔️');
      expect(engineCard.getIcon()).toBe('🚀');
      expect(reactorCard.getIcon()).toBe('⚡');
    });

    it('should return fallback icon for unknown type', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON);
      // Manually set an unknown type to test fallback
      card.cardType = 'unknown_type_xyz';

      expect(card.getIcon()).toBe('❓');
    });
  });

  describe('Rarity Colors', () => {
    it('should return gray for common', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.COMMON);
      expect(card.getRarityColor()).toBe('#9CA3AF');
    });

    it('should return blue for rare', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.RARE);
      expect(card.getRarityColor()).toBe('#3B82F6');
    });

    it('should return purple for epic', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.EPIC);
      expect(card.getRarityColor()).toBe('#8B5CF6');
    });

    it('should return gold for legendary', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.LEGENDARY);
      expect(card.getRarityColor()).toBe('#F59E0B');
    });
  });

  describe('System Category', () => {
    it('should categorize core systems', () => {
      const hullCard = new NFTCard(CARD_TYPES.HULL_PLATING);
      const reactorCard = new NFTCard(CARD_TYPES.ENERGY_REACTOR);

      expect(hullCard.getSystemCategory()).toBe('Core Systems');
      expect(reactorCard.getSystemCategory()).toBe('Core Systems');
    });

    it('should categorize weapon systems', () => {
      const laserCard = new NFTCard(CARD_TYPES.LASER_CANNON);
      const missileCard = new NFTCard(CARD_TYPES.PHOTON_TORPEDO);

      expect(laserCard.getSystemCategory()).toBe('Weapon Systems');
      expect(missileCard.getSystemCategory()).toBe('Weapon Systems');
    });

    it('should categorize operational systems', () => {
      const engineCard = new NFTCard(CARD_TYPES.IMPULSE_ENGINES);
      const warpCard = new NFTCard(CARD_TYPES.WARP_DRIVE);

      expect(engineCard.getSystemCategory()).toBe('Operational Systems');
      expect(warpCard.getSystemCategory()).toBe('Operational Systems');
    });

    it('should categorize sensor systems', () => {
      const scannerCard = new NFTCard(CARD_TYPES.LONG_RANGE_SCANNER);
      const targetCard = new NFTCard(CARD_TYPES.TARGET_COMPUTER);

      expect(scannerCard.getSystemCategory()).toBe('Sensor Systems');
      expect(targetCard.getSystemCategory()).toBe('Sensor Systems');
    });

    it('should categorize alien technology', () => {
      const zephyrianCard = new NFTCard(CARD_TYPES.ZEPHYRIAN_CRYSTAL);

      expect(zephyrianCard.getSystemCategory()).toBe('Alien Technology');
    });

    it('should categorize experimental systems', () => {
      const probabilityCard = new NFTCard(CARD_TYPES.PROBABILITY_DRIVE);

      expect(probabilityCard.getSystemCategory()).toBe('Experimental Systems');
    });
  });

  describe('Card Stats', () => {
    it('should return stats for card type', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON);
      const stats = card.getStats();

      expect(stats.power).toBeDefined();
      expect(stats.mass).toBeDefined();
      expect(stats.damage).toBeDefined();
    });

    it('should apply rarity multiplier to stats', () => {
      const commonCard = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.COMMON);
      const legendaryCard = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.LEGENDARY);

      const commonStats = commonCard.getStats();
      const legendaryStats = legendaryCard.getStats();

      // Legendary should have 2x the stats of common
      expect(legendaryStats.damage).toBe(commonStats.damage * 2);
    });

    it('should preserve special properties without multiplier', () => {
      const card = new NFTCard(CARD_TYPES.NANITE_SWARM, CARD_RARITY.LEGENDARY);
      const stats = card.getStats();

      expect(stats.special).toBe('self-repair');
    });

    it('should return default stats for unknown type', () => {
      const card = new NFTCard(CARD_TYPES.LASER_CANNON);
      card.cardType = 'unknown_xyz';
      const stats = card.getStats();

      expect(stats.power).toBeDefined();
      expect(stats.mass).toBeDefined();
    });
  });

  describe('Metadata (ERC-721 compatible)', () => {
    it('should generate valid metadata structure', () => {
      const card = new NFTCard(CARD_TYPES.QUANTUM_REACTOR, CARD_RARITY.EPIC);
      const metadata = card.getMetadata();

      expect(metadata.name).toBe('Quantum Reactor');
      expect(metadata.tokenId).toBe(card.tokenId);
      expect(metadata.rarity).toBe(CARD_RARITY.EPIC);
      expect(metadata.description).toBeDefined();
      expect(metadata.image).toBeDefined();
      expect(metadata.attributes).toBeInstanceOf(Array);
    });

    it('should include correct attributes', () => {
      const card = new NFTCard(CARD_TYPES.SHIELDS, CARD_RARITY.RARE);
      const metadata = card.getMetadata();

      const systemTypeAttr = metadata.attributes.find(a => a.trait_type === 'System Type');
      const rarityAttr = metadata.attributes.find(a => a.trait_type === 'Rarity');
      const categoryAttr = metadata.attributes.find(a => a.trait_type === 'Category');
      const dropRateAttr = metadata.attributes.find(a => a.trait_type === 'Drop Rate');

      expect(systemTypeAttr.value).toBe('Deflector Shield Generator');
      expect(rarityAttr.value).toBe('Rare');
      expect(categoryAttr).toBeDefined();
      expect(dropRateAttr.value).toBe('20%');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const card = new NFTCard(CARD_TYPES.PLASMA_CANNON, CARD_RARITY.EPIC);
      card.discover();

      const json = card.toJSON();

      expect(json.cardType).toBe(CARD_TYPES.PLASMA_CANNON);
      expect(json.rarity).toBe(CARD_RARITY.EPIC);
      expect(json.tokenId).toBe(card.tokenId);
      expect(json.discovered).toBe(true);
      expect(json.metadata).toBeDefined();
      expect(json.createdAt).toBeDefined();
    });

    it('should deserialize from JSON', () => {
      const original = new NFTCard(CARD_TYPES.WARP_DRIVE, CARD_RARITY.LEGENDARY);
      original.discover();

      const json = original.toJSON();
      const restored = NFTCard.fromJSON(json);

      expect(restored.cardType).toBe(original.cardType);
      expect(restored.rarity).toBe(original.rarity);
      expect(restored.tokenId).toBe(original.tokenId);
      expect(restored.discovered).toBe(original.discovered);
    });

    it('should handle missing optional fields in fromJSON', () => {
      const minimalData = {
        cardType: CARD_TYPES.SHIELDS,
        rarity: CARD_RARITY.COMMON,
        tokenId: '0xtest123'
      };

      const card = NFTCard.fromJSON(minimalData);

      expect(card.discovered).toBe(false);
      expect(card.createdAt).toBeDefined();
    });
  });

  describe('Cloning', () => {
    it('should create a clone with different token ID', () => {
      const original = new NFTCard(CARD_TYPES.IMPULSE_ENGINES, CARD_RARITY.RARE);
      original.discover();

      const clone = original.clone();

      expect(clone.cardType).toBe(original.cardType);
      expect(clone.rarity).toBe(original.rarity);
      expect(clone.tokenId).not.toBe(original.tokenId);
      expect(clone.discovered).toBe(original.discovered);
    });
  });

  describe('Static Methods', () => {
    describe('getUpgradeRequirement', () => {
      it('should return correct requirements for each level', () => {
        expect(NFTCard.getUpgradeRequirement(1)).toBe(0);
        expect(NFTCard.getUpgradeRequirement(2)).toBe(3);
        expect(NFTCard.getUpgradeRequirement(3)).toBe(6);
        expect(NFTCard.getUpgradeRequirement(4)).toBe(12);
        expect(NFTCard.getUpgradeRequirement(5)).toBe(24);
      });

      it('should return 0 for undefined levels', () => {
        expect(NFTCard.getUpgradeRequirement(6)).toBe(0);
        expect(NFTCard.getUpgradeRequirement(0)).toBe(0);
      });
    });
  });
});

describe('Card Stacking Logic (Clash Royale Mechanics)', () => {
  it('cards are never consumed - quantity is always 1', () => {
    const card = new NFTCard(CARD_TYPES.LASER_CANNON);

    // In Clash Royale style, cards stack but each card's quantity is 1
    // Stacking is handled by CardInventory, not the card itself
    expect(card.quantity).toBe(1);
  });

  it('cloned cards accumulate for upgrades', () => {
    const original = new NFTCard(CARD_TYPES.LASER_CANNON, CARD_RARITY.COMMON);
    const cards = [original];

    // Simulate collecting more cards
    for (let i = 0; i < 5; i++) {
      cards.push(original.clone());
    }

    expect(cards).toHaveLength(6);
    // All cards have same type and rarity
    cards.forEach(card => {
      expect(card.cardType).toBe(CARD_TYPES.LASER_CANNON);
      expect(card.rarity).toBe(CARD_RARITY.COMMON);
    });
    // But different token IDs
    const uniqueTokenIds = new Set(cards.map(c => c.tokenId));
    expect(uniqueTokenIds.size).toBe(6);
  });

  it('upgrade thresholds match Clash Royale progression', () => {
    // Level 1 -> 2: need 3 cards (have 1, need 2 more)
    // Level 2 -> 3: need 6 cards
    // Level 3 -> 4: need 12 cards
    // Level 4 -> 5: need 24 cards
    // Total to max: 1 + 3 + 6 + 12 + 24 = 46 cards

    const totalToMax =
      1 + // base card
      NFTCard.getUpgradeRequirement(2) +
      NFTCard.getUpgradeRequirement(3) +
      NFTCard.getUpgradeRequirement(4) +
      NFTCard.getUpgradeRequirement(5);

    expect(totalToMax).toBe(46);
  });
});
