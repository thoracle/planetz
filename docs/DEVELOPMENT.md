# StarF*ckers: Development Guide 🔧

This document provides comprehensive information for developers working on the StarF*ckers project, including architecture, current development status, and future priorities.

---

## 📋 **Development Quick Reference**

| Aspect | Current Status | Priority |
|--------|----------------|----------|
| **Core Features** | 98% Complete | Maintenance |
| **Code Quality** | Production Ready | Optimization |
| **Documentation** | Comprehensive | Updates |
| **Testing** | Extensive | Expansion |
| **Performance** | 60 FPS Stable | Monitoring |

---

## 🏗 **Technical Architecture**

### **Frontend Architecture** (Production Ready)

```
frontend/static/
├── js/
│   ├── app.js                    (88KB, 2,245 lines) - Main application
│   ├── views/
│   │   ├── StarfieldManager.js   (262KB, 6,382 lines) - Core game manager
│   │   ├── ViewManager.js        (68KB, 1,507 lines) - View coordination
│   │   ├── GalacticChart.js      (29KB, 653 lines) - Navigation system
│   │   └── LongRangeScanner.js   (29KB, 661 lines) - Scanner interface
│   ├── ship/
│   │   ├── Ship.js              (35KB, 904 lines) - Ship management
│   │   ├── CardSystemIntegration.js (34KB, 835 lines) - NFT card system
│   │   ├── WeaponSyncManager.js (14KB, 334 lines) - Weapon coordination
│   │   └── systems/             - Individual ship systems
│   ├── ui/
│   │   ├── CardInventoryUI.js   (97KB, 2,386 lines) - Card interface
│   │   ├── DockingModal.js      (40KB, 1,017 lines) - Station interface
│   │   └── DamageControlInterface.js (45KB, 1,285 lines) - Damage system
│   └── utils/                   - Utility modules
├── css/                         - Stylesheets
├── audio/                       - Sound effects
├── models/                      - 3D models
└── images/                      - Textures and UI
```

### **Backend Architecture** (Production Ready)

```
backend/
├── __init__.py              - Flask application factory
├── routes/
│   ├── main.py             - Main routes
│   ├── universe.py         - Universe generation API
│   └── api.py              - RESTful API endpoints
├── verse.py                - Procedural universe generation
├── ShipConfigs.py          - Ship configuration data
└── config.py               - Application configuration
```

### **Key Architectural Patterns**

1. **Modular ES6+ Design**: Clean separation of concerns across 50+ modules
2. **Application Factory**: Professional Flask backend structure
3. **Component-Based UI**: Reusable interface components
4. **Event-Driven Architecture**: Proper async/await patterns
5. **State Management**: Centralized game state with persistence

---

## 🚀 **Current Development Status**

### **Recently Completed Major Systems** ✅

#### **Equipment Synchronization System** (COMPLETED)
```javascript
// Enhanced system initialization
async initializeShipSystems() {
    // Force refresh of ship systems from current card configuration
    await this.cardSystemIntegration.loadCards();
    await this.cardSystemIntegration.createSystemsFromCards();
    
    // Initialize weapon system after all systems are loaded
    await this.initializeWeaponSystem();
}
```

**Impact**: Fixed post-docking equipment sync issues, weapons HUD now displays correctly

#### **WeaponSyncManager Integration** (COMPLETED)
```javascript
// Unified weapon initialization
class WeaponSyncManager {
    async syncWeapons() {
        // Ensure weapons derived from installed cards
        const weaponCards = this.getInstalledWeaponCards();
        await this.createWeaponsFromCards(weaponCards);
        this.updateWeaponHUD();
    }
}
```

**Impact**: Consistent weapon setup across all scenarios, real-time synchronization

#### **StarfieldManager Global Access** (COMPLETED)
```javascript
// Global exposure for debugging
window.starfieldManager = starfieldManager;

// Utility function for safe access
async function waitForStarfieldManager() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.starfieldManager) resolve(window.starfieldManager);
            else setTimeout(check, 10);
        };
        check();
    });
}
```

**Impact**: Enhanced debugging capabilities, test script integration

### **Current Implementation Metrics**

| System | Completion | Lines of Code | Status |
|--------|------------|---------------|--------|
| **Ship Management** | 100% | 904 lines | Production Ready |
| **Card System** | 100% | 835 lines | Production Ready |
| **Combat System** | 100% | 334 lines | Production Ready |
| **UI Components** | 100% | 3,000+ lines | Production Ready |
| **3D Rendering** | 100% | 6,382 lines | Production Ready |

---

## ⚠️ **Known Technical Debt & Optimization Opportunities**

### **File Size Concerns** (Medium Priority)

**Large Files Requiring Modularization**:

1. **StarfieldManager.js** (262KB, 6,382 lines)
   - **Current Role**: Main game manager handling everything
   - **Refactoring Plan**: 
     ```
     StarfieldManager/
     ├── core/
     │   ├── GameManager.js      - Core game loop
     │   ├── InputManager.js     - Keyboard/mouse handling
     │   └── StateManager.js     - Game state coordination
     ├── rendering/
     │   ├── SceneManager.js     - Three.js scene management
     │   ├── EffectsManager.js   - Visual effects
     │   └── UIRenderer.js       - HUD rendering
     └── systems/
         ├── TargetingSystem.js  - Target computer logic
         ├── DockingSystem.js    - Docking mechanics
         └── AudioSystem.js      - Sound management
     ```

2. **CardInventoryUI.js** (97KB, 2,386 lines)
   - **Current Role**: Complete card interface system
   - **Refactoring Plan**:
     ```
     CardInventoryUI/
     ├── CardGrid.js           - Grid layout and rendering
     ├── CardStack.js          - Card stacking logic
     ├── DragDropManager.js    - Drag and drop handling
     ├── FilterSystem.js       - Card filtering and sorting
     └── ValidationSystem.js   - Build validation
     ```

3. **app.js** (88KB, 2,245 lines)
   - **Current Role**: Main application initialization
   - **Refactoring Plan**:
     ```
     app/
     ├── AppInitializer.js     - Application setup
     ├── SceneSetup.js         - Three.js scene creation
     ├── ManagerInitializer.js - Manager initialization
     └── EventBindings.js      - Global event handling
     ```

### **Dependency Issues** (High Priority)

**Action Required**: Audit all system imports and references
```javascript
// Example issues to resolve:
import { NonExistentModule } from './deleted-file.js';  // ❌ Fix needed
import { UpdatedModule } from './refactored-location.js'; // ✅ Update path
```

**Resolution Plan**:
1. Run dependency audit across all modules
2. Identify and fix broken import chains
3. Remove references to deleted/moved files
4. Update import paths for refactored modules
5. Add proper error handling for missing dependencies

### **Performance Optimization** (Low Priority)

**Current Status**: Acceptable performance (60 FPS), future optimization opportunities

**Opportunities**:
1. **Lazy Loading**: Progressive module loading for faster startup
2. **Asset Optimization**: Texture compression and model optimization  
3. **Memory Management**: Enhanced garbage collection patterns
4. **WebAssembly**: Move more computation to WASM modules

---

## 📋 **Development Priorities**

### **Immediate Actions** (Next Sprint)

1. **Dependency Audit** (HIGH PRIORITY)
   ```bash
   # Run comprehensive dependency check
   find frontend/static/js -name "*.js" -exec grep -l "import.*from" {} \;
   # Verify all import paths resolve correctly
   ```

2. **Code Modularization Planning** (MEDIUM PRIORITY)
   - Begin with StarfieldManager.js breakdown
   - Create component extraction plan
   - Maintain backwards compatibility

3. **Documentation Updates** (LOW PRIORITY)
   - Update UML diagrams for recent changes
   - Refresh API documentation
   - Update troubleshooting guides

### **Future Development Phases**

#### **Phase 1: Code Organization** (Post-Production)
- Modularize large files
- Improve component boundaries
- Enhanced error handling

#### **Phase 2: Feature Expansion** (Future)
- Mission system framework
- Real NFT blockchain integration
- Multiplayer foundation

#### **Phase 3: Platform Extensions** (Long-term)
- Mobile optimization
- VR support
- Progressive Web App features

---

## 🛠 **Development Environment Setup**

### **Required Tools**
- **Python 3.x**: Backend development
- **Node.js**: Frontend tooling (optional)
- **Modern Browser**: Chrome/Firefox with DevTools
- **Code Editor**: VS Code recommended with extensions:
  - ES6 String HTML
  - Python
  - Three.js Snippets

### **Development Workflow**

1. **Local Setup**:
```bash
git clone <repository>
cd starfckers
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. **Development Server**:
```bash
python run.py
# Game available at http://localhost:5001
```

3. **Testing**:
```bash
# Frontend tests
cd frontend
npm test

# Backend tests  
python -m pytest backend/tests/
```

### **Code Standards**

**JavaScript/ES6+**:
- Use ES6 modules with proper imports/exports
- Async/await for asynchronous operations
- JSDoc comments for function documentation
- Consistent naming conventions

**Python**:
- PEP 8 compliance
- Type hints where appropriate
- Comprehensive docstrings
- pytest for testing

---

## 🔧 **Development Tools & Scripts**

### **Debugging Tools**

**In-Game Debug Console**:
```javascript
// Access game state
window.starfieldManager.viewManager.getShip()

// Test system functionality  
ship.systems.forEach(sys => console.log(sys.name, sys.isOperational()))

// Debug weapon synchronization
ship.weaponSyncManager.getWeaponStatus()
```

**Test Scripts** (Available in `/frontend/static/`):
- `test-equipment-sync-simple.js` - Equipment synchronization testing
- `test-starfield-ready.js` - StarfieldManager availability testing
- `starfield-manager-utils.js` - Utility functions for development

### **Performance Monitoring**

**Built-in Tools**:
- **Ctrl+D** / **Cmd+D**: Toggle FPS display
- **Ctrl+E** / **Cmd+E**: Toggle edit mode
- Browser DevTools for memory/network analysis

**Monitoring Commands**:
```javascript
// Performance monitoring
console.log('FPS:', window.starfieldManager.debugManager.stats.getFPS());
console.log('Memory:', performance.memory?.usedJSHeapSize);
```

---

## 📚 **API Documentation**

### **Key Classes & Interfaces**

**Ship Management**:
```javascript
class Ship {
    constructor(shipType)
    async initializeShipSystems()
    getSystem(systemName)
    consumeEnergy(amount)
    applyDamage(damage, damageType)
}
```

**Card System**:
```javascript
class CardSystemIntegration {
    async hasRequiredCards(systemName)
    async createSystemsFromCards()
    setCardInventoryUI(cardInventoryUI)
}
```

**Game Management**:
```javascript
class StarfieldManager {
    constructor(scene, camera, viewManager)
    update(deltaTime)
    dock(target)
    undock()
}
```

### **API Endpoints** (Backend)

```python
# Universe generation
GET /api/universe/<seed>
GET /api/system/<system_id>

# Ship configuration
GET /api/ships/configs
POST /api/ships/configure

# Game state
GET /api/game/state
POST /api/game/save
```

---

## 🧪 **Testing Framework**

### **Test Coverage**

| Component | Unit Tests | Integration Tests | Manual Tests |
|-----------|------------|------------------|--------------|
| **Ship Systems** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Card System** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Combat System** | ✅ Complete | ✅ Partial | ✅ Complete |
| **UI Components** | ✅ Partial | ✅ Complete | ✅ Complete |

### **Running Tests**

```bash
# All tests
npm test

# Specific test suites
npm test -- --grep "Ship"
npm test -- --grep "Card"

# Backend tests
python -m pytest backend/tests/ -v
```

---

## 🎯 **Contributing Guidelines**

### **Code Contribution Process**

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Implement Changes**: Follow code standards and add tests
3. **Update Documentation**: Ensure docs reflect changes
4. **Test Thoroughly**: Run all test suites
5. **Submit for Review**: Create pull request with description

### **Commit Message Format**
```
type(scope): description

feat(ship): add new weapon type
fix(ui): resolve card drag-and-drop issue
docs(api): update endpoint documentation
test(combat): add weapon system tests
```

---

## 📊 **Project Metrics & Monitoring**

### **📈 Complete Project Metrics**
> **📊 For comprehensive project statistics, performance data, KPIs, and detailed metrics, see:**
> **[Project Metrics Documentation](PROJECT_METRICS.md)** - Single source of truth for all metrics

### **Quick Development KPIs**

| Metric | Current | Target | Trend | Details |
|--------|---------|--------|-------|---------|
| **Test Coverage** | 85% | 90% | ↗️ | See [Project Metrics](PROJECT_METRICS.md#testing--quality-metrics) |
| **Code Quality** | A Grade | A Grade | ✅ | See [Project Metrics](PROJECT_METRICS.md#code-quality-metrics) |
| **Performance** | 60 FPS | 60 FPS | ✅ | See [Project Metrics](PROJECT_METRICS.md#technical-performance-metrics) |
| **Feature Completion** | 98% | 100% | ↗️ | See [Project Metrics](PROJECT_METRICS.md#feature-implementation-metrics) |

### **Monitoring Tools**
- **Real-time Metrics**: Built-in FPS counter (Ctrl+D), browser DevTools
- **Code Quality**: ESLint, complexity analysis, automated testing
- **Performance**: Memory usage monitoring, frame rate tracking
- **Architecture**: Module dependency analysis, technical debt assessment

---

**Status**: ✅ **Production Ready** with ongoing optimization opportunities

*Last Updated: December 2024 | Development priorities current and accurate* 