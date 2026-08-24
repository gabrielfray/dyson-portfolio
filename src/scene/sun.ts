import * as THREE from 'three';
import { GLOW_FRAG, GLOW_VERT } from './shaders';

export const SUN_R = 6;

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

export interface SunState { exploding: boolean; et: number; flash: number; shake: number; dead: boolean }

// Cria a estrela: núcleo de plasma (shader), disco brilhante, coronas/aura e as
// luzes da cena. Também prepara a supernova (casca + onda de choque + detritos),
// disparada por detonate(). O update anima pulso normal OU a explosão.
export function createSun(scene: THREE.Scene): { update: (t: number, dt: number, ir?: number) => void; detonate: () => void; state: SunState } {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } }, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
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
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    dirs[i * 3] = r * Math.cos(th);
    dirs[i * 3 + 1] = u;
    dirs[i * 3 + 2] = r * Math.sin(th);
    speeds[i] = 22 + Math.random() * 80;
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // sizeAttenuation off: faíscas de tamanho fixo (não estouram ao cruzar a câmera)
  const ptsMat = new THREE.PointsMaterial({ size: 3, map: dotTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
  const points = new THREE.Points(ptsGeo, ptsMat);
  points.visible = false;
  scene.add(points);

  const state: SunState = { exploding: false, et: 0, flash: 0, shake: 0, dead: false };

  return {
    state,
    detonate: () => {
      if (state.exploding) return;
      state.exploding = true;
      state.et = 0;
    },
    update: (t, dt, ir = 0) => {
      (glow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

      if (!state.exploding) {
        sun.scale.setScalar((1 + Math.sin(t * 1.3) * 0.03) * (1 - ir * 0.62));
        corona.scale.setScalar(SUN_R * 9 * (1 + Math.sin(t * 0.9) * 0.05));
        corona2.scale.setScalar(SUN_R * 4.5 * (1 + Math.sin(t * 1.4) * 0.06));
        aura.scale.setScalar(SUN_R * 13 * (1 + Math.sin(t * 0.5) * 0.08));
        aura.material.opacity = (0.38 + 0.08 * Math.sin(t * 0.7)) * (1 - ir);
        // modo IR: o núcleo (estrela) apaga e as luzes migram p/ vermelho
        corona.material.opacity = 1 - ir;
        corona2.material.opacity = 0.85 * (1 - ir);
        glow.scale.setScalar(Math.max(0.05, 1 - ir * 0.85));
        sunMat.color.setRGB(1 - 0.8 * ir, 0.945 - 0.85 * ir, 0.784 - 0.7 * ir);
        sunLight.color.setRGB(1, 0.30 + 0.66 * (1 - ir), 0.20 + 0.72 * (1 - ir));
        sunLight.intensity = 2400 * (1 - ir * 0.8);
        ambient.color.setRGB(0.10 + 0.16 * ir, 0.157 * (1 - ir), 0.212 * (1 - ir));
        coolFill.intensity = 0.5 * (1 - ir);
        return;
      }

      state.et += dt;
      const et = state.et;
      state.flash = smooth(2.05, 2.16, et) * (1 - smooth(2.2, 2.8, et)); // pico de luz no detonar

      if (et < 1.6) {
        // instabilidade: incha, esquenta (branco-azulado) e pulsa forte
        const k = smooth(0, 1.6, et);
        sun.scale.setScalar(1 + k * 0.8 + Math.sin(et * 22) * 0.06 * k);
        sunMat.color.setRGB(1, 1 - k * 0.12, 0.78 + k * 0.22);
        corona.scale.setScalar(SUN_R * 9 * (1 + k * 0.6));
        corona.material.opacity = 1 + k * 0.6;
        sunLight.intensity = 2400 * (1 + k * 1.6);
        state.shake = k * 0.08;
      } else if (et < 2.1) {
        // colapso: encolhe rápido e escurece (o silêncio antes do estouro)
        const k = smooth(1.6, 2.1, et);
        sun.scale.setScalar(lerp(1.8, 0.08, k));
        sunLight.intensity = lerp(6200, 300, k);
        corona.material.opacity = lerp(1.6, 0, k);
        corona2.material.opacity = lerp(0.85, 0, k);
        aura.material.opacity = lerp(0.38, 0, k);
        state.shake = 0.02;
      } else {
        // detonação + blast
        glow.visible = false;
        const e2 = et - 2.1;

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

        // luz: clarão imenso -> morre; sobra uma brasa avermelhada (remanescente)
        if (e2 < 2) {
          sun.visible = false;
          sunLight.intensity = 300 + state.flash * 42000 + Math.max(0, 1 - smooth(0.2, 1.8, e2)) * 3000;
        } else {
          const rk = smooth(2, 3.2, e2);
          sun.visible = true;
          sun.scale.setScalar(0.16);
          sunMat.color.setRGB(0.3, 0.06, 0.04); // brasa vermelha
          sunLight.color.setRGB(1, 0.45, 0.32);
          sunLight.intensity = lerp(300, 45, rk);
        }

        state.shake = Math.max(state.flash, 0.3 * (1 - smooth(0, 1.0, e2)));
      }
      state.dead = et > 2.1;
    },
  };
}
