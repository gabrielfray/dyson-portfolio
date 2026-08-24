import * as THREE from 'three';
import { STAR_FRAG, STAR_VERT } from './shaders';

type FillFn = (
  i: number,
  pos: Float32Array,
  col: Float32Array,
  size: Float32Array,
  phase: Float32Array,
  tw: Float32Array,
) => void;

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

// Cria as três camadas de estrelas (esfera próxima, esfera distante e um disco
// tipo "via láctea") e devolve um update que anima a cintilação por tempo.
export function createStarfield(scene: THREE.Scene): { update: (t: number, ir?: number) => void } {
  const starUniforms = { uTime: { value: 0 }, uMap: { value: starTexture() }, uIr: { value: 0 } };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
  });

  const buildStarGeo = (count: number, fill: FillFn) => {
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
  };

  const makeStars = (count: number, spread: number, baseSize: number) =>
    buildStarGeo(count, (i, pos, col, size, phase, tw) => {
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

  return { update: (t, ir = 0) => { starUniforms.uTime.value = t; starUniforms.uIr.value = ir; } };
}
