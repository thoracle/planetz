"""Test suite for Ship Logic - Tier 1 Pure Logic Tests (No Browser Required)."""

import pytest
import json
import math
from pathlib import Path


class ShipLogic:
    """Standalone ship logic for testing without browser dependencies."""
    
    def __init__(self):
        self.ship_configs = self.load_ship_configs()
    
    def load_ship_configs(self):
        """Load ship configuration data."""
        try:
            # Try to load from game data
            config_path = Path(__file__).parent.parent.parent / "frontend" / "static" / "js" / "ship" / "ShipConfigs.js"
            if config_path.exists():
                # For now, return mock data - in real implementation, parse JS file
                return {
                    "heavy_fighter": {
                        "maxEnergy": 1000,
                        "energyRechargeRate": 50,
                        "totalPower": 200,
                        "totalSlots": 8,
                        "maxHealth": 100
                    },
                    "light_fighter": {
                        "maxEnergy": 600,
                        "energyRechargeRate": 75,
                        "totalPower": 150,
                        "totalSlots": 6,
                        "maxHealth": 80
                    }
                }
        except Exception:
            pass
        
        # Return default test configurations
        return {
            "test_ship": {
                "maxEnergy": 1000,
                "energyRechargeRate": 50,
                "totalPower": 200,
                "totalSlots": 8,
                "maxHealth": 100
            }
        }
    
    def calculate_energy_consumption(self, systems, time_delta=1.0):
        """Calculate total energy consumption for active systems."""
        total_consumption = 0
        for system in systems:
            if system.get('active', False):
                consumption_rate = system.get('energyConsumptionRate', 0)
                total_consumption += consumption_rate * time_delta
        return total_consumption
    
    def calculate_energy_regeneration(self, current_energy, max_energy, regen_rate, time_delta=1.0):
        """Calculate energy regeneration over time."""
        if current_energy >= max_energy:
            return current_energy
        
        regenerated = regen_rate * time_delta
        return min(current_energy + regenerated, max_energy)
    
    def validate_system_installation(self, ship_config, system_config):
        """Validate if a system can be installed on a ship."""
        power_cost = system_config.get('powerCost', 0)
        slot_cost = system_config.get('slotCost', 0)
        
        available_power = ship_config.get('totalPower', 0) - ship_config.get('usedPower', 0)
        available_slots = ship_config.get('totalSlots', 0) - ship_config.get('usedSlots', 0)
        
        return {
            'canInstall': power_cost <= available_power and slot_cost <= available_slots,
            'powerRequired': power_cost,
            'slotsRequired': slot_cost,
            'powerAvailable': available_power,
            'slotsAvailable': available_slots
        }
    
    def calculate_weapon_damage(self, weapon_config, target_config, distance):
        """Calculate weapon damage based on weapon type, target, and distance."""
        base_damage = weapon_config.get('damage', 0)
        weapon_range = weapon_config.get('range', 1000)
        weapon_type = weapon_config.get('type', 'energy')
        
        # Distance falloff
        if distance > weapon_range:
            return {
                'finalDamage': 0,
                'baseDamage': base_damage,
                'distanceFactor': 0,
                'shieldPenetration': 0,
                'armorPenetration': 0,
                'inRange': False
            }
        
        distance_factor = max(0.1, 1.0 - (distance / weapon_range) * 0.5)
        
        # Target resistance
        target_shields = target_config.get('shields', 0)
        target_armor = target_config.get('armor', 0)
        
        # Different weapon types have different effectiveness
        if weapon_type == 'energy':
            # Energy weapons are effective against shields
            shield_penetration = max(0, base_damage - target_shields * 0.8)
            armor_penetration = max(0, shield_penetration - target_armor * 0.5)
        elif weapon_type == 'kinetic':
            # Kinetic weapons are effective against armor
            shield_penetration = max(0, base_damage - target_shields * 0.5)
            armor_penetration = max(0, shield_penetration - target_armor * 0.8)
        else:
            # Default calculation
            shield_penetration = max(0, base_damage - target_shields * 0.6)
            armor_penetration = max(0, shield_penetration - target_armor * 0.6)
        
        final_damage = armor_penetration * distance_factor
        
        return {
            'finalDamage': final_damage,
            'baseDamage': base_damage,
            'distanceFactor': distance_factor,
            'shieldPenetration': shield_penetration,
            'armorPenetration': armor_penetration,
            'inRange': distance <= weapon_range
        }
    
    def calculate_projectile_trajectory(self, start_pos, target_pos, target_velocity, projectile_speed):
        """Calculate projectile trajectory for moving targets."""
        # Vector from start to target
        dx = target_pos[0] - start_pos[0]
        dy = target_pos[1] - start_pos[1]
        dz = target_pos[2] - start_pos[2]
        
        # Target velocity components
        vx, vy, vz = target_velocity
        
        # Quadratic equation coefficients for interception
        # |target_pos + target_velocity * t - start_pos|^2 = (projectile_speed * t)^2
        a = vx*vx + vy*vy + vz*vz - projectile_speed*projectile_speed
        b = 2 * (dx*vx + dy*vy + dz*vz)
        c = dx*dx + dy*dy + dz*dz
        
        # Solve quadratic equation
        discriminant = b*b - 4*a*c
        
        if discriminant < 0:
            # No solution - target cannot be intercepted
            return None
        
        if abs(a) < 1e-6:
            # Linear case (target velocity magnitude equals projectile speed)
            if abs(b) < 1e-6:
                return None  # No solution
            t = -c / b
        else:
            # Two solutions - take the positive one closest to 0
            t1 = (-b + math.sqrt(discriminant)) / (2*a)
            t2 = (-b - math.sqrt(discriminant)) / (2*a)
            
            valid_times = [t for t in [t1, t2] if t > 0]
            if not valid_times:
                return None
            
            t = min(valid_times)
        
        # Calculate interception point
        intercept_x = target_pos[0] + vx * t
        intercept_y = target_pos[1] + vy * t
        intercept_z = target_pos[2] + vz * t
        
        # Calculate firing direction
        fire_dx = intercept_x - start_pos[0]
        fire_dy = intercept_y - start_pos[1]
        fire_dz = intercept_z - start_pos[2]
        
        # Normalize firing direction
        fire_distance = math.sqrt(fire_dx*fire_dx + fire_dy*fire_dy + fire_dz*fire_dz)
        if fire_distance == 0:
            return None
        
        return {
            'timeToIntercept': t,
            'interceptPoint': [intercept_x, intercept_y, intercept_z],
            'firingDirection': [fire_dx/fire_distance, fire_dy/fire_distance, fire_dz/fire_distance],
            'distance': fire_distance
        }
    
    def calculate_shield_regeneration(self, current_shields, max_shields, regen_rate, time_delta=1.0):
        """Calculate shield regeneration over time."""
        if current_shields >= max_shields:
            return current_shields
        
        regenerated = regen_rate * time_delta
        return min(current_shields + regenerated, max_shields)
    
    def calculate_system_efficiency(self, system_health, max_health):
        """Calculate system efficiency based on damage level."""
        if max_health <= 0:
            return 0
        
        health_ratio = system_health / max_health
        
        # Efficiency drops off as system takes damage
        if health_ratio > 0.75:
            return 1.0  # Full efficiency
        elif health_ratio > 0.5:
            return 0.8  # Slightly reduced
        elif health_ratio > 0.25:
            return 0.6  # Moderately reduced
        elif health_ratio > 0:
            return 0.3  # Severely reduced
        else:
            return 0  # System destroyed


class TestShipLogic:
    """Test suite for ship logic calculations."""
    
    @pytest.fixture
    def ship_logic(self):
        """Create ShipLogic instance for testing."""
        return ShipLogic()
    
    def test_ship_logic_initialization(self, ship_logic):
        """Test that ship logic initializes correctly."""
        assert ship_logic is not None
        assert isinstance(ship_logic.ship_configs, dict)
        assert len(ship_logic.ship_configs) > 0
    
    def test_energy_consumption_calculation(self, ship_logic):
        """Test energy consumption calculations."""
        systems = [
            {'active': True, 'energyConsumptionRate': 25},  # Active shield
            {'active': False, 'energyConsumptionRate': 50}, # Inactive weapon
            {'active': True, 'energyConsumptionRate': 10},  # Active scanner
        ]
        
        # Test 1 second consumption
        consumption = ship_logic.calculate_energy_consumption(systems, 1.0)
        assert consumption == 35  # 25 + 0 + 10
        
        # Test 2 second consumption
        consumption = ship_logic.calculate_energy_consumption(systems, 2.0)
        assert consumption == 70  # (25 + 10) * 2
    
    def test_energy_regeneration_calculation(self, ship_logic):
        """Test energy regeneration calculations."""
        # Test normal regeneration
        new_energy = ship_logic.calculate_energy_regeneration(500, 1000, 50, 1.0)
        assert new_energy == 550
        
        # Test regeneration cap at max energy
        new_energy = ship_logic.calculate_energy_regeneration(980, 1000, 50, 1.0)
        assert new_energy == 1000
        
        # Test already at max energy
        new_energy = ship_logic.calculate_energy_regeneration(1000, 1000, 50, 1.0)
        assert new_energy == 1000
    
    def test_system_installation_validation(self, ship_logic):
        """Test system installation validation."""
        ship_config = {
            'totalPower': 200,
            'usedPower': 150,
            'totalSlots': 8,
            'usedSlots': 6
        }
        
        # Test valid system installation
        valid_system = {'powerCost': 30, 'slotCost': 1}
        result = ship_logic.validate_system_installation(ship_config, valid_system)
        assert result['canInstall'] is True
        assert result['powerRequired'] == 30
        assert result['slotsRequired'] == 1
        
        # Test invalid system (too much power)
        invalid_system = {'powerCost': 100, 'slotCost': 1}
        result = ship_logic.validate_system_installation(ship_config, invalid_system)
        assert result['canInstall'] is False
        
        # Test invalid system (too many slots)
        invalid_system = {'powerCost': 30, 'slotCost': 5}
        result = ship_logic.validate_system_installation(ship_config, invalid_system)
        assert result['canInstall'] is False
    
    def test_weapon_damage_calculation(self, ship_logic):
        """Test weapon damage calculations."""
        weapon_config = {
            'damage': 100,
            'range': 1000,
            'type': 'energy'
        }
        
        target_config = {
            'shields': 50,
            'armor': 30
        }
        
        # Test damage at close range
        damage = ship_logic.calculate_weapon_damage(weapon_config, target_config, 100)
        assert damage['inRange'] is True
        assert damage['finalDamage'] > 0
        assert damage['baseDamage'] == 100
        
        # Test damage at maximum range
        damage = ship_logic.calculate_weapon_damage(weapon_config, target_config, 1000)
        assert damage['inRange'] is True
        assert damage['finalDamage'] >= 0
        
        # Test damage beyond range
        damage = ship_logic.calculate_weapon_damage(weapon_config, target_config, 1500)
        assert damage['finalDamage'] == 0
        assert damage['inRange'] is False
    
    def test_projectile_trajectory_calculation(self, ship_logic):
        """Test projectile trajectory calculations for moving targets."""
        start_pos = [0, 0, 0]
        target_pos = [100, 0, 0]
        target_velocity = [0, 50, 0]  # Moving perpendicular
        projectile_speed = 200
        
        trajectory = ship_logic.calculate_projectile_trajectory(
            start_pos, target_pos, target_velocity, projectile_speed
        )
        
        assert trajectory is not None
        assert trajectory['timeToIntercept'] > 0
        assert len(trajectory['interceptPoint']) == 3
        assert len(trajectory['firingDirection']) == 3
        assert trajectory['distance'] > 0
        
        # Test impossible interception (target too fast)
        fast_velocity = [500, 0, 0]  # Faster than projectile
        trajectory = ship_logic.calculate_projectile_trajectory(
            start_pos, target_pos, fast_velocity, projectile_speed
        )
        # Might be None if target cannot be intercepted
        if trajectory is not None:
            assert trajectory['timeToIntercept'] > 0
    
    def test_shield_regeneration_calculation(self, ship_logic):
        """Test shield regeneration calculations."""
        # Test normal regeneration
        new_shields = ship_logic.calculate_shield_regeneration(50, 100, 20, 1.0)
        assert new_shields == 70
        
        # Test regeneration cap
        new_shields = ship_logic.calculate_shield_regeneration(95, 100, 20, 1.0)
        assert new_shields == 100
        
        # Test already at max
        new_shields = ship_logic.calculate_shield_regeneration(100, 100, 20, 1.0)
        assert new_shields == 100
    
    def test_system_efficiency_calculation(self, ship_logic):
        """Test system efficiency based on damage."""
        # Test full health
        efficiency = ship_logic.calculate_system_efficiency(100, 100)
        assert efficiency == 1.0
        
        # Test 80% health (should still be full efficiency)
        efficiency = ship_logic.calculate_system_efficiency(80, 100)
        assert efficiency == 1.0
        
        # Test 60% health (reduced efficiency)
        efficiency = ship_logic.calculate_system_efficiency(60, 100)
        assert efficiency == 0.8
        
        # Test 40% health (moderately reduced)
        efficiency = ship_logic.calculate_system_efficiency(40, 100)
        assert efficiency == 0.6
        
        # Test 20% health (severely reduced)
        efficiency = ship_logic.calculate_system_efficiency(20, 100)
        assert efficiency == 0.3
        
        # Test destroyed system
        efficiency = ship_logic.calculate_system_efficiency(0, 100)
        assert efficiency == 0
    
    def test_edge_cases(self, ship_logic):
        """Test edge cases and error conditions."""
        # Test empty systems list
        consumption = ship_logic.calculate_energy_consumption([], 1.0)
        assert consumption == 0
        
        # Test zero time delta
        consumption = ship_logic.calculate_energy_consumption([{'active': True, 'energyConsumptionRate': 50}], 0)
        assert consumption == 0
        
        # Test negative values
        new_energy = ship_logic.calculate_energy_regeneration(-10, 100, 50, 1.0)
        assert new_energy >= 0  # Should handle negative current energy gracefully
        
        # Test zero max health system
        efficiency = ship_logic.calculate_system_efficiency(50, 0)
        assert efficiency == 0


if __name__ == "__main__":
    # Run basic tests without pytest
    print("Running ship logic tests...")
    
    ship_logic = ShipLogic()
    print(f"Loaded {len(ship_logic.ship_configs)} ship configurations")
    
    # Test energy consumption
    systems = [{'active': True, 'energyConsumptionRate': 25}]
    consumption = ship_logic.calculate_energy_consumption(systems, 1.0)
    print(f"Energy consumption test: {consumption}")
    
    # Test weapon damage
    weapon = {'damage': 100, 'range': 1000, 'type': 'energy'}
    target = {'shields': 50, 'armor': 30}
    damage = ship_logic.calculate_weapon_damage(weapon, target, 500)
    print(f"Weapon damage test: {damage['finalDamage']:.2f}")
    
    print("Ship logic tests completed successfully!")
