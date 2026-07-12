// Central tuning for the procedural ecosystem. Kept separate from component
// logic so the look of the colony can be adjusted in one place.
export const CONFIG = {
  /** Number of instanced stalks. Requirement: >= 10,000. */
  count: 12_000,
  /** Radius of the disc the colony is scattered across (world units). */
  areaRadius: 22,
  /** Stalk height range (pre-sway), in world units. */
  minHeight: 0.6,
  maxHeight: 2.6,
  /** Horizontal sway amplitude fed to the vertex shader. */
  swayStrength: 0.9,
  /** Spatial frequency of the sway noise field (smaller = broader, kelp-like). */
  noiseScale: 0.12,
  /** Speed of the bioluminescent "breathing" pulse. */
  pulseSpeed: 1.4,
  /** Bioluminescent palette: cyans, deep purples, toxic greens. */
  palette: {
    cyan: "#00fff0",
    purple: "#7a1fff",
    green: "#6bff1a",
  },
} as const;
