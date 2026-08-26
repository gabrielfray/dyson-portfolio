import * as THREE from 'three';
import { GLOW_FRAG, GLOW_FRAG_MOBILE, GLOW_VERT } from './shaders';
import { createBirthFX, BIRTH_IGN } from './birthFX';

export const SUN_R = 6;
// Instante do BLAST (s após detonar) — coincide com o estouro do áudio
// (public/sounds/supernova.mp3, explosão em ~11,9s do clipe). Recortou o áudio?
// Ajuste este valor p/ o novo instante da explosão no clipe.
export const SN_BLAST_AT = 11.9;
// Supernova (2ª explosão, via revive): instante da IGNIÇÃO dentro do revive (s) —
// é quando a casca de Dyson se despedaça e o áudio estoura. = BIRTH_IGN · REVIVE_DUR.
export const SN_REVIVE_BLAST = 13.9;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

function radialTexture(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const coronaTexture = () => radialTexture([
  [0, 'rgba(255,236,180,1)'], [0.18, 'rgba(255,178,80,0.65)'],
  [0.38, 'rgba(255,130,30,0.18)'], [0.6, 'rgba(255,110,20,0)'], [1, 'rgba(255,110,20,0)'],
]);
const dotTexture = () => radialTexture([
  [0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,240,210,0.7)'], [1, 'rgba(255,240,210,0)'],
]);

// ---- Supernova realista (ejeta com Rayleigh-Taylor + cor por corpo negro) ----
const SN_NOISE = `
  float snhash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float snvn(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(snhash(i+vec3(0,0,0)),snhash(i+vec3(1,0,0)),f.x),mix(snhash(i+vec3(0,1,0)),snhash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(snhash(i+vec3(0,0,1)),snhash(i+vec3(1,0,1)),f.x),mix(snhash(i+vec3(0,1,1)),snhash(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float snfbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*snvn(p); p*=2.0; a*=0.5; } return s; }`;
// cor a partir da temperatura de corpo negro (aprox. Tanner Helland)
const SN_BLACKBODY = `
  vec3 bbody(float k){ k=clamp(k,1000.0,40000.0)/100.0; float r,g,b;
    if(k<=66.0)r=1.0; else { r=k-60.0; r=1.29293618606*pow(r,-0.1332047592); }
    if(k<=66.0){ g=k; g=0.39008157876*log(g)-0.63184144378; } else { g=k-60.0; g=1.12989086089*pow(g,-0.0755148492); }
    if(k>=66.0)b=1.0; else if(k<=19.0)b=0.0; else { b=k-10.0; b=0.54320678911*log(b)-1.19625408914; }
    return clamp(vec3(r,g,b),0.0,1.0); }`;
// ejeta: icosaedro deslocado no vertex por fbm 3D -> dedos/nós (Rayleigh-Taylor)
const EJECTA_VERT = `${SN_NOISE}
  uniform float uTime; uniform float uAmp; uniform float uScale;
  varying float vN2; varying vec3 vNorm; varying vec3 vView;
  void main(){ vec3 dir=normalize(position);
    float n=snfbm(dir*2.6 + uTime);
    float disp=1.0 + uAmp*(n-0.42);
    vec3 pos=dir*uScale*disp; vN2=n;
    vec4 mv=modelViewMatrix*vec4(pos,1.0); vNorm=normalize(normalMatrix*dir); vView=normalize(-mv.xyz);
    gl_Position=projectionMatrix*mv; }`;
const EJECTA_FRAG = `${SN_BLACKBODY}
  uniform float uTemp; uniform float uOpacity;
  varying float vN2; varying vec3 vNorm; varying vec3 vView;
  void main(){ vec3 col=bbody(uTemp);
    float rim=pow(1.0-max(dot(vNorm,vView),0.0),1.4);
    float knot=0.35+0.9*vN2;                 // nós/filamentos mais brilhantes
    gl_FragColor=vec4(col*knot*(0.5+0.9*rim), uOpacity*(0.35+0.65*vN2)); }`;
// Supernova (2ª explosão): onda de choque = casca FINA (Fresnel, só o limbo
// acende, não bolha cheia) que expande varrendo o espaço. Substitui o "campo".
const SHOCK_VERT = `varying vec3 vN; varying vec3 vV;
  void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz);
    gl_Position=projectionMatrix*mv; }`;
const SHOCK_FRAG = `uniform float uOpacity; uniform vec3 uColor;
  varying vec3 vN; varying vec3 vV;
  void main(){ float rim=pow(1.0-abs(dot(vN,vV)),3.2);
    gl_FragColor=vec4(uColor*(0.35+rim), rim*uOpacity); }`;
// Raios radiais: cada raio é um segmento (interno->externo) cuja posição é
// calculada 100% no vertex shader a partir de uProg (custo zero de CPU). Disparam
// pra todos os lados e esmaecem — o "raio de explosão que espalha pelo espaço".
const RAYS_VERT = `attribute vec3 aDir; attribute float aLen; attribute float aEnd;
  uniform float uProg; uniform float uR0; varying float vEnd;
  void main(){ vEnd=aEnd;
    float reach=uR0 + (aLen-uR0)*pow(uProg,0.6);
    float rr=mix(uR0*0.5, reach, aEnd);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(aDir*rr,1.0); }`;
const RAYS_FRAG = `uniform float uOpacity; uniform vec3 uColor; varying float vEnd;
  void main(){ float a=(1.0-vEnd)*uOpacity; gl_FragColor=vec4(uColor*(0.7+0.6*a), a); }`;

export interface SunState { exploding: boolean; et: number; flash: number; shake: number; dead: boolean; reviving: boolean; rt: number; reborn: boolean }

// Cria a estrela: núcleo de plasma (shader), disco brilhante, coronas/aura e as
// luzes da cena. Também prepara a supernova (casca + onda de choque + detritos),
// disparada por detonate(). O update anima pulso normal OU a explosão.
export function createSun(scene: THREE.Scene, isMobile = false): { update: (t: number, dt: number, ir?: number) => void; detonate: () => void; revive: () => void; state: SunState } {
  // No mobile, esfera menos subdividida + shader liso (sem fbm) p/ o plasma não
  // estourar em GPUs de celular. Desktop segue com a versão procedural completa.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(10, isMobile ? 32 : 64, isMobile ? 32 : 64),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uReborn: { value: 0 } }, vertexShader: GLOW_VERT,
      fragmentShader: isMobile ? GLOW_FRAG_MOBILE : GLOW_FRAG,
    }),
  );
  scene.add(glow);

  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8 });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), sunMat);
  scene.add(sun);

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

  const sunLight = new THREE.PointLight(0xfff4ea, 2400, 0, 2);
  scene.add(sunLight);
  const ambient = new THREE.AmbientLight(0x1a2836, 2.6);
  scene.add(ambient);
  const coolFill = new THREE.DirectionalLight(0x9fc4ff, 0.5);
  coolFill.position.set(-1, 0.6, 0.8);
  scene.add(coolFill);

  // ---------- Supernova (oculta até detonar) ----------
  // Casca de choque (esfera aditiva que infla e esmaece).
  const shellMat = new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), shellMat);
  shell.visible = false;
  scene.add(shell);

  // Onda de choque no plano (anel que se expande).
  const ringMat = new THREE.MeshBasicMaterial({ map: coronaTexture(), color: 0xffd8a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 96), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // Detritos: pontos ejetados radialmente, esfriando com o tempo.
  const N = 1600;
  const positions = new Float32Array(N * 3);
  const dirs = new Float32Array(N * 3);
  const speeds = new Float32Array(N);
  // nós de densidade (32% agrupados) + velocidade radial log-normal (dispersão real)
  const knots = Array.from({ length: 6 }, () => { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); return [r * Math.cos(th), u, r * Math.sin(th)] as [number, number, number]; });
  for (let i = 0; i < N; i++) {
    let dx: number, dy: number, dz: number;
    if (Math.random() < 0.32) { // agrupa perto de um nó
      const k = knots[(Math.random() * knots.length) | 0];
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u) * 0.34;
      dx = k[0] + r * Math.cos(th); dy = k[1] + u * 0.34; dz = k[2] + r * Math.sin(th);
      const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    } else {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      dx = r * Math.cos(th); dy = u; dz = r * Math.sin(th);
    }
    dirs[i * 3] = dx; dirs[i * 3 + 1] = dy; dirs[i * 3 + 2] = dz;
    const ln = Math.exp(-0.3 + 0.55 * (Math.random() + Math.random() + Math.random() - 1.5)); // log-normal ~0.4..1.8
    speeds[i] = 26 + ln * 70;
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // sizeAttenuation off: faíscas de tamanho fixo (não estouram ao cruzar a câmera)
  const ptsMat = new THREE.PointsMaterial({ size: 3, map: dotTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
  const points = new THREE.Points(ptsGeo, ptsMat);
  points.visible = false;
  scene.add(points);

  // Ejeta filamentar: icosaedro deslocado por fbm 3D (instabilidades de Rayleigh-
  // Taylor -> dedos e nós, não bola lisa). Cor por corpo negro (esfria = avermelha).
  const ejMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uAmp: { value: 0.9 }, uScale: { value: 1 }, uTemp: { value: 40000 }, uOpacity: { value: 0 } },
    vertexShader: EJECTA_VERT, fragmentShader: EJECTA_FRAG,
  });
  const ejecta = new THREE.Mesh(new THREE.IcosahedronGeometry(1, isMobile ? 4 : 5), ejMat);
  ejecta.frustumCulled = false; ejecta.visible = false;
  scene.add(ejecta);

  // ---- Supernova (2ª explosão): onda de choque fina + raios radiais ----
  const snShockMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0.74, 0.86, 1.0) } },
    vertexShader: SHOCK_VERT, fragmentShader: SHOCK_FRAG,
  });
  const snShock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), snShockMat);
  snShock.frustumCulled = false; snShock.visible = false;
  scene.add(snShock);

  const RAYN = isMobile ? 220 : 440;
  const rDir = new Float32Array(RAYN * 2 * 3), rLen = new Float32Array(RAYN * 2), rEnd = new Float32Array(RAYN * 2);
  for (let i = 0; i < RAYN; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(th), dy = u, dz = s * Math.sin(th);
    const len = 42 + Math.pow(Math.random(), 1.6) * 100; // alcance variado -> raios de comprimentos diferentes
    for (const e of [0, 1]) { const j = i * 2 + e; rDir[j * 3] = dx; rDir[j * 3 + 1] = dy; rDir[j * 3 + 2] = dz; rLen[j] = len; rEnd[j] = e; }
  }
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAYN * 2 * 3), 3)); // placeholder: o shader posiciona
  rGeo.setAttribute('aDir', new THREE.BufferAttribute(rDir, 3));
  rGeo.setAttribute('aLen', new THREE.BufferAttribute(rLen, 1));
  rGeo.setAttribute('aEnd', new THREE.BufferAttribute(rEnd, 1));
  const snRaysMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uProg: { value: 0 }, uR0: { value: SUN_R }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0.78, 0.88, 1.0) } },
    vertexShader: RAYS_VERT, fragmentShader: RAYS_FRAG,
  });
  const snRays = new THREE.LineSegments(rGeo, snRaysMat);
  snRays.frustumCulled = false; snRays.visible = false;
  scene.add(snRays);

  const state: SunState = { exploding: false, et: 0, flash: 0, shake: 0, dead: false, reviving: false, rt: 0, reborn: false };
  let rebornMix = 0; // 0 = sol dourado original · 1 = supernova azul renascida
  const glowMat = glow.material as THREE.ShaderMaterial;
  const REVIVE_DUR = 24.0; // câmera lenta: colapso (~0-14s) -> ignição -> emanação -> gigante (~24s)
  const birth = createBirthFX(scene, isMobile); // efeitos do nascimento (colapso/ignição/emanação)

  return {
    state,
    detonate: () => {
      if (state.exploding || state.reviving || state.reborn) return; // não redetona a supernova renascida
      state.exploding = true;
      state.et = 0;
    },
    // Renasce a estrela como supernova azul (enigma dos 5 tons resolvido).
    revive: () => {
      if (!state.dead || state.reviving) return;
      state.reviving = true;
      state.rt = 0;
      sun.visible = true;
      glow.visible = true;
    },
    update: (t, dt, ir = 0) => {
      glowMat.uniforms.uTime.value = t;
      glowMat.uniforms.uReborn.value = rebornMix;

      // ===== SEGUNDA explosão: a SUPERNOVA (após o enigma) -> gigante azul =====
      // Cinematográfica: CARGA (a brasa reacende azul, incha/pulsa e implode) ->
      // BLAST em SN_REVIVE_BLAST -> expansão da ejeta RT azul -> gigante azul.
      if (state.reviving) {
        state.rt += dt;
        const r = state.rt;
        const s = clamp01(r / REVIVE_DUR); // progresso 0..1 (câmera lenta)
        // efeitos do nascimento (colapso -> ignição -> emanação); retorna o clarão
        const flash = birth.update(s, t);
        state.flash = flash * 2.4;
        ejecta.visible = false; shell.visible = false; ring.visible = false; points.visible = false; snShock.visible = false; snRays.visible = false;
        // NÚCLEO = nosso modelo: brasa que colapsa -> reacende na ignição -> gigante
        rebornMix = smooth(BIRTH_IGN - 0.12, BIRTH_IGN + 0.02, s);
        sun.visible = true; glow.visible = true;
        if (s < BIRTH_IGN) {
          // COLAPSO: brasa azul-escura, pequena, comprime no fim (implode)
          const c = s / BIRTH_IGN, implode = smooth(0.82, 1.0, c);
          sun.scale.setScalar((0.09 + 0.10 * c) * (1 - implode * 0.7));
          sunMat.color.setRGB(0.24, 0.34, 0.62);
          sunLight.color.setRGB(0.5, 0.62, 1.0);
          sunLight.intensity = 120 + c * 500;
          glow.scale.setScalar(0.12 + c * 0.28);
          state.shake = c * 0.03;
        } else {
          // IGNIÇÃO + EMANAÇÃO: pico grande e depois ASSENTA no tamanho estável
          // (1,15/1,05) — sem pulo quando o revive acaba e o estado estável assume.
          const ema = smooth(BIRTH_IGN, 0.86, s);
          const settle = smooth(0.86, 1.0, s); // do pico -> tamanho estável
          sun.scale.setScalar(lerp(0.05, 1.4, ema) * lerp(1.0, 1.15 / 1.4, settle) * (1 + Math.sin(t * 8) * 0.03 * (1 - ema)));
          sunMat.color.setRGB(0.62, 0.78, 1.0);
          sunLight.color.setRGB(0.7, 0.82, 1.0);
          sunLight.intensity = 140 + flash * 7000 + ema * lerp(2600, 2760, settle);
          glow.scale.setScalar(lerp(0.3, 1.2, ema) * lerp(1.0, 1.05 / 1.2, settle));
          state.shake = Math.max(state.flash * 0.8, 0);
          rebornMix = 1;
        }
        if (r >= REVIVE_DUR) {
          state.reviving = false; state.exploding = false; state.dead = false; state.reborn = true;
          rebornMix = 1; birth.hide();
        }
        return;
      }

      if (!state.exploding) {
        if (state.reborn) rebornMix = 1; // invariante: renascido = azul pleno
        // paleta: dourado (rebornMix 0) -> supernova azul (rebornMix 1)
        const m = rebornMix;
        sun.scale.setScalar((1 + Math.sin(t * 1.3) * 0.03) * (1 - ir * 0.62) * (1 + m * 0.15));
        corona.scale.setScalar(SUN_R * 9 * (1 + Math.sin(t * 0.9) * 0.05));
        corona2.scale.setScalar(SUN_R * 4.5 * (1 + Math.sin(t * 1.4) * 0.06));
        aura.scale.setScalar(SUN_R * 13 * (1 + Math.sin(t * 0.5) * 0.08));
        aura.material.opacity = (0.38 + 0.08 * Math.sin(t * 0.7)) * (1 - ir) * (1 - m); // halo quente some no renascido
        // modo IR: o núcleo (estrela) apaga e as luzes migram p/ vermelho
        corona.material.opacity = (1 - ir) * (1 - m * 0.8);
        corona2.material.opacity = 0.85 * (1 - ir) * (1 - m * 0.8);
        glow.scale.setScalar(Math.max(0.05, 1 - ir * 0.85) * (1 + m * 0.05));
        // renascido: núcleo azul-branco pálido (#cfe0ff), não branco puro — cor
        // mais saturada no azul p/ o ACES/bloom não lavar tudo pra branco
        sunMat.color.setRGB(
          lerp(1 - 0.8 * ir, 0.52, m),
          lerp(0.945 - 0.85 * ir, 0.68, m),
          lerp(0.784 - 0.7 * ir, 1.0, m));
        sunLight.color.setRGB(lerp(1, 0.66, m), lerp(0.30 + 0.66 * (1 - ir), 0.82, m), lerp(0.20 + 0.72 * (1 - ir), 1.0, m));
        sunLight.intensity = 2400 * (1 - ir * 0.8) * (1 + m * 0.15); // renascido: brilho contido (não estoura)
        ambient.color.setRGB(0.10 + 0.16 * ir, 0.157 * (1 - ir) + m * 0.12, 0.212 * (1 - ir) + m * 0.25);
        coolFill.intensity = 0.5 * (1 - ir);
        return;
      }

      state.et += dt;
      const et = state.et;
      // Sincronizado com o áudio (public/sounds/supernova.mp3): a trilha prepara
      // por ~10,7s (carga), 1,2s de colapso e o BLAST cai em ~11,9s, exatamente
      // no estouro do clipe. Mexeu no corte do áudio? Ajuste BLAST_AT p/ o novo
      // instante da explosão no clipe.
      const COLLAPSE = 1.2, BLAST_AT = SN_BLAST_AT, CHARGE = BLAST_AT - COLLAPSE;
      const be = et - BLAST_AT; // tempo relativo ao blast (>=0 após explodir)
      state.flash = smooth(-0.05, 0.06, be) * (1 - smooth(0.1, 0.7, be)); // pico de luz no detonar

      if (et < CHARGE) {
        // carga: a estrela incha devagar, esquenta e vibra cada vez mais forte,
        // acompanhando a trilha subindo até o limite
        const k = smooth(0, CHARGE, et);
        const acc = k * k; // a violência se concentra no fim
        sun.scale.setScalar(1 + k * 0.8 + Math.sin(et * (6 + 30 * acc)) * 0.05 * acc);
        sunMat.color.setRGB(1, 1 - acc * 0.12, 0.78 + acc * 0.22);
        corona.scale.setScalar(SUN_R * 9 * (1 + k * 0.6));
        corona.material.opacity = 1 + acc * 0.6;
        corona2.material.opacity = 0.85 * (1 + acc * 0.3);
        aura.material.opacity = 0.38 + 0.25 * acc;
        sunLight.intensity = 2400 * (1 + acc * 1.6);
        state.shake = acc * 0.08;
      } else if (et < BLAST_AT) {
        // colapso: encolhe rápido e escurece (o silêncio antes do estouro)
        const k = smooth(CHARGE, BLAST_AT, et);
        sun.scale.setScalar(lerp(1.8, 0.08, k));
        sunLight.intensity = lerp(6200, 300, k);
        corona.material.opacity = lerp(1.6, 0, k);
        corona2.material.opacity = lerp(0.85, 0, k);
        aura.material.opacity = lerp(0.63, 0, k);
        state.shake = 0.02;
      } else {
        // detonação + blast — EXPLOSÃO NORMAL do sol (a supernova é outra, no revive).
        // A ejeta RT NÃO aparece aqui; fica só pra 2ª explosão (a supernova).
        glow.visible = false;
        const e2 = be;

        // casca de choque: infla rápido, passa pela câmera e esmaece logo
        shell.visible = true;
        const shellR = SUN_R * (0.4 + smooth(0, 1.9, e2) * 42); // ~ até 254
        shell.scale.setScalar(shellR);
        shellMat.opacity = smooth(0, 0.08, e2) * (1 - smooth(0.25, 1.7, e2)) * 0.95;
        shellMat.color.setRGB(1, lerp(1, 0.25, clamp01(e2 / 1.4)), lerp(0.92, 0.08, clamp01(e2 / 1.1)));

        // onda de choque (anel no plano)
        ring.visible = true;
        ring.scale.setScalar(shellR * 1.15);
        ringMat.opacity = smooth(0, 0.12, e2) * (1 - smooth(0.4, 2.0, e2)) * 0.85;
        ringMat.color.setRGB(1, 0.85, 0.63);

        // detritos ejetados, esfriando (branco -> laranja -> vermelho)
        points.visible = true;
        for (let i = 0; i < N; i++) {
          const d = SUN_R * 0.5 + speeds[i] * e2;
          positions[i * 3] = dirs[i * 3] * d;
          positions[i * 3 + 1] = dirs[i * 3 + 1] * d;
          positions[i * 3 + 2] = dirs[i * 3 + 2] * d;
        }
        ptsGeo.attributes.position.needsUpdate = true;
        ptsMat.opacity = 1 - smooth(1.4, 3.2, e2);
        ptsMat.color.setRGB(1, lerp(1, 0.3, clamp01(e2 / 1.5)), lerp(0.85, 0.1, clamp01(e2 / 1.2)));

        // luz: clarão imenso -> morre; sobra uma brasa avermelhada. Sistema MORTO;
        // a estrela só volta (gigante azul) via revive() do enigma (2ª explosão).
        if (e2 < 2) {
          sun.visible = false;
          sunLight.intensity = 300 + state.flash * 42000 + Math.max(0, 1 - smooth(0.2, 1.8, e2)) * 3000;
        } else {
          const rk = smooth(2, 3.2, e2);
          sun.visible = true;
          sun.scale.setScalar(0.16);
          sunMat.color.setRGB(0.3, 0.06, 0.04); // brasa vermelha (remanescente morto)
          sunLight.color.setRGB(1, 0.45, 0.32);
          sunLight.intensity = lerp(300, 45, rk);
        }

        state.shake = Math.max(state.flash, 0.3 * (1 - smooth(0, 1.0, e2)));
      }
      state.dead = et > BLAST_AT;
    },
  };
}
