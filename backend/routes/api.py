"""API routes for the application."""
from flask import Blueprint, jsonify, request
import logging
from backend.PlanetTypes import PLANET_CLASSES
from backend.verse import generate_planet, calculate_checksum
from backend.ShipConfigs import SHIP_CONFIGS, REPAIR_PRICING, CRITICAL_SYSTEMS, get_ship_config, get_available_ship_types, validate_ship_config
import hashlib
import numpy as np
from backend.planetGenerator import PlanetGenerator

api_bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

@api_bp.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Not found'}), 404

@api_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f'Server Error: {error}')
    return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/health')
def health_check():
    """API health check endpoint."""
    return jsonify({'status': 'healthy'})

@api_bp.route('/api/planet-types', methods=['GET'])
def get_planet_types():
    """Get available planet types and their parameters."""
    try:
        return jsonify({
            'status': 'success',
            'data': PLANET_CLASSES
        })
    except Exception as e:
        logger.error(f"Error getting planet types: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get planet types'
        }), 500

@api_bp.route('/api/planet-config', methods=['POST'])
def update_planet_config():
    """Update planet generation parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400

        # Validate required fields
        required_fields = ['planetType', 'parameters']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400

        # Validate planet type
        if data['planetType'] not in PLANET_CLASSES:
            return jsonify({
                'status': 'error',
                'message': 'Invalid planet type'
            }), 400

        # Validate parameters
        required_params = ['noiseScale', 'octaves', 'persistence', 'lacunarity', 'terrainHeight']
        if not all(param in data['parameters'] for param in required_params):
            return jsonify({
                'status': 'error',
                'message': 'Missing required parameters'
            }), 400

        # Here you would typically update the planet configuration
        # For now, we'll just return success
        return jsonify({
            'status': 'success',
            'message': 'Planet configuration updated',
            'data': {
                'planetType': data['planetType'],
                'parameters': data['parameters']
            }
        })

    except Exception as e:
        logger.error(f"Error updating planet config: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update planet configuration'
        }), 500

@api_bp.route('/api/generate-planet', methods=['POST'])
def generate_planet_endpoint():
    """Generate a new planet with the given parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400

        # Validate required fields
        required_fields = ['planetType', 'parameters']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400

        # Generate a seed from the parameters
        param_str = str(data['parameters'])
        seed = int(hashlib.sha256(param_str.encode()).hexdigest(), 16) % (2**32)

        # Generate the planet
        planet = generate_planet(random_seed=seed)
        
        # Calculate checksum for verification
        checksum = calculate_checksum([planet])

        return jsonify({
            'status': 'success',
            'message': 'Planet generated successfully',
            'data': {
                'planet': planet,
                'checksum': checksum,
                'seed': seed
            }
        })

    except Exception as e:
        logger.error(f"Error generating planet: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate planet'
        }), 500

@api_bp.route('/api/chunk-data', methods=['GET'])
def get_chunk_data():
    try:
        # Get chunk coordinates from query parameters
        x = int(request.args.get('x', 0))
        y = int(request.args.get('y', 0))
        z = int(request.args.get('z', 0))
        
        # Get planet parameters from query parameters
        planet_type = request.args.get('planetType', 'Class-M')
        seed = int(request.args.get('seed', 0))
        
        # Validate planet type
        if planet_type not in PLANET_CLASSES:
            return jsonify({'error': 'Invalid planet type'}), 400
        
        # Get planet parameters
        params = PLANET_CLASSES[planet_type]
        
        # Create planet generator with parameters
        generator = PlanetGenerator(
            noise_scale=params['noise_scale'],
            octaves=params['octaves'],
            persistence=params['persistence'],
            lacunarity=params['lacunarity'],
            terrain_height=params['terrain_height'],
            seed=seed
        )
        
        # Generate chunk data
        chunk_size = 16  # Must match frontend chunk size
        density_field = generator.generate_chunk_density_field(x, y, z, chunk_size)
        
        # Convert to list for JSON serialization
        density_field_list = density_field.tolist()
        
        return jsonify({
            'densityField': density_field_list,
            'x': x,
            'y': y,
            'z': z
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 

# =============================================================================
# SHIP SYSTEM API ENDPOINTS
# =============================================================================

@api_bp.route('/api/ship/types', methods=['GET'])
def get_ship_types():
    """Get available ship types and their configurations."""
    try:
        ship_types = get_available_ship_types()
        ship_configs = {ship_type: get_ship_config(ship_type) for ship_type in ship_types}
        
        return jsonify({
            'status': 'success',
            'data': {
                'shipTypes': ship_types,
                'configs': ship_configs
            }
        })
    except Exception as e:
        logger.error(f"Error getting ship types: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get ship types'
        }), 500

@api_bp.route('/api/ship/configs/<ship_type>', methods=['GET'])
def get_ship_config_endpoint(ship_type):
    """Get configuration for a specific ship type."""
    try:
        config = get_ship_config(ship_type)
        if not config:
            return jsonify({
                'status': 'error',
                'message': 'Ship type not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'data': config
        })
    except Exception as e:
        logger.error(f"Error getting ship config for {ship_type}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get ship configuration'
        }), 500

@api_bp.route('/api/ship/status', methods=['POST'])
def get_ship_status():
    """Get current ship and all system status."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No ship data provided'
            }), 400
        
        # Validate ship data structure
        required_fields = ['shipType', 'hull', 'energy', 'systems']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': 'Missing required ship data fields'
            }), 400
        
        # Process and return ship status
        ship_status = {
            'shipType': data['shipType'],
            'hull': data['hull'],
            'energy': data['energy'],
            'systems': data['systems'],
            'timestamp': data.get('timestamp'),
            'location': data.get('location')
        }
        
        return jsonify({
            'status': 'success',
            'data': ship_status
        })
    except Exception as e:
        logger.error(f"Error processing ship status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to process ship status'
        }), 500

@api_bp.route('/api/ship/systems/<system_name>', methods=['GET'])
def get_system_status(system_name):
    """Get status for a specific ship system."""
    try:
        # In a real implementation, this would query the ship's current state
        # For now, return a mock response based on system name
        system_status = {
            'name': system_name,
            'health': 1.0,  # 100% health
            'level': 1,
            'isActive': False,
            'energyConsumption': 0,
            'lastUpdate': None
        }
        
        return jsonify({
            'status': 'success',
            'data': system_status
        })
    except Exception as e:
        logger.error(f"Error getting system status for {system_name}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system status'
        }), 500

@api_bp.route('/api/ship/systems/<system_name>/damage', methods=['POST'])
def apply_system_damage(system_name):
    """Apply damage to a specific ship system."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No damage data provided'
            }), 400
        
        damage_amount = data.get('damage', 0)
        damage_type = data.get('damageType', 'kinetic')
        
        if damage_amount <= 0:
            return jsonify({
                'status': 'error',
                'message': 'Invalid damage amount'
            }), 400
        
        # In a real implementation, this would apply damage to the ship system
        # For now, return a mock response
        result = {
            'systemName': system_name,
            'damageApplied': damage_amount,
            'damageType': damage_type,
            'newHealth': max(0, 1.0 - damage_amount),  # Mock calculation
            'systemStatus': 'operational' if (1.0 - damage_amount) > 0.2 else 'critical'
        }
        
        return jsonify({
            'status': 'success',
            'message': f'Applied {damage_amount} {damage_type} damage to {system_name}',
            'data': result
        })
    except Exception as e:
        logger.error(f"Error applying damage to {system_name}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to apply system damage'
        }), 500

@api_bp.route('/api/ship/systems/<system_name>/repair', methods=['POST'])
def repair_system(system_name):
    """Repair a specific ship system."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No repair data provided'
            }), 400
        
        repair_amount = data.get('repairAmount', 0)
        repair_type = data.get('repairType', 'standard')
        
        if repair_amount <= 0:
            return jsonify({
                'status': 'error',
                'message': 'Invalid repair amount'
            }), 400
        
        # Calculate repair cost
        base_cost = REPAIR_PRICING['baseCosts']['system'] * repair_amount
        is_critical = system_name in CRITICAL_SYSTEMS
        critical_multiplier = REPAIR_PRICING['baseCosts']['critical'] if is_critical else 1.0
        emergency_multiplier = REPAIR_PRICING['baseCosts']['emergency'] if repair_type == 'emergency' else 1.0
        
        total_cost = int(base_cost * critical_multiplier * emergency_multiplier)
        
        # In a real implementation, this would repair the ship system
        # For now, return a mock response
        result = {
            'systemName': system_name,
            'repairAmount': repair_amount,
            'repairType': repair_type,
            'cost': total_cost,
            'newHealth': min(1.0, repair_amount),  # Mock calculation
            'systemStatus': 'operational'
        }
        
        return jsonify({
            'status': 'success',
            'message': f'Repaired {system_name} by {repair_amount * 100}%',
            'data': result
        })
    except Exception as e:
        logger.error(f"Error repairing {system_name}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to repair system'
        }), 500

@api_bp.route('/api/ship/energy', methods=['GET', 'POST'])
def manage_ship_energy():
    """Get or update ship energy status."""
    try:
        if request.method == 'GET':
            # Return mock energy status
            energy_status = {
                'current': 5000,
                'max': 5000,
                'percentage': 100.0,
                'rechargeRate': 50,
                'consumptionRate': 0
            }
            
            return jsonify({
                'status': 'success',
                'data': energy_status
            })
        
        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'No energy data provided'
                }), 400
            
            action = data.get('action')
            amount = data.get('amount', 0)
            
            if action == 'consume':
                # Mock energy consumption
                result = {
                    'action': 'consume',
                    'amount': amount,
                    'success': amount <= 5000,  # Mock check
                    'newEnergy': max(0, 5000 - amount)
                }
            elif action == 'recharge':
                # Mock energy recharge
                result = {
                    'action': 'recharge',
                    'amount': amount,
                    'success': True,
                    'newEnergy': min(5000, amount)
                }
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid energy action'
                }), 400
            
            return jsonify({
                'status': 'success',
                'data': result
            })
    except Exception as e:
        logger.error(f"Error managing ship energy: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to manage ship energy'
        }), 500

@api_bp.route('/api/station/repair/costs', methods=['POST'])
def get_repair_costs():
    """Get repair cost estimates for ship systems."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No ship data provided'
            }), 400
        
        ship_type = data.get('shipType', 'light_fighter')
        systems = data.get('systems', {})
        hull_damage = data.get('hullDamage', 0)
        faction = data.get('faction', 'neutral')
        
        # Calculate repair costs
        costs = {}
        
        # Hull repair cost
        if hull_damage > 0:
            hull_cost = REPAIR_PRICING['baseCosts']['hull'] * hull_damage
            ship_multiplier = REPAIR_PRICING['shipClassMultipliers'].get(ship_type, 1.0)
            faction_multiplier = REPAIR_PRICING['factionDiscounts'].get(faction, 1.0)
            costs['hull'] = int(hull_cost * ship_multiplier * faction_multiplier)
        
        # System repair costs
        for system_name, system_data in systems.items():
            if system_data.get('health', 1.0) < 1.0:
                damage = 1.0 - system_data.get('health', 1.0)
                base_cost = REPAIR_PRICING['baseCosts']['system'] * damage
                is_critical = system_name in CRITICAL_SYSTEMS
                critical_multiplier = REPAIR_PRICING['baseCosts']['critical'] if is_critical else 1.0
                ship_multiplier = REPAIR_PRICING['shipClassMultipliers'].get(ship_type, 1.0)
                faction_multiplier = REPAIR_PRICING['factionDiscounts'].get(faction, 1.0)
                
                costs[system_name] = int(base_cost * critical_multiplier * ship_multiplier * faction_multiplier)
        
        return jsonify({
            'status': 'success',
            'data': {
                'costs': costs,
                'faction': faction,
                'shipType': ship_type,
                'totalCost': sum(costs.values())
            }
        })
    except Exception as e:
        logger.error(f"Error calculating repair costs: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to calculate repair costs'
        }), 500

@api_bp.route('/api/station/repair/hull', methods=['POST'])
def repair_hull():
    """Repair ship hull damage."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No repair data provided'
            }), 400
        
        hull_damage = data.get('hullDamage', 0)
        ship_type = data.get('shipType', 'light_fighter')
        emergency = data.get('emergency', False)
        credits = data.get('credits', 0)
        
        if hull_damage <= 0:
            return jsonify({
                'status': 'error',
                'message': 'No hull damage to repair'
            }), 400
        
        # Calculate cost
        base_cost = REPAIR_PRICING['baseCosts']['hull'] * hull_damage
        ship_multiplier = REPAIR_PRICING['shipClassMultipliers'].get(ship_type, 1.0)
        emergency_multiplier = REPAIR_PRICING['baseCosts']['emergency'] if emergency else 1.0
        total_cost = int(base_cost * ship_multiplier * emergency_multiplier)
        
        if credits < total_cost:
            return jsonify({
                'status': 'error',
                'message': 'Insufficient credits for hull repair'
            }), 400
        
        # Calculate repair time
        repair_time = REPAIR_PRICING['repairTimes']['hull'] * hull_damage
        if emergency:
            repair_time = int(repair_time * REPAIR_PRICING['repairTimes']['emergency'])
        
        result = {
            'repairType': 'hull',
            'hullDamage': hull_damage,
            'cost': total_cost,
            'repairTime': repair_time,
            'emergency': emergency,
            'creditsRemaining': credits - total_cost
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Hull repair completed',
            'data': result
        })
    except Exception as e:
        logger.error(f"Error repairing hull: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to repair hull'
        }), 500

@api_bp.route('/api/station/repair/systems', methods=['POST'])
def repair_systems():
    """Repair selected ship systems."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No repair data provided'
            }), 400
        
        selected_systems = data.get('selectedSystems', [])
        ship_type = data.get('shipType', 'light_fighter')
        emergency = data.get('emergency', False)
        credits = data.get('credits', 0)
        systems_data = data.get('systems', {})
        
        if not selected_systems:
            return jsonify({
                'status': 'error',
                'message': 'No systems selected for repair'
            }), 400
        
        # Calculate total cost and time
        total_cost = 0
        total_time = 0
        repair_results = []
        
        for system_name in selected_systems:
            system_data = systems_data.get(system_name, {})
            health = system_data.get('health', 1.0)
            
            if health < 1.0:
                damage = 1.0 - health
                base_cost = REPAIR_PRICING['baseCosts']['system'] * damage
                is_critical = system_name in CRITICAL_SYSTEMS
                critical_multiplier = REPAIR_PRICING['baseCosts']['critical'] if is_critical else 1.0
                ship_multiplier = REPAIR_PRICING['shipClassMultipliers'].get(ship_type, 1.0)
                emergency_multiplier = REPAIR_PRICING['baseCosts']['emergency'] if emergency else 1.0
                
                system_cost = int(base_cost * critical_multiplier * ship_multiplier * emergency_multiplier)
                
                # Calculate repair time
                base_time = REPAIR_PRICING['repairTimes']['system'] * damage
                time_multiplier = 1.5 if is_critical else 1.0
                emergency_time_multiplier = REPAIR_PRICING['repairTimes']['emergency'] if emergency else 1.0
                system_time = int(base_time * time_multiplier * emergency_time_multiplier)
                
                total_cost += system_cost
                total_time += system_time
                
                repair_results.append({
                    'systemName': system_name,
                    'damage': damage,
                    'cost': system_cost,
                    'repairTime': system_time,
                    'isCritical': is_critical
                })
        
        if credits < total_cost:
            return jsonify({
                'status': 'error',
                'message': 'Insufficient credits for system repairs'
            }), 400
        
        result = {
            'repairType': 'systems',
            'systemsRepaired': len(repair_results),
            'totalCost': total_cost,
            'totalTime': total_time,
            'emergency': emergency,
            'creditsRemaining': credits - total_cost,
            'repairDetails': repair_results
        }
        
        return jsonify({
            'status': 'success',
            'message': f'Repaired {len(repair_results)} systems',
            'data': result
        })
    except Exception as e:
        logger.error(f"Error repairing systems: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to repair systems'
        }), 500

@api_bp.route('/api/station/repair/kits', methods=['GET'])
def get_repair_kits():
    """Get available repair kits and their properties."""
    try:
        repair_kits = {
            'basic': {
                'name': 'Basic Repair Kit',
                'repairAmount': 0.25,  # 25% repair
                'cost': 100,
                'description': 'Basic field repair kit for minor damage'
            },
            'advanced': {
                'name': 'Advanced Repair Kit',
                'repairAmount': 0.50,  # 50% repair
                'cost': 250,
                'description': 'Advanced repair kit for moderate damage'
            },
            'emergency': {
                'name': 'Emergency Repair Kit',
                'repairAmount': 1.0,   # 100% repair
                'cost': 500,
                'description': 'Emergency repair kit for complete restoration'
            }
        }
        
        return jsonify({
            'status': 'success',
            'data': repair_kits
        })
    except Exception as e:
        logger.error(f"Error getting repair kits: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get repair kits'
        }), 500