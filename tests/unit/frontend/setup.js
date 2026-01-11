/**
 * Jest setup file for frontend unit tests.
 * Mocks browser globals and Three.js dependencies.
 */

// Mock window object extensions
global.window = global.window || {};

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
  clear: jest.fn(() => { localStorageMock.store = {}; })
};
global.localStorage = localStorageMock;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  debug: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
  log: jest.fn()
};

// Mock Three.js Vector3
class MockVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  clone() {
    return new MockVector3(this.x, this.y, this.z);
  }
  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
}

// Mock Three.js module
jest.mock('three', () => ({
  Vector3: MockVector3,
  Color: jest.fn().mockImplementation((color) => ({ color })),
  Object3D: jest.fn().mockImplementation(() => ({
    position: new MockVector3(),
    rotation: { x: 0, y: 0, z: 0 },
    add: jest.fn(),
    remove: jest.fn()
  })),
  Mesh: jest.fn(),
  Scene: jest.fn(),
  Camera: jest.fn()
}), { virtual: true });

// Mock debug function used throughout the codebase
global.debug = jest.fn();

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now())
  };
}

// Mock Date.now for consistent testing
const originalDateNow = Date.now;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.store = {};
  Date.now = originalDateNow;
});

// Restore Date.now after tests
afterEach(() => {
  Date.now = originalDateNow;
});
