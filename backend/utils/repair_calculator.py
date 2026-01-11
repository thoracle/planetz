"""
Centralized repair cost calculator for PlanetZ.

This module provides a single source of truth for all repair cost calculations,
eliminating duplication across API endpoints.
"""

from typing import Optional

# Import REPAIR_PRICING and CRITICAL_SYSTEMS from ShipConfigs
# This avoids circular imports by importing at function level if needed
_repair_pricing = None
_critical_systems = None


def _get_pricing():
    """Lazy load repair pricing to avoid circular imports."""
    global _repair_pricing, _critical_systems
    if _repair_pricing is None:
        from backend.ShipConfigs import REPAIR_PRICING, CRITICAL_SYSTEMS
        _repair_pricing = REPAIR_PRICING
        _critical_systems = CRITICAL_SYSTEMS
    return _repair_pricing, _critical_systems


def calculate_system_repair_cost(
    damage: float,
    system_name: str,
    ship_type: str = 'light_fighter',
    is_emergency: bool = False
) -> int:
    """
    Calculate repair cost for a ship system.

    Args:
        damage: Damage amount (0.0 to 1.0)
        system_name: Name of the system (e.g., 'impulse_engines')
        ship_type: Type of ship for multiplier
        is_emergency: Whether this is an emergency repair (2x cost)

    Returns:
        Total repair cost in credits
    """
    pricing, critical_systems = _get_pricing()

    base_cost = pricing['baseCosts']['system'] * damage
    is_critical = system_name in critical_systems
    critical_multiplier = pricing['baseCosts']['critical'] if is_critical else 1.0
    ship_multiplier = pricing['shipClassMultipliers'].get(ship_type, 1.0)
    emergency_multiplier = pricing['baseCosts']['emergency'] if is_emergency else 1.0

    return int(base_cost * critical_multiplier * ship_multiplier * emergency_multiplier)


def calculate_hull_repair_cost(
    hull_damage: float,
    ship_type: str = 'light_fighter',
    faction: str = 'neutral',
    is_emergency: bool = False
) -> int:
    """
    Calculate repair cost for hull damage.

    Args:
        hull_damage: Hull damage amount (0.0 to 1.0)
        ship_type: Type of ship for multiplier
        faction: Faction for discount ('friendly', 'neutral', 'hostile')
        is_emergency: Whether this is an emergency repair (2x cost)

    Returns:
        Total repair cost in credits
    """
    pricing, _ = _get_pricing()

    base_cost = pricing['baseCosts']['hull'] * hull_damage
    ship_multiplier = pricing['shipClassMultipliers'].get(ship_type, 1.0)
    faction_multiplier = pricing['factionDiscounts'].get(faction, 1.0)
    emergency_multiplier = pricing['baseCosts']['emergency'] if is_emergency else 1.0

    return int(base_cost * ship_multiplier * faction_multiplier * emergency_multiplier)


def calculate_repair_time(
    damage: float,
    repair_type: str = 'system',
    is_critical: bool = False,
    is_emergency: bool = False
) -> int:
    """
    Calculate repair time in seconds.

    Args:
        damage: Damage amount (0.0 to 1.0)
        repair_type: 'hull' or 'system'
        is_critical: Whether this is a critical system (1.5x time)
        is_emergency: Whether this is an emergency repair (0.5x time)

    Returns:
        Repair time in seconds
    """
    pricing, _ = _get_pricing()

    base_time = pricing['repairTimes'].get(repair_type, 30) * damage
    critical_multiplier = 1.5 if is_critical else 1.0
    emergency_multiplier = pricing['repairTimes']['emergency'] if is_emergency else 1.0

    return int(base_time * critical_multiplier * emergency_multiplier)


def calculate_full_repair_cost(
    hull_damage: float,
    systems: dict,
    ship_type: str = 'light_fighter',
    faction: str = 'neutral'
) -> dict:
    """
    Calculate total repair costs for hull and all damaged systems.

    Args:
        hull_damage: Hull damage amount (0.0 to 1.0)
        systems: Dict of system_name -> {'health': float}
        ship_type: Type of ship
        faction: Faction for discounts

    Returns:
        Dict with 'hull', system names, and 'total' costs
    """
    pricing, critical_systems = _get_pricing()
    costs = {}

    # Hull repair cost
    if hull_damage > 0:
        costs['hull'] = calculate_hull_repair_cost(
            hull_damage, ship_type, faction, is_emergency=False
        )

    # System repair costs
    for system_name, system_data in systems.items():
        if isinstance(system_data, dict) and system_data.get('health', 1.0) < 1.0:
            damage = 1.0 - system_data.get('health', 1.0)
            costs[system_name] = calculate_system_repair_cost(
                damage, system_name, ship_type, is_emergency=False
            )

    costs['total'] = sum(costs.values())
    return costs


def is_critical_system(system_name: str) -> bool:
    """Check if a system is classified as critical."""
    _, critical_systems = _get_pricing()
    return system_name in critical_systems
