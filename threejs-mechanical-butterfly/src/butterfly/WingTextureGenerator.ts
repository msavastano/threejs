import * as THREE from 'three';

export interface WingTextures {
  diffuseMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  alphaMap: THREE.CanvasTexture;
}

export class WingTextureGenerator {
  /**
   * Generates high-res procedurally painted textures for the upper forewings.
   */
  static createForewingTextures(themeGlowHex: string = '#ffaa22'): WingTextures {
    const width = 1024;
    const height = 1024;

    // 1. Diffuse canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 2. Emissive canvas
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = width;
    emissiveCanvas.height = height;
    const eCtx = emissiveCanvas.getContext('2d')!;

    // 3. Alpha canvas
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const aCtx = alphaCanvas.getContext('2d')!;

    // --- Fill Backgrounds ---
    // Diffuse: subtle iridescent gradient
    const grad = ctx.createRadialGradient(250, 750, 50, 512, 512, 600);
    grad.addColorStop(0, '#1c1510');
    grad.addColorStop(0.3, '#2a1a14');
    grad.addColorStop(0.7, '#151c24');
    grad.addColorStop(1, '#0c0f14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Emissive: black background
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, width, height);

    // Alpha: translucent membrane base
    aCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    aCtx.fillRect(0, 0, width, height);

    // --- Draw Clockwork & Sacred Geometry Etchings ---
    const centerX = 200;
    const centerY = 800; // Wing root hinge location

    // Draw Astrolabe Concentric Rings
    const rings = [150, 260, 380, 520, 680, 840];
    rings.forEach((r, idx) => {
      // Diffuse ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, -Math.PI * 0.45, 0.05);
      ctx.lineWidth = idx % 2 === 0 ? 3 : 1.5;
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(212, 175, 55, 0.7)' : 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();

      // Tick marks on ring
      const numTicks = 36 + idx * 8;
      for (let i = 0; i <= numTicks; i++) {
        const ang = -Math.PI * 0.45 + (i / numTicks) * (0.05 - -Math.PI * 0.45);
        const tickLen = i % 5 === 0 ? 12 : 6;
        const x1 = centerX + Math.cos(ang) * (r - tickLen);
        const y1 = centerY + Math.sin(ang) * (r - tickLen);
        const x2 = centerX + Math.cos(ang) * (r + tickLen);
        const y2 = centerY + Math.sin(ang) * (r + tickLen);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = i % 5 === 0 ? 2 : 1;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.stroke();

        // Emissive ticks on outer ring
        if (idx === 3 && i % 4 === 0) {
          eCtx.beginPath();
          eCtx.moveTo(x1, y1);
          eCtx.lineTo(x2, y2);
          eCtx.lineWidth = 2.5;
          eCtx.strokeStyle = themeGlowHex;
          eCtx.stroke();
        }
      }
    });

    // Draw etched clockwork gear dials inside the wing
    const gearCenters = [
      { x: 450, y: 550, r: 120, teeth: 24 },
      { x: 680, y: 350, r: 85, teeth: 18 },
      { x: 380, y: 320, r: 95, teeth: 20 },
      { x: 780, y: 620, r: 70, teeth: 16 }
    ];

    gearCenters.forEach((gear) => {
      // Draw gear circle
      ctx.beginPath();
      ctx.arc(gear.x, gear.y, gear.r, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
      ctx.stroke();

      // Inner hub & spokes
      ctx.beginPath();
      ctx.arc(gear.x, gear.y, gear.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 25, 20, 0.6)';
      ctx.fill();
      ctx.stroke();

      for (let s = 0; s < 6; s++) {
        const sang = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(gear.x, gear.y);
        ctx.lineTo(gear.x + Math.cos(sang) * gear.r, gear.y + Math.sin(sang) * gear.r);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
        ctx.stroke();
      }

      // Gear teeth
      for (let t = 0; t < gear.teeth; t++) {
        const tang = (t / gear.teeth) * Math.PI * 2;
        const tx1 = gear.x + Math.cos(tang) * (gear.r - 4);
        const ty1 = gear.y + Math.sin(tang) * (gear.r - 4);
        const tx2 = gear.x + Math.cos(tang) * (gear.r + 10);
        const ty2 = gear.y + Math.sin(tang) * (gear.r + 10);

        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.9)';
        ctx.stroke();

        // Emissive gear teeth accent
        eCtx.beginPath();
        eCtx.moveTo(tx1, ty1);
        eCtx.lineTo(tx2, ty2);
        eCtx.lineWidth = 1.5;
        eCtx.strokeStyle = themeGlowHex;
        eCtx.stroke();
      }
    });

    // Draw main anatomical structural veins (radiating curves)
    const veinTargets = [
      { x: 300, y: 150 },
      { x: 500, y: 120 },
      { x: 720, y: 180 },
      { x: 880, y: 300 },
      { x: 940, y: 500 },
      { x: 880, y: 720 },
      { x: 680, y: 880 }
    ];

    veinTargets.forEach((target, i) => {
      const midX = (centerX + target.x) / 2 + (i % 2 === 0 ? 40 : -30);
      const midY = (centerY + target.y) / 2 - 50;

      // Primary vein
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(midX, midY, target.x, target.y);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(230, 195, 75, 0.9)';
      ctx.stroke();

      // Emissive circuit along main vein
      eCtx.beginPath();
      eCtx.moveTo(centerX, centerY);
      eCtx.quadraticCurveTo(midX, midY, target.x, target.y);
      eCtx.lineWidth = 3;
      eCtx.strokeStyle = themeGlowHex;
      eCtx.stroke();

      // Vein nodes (rivets/circuits)
      for (let p = 1; p <= 3; p++) {
        const t = p / 4;
        const px = (1 - t) * (1 - t) * centerX + 2 * (1 - t) * t * midX + t * t * target.x;
        const py = (1 - t) * (1 - t) * centerY + 2 * (1 - t) * t * midY + t * t * target.y;

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdf7a';
        ctx.fill();

        eCtx.beginPath();
        eCtx.arc(px, py, 4, 0, Math.PI * 2);
        eCtx.fillStyle = '#ffffff';
        eCtx.fill();
      }
    });

    // Hexagonal quantum solar lattice pattern in cell spaces
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.18)';
    const hexSize = 28;
    const hexW = Math.sqrt(3) * hexSize;
    const hexH = 2 * hexSize;
    for (let hx = 250; hx < 850; hx += hexW) {
      for (let hy = 150; hy < 750; hy += hexH * 0.75) {
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3;
          const px = hx + hexSize * 0.8 * Math.cos(angle);
          const py = hy + hexSize * 0.8 * Math.sin(angle);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Outer margin border filigree
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.95)';
    ctx.strokeRect(30, 30, width - 60, height - 60);

    const diffTex = new THREE.CanvasTexture(canvas);
    diffTex.wrapS = THREE.ClampToEdgeWrapping;
    diffTex.wrapT = THREE.ClampToEdgeWrapping;
    diffTex.generateMipmaps = true;

    const emissiveTex = new THREE.CanvasTexture(emissiveCanvas);
    emissiveTex.wrapS = THREE.ClampToEdgeWrapping;
    emissiveTex.wrapT = THREE.ClampToEdgeWrapping;
    emissiveTex.generateMipmaps = true;

    const alphaTex = new THREE.CanvasTexture(alphaCanvas);
    alphaTex.wrapS = THREE.ClampToEdgeWrapping;
    alphaTex.wrapT = THREE.ClampToEdgeWrapping;
    alphaTex.generateMipmaps = true;

    return { diffuseMap: diffTex, emissiveMap: emissiveTex, alphaMap: alphaTex };
  }

  /**
   * Generates high-res procedurally painted textures for the lower hindwings (with swallowtail motif).
   */
  static createHindwingTextures(themeGlowHex: string = '#ffaa22'): WingTextures {
    const width = 1024;
    const height = 1024;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = width;
    emissiveCanvas.height = height;
    const eCtx = emissiveCanvas.getContext('2d')!;

    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const aCtx = alphaCanvas.getContext('2d')!;

    // Diffuse background
    const grad = ctx.createRadialGradient(250, 250, 60, 512, 512, 600);
    grad.addColorStop(0, '#1c1510');
    grad.addColorStop(0.4, '#1f1618');
    grad.addColorStop(0.8, '#101720');
    grad.addColorStop(1, '#080c10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Emissive base
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, width, height);

    // Alpha base
    aCtx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    aCtx.fillRect(0, 0, width, height);

    // Golden Ratio Spiral from root
    const rootX = 200;
    const rootY = 150;

    // Spiral curve
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    for (let t = 0; t < Math.PI * 4; t += 0.05) {
      const r = 20 + t * 40;
      const x = rootX + Math.cos(t) * r;
      const y = rootY + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Swallowtail tail fin target & decorative rosette
    const rosetteX = 720;
    const rosetteY = 780;

    // Rosette / Chronometer Dial
    ctx.beginPath();
    ctx.arc(rosetteX, rosetteY, 130, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
    ctx.stroke();

    // Rosette petals / gear teeth
    for (let p = 0; p < 12; p++) {
      const ang = (p / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        rosetteX + Math.cos(ang) * 90,
        rosetteY + Math.sin(ang) * 90,
        35,
        0,
        Math.PI * 2
      );
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.stroke();
    }

    // Glowing core in rosette
    eCtx.beginPath();
    eCtx.arc(rosetteX, rosetteY, 50, 0, Math.PI * 2);
    eCtx.fillStyle = themeGlowHex;
    eCtx.fill();

    // Radial Hindwing Veins
    const veinEndPoints = [
      { x: 800, y: 350 },
      { x: 860, y: 550 },
      { x: rosetteX, y: rosetteY },
      { x: 550, y: 880 },
      { x: 350, y: 820 },
      { x: 220, y: 650 }
    ];

    veinEndPoints.forEach((target, i) => {
      const midX = (rootX + target.x) / 2 + (i % 2 === 0 ? 30 : -20);
      const midY = (rootY + target.y) / 2 + 30;

      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.quadraticCurveTo(midX, midY, target.x, target.y);
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(230, 195, 75, 0.9)';
      ctx.stroke();

      // Emissive circuit
      eCtx.beginPath();
      eCtx.moveTo(rootX, rootY);
      eCtx.quadraticCurveTo(midX, midY, target.x, target.y);
      eCtx.lineWidth = 2.5;
      eCtx.strokeStyle = themeGlowHex;
      eCtx.stroke();
    });

    const diffTex = new THREE.CanvasTexture(canvas);
    const emissiveTex = new THREE.CanvasTexture(emissiveCanvas);
    const alphaTex = new THREE.CanvasTexture(alphaCanvas);

    return { diffuseMap: diffTex, emissiveMap: emissiveTex, alphaMap: alphaTex };
  }
}
