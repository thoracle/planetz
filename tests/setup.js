/**
 * Jest Setup File - Test Environment Configuration
 * Configures mocks and global setup for unit testing
 */

// Mock Three.js objects and methods
global.THREE = {
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    children: []
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setClearColor: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas')
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn()
  })),
  Vector3: jest.fn(() => ({
    x: 0, y: 0, z: 0,
    set: jest.fn(),
    copy: jest.fn(),
    add: jest.fn(),
    sub: jest.fn(),
    normalize: jest.fn(),
    length: jest.fn(() => 0),
    distanceTo: jest.fn(() => 0),
    clone: jest.fn(() => new global.THREE.Vector3())
  })),
  Group: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    children: []
  })),
  Mesh: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    scale: { set: jest.fn(), x: 1, y: 1, z: 1 },
    visible: true
  })),
  DirectionalLight: jest.fn(),
  AmbientLight: jest.fn(),
  SphereGeometry: jest.fn(),
  BoxGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  MeshPhongMaterial: jest.fn(),
  TextureLoader: jest.fn(() => ({
    load: jest.fn()
  })),
  Clock: jest.fn(() => ({
    getDelta: jest.fn(() => 0.016), // 60 FPS
    getElapsedTime: jest.fn(() => 0)
  }))
};

// Mock Audio API
global.Audio = jest.fn(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  volume: 1.0,
  currentTime: 0,
  duration: 0,
  paused: true,
  ended: false
}));

// Mock AudioContext
global.AudioContext = jest.fn(() => ({
  createBuffer: jest.fn(),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1.0 }
  })),
  destination: {},
  decodeAudioData: jest.fn().mockResolvedValue({}),
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined)
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map()
  })
);

// Mock URL and URLSearchParams
global.URL = {
  createObjectURL: jest.fn(() => 'mock-blob-url'),
  revokeObjectURL: jest.fn()
};

global.URLSearchParams = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  append: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
  toString: jest.fn(() => '')
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock window methods
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn(() => ({
    getPropertyValue: jest.fn(() => ''),
    width: '0px',
    height: '0px'
  }))
});

// Test utilities available globally
global.testUtils = {
  // Create a mock ship configuration
  createMockShipConfig: (shipType = 'heavy_fighter') => ({
    shipType,
    name: `Test ${shipType}`,
    maxSlots: 18,
    maxEnergy: 100,
    energyRechargeRate: 5,
    maxHull: 100,
    currentHull: 100,
    currentEnergy: 100,
    systems: new Map(),
    upgrades: new Map()
  }),

  // Create a mock card inventory
  createMockCardInventory: () => ({
    cards: new Map(),
    discoveredTypes: new Set(),
    credits: 10000,
    stackCounts: new Map()
  }),

  // Create a mock weapon system
  createMockWeaponSystem: () => ({
    weaponSlots: [],
    activeSlotIndex: 0,
    isAutofireOn: false,
    lockedTarget: null,
    maxWeaponSlots: 4
  }),

  // Create a mock station
  createMockStation: () => ({
    name: 'Test Station',
    faction: 'friendly',
    services: ['repair', 'inventory'],
    position: { x: 0, y: 0, z: 0 }
  }),

  // Wait for async operations to complete
  waitForAsync: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Create DOM elements for testing
  createMockElement: (tag = 'div') => {
    const element = document.createElement(tag);
    element.getBoundingClientRect = jest.fn(() => ({
      top: 0, left: 0, right: 100, bottom: 100,
      width: 100, height: 100, x: 0, y: 0
    }));
    return element;
  }
};

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
  
  // Reset console
  console.log.mockClear();
  console.warn.mockClear();
  console.error.mockClear();
});

afterEach(() => {
  // Clean up any global state
  delete window.ship;
  delete window.starfieldManager;
  delete window.app;
});

console.log('🧪 Jest testing environment configured for Planetz game'); 