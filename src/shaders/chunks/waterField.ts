export const WATER_FIELD = `
// Top-down dark water: three long swells travel along one direction and glyphs gather on their thin crests.
float waterField(vec2 p, float fieldTexture) {
  vec2 swellDirection = normalize(vec2(0.35, 1.0));
  vec2 warped = p + 0.08 * (fbm(p * 1.5 + uTime * 0.03) - 0.5);
  float drift = uWaveSpeed / 0.05;
  float along = dot(warped, swellDirection);
  float swell = sin(along * 9.0 - uTime * 0.5 * drift)
    + 0.5 * sin(along * 15.5 - uTime * 0.35 * drift)
    + 0.25 * sin(along * 23.0 - uTime * 0.8 * drift);
  swell = 0.5 + 0.5 * swell / 1.75;

  float crests = smoothstep(0.52, 0.86, swell);
  float unevenWater = 0.35 + 0.65 * smoothstep(0.10, 0.50, fieldTexture);
  float calmTop = 1.0 - smoothstep(0.10, 0.45, p.y);
  float quietMiddle = smoothstep(0.10, 0.30, length(p * vec2(0.55, 1.6)));
  return crests * unevenWater * calmTop * quietMiddle;
}
`;
