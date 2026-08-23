import * as THREE from 'three';
import type { Section } from './types';

export const SHELL_R = 20; // raio da casca geodésica (âncora de escala do sistema)

export interface RingConfig {
  radius: number;
  width: number;
  segments: number;
  gapChance: number;
  tilt: number;
  rotZ: number;
  speed: number;
}

export interface RingUserData {
  speed: number;
  inner: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  mesh: THREE.InstancedMesh;
  baseSpeed: number;
  section?: Section;
}

export const ud = (r: THREE.Group) => r.userData as RingUserData;

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

// Casca geodésica: treliça triangular (arestas do icosaedro, instanciadas) +
// painéis translúcidos amostrados aleatoriamente.
function buildShell(parent: THREE.Group) {
  const shell = new THREE.Group();
  parent.add(shell);
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
  shell.add(struts);

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
  return shell;
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

// Monta a Esfera de Dyson: casca geodésica + anéis (interativos internos e
// grandes arcos externos decorativos). Devolve os grupos p/ animação/interação.
export function createDysonStructure(scene: THREE.Scene): {
  dyson: THREE.Group;
  shell: THREE.Group;
  rings: THREE.Group[];
} {
  const dyson = new THREE.Group();
  scene.add(dyson);
  const shell = buildShell(dyson);

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

  return { dyson, shell, rings };
}
