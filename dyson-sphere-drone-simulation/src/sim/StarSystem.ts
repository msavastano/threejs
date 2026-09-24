import * as THREE from 'three';
import { StarType, STAR_CONFIGS } from '../types/simulation';

export class StarSystem {
  public group: THREE.Group;
  public starMesh: THREE.Mesh;
  public coronaMesh: THREE.Mesh;
  public starLight: THREE.PointLight;
  public shadowLight: THREE.DirectionalLight;

  private currentType: StarType = 'sol';
  private flareParticles: THREE.Points | null = null;
  private pulsarJetsGroup: THREE.Group | null = null;
  private accretionDiskMesh: THREE.Mesh | null = null;
  private solarShockwaveMesh: THREE.Mesh | null = null;
  private shockwaveProgress: number = 0;
  private isShockwaveActive: boolean = false;

  constructor() {
    this.group = new THREE.Group();

    // 1. Core Star Sphere Geometry
    const geo = new THREE.SphereGeometry(12, 64, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(STAR_CONFIGS.sol.color),
      wireframe: false
    });

    this.starMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.starMesh);

    // 2. Outer Corona Atmosphere Shell
    const coronaGeo = new THREE.SphereGeometry(14.5, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(STAR_CONFIGS.sol.glowColor),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    this.group.add(this.coronaMesh);

    // 3. Dynamic Central Stellar Light
    this.starLight = new THREE.PointLight(STAR_CONFIGS.sol.glowColor, 3.5, 800);
    this.group.add(this.starLight);

    // 4. Shadow Light (Key directional light offset slightly for shadow maps)
    this.shadowLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.shadowLight.position.set(2, 5, 2);
    this.shadowLight.castShadow = true;
    this.shadowLight.shadow.mapSize.width = 2048;
    this.shadowLight.shadow.mapSize.height = 2048;
    this.shadowLight.shadow.camera.near = 1;
    this.shadowLight.shadow.camera.far = 300;
    const d = 100;
    this.shadowLight.shadow.camera.left = -d;
    this.shadowLight.shadow.camera.right = d;
    this.shadowLight.shadow.camera.top = d;
    this.shadowLight.shadow.camera.bottom = -d;
    this.shadowLight.shadow.bias = -0.0005;
    this.group.add(this.shadowLight);

    // 5. Coronal Prominence Arcs / Flares Particle Cloud
    this.setupCoronalFlares();

    // 6. Special Stellar Extensions (Pulsar Jets, Accretion Disk)
    this.setupPulsarJets();
    this.setupAccretionDisk();
    this.setupShockwaveMesh();

    this.setStarType('sol');
  }

  private setupCoronalFlares() {
    const particleCount = 600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 12.5 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0.3;

      sizes[i] = 1.5 + Math.random() * 2.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    this.flareParticles = new THREE.Points(geo, mat);
    this.group.add(this.flareParticles);
  }

  private setupPulsarJets() {
    this.pulsarJetsGroup = new THREE.Group();

    // Polar Conical Energy Jets
    const jetGeo = new THREE.ConeGeometry(8, 90, 32, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00ffff'),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const topJet = new THREE.Mesh(jetGeo, jetMat);
    topJet.position.y = 45;
    this.pulsarJetsGroup.add(topJet);

    const bottomJet = new THREE.Mesh(jetGeo, jetMat.clone());
    bottomJet.position.y = -45;
    bottomJet.rotation.x = Math.PI;
    this.pulsarJetsGroup.add(bottomJet);

    this.pulsarJetsGroup.visible = false;
    this.group.add(this.pulsarJetsGroup);
  }

  private setupAccretionDisk() {
    const diskGeo = new THREE.RingGeometry(16, 45, 64);
    // Rotate ring to lie flat / slightly tilted
    diskGeo.rotateX(Math.PI / 2.3);

    const diskMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffaa00'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.accretionDiskMesh = new THREE.Mesh(diskGeo, diskMat);
    this.accretionDiskMesh.visible = false;
    this.group.add(this.accretionDiskMesh);
  }

  private setupShockwaveMesh() {
    const ringGeo = new THREE.RingGeometry(13, 16, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff2200'),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.solarShockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
    this.solarShockwaveMesh.visible = false;
    this.group.add(this.solarShockwaveMesh);
  }

  public setStarType(type: StarType) {
    this.currentType = type;
    const config = STAR_CONFIGS[type];

    // Scale geometry based on radius
    const scale = config.radius / 12;
    this.starMesh.scale.set(scale, scale, scale);
    this.coronaMesh.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);

    // Update Materials and Lights
    (this.starMesh.material as THREE.MeshBasicMaterial).color.set(config.color);
    (this.coronaMesh.material as THREE.MeshBasicMaterial).color.set(config.glowColor);
    this.starLight.color.set(config.glowColor);
    this.starLight.intensity = type === 'black_hole' ? 1.2 : type === 'blue_giant' ? 5.0 : 3.5;

    // Toggle special effects
    if (this.pulsarJetsGroup) {
      this.pulsarJetsGroup.visible = (type === 'pulsar');
      if (type === 'pulsar') {
        this.pulsarJetsGroup.scale.set(scale, scale * 1.5, scale);
      }
    }

    if (this.accretionDiskMesh) {
      this.accretionDiskMesh.visible = (type === 'black_hole');
      if (type === 'black_hole') {
        (this.starMesh.material as THREE.MeshBasicMaterial).color.set('#000000'); // Event horizon is pitch dark
      }
    }
  }

  public triggerSolarFlare() {
    this.isShockwaveActive = true;
    this.shockwaveProgress = 0;
    if (this.solarShockwaveMesh) {
      this.solarShockwaveMesh.visible = true;
      this.solarShockwaveMesh.scale.set(1, 1, 1);
      (this.solarShockwaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
  }

  public update(delta: number, timeScale: number) {
    const speed = delta * timeScale;

    // Star Rotation
    const rotSpeed = this.currentType === 'pulsar' ? 8.0 : 0.2;
    this.starMesh.rotation.y += speed * rotSpeed;
    this.coronaMesh.rotation.y -= speed * rotSpeed * 0.5;

    // Pulsar rotation
    if (this.pulsarJetsGroup && this.pulsarJetsGroup.visible) {
      this.pulsarJetsGroup.rotation.y += speed * 12.0;
      this.pulsarJetsGroup.rotation.z = Math.sin(Date.now() * 0.003) * 0.15;
    }

    // Accretion Disk swirl
    if (this.accretionDiskMesh && this.accretionDiskMesh.visible) {
      this.accretionDiskMesh.rotation.z += speed * 0.8;
    }

    // Coronal Particles motion
    if (this.flareParticles) {
      this.flareParticles.rotation.y += speed * 0.15;
      this.flareParticles.rotation.x += speed * 0.08;
    }

    // Solar Shockwave expansion
    if (this.isShockwaveActive && this.solarShockwaveMesh) {
      this.shockwaveProgress += delta * 2.0;
      const scale = 1 + this.shockwaveProgress * 8;
      this.solarShockwaveMesh.scale.set(scale, scale, scale);
      const op = Math.max(0, 0.9 - this.shockwaveProgress * 0.45);
      (this.solarShockwaveMesh.material as THREE.MeshBasicMaterial).opacity = op;

      if (this.shockwaveProgress >= 2.0) {
        this.isShockwaveActive = false;
        this.solarShockwaveMesh.visible = false;
      }
    }
  }
}
