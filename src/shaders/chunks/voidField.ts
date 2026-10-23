export const VOID_FIELD = `
// The hero waves as a dense ground, with a soft round clearing in the middle for the title.
float voidField(vec2 p, float fieldTexture) {
  float aspect = uResolution.x / uResolution.y;
  float breath = 1.0 + 0.025 * sin(uTime * 6.28318530718 / 10.0);
  float radius = min(0.30, 0.40 * aspect) * breath;
  float wobble = (fbm(p * 2.0 + uTime * uWaveSpeed * 0.3) - 0.5) * 0.03;
  float clearing = smoothstep(radius - 0.05, radius + 0.07, length(p) + wobble);
  float ground = mix(0.42, 0.95, fieldTexture);
  return ground * clearing;
}
`;
