import * as THREE from 'three';
import { ButterflyTheme } from './types';

export class SpecimenStand {
  public group: THREE.Group;
  private ring1: THREE.Mesh;
  private ring2: THREE.Mesh;
  private ring3: THREE.Mesh;
  private standMat: THREE.MeshStandardMaterial;
  private brassMat: THREE.MeshStandardMaterial;
  private glowMat: THREE.MeshStandardMaterial;
  private textCanvasTex: THREE.CanvasTexture;

  constructor(initialTheme: ButterflyTheme) {
    this.group = new THREE.Group();

    this.standMat = new THREE.MeshStandardMaterial({
      color: initialTheme.secondaryMetal,
      roughness: 0.35,
      metalness: 0.8,
    });

    this.brassMat = new THREE.MeshStandardMaterial({
      color: initialTheme.primaryMetal,
      roughness: 0.25,
      metalness: 0.9,
    });

    this.glowMat = new THREE.MeshStandardMaterial({
      color: initialTheme.accentGlow,
      emissive: initialTheme.accentGlow,
      emissiveIntensity: 2.0,
      roughness: 0.2,
      metalness: 0.5,
    });

    // 1. Lower Cylindrical Pedestal
    const baseGeom = new THREE.CylinderGeometry(1.6, 2.0, 0.4, 32);
    const baseMesh = new THREE.Mesh(baseGeom, this.standMat);
    baseMesh.position.y = -2.2;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);

    // Brass base step
    const stepGeom = new THREE.CylinderGeometry(1.3, 1.5, 0.2, 32);
    const stepMesh = new THREE.Mesh(stepGeom, this.brassMat);
    stepMesh.position.y = -1.9;
    this.group.add(stepMesh);

    // 2. Inscription Plaque Cylinder around the base
    const plaqueGeom = new THREE.CylinderGeometry(1.31, 1.31, 0.16, 48, 1, true);
    this.textCanvasTex = this.createTextTexture('• AURUM PAPILIO • CHRONO-MECHA No. VII • FLIGHT AUTOMATON • 1889 •');
    const plaqueMat = new THREE.MeshBasicMaterial({
      map: this.textCanvasTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    const plaqueMesh = new THREE.Mesh(plaqueGeom, plaqueMat);
    plaqueMesh.position.y = -1.9;
    this.group.add(plaqueMesh);

    // Glowing base ring
    const glowRingGeom = new THREE.TorusGeometry(1.32, 0.02, 8, 48);
    const glowRing = new THREE.Mesh(glowRingGeom, this.glowMat);
    glowRing.position.y = -1.8;
    glowRing.rotation.x = Math.PI * 0.5;
    this.group.add(glowRing);

    // 3. Central magnetic levitation pillar
    const pillarGeom = new THREE.CylinderGeometry(0.12, 0.2, 1.2, 16);
    const pillarMesh = new THREE.Mesh(pillarGeom, this.standMat);
    pillarMesh.position.y = -1.2;
    this.group.add(pillarMesh);

    // Pillar brass collars
    for (let c = 0; c < 3; c++) {
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.16 - c * 0.015, 0.025, 6, 20),
        this.brassMat
      );
      collar.position.y = -1.5 + c * 0.35;
      collar.rotation.x = Math.PI * 0.5;
      this.group.add(collar);
    }

    // Top Levitation Emitter
    const emitterGeom = new THREE.ConeGeometry(0.28, 0.25, 12);
    const emitterMesh = new THREE.Mesh(emitterGeom, this.glowMat);
    emitterMesh.position.y = -0.55;
    this.group.add(emitterMesh);

    // 4. Astrolabe Celestial Orbiting Rings
    const ringGeom1 = new THREE.TorusGeometry(2.8, 0.025, 8, 64);
    this.ring1 = new THREE.Mesh(ringGeom1, this.brassMat);
    this.group.add(this.ring1);

    const ringGeom2 = new THREE.TorusGeometry(3.2, 0.02, 8, 64);
    this.ring2 = new THREE.Mesh(ringGeom2, this.standMat);
    this.ring2.rotation.x = 0.5;
    this.group.add(this.ring2);

    const ringGeom3 = new THREE.TorusGeometry(3.6, 0.018, 8, 64);
    this.ring3 = new THREE.Mesh(ringGeom3, this.glowMat);
    this.ring3.rotation.z = -0.4;
    this.group.add(this.ring3);
  }

  private createTextTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 36px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#f5cf47';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText(text, 1024, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  public setTheme(theme: ButterflyTheme) {
    this.brassMat.color.setHex(theme.primaryMetal);
    this.standMat.color.setHex(theme.secondaryMetal);
    this.glowMat.color.setHex(theme.accentGlow);
    this.glowMat.emissive.setHex(theme.accentGlow);
  }

  public update(delta: number) {
    // Slow planetary rotation of celestial astrolabe rings
    this.ring1.rotation.y += delta * 0.15;
    this.ring1.rotation.z += delta * 0.08;

    this.ring2.rotation.x += delta * 0.12;
    this.ring2.rotation.y -= delta * 0.18;

    this.ring3.rotation.z += delta * 0.22;
    this.ring3.rotation.x += delta * 0.09;
  }
}
