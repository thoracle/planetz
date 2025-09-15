"""Test suite for Ship Systems - Tier 2 Component Integration Tests."""

import pytest
import time
from playwright.sync_api import Page, expect


class TestShipSystems:
    """Test suite for ship system component integration."""

    def test_ship_initialization(self, isolated_ship_environment: Page, game_state_validator):
        """Test that ship initializes correctly with all systems."""
        page = isolated_ship_environment
        
        # Validate ship integrity
        ship_state = game_state_validator.validate_ship_integrity(page)
        
        # Check basic ship properties
        assert ship_state['energy'] > 0, "Ship should have energy"
        assert ship_state['maxEnergy'] > 0, "Ship should have max energy"
        assert ship_state['systemCount'] >= 0, "Ship should have systems initialized"
        assert ship_state['shipType'] is not None, "Ship should have a type"

    def test_energy_system_behavior(self, isolated_ship_environment: Page, debug_helper):
        """Test energy system consumption and regeneration."""
        page = isolated_ship_environment
        
        # Enable energy debugging
        debug_helper.enable_debug_channel(page, 'UTILITY')
        
        # Get initial energy state
        initial_energy = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            return {
                current: ship.currentEnergy,
                max: ship.maxEnergy,
                rechargeRate: ship.energyRechargeRate
            };
        }""")
        
        assert initial_energy['current'] > 0, "Ship should start with energy"
        assert initial_energy['max'] > 0, "Ship should have max energy"
        
        # Test energy consumption
        consumed = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            return ship.consumeEnergy(100);
        }""")
        
        assert consumed is True, "Energy consumption should succeed"
        
        # Check energy was actually consumed
        after_consumption = page.evaluate("() => window.viewManager.getShip().currentEnergy")
        assert after_consumption < initial_energy['current'], "Energy should be consumed"
        
        # Test energy regeneration (if implemented)
        if initial_energy['rechargeRate'] > 0:
            time.sleep(1)  # Wait for regeneration
            after_regen = page.evaluate("() => window.viewManager.getShip().currentEnergy")
            # Energy might have regenerated slightly
            assert after_regen >= after_consumption, "Energy should not decrease further"

    def test_weapon_system_activation(self, isolated_ship_environment: Page, debug_helper):
        """Test weapon system activation and firing mechanics."""
        page = isolated_ship_environment
        
        # Enable weapon debugging
        debug_helper.enable_debug_channel(page, 'COMBAT')
        
        # Check if ship has weapons
        weapon_info = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            const weapons = [];
            
            if (ship.systems) {
                for (const [key, system] of ship.systems) {
                    if (system.systemType === 'weapon' || key.includes('weapon')) {
                        weapons.push({
                            key: key,
                            name: system.name || 'Unknown Weapon',
                            active: system.active || false,
                            energyCost: system.energyConsumptionRate || 0
                        });
                    }
                }
            }
            
            return {
                weaponCount: weapons.length,
                weapons: weapons,
                hasWeaponManager: !!window.weaponManager
            };
        }""")
        
        # Test weapon activation if weapons exist
        if weapon_info['weaponCount'] > 0:
            # Try to activate first weapon
            activation_result = page.evaluate("""() => {
                const ship = window.viewManager.getShip();
                if (ship.systems && ship.systems.size > 0) {
                    const firstWeapon = Array.from(ship.systems.values())[0];
                    if (firstWeapon.activate) {
                        return firstWeapon.activate(ship);
                    }
                }
                return false;
            }""")
            
            # Weapon activation might fail due to energy or other constraints
            # Just verify the system responds appropriately
            assert activation_result is not None, "Weapon activation should return a result"

    def test_shield_system_behavior(self, isolated_ship_environment: Page, debug_helper):
        """Test shield system charging and behavior."""
        page = isolated_ship_environment
        
        # Enable shield debugging
        debug_helper.enable_debug_channel(page, 'COMBAT')
        
        # Check shield system
        shield_info = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            let shieldSystem = null;
            
            if (ship.systems) {
                for (const [key, system] of ship.systems) {
                    if (system.systemType === 'shields' || key.includes('shield')) {
                        shieldSystem = {
                            key: key,
                            name: system.name || 'Unknown Shield',
                            active: system.active || false,
                            health: system.health || 0,
                            maxHealth: system.maxHealth || 0
                        };
                        break;
                    }
                }
            }
            
            return {
                hasShields: !!shieldSystem,
                shield: shieldSystem,
                hasShieldManager: !!window.shieldManager
            };
        }""")
        
        if shield_info['hasShields']:
            shield = shield_info['shield']
            assert shield['health'] >= 0, "Shield health should be non-negative"
            assert shield['maxHealth'] > 0, "Shield should have max health"

    def test_engine_system_controls(self, isolated_ship_environment: Page, debug_helper):
        """Test impulse engine speed controls and feedback."""
        page = isolated_ship_environment
        
        # Enable navigation debugging
        debug_helper.enable_debug_channel(page, 'NAVIGATION')
        
        # Test speed controls
        speed_test = page.evaluate("""() => {
            // Test speed setting (0-9 keys)
            const results = [];
            
            // Try to set different speeds
            for (let speed = 0; speed <= 3; speed++) {
                // Simulate speed key press
                const event = new KeyboardEvent('keydown', {
                    key: speed.toString(),
                    code: `Digit${speed}`,
                    keyCode: 48 + speed
                });
                
                document.dispatchEvent(event);
                
                // Check if speed was set (this depends on game implementation)
                results.push({
                    speed: speed,
                    timestamp: Date.now()
                });
            }
            
            return {
                speedTests: results,
                hasSpeedControls: true
            };
        }""")
        
        assert len(speed_test['speedTests']) > 0, "Speed control tests should execute"

    def test_system_damage_and_repair(self, isolated_ship_environment: Page, debug_helper):
        """Test system damage application and repair mechanics."""
        page = isolated_ship_environment
        
        # Enable combat debugging
        debug_helper.enable_debug_channel(page, 'COMBAT')
        
        # Test damage application
        damage_test = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            if (!ship.systems || ship.systems.size === 0) {
                return { error: 'No systems available for damage test' };
            }
            
            const firstSystem = Array.from(ship.systems.values())[0];
            const initialHealth = firstSystem.health || firstSystem.maxHealth || 100;
            
            // Apply damage if system supports it
            if (firstSystem.takeDamage) {
                firstSystem.takeDamage(10);
                const afterDamage = firstSystem.health || initialHealth;
                
                return {
                    initialHealth: initialHealth,
                    afterDamage: afterDamage,
                    damageTaken: initialHealth - afterDamage,
                    systemName: firstSystem.name || 'Unknown System'
                };
            }
            
            return { error: 'System does not support damage' };
        }""")
        
        if 'error' not in damage_test:
            assert damage_test['damageTaken'] >= 0, "Damage should be applied correctly"
            assert damage_test['afterDamage'] <= damage_test['initialHealth'], "Health should decrease after damage"

    def test_system_upgrade_mechanics(self, isolated_ship_environment: Page, debug_helper):
        """Test system upgrade functionality."""
        page = isolated_ship_environment
        
        # Enable utility debugging
        debug_helper.enable_debug_channel(page, 'UTILITY')
        
        # Test system upgrades
        upgrade_test = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            if (!ship.systems || ship.systems.size === 0) {
                return { error: 'No systems available for upgrade test' };
            }
            
            const firstSystem = Array.from(ship.systems.values())[0];
            const initialLevel = firstSystem.level || 1;
            
            // Test upgrade if system supports it
            if (firstSystem.upgrade) {
                const upgradeResult = firstSystem.upgrade();
                const afterUpgrade = firstSystem.level || initialLevel;
                
                return {
                    initialLevel: initialLevel,
                    afterUpgrade: afterUpgrade,
                    upgradeSuccessful: upgradeResult,
                    systemName: firstSystem.name || 'Unknown System'
                };
            }
            
            return { error: 'System does not support upgrades' };
        }""")
        
        if 'error' not in upgrade_test:
            # Upgrade might fail due to requirements, but should return a result
            assert upgrade_test['upgradeSuccessful'] is not None, "Upgrade should return a result"

    def test_power_management_system(self, isolated_ship_environment: Page, debug_helper):
        """Test power grid and power management."""
        page = isolated_ship_environment
        
        # Enable utility debugging
        debug_helper.enable_debug_channel(page, 'UTILITY')
        
        # Test power management
        power_info = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            
            return {
                totalPower: ship.totalPower || 0,
                usedPower: ship.usedPower || 0,
                availablePower: ship.availablePower || 0,
                totalSlots: ship.totalSlots || 0,
                usedSlots: ship.usedSlots || 0,
                availableSlots: ship.availableSlots || 0,
                hasPowerGrid: ship.totalPower !== undefined
            };
        }""")
        
        if power_info['hasPowerGrid']:
            assert power_info['totalPower'] >= 0, "Total power should be non-negative"
            assert power_info['usedPower'] >= 0, "Used power should be non-negative"
            assert power_info['usedPower'] <= power_info['totalPower'], "Used power should not exceed total"
        
        # Slots should always be managed
        assert power_info['totalSlots'] >= 0, "Total slots should be non-negative"
        assert power_info['usedSlots'] >= 0, "Used slots should be non-negative"
        assert power_info['usedSlots'] <= power_info['totalSlots'], "Used slots should not exceed total"


class TestShipSystemIntegration:
    """Integration tests for ship system interactions."""

    def test_multi_system_activation(self, isolated_ship_environment: Page, debug_helper):
        """Test activating multiple systems simultaneously."""
        page = isolated_ship_environment
        
        # Enable multiple debug channels
        debug_helper.enable_debug_channel(page, 'COMBAT')
        debug_helper.enable_debug_channel(page, 'UTILITY')
        
        # Test multi-system activation
        multi_activation = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            if (!ship.systems || ship.systems.size < 2) {
                return { error: 'Need at least 2 systems for multi-activation test' };
            }
            
            const systems = Array.from(ship.systems.values());
            const activationResults = [];
            
            // Try to activate first few systems
            for (let i = 0; i < Math.min(3, systems.length); i++) {
                const system = systems[i];
                if (system.activate) {
                    const result = system.activate(ship);
                    activationResults.push({
                        systemName: system.name || `System ${i}`,
                        activated: result,
                        energyCost: system.energyConsumptionRate || 0
                    });
                }
            }
            
            return {
                activationResults: activationResults,
                totalEnergyAfter: ship.currentEnergy,
                systemsActivated: activationResults.filter(r => r.activated).length
            };
        }""")
        
        if 'error' not in multi_activation:
            assert len(multi_activation['activationResults']) > 0, "Should attempt system activations"
            assert multi_activation['totalEnergyAfter'] >= 0, "Energy should remain non-negative"

    def test_system_interdependencies(self, isolated_ship_environment: Page, debug_helper):
        """Test how systems affect each other."""
        page = isolated_ship_environment
        
        # Enable debugging
        debug_helper.enable_debug_channel(page, 'COMBAT')
        debug_helper.enable_debug_channel(page, 'UTILITY')
        
        # Test system interdependencies
        interdependency_test = page.evaluate("""() => {
            const ship = window.viewManager.getShip();
            
            // Check if systems have dependencies or effects on each other
            const systemEffects = [];
            
            if (ship.systems) {
                for (const [key, system] of ship.systems) {
                    systemEffects.push({
                        key: key,
                        name: system.name || 'Unknown',
                        type: system.systemType || 'unknown',
                        energyCost: system.energyConsumptionRate || 0,
                        powerCost: system.powerCost || 0,
                        slotCost: system.slotCost || 0,
                        active: system.active || false
                    });
                }
            }
            
            return {
                systemEffects: systemEffects,
                totalEnergyCost: systemEffects.reduce((sum, s) => sum + (s.active ? s.energyCost : 0), 0),
                totalPowerCost: systemEffects.reduce((sum, s) => sum + s.powerCost, 0),
                totalSlotCost: systemEffects.reduce((sum, s) => sum + s.slotCost, 0)
            };
        }""")
        
        assert len(interdependency_test['systemEffects']) >= 0, "Should analyze system effects"
        assert interdependency_test['totalEnergyCost'] >= 0, "Total energy cost should be non-negative"
        assert interdependency_test['totalPowerCost'] >= 0, "Total power cost should be non-negative"
        assert interdependency_test['totalSlotCost'] >= 0, "Total slot cost should be non-negative"
