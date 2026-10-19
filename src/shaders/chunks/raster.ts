export const rasterChunk = /* glsl */ `
vec2 rasterCell(vec2 fragPx, float cellPx, out vec2 local) {
  vec2 grid = fragPx / cellPx;
  local = fract(grid) - 0.5;
  return floor(grid);
}

float rasterGlyph(vec2 local, float density, float aa) {
  float level = clamp(density, 0.0, 1.0);
  if (level <= 0.0) return 0.0;
  float edge = max(aa, 0.00001);
  if (level <= 0.5) {
    float radius = 0.38 * level * 2.0;
    return 1.0 - smoothstep(-edge, edge, length(local) - radius);
  }
  float morph = (level - 0.5) * 2.0;
  vec2 halfSize = mix(vec2(0.38), vec2(0.30, 0.5), morph);
  float radius = mix(0.38, 0.0, morph);
  vec2 q = abs(local) - halfSize + radius;
  float distanceToShape = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  // At full density, omit horizontal end caps so adjacent cells fuse without seams.
  if (level >= 1.0) distanceToShape = abs(local.x) - 0.30;
  return 1.0 - smoothstep(-edge, edge, distanceToShape);
}
`;
