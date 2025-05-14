import * as THREE from 'three';

// Cloud shader with volumetric-like appearance
export const CloudShader = {
    uniforms: {
        cloudTexture: { value: null },
        noiseTexture: { value: null },
        coverage: { value: 0.5 },
        density: { value: 0.5 },
        time: { value: 0.0 },
        planetRadius: { value: 1.0 },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        cloudColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        cloudSpeed: { value: 1.0 },
        turbulence: { value: 1.0 }
    },

    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform sampler2D cloudTexture;
        uniform sampler2D noiseTexture;
        uniform float coverage;
        uniform float density;
        uniform float time;
        uniform vec3 sunDirection;
        uniform vec3 cloudColor;
        uniform float cloudSpeed;
        uniform float turbulence;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        // Function to create smooth cloud edges
        float smoothCloud(float value, float coverage) {
            float threshold = mix(1.2, -0.2, coverage);
            float hardness = mix(0.7, 0.2, coverage);
            return smoothstep(threshold, threshold + hardness, value);
        }

        // Function to create swirling motion
        vec2 swirl(vec2 uv, float time, float strength) {
            float radius = length(uv - 0.5);
            float angle = atan(uv.y - 0.5, uv.x - 0.5);
            float twist = radius * strength * sin(time * 0.5);
            float s = sin(twist);
            float c = cos(twist);
            vec2 rotated = vec2(
                cos(angle + twist) * radius,
                sin(angle + twist) * radius
            );
            return rotated + 0.5;
        }

        void main() {
            // Create more dynamic UV offsets for storm-like movement
            float timeScale = time * (1.0 + turbulence * 0.5);
            vec2 mainOffset = vec2(
                sin(timeScale * 0.1) * 0.02 + timeScale * 0.01,
                cos(timeScale * 0.15) * 0.02 + timeScale * 0.002
            ) * cloudSpeed;
            
            vec2 detailOffset = vec2(
                cos(timeScale * 0.2) * 0.03,
                sin(timeScale * 0.25) * 0.03
            ) * cloudSpeed * turbulence;

            // Apply swirling motion based on turbulence
            vec2 swirlUV = swirl(vUv, timeScale, turbulence * 0.5);
            
            // Sample base cloud layer with dynamic scaling and swirl
            vec2 uv1 = swirlUV + mainOffset;
            vec4 cloudColor1 = texture2D(cloudTexture, uv1);
            
            // Sample detail noise with enhanced turbulence
            vec2 noiseUV = vUv * 2.0 + detailOffset;
            vec4 noiseColor = texture2D(noiseTexture, noiseUV);
            
            // Create multiple cloud layers with different swirl intensities
            vec2 uv2 = swirl(vUv * 1.5, timeScale * 1.2, turbulence * 0.3) + 
                      mainOffset * 1.2 + noiseColor.rg * 0.2 * turbulence;
            vec4 cloudColor2 = texture2D(cloudTexture, uv2);
            
            vec2 uv3 = swirl(vUv * 2.5, timeScale * 0.8, turbulence * 0.7) - 
                      mainOffset * 0.8 - noiseColor.bg * 0.15 * turbulence;
            vec4 cloudColor3 = texture2D(cloudTexture, uv3);
            
            // Combine layers with turbulence-based weighting
            float turbFactor = turbulence * 0.5 + 0.5;
            float baseCloud = mix(
                cloudColor1.r * 0.5 + cloudColor2.r * 0.3 + cloudColor3.r * 0.2,
                cloudColor1.r * 0.3 + cloudColor2.r * 0.4 + cloudColor3.r * 0.3,
                turbFactor
            );
            
            float detail = noiseColor.r * turbulence * 0.6;  // Increased detail influence
            float cloudMix = baseCloud * (1.0 + detail);
            
            // Apply smooth cloud formation with height-based adjustment
            float heightFactor = pow(max(0.0, dot(normalize(vWorldPosition), vNormal)), 2.0);
            float cloudMask = smoothCloud(cloudMix, coverage) * (0.7 + heightFactor * 0.3);
            
            // Calculate cloud density with improved depth
            float cloudStrength = pow(density, 0.7);  // Softer density falloff
            float finalAlpha = cloudMask * cloudStrength;
            
            // Enhanced lighting with atmospheric scattering
            float sunDot = max(0.0, dot(vNormal, sunDirection));
            float scattering = pow(sunDot, 2.0) * 0.3;  // Simulated light scattering
            float rimLight = pow(1.0 - max(0.0, dot(normalize(-vWorldPosition), vNormal)), 4.0);
            
            // Combine lighting effects
            vec3 litCloudColor = mix(
                cloudColor * (0.6 + scattering),  // Darker base with scattering
                cloudColor * (1.2 + scattering),  // Brighter highlights with scattering
                sunDot + rimLight * 0.4
            );
            
            // Add subtle color variation based on density and height
            litCloudColor = mix(
                litCloudColor * 0.9,  // Slightly darker for thin clouds
                litCloudColor,         // Full color for thick clouds
                cloudStrength * (0.8 + heightFactor * 0.2)
            );
            
            // Edge softening with improved depth perception
            float edgeSoftness = pow(max(0.0, dot(normalize(vWorldPosition), vNormal)), 1.5);
            finalAlpha *= smoothstep(0.1, 0.5, edgeSoftness);
            
            // Height-based transparency adjustment
            finalAlpha *= mix(0.7, 1.0, heightFactor);
            
            // Final adjustments
            finalAlpha = clamp(finalAlpha * 1.5, 0.0, 1.0);
            gl_FragColor = vec4(litCloudColor, finalAlpha);
        }
    `
}; 