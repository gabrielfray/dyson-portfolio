import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import type { Lang } from '../data/content';

// Terminal do rescaldo: ocupa o canto sup. esquerdo (lugar do nome/console),
// SEM caixa — texto solto no espaço, com cara de log de erros. Aceita o comando
// "reiniciar simulação" e lembra que o sinal (enigma) reacende o núcleo.
const Wrap = styled.div`
  position: fixed;
  top: 96px;
  left: 40px;
  z-index: 40;
  width: min(520px, 88vw);
  pointer-events: none;
  font-family: ${MONO};
  animation: fadeIn 0.8s ease 2.6s both; /* espera o clarão do blast passar */
  @media (max-width: 560px) {
    top: max(56px, calc(env(safe-area-inset-top) + 42px));
    left: 12px; width: 460px; transform: scale(0.7); transform-origin: top left;
  }
`;
const Header = styled.div`display: flex; align-items: center; gap: 10px; margin-bottom: 14px;`;
const Dot = styled.span`width: 8px; height: 8px; border-radius: 99px; background: #ff5a5a; box-shadow: 0 0 10px rgba(255,90,90,.9); animation: blink 1.1s ease infinite;`;
const HLabel = styled.span`font-size: 11px; letter-spacing: 0.3em; color: rgba(238,232,218,.45);`;
const Line = styled.div<{ $k?: string }>`
  font-size: 12.5px; line-height: 2.0; letter-spacing: 0.04em; white-space: pre-wrap; word-break: break-word;
  color: ${(p) => (p.$k === 'err' ? '#ff6a6a' : p.$k === 'hint' ? AMBER : p.$k === 'warn' ? 'rgba(255,180,120,.85)' : 'rgba(238,232,218,.6)')};
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
const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');

// (texto, tipo) — tipos: err (vermelho), warn (laranja), info (cinza), hint (âmbar)
const script = (lang: Lang): [string, string][] =>
  lang === 'pt'
    ? [
        ['> ERRO FATAL · núcleo colapsou', 'err'],
        ['> contenção perdida — supernova', 'err'],
        ['> planetas rochosos ......... VAPORIZADOS', 'warn'],
        ['> casca de Dyson ............ PERDIDA', 'warn'],
        ['> portfólio ................. OFFLINE', 'warn'],
        ['> sobreviventes: Júpiter · Saturno · Urano · Netuno', 'info'],
        ['> sinal detectado no espaço profundo', 'hint'],
        ['> reproduza-o (5 tons) p/ reacender o núcleo', 'hint'],
      ]
    : [
        ['> FATAL ERROR · core collapsed', 'err'],
        ['> containment lost — supernova', 'err'],
        ['> rocky planets ............. VAPORIZED', 'warn'],
        ['> Dyson shell .............. LOST', 'warn'],
        ['> portfolio ................ OFFLINE', 'warn'],
        ['> survivors: Jupiter · Saturn · Uranus · Neptune', 'info'],
        ['> signal detected in deep space', 'hint'],
        ['> replay it (5 tones) to reignite the core', 'hint'],
      ];

export function ResetTerminal({ lang, onReset }: { lang: Lang; onReset: () => void }) {
  const [lines, setLines] = useState<[string, string][]>([]);
  const [ready, setReady] = useState(false);
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);
  const tok = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tok.current += 1;
    const my = tok.current;
    const defs = script(lang);
    (async () => {
      await sleep(3200);
      const out: [string, string][] = [];
      for (const [text, k] of defs) {
        if (my !== tok.current) return;
        out.push(['', k]);
        for (let i = 1; i <= text.length; i++) {
          if (my !== tok.current) return;
          out[out.length - 1] = [text.slice(0, i), k];
          setLines([...out]);
          await sleep(11);
        }
        await sleep(120);
      }
      if (my === tok.current) setReady(true);
    })();
    return () => { tok.current += 1; };
  }, [lang]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = norm(val);
    if (n === 'reiniciar simulacao' || n === 'restart simulation' || n === 'reiniciar' || n === 'restart') onReset();
    else { setErr(true); setVal(''); }
  };

  const hint = lang === 'pt' ? 'reiniciar simulação' : 'restart simulation';
  return (
    <Wrap>
      <Header><Dot /><HLabel>GF://SISTEMA</HLabel></Header>
      {lines.map(([text, k], i) => (<Line key={i} $k={k}>{text}</Line>))}
      {err && <Line $k="err">{lang === 'pt' ? '> comando não reconhecido' : '> command not recognized'}</Line>}
      {ready && (
        <Prompt onSubmit={submit}>
          <PLabel>&gt;</PLabel>
          <Input
            ref={inputRef}
            value={val}
            onChange={(e) => { setVal(e.target.value); setErr(false); }}
            placeholder={lang === 'pt' ? `digite: ${hint}` : `type: ${hint}`}
            spellCheck={false}
            autoComplete="off"
          />
        </Prompt>
      )}
    </Wrap>
  );
}
