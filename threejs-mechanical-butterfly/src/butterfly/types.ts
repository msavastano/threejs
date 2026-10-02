export type ButterflyThemeId = 'brass-obsidian' | 'chrono-crystal' | 'solaris-gold' | 'cyber-void' | 'rose-pearl';

export interface ButterflyTheme {
  id: ButterflyThemeId;
  name: string;
  tagline: string;
  description: string;
  primaryMetal: number; // Hex color
  secondaryMetal: number;
  gearMetal: number;
  accentGlow: number;
  glassColor: number;
  glassOpacity: number;
  roughness: number;
  metalness: number;
  bgColor: number;
  fogColor: number;
  ambientLight: number;
  keyLight: number;
  rimLight: number;
  bloomStrength: number;
  particleColor: number;
}

export type FlightMode = 'specimen' | 'flight' | 'orbit_cinematic';
export type CameraPreset = 'specimen' | 'wing_macro' | 'core_macro' | 'head_macro' | 'top_down' | 'chase';

export interface ButterflyHotspot {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  specs: { label: string; value: string }[];
  position: [number, number, number]; // 3D local coordinate relative to butterfly
  cameraTarget: [number, number, number];
  cameraPos: [number, number, number];
}

export interface AnimationControls {
  flapSpeed: number;       // Flap speed multiplier (0 = paused, 1 = normal, 2 = fast)
  flapAmplitude: number;   // Flap angle magnitude
  explodedRatio: number;   // 0 = assembled, 1 = fully exploded
  glowIntensity: number;   // Emissive glow intensity
  wingSpread: number;      // Rest angle offset
  glideRatio: number;      // 0 = pure flapping, 1 = gliding
  gearRotationSpeed: number;
  autoRotate: boolean;
  wireframe: boolean;
  showPedestal: boolean;
  showHotspots: boolean;
  showAetherParticles: boolean;
  showWingTrails: boolean;
}
