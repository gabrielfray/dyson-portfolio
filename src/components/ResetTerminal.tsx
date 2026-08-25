import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import type { Lang } from '../data/content';

// Terminal do rescaldo: relata o colapso do sistema e aceita "reiniciar simulação"
// p/ voltar tudo ao estado inicial. Aparece quando o núcleo vira supernova.
const Wrap = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 60;
  width: min(560px, 92vw);
  pointer-events: auto;
  font-family: ${MONO};
  background: rgba(6, 5, 10, 0.82);
  border: 1px solid rgba(255, 202, 112, 0.35);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 20px 24px;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
  animation: fadeIn 0.6s ease 2.6s both; /* espera o clarão do blast passar */
  @media (max-width: 560px) { padding: 14px 16px; width: min(380px, calc(100vw - 24px)); }
`;
const Header = styled.div`display: flex; align-items: center; gap: 10px; margin-bottom: 14px;`;
const Dot = styled.span`width: 8px; height: 8px; border-radius: 99px; background: #ff5a5a; box-shadow: 0 0 10px rgba(255,90,90,.9); animation: blink 1.2s ease infinite;`;
const Label = styled.span`font-size: 11px; letter-spacing: 0.3em; color: rgba(238,232,218,.5);`;
const Line = styled.div<{ $accent?: boolean }>`
  font-size: 13px; line-height: 1.9; letter-spacing: 0.04em; white-space: pre-wrap; word-break: break-word;
  color: ${(p) => (p.$accent ? AMBER : 'rgba(238,232,218,.72)')};
  text-shadow: 0 1px 4px rgba(0,0,0,.95);
  @media (max-width: 560px) { font-size: 11px; }
`;
const Prompt = styled.form`display: flex; align-items: baseline; gap: 8px; margin-top: 14px; border-top: 1px solid rgba(255,202,112,.18); padding-top: 12px;`;
const Chevron = styled.span`color: ${AMBER}; font-size: 13px;`;
const Input = styled.input`
  flex: 1; background: transparent; border: none; outline: none; color: #fff;
  font-family: ${MONO}; font-size: 13px; letter-spacing: 0.06em; caret-color: ${AMBER};
  &::placeholder { color: rgba(238,232,218,.3); }
`;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');

const script = (lang: Lang): [string, boolean][] =>
  lang === 'pt'
    ? [
        ['> SISTEMA COLAPSADO — supernova', true],
        ['> radiação vaporizou os planetas rochosos', false],
        ['> casca de Dyson perdida', false],
        ['> sobreviventes: Júpiter · Saturno · Urano · Netuno', false],
        ['> remanescente: gigante azul', false],
      ]
    : [
        ['> SYSTEM COLLAPSED — supernova', true],
        ['> radiation vaporized the rocky planets', false],
        ['> Dyson shell lost', false],
        ['> survivors: Jupiter · Saturn · Uranus · Neptune', false],
        ['> remnant: blue giant', false],
      ];

export function ResetTerminal({ lang, onReset }: { lang: Lang; onReset: () => void }) {
  const [lines, setLines] = useState<[string, boolean][]>([]);
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
      await sleep(3200); // após o fade-in
      const out: [string, boolean][] = [];
      for (const [text, accent] of defs) {
        if (my !== tok.current) return;
        out.push(['', accent]);
        for (let i = 1; i <= text.length; i++) {
          if (my !== tok.current) return;
          out[out.length - 1] = [text.slice(0, i), accent];
          setLines([...out]);
          await sleep(14);
        }
        await sleep(160);
      }
      if (my === tok.current) { setReady(true); setTimeout(() => inputRef.current?.focus(), 50); }
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
    <Wrap onClick={() => inputRef.current?.focus()}>
      <Header><Dot /><Label>GF://SISTEMA</Label></Header>
      {lines.map(([text, accent], i) => (<Line key={i} $accent={accent}>{text}</Line>))}
      {ready && (
        <Prompt onSubmit={submit}>
          <Chevron>&gt;</Chevron>
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
      {err && <Line $accent style={{ marginTop: 6 }}>{lang === 'pt' ? '> comando não reconhecido' : '> command not recognized'}</Line>}
    </Wrap>
  );
}
