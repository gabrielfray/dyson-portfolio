import * as THREE from 'three';

// Nascimento da gigante azul — COLAPSO, IGNIÇÃO e EMANAÇÃO (adaptado do protótipo).
// São só os EFEITOS ao redor; o núcleo (a estrela em si) continua sendo o nosso
// modelo (mesh + glow do sun.ts). Tudo escalado do protótipo (R_ESTRELA=168) p/ a
// nossa cena, onde a gigante tem ~8,4u de raio (1,4 · SUN_R). Dirigido por um
// progresso normalizado s∈[0,1] (câmera lenta -> s avança devagar no revive).
const BSCALE = 0.05;
const R_EXT = 1150 * BSCALE;   // ~57,5u — raio da nuvem
const R_INT = 26 * BSCALE;     // ~1,3u — raio interno (o núcleo cobre o miolo)
const R_ESTRELA = 168 * BSCALE; // ~8,4u — de onde emanam os arcos

const COR = {
  indigo: new THREE.Color(0x16205c), azul: new THREE.Color(0x3f6ad8),
  claro: new THREE.Color(0x7fb0ff), ciano: new THREE.Color(0xa8e8ff),
  branco: new THREE.Color(0xffffff),
};

const GLSL_N3 = `
  float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float n3(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),u.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),u.x),u.y),
      mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),u.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),u.x),u.y),u.z);}
  float fbm3(vec3 p){float a=.5,s=0.,n=0.;for(int i=0;i<5;i++){s+=a*n3(p);n+=a;a*=.5;p*=2.05;}return s/n;}`;
// cor por "temperatura" (raio normalizado) — indigo frio -> branco quente
const RAMPA = `
  vec3 rampaT(float rn, vec3 cI, vec3 cA, vec3 cC, vec3 cN, vec3 cB){
    float T = pow(max(rn,0.02), -0.75);
    float q = clamp((T-1.0)/5.2, 0.0, 1.0);
    vec3 c = mix(cI,cA,smoothstep(0.00,0.22,q));
    c = mix(c,cC,smoothstep(0.20,0.48,q));
    c = mix(c,cN,smoothstep(0.46,0.76,q));
    return mix(c,cB,smoothstep(0.78,1.00,q));
  }`;

const dotTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(228,241,255,.6)');
  g.addColorStop(0.52, 'rgba(140,185,255,.13)'); g.addColorStop(1, 'rgba(80,130,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sst = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const IGN = 0.58, EMA = 0.62; // instantes (em s∈[0,1]) da ignição e do início da emanação

export interface BirthFX { update: (s: number, t: number) => number; hide: () => void }

// Cria todos os sistemas de efeito do nascimento e devolve um update(s,t) que os
// dirige e retorna o valor do CLARÃO (0..1) p/ o sun.ts alimentar o bloom.
export function createBirthFX(scene: THREE.Scene, isMobile = false): BirthFX {
  const tex = dotTexture();
  const uCores = () => ({
    cI: { value: COR.indigo.clone() }, cA: { value: COR.azul.clone() }, cC: { value: COR.claro.clone() },
    cN: { value: COR.ciano.clone() }, cB: { value: COR.branco.clone() },
  });

  // ───── 1 · ESTRIAS EM QUEDA ESPIRAL (nuvem caindo p/ dentro) ─────
  const N_EST = isMobile ? 8000 : 19000;
  const gEst = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(N_EST * 2 * 3);
    const r0 = new Float32Array(N_EST * 2), th0 = new Float32Array(N_EST * 2), y0 = new Float32Array(N_EST * 2);
    const fase = new Float32Array(N_EST * 2), pon = new Float32Array(N_EST * 2), sem = new Float32Array(N_EST * 2), pol = new Float32Array(N_EST * 2);
    for (let i = 0; i < N_EST; i++) {
      const polar = Math.random() < 0.16;
      const raio = R_INT * 2.2 + Math.pow(Math.random(), 0.62) * (R_EXT - R_INT * 2.2);
      const th = Math.random() * 6.283;
      const esp = polar ? (Math.random() < 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.55) : (Math.random() - 0.5) * 0.62;
      const y = esp * raio * (polar ? 0.85 : 0.42), f = Math.random(), sm = Math.random();
      for (let k = 0; k < 2; k++) { const j = i * 2 + k; r0[j] = raio; th0[j] = th; y0[j] = y; fase[j] = f; pon[j] = k; sem[j] = sm; pol[j] = polar ? 1 : 0; }
    }
    gEst.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gEst.setAttribute('r0', new THREE.BufferAttribute(r0, 1));
    gEst.setAttribute('th0', new THREE.BufferAttribute(th0, 1));
    gEst.setAttribute('y0', new THREE.BufferAttribute(y0, 1));
    gEst.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
    gEst.setAttribute('pon', new THREE.BufferAttribute(pon, 1));
    gEst.setAttribute('sem', new THREE.BufferAttribute(sem, 1));
    gEst.setAttribute('pol', new THREE.BufferAttribute(pol, 1));
  }
  const matEst = new THREE.ShaderMaterial({
    uniforms: { uP: { value: 0 }, uT: { value: 0 }, uInt: { value: 0 }, uSopro: { value: 0 }, uRint: { value: R_INT }, uRext: { value: R_EXT }, ...uCores() },
    vertexShader: `
      attribute float r0,th0,y0,fase,pon,sem,pol;
      uniform float uP,uT,uRint,uRext,uSopro;
      varying float vR; varying float vA; varying float vS;
      void main(){
        float p=clamp((uP-fase*0.22)/max(0.001,1.0-fase*0.22),0.0,1.0);
        float queda=pow(p,1.45);
        float r=mix(r0,uRint*1.15,queda);
        r+=uSopro*(1.0-queda)*15.0*(0.4+sem*0.9);
        r=max(r,uRint*0.9);
        float ach=pow(r/r0,1.6);
        float y=y0*mix(1.0,ach,0.92)*(1.0-pol*0.45*queda);
        float om=1.05*pow(max(r,uRint)/11.0,-1.5);
        float th=th0+om*uT*0.42+queda*2.4;
        float dth=-clamp(om,0.0,7.0)*0.055*pon*(0.35+queda*1.1);
        float rr=r*(1.0-pon*0.012*queda);
        vec3 P=vec3(cos(th+dth)*rr, y, sin(th+dth)*rr);
        vR=clamp(r/uRext,0.0,1.0); vA=queda; vS=sem;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(P,1.0);
      }`,
    fragmentShader: RAMPA + `
      uniform float uInt; uniform vec3 cI,cA,cC,cN,cB;
      varying float vR; varying float vA; varying float vS;
      void main(){
        vec3 c=rampaT(vR,cI,cA,cC,cN,cB);
        float a=(0.22+0.78*vS)*uInt;
        a*=smoothstep(0.0,0.06,vA);
        a*=1.0-smoothstep(0.90,1.0,vA);
        gl_FragColor=vec4(c,a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const estrias = new THREE.LineSegments(gEst, matEst);
  estrias.frustumCulled = false; estrias.visible = false; scene.add(estrias);

  // ───── 2 · DISCO — partículas (sem aresta) + 3 véus ─────
  const N_DISCO = isMobile ? 14000 : 34000;
  const gDisc = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(N_DISCO * 3), rr = new Float32Array(N_DISCO), th = new Float32Array(N_DISCO), yy = new Float32Array(N_DISCO), tam = new Float32Array(N_DISCO), sem = new Float32Array(N_DISCO);
    for (let i = 0; i < N_DISCO; i++) {
      const u = Math.random();
      rr[i] = R_INT * 1.35 + Math.pow(u, 0.75) * (R_EXT * 0.66 - R_INT * 1.35);
      th[i] = Math.random() * 6.283;
      const h = (Math.random() - 0.5) * 2;
      yy[i] = Math.sign(h) * Math.pow(Math.abs(h), 2.1) * rr[i] * 0.085;
      tam[i] = 0.35 + Math.pow(Math.random(), 4.2) * 5.2;
      sem[i] = Math.pow(Math.random(), 1.9);
    }
    gDisc.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gDisc.setAttribute('rr', new THREE.BufferAttribute(rr, 1));
    gDisc.setAttribute('th', new THREE.BufferAttribute(th, 1));
    gDisc.setAttribute('yy', new THREE.BufferAttribute(yy, 1));
    gDisc.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
    gDisc.setAttribute('sem', new THREE.BufferAttribute(sem, 1));
  }
  const matDisc = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uInt: { value: 0 }, uEsc: { value: innerHeight * 0.9 }, uMapa: { value: tex }, uRext: { value: R_EXT }, uEnc: { value: 1 }, ...uCores() },
    vertexShader: `
      attribute float rr,th,yy,tam,sem;
      uniform float uT,uEsc,uRext,uEnc;
      varying float vR; varying float vS;
      void main(){
        float r=rr*uEnc;
        float om=1.05*pow(max(r,1.3)/11.0,-1.5);
        float a=th+om*uT*0.42;
        vec3 p=vec3(cos(a)*r, yy*uEnc, sin(a)*r);
        vR=clamp(r/uRext,0.0,1.0); vS=sem;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=clamp(tam*uEsc/max(1.0,-mv.z),0.6,14.0);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: RAMPA + `
      uniform sampler2D uMapa; uniform float uInt; uniform vec3 cI,cA,cC,cN,cB;
      varying float vR; varying float vS;
      void main(){
        float a=texture2D(uMapa,gl_PointCoord).a;
        if(a<0.01) discard;
        vec3 c=rampaT(vR,cI,cA,cC,cN,cB);
        float perfil=smoothstep(0.02,0.14,vR)*(1.0-smoothstep(0.30,0.66,vR));
        gl_FragColor=vec4(c,a*(0.25+0.75*vS)*perfil*uInt);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const discoPart = new THREE.Points(gDisc, matDisc);
  discoPart.frustumCulled = false; discoPart.visible = false; scene.add(discoPart);

  const veuDisco = (esp: number, inten: number) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(R_INT * 0.6, R_EXT * 0.78, 192, 40),
      new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uInt: { value: inten }, uEsp: { value: esp }, uEnc: { value: 1 }, uRi: { value: R_INT * 0.6 }, uRo: { value: R_EXT * 0.78 }, uRext: { value: R_EXT }, ...uCores() },
        vertexShader: `varying vec3 vW; uniform float uEnc;
          void main(){ vW=position*uEnc; gl_Position=projectionMatrix*modelViewMatrix*vec4(position*uEnc,1.0); }`,
        fragmentShader: RAMPA + `
          uniform float uT,uInt,uEsp,uRi,uRo,uEnc,uRext;
          uniform vec3 cI,cA,cC,cN,cB;
          varying vec3 vW;
          float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float n2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
            return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);}
          float fb(vec2 p){float a=.5,s=0.,n=0.;for(int i=0;i<4;i++){s+=a*n2(p);n+=a;a*=.5;p*=2.07;}return s/n;}
          void main(){
            float r=length(vW.xz);
            float rn=clamp((r-uRi*uEnc)/max(1.0,(uRo-uRi)*uEnc),0.0,1.0);
            float ang=atan(vW.z,vW.x);
            float om=pow(max(rn,0.06),-1.5);
            float d=pow(fb(vec2(ang/6.283*8.0+om*uT*0.012, rn*6.0)),1.6);
            float perfil=pow(sin(rn*3.14159265), uEsp);
            vec3 c=rampaT(clamp(r/uRext,0.0,1.0),cI,cA,cC,cN,cB);
            gl_FragColor=vec4(c, d*perfil*uInt);
          }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m;
  };
  const veus = [veuDisco(1.5, 0.42), veuDisco(0.85, 0.20), veuDisco(0.55, 0.09)];
  veus[1].scale.setScalar(1.10); veus[1].position.y = 9 * BSCALE;
  veus[2].scale.setScalar(1.22); veus[2].position.y = -11 * BSCALE;
  const veuInt = [0.42, 0.20, 0.09];

  // ───── 3 · EMANAÇÃO — arcos de matéria (sobem e assentam / escapam) ─────
  const N_ARCO = isMobile ? 5000 : 11000;
  const gArc = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(N_ARCO * 2 * 3);
    const th = new Float32Array(N_ARCO * 2), ph = new Float32Array(N_ARCO * 2), alt = new Float32Array(N_ARCO * 2), fase = new Float32Array(N_ARCO * 2), pon = new Float32Array(N_ARCO * 2), sem = new Float32Array(N_ARCO * 2), fuga = new Float32Array(N_ARCO * 2);
    for (let i = 0; i < N_ARCO; i++) {
      const t = Math.acos(2 * Math.random() - 1), p2 = Math.random() * 6.283;
      const a = 0.55 + Math.pow(Math.random(), 1.25) * 5.2, f = Math.random(), sm = Math.random();
      const esc = Math.random() < 0.46 ? 1 : 0;
      for (let k = 0; k < 2; k++) { const j = i * 2 + k; th[j] = t; ph[j] = p2; alt[j] = a; fase[j] = f; pon[j] = k; sem[j] = sm; fuga[j] = esc; }
    }
    gArc.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gArc.setAttribute('th', new THREE.BufferAttribute(th, 1));
    gArc.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    gArc.setAttribute('alt', new THREE.BufferAttribute(alt, 1));
    gArc.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
    gArc.setAttribute('pon', new THREE.BufferAttribute(pon, 1));
    gArc.setAttribute('sem', new THREE.BufferAttribute(sem, 1));
    gArc.setAttribute('fuga', new THREE.BufferAttribute(fuga, 1));
  }
  const matArc = new THREE.ShaderMaterial({
    uniforms: { uP: { value: 0 }, uT: { value: 0 }, uInt: { value: 0 }, uR: { value: R_ESTRELA }, cN: { value: COR.ciano.clone() }, cB: { value: COR.branco.clone() }, cC: { value: COR.claro.clone() } },
    vertexShader: `
      attribute float th,ph,alt,fase,pon,sem,fuga;
      uniform float uP,uT,uR;
      varying float vQ; varying float vS; varying float vF;
      void main(){
        float q=clamp((uP-fase*0.55)/0.45,0.0,1.0);
        float laco=sin(clamp(q,0.0,1.0)*3.14159265);
        float saida=pow(q,0.72)*2.15;
        float perfil=mix(laco, saida, fuga);
        float r=uR*(0.25+q*0.75)+uR*alt*perfil*1.9;
        float rr=r+pon*uR*(0.30+fuga*0.55)*max(perfil,0.15);
        float a=ph+uT*0.10+sem*0.4;
        vec3 d=vec3(sin(th)*cos(a), cos(th), sin(th)*sin(a));
        vQ=max(perfil,0.0); vS=sem; vF=fuga;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(d*rr,1.0);
      }`,
    fragmentShader: `
      uniform float uInt; uniform vec3 cN,cB,cC;
      varying float vQ; varying float vS; varying float vF;
      void main(){
        vec3 c=mix(cC,cB,min(vQ,1.0));
        c=mix(c,cN,vS*0.5);
        float a=(0.25+0.75*vS)*uInt;
        a*= mix(min(vQ,1.0), clamp(1.4-vQ*0.62,0.0,1.0), vF);
        gl_FragColor=vec4(c,a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const arcos = new THREE.LineSegments(gArc, matArc);
  arcos.frustumCulled = false; arcos.visible = false; scene.add(arcos);

  // ───── 4 · PULSOS de choque (fresnel, só o limbo, elipsoidais) ─────
  const pulso = (semente: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, isMobile ? 64 : 128, isMobile ? 48 : 96),
      new THREE.ShaderMaterial({
        uniforms: { uInt: { value: 0 }, uCor: { value: COR.ciano.clone() }, uT: { value: 0 }, uSem: { value: semente }, uDef: { value: 0.05 } },
        vertexShader: GLSL_N3 + `
          uniform float uT; uniform float uSem; uniform float uDef;
          varying vec3 vN; varying vec3 vP; varying vec3 vD;
          void main(){
            vec3 d=normalize(position);
            float n=fbm3(d*2.2+vec3(uSem*7.0+uT*0.12));
            vec3 p=d*(1.0+(n-0.5)*uDef);
            vN=normalize(mat3(modelMatrix)*d); vD=d;
            vec4 mv=modelViewMatrix*vec4(p,1.0); vP=mv.xyz;
            gl_Position=projectionMatrix*mv;
          }`,
        fragmentShader: GLSL_N3 + `
          uniform vec3 uCor; uniform float uInt; uniform float uT; uniform float uSem;
          varying vec3 vN; varying vec3 vP; varying vec3 vD;
          void main(){
            float f=pow(1.0-abs(dot(normalize(vN),normalize(-vP))),11.0);
            float n1=fbm3(vD*3.4+vec3(uSem*13.0));
            float n2=fbm3(vD*9.5-vec3(uSem*5.0+uT*0.2));
            float mancha=smoothstep(0.28,0.70,n1*0.68+n2*0.32);
            gl_FragColor=vec4(uCor*(0.7+n1*0.6), f*mancha*uInt);
          }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
      }));
    m.visible = false; m.rotation.set(Math.random() * 3.14, Math.random() * 3.14, Math.random() * 3.14);
    scene.add(m); return m;
  };
  const pulsos = [pulso(0.13), pulso(0.47), pulso(0.81)];
  const FORMA = [[1, 0.90, 1.04], [1.05, 0.86, 1], [0.96, 0.93, 1.07]];

  // ───── 5 · JATOS bipolares (pluma de partículas) ─────
  const N_JATO = isMobile ? 2000 : 4200;
  const gJat = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(N_JATO * 3), fase = new Float32Array(N_JATO), ang = new Float32Array(N_JATO), rf = new Float32Array(N_JATO), vm = new Float32Array(N_JATO), sg = new Float32Array(N_JATO), tam = new Float32Array(N_JATO);
    for (let i = 0; i < N_JATO; i++) {
      fase[i] = Math.random(); ang[i] = Math.random() * 6.283; rf[i] = Math.pow(Math.random(), 0.55);
      vm[i] = 0.6 + Math.pow(Math.random(), 1.6) * 1.1; sg[i] = Math.random() < 0.5 ? 1 : -1;
      tam[i] = 0.5 + Math.pow(Math.random(), 2.6) * 2.6;
    }
    gJat.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gJat.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
    gJat.setAttribute('ang', new THREE.BufferAttribute(ang, 1));
    gJat.setAttribute('rfrac', new THREE.BufferAttribute(rf, 1));
    gJat.setAttribute('vmult', new THREE.BufferAttribute(vm, 1));
    gJat.setAttribute('sinal', new THREE.BufferAttribute(sg, 1));
    gJat.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  }
  const matJat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uInt: { value: 0 }, uComp: { value: 1650 * BSCALE }, uR0: { value: 18 * BSCALE }, uRmax: { value: 140 * BSCALE }, uEsc: { value: innerHeight * 0.9 }, uMapa: { value: tex }, cB: { value: COR.branco.clone() }, cN: { value: COR.ciano.clone() }, cA: { value: COR.azul.clone() } },
    vertexShader: `
      attribute float fase,ang,rfrac,vmult,sinal,tam;
      uniform float uT,uComp,uR0,uRmax,uEsc;
      varying float vT2;
      void main(){
        float t=fract(uT*0.055*vmult+fase); vT2=t;
        float d=uComp*pow(t,0.80)*sinal;
        float r=(uR0+(uRmax-uR0)*pow(t,0.68))*rfrac;
        float a=ang+t*1.1;
        vec3 p=vec3(cos(a)*r, d, sin(a)*r);
        p.x+=sin(t*7.0+fase*30.0)*r*0.3;
        p.z+=cos(t*5.6+fase*19.0)*r*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=clamp(tam*(1.0+t*2.6)*uEsc/max(1.0,-mv.z),0.6,18.0);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMapa; uniform float uInt; uniform vec3 cB,cN,cA;
      varying float vT2;
      void main(){
        float a=texture2D(uMapa,gl_PointCoord).a;
        if(a<0.01) discard;
        vec3 c=mix(cB,cN,smoothstep(0.0,0.3,vT2));
        c=mix(c,cA,smoothstep(0.3,0.9,vT2));
        gl_FragColor=vec4(c,a*uInt*smoothstep(0.0,0.05,vT2)*pow(1.0-vT2,1.2));
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const jatos = new THREE.Points(gJat, matJat);
  jatos.frustumCulled = false; jatos.visible = false; scene.add(jatos);

  const all: THREE.Object3D[] = [estrias, discoPart, ...veus, arcos, ...pulsos, jatos];
  const hide = () => { for (const o of all) o.visible = false; };

  const update = (s: number, t: number): number => {
    if (s < 0) { hide(); return 0; }
    const P = sst(0, 0.94, s);
    const ign = sst(IGN, IGN + 0.03, s);
    const pos = sst(IGN + 0.02, 1, s);
    // ABSORÇÃO: no fim tudo é sugado p/ dentro do núcleo — intensidade cai a 0 e o
    // disco/véus encolhem p/ o centro. Assim nada "some do nada" quando hide() roda.
    const fim = 1 - sst(0.86, 1.0, s);
    const sugado = 1 - sst(0.86, 1.0, s) * 0.9; // encolhe p/ o miolo ao ser absorvido

    // estrias
    matEst.uniforms.uP.value = P; matEst.uniforms.uT.value = t; matEst.uniforms.uSopro.value = pos;
    matEst.uniforms.uInt.value = sst(0, 0.06, s) * (1 - sst(EMA, 0.95, s) * 0.85) * fim;
    estrias.visible = matEst.uniforms.uInt.value > 0.001;

    // disco + véus (encolhem junto; e são sugados p/ o centro no fim)
    const encolhe = (1 - sst(0.15, 0.92, s) * 0.55) * sugado;
    discoPart.visible = s > 0.16 && fim > 0.001;
    matDisc.uniforms.uT.value = t; matDisc.uniforms.uEnc.value = encolhe;
    matDisc.uniforms.uInt.value = sst(0.18, 0.42, s) * 1.15 * (1 - sst(EMA, 1, s) * 0.6) * fim;
    veus.forEach((v, i) => {
      v.visible = s > 0.22 && fim > 0.001;
      const m = v.material as THREE.ShaderMaterial;
      m.uniforms.uT.value = t; m.uniforms.uEnc.value = encolhe;
      m.uniforms.uInt.value = veuInt[i] * sst(0.24, 0.46, s) * (1 - sst(EMA, 1, s) * 0.55) * fim;
    });

    // pulsos de choque
    pulsos.forEach((p, i) => {
      const q = sst(IGN + i * 0.048, IGN + i * 0.048 + 0.24, s);
      p.visible = q > 0.002 && q < 0.998;
      const rr = (26 + Math.pow(q, 0.82) * 2050) * BSCALE;
      p.scale.set(rr * FORMA[i][0], rr * FORMA[i][1], rr * FORMA[i][2]);
      const pm = p.material as THREE.ShaderMaterial;
      pm.uniforms.uT.value = t; pm.uniforms.uDef.value = 0.03 + q * 0.09;
      pm.uniforms.uInt.value = Math.pow(1 - q, 1.7) * Math.pow(q, 0.35) * 2.6;
    });

    // emanação (arcos) — assenta na fotosfera e é absorvida
    arcos.visible = s > EMA - 0.02 && fim > 0.001;
    matArc.uniforms.uP.value = sst(EMA, 0.92, s); matArc.uniforms.uT.value = t;
    matArc.uniforms.uInt.value = sst(EMA, EMA + 0.07, s) * (1 - sst(0.78, 0.88, s)) * 0.95 * fim;
    if (matArc.uniforms.uInt.value < 0.002) arcos.visible = false;

    // jatos
    const j = sst(IGN + 0.02, IGN + 0.24, s) * (1 - sst(0.74, 0.86, s)) * fim;
    jatos.visible = j > 0.003; matJat.uniforms.uT.value = t; matJat.uniforms.uInt.value = j * 0.8;

    // CLARÃO da ignição (alimenta o bloom/exposição no sun.ts)
    return ign * (1 - sst(IGN + 0.01, IGN + 0.09, s)) * 0.9;
  };

  return { update, hide };
}

// Exporta o instante da ignição p/ o sun.ts alinhar o núcleo à mesma linha do tempo.
export const BIRTH_IGN = IGN;
