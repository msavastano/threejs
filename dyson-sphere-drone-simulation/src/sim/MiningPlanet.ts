import * as THREE from 'three';

export class MiningPlanet {
  public group: THREE.Group;
  public planetMesh: THREE.Mesh;
  public ringMesh: THREE.Mesh;
  private cargoStreamPoints: THREE.Points;
  private cargoPositions: Float32Array;
  private cargoCount: number = 200;
  private angle: number = 0;
  private orbitRadius: number = 150;

  constructor() {
    this.group = new THREE.Group();

    // 1. Terraformed Mining World Sphere
    const geo = new THREE.SphereGeometry(7, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: '#1d4ed8', // Ocean Blue / Industrial Gray mix
      roughness: 0.6,
      metalness: 0.4,
      emissive: '#0f172a'
    });

    this.planetMesh = new THREE.Mesh(geo, mat);
    this.planetMesh.castShadow = true;
    this.planetMesh.receiveShadow = true;
    this.group.add(this.planetMesh);

    // 2. Orbital Foundry Ring around the Planet
    const ringGeo = new THREE.RingGeometry(9, 11, 32);
    ringGeo.rotateX(Math.PI / 2.2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });

    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(this.ringMesh);

    // 3. Material Supply Trail Particles (moving from Mining Planet to Dyson Center)
    const cargoGeo = new THREE.BufferGeometry();
    this.cargoPositions = new Float32Array(this.cargoCount * 3);
    const cargoColors = new Float32Array(this.cargoCount * 3);

    for (let i = 0; i < this.cargoCount; i++) {
      cargoColors[i * 3] = 0.2;
      cargoColors[i * 3 + 1] = 0.9;
      cargoColors[i * 3 + 2] = 1.0;
    }

    cargoGeo.setAttribute('position', new THREE.BufferAttribute(this.cargoPositions, 3));
    cargoGeo.setAttribute('color', new THREE.BufferAttribute(cargoColors, 3));

    const cargoMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.cargoStreamPoints = new THREE.Points(cargoGeo, cargoMat);
    // Add cargo stream to parent scene level or planet group
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  public update(delta: number, timeScale: number) {
    const speed = delta * timeScale;
    this.angle += speed * 0.05; // Slow orbital revolution

    // Orbit around the center star
    this.group.position.x = Math.cos(this.angle) * this.orbitRadius;
    this.group.position.z = Math.sin(this.angle) * this.orbitRadius;
    this.group.position.y = Math.sin(this.angle * 0.5) * 15; // Gentle orbital inclination

    this.planetMesh.rotation.y += speed * 0.5;

    // Update cargo transport stream positions from Planet to Dyson Radius (around 50-70 units)
    const planetPos = this.group.position;
    const targetRadius = 55;

    for (let i = 0; i < this.cargoCount; i++) {
      const progress = ((Date.now() * 0.0005 + i / this.cargoCount) % 1.0);
      const lerpX = THREE.MathUtils.lerp(planetPos.x, Math.cos(this.angle + i) * targetRadius, progress);
      const lerpY = THREE.MathUtils.lerp(planetPos.y, Math.sin(i) * targetRadius * 0.3, progress);
      const lerpZ = THREE.MathUtils.lerp(planetPos.z, Math.sin(this.angle + i) * targetRadius, progress);

      this.cargoPositions[i * 3] = lerpX;
      this.cargoPositions[i * 3 + 1] = lerpY;
      this.cargoPositions[i * 3 + 2] = lerpZ;
    }

    this.cargoStreamPoints.geometry.attributes.position.needsUpdate = true;
  }

  public getCargoStreamPoints(): THREE.Points {
    return this.cargoStreamPoints;
  }
}
