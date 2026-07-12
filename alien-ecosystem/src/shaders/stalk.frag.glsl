// =============================================================================
// Stalk fragment shader
// Bioluminescent "breathing": each instance pulses on its own phase (derived
// from its id) through a palette of cyans, deep purples and toxic greens.
// Emissive intensity is pushed above 1.0 at the tips so the Bloom post-pass
// blooms the brightest flora hot against the dark environment.
// =============================================================================

precision highp float;

uniform float uTime;
uniform float uPulseSpeed;
uniform vec3 uColorCyan;
uniform vec3 uColorPurple;
uniform vec3 uColorGreen;

varying float vId;
varying float vHeight;
varying float vNoise;

// Cheap per-instance hash for stable randomness keyed on the instance id.
float hash(float n) {
  return fract(sin(n * 17.23) * 43758.5453123);
}

void main() {
  float h1 = hash(vId);
  float h2 = hash(vId + 7.0);

  // Each stalk gets a stable blend across the 3-colour bioluminescent palette.
  vec3 base = mix(uColorCyan, uColorPurple, smoothstep(0.0, 1.0, h1));
  base = mix(base, uColorGreen, smoothstep(0.4, 1.0, h2) * 0.85);

  // Asynchronous breathing rhythm: phase offset by the instance id (+ a little
  // spatial noise) so the colony pulses organically rather than in lockstep.
  float phase = uTime * uPulseSpeed + vId * 0.27 + vNoise * 1.5;
  float breath = 0.5 + 0.5 * sin(phase);
  breath = pow(breath, 1.6); // sharpen into a more biological pulse

  // Luminous at the tips, near-dark at the anchored base.
  float tip = smoothstep(0.05, 1.0, vHeight);

  // Emissive intensity intentionally exceeds 1.0 to feed the Bloom threshold.
  float intensity = (0.25 + 1.9 * breath) * (0.15 + 1.25 * tip);

  vec3 color = base * intensity;
  color += uColorCyan * 0.04 * tip; // faint cool core so dim stalks still read

  gl_FragColor = vec4(color, 1.0);
}
