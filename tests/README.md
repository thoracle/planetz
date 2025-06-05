# 🧪 Planetz Unit Testing Framework

## Overview

This testing framework ensures that refactoring work doesn't break existing functionality. It provides comprehensive unit tests, integration tests, and performance benchmarks for all critical game systems.

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test categories
npm run test:ship      # Ship class tests only
npm run test:cards     # Card system tests only
npm run test:weapons   # Weapon system tests only
npm run test:integration # Integration tests only

# Run tests with verbose output
npm run test:verbose
```

### Test Coverage Targets

- **Core Classes**: 90% line coverage
- **Integration Points**: 85% line coverage  
- **UI Components**: 80% line coverage
- **Utility Functions**: 95% line coverage
- **Error Handling**: 90% branch coverage

## 📁 Test Structure

```
tests/
├── setup.js              # Global test configuration and mocks
├── ship/                  # Ship class tests
│   ├── Ship.test.js      # Core Ship functionality
│   └── CardSystemIntegration.test.js
├── weapons/               # Weapon system tests
│   ├── WeaponSystemCore.test.js
│   └── WeaponSlot.test.js
├── ui/                    # UI component tests
│   ├── CardInventoryUI.test.js
│   └── DamageControlInterface.test.js
├── integration/           # Cross-system tests
│   ├── station-services.test.js
│   └── combat-workflow.test.js
└── performance/           # Performance benchmarks
    └── memory-usage.test.js
```

## 🛠️ Writing Tests

### Test Utilities

The framework provides helpful utilities in `global.testUtils`:

```javascript
// Create mock objects
const ship = testUtils.createMockShipConfig('heavy_fighter');
const inventory = testUtils.createMockCardInventory();
const weaponSystem = testUtils.createMockWeaponSystem();
const station = testUtils.createMockStation();

// Async testing
await testUtils.waitForAsync();

// DOM testing
const element = testUtils.createMockElement('div');
```

### Mocked APIs

The following APIs are automatically mocked:
- **Three.js**: All scene, camera, and rendering objects
- **Audio**: Audio context and sound playback
- **DOM Storage**: localStorage and sessionStorage
- **Browser APIs**: requestAnimationFrame, fetch, performance
- **Console**: All console methods for cleaner test output

### Test Structure Example

```javascript
describe('Component Tests', () => {
  let mockComponent;

  beforeEach(() => {
    mockComponent = createTestComponent();
  });

  describe('Initialization', () => {
    test('should initialize with correct defaults', () => {
      expect(mockComponent.property).toBe(expectedValue);
    });
  });

  describe('Integration', () => {
    test('should work with other systems', () => {
      // Integration test
    });
  });
});
```

## 🎯 Current Status

### ✅ Completed Infrastructure
- Jest testing framework configured
- ES6 module support enabled  
- Three.js and browser API mocks
- Code coverage reporting
- Test utilities and helpers
- Sample Ship class tests

### 📋 Next Implementation Phases

#### Phase 1: Core System Tests (Week 1)
- [ ] Ship class complete test suite
- [ ] CardSystemIntegration tests
- [ ] WeaponSystemCore tests
- [ ] Energy management tests

#### Phase 2: Integration Tests (Week 2) 
- [ ] Station services integration
- [ ] Combat workflow tests
- [ ] UI component tests
- [ ] Cross-system communication

#### Phase 3: Quality Assurance (Week 3)
- [ ] Performance benchmarks
- [ ] Regression test suite
- [ ] Error handling validation
- [ ] Memory usage optimization

#### Phase 4: Refactoring Safety (Week 4)
- [ ] 90%+ coverage achievement
- [ ] Automated CI integration
- [ ] Pre-commit test hooks
- [ ] Refactoring validation

## 🔧 Configuration

### Jest Configuration (package.json)

The Jest configuration includes:
- **ES6 Module Support**: via Babel transformation
- **JSDOM Environment**: for DOM testing
- **Coverage Thresholds**: Enforced quality standards
- **Module Mapping**: Path aliases for imports
- **Setup Files**: Global mocks and utilities

### Coverage Thresholds

Current thresholds enforce quality standards:
```json
{
  "global": { "lines": 85, "functions": 85, "branches": 80 },
  "Ship.js": { "lines": 90, "functions": 90, "branches": 90 },
  "CardSystemIntegration.js": { "lines": 90, "functions": 90, "branches": 90 },
  "WeaponSystemCore.js": { "lines": 90, "functions": 90, "branches": 90 }
}
```

## 📊 Development Workflow

### Pre-Refactoring Checklist
1. ✅ Test infrastructure setup complete
2. [ ] Core system tests implemented
3. [ ] Integration tests validated  
4. [ ] Performance baseline established
5. [ ] Coverage targets achieved

### During Refactoring
- Run `npm run test:watch` during development
- Maintain green tests at all times
- Check coverage with `npm run test:coverage`
- Add new tests for new functionality

### Post-Refactoring Validation
- All existing tests must pass
- Coverage must meet or exceed targets
- Performance must match or improve baseline
- No regressions in critical workflows

## 🚨 Quality Gates

**Refactoring work can only begin after:**
- Phase 1 tests are 100% complete and passing
- Core integration tests are validated
- Performance baseline is established
- Coverage exceeds 90% for critical systems

This ensures safe refactoring with comprehensive regression protection.

---

*🛡️ Test First, Refactor Safely - Protecting 99.5% Complete Functionality* 