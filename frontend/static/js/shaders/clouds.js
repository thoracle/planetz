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

        // Function to create smooth cloud edges with puffiness
        float smoothCloud(float value, float coverage) {
            float threshold = mix(1.2, -0.2, coverage);
            float hardness = mix(0.9, 0.3, coverage);  // Increased range for puffier edges
            
            // Add non-linear smoothing for puffier appearance
            float smoothed = smoothstep(threshold, threshold + hardness, value);
            return smoothed * smoothed * (3.0 - 2.0 * smoothed);  // Smootherstep for puffier look
        }

        // Enhanced swirl function for gentler movement
        vec2 swirl(vec2 uv, float time, float strength) {
            float radius = length(uv - 0.5);
            float angle = atan(uv.y - 0.5, uv.x - 0.5);
            
            // Softer twist calculation
            float twist = radius * strength * (sin(time * 0.5) * 0.5 + 0.5);
            
            vec2 rotated = vec2(
                cos(angle + twist) * radius,
                sin(angle + twist) * radius
            );
            return rotated + 0.5;
        }

        // Function to create subtle color variations
        vec3 getCloudColor(vec3 baseColor, float height, float density) {
            // Add slight blue tint to shadows
            vec3 shadowColor = vec3(0.85, 0.9, 1.0);
            // Add slight golden tint to highlights
            vec3 highlightColor = vec3(1.0, 0.98, 0.95);
            
            // Mix colors based on height and density
            vec3 finalColor = mix(
                mix(shadowColor, baseColor, density),
                mix(baseColor, highlightColor, density),
                height
            );
            
            return finalColor;
        }

        void main() {
            // Create gentler UV offsets for smoother movement
            float timeScale = time * (1.0 + turbulence * 0.3);
            vec2 mainOffset = vec2(
                sin(timeScale * 0.1) * 0.015 + timeScale * 0.008,
                cos(timeScale * 0.15) * 0.015 + timeScale * 0.002
            ) * cloudSpeed;
            
            vec2 detailOffset = vec2(
                cos(timeScale * 0.2) * 0.02,
                sin(timeScale * 0.25) * 0.02
            ) * cloudSpeed * turbulence;

            // Apply gentler swirling motion
            vec2 swirlUV = swirl(vUv, timeScale, turbulence * 0.3);
            
            // Sample cloud layers with smoother blending
            vec2 uv1 = swirlUV + mainOffset;
            vec4 cloudColor1 = texture2D(cloudTexture, uv1);
            
            vec2 noiseUV = vUv * 1.5 + detailOffset;
            vec4 noiseColor = texture2D(noiseTexture, noiseUV);
            
            // Create multiple cloud layers with softer blending
            vec2 uv2 = swirl(vUv * 1.2, timeScale * 1.1, turbulence * 0.2) + 
                      mainOffset * 1.1 + noiseColor.rg * 0.15 * turbulence;
            vec4 cloudColor2 = texture2D(cloudTexture, uv2);
            
            vec2 uv3 = swirl(vUv * 1.8, timeScale * 0.9, turbulence * 0.4) - 
                      mainOffset * 0.9 - noiseColor.bg * 0.1 * turbulence;
            vec4 cloudColor3 = texture2D(cloudTexture, uv3);
            
            // Combine layers with softer weighting
            float turbFactor = turbulence * 0.3 + 0.5;
            float baseCloud = mix(
                cloudColor1.r * 0.5 + cloudColor2.r * 0.3 + cloudColor3.r * 0.2,
                cloudColor1.r * 0.4 + cloudColor2.r * 0.4 + cloudColor3.r * 0.2,
                turbFactor
            );
            
            // Add gentle detail variation
            float detail = noiseColor.r * turbulence * 0.4;
            float cloudMix = baseCloud * (1.0 + detail);

            // Apply smooth cloud formation with height-based adjustment
            float heightFactor = pow(max(0.0, dot(normalize(vWorldPosition), vNormal)), 1.5);
            float cloudMask = smoothCloud(cloudMix, coverage) * (0.8 + heightFactor * 0.2);
            
            // Calculate cloud density with softer falloff
            float cloudStrength = pow(density, 0.8);  // Gentler density curve
            float finalAlpha = cloudMask * cloudStrength;
            
            // Enhanced lighting with softer scattering
            float sunDot = max(0.0, dot(vNormal, sunDirection));
            float scattering = pow(sunDot, 1.5) * 0.4;  // Softer light scattering
            float rimLight = pow(1.0 - max(0.0, dot(normalize(-vWorldPosition), vNormal)), 3.0);
            
            // Get base cloud color with subtle variations
            vec3 baseCloudColor = getCloudColor(cloudColor, heightFactor, cloudStrength);
            
            // Combine lighting with softer transitions
            vec3 litCloudColor = mix(
                baseCloudColor * (0.7 + scattering),  // Brighter base
                baseCloudColor * (1.3 + scattering),  // Softer highlights
                sunDot + rimLight * 0.3
            );
            
            // Add gentle color variation based on height and density
            litCloudColor = mix(
                litCloudColor * 0.95,  // Slightly darker for thin clouds
                litCloudColor,          // Full color for thick clouds
                cloudStrength * (0.9 + heightFactor * 0.1)
            );
            
            // Add subtle iridescence in thin areas
            float iridescence = pow(1.0 - sunDot, 4.0) * (1.0 - cloudStrength) * 0.2;
            litCloudColor += vec3(0.1, 0.15, 0.2) * iridescence;
            
            // Softer edge handling
            float edgeSoftness = pow(max(0.0, dot(normalize(vWorldPosition), vNormal)), 1.2);
            finalAlpha *= smoothstep(0.1, 0.6, edgeSoftness);
            
            // Height-based transparency with gentler falloff
            finalAlpha *= mix(0.8, 1.0, heightFactor);
            
            // Final adjustments for puffier appearance
            finalAlpha = clamp(finalAlpha * 1.3, 0.0, 1.0);
            gl_FragColor = vec4(litCloudColor, finalAlpha);
        }
    `
}; 