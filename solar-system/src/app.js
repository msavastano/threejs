import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DEG, AU_KM, J2000, PLANETS, MOONS_OF, DATA, dateToJD, jdToDate, heliocentric, describe, geocentricDistance, orbitPath, apsides,
  moonPlanetocentricKm, bodyAxes, rotationPeriodDays, physical, planetElements, tableFor,
} from './orbits.js';

// ------------------------------------------------------------------ constants
const $ = (id) => document.getElementById(id);
const LIGHT_SEC_PER_AU = 499.00478384;
const JD_MIN = 625674, JD_MAX = 2816788; // ~3000 BC .. 3000 AD (validity of JPL Table 2a)
const SPEEDS = [
  ['Real time (1 s/s)', 1 / 86400], ['1 hour / s', 1 / 24], ['1 day / s', 1], ['1 week / s', 7], ['1 month / s', 30.4375],
  ['1 year / s', 365.25], ['10 years / s', 3652.5],
];
const BODY_DEFS = [
  { id: 'Sun', kind: 'Star', tex: 'sun', color: '#ffcc55' },
  { id: 'Mercury', kind: 'Planet', tex: 'mercury', color: '#b3a79a' },
  { id: 'Venus', kind: 'Planet', tex: 'venus', color: '#e6c48a' },
  { id: 'Earth', kind: 'Planet', tex: 'earth', color: '#4f8fe0' },
  { id: 'Mars', kind: 'Planet', tex: 'mars', color: '#d2694a' },
  { id: 'Jupiter', kind: 'Planet', tex: 'jupiter', color: '#d8b08c' },
  { id: 'Saturn', kind: 'Planet', tex: 'saturn', color: '#e6d3a1' },
  { id: 'Uranus', kind: 'Planet', tex: 'uranus', color: '#8fdde0' },
  { id: 'Neptune', kind: 'Planet', tex: 'neptune', color: '#4a6cf0' },
  { id: 'Pluto', kind: 'Dwarf planet', tex: 'pluto', color: '#c9b39c' },
];
const MOON_DEFS = {
  Moon: { parent: 'Earth', tex: 'moon', color: '#b8b8b8', kind: 'Moon' },
  Io: { parent: 'Jupiter', color: '#e8d36a', kind: 'Moon (Galilean)' },
  Europa: { parent: 'Jupiter', color: '#d9cdb4', kind: 'Moon (Galilean)' },
  Ganymede: { parent: 'Jupiter', color: '#9c9184', kind: 'Moon (Galilean)' },
  Callisto: { parent: 'Jupiter', color: '#6f6961', kind: 'Moon (Galilean)' },
  Titan: { parent: 'Saturn', color: '#d9a441', kind: 'Moon' },
};
const RING = { innerKm: 74500, outerKm: 136775 }; // Saturn C-ring inner edge .. A-ring outer edge (approximate)
const SUN = { radiusKm: 695700, massKg: '1.9885e30' };
const QUALITY = {
  low: { seg: 24, main: 5000, kuiper: 2000, dpr: 1, stars: false },
  med: { seg: 48, main: 12000, kuiper: 5000, dpr: 1.25, stars: true },
  high: { seg: 64, main: 20000, kuiper: 8000, dpr: 1.5, stars: true },
};
// Illustrative-mode mapping (documented in the UI): distance r -> 3*sqrt(r); radii compressed by a power law.
const illDist = (r) => 3 * Math.sqrt(r);
const illRadius = (rKm) => 0.09 * Math.pow(rKm / 6371, 0.45);
const ILL_SUN_R = 0.32;
const moonIllDist = (aKm, parentMeanKm, parentIllR) => parentIllR * (1.8 + 0.55 * Math.pow(aKm / parentMeanKm, 0.6));

// ------------------------------------------------------------------ helpers
const fmt = (v, d = 2) => (Math.abs(v) >= 1e6 ? v.toExponential(3) : v.toLocaleString('en-US', { maximumFractionDigits: d }));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pad = (n, l = 2) => String(Math.abs(n)).padStart(l, '0');
function fmtDate(jd) {
  const d = jdToDate(jd), y = d.getUTCFullYear();
  return `${y < 0 ? '-' : ''}${pad(y, 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function parseDate(str) {
  const m = /^\s*(-?\d{1,6})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?\s*(?:UTC|Z)?\s*$/i.exec(str);
  if (!m) return null;
  const d = new Date(0);
  d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); d.setUTCHours(m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, 0, 0);
  return isNaN(d) ? null : dateToJD(d);
}
// ecliptic (x,y,z) -> three.js (x, z, -y) so the ecliptic is the XZ plane with +Y = ecliptic north
const to3 = (x, y, z, out = new THREE.Vector3()) => out.set(x, z, -y);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ state
const S = {
  jd: dateToJD(new Date()), daysPerSec: 1, playing: true, reverse: false,
  blend: 0, blendTarget: 0, focus: 'Sun', selected: 'Sun',
  orbits: true, labels: true, moons: true, belts: true, quality: 'high',
};
const TEXSRC = window.__TEX__ || {
  sun: 'tex/sunmap.jpg', mercury: 'tex/mercurymap.jpg', venus: 'tex/venusmap.jpg', earth: 'tex/earth_atmos_2048.jpg', earthSpec: 'tex/earth_specular_2048.jpg',
  earthLights: 'tex/earth_lights_2048.png', earthClouds: 'tex/earth_clouds_soft.png', moon: 'tex/moon_1024.jpg', mars: 'tex/marsmap1k.jpg',
  jupiter: 'tex/jupitermap.jpg', saturn: 'tex/saturnmap.jpg', saturnRing: 'tex/saturnringcolor.jpg', saturnRingAlpha: 'tex/saturnringpattern.png',
  uranus: 'tex/uranusmap.jpg', neptune: 'tex/neptunemap.jpg', pluto: 'tex/plutomap1k.jpg', sky: 'tex/galaxy_starfield.png',
};

// ------------------------------------------------------------------ renderer / scene
const canvas = $('c');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }); }
catch (e) { $('err').style.display = 'flex'; throw e; }
renderer.setClearColor(0x000000, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 1e-7, 1e5);
camera.position.set(0, 0.55, 1).multiplyScalar(30);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false; controls.zoomSpeed = 1.1; controls.rotateSpeed = 0.7;
controls.target.set(0, 0, 0);

const sunLight = new THREE.PointLight(0xffffff, Math.PI * 1.25, 0, 0);
scene.add(sunLight, new THREE.AmbientLight(0x8a96b8, 0.16));

// textures (with procedural fallback so a missing file never leaves a blank planet)
const fallbackUsed = [];
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function fallbackCanvas(key, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = color || '#888'; g.fillRect(0, 0, 512, 256);
  const rnd = mulberry32(key.length * 7919);
  const banded = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(key);
  for (let i = 0; i < (banded ? 40 : 400); i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rnd() * 0.1})`;
    if (banded) g.fillRect(0, rnd() * 256, 512, 2 + rnd() * 12); else { g.beginPath(); g.arc(rnd() * 512, rnd() * 256, 3 + rnd() * 24, 0, 6.3); g.fill(); }
  }
  return c;
}
function loadTex(key, { srgb = true, color } = {}) {
  const t = new THREE.TextureLoader().load(TEXSRC[key], undefined, undefined, () => { t.image = fallbackCanvas(key, color); t.needsUpdate = true; fallbackUsed.push(key); updateCredits(); });
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso; return t;
}
const texCache = {};
const getTex = (k, o) => (texCache[k] ||= loadTex(k, o));

// shared unit-sphere geometries, one per quality level
const sphereGeos = {};
const sphereGeo = (q) => (sphereGeos[q] ||= new THREE.SphereGeometry(1, QUALITY[q].seg, QUALITY[q].seg / 2));

// glow sprite for the Sun
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,244,214,1)'); grd.addColorStop(0.06, 'rgba(255,226,160,.95)'); grd.addColorStop(0.2, 'rgba(255,184,90,.42)'); grd.addColorStop(0.5, 'rgba(255,150,50,.10)'); grd.addColorStop(1, 'rgba(255,130,30,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// shader chunks so custom materials work with the logarithmic depth buffer
const LOGV = '\n#include <common>\n#include <logdepthbuf_pars_vertex>\n', LOGVM = '\n#include <logdepthbuf_vertex>\n', LOGF = '\n#include <common>\n#include <logdepthbuf_pars_fragment>\n', LOGFM = '\n#include <logdepthbuf_fragment>\n', CSP = '\n#include <colorspace_fragment>\n';

// ------------------------------------------------------------------ bodies
const bodies = {}; // id -> record
const list = []; // draw/update order
function makeBody(id, def, isMoon) {
  const ph = id === 'Sun' ? null : (isMoon ? null : physical(id));
  const radii = physical(id).radiiKm; // [eq, eq, polar] km
  const eqKm = radii[0], polKm = radii[2];
  const meanKm = id === 'Sun' ? SUN.radiusKm : (ph ? ph.meanR : (radii[0] + radii[1] + radii[2]) / 3);
  const b = {
    id, def, isMoon, group: new THREE.Group(), eqKm, meanKm, poleRatio: polKm / eqKm,
    trueR: eqKm / AU_KM, illR: id === 'Sun' ? ILL_SUN_R : illRadius(meanKm),
    posMapped: new THREE.Vector3(), scale: 1, parent: isMoon ? def.parent : null, moons: [],
  };
  scene.add(b.group);
  const q = S.quality;
  let mat;
  if (id === 'Sun') mat = new THREE.MeshBasicMaterial({ map: getTex('sun', { color: def.color }), toneMapped: false });
  else if (id === 'Saturn') mat = saturnMaterial(b);
  else if (id === 'Earth') mat = new THREE.MeshPhongMaterial({ map: getTex('earth', { color: def.color }), specularMap: getTex('earthSpec', { srgb: false }), specular: new THREE.Color(0x2a3a4a), shininess: 22 });
  else if (def.tex) mat = new THREE.MeshPhongMaterial({ map: getTex(def.tex, { color: def.color }), shininess: 4, specular: 0x111111 });
  else mat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 4, specular: 0x111111 });
  b.globe = new THREE.Mesh(sphereGeo(q), mat); b.globe.frustumCulled = false;
  b.group.add(b.globe);
  if (id === 'Earth') {
    b.clouds = new THREE.Mesh(sphereGeo(q), new THREE.MeshPhongMaterial({ alphaMap: getTex('earthClouds', { srgb: false }), color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.9 }));
    b.lights = new THREE.Mesh(sphereGeo(q), nightMaterial(b));
    b.clouds.frustumCulled = b.lights.frustumCulled = false;
    b.group.add(b.clouds, b.lights);
  }
  if (id === 'Saturn') buildRing(b);
  if (id === 'Sun') {
    b.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    b.glow.frustumCulled = false; b.group.add(b.glow);
  }
  // label
  const el = document.createElement('div'); el.className = 'lbl' + (isMoon ? ' moon' : ''); el.innerHTML = `<span class="dot"></span><span>${id}</span>`;
  el.addEventListener('click', () => selectBody(id, true)); $('labels').appendChild(el); b.label = el;
  bodies[id] = b; list.push(b); return b;
}
function saturnMaterial(b) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: getTex('saturn', { color: '#e6d3a1' }) }, ringAlpha: { value: getTex('saturnRingAlpha', { srgb: false }) },
      sunPos: { value: new THREE.Vector3() }, center: { value: new THREE.Vector3() }, ringN: { value: new THREE.Vector3(0, 1, 0) }, ringIn: { value: 1 }, ringOut: { value: 2 },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying vec3 vN; ${LOGV}
      void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(transpose(inverse(modelMatrix)))*normal); gl_Position=projectionMatrix*viewMatrix*w; ${LOGVM} }`,
    fragmentShader: `uniform sampler2D map, ringAlpha; uniform vec3 sunPos, center, ringN; uniform float ringIn, ringOut; varying vec2 vUv; varying vec3 vW; varying vec3 vN; ${LOGF}
      void main(){ ${LOGFM}
        vec3 L=normalize(sunPos-vW); float d=max(dot(normalize(vN),L),0.0);
        float den=dot(ringN,L);
        if(abs(den)>1e-4){ float t=dot(ringN,center-vW)/den; if(t>0.0){ vec3 H=vW+t*L; float r=length(H-center);
          if(r>ringIn&&r<ringOut){ float a=texture2D(ringAlpha,vec2((r-ringIn)/(ringOut-ringIn),0.5)).r; d*=1.0-0.88*a; } } }
        vec3 c=texture2D(map,vUv).rgb;
        gl_FragColor=vec4(c*(0.06+d*1.12),1.0); ${CSP}      }`,
  });
  b.satMat = m; return m;
}
function buildRing(b) {
  const inF = RING.innerKm / b.eqKm, outF = RING.outerKm / b.eqKm;
  const geo = new THREE.RingGeometry(inF, outF, 160, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      ringColor: { value: getTex('saturnRing', { color: '#c9b48a' }) }, ringAlpha: { value: getTex('saturnRingAlpha', { srgb: false }) },
      sunPos: { value: new THREE.Vector3() }, center: { value: new THREE.Vector3() }, planetR: { value: 1 }, inner: { value: inF }, outer: { value: outF }, k: { value: 1 },
    },
    vertexShader: `varying vec3 vL; varying vec3 vW; ${LOGV}
      void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; ${LOGVM} }`,
    fragmentShader: `uniform sampler2D ringColor, ringAlpha; uniform vec3 sunPos, center; uniform float planetR, inner, outer; varying vec3 vL; varying vec3 vW; ${LOGF}
      void main(){ ${LOGFM}
        float u=(length(vL.xy)-inner)/(outer-inner); vec3 c=texture2D(ringColor,vec2(u,0.5)).rgb; float a=texture2D(ringAlpha,vec2(u,0.5)).r;
        vec3 L=normalize(sunPos-vW); vec3 oc=vW-center; float bq=dot(oc,L); float cc=dot(oc,oc)-planetR*planetR*0.94; float disc=bq*bq-cc;
        float sh=1.0; if(bq<0.0&&disc>0.0) sh=0.06;
        gl_FragColor=vec4(c*(0.10+1.05*sh),a*0.95); ${CSP}      }`,
  });
  b.ring = new THREE.Mesh(geo, mat); b.ring.rotation.x = -Math.PI / 2; b.ring.frustumCulled = false; b.ring.renderOrder = 2;
  b.group.add(b.ring); b.ringF = { inF, outF };
}
function nightMaterial(b) {
  return new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { lightsMap: { value: getTex('earthLights', { color: '#000' }) }, sunPos: { value: new THREE.Vector3() } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying vec3 vN; ${LOGV}
      void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; ${LOGVM} }`,
    fragmentShader: `uniform sampler2D lightsMap; uniform vec3 sunPos; varying vec2 vUv; varying vec3 vW; varying vec3 vN; ${LOGF}
      void main(){ ${LOGFM} float nl=dot(normalize(vN),normalize(sunPos-vW)); float m=smoothstep(0.02,-0.18,nl);
        vec3 c=texture2D(lightsMap,vUv).rgb; gl_FragColor=vec4(c*vec3(1.0,0.86,0.55)*m*1.4,1.0); ${CSP}      }`,
  });
}
for (const d of BODY_DEFS) makeBody(d.id, d, false);
for (const [mid, d] of Object.entries(MOON_DEFS)) { const m = makeBody(mid, d, true); bodies[d.parent].moons.push(m); }

// ------------------------------------------------------------------ sky
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.MeshBasicMaterial({ map: getTex('sky', { color: '#05060c' }), side: THREE.BackSide, depthWrite: false, toneMapped: false, color: 0x9aa4c0 }));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

// ------------------------------------------------------------------ orbit lines and apsides
const orbitLines = {}, apsPts = {}, apsCache = {}, pathCache = {};
const ORBIT_N = 256;
for (const name of PLANETS) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ORBIT_N + 1) * 3), 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(bodies[name].def.color), transparent: true, opacity: 0.5 }));
  line.frustumCulled = false; scene.add(line); orbitLines[name] = line;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7dd3a8, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
  pts.frustumCulled = false; scene.add(pts); apsPts[name] = pts;
}
const apsLabels = ['Perihelion', 'Aphelion'].map((t) => { const el = document.createElement('div'); el.className = 'lbl aps'; el.innerHTML = `<span class="dot"></span><span>${t}</span>`; $('labels').appendChild(el); return el; });
let pathJd = -1e9;
function refreshPaths() {
  if (Math.abs(S.jd - pathJd) < 1500) return; pathJd = S.jd;
  for (const n of PLANETS) { pathCache[n] = orbitPath(n, S.jd, ORBIT_N); apsCache[n] = apsides(n, S.jd); }
}

// ------------------------------------------------------------------ belts (GPU-propagated Keplerian points, illustrative distribution)
function makeBelt(count, gen, color, size) {
  const rnd = mulberry32(count * 31 + 7);
  const o1 = new Float32Array(count * 4), o2 = new Float32Array(count * 3), pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { const g = gen(rnd); o1.set([g.a, g.e, g.i, g.node], i * 4); o2.set([g.w, g.M, rnd()], i * 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aOrb1', new THREE.BufferAttribute(o1, 4)); geo.setAttribute('aOrb2', new THREE.BufferAttribute(o2, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uBlend: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uSize: { value: size }, uColor: { value: new THREE.Color(color) }, uPx: { value: 1 } },
    vertexShader: `attribute vec4 aOrb1; attribute vec3 aOrb2; uniform float uT,uBlend,uSize,uPx; uniform vec3 uOrigin; varying float vA; ${LOGV}
      void main(){ float a=aOrb1.x,e=aOrb1.y,inc=aOrb1.z,node=aOrb1.w,w=aOrb2.x;
        float n=0.01720209895/(a*sqrt(a)); float M=mod(aOrb2.y+n*uT,6.283185307); float E=M+e*sin(M);
        for(int i=0;i<6;i++){ E-=(E-e*sin(E)-M)/(1.0-e*cos(E)); }
        float xp=a*(cos(E)-e), yp=a*sqrt(1.0-e*e)*sin(E);
        float cw=cos(w),sw=sin(w),cn=cos(node),sn=sin(node),ci=cos(inc),si=sin(inc);
        vec3 p=vec3((cw*cn-sw*sn*ci)*xp+(-sw*cn-cw*sn*ci)*yp,(cw*sn+sw*cn*ci)*xp+(-sw*sn+cw*cn*ci)*yp,sw*si*xp+cw*si*yp);
        float r=length(p); vec3 q=mix(p*(3.0*sqrt(r)/r),p,uBlend);
        vec3 t=vec3(q.x,q.z,-q.y)-uOrigin; vec4 mv=viewMatrix*vec4(t,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=uSize*uPx*(0.7+0.6*aOrb2.z); vA=0.35+0.5*aOrb2.z; ${LOGVM} }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; ${LOGF} void main(){ ${LOGFM} vec2 c=gl_PointCoord-0.5; if(dot(c,c)>0.25) discard; gl_FragColor=vec4(uColor,vA); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 1; scene.add(pts); return pts;
}
const gaps = [2.06, 2.5, 2.82, 2.95, 3.27];
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r() + 1e-12)) * Math.cos(6.2831853 * r());
const mainBelt = makeBelt(QUALITY.high.main, (r) => {
  let a; do { a = 2.1 + r() * 1.2; } while (gaps.some((g) => Math.abs(a - g) < 0.018));
  return { a, e: Math.min(0.32, Math.abs(gauss(r)) * 0.1), i: Math.abs(gauss(r)) * 9 * DEG, node: r() * 6.2832, w: r() * 6.2832, M: r() * 6.2832 };
}, '#b9b4aa', 1.7);
const kuiperBelt = makeBelt(QUALITY.high.kuiper, (r) => ({
  a: 39.4 + r() * 8.3, e: Math.min(0.25, Math.abs(gauss(r)) * 0.08), i: Math.abs(gauss(r)) * 10 * DEG, node: r() * 6.2832, w: r() * 6.2832, M: r() * 6.2832,
}), '#8fa6c9', 1.5);

// ------------------------------------------------------------------ mapping (true <-> illustrative)
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function mapHelio(p, out) { // p: [x,y,z] ecliptic AU -> mapped three vector (blend of illustrative and true)
  const r = Math.hypot(p[0], p[1], p[2]) || 1e-9, k = 1 + (1 - S.blend) * (illDist(r) / r - 1);
  return to3(p[0] * k, p[1] * k, p[2] * k, out);
}
const mixLog = (a, b, t) => Math.exp(Math.log(a) * (1 - t) + Math.log(b) * t);

// ------------------------------------------------------------------ focus / camera
const originV = new THREE.Vector3(), originStart = new THREE.Vector3();
let tr = null; // transition {t, dur, d0, d1}
function defaultDistance(id) {
  const b = bodies[id];
  if (id === 'Sun') return S.blend > 0.5 ? 0.06 : 1.4;
  const r = mixLog(b.illR, b.trueR, S.blend);
  return r * (id === 'Saturn' ? 7.5 : b.isMoon ? 6 : 5.5);
}
function overviewDistance() { return S.blend > 0.5 ? 90 : 34; }
function flyTo(id, { overview = false, keepDir = true } = {}) {
  S.focus = id; originStart.copy(originV);
  const d0 = camera.position.length(), d1 = overview ? overviewDistance() : defaultDistance(id);
  const dir0 = camera.position.clone().normalize(); let dir1 = dir0;
  if (!keepDir) {
    if (id === 'Sun') dir1 = new THREE.Vector3(0, 0.55, 1).normalize();
    else { // camera on the sunlit side, ~30 deg above the ecliptic and turned 35 deg so the terminator shows
      const b = bodies[id], ref = b.parent ? bodies[b.parent] : b, sd = new THREE.Vector3().copy(bodies.Sun.posMapped).sub(ref.posMapped); sd.y = 0;
      if (sd.lengthSq() < 1e-12) sd.set(0, 0, 1); sd.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6);
      dir1 = sd.multiplyScalar(Math.cos(0.5)).add(new THREE.Vector3(0, Math.sin(0.5), 0)).normalize();
    }
  }
  tr = { t: 0, dt: 0, dur: 1.7, d0, d1, dir0, dir1, qd: new THREE.Quaternion().setFromUnitVectors(dir0, dir1) };
}
function selectBody(id, fly) {
  S.selected = id; if (fly) flyTo(id, { keepDir: false });
  for (const btn of document.querySelectorAll('#bodies button')) btn.classList.toggle('on', btn.dataset.id === id);
  updateInfo(true);
}

// ------------------------------------------------------------------ per-frame update
const q = new THREE.Quaternion(), mat4 = new THREE.Matrix4(), vX = new THREE.Vector3(), vY = new THREE.Vector3(), vZ = new THREE.Vector3();
const moonVec = new THREE.Vector3();
function updateBodies() {
  const jd = S.jd;
  // 1. mapped positions
  for (const b of list) {
    if (b.id === 'Sun') { b.posMapped.set(0, 0, 0); continue; }
    if (b.isMoon) continue;
    mapHelio(heliocentric(b.id, jd), b.posMapped);
  }
  for (const b of list) {
    if (!b.isMoon) continue;
    const par = bodies[b.parent], v = moonPlanetocentricKm(b.id, jd), d = Math.hypot(v[0], v[1], v[2]);
    const mean = par.meanKm, ill = moonIllDist(DATA.moons[b.id].a, mean, par.illR), k = ((1 - S.blend) * (ill / DATA.moons[b.id].a) + S.blend / AU_KM);
    to3(v[0] * k, v[1] * k, v[2] * k, moonVec); b.posMapped.copy(par.posMapped).add(moonVec);
  }
  // 2. origin
  const fb = bodies[S.focus];
  if (tr) { tr.t += tr.dt / tr.dur; const e = ease(Math.min(1, tr.t)); originV.copy(originStart).lerp(fb.posMapped, e);
    const d = Math.exp(Math.log(tr.d0) * (1 - e) + Math.log(tr.d1) * e); const qq = new THREE.Quaternion().slerp(tr.qd, e); camera.position.copy(tr.dir0).applyQuaternion(qq).multiplyScalar(d); if (tr.t >= 1) tr = null; }
  else originV.copy(fb.posMapped);
  // 3. transforms
  for (const b of list) {
    b.group.position.copy(b.posMapped).sub(originV);
    b.scale = mixLog(b.illR, b.trueR, S.blend);
    const hide = b.isMoon && !S.moons; b.group.visible = !hide;
    const ax = bodyAxes(b.id, jd);
    // local axes: X -> body x, Y -> body pole, Z -> -body y  (three.js sphere: u=0.5 faces +X, east = -Z)
    to3(ax.x[0], ax.x[1], ax.x[2], vX); to3(ax.z[0], ax.z[1], ax.z[2], vY); to3(-ax.y[0], -ax.y[1], -ax.y[2], vZ);
    mat4.makeBasis(vX, vY, vZ); b.group.quaternion.setFromRotationMatrix(mat4);
    b.globe.scale.set(b.scale, b.scale * b.poleRatio, b.scale);
    if (b.clouds) { b.clouds.scale.setScalar(b.scale * 1.006); b.clouds.rotation.y = (S.jd - J2000) * 0.02; b.lights.scale.setScalar(b.scale * 1.002); }
    if (b.glow) { const dist = camera.position.length(); const s = Math.max(b.scale * 12, dist * 0.06); b.glow.scale.set(s, s, 1); b.globe.scale.setScalar(b.scale); }
  }
  const sunPos = bodies.Sun.group.position; sunLight.position.copy(sunPos);
  const earth = bodies.Earth; earth.lights.material.uniforms.sunPos.value.copy(sunPos);
  const sat = bodies.Saturn, k = sat.scale;
  const su = sat.satMat.uniforms; su.sunPos.value.copy(sunPos); su.center.value.copy(sat.group.position);
  su.ringN.value.set(0, 1, 0).applyQuaternion(sat.group.quaternion); su.ringIn.value = sat.ringF.inF * k; su.ringOut.value = sat.ringF.outF * k;
  sat.ring.scale.setScalar(k); const ru = sat.ring.material.uniforms; ru.sunPos.value.copy(sunPos); ru.center.value.copy(sat.group.position); ru.planetR.value = k;
  // 4. orbits, apsides
  refreshPaths();
  for (const n of PLANETS) {
    const line = orbitLines[n], arr = line.geometry.attributes.position.array, pts = pathCache[n];
    line.visible = S.orbits;
    if (S.orbits) {
      for (let i = 0; i <= ORBIT_N; i++) { mapHelio(pts[i], tmp).sub(originV); arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z; }
      line.geometry.attributes.position.needsUpdate = true;
      line.material.opacity = (S.selected === n || S.focus === n) ? 0.95 : 0.42;
    }
    const ap = apsCache[n], pa = apsPts[n].geometry.attributes.position.array;
    mapHelio(ap.perihelion, tmp).sub(originV); pa[0] = tmp.x; pa[1] = tmp.y; pa[2] = tmp.z;
    mapHelio(ap.aphelion, tmp).sub(originV); pa[3] = tmp.x; pa[4] = tmp.y; pa[5] = tmp.z;
    apsPts[n].geometry.attributes.position.needsUpdate = true; apsPts[n].visible = S.orbits;
  }
  // 5. belts
  for (const [belt, on] of [[mainBelt, S.belts], [kuiperBelt, S.belts]]) {
    belt.visible = on; const u = belt.material.uniforms; u.uT.value = jd - J2000; u.uBlend.value = S.blend; u.uOrigin.value.copy(originV); u.uPx.value = renderer.getPixelRatio();
  }
  sky.position.copy(camera.position);
}

// ------------------------------------------------------------------ labels, scale bar, info
const proj = new THREE.Vector3();
function updateLabels() {
  const w = innerWidth, h = innerHeight, camD = camera.position.length();
  for (const b of list) {
    const el = b.label; let show = S.labels || b.id === S.selected || true;
    proj.copy(b.group.position).project(camera);
    const vis = proj.z > -1 && proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05;
    let op = 1;
    if (b.isMoon) { const par = bodies[b.parent]; const orb = b.group.position.distanceTo(par.group.position); const dcam = camera.position.distanceTo(par.group.position); op = S.moons ? clamp((6 - dcam / orb) / 3, 0, 1) : 0; }
    if (b.id === S.focus) op = Math.min(op, clamp((camD / b.scale - 9) / 4, 0, 1));
    if (!S.labels) op = b.id === S.selected ? op : 0;
    const dotOnly = false;
    el.style.opacity = vis ? op : 0; el.style.pointerEvents = op < 0.15 ? 'none' : 'auto';
    if (vis) el.style.transform = `translate(${((proj.x + 1) / 2 * w).toFixed(1)}px,${((1 - proj.y) / 2 * h - 8).toFixed(1)}px)`;
    el.classList.toggle('sel', b.id === S.selected);
  }
  // apsides labels for the selected planet
  const sel = S.selected, showAps = S.orbits && PLANETS.includes(sel) && !bodies[sel].isMoon;
  apsLabels.forEach((el, i) => {
    if (!showAps) { el.style.opacity = 0; return; }
    const pa = apsPts[sel].geometry.attributes.position.array; proj.set(pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]).project(camera);
    const vis = proj.z > -1 && proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05; el.style.opacity = vis ? 1 : 0;
    if (vis) el.style.transform = `translate(${((proj.x + 1) / 2 * w).toFixed(1)}px,${((1 - proj.y) / 2 * h - 8).toFixed(1)}px)`;
  });
}
function updateScaleBar() {
  const sb = $('scalebar');
  if (S.blend < 0.98) { sb.style.display = 'none'; return; }
  const dist = camera.position.length(), fov = camera.fov * DEG, auPerPx = (2 * dist * Math.tan(fov / 2)) / innerHeight;
  const target = auPerPx * 120; const pow = Math.pow(10, Math.floor(Math.log10(target))); const m = target / pow;
  const nice = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * pow, px = nice / auPerPx, km = nice * AU_KM;
  let txt; if (km < 1e6) txt = `${fmt(km, 0)} km`; else if (nice < 0.1) txt = `${fmt(km / 1e6, 1)} million km`; else txt = `${fmt(nice, nice < 1 ? 2 : 0)} AU`;
  if (nice >= 0.01 && nice < 0.1) txt += ` (${fmt(nice * LIGHT_SEC_PER_AU, 0)} light-seconds)`; else if (nice >= 0.1 && nice < 10) txt += ` (${fmt(nice * LIGHT_SEC_PER_AU / 60, 1)} light-min)`;
  $('sb-bar').style.width = px + 'px'; $('sb-txt').textContent = txt; sb.style.display = 'block';
}
const infoEl = $('info'); let infoT = 0;
function row(a, b) { return `<tr><td>${a}</td><td>${b}</td></tr>`; }
function updateInfo(force) {
  const now = performance.now(); if (!force && now - infoT < 250) return; infoT = now;
  const id = S.selected, b = bodies[id], jd = S.jd; let html = `<h2>${id}</h2><div class="kind">${b.def.kind}</div><table>`;
  html += row('Mean radius', `${fmt(b.meanKm, 1)} km`);
  if (id === 'Sun') { html += row('Mass', `${SUN.massKg.replace('e', ' × 10^')} kg`); html += row('Rotation (sidereal)', `${fmt(rotationPeriodDays('Sun'), 2)} d`); }
  else if (!b.isMoon) {
    const ph = physical(id), el = id === 'Pluto' ? DATA.pluto : planetElements(id, jd), a = id === 'Pluto' ? el.a : el.a, e = el.e;
    html += row('Mass', `${fmt(ph.mass, 4)} × 10²⁴ kg`);
    html += row('Semi-major axis', `${fmt(a, 4)} AU`); html += row('Eccentricity', fmt(e, 4));
    html += row('Orbital period', ph.period_y < 2 ? `${fmt(ph.period_y * 365.25636, 1)} d` : `${fmt(ph.period_y, 2)} yr`);
    const rot = ph.rot_d; html += row('Day (sidereal)', Math.abs(rot) < 2 ? `${fmt(Math.abs(rot) * 24, 2)} h${rot < 0 ? ' (retrograde)' : ''}` : `${fmt(Math.abs(rot), 2)} d${rot < 0 ? ' (retrograde)' : ''}`);
    if (ph.obliq != null) html += row('Axial tilt', `${fmt(ph.obliq, 2)}°`);
    const d = describe(id, jd), ea = geocentricDistance(id, jd);
    html += row('Distance from Sun', `${fmt(d.r, 4)} AU`);
    if (id !== 'Earth') html += row('Distance from Earth', `${fmt(ea, 4)} AU`), html += row('Light travel time', ea * LIGHT_SEC_PER_AU < 3600 ? `${fmt(ea * LIGHT_SEC_PER_AU / 60, 1)} min` : `${fmt(ea * LIGHT_SEC_PER_AU / 3600, 2)} h`);
    html += `</table><div class="chk"><b>Computed position</b> (heliocentric, ecliptic J2000)<br>r = ${d.r.toFixed(5)} AU · λ = ${d.lon.toFixed(3)}° · β = ${d.lat.toFixed(3)}°<br>` +
      (id === 'Pluto' ? 'Pluto: two-body orbit from JPL SBDB elements (approximate, up to ~0.5° in longitude).' : `Method: JPL Keplerian elements, ${tableFor(jd) === 'table1' ? 'Table 1 (1800–2050)' : 'Table 2a (3000 BC–3000 AD, reduced accuracy)'}. Compare with JPL Horizons.`) + '</div>';
    infoEl.innerHTML = html; return;
  } else {
    const m = DATA.moons[id], par = bodies[b.parent], v = moonPlanetocentricKm(id, jd);
    html += row('Orbits', b.parent); html += row('Mean orbital radius', `${fmt(m.a, 0)} km`); html += row('Orbital period', `${fmt(m.P, 3)} d`);
    html += row('Current distance', `${fmt(Math.hypot(...v), 0)} km`); html += row('Rotation', 'synchronous (same face to ' + b.parent + ')');
    html += `</table><div class="chk">Simplified model: JPL mean elements, not for precise ephemeris use.</div>`; infoEl.innerHTML = html; return;
  }
  infoEl.innerHTML = html + '</table>';
}
function updateCredits() {
  $('credits').innerHTML = 'Orbits: NASA/JPL Standish &amp; Williams elements, JPL SBDB (Pluto), JPL satellite mean elements. Poles &amp; sizes: NAIF PCK / JPL. Textures: James Hastings-Trew (planetpixelemporium) via <a href="https://github.com/jeromeetienne/threex.planets">threex.planets</a> (MIT); Earth &amp; Moon from three.js examples. Sky is artistic.' +
    (fallbackUsed.length ? ` Procedural fallback: ${[...new Set(fallbackUsed)].join(', ')}.` : '');
}

// ------------------------------------------------------------------ UI wiring
function buildUI() {
  const bar = $('bodies');
  for (const d of BODY_DEFS) { const bt = document.createElement('button'); bt.textContent = d.id; bt.dataset.id = d.id; bt.addEventListener('click', () => selectBody(d.id, true)); bar.appendChild(bt); }
  const ov = document.createElement('button'); ov.textContent = 'Overview'; ov.addEventListener('click', () => { flyTo('Sun', { overview: true, keepDir: false }); selectBody('Sun', false); }); bar.prepend(ov);
  $('speed').innerHTML = SPEEDS.map((s, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${s[0]}</option>`).join('');
  $('speed').addEventListener('change', (e) => { S.daysPerSec = SPEEDS[+e.target.value][1]; });
  const playBtn = $('play'); const syncPlay = () => { playBtn.innerHTML = S.playing ? '&#10074;&#10074;' : '&#9654;'; $('rev').classList.toggle('on', S.reverse); };
  playBtn.addEventListener('click', () => { S.playing = !S.playing; syncPlay(); });
  $('rev').addEventListener('click', () => { S.reverse = !S.reverse; syncPlay(); });
  addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') { e.preventDefault(); S.playing = !S.playing; syncPlay(); } });
  $('now').addEventListener('click', () => { S.jd = dateToJD(new Date()); dateEl.value = fmtDate(S.jd); $('datewarn').textContent = ''; });
  const dateEl = $('date'); dateEl.value = fmtDate(S.jd);
  const applyDate = () => { const jd = parseDate(dateEl.value); if (jd == null) { $('datewarn').textContent = 'Use YYYY-MM-DD HH:MM (UTC)'; return; } S.jd = clamp(jd, JD_MIN, JD_MAX); $('datewarn').textContent = jd < JD_MIN || jd > JD_MAX ? 'Clamped to 3000 BC – 3000 AD' : ''; dateEl.value = fmtDate(S.jd); };
  dateEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyDate(); dateEl.blur(); } }); dateEl.addEventListener('change', applyDate);
  window.__setDateInput = () => { if (document.activeElement !== dateEl) dateEl.value = fmtDate(S.jd); };
  const setMode = (trueMode) => { S.blendTarget = trueMode ? 1 : 0; $('m-true').classList.toggle('on', trueMode); $('m-ill').classList.toggle('on', !trueMode); flyTo(S.focus, { overview: S.focus === 'Sun' && camera.position.length() > 20 * bodies.Sun.scale }); noteMode(); };
  const noteMode = () => { $('mode-note').textContent = S.blendTarget ? 'True scale: real sizes and distances. Zoom into a planet or use the scale bar.' : 'Illustrative: distances ∝ √r, sizes compressed. Not to scale.'; };
  $('m-ill').addEventListener('click', () => setMode(false)); $('m-true').addEventListener('click', () => setMode(true)); noteMode();
  for (const [id, key] of [['t-orbits', 'orbits'], ['t-labels', 'labels'], ['t-moons', 'moons'], ['t-belts', 'belts']]) $(id).addEventListener('change', (e) => { S[key] = e.target.checked; });
  $('quality').addEventListener('change', (e) => setQuality(e.target.value));
  $('info-toggle').addEventListener('click', () => infoEl.classList.toggle('show'));
  syncPlay(); selectBody('Sun', false); updateCredits();
}
function setQuality(qn) {
  S.quality = qn; const Q = QUALITY[qn];
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
  for (const b of list) { b.globe.geometry = sphereGeo(qn); if (b.clouds) { b.clouds.geometry = sphereGeo(qn); b.lights.geometry = sphereGeo(qn); } }
  mainBelt.geometry.setDrawRange(0, Q.main); kuiperBelt.geometry.setDrawRange(0, Q.kuiper); sky.visible = Q.stars;
  $('quality').value = qn; resize();
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

// ------------------------------------------------------------------ main loop
let last = performance.now(), fpsAcc = 0, fpsN = 0, lowSince = 0, downgraded = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S.playing) S.jd = clamp(S.jd + (S.reverse ? -1 : 1) * S.daysPerSec * dt, JD_MIN, JD_MAX);
  S.blend += (S.blendTarget - S.blend) * Math.min(1, dt * 3.2); if (Math.abs(S.blendTarget - S.blend) < 1e-3) S.blend = S.blendTarget;
  if (tr) tr.dt = dt;
  // camera distance limits for the current focus
  const fb = bodies[S.focus], r = fb.scale || mixLog(fb.illR, fb.trueR, S.blend);
  controls.minDistance = r * 1.15; controls.maxDistance = S.blend > 0.5 ? 400 : 120;
  updateBodies(); controls.update(); updateLabels(); updateScaleBar(); updateInfo(false); window.__setDateInput && window.__setDateInput();
  const y = jdToDate(S.jd).getUTCFullYear(); $('status').textContent = (y < 1800 || y > 2050) ? 'Outside 1800–2050: using JPL Table 2a (3000 BC–3000 AD), lower accuracy. Dates are proleptic Gregorian, UTC.' : '';
  renderer.render(scene, camera);
  // adaptive quality: if under ~28 fps for 3 s, step down once
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; lowSince = fps < 28 ? lowSince + 1 : 0;
    if (lowSince >= 3 && downgraded < 2 && !window.__noAdapt) { downgraded++; lowSince = 0; setQuality(S.quality === 'high' ? 'med' : 'low'); $('status').textContent = 'Frame rate was low, quality reduced.'; } }
}
buildUI(); setQuality('high'); resize();
S.focus = 'Sun'; originV.set(0, 0, 0); camera.position.set(0, 0.55, 1).setLength(overviewDistance());
requestAnimationFrame((t) => { last = t; frame(t); });
window.__solar = { S, bodies, camera, controls, renderer, scene, flyTo, selectBody, setQuality, THREE, ready: () => !tr, finish: () => { if (tr) tr.t = 1; } };
