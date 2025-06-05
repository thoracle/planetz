import numpy as np
from noise import snoise3

class PlanetGenerator:
    def __init__(self, noise_scale=1.0, octaves=6, persistence=0.5, lacunarity=2.0, terrain_height=1.0, seed=0):
        self.noise_scale = noise_scale
        self.octaves = octaves
        self.persistence = persistence
        self.lacunarity = lacunarity
        self.terrain_height = terrain_height
        self.seed = seed

    def generate_chunk_density_field(self, chunk_x, chunk_y, chunk_z, chunk_size):
        """Generate density field for a single chunk."""
        # Create coordinate arrays for the chunk
        x = np.arange(chunk_x * chunk_size, (chunk_x + 1) * chunk_size)
        y = np.arange(chunk_y * chunk_size, (chunk_y + 1) * chunk_size)
        z = np.arange(chunk_z * chunk_size, (chunk_z + 1) * chunk_size)
        
        # Create meshgrid for 3D coordinates
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        
        # Calculate distance from center for spherical shape
        center = np.array([0, 0, 0])
        radius = 100  # Planet radius
        distance = np.sqrt((X - center[0])**2 + (Y - center[1])**2 + (Z - center[2])**2)
        
        # Generate noise for terrain
        noise = np.zeros_like(X, dtype=np.float32)
        for i in range(X.shape[0]):
            for j in range(X.shape[1]):
                for k in range(X.shape[2]):
                    # Add seed to coordinates for variation
                    nx = (X[i,j,k] + self.seed) * self.noise_scale
                    ny = (Y[i,j,k] + self.seed) * self.noise_scale
                    nz = (Z[i,j,k] + self.seed) * self.noise_scale
                    
                    # Generate noise value
                    noise[i,j,k] = snoise3(nx, ny, nz,
                                         octaves=self.octaves,
                                         persistence=self.persistence,
                                         lacunarity=self.lacunarity,
                                         base=self.seed)
        
        # Apply terrain height
        noise *= self.terrain_height
        
        # Create density field (negative inside planet, positive outside)
        density = radius - distance + noise
        
        return density 