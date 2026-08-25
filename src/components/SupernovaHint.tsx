import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import type { Lang } from '../data/content';

// Dica estilo console que surge quando o núcleo colapsa (supernova), apontando
// o enigma dos 5 tons (Contatos Imediatos) p/ reacender a estrela.
const Wrap = styled.div`
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 45;
  width: min(520px, 90vw);
  pointer-events: none;
  font-family: ${MONO};
  background: rgba(6, 5, 10, 0.72);
  border: 1px solid rgba(255, 202, 112, 0.35);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 18px 22px;
  box-shadow: 0 14px 50px rgba(0, 0, 0, 0.55);
  animation: fadeIn 0.6s ease 2.4s both; /* espera o clarão do blast passar */
  @media (max-width: 560px) {
    top: 24%;
    padding: 13px 15px;
    width: min(360px, calc(100vw - 24px));
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: ${AMBER};
  box-shadow: 0 0 10px rgba(255, 202, 112, 0.9);
  animation: blink 1.4s ease infinite;
`;

const Label = styled.span`
  font-size: 11px;
  letter-spacing: 0.3em;
  color: rgba(238, 232, 218, 0.45);
`;

const Line = styled.div<{ $accent?: boolean }>`
  font-size: 13px;
  line-height: 1.85;
  letter-spacing: 0.04em;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${(p) => (p.$accent ? AMBER : 'rgba(238,232,218,.72)')};
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
  @media (max-width: 560px) { font-size: 11px; }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 14px;
  vertical-align: middle;
  background: ${AMBER};
  margin-left: 2px;
  box-shadow: 0 0 8px rgba(255, 202, 112, 0.6);
  animation: blink 1s step-end infinite;
`;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// (texto, destaque?)
const script = (lang: Lang): [string, boolean][] =>
  lang === 'pt'
    ? [
        ['> NÚCLEO COLAPSADO — estrela extinta', false],
        ['> sinal detectado: 5 tons do espaço profundo', false],
        ['> [ Contatos Imediatos de 3º Grau ]', true],
        ['> reproduza a sequência tocando as anomalias', false],
        ['> na ordem certa p/ reacender o núcleo', false],
      ]
    : [
        ['> CORE COLLAPSED — star extinguished', false],
        ['> signal detected: 5 tones from deep space', false],
        ['> [ Close Encounters of the Third Kind ]', true],
        ['> replay the sequence by tapping the anomalies', false],
        ['> in the right order to reignite the core', false],
      ];

export function SupernovaHint({ lang }: { lang: Lang }) {
  const [lines, setLines] = useState<[string, boolean][]>([]);
  const tok = useRef(0);

  useEffect(() => {
    tok.current += 1;
    const my = tok.current;
    const defs = script(lang);
    (async () => {
      await sleep(3000); // após o fade-in (que já espera o blast)
      const out: [string, boolean][] = [];
      for (const [text, accent] of defs) {
        if (my !== tok.current) return;
        out.push(['', accent]);
        for (let i = 1; i <= text.length; i++) {
          if (my !== tok.current) return;
          out[out.length - 1] = [text.slice(0, i), accent];
          setLines([...out]);
          await sleep(16);
        }
        await sleep(260);
      }
    })();
    return () => { tok.current += 1; };
  }, [lang]);

  return (
    <Wrap>
      <Header>
        <Dot />
        <Label>GF://SINAL</Label>
      </Header>
      {lines.map(([text, accent], i) => (
        <Line key={i} $accent={accent}>
          {text}
          {i === lines.length - 1 && <Cursor />}
        </Line>
      ))}
    </Wrap>
  );
}
