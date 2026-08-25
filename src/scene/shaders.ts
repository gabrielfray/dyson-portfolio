// GLSL centralizado da cena.

// Estrelas (Points): cintilação por tempo, cor por vértice, sprite radial.
export const STAR_VERT = `attribute float aSize; attribute float aPhase; attribute float aTw;
  varying vec3 vColor; varying float vTwinkle; uniform float uTime;
  void main(){ vColor = color;
    float tw = sin(uTime*(1.5+aTw*3.0)+aPhase)*0.5+0.5;
    vTwinkle = mix(1.0-aTw, 1.0, tw);
    vec4 mv = modelViewMatrix*vec4(position,1.0);
    gl_PointSize = aSize*(300.0/-mv.z)*(0.85+0.3*tw);
    gl_Position = projectionMatrix*mv; }`;
export const STAR_FRAG = `uniform sampler2D uMap; uniform float uIr; varying vec3 vColor; varying float vTwinkle;
  void main(){ vec4 tex = texture2D(uMap, gl_PointCoord);
    vec3 c = vColor*vTwinkle;
    float lum = dot(c, vec3(0.299,0.587,0.114));
    vec3 ir = vec3(pow(lum,0.65)*1.5, lum*0.22, lum*0.10); // troca de detector: leitura infravermelha
    c = mix(c, ir, uIr);
    gl_FragColor = vec4(c, tex.a); }`;

// Sol: plasma procedural (simplex noise + fbm), fresnel no núcleo, pulso.
export const GLOW_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
    vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
    vP = normalize(position); gl_Position = projectionMatrix*mv; }`;
export const GLOW_FRAG = `precision highp float;
  varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uTime; uniform float uReborn;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x = x_*ns.x + ns.yyyy;
    vec4 y = y_*ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0*dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  float fbm(vec3 p){ float f = 0.0, a = 0.5;
    for(int i=0;i<5;i++){ f += a*snoise(p); p *= 2.03; a *= 0.55; }
    return f; }
  void main(){
    float d = max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 q = vP*2.6;
    float n1 = fbm(q + uTime*0.12);
    float n2 = fbm(q*1.7 - uTime*0.18 + n1*1.5);
    float plasma = 0.5 + 0.5*n2;
    float fil = pow(1.0 - abs(n1), 3.0);
    vec3 deep  = vec3(0.85, 0.32, 0.04);
    vec3 amber = vec3(1.0, 0.52, 0.10);
    vec3 gold  = vec3(1.0, 0.72, 0.28);
    vec3 core  = vec3(1.0, 0.94, 0.78);
    vec3 col = mix(deep, amber, plasma);
    col = mix(col, gold, fil*0.9);
    col = mix(col, core, pow(d, 5.0)*(0.55+0.45*plasma));
    float pulse = 1.0 + 0.05*sin(uTime*1.1);
    float a = pow(d, 2.4)*(1.1+0.5*plasma)*pulse;
    col = mix(col, col.bgr, uReborn); // renascimento: plasma dourado -> azul (supernova)
    gl_FragColor = vec4(col*(1.05+0.55*fil)*pulse, min(a,1.0));
  }`;

// Sol (MOBILE): glow radial liso, SEM ruído fbm. GPUs mobile rodam o noise
// pesado do GLOW_FRAG em precisão instável e os filamentos "estouram" formando
// um jato vertical que o bloom amplifica. Aqui é só um fresnel suave e clampado
// (não pode estourar). Usa os mesmos varyings do GLOW_VERT. Desktop não usa isto.
export const GLOW_FRAG_MOBILE = `precision highp float;
  varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uTime; uniform float uReborn;
  void main(){
    float d = max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 amber = vec3(1.0, 0.55, 0.14);
    vec3 gold  = vec3(1.0, 0.74, 0.30);
    vec3 core  = vec3(1.0, 0.93, 0.76);
    vec3 col = mix(amber, gold, smoothstep(0.0, 0.6, d));
    col = mix(col, core, pow(d, 4.0));
    float pulse = 1.0 + 0.04*sin(uTime*1.1);
    float a = pow(d, 2.6) * 1.0 * pulse;
    col = mix(col, col.bgr, uReborn); // renascimento: dourado -> azul (supernova)
    gl_FragColor = vec4(clamp(col*pulse, 0.0, 1.6), clamp(a, 0.0, 1.0));
  }`;

// Planetas: iluminação a partir da origem (o sol) — hemisfério aceso + reflexo
// especular — independente das luzes da cena, para não afetar a estrutura.
export const PLANET_VERT = `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
export const PLANET_FRAG = `
  uniform vec3 uColor;
  uniform float uShin;
  uniform float uSpec;
  uniform float uAmbient;
  uniform float uIr;        // modo infravermelho (astrophage): tinge de vermelho
  uniform sampler2D uMap;   // faixas (gigantes) ou textura branca 1x1 (demais)
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vec3 albedo = uColor * texture2D(uMap, vUv).rgb;
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(-vWorldPos);              // luz vem da origem (o sol)
    float diff = max(dot(N, L), 0.0);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 H = normalize(L + V);
    float spec = (diff > 0.0 ? 1.0 : 0.0) * uSpec * pow(max(dot(N, H), 0.0), uShin);
    vec3 col = albedo * (uAmbient + diff) + vec3(spec);
    // sob a luz de Petrova o sistema fica avermelhado (mantém o relevo/sombreado)
    col = mix(col, col * vec3(1.5, 0.32, 0.26) + vec3(0.03, 0.0, 0.0), uIr);
    gl_FragColor = vec4(col, 1.0);
  }`;

// Borda atmosférica: casca ~6% maior, BackSide + aditivo, fresnel no limbo.
export const ATMO_FRAG = `
  uniform vec3 uAtmo;
  uniform float uI;
  uniform float uIr;        // modo infravermelho: halo atmosférico vira avermelhado
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(-vWorldPos);
    float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float lit = max(dot(N, L), 0.0);
    vec3 atmo = mix(uAtmo, vec3(0.85, 0.12, 0.10), uIr);
    gl_FragColor = vec4(atmo, f * uI * (0.25 + 0.9 * lit));
  }`;

// Anéis de Saturno: perfil radial real — C (tênue), B (denso), lacuna de
// Cassini (transparente), A (médio). vN = raio normalizado 0..1.
export const RING_VERT = `
  uniform float uInner;
  uniform float uOuter;
  varying float vN;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    float rad = length(position.xy);
    vN = (rad - uInner) / (uOuter - uInner);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
export const RING_FRAG = `
  uniform vec3 uColor;
  uniform float uIr;        // modo infravermelho: anéis avermelhados
  varying float vN;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  float dens(float n) {
    float a = 0.0;
    a += 0.32 * smoothstep(0.0, 0.04, n) * (1.0 - smoothstep(0.25, 0.30, n)); // anel C
    a += 0.90 * smoothstep(0.28, 0.33, n) * (1.0 - smoothstep(0.66, 0.70, n)); // anel B
    a += 0.60 * smoothstep(0.77, 0.81, n) * (1.0 - smoothstep(0.97, 1.0, n));  // anel A
    return clamp(a, 0.0, 1.0);
  }
  void main() {
    float op = dens(vN);
    if (op < 0.01) discard; // lacuna de Cassini some
    vec3 L = normalize(-vWorldPos);
    float lit = 0.45 + 0.55 * abs(dot(normalize(vWorldNormal), L));
    vec3 rc = mix(uColor, uColor * vec3(1.4, 0.35, 0.28), uIr);
    gl_FragColor = vec4(rc * lit, op);
  }`;
