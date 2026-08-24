import * as THREE from 'three';

// Textura procedural de galáxia: núcleo brilhante + halo do disco + braços
// espirais com estrelas azuis/brancas e regiões HII rosadas.
function makeGalaxyTexture(arms: number, turns: number) {
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const cx = s / 2, cy = s / 2;
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.15); // núcleo
  g.addColorStop(0, 'rgba(255,250,238,0.95)');
  g.addColorStop(0.4, 'rgba(255,236,206,0.5)');
  g.addColorStop(1, 'rgba(255,226,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5); // halo do disco
  g.addColorStop(0, 'rgba(180,200,255,0.16)');
  g.addColorStop(0.6, 'rgba(150,175,255,0.05)');
  g.addColorStop(1, 'rgba(120,150,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  for (let a = 0; a < arms; a++) { // braços espirais
    const off = (a / arms) * Math.PI * 2;
    for (let i = 0; i < 1600; i++) {
      const t = i / 1600;
      const ang = off + t * turns * Math.PI * 2;
      const rad = t * s * 0.46;
      const sp = ((1 - t) * 6 + 2) * 4;
      const x = cx + Math.cos(ang) * rad + (Math.random() - 0.5) * sp;
      const y = cy + Math.sin(ang) * rad + (Math.random() - 0.5) * sp;
      const br = (1 - t) * 0.9;
      const rr = Math.random();
      ctx.fillStyle = rr < 0.1 ? `rgba(255,180,210,${0.5 * br})` // HII rosada
        : rr < 0.42 ? `rgba(200,215,255,${0.6 * br})` // azul
          : `rgba(255,250,245,${0.5 * br})`; // branca
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.6 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(cv);
}

// Adiciona galáxias distantes ao fundo (planos inclinados, aditivos, encarando
// a origem e inclinados p/ ler como disco).
export function createGalaxies(scene: THREE.Scene): { update: (ir: number) => void } {
  const mats: THREE.MeshBasicMaterial[] = [];
  const addGalaxy = (tex: THREE.Texture, sizeW: number, pos: [number, number, number], tiltX: number, tiltZ: number, opacity: number) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity });
    const gx = new THREE.Mesh(new THREE.PlaneGeometry(sizeW, sizeW), mat);
    gx.position.set(pos[0], pos[1], pos[2]);
    gx.lookAt(0, 0, 0);
    gx.rotateX(tiltX);
    gx.rotateZ(tiltZ);
    scene.add(gx);
    mats.push(mat);
  };
  addGalaxy(makeGalaxyTexture(2, 2.4), 620, [620, 200, -1060], 0.95, 0.35, 0.5); // espiral principal (sup. dir.)
  addGalaxy(makeGalaxyTexture(3, 1.8), 340, [-580, -440, -1000], 1.15, -0.5, 0.36); // menor/mais fraca (inf. esq.)

  // No modo IR (nuvem de Petrova), as galáxias avermelham junto com o resto do céu.
  return {
    update: (ir: number) => {
      for (const m of mats) m.color.setRGB(1, 1 - 0.82 * ir, 1 - 0.86 * ir);
    },
  };
}
