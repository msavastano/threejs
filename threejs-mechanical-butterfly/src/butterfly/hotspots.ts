import { ButterflyHotspot } from './types';

export const BUTTERFLY_HOTSPOTS: ButterflyHotspot[] = [
  {
    id: 'escapement-core',
    name: 'Chrono Escapement Core',
    subtitle: 'Twin-axis Co-axial Balance Wheel',
    category: 'Kinetic Horology',
    description: 'The pulsing clockwork nucleus of the butterfly. Houses a dual-axis tourbillon escapement with ruby pallet jewels and a blued spring steel balance vibrating at 28,800 beats per hour, translating micro-spring energy into flapping oscillation.',
    specs: [
      { label: 'Oscillation Rate', value: '4 Hz / 28,800 vph' },
      { label: 'Jewel Count', value: '32 Synthetic Rubies' },
      { label: 'Power Reserve', value: '72 Hours Kinetic' },
      { label: 'Mainspring Alloy', value: 'Cobalt-Nickel Nivaflex' }
    ],
    position: [0, 0.15, 0.1],
    cameraTarget: [0, 0.15, 0],
    cameraPos: [0, 0.9, 1.4]
  },
  {
    id: 'forewing-lattice',
    name: 'Photovoltaic Glass Forewings',
    subtitle: 'Dichroic Crystal & Gold Rib Truss',
    category: 'Aerodynamic Propulsion',
    description: 'Precision laser-etched dichroic sapphire membranes suspended inside a skeletonized brass space-frame. Micro-channels harvest ambient solar photons to recharge internal harmonic capacitors during flight.',
    specs: [
      { label: 'Membrane Thickness', value: '0.12 mm Sapphire' },
      { label: 'Truss Frame', value: 'Polished Brass & Carbon' },
      { label: 'Surface Area', value: '142 cm²' },
      { label: 'Efficiency', value: '94.2% Photon Capture' }
    ],
    position: [-1.4, 0.8, -0.4],
    cameraTarget: [-1.2, 0.7, -0.3],
    cameraPos: [-2.2, 1.8, 1.8]
  },
  {
    id: 'optical-sensor',
    name: 'Faceted Gem Ocular Array',
    subtitle: 'Multispectral Prismatic Sensors',
    category: 'Navigation & Guidance',
    description: 'Carved from optical-grade crystal gemstones with microscopic photodiode backplanes. Capable of detecting polarized atmospheric sunlight for compass heading, magnetic micro-currents, and UV floral nectar signatures.',
    specs: [
      { label: 'Faceted Lenses', value: '1,240 Prisms per Eye' },
      { label: 'Spectrum', value: '190 nm (UV) to 1100 nm (IR)' },
      { label: 'Refresh Rate', value: '480 Frames / Sec' },
      { label: 'Field of View', value: '310° Spherical' }
    ],
    position: [0.16, 0.42, 0.7],
    cameraTarget: [0, 0.38, 0.65],
    cameraPos: [0.55, 0.65, 1.5]
  },
  {
    id: 'hydraulic-pistons',
    name: 'Micro-Piston Flap Actuators',
    subtitle: 'Telescopic Pneumatic Struts',
    category: 'Fluid Mechanics',
    description: 'Sub-millimeter titanium pistons anchored to the central spine. They drive the primary wing-root hinge brackets, synchronizing wing sweep, variable aerodynamic pitch, and harmonic wing flex during turbulence.',
    specs: [
      { label: 'Piston Stroke', value: '4.8 mm' },
      { label: 'Operating Pressure', value: '18.4 Bar' },
      { label: 'Actuation Delay', value: '< 1.2 ms' },
      { label: 'Fluid Medium', value: 'Synthetic Fluorosilicone' }
    ],
    position: [0.24, 0.18, 0.15],
    cameraTarget: [0.15, 0.15, 0.1],
    cameraPos: [0.75, 0.5, 0.75]
  },
  {
    id: 'antennae-gyro',
    name: 'Inductive Coiled Antennae',
    subtitle: 'Inertial Gyro & Resonant Tuning Stems',
    category: 'Sensory Telemetry',
    description: 'Coiled copper induction stems terminating in micro-sphere fiber optic nodes. They measure barometric pressure differentials, air turbulence vortices, and receive encrypted telemetry frequencies.',
    specs: [
      { label: 'Resonant Frequency', value: '14.2 kHz' },
      { label: 'Coil Turns', value: '180 per Stem' },
      { label: 'Flex Tolerance', value: '±45° Articulation' },
      { label: 'Tip Luminescence', value: 'Dual Fiber-Optic LED' }
    ],
    position: [-0.48, 1.35, 0.75],
    cameraTarget: [-0.2, 0.8, 0.6],
    cameraPos: [-0.8, 1.5, 1.8]
  },
  {
    id: 'swallowtail-rudders',
    name: 'Swallowtail Stabilizer Fins',
    subtitle: 'Aerodynamic Gyro-Pendulums',
    category: 'Kinetic Stability',
    description: 'Gracefully elongated trailing edge fins tipped with micro-counterweights. These damp aerodynamic vortices during high-speed gliding dives and perform active roll-pitch compensation.',
    specs: [
      { label: 'Counterweight', value: '18K Gold Bead Dampers' },
      { label: 'Flutter Damping', value: 'Dynamic Sine Compensation' },
      { label: 'Sweep Range', value: '25° Trailing Coning' },
      { label: 'Etching Pattern', value: 'Sacred Fibonacci Rosette' }
    ],
    position: [-1.1, -1.0, -0.6],
    cameraTarget: [-0.8, -0.8, -0.5],
    cameraPos: [-1.6, -0.5, 1.2]
  }
];
