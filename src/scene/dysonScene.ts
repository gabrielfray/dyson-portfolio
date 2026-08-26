// Cena Esfera de Dyson — orquestrador: monta renderer/câmera/composer, agrega os
// submódulos (starfield, galaxies, sun, rings, planets), fia a interação e roda o
// loop de animação. Cada peça vive em seu próprio arquivo em scene/.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { DysonSceneApi, DysonSceneOptions } from './types';
import { createStarfield } from './starfield';
import { createGalaxies } from './galaxies';
import { createSun, SN_BLAST_AT, SN_REVIVE_BLAST } from './sun';
import { createDysonStructure, ud, SHELL_R } from './rings';
import { createPlanets, updatePlanets } from './planets';
import { createAnomalies } from './anomalies';

export type { Section, DysonSceneOptions, DysonSceneApi } from './types';

// Fumaça vermelha do modo IR: esfera BackSide (fundo). Ruído de valor 3D + domain
// warp amostrado no VETOR DE DIREÇÃO (sem costura/polos) -> filamentos enrolados.
const SMOKE_VERT = `varying vec3 vDir;
  void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SMOKE_FRAG = `precision highp float;
  uniform float uTime; uniform float uOpacity;
  varying vec3 vDir;
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float s = 0.0, a = 0.5; for(int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.0; a *= 0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir) * 3.0; d.x += uTime * 0.02;
    vec3 q = vec3(fbm(d), fbm(d + vec3(5.2,1.3,2.7)), fbm(d + vec3(1.7,9.2,4.4)));
    float n = fbm(d + 4.0 * q); // domain warp -> filamentos
    n = pow(clamp((n - 0.30) / 0.46, 0.0, 1.0), 1.25); // corta o vazio + alarga contraste
    vec3 c0 = vec3(0.04, 0.012, 0.06); // quase-preto arroxeado
    vec3 c1 = vec3(0.34, 0.03, 0.12);  // vinho
    vec3 c2 = vec3(0.92, 0.26, 0.46);  // rosa
    vec3 col = n < 0.5 ? mix(c0, c1, n / 0.5) : mix(c1, c2, (n - 0.5) / 0.5);
    gl_FragColor = vec4(col, n * uOpacity); }`;

export function initDysonScene(container: HTMLElement, opts: DysonSceneOptions = {}): DysonSceneApi {
  // O artefato original foi feito com three r147: color management desligado e
  // saída linear. A partir da r152 vem ligado com saída sRGB por padrão, o que
  // "lava" as cores. Replicamos o pipeline da r147 para bater com o design.
  THREE.ColorManagement.enabled = false;

  const isMobile = innerWidth <= 560; // ajustes só p/ celular (desktop/tablet inalterados)
  const scene = new THREE.Scene();
  const bgColor = new THREE.Color(0x000000);
  scene.background = bgColor;
  // FOV maior no mobile: enquadra mais a esfera de Dyson na tela estreita (retrato)
  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 45, innerWidth / innerHeight, 0.1, 4000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.style.touchAction = 'none'; // gestos (girar/pinça) sem rolar a página
  container.appendChild(renderer.domElement);

  // Conteúdo da cena (cada módulo se adiciona à scene e devolve seus handles).
  const stars = createStarfield(scene);
  const galaxies = createGalaxies(scene);
  const sun = createSun(scene, isMobile);
  const { dyson, shell, rings } = createDysonStructure(scene);
  // materiais da estrutura de Dyson — p/ vaporizar (fade) no pós-supernova
  const dysonMats: THREE.Material[] = [];
  [dyson, shell, ...rings].forEach((o) => o.traverse((n) => {
    const mm = (n as THREE.Mesh).material;
    if (mm) (Array.isArray(mm) ? mm : [mm]).forEach((m) => { m.transparent = true; dysonMats.push(m); });
  }));
  // Estilhaços da casca de Dyson: pedaços que voam pra fora e vaporizam no blast
  // da supernova. InstancedMesh de tetraedros aditivos.
  const FRAG_N = 360;
  const frags = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), FRAG_N);
  frags.frustumCulled = false; frags.visible = false; scene.add(frags);
  const fragMat = frags.material as THREE.MeshBasicMaterial;
  const fragDir: THREE.Vector3[] = [], fragSpd: number[] = [], fragAx: THREE.Vector3[] = [], fragSz: number[] = [];
  for (let i = 0; i < FRAG_N; i++) {
    fragDir.push(new THREE.Vector3().randomDirection());
    fragSpd.push(45 + Math.random() * 100);
    fragAx.push(new THREE.Vector3().randomDirection());
    fragSz.push(SHELL_R * (0.02 + Math.random() * 0.05));
  }
  const _fm = new THREE.Matrix4(), _fq = new THREE.Quaternion(), _fp = new THREE.Vector3(), _fsc = new THREE.Vector3();

  const { planets, planetPick } = createPlanets(scene);
  const { anomalies, update: updateAnomalies, trigger: triggerAnomaly } = createAnomalies(scene, camera);
  const anomalyPick = anomalies.map((a) => a.pick);

  // Campo de astrófagos: só existe no modo IR (astrophage não emite no visível).
  // Partículas fluindo por um cilindro grande, centrado na origem -> a câmera fica
  // DENTRO da linha de Petrova (não olhando de fora).
  const astroDot = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const cx = cv.getContext('2d')!;
    const gg = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gg.addColorStop(0, 'rgba(255,255,255,1)');
    gg.addColorStop(0.4, 'rgba(255,220,200,0.6)');
    gg.addColorStop(1, 'rgba(255,180,150,0)');
    cx.fillStyle = gg;
    cx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  // nuvem ESFÉRICA ao redor da cena -> preenche a tela toda (bokeh dos que ficam
  // perto + specks dos distantes, via sizeAttenuation). A nuvem gira bem devagar.
  const ASTRO_N = 9000;
  const astroPos = new Float32Array(ASTRO_N * 3), astroCol = new Float32Array(ASTRO_N * 3);
  const _ad = new THREE.Vector3();
  for (let i = 0; i < ASTRO_N; i++) {
    _ad.randomDirection();
    const r = 200 + Math.pow(Math.random(), 0.7) * 1600;
    astroPos[i * 3] = _ad.x * r; astroPos[i * 3 + 1] = _ad.y * r; astroPos[i * 3 + 2] = _ad.z * r;
    const tmp = Math.random(); // vermelho -> rosa
    astroCol[i * 3] = 1;
    astroCol[i * 3 + 1] = 0.22 + tmp * 0.42;
    astroCol[i * 3 + 2] = 0.28 + tmp * 0.4;
  }
  const astroGeo = new THREE.BufferGeometry();
  astroGeo.setAttribute('position', new THREE.BufferAttribute(astroPos, 3));
  astroGeo.setAttribute('color', new THREE.BufferAttribute(astroCol, 3));
  const astroMat = new THREE.PointsMaterial({ size: 7, map: astroDot, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const astro = new THREE.Points(astroGeo, astroMat);
  astro.visible = false;
  astro.frustumCulled = false;
  scene.add(astro);
  const updateAstro = (_t: number, ir: number) => {
    if (ir <= 0.02) { if (astro.visible) astro.visible = false; return; }
    astro.visible = true;
    astroMat.opacity = ir * 0.6;
    astro.rotation.y = _t * 0.012; // deriva bem lenta da nuvem toda
  };

  // Fumaça vermelha (fundo do modo IR): esfera BackSide seguindo a câmera (skybox,
  // sem parallax). É literalmente o fundo — sem depthWrite, resolução "infinita".
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG,
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false,
  });
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 32), smokeMat);
  smoke.renderOrder = -1;
  smoke.frustumCulled = false;
  smoke.visible = false;
  scene.add(smoke);
  const updateSmoke = (t: number, ir: number) => {
    if (ir <= 0.02) { if (smoke.visible) smoke.visible = false; return; }
    smoke.visible = true;
    smoke.position.copy(camera.position); // skybox: acompanha a câmera
    smokeMat.uniforms.uTime.value = t;
    smokeMat.uniforms.uOpacity.value = ir;
  };

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
  let anomalyHover = -1;
  let sunHover = false; // gigante azul (supernova) sob o cursor -> card
  // histerese do hover do gigante: sem folga, girar/mover na borda do núcleo faz o
  // hover piscar e REMONTA o card (typewriter reinicia = "duplicando/bugando").
  let sunOver = false; // o cursor está sobre o núcleo AGORA (último evento de move)
  let sunHoverGrace = 0; // s restantes antes de desligar o card após sair
  const SUN_HOVER_GRACE = 0.22;
  const clearSunHover = () => { if (sunHover) { sunHover = false; opts.onSunHover?.(false); } sunOver = false; sunHoverGrace = 0; };
  // controle manual: clicar no núcleo trava a rotação automática e libera o arraste
  let manual = false, dragging = false, moved = false;
  let downX = 0, downY = 0, lastX = 0, lastY = 0, manualPhi = 0;
  let coreClicks = 0, lastCoreClick = 0; // cliques seguidos no núcleo -> supernova
  const CORE_CLICKS_TO_DETONATE = 100; // cliques no núcleo p/ detonar a 1ª explosão
  const TEST_SKIP_PUZZLE = false; // false = enigma real (sequência das 5 anomalias na ordem certa)
  // Enigma "Contatos Imediatos": após a supernova, clicar os eggs na ordem do sinal
  // (cada egg = 1 tom). Ordem correta = índices 0..4 em sequência.
  const CONTACT_MAP: Record<string, number> = { voyager: 0, oumuamua: 1, monolith: 2, ufo: 3, hailmary: 4 };
  let contactProgress = 0, sunDeadFired = false, rebornFired = false;
  let plumeT = 0; // timer da pluma de ablação após a supernova (decai)
  let irStart = -1, irStopAt = -1; // modo infravermelho (véus / linha de Petrova)
  let irLocked = false; // enquanto travado, cliques não encerram o evento — só a música ao acabar
  const ESPECTRO = { drainDepth: 0.85, fade: 2.4, maxHold: 90 }; // drainDepth = profundidade do vale (0.93 ~ preto total); fade = saída suave; maxHold = segurança
  const startPetrova = () => { irStart = clock.getElapsedTime(); irStopAt = -1; irLocked = true; };
  // stop "leve": ignorado enquanto travado (o evento do Adrian roda até o fim)
  const stopPetrova = () => { if (irLocked) return; if (irStart >= 0 && irStopAt < 0) irStopAt = clock.getElapsedTime(); };
  // stop "forçado": encerra de fato (fim da música ou troca p/ outro easter egg)
  const endPetrova = () => { irLocked = false; if (irStart >= 0 && irStopAt < 0) irStopAt = clock.getElapsedTime(); };
  const smoothstep = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  // multi-touch: mapa de dedos ativos + estado da pinça (zoom)
  const pointers = new Map<number, { x: number; y: number }>();
  let pinching = false, pinchDist0 = 0, pinchZoom0 = 0;
  // alvo de clique no centro (invisível), dentro dos anéis
  const corePick = new THREE.Mesh(new THREE.SphereGeometry(20, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
  scene.add(corePick);

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
    renderer.domElement.style.cursor = i >= 0 ? 'pointer' : manual ? 'grab' : '';
    if (opts.onHover) opts.onHover(i >= 0 ? ud(rings[i]).section ?? null : null);
  }

  const clearPlanetHover = () => {
    if (planetHover >= 0) {
      planetHover = -1;
      opts.onPlanetHover?.(null);
    }
  };
  const clearAnomalyHover = () => {
    if (anomalyHover >= 0) {
      anomalyHover = -1;
      opts.onAnomalyHover?.(null);
    }
  };
  const onPointerMovePick = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinching && pointers.size >= 2) { // pinça (2 dedos) -> zoom
      const p = [...pointers.values()];
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      userZoom = Math.max(-18, Math.min(1150, pinchZoom0 + (pinchDist0 - d) * 2.2));
      moved = true;
      return;
    }
    // toque de 1 dedo que se move -> passa a girar (câmera livre também no mobile)
    if (!dragging && e.pointerType === 'touch' && pointers.size === 1 && lockedIdx < 0 &&
        Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) {
      dragging = true;
      manual = true;
      lastX = e.clientX;
      lastY = e.clientY;
      opts.onManual?.(true);
    }
    if (dragging) { // arrastando: gira a câmera
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camTheta -= dx * 0.005;
      manualPhi = Math.max(-1.0, Math.min(1.2, manualPhi + dy * 0.004));
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) moved = true;
      return;
    }
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    // gigante azul (supernova renascida): card ao passar por cima, como os planetas
    if (sun.state.reborn && raycaster.intersectObject(corePick, false).length) {
      sunOver = true; sunHoverGrace = SUN_HOVER_GRACE;
      if (!sunHover) { sunHover = true; opts.onSunHover?.(true); }
      clearPlanetHover(); clearAnomalyHover(); setHover(-1);
      renderer.domElement.style.cursor = 'pointer';
      return;
    }
    sunOver = false; // saiu do núcleo: a folga (grace) desliga o card no loop, sem piscar
    // planetas e anomalias (exploração) — só quando nenhuma seção está aberta
    if (lockedIdx < 0) {
      const ph = planetPick.length ? raycaster.intersectObjects(planetPick, false) : [];
      if (ph.length) {
        clearSunHover(); // entrou num planeta: encerra o card do gigante na hora (sem folga)
        const idx = ph[0].object.userData.planetIndex as number;
        if (planetHover !== idx) {
          planetHover = idx;
          opts.onPlanetHover?.(idx);
        }
        clearAnomalyHover();
        setHover(-1);
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
      clearPlanetHover();
      const ah = anomalyPick.length ? raycaster.intersectObjects(anomalyPick, false) : [];
      if (ah.length) {
        clearSunHover(); // entrou numa anomalia: encerra o card do gigante na hora
        const key = ah[0].object.userData.anomalyKey as string;
        const idx = anomalies.findIndex((a) => a.key === key);
        if (anomalyHover !== idx) {
          anomalyHover = idx;
          opts.onAnomalyHover?.(key);
        }
        setHover(-1);
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
      clearAnomalyHover();
    } else {
      clearPlanetHover();
      clearAnomalyHover();
    }
    // anéis (navegação)
    if (scrollP > 0.45 || !pickMeshes.length || lockedIdx >= 0) {
      setHover(-1);
      return;
    }
    const hits = raycaster.intersectObjects(pickMeshes, false);
    const ringIdx = hits.length ? (hits[0].object.userData.ringIndex as number) : -1;
    setHover(ringIdx);
    if (ringIdx < 0) { // núcleo clicável mostra cursor de ponteiro
      const core = raycaster.intersectObject(corePick, false);
      renderer.domElement.style.cursor = core.length ? 'pointer' : manual ? 'grab' : '';
    }
  };
  renderer.domElement.addEventListener('pointermove', onPointerMovePick);

  const onPointerDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    if (pointers.size === 2) { // 2 dedos -> inicia pinça (zoom), cancela arraste
      const p = [...pointers.values()];
      pinchDist0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      pinchZoom0 = userZoom;
      pinching = true;
      dragging = false;
      return;
    }
    if (manual) { // mouse em modo manual: já começa a arrastar
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinching = false;
    if (pointers.size === 0 && dragging) {
      dragging = false;
      renderer.domElement.style.cursor = manual ? 'grab' : '';
    }
  };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointerup', onPointerUp);
  addEventListener('pointercancel', onPointerUp);

  const onClickPick = (e: MouseEvent) => {
    if (moved) { moved = false; return; } // foi um arraste/pinça, não um clique
    // raycast a partir do ponto clicado (funciona no toque, que não tem hover)
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    if (lockedIdx < 0) {
      if (raycaster.intersectObject(corePick, false).length) { // clicou no núcleo
        // contador (invisível) de cliques seguidos; zera se parar por ~3s.
        // N cliques em sequência detonam a estrela (ver CORE_CLICKS_TO_DETONATE).
        const now = performance.now();
        coreClicks = now - lastCoreClick < 3000 ? coreClicks + 1 : 1;
        lastCoreClick = now;
        if (coreClicks === 1) { // toque/clique no núcleo alterna a câmera livre (mobile incluso)
          manual = !manual;
          manualPhi = 0;
          renderer.domElement.style.cursor = manual ? 'grab' : '';
          opts.onManual?.(manual);
        }
        // a supernova renascida não pode ser detonada de novo
        if (coreClicks >= CORE_CLICKS_TO_DETONATE && !sun.state.exploding && !sun.state.reviving && !sun.state.reborn) {
          sun.detonate(); coreClicks = 0; opts.onDetonate?.();
        }
        return;
      }
      // planeta -> revela o card (no toque não há hover)
      const ph = planetPick.length ? raycaster.intersectObjects(planetPick, false) : [];
      if (ph.length) {
        const idx = ph[0].object.userData.planetIndex as number;
        clearAnomalyHover();
        if (planetHover !== idx) { planetHover = idx; opts.onPlanetHover?.(idx); }
        return;
      }
      // anomalia -> revela o card + dispara o efeito sonoro
      const ah = anomalyPick.length ? raycaster.intersectObjects(anomalyPick, false) : [];
      if (ah.length) {
        const key = ah[0].object.userData.anomalyKey as string;
        // enigma dos 5 tons: só com o sol morto (antes de renascer). Cada egg toca
        // seu tom; reproduza o sinal do filme (voyager→oumuamua→monolith→ufo→hailmary).
        if (sun.state.dead && !sun.state.reviving && !sun.state.reborn) {
          if (TEST_SKIP_PUZZLE) { contactProgress = 0; sun.revive(); opts.onSupernova?.(); return; } // atalho de teste
          const toneIdx = CONTACT_MAP[key];
          if (toneIdx === undefined) { opts.onContactWrong?.(); contactProgress = 0; } // decoy -> reinicia
          else {
            opts.onContactTone?.(toneIdx);
            if (toneIdx === contactProgress) {
              contactProgress++;
              if (contactProgress >= 5) { contactProgress = 0; sun.revive(); opts.onSupernova?.(); }
            } else contactProgress = toneIdx === 0 ? 1 : 0; // fora de ordem -> recomeça (0 já reinicia a frase)
          }
          return; // durante o enigma o clique não abre card nem toca o som normal do egg
        }
        const idx = anomalies.findIndex((a) => a.key === key);
        clearPlanetHover();
        if (anomalyHover !== idx) { anomalyHover = idx; opts.onAnomalyHover?.(key); }
        opts.onAnomalyClick?.(key);
        triggerAnomaly(key); // efeito de cena (ex.: linha de Petrova do Hail Mary)
        if (key === 'hailmary') startPetrova(); // liga o modo IR (véus + Petrova)
        return;
      }
      // anel -> abre a seção
      if (scrollP <= 0.45 && pickMeshes.length) {
        const hits = raycaster.intersectObjects(pickMeshes, false);
        if (hits.length) {
          const ri = hits[0].object.userData.ringIndex as number;
          swoop = 1;
          opts.onSelect?.(ud(rings[ri]).section!, ri);
          return;
        }
      }
    }
    // tap no vazio: fecha os cards de planeta/anomalia
    clearPlanetHover();
    clearAnomalyHover();
  };
  renderer.domElement.addEventListener('click', onClickPick);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let bloomBase = opts.bloom != null ? opts.bloom : 1.0;
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), bloomBase, 0.85, 0.72);
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
    // zoom-in limitado (evita o bloom do sol estourar de perto); zoom-out bem amplo
    // p/ afastar até a borda e caçar os easter eggs (ficam a ~1400-1550 unid.)
    userZoom = Math.max(-18, Math.min(1150, userZoom + Math.sign(e.deltaY) * 16));
  };
  addEventListener('wheel', onWheel, { passive: true });

  const clock = new THREE.Clock();
  const projV = new THREE.Vector3(); // reutilizado p/ projetar planetas na tela
  let sx = 0, sy = 0;
  let camTheta = 0, lastT = 0;
  let alignTarget: number | null = null; // alvo p/ alinhar ao selecionar e voltar ao fechar
  let returnTheta = 0;                    // orientação a retomar quando o painel fecha
  let introDolly = 380;                   // câmera começa afastada (fly-in cinematográfico)
  let introActive = false;                // só recua depois que o usuário clica em "iniciar"
  let approaching = false;                // reiniciar (fase 1): mergulha na estrela (dolly in)
  let restartSpin = 0;                    // reiniciar: giro extra que decai até a rotação normal
  let rafId = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(t - lastT, 0.05); // clamp evita salto ao voltar de aba inativa
    lastT = t;

    // modo infravermelho (Hail Mary) — troca de detector com o "vale escuro":
    // tudo despenca (fundo do vale ~15% de brilho ~1,2s), e só DEPOIS a emissão
    // térmica (vermelho) sobe. É o vazio no meio que vira acontecimento.
    let ir = 0, drain = 0;
    if (irStart >= 0) {
      const e = t - irStart;
      const fall = smoothstep(0, 1.0, e);       // brilho cai até o fundo (~1s)
      const rise = smoothstep(1.2, 2.6, e);     // alivia depois do fundo
      const up = smoothstep(1.2, 2.4, e);       // emissão térmica sobe após o vale
      const down = irStopAt >= 0 ? smoothstep(irStopAt, irStopAt + ESPECTRO.fade, t) : 0; // saída suave
      drain = ESPECTRO.drainDepth * fall * (1 - rise * 0.82) * (1 - down);
      ir = up * (1 - down);
      if (irStopAt >= 0 && t >= irStopAt + ESPECTRO.fade) { irStart = -1; irStopAt = -1; irLocked = false; }
      else if (irStopAt < 0 && e > ESPECTRO.maxHold) { irStopAt = t; irLocked = false; } // segurança (música não terminou)
    }
    stars.update(t, ir);
    sun.update(t, dt, ir);
    if (sun.state.dead && !sunDeadFired) { sunDeadFired = true; opts.onSunDead?.(); } // rescaldo -> terminal
    if (sun.state.reborn && !rebornFired) { rebornFired = true; opts.onReborn?.(); } // gigante azul formada
    rings.forEach((r) => { ud(r).inner.rotation.y = t * ud(r).speed; });
    dyson.rotation.y = t * 0.02;
    shell.rotation.y = t * 0.015;
    // casca de Dyson INTEIRA durante a 1ª explosão e a carga; ela SE DESPEDAÇA no
    // BLAST da supernova (rt >= SN_REVIVE_BLAST): fade rápido + estilhaços voando.
    const shT = sun.state.reviving && sun.state.rt >= SN_REVIVE_BLAST ? sun.state.rt - SN_REVIVE_BLAST : (sun.state.reborn ? 99 : -1);
    const vap = sun.state.reborn ? 1 : (shT >= 0 ? smoothstep(0, 0.4, shT) : 0);
    if (vap > 0) {
      for (const m of dysonMats) m.opacity = 1 - vap;
      const on = vap < 0.995; dyson.visible = on; shell.visible = on; rings.forEach((r) => { r.visible = on; });
    }
    // estilhaços: voam pra fora, tombam e vaporizam (encolhem/somem) em ~3,4s
    if (shT >= 0 && shT < 3.4) {
      frags.visible = true;
      fragMat.opacity = smoothstep(0, 0.1, shT) * (1 - smoothstep(1.8, 3.4, shT)) * 0.95;
      const cool = Math.min(shT / 2, 1);
      fragMat.color.setRGB(1, 0.85 - 0.45 * cool, 0.6 - 0.45 * cool); // branco-quente -> laranja
      const vanish = smoothstep(0.9, 3.3, shT); // vaporiza (encolhe)
      for (let i = 0; i < FRAG_N; i++) {
        const d = fragDir[i], rr = SHELL_R + fragSpd[i] * shT;
        _fp.set(d.x * rr, d.y * rr, d.z * rr);
        _fq.setFromAxisAngle(fragAx[i], shT * (1.5 + (i % 3)));
        const s = fragSz[i] * (1 - vanish);
        _fsc.set(s, s, s);
        _fm.compose(_fp, _fq, _fsc);
        frags.setMatrixAt(i, _fm);
      }
      frags.instanceMatrix.needsUpdate = true;
    } else if (frags.visible) frags.visible = false;
    // sobreviventes: corpo autoluminoso (fica quente) + PLUMA de ablação forte no
    // blast que depois some aos poucos (só a pluma; os planetas continuam quentes)
    const after = sun.state.reborn ? 1 : (shT >= 0 ? smoothstep(0.8, 2.2, shT) : 0);
    let plume = 0;
    if (sun.state.reviving) plume = shT >= 0 ? smoothstep(0, 0.5, shT) : 0;
    else if (sun.state.reborn) { plumeT += dt; plume = Math.exp(-plumeT / 8); } // decai a ZERO em ~20s: pluma some de vez, planeta volta ao normal (só quente)
    const blastT = sun.state.exploding && sun.state.et > SN_BLAST_AT ? sun.state.et - SN_BLAST_AT : -1;
    updatePlanets(planets, dt, planetHover, blastT, ir, after, plume, t);
    updateAnomalies(t, userZoom, ir);
    updateSmoke(t, ir); // fumaça vermelha (fundo do modo IR)
    updateAstro(t, ir); // brilho de fundo (só no IR)
    galaxies.update(ir); // galáxias avermelhadas no modo IR
    // histerese do card do gigante: se o cursor saiu do núcleo, só desliga após a
    // folga (evita remontar o card e reiniciar o typewriter ao piscar na borda).
    if (sunHover && !sunOver) { sunHoverGrace -= dt; if (sunHoverGrace <= 0) { sunHover = false; opts.onSunHover?.(false); } }
    // rastreia na tela o objeto sob o cursor (planeta, anomalia OU a gigante azul)
    const tracked = planetHover >= 0 ? planets[planetHover].body : anomalyHover >= 0 ? anomalies[anomalyHover].body : null;
    if (sunHover && opts.onPlanetTrack) {
      projV.set(0, 0, 0).project(camera); // a estrela fica na origem
      const gx = (projV.x * 0.5 + 0.5) * innerWidth, gy = (-projV.y * 0.5 + 0.5) * innerHeight;
      opts.onPlanetTrack(gx, gy); // posiciona o retículo no gigante
      opts.onSunTrack?.(gx, gy);  // e o card segue o gigante (offset fixo, sem flip)
    } else if (tracked && opts.onPlanetTrack) {
      tracked.getWorldPosition(projV);
      projV.project(camera);
      opts.onPlanetTrack((projV.x * 0.5 + 0.5) * innerWidth, (-projV.y * 0.5 + 0.5) * innerHeight);
    }

    sx += (mouseX - sx) * 0.04;
    sy += (mouseY - sy) * 0.04;
    swoop *= 0.94;
    if (approaching) introDolly += (-130 - introDolly) * Math.min(1, dt * 4); // reiniciar: aproxima da estrela (dolly in)
    else if (introActive) introDolly *= 0.972; // fly-in / recuo suave até a distância padrão
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
    } else if (!manual) {
      camTheta += dt * 0.05 * (1 - focus * 0.85); // órbita automática (desligada no manual)
    }
    camTheta += dt * restartSpin;             // giro extra do reinício (some com o tempo)
    restartSpin *= Math.pow(0.5, dt / 1.6);   // decai suave até a rotação normal (meia-vida ~1,6s)
    const theta = camTheta + (manual ? 0 : sx * 0.35);
    // posição inicial afastada: enquadra a esfera inteira com folga. Ao focar,
    // um pequeno empurrão extra dá margem ao lado do painel aberto.
    const radius = 150 + scrollP * 90 + focus * 12 - swoop * 4 + userZoom * (1 - focus) + introDolly;
    const phi = Math.max(0.25, Math.min(2.75, 1.35 + (manual ? manualPhi : sy * 0.2)));
    camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(0, scrollP * -6, 0);
    // supernova: pico de bloom/exposição no flash + tremor de câmera
    const sState = sun.state;
    // drain = escurece tudo brevemente (troca de detector); ir = leve dim sustentado
    const dimMul = (1 - drain * 0.88) * (1 - ir * 0.15);
    bloom.strength = (bloomBase + sState.flash * 3.2) * (1 - drain * 0.9);
    renderer.toneMappingExposure = (1.1 + sState.flash * 1.6) * dimMul;
    if (sState.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * sState.shake * 9;
      camera.position.y += (Math.random() - 0.5) * sState.shake * 9;
      camera.position.z += (Math.random() - 0.5) * sState.shake * 9;
    }
    composer.render();
  }
  animate();

  return {
    setScroll(p: number) { scrollP = p; },
    setBloom(v: number) { bloomBase = v; },
    setFocus(f: number) { targetFocus = f; },
    startIntro() { introActive = true; },
    debugReborn() { sun.state.exploding = false; sun.state.reviving = false; sun.state.dead = false; sun.state.reborn = true; }, // dev (F2): pula pro gigante/terminal
    debugExplode() { sun.detonate(); }, // dev (F3): dispara a explosão do núcleo do sol (1ª)
    debugSupernova() { sun.state.dead = true; sun.revive(); }, // dev (F4): dispara o nascimento da gigante azul
    // reiniciar — fase 1 (cena atual): mergulha na estrela girando (atrás do clarão)
    approachStar() { approaching = true; introActive = false; restartSpin = 0.8; },
    // reiniciar — fase 2 (cena nova): começa colado na estrela e recua girando até normal
    startRestartIntro() { approaching = false; introDolly = -130; introActive = true; restartSpin = 1.0; },
    stopPetrova() { stopPetrova(); },
    endPetrova() { endPetrova(); },
    setLocked(i: number) {
      if (lockedIdx >= 0 && rings[lockedIdx]) {
        const m = ud(rings[lockedIdx]).mat;
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
        ud(rings[lockedIdx]).speed = ud(rings[lockedIdx]).baseSpeed;
      }
      lockedIdx = i;
      hovered = -1;
      if (i >= 0) { clearPlanetHover(); clearAnomalyHover(); } // some com cards ao abrir seção
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
        alignTarget = returnTheta; // volta com suavidade à orientação inicial
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
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      removeEventListener('pointerup', onPointerUp);
      removeEventListener('pointercancel', onPointerUp);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
