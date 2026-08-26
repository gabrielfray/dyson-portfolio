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
  ring: THREE.Mesh | null; // anel (Saturno) — sublima no pós-supernova
  plume: PlumeRt | null; // pluma de ablação (sobreviventes) — gás arrancado
}

// ---- Pluma de ablação (substitui o cone) ----
// Gás incandescente arrancado do sobrevivente, apontando radialmente p/ longe da
// estrela. Três camadas: VÉU (faixa extrudada em espaço de vista, sem aresta),
// PARTÍCULAS (posição 100% no vertex shader) — a cor vem de corpo negro (azul
// quente na base -> laranja frio na ponta), não é escolhida. Ela ABRE, não afina.
const cl = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
// corpo negro -> RGB (aprox. Tanner Helland): a cor é derivada da temperatura
function blackbody(T: number): THREE.Color {
  const t = cl(T, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return new THREE.Color(cl(r, 0, 255) / 255, cl(g, 0, 255) / 255, cl(b, 0, 255) / 255);
}
const C_BASE = blackbody(26000); // ~#a8c4ff — onde o gás sai (quente)
const C_MEIO = blackbody(7000);  // creme
const C_PONTA = blackbody(3200); // laranja (frio, morrendo)

// textura de ponto (gradiente radial) p/ as partículas
const plumeDot = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!; const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.32, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();

// VÉU: faixa extrudada em espaço de vista (encara a câmera de qualquer ângulo, sem
// silhueta poligonal). Largura cresce ao longo do comprimento -> a pluma ABRE.
const VEU_VERT = `
  attribute float lado; attribute float tt;
  uniform float uComp, uR0, uRmax, uLargMult, uTempo;
  varying float vLado; varying float vT;
  void main(){
    vLado = lado; vT = tt;
    float d = uComp * pow(tt, 0.86);
    vec4 mv = modelViewMatrix * vec4(d, 0.0, 0.0, 1.0);
    vec3 tv = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vec3 pc = cross(tv, normalize(-mv.xyz));
    float pl = length(pc); // pluma apontando p/ a câmera -> perp colapsa: usa fallback
    vec3 perp = pl > 0.001 ? pc / pl : normalize(cross(tv, vec3(0.0, 1.0, 0.0)));
    float larg = (uR0 + (uRmax - uR0) * pow(tt, 0.72)) * uLargMult;
    larg *= 1.0 + 0.13 * sin(tt * 13.0 - uTempo * 1.1);
    mv.xyz += perp * lado * larg;
    gl_Position = projectionMatrix * mv;
  }`;
const VEU_FRAG = `
  uniform float uTempo, uInt, uSuave, uSat;
  uniform vec3 uBase, uMeio, uPonta;
  varying float vLado; varying float vT;
  float hf(float x){ return fract(sin(x * 127.1) * 43758.5453); }
  float rf(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hf(i), hf(i + 1.0), f); }
  float fb(float x){ float a = 0.5, s = 0.0; for(int i = 0; i < 4; i++){ s += a * rf(x); a *= 0.5; x *= 2.07; } return s; }
  void main(){
    float b = pow(max(0.0, 1.0 - abs(vLado)), uSuave);
    b *= 0.62 + 0.62 * fb(vT * 11.0 - uTempo * 1.5);   // turbulência rolando
    b *= smoothstep(0.0, 0.035, vT);                   // nasce colado no planeta
    b *= 1.0 - smoothstep(0.42, 1.0, vT);              // dissipa, não termina em bico
    vec3 c = mix(uBase, uMeio, smoothstep(0.0, 0.34, vT));
    c = mix(c, uPonta, smoothstep(0.34, 0.85, vT));
    c = mix(vec3(dot(c, vec3(0.33))), c, uSat);        // saturação
    gl_FragColor = vec4(c, clamp(b, 0.0, 1.0) * uInt);
  }`;
// PARTÍCULAS: posição calculada 100% no vertex a partir de fract(tempo·vel + fase).
const PART_VERT = `
  attribute float fase, ang, rfrac, vmult, semente, tam;
  uniform float uTempo, uComp, uR0, uRmax, uEscala;
  varying float vT;
  void main(){
    float t = fract(uTempo * 0.085 * vmult + fase);
    vT = t;
    float d = uComp * pow(t, 0.84);
    float r = (uR0 + (uRmax - uR0) * pow(t, 0.70)) * rfrac;   // ABRE ao se afastar
    float a = ang + t * 1.5 * (semente - 0.5);
    vec3 p = vec3(d, cos(a) * r, sin(a) * r);
    p.y += sin(t * 8.4 + semente * 33.0) * r * 0.34;         // turbulência
    p.z += cos(t * 6.7 + semente * 21.0) * r * 0.34;
    p.x += sin(t * 5.1 + semente * 11.0) * uComp * 0.012;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp(tam * (1.0 + t * 3.4) * uEscala / max(1.0, -mv.z), 0.7, 16.0);
    gl_Position = projectionMatrix * mv;
  }`;
const PART_FRAG = `
  uniform sampler2D uMapa; uniform float uInt, uSat;
  uniform vec3 uBase, uMeio, uPonta;
  varying float vT;
  void main(){
    float al = texture2D(uMapa, gl_PointCoord).a;
    if(al < 0.01) discard;
    float vA = smoothstep(0.0, 0.035, vT) * pow(1.0 - vT, 1.35);
    vec3 c = mix(uBase, uMeio, smoothstep(0.0, 0.30, vT));
    c = mix(c, uPonta, smoothstep(0.30, 0.82, vT));
    c = mix(vec3(dot(c, vec3(0.33))), c, uSat);
    gl_FragColor = vec4(c, al * vA * uInt);
  }`;

interface PlumeRt { group: THREE.Group; veuMats: THREE.ShaderMaterial[]; partMat: THREE.ShaderMaterial }

// Cria a pluma de um sobrevivente (véu de 3 camadas + partículas), dimensionada ao
// planeta. Valores cravados no ponto CINEMA ~0,55 do protótipo. Começa invisível;
// a intensidade é dirigida por updatePlanets (plume 0..1 = time-gated).
function createPlume(size: number): PlumeRt {
  const group = new THREE.Group();
  const comp = size * 19, r0 = size * 0.75, rmax = size * 5.0, sat = 0.66;
  const veuMats: THREE.ShaderMaterial[] = [];
  const LAYERS: [number, number, number][] = [[1.0, 1.9, 0.30], [2.4, 1.15, 0.13], [4.6, 1.0, 0.055]]; // largMult, suave, intBase
  for (const [largMult, suave, intBase] of LAYERS) {
    const N = 64; const pos: number[] = [], lad: number[] = [], tv: number[] = [], idx: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      for (const s of [-1, 1]) { pos.push(0, 0, 0); lad.push(s); tv.push(t); }
      if (i < N - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('lado', new THREE.Float32BufferAttribute(lad, 1));
    g.setAttribute('tt', new THREE.Float32BufferAttribute(tv, 1));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTempo: { value: 0 }, uInt: { value: 0 }, uSuave: { value: suave }, uLargMult: { value: largMult }, uR0: { value: r0 }, uRmax: { value: rmax }, uComp: { value: comp }, uBase: { value: C_BASE.clone() }, uMeio: { value: C_MEIO.clone() }, uPonta: { value: C_PONTA.clone() }, uSat: { value: sat } },
      vertexShader: VEU_VERT, fragmentShader: VEU_FRAG,
    });
    m.userData.intBase = intBase;
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; group.add(mesh); veuMats.push(m);
  }
  // partículas
  const NP = 2400;
  const aFase = new Float32Array(NP), aAng = new Float32Array(NP), aRad = new Float32Array(NP), aVel = new Float32Array(NP), aSem = new Float32Array(NP), aTam = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    aFase[i] = Math.random(); aAng[i] = Math.random() * 6.283; aRad[i] = Math.pow(Math.random(), 0.62);
    aVel[i] = 0.55 + Math.pow(Math.random(), 1.7) * 1.15; aSem[i] = Math.random(); aTam[i] = 0.5 + Math.pow(Math.random(), 2.8) * 3.2;
  }
  const gp = new THREE.BufferGeometry();
  gp.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  gp.setAttribute('fase', new THREE.BufferAttribute(aFase, 1));
  gp.setAttribute('ang', new THREE.BufferAttribute(aAng, 1));
  gp.setAttribute('rfrac', new THREE.BufferAttribute(aRad, 1));
  gp.setAttribute('vmult', new THREE.BufferAttribute(aVel, 1));
  gp.setAttribute('semente', new THREE.BufferAttribute(aSem, 1));
  gp.setAttribute('tam', new THREE.BufferAttribute(aTam, 1));
  const partMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTempo: { value: 0 }, uComp: { value: comp }, uR0: { value: r0 }, uRmax: { value: rmax }, uEscala: { value: innerHeight * 0.9 }, uInt: { value: 0 }, uMapa: { value: plumeDot }, uBase: { value: C_BASE.clone() }, uMeio: { value: C_MEIO.clone() }, uPonta: { value: C_PONTA.clone() }, uSat: { value: sat } },
    vertexShader: PART_VERT, fragmentShader: PART_FRAG,
  });
  const pts = new THREE.Points(gp, partMat); pts.frustumCulled = false; group.add(pts);
  group.visible = false;
  return { group, veuMats, partMat };
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
    let planetRing: THREE.Mesh | null = null;
    let planetPlume: PlumeRt | null = null;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(surfTex ? 0xffffff : p.color) },
        uShin: { value: THREE.MathUtils.lerp(6, 90, 1 - p.rough) }, // menos rugoso -> glint concentrado
        uSpec: { value: 0.22 + p.metal * 0.9 },
        uAmbient: { value: 0.08 }, // piso p/ o lado escuro não sumir
        uIr: { value: 0 },
        uAfter: { value: 0 }, // pós-supernova: sobrevivente autoluminoso
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
      const rMesh = new THREE.Mesh(ringGeo, ringMat);
      rMesh.rotation.set(Math.PI / 2 - 0.45, 0, 0); // levemente inclinado
      body.add(rMesh);
      planetRing = rMesh;
    }
    // esfera invisível maior p/ facilitar o hover (planetas são pequenos)
    const pick = new THREE.Mesh(new THREE.SphereGeometry(Math.max(size * 4, 5), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.planetIndex = i;
    body.add(pick);
    planetPick.push(pick);
    const pivot = new THREE.Group(); // gira em Y -> órbita circular no plano XZ (eclíptica)
    pivot.add(body);
    solar.add(pivot);
    // pluma de ablação p/ os sobreviventes castigados (4 gigantes). Fica no pivot
    // (não gira com o corpo), na posição do planeta, apontando +X = radialmente p/
    // longe da estrela (anti-estelar). Invisível até o blast (dirigida por plume).
    if (['jupiter', 'saturno', 'urano', 'netuno'].includes(p.key)) {
      planetPlume = createPlume(size);
      planetPlume.group.position.x = r;
      pivot.add(planetPlume.group);
    }
    // Destruição por RADIAÇÃO (não pelo choque): só os rochosos têm energia de
    // ligação baixa o suficiente p/ desintegrar. Morrem na chegada da LUZ, em
    // sequência (tempo-luz ~ 8,32 min/UA, comprimido ×0.1): Mercúrio 0,32s ->
    // Vênus 0,60s -> Terra 0,83s -> Marte 1,26s. Gigantes/gelo/Plutão sobrevivem.
    const ROCKY = new Set(['mercurio', 'venus', 'terra', 'marte']);
    const destroyAt = ROCKY.has(p.key) ? 0.83 * p.au : Infinity;
    planets.push({ pivot, body, r, omega: ORBIT_SPEED_K / Math.pow(r, 1.5), angle: i * 2.399963, spin: 0.2 + (i % 3) * 0.12, key: p.key, size, pick, destroyAt, dead: false, deadT: 0, fx: null, irMats, ring: planetRing, plume: planetPlume });
  });

  return { planets, planetPick };
}

// Avança as órbitas (kepleriano) e a rotação própria; congela o planeta sob o
// cursor (planetHover) para leitura estável do card.
export function updatePlanets(planets: PlanetRt[], dt: number, planetHover: number, blastT = -1, ir = 0, after = 0, plume = 0, t = 0) {
  planets.forEach((p, i) => {
    for (const m of p.irMats) m.uniforms.uIr.value = ir; // tom infravermelho (Petrova)
    if (p.dead) { p.deadT += dt; animateBurst(p); return; } // destruído: só anima o burst
    if (blastT >= 0 && blastT >= p.destroyAt) { killPlanet(p); return; } // radiação chegou -> desintegra
    // sobreviventes: corpo autoluminoso (after, fica quente) + anéis somem +
    // PLUMA de ablação (plume) forte no blast que depois some aos poucos
    (p.body.material as THREE.ShaderMaterial).uniforms.uAfter.value = after;
    if (p.ring) p.ring.visible = after < 0.5; // anéis de gelo sublimam
    // pluma: intensidade time-gated (forte no blast, decai a zero). uInt por camada.
    if (p.plume) {
      const on = plume > 0.015;
      p.plume.group.visible = on;
      if (on) {
        for (const m of p.plume.veuMats) { m.uniforms.uTempo.value = t; m.uniforms.uInt.value = (m.userData.intBase as number) * plume * 1.7; }
        p.plume.partMat.uniforms.uTempo.value = t;
        p.plume.partMat.uniforms.uInt.value = plume * 1.15;
      }
    }
    if (i !== planetHover) p.angle += p.omega * dt;
    p.pivot.rotation.y = p.angle;
    p.body.rotation.y += p.spin * dt;
  });
}
