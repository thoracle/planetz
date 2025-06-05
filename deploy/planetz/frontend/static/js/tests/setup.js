// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
    })
);

// Mock window properties used by THREE.js
global.innerWidth = 1024;
global.innerHeight = 768;

// Mock canvas and WebGL context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    // WebGL context mock
    bindBuffer: jest.fn(),
    createBuffer: jest.fn(),
    bufferData: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    clear: jest.fn(),
    drawArrays: jest.fn(),
    drawElements: jest.fn(),
    viewport: jest.fn(),
    createProgram: jest.fn(() => ({
        createShader: jest.fn(),
        attachShader: jest.fn(),
        linkProgram: jest.fn(),
        useProgram: jest.fn()
    }))
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Add custom matchers
expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
}); 