/**
 * Jest Test Setup
 * StarF*ckers Game Testing Infrastructure
 */

import { jest } from '@jest/globals';

// Mock Three.js classes for testing
global.THREE = {
    Scene: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        children: [],
        background: null
    })),
    
    PerspectiveCamera: jest.fn(() => ({
        position: { set: jest.fn(), copy: jest.fn() },
        lookAt: jest.fn(),
        aspect: 1,
        updateProjectionMatrix: jest.fn()
    })),
    
    WebGLRenderer: jest.fn(() => ({
        setSize: jest.fn(),
        render: jest.fn(),
        domElement: document.createElement('canvas'),
        getSize: jest.fn(() => ({ width: 1024, height: 768 }))
    })),
    
    Vector3: jest.fn((x = 0, y = 0, z = 0) => ({
        x, y, z,
        set: jest.fn(),
        copy: jest.fn(),
        add: jest.fn(),
        subtract: jest.fn(),
        length: jest.fn(() => Math.sqrt(x*x + y*y + z*z)),
        normalize: jest.fn(),
        clone: jest.fn(() => new global.THREE.Vector3(x, y, z))
    })),
    
    Mesh: jest.fn(() => ({
        position: new global.THREE.Vector3(),
        rotation: new global.THREE.Vector3(),
        scale: new global.THREE.Vector3(1, 1, 1),
        visible: true,
        add: jest.fn(),
        remove: jest.fn()
    })),
    
    Material: jest.fn(() => ({
        color: { setHex: jest.fn() },
        opacity: 1,
        transparent: false
    })),
    
    Geometry: jest.fn(() => ({
        vertices: [],
        faces: []
    })),
    
    Light: jest.fn(),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn(),
    
    Clock: jest.fn(() => ({
        getDelta: jest.fn(() => 0.016), // 60 FPS
        getElapsedTime: jest.fn(() => 1.0)
    })),
    
    BufferGeometry: jest.fn(),
    BoxGeometry: jest.fn(),
    SphereGeometry: jest.fn(),
    PlaneGeometry: jest.fn()
};

// Mock Web APIs
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock Audio API
global.Audio = jest.fn(() => ({
    play: jest.fn().mockResolvedValue(),
    pause: jest.fn(),
    load: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    volume: 1,
    currentTime: 0,
    duration: 1,
    readyState: 4
}));

global.AudioContext = jest.fn(() => ({
    createBufferSource: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        buffer: null
    })),
    createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: { value: 1 }
    })),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: jest.fn().mockResolvedValue()
}));

// Mock WebGL Context
HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
    if (type === 'webgl' || type === 'experimental-webgl') {
        return {
            drawArrays: jest.fn(),
            drawElements: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            clear: jest.fn(),
            clearColor: jest.fn(),
            viewport: jest.fn(),
            createShader: jest.fn(),
            createProgram: jest.fn(),
            useProgram: jest.fn(),
            getParameter: jest.fn()
        };
    }
    return null;
});

// Mock LocalStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock fetch for audio/asset loading
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    })
);

// Mock Worker
global.Worker = jest.fn(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    onmessage: null,
    onerror: null
}));

// Set up DOM environment
document.body.innerHTML = '';

// Console setup for better test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Suppress noisy console output during tests unless verbose
if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
}

// Global test utilities
global.testUtils = {
    createMockContainer: () => {
        const container = document.createElement('div');
        container.style.width = '1024px';
        container.style.height = '768px';
        document.body.appendChild(container);
        return container;
    },
    
    createMockShip: (overrides = {}) => ({
        id: 'test-ship-1',
        name: 'Test Ship',
        type: 'scout',
        totalSlots: 15,
        systems: new Map(),
        cards: new Map(),
        health: 100,
        position: new global.THREE.Vector3(0, 0, 0),
        rotation: new global.THREE.Vector3(0, 0, 0),
        velocity: new global.THREE.Vector3(0, 0, 0),
        energy: 100,
        repairSystem: jest.fn(),
        getEquippedCard: jest.fn(),
        installCard: jest.fn(),
        removeCard: jest.fn(),
        ...overrides
    }),
    
    createMockCard: (overrides = {}) => ({
        id: 'test-card-1',
        name: 'Test Card',
        type: 'weapon',
        subtype: 'laser',
        level: 1,
        rarity: 'common',
        stackCount: 1,
        stats: {
            damage: 10,
            energy: 5,
            cooldown: 1000
        },
        ...overrides
    }),
    
    createMockGameState: () => ({
        currentShip: global.testUtils.createMockShip(),
        cards: new Map(),
        credits: 1000,
        gameMode: 'space',
        currentView: 'front',
        paused: false
    }),
    
    // Utility to wait for next tick
    nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
    
    // Utility to trigger events
    triggerEvent: (element, eventType, data = {}) => {
        const event = new Event(eventType, { bubbles: true });
        Object.assign(event, data);
        element.dispatchEvent(event);
        return event;
    },
    
    // Utility to clean up DOM after tests
    cleanupDOM: () => {
        document.body.innerHTML = '';
    }
};

// Setup and teardown for each test
beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset DOM
    global.testUtils.cleanupDOM();
    
    // Reset localStorage
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
});

afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
    
    // Clean up DOM
    global.testUtils.cleanupDOM();
});

// Export for ES6 modules (not needed in setup file)
// export { global }; 