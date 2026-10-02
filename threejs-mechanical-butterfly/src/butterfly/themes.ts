import { ButterflyTheme, ButterflyThemeId } from './types';

export const BUTTERFLY_THEMES: Record<ButterflyThemeId, ButterflyTheme> = {
  'brass-obsidian': {
    id: 'brass-obsidian',
    name: 'Clockwork Brass & Obsidian',
    tagline: 'Victorian Horology & Antique Bronze',
    description: 'Forged from brushed brass, dark gunmetal ribs, and genuine ruby jewel bearings with warm amber bioluminescent vapor chambers.',
    primaryMetal: 0xd4af37,     // Rich gold/brass
    secondaryMetal: 0x22262d,   // Obsidian gunmetal
    gearMetal: 0xe5a93c,        // Polished brass gears
    accentGlow: 0xffaa22,       // Warm amber/fire glow
    glassColor: 0x3a2512,       // Smoked amber glass
    glassOpacity: 0.72,
    roughness: 0.28,
    metalness: 0.92,
    bgColor: 0x06080c,
    fogColor: 0x090c12,
    ambientLight: 0x4a3a2a,
    keyLight: 0xfff2d6,
    rimLight: 0xff9922,
    bloomStrength: 0.9,
    particleColor: 0xffcc66,
  },
  'chrono-crystal': {
    id: 'chrono-crystal',
    name: 'Chrono-Crystal Titanium',
    tagline: 'Quantum Chronometry & Laser Optics',
    description: 'Precision milled aerospace grade-5 titanium, sapphire crystal wing membranes, and superconducting neon-cyan quantum flux coils.',
    primaryMetal: 0xb4c8d8,     // Polished titanium
    secondaryMetal: 0x141f2d,   // Deep slate
    gearMetal: 0x5cd9ff,        // Cyan anodized gears
    accentGlow: 0x00e5ff,       // Electric cyan
    glassColor: 0x0a2838,       // Dichroic crystal
    glassOpacity: 0.65,
    roughness: 0.18,
    metalness: 0.95,
    bgColor: 0x040911,
    fogColor: 0x060e1a,
    ambientLight: 0x1a334d,
    keyLight: 0xe6f7ff,
    rimLight: 0x00d4ff,
    bloomStrength: 1.15,
    particleColor: 0x73e6ff,
  },
  'solaris-gold': {
    id: 'solaris-gold',
    name: 'Solaris 24K & Emerald',
    tagline: 'Imperial Automaton & Baroque Filigree',
    description: 'Commissioned for royal celestial courts; 24-karat gold filigree, cabochon emerald optics, and radiant solar-charged micro-prisms.',
    primaryMetal: 0xf5cf47,     // 24K polished gold
    secondaryMetal: 0x1a2e22,   // Deep emerald dark
    gearMetal: 0xffe066,        // Gleaming gold gears
    accentGlow: 0x22ff88,       // Radiant emerald neon
    glassColor: 0x0f331e,       // Emerald stained glass
    glassOpacity: 0.75,
    roughness: 0.22,
    metalness: 0.94,
    bgColor: 0x060d09,
    fogColor: 0x08140d,
    ambientLight: 0x223828,
    keyLight: 0xfffae0,
    rimLight: 0x29e680,
    bloomStrength: 1.0,
    particleColor: 0x85ffb8,
  },
  'cyber-void': {
    id: 'cyber-void',
    name: 'Cyber Void & Neon Magenta',
    tagline: 'Stealth Carbon & Synthwave Resonance',
    description: 'Carbon-nanotube woven exoskeleton, blackened matte alloy, and high-frequency violet photonic arrays with synchrotron glow.',
    primaryMetal: 0x181a20,     // Matte stealth carbon
    secondaryMetal: 0x3d1435,   // Dark violet
    gearMetal: 0x9333ea,        // Purple anodized
    accentGlow: 0xff007f,       // Neon magenta
    glassColor: 0x28072d,       // Deep purple glass
    glassOpacity: 0.68,
    roughness: 0.35,
    metalness: 0.88,
    bgColor: 0x07040a,
    fogColor: 0x0c0714,
    ambientLight: 0x281033,
    keyLight: 0xf3d9fa,
    rimLight: 0xff00bb,
    bloomStrength: 1.3,
    particleColor: 0xff66cc,
  },
  'rose-pearl': {
    id: 'rose-pearl',
    name: 'Rose Gold & Opalescent Pearl',
    tagline: 'Atelier Bijouterie & Mother-of-Pearl',
    description: 'Handcrafted jeweler grade alloy of copper and rose gold with iridescent mother-of-pearl crystalline membranes and soft dawn luminescence.',
    primaryMetal: 0xdea091,     // Rose gold
    secondaryMetal: 0x2d2123,   // Deep mahogany bronze
    gearMetal: 0xefb0a3,        // Polished copper rose
    accentGlow: 0xff9ec7,       // Soft rose glow
    glassColor: 0x3b242e,       // Pearlescent glass
    glassOpacity: 0.70,
    roughness: 0.24,
    metalness: 0.90,
    bgColor: 0x0b0608,
    fogColor: 0x120a0f,
    ambientLight: 0x422631,
    keyLight: 0xfff0ee,
    rimLight: 0xffb3c6,
    bloomStrength: 0.95,
    particleColor: 0xffd1dc,
  },
};
