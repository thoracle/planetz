import * as THREE from 'three';
import { TargetComputerManager } from '../views/TargetComputerManager.js';

function createMockSolarSystemManager() {
  const bodies = new Map();
  const star = new THREE.Object3D();
  star.position.set(10, 0, -10);
  star.userData = { id: 'A0_star', type: 'star', name: 'Sol' };
  bodies.set('star', star);

  return {
    celestialBodies: bodies,
    getCelestialBodies() { return bodies; },
    getCelestialBodyInfo(obj) {
      if (!obj) return null;
      const name = obj.userData?.name || obj.name || 'Unknown';
      const type = obj.userData?.type || 'unknown';
      const faction = type === 'star' ? 'neutral' : 'friendly';
      return { name, type, faction, diplomacy: faction === 'neutral' ? 'neutral' : 'friendly' };
    }
  };
}

function createDOM() {
  document.body.innerHTML = '';
  const hud = document.createElement('div');
  hud.id = 'target-hud';
  document.body.appendChild(hud);
}

describe('TargetComputerManager basic targeting flow', () => {
  let scene, camera, viewManager, solarSystemManager, manager;

  beforeEach(() => {
    createDOM();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10000);
    camera.position.set(0, 0, 0);
    viewManager = { getShip: () => ({ getSystem: () => null }) };
    solarSystemManager = createMockSolarSystemManager();
    manager = new TargetComputerManager(scene, camera, viewManager, THREE, solarSystemManager);
    // minimal init
    manager.targetHUD = document.getElementById('target-hud');
    manager.targetInfoDisplay = document.createElement('div');
    manager.targetHUD.appendChild(manager.targetInfoDisplay);
    manager.targetReticle = document.createElement('div');
    manager.targetNameDisplay = document.createElement('div');
    manager.targetDistanceDisplay = document.createElement('div');
    manager.targetReticle.appendChild(manager.targetNameDisplay);
    manager.targetReticle.appendChild(manager.targetDistanceDisplay);
    document.body.appendChild(manager.targetReticle);

    // Enable system
    manager.targetComputerEnabled = true;

    // Seed one target object that mirrors Star Charts selection behavior
    const sol = new THREE.Object3D();
    sol.name = 'Sol';
    sol.position.set(10, 0, -10);
    sol.userData = { id: 'A0_star', type: 'star', name: 'Sol' };
    manager.targetObjects = [{
      id: 'A0_star',
      name: 'Sol',
      type: 'star',
      object: sol,
      isShip: false,
      distance: 20.2
    }];
  });

  test('setTargetById selects correct object and updates HUD', () => {
    const ok = manager.setTargetById('A0_star');
    expect(ok).toBe(true);
    expect(manager.currentTarget?.userData?.id).toBe('A0_star');
    // Force one display update for assertions
    manager.updateTargetDisplay();
    expect(manager.targetInfoDisplay.innerHTML).toContain('Sol');
    expect(manager.targetInfoDisplay.innerHTML).toMatch(/Star/i);
  });

  test('setTargetByName selects correct object and updates reticle labels', () => {
    const ok = manager.setTargetByName('Sol');
    expect(ok).toBe(true);
    manager.updateReticleTargetInfo();
    expect(manager.targetNameDisplay.textContent).toBe('Sol');
    // distance string should include km or m
    expect(manager.targetDistanceDisplay.textContent).toMatch(/km|m/);
  });
});


