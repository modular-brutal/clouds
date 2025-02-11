precision highp float;

uniform float time;
uniform vec2 resolution;
uniform vec4 deJongParams; // we'll repurpose these parameters
uniform float noiseScale;
uniform float patternMix;
uniform sampler2D drawTexture;
uniform bool enableDithering;
uniform bool enablePixelation;
uniform int patternType;
uniform int colorTheme;

// Dithering matrix
const float ditherPattern[16] = float[16](
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
);

float dither(vec2 pos, float brightness) {
    int x = int(mod(pos.x, 4.0));
    int y = int(mod(pos.y, 4.0));
    float threshold = ditherPattern[x + y * 4] / 16.0;
    return brightness < threshold ? 0.0 : 1.0;
}

float pixelate(vec2 uv, float pixels) {
    vec2 p = floor(uv * pixels) / pixels;
    return length(p);
}

// Smooth noise function
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Flow field function
vec2 flow(vec2 p) {
    float t = time * 0.2;
    
    // Create multiple layers of motion
    vec2 flow1 = vec2(
        sin(p.y * deJongParams.x + t) * cos(p.x * deJongParams.y + t),
        cos(p.x * deJongParams.z + t) * sin(p.y * deJongParams.w + t)
    );
    
    vec2 flow2 = vec2(
        sin(p.x * 0.5 + t) * 2.0,
        cos(p.y * 0.5 + t) * 2.0
    );
    
    return mix(flow1, flow2, 0.5);
}

// Wave pattern
float wavePattern(vec2 p) {
    float t = time * 0.2;
    float pattern = 0.0;
    
    // Multiple wave layers
    for(int i = 0; i < 3; i++) {
        float scale = pow(2.0, float(i));
        float wave1 = sin(p.x * scale * deJongParams.x + t) * cos(p.y * scale * deJongParams.y + t);
        float wave2 = sin(p.y * scale * deJongParams.z + t * 1.5) * cos(p.x * scale * deJongParams.w + t * 0.5);
        pattern += (wave1 + wave2) / scale;
    }
    
    return pattern * 0.5 + 0.5; // Normalize to 0-1 range
}

// Cellular pattern
float cellPattern(vec2 p) {
    float t = time * 0.1;
    vec2 points[4];
    
    // Moving cell centers
    points[0] = vec2(sin(t * 0.7), cos(t * 0.5)) * deJongParams.x;
    points[1] = vec2(cos(t * 0.3), sin(t * 0.9)) * deJongParams.y;
    points[2] = vec2(sin(t * 0.4), cos(t * 0.8)) * deJongParams.z;
    points[3] = vec2(cos(t * 0.6), sin(t * 0.7)) * deJongParams.w;
    
    float minDist = 10.0;
    float secondMinDist = 10.0;
    
    // Find distances to closest points
    for(int i = 0; i < 4; i++) {
        float dist = length(p - points[i]);
        if(dist < minDist) {
            secondMinDist = minDist;
            minDist = dist;
        } else if(dist < secondMinDist) {
            secondMinDist = dist;
        }
    }
    
    // Create cell pattern based on difference of distances
    return (secondMinDist - minDist);
}

// Flow pattern (existing noise-based flow)
float flowPattern(vec2 p) {
    float pattern = 0.0;
    for(int i = 0; i < 3; i++) {
        float scale = pow(2.0, float(i));
        vec2 flowOffset = flow(p * scale) * 0.3;
        pattern += noise(p * noiseScale * scale + flowOffset + time * 0.1) / scale;
    }
    return pattern * 0.8;
}

// Sunrise/sunset color palette
vec3 getSunriseColor(float t) {
    // Night to Dawn (0.0 - 0.15)
    vec3 nightToDawn = mix(
        vec3(0.05, 0.05, 0.15),  // Deep night blue
        vec3(0.3, 0.1, 0.4),     // Deep purple
        smoothstep(0.0, 0.15, t)
    );
    
    // Dawn to Sunrise (0.15 - 0.3)
    vec3 dawnToSunrise = mix(
        vec3(0.3, 0.1, 0.4),     // Deep purple
        vec3(0.8, 0.3, 0.5),     // Purple-pink dawn
        smoothstep(0.15, 0.3, t)
    );
    
    // Sunrise to Morning (0.3 - 0.45)
    vec3 sunriseToMorning = mix(
        vec3(0.8, 0.3, 0.5),     // Purple-pink dawn
        vec3(1.0, 0.6, 0.4),     // Golden sunrise
        smoothstep(0.3, 0.45, t)
    );
    
    // Morning to Day (0.45 - 0.55)
    vec3 morningToDay = mix(
        vec3(1.0, 0.6, 0.4),     // Golden sunrise
        vec3(0.9, 0.85, 0.7),    // Bright daylight
        smoothstep(0.45, 0.55, t)
    );
    
    // Day to Sunset (0.55 - 0.7)
    vec3 dayToSunset = mix(
        vec3(0.9, 0.85, 0.7),    // Bright daylight
        vec3(1.0, 0.4, 0.3),     // Orange sunset
        smoothstep(0.55, 0.7, t)
    );
    
    // Sunset to Dusk (0.7 - 0.85)
    vec3 sunsetToDusk = mix(
        vec3(1.0, 0.4, 0.3),     // Orange sunset
        vec3(0.6, 0.2, 0.5),     // Purple dusk
        smoothstep(0.7, 0.85, t)
    );
    
    // Dusk to Night (0.85 - 1.0)
    vec3 duskToNight = mix(
        vec3(0.6, 0.2, 0.5),     // Purple dusk
        vec3(0.05, 0.05, 0.15),  // Deep night blue
        smoothstep(0.85, 1.0, t)
    );
    
    float cycleTime = mod(t, 1.0);
    
    if (cycleTime < 0.15) return nightToDawn;
    if (cycleTime < 0.3) return dawnToSunrise;
    if (cycleTime < 0.45) return sunriseToMorning;
    if (cycleTime < 0.55) return morningToDay;
    if (cycleTime < 0.7) return dayToSunset;
    if (cycleTime < 0.85) return sunsetToDusk;
    return duskToNight;
}

void main() {
    // Normalize coordinates to fill screen while maintaining aspect ratio
    float aspect = resolution.x / resolution.y;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 p = (uv * 2.0 - 1.0);
    p.x *= aspect;
    
    // Apply pixelation if enabled
    vec2 workingUV = uv;
    vec2 workingP = p;
    
    if (enablePixelation) {
        float pixelSize = max(resolution.x, resolution.y) / (80.0 * noiseScale);
        workingUV = floor(uv * pixelSize) / pixelSize;
        workingP = (workingUV * 2.0 - 1.0);
        workingP.x *= aspect;
    }
    
    // Select pattern based on type
    float pattern;
    if (patternType == 0) {
        pattern = flowPattern(workingP);
    } else if (patternType == 1) {
        pattern = wavePattern(workingP);
    } else {
        pattern = cellPattern(workingP);
    }
    
    // Apply dithering if enabled
    float brightness = pattern;
    float finalPattern = enableDithering ? dither(gl_FragCoord.xy, brightness) : brightness;
    
    // Color selection based on theme
    vec3 color1, color2, baseColor;
    
    if (colorTheme == 0) {
        // Original cycling colors
        color1 = vec3(0.5 + 0.5 * sin(time * 0.1), 0.5, 1.0);
        color2 = vec3(0.8, 0.5 + 0.5 * cos(time * 0.15), 1.0);
        baseColor = mix(color1, color2, finalPattern);
    } else {
        // Sunrise/sunset theme with slower cycle
        float dayTime = mod(time * 0.02, 1.0); // Much slower cycle
        vec3 timeColor = getSunriseColor(dayTime);
        vec3 nextColor = getSunriseColor(mod(dayTime + 0.05, 1.0)); // Smoother transition
        baseColor = mix(timeColor, nextColor, finalPattern);
    }
    
    // Mix with pattern
    baseColor = mix(baseColor, vec3(finalPattern), patternMix);
    
    // Get drawing from texture
    vec4 drawColor = texture2D(drawTexture, uv);
    
    // Final color
    vec3 finalColor = mix(baseColor, drawColor.rgb, drawColor.a);
    
    gl_FragColor = vec4(finalColor, 1.0);
} 