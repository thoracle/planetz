const { TextEncoder, TextDecoder } = require('util');
const { createCanvas } = require('canvas');

// Add TextEncoder and TextDecoder to global scope
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

// Set up jsdom
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.navigator = dom.window.navigator;

// Mock window properties used by THREE.js
global.innerWidth = 1024;
global.innerHeight = 768;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock CanvasGradient
class CanvasGradient {
    constructor() {
        this.colorStops = [];
    }
    
    addColorStop(offset, color) {
        this.colorStops.push({ offset, color });
    }
}
global.CanvasGradient = CanvasGradient;

// Enhanced WebGL context mock
class WebGLRenderingContext {
    constructor() {
        this.canvas = createCanvas(800, 600);
        this.drawingBufferWidth = this.canvas.width;
        this.drawingBufferHeight = this.canvas.height;
        this.viewport = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
        this.buffers = new Map();
        this.currentProgram = null;
        this.boundBuffers = { ARRAY_BUFFER: null, ELEMENT_ARRAY_BUFFER: null };
    }

    getExtension(name) {
        return {
            VERTEX_TEXTURE_IMAGE_UNITS: 4,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4,
            getParameter: () => 8
        };
    }

    getParameter() {
        return '2.0';  // Mock WebGL 2.0
    }

    getShaderPrecisionFormat() {
        return {
            precision: 'high',
            rangeMin: 1,
            rangeMax: 1024
        };
    }

    createBuffer() {
        const buffer = {};
        this.buffers.set(buffer, new Float32Array());
        return buffer;
    }

    bindBuffer(target, buffer) {
        this.boundBuffers[target] = buffer;
    }

    bufferData(target, data, usage) {
        if (this.boundBuffers[target]) {
            this.buffers.set(this.boundBuffers[target], data);
        }
    }

    viewport(x, y, width, height) {
        this.viewport = { x, y, width, height };
    }

    clear() {}
    enable() {}
    disable() {}
    frontFace() {}
    cullFace() {}
    useProgram() {}
    activeTexture() {}
    createTexture() { return {}; }
    bindTexture() {}
    texParameteri() {}
    texImage2D() {}
    createShader() { return {}; }
    shaderSource() {}
    compileShader() {}
    getShaderParameter() { return true; }
    createProgram() { return {}; }
    attachShader() {}
    linkProgram() {}
    getProgramParameter() { return true; }
    getUniformLocation() { return {}; }
    uniform1i() {}
    uniform1f() {}
    uniform2f() {}
    uniform3f() {}
    uniform4f() {}
    uniformMatrix4fv() {}
}

// Mock Three.js
global.THREE = {
    BufferGeometry: class {
        constructor() {
            this.attributes = {};
            this.setAttribute = jest.fn((name, attribute) => {
                this.attributes[name] = attribute;
            });
        }
        dispose() {}
    },
    BufferAttribute: class {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
        }
    },
    Float32BufferAttribute: class {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
        }
    },
    Mesh: class {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Euler();
            this.scale = new THREE.Vector3(1, 1, 1);
            this.visible = true;
        }
    },
    MeshBasicMaterial: class {
        constructor(params = {}) {
            Object.assign(this, params);
        }
        dispose() {}
    },
    Color: class {
        constructor() {}
        setHSL(h, s, l) {
            this.h = h;
            this.s = s;
            this.l = l;
            return this;
        }
    },
    WebGLRenderer: class {
        constructor(params = {}) {
            const canvas = createCanvas(800, 600);
            this.domElement = canvas;
            this.context = new WebGLRenderingContext();
            this.capabilities = {
                isWebGL2: true,
                precision: 'highp',
                maxTextures: 8,
                maxVertexTextures: 4,
                maxTextureSize: 2048,
                maxCubemapSize: 2048
            };
            this.info = {
                render: {
                    frame: 0,
                    calls: 0,
                    triangles: 0,
                    points: 0,
                    lines: 0
                },
                memory: {
                    geometries: 0,
                    textures: 0
                },
                programs: null,
                autoReset: true,
                reset: () => {}
            };
            this.shadowMap = {
                enabled: false,
                type: 1,
                cullFace: 1,
                autoUpdate: true,
                needsUpdate: false
            };
            this.xr = {
                enabled: false,
                isPresenting: false
            };
        }
        setSize() {}
        setClearColor() {}
        render() {}
        dispose() {}
        getContext() { return this.context; }
    },
    Scene: class {
        constructor() {
            this.children = [];
            this.add = jest.fn(obj => this.children.push(obj));
            this.remove = jest.fn(obj => {
                const index = this.children.indexOf(obj);
                if (index !== -1) this.children.splice(index, 1);
            });
        }
    },
    PerspectiveCamera: class {
        constructor() {
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Euler();
            this.quaternion = new THREE.Quaternion();
            this.matrix = new THREE.Matrix4();
            this.matrixWorld = new THREE.Matrix4();
            this.up = new THREE.Vector3(0, 1, 0);
            this.lookAt = jest.fn();
            this.updateProjectionMatrix = jest.fn();
            this.updateMatrixWorld = jest.fn();
        }
        getWorldDirection(target) {
            target.set(0, 0, -1);
            return target;
        }
    },
    Vector2: class {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        }
    },
    Vector3: class {
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
            return new THREE.Vector3(this.x, this.y, this.z);
        }
        length() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }
        normalize() {
            const length = this.length();
            if (length > 0) {
                this.x /= length;
                this.y /= length;
                this.z /= length;
            }
            return this;
        }
        multiplyScalar(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
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
        applyQuaternion(q) {
            // Simplified quaternion application
            return this;
        }
        applyEuler(euler) {
            // Simplified euler application
            return this;
        }
        cross(v) {
            const x = this.y * v.z - this.z * v.y;
            const y = this.z * v.x - this.x * v.z;
            const z = this.x * v.y - this.y * v.x;
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
    },
    Euler: class {
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
    },
    Quaternion: class {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 1;
        }
        setFromEuler(euler) {
            // Simplified quaternion calculation
            this.x = Math.sin(euler.x / 2);
            this.y = Math.sin(euler.y / 2);
            this.z = Math.sin(euler.z / 2);
            this.w = Math.cos((euler.x + euler.y + euler.z) / 2);
            return this;
        }
        multiply(q) {
            // Simplified quaternion multiplication
            return this;
        }
    },
    Matrix4: class {
        constructor() {
            this.elements = new Float32Array(16).fill(0);
            this.elements[0] = 1;
            this.elements[5] = 1;
            this.elements[10] = 1;
            this.elements[15] = 1;
        }
        makeRotationFromQuaternion(q) {
            // Simplified rotation matrix from quaternion
            return this;
        }
    },
    Points: class {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new THREE.Vector3();
            this.visible = true;
        }
    },
    PointsMaterial: class {
        constructor(params = {}) {
            Object.assign(this, params);
        }
    },
    LineBasicMaterial: class {
        constructor(params = {}) {
            Object.assign(this, params);
        }
    },
    LineSegments: class {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new THREE.Vector3();
            this.visible = true;
        }
    },
    WireframeGeometry: class {
        constructor(geometry) {
            this.geometry = geometry;
        }
    },
    Texture: class {
        constructor(image) {
            this.image = image;
            this.needsUpdate = false;
        }
    },
    AdditiveBlending: 2,
    NoBlending: 0,
    NormalBlending: 1,
    MultiplyBlending: 3,
    SubtractiveBlending: 4,
    CustomBlending: 5
};

// Mock Web Worker
global.Worker = class {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
    }
    postMessage(data) {
        setTimeout(() => {
            if (this.onmessage) {
                const vertices = new Array(9).fill(0);
                const normals = new Array(9).fill(0);
                const colors = new Array(9).fill(0);
                this.onmessage({ data: { vertices, normals, colors } });
            }
        }, 100);
    }
    terminate() {}
};

// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
    })
);

// Mock canvas context with all required methods
const mockCanvasContext = {
    canvas: createCanvas(800, 600),
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,
    getParameter: () => '2.0',  // Mock WebGL 2.0
    getExtension: () => ({
        VERTEX_TEXTURE_IMAGE_UNITS: 4,
        MAX_TEXTURE_IMAGE_UNITS: 8,
        MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4,
        getParameter: () => 8
    }),
    createRadialGradient: () => new CanvasGradient(),
    createLinearGradient: () => new CanvasGradient(),
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
};

// Mock server port for tests
process.env.PORT = '5002'; 