"""
🎯 Waypoints System Test Suite
Tests the complete waypoints functionality including creation, targeting, actions, and interruption handling.
"""

import pytest
import asyncio
from playwright.async_api import Page, expect
import json
import time


@pytest.mark.skip(reason="Waypoints system not yet implemented in game - waypointManager undefined")
class TestWaypointsSystem:
    """Test suite for the waypoints system functionality."""

    @pytest.fixture(autouse=True)
    async def setup_waypoints_test(self, page: Page):
        """Set up waypoints test environment."""
        # Navigate to the game
        await page.goto("http://localhost:5001/")
        
        # Wait for game to load
        await page.wait_for_selector("#game-container", timeout=10000)
        
        # Wait for waypoint manager to be available
        await page.wait_for_function(
            "window.waypointManager !== undefined",
            timeout=15000
        )
        
        # Enable debug mode for better testing
        await page.evaluate("window.DEBUG_WAYPOINTS = true")
        
        yield page
        
        # Cleanup - clear any test waypoints
        await page.evaluate("""
            if (window.waypointManager) {
                window.waypointManager.clearAllWaypoints();
            }
        """)

    async def test_waypoint_manager_initialization(self, page: Page):
        """Test that WaypointManager initializes correctly."""
        # Check that waypoint manager exists
        waypoint_manager_exists = await page.evaluate("!!window.waypointManager")
        assert waypoint_manager_exists, "WaypointManager should be initialized"
        
        # Check that action registry is available
        action_registry_exists = await page.evaluate("!!window.waypointManager.actionRegistry")
        assert action_registry_exists, "ActionRegistry should be available"
        
        # Check that all action types are registered
        registered_actions = await page.evaluate("""
            Object.keys(window.waypointManager.actionRegistry.actions)
        """)
        
        expected_actions = [
            'spawn_ships', 'play_comm', 'show_message', 
            'give_reward', 'give_item', 'next_waypoint',
            'mission_update', 'custom_event'
        ]
        
        for action in expected_actions:
            assert action in registered_actions, f"Action '{action}' should be registered"

    async def test_waypoint_creation(self, page: Page):
        """Test creating a basic waypoint."""
        # Create a test waypoint
        waypoint_data = {
            'id': 'test_waypoint_1',
            'name': 'Test Navigation Point',
            'type': 'NAVIGATION',
            'position': [100, 0, 100],
            'description': 'A test waypoint for automated testing',
            'triggers': [{
                'type': 'proximity',
                'parameters': {'distance': 50}
            }],
            'actions': [{
                'type': 'show_message',
                'parameters': {
                    'title': 'Waypoint Reached',
                    'message': 'You have reached the test waypoint!',
                    'duration': 3000
                }
            }]
        }
        
        # Create waypoint via JavaScript
        result = await page.evaluate(f"""
            window.waypointManager.createWaypoint({json.dumps(waypoint_data)})
        """)
        
        assert result is not None, "Waypoint creation should return a result"
        
        # Verify waypoint exists
        waypoint_exists = await page.evaluate("""
            window.waypointManager.getWaypoint('test_waypoint_1') !== null
        """)
        
        assert waypoint_exists, "Created waypoint should exist in manager"

    async def test_waypoint_targeting(self, page: Page):
        """Test targeting a waypoint through the target computer."""
        # First create a waypoint
        await page.evaluate("""
            window.waypointManager.createWaypoint({
                id: 'target_test_waypoint',
                name: 'Target Test Point',
                type: 'NAVIGATION',
                position: [200, 0, 200],
                description: 'Test waypoint for targeting'
            });
        """)
        
        # Target the waypoint
        await page.evaluate("""
            window.targetComputerManager.setVirtualTarget('target_test_waypoint');
        """)
        
        # Verify targeting
        is_waypoint_targeted = await page.evaluate("""
            window.targetComputerManager.isCurrentTargetWaypoint()
        """)
        
        assert is_waypoint_targeted, "Waypoint should be targeted"
        
        # Check current target
        current_target = await page.evaluate("""
            window.targetComputerManager.currentTarget
        """)
        
        assert current_target == 'target_test_waypoint', "Current target should be the waypoint ID"

    async def test_waypoint_interruption_handling(self, page: Page):
        """Test waypoint interruption and resumption."""
        # Create a waypoint and target it
        await page.evaluate("""
            window.waypointManager.createWaypoint({
                id: 'interruption_test_waypoint',
                name: 'Interruption Test Point',
                type: 'NAVIGATION',
                position: [300, 0, 300]
            });
            window.targetComputerManager.setVirtualTarget('interruption_test_waypoint');
        """)
        
        # Simulate interruption by targeting something else
        await page.evaluate("""
            window.targetComputerManager.setTarget('some_other_object');
        """)
        
        # Check that waypoint was stored as interrupted
        has_interrupted_waypoint = await page.evaluate("""
            window.targetComputerManager.hasInterruptedWaypoint()
        """)
        
        assert has_interrupted_waypoint, "Should have an interrupted waypoint"
        
        # Get interrupted waypoint
        interrupted_waypoint = await page.evaluate("""
            window.targetComputerManager.getInterruptedWaypoint()
        """)
        
        assert interrupted_waypoint == 'interruption_test_waypoint', "Interrupted waypoint should be stored"
        
        # Resume interrupted waypoint
        await page.evaluate("""
            window.targetComputerManager.resumeInterruptedWaypoint();
        """)
        
        # Verify resumption
        current_target = await page.evaluate("""
            window.targetComputerManager.currentTarget
        """)
        
        assert current_target == 'interruption_test_waypoint', "Should resume interrupted waypoint"

    async def test_keyboard_shortcuts(self, page: Page):
        """Test waypoint keyboard shortcuts (W key)."""
        # Create and interrupt a waypoint
        await page.evaluate("""
            window.waypointManager.createWaypoint({
                id: 'keyboard_test_waypoint',
                name: 'Keyboard Test Point',
                type: 'NAVIGATION',
                position: [400, 0, 400]
            });
            window.targetComputerManager.setVirtualTarget('keyboard_test_waypoint');
            window.targetComputerManager.setTarget('other_object');
        """)
        
        # Simulate W key press
        await page.keyboard.press('KeyW')
        
        # Wait a moment for the key handler to process
        await page.wait_for_timeout(100)
        
        # Check that waypoint was resumed
        current_target = await page.evaluate("""
            window.targetComputerManager.currentTarget
        """)
        
        assert current_target == 'keyboard_test_waypoint', "W key should resume interrupted waypoint"

    async def test_spawn_ships_action(self, page: Page):
        """Test the spawn_ships action with min/max count."""
        # Create waypoint with spawn_ships action
        waypoint_data = {
            'id': 'spawn_test_waypoint',
            'name': 'Ship Spawn Test',
            'type': 'COMBAT',
            'position': [500, 0, 500],
            'triggers': [{
                'type': 'proximity',
                'parameters': {'distance': 100}
            }],
            'actions': [{
                'type': 'spawn_ships',
                'parameters': {
                    'shipType': 'enemy_fighter',
                    'minCount': 2,
                    'maxCount': 4,
                    'formation': 'line',
                    'faction': 'hostile'
                }
            }]
        }
        
        await page.evaluate(f"""
            window.waypointManager.createWaypoint({json.dumps(waypoint_data)});
        """)
        
        # Test the action execution
        result = await page.evaluate("""
            const waypoint = window.waypointManager.getWaypoint('spawn_test_waypoint');
            const action = waypoint.actions[0];
            window.waypointManager.actionRegistry.create(action.type, action.parameters);
        """)
        
        assert result is not None, "SpawnShipsAction should be created successfully"

    async def test_show_message_action(self, page: Page):
        """Test the show_message action with audio."""
        # Create waypoint with show_message action
        waypoint_data = {
            'id': 'message_test_waypoint',
            'name': 'Message Test',
            'type': 'INTERACTION',
            'position': [600, 0, 600],
            'actions': [{
                'type': 'show_message',
                'parameters': {
                    'title': 'Test Message',
                    'message': 'This is a test message from waypoint system',
                    'duration': 2000,
                    'audioFileId': 'test_audio',
                    'audioVolume': 0.5
                }
            }]
        }
        
        await page.evaluate(f"""
            window.waypointManager.createWaypoint({json.dumps(waypoint_data)});
        """)
        
        # Execute the action
        await page.evaluate("""
            const waypoint = window.waypointManager.getWaypoint('message_test_waypoint');
            const action = waypoint.actions[0];
            const actionInstance = window.waypointManager.actionRegistry.create(action.type, action.parameters);
            actionInstance.execute();
        """)
        
        # Wait for message to appear (if notification system is available)
        await page.wait_for_timeout(500)
        
        # This test mainly verifies the action executes without errors
        # In a real game environment, we'd check for actual UI notifications

    async def test_give_reward_action(self, page: Page):
        """Test the give_reward action integration."""
        # Create waypoint with give_reward action
        waypoint_data = {
            'id': 'reward_test_waypoint',
            'name': 'Reward Test',
            'type': 'OBJECTIVE',
            'position': [700, 0, 700],
            'actions': [{
                'type': 'give_reward',
                'parameters': {
                    'rewardPackageId': 'test_reward_package',
                    'bonusMultiplier': 1.5,
                    'message': 'Congratulations! You earned a reward!'
                }
            }]
        }
        
        await page.evaluate(f"""
            window.waypointManager.createWaypoint({json.dumps(waypoint_data)});
        """)
        
        # Test action creation
        action_created = await page.evaluate("""
            try {
                const waypoint = window.waypointManager.getWaypoint('reward_test_waypoint');
                const action = waypoint.actions[0];
                const actionInstance = window.waypointManager.actionRegistry.create(action.type, action.parameters);
                return actionInstance !== null;
            } catch (error) {
                console.error('Error creating give_reward action:', error);
                return false;
            }
        """)
        
        assert action_created, "GiveRewardAction should be created successfully"

    async def test_waypoint_persistence(self, page: Page):
        """Test waypoint state persistence."""
        # Create a waypoint
        await page.evaluate("""
            window.waypointManager.createWaypoint({
                id: 'persistence_test_waypoint',
                name: 'Persistence Test',
                type: 'CHECKPOINT',
                position: [800, 0, 800],
                status: 'ACTIVE'
            });
        """)
        
        # Save waypoint state
        await page.evaluate("""
            window.waypointManager.persistence.saveWaypointState('persistence_test_waypoint');
        """)
        
        # Clear waypoint from memory
        await page.evaluate("""
            delete window.waypointManager.activeWaypoints['persistence_test_waypoint'];
        """)
        
        # Load waypoint state
        await page.evaluate("""
            window.waypointManager.persistence.loadWaypointState('persistence_test_waypoint');
        """)
        
        # Verify waypoint was restored
        waypoint_restored = await page.evaluate("""
            window.waypointManager.getWaypoint('persistence_test_waypoint') !== null
        """)
        
        assert waypoint_restored, "Waypoint should be restored from persistence"

    async def test_action_registry_functionality(self, page: Page):
        """Test the ActionRegistry registration and creation."""
        # Test that all expected actions are registered
        registered_actions = await page.evaluate("""
            Object.keys(window.waypointManager.actionRegistry.actions)
        """)
        
        assert len(registered_actions) >= 8, "Should have at least 8 registered actions"
        
        # Test creating each action type
        action_types = [
            'spawn_ships', 'play_comm', 'show_message', 
            'give_reward', 'give_item'
        ]
        
        for action_type in action_types:
            action_created = await page.evaluate(f"""
                try {{
                    const action = window.waypointManager.actionRegistry.create('{action_type}', {{}});
                    return action !== null && typeof action.execute === 'function';
                }} catch (error) {{
                    console.error('Error creating {action_type} action:', error);
                    return false;
                }}
            """)
            
            assert action_created, f"Should be able to create {action_type} action"

    async def test_waypoint_chain_functionality(self, page: Page):
        """Test waypoint chain progression."""
        # Create a chain of waypoints
        await page.evaluate("""
            // Create first waypoint in chain
            window.waypointManager.createWaypoint({
                id: 'chain_waypoint_1',
                name: 'Chain Start',
                type: 'NAVIGATION',
                position: [100, 0, 100],
                chainId: 'test_chain',
                actions: [{
                    type: 'next_waypoint',
                    parameters: {
                        nextWaypointId: 'chain_waypoint_2'
                    }
                }]
            });
            
            // Create second waypoint in chain
            window.waypointManager.createWaypoint({
                id: 'chain_waypoint_2',
                name: 'Chain End',
                type: 'OBJECTIVE',
                position: [200, 0, 200],
                chainId: 'test_chain',
                status: 'INACTIVE'
            });
        """)
        
        # Verify chain setup
        chain_setup = await page.evaluate("""
            const wp1 = window.waypointManager.getWaypoint('chain_waypoint_1');
            const wp2 = window.waypointManager.getWaypoint('chain_waypoint_2');
            return wp1 && wp2 && wp1.chainId === wp2.chainId;
        """)
        
        assert chain_setup, "Waypoint chain should be set up correctly"

    async def test_error_handling(self, page: Page):
        """Test error handling in waypoint system."""
        # Test creating waypoint with invalid data
        error_handled = await page.evaluate("""
            try {
                window.waypointManager.createWaypoint({
                    // Missing required fields
                    name: 'Invalid Waypoint'
                });
                return false; // Should not reach here
            } catch (error) {
                return true; // Error was properly thrown
            }
        """)
        
        assert error_handled, "Should handle invalid waypoint data gracefully"
        
        # Test executing non-existent action
        action_error_handled = await page.evaluate("""
            try {
                window.waypointManager.actionRegistry.create('non_existent_action', {});
                return false; // Should not reach here
            } catch (error) {
                return true; // Error was properly thrown
            }
        """)
        
        assert action_error_handled, "Should handle non-existent action types gracefully"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
