"""
Economic System Foundation
==========================

This module provides the foundation for the game's economic system,
including resources, trade, markets, and economic interactions.

Key Features:
- Resource management and production
- Market dynamics and pricing
- Trade routes and agreements
- Economic faction interactions
- Supply and demand simulation
"""

import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from backend.game_time import get_game_time
from backend.diplomacy_manager import DiplomacyManager

logger = logging.getLogger(__name__)


class Resource:
    """Represents a game resource with properties and market data."""

    def __init__(self, resource_id: str, name: str, category: str,
                 base_price: float, rarity: str = 'common'):
        """
        Initialize a resource.

        Args:
            resource_id: Unique resource identifier
            name: Display name
            category: Resource category (minerals, technology, luxury, etc.)
            base_price: Base market price
            rarity: Rarity level (common, uncommon, rare, epic, legendary)
        """
        self.id = resource_id
        self.name = name
        self.category = category
        self.base_price = base_price
        self.rarity = rarity

        # Market data
        self.current_price = base_price
        self.supply = 0
        self.demand = 0
        self.price_history: List[Tuple[str, float]] = []

        # Production data
        self.production_rate = 0.0
        self.consumption_rate = 0.0

    def update_price(self, new_price: float) -> None:
        """Update the resource price and record history."""
        self.price_history.append((get_game_time(), self.current_price))
        self.current_price = max(0.1, new_price)  # Minimum price of 0.1

    def get_price_trend(self, periods: int = 10) -> float:
        """
        Calculate price trend over recent periods.

        Args:
            periods: Number of historical periods to analyze

        Returns:
            float: Price trend (-1.0 to 1.0, negative = falling, positive = rising)
        """
        if len(self.price_history) < 2:
            return 0.0

        recent_prices = self.price_history[-periods:] if len(self.price_history) >= periods else self.price_history
        if len(recent_prices) < 2:
            return 0.0

        # Calculate trend as percentage change
        start_price = recent_prices[0][1]
        end_price = recent_prices[-1][1]

        if start_price == 0:
            return 1.0 if end_price > 0 else 0.0

        trend = (end_price - start_price) / start_price
        return max(-1.0, min(1.0, trend))

    def to_dict(self) -> Dict[str, Any]:
        """Convert resource to dictionary for serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'base_price': self.base_price,
            'rarity': self.rarity,
            'current_price': self.current_price,
            'supply': self.supply,
            'demand': self.demand,
            'production_rate': self.production_rate,
            'consumption_rate': self.consumption_rate,
            'price_history': self.price_history[-50:]  # Keep last 50 entries
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Resource':
        """Create resource from dictionary."""
        resource = cls(
            data['id'],
            data['name'],
            data['category'],
            data['base_price'],
            data.get('rarity', 'common')
        )

        resource.current_price = data.get('current_price', data['base_price'])
        resource.supply = data.get('supply', 0)
        resource.demand = data.get('demand', 0)
        resource.production_rate = data.get('production_rate', 0.0)
        resource.consumption_rate = data.get('consumption_rate', 0.0)
        resource.price_history = data.get('price_history', [])

        return resource


class Market:
    """Represents a market location with resource trading."""

    def __init__(self, market_id: str, name: str, faction_control: str,
                 location: Dict[str, float]):
        """
        Initialize a market.

        Args:
            market_id: Unique market identifier
            name: Market name
            faction_control: Controlling faction
            location: Market location coordinates
        """
        self.id = market_id
        self.name = name
        self.faction_control = faction_control
        self.location = location

        # Market inventory and prices
        self.inventory: Dict[str, int] = {}  # resource_id -> quantity
        self.prices: Dict[str, float] = {}   # resource_id -> price

        # Market properties
        self.tax_rate = 0.05  # 5% tax on transactions
        self.volume = 0       # Total trade volume
        self.last_update = get_game_time()

    def get_resource_price(self, resource_id: str, base_price: float) -> float:
        """
        Get the current price of a resource in this market.

        Args:
            resource_id: Resource ID
            base_price: Base price of the resource

        Returns:
            float: Market price including local modifiers
        """
        # Start with base price
        price = base_price

        # Apply local market modifiers
        if resource_id in self.inventory:
            quantity = self.inventory[resource_id]
            # Price decreases with abundance, increases with scarcity
            if quantity > 1000:
                price *= 0.8  # 20% discount for abundant resources
            elif quantity < 100:
                price *= 1.5  # 50% markup for scarce resources

        # Add tax
        price *= (1 + self.tax_rate)

        return round(price, 2)

    def buy_resource(self, resource_id: str, quantity: int,
                    buyer_faction: str) -> Tuple[bool, float]:
        """
        Buy resources from the market.

        Args:
            resource_id: Resource to buy
            quantity: Quantity to buy
            buyer_faction: Buying faction

        Returns:
            tuple: (success, total_cost)
        """
        if resource_id not in self.inventory or self.inventory[resource_id] < quantity:
            return False, 0.0

        # Calculate price (would get from economic system)
        price_per_unit = self.prices.get(resource_id, 100.0)
        total_cost = price_per_unit * quantity

        # Apply faction discounts if applicable
        if buyer_faction == self.faction_control:
            total_cost *= 0.9  # 10% discount for controlling faction

        # Update inventory
        self.inventory[resource_id] -= quantity
        self.volume += total_cost

        return True, total_cost

    def sell_resource(self, resource_id: str, quantity: int,
                     seller_faction: str) -> Tuple[bool, float]:
        """
        Sell resources to the market.

        Args:
            resource_id: Resource to sell
            quantity: Quantity to sell
            seller_faction: Selling faction

        Returns:
            tuple: (success, total_earned)
        """
        # Calculate price (would get from economic system)
        price_per_unit = self.prices.get(resource_id, 100.0)
        total_earned = price_per_unit * quantity

        # Apply faction bonuses if applicable
        if seller_faction == self.faction_control:
            total_earned *= 1.1  # 10% bonus for controlling faction

        # Remove tax
        total_earned *= (1 - self.tax_rate)

        # Update inventory
        if resource_id not in self.inventory:
            self.inventory[resource_id] = 0
        self.inventory[resource_id] += quantity
        self.volume += total_earned

        return True, total_earned

    def to_dict(self) -> Dict[str, Any]:
        """Convert market to dictionary for serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'faction_control': self.faction_control,
            'location': self.location,
            'inventory': self.inventory,
            'prices': self.prices,
            'tax_rate': self.tax_rate,
            'volume': self.volume,
            'last_update': self.last_update
        }


class EconomicSystem:
    """
    Core economic system managing resources, markets, and trade.

    Provides:
    - Resource management and pricing
    - Market simulation
    - Trade route management
    - Economic faction interactions
    """

    def __init__(self, diplomacy_manager: DiplomacyManager):
        """
        Initialize the economic system.

        Args:
            diplomacy_manager: Diplomacy manager for faction relations
        """
        self.diplomacy_manager = diplomacy_manager

        # Core data
        self.resources: Dict[str, Resource] = {}
        self.markets: Dict[str, Market] = {}
        self.trade_routes: Dict[str, Dict[str, Any]] = {}

        # Economic parameters
        self.global_supply_demand_ratio = 1.0
        self.market_volatility = 0.1  # Price volatility factor
        self.last_update = get_game_time()

        # Initialize default resources
        self._initialize_resources()

        logger.info("💰 Economic system initialized")

    def _initialize_resources(self) -> None:
        """Initialize default game resources."""
        default_resources = [
            Resource('iron_ore', 'Iron Ore', 'minerals', 50.0, 'common'),
            Resource('titanium', 'Titanium', 'minerals', 200.0, 'uncommon'),
            Resource('energy_cells', 'Energy Cells', 'technology', 75.0, 'common'),
            Resource('advanced_circuits', 'Advanced Circuits', 'technology', 300.0, 'rare'),
            Resource('luxury_goods', 'Luxury Goods', 'luxury', 500.0, 'rare'),
            Resource('rare_crystals', 'Rare Crystals', 'luxury', 1000.0, 'epic'),
        ]

        for resource in default_resources:
            self.resources[resource.id] = resource

    def add_resource(self, resource: Resource) -> None:
        """
        Add a new resource to the economic system.

        Args:
            resource: Resource to add
        """
        self.resources[resource.id] = resource
        logger.info(f"📦 Resource added: {resource.name}")

    def create_market(self, market_id: str, name: str, faction_control: str,
                     location: Dict[str, float]) -> Market:
        """
        Create a new market.

        Args:
            market_id: Unique market identifier
            name: Market name
            faction_control: Controlling faction
            location: Market location

        Returns:
            Market: Created market
        """
        market = Market(market_id, name, faction_control, location)
        self.markets[market_id] = market

        # Initialize market prices
        for resource in self.resources.values():
            market.prices[resource.id] = resource.current_price

        logger.info(f"🏪 Market created: {name} ({faction_control})")
        return market

    def update_market_prices(self) -> None:
        """Update all market prices based on supply/demand."""
        for market in self.markets.values():
            for resource_id, resource in self.resources.items():
                market_price = market.get_resource_price(resource_id, resource.current_price)
                market.prices[resource_id] = market_price

        self.last_update = get_game_time()

    def simulate_economic_cycle(self) -> None:
        """Simulate one economic cycle with price updates."""
        for resource in self.resources.values():
            # Update supply and demand based on various factors
            supply_change = (resource.production_rate - resource.consumption_rate) * 0.1
            demand_change = self._calculate_demand_change(resource)

            resource.supply = max(0, resource.supply + supply_change)
            resource.demand = max(0, resource.demand + demand_change)

            # Update price based on supply/demand ratio
            if resource.supply > 0:
                ratio = resource.demand / resource.supply
                price_multiplier = 1.0 + (ratio - 1.0) * self.market_volatility
                new_price = resource.current_price * price_multiplier
                resource.update_price(new_price)

        # Update market prices
        self.update_market_prices()

        logger.info("📊 Economic cycle completed - prices updated")

    def _calculate_demand_change(self, resource: Resource) -> float:
        """
        Calculate demand change for a resource.

        Args:
            resource: Resource to calculate demand for

        Returns:
            float: Demand change
        """
        # Base demand change
        base_change = 10.0

        # Modify based on resource category
        if resource.category == 'luxury':
            base_change *= 0.5  # Luxury goods have less elastic demand
        elif resource.category == 'technology':
            base_change *= 1.5  # Tech has higher demand

        # Add some randomness
        import random
        base_change *= (0.8 + random.random() * 0.4)  # ±20% variation

        return base_change

    def create_trade_route(self, route_id: str, market_a: str, market_b: str,
                          distance: float, security_level: str = 'neutral') -> bool:
        """
        Create a trade route between two markets.

        Args:
            route_id: Unique route identifier
            market_a: First market ID
            market_b: Second market ID
            distance: Route distance
            security_level: Route security (safe, neutral, dangerous)

        Returns:
            bool: True if route was created successfully
        """
        if market_a not in self.markets or market_b not in self.markets:
            logger.warning(f"❌ Invalid markets for trade route: {market_a} -> {market_b}")
            return False

        route = {
            'id': route_id,
            'market_a': market_a,
            'market_b': market_b,
            'distance': distance,
            'security_level': security_level,
            'trade_volume': 0,
            'last_used': None,
            'created_at': get_game_time()
        }

        self.trade_routes[route_id] = route
        logger.info(f"🚛 Trade route created: {market_a} <-> {market_b}")
        return True

    def get_resource_price(self, resource_id: str, market_id: Optional[str] = None) -> float:
        """
        Get the current price of a resource.

        Args:
            resource_id: Resource ID
            market_id: Optional market ID for local pricing

        Returns:
            float: Resource price
        """
        if resource_id not in self.resources:
            return 100.0  # Default price

        resource = self.resources[resource_id]

        if market_id and market_id in self.markets:
            market = self.markets[market_id]
            return market.get_resource_price(resource_id, resource.current_price)

        return resource.current_price

    def get_market_info(self, market_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a market.

        Args:
            market_id: Market ID

        Returns:
            dict: Market information or None
        """
        if market_id not in self.markets:
            return None

        market = self.markets[market_id]
        return {
            'id': market.id,
            'name': market.name,
            'faction_control': market.faction_control,
            'location': market.location,
            'inventory_count': len(market.inventory),
            'total_volume': market.volume,
            'tax_rate': market.tax_rate
        }

    def get_trade_route_info(self, route_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a trade route.

        Args:
            route_id: Route ID

        Returns:
            dict: Route information or None
        """
        return self.trade_routes.get(route_id)

    def get_economic_stats(self) -> Dict[str, Any]:
        """
        Get economic system statistics.

        Returns:
            dict: Economic statistics
        """
        total_market_volume = sum(market.volume for market in self.markets.values())
        total_trade_routes = len(self.trade_routes)

        return {
            'total_resources': len(self.resources),
            'total_markets': len(self.markets),
            'total_trade_routes': total_trade_routes,
            'total_market_volume': total_market_volume,
            'global_supply_demand_ratio': self.global_supply_demand_ratio,
            'market_volatility': self.market_volatility,
            'last_update': self.last_update
        }

    def save_economic_data(self, filename: str) -> None:
        """
        Save economic data to file.

        Args:
            filename: Output filename
        """
        data = {
            'resources': {rid: r.to_dict() for rid, r in self.resources.items()},
            'markets': {mid: m.to_dict() for mid, m in self.markets.items()},
            'trade_routes': self.trade_routes,
            'last_update': self.last_update
        }

        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f"💾 Economic data saved to {filename}")

    def load_economic_data(self, filename: str) -> None:
        """
        Load economic data from file.

        Args:
            filename: Input filename
        """
        try:
            with open(filename, 'r') as f:
                data = json.load(f)

            # Load resources
            self.resources = {}
            for rid, rdata in data.get('resources', {}).items():
                self.resources[rid] = Resource.from_dict(rdata)

            # Load markets
            self.markets = {}
            for mid, mdata in data.get('markets', {}).items():
                market = Market(
                    mdata['id'],
                    mdata['name'],
                    mdata['faction_control'],
                    mdata['location']
                )
                market.inventory = mdata.get('inventory', {})
                market.prices = mdata.get('prices', {})
                market.tax_rate = mdata.get('tax_rate', 0.05)
                market.volume = mdata.get('volume', 0)
                market.last_update = mdata.get('last_update', get_game_time())
                self.markets[mid] = market

            self.trade_routes = data.get('trade_routes', {})
            self.last_update = data.get('last_update', get_game_time())

            logger.info(f"📂 Economic data loaded from {filename}")

        except FileNotFoundError:
            logger.warning(f"📄 Economic data file not found: {filename}")
        except Exception as e:
            logger.error(f"❌ Failed to load economic data: {e}")
