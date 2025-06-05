# StarF*ckers: Unit Testing Plan for Refactoring 🧪

**Purpose**: Comprehensive testing strategy to enable safe refactoring of large files  
**Target**: Increase test coverage from 85% to 95% while supporting modular architecture  
**Status**: Pre-Refactoring Testing Foundation

---

## 📊 **Current Testing State**

### **Existing Test Coverage**
| Component | Current Coverage | Target Coverage | Priority |
|-----------|------------------|-----------------|----------|
| **Ship Systems** | 95% | 98% | High |
| **Card System** | 90% | 95% | High |
| **Combat System** | 85% | 95% | High |
| **UI Components** | 80% | 90% | Medium |
| **3D Rendering** | 75% | 85% | Medium |
| **Large Files (Target)** | ~60% | 95% | **Critical** |

### **Files Requiring Intensive Testing** (Pre-Refactoring)
1. **app.js** (88KB, 2,228 lines) - Core application logic
2. **CardInventoryUI.js** (54KB, 1,462 lines) - Complex UI management
3. **DamageControlInterface.js** (45KB, 1,285 lines) - System monitoring

---

## 🎯 **Testing Strategy Overview**

### **Phase 1: Pre-Refactoring Test Foundation** (Current Focus)
- **Characterization Tests**: Document current behavior of monolithic files
- **Integration Tests**: Verify component interactions work correctly
- **Regression Tests**: Ensure refactoring doesn't break existing functionality
- **Behavior Preservation**: Capture all current functionality before changes

### **Phase 2: Modular Architecture Testing** (Post-Refactoring)
- **Unit Tests**: Test individual modules in isolation
- **Interface Tests**: Verify module boundaries and contracts
- **Event-Driven Tests**: Test EventBus communication patterns
- **Integration Tests**: Verify modular system works as whole

---

## 🧪 **Detailed Testing Plans**

### **1. app.js Testing Plan** (Priority: Critical)

#### **Current Monolithic Structure Analysis**
```javascript
// Key areas requiring intensive testing
class App {
    - Scene management and Three.js integration
    - Planet generation and chunk management  
    - Input handling and keyboard controls
    - Debug system and mode switching
    - GUI management and parameter controls
    - Animation loop and rendering pipeline
    - Mode management (edit/game modes)
    - WebAssembly worker communication
}
```

#### **Pre-Refactoring Test Suite**

**A. Scene Management Tests**
```javascript
describe('App - Scene Management', () => {
    let app;
    
    beforeEach(() => {
        app = new App(mockContainer);
    });
    
    test('initializes Three.js scene correctly', () => {
        expect(app.scene).toBeInstanceOf(THREE.Scene);
        expect(app.camera).toBeInstanceOf(THREE.PerspectiveCamera);
        expect(app.renderer).toBeInstanceOf(THREE.WebGLRenderer);
    });
    
    test('sets up lighting correctly', () => {
        const lights = app.scene.children.filter(child => 
            child instanceof THREE.Light
        );
        expect(lights.length).toBeGreaterThan(0);
    });
    
    test('handles window resize correctly', () => {
        const originalWidth = app.renderer.domElement.width;
        const originalHeight = app.renderer.domElement.height;
        
        window.dispatchEvent(new Event('resize'));
        
        // Verify camera and renderer updated
        expect(app.camera.aspect).toBe(window.innerWidth / window.innerHeight);
        expect(app.renderer.getSize().width).toBe(window.innerWidth);
    });
});
```

**B. Planet Generation Tests**
```javascript
describe('App - Planet Generation', () => {
    test('creates planet generator with correct parameters', () => {
        const app = new App(mockContainer);
        expect(app.planetGenerator).toBeDefined();
        expect(app.planetGenerator.gridSize).toBe(64);
    });
    
    test('updates planet when parameters change', async () => {
        const app = new App(mockContainer);
        const originalPlanet = app.currentPlanet;
        
        app.updatePlanetParameters({ noiseScale: 0.5 });
        
        expect(app.currentPlanet).not.toBe(originalPlanet);
    });
    
    test('handles planet generation errors gracefully', async () => {
        const app = new App(mockContainer);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        app.planetGenerator.generatePlanet = jest.fn().mockRejectedValue(new Error('Generation failed'));
        
        await app.updatePlanetParameters({});
        
        expect(consoleSpy).toHaveBeenCalled();
    });
});
```

**C. Input Handling Tests**
```javascript
describe('App - Input Handling', () => {
    test('keyboard controls work correctly', () => {
        const app = new App(mockContainer);
        const eventSpy = jest.spyOn(app, 'handleKeyPress');
        
        const keyEvent = new KeyboardEvent('keydown', { key: 'f' });
        document.dispatchEvent(keyEvent);
        
        expect(eventSpy).toHaveBeenCalledWith('f');
    });
    
    test('mode-specific key handling', () => {
        const app = new App(mockContainer);
        app.editMode = true;
        
        const keyEvent = new KeyboardEvent('keydown', { key: 'f' });
        document.dispatchEvent(keyEvent);
        
        // In edit mode, 'f' should not trigger view change
        expect(app.currentView).not.toBe('front');
    });
});
```

#### **Post-Refactoring Module Tests**

**A. ApplicationCore Tests**
```javascript
describe('ApplicationCore', () => {
    test('initializes all managers correctly', async () => {
        const core = new ApplicationCore();
        await core.initialize();
        
        expect(core.sceneManager).toBeInstanceOf(SceneManager);
        expect(core.inputManager).toBeInstanceOf(InputManager);
        expect(core.debugManager).toBeInstanceOf(DebugManager);
        expect(core.eventBus).toBeInstanceOf(EventBus);
    });
    
    test('coordinates manager lifecycle', async () => {
        const core = new ApplicationCore();
        const sceneInitSpy = jest.spyOn(SceneManager.prototype, 'initialize');
        const inputInitSpy = jest.spyOn(InputManager.prototype, 'initialize');
        
        await core.initialize();
        
        expect(sceneInitSpy).toHaveBeenCalled();
        expect(inputInitSpy).toHaveBeenCalled();
    });
});
```

**B. EventBus Communication Tests**
```javascript
describe('EventBus Communication', () => {
    test('events propagate between modules', () => {
        const eventBus = new EventBus();
        const sceneManager = new SceneManager(eventBus);
        const inputManager = new InputManager(eventBus);
        
        const handler = jest.fn();
        eventBus.subscribe('sceneChanged', handler);
        
        sceneManager.changeScene('front');
        
        expect(handler).toHaveBeenCalledWith({ view: 'front' });
    });
});
```

### **2. CardInventoryUI.js Testing Plan** (Priority: Critical)

#### **Current Structure Analysis**
```javascript
// Key areas requiring testing
class CardInventoryUI {
    - UI rendering and grid layout
    - Drag and drop functionality
    - Data management and card filtering
    - Ship configuration integration
    - Audio and visual effects
    - Shop mode vs inventory mode
    - Responsive design handling
}
```

#### **Pre-Refactoring Test Suite**

**A. UI Rendering Tests**
```javascript
describe('CardInventoryUI - Rendering', () => {
    test('renders card grid correctly', () => {
        const cardUI = new CardInventoryUI(mockContainer);
        const mockCards = createMockCardInventory();
        
        cardUI.render(mockCards);
        
        const gridItems = cardUI.container.querySelectorAll('.card-item');
        expect(gridItems.length).toBe(mockCards.length);
    });
    
    test('handles empty inventory correctly', () => {
        const cardUI = new CardInventoryUI(mockContainer);
        
        cardUI.render([]);
        
        expect(cardUI.container.textContent).toContain('No cards available');
    });
    
    test('renders ship slots correctly', () => {
        const cardUI = new CardInventoryUI(mockContainer);
        
        cardUI.renderShipSlots(mockShipConfiguration);
        
        const slots = cardUI.container.querySelectorAll('.ship-slot');
        expect(slots.length).toBe(mockShipConfiguration.totalSlots);
    });
});
```

**B. Drag and Drop Tests**
```javascript
describe('CardInventoryUI - Drag and Drop', () => {
    test('initiates drag correctly', () => {
        const cardUI = new CardInventoryUI(mockContainer);
        const mockCard = createMockCard();
        cardUI.render([mockCard]);
        
        const cardElement = cardUI.container.querySelector('.card-item');
        const dragEvent = new DragEvent('dragstart');
        
        cardElement.dispatchEvent(dragEvent);
        
        expect(cardUI.draggedCard).toBe(mockCard);
    });
    
    test('validates drop targets correctly', () => {
        const cardUI = new CardInventoryUI(mockContainer);
        const weaponCard = createMockCard({ type: 'weapon' });
        const shieldSlot = createMockSlot({ type: 'shield' });
        
        const isValid = cardUI.validateDropTarget(weaponCard, shieldSlot);
        
        expect(isValid).toBe(false);
    });
    
    test('handles successful drop', () => {
        const cardUI = new CardInventoryUI(mockContainer);
        const weaponCard = createMockCard({ type: 'weapon' });
        const weaponSlot = createMockSlot({ type: 'weapon' });
        
        cardUI.handleDrop(weaponCard, weaponSlot);
        
        expect(weaponSlot.equippedCard).toBe(weaponCard);
        expect(cardUI.ship.getEquippedCard('weapon')).toBe(weaponCard);
    });
});
```

#### **Post-Refactoring Module Tests**

**A. CardInventoryController Tests**
```javascript
describe('CardInventoryController', () => {
    test('coordinates between data and UI managers', () => {
        const controller = new CardInventoryController();
        const dataManager = controller.dataManager;
        const uiRenderer = controller.uiRenderer;
        
        const mockCards = createMockCardInventory();
        controller.setCards(mockCards);
        
        expect(dataManager.cards).toBe(mockCards);
        expect(uiRenderer.render).toHaveBeenCalledWith(mockCards);
    });
});
```

**B. CardDragDropManager Tests**
```javascript
describe('CardDragDropManager', () => {
    test('handles drag operations independently', () => {
        const dragDropManager = new CardDragDropManager();
        const mockCard = createMockCard();
        
        dragDropManager.startDrag(mockCard);
        
        expect(dragDropManager.draggedItem).toBe(mockCard);
        expect(dragDropManager.isDragging).toBe(true);
    });
});
```

### **3. DamageControlInterface.js Testing Plan** (Priority: High)

#### **Current Structure Analysis**
```javascript
// Key areas requiring testing
class DamageControlInterface {
    - UI creation and layout management
    - System health monitoring
    - Repair logic and cost calculation
    - CSS generation and styling
    - Event handling and user interaction
    - Real-time updates and animations
}
```

#### **Pre-Refactoring Test Suite**

**A. System Monitoring Tests**
```javascript
describe('DamageControlInterface - System Monitoring', () => {
    test('displays all ship systems correctly', () => {
        const damageUI = new DamageControlInterface();
        const mockShip = createMockShipWithSystems();
        
        damageUI.updateDisplay(mockShip);
        
        const systemCards = damageUI.container.querySelectorAll('.system-card');
        expect(systemCards.length).toBe(mockShip.systems.length);
    });
    
    test('updates health displays correctly', () => {
        const damageUI = new DamageControlInterface();
        const mockShip = createMockShipWithSystems();
        mockShip.systems[0].health = 50; // 50% health
        
        damageUI.updateDisplay(mockShip);
        
        const healthBar = damageUI.container.querySelector('.health-bar');
        expect(healthBar.style.width).toBe('50%');
    });
    
    test('handles critical damage states', () => {
        const damageUI = new DamageControlInterface();
        const mockShip = createMockShipWithSystems();
        mockShip.systems[0].health = 10; // Critical
        
        damageUI.updateDisplay(mockShip);
        
        const systemCard = damageUI.container.querySelector('.system-card');
        expect(systemCard.classList.contains('critical')).toBe(true);
    });
});
```

**B. Repair Logic Tests**
```javascript
describe('DamageControlInterface - Repair Logic', () => {
    test('calculates repair costs correctly', () => {
        const damageUI = new DamageControlInterface();
        const mockSystem = { health: 50, maxHealth: 100, repairCost: 10 };
        
        const cost = damageUI.calculateRepairCost(mockSystem);
        
        expect(cost).toBe(500); // 50 health * 10 cost per point
    });
    
    test('handles repair button clicks', () => {
        const damageUI = new DamageControlInterface();
        const mockShip = createMockShipWithSystems();
        const repairSpy = jest.spyOn(mockShip, 'repairSystem');
        
        damageUI.updateDisplay(mockShip);
        const repairButton = damageUI.container.querySelector('.repair-button');
        repairButton.click();
        
        expect(repairSpy).toHaveBeenCalled();
    });
});
```

#### **Post-Refactoring Module Tests**

**A. SystemHealthMonitor Tests**
```javascript
describe('SystemHealthMonitor', () => {
    test('monitors system health independently', () => {
        const monitor = new SystemHealthMonitor();
        const mockSystem = createMockSystem({ health: 75 });
        
        monitor.addSystem(mockSystem);
        const status = monitor.getSystemStatus(mockSystem.id);
        
        expect(status.health).toBe(75);
        expect(status.status).toBe('operational');
    });
});
```

---

## 🏗️ **Testing Infrastructure Setup**

### **1. Enhanced Jest Configuration**

```javascript
// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/static/js/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
    },
    collectCoverageFrom: [
        'frontend/static/js/**/*.js',
        '!frontend/static/js/vendor/**',
        '!frontend/static/js/workers/**'
    ],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90
        },
        './frontend/static/js/app.js': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95
        },
        './frontend/static/js/CardInventoryUI.js': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95
        }
    }
};
```

### **2. Test Utilities and Mocks**

```javascript
// tests/utils/mockFactories.js
export const createMockShipWithSystems = () => ({
    systems: [
        createMockSystem({ name: 'Impulse Engines', health: 100 }),
        createMockSystem({ name: 'Shields', health: 75 }),
        createMockSystem({ name: 'Weapons', health: 50 })
    ],
    repairSystem: jest.fn()
});

export const createMockCard = (overrides = {}) => ({
    id: 'test-card-1',
    name: 'Test Card',
    type: 'weapon',
    level: 1,
    rarity: 'common',
    ...overrides
});

export const createMockThreeJSScene = () => ({
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: new THREE.WebGLRenderer({ canvas: document.createElement('canvas') })
});
```

### **3. Integration Test Helpers**

```javascript
// tests/utils/integrationHelpers.js
export const createTestEnvironment = async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    const app = new App(container);
    await app.initialize();
    
    return { app, container };
};

export const simulateUserInteraction = (element, eventType, data = {}) => {
    const event = new Event(eventType, { bubbles: true });
    Object.assign(event, data);
    element.dispatchEvent(event);
    return event;
};
```

---

## 📋 **Test Execution Strategy**

### **Phase 1: Pre-Refactoring Test Suite** (Week 1-2)

#### **Day 1-3: Characterization Tests**
- [ ] Create comprehensive test suite for app.js current behavior
- [ ] Test all existing Three.js scene management functionality
- [ ] Test planet generation and parameter handling
- [ ] Test input handling and keyboard controls

#### **Day 4-6: UI Component Tests**
- [ ] Create test suite for CardInventoryUI.js current behavior
- [ ] Test drag-and-drop functionality thoroughly
- [ ] Test responsive design and grid layouts
- [ ] Test shop mode vs inventory mode differences

#### **Day 7-10: System Integration Tests**
- [ ] Create test suite for DamageControlInterface.js
- [ ] Test system health monitoring and display
- [ ] Test repair logic and cost calculations
- [ ] Test integration between all three major components

### **Phase 2: Refactoring Safety Net** (Week 3)

#### **Day 11-13: Golden Master Tests**
- [ ] Create snapshot tests for complex UI outputs
- [ ] Record expected behavior patterns
- [ ] Set up automated regression detection
- [ ] Create performance baseline measurements

#### **Day 14-15: Test Infrastructure**
- [ ] Set up advanced mocking for Three.js components
- [ ] Create test utilities for event-driven architecture
- [ ] Set up coverage reporting and quality gates
- [ ] Create automated test execution pipeline

### **Phase 3: Module Testing Framework** (Week 4)

#### **Day 16-18: Event-Driven Test Patterns**
- [ ] Create EventBus testing utilities
- [ ] Test inter-module communication patterns
- [ ] Create module isolation testing framework
- [ ] Set up dependency injection for testing

#### **Day 19-21: Modular Test Templates**
- [ ] Create template tests for each module type
- [ ] Set up contract testing between modules
- [ ] Create integration test patterns for modular architecture
- [ ] Document testing patterns for future modules

---

## 🎯 **Success Criteria**

### **Coverage Targets**
- **Pre-Refactoring**: 95% coverage of monolithic files
- **Post-Refactoring**: 95% coverage of all modules
- **Integration**: 90% coverage of module interactions
- **End-to-End**: 85% coverage of user workflows

### **Quality Gates**
- [ ] All existing functionality preserved (100% regression tests pass)
- [ ] No performance degradation (maintain 60 FPS)
- [ ] All edge cases handled (error scenarios tested)
- [ ] Module boundaries respected (isolation tests pass)

### **Refactoring Readiness Checklist**
- [ ] Comprehensive characterization tests written
- [ ] All current behavior documented in tests
- [ ] Integration tests verify component interactions
- [ ] Performance baselines established
- [ ] Test infrastructure supports modular architecture
- [ ] Automated testing pipeline operational

---

## 🚀 **Next Steps**

1. **Implement Pre-Refactoring Test Suite** (Priority: Immediate)
2. **Establish Testing Infrastructure** (Priority: High)
3. **Create Safety Net for Refactoring** (Priority: High)
4. **Begin Modular Architecture Testing** (Priority: Medium)

This testing plan ensures we can refactor with confidence, knowing that all existing functionality is preserved while enabling the new modular architecture to be thoroughly tested.

---

*Testing Plan Status: Ready for Implementation | Supports safe refactoring from monolithic to modular architecture* 