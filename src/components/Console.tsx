import { Fragment, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import type { TermLine } from '../hooks/useTerminal';
import type { Lang } from '../data/content';
import { playContactMotif } from '../audio/sfx';

const Wrap = styled.div`
  position: fixed;
  top: 96px;
  left: 40px;
  z-index: 10;
  width: min(460px, 88vw);
  pointer-events: none;
  font-family: ${MONO};
  animation: fadeIn 1.4s ease 0.4s both;
  @media (max-width: 560px) {
    top: max(56px, calc(env(safe-area-inset-top) + 42px));
    left: 12px;
    width: 380px;
    transform: scale(0.66);
    transform-origin: top left;
  }
`;

const Header = styled.div`display: flex; align-items: center; gap: 10px; margin-bottom: 14px;`;
const Dot = styled.span<{ $alert?: boolean }>`
  width: 8px; height: 8px; border-radius: 99px;
  background: ${(p) => (p.$alert ? '#ff6a6a' : AMBER)};
  box-shadow: 0 0 10px ${(p) => (p.$alert ? 'rgba(255,90,90,.9)' : 'rgba(255, 202, 112, 0.9)')};
  animation: blink 1.4s ease infinite;
`;
const HeaderLabel = styled.span`font-size: 11px; letter-spacing: 0.3em; color: rgba(238, 232, 218, 0.45); text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);`;
const Lines = styled.div`display: flex; flex-direction: column; min-height: 180px;`;
const Line = styled.div`
  letter-spacing: 0.05em; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 14px rgba(0, 0, 0, 0.8);
`;
const Cursor = styled.span`
  display: inline-block; width: 9px; height: 16px; background: ${AMBER}; margin-top: 4px;
  box-shadow: 0 0 8px rgba(255, 202, 112, 0.6); animation: blink 1s step-end infinite;
`;

// ---- Missão (protocolo do sinal), como continuação do console ----
type K = 'err' | 'warn' | 'ok' | 'accent' | 'dim' | 'instr';
const colorOf = (k?: K) =>
  k === 'err' ? '#ff6a6a'
  : k === 'warn' ? 'rgba(255,180,120,.9)'
  : k === 'ok' ? 'rgba(150,220,175,.9)'
  : k === 'accent' ? AMBER
  : 'rgba(238,232,218,.55)';
const MLine = styled.div<{ $k?: K }>`
  font-size: 13px; letter-spacing: 0.05em; line-height: 1.9; white-space: pre;
  color: ${(p) => colorOf(p.$k)};
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
`;
const MCursor = styled.span`
  display: inline-block; width: 8px; height: 14px; vertical-align: middle; background: ${AMBER};
  margin-left: 1px; box-shadow: 0 0 8px rgba(255, 202, 112, 0.6); animation: blink 1s step-end infinite;
`;
const Empty = styled.span`color: rgba(238,232,218,.22);`;
const Filled = styled.span`color: ${AMBER}; text-shadow: 0 0 8px rgba(255,202,112,.55);`;

const breath = keyframes`0%,100%{opacity:.7} 50%{opacity:1}`;
const SigDot = styled.span<{ $on?: boolean }>`
  display: inline-block;
  color: ${(p) => (p.$on ? '#eaf4ff' : '#9fc4ff')};
  text-shadow: 0 0 ${(p) => (p.$on ? '15px' : '7px')} rgba(120,170,255,${(p) => (p.$on ? '1' : '.5')});
  transform: scale(${(p) => (p.$on ? 1.45 : 1)});
  transition: color .1s ease, text-shadow .1s ease, transform .12s ease;
  animation: ${breath} 2.6s ease-in-out infinite;
`;

// pontos da ENTRADA: n cheios (●) + resto vazio (○)
function Dots({ n, total = 5 }: { n: number; total?: number }) {
  return (<>{Array.from({ length: total }, (_, i) => (i < n ? <Filled key={i}>● </Filled> : <Empty key={i}>○ </Empty>))}</>);
}
// pontos do SINAL: pulsam em sincronia com o "chamado" (pulse = índice aceso, -1 = nenhum)
function SigDots({ pulse }: { pulse: number }) {
  return (<>{[0, 1, 2, 3, 4].map((i) => (<SigDot key={i} $on={pulse === i}>● </SigDot>))}</>);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const boot = (lang: Lang): [K, string, string, string][] => (lang === 'pt'
  // [tipo, base, valor-temporário (apaga), valor-final] — se temp==='', digita direto
  ? [
      ['err', '> ERRO FATAL · fusão do núcleo interrompida', '', ''],
      ['warn', '> reiniciar ignição ......... ', 'tentando', 'FALHA'],
      ['err', '> contenção magnética ....... COLAPSO', '', ''],
      ['ok', '> varredura de emergência ... SINAL', '', ''],
      ['dim', '> origem .................... ', '???', 'espaço profundo'],
      ['ok', '> decodificando ............. 5 TONS', '', ''],
      ['accent', '> PROTOCOLO CONTATO ········ ATIVO', '', ''],
      ['ok', '> objetos desconhecidos ..... ', 'buscando', '7 detectados'],
      ['instr', '> localize-os e reproduza o sinal na ordem', '', ''],
    ]
  : [
      ['err', '> FATAL ERROR · core fusion halted', '', ''],
      ['warn', '> reignition ................ ', 'trying', 'FAILED'],
      ['err', '> magnetic containment ...... COLLAPSE', '', ''],
      ['ok', '> emergency sweep ........... SIGNAL', '', ''],
      ['dim', '> origin .................... ', '???', 'deep space'],
      ['ok', '> decoding .................. 5 TONES', '', ''],
      ['accent', '> CONTACT PROTOCOL ········· ACTIVE', '', ''],
      ['ok', '> unknown objects ........... ', 'scanning', '7 detected'],
      ['instr', '> find them and replay the signal in order', '', ''],
    ]);

// Boot sci-fi do PROTOCOLO CONTATO: linhas de erro que digitam (uma apaga e
// reescreve o valor), o protocolo é ativado, e então o SINAL toca (o "chamado")
// com os pontos pulsando em sincronia. Depois o jogador repete clicando as anomalias.
function MissionLines({ lang, entered }: { lang: Lang; entered: number }) {
  const [committed, setCommitted] = useState<[K, string][]>([]);
  const [cur, setCur] = useState<[K, string] | null>(null);
  const [ready, setReady] = useState(false);
  const [hideInstr, setHideInstr] = useState(false);
  const [pulse, setPulse] = useState(-1);
  const tok = useRef(0);
  const pt = lang === 'pt';

  useEffect(() => {
    tok.current += 1; const my = tok.current;
    const curStr = { v: '' };
    const set = (k: K, s: string) => { curStr.v = s; setCur([k, s]); };
    const grow = async (k: K, full: string) => { for (let i = curStr.v.length + 1; i <= full.length; i++) { if (my !== tok.current) return; set(k, full.slice(0, i)); await sleep(13); } };
    const shrink = async (k: K, len: number) => { const s = curStr.v; for (let i = s.length - 1; i >= len; i--) { if (my !== tok.current) return; set(k, s.slice(0, i)); await sleep(9); } };
    const commit = (k: K) => { const v = curStr.v; curStr.v = ''; setCur(null); setCommitted((c) => [...c, [k, v]]); };

    (async () => {
      await sleep(400);
      for (const [k, base, temp, final] of boot(lang)) {
        if (my !== tok.current) return;
        set(k, '');
        if (temp) { // digita valor temporário, apaga, reescreve (o "apagando escrevendo")
          await grow(k, base + temp); await sleep(520);
          await shrink(k, base.length); await grow(k, base + final);
        } else {
          await grow(k, base);
        }
        commit(k); await sleep(150);
      }
      if (my !== tok.current) return;
      setReady(true);
      await sleep(650);
      // o SINAL toca (o chamado) + pontos pulsam em sincronia (≈0,56s por nota)
      playContactMotif();
      for (let i = 0; i < 5; i++) window.setTimeout(() => { if (my === tok.current) setPulse(i); }, 120 + i * 560);
      window.setTimeout(() => { if (my === tok.current) setPulse(-1); }, 120 + 5 * 560 + 350);
      await sleep(7000);
      if (my === tok.current) setHideInstr(true);
    })();
    return () => { tok.current += 1; };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <MLine style={{ height: '12px' }} />
      {committed.map(([k, text], i) => (hideInstr && k === 'instr' ? null : <MLine key={i} $k={k}>{text}</MLine>))}
      {cur && <MLine $k={cur[0]}>{cur[1]}<MCursor /></MLine>}
      {ready && (
        <>
          <MLine>{pt ? '> sinal:   ' : '> signal:  '}<SigDots pulse={pulse} /></MLine>
          <MLine>{pt ? '> entrada: ' : '> input:   '}<Dots n={entered} /><MCursor /></MLine>
        </>
      )}
    </>
  );
}

// ---- MELTDOWN: sinal aceito -> núcleo reacende descontrolado -> supernova ----
const GLITCH = '▓▒░█▚▞╳#@%&*=+±§¤';
const noiseLine = () => '> ' + Array.from({ length: 12 + ((Math.random() * 24) | 0) }, () => GLITCH[(Math.random() * GLITCH.length) | 0]).join('');

const MAX_MELT = 16; // linhas visíveis: o portfólio ROLA p/ cima e sai conforme os erros entram

// Colapso: o sinal é ECOADO (notas repetem + bolinhas piscam), o contato é
// confirmado, e o núcleo reacende descontrolado — os erros vão ENTRANDO e EMPURRAM
// o portfólio (nome + infos) p/ cima até sair. Erros de TEXTO e de SÍMBOLOS
// intercalados. Roda enquanto a estrela explode (some no colapso/reset).
function MeltdownLines({ lang, intro }: { lang: Lang; intro: TermLine[] }) {
  const pt = lang === 'pt';
  const [log, setLog] = useState<[K, string][]>([]);
  const [echo, setEcho] = useState(true);
  const [pulse, setPulse] = useState(-1);
  const tok = useRef(0);

  useEffect(() => {
    tok.current += 1; const my = tok.current;
    const texts: [K, string][] = pt
      ? [
          ['err', '> núcleo REACENDEU · fusão descontrolada'],
          ['warn', '> TEMP NÚCLEO ▲ 12.000 K'],
          ['err', '> contenção magnética ...... 0%'],
          ['err', '> SOBREAQUECIMENTO CRÍTICO'],
          ['warn', '> TEMP NÚCLEO ▲ 40.000 K'],
          ['err', '> setor SOBRE ......... CORROMPIDO'],
          ['err', '> setor EXPERIÊNCIA ... PERDIDO'],
          ['err', '> setor STACK ......... PERDIDO'],
          ['err', '> perfil: identidade instável'],
          ['err', '> memória do portfólio ... APAGADA'],
          ['warn', '> TEMP NÚCLEO ▲ 25.000.000 K'],
          ['err', '> VAPORIZAÇÃO EM CADEIA'],
        ]
      : [
          ['err', '> core REIGNITED · runaway fusion'],
          ['warn', '> CORE TEMP ▲ 12,000 K'],
          ['err', '> magnetic containment ..... 0%'],
          ['err', '> CRITICAL OVERHEAT'],
          ['warn', '> CORE TEMP ▲ 40,000 K'],
          ['err', '> sector ABOUT ....... CORRUPTED'],
          ['err', '> sector EXPERIENCE ... LOST'],
          ['err', '> sector STACK ....... LOST'],
          ['err', '> profile: identity unstable'],
          ['err', '> portfolio memory ... WIPED'],
          ['warn', '> CORE TEMP ▲ 25,000,000 K'],
          ['err', '> CASCADE VAPORIZATION'],
        ];
    (async () => {
      // 1) ECO — repete o sinal (o "chamado" respondido) + pisca as bolinhas
      setLog([['ok', pt ? '> SINAL COMPLETO · resposta transmitida' : '> SIGNAL COMPLETE · response sent']]);
      await sleep(400);
      playContactMotif();
      for (let i = 0; i < 5; i++) window.setTimeout(() => { if (my === tok.current) setPulse(i); }, 120 + i * 560);
      window.setTimeout(() => { if (my === tok.current) setPulse(-1); }, 120 + 5 * 560 + 300);
      await sleep(3400);
      if (my !== tok.current) return;
      setEcho(false);
      setLog((l) => [...l, ['accent', pt ? '> CONTATO ESTABELECIDO' : '> CONTACT ESTABLISHED']]);
      await sleep(450);
      // 2) MELTDOWN — erros entrando (texto e símbolos INTERCALADOS) empurram o portfólio
      let i = 0;
      while (my === tok.current) {
        const line: [K, string] = i % 2 === 0 ? texts[(i / 2) % texts.length] : ['err', noiseLine()];
        setLog((l) => [...l.slice(-60), line]);
        await sleep(300 + Math.random() * 180);
        i++;
      }
    })();
    return () => { tok.current += 1; };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // uma pilha só: intro (portfólio) + log; mostra as últimas MAX -> o portfólio sobe e sai
  const stack = [
    ...intro.map((ln, i) => ({ key: 'i' + i, node: <Line style={{ fontSize: ln.size, color: ln.color, fontWeight: ln.weight }}>{ln.text}</Line> })),
    ...log.map(([k, t], i) => ({ key: 'l' + i, node: <MLine $k={k}>{t}</MLine> })),
  ];
  const vis = stack.slice(-MAX_MELT);
  return (
    <>
      {vis.map((it) => <Fragment key={it.key}>{it.node}</Fragment>)}
      {echo && <MLine>{pt ? '> sinal:   ' : '> signal:  '}<SigDots pulse={pulse} /></MLine>}
    </>
  );
}

// Console/terminal datilografado no canto superior esquerdo. Fases: normal ->
// PROTOCOLO (missão) -> ALERTA (meltdown, durante a supernova).
export function Console({ lines, mission = false, overheat = false, entered = 0, lang = 'pt' }: { lines: TermLine[]; mission?: boolean; overheat?: boolean; entered?: number; lang?: Lang }) {
  const label = overheat ? 'GF://ALERTA' : mission ? 'GF://PROTOCOLO' : 'GF://CONSOLE';
  return (
    <Wrap>
      <Header>
        <Dot $alert={mission || overheat} />
        <HeaderLabel>{label}</HeaderLabel>
      </Header>
      <Lines>
        {overheat ? (
          <MeltdownLines lang={lang} intro={lines} />
        ) : (
          <>
            {lines.map((ln, i) => (
              <Line key={i} style={{ fontSize: ln.size, color: ln.color, fontWeight: ln.weight }}>{ln.text}</Line>
            ))}
            {mission ? <MissionLines lang={lang} entered={entered} /> : <Cursor />}
          </>
        )}
      </Lines>
    </Wrap>
  );
}
