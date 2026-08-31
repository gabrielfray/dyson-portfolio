// Efeitos sonoros dos easter eggs.
// - OVNI: gemido mecânico sintetizado via Web Audio (procedural, sem arquivo).
// - TARDIS: som real em public/sounds/tardis.mp3.
// Regras: só tocam no CLIQUE (não no hover), volume comedido, e qualquer novo
// clique interrompe o som anterior (ver stopAllSfx + listener em App).

const UFO_VOLUME = 0.18;
const TARDIS_VOLUME = 0.25;

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// --- OVNI (sintetizado) ---
let ufoNodes: AudioScheduledSourceNode[] = [];
let ufoMaster: GainNode | null = null;

export function playUfo(): void {
  stopUfo(); // reinício limpo, nunca sobrepõe
  const ac = getCtx();
  const t0 = ac.currentTime;
  const dur = 6;

  const master = ac.createGain();
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(UFO_VOLUME, t0 + 0.2);
  master.gain.setValueAtTime(UFO_VOLUME, t0 + dur - 0.8);
  master.gain.linearRampToValueAtTime(0, t0 + dur);
  master.connect(ac.destination);
  ufoMaster = master;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 320;
  bp.Q.value = 3.5;
  bp.connect(master);

  const wob = ac.createOscillator(); // wobble do filtro = o "wheeze"
  wob.type = 'sine';
  wob.frequency.value = 7;
  const wobGain = ac.createGain();
  wobGain.gain.value = 190;
  wob.connect(wobGain);
  wobGain.connect(bp.frequency);

  const bodyGain = ac.createGain();
  bodyGain.gain.value = 0.45;
  bodyGain.connect(bp);
  for (const f of [55, 82.5, 110]) { // serras graves detunadas c/ leve deslize
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.detune.value = (f % 7) - 3.5;
    o.frequency.setValueAtTime(f, t0);
    o.frequency.linearRampToValueAtTime(f * 1.06, t0 + dur);
    o.connect(bodyGain);
    ufoNodes.push(o);
  }

  const noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuf;
  const nbp = ac.createBiquadFilter();
  nbp.type = 'bandpass';
  nbp.frequency.value = 800;
  nbp.Q.value = 1.1;
  const nGain = ac.createGain();
  nGain.gain.value = 0.1;
  noise.connect(nbp);
  nbp.connect(nGain);
  nGain.connect(bp);

  const pulse = ac.createOscillator(); // ritmo "vworp"
  pulse.type = 'sine';
  pulse.frequency.value = 0.7;
  const pulseGain = ac.createGain();
  pulseGain.gain.value = 0.32;
  pulse.connect(pulseGain);
  pulseGain.connect(bodyGain.gain);

  ufoNodes.push(wob, noise, pulse);
  for (const n of ufoNodes) { n.start(t0); n.stop(t0 + dur); }
  // limpa as refs quando terminar sozinho
  noise.onended = () => { if (ufoMaster === master) { ufoNodes = []; ufoMaster = null; } };
}

function stopUfo(): void {
  if (!ctx || !ufoMaster) return;
  const now = ctx.currentTime;
  try {
    ufoMaster.gain.cancelScheduledValues(now);
    ufoMaster.gain.setValueAtTime(ufoMaster.gain.value, now);
    ufoMaster.gain.linearRampToValueAtTime(0, now + 0.06); // fade rápido (evita clique)
  } catch { /* nó já parado */ }
  for (const n of ufoNodes) { try { n.stop(now + 0.08); } catch { /* já parado */ } }
  ufoNodes = [];
  ufoMaster = null;
}

// --- Enigma do sinal — 5 tons do espaço profundo (síntese subtrativa) ---
// Contorno inspirado no motivo de 5 notas de ficção, mas com o 1º intervalo
// ALTERADO (+2 -> +3): mantém a "sensação" sem citar a obra de forma direta.
const CONTACT_ROOT = 392.0;
const CONTACT_SEMI = [0, 3, -2, -14, -7];
const CONTACT_FREQS = CONTACT_SEMI.map((s) => CONTACT_ROOT * Math.pow(2, s / 12));
const CONTACT_BRIGHT = 2600; // Hz — brilho do passa-baixas
const CONTACT_STEP = 0.56;   // s por nota (andamento)
const CONTACT_REV = 0.62;    // reverberação (0..1)

// reverb por convolução (cauda de ruído com decaimento exponencial) + mix
// molhado/seco. Criado uma vez, reaproveitado. É o que dá o "espaço" do sinal.
let contactBus: { seco: GainNode; molhado: GainNode } | null = null;
function getContactBus(ac: AudioContext): { seco: GainNode; molhado: GainNode } {
  if (contactBus) return contactBus;
  const out = ac.createGain(); out.gain.value = 0.85; out.connect(ac.destination);
  const dur = 3.4, rate = ac.sampleRate;
  const ir = ac.createBuffer(2, Math.floor(rate * dur), rate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const t = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (1 - t * 0.15); }
  }
  const conv = ac.createConvolver(); conv.buffer = ir;
  const molhado = ac.createGain(); molhado.gain.value = CONTACT_REV * 0.9; molhado.connect(conv); conv.connect(out);
  const seco = ac.createGain(); seco.gain.value = 1 - CONTACT_REV * 0.45; seco.connect(out);
  contactBus = { seco, molhado };
  return contactBus;
}

// uma nota = 3 osciladores desafinados (dente de serra + quadrada + senoide grave)
// -> passa-baixas com envelope próprio -> envelope de amplitude, com vibrato leve.
// (porta fiel do sintetizador de referência.)
function contactNote(ac: AudioContext, freq: number, when: number, dur: number, bright: number): void {
  const { seco, molhado } = getContactBus(ac);
  const g = ac.createGain();
  const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 1.6;
  filt.frequency.setValueAtTime(bright * 0.35, when);
  filt.frequency.linearRampToValueAtTime(bright, when + 0.09);
  filt.frequency.exponentialRampToValueAtTime(Math.max(180, bright * 0.28), when + dur);
  const layers: [OscillatorType, number, number, number][] = [
    ['sawtooth', 1, -5, 0.42],
    ['square', 1, 6, 0.18],
    ['sine', 0.5, 0, 0.34], // sub, dá peso
  ];
  const oscs: OscillatorNode[] = [];
  for (const [type, mult, det, vol] of layers) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq * mult; o.detune.value = det;
    const gv = ac.createGain(); gv.gain.value = vol; o.connect(gv); gv.connect(filt); oscs.push(o);
  }
  const lfo = ac.createOscillator(), lfoG = ac.createGain(); // vibrato leve
  lfo.frequency.value = 4.7; lfoG.gain.value = freq * 0.0042; lfo.connect(lfoG);
  for (const o of oscs) lfoG.connect(o.frequency);
  filt.connect(g); g.connect(seco); g.connect(molhado);
  const a = 0.045, r = Math.min(0.5, dur * 0.55); // ataque suave evita o clique
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.55, when + a);
  g.gain.setValueAtTime(0.55, when + dur - r);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur + r);
  for (const o of [...oscs, lfo]) { o.start(when); o.stop(when + dur + r + 0.1); }
}

// tom de um easter egg (índice 0..4). Toca o tom correspondente do sinal.
export function playContactTone(i: number): void {
  const ac = getCtx(); contactNote(ac, CONTACT_FREQS[((i % 5) + 5) % 5], ac.currentTime + 0.02, CONTACT_STEP * 0.86, CONTACT_BRIGHT);
}
// PREVIEW no hover: toca o tom da anomalia (mais curto/suave), SEM contar jogada.
// toneIdx 0..4 = uma das notas do sinal; -1 = decoy -> nota FORA do sinal (quem
// conhece o motivo percebe que ela não pertence à sequência).
export function playAnomalyPreview(toneIdx: number, seed = 0): void {
  const ac = getCtx();
  const freq = toneIdx >= 0
    ? CONTACT_FREQS[((toneIdx % 5) + 5) % 5]
    : CONTACT_ROOT * Math.pow(2, [5, -5, 8][seed % 3] / 12); // nota que não está no sinal
  contactNote(ac, freq, ac.currentTime + 0.02, CONTACT_STEP * 0.5, CONTACT_BRIGHT * 0.85);
}
// clique errado: acorde grave DISSONANTE (duas notas a um trítono) — o "não".
export function playContactWrong(): void {
  const ac = getCtx(); const t = ac.currentTime + 0.02;
  contactNote(ac, 96, t, 0.5, 900);       // grave
  contactNote(ac, 96 * Math.pow(2, 6 / 12), t, 0.5, 900); // + trítono (dissonância)
}

// Sons "cinemáticos" de arquivo tocados em elementos próprios: tocam inteiros,
// nunca são cortados por cliques (ao contrário dos eggs, que passam por stopAllSfx).
const oneShots: Record<string, HTMLAudioElement> = {};
const oneShotTimers: Record<string, number> = {};
function playOneShot(name: string, vol: number, delayMs = 0): void {
  window.clearTimeout(oneShotTimers[name]);
  const start = () => {
    let a = oneShots[name];
    if (!a) { a = new Audio(import.meta.env.BASE_URL + 'sounds/' + name); a.preload = 'auto'; oneShots[name] = a; }
    a.volume = vol; a.currentTime = 0;
    void a.play().catch(() => { /* sem gesto/arquivo ausente: ignora */ });
  };
  if (delayMs > 0) oneShotTimers[name] = window.setTimeout(start, delayMs);
  else start();
}
// o "convite": os 5 tons em sequência; a última é sustentada (dur = passo*2.6),
// é ela que deixa a frase em aberto. Mesmo timbre dos eggs (reproduzir de ouvido).
export function playContactMotif(): void {
  const ac = getCtx(); const t0 = ac.currentTime + 0.1; const passo = CONTACT_STEP;
  CONTACT_FREQS.forEach((f, i) => contactNote(ac, f, t0 + i * passo, i === 4 ? passo * 2.6 : passo * 0.86, CONTACT_BRIGHT));
}
// renascimento: explosão da supernova (Crab, gravação real). Atraso de 8,2s p/ o
// pico do clipe (~5,7s) cair na IGNIÇÃO visual (SN_REVIVE_BLAST = 13,9s no revive).
export function playSupernovaBirth(): void { playOneShot('supernova-birth.mp3', 0.5, 8200); }

// Som do REINÍCIO — pequena PEÇA cinematográfica (não sound-design de bipe),
// casada com a transição do /reiniciar. Progressão IV -> I (Fá -> Dó, cadência
// "plagal/amém" = restauração): (1) pad grave em Fá sobe no MERGULHO; (2) no
// WHITEOUT (~1,0s) resolve num acorde de Dó maior que floresce + sinos brilhantes
// + sub grave; (3) arpejo ascendente (sistemas ONLINE) sobre o pad que dura ~3s.
// Tudo com reverb p/ espaço. Auto-termina; atravessa o remount sem cortar.
export function playRestart(): void {
  const ac = getCtx();
  const t0 = ac.currentTime + 0.02;
  // glue/limiter + master
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
  const master = ac.createGain(); master.gain.value = 0.7; master.connect(comp).connect(ac.destination);
  // reverb (convolução com IR de ruído decaindo) — cauda de "sala grande"
  const irLen = Math.floor(ac.sampleRate * 2.8);
  const ir = ac.createBuffer(2, irLen, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
  const reverb = ac.createConvolver(); reverb.buffer = ir;
  const wet = ac.createGain(); wet.gain.value = 0.5; reverb.connect(wet).connect(master);
  const bus = ac.createGain(); bus.connect(master); bus.connect(reverb); // dry + send

  // voz: oscilador com envelope (ataque/decaimento) -> bus
  const voice = (freq: number, start: number, dur: number, peak: number, type: OscillatorType, det: number, atk: number) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(bus); o.start(start); o.stop(start + dur + 0.05);
  };
  // acorde (pad) — cada nota dobrada com leve detune p/ largura
  const chord = (freqs: number[], start: number, dur: number, peak: number, atk: number) =>
    freqs.forEach((f) => { voice(f, start, dur, peak, 'sine', -5, atk); voice(f, start, dur, peak, 'sine', 6, atk); });

  // (1) MERGULHO — pad grave em Fá maior sobe (ataque lento ~0,9s)
  chord([87.31, 130.81, 174.61, 220.0], t0, 1.35, 0.05, 0.9); // F2 C3 F3 A3

  // (2) WHITEOUT (~1,0s) — resolve em Dó maior (floresce) + sub + sinos
  const impT = t0 + 0.95;
  chord([130.81, 164.81, 196.0, 261.63], impT, 3.0, 0.055, 0.28); // C3 E3 G3 C4 (sustenta na cauda)
  voice(65.41, impT + 0.05, 0.7, 0.16, 'sine', 0, 0.02); // C2 — peso do impacto
  voice(523.25, impT + 0.05, 1.8, 0.09, 'triangle', 0, 0.008); // C5 sino
  voice(659.25, impT + 0.10, 1.7, 0.07, 'triangle', 0, 0.008); // E5 sino

  // (3) ONLINE — arpejo ascendente de Dó sobre o pad (sistemas voltando)
  [261.63, 329.63, 392.0, 523.25, 659.25].forEach((f, i) => // C4 E4 G4 C5 E5
    voice(f, t0 + 1.15 + i * 0.17, 1.2, 0.055, 'sine', 0, 0.012));
}

// Rumble do COLAPSO: enche os ~14s de queda livre até a ignição (senão fica um
// silêncio antes do estouro). Sub grave + ruído filtrado que sobem de tom e volume
// e climaxam na ignição; o mp3 (blast) assume dali. Auto-termina (não corta cliques).
export function playCollapseRumble(): void {
  const ac = getCtx();
  const t0 = ac.currentTime, dur = 13.9;
  const sub = ac.createOscillator(); sub.type = 'sawtooth';
  sub.frequency.setValueAtTime(26, t0); sub.frequency.exponentialRampToValueAtTime(78, t0 + dur);
  const subG = ac.createGain();
  subG.gain.setValueAtTime(0.0001, t0);
  subG.gain.exponentialRampToValueAtTime(0.17, t0 + dur * 0.94);
  subG.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.7);
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource(); noise.buffer = nb; noise.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(120, t0); lp.frequency.exponentialRampToValueAtTime(1100, t0 + dur);
  const nG = ac.createGain();
  nG.gain.setValueAtTime(0.0001, t0);
  nG.gain.exponentialRampToValueAtTime(0.10, t0 + dur * 0.92);
  nG.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.6);
  sub.connect(subG).connect(ac.destination);
  noise.connect(lp).connect(nG).connect(ac.destination);
  sub.start(t0); noise.start(t0);
  sub.stop(t0 + dur + 0.9); noise.stop(t0 + dur + 0.8);
}

// --- Eggs com arquivo de áudio (public/sounds/<arquivo>) ---
const FILES: Record<string, string> = {
  tardis: 'tardis.mp3',
  voyager: 'voyager.mp3', // "Johnny B. Goode" — está no Golden Record da Voyager
  oumuamua: 'oumuamua.mp3',
  hailmary: 'hailmary.mp3', // refrão da música (fornecido pelo usuário)
  supernova: 'supernova.mp3', // preparação + explosão (blast em ~11,9s do clipe)
};
// volume por arquivo (0-1); cai no padrão se não listado
const FILE_VOLUME: Record<string, number> = {
  voyager: 0.08, // música — bem baixinho
  hailmary: 0.16,
  supernova: 0.4, // explosão precisa de peso (clipe tem trilha baixa + blast em 0 dBFS)
};
const audioCache: Record<string, HTMLAudioElement> = {};
let currentFile: HTMLAudioElement | null = null;
let currentKey: string | null = null;
let fadeTimer = 0;
let onFileEnded: (() => void) | null = null;
// aviso de fim da música (usado p/ encerrar animações atreladas, ex.: modo IR)
export function setOnFileEnded(cb: (() => void) | null): void { onFileEnded = cb; }
// key do som de arquivo tocando agora (null se nenhum). Usado p/ proteger o
// evento do Hail Mary de ser interrompido por cliques fora — ele roda até o fim.
export function currentSfxKey(): string | null { return currentKey; }

function playFile(key: string): void {
  const name = FILES[key];
  if (!name) return;
  let a = audioCache[key];
  if (!a) {
    a = new Audio(import.meta.env.BASE_URL + 'sounds/' + name);
    a.preload = 'auto';
    audioCache[key] = a;
  }
  clearInterval(fadeTimer);
  a.volume = FILE_VOLUME[key] ?? TARDIS_VOLUME;
  a.currentTime = 0;
  a.onended = () => { if (currentFile === a) { currentFile = null; currentKey = null; onFileEnded?.(); } };
  currentFile = a;
  currentKey = key;
  void a.play().catch(() => { /* arquivo ausente ou sem gesto: ignora */ });
}

// Para com fade suave (não corta seco).
function stopFile(): void {
  const a = currentFile;
  if (!a) return;
  currentFile = null;
  currentKey = null;
  a.onended = null;
  clearInterval(fadeTimer);
  const v0 = a.volume, t0 = performance.now();
  fadeTimer = window.setInterval(() => {
    const k = (performance.now() - t0) / 600;
    if (k >= 1) { try { a.pause(); a.currentTime = 0; a.volume = v0; } catch { /* ignora */ } clearInterval(fadeTimer); }
    else a.volume = v0 * (1 - k);
  }, 30);
}

// Interrompe qualquer efeito tocando (chamado em todo clique, antes de tocar).
export function stopAllSfx(): void {
  stopUfo();
  stopFile();
  for (const k in oneShotTimers) window.clearTimeout(oneShotTimers[k]); // cancela one-shots agendados (ex.: reset durante o atraso)
}

// Roteia a tecla do easter egg p/ o efeito certo (fácil de estender depois).
export function playAnomalySfx(key: string): void {
  stopAllSfx(); // nunca sobrepõe dois sons
  if (key === 'ufo') playUfo();
  else if (FILES[key]) playFile(key);
}
