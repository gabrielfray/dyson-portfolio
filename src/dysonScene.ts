// Cena Esfera de Dyson — fundo vivo do portfólio.
// Portado do artefato original para um módulo TypeScript com imports do three.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PLANETS } from './content';

// Shader dos planetas: ilumina a partir da origem (a estrela) — hemisfério aceso
// + reflexo especular do sol — de forma independente das luzes da cena, para não
// afetar a esfera/estrutura. cameraPosition/viewMatrix/modelMatrix são injetados
// automaticamente pelo ShaderMaterial do three.
const PLANET_VERT = `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const PLANET_FRAG = `
  uniform vec3 uColor;
  uniform float uShin;
  uniform float uSpec;
  uniform float uAmbient;
  uniform sampler2D uMap;   // faixas (gigantes) ou textura branca 1x1 (demais)
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vec3 albedo = uColor * texture2D(uMap, vUv).rgb;
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(-vWorldPos);              // luz vem da origem (o sol)
    float diff = max(dot(N, L), 0.0);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 H = normalize(L + V);
    float spec = (diff > 0.0 ? 1.0 : 0.0) * uSpec * pow(max(dot(N, H), 0.0), uShin);
    vec3 col = albedo * (uAmbient + diff) + vec3(spec);
    gl_FragColor = vec4(col, 1.0);
  }`;

// Borda atmosférica: casca ~6% maior, BackSide + aditivo, fresnel no limbo,
// realçada no lado iluminado pelo sol (limbo em "twilight"). É o que transforma
// a bolinha num mundo a 10-32px. Corpos sem ar (atmoI 0) não recebem casca.
const ATMO_FRAG = `
  uniform vec3 uAtmo;
  uniform float uI;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(-vWorldPos);
    float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float lit = max(dot(N, L), 0.0);
    gl_FragColor = vec4(uAtmo, f * uI * (0.25 + 0.9 * lit));
  }`;

// Anéis de Saturno com perfil radial real: anel C (tênue), B (denso/brilhante),
// lacuna de Cassini (transparente), anel A (médio). vN = raio normalizado 0..1.
const RING_VERT = `
  uniform float uInner;
  uniform float uOuter;
  varying float vN;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    float rad = length(position.xy);
    vN = (rad - uInner) / (uOuter - uInner);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const RING_FRAG = `
  uniform vec3 uColor;
  varying float vN;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  float dens(float n) {
    float a = 0.0;
    a += 0.32 * smoothstep(0.0, 0.04, n) * (1.0 - smoothstep(0.25, 0.30, n)); // anel C
    a += 0.90 * smoothstep(0.28, 0.33, n) * (1.0 - smoothstep(0.66, 0.70, n)); // anel B
    a += 0.60 * smoothstep(0.77, 0.81, n) * (1.0 - smoothstep(0.97, 1.0, n));  // anel A
    return clamp(a, 0.0, 1.0);
  }
  void main() {
    float op = dens(vN);
    if (op < 0.01) discard; // lacuna de Cassini some
    vec3 L = normalize(-vWorldPos);
    float lit = 0.45 + 0.55 * abs(dot(normalize(vWorldNormal), L));
    gl_FragColor = vec4(uColor * lit, op);
  }`;

export interface Section {
  id: string;
  pt: string;
  en: string;
}

export interface DysonSceneOptions {
  bloom?: number;
  sections?: Section[];
  onHover?: (section: Section | null) => void;
  onSelect?: (section: Section, index: number) => void;
  onPlanetHover?: (index: number | null) => void;
  onPlanetTrack?: (x: number, y: number) => void;
}

export interface DysonSceneApi {
  setScroll: (p: number) => void;
  setBloom: (v: number) => void;
  setFocus: (f: number) => void;
  setLocked: (i: number) => void;
  dispose: () => void;
}

interface RingConfig {
  radius: number;
  width: number;
  segments: number;
  gapChance: number;
  tilt: number;
  rotZ: number;
  speed: number;
}

export function initDysonScene(container: HTMLElement, opts: DysonSceneOptions = {}): DysonSceneApi {
  // O artefato original foi feito com three r147: color management desligado e
  // saída linear (outputEncoding = LinearEncoding). A partir da r152 o color
  // management vem ligado com saída sRGB por padrão, o que "lava" as cores e
  // muda o âmbar/dourado. Replicamos o pipeline da r147 para bater com o design.
  THREE.ColorManagement.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  function starTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.28)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(31, 6, 2, 52);
    ctx.fillRect(6, 31, 52, 2);
    return new THREE.CanvasTexture(c);
  }

  const STAR_COLORS: [number, number][] = [
    [0x9db4ff, 0.05], [0xaabfff, 0.08], [0xcad8ff, 0.14], [0xf8f7ff, 0.25],
    [0xfff4ea, 0.22], [0xffd2a1, 0.16], [0xffb56b, 0.1],
  ];
  function pickStarColor() {
    let r = Math.random();
    for (const [c, w] of STAR_COLORS) {
      if ((r -= w) <= 0) return new THREE.Color(c);
    }
    return new THREE.Color(0xfff4ea);
  }

  const starUniforms = { uTime: { value: 0 }, uMap: { value: starTexture() } };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `attribute float aSize; attribute float aPhase; attribute float aTw;
      varying vec3 vColor; varying float vTwinkle; uniform float uTime;
      void main(){ vColor = color;
        float tw = sin(uTime*(1.5+aTw*3.0)+aPhase)*0.5+0.5;
        vTwinkle = mix(1.0-aTw, 1.0, tw);
        vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = aSize*(300.0/-mv.z)*(0.85+0.3*tw);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D uMap; varying vec3 vColor; varying float vTwinkle;
      void main(){ vec4 tex = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vColor*vTwinkle, tex.a); }`,
  });

  type FillFn = (
    i: number,
    pos: Float32Array,
    col: Float32Array,
    size: Float32Array,
    phase: Float32Array,
    tw: Float32Array,
  ) => void;

  function buildStarGeo(count: number, fill: FillFn) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const size = new Float32Array(count), phase = new Float32Array(count), tw = new Float32Array(count);
    for (let i = 0; i < count; i++) fill(i, pos, col, size, phase, tw);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    return new THREE.Points(g, starMat);
  }

  function makeStars(count: number, spread: number, baseSize: number) {
    return buildStarGeo(count, (i, pos, col, size, phase, tw) => {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(spread * (0.55 + Math.random() * 0.45));
      pos.set([v.x, v.y, v.z], i * 3);
      const c = pickStarColor();
      const mag = Math.pow(Math.random(), 2.2);
      c.multiplyScalar(0.55 + mag * 0.9);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = baseSize * (0.8 + mag * 2.8);
      phase[i] = Math.random() * Math.PI * 2;
      tw[i] = 0.15 + Math.random() * 0.5;
    });
  }

  scene.add(makeStars(5000, 900, 2.2));
  scene.add(makeStars(3000, 600, 1.3));
  const mwQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.3, 0.5));
  scene.add(buildStarGeo(9000, (i, pos, col, size, phase, tw) => {
    const a = Math.random() * Math.PI * 2;
    const r = 700 + Math.random() * 250;
    const th = (Math.random() + Math.random() + Math.random() - 1.5) * 120;
    const v = new THREE.Vector3(Math.cos(a) * r, th, Math.sin(a) * r).applyQuaternion(mwQ);
    pos.set([v.x, v.y, v.z], i * 3);
    const c = pickStarColor().multiplyScalar(0.18 + Math.random() * 0.3);
    col.set([c.r, c.g, c.b], i * 3);
    size[i] = 0.8 + Math.random() * 1.3;
    phase[i] = Math.random() * Math.PI * 2;
    tw[i] = 0.1 + Math.random() * 0.2;
  }));

  const SUN_R = 6;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
          vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
          vP = normalize(position); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uTime;
        vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0*floor(p*ns.z*ns.z);
          vec4 x_ = floor(j*ns.z);
          vec4 y_ = floor(j - 7.0*x_);
          vec4 x = x_*ns.x + ns.yyyy;
          vec4 y = y_*ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m*m;
          return 42.0*dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        float fbm(vec3 p){ float f = 0.0, a = 0.5;
          for(int i=0;i<5;i++){ f += a*snoise(p); p *= 2.03; a *= 0.55; }
          return f; }
        void main(){
          float d = max(dot(normalize(vN), normalize(vV)), 0.0);
          vec3 q = vP*2.6;
          float n1 = fbm(q + uTime*0.12);
          float n2 = fbm(q*1.7 - uTime*0.18 + n1*1.5);
          float plasma = 0.5 + 0.5*n2;
          float fil = pow(1.0 - abs(n1), 3.0);
          vec3 deep  = vec3(0.85, 0.32, 0.04);
          vec3 amber = vec3(1.0, 0.52, 0.10);
          vec3 gold  = vec3(1.0, 0.72, 0.28);
          vec3 core  = vec3(1.0, 0.94, 0.78);
          vec3 col = mix(deep, amber, plasma);
          col = mix(col, gold, fil*0.9);
          col = mix(col, core, pow(d, 5.0)*(0.55+0.45*plasma));
          float pulse = 1.0 + 0.05*sin(uTime*1.1);
          float a = pow(d, 2.4)*(1.1+0.5*plasma)*pulse;
          gl_FragColor = vec4(col*(1.05+0.55*fil)*pulse, min(a,1.0));
        }`,
    }),
  );
  scene.add(glow);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }));
  scene.add(sun);

  // falloff acentuado: alpha zera bem antes da borda (fundo continua preto)
  function coronaTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,236,180,1)');
    gr.addColorStop(0.18, 'rgba(255,178,80,0.65)');
    gr.addColorStop(0.38, 'rgba(255,130,30,0.18)');
    gr.addColorStop(0.6, 'rgba(255,110,20,0)');
    gr.addColorStop(1, 'rgba(255,110,20,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const coronaMap = coronaTexture();
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.setScalar(SUN_R * 9);
  scene.add(corona);
  const corona2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona2.scale.setScalar(SUN_R * 4.5);
  scene.add(corona2);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.scale.setScalar(SUN_R * 13);
  scene.add(aura);

  // luz do sol quase branca (leve calor): mantém o sol dourado sem tingir de
  // laranja os painéis/anéis metálicos, que devem ler como prata/azul-aço
  const sunLight = new THREE.PointLight(0xfff4ea, 2400, 0, 2);
  scene.add(sunLight);
  // fill frio para reforçar o tom prateado/azulado da estrutura
  scene.add(new THREE.AmbientLight(0x1a2836, 2.6));
  const coolFill = new THREE.DirectionalLight(0x9fc4ff, 0.5);
  coolFill.position.set(-1, 0.6, 0.8);
  scene.add(coolFill);

  const dyson = new THREE.Group();
  scene.add(dyson);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  // ---------- Casca geodésica: treliça triangular + painéis translúcidos ----------
  const SHELL_R = 20;
  const shell = new THREE.Group();
  dyson.add(shell);
  const ico = new THREE.IcosahedronGeometry(SHELL_R, 2);
  const icoPos = ico.attributes.position;
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x1c2732, roughness: 0.8, metalness: 0.35 });
  const edgeMap = new Map<string, number>();
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  const vkey = (v: THREE.Vector3) => v.x.toFixed(2) + ',' + v.y.toFixed(2) + ',' + v.z.toFixed(2);
  for (let f = 0; f < icoPos.count; f += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(icoPos, f);
    const b = new THREE.Vector3().fromBufferAttribute(icoPos, f + 1);
    const c = new THREE.Vector3().fromBufferAttribute(icoPos, f + 2);
    ([[a, b], [b, c], [c, a]] as [THREE.Vector3, THREE.Vector3][]).forEach(([p, q]) => {
      const k = [vkey(p), vkey(q)].sort().join('|');
      if (!edgeMap.has(k)) {
        edgeMap.set(k, 1);
        edges.push([p.clone(), q.clone()]);
      }
    });
  }
  const struts = new THREE.InstancedMesh(boxGeo, strutMat, edges.length);
  {
    const dummy = new THREE.Object3D();
    const zAxis = new THREE.Vector3(0, 0, 1);
    edges.forEach(([p, q], i) => {
      const mid = p.clone().add(q).multiplyScalar(0.5);
      const dir = q.clone().sub(p);
      const len = dir.length();
      dummy.position.copy(mid);
      dummy.quaternion.setFromUnitVectors(zAxis, dir.normalize());
      dummy.scale.set(0.16, 0.16, len * 1.02);
      dummy.updateMatrix();
      struts.setMatrixAt(i, dummy.matrix);
    });
  }
  shell.add(struts);
  {
    const verts: number[] = [];
    for (let f = 0; f < icoPos.count; f += 3) {
      if (Math.random() > 0.62) continue;
      for (let j = 0; j < 3; j++) {
        const v = new THREE.Vector3().fromBufferAttribute(icoPos, f + j).multiplyScalar(0.985);
        verts.push(v.x, v.y, v.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x93a6b2, roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    shell.add(new THREE.Mesh(g, panelMat));
  }

  interface RingUserData {
    speed: number;
    inner: THREE.Group;
    mat: THREE.MeshStandardMaterial;
    mesh: THREE.InstancedMesh;
    baseSpeed: number;
    section?: Section;
  }

  function makeRing(cfg: RingConfig) {
    const { radius, width, segments, gapChance, tilt, rotZ, speed } = cfg;
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xcfdbe4, roughness: 0.22, metalness: 0.65, side: THREE.DoubleSide, emissive: 0xff9a3c, emissiveIntensity: 0.06 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x22303a, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide });
    const group = new THREE.Group();
    const arc = (Math.PI * 2) / segments;
    const segLen = radius * arc * 0.9;
    const idx: number[] = [];
    for (let i = 0; i < segments; i++) {
      if (Math.random() > gapChance) idx.push(i);
    }
    const inst = new THREE.InstancedMesh(boxGeo, ribbonMat, idx.length);
    const dummy = new THREE.Object3D();
    idx.forEach((i, k) => {
      const a = i * arc;
      dummy.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(0.15, width * (0.85 + Math.random() * 0.3), segLen);
      dummy.updateMatrix();
      inst.setMatrixAt(k, dummy.matrix);
    });
    group.add(inst);
    const win = new THREE.InstancedMesh(boxGeo, windowMat, idx.length);
    idx.forEach((i, k) => {
      const a = i * arc + (Math.random() - 0.5) * arc * 0.18;
      dummy.position.set(Math.cos(a) * radius * 1.004, (Math.random() - 0.5) * width * 0.3, Math.sin(a) * radius * 1.004);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(0.08, width * 0.4, segLen * 0.3);
      dummy.updateMatrix();
      win.setMatrixAt(k, dummy.matrix);
    });
    group.add(win);
    const pivot = new THREE.Group();
    pivot.rotation.x = tilt;
    pivot.rotation.z = rotZ;
    pivot.add(group);
    pivot.userData = { speed, inner: group, mat: ribbonMat, mesh: inst, baseSpeed: speed } as RingUserData;
    return pivot;
  }

  const rings: THREE.Group[] = [];
  const addRings = (configs: RingConfig[]) => {
    configs.forEach((c) => {
      const r = makeRing(c);
      rings.push(r);
      dyson.add(r);
    });
  };
  addRings([
    { radius: 26, width: 0.75, segments: 48, gapChance: 0.12, tilt: 0.15, rotZ: 0.0, speed: 0.1 },
    { radius: 28.5, width: 0.65, segments: 52, gapChance: 0.18, tilt: 1.25, rotZ: 0.4, speed: -0.13 },
    { radius: 31, width: 0.7, segments: 56, gapChance: 0.15, tilt: 0.62, rotZ: -0.9, speed: 0.08 },
    { radius: 27.5, width: 0.6, segments: 50, gapChance: 0.2, tilt: 1.0, rotZ: 1.6, speed: -0.17 },
    { radius: 33, width: 0.65, segments: 58, gapChance: 0.2, tilt: 0.45, rotZ: 0.95, speed: 0.12 },
    { radius: 29.7, width: 0.6, segments: 54, gapChance: 0.18, tilt: 1.45, rotZ: -0.4, speed: -0.2 },
  ]);
  // grandes anéis externos decorativos (arcos finos, como na referência)
  addRings([
    { radius: 42, width: 1.0, segments: 84, gapChance: 0.32, tilt: 1.35, rotZ: 0.5, speed: 0.03 },
    { radius: 50, width: 0.8, segments: 96, gapChance: 0.48, tilt: 0.28, rotZ: -0.3, speed: -0.02 },
  ]);
  dyson.rotation.z = 0.15;

  // ---------- Sistema solar: planetas orbitando a "estrela" (a esfera) ----------
  // Âncora de escala: casca = 1 UA = SHELL_R. As órbitas usam log10(UA) espalhado
  // num intervalo mais realista (o interno bem fora dos anéis; o externo alcançável
  // no zoom out). Corpos por (d/d_terra)^0.35 (via bodyPx) * escala de leitura.
  const AU_PX = 95;
  const PX_TO_WORLD = SHELL_R / AU_PX;
  const BODY_SCALE = 2.4; // ESCALA_CORPO: leitura dos corpos (1.0 = tabela exata)
  const ORBIT_INNER = 85; // raio de mundo do planeta mais interno (Mercúrio)
  const ORBIT_OUTER = 380; // raio de mundo do planeta mais externo (Netuno)
  const ORBIT_SPEED_K = 80; // ω = K / r^1.5 (kepleriano sobre os raios comprimidos)
  const logMin = Math.log10(PLANETS[0].au);
  const logMax = Math.log10(PLANETS[PLANETS.length - 1].au);
  const solar = new THREE.Group();
  scene.add(solar);
  interface PlanetRt {
    pivot: THREE.Group;
    body: THREE.Mesh;
    r: number;
    omega: number;
    angle: number;
    spin: number;
  }
  const planets: PlanetRt[] = [];
  const planetPick: THREE.Mesh[] = [];
  // textura branca 1x1 (planetas sem faixa) + gerador de faixas (gigantes gasosos)
  const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  whiteTex.needsUpdate = true;
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
  // Superfícies procedurais (equirretangular 512x256) p/ os rochosos. A cor vai
  // na textura (uColor = branco). Blobs em gradiente radial, com wrap horizontal
  // p/ evitar emenda na longitude.
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const splat = (ctx: CanvasRenderingContext2D, w: number, x: number, y: number, rad: number, col: number, a: number) => {
    const c = new THREE.Color(col);
    const rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
    for (const dx of [0, -w, w]) {
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
  const planetTexture = (key: string) => {
    if (key === 'jupiter') return makeBandTexture(0xe8dcc0, 0x9c7850);
    if (key === 'saturno') return makeBandTexture(0xe0d2a0, 0xb09860);
    if (key === 'mercurio') {
      return makeSurface(0x7d746a, (ctx, w, h) => {
        for (let i = 0; i < 44; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(30, 95), Math.random() < 0.5 ? 0x645c53 : 0x928779, rnd(0.15, 0.35)); // manchas regionais
        for (let i = 0; i < 130; i++) { // crateras: sombra + rebordo claro
          const x = rnd(0, w), y = rnd(0, h), rr = rnd(2, 9);
          splat(ctx, w, x, y, rr * 1.4, 0x50493f, rnd(0.3, 0.6));
          splat(ctx, w, x - rr * 0.3, y - rr * 0.3, rr * 0.7, 0x9c9184, rnd(0.2, 0.45));
        }
      });
    }
    if (key === 'venus') {
      return makeSurface(0xe9ddb6, (ctx, w, h) => {
        for (let i = 0; i < 70; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(40, 120), Math.random() < 0.5 ? 0xf5efd2 : 0xd6c495, rnd(0.12, 0.28)); // redemoinhos de nuvens
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
      return makeSurface(0xa77c4e, (ctx, w, h) => {
        for (let i = 0; i < 55; i++) splat(ctx, w, rnd(0, w), rnd(0, h), rnd(28, 92), Math.random() < 0.5 ? 0x6d5030 : 0xc59b68, rnd(0.2, 0.45)); // regiões de albedo
        for (let i = 0; i < 9; i++) { // calotas polares
          splat(ctx, w, rnd(0, w), rnd(0, h * 0.1), rnd(26, 56), 0xf3eee7, rnd(0.4, 0.7));
          splat(ctx, w, rnd(0, w), rnd(h * 0.9, h), rnd(26, 56), 0xf3eee7, rnd(0.4, 0.7));
        }
      });
    }
    return null;
  };
  PLANETS.forEach((p, i) => {
    const norm = (Math.log10(p.au) - logMin) / (logMax - logMin);
    const r = ORBIT_INNER + (ORBIT_OUTER - ORBIT_INNER) * norm;
    const size = p.bodyPx * BODY_SCALE * PX_TO_WORLD;
    // textura de superfície (rochosos) ou faixas (gigantes): cor vai na textura,
    // uColor = branco. Urano/Netuno seguem cor sólida (uMap branco 1x1).
    const surfTex = planetTexture(p.key);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(surfTex ? 0xffffff : p.color) },
        uShin: { value: THREE.MathUtils.lerp(6, 90, 1 - p.rough) }, // menos rugoso -> glint concentrado
        uSpec: { value: 0.22 + p.metal * 0.9 },
        uAmbient: { value: 0.08 }, // piso p/ o lado escuro não sumir
        uMap: { value: surfTex ?? whiteTex },
      },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 32), mat);
    body.position.x = r; // luz vem da origem: a fase iluminada aponta p/ a estrela
    if (p.atmoI > 0) {
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: { uAtmo: { value: new THREE.Color(p.atmo) }, uI: { value: p.atmoI } },
        vertexShader: PLANET_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });
      body.add(new THREE.Mesh(new THREE.SphereGeometry(size * 1.06, 32, 32), atmoMat));
    }
    if (p.ring) {
      // proporções reais (em raios de Saturno): C 1.24, B 1.53, Cassini 1.95–2.03, A 2.27
      const rIn = size * 1.24, rOut = size * 2.27;
      const ringGeo = new THREE.RingGeometry(rIn, rOut, 128, 8);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0xd8c79a) }, uInner: { value: rIn }, uOuter: { value: rOut } },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
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
    planets.push({ pivot, body, r, omega: ORBIT_SPEED_K / Math.pow(r, 1.5), angle: i * 2.399963, spin: 0.2 + (i % 3) * 0.12 });
  });

  const ud = (r: THREE.Group) => r.userData as RingUserData;

  // ---------- Interatividade: anéis como portais de navegação ----------
  const sections = opts.sections || [];
  const pickMeshes: THREE.InstancedMesh[] = [];
  rings.forEach((r, i) => {
    if (i < sections.length) {
      ud(r).section = sections[i];
      ud(r).mesh.userData.ringIndex = i;
      pickMeshes.push(ud(r).mesh);
    }
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = -1, swoop = 0, lockedIdx = -1, focus = 0, targetFocus = 0;
  let planetHover = -1;

  function setHover(i: number) {
    if (hovered === i) return;
    if (hovered >= 0 && hovered !== lockedIdx) {
      const m = ud(rings[hovered]).mat;
      m.emissive.setHex(0xff9a3c);
      m.emissiveIntensity = 0.06;
      ud(rings[hovered]).speed = ud(rings[hovered]).baseSpeed;
    }
    hovered = i;
    if (i >= 0) {
      const m = ud(rings[i]).mat;
      m.emissive.setHex(0xffca70);
      m.emissiveIntensity = 0.9;
      ud(rings[i]).speed = ud(rings[i]).baseSpeed * 4;
    }
    renderer.domElement.style.cursor = i >= 0 ? 'pointer' : '';
    if (opts.onHover) opts.onHover(i >= 0 ? ud(rings[i]).section ?? null : null);
  }

  const clearPlanetHover = () => {
    if (planetHover >= 0) {
      planetHover = -1;
      opts.onPlanetHover?.(null);
    }
  };
  const onPointerMovePick = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    // planetas (exploração) — só quando nenhuma seção está aberta
    if (lockedIdx < 0 && planetPick.length) {
      const ph = raycaster.intersectObjects(planetPick, false);
      if (ph.length) {
        const idx = ph[0].object.userData.planetIndex as number;
        if (planetHover !== idx) {
          planetHover = idx;
          opts.onPlanetHover?.(idx);
        }
        setHover(-1);
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
    clearPlanetHover();
    // anéis (navegação) — lógica original
    if (scrollP > 0.45 || !pickMeshes.length || lockedIdx >= 0) {
      setHover(-1);
      return;
    }
    const hits = raycaster.intersectObjects(pickMeshes, false);
    setHover(hits.length ? (hits[0].object.userData.ringIndex as number) : -1);
  };
  renderer.domElement.addEventListener('pointermove', onPointerMovePick);

  const onClickPick = () => {
    if (hovered >= 0 && scrollP <= 0.45 && lockedIdx < 0) {
      swoop = 1;
      if (opts.onSelect) opts.onSelect(ud(rings[hovered]).section!, hovered);
    }
  };
  renderer.domElement.addEventListener('click', onClickPick);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), opts.bloom != null ? opts.bloom : 1.0, 0.85, 0.72);
  composer.addPass(bloom);

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', onResize);

  // interação: parallax de mouse + recuo com scroll
  let mouseX = 0, mouseY = 0, scrollP = 0, userZoom = 0;
  const onPointerMoveParallax = (e: PointerEvent) => {
    mouseX = (e.clientX / innerWidth - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener('pointermove', onPointerMoveParallax);
  const onWheel = (e: WheelEvent) => {
    if (lockedIdx >= 0) return; // painel aberto: wheel rola o painel
    // zoom-in limitado (evita o bloom do sol estourar de perto); zoom-out amplo
    // p/ afastar até ver todo o sistema solar (Netuno ~380 unid.)
    userZoom = Math.max(-18, Math.min(420, userZoom + Math.sign(e.deltaY) * 14));
  };
  addEventListener('wheel', onWheel, { passive: true });

  const clock = new THREE.Clock();
  const projV = new THREE.Vector3(); // reutilizado p/ projetar planetas na tela
  let sx = 0, sy = 0;
  let camTheta = 0, lastT = 0;
  let alignTarget: number | null = null; // alvo p/ alinhar ao selecionar e voltar ao fechar
  let returnTheta = 0;                    // orientação a retomar quando o painel fecha
  let rafId = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(t - lastT, 0.05); // clamp evita salto ao voltar de aba inativa
    lastT = t;
    starUniforms.uTime.value = t;
    (glow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    rings.forEach((r) => { ud(r).inner.rotation.y = t * ud(r).speed; });
    dyson.rotation.y = t * 0.02;
    shell.rotation.y = t * 0.015;
    planets.forEach((p, i) => {
      if (i !== planetHover) p.angle += p.omega * dt; // congela o planeta sob o cursor
      p.pivot.rotation.y = p.angle; // órbita kepleriana no plano da eclíptica
      p.body.rotation.y += p.spin * dt; // rotação do próprio planeta
    });
    if (planetHover >= 0 && opts.onPlanetTrack) {
      planets[planetHover].body.getWorldPosition(projV);
      projV.project(camera);
      opts.onPlanetTrack((projV.x * 0.5 + 0.5) * innerWidth, (-projV.y * 0.5 + 0.5) * innerHeight);
    }
    sun.scale.setScalar(1 + Math.sin(t * 1.3) * 0.03);
    corona.scale.setScalar(SUN_R * 9 * (1 + Math.sin(t * 0.9) * 0.05));
    corona2.scale.setScalar(SUN_R * 4.5 * (1 + Math.sin(t * 1.4) * 0.06));
    aura.scale.setScalar(SUN_R * 13 * (1 + Math.sin(t * 0.5) * 0.08));
    aura.material.opacity = 0.38 + 0.08 * Math.sin(t * 0.7);
    sx += (mouseX - sx) * 0.04;
    sy += (mouseY - sy) * 0.04;
    swoop *= 0.94;
    focus += (targetFocus - focus) * 0.06;
    // Rotação da câmera:
    // - com um anel selecionado (ou voltando ao fechar), gira suavemente até um
    //   ângulo alvo e fica ali (alinhada);
    // - sem seleção, órbita livre acumulando o ângulo (sem giro brusco ao focar).
    if (alignTarget !== null) {
      camTheta += (alignTarget - camTheta) * 0.02;
      if (lockedIdx < 0 && Math.abs(alignTarget - camTheta) < 0.002) {
        camTheta = alignTarget;
        alignTarget = null; // voltou à posição inicial: retoma a órbita livre
      }
    } else {
      camTheta += dt * 0.05 * (1 - focus * 0.85);
    }
    const theta = camTheta + sx * 0.35;
    // posição inicial afastada: enquadra a esfera inteira com folga. Ao focar,
    // um pequeno empurrão extra dá margem ao lado do painel aberto.
    const radius = 150 + scrollP * 90 + focus * 12 - swoop * 4 + userZoom * (1 - focus);
    const phi = 1.35 + sy * 0.2;
    camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(0, scrollP * -6, 0);
    composer.render();
  }
  animate();

  return {
    setScroll(p: number) { scrollP = p; },
    setBloom(v: number) { bloom.strength = v; },
    setFocus(f: number) { targetFocus = f; },
    setLocked(i: number) {
      if (lockedIdx >= 0 && rings[lockedIdx]) {
        const m = ud(rings[lockedIdx]).mat;
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
        ud(rings[lockedIdx]).speed = ud(rings[lockedIdx]).baseSpeed;
      }
      lockedIdx = i;
      hovered = -1;
      if (i >= 0) clearPlanetHover(); // some com o painel do planeta ao abrir seção
      if (i >= 0 && rings[i]) {
        const m = ud(rings[i]).mat;
        m.emissive.setHex(0xffca70);
        m.emissiveIntensity = 1.1;
        ud(rings[i]).speed = ud(rings[i]).baseSpeed * 3;
        swoop = 1;
        // gira suavemente até o ângulo de alinhamento deste anel (caminho mais curto)
        returnTheta = camTheta;
        const TWO_PI = Math.PI * 2;
        const target = (TWO_PI / 6) * i;
        let d = (((target - camTheta) % TWO_PI) + TWO_PI) % TWO_PI;
        if (d > Math.PI) d -= TWO_PI;
        alignTarget = camTheta + d;
      } else {
        // volta com suavidade à orientação inicial
        alignTarget = returnTheta;
      }
      renderer.domElement.style.cursor = '';
    },
    dispose() {
      cancelAnimationFrame(rafId);
      removeEventListener('resize', onResize);
      removeEventListener('pointermove', onPointerMoveParallax);
      removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('pointermove', onPointerMovePick);
      renderer.domElement.removeEventListener('click', onClickPick);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
