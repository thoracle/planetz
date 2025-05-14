// Perlin Noise implementation
const noise = {
    // Permutation table
    p: new Uint8Array(512),
    
    // Gradient table
    grad3: [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ],
    
    // Initialize permutation table
    seed: function(seed) {
        if (seed > 0 && seed < 1) {
            seed *= 65536;
        }
        
        seed = Math.floor(seed);
        if (seed < 256) {
            seed |= seed << 8;
        }
        
        for (let i = 0; i < 256; i++) {
            let v;
            if (i & 1) {
                v = i ^ (seed & 255);
            } else {
                v = i ^ ((seed >> 8) & 255);
            }
            
            this.p[i] = this.p[i + 256] = v;
        }
    },
    
    // Initialize with random seed
    init: function() {
        for (let i = 0; i < 256; i++) {
            this.p[i] = this.p[i + 256] = i;
        }
        
        // Fisher-Yates shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.p[i];
            this.p[i] = this.p[j];
            this.p[j] = temp;
            this.p[i + 256] = this.p[i];
        }
    },
    
    // Linear interpolation
    lerp: function(t, a, b) {
        return a + t * (b - a);
    },
    
    // Fade function
    fade: function(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    },
    
    // Gradient function
    grad: function(hash, x, y, z) {
        // Convert hash to index in grad3 array
        const h = hash & 15;
        // Get gradient vector
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        // Return dot product
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    },
    
    // 3D Perlin noise
    perlin3: function(x, y, z) {
        // Find unit cube that contains point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        // Find relative x, y, z of point in cube
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        // Compute fade curves for each of x, y, z
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        // Hash coordinates of the 8 cube corners
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;
        
        // Add blended results from 8 corners of cube
        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x - 1, y, z)
                ),
                this.lerp(u,
                    this.grad(this.p[AB], x, y - 1, z),
                    this.grad(this.p[BB], x - 1, y - 1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA + 1], x, y, z - 1),
                    this.grad(this.p[BA + 1], x - 1, y, z - 1)
                ),
                this.lerp(u,
                    this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1)
                )
            )
        );
    }
};

// Initialize noise with random seed
noise.init(); 