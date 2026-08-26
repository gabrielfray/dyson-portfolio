import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import { CONTACT, type Lang } from '../data/content';

// Terminal do rescaldo: canto sup. esquerdo (lugar do nome/console), SEM caixa —
// log de erros escrito DURANTE o evento (timestamps reais, ordem real) que se
// degrada no fim (corrupção discreta). Aceita comandos num <input> de verdade.
const Wrap = styled.div`
  position: fixed;
  top: 96px;
  left: 40px;
  z-index: 40;
  width: min(560px, 90vw);
  pointer-events: none;
  font-family: ${MONO};
  animation: fadeIn 0.8s ease 0.3s both;
  @media (max-width: 560px) {
    top: max(56px, calc(env(safe-area-inset-top) + 42px));
    left: 12px; width: 500px; transform: scale(0.66); transform-origin: top left;
  }
`;
const Header = styled.div`display: flex; align-items: center; gap: 10px; margin-bottom: 12px;`;
const Dot = styled.span`width: 8px; height: 8px; border-radius: 99px; background: #ff5a5a; box-shadow: 0 0 10px rgba(255,90,90,.9); animation: blink 1.1s ease infinite;`;
const HLabel = styled.span`font-size: 11px; letter-spacing: 0.3em; color: rgba(238,232,218,.45);`;
const Line = styled.div<{ $k?: string }>`
  font-size: 12.5px; line-height: 1.95; letter-spacing: 0.03em; white-space: pre-wrap; word-break: break-word;
  color: ${(p) => (
    p.$k === 'err' ? '#ff6a6a'
    : p.$k === 'hint' ? AMBER
    : p.$k === 'warn' ? 'rgba(255,180,120,.85)'
    : p.$k === 'ok' ? 'rgba(150,220,175,.85)'
    : p.$k === 'input' ? '#f2ede1'
    : 'rgba(238,232,218,.58)')};
  text-shadow: 0 1px 4px rgba(0,0,0,.95), 0 0 12px rgba(0,0,0,.8);
`;
const Prompt = styled.form`display: flex; align-items: baseline; gap: 8px; margin-top: 12px; pointer-events: auto;`;
const PLabel = styled.span`font-size: 12.5px; letter-spacing: 0.06em; color: ${AMBER};`;
const Input = styled.input`
  flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #fff;
  font-family: ${MONO}; font-size: 12.5px; letter-spacing: 0.06em; caret-color: ${AMBER};
  &::placeholder { color: rgba(238,232,218,.28); }
`;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
// aceita comando com ou sem a barra ("/ajuda" ou "ajuda"), sem acento, minúsculo
const norm = (s: string) => s.trim().replace(/^\/+/, '').toLowerCase().normalize('NFD').replace(DIACRITICS, '');

// corrupção discreta: injeta 1-2 marcas de rasura (combining) num trecho, como se
// o próprio sistema que escreve o log estivesse sendo destruído. Se exagerar, enfeita.
const CX = ['̶', '̷', '̸'];
const glitch = (w: string) => {
  const a = [...w];
  [Math.floor(a.length * 0.45), Math.floor(a.length * 0.75)].forEach((k, j) => { if (a[k]) a[k] = a[k] + CX[j % CX.length]; });
  return a.join('');
};
// leader pontilhado (fonte mono): "label ...... valor" com largura fixa da coluna
const lead = (label: string, value: string, w = 20) => `${label} ${'.'.repeat(Math.max(3, w - label.length))} ${value}`;
// linha da timeline: "T+ts   > label ...... valor" (timestamp em coluna fixa)
const tl = (ts: string, label: string, value: string) => `${ts.padEnd(9)}> ${lead(label, value)}`;

type L = [string, string]; // [texto, tipo]

// Log que se escreve DURANTE o colapso: primeiro a linha confiante (ironia), o
// código real da supernova, e a cronologia com tempos reais na ordem real.
const bootLog = (lang: Lang): L[] => lang === 'pt'
  ? [
      ['> integridade da casca ......... 100%', 'ok'],
      ['> ERRO FATAL [SN-1987A] · núcleo colapsou', 'err'],
      ['> contenção perdida — supernova', 'err'],
      [tl('T+0,25s', 'núcleo', 'COLAPSO'), 'warn'],
      [tl('T+10s', 'neutrinos', '9,9e45 J · atravessaram tudo'), 'info'],
      [tl('T+3,2m', 'MERCÚRIO', 'perdido'), 'warn'],
      [tl('T+6,0m', 'VÊNUS', 'perdido'), 'warn'],
      [tl('T+8,3m', 'TERRA', 'perdido'), 'warn'],
      [tl('T+8,3m', 'casca de Dyson', '3,59e20 J/m² recebidos'), 'warn'],
      [tl('T+12,7m', 'MARTE', glitch('perdido')), 'warn'],
      [tl('T+5,5h', 'PLUTÃO', 'perdido · sim, ele também'), 'warn'],
      [tl('T+21,6h', 'JÚPITER', 'atmosfera arrancada'), 'warn'],
      [tl('T+10,1d', 'remanescente', glitch('GIGANTE AZUL')), 'hint'],
      ['', 'info'],
      ['> seções perdidas ...... SOBRE · EXPERIÊNCIA · STACK', 'warn'],
      ['> seções recuperáveis .. PROJETOS · SERVIÇOS · CONTATO', 'ok'],
    ]
  : [
      ['> shell integrity ............. 100%', 'ok'],
      ['> FATAL ERROR [SN-1987A] · core collapsed', 'err'],
      ['> containment lost — supernova', 'err'],
      [tl('T+0.25s', 'core', 'COLLAPSE'), 'warn'],
      [tl('T+10s', 'neutrinos', '9.9e45 J · passed through all'), 'info'],
      [tl('T+3.2m', 'MERCURY', 'lost'), 'warn'],
      [tl('T+6.0m', 'VENUS', 'lost'), 'warn'],
      [tl('T+8.3m', 'EARTH', 'lost'), 'warn'],
      [tl('T+8.3m', 'Dyson shell', '3.59e20 J/m² received'), 'warn'],
      [tl('T+12.7m', 'MARS', glitch('lost')), 'warn'],
      [tl('T+5.5h', 'PLUTO', 'lost · yes, it too'), 'warn'],
      [tl('T+21.6h', 'JUPITER', 'atmosphere stripped'), 'warn'],
      [tl('T+10.1d', 'remnant', glitch('BLUE GIANT')), 'hint'],
      ['', 'info'],
      ['> sections lost ........ ABOUT · EXPERIENCE · STACK', 'warn'],
      ['> sections recoverable . PROJECTS · SERVICES · CONTACT', 'ok'],
    ];

const statusLines = (lang: Lang): L[] => lang === 'pt'
  ? [
      ['> SN-1987A · núcleo colapsado', 'err'],
      ['> perdidos: rochosos · Dyson · Plutão', 'warn'],
      ['> sobreviventes: Júpiter · Saturno · Urano · Netuno', 'info'],
      ['> remanescente: gigante azul (#b5cdff)', 'hint'],
    ]
  : [
      ['> SN-1987A · core collapsed', 'err'],
      ['> lost: rocky · Dyson · Pluto', 'warn'],
      ['> survivors: Jupiter · Saturn · Uranus · Neptune', 'info'],
      ['> remnant: blue giant (#b5cdff)', 'hint'],
    ];

// SÓ estes reiniciam a simulação (nenhum outro comando reinicia).
const RESET = new Set(['reiniciar', 'reiniciar simulacao', 'restart', 'restart simulation', 'reboot']);

// menu de comandos, alinhado como terminal (cmd ..... descrição)
const cmd = (c: string, d: string) => `  ${c} ${'.'.repeat(Math.max(2, 14 - c.length))} ${d}`;
const helpLines = (lang: Lang): L[] => lang === 'pt'
  ? [
      ['> comandos disponíveis:', 'ok'],
      [cmd('/ajuda', 'este menu'), 'info'],
      [cmd('/status', 'relatório do evento'), 'info'],
      [cmd('/contato', 'canais de contato'), 'info'],
      [cmd('/plutao', 'sobre o Plutão'), 'info'],
      [cmd('/neutrinos', 'sobre os neutrinos'), 'info'],
      [cmd('/dyson', 'sobre a casca'), 'info'],
      [cmd('/reiniciar', 'reinicia a simulação'), 'hint'],
    ]
  : [
      ['> available commands:', 'ok'],
      [cmd('/help', 'this menu'), 'info'],
      [cmd('/status', 'event report'), 'info'],
      [cmd('/contact', 'contact channels'), 'info'],
      [cmd('/pluto', 'about Pluto'), 'info'],
      [cmd('/neutrinos', 'about the neutrinos'), 'info'],
      [cmd('/dyson', 'about the shell'), 'info'],
      [cmd('/restart', 'restart the simulation'), 'hint'],
    ];
const contatoLines = (lang: Lang): L[] => [
  [lang === 'pt' ? '> canais de contato:' : '> contact channels:', 'ok'],
  [cmd('e-mail', CONTACT.email), 'info'],
  [cmd('linkedin', CONTACT.linkedin.replace('https://www.', '')), 'info'],
  [cmd('github', CONTACT.github.replace('https://', '')), 'info'],
  [cmd('whatsapp', CONTACT.phone), 'info'],
];

export function ResetTerminal({ lang, onReset }: { lang: Lang; onReset: () => void }) {
  const [lines, setLines] = useState<L[]>([]);
  const [history, setHistory] = useState<L[]>([]); // comandos digitados + respostas
  const [ready, setReady] = useState(false);
  const [val, setVal] = useState('');
  const tok = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pt = lang === 'pt';

  useEffect(() => {
    tok.current += 1;
    const my = tok.current;
    const defs = bootLog(lang);
    (async () => {
      await sleep(900);
      if (my !== tok.current) return;
      setHistory([]); setLines([]);
      const out: L[] = [];
      for (const [text, k] of defs) {
        if (my !== tok.current) return;
        out.push(['', k]);
        for (let i = 1; i <= text.length; i++) {
          if (my !== tok.current) return;
          out[out.length - 1] = [text.slice(0, i), k];
          setLines([...out]);
          await sleep(text ? 5 : 0);
        }
        await sleep(text ? 70 : 40);
      }
      if (my === tok.current) { setReady(true); setTimeout(() => inputRef.current?.focus(), 40); }
    })();
    return () => { tok.current += 1; };
  }, [lang]);

  const run = (raw: string) => {
    const t = raw.trim();
    setVal('');
    if (!t) return;
    const out: L[] = [[`> ${t}`, 'input']]; // echo do que foi digitado
    // a barra é OBRIGATÓRIA: sem "/" no início não é comando
    if (!t.startsWith('/')) {
      out.push([pt ? '> comando não reconhecido · digite /ajuda' : '> command not recognized · type /help', 'err']);
      setHistory((h) => [...h, ...out]);
      return;
    }
    const n = norm(t); // remove a "/", acentos e maiúsculas
    if (RESET.has(n)) { onReset(); return; } // ÚNICO que reinicia a simulação
    if (n === 'ajuda' || n === 'help' || n === 'comandos' || n === 'commands' || n === '?') {
      out.push(...helpLines(lang));
    } else if (n === 'contato' || n === 'contact') {
      out.push(...contatoLines(lang));
    } else if (n === 'status') {
      out.push(...statusLines(lang));
    } else if (n === 'plutao') {
      out.push([pt ? '> não é planeta desde 2006. destruído mesmo assim.' : '> not a planet since 2006. destroyed anyway.', 'info']);
    } else if (n === 'neutrinos') {
      out.push([pt ? '> 99% da energia. ninguém viu.' : '> 99% of the energy. nobody saw it.', 'info']);
    } else if (n === 'dyson') {
      out.push([pt ? '> 2,81e17 km². evaporou em 8 minutos.' : '> 2.81e17 km². gone in 8 minutes.', 'info']);
    } else if (n === 'sudo') {
      out.push([pt ? '> nem sudo desfaz supernova.' : '> not even sudo undoes a supernova.', 'warn']);
    } else {
      out.push([pt ? '> comando não reconhecido · digite /ajuda' : '> command not recognized · type /help', 'err']);
    }
    setHistory((h) => [...h, ...out]);
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); run(val); };
  // só as ÚLTIMAS linhas (scrollback descartado, como num terminal) -> o prompt
  // nunca é empurrado p/ fora da tela por mais comandos que se digite.
  const MAX_LINES = 22;
  const shown = [...lines, ...history].slice(-MAX_LINES);

  return (
    <Wrap onPointerDown={() => inputRef.current?.focus()}>
      <Header><Dot /><HLabel>GF://SISTEMA</HLabel></Header>
      {shown.map(([text, k], i) => (<Line key={i} $k={k}>{text || ' '}</Line>))}
      {ready && (
        <Prompt onSubmit={submit}>
          <PLabel>&gt;</PLabel>
          <Input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={pt ? 'digite /ajuda' : 'type /help'}
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
        </Prompt>
      )}
    </Wrap>
  );
}
