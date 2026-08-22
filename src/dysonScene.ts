// Cena Esfera de Dyson — fundo vivo do portfólio.
// Portado do artefato original para um módulo TypeScript com imports do three.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
    new THREE.SphereGeometry(13, 64, 64),
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
          vec3 deep  = vec3(0.62, 0.28, 0.06);
          vec3 amber = vec3(0.95, 0.58, 0.14);
          vec3 gold  = vec3(1.0, 0.84, 0.42);
          vec3 core  = vec3(1.0, 0.97, 0.86);
          vec3 col = mix(deep, amber, plasma);
          col = mix(col, gold, fil*0.9);
          col = mix(col, core, pow(d, 5.0)*(0.55+0.45*plasma));
          float pulse = 1.0 + 0.05*sin(uTime*1.1);
          float a = (0.25 + 0.75*pow(d, 1.4))*(0.7+0.5*plasma)*pulse;
          gl_FragColor = vec4(col*(0.85+0.5*fil)*pulse, a);
        }`,
    }),
  );
  scene.add(glow);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
  scene.add(sun);

  function coronaTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,244,200,1)');
    gr.addColorStop(0.25, 'rgba(255,214,120,0.55)');
    gr.addColorStop(0.55, 'rgba(255,170,60,0.18)');
    gr.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const coronaMap = coronaTexture();
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.setScalar(SUN_R * 5);
  scene.add(corona);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.scale.setScalar(SUN_R * 13);
  scene.add(aura);

  const sunLight = new THREE.PointLight(0xffca70, 1600, 0, 2);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x0d0a06, 2));

  const dyson = new THREE.Group();
  scene.add(dyson);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

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
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xdedad0, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide });
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
  const ringConfigs: RingConfig[] = [
    { radius: 23, width: 1.6, segments: 36, gapChance: 0.1, tilt: 0.12, rotZ: 0.0, speed: 0.08 },
    { radius: 22.4, width: 1.3, segments: 34, gapChance: 0.15, tilt: 1.3, rotZ: 0.4, speed: -0.11 },
    { radius: 22.8, width: 1.4, segments: 34, gapChance: 0.12, tilt: 0.65, rotZ: -0.9, speed: 0.06 },
    { radius: 18, width: 1.2, segments: 30, gapChance: 0.2, tilt: 1.0, rotZ: 1.6, speed: -0.16 },
    { radius: 15, width: 1.0, segments: 26, gapChance: 0.22, tilt: 0.45, rotZ: 0.95, speed: 0.22 },
    { radius: 16.5, width: 1.1, segments: 28, gapChance: 0.2, tilt: 1.45, rotZ: -0.4, speed: -0.26 },
    { radius: 23.6, width: 1.0, segments: 40, gapChance: 0.28, tilt: 0.9, rotZ: 2.2, speed: 0.04 },
  ];
  ringConfigs.forEach((c) => {
    const r = makeRing(c);
    rings.push(r);
    dyson.add(r);
  });
  dyson.rotation.z = 0.15;

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

  function setHover(i: number) {
    if (hovered === i) return;
    if (hovered >= 0 && hovered !== lockedIdx) {
      const m = ud(rings[hovered]).mat;
      m.emissive.setHex(0x000000);
      m.emissiveIntensity = 0;
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

  const onPointerMovePick = (e: PointerEvent) => {
    if (scrollP > 0.45 || !pickMeshes.length || lockedIdx >= 0) {
      setHover(-1);
      return;
    }
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
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
    userZoom = Math.max(-18, Math.min(70, userZoom + Math.sign(e.deltaY) * 4));
  };
  addEventListener('wheel', onWheel, { passive: true });

  const clock = new THREE.Clock();
  let sx = 0, sy = 0;
  let rafId = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    starUniforms.uTime.value = t;
    (glow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    rings.forEach((r) => { ud(r).inner.rotation.y = t * ud(r).speed; });
    dyson.rotation.y = t * 0.02;
    sun.scale.setScalar(1 + Math.sin(t * 1.3) * 0.03);
    corona.scale.setScalar(SUN_R * 5 * (1 + Math.sin(t * 0.9) * 0.05));
    aura.scale.setScalar(SUN_R * 13 * (1 + Math.sin(t * 0.5) * 0.1));
    aura.material.opacity = 0.3 + 0.08 * Math.sin(t * 0.7);
    sx += (mouseX - sx) * 0.04;
    sy += (mouseY - sy) * 0.04;
    swoop *= 0.94;
    focus += (targetFocus - focus) * 0.07;
    const theta = t * 0.05 * (1 - focus * 0.75) + sx * 0.35;
    const radius = 66 + scrollP * 90 - swoop * 12 - focus * 9 + userZoom * (1 - focus);
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
      if (i >= 0 && rings[i]) {
        const m = ud(rings[i]).mat;
        m.emissive.setHex(0xffca70);
        m.emissiveIntensity = 1.1;
        ud(rings[i]).speed = ud(rings[i]).baseSpeed * 3;
        swoop = 1;
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
