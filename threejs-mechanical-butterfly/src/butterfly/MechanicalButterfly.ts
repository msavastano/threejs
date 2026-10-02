import * as THREE from 'three';
import { ButterflyTheme, AnimationControls } from './types';
import { WingTextureGenerator, WingTextures } from './WingTextureGenerator';

export class MechanicalButterfly {
  public group: THREE.Group;
  public theme: ButterflyTheme;

  // Root sub-groups for exploded view animation
  public bodyGroup: THREE.Group;
  public headGroup: THREE.Group;
  public thoraxGroup: THREE.Group;
  public abdomenGroup: THREE.Group;
  public legsGroup: THREE.Group;

  // Wing root hinges
  public leftForewingHinge: THREE.Group;
  public rightForewingHinge: THREE.Group;
  public leftHindwingHinge: THREE.Group;
  public rightHindwingHinge: THREE.Group;

  // Wing inner meshes for flex/pitch
  private leftForewingMeshGroup: THREE.Group;
  private rightForewingMeshGroup: THREE.Group;
  private leftHindwingMeshGroup: THREE.Group;
  private rightHindwingMeshGroup: THREE.Group;

  // Materials dictionary for dynamic theme recoloring
  private primaryMetalMat!: THREE.MeshStandardMaterial;
  private secondaryMetalMat!: THREE.MeshStandardMaterial;
  private gearMat!: THREE.MeshStandardMaterial;
  private glassForewingMat!: THREE.MeshStandardMaterial;
  private glassHindwingMat!: THREE.MeshStandardMaterial;
  private emissiveGlowMat!: THREE.MeshStandardMaterial;
  private rubyJewelMat!: THREE.MeshPhysicalMaterial;
  private opticalEyeMat!: THREE.MeshStandardMaterial;

  // Animated gears & clockwork components
  private rotatingGears: { mesh: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[] = [];
  private balanceWheel: THREE.Object3D | null = null;
  private escapementFork: THREE.Object3D | null = null;
  private leftPistonRod: THREE.Object3D | null = null;
  private rightPistonRod: THREE.Object3D | null = null;
  private leftPistonCylinder: THREE.Object3D | null = null;
  private rightPistonCylinder: THREE.Object3D | null = null;
  private leftForewingPistonAnchor: THREE.Vector3 = new THREE.Vector3();
  private rightForewingPistonAnchor: THREE.Vector3 = new THREE.Vector3();

  // Internal glowing light
  public coreLight: THREE.PointLight;

  // Abdomen segments for articulated flexing
  private abdomenSegments: THREE.Group[] = [];
  private antennaeLeft: THREE.Group | null = null;
  private antennaeRight: THREE.Group | null = null;

  // Exploded view targets
  private explodedParts: {
    obj: THREE.Object3D;
    initialPos: THREE.Vector3;
    explodedPos: THREE.Vector3;
    initialRot?: THREE.Euler;
    explodedRot?: THREE.Euler;
  }[] = [];

  // Textures cache
  private forewingTextures: WingTextures | null = null;
  private hindwingTextures: WingTextures | null = null;

  // Animation state
  private flapTime: number = 0;
  private wingTipTrails: { pos: THREE.Vector3; left: THREE.Vector3; right: THREE.Vector3 } = {
    pos: new THREE.Vector3(),
    left: new THREE.Vector3(),
    right: new THREE.Vector3()
  };

  constructor(initialTheme: ButterflyTheme) {
    this.theme = initialTheme;
    this.group = new THREE.Group();

    this.bodyGroup = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.thoraxGroup = new THREE.Group();
    this.abdomenGroup = new THREE.Group();
    this.legsGroup = new THREE.Group();

    this.leftForewingHinge = new THREE.Group();
    this.rightForewingHinge = new THREE.Group();
    this.leftHindwingHinge = new THREE.Group();
    this.rightHindwingHinge = new THREE.Group();

    this.leftForewingMeshGroup = new THREE.Group();
    this.rightForewingMeshGroup = new THREE.Group();
    this.leftHindwingMeshGroup = new THREE.Group();
    this.rightHindwingMeshGroup = new THREE.Group();

    this.coreLight = new THREE.PointLight(this.theme.accentGlow, 3.5, 4.5, 1.2);
    this.coreLight.position.set(0, 0.15, 0.05);
    this.thoraxGroup.add(this.coreLight);

    this.initMaterials();
    this.buildClockworkComponents();
    this.assembleButterfly();
    this.registerExplodedOffsets();
  }

  private initMaterials() {
    // Generate wing textures
    const glowHex = '#' + this.theme.accentGlow.toString(16).padStart(6, '0');
    this.forewingTextures = WingTextureGenerator.createForewingTextures(glowHex);
    this.hindwingTextures = WingTextureGenerator.createHindwingTextures(glowHex);

    // Primary metal (brushed gold/brass or titanium)
    this.primaryMetalMat = new THREE.MeshStandardMaterial({
      color: this.theme.primaryMetal,
      roughness: this.theme.roughness,
      metalness: this.theme.metalness,
      envMapIntensity: 1.5,
    });

    // Secondary structural dark metal (gunmetal/damascus)
    this.secondaryMetalMat = new THREE.MeshStandardMaterial({
      color: this.theme.secondaryMetal,
      roughness: 0.45,
      metalness: 0.85,
    });

    // Clockwork gear metal (polished gold/brass)
    this.gearMat = new THREE.MeshStandardMaterial({
      color: this.theme.gearMetal,
      roughness: 0.25,
      metalness: 0.95,
      envMapIntensity: 1.8,
    });

    // Emissive glowing circuit/energy material
    this.emissiveGlowMat = new THREE.MeshStandardMaterial({
      color: this.theme.accentGlow,
      emissive: this.theme.accentGlow,
      emissiveIntensity: 2.8,
      roughness: 0.2,
      metalness: 0.5,
    });

    // Synthetic ruby jewel bearings
    this.rubyJewelMat = new THREE.MeshPhysicalMaterial({
      color: 0xdd1144,
      emissive: 0x660011,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.75,
      ior: 1.76,
      transparent: true,
      opacity: 0.95,
    });

    // Faceted optic eyes
    this.opticalEyeMat = new THREE.MeshStandardMaterial({
      color: this.theme.primaryMetal,
      emissive: this.theme.accentGlow,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.9,
      flatShading: true,
    });

    // Glass forewing membrane
    this.glassForewingMat = new THREE.MeshStandardMaterial({
      map: this.forewingTextures.diffuseMap,
      emissiveMap: this.forewingTextures.emissiveMap,
      emissive: new THREE.Color(this.theme.accentGlow),
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: this.theme.glassOpacity,
      roughness: 0.2,
      metalness: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Glass hindwing membrane
    this.glassHindwingMat = new THREE.MeshStandardMaterial({
      map: this.hindwingTextures.diffuseMap,
      emissiveMap: this.hindwingTextures.emissiveMap,
      emissive: new THREE.Color(this.theme.accentGlow),
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: this.theme.glassOpacity,
      roughness: 0.2,
      metalness: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  /**
   * Generates a 3D extruded gear mesh with teeth and spoke cutouts.
   */
  private createGearMesh(
    radius: number,
    teeth: number,
    depth: number = 0.04,
    spokeHoles: number = 4
  ): THREE.Mesh {
    const shape = new THREE.Shape();
    const toothDepth = radius * 0.18;
    const toothAngle = (Math.PI * 2) / teeth;

    for (let i = 0; i < teeth; i++) {
      const a = i * toothAngle;
      const a1 = a + toothAngle * 0.2;
      const a2 = a + toothAngle * 0.45;
      const a3 = a + toothAngle * 0.7;
      const a4 = a + toothAngle;

      // Root inner radius
      const rRoot = radius - toothDepth;
      // Pitch/Tip radius
      const rTip = radius + toothDepth * 0.6;

      const p0 = new THREE.Vector2(Math.cos(a) * rRoot, Math.sin(a) * rRoot);
      const p1 = new THREE.Vector2(Math.cos(a1) * rTip, Math.sin(a1) * rTip);
      const p2 = new THREE.Vector2(Math.cos(a2) * rTip, Math.sin(a2) * rTip);
      const p3 = new THREE.Vector2(Math.cos(a3) * rRoot, Math.sin(a3) * rRoot);
      const p4 = new THREE.Vector2(Math.cos(a4) * rRoot, Math.sin(a4) * rRoot);

      if (i === 0) {
        shape.moveTo(p0.x, p0.y);
      }
      shape.lineTo(p1.x, p1.y);
      shape.lineTo(p2.x, p2.y);
      shape.lineTo(p3.x, p3.y);
      shape.lineTo(p4.x, p4.y);
    }
    shape.closePath();

    // Center axle hole
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, radius * 0.22, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    // Spoke cutouts
    if (spokeHoles > 0) {
      for (let s = 0; s < spokeHoles; s++) {
        const sa = (s / spokeHoles) * Math.PI * 2 + Math.PI / spokeHoles;
        const dist = radius * 0.55;
        const spokeR = radius * 0.18;
        const spokePath = new THREE.Path();
        spokePath.absarc(
          Math.cos(sa) * dist,
          Math.sin(sa) * dist,
          spokeR,
          0,
          Math.PI * 2,
          true
        );
        shape.holes.push(spokePath);
      }
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();

    const gearMesh = new THREE.Mesh(geom, this.gearMat);
    gearMesh.castShadow = true;
    gearMesh.receiveShadow = true;
    return gearMesh;
  }

  private buildClockworkComponents() {
    // 1. Thorax Skeleton Ribs & Core
    const ribCount = 5;
    for (let r = 0; r < ribCount; r++) {
      const ribProgress = r / (ribCount - 1);
      const ribRadius = 0.28 + Math.sin(ribProgress * Math.PI) * 0.14;
      const ribZ = (ribProgress - 0.5) * 0.85;

      // Curved brass rib hoop
      const ribGeom = new THREE.TorusGeometry(ribRadius, 0.024, 8, 24, Math.PI * 1.6);
      const ribMesh = new THREE.Mesh(ribGeom, this.primaryMetalMat);
      ribMesh.position.set(0, 0.1, ribZ);
      ribMesh.rotation.x = Math.PI * 0.5;
      ribMesh.rotation.z = Math.PI * 0.2;
      this.thoraxGroup.add(ribMesh);
    }

    // Longitudinal spine rail
    const spineGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 12);
    const spineMesh = new THREE.Mesh(spineGeom, this.secondaryMetalMat);
    spineMesh.rotation.x = Math.PI * 0.5;
    spineMesh.position.set(0, 0.32, 0);
    this.thoraxGroup.add(spineMesh);

    // Central Glowing Chrono Core (faceted aether crystal)
    const crystalGeom = new THREE.OctahedronGeometry(0.16, 1);
    const crystalMesh = new THREE.Mesh(crystalGeom, this.emissiveGlowMat);
    crystalMesh.position.set(0, 0.15, 0.05);
    this.thoraxGroup.add(crystalMesh);

    // Crystal outer cage rings (gyro gimbals)
    const gimbalGeom1 = new THREE.TorusGeometry(0.22, 0.012, 8, 32);
    const gimbal1 = new THREE.Mesh(gimbalGeom1, this.primaryMetalMat);
    gimbal1.position.copy(crystalMesh.position);
    this.thoraxGroup.add(gimbal1);
    this.rotatingGears.push({ mesh: gimbal1, axis: 'y', speed: 1.2 });

    const gimbalGeom2 = new THREE.TorusGeometry(0.25, 0.012, 8, 32);
    const gimbal2 = new THREE.Mesh(gimbalGeom2, this.gearMat);
    gimbal2.position.copy(crystalMesh.position);
    gimbal2.rotation.x = Math.PI * 0.5;
    this.thoraxGroup.add(gimbal2);
    this.rotatingGears.push({ mesh: gimbal2, axis: 'x', speed: -1.6 });

    // Center Main Spur Drive Gear
    const mainGear = this.createGearMesh(0.26, 20, 0.035, 5);
    mainGear.position.set(0, 0.15, -0.15);
    mainGear.rotation.x = Math.PI * 0.5;
    this.thoraxGroup.add(mainGear);
    this.rotatingGears.push({ mesh: mainGear, axis: 'y', speed: 2.5 });

    // Ruby jewel at main gear axle
    const rubyAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12),
      this.rubyJewelMat
    );
    rubyAxle.position.copy(mainGear.position);
    rubyAxle.rotation.x = Math.PI * 0.5;
    this.thoraxGroup.add(rubyAxle);

    // Twin Lateral Wing Drive Bevel Gears (Left & Right)
    const leftDriveGear = this.createGearMesh(0.18, 14, 0.03, 3);
    leftDriveGear.position.set(-0.24, 0.22, 0.1);
    leftDriveGear.rotation.y = Math.PI * 0.5;
    this.thoraxGroup.add(leftDriveGear);
    this.rotatingGears.push({ mesh: leftDriveGear, axis: 'z', speed: 4.5 });

    const rightDriveGear = this.createGearMesh(0.18, 14, 0.03, 3);
    rightDriveGear.position.set(0.24, 0.22, 0.1);
    rightDriveGear.rotation.y = -Math.PI * 0.5;
    this.thoraxGroup.add(rightDriveGear);
    this.rotatingGears.push({ mesh: rightDriveGear, axis: 'z', speed: -4.5 });

    // Secondary escapement gear
    const escapementWheel = this.createGearMesh(0.15, 12, 0.025, 3);
    escapementWheel.position.set(0, -0.05, 0.18);
    escapementWheel.rotation.x = Math.PI * 0.5;
    this.thoraxGroup.add(escapementWheel);
    this.rotatingGears.push({ mesh: escapementWheel, axis: 'y', speed: -3.8 });

    // Balance wheel with hairspring
    const balanceGroup = new THREE.Group();
    const balanceRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.015, 8, 24),
      this.gearMat
    );
    balanceGroup.add(balanceRim);

    // Cross arms on balance wheel
    const armGeom = new THREE.BoxGeometry(0.28, 0.012, 0.012);
    balanceGroup.add(new THREE.Mesh(armGeom, this.primaryMetalMat));
    const arm2 = new THREE.Mesh(armGeom, this.primaryMetalMat);
    arm2.rotation.z = Math.PI * 0.5;
    balanceGroup.add(arm2);

    balanceGroup.position.set(0, -0.16, -0.05);
    balanceGroup.rotation.x = Math.PI * 0.5;
    this.thoraxGroup.add(balanceGroup);
    this.balanceWheel = balanceGroup;

    // Escapement pallet fork
    const forkGroup = new THREE.Group();
    const forkBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.03, 0.02),
      this.secondaryMetalMat
    );
    forkGroup.add(forkBody);
    const rubyPallet1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.03, 0.03),
      this.rubyJewelMat
    );
    rubyPallet1.position.set(-0.06, 0.02, 0);
    forkGroup.add(rubyPallet1);
    const rubyPallet2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.03, 0.03),
      this.rubyJewelMat
    );
    rubyPallet2.position.set(0.06, 0.02, 0);
    forkGroup.add(rubyPallet2);

    forkGroup.position.set(0, -0.16, 0.08);
    this.thoraxGroup.add(forkGroup);
    this.escapementFork = forkGroup;

    // Micro Hydraulic Pistons (Left & Right)
    this.leftPistonCylinder = this.createPistonCylinder();
    this.leftPistonCylinder.position.set(-0.2, 0.1, 0.15);
    this.leftPistonCylinder.rotation.z = -0.5;
    this.thoraxGroup.add(this.leftPistonCylinder);

    this.leftPistonRod = this.createPistonRod();
    this.leftPistonCylinder.add(this.leftPistonRod);

    this.rightPistonCylinder = this.createPistonCylinder();
    this.rightPistonCylinder.position.set(0.2, 0.1, 0.15);
    this.rightPistonCylinder.rotation.z = 0.5;
    this.thoraxGroup.add(this.rightPistonCylinder);

    this.rightPistonRod = this.createPistonRod();
    this.rightPistonCylinder.add(this.rightPistonRod);

    // 2. Head & Sensory Apparatus
    this.buildHead();

    // 3. Abdomen Segments
    this.buildAbdomen();

    // 4. Robotic Articulated Legs
    this.buildLegs();

    // 5. Wings (Upper Forewings & Lower Hindwings)
    this.buildForewings();
    this.buildHindwings();
  }

  private createPistonCylinder(): THREE.Group {
    const group = new THREE.Group();
    const cylGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12);
    const cylMesh = new THREE.Mesh(cylGeom, this.secondaryMetalMat);
    group.add(cylMesh);

    // Brass collar rings
    const ringGeom = new THREE.TorusGeometry(0.034, 0.008, 6, 16);
    const ring1 = new THREE.Mesh(ringGeom, this.primaryMetalMat);
    ring1.position.y = 0.07;
    ring1.rotation.x = Math.PI * 0.5;
    group.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = -0.07;
    group.add(ring2);

    return group;
  }

  private createPistonRod(): THREE.Mesh {
    const rodGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.28, 12);
    const rodMesh = new THREE.Mesh(rodGeom, this.primaryMetalMat);
    rodMesh.position.y = 0.14;
    return rodMesh;
  }

  private buildHead() {
    this.headGroup.position.set(0, 0.35, 0.55);

    // Crown Exoskeleton Shell
    const crownGeom = new THREE.ConeGeometry(0.2, 0.32, 7);
    crownGeom.rotateX(Math.PI * 0.3);
    const crownMesh = new THREE.Mesh(crownGeom, this.primaryMetalMat);
    crownMesh.castShadow = true;
    this.headGroup.add(crownMesh);

    // Beveled Faceplate
    const plateGeom = new THREE.BoxGeometry(0.24, 0.18, 0.12);
    const plateMesh = new THREE.Mesh(plateGeom, this.secondaryMetalMat);
    plateMesh.position.set(0, -0.04, 0.08);
    this.headGroup.add(plateMesh);

    // Faceted Optical Gem Compound Eyes (Left & Right)
    const eyeGeom = new THREE.IcosahedronGeometry(0.09, 1);

    // Left eye
    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(-0.16, 0.04, 0.14);
    const leftEyeMesh = new THREE.Mesh(eyeGeom, this.opticalEyeMat);
    leftEyeGroup.add(leftEyeMesh);

    const bezelGeom = new THREE.TorusGeometry(0.095, 0.015, 8, 18);
    const leftBezel = new THREE.Mesh(bezelGeom, this.primaryMetalMat);
    leftBezel.rotation.y = Math.PI * 0.3;
    leftEyeGroup.add(leftBezel);
    this.headGroup.add(leftEyeGroup);

    // Right eye
    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(0.16, 0.04, 0.14);
    const rightEyeMesh = new THREE.Mesh(eyeGeom, this.opticalEyeMat);
    rightEyeGroup.add(rightEyeMesh);

    const rightBezel = new THREE.Mesh(bezelGeom, this.primaryMetalMat);
    rightBezel.rotation.y = -Math.PI * 0.3;
    rightEyeGroup.add(rightBezel);
    this.headGroup.add(rightEyeGroup);

    // Antennae (Segmented articulated spring stems with glowing tips)
    this.antennaeLeft = this.buildAntenna(-1);
    this.headGroup.add(this.antennaeLeft);

    this.antennaeRight = this.buildAntenna(1);
    this.headGroup.add(this.antennaeRight);

    // Coiled spring proboscis
    const proboscisCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.15, 0.12),
      new THREE.Vector3(0, -0.28, 0.22),
      new THREE.Vector3(0, -0.38, 0.18),
      new THREE.Vector3(0, -0.32, 0.06),
      new THREE.Vector3(0, -0.22, 0.09),
    ]);
    const probGeom = new THREE.TubeGeometry(proboscisCurve, 32, 0.014, 8, false);
    const probMesh = new THREE.Mesh(probGeom, this.gearMat);
    this.headGroup.add(probMesh);

    // Proboscis tip injector
    const tipMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 8),
      this.emissiveGlowMat
    );
    tipMesh.position.set(0, -0.22, 0.09);
    this.headGroup.add(tipMesh);
  }

  private buildAntenna(side: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(side * 0.08, 0.16, 0.12);

    // Multi-segment curved stalk
    const curvePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.06, 0.22, 0.08),
      new THREE.Vector3(side * 0.16, 0.48, 0.14),
      new THREE.Vector3(side * 0.32, 0.72, 0.18),
      new THREE.Vector3(side * 0.42, 0.95, 0.12),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const stalkGeom = new THREE.TubeGeometry(curve, 24, 0.012, 6, false);
    const stalkMesh = new THREE.Mesh(stalkGeom, this.primaryMetalMat);
    group.add(stalkMesh);

    // Coiled induction rings along the antenna
    for (let c = 1; c <= 5; c++) {
      const t = c / 6;
      const pt = curve.getPoint(t);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.024 - c * 0.002, 0.006, 6, 12),
        this.gearMat
      );
      ring.position.copy(pt);
      ring.rotation.x = 0.3;
      group.add(ring);
    }

    // Glowing tip node
    const tipNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 12, 12),
      this.emissiveGlowMat
    );
    tipNode.position.copy(curvePoints[curvePoints.length - 1]);
    group.add(tipNode);

    // Tiny halo ring at tip
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.005, 4, 16),
      this.primaryMetalMat
    );
    halo.position.copy(tipNode.position);
    halo.rotation.x = Math.PI * 0.5;
    group.add(halo);

    return group;
  }

  private buildAbdomen() {
    this.abdomenGroup.position.set(0, -0.05, -0.42);

    const segmentCount = 6;
    for (let i = 0; i < segmentCount; i++) {
      const segGroup = new THREE.Group();
      const progress = i / segmentCount;
      const radius = 0.22 * (1.0 - progress * 0.65);
      const segLength = 0.24 - progress * 0.06;
      const segZ = -i * 0.22;

      // Brass casing segment
      const casingGeom = new THREE.CylinderGeometry(radius * 0.88, radius, segLength, 12);
      casingGeom.rotateX(Math.PI * 0.5);
      const casingMesh = new THREE.Mesh(casingGeom, this.primaryMetalMat);
      casingMesh.castShadow = true;
      segGroup.add(casingMesh);

      // Glowing inter-segment energy gasket
      const gasketGeom = new THREE.TorusGeometry(radius * 0.94, 0.015, 6, 18);
      const gasketMesh = new THREE.Mesh(gasketGeom, this.emissiveGlowMat);
      gasketMesh.position.z = segLength * 0.5;
      segGroup.add(gasketMesh);

      // Dorsal ridge fin plate
      const ridgeGeom = new THREE.BoxGeometry(0.02, 0.08 - progress * 0.03, segLength * 0.7);
      const ridgeMesh = new THREE.Mesh(ridgeGeom, this.secondaryMetalMat);
      ridgeMesh.position.y = radius + 0.02;
      segGroup.add(ridgeMesh);

      segGroup.position.set(0, 0, segZ);
      this.abdomenGroup.add(segGroup);
      this.abdomenSegments.push(segGroup);
    }

    // Terminal Tail Gyro-Stabilizer / Stinger tip
    const tailTipGeom = new THREE.ConeGeometry(0.06, 0.28, 8);
    tailTipGeom.rotateX(-Math.PI * 0.5);
    const tailTip = new THREE.Mesh(tailTipGeom, this.gearMat);
    tailTip.position.set(0, 0, -segmentCount * 0.22 - 0.1);
    this.abdomenGroup.add(tailTip);

    // Glowing ruby needle
    const needleGeom = new THREE.CylinderGeometry(0.008, 0.02, 0.14, 8);
    needleGeom.rotateX(Math.PI * 0.5);
    const needleMesh = new THREE.Mesh(needleGeom, this.rubyJewelMat);
    needleMesh.position.set(0, 0, -segmentCount * 0.22 - 0.24);
    this.abdomenGroup.add(needleMesh);
  }

  private buildLegs() {
    this.legsGroup.position.set(0, -0.1, 0.1);

    const legConfigs = [
      { side: -1, pos: [-0.18, -0.05, 0.28], angleY: 0.4, scale: 0.9 },   // Front left
      { side: 1, pos: [0.18, -0.05, 0.28], angleY: -0.4, scale: 0.9 },    // Front right
      { side: -1, pos: [-0.22, -0.08, 0.05], angleY: 0.0, scale: 1.05 },  // Mid left
      { side: 1, pos: [0.22, -0.08, 0.05], angleY: 0.0, scale: 1.05 },   // Mid right
      { side: -1, pos: [-0.18, -0.06, -0.22], angleY: -0.5, scale: 1.15 },// Rear left
      { side: 1, pos: [0.18, -0.06, -0.22], angleY: 0.5, scale: 1.15 },  // Rear right
    ];

    legConfigs.forEach((cfg) => {
      const legRoot = new THREE.Group();
      legRoot.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      legRoot.rotation.y = cfg.angleY;

      // Coxa (base hinge ball)
      const coxaMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 * cfg.scale, 8, 8),
        this.primaryMetalMat
      );
      legRoot.add(coxaMesh);

      // Femur (upper leg strut)
      const femurLen = 0.35 * cfg.scale;
      const femurGeom = new THREE.CylinderGeometry(0.02 * cfg.scale, 0.026 * cfg.scale, femurLen, 8);
      const femurMesh = new THREE.Mesh(femurGeom, this.secondaryMetalMat);
      femurMesh.position.set(cfg.side * femurLen * 0.45, -femurLen * 0.4, 0);
      femurMesh.rotation.z = -cfg.side * 0.8;
      legRoot.add(femurMesh);

      // Knee hinge joint
      const kneePos = new THREE.Vector3(
        cfg.side * femurLen * 0.85,
        -femurLen * 0.75,
        0
      );
      const kneeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.038 * cfg.scale, 8, 8),
        this.gearMat
      );
      kneeMesh.position.copy(kneePos);
      legRoot.add(kneeMesh);

      // Tibia (lower leg needle strut)
      const tibiaLen = 0.42 * cfg.scale;
      const tibiaGeom = new THREE.ConeGeometry(0.02 * cfg.scale, tibiaLen, 8);
      tibiaGeom.rotateZ(Math.PI);
      const tibiaMesh = new THREE.Mesh(tibiaGeom, this.primaryMetalMat);
      tibiaMesh.position.set(
        kneePos.x + cfg.side * tibiaLen * 0.15,
        kneePos.y - tibiaLen * 0.48,
        0.05
      );
      tibiaMesh.rotation.z = cfg.side * 0.3;
      legRoot.add(tibiaMesh);

      this.legsGroup.add(legRoot);
    });
  }

  /**
   * Builds the Forewings with custom aerodynamic shape, brass skeletal ribs, and translucent etched membrane.
   */
  private buildForewings() {
    // Hinge root positions
    this.leftForewingHinge.position.set(-0.25, 0.28, 0.1);
    this.rightForewingHinge.position.set(0.25, 0.28, 0.1);

    // Hinge bracket brackets with gear
    const leftBracketGear = this.createGearMesh(0.12, 12, 0.02, 0);
    leftBracketGear.rotation.y = Math.PI * 0.5;
    this.leftForewingHinge.add(leftBracketGear);

    const rightBracketGear = this.createGearMesh(0.12, 12, 0.02, 0);
    rightBracketGear.rotation.y = -Math.PI * 0.5;
    this.rightForewingHinge.add(rightBracketGear);

    // Piston anchors for dynamic kinematics
    this.leftForewingPistonAnchor.set(-0.35, 0.22, 0.2);
    this.rightForewingPistonAnchor.set(0.35, 0.22, 0.2);

    // Wing 2D planar profile
    const foreShape = new THREE.Shape();
    foreShape.moveTo(0, 0);
    foreShape.bezierCurveTo(0.4, 0.8, 1.2, 1.8, 2.5, 2.2);    // Leading edge sweep to apex
    foreShape.bezierCurveTo(2.7, 2.0, 2.8, 1.5, 2.5, 1.0);    // Apex outer edge
    foreShape.bezierCurveTo(2.2, 0.6, 1.8, 0.2, 1.3, -0.1);   // Outer margin
    foreShape.bezierCurveTo(0.8, -0.3, 0.3, -0.2, 0, 0);      // Inner margin back to hinge

    const geom = new THREE.ShapeGeometry(foreShape, 32);

    // Generate accurate planar UVs (0 to 1) for the wing membrane
    const posAttr = geom.attributes.position;
    const uvs: number[] = [];
    const minX = 0, maxX = 2.8, minY = -0.4, maxY = 2.4;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const u = (x - minX) / (maxX - minX);
      const v = (y - minY) / (maxY - minY);
      uvs.push(u, v);
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    // Left forewing membrane mesh
    const leftMembrane = new THREE.Mesh(geom, this.glassForewingMat);
    this.leftForewingMeshGroup.add(leftMembrane);

    // Right forewing membrane mesh (mirrored)
    const rightGeom = geom.clone();
    const rightMembrane = new THREE.Mesh(rightGeom, this.glassForewingMat);
    this.rightForewingMeshGroup.add(rightMembrane);

    // Add 3D brass skeletal rib truss to Left Forewing
    this.buildForewingRibTruss(this.leftForewingMeshGroup, 1);
    // Add 3D brass skeletal rib truss to Right Forewing
    this.buildForewingRibTruss(this.rightForewingMeshGroup, -1);

    // Orient left & right wing mesh groups
    this.leftForewingMeshGroup.rotation.x = Math.PI * 0.45;
    this.leftForewingMeshGroup.rotation.y = -Math.PI * 0.85;
    this.leftForewingHinge.add(this.leftForewingMeshGroup);

    this.rightForewingMeshGroup.rotation.x = Math.PI * 0.45;
    this.rightForewingMeshGroup.rotation.y = Math.PI * 0.85;
    this.rightForewingMeshGroup.scale.set(-1, 1, 1); // Mirrored across X
    this.rightForewingHinge.add(this.rightForewingMeshGroup);

    this.bodyGroup.add(this.leftForewingHinge);
    this.bodyGroup.add(this.rightForewingHinge);
  }

  /**
   * Builds the 3D brass leading edge spar and rib struts.
   */
  private buildForewingRibTruss(parentGroup: THREE.Group, _dir: number) {
    // 1. Heavy Leading Edge Spar (curved tubular spar)
    const sparCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.02),
      new THREE.Vector3(0.5, 0.9, 0.02),
      new THREE.Vector3(1.3, 1.7, 0.02),
      new THREE.Vector3(2.0, 2.05, 0.015),
      new THREE.Vector3(2.5, 2.18, 0.01),
    ]);
    const sparGeom = new THREE.TubeGeometry(sparCurve, 32, 0.028, 8, false);
    const sparMesh = new THREE.Mesh(sparGeom, this.primaryMetalMat);
    sparMesh.castShadow = true;
    parentGroup.add(sparMesh);

    // Weight reduction perforated holes along the spar
    for (let h = 1; h <= 6; h++) {
      const t = h / 7;
      const pt = sparCurve.getPoint(t);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.038, 0.007, 6, 12),
        this.gearMat
      );
      ring.position.copy(pt);
      ring.position.z += 0.01;
      parentGroup.add(ring);
    }

    // 2. Radial secondary rib struts spreading out across the wing
    const ribEndpoints = [
      new THREE.Vector3(2.5, 1.0, 0.01),
      new THREE.Vector3(2.2, 0.6, 0.01),
      new THREE.Vector3(1.8, 0.2, 0.01),
      new THREE.Vector3(1.3, -0.1, 0.01),
      new THREE.Vector3(0.8, -0.25, 0.01),
    ];

    ribEndpoints.forEach((end, idx) => {
      const rootT = 0.2 + idx * 0.14;
      const rootPt = sparCurve.getPoint(rootT);
      const midPt = new THREE.Vector3().addVectors(rootPt, end).multiplyScalar(0.5);
      midPt.z += 0.015;

      const ribCurve = new THREE.CatmullRomCurve3([rootPt, midPt, end]);
      const ribGeom = new THREE.TubeGeometry(ribCurve, 16, 0.014, 6, false);
      const ribMesh = new THREE.Mesh(ribGeom, this.primaryMetalMat);
      parentGroup.add(ribMesh);

      // Micro rivet joint at end
      const rivet = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 6, 6),
        this.gearMat
      );
      rivet.position.copy(end);
      parentGroup.add(rivet);
    });

    // 3. Apex Wingtip Gyro Blade
    const apexBladeGeom = new THREE.BoxGeometry(0.4, 0.06, 0.012);
    const apexBlade = new THREE.Mesh(apexBladeGeom, this.gearMat);
    apexBlade.position.set(2.45, 2.15, 0.02);
    apexBlade.rotation.z = 0.7;
    parentGroup.add(apexBlade);
  }

  /**
   * Builds the Hindwings with iconic swallowtail fin extensions and clockwork rosette motif.
   */
  private buildHindwings() {
    this.leftHindwingHinge.position.set(-0.2, 0.08, -0.15);
    this.rightHindwingHinge.position.set(0.2, 0.08, -0.15);

    // Hindwing 2D profile with swallowtail tail fin
    const hindShape = new THREE.Shape();
    hindShape.moveTo(0, 0);
    hindShape.bezierCurveTo(0.3, 0.3, 0.8, 0.6, 1.4, 0.5);      // Upper margin
    hindShape.bezierCurveTo(1.7, 0.3, 1.8, -0.3, 1.6, -0.8);    // Outer edge
    hindShape.bezierCurveTo(1.8, -1.3, 2.1, -1.9, 2.2, -2.4);   // Swallowtail extension tail tip!
    hindShape.bezierCurveTo(1.9, -2.3, 1.6, -1.8, 1.4, -1.4);   // Tail inner return
    hindShape.bezierCurveTo(1.1, -1.6, 0.6, -1.5, 0.3, -1.1);   // Inner lobe
    hindShape.bezierCurveTo(0.1, -0.7, 0.05, -0.3, 0, 0);       // Back to hinge

    const geom = new THREE.ShapeGeometry(hindShape, 32);

    // Planar UVs for hindwing
    const posAttr = geom.attributes.position;
    const uvs: number[] = [];
    const minX = 0, maxX = 2.4, minY = -2.6, maxY = 0.7;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const u = (x - minX) / (maxX - minX);
      const v = (y - minY) / (maxY - minY);
      uvs.push(u, v);
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    // Left hindwing membrane
    const leftHindMembrane = new THREE.Mesh(geom, this.glassHindwingMat);
    this.leftHindwingMeshGroup.add(leftHindMembrane);

    // Right hindwing membrane
    const rightGeom = geom.clone();
    const rightHindMembrane = new THREE.Mesh(rightGeom, this.glassHindwingMat);
    this.rightHindwingMeshGroup.add(rightHindMembrane);

    // Add 3D brass skeletal rib truss to Left & Right Hindwings
    this.buildHindwingRibTruss(this.leftHindwingMeshGroup);
    this.buildHindwingRibTruss(this.rightHindwingMeshGroup);

    // Orient left & right hindwings
    this.leftHindwingMeshGroup.rotation.x = Math.PI * 0.48;
    this.leftHindwingMeshGroup.rotation.y = -Math.PI * 0.82;
    this.leftHindwingHinge.add(this.leftHindwingMeshGroup);

    this.rightHindwingMeshGroup.rotation.x = Math.PI * 0.48;
    this.rightHindwingMeshGroup.rotation.y = Math.PI * 0.82;
    this.rightHindwingMeshGroup.scale.set(-1, 1, 1);
    this.rightHindwingHinge.add(this.rightHindwingMeshGroup);

    this.bodyGroup.add(this.leftHindwingHinge);
    this.bodyGroup.add(this.rightHindwingHinge);
  }

  private buildHindwingRibTruss(parentGroup: THREE.Group) {
    // Structural spine to the swallowtail tip
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.02),
      new THREE.Vector3(0.6, -0.4, 0.02),
      new THREE.Vector3(1.2, -0.9, 0.02),
      new THREE.Vector3(1.7, -1.6, 0.015),
      new THREE.Vector3(2.2, -2.4, 0.01),
    ]);
    const tailSpar = new THREE.Mesh(
      new THREE.TubeGeometry(tailCurve, 28, 0.024, 8, false),
      this.primaryMetalMat
    );
    tailSpar.castShadow = true;
    parentGroup.add(tailSpar);

    // Counterweight jewel pendulum bead at the swallowtail tip!
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      this.rubyJewelMat
    );
    bead.position.set(2.2, -2.4, 0.02);
    parentGroup.add(bead);

    // Brass bead collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.008, 6, 12),
      this.gearMat
    );
    collar.position.copy(bead.position);
    parentGroup.add(collar);

    // Radial struts
    const struts = [
      new THREE.Vector3(1.4, 0.5, 0.01),
      new THREE.Vector3(1.6, -0.4, 0.01),
      new THREE.Vector3(1.2, -1.4, 0.01),
      new THREE.Vector3(0.5, -1.2, 0.01),
    ];
    struts.forEach((target) => {
      const strutCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0.015), target);
      const strutMesh = new THREE.Mesh(
        new THREE.TubeGeometry(strutCurve, 12, 0.012, 6, false),
        this.primaryMetalMat
      );
      parentGroup.add(strutMesh);
    });
  }

  private assembleButterfly() {
    this.thoraxGroup.position.set(0, 0, 0);

    this.bodyGroup.add(this.thoraxGroup);
    this.bodyGroup.add(this.headGroup);
    this.bodyGroup.add(this.abdomenGroup);
    this.bodyGroup.add(this.legsGroup);

    this.group.add(this.bodyGroup);
  }

  /**
   * Registers parts for smooth exploded view deconstruction.
   */
  private registerExplodedOffsets() {
    // Head slides forward and upward
    this.explodedParts.push({
      obj: this.headGroup,
      initialPos: this.headGroup.position.clone(),
      explodedPos: new THREE.Vector3(0, 0.8, 1.4),
    });

    // Abdomen slides backward and downward
    this.explodedParts.push({
      obj: this.abdomenGroup,
      initialPos: this.abdomenGroup.position.clone(),
      explodedPos: new THREE.Vector3(0, -0.6, -1.6),
    });

    // Legs drop downward
    this.explodedParts.push({
      obj: this.legsGroup,
      initialPos: this.legsGroup.position.clone(),
      explodedPos: new THREE.Vector3(0, -1.0, 0.1),
    });

    // Left forewing slides outward & forward
    this.explodedParts.push({
      obj: this.leftForewingHinge,
      initialPos: this.leftForewingHinge.position.clone(),
      explodedPos: new THREE.Vector3(-1.8, 0.8, 0.5),
    });

    // Right forewing slides outward & forward
    this.explodedParts.push({
      obj: this.rightForewingHinge,
      initialPos: this.rightForewingHinge.position.clone(),
      explodedPos: new THREE.Vector3(1.8, 0.8, 0.5),
    });

    // Left hindwing slides outward & backward
    this.explodedParts.push({
      obj: this.leftHindwingHinge,
      initialPos: this.leftHindwingHinge.position.clone(),
      explodedPos: new THREE.Vector3(-1.5, -0.5, -1.0),
    });

    // Right hindwing slides outward & backward
    this.explodedParts.push({
      obj: this.rightHindwingHinge,
      initialPos: this.rightHindwingHinge.position.clone(),
      explodedPos: new THREE.Vector3(1.5, -0.5, -1.0),
    });
  }

  /**
   * Switches the visual theme of the butterfly in real-time.
   */
  public setTheme(theme: ButterflyTheme) {
    this.theme = theme;

    this.primaryMetalMat.color.setHex(theme.primaryMetal);
    this.primaryMetalMat.roughness = theme.roughness;
    this.primaryMetalMat.metalness = theme.metalness;

    this.secondaryMetalMat.color.setHex(theme.secondaryMetal);
    this.gearMat.color.setHex(theme.gearMetal);

    this.emissiveGlowMat.color.setHex(theme.accentGlow);
    this.emissiveGlowMat.emissive.setHex(theme.accentGlow);

    this.opticalEyeMat.color.setHex(theme.primaryMetal);
    this.opticalEyeMat.emissive.setHex(theme.accentGlow);

    this.coreLight.color.setHex(theme.accentGlow);

    // Update wing textures and emissive glow
    const glowHex = '#' + theme.accentGlow.toString(16).padStart(6, '0');
    this.forewingTextures = WingTextureGenerator.createForewingTextures(glowHex);
    this.hindwingTextures = WingTextureGenerator.createHindwingTextures(glowHex);

    this.glassForewingMat.map = this.forewingTextures.diffuseMap;
    this.glassForewingMat.emissiveMap = this.forewingTextures.emissiveMap;
    this.glassForewingMat.emissive.setHex(theme.accentGlow);
    this.glassForewingMat.opacity = theme.glassOpacity;
    this.glassForewingMat.needsUpdate = true;

    this.glassHindwingMat.map = this.hindwingTextures.diffuseMap;
    this.glassHindwingMat.emissiveMap = this.hindwingTextures.emissiveMap;
    this.glassHindwingMat.emissive.setHex(theme.accentGlow);
    this.glassHindwingMat.opacity = theme.glassOpacity;
    this.glassHindwingMat.needsUpdate = true;
  }

  public setWireframe(val: boolean) {
    this.primaryMetalMat.wireframe = val;
    this.secondaryMetalMat.wireframe = val;
    this.gearMat.wireframe = val;
    this.glassForewingMat.wireframe = val;
    this.glassHindwingMat.wireframe = val;
  }

  /**
   * Main per-frame animation update for kinematics, flapping, gear drives, and exploded views.
   */
  public update(delta: number, controls: AnimationControls, gustIntensity: number = 0) {
    // 1. Advance Flap Phase
    const effectiveSpeed = controls.flapSpeed * (1 + gustIntensity * 1.5);
    this.flapTime += delta * effectiveSpeed * 9.0;

    // Wing Flap Angle
    const flapAmp = controls.flapAmplitude * (1.0 - controls.glideRatio * 0.85);
    const flapCycle = Math.sin(this.flapTime);
    const flapAngle = flapCycle * flapAmp + controls.wingSpread;

    // Wing Pitch & Dynamic Aerodynamic Twist
    const pitchAngle = -Math.cos(this.flapTime) * (flapAmp * 0.35) + gustIntensity * 0.2;

    // Apply rotation to Left & Right Forewings
    this.leftForewingHinge.rotation.z = -flapAngle;
    this.leftForewingHinge.rotation.x = pitchAngle;

    this.rightForewingHinge.rotation.z = flapAngle;
    this.rightForewingHinge.rotation.x = pitchAngle;

    // Hindwings flap with realistic phase lag (~0.35 rad)
    const hindFlapCycle = Math.sin(this.flapTime - 0.4);
    const hindFlapAngle = hindFlapCycle * (flapAmp * 0.82) + controls.wingSpread * 0.9;
    const hindPitchAngle = -Math.cos(this.flapTime - 0.4) * (flapAmp * 0.25);

    this.leftHindwingHinge.rotation.z = -hindFlapAngle;
    this.leftHindwingHinge.rotation.x = hindPitchAngle;

    this.rightHindwingHinge.rotation.z = hindFlapAngle;
    this.rightHindwingHinge.rotation.x = hindPitchAngle;

    // Wing Tip Flexing: slight trailing deflection on downstroke
    const flexDeflect = flapCycle * 0.08;
    this.leftForewingMeshGroup.rotation.z = flexDeflect;
    this.rightForewingMeshGroup.rotation.z = -flexDeflect;

    // 2. Thorax & Abdomen Kinematic Counter-Oscillations
    const bodyBob = Math.cos(this.flapTime * 2) * 0.035 * controls.flapAmplitude;
    this.bodyGroup.position.y = bodyBob;

    // Abdomen gentle sinusoidal wave
    this.abdomenSegments.forEach((seg, i) => {
      const segLag = (i / this.abdomenSegments.length) * 0.6;
      seg.rotation.x = Math.sin(this.flapTime - segLag) * 0.08 * (i + 1) * 0.25;
    });

    // Antennae subtle sway with inertial lag
    if (this.antennaeLeft && this.antennaeRight) {
      const sway = Math.sin(this.flapTime * 0.8) * 0.06 + gustIntensity * 0.15;
      this.antennaeLeft.rotation.z = sway;
      this.antennaeRight.rotation.z = -sway;
    }

    // 3. Rotating Clockwork Gears & Balance Wheel
    const gearMult = delta * controls.gearRotationSpeed * (effectiveSpeed > 0 ? effectiveSpeed : 1);
    this.rotatingGears.forEach((gear) => {
      gear.mesh.rotation[gear.axis] += gear.speed * gearMult;
    });

    // Balance wheel rapid harmonic oscillation
    if (this.balanceWheel) {
      this.balanceWheel.rotation.z = Math.sin(performance.now() * 0.015) * 1.1;
    }
    // Escapement pallet fork ticking
    if (this.escapementFork) {
      this.escapementFork.rotation.y = Math.sin(performance.now() * 0.03) > 0 ? 0.2 : -0.2;
    }

    // 4. Dynamic Hydraulic Piston Rod Kinematics
    if (this.leftPistonRod && this.rightPistonRod) {
      // Piston rod moves in and out of cylinder based on flap angle
      const stroke = (flapCycle + 1.0) * 0.06;
      this.leftPistonRod.position.y = 0.12 + stroke;
      this.rightPistonRod.position.y = 0.12 + stroke;
    }

    // 5. Exploded View Interpolation
    const er = controls.explodedRatio;
    this.explodedParts.forEach((part) => {
      part.obj.position.lerpVectors(part.initialPos, part.explodedPos, er);
    });

    // 6. Glowing Aether Core Pulse
    const pulse = 1.0 + Math.sin(this.flapTime * 2) * 0.25 + gustIntensity * 0.5;
    this.coreLight.intensity = 3.5 * pulse * controls.glowIntensity;
    this.emissiveGlowMat.emissiveIntensity = 2.8 * pulse * controls.glowIntensity;
    this.glassForewingMat.emissiveIntensity = 1.4 * pulse * controls.glowIntensity;
    this.glassHindwingMat.emissiveIntensity = 1.4 * pulse * controls.glowIntensity;
  }

  public getWingTipPositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
    this.leftForewingMeshGroup.updateWorldMatrix(true, false);
    this.rightForewingMeshGroup.updateWorldMatrix(true, false);

    const lTip = new THREE.Vector3(2.5, 2.18, 0.01);
    this.leftForewingMeshGroup.localToWorld(lTip);

    const rTip = new THREE.Vector3(2.5, 2.18, 0.01);
    this.rightForewingMeshGroup.localToWorld(rTip);

    this.wingTipTrails.left.copy(lTip);
    this.wingTipTrails.right.copy(rTip);
    return this.wingTipTrails;
  }
}
