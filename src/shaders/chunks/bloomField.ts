export const BLOOM_FIELD = `
uniform float uBloomOpenness;
uniform vec4 uBlooms[3];

float bloomField(vec2 p, float fieldTexture) {
  float density = 0.0;
  float flowingWarp = fbm(p * 2.3 - uTime * uWaveSpeed * 0.4) - 0.5;
  for (int i = 0; i < 3; i++) {
    vec4 bloom = uBlooms[i];
    float phase = float(i) * 0.8;
    vec2 center = bloom.xy;
    if (i > 0) {
      center += vec2(sin(uTime * 0.08 + phase), cos(uTime * 0.06 + phase)) * 0.014;
    }
    vec2 local = p - center;
    float breath = 1.0 + 0.03 * sin(uTime * 6.28318530718 / 9.0 + phase);
    float radius = bloom.z * breath * mix(0.24, 1.0, uBloomOpenness);
    float distanceFromHeart = length(local) / radius;
    float theta = distanceFromHeart > 0.00001 ? atan(local.y, local.x) : 0.0;
    theta += phase - uTime * 6.28318530718 / 240.0;
    theta += flowingWarp * 0.16 + cnoise(local * 4.0 + phase) * 0.08;
    float ridge = pow(abs(cos(bloom.w * theta * 0.5)), 0.65);
    float profile = 0.60 + mix(0.08, 0.40, uBloomOpenness) * ridge;
    profile += flowingWarp * 0.07 + cnoise(local * 9.0 + phase) * 0.025;
    float body = 1.0 - smoothstep(profile - 0.055, profile + 0.025, distanceFromHeart);
    float edge = smoothstep(profile - 0.20, profile - 0.04, distanceFromHeart);
    float quietHeart = smoothstep(0.18, 0.49, distanceFromHeart);
    float petalDensity = 0.26 + fieldTexture * 0.78 + ridge * 0.16 + edge * 0.12;
    density = max(density, body * quietHeart * petalDensity);
  }
  return density;
}
`;
