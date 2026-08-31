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

// Textura procedural de Adrian: ruído isotrópico com DOMAIN WARPING (aspecto de
// tinta na água, tipo os polos de Júpiter — sem bandas), paleta de 5 paradas e
// tempestades laranja como objetos (máscara radial + warp interno). Gerada 1x.
function adrianTexture() {
  const S = 768;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  };
  const vnoise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), e = hash(xi, yi + 1), f = hash(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + e * (1 - u) * v + f * u * v;
  };
  const fbm = (x: number, y: number) => {
    let sum = 0, amp = 0.5, fr = 1;
    for (let o = 0; o < 4; o++) { sum += amp * vnoise(x * fr, y * fr); fr *= 2; amp *= 0.5; }
    return sum;
  };
  const warp = (x: number, y: number) => { // fbm(p + fbm(p + fbm(p)))
    const q1 = fbm(x, y), q2 = fbm(x + 5.2, y + 1.3);
    const r1 = fbm(x + 4 * q1, y + 4 * q2), r2 = fbm(x + 4 * q1 + 1.7, y + 4 * q2 + 9.2);
    return fbm(x + 4 * r1, y + 4 * r2);
  };
  const stops = [[0, 7, 16, 24], [0.3, 18, 58, 30], [0.55, 47, 122, 52], [0.8, 130, 220, 62], [1, 235, 255, 195]];
  const pal = (n: number): [number, number, number] => {
    for (let i = 1; i < stops.length; i++) {
      if (n <= stops[i][0]) { const a = stops[i - 1], b = stops[i], t = (n - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; }
    }
    return [235, 255, 195];
  };
  const storms = Array.from({ length: 4 }, () => ({ x: Math.random() * S, y: S * (0.2 + Math.random() * 0.6), r: 90 + Math.random() * 140, seed: Math.random() * 20 }));
  const FREQ = 4;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = (px / S) * FREQ, y = (py / S) * FREQ;
      const n = Math.min(1, Math.max(0, warp(x, y) * 1.25)); // realça contraste
      const col = pal(n);
      let oa = 0, osn = 0;
      for (const st of storms) {
        const dx = px - st.x, dy = py - st.y, dd = Math.sqrt(dx * dx + dy * dy) / st.r;
        if (dd < 1) { const mask = 1 - dd * dd * (3 - 2 * dd); osn = warp(x * 1.7 + st.seed, y * 1.7 + st.seed); oa += mask * (0.35 + 0.65 * osn); }
      }
      if (oa > 0) { const m = Math.min(1, oa); col[0] += (95 + 150 * osn - col[0]) * m; col[1] += (32 + 118 * osn - col[1]) * m; col[2] += (8 + 42 * osn - col[2]) * m; }
      const idx = (py * S + px) * 4;
      d[idx] = col[0]; d[idx + 1] = col[1]; d[idx + 2] = col[2]; d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

// Shader do Adrian: iluminado pela estrela local, limb darkening agressivo
// (pow(N·L, 0.6)) e lado escuro indo a ~0 -> terminador forte.
const ADRIAN_VERT = `varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
  void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const ADRIAN_FRAG = `uniform sampler2D uMap; uniform vec3 uLightPos; uniform float uOpacity; uniform float uIr;
  varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
  void main(){ vec3 L = normalize(uLightPos - vWorld);
    float lit = pow(max(dot(normalize(vN), L), 0.0), 0.6);
    vec3 tex = texture2D(uMap, vUv).rgb;
    // visível: albedo verde iluminado. IR: albedo morre e a EMISSÃO TÉRMICA sobe
    // (independe da luz -> o lado noturno acende), remapeada p/ vermelho/laranja.
    vec3 albedo = mix(tex, tex * vec3(0.9, 0.3, 0.2) * 0.35, uIr);
    vec3 lighting = albedo * (lit + 0.012);
    vec3 e = tex * (uIr * 2.05);
    vec3 emissive = vec3(e.r * 0.95 + e.g * 0.7, e.g * 0.24, e.b * 0.35);
    gl_FragColor = vec4(lighting + emissive, uOpacity); }`;

// Fita da linha de Petrova: strip que lê a mesma espinha (LUT) e é extrudada em
// ESPAÇO DE VISTA (cross(tangente, direção da câmera)) -> sempre encara você.
// Sem núcleo (banda macia), só pra dar coesão às partículas.
const RIBBON_VERT = `attribute float aSide; attribute vec3 aTangent; uniform float uWidth;
  varying float vSide; varying float vU;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 tanV = normalize((modelViewMatrix * vec4(aTangent, 0.0)).xyz);
    vec3 dir = normalize(cross(tanV, vec3(0.0, 0.0, 1.0)));
    mv.xyz += dir * aSide * uWidth;
    vSide = aSide; vU = uv.x;
    gl_Position = projectionMatrix * mv; }`;
const RIBBON_FRAG = `precision mediump float;
  uniform float uOpacity; uniform vec3 uColor;
  varying float vSide; varying float vU;
  void main(){ float across = 1.0 - abs(vSide); float ends = sin(vU * 3.14159);
    gl_FragColor = vec4(uColor, pow(max(across, 0.0), 1.4) * ends * uOpacity); }`;

const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
const addPick = (body: THREE.Object3D, key: string, radius: number) => {
  const pick = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), HIDDEN);
  pick.userData.anomalyKey = key;
  body.add(pick);
  return pick;
};

// Objetos especiais / easter eggs espalhados bem longe (achados no zoom out).
// Cada um: um corpo visual + uma esfera de hit invisível p/ o raycast.
export function createAnomalies(scene: THREE.Scene, camera: THREE.Camera): { anomalies: Anomaly[]; update: (t: number, zoom?: number, ir?: number) => void; trigger: (key: string) => void; setHailmaryCine: (on: boolean) => void; hmCam: THREE.Vector3; hmLook: THREE.Vector3; hmWide: THREE.Vector3; hmWideLook: THREE.Vector3; hmUp: THREE.Vector3 } {
  const anomalies: Anomaly[] = [];
  const updaters: ((t: number, zoom: number, ir: number) => void)[] = [];
  const triggers: Record<string, () => void> = {}; // efeitos acionados por clique (ex.: Petrova)
  // Cinemática do Hail Mary: nave estaciona na linha de Petrova + alvos da câmera.
  const UP = new THREE.Vector3(0, 1, 0);
  let hmCine = false;
  const hmCam = new THREE.Vector3(), hmLook = new THREE.Vector3();       // fase B (over-the-shoulder)
  const hmWide = new THREE.Vector3(), hmWideLook = new THREE.Vector3();  // fase A (wide no planeta)
  const hmUp = new THREE.Vector3(0, 1, 0);                                // "cima" p/ travar o horizonte na fase B

  // --- Objeto não identificado: pequeno, escuro e discreto, bem escondido ---
  {
    const g = new THREE.Group();
    g.position.set(-860, -560, -1120); // posição inicial (o updater faz ele vagar)
    const hull = new THREE.Mesh(
      new THREE.OctahedronGeometry(5, 0),
      new THREE.MeshStandardMaterial({ color: 0x1b1f26, metalness: 0.7, roughness: 0.45, emissive: 0x05070a, emissiveIntensity: 1, flatShading: true }),
    );
    hull.scale.set(1, 0.5, 1);
    g.add(hull);
    const blipMat = new THREE.MeshBasicMaterial({ color: 0xffca70, transparent: true, opacity: 0.6 });
    const blip = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), blipMat);
    blip.position.y = 2.8;
    g.add(blip);
    // farol: leve brilho âmbar que pisca — a "dica" p/ achar o corpo escuro sem entregá-lo
    const beaconMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,202,112,0.9)', 'rgba(255,170,60,0.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const beacon = new THREE.Sprite(beaconMat);
    beacon.position.y = 2.8;
    g.add(beacon);
    scene.add(g);
    const pick = addPick(g, 'ufo', 16);
    anomalies.push({ key: 'ufo', body: g, pick });
    const R = 1500; // mesma distância de antes, mas agora vagando pelo céu

    // Farol piscando "UFO" em código Morse (..- ..-. ---) — padrão distinto de
    // estrela. ponto=1u, traço=3u; espaço intra-letra=1u, entre-letras=3u, fim=7u.
    const UNIT = 0.18; // segundos por unidade
    const MORSE = [[1, 1, 3], [1, 1, 3, 1], [3, 3, 3]]; // U, F, O (dot=1, dash=3)
    const segs: { on: boolean; start: number; end: number }[] = [];
    let acc = 0;
    const push = (on: boolean, units: number) => { segs.push({ on, start: acc, end: acc + units * UNIT }); acc += units * UNIT; };
    MORSE.forEach((letter, li) => {
      letter.forEach((sym, si) => {
        push(true, sym); // símbolo (ponto/traço)
        if (si < letter.length - 1) push(false, 1); // gap intra-letra
      });
      push(false, li < MORSE.length - 1 ? 3 : 7); // gap entre-letras / fim de palavra
    });
    const CYCLE = acc;

    updaters.push((t) => {
      // deriva quase-aleatória sobre uma esfera de raio R (azimute anda + ondula,
      // elevação sobe/desce em frequências irracionais -> caminho que não repete)
      const az = t * 0.045 + Math.sin(t * 0.017) * 1.2;
      const el = Math.sin(t * 0.021) * 0.8 + Math.sin(t * 0.011) * 0.4;
      const ce = Math.cos(el);
      g.position.set(R * ce * Math.sin(az), R * Math.sin(el), R * ce * Math.cos(az));
      g.rotation.y = t * 0.35;
      // pisca em Morse (a pista p/ achar): procura o segmento atual no ciclo
      const ph = t % CYCLE;
      let on = false;
      for (const s of segs) { if (ph >= s.start && ph < s.end) { on = s.on; break; } }
      blipMat.opacity = on ? 0.95 : 0.12;
      beaconMat.opacity = on ? 0.75 : 0.03;
      beacon.scale.setScalar(on ? 9 : 3.5);
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
    mono.position.set(1138, -910, 569); // r~1565, canto inferior-direito vazio (longe dos outros eggs)
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
    g.position.set(1080, 600, 940); // posição inicial (o updater a coloca em órbita)

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
    // órbita "de frente" pra câmera: plano perpendicular à linha câmera->centro,
    // então ela circula sempre pela BORDA da tela, nunca sobre o sol (em qualquer
    // ângulo). Lenta e num raio grande -> só aparece dando bastante zoom out.
    const orbitR = 620;
    const camDir = new THREE.Vector3();
    const u = new THREE.Vector3();
    const v = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const ALT = new THREE.Vector3(1, 0, 0);
    updaters.push((t) => {
      const a = t * 0.025; // bem lenta (~250s por volta)
      camDir.copy(camera.position);
      if (camDir.lengthSq() < 1) camDir.set(0, 0, 1);
      camDir.normalize();
      u.crossVectors(Math.abs(camDir.y) > 0.92 ? ALT : UP, camDir).normalize();
      v.crossVectors(camDir, u).normalize();
      const c = Math.cos(a) * orbitR, s = Math.sin(a) * orbitR;
      g.position.set(u.x * c + v.x * s, u.y * c + v.y * s, u.z * c + v.z * s);
      g.rotation.set(t * 0.08, t * 0.14, t * 0.04);
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

  // --- Project Hail Mary (Devoradores de Estrelas) ---
  // Planeta Adrian (Tau Ceti e) com a nave orbitando e a estrela Tau Ceti ao lado.
  // Ao clicar, acende a "linha de Petrova" (fluxo de astrophage) da estrela ao planeta.
  {
    const g = new THREE.Group();
    g.position.set(-900, 560, -1000); // bem longe, num canto (r ~ 1460)

    const PR = 48;
    const adrianMap = adrianTexture();
    const planetMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: adrianMap }, uLightPos: { value: new THREE.Vector3() }, uOpacity: { value: 1 }, uIr: { value: 0 } },
      vertexShader: ADRIAN_VERT, fragmentShader: ADRIAN_FRAG, transparent: true,
    });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(PR, 96, 64), planetMat);
    g.add(planet);
    // halo externo suave (sem o anel neon — só um brilho leve na borda)
    const atmoMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(90,220,210,0.28)', 'rgba(60,180,190,0.05)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const atmo = new THREE.Sprite(atmoMat);
    atmo.scale.setScalar(PR * 3);
    g.add(atmo);

    // nave Hail Mary: 3 tanques (cápsulas com domos) + sinos de motor + módulo de
    // tripulação na frente + painéis. Modelagem só do formato geral (fiel à silhueta).
    const ship = new THREE.Group();
    const shipMat = new THREE.MeshStandardMaterial({ color: 0xe6e3da, metalness: 0.35, roughness: 0.55, emissive: 0x30302c, emissiveIntensity: 0.65, transparent: true });
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x8f8c84, metalness: 0.45, roughness: 0.6, emissive: 0x1c1c1a, emissiveIntensity: 0.6, transparent: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.6, roughness: 0.4, emissive: 0x2c2208, emissiveIntensity: 0.6, transparent: true });

    // spine central
    const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 9, 4, 10), shipMat);
    spine.rotation.z = Math.PI / 2;
    ship.add(spine);

    // 3 tanques de combustível (astrophage) ao redor do spine, a 120°
    const tankGeo = new THREE.CapsuleGeometry(0.85, 6.4, 6, 14);
    const bellGeo = new THREE.ConeGeometry(0.82, 1.5, 14, 1, true);
    const bandGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.5, 14);
    for (let k = 0; k < 3; k++) {
      const ang = Math.PI / 2 + k * (Math.PI * 2 / 3);
      const ty = Math.cos(ang) * 1.5, tz = Math.sin(ang) * 1.5;
      const tank = new THREE.Mesh(tankGeo, shipMat);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(-0.4, ty, tz);
      ship.add(tank);
      const band = new THREE.Mesh(bandGeo, goldMat); // faixa dourada
      band.rotation.z = Math.PI / 2;
      band.position.set(1.4, ty, tz);
      ship.add(band);
      const bell = new THREE.Mesh(bellGeo, dishMat); // sino do motor atrás
      bell.rotation.z = Math.PI / 2;
      bell.position.set(-4.6, ty, tz);
      ship.add(bell);
    }

    // módulo de tripulação na frente (cápsula maior)
    const crew = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 3, 6, 14), shipMat);
    crew.rotation.z = Math.PI / 2;
    crew.position.x = 5.4;
    ship.add(crew);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 16), goldMat);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = 3.6;
    ship.add(collar);

    // painéis solares / radiadores
    const panelGeo = new THREE.BoxGeometry(3.6, 0.08, 1.7);
    for (const sgn of [1, -1]) {
      const panel = new THREE.Mesh(panelGeo, dishMat);
      panel.position.set(0.6, 0, sgn * 2.9);
      ship.add(panel);
    }

    // Astronauta (o "Ryan de costa") em pé no topo da nave, olhando p/ fora — na
    // cena cinematográfica ele fica em silhueta contra a linha de Petrova.
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.25, roughness: 0.85, emissive: 0x090a0c, emissiveIntensity: 0.5, transparent: true });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0a1016, metalness: 0.7, roughness: 0.18, emissive: 0x0c1420, emissiveIntensity: 0.7, transparent: true });
    const astro = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.55, 5, 10), suitMat); torso.position.y = 0.98; astro.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), suitMat); head.position.y = 1.62; astro.add(head);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), visorMat); visor.position.set(0.16, 1.63, 0); visor.scale.set(0.55, 0.85, 0.85); astro.add(visor);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.66, 0.3), suitMat); pack.position.set(-0.36, 1.02, 0); astro.add(pack);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.55, 4, 8), suitMat); leg.position.set(0, 0.33, s * 0.17); astro.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), suitMat); arm.position.set(0.04, 1.0, s * 0.42); arm.rotation.x = -s * 0.12; astro.add(arm);
    }
    astro.position.set(4.4, 1.25, 0); astro.scale.setScalar(1.8); // topo da nave; +Y = de pé (maior p/ virar herói-silhueta apesar da nave ×0.5)
    ship.add(astro);
    ship.scale.setScalar(0.5); // nave menor (fidelidade de escala: planeta enorme, nave pequena)
    g.add(ship);

    // estrela Tau Ceti (ponto brilhante ao lado, no espaço local do egg)
    const starPos = new THREE.Vector3(300, -150, 80);
    const starMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,224,224,0.95)', 'rgba(255,90,120,0.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const star = new THREE.Sprite(starMat);
    star.position.copy(starPos);
    star.scale.setScalar(20);
    g.add(star);
    // o shader do Adrian é iluminado por Tau Ceti (posição de mundo da estrela)
    planetMat.uniforms.uLightPos.value.copy(g.position).add(starPos);
    const fadeMats = [atmoMat, shipMat, dishMat, goldMat, starMat, suitMat, visorMat]; // .opacity (planeta/anel usam uOpacity)

    scene.add(g);
    const pick = addPick(g, 'hailmary', 56);
    anomalies.push({ key: 'hailmary', body: g, pick });

    // ===== Linha de Petrova (4 camadas): espinha LUT + partículas + fitas =====
    // 1) Espinha: arco LEVE e num só sentido, da estrela (P0) ao planeta (P2),
    // amostrado numa LUT com base perpendicular (A,B). A LUT ainda respira com um
    // fbm1 sutil (só um leve tremular), ancorado nas pontas por pow(sin(u·π),0.9)
    // -> curva limpa, sem serpentear (referência: rastro de astrophage do filme).
    const P0 = starPos.clone(), P2 = new THREE.Vector3(0, 0, 0);
    const chord = new THREE.Vector3().subVectors(P2, P0);
    // direção perpendicular à corda (componente "para cima") -> arco que sobe suave
    const bow = new THREE.Vector3(0, 1, 0).addScaledVector(chord, -chord.y / chord.lengthSq()).normalize();
    const ARC = 128; // altura do arco (curva leve); amplitude com sino sin(u·π) -> pico no meio
    const spineCurve = new THREE.CatmullRomCurve3([
      P0.clone(),
      P0.clone().lerp(P2, 0.25).addScaledVector(bow, ARC * Math.sin(0.25 * Math.PI)),
      P0.clone().lerp(P2, 0.50).addScaledVector(bow, ARC),
      P0.clone().lerp(P2, 0.75).addScaledVector(bow, ARC * Math.sin(0.75 * Math.PI)),
      P2.clone(),
    ]);
    const LUT_N = 320;
    const lutBase: THREE.Vector3[] = [], lutPos: THREE.Vector3[] = [], lutA: THREE.Vector3[] = [], lutB: THREE.Vector3[] = [], lutTan: THREE.Vector3[] = [];
    const UPV = new THREE.Vector3(0, 1, 0), ALTV = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i < LUT_N; i++) {
      const u = i / (LUT_N - 1);
      lutBase.push(spineCurve.getPointAt(u));
      lutPos.push(new THREE.Vector3());
      const tan = spineCurve.getTangentAt(u); lutTan.push(tan.clone());
      const a = new THREE.Vector3().crossVectors(tan, Math.abs(tan.y) > 0.9 ? ALTV : UPV).normalize();
      lutA.push(a); lutB.push(new THREE.Vector3().crossVectors(tan, a).normalize());
    }
    // fbm 1D (JS) p/ a ondulação da espinha
    const h1 = (x: number) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
    const vn1 = (x: number) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h1(i) * (1 - u) + h1(i + 1) * u; };
    const fbm1 = (x: number) => { let s = 0, a = 0.5, fr = 1; for (let o = 0; o < 4; o++) { s += a * vn1(x * fr); fr *= 2; a *= 0.5; } return s; };
    const AMP = 7; // apenas um leve tremular (era 24 -> serpenteava e ficava torta)
    const rebuildLUT = (t: number) => {
      for (let i = 0; i < LUT_N; i++) {
        const u = i / (LUT_N - 1);
        const anchor = Math.pow(Math.sin(u * Math.PI), 0.9); // zero nas pontas -> gruda na estrela/planeta
        const dA = (fbm1(u * 1.6 + t * 0.16) - 0.5) * 2 * AMP * anchor; // ondas longas e sutis
        const dB = (fbm1(u * 1.6 + 100 - t * 0.14) - 0.5) * 2 * AMP * anchor;
        lutPos[i].copy(lutBase[i]).addScaledVector(lutA[i], dA).addScaledVector(lutB[i], dB);
      }
    };

    // (Sem partículas coladas na linha — a linha é a fita; as partículas ficam só
    // no campo global espalhado pela tela.)

    // A linha é feita de fitas (lêem a LUT, extrusão em espaço de vista): um fio
    // central brilhante + 2 faixas de brilho ao redor. Sem partículas coladas.
    const ribbonCfg = [
      { w: 6, o: 0.95, c: 0xffc0d4 },  // fio central quente
      { w: 22, o: 0.5, c: 0xff3a6a },  // brilho médio
      { w: 56, o: 0.2, c: 0xcf1440 },  // halo largo
    ];
    const ribbons = ribbonCfg.map((cfg) => {
      const width = cfg.w;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(LUT_N * 6), side = new Float32Array(LUT_N * 2), tan = new Float32Array(LUT_N * 6), uv = new Float32Array(LUT_N * 4);
      const idx: number[] = [];
      for (let i = 0; i < LUT_N; i++) {
        side[i * 2] = -1; side[i * 2 + 1] = 1;
        const u = i / (LUT_N - 1);
        uv[i * 4] = u; uv[i * 4 + 2] = u;
        tan.set([lutTan[i].x, lutTan[i].y, lutTan[i].z], i * 6);
        tan.set([lutTan[i].x, lutTan[i].y, lutTan[i].z], i * 6 + 3);
        if (i < LUT_N - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
      geo.setAttribute('aTangent', new THREE.BufferAttribute(tan, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uWidth: { value: width }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(cfg.c) } },
        vertexShader: RIBBON_VERT, fragmentShader: RIBBON_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false; mesh.visible = false;
      g.add(mesh);
      return { geo, mat, mesh, pos, base: cfg.o };
    });

    let vis = 0;
    updaters.push((t, _zoom = 0, ir = 0) => {
      // só surge no zoom out avançado (fade suave); some ao dar zoom in
      const target = hmCine ? 1 : Math.min(1, Math.max(0, (_zoom - 760) / 340)); // cine força visível
      vis += (target - vis) * (hmCine ? 0.12 : 0.08); // fade suave
      g.visible = vis > 0.01;
      g.scale.setScalar(0.7 + 0.3 * vis); // surge com um leve "crescer"
      for (const m of fadeMats) m.opacity = vis;
      planetMat.uniforms.uOpacity.value = vis;
      planetMat.uniforms.uIr.value = ir; // IR: lado noturno acende (emissão térmica)
      pick.layers.set(vis > 0.35 ? 0 : 1); // só clicável quando visível
      if (!g.visible) return;

      planet.rotation.y = t * 0.15;
      if (hmCine) {
        // NAVE ESTACIONADA no MEIO da linha de Petrova (longe do planeta), com o
        // eixo apontando p/ a estrela e o astronauta em pé no topo (olhando p/ fora).
        const dirStar = starPos.clone().normalize();
        ship.position.copy(starPos).multiplyScalar(0.4); // estaciona na linha (mais perto do planeta)
        const xA = dirStar.clone();                                   // frente da nave (+X) -> estrela
        const zA = new THREE.Vector3().crossVectors(xA, UP).normalize();
        const yA = new THREE.Vector3().crossVectors(zA, xA).normalize(); // "cima" da nave
        ship.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
        const shipWorld = g.position.clone().add(ship.position);
        const S = 0.5; // nave está em ship.scale 0.5 -> offsets do astronauta em mundo
        const astroWorld = shipWorld.clone().addScaledVector(xA, 4.4 * S).addScaledVector(yA, 2.23 * S); // torso do astronauta
        // FASE A — wide no PLANETA gigante (grandiosidade): olha p/ Adrian, nave é um risco pequeno
        hmWide.copy(shipWorld).addScaledVector(zA, 42).addScaledVector(yA, 12).addScaledVector(xA, -6);
        hmWideLook.copy(g.position);
        // FASE B — over-the-shoulder do astronauta olhando p/ a estrela/linha (money shot)
        hmCam.copy(astroWorld).addScaledVector(xA, -5).addScaledVector(yA, 1.8).addScaledVector(zA, 1.6);
        hmLook.copy(astroWorld).addScaledVector(xA, 26).addScaledVector(yA, 3);
        hmUp.copy(yA);
      } else {
        const oa = t * 0.6;
        ship.position.set(Math.cos(oa) * 28, Math.sin(oa * 0.7) * 7, Math.sin(oa) * 28);
        ship.rotation.set(0, -oa, 0);
      }

      const on = ir > 0.02; // linha de Petrova existe enquanto o modo IR estiver ativo
      for (const rb of ribbons) rb.mesh.visible = on;
      if (on) {
        rebuildLUT(t); // re-ondula a espinha (fonte única das fitas)
        // fitas copiam a posição da LUT + opacidade (a linha em si; sem partículas coladas)
        for (const rb of ribbons) {
          for (let i = 0; i < LUT_N; i++) { const p = lutPos[i], o = i * 6; rb.pos[o] = p.x; rb.pos[o + 1] = p.y; rb.pos[o + 2] = p.z; rb.pos[o + 3] = p.x; rb.pos[o + 4] = p.y; rb.pos[o + 5] = p.z; }
          rb.geo.attributes.position.needsUpdate = true;
          rb.mat.uniforms.uOpacity.value = ir * vis * rb.base;
        }
      }
    });
  }

  return {
    anomalies,
    update: (t, zoom = 0, ir = 0) => updaters.forEach((u) => u(t, zoom, ir)),
    trigger: (key) => triggers[key]?.(),
    // cinemática do Hail Mary: liga/desliga o estacionamento da nave; hmCam/hmLook
    // (refs de mundo) são atualizados a cada frame p/ a câmera enquadrar a cena.
    setHailmaryCine: (on: boolean) => { hmCine = on; },
    hmCam, hmLook, hmWide, hmWideLook, hmUp,
  };
}
