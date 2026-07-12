// =============================================================================
// Stalk vertex shader
// Sways each instanced stalk as if suspended in a dense, fluid-like atmosphere.
// Motion is driven by a time uniform + 3D simplex noise sampled at the instance's
// world origin, so neighbouring stalks drift coherently like kelp in a current.
// The base is anchored; displacement scales quadratically toward the tip.
// =============================================================================

precision highp float;

#include "./lib/simplexNoise3D.glsl"

// Per-instance id supplied as an InstancedBufferAttribute (GLSL1-safe; avoids
// relying on gl_InstanceID which requires GLSL ES 3.00).
attribute float aId;

uniform float uTime;
uniform float uSwayStrength;
uniform float uNoiseScale;

varying float vId;
varying float vHeight; // 0 at base, 1 at tip (geometry is pre-translated to [0,1])
varying float vNoise;

void main() {
  vId = aId;
  vHeight = position.y;

  // World-space base of this stalk (instanceMatrix is injected by three for
  // InstancedMesh; modelMatrix keeps us correct if the mesh itself is moved).
  vec4 instanceOrigin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

  // Cantilever bend: tips move a lot, the anchored base barely moves.
  float bend = vHeight * vHeight;

  // Slow time scroll through two decorrelated noise fields => fluid X/Z drift.
  float t = uTime * 0.18;
  float nx = snoise(vec3(instanceOrigin.xz * uNoiseScale, t));
  float nz = snoise(vec3(instanceOrigin.zx * uNoiseScale + 53.3, t + 19.1));
  vNoise = nx;

  // Large-scale, slow "gusts" modulate sway amplitude so the field breathes.
  float gust = 0.65 + 0.35 * snoise(vec3(instanceOrigin.xz * 0.04, t * 0.5));

  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
  worldPosition.x += bend * nx * uSwayStrength * gust;
  worldPosition.z += bend * nz * uSwayStrength * gust;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
