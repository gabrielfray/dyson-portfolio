import * as THREE from 'three';
import { PLANETS } from '../data/content';
import { ATMO_FRAG, PLANET_FRAG, PLANET_VERT, RING_FRAG, RING_VERT } from './shaders';
import { SHELL_R } from './rings';

export interface PlanetRt {
  pivot: THREE.Group;
  body: THREE.Mesh;
  r: number;
  omega: number;
  angle: number;
  spin: number;
  key: string;
  size: number;
  pick: THREE.Mesh;
  destroyAt: number; // tempo (s) após a detonação p/ ser atingido (Infinity = imune)
  dead: boolean;
  deadT: number;
  fx: PlanetFx | null; // efeito de destruição (criado ao morrer)
  irMats: THREE.ShaderMaterial[]; // materiais que recebem o tom infravermelho (corpo, atmosfera, anel)
}

interface PlanetFx {
  group: THREE.Group;
  flash: THREE.Sprite;
  flashMat: THREE.SpriteMaterial;
  pts: THREE.Points;
  ptsMat: THREE.PointsMaterial;
  positions: Float32Array;
  dirs: Float32Array;
  speeds: Float32Array;
}

// Escala/órbitas: casca = 1 UA = SHELL_R. Órbitas por log10(UA) espalhado num
// intervalo realista; corpos por (d/d_terra)^0.35 (via bodyPx) * escala.
const AU_PX = 95;
const PX_TO_WORLD = SHELL_R / AU_PX;
const BODY_SCALE = 2.4; // ESCALA_CORPO: leitura dos corpos (1.0 = tabela exata)
const ORBIT_INNER = 85; // raio de mundo do planeta mais interno (Mercúrio)
const ORBIT_OUTER = 380; // raio de mundo do planeta mais externo (Netuno)
const ORBIT_SPEED_K = 80; // ω = K / r^1.5 (kepleriano sobre os raios comprimidos)
const logMin = Math.log10(0.39); // âncoras fixas Mercúrio..Netuno (Plutão é caso à parte)
const logMax = Math.log10(30.1);

// ---- Texturas procedurais de superfície ----
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const splat = (ctx: CanvasRenderingContext2D, w: number, x: number, y: number, rad: number, col: number, a: number) => {
  const c = new THREE.Color(col);
  const rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
  for (const dx of [0, -w, w]) { // wrap horizontal p/ não emendar na longitude
    const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
  }
};

const makeSurface = (base: number, build: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const w = 512, h = 256;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const b = new THREE.Color(base);
  ctx.fillStyle = `rgb(${(b.r * 255) | 0},${(b.g * 255) | 0},${(b.b * 255) | 0})`;
  ctx.fillRect(0, 0, w, h);
  build(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};

const makeBandTexture = (light: number, dark: number) => {
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 512;
  const ctx = cv.getContext('2d')!;
  const L = new THREE.Color(light), D = new THREE.Color(dark), c = new THREE.Color();
  for (let y = 0; y < 512; y++) {
    const lat = y / 512;
    let t = 0.5 + 0.5 * Math.sin(lat * Math.PI * 13); // ~6-7 faixas largas de latitude
    t = t * 0.6 + (0.5 + 0.5 * Math.sin(lat * Math.PI * 33)) * 0.25; // detalhe fino
    t = Math.min(1, Math.max(0, t + (Math.random() - 0.5) * 0.12)); // ruído
    c.copy(D).lerp(L, t);
    ctx.fillStyle = `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`;
    ctx.fillRect(0, y, 8, 1);
  }
  return new THREE.CanvasTexture(cv);
};

const planetTexture = (key: string): THREE.Texture | null => {
  if (key === 'jupiter') return makeBandTexture(0xe8dcc0, 0x9c7850);
  if (key === 'saturno') return makeBandTexture(0xe0d2a0, 0xb09860);
  if (key === 'mercurio') {
    return makeSurface(0x847a6f, (ctx, w, h) => {
      for (let i = 0; i < 30; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(45, 115), Math.random() < 0.5 ? 0x453f37 : 0xa99e8f, rnd(0.3, 0.55)); // maria claras/escuras
      for (let i = 0; i < 190; i++) { // crateras: cova escura + rebordo claro
        const x = rnd(0, w), y = rnd(0, h), rr = rnd(2, 12);
        splat(ctx, w, x, y, rr * 1.5, 0x352f28, rnd(0.45, 0.8));
        splat(ctx, w, x - rr * 0.35, y - rr * 0.35, rr * 0.8, 0xcabda8, rnd(0.35, 0.6));
      }
      for (let i = 0; i < 420; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(1, 3), Math.random() < 0.5 ? 0x2c2822 : 0xb4a794, rnd(0.2, 0.4)); // speckle fino
    });
  }
  if (key === 'venus') {
    return makeSurface(0xe4d3a0, (ctx, w, h) => {
      for (let y = 0; y < h; y++) { // bandas latitudinais de nuvens
        const t = 0.5 + 0.5 * Math.sin(y / h * Math.PI * 9 + Math.sin(y / h * 5) * 1.5);
        const c = new THREE.Color(0xb2913f).lerp(new THREE.Color(0xf9f1cf), t);
        ctx.fillStyle = `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0.7)`;
        ctx.fillRect(0, y, w, 1);
      }
      for (let i = 0; i < 110; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(35, 120), Math.random() < 0.5 ? 0xfcf6da : 0xb2934f, rnd(0.28, 0.5)); // redemoinhos em "V"
      for (let i = 0; i < 260; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(3, 13), Math.random() < 0.5 ? 0xfef9de : 0xa88e4c, rnd(0.18, 0.36)); // textura fina de nuvem
    });
  }
  if (key === 'terra') {
    return makeSurface(0x24507e, (ctx, w, h) => { // oceano
      const land = [0x4f6b3a, 0x6f7a45, 0x8a7550];
      for (let cc = 0; cc < 7; cc++) { // continentes
        const cx = rnd(0, w), cy = rnd(h * 0.22, h * 0.78);
        for (let i = 0; i < 26; i++) splat(ctx, w, cx + rnd(-65, 65), cy + rnd(-42, 42), rnd(10, 34), land[(Math.random() * land.length) | 0], rnd(0.55, 0.95));
      }
      for (let i = 0; i < 12; i++) { // calotas polares
        splat(ctx, w, rnd(0, w), rnd(0, h * 0.12), rnd(24, 54), 0xeef4ff, rnd(0.35, 0.65));
        splat(ctx, w, rnd(0, w), rnd(h * 0.88, h), rnd(24, 54), 0xeef4ff, rnd(0.35, 0.65));
      }
      for (let i = 0; i < 42; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(14, 44), 0xffffff, rnd(0.1, 0.28)); // nuvens
    });
  }
  if (key === 'marte') {
    return makeSurface(0xb07c48, (ctx, w, h) => {
      for (let i = 0; i < 30; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(45, 125), 0x5a3d22, rnd(0.35, 0.6)); // regiões escuras (maria)
      for (let i = 0; i < 28; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(35, 95), 0xd3ac78, rnd(0.28, 0.5)); // desertos claros
      for (let i = 0; i < 130; i++) { // crateras/manchas
        const x = rnd(0, w), y = rnd(0, h), rr = rnd(2, 8);
        splat(ctx, w, x, y, rr * 1.3, 0x53381f, rnd(0.3, 0.55));
        splat(ctx, w, x - rr * 0.3, y - rr * 0.3, rr * 0.6, 0xdcb587, rnd(0.25, 0.45));
      }
      for (let i = 0; i < 12; i++) { // calotas polares
        splat(ctx, w, rnd(0, w), rnd(0, h * 0.09), rnd(30, 62), 0xf7f3ed, rnd(0.5, 0.82));
        splat(ctx, w, rnd(0, w), rnd(h * 0.91, h), rnd(30, 62), 0xf7f3ed, rnd(0.5, 0.82));
      }
      for (let i = 0; i < 320; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(1, 3), Math.random() < 0.5 ? 0x472e17 : 0xdcb587, rnd(0.2, 0.38)); // speckle fino
    });
  }
  if (key === 'plutao') {
    return makeSurface(0xbfa886, (ctx, w, h) => {
      for (let i = 0; i < 40; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(30, 90), Math.random() < 0.5 ? 0x6e5334 : 0xe0cba2, rnd(0.25, 0.5)); // tholins claros/escuros
      splat(ctx, w, w * 0.62, h * 0.58, 70, 0xf1e6cf, 0.6); // "coração" (Tombaugh Regio)
      splat(ctx, w, w * 0.62, h * 0.58, 42, 0xf6eede, 0.5);
      for (let i = 0; i < 220; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(1, 3), Math.random() < 0.5 ? 0x5b4327 : 0xe6d3ac, rnd(0.2, 0.36)); // speckle
    });
  }
  return null;
};

// ---------- Destruição do planeta (onda de choque da supernova) ----------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

let sparkTex: THREE.CanvasTexture | null = null;
function sparkTexture() {
  if (sparkTex) return sparkTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,240,210,0.65)');
  g.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  sparkTex = new THREE.CanvasTexture(c);
  return sparkTex;
}

// Detona um planeta: flash + detritos no lugar dele (fixos no pivot já parado).
function killPlanet(p: PlanetRt) {
  p.dead = true;
  p.deadT = 0;
  p.pick.layers.disableAll(); // não pode mais ser "hoverado"
  const group = new THREE.Group();
  group.position.copy(p.body.position); // local do pivot (planeta parado)
  p.pivot.add(group);

  const flashMat = new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffe6b0, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const flash = new THREE.Sprite(flashMat);
  flash.scale.setScalar(p.size * 6);
  group.add(flash);

  const N = 130;
  const positions = new Float32Array(N * 3);
  const dirs = new Float32Array(N * 3);
  const speeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
    dirs[i * 3] = rr * Math.cos(th); dirs[i * 3 + 1] = u; dirs[i * 3 + 2] = rr * Math.sin(th);
    speeds[i] = p.size * (6 + Math.random() * 18);
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const ptsMat = new THREE.PointsMaterial({ size: 2.4, map: sparkTexture(), color: 0xffd9a0, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
  const pts = new THREE.Points(ptsGeo, ptsMat);
  group.add(pts);

  p.fx = { group, flash, flashMat, pts, ptsMat, positions, dirs, speeds };
}

// Anima o efeito de destruição: corpo encolhe, flash cresce e some, detritos voam.
function animateBurst(p: PlanetRt) {
  const fx = p.fx;
  if (!fx) return;
  const e = p.deadT;
  // corpo some rápido
  const shrink = 1 - smooth(0, 0.18, e);
  p.body.scale.setScalar(Math.max(0.0001, shrink));
  if (e > 0.2) p.body.visible = false;
  // flash: cresce e esmaece
  fx.flash.scale.setScalar(p.size * (6 + smooth(0, 0.5, e) * 10));
  fx.flashMat.opacity = 0.95 * (1 - smooth(0.03, 0.5, e));
  // detritos voam e esfriam
  for (let i = 0; i < fx.speeds.length; i++) {
    const d = fx.speeds[i] * e;
    fx.positions[i * 3] = fx.dirs[i * 3] * d;
    fx.positions[i * 3 + 1] = fx.dirs[i * 3 + 1] * d;
    fx.positions[i * 3 + 2] = fx.dirs[i * 3 + 2] * d;
  }
  fx.pts.geometry.attributes.position.needsUpdate = true;
  fx.ptsMat.opacity = 1 - smooth(0.5, 1.4, e);
  fx.ptsMat.color.setRGB(1, 0.85 - 0.55 * clamp01(e / 1.1), 0.6 - 0.5 * clamp01(e / 1));
}

// Cria os planetas orbitando a estrela (na origem). Devolve os handles de
// animação e as esferas de hit (pick) p/ o raycast do orquestrador.
export function createPlanets(scene: THREE.Scene): { planets: PlanetRt[]; planetPick: THREE.Mesh[] } {
  const solar = new THREE.Group();
  scene.add(solar);
  const planets: PlanetRt[] = [];
  const planetPick: THREE.Mesh[] = [];
  const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  whiteTex.needsUpdate = true;

  PLANETS.forEach((p, i) => {
    const norm = (Math.log10(p.au) - logMin) / (logMax - logMin);
    // Plutão: órbita bem além de Netuno (easter egg — só aparece com muito zoom out)
    const r = p.key === 'plutao' ? 560 : ORBIT_INNER + (ORBIT_OUTER - ORBIT_INNER) * norm;
    const size = p.bodyPx * BODY_SCALE * PX_TO_WORLD;
    const surfTex = planetTexture(p.key);
    const irMats: THREE.ShaderMaterial[] = [];
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(surfTex ? 0xffffff : p.color) },
        uShin: { value: THREE.MathUtils.lerp(6, 90, 1 - p.rough) }, // menos rugoso -> glint concentrado
        uSpec: { value: 0.22 + p.metal * 0.9 },
        uAmbient: { value: 0.08 }, // piso p/ o lado escuro não sumir
        uIr: { value: 0 },
        uMap: { value: surfTex ?? whiteTex },
      },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    });
    irMats.push(mat);
    const body = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 32), mat);
    body.position.x = r; // luz vem da origem: a fase iluminada aponta p/ a estrela
    if (p.atmoI > 0) {
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: { uAtmo: { value: new THREE.Color(p.atmo) }, uI: { value: p.atmoI }, uIr: { value: 0 } },
        vertexShader: PLANET_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });
      irMats.push(atmoMat);
      body.add(new THREE.Mesh(new THREE.SphereGeometry(size * 1.06, 32, 32), atmoMat));
    }
    if (p.ring) {
      // proporções reais (em raios de Saturno): C 1.24, B 1.53, Cassini 1.95–2.03, A 2.27
      const rIn = size * 1.24, rOut = size * 2.27;
      const ringGeo = new THREE.RingGeometry(rIn, rOut, 128, 8);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0xd8c79a) }, uInner: { value: rIn }, uOuter: { value: rOut }, uIr: { value: 0 } },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      irMats.push(ringMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(Math.PI / 2 - 0.45, 0, 0); // levemente inclinado
      body.add(ring);
    }
    // esfera invisível maior p/ facilitar o hover (planetas são pequenos)
    const pick = new THREE.Mesh(new THREE.SphereGeometry(Math.max(size * 4, 5), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.planetIndex = i;
    body.add(pick);
    planetPick.push(pick);
    const pivot = new THREE.Group(); // gira em Y -> órbita circular no plano XZ (eclíptica)
    pivot.add(body);
    solar.add(pivot);
    // Destruição por RADIAÇÃO (não pelo choque): só os rochosos têm energia de
    // ligação baixa o suficiente p/ desintegrar. Morrem na chegada da LUZ, em
    // sequência (tempo-luz ~ 8,32 min/UA, comprimido ×0.1): Mercúrio 0,32s ->
    // Vênus 0,60s -> Terra 0,83s -> Marte 1,26s. Gigantes/gelo/Plutão sobrevivem.
    const ROCKY = new Set(['mercurio', 'venus', 'terra', 'marte']);
    const destroyAt = ROCKY.has(p.key) ? 0.83 * p.au : Infinity;
    planets.push({ pivot, body, r, omega: ORBIT_SPEED_K / Math.pow(r, 1.5), angle: i * 2.399963, spin: 0.2 + (i % 3) * 0.12, key: p.key, size, pick, destroyAt, dead: false, deadT: 0, fx: null, irMats });
  });

  return { planets, planetPick };
}

// Avança as órbitas (kepleriano) e a rotação própria; congela o planeta sob o
// cursor (planetHover) para leitura estável do card.
export function updatePlanets(planets: PlanetRt[], dt: number, planetHover: number, blastT = -1, ir = 0) {
  planets.forEach((p, i) => {
    for (const m of p.irMats) m.uniforms.uIr.value = ir; // tom infravermelho (Petrova)
    if (p.dead) { p.deadT += dt; animateBurst(p); return; } // destruído: só anima o burst
    if (blastT >= 0 && blastT >= p.destroyAt) { killPlanet(p); return; } // onda de choque chegou
    if (i !== planetHover) p.angle += p.omega * dt;
    p.pivot.rotation.y = p.angle;
    p.body.rotation.y += p.spin * dt;
  });
}
