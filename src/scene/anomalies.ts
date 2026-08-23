import * as THREE from 'three';

export interface Anomaly {
  key: string;
  body: THREE.Object3D;
  pick: THREE.Mesh;
}

function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
const addPick = (body: THREE.Object3D, key: string, radius: number) => {
  const pick = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), HIDDEN);
  pick.userData.anomalyKey = key;
  body.add(pick);
  return pick;
};

// Objetos especiais / easter eggs espalhados bem longe (achados no zoom out).
// Cada um: um corpo visual + uma esfera de hit invisível p/ o raycast.
export function createAnomalies(scene: THREE.Scene): { anomalies: Anomaly[]; update: (t: number) => void } {
  const anomalies: Anomaly[] = [];
  const updaters: ((t: number) => void)[] = [];

  // --- Objeto não identificado: pequeno, escuro e discreto, bem escondido ---
  {
    const g = new THREE.Group();
    g.position.set(1040, -680, -980); // bem longe, na borda inferior
    const hull = new THREE.Mesh(
      new THREE.OctahedronGeometry(4, 0),
      new THREE.MeshStandardMaterial({ color: 0x1b1f26, metalness: 0.7, roughness: 0.45, emissive: 0x05070a, emissiveIntensity: 1, flatShading: true }),
    );
    hull.scale.set(1, 0.5, 1);
    g.add(hull);
    const blipMat = new THREE.MeshBasicMaterial({ color: 0xffca70, transparent: true, opacity: 0.6 });
    const blip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), blipMat);
    blip.position.y = 2.2;
    g.add(blip);
    scene.add(g);
    const pick = addPick(g, 'ufo', 16);
    anomalies.push({ key: 'ufo', body: g, pick });
    updaters.push((t) => {
      g.rotation.y = t * 0.35;
      blipMat.opacity = Math.sin(t * 4) > 0.5 ? 0.9 : 0.12; // pisca discreto
    });
  }

  // --- 'Oumuamua (rocha interestelar alongada) ---
  {
    const rock = new THREE.Mesh(
      new THREE.SphereGeometry(4, 32, 20), // liso (sem flatShading) -> charuto suave, como o original
      new THREE.MeshStandardMaterial({ color: 0x6b6156, roughness: 0.95, metalness: 0.05, emissive: 0x241f1a, emissiveIntensity: 0.5 }),
    );
    rock.scale.set(2.8, 0.6, 0.78);
    rock.position.set(-1240, 520, 620); // bem longe, na borda superior esquerda
    scene.add(rock);
    const pick = addPick(rock, 'oumuamua', 11);
    pick.scale.set(2.6, 1.4, 1.4);
    anomalies.push({ key: 'oumuamua', body: rock, pick });
    updaters.push((t) => {
      rock.rotation.set(t * 0.35, t * 0.6, t * 0.2);
    });
  }

  // --- Tabby's Star (estrela distante brilhante) ---
  {
    const g = new THREE.Group();
    g.position.set(1180, 560, -940); // bem longe, na borda
    const core = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 20), new THREE.MeshBasicMaterial({ color: 0xeaf0ff }));
    g.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(230,240,255,0.95)', 'rgba(150,180,255,0.4)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(46);
    g.add(glow);
    scene.add(g);
    const pick = addPick(g, 'tabby', 32);
    anomalies.push({ key: 'tabby', body: g, pick });
    updaters.push((t) => {
      const s = 0.85 + 0.15 * Math.sin(t * 3.1) * Math.sin(t * 1.7); // cintilação irregular (o "mistério")
      glow.scale.setScalar(46 * s);
    });
  }

  // --- Monólito (2001) ---
  {
    const mono = new THREE.Mesh(
      new THREE.BoxGeometry(4, 16, 36),
      new THREE.MeshStandardMaterial({ color: 0x04050a, roughness: 0.15, metalness: 0.7, emissive: 0x0a0d16, emissiveIntensity: 0.5 }),
    );
    mono.position.set(-820, 620, -1180); // bem longe, na borda superior
    scene.add(mono);
    const pick = addPick(mono, 'monolith', 30);
    pick.scale.set(0.6, 1, 2);
    anomalies.push({ key: 'monolith', body: mono, pick });
    updaters.push((t) => {
      mono.rotation.y = t * 0.12;
    });
  }

  // --- Voyager 1 (sonda) — modelagem detalhada ---
  {
    const g = new THREE.Group();
    g.position.set(1080, 600, 940); // bem longe, na borda superior direita

    const gold = new THREE.MeshStandardMaterial({ color: 0xb8a463, metalness: 0.65, roughness: 0.45, emissive: 0x3a3016, emissiveIntensity: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b30, metalness: 0.6, roughness: 0.5, emissive: 0x111114, emissiveIntensity: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe9e6dd, metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide, emissive: 0x45443c, emissiveIntensity: 0.7 });
    const wire = new THREE.MeshBasicMaterial({ color: 0xb8a463 });

    // antena de alto ganho (prato parabólico, abertura p/ +Z)
    const R = 7;
    const depth = 1.6;
    const dishPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) { const r = (i / 14) * R; dishPts.push(new THREE.Vector2(r, (r * r) / (R * R) * depth)); }
    const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 44), white);
    dish.rotation.x = -Math.PI / 2;
    g.add(dish);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 44), gold);
    rim.position.z = depth;
    g.add(rim);
    // subrefletor no foco (haste + esfera) + tripé de sustentação
    const feedMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4), gold);
    feedMast.rotation.x = Math.PI / 2;
    feedMast.position.z = 1.8;
    g.add(feedMast);
    const feed = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10), dark);
    feed.position.z = 3.4;
    g.add(feed);
    const focus = new THREE.Vector3(0, 0, 3.4);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const base = new THREE.Vector3(Math.cos(a) * 2.6, Math.sin(a) * 2.6, depth);
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, base.distanceTo(focus), 5), wire);
      strut.position.copy(base.clone().lerp(focus, 0.5)); // meio do caminho base->foco
      strut.lookAt(focus); // eixo Z aponta p/ o foco...
      strut.rotateX(Math.PI / 2); // ...e o cilindro (eixo Y) se alinha a ele
      g.add(strut);
    }

    // barramento decagonal (corpo) + tampa escura de eletrônica
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2.4, 10), gold);
    bus.rotation.x = Math.PI / 2;
    bus.position.z = -1.8;
    g.add(bus);
    const busCap = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.7, 10), dark);
    busCap.rotation.x = Math.PI / 2;
    busCap.position.z = -3.1;
    g.add(busCap);

    // braço + 3 RTGs (geradores nucleares) saindo p/ um lado
    const rtgArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5), gold);
    rtgArm.rotation.z = Math.PI / 2;
    rtgArm.position.set(-4.6, -1.6, -2);
    g.add(rtgArm);
    for (let i = 0; i < 3; i++) {
      const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12), dark);
      rtg.rotation.z = Math.PI / 2;
      rtg.position.set(-7 - i * 1.7, -1.6, -2);
      g.add(rtg);
    }

    // braço de ciência (plataforma de varredura) com instrumentos
    const sciArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 5.5), gold);
    sciArm.position.set(3.4, 4.3, -2);
    sciArm.rotation.z = -0.5;
    g.add(sciArm);
    const scan = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.3), gold);
    scan.position.set(5.4, 6.1, -2);
    g.add(scan);
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.5, 10), dark);
    cam.rotation.x = Math.PI / 2;
    cam.position.set(6.2, 6.1, -1.1);
    g.add(cam);

    // magnetômetro: haste bem longa e fina
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 26, 6), gold);
    mag.rotation.z = Math.PI / 2;
    mag.position.set(14, 1.5, -2);
    g.add(mag);

    // duas antenas whip longas (ondas de plasma), abertas em V
    for (const sgn of [-1, 1]) {
      const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 24, 5), wire);
      whip.position.set(sgn * 6.5, -9, -2);
      whip.rotation.z = sgn * 0.5;
      g.add(whip);
    }

    scene.add(g);
    const pick = addPick(g, 'voyager', 22);
    pick.position.z = -1;
    anomalies.push({ key: 'voyager', body: g, pick });
    updaters.push((t) => {
      g.rotation.set(t * 0.1, t * 0.18, t * 0.05);
    });
  }

  // --- TARDIS (Doctor Who) — bem pequena, detalhada e bem escondida ---
  {
    const g = new THREE.Group();
    g.position.set(-1080, -560, -1120); // bem longe, num canto bem escondido
    g.scale.setScalar(0.5); // bem pequena

    const blue = new THREE.MeshStandardMaterial({ color: 0x0b3a6b, roughness: 0.55, metalness: 0.15, emissive: 0x04101f, emissiveIntensity: 0.6 });
    const darkBlue = new THREE.MeshStandardMaterial({ color: 0x082a4f, roughness: 0.6, metalness: 0.15, emissive: 0x030c18, emissiveIntensity: 0.5 });

    const bodyH = 15;
    const bodyW = 8;
    const half = bodyW / 2;

    // corpo principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyW), blue);
    body.position.y = bodyH / 2;
    g.add(body);

    // pilares/cantoneiras nos 4 cantos
    const postGeo = new THREE.BoxGeometry(1, bodyH + 1, 1);
    for (const [px, pz] of [[-half, -half], [half, -half], [-half, half], [half, half]]) {
      const post = new THREE.Mesh(postGeo, darkBlue);
      post.position.set(px, bodyH / 2, pz);
      g.add(post);
    }

    // faixa "POLICE BOX" logo abaixo do teto
    const sign = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.4, 1.6, bodyW + 0.4), new THREE.MeshStandardMaterial({ color: 0x0e4d86, emissive: 0x123a5c, emissiveIntensity: 0.9, roughness: 0.4 }));
    sign.position.y = bodyH - 1.2;
    g.add(sign);

    // telhado escalonado
    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 1.2, 1, bodyW + 1.2), darkBlue);
    roof1.position.y = bodyH + 0.5;
    g.add(roof1);
    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.6, 1.4, bodyW - 0.6), blue);
    roof2.position.y = bodyH + 1.6;
    g.add(roof2);
    const roof3 = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 2.4, 1, bodyW - 2.4), darkBlue);
    roof3.position.y = bodyH + 2.6;
    g.add(roof3);

    // lanterna no topo
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.8, 12), darkBlue);
    lampBase.position.y = bodyH + 3.3;
    g.add(lampBase);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
    lamp.position.y = bodyH + 4;
    g.add(lamp);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,240,200,0.9)', 'rgba(255,210,130,0.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    lampGlow.position.y = bodyH + 4;
    lampGlow.scale.setScalar(6);
    g.add(lampGlow);

    // janelas iluminadas na parte de cima de cada face
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2c, emissive: 0x8fc6ff, emissiveIntensity: 0.35, roughness: 0.3 });
    const winGeo = new THREE.BoxGeometry(2.6, 2.4, 0.3);
    const winY = bodyH - 3.6;
    const faces: [number, number, number, number][] = [
      [0, winY, half + 0.1, 0],
      [0, winY, -half - 0.1, Math.PI],
      [half + 0.1, winY, 0, Math.PI / 2],
      [-half - 0.1, winY, 0, -Math.PI / 2],
    ];
    for (const [wx, wy, wz, rot] of faces) {
      const w = new THREE.Mesh(winGeo, winMat);
      w.position.set(wx, wy, wz);
      w.rotation.y = rot;
      g.add(w);
    }

    scene.add(g);
    const pick = addPick(g, 'tardis', 34); // hit generoso (é pequena e longe)
    pick.position.y = bodyH / 2;
    anomalies.push({ key: 'tardis', body: g, pick });
    updaters.push((t) => {
      g.rotation.y = t * 0.15;
      const p = 0.5 + 0.5 * Math.sin(t * 2); // lanterna pulsando
      lampGlow.scale.setScalar(4.5 + 2.5 * p);
      lampGlow.material.opacity = 0.45 + 0.5 * p;
    });
  }

  return {
    anomalies,
    update: (t) => updaters.forEach((u) => u(t)),
  };
}
