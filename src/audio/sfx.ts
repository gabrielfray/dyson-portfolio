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

// --- Eggs com arquivo de áudio (public/sounds/<arquivo>) ---
const FILES: Record<string, string> = {
  tardis: 'tardis.mp3',
  voyager: 'voyager.mp3', // "Johnny B. Goode" — está no Golden Record da Voyager
  oumuamua: 'oumuamua.mp3',
};
// volume por arquivo (0-1); cai no padrão se não listado
const FILE_VOLUME: Record<string, number> = {
  voyager: 0.08, // música — bem baixinho
};
const audioCache: Record<string, HTMLAudioElement> = {};
let currentFile: HTMLAudioElement | null = null;

function playFile(key: string): void {
  const name = FILES[key];
  if (!name) return;
  let a = audioCache[key];
  if (!a) {
    a = new Audio(import.meta.env.BASE_URL + 'sounds/' + name);
    a.preload = 'auto';
    a.volume = FILE_VOLUME[key] ?? TARDIS_VOLUME;
    audioCache[key] = a;
  }
  a.currentTime = 0;
  currentFile = a;
  void a.play().catch(() => { /* arquivo ausente ou sem gesto: ignora */ });
}

function stopFile(): void {
  if (!currentFile) return;
  try {
    currentFile.pause();
    currentFile.currentTime = 0;
  } catch { /* ignora */ }
  currentFile = null;
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
