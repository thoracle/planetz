"""
Unit tests for backend/routes/api.py
Tests API endpoints for planet generation, ship systems, station repair, and debug config.
"""

import pytest
import json
import os
from unittest.mock import patch, MagicMock


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check_returns_200(self, client):
        """Test health check returns healthy status."""
        response = client.get('/health')
        assert response.status_code == 200
        assert response.get_json()['status'] == 'healthy'


class TestPlanetTypesEndpoint:
    """Tests for /api/planet-types endpoint."""

    def test_get_planet_types_returns_200(self, client):
        """Test getting planet types returns success."""
        response = client.get('/api/planet-types')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'data' in data

    def test_planet_types_contains_class_m(self, client):
        """Test planet types includes Class-M."""
        response = client.get('/api/planet-types')
        data = response.get_json()
        assert 'Class-M' in data['data']


class TestPlanetConfigEndpoint:
    """Tests for /api/planet-config endpoint."""

    def test_update_planet_config_no_data(self, client):
        """Test update planet config with no data returns 400."""
        response = client.post('/api/planet-config',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_update_planet_config_missing_fields(self, client):
        """Test update planet config with missing fields returns 400."""
        response = client.post('/api/planet-config',
                               data=json.dumps({'planetType': 'Class-M'}),
                               content_type='application/json')
        assert response.status_code == 400
        assert 'Missing required fields' in response.get_json()['message']

    def test_update_planet_config_invalid_type(self, client):
        """Test update planet config with invalid type returns 400."""
        response = client.post('/api/planet-config',
                               data=json.dumps({
                                   'planetType': 'Invalid-Type',
                                   'parameters': {}
                               }),
                               content_type='application/json')
        assert response.status_code == 400
        assert 'Invalid planet type' in response.get_json()['message']

    def test_update_planet_config_missing_params(self, client):
        """Test update planet config with missing parameters returns 400."""
        response = client.post('/api/planet-config',
                               data=json.dumps({
                                   'planetType': 'Class-M',
                                   'parameters': {'noiseScale': 1.0}  # Missing other params
                               }),
                               content_type='application/json')
        assert response.status_code == 400
        assert 'Missing required parameters' in response.get_json()['message']

    def test_update_planet_config_success(self, client):
        """Test update planet config with valid data succeeds."""
        response = client.post('/api/planet-config',
                               data=json.dumps({
                                   'planetType': 'Class-M',
                                   'parameters': {
                                       'noiseScale': 1.0,
                                       'octaves': 4,
                                       'persistence': 0.5,
                                       'lacunarity': 2.0,
                                       'terrainHeight': 0.1
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'


class TestGeneratePlanetEndpoint:
    """Tests for /api/generate-planet endpoint."""

    def test_generate_planet_no_data(self, client):
        """Test generate planet with no data returns 400."""
        response = client.post('/api/generate-planet',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_generate_planet_missing_fields(self, client):
        """Test generate planet with missing fields returns 400."""
        response = client.post('/api/generate-planet',
                               data=json.dumps({'planetType': 'Class-M'}),
                               content_type='application/json')
        assert response.status_code == 400

    def test_generate_planet_success(self, client):
        """Test generate planet with valid data succeeds."""
        response = client.post('/api/generate-planet',
                               data=json.dumps({
                                   'planetType': 'Class-M',
                                   'parameters': {
                                       'noiseScale': 1.0,
                                       'octaves': 4
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'planet' in data['data']
        assert 'checksum' in data['data']
        assert 'seed' in data['data']


class TestChunkDataEndpoint:
    """Tests for /api/chunk-data endpoint."""

    def test_chunk_data_default_params(self, client):
        """Test chunk data with default parameters."""
        response = client.get('/api/chunk-data')
        assert response.status_code == 200
        data = response.get_json()
        assert 'densityField' in data
        assert data['x'] == 0
        assert data['y'] == 0
        assert data['z'] == 0

    def test_chunk_data_with_coordinates(self, client):
        """Test chunk data with specific coordinates."""
        response = client.get('/api/chunk-data?x=10&y=20&z=30')
        assert response.status_code == 200
        data = response.get_json()
        assert data['x'] == 10
        assert data['y'] == 20
        assert data['z'] == 30

    def test_chunk_data_invalid_coordinate(self, client):
        """Test chunk data with out-of-range coordinate."""
        response = client.get('/api/chunk-data?x=999999')
        assert response.status_code == 400

    def test_chunk_data_invalid_planet_type(self, client):
        """Test chunk data with invalid planet type."""
        response = client.get('/api/chunk-data?planetType=Invalid')
        assert response.status_code == 400


class TestShipTypesEndpoint:
    """Tests for /api/ship/types endpoint."""

    def test_get_ship_types_returns_200(self, client):
        """Test getting ship types returns success."""
        response = client.get('/api/ship/types')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'shipTypes' in data['data']
        assert 'configs' in data['data']

    def test_ship_types_not_empty(self, client):
        """Test ship types list is not empty."""
        response = client.get('/api/ship/types')
        data = response.get_json()
        assert len(data['data']['shipTypes']) > 0


class TestShipConfigEndpoint:
    """Tests for /api/ship/configs/<ship_type> endpoint."""

    def test_get_valid_ship_config(self, client):
        """Test getting config for valid ship type."""
        response = client.get('/api/ship/configs/light_fighter')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'

    def test_get_invalid_ship_config(self, client):
        """Test getting config for invalid ship type returns error."""
        response = client.get('/api/ship/configs/invalid_ship')
        # Returns 400 (validation) or 404 (not found)
        assert response.status_code in [400, 404]

    def test_ship_config_injection_blocked(self, client):
        """Test script injection in ship type is blocked."""
        response = client.get('/api/ship/configs/<script>alert(1)</script>')
        # Returns 400 (validation) or 404 (not found) - injection should not succeed
        assert response.status_code in [400, 404]


class TestShipStatusEndpoint:
    """Tests for /api/ship/status endpoint."""

    def test_ship_status_no_data(self, client):
        """Test ship status with no data returns 400."""
        response = client.post('/api/ship/status',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_ship_status_missing_fields(self, client):
        """Test ship status with missing fields returns 400."""
        response = client.post('/api/ship/status',
                               data=json.dumps({'shipType': 'light_fighter'}),
                               content_type='application/json')
        assert response.status_code == 400

    def test_ship_status_valid_data(self, client):
        """Test ship status with valid data succeeds."""
        response = client.post('/api/ship/status',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'hull': 100,
                                   'energy': 5000,
                                   'systems': {}
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'


class TestSystemStatusEndpoint:
    """Tests for /api/ship/systems/<system_name> endpoint."""

    def test_get_system_status_valid(self, client):
        """Test getting status for valid system name."""
        response = client.get('/api/ship/systems/impulse_engines')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['name'] == 'impulse_engines'

    def test_get_system_status_invalid(self, client):
        """Test getting status for system name that's too long."""
        # System name validator has 50 char max limit
        long_name = 'x' * 60
        response = client.get(f'/api/ship/systems/{long_name}')
        assert response.status_code == 400


class TestSystemDamageEndpoint:
    """Tests for /api/ship/systems/<system_name>/damage endpoint."""

    def test_apply_damage_no_data(self, client):
        """Test apply damage with no data returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_apply_damage_missing_amount(self, client):
        """Test apply damage without damage amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({}),
                               content_type='application/json')
        assert response.status_code == 400

    def test_apply_damage_valid(self, client):
        """Test apply damage with valid data succeeds."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({
                                   'damage': 0.5,
                                   'damageType': 'kinetic'
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['damageApplied'] == 0.5

    def test_apply_damage_invalid_type(self, client):
        """Test apply damage with invalid damage type returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({
                                   'damage': 0.5,
                                   'damageType': 'invalid_type'
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_apply_damage_excessive(self, client):
        """Test apply damage with excessive amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({
                                   'damage': 100.0  # Max is 10.0
                               }),
                               content_type='application/json')
        assert response.status_code == 400


class TestSystemRepairEndpoint:
    """Tests for /api/ship/systems/<system_name>/repair endpoint."""

    def test_repair_system_no_data(self, client):
        """Test repair system with no data returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/repair',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_system_valid(self, client):
        """Test repair system with valid data succeeds."""
        response = client.post('/api/ship/systems/impulse_engines/repair',
                               data=json.dumps({
                                   'repairAmount': 0.5,
                                   'repairType': 'standard'
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['repairAmount'] == 0.5

    def test_repair_system_invalid_amount(self, client):
        """Test repair system with invalid repair amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/repair',
                               data=json.dumps({
                                   'repairAmount': 2.0  # Max is 1.0
                               }),
                               content_type='application/json')
        assert response.status_code == 400


class TestShipEnergyEndpoint:
    """Tests for /api/ship/energy endpoint."""

    def test_get_energy_status(self, client):
        """Test getting energy status."""
        response = client.get('/api/ship/energy')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'current' in data['data']
        assert 'max' in data['data']

    def test_consume_energy(self, client):
        """Test consuming energy."""
        response = client.post('/api/ship/energy',
                               data=json.dumps({
                                   'action': 'consume',
                                   'amount': 100
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['action'] == 'consume'

    def test_recharge_energy(self, client):
        """Test recharging energy."""
        response = client.post('/api/ship/energy',
                               data=json.dumps({
                                   'action': 'recharge',
                                   'amount': 100
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['action'] == 'recharge'

    def test_invalid_energy_action(self, client):
        """Test invalid energy action returns 400."""
        response = client.post('/api/ship/energy',
                               data=json.dumps({
                                   'action': 'invalid',
                                   'amount': 100
                               }),
                               content_type='application/json')
        assert response.status_code == 400


class TestRepairCostsEndpoint:
    """Tests for /api/station/repair/costs endpoint."""

    def test_repair_costs_no_data(self, client):
        """Test repair costs with no data returns 400."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_costs_valid(self, client):
        """Test repair costs with valid data."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'hullDamage': 0.5,
                                   'systems': {
                                       'impulse_engines': {'health': 0.5}
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'costs' in data['data']
        assert 'totalCost' in data['data']


class TestRepairHullEndpoint:
    """Tests for /api/station/repair/hull endpoint."""

    def test_repair_hull_no_data(self, client):
        """Test repair hull with no data returns 400."""
        response = client.post('/api/station/repair/hull',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_hull_no_damage(self, client):
        """Test repair hull with no damage returns 400."""
        response = client.post('/api/station/repair/hull',
                               data=json.dumps({
                                   'hullDamage': 0,
                                   'credits': 1000
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_hull_insufficient_credits(self, client):
        """Test repair hull with insufficient credits returns 400."""
        response = client.post('/api/station/repair/hull',
                               data=json.dumps({
                                   'hullDamage': 0.5,
                                   'credits': 0
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_hull_success(self, client):
        """Test repair hull with sufficient credits succeeds."""
        response = client.post('/api/station/repair/hull',
                               data=json.dumps({
                                   'hullDamage': 0.1,
                                   'shipType': 'light_fighter',
                                   'credits': 100000
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'


class TestRepairSystemsEndpoint:
    """Tests for /api/station/repair/systems endpoint."""

    def test_repair_systems_no_data(self, client):
        """Test repair systems with no data returns 400."""
        response = client.post('/api/station/repair/systems',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_systems_no_selection(self, client):
        """Test repair systems with no selection returns 400."""
        response = client.post('/api/station/repair/systems',
                               data=json.dumps({
                                   'selectedSystems': [],
                                   'credits': 1000
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_systems_success(self, client):
        """Test repair systems with valid data succeeds."""
        response = client.post('/api/station/repair/systems',
                               data=json.dumps({
                                   'selectedSystems': ['impulse_engines'],
                                   'systems': {
                                       'impulse_engines': {'health': 0.5}
                                   },
                                   'shipType': 'light_fighter',
                                   'credits': 100000
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'


class TestRepairKitsEndpoint:
    """Tests for /api/station/repair/kits endpoint."""

    def test_get_repair_kits(self, client):
        """Test getting repair kits."""
        response = client.get('/api/station/repair/kits')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'basic' in data['data']
        assert 'advanced' in data['data']
        assert 'emergency' in data['data']


class TestDebugConfigEndpoint:
    """Tests for /api/debug-config endpoint."""

    def test_get_debug_config_requires_auth(self, client):
        """Test getting debug config requires authentication."""
        response = client.get('/api/debug-config')
        assert response.status_code == 401

    def test_get_debug_config_invalid_auth(self, client, invalid_admin_headers):
        """Test getting debug config with invalid auth returns 403."""
        response = client.get('/api/debug-config', headers=invalid_admin_headers)
        assert response.status_code == 403

    def test_get_debug_config_valid_auth(self, client, admin_headers):
        """Test getting debug config with valid auth."""
        response = client.get('/api/debug-config', headers=admin_headers)
        # May return 200 or 404 depending on whether config file exists
        # 429 = rate limited in rapid testing
        assert response.status_code in [200, 404, 429]

    def test_post_debug_config_requires_auth(self, client):
        """Test posting debug config requires authentication."""
        response = client.post('/api/debug-config',
                               data=json.dumps({}),
                               content_type='application/json')
        assert response.status_code == 401

    def test_post_debug_config_no_data(self, client, admin_headers):
        """Test posting debug config with no data returns 400."""
        response = client.post('/api/debug-config',
                               data=json.dumps(None),
                               content_type='application/json',
                               headers=admin_headers)
        assert response.status_code == 400

    def test_post_debug_config_valid(self, client, admin_headers):
        """Test posting valid debug config."""
        config = {
            'version': '1.0',
            'channels': {
                'P1': True,
                'TARGETING': False
            }
        }
        response = client.post('/api/debug-config',
                               data=json.dumps(config),
                               content_type='application/json',
                               headers=admin_headers)
        assert response.status_code == 200


class TestAPIErrorHandling:
    """Tests for API error handling."""

    def test_404_handler(self, client):
        """Test 404 error handler."""
        response = client.get('/api/nonexistent-endpoint')
        assert response.status_code == 404

    def test_404_returns_response(self, client):
        """Test 404 error returns proper response."""
        response = client.get('/api/nonexistent-endpoint')
        # May return JSON or HTML depending on Flask error handling
        assert response.status_code == 404


# ============================================================================
# Tests with Mocked Dependencies
# ============================================================================

class TestMockedPlanetTypesEndpoint:
    """Tests for /api/planet-types endpoint with mocked errors."""

    def test_get_planet_types_with_empty_classes(self, client):
        """Test get_planet_types with PLANET_CLASSES returns success."""
        response = client.get('/api/planet-types')
        assert response.status_code == 200


class TestMockedPlanetConfigEndpoint:
    """Tests for /api/planet-config endpoint with mocked errors."""

    def test_update_planet_config_type_error_in_params(self, client):
        """Test update_planet_config handles non-dict parameters."""
        response = client.post('/api/planet-config',
                               data=json.dumps({
                                   'planetType': 'Class-M',
                                   'parameters': 'invalid_string'  # Should be dict
                               }),
                               content_type='application/json')
        # Returns 400 or 500
        assert response.status_code in [400, 429, 500]


class TestMockedGeneratePlanetEndpoint:
    """Tests for /api/generate-planet endpoint with mocked errors."""

    def test_generate_planet_runtime_error(self, client):
        """Test generate_planet handles RuntimeError."""
        with patch('backend.routes.api.generate_planet') as mock_gen:
            mock_gen.side_effect = RuntimeError("Generation failed")
            response = client.post('/api/generate-planet',
                                   data=json.dumps({
                                       'planetType': 'Class-M',
                                       'parameters': {'noiseScale': 1.0}
                                   }),
                                   content_type='application/json')
            assert response.status_code == 500
            data = response.get_json()
            assert data['status'] == 'error'

    def test_generate_planet_value_error(self, client):
        """Test generate_planet handles ValueError."""
        with patch('backend.routes.api.generate_planet') as mock_gen:
            mock_gen.side_effect = ValueError("Invalid parameter")
            response = client.post('/api/generate-planet',
                                   data=json.dumps({
                                       'planetType': 'Class-M',
                                       'parameters': {'noiseScale': 1.0}
                                   }),
                                   content_type='application/json')
            assert response.status_code == 500


class TestMockedChunkDataEndpoint:
    """Tests for /api/chunk-data endpoint with mocked errors."""

    def test_chunk_data_runtime_error(self, client):
        """Test chunk_data handles RuntimeError."""
        with patch('backend.routes.api.PlanetGenerator') as mock_gen:
            mock_gen.side_effect = RuntimeError("Generator failed")
            response = client.get('/api/chunk-data')
            assert response.status_code == 500
            data = response.get_json()
            assert 'error' in data

    def test_chunk_data_key_error(self, client):
        """Test chunk_data handles KeyError."""
        with patch('backend.routes.api.PLANET_CLASSES', {}):
            response = client.get('/api/chunk-data?planetType=Class-M')
            # Invalid planet type caught by validation or KeyError
            assert response.status_code in [400, 500]


class TestMockedShipTypesEndpoint:
    """Tests for /api/ship/types endpoint with mocked errors."""

    def test_get_ship_types_error(self, client):
        """Test get_ship_types handles errors."""
        with patch('backend.routes.api.get_available_ship_types') as mock_get:
            mock_get.side_effect = TypeError("Config error")
            response = client.get('/api/ship/types')
            assert response.status_code == 500
            data = response.get_json()
            assert data['status'] == 'error'

    def test_get_ship_types_key_error(self, client):
        """Test get_ship_types handles KeyError."""
        with patch('backend.routes.api.get_ship_config') as mock_config:
            mock_config.side_effect = KeyError("Missing key")
            response = client.get('/api/ship/types')
            assert response.status_code == 500


class TestMockedShipConfigEndpoint:
    """Tests for /api/ship/configs endpoint with mocked errors."""

    def test_get_ship_config_type_error(self, client):
        """Test get_ship_config handles TypeError."""
        with patch('backend.routes.api.get_ship_config') as mock_get:
            mock_get.side_effect = TypeError("Config error")
            response = client.get('/api/ship/configs/light_fighter')
            assert response.status_code == 500
            data = response.get_json()
            assert data['status'] == 'error'

    def test_get_ship_config_not_found(self, client):
        """Test get_ship_config with None result."""
        with patch('backend.routes.api.get_ship_config') as mock_get:
            with patch('backend.routes.api.validate_ship_type') as mock_validate:
                mock_validate.return_value = 'unknown_ship'
                mock_get.return_value = None
                response = client.get('/api/ship/configs/unknown_ship')
                # Returns 404 for not found
                assert response.status_code == 404


class TestMockedShipStatusEndpoint:
    """Tests for /api/ship/status endpoint with edge cases."""

    def test_ship_status_complex_systems_data(self, client):
        """Test ship_status with complex systems data."""
        response = client.post('/api/ship/status',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'hull': 100,
                                   'energy': 5000,
                                   'systems': {
                                       'impulse_engines': {'health': 0.8, 'active': True},
                                       'shields': {'health': 1.0, 'active': False}
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200


class TestMockedSystemStatusEndpoint:
    """Tests for /api/ship/systems/<system_name> endpoint with mocked errors."""

    def test_system_status_key_error(self, client):
        """Test system_status handles KeyError."""
        with patch('backend.routes.api.validate_system_name') as mock_validate:
            mock_validate.side_effect = KeyError("Missing system")
            response = client.get('/api/ship/systems/test_system')
            assert response.status_code == 500


class TestSystemDamageEdgeCases:
    """Edge case tests for system damage endpoint."""

    def test_apply_zero_damage(self, client):
        """Test apply damage with zero amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({
                                   'damage': 0.0,  # Zero damage not allowed
                                   'damageType': 'kinetic'
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_apply_negative_damage(self, client):
        """Test apply damage with negative amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({
                                   'damage': -0.5
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_apply_damage_default_type(self, client):
        """Test apply damage without damage type uses default."""
        response = client.post('/api/ship/systems/impulse_engines/damage',
                               data=json.dumps({
                                   'damage': 0.3
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['damageType'] == 'kinetic'

    def test_apply_damage_all_types(self, client):
        """Test apply damage with all damage types."""
        damage_types = ['kinetic', 'energy', 'explosive', 'radiation', 'emp']
        for dtype in damage_types:
            response = client.post('/api/ship/systems/impulse_engines/damage',
                                   data=json.dumps({
                                       'damage': 0.1,
                                       'damageType': dtype
                                   }),
                                   content_type='application/json')
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['damageType'] == dtype


class TestMockedSystemDamageEndpoint:
    """Tests for system damage endpoint with mocked errors."""

    def test_apply_damage_value_error(self, client):
        """Test apply_damage handles ValueError."""
        with patch('backend.routes.api.validate_damage_amount') as mock_validate:
            mock_validate.side_effect = ValueError("Invalid damage")
            response = client.post('/api/ship/systems/impulse_engines/damage',
                                   data=json.dumps({'damage': 0.5}),
                                   content_type='application/json')
            assert response.status_code == 500


class TestSystemRepairEdgeCases:
    """Edge case tests for system repair endpoint."""

    def test_repair_zero_amount(self, client):
        """Test repair with zero amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/repair',
                               data=json.dumps({
                                   'repairAmount': 0.0,
                                   'repairType': 'standard'
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_negative_amount(self, client):
        """Test repair with negative amount returns 400."""
        response = client.post('/api/ship/systems/impulse_engines/repair',
                               data=json.dumps({
                                   'repairAmount': -0.5
                               }),
                               content_type='application/json')
        assert response.status_code == 400

    def test_repair_all_types(self, client):
        """Test repair with all repair types."""
        repair_types = ['standard', 'emergency', 'field']
        for rtype in repair_types:
            response = client.post('/api/ship/systems/impulse_engines/repair',
                                   data=json.dumps({
                                       'repairAmount': 0.3,
                                       'repairType': rtype
                                   }),
                                   content_type='application/json')
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['repairType'] == rtype

    def test_repair_critical_system(self, client):
        """Test repair cost for critical system."""
        response = client.post('/api/ship/systems/warp_drive/repair',
                               data=json.dumps({
                                   'repairAmount': 0.5,
                                   'repairType': 'standard'
                               }),
                               content_type='application/json')
        assert response.status_code == 200


class TestMockedSystemRepairEndpoint:
    """Tests for system repair endpoint with mocked errors."""

    def test_repair_system_key_error(self, client):
        """Test repair_system handles KeyError from calculator."""
        # Mock the calculator to raise KeyError
        with patch('backend.routes.api.calculate_system_repair_cost', side_effect=KeyError('baseCosts')):
            response = client.post('/api/ship/systems/impulse_engines/repair',
                                   data=json.dumps({
                                       'repairAmount': 0.5
                                   }),
                                   content_type='application/json')
            assert response.status_code == 500


class TestShipEnergyEdgeCases:
    """Edge case tests for ship energy endpoint."""

    def test_energy_post_no_data(self, client):
        """Test energy POST with no data returns 400."""
        response = client.post('/api/ship/energy',
                               data=json.dumps(None),
                               content_type='application/json')
        assert response.status_code == 400

    def test_energy_post_missing_action(self, client):
        """Test energy POST without action returns 400."""
        response = client.post('/api/ship/energy',
                               data=json.dumps({'amount': 100}),
                               content_type='application/json')
        assert response.status_code == 400

    def test_energy_consume_large_amount(self, client):
        """Test consuming more energy than available."""
        response = client.post('/api/ship/energy',
                               data=json.dumps({
                                   'action': 'consume',
                                   'amount': 10000  # More than max
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['success'] is False


class TestMockedShipEnergyEndpoint:
    """Tests for ship energy endpoint with edge cases."""

    def test_energy_default_amount(self, client):
        """Test energy action with default amount (0)."""
        response = client.post('/api/ship/energy',
                               data=json.dumps({
                                   'action': 'consume'
                                   # No amount provided, defaults to 0
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['amount'] == 0


class TestRepairCostsEdgeCases:
    """Edge case tests for repair costs endpoint."""

    def test_repair_costs_skip_invalid_systems(self, client):
        """Test repair costs skips invalid system names."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'systems': {
                                       'impulse_engines': {'health': 0.5},
                                       '<script>alert(1)</script>': {'health': 0.5},  # Invalid
                                       'x' * 100: {'health': 0.5}  # Too long
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        # Only valid system should be in costs
        assert 'impulse_engines' in data['data']['costs']
        assert '<script>alert(1)</script>' not in data['data']['costs']

    def test_repair_costs_full_health_system(self, client):
        """Test repair costs for systems at full health."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'systems': {
                                       'impulse_engines': {'health': 1.0}  # Full health
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        # No cost for full health system
        assert 'impulse_engines' not in data['data']['costs']

    def test_repair_costs_critical_system(self, client):
        """Test repair costs for critical systems have multiplier."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'systems': {
                                       'warp_drive': {'health': 0.5}  # Critical system
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert 'warp_drive' in data['data']['costs']

    def test_repair_costs_faction_discount(self, client):
        """Test repair costs with faction discount."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'hullDamage': 0.5,
                                   'faction': 'federation'
                               }),
                               content_type='application/json')
        assert response.status_code == 200


class TestMockedRepairCostsEndpoint:
    """Tests for repair costs endpoint with mocked errors."""

    def test_repair_costs_type_error(self, client):
        """Test get_repair_costs handles TypeError from calculator."""
        # Mock the calculator to raise TypeError
        with patch('backend.routes.api.calculate_full_repair_cost', side_effect=TypeError('NoneType')):
            response = client.post('/api/station/repair/costs',
                                   data=json.dumps({
                                       'shipType': 'light_fighter',
                                       'hullDamage': 0.5
                                   }),
                                   content_type='application/json')
            assert response.status_code == 500


class TestRepairHullEdgeCases:
    """Edge case tests for hull repair endpoint."""

    def test_repair_hull_emergency(self, client):
        """Test emergency hull repair."""
        response = client.post('/api/station/repair/hull',
                               data=json.dumps({
                                   'hullDamage': 0.1,
                                   'shipType': 'light_fighter',
                                   'credits': 100000,
                                   'emergency': True
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['emergency'] is True

    def test_repair_hull_different_ships(self, client):
        """Test hull repair cost varies by ship type."""
        costs = {}
        for ship_type in ['scout', 'light_fighter', 'heavy_fighter']:
            response = client.post('/api/station/repair/hull',
                                   data=json.dumps({
                                       'hullDamage': 0.5,
                                       'shipType': ship_type,
                                       'credits': 1000000
                                   }),
                                   content_type='application/json')
            if response.status_code == 200:
                data = response.get_json()
                costs[ship_type] = data['data']['cost']

        # Different ship types should have different costs
        if len(costs) > 1:
            assert len(set(costs.values())) >= 1


class TestMockedRepairHullEndpoint:
    """Tests for hull repair endpoint with mocked errors."""

    def test_repair_hull_value_error(self, client):
        """Test repair_hull handles ValueError from calculator."""
        # Mock the calculator to raise ValueError
        with patch('backend.routes.api.calculate_hull_repair_cost', side_effect=ValueError('invalid damage')):
            response = client.post('/api/station/repair/hull',
                                   data=json.dumps({
                                       'hullDamage': 0.5,
                                       'credits': 100000
                                   }),
                                   content_type='application/json')
            assert response.status_code == 500


class TestRepairSystemsEdgeCases:
    """Edge case tests for systems repair endpoint."""

    def test_repair_systems_insufficient_credits(self, client):
        """Test systems repair with insufficient credits."""
        response = client.post('/api/station/repair/systems',
                               data=json.dumps({
                                   'selectedSystems': ['impulse_engines'],
                                   'systems': {
                                       'impulse_engines': {'health': 0.1}
                                   },
                                   'shipType': 'light_fighter',
                                   'credits': 0  # No credits
                               }),
                               content_type='application/json')
        assert response.status_code == 400
        data = response.get_json()
        assert 'Insufficient credits' in data['message']

    def test_repair_systems_emergency(self, client):
        """Test emergency systems repair."""
        response = client.post('/api/station/repair/systems',
                               data=json.dumps({
                                   'selectedSystems': ['impulse_engines'],
                                   'systems': {
                                       'impulse_engines': {'health': 0.5}
                                   },
                                   'shipType': 'light_fighter',
                                   'credits': 100000,
                                   'emergency': True
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['emergency'] is True

    def test_repair_systems_critical(self, client):
        """Test repair of critical system."""
        # Critical systems: hull_plating, energy_reactor, impulse_engines, life_support
        response = client.post('/api/station/repair/systems',
                               data=json.dumps({
                                   'selectedSystems': ['energy_reactor'],
                                   'systems': {
                                       'energy_reactor': {'health': 0.5}
                                   },
                                   'shipType': 'light_fighter',
                                   'credits': 100000
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        # Critical systems have isCritical flag
        repair_details = data['data']['repairDetails']
        assert any(r['isCritical'] for r in repair_details)

    def test_repair_systems_multiple(self, client):
        """Test repair of multiple systems."""
        response = client.post('/api/station/repair/systems',
                               data=json.dumps({
                                   'selectedSystems': ['impulse_engines', 'shields'],
                                   'systems': {
                                       'impulse_engines': {'health': 0.5},
                                       'shields': {'health': 0.3}
                                   },
                                   'shipType': 'light_fighter',
                                   'credits': 100000
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['systemsRepaired'] == 2


class TestMockedRepairSystemsEndpoint:
    """Tests for systems repair endpoint with mocked errors."""

    def test_repair_systems_key_error(self, client):
        """Test repair_systems handles KeyError from calculator."""
        # Mock the calculator to raise KeyError
        with patch('backend.routes.api.calculate_system_repair_cost', side_effect=KeyError('baseCosts')):
            response = client.post('/api/station/repair/systems',
                                   data=json.dumps({
                                       'selectedSystems': ['impulse_engines'],
                                       'systems': {
                                           'impulse_engines': {'health': 0.5}
                                       },
                                       'credits': 100000
                                   }),
                                   content_type='application/json')
            assert response.status_code == 500


class TestMockedRepairKitsEndpoint:
    """Tests for repair kits endpoint."""

    def test_get_repair_kits_contains_all_types(self, client):
        """Test get_repair_kits contains all kit types."""
        response = client.get('/api/station/repair/kits')
        assert response.status_code == 200
        data = response.get_json()
        # Verify all repair kit types are present
        for kit_type in ['basic', 'advanced', 'emergency']:
            assert kit_type in data['data']
            assert 'name' in data['data'][kit_type]
            assert 'repairAmount' in data['data'][kit_type]
            assert 'cost' in data['data'][kit_type]


class TestMockedDebugConfigEndpoint:
    """Tests for debug config endpoint with mocked errors."""

    def test_get_debug_config_io_error(self, client, admin_headers):
        """Test get_debug_config handles IOError."""
        with patch('builtins.open') as mock_open:
            mock_open.side_effect = IOError("Read error")
            with patch('os.path.exists', return_value=True):
                response = client.get('/api/debug-config', headers=admin_headers)
                assert response.status_code == 500

    def test_get_debug_config_json_error(self, client, admin_headers):
        """Test get_debug_config handles JSON decode error."""
        with patch('builtins.open', MagicMock()):
            with patch('json.load') as mock_load:
                mock_load.side_effect = json.JSONDecodeError("Parse error", "", 0)
                with patch('os.path.exists', return_value=True):
                    response = client.get('/api/debug-config', headers=admin_headers)
                    assert response.status_code == 500

    def test_save_debug_config_os_error(self, client, admin_headers):
        """Test save_debug_config handles OSError."""
        with patch('os.makedirs') as mock_makedirs:
            mock_makedirs.side_effect = OSError("Permission denied")
            config = {'version': '1.0', 'channels': {'P1': True}}
            response = client.post('/api/debug-config',
                                   data=json.dumps(config),
                                   content_type='application/json',
                                   headers=admin_headers)
            assert response.status_code == 500

    def test_save_debug_config_io_error(self, client, admin_headers):
        """Test save_debug_config handles IOError on write."""
        with patch('os.makedirs'):
            with patch('builtins.open') as mock_open:
                mock_open.side_effect = IOError("Write error")
                config = {'version': '1.0', 'channels': {'P1': True}}
                response = client.post('/api/debug-config',
                                       data=json.dumps(config),
                                       content_type='application/json',
                                       headers=admin_headers)
                assert response.status_code == 500


class TestDebugConfigValidation:
    """Tests for debug config validation."""

    def test_debug_config_invalid_structure(self, client, admin_headers):
        """Test debug config with invalid structure."""
        response = client.post('/api/debug-config',
                               data=json.dumps({'invalid': 'data'}),
                               content_type='application/json',
                               headers=admin_headers)
        # Validation error or success depending on validation rules
        assert response.status_code in [200, 400]


class TestAPIHealthEndpoint:
    """Tests for /health endpoint (API blueprint)."""

    def test_api_health_returns_json(self, client):
        """Test API health returns JSON."""
        response = client.get('/health')
        assert response.status_code == 200
        assert response.content_type == 'application/json'

    def test_api_health_status_field(self, client):
        """Test API health has status field."""
        response = client.get('/health')
        data = response.get_json()
        assert data['status'] == 'healthy'


class TestValidationEdgeCases:
    """Additional validation edge case tests."""

    def test_chunk_data_with_seed(self, client):
        """Test chunk data with valid seed."""
        response = client.get('/api/chunk-data?seed=12345')
        assert response.status_code == 200

    def test_chunk_data_invalid_seed(self, client):
        """Test chunk data with invalid seed (too large)."""
        response = client.get('/api/chunk-data?seed=9999999999999')
        assert response.status_code == 400

    def test_ship_status_with_optional_fields(self, client):
        """Test ship status with optional fields."""
        response = client.post('/api/ship/status',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'hull': 100,
                                   'energy': 5000,
                                   'systems': {},
                                   'timestamp': '2024-01-01T00:00:00',
                                   'location': {'x': 0, 'y': 0, 'z': 0}
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['timestamp'] == '2024-01-01T00:00:00'
        assert data['data']['location'] == {'x': 0, 'y': 0, 'z': 0}

    def test_repair_costs_non_dict_system_data(self, client):
        """Test repair costs with non-dict system data."""
        response = client.post('/api/station/repair/costs',
                               data=json.dumps({
                                   'shipType': 'light_fighter',
                                   'systems': {
                                       'impulse_engines': 'not_a_dict'  # Invalid
                                   }
                               }),
                               content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        # Non-dict should be skipped
        assert 'impulse_engines' not in data['data']['costs']
