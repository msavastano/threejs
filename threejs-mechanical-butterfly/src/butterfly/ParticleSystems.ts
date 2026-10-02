import * as THREE from 'three';

export class ParticleSystems {
  public aetherGroup: THREE.Group;
  public trailGroup: THREE.Group;

  // Aether particles
  private aetherGeometry: THREE.BufferGeometry;
  private aetherMaterial: THREE.PointsMaterial;
  private aetherPositions: Float32Array;
  private aetherVelocities: Float32Array;
  private aetherCount = 450;

  // Wingtip sparkling trails
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.PointsMaterial;
  private trailPositions: Float32Array;
  private trailAlphas: Float32Array;
  private trailCount = 200;
  private trailIndex = 0;

  constructor(particleColor: number = 0xffcc66) {
    this.aetherGroup = new THREE.Group();
    this.trailGroup = new THREE.Group();

    // 1. Aether Motes
    this.aetherPositions = new Float32Array(this.aetherCount * 3);
    this.aetherVelocities = new Float32Array(this.aetherCount * 3);

    for (let i = 0; i < this.aetherCount; i++) {
      const idx = i * 3;
      this.aetherPositions[idx] = (Math.random() - 0.5) * 16;
      this.aetherPositions[idx + 1] = (Math.random() - 0.5) * 12 + 1;
      this.aetherPositions[idx + 2] = (Math.random() - 0.5) * 16;

      this.aetherVelocities[idx] = (Math.random() - 0.5) * 0.08;
      this.aetherVelocities[idx + 1] = (Math.random() * 0.08 + 0.02);
      this.aetherVelocities[idx + 2] = (Math.random() - 0.5) * 0.08;
    }

    this.aetherGeometry = new THREE.BufferGeometry();
    this.aetherGeometry.setAttribute('position', new THREE.BufferAttribute(this.aetherPositions, 3));

    // Create a circular particle sprite texture
    const particleTexture = this.createParticleTexture();

    this.aetherMaterial = new THREE.PointsMaterial({
      size: 0.14,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      color: particleColor,
      depthWrite: false,
    });

    const aetherPoints = new THREE.Points(this.aetherGeometry, this.aetherMaterial);
    this.aetherGroup.add(aetherPoints);

    // 2. Wingtip trails
    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailAlphas = new Float32Array(this.trailCount);

    for (let i = 0; i < this.trailCount; i++) {
      this.trailPositions[i * 3] = 0;
      this.trailPositions[i * 3 + 1] = -100; // start offscreen
      this.trailPositions[i * 3 + 2] = 0;
      this.trailAlphas[i] = 0;
    }

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.22,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      color: particleColor,
      depthWrite: false,
    });

    const trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trailGroup.add(trailPoints);
  }

  private createParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 220, 160, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 180, 80, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  public setParticleColor(color: number) {
    this.aetherMaterial.color.setHex(color);
    this.trailMaterial.color.setHex(color);
  }

  public emitTrail(leftTip: THREE.Vector3, rightTip: THREE.Vector3) {
    // Add 2 particles at each wingtip
    const idxL = this.trailIndex * 3;
    this.trailPositions[idxL] = leftTip.x + (Math.random() - 0.5) * 0.05;
    this.trailPositions[idxL + 1] = leftTip.y + (Math.random() - 0.5) * 0.05;
    this.trailPositions[idxL + 2] = leftTip.z + (Math.random() - 0.5) * 0.05;
    this.trailAlphas[this.trailIndex] = 1.0;
    this.trailIndex = (this.trailIndex + 1) % this.trailCount;

    const idxR = this.trailIndex * 3;
    this.trailPositions[idxR] = rightTip.x + (Math.random() - 0.5) * 0.05;
    this.trailPositions[idxR + 1] = rightTip.y + (Math.random() - 0.5) * 0.05;
    this.trailPositions[idxR + 2] = rightTip.z + (Math.random() - 0.5) * 0.05;
    this.trailAlphas[this.trailIndex] = 1.0;
    this.trailIndex = (this.trailIndex + 1) % this.trailCount;

    this.trailGeometry.attributes.position.needsUpdate = true;
  }

  public update(delta: number) {
    // Update aether motes
    const pos = this.aetherPositions;
    const vel = this.aetherVelocities;
    const time = performance.now() * 0.001;

    for (let i = 0; i < this.aetherCount; i++) {
      const idx = i * 3;
      pos[idx] += vel[idx] * delta + Math.sin(time + pos[idx + 1]) * 0.005;
      pos[idx + 1] += vel[idx + 1] * delta;
      pos[idx + 2] += vel[idx + 2] * delta + Math.cos(time + pos[idx]) * 0.005;

      // Wrap around bounds
      if (pos[idx + 1] > 7) {
        pos[idx + 1] = -5;
        pos[idx] = (Math.random() - 0.5) * 16;
        pos[idx + 2] = (Math.random() - 0.5) * 16;
      }
    }
    this.aetherGeometry.attributes.position.needsUpdate = true;

    // Fade trail particles gently drifting downward
    const tPos = this.trailPositions;
    for (let i = 0; i < this.trailCount; i++) {
      const idx = i * 3;
      tPos[idx + 1] -= delta * 0.2; // sink
    }
    this.trailGeometry.attributes.position.needsUpdate = true;
  }
}
