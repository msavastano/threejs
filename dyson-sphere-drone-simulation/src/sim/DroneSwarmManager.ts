import * as THREE from 'three';
import { SwarmFormation } from '../types/simulation';

interface DroneData {
  radius: number;
  theta: number; // Azimuthal angle
  phi: number;   // Inclination angle
  speed: number;
  state: number; // 0: transit, 1: mining, 2: constructing, 3: charging
  targetPos: THREE.Vector3;
  laserActive: boolean;
}

export class DroneSwarmManager {
  public group: THREE.Group;
  public instancedMesh: THREE.InstancedMesh;
  public laserLinesMesh: THREE.LineSegments;

  private maxDrones: number = 20000;
  private currentDroneCount: number = 5000;
  private droneData: DroneData[] = [];
  private dummy: THREE.Object3D = new THREE.Object3D();
  private colors: Float32Array;

  // Laser beam geometry buffer
  private laserPositions: Float32Array;
  private laserMaxBeams: number = 1000; // Render top 1000 active constructing laser beams simultaneously for extreme high FPS
  private laserCount: number = 0;

  private currentFormation: SwarmFormation = 'orbital_rings';
  private baseDysonRadius: number = 55;

  // Team Colors for Instanced States
  private colorTransit = new THREE.Color('#38bdf8');    // Cyan
  private colorMining = new THREE.Color('#e879f9');     // Magenta / Purple
  private colorConstruct = new THREE.Color('#fbbf24');  // Amber Gold Laser
  private colorCharge = new THREE.Color('#34d399');     // Emerald Green
  private colorEvade = new THREE.Color('#f87171');      // Crimson

  constructor(initialCount: number = 5000) {
    this.currentDroneCount = initialCount;
    this.group = new THREE.Group();

    // 1. Sleek Sci-Fi Drone Geometry (a small pointed triangle ship with wings)
    const droneGeo = new THREE.ConeGeometry(0.35, 1.2, 4);
    droneGeo.rotateX(Math.PI / 2); // Point forward along velocity vector

    const droneMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.8,
      emissive: '#0284c7',
      emissiveIntensity: 0.4
    });

    this.instancedMesh = new THREE.InstancedMesh(droneGeo, droneMat, this.maxDrones);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;

    // Color attribute array for instanced colors
    this.colors = new Float32Array(this.maxDrones * 3);

    // Initialize Drone State Data
    for (let i = 0; i < this.maxDrones; i++) {
      const state = Math.floor(Math.random() * 4);
      const radius = 45 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      this.droneData.push({
        radius,
        theta,
        phi,
        speed: 0.3 + Math.random() * 0.7,
        state,
        targetPos: new THREE.Vector3(),
        laserActive: false
      });

      // Default color initialization
      this.colors[i * 3] = this.colorTransit.r;
      this.colors[i * 3 + 1] = this.colorTransit.g;
      this.colors[i * 3 + 2] = this.colorTransit.b;
    }

    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    this.group.add(this.instancedMesh);

    // 2. Dynamic Construction Laser Beams
    const laserGeo = new THREE.BufferGeometry();
    this.laserPositions = new Float32Array(this.laserMaxBeams * 2 * 3); // 2 vertices per line segment
    laserGeo.setAttribute('position', new THREE.BufferAttribute(this.laserPositions, 3));

    const laserMat = new THREE.LineBasicMaterial({
      color: '#fbbf24',
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.laserLinesMesh = new THREE.LineSegments(laserGeo, laserMat);
    this.group.add(this.laserLinesMesh);

    this.setDroneCount(initialCount);
  }

  public setDroneCount(count: number) {
    this.currentDroneCount = Math.min(this.maxDrones, Math.max(100, count));
    this.instancedMesh.count = this.currentDroneCount;
  }

  public setFormation(formation: SwarmFormation) {
    this.currentFormation = formation;
  }

  public update(
    delta: number,
    timeScale: number,
    droneSpeedFactor: number,
    planetPos: THREE.Vector3,
    getRandomNodeFunc: () => THREE.Vector3,
    isSolarFlare: boolean
  ) {
    const speed = delta * timeScale * droneSpeedFactor;
    this.laserCount = 0;

    let transitingCount = 0;
    let miningCount = 0;
    let beamingCount = 0;
    let chargingCount = 0;

    const dronePos = new THREE.Vector3();
    const targetNode = new THREE.Vector3();

    for (let i = 0; i < this.currentDroneCount; i++) {
      const data = this.droneData[i];

      // Keplerian Orbital Velocity decreases with distance r
      const orbitalSpeed = (data.speed / Math.sqrt(data.radius / 30)) * speed * 0.8;

      // Formation Modifications
      if (isSolarFlare) {
        // Evasion: Expand outward away from flare blast
        data.radius = Math.min(180, data.radius + speed * 40.0);
      } else if (this.currentFormation === 'orbital_rings') {
        // Snap towards 3 major ring planes
        const ringPlane = (i % 3);
        if (ringPlane === 0) data.phi *= 0.95; // Equatorial
        else if (ringPlane === 1) data.phi = THREE.MathUtils.lerp(data.phi, Math.PI / 4, 0.05); // Inclined
        else data.phi = THREE.MathUtils.lerp(data.phi, Math.PI / 2, 0.05); // Polar
        data.radius = THREE.MathUtils.lerp(data.radius, 55 + (i % 5) * 2, 0.05);
      } else if (this.currentFormation === 'dyson_grid') {
        data.radius = THREE.MathUtils.lerp(data.radius, this.baseDysonRadius, 0.05);
      } else if (this.currentFormation === 'polar_orbit') {
        data.phi = THREE.MathUtils.lerp(data.phi, (i % 2 === 0 ? 1 : -1) * (Math.PI / 2 - 0.2), 0.05);
        data.radius = THREE.MathUtils.lerp(data.radius, 60, 0.05);
      }

      // Orbital Trajectory Progress
      data.theta += orbitalSpeed;

      // Position in Spherical Coordinates
      dronePos.x = data.radius * Math.cos(data.phi) * Math.cos(data.theta);
      dronePos.y = data.radius * Math.sin(data.phi);
      dronePos.z = data.radius * Math.cos(data.phi) * Math.sin(data.theta);

      // State Transitions & Laser Firing logic
      if (data.state === 0) { // Transit
        transitingCount++;
        if (Math.random() < 0.002) data.state = 1; // Transition to Mining
      } else if (data.state === 1) { // Mining
        miningCount++;
        // Fly towards planet
        dronePos.lerp(planetPos, 0.15);
        if (Math.random() < 0.003) data.state = 2; // Transition to Constructing
      } else if (data.state === 2) { // Constructing
        beamingCount++;
        data.laserActive = true;

        // Fire Laser to Dyson target node
        if (this.laserCount < this.laserMaxBeams) {
          const node = getRandomNodeFunc();
          const baseIdx = this.laserCount * 6;

          this.laserPositions[baseIdx] = dronePos.x;
          this.laserPositions[baseIdx + 1] = dronePos.y;
          this.laserPositions[baseIdx + 2] = dronePos.z;

          this.laserPositions[baseIdx + 3] = node.x;
          this.laserPositions[baseIdx + 4] = node.y;
          this.laserPositions[baseIdx + 5] = node.z;

          this.laserCount++;
        }

        if (Math.random() < 0.004) data.state = 3; // Need recharge
      } else { // Charging
        chargingCount++;
        data.laserActive = false;
        if (Math.random() < 0.005) data.state = 0; // Ready for transit
      }

      // Orientation oriented along movement direction
      this.dummy.position.copy(dronePos);
      targetNode.set(
        data.radius * Math.cos(data.phi) * Math.cos(data.theta + 0.1),
        data.radius * Math.sin(data.phi),
        data.radius * Math.cos(data.phi) * Math.sin(data.theta + 0.1)
      );
      this.dummy.lookAt(targetNode);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      // Update Color per state
      let activeColor = this.colorTransit;
      if (isSolarFlare) activeColor = this.colorEvade;
      else if (data.state === 1) activeColor = this.colorMining;
      else if (data.state === 2) activeColor = this.colorConstruct;
      else if (data.state === 3) activeColor = this.colorCharge;

      this.colors[i * 3] = activeColor.r;
      this.colors[i * 3 + 1] = activeColor.g;
      this.colors[i * 3 + 2] = activeColor.b;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    // Update Laser Line Geometry Buffer
    const posAttr = this.laserLinesMesh.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    this.laserLinesMesh.geometry.setDrawRange(0, this.laserCount * 2);

    return {
      transitingCount,
      miningCount,
      beamingCount,
      chargingCount
    };
  }

  public getActiveLaserCount(): number {
    return this.laserCount;
  }
}
