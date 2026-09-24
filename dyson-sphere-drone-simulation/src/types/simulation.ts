export type StarType = 'sol' | 'blue_giant' | 'red_supergiant' | 'pulsar' | 'black_hole';

export type DroneState = 'transit' | 'mining' | 'constructing' | 'charging';

export type SwarmFormation = 'orbital_rings' | 'dyson_grid' | 'polar_orbit' | 'defensive_shell' | 'swarm_burst';

export type CameraMode = 'free' | 'chase_drone' | 'star_surface' | 'mining_planet' | 'cinematic_tour';

export interface StarConfig {
  id: StarType;
  name: string;
  spectralType: string;
  radius: number;
  temperatureK: number;
  luminosityLsol: number;
  massMsol: number;
  color: string;
  glowColor: string;
  description: string;
}

export const STAR_CONFIGS: Record<StarType, StarConfig> = {
  sol: {
    id: 'sol',
    name: 'Sol (G-Type Dwarf)',
    spectralType: 'G2V Main Sequence',
    radius: 12,
    temperatureK: 5778,
    luminosityLsol: 1.0,
    massMsol: 1.0,
    color: '#ffaa00',
    glowColor: '#ffdd66',
    description: 'A stable yellow dwarf star. Ideal baseline for first-generation Kardashev Type II Dyson Swarms.'
  },
  blue_giant: {
    id: 'blue_giant',
    name: 'Rigel Prime (O-Type Blue Giant)',
    spectralType: 'O9.5I High Lum',
    radius: 18,
    temperatureK: 28000,
    luminosityLsol: 120000.0,
    massMsol: 21.0,
    color: '#00ccff',
    glowColor: '#77e0ff',
    description: 'An immense hyper-luminous blue giant producing overwhelming energy radiation and violent stellar winds.'
  },
  red_supergiant: {
    id: 'red_supergiant',
    name: 'Betelgeuse Secundus (M-Type Red Giant)',
    spectralType: 'M1-M2 Supergiant',
    radius: 25,
    temperatureK: 3500,
    luminosityLsol: 126000.0,
    massMsol: 16.5,
    color: '#ff3311',
    glowColor: '#ff6644',
    description: 'A massive pulsating red supergiant with chaotic convective plasma surface plumes and vast gravity wells.'
  },
  pulsar: {
    id: 'pulsar',
    name: 'PSR J0437-4715 (Neutron Pulsar)',
    spectralType: 'Relativistic Pulsar',
    radius: 8,
    temperatureK: 1000000,
    luminosityLsol: 450.0,
    massMsol: 1.44,
    color: '#e066ff',
    glowColor: '#f0adff',
    description: 'A rapidly spinning magnetar emitting gamma-ray energy jets at extreme relativistic frequencies.'
  },
  black_hole: {
    id: 'black_hole',
    name: 'Gargantua (Singularity Engine)',
    spectralType: 'Kerr Supermassive Hole',
    radius: 14,
    temperatureK: 15,
    luminosityLsol: 850000.0,
    massMsol: 1000.0,
    color: '#110022',
    glowColor: '#ff9900',
    description: 'A spinning Kerr black hole enclosed by a multi-million degree relativistic gravitational accretion disk.'
  }
};

export interface ConstructionPhaseInfo {
  phase: number;
  title: string;
  subtitle: string;
  targetCompletion: number; // 0 to 1
  description: string;
  structuresUnlocked: string[];
}

export const CONSTRUCTION_PHASES: ConstructionPhaseInfo[] = [
  {
    phase: 0,
    title: 'Phase 0: Anchor Outposts & Mining Orbit',
    subtitle: 'Planetary Extraction & Swarm Assembly',
    targetCompletion: 0.10,
    description: 'Autonomous drones mine resources from the inner terraformed asteroid belt and establish initial planetary orbital foundries.',
    structuresUnlocked: ['Mining Orbit Ring', 'Starlight Harvester Beacons', 'Foundry Dock']
  },
  {
    phase: 1,
    title: 'Phase 1: Dysonian Swarm Rings',
    subtitle: 'Primary Solar Collector Bands',
    targetCompletion: 0.35,
    description: 'Thousands of high-efficiency photovoltaic satellites align into triple intersecting Keplerian orbital rings around the star.',
    structuresUnlocked: ['Equatorial Ring Assembly', 'Polar Alignment Grid', 'Power Transmission Hubs']
  },
  {
    phase: 2,
    title: 'Phase 2: Geodesic Strut Lattice',
    subtitle: 'Mesh Interconnection & Laser Node Struts',
    targetCompletion: 0.60,
    description: 'Autonomous drones weld structural titanium-carbon tension cables and energetic laser forcefields between solar ring nodes.',
    structuresUnlocked: ['Geodesic Polyhedral Ribs', 'Laser Power Relays', 'Magnetic Stabilizers']
  },
  {
    phase: 3,
    title: 'Phase 3: Hexagonal Shell Modules',
    subtitle: 'Photovoltaic Array Installation',
    targetCompletion: 0.90,
    description: 'Massive hexagonal solar panels are manufactured in orbit and fitted into the geodesic lattice web by drone swarms.',
    structuresUnlocked: ['Hexagonal Photovoltaic Panels', 'Heat Radiator Wings', 'Energy Collection Nodes']
  },
  {
    phase: 4,
    title: 'Phase 4: Full Kardashev Type II Enclosure',
    subtitle: 'Complete Dyson Shell & Stellar Engine',
    targetCompletion: 1.00,
    description: '100% star enclosure achieved. Energy capture reaches 3.8 x 10^26 Watts per second. Primary beaming system operational!',
    structuresUnlocked: ['Unified Dyson Hull', 'Gravitational Beaming Lenses', 'Star Shifting Thrusters']
  }
];

export interface SimulationSettings {
  starType: StarType;
  droneCount: number; // 1000 to 20000
  droneSpeed: number; // 0.1 to 3.0
  constructionProgress: number; // 0.0 to 1.0
  autoProgress: boolean;
  timeScale: number; // 0 (paused), 0.25, 1, 2, 5, 20
  swarmFormation: SwarmFormation;
  cameraMode: CameraMode;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  shadowsEnabled: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
  showOrbitLines: boolean;
  showLaserBeams: boolean;
  showStarGrid: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  solarFlareTrigger: boolean; // impulse trigger
}

export interface SimulationStats {
  fps: number;
  activeDrones: number;
  powerOutputTW: number; // Terawatts / Yottawatts
  kardashevRating: number; // e.g., 1.12 to 2.00
  totalPanelsBuilt: number;
  transitingDrones: number;
  beamingDrones: number;
  miningDrones: number;
  chargingDrones: number;
  orbitRadiusAvg: number;
  stellarTemperature: number;
}
