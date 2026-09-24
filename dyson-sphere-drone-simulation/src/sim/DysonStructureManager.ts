import * as THREE from 'three';

export class DysonStructureManager {
  public group: THREE.Group;

  // Structural subcomponents
  private ringsGroup: THREE.Group;
  private geodesicLatticeGroup: THREE.Group;
  private hexPanelsMesh: THREE.InstancedMesh;
  private powerGridMesh: THREE.Mesh;
  private powerBeamMesh: THREE.Mesh;

  private totalHexCount: number = 360;
  private hexPositions: THREE.Vector3[] = [];
  private hexRotations: THREE.Euler[] = [];
  private dummy: THREE.Object3D = new THREE.Object3D();

  private baseRadius: number = 55;

  constructor() {
    this.group = new THREE.Group();
    this.ringsGroup = new THREE.Group();
    this.geodesicLatticeGroup = new THREE.Group();

    this.group.add(this.ringsGroup);
    this.group.add(this.geodesicLatticeGroup);

    // 1. Build Phase 1 Rings
    this.setupSwarmRings();

    // 2. Build Phase 2 Geodesic Lattice Web
    this.setupGeodesicLattice();

    // 3. Build Phase 3 Hexagonal Panels (InstancedMesh)
    this.hexPanelsMesh = this.setupHexPanels();
    this.group.add(this.hexPanelsMesh);

    // 4. Build Phase 4 Power Hull Grid & Galactic Beams
    this.powerGridMesh = this.setupPowerGrid();
    this.group.add(this.powerGridMesh);

    this.powerBeamMesh = this.setupPowerBeam();
    this.group.add(this.powerBeamMesh);

    this.updateProgress(0.0);
  }

  private setupSwarmRings() {
    const ringRadii = [52, 55, 58];
    const ringRotations = [
      new THREE.Euler(0, 0, 0),
      new THREE.Euler(Math.PI / 4, Math.PI / 6, 0),
      new THREE.Euler(Math.PI / 2, 0, Math.PI / 3)
    ];

    ringRadii.forEach((r, idx) => {
      // Metallic Orbital Truss Tube
      const tubeGeo = new THREE.TorusGeometry(r, 0.6, 16, 128);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: '#334155',
        metalness: 0.85,
        roughness: 0.2
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.copy(ringRotations[idx]);
      tube.castShadow = true;
      tube.receiveShadow = true;

      // Inner Glowing Energy Channel
      const energyGeo = new THREE.TorusGeometry(r, 0.35, 8, 96);
      const energyMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.85
      });
      const energy = new THREE.Mesh(energyGeo, energyMat);
      energy.rotation.copy(ringRotations[idx]);

      const ringContainer = new THREE.Group();
      ringContainer.add(tube);
      ringContainer.add(energy);

      // Add collector hub satellites along the ring
      const hubGeo = new THREE.BoxGeometry(2.5, 1.8, 1.8);
      const hubMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.9, roughness: 0.1 });
      for (let a = 0; a < 16; a++) {
        const angle = (a / 16) * Math.PI * 2;
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        hub.rotation.z = angle;
        hub.castShadow = true;
        ringContainer.add(hub);
      }

      this.ringsGroup.add(ringContainer);
    });
  }

  private setupGeodesicLattice() {
    // Icosahedron geometry vertices to create a sphere lattice wireframe
    const geo = new THREE.IcosahedronGeometry(this.baseRadius, 2);
    const wireframeGeo = new THREE.WireframeGeometry(geo);

    const lineMat = new THREE.LineBasicMaterial({
      color: '#0284c7',
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    });

    const lines = new THREE.LineSegments(wireframeGeo, lineMat);
    this.geodesicLatticeGroup.add(lines);

    // Glowing Nodes at Vertices
    const posAttr = geo.attributes.position;
    const nodeGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.8,
      metalness: 0.8
    });

    const nodeInstanced = new THREE.InstancedMesh(nodeGeo, nodeMat, posAttr.count);
    const dummyNode = new THREE.Object3D();

    for (let i = 0; i < posAttr.count; i++) {
      dummyNode.position.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      dummyNode.updateMatrix();
      nodeInstanced.setMatrixAt(i, dummyNode.matrix);
    }
    nodeInstanced.instanceMatrix.needsUpdate = true;
    nodeInstanced.castShadow = true;

    this.geodesicLatticeGroup.add(nodeInstanced);
  }

  private setupHexPanels(): THREE.InstancedMesh {
    // Generate hexagonal distribution around a sphere surface (Fibonacci sphere spacing)
    const hexGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.4, 6);
    hexGeo.rotateX(Math.PI / 2);

    const hexMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.9,
      roughness: 0.1,
      emissive: '#1e3a8a',
      emissiveIntensity: 0.2
    });

    const instancedMesh = new THREE.InstancedMesh(hexGeo, hexMat, this.totalHexCount);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

    for (let i = 0; i < this.totalHexCount; i++) {
      const theta = (2 * Math.PI * i) / phi;
      const y = 1 - (i / (this.totalHexCount - 1)) * 2; // from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const pos = new THREE.Vector3(x, y, z).multiplyScalar(this.baseRadius);
      this.hexPositions.push(pos);

      // Orientation facing outward from star center
      const normal = pos.clone().normalize();
      const rot = new THREE.Euler();
      const dummyObj = new THREE.Object3D();
      dummyObj.position.copy(pos);
      dummyObj.lookAt(pos.clone().add(normal));
      rot.copy(dummyObj.rotation);
      this.hexRotations.push(rot);

      // Initialize hidden (scale 0)
      this.dummy.position.copy(pos);
      this.dummy.rotation.copy(rot);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
  }

  private setupPowerGrid(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(this.baseRadius + 0.2, 64, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      for (let x = 0; x < 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y < 512; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Mesh(geo, mat);
  }

  private setupPowerBeam(): THREE.Mesh {
    const beamGeo = new THREE.CylinderGeometry(1.5, 12, 250, 32, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 125); // Extend along Z axis from pole

    const beamMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(beamGeo, beamMat);
    mesh.position.set(0, 0, this.baseRadius);
    return mesh;
  }

  public updateProgress(progress: number) {
    // 1. Phase 1 Swarm Rings (visible from 0.10 to 1.0)
    const ringScale = Math.min(1.0, Math.max(0.0, (progress - 0.05) / 0.15));
    this.ringsGroup.scale.set(ringScale, ringScale, ringScale);
    this.ringsGroup.visible = progress >= 0.05;

    // 2. Phase 2 Geodesic Lattice (visible from 0.30 to 1.0)
    const latticeScale = Math.min(1.0, Math.max(0.0, (progress - 0.25) / 0.25));
    this.geodesicLatticeGroup.scale.set(latticeScale, latticeScale, latticeScale);
    this.geodesicLatticeGroup.visible = progress >= 0.25;

    // 3. Phase 3 Hexagonal Panels (scale each hex panel gradually as progress increases)
    const activeHexThreshold = Math.min(this.totalHexCount, Math.floor(progress * this.totalHexCount * 1.1));

    for (let i = 0; i < this.totalHexCount; i++) {
      if (i < activeHexThreshold) {
        const panelProgress = Math.min(1.0, (activeHexThreshold - i) / 10.0);
        this.dummy.position.copy(this.hexPositions[i]);
        this.dummy.rotation.copy(this.hexRotations[i]);
        this.dummy.scale.set(panelProgress, panelProgress, panelProgress);
      } else {
        this.dummy.scale.set(0, 0, 0);
      }
      this.dummy.updateMatrix();
      this.hexPanelsMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.hexPanelsMesh.instanceMatrix.needsUpdate = true;

    // 4. Phase 4 Power Grid & Beams (visible from 0.85 to 1.0)
    if (progress >= 0.85) {
      const fullProgress = (progress - 0.85) / 0.15;
      (this.powerGridMesh.material as THREE.MeshBasicMaterial).opacity = fullProgress * 0.75;
      (this.powerBeamMesh.material as THREE.MeshBasicMaterial).opacity = fullProgress * 0.9;
    } else {
      (this.powerGridMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      (this.powerBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  public getRandomConstructionNode(): THREE.Vector3 {
    if (this.hexPositions.length === 0) return new THREE.Vector3(55, 0, 0);
    const index = Math.floor(Math.random() * this.hexPositions.length);
    return this.hexPositions[index].clone();
  }

  public update(delta: number, timeScale: number) {
    const speed = delta * timeScale;
    this.ringsGroup.rotation.y += speed * 0.08;
    this.ringsGroup.rotation.x += speed * 0.03;
    this.geodesicLatticeGroup.rotation.y -= speed * 0.02;
    this.hexPanelsMesh.rotation.y -= speed * 0.01;
    this.powerGridMesh.rotation.y -= speed * 0.01;
  }
}
