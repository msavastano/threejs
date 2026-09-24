import * as THREE from 'three';

export class StarfieldBackground {
  public group: THREE.Group;
  private starPoints: THREE.Points;
  private nebulaGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.nebulaGroup = new THREE.Group();

    // 1. Deep Space Starfield
    const starCount = 6000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#aabbff'),
      new THREE.Color('#ffddaa'),
      new THREE.Color('#ffaaaa'),
      new THREE.Color('#88e0ff')
    ];

    for (let i = 0; i < starCount; i++) {
      // Sphere distribution with large radius
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 800 + Math.random() * 400;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1.0 + Math.random() * 2.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: false
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.group.add(this.starPoints);

    // 2. Cosmic Nebulae clouds using soft layered glow sprites
    this.createNebulae();
    this.group.add(this.nebulaGroup);
  }

  private createNebulae() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.4, 'rgba(120, 80, 220, 0.4)');
      grad.addColorStop(0.8, 'rgba(30, 20, 80, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const nebulaColors = ['#4f18ac', '#0077ff', '#ff0077', '#00ffcc'];

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        color: new THREE.Color(nebulaColors[i % nebulaColors.length]),
        transparent: true,
        opacity: 0.15 + Math.random() * 0.1,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(mat);
      const scale = 400 + Math.random() * 300;
      sprite.scale.set(scale, scale, 1);

      const radius = 600;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      sprite.position.set(
        radius * Math.cos(elevation) * Math.cos(angle),
        radius * Math.sin(elevation),
        radius * Math.cos(elevation) * Math.sin(angle)
      );

      this.nebulaGroup.add(sprite);
    }
  }

  public update(delta: number) {
    this.starPoints.rotation.y += delta * 0.005;
    this.nebulaGroup.rotation.y += delta * 0.002;
  }
}
