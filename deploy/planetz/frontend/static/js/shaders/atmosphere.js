// Atmosphere shader based on atmospheric scattering principles
export const AtmosphereShader = {
    uniforms: {
        sunPosition: { value: null },
        planetRadius: { value: 1.0 },
        atmosphereRadius: { value: 1.1 }, // 10% larger than planet
        rayleigh: { value: 1.0 },
        rayleighColor: { value: null },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        sunIntensity: { value: 20.0 }
    },

    vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;

        uniform vec3 sunPosition;
        uniform float rayleigh;
        uniform vec3 rayleighColor;
        uniform float mieCoefficient;

        const vec3 up = vec3(0.0, 1.0, 0.0);

        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            
            vSunDirection = normalize(sunPosition);

            vSunE = max(0.0, dot(vSunDirection, up));
            vSunfade = 1.0 - clamp(1.0 - exp((vSunE - 0.0) * 50.0), 0.0, 1.0);

            float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));

            // Rayleigh coefficients
            vBetaR = rayleighCoefficient * rayleighColor;

            // Mie coefficients
            vBetaM = mieCoefficient * vec3(1.0);
        }
    `,

    fragmentShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;

        uniform float mieDirectionalG;
        uniform float sunIntensity;
        uniform float planetRadius;
        uniform float atmosphereRadius;

        const float pi = 3.141592653589793238462643383279502884197169;

        // Optimized constants for better visibility
        const float rayleighZenithLength = 8.4E3;
        const float mieZenithLength = 1.25E3;
        const vec3 up = vec3(0.0, 1.0, 0.0);

        float rayleighPhase(float cosTheta) {
            return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
        }

        float hgPhase(float cosTheta, float g) {
            float g2 = pow(g, 2.0);
            float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
            return (1.0 / (4.0 * pi)) * ((1.0 - g2) * inverse);
        }

        void main() {
            vec3 direction = normalize(vWorldPosition - cameraPosition);

            // Calculate the ray length for intersection with atmosphere
            float B = 2.0 * dot(cameraPosition, direction);
            float C = dot(cameraPosition, cameraPosition) - (atmosphereRadius * atmosphereRadius);
            float det = B * B - 4.0 * C;
            if (det < 0.0) discard;

            float nearT = (-B - sqrt(det)) / 2.0;
            float farT = (-B + sqrt(det)) / 2.0;
            float rayLength = farT - nearT;

            // Calculate the ray's starting position, may be inside atmosphere
            vec3 start = cameraPosition + nearT * direction;

            // Get the ray's ending position, may be inside atmosphere
            vec3 end = cameraPosition + farT * direction;

            // Calculate the ray's direction step size
            float numSteps = 32.0; // Increased for better quality
            vec3 step = (end - start) / numSteps;
            float stepSize = length(step);

            // Initialize the scattering loop variables
            float scatter = 0.0;
            vec3 totalRayleigh = vec3(0.0);
            vec3 totalMie = vec3(0.0);

            // Now loop through the sample rays
            vec3 samplePoint = start;
            for (int i = 0; i < 32; i++) { // Match numSteps
                float height = length(samplePoint) - planetRadius;
                float depth = exp(-height / rayleighZenithLength);
                float lightAngle = dot(vSunDirection, normalize(samplePoint));
                float cameraAngle = dot(direction, normalize(samplePoint));

                scatter = depth * stepSize;
                vec3 attenuate = exp(-scatter * (vBetaR + vBetaM));

                totalRayleigh += depth * rayleighPhase(cameraAngle) * attenuate;
                totalMie += depth * hgPhase(lightAngle, mieDirectionalG) * attenuate;

                samplePoint += step;
            }

            // Calculate the final color with exposure
            vec3 rayleighColor = vBetaR * totalRayleigh * sunIntensity;
            vec3 mieColor = vBetaM * totalMie * sunIntensity;
            vec3 color = rayleighColor + mieColor;

            // Apply exposure and gamma correction
            color = 1.0 - exp(-0.15 * color);  // Reduced for more subtle effect
            color = pow(color, vec3(1.0 / 2.2)); // Gamma correction

            // Calculate view angle for edge fading
            float viewAngle = 1.0 - abs(dot(direction, normalize(vWorldPosition)));
            
            // Enhanced edge fading with distance and sun angle
            float edgeFade = smoothstep(0.0, 0.3, vSunE);
            float distanceFade = smoothstep(0.0, 0.1, rayLength);
            float heightFade = smoothstep(0.0, 0.3, viewAngle);
            
            // Combine all fade factors with better weighting
            float alpha = edgeFade * distanceFade * heightFade * 0.6;  // Overall opacity reduced
            
            // Add slight color variation based on view angle
            color = mix(color, color * vec3(1.0, 0.95, 0.9), viewAngle * 0.3);
            
            gl_FragColor = vec4(color, alpha);
        }
    `
}; 