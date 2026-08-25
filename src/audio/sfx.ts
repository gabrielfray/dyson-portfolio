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

// --- Enigma "Contatos Imediatos" (5 tons sintetizados) ---
// Sequência do filme (John Williams), graus 2-3-1-1(8vb)-5 em dó maior:
// Ré – Mi – Dó – Dó(grave) – Sol. Índices 0..4 batem com a ordem do sinal.
const CONTACT_FREQS = [293.66, 329.63, 261.63, 130.81, 392.0]; // D4 E4 C4 C3 G4
function contactTone(ac: AudioContext, freq: number, t0: number, dur: number, vol: number): void {
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  g.connect(ac.destination);
  const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
  const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq; o2.detune.value = 5;
  const o3 = ac.createOscillator(); o3.type = 'sine'; o3.frequency.value = freq * 2; // harmônico brilhante
  const hg = ac.createGain(); hg.gain.value = 0.22; o3.connect(hg); hg.connect(g);
  o1.connect(g); o2.connect(g);
  for (const o of [o1, o2, o3]) { o.start(t0); o.stop(t0 + dur + 0.05); }
}
// tom de um easter egg (índice 0..4). Toca o tom correspondente do sinal.
export function playContactTone(i: number): void {
  const ac = getCtx(); contactTone(ac, CONTACT_FREQS[((i % 5) + 5) % 5], ac.currentTime, 0.6, 0.28);
}
// o "convite" completo — os 5 tons em sequência (dica ao morrer o sol)
export function playContactMotif(): void {
  const ac = getCtx(); let t = ac.currentTime + 0.15; const gap = 0.5;
  for (let i = 0; i < 5; i++) { contactTone(ac, CONTACT_FREQS[i], t, i === 3 ? 0.7 : 0.48, 0.3); t += gap; }
}
// clique errado: nota grave curta (reinicia a sequência)
export function playContactWrong(): void {
  const ac = getCtx(); contactTone(ac, 98, ac.currentTime, 0.3, 0.16);
}
// renascimento: swell cósmico luminoso (acorde maior ascendente + shimmer agudo
// + impacto grave), sincronizado com o clarão azul da supernova renascendo.
export function playSupernovaBirth(): void {
  const ac = getCtx(); const t0 = ac.currentTime;
  const master = ac.createGain();
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(0.34, t0 + 0.5);
  master.gain.exponentialRampToValueAtTime(0.0008, t0 + 3.4);
  master.connect(ac.destination);
  // acorde maior que sobe uma oitava em ~0.6s (a estrela "acendendo")
  for (const f of [261.63, 329.63, 392.0, 523.25, 659.25]) {
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f * 0.5, t0);
    o.frequency.exponentialRampToValueAtTime(f, t0 + 0.6);
    const g = ac.createGain(); g.gain.value = 0.15;
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 3.5);
  }
  // shimmer agudo que floresce junto com o clarão
  for (const f of [1046.5, 1318.5, 1568.0]) {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.0006, t0 + 2.4);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 2.5);
  }
  // impacto grave (whoosh) no instante do estouro azul
  const sub = ac.createOscillator(); sub.type = 'sine';
  sub.frequency.setValueAtTime(120, t0); sub.frequency.exponentialRampToValueAtTime(52, t0 + 0.9);
  const sg = ac.createGain();
  sg.gain.setValueAtTime(0.0001, t0); sg.gain.linearRampToValueAtTime(0.26, t0 + 0.18); sg.gain.exponentialRampToValueAtTime(0.0006, t0 + 1.5);
  sub.connect(sg); sg.connect(master); sub.start(t0); sub.stop(t0 + 1.6);
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
}

// Roteia a tecla do easter egg p/ o efeito certo (fácil de estender depois).
export function playAnomalySfx(key: string): void {
  stopAllSfx(); // nunca sobrepõe dois sons
  if (key === 'ufo') playUfo();
  else if (FILES[key]) playFile(key);
}
