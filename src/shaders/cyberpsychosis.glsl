#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uResolution;
uniform float uPsychosis;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)

float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
    vec2 p = outTexCoord * 2.0 - 1.0;
    p *= vec2(1.0 + p.y * p.y * 0.018, 1.0 + p.x * p.x * 0.012);
    vec2 uv = p * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
    float frame = floor(uTime * 12.0);
    float line = floor(uv.y * 35.0);
    if (noise(vec2(line, frame)) < uPsychosis * 0.16) {
        uv.x += (noise(vec2(frame, line)) - 0.5) * 0.035 * uPsychosis;
    }
    float split = 0.0006 + uPsychosis * 0.007;
    vec4 center = boundedSampler(uMainSampler, uv);
    vec3 color = vec3(boundedSampler(uMainSampler, uv + vec2(split, 0.0)).r,
                      center.g, boundedSampler(uMainSampler, uv - vec2(split, 0.0)).b);
    color *= 0.97 + 0.03 * sin(uv.y * uResolution.y * 2.0);
    color += (noise(uv + floor(uTime * 8.0)) - 0.5) * 0.035 * uPsychosis;
    float vignette = smoothstep(0.25, 0.72, distance(uv, vec2(0.5)));
    color = mix(color, color * vec3(1.3, 0.55, 0.55), vignette * uPsychosis * 0.65);
    gl_FragColor = vec4(color, center.a);
}
