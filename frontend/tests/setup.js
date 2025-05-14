// Mock Three.js
global.THREE = {
    BufferGeometry: class {
        constructor() {
            this.attributes = {};
        }
        setAttribute(name, attribute) {
            this.attributes[name] = attribute;
        }
        dispose() {}
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
        }
    },
    MeshBasicMaterial: class {
        constructor() {}
        dispose() {}
    },
    Color: class {
        constructor() {}
        setHSL(h, s, l) {
            this.h = h;
            this.s = s;
            this.l = l;
        }
    }
};

// Mock Web Worker
global.Worker = class {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
    }
    postMessage(data) {
        // Simulate worker processing
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

// Mock WebGL context
global.WebGLRenderingContext = {
  VERTEX_SHADER: 'vertex',
  FRAGMENT_SHADER: 'fragment'
}; 