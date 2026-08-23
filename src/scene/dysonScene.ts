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
import { createSun } from './sun';
import { createDysonStructure, ud } from './rings';
import { createPlanets, updatePlanets } from './planets';
import { createAnomalies } from './anomalies';

export type { Section, DysonSceneOptions, DysonSceneApi } from './types';

export function initDysonScene(container: HTMLElement, opts: DysonSceneOptions = {}): DysonSceneApi {
  // O artefato original foi feito com three r147: color management desligado e
  // saída linear. A partir da r152 vem ligado com saída sRGB por padrão, o que
  // "lava" as cores. Replicamos o pipeline da r147 para bater com o design.
  THREE.ColorManagement.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 4000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Conteúdo da cena (cada módulo se adiciona à scene e devolve seus handles).
  const stars = createStarfield(scene);
  createGalaxies(scene);
  const sun = createSun(scene);
  const { dyson, shell, rings } = createDysonStructure(scene);
  const { planets, planetPick } = createPlanets(scene);
  const { anomalies, update: updateAnomalies } = createAnomalies(scene);
  const anomalyPick = anomalies.map((a) => a.pick);

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
  // controle manual: clicar no núcleo trava a rotação automática e libera o arraste
  let manual = false, dragging = false, moved = false;
  let downX = 0, downY = 0, lastX = 0, lastY = 0, manualPhi = 0;
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
    if (dragging) { // arrastando no modo manual: gira a câmera
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
    // planetas e anomalias (exploração) — só quando nenhuma seção está aberta
    if (lockedIdx < 0) {
      const ph = planetPick.length ? raycaster.intersectObjects(planetPick, false) : [];
      if (ph.length) {
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
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    if (manual) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    }
  };
  const onPointerUp = () => {
    if (dragging) {
      dragging = false;
      renderer.domElement.style.cursor = manual ? 'grab' : '';
    }
  };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointerup', onPointerUp);

  const onClickPick = () => {
    if (moved) { moved = false; return; } // foi um arraste, não um clique
    if (lockedIdx < 0) {
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(corePick, false).length) { // clicou no núcleo: alterna manual
        manual = !manual;
        manualPhi = 0;
        renderer.domElement.style.cursor = manual ? 'grab' : '';
        opts.onManual?.(manual);
        return;
      }
    }
    if (anomalyHover >= 0) { // clicou num easter egg -> efeito sonoro/etc.
      opts.onAnomalyClick?.(anomalies[anomalyHover].key);
      return;
    }
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
  let rafId = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(t - lastT, 0.05); // clamp evita salto ao voltar de aba inativa
    lastT = t;

    stars.update(t);
    sun.update(t);
    rings.forEach((r) => { ud(r).inner.rotation.y = t * ud(r).speed; });
    dyson.rotation.y = t * 0.02;
    shell.rotation.y = t * 0.015;
    updatePlanets(planets, dt, planetHover);
    updateAnomalies(t);
    // rastreia na tela o objeto sob o cursor (planeta OU anomalia)
    const tracked = planetHover >= 0 ? planets[planetHover].body : anomalyHover >= 0 ? anomalies[anomalyHover].body : null;
    if (tracked && opts.onPlanetTrack) {
      tracked.getWorldPosition(projV);
      projV.project(camera);
      opts.onPlanetTrack((projV.x * 0.5 + 0.5) * innerWidth, (-projV.y * 0.5 + 0.5) * innerHeight);
    }

    sx += (mouseX - sx) * 0.04;
    sy += (mouseY - sy) * 0.04;
    swoop *= 0.94;
    if (introActive) introDolly *= 0.972; // fly-in: recua suavemente até a distância padrão
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
    const theta = camTheta + (manual ? 0 : sx * 0.35);
    // posição inicial afastada: enquadra a esfera inteira com folga. Ao focar,
    // um pequeno empurrão extra dá margem ao lado do painel aberto.
    const radius = 150 + scrollP * 90 + focus * 12 - swoop * 4 + userZoom * (1 - focus) + introDolly;
    const phi = Math.max(0.25, Math.min(2.75, 1.35 + (manual ? manualPhi : sy * 0.2)));
    camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(0, scrollP * -6, 0);
    composer.render();
  }
  animate();

  return {
    setScroll(p: number) { scrollP = p; },
    setBloom(v: number) { bloom.strength = v; },
    setFocus(f: number) { targetFocus = f; },
    startIntro() { introActive = true; },
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
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
