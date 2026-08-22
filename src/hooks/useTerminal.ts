import { useEffect, useRef, useState } from 'react';
import { termDefs, type Lang, type TermDef } from '../data/content';

export interface TermLine {
  text: string;
  size: string;
  color: string;
  weight: number;
}

function styleOf(k: TermDef['k']): Omit<TermLine, 'text'> {
  if (k === 'name') return { size: '24px', color: '#eee8da', weight: 700 };
  if (k === 'accent') return { size: '13px', color: '#ffca70', weight: 500 };
  return { size: '13px', color: 'rgba(238,232,218,.6)', weight: 400 };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Recria o efeito de "console" datilografado do artefato original:
 * digita cada linha caractere a caractere, faz uma pausa, apaga tudo e repete.
 * Reinicia sempre que o idioma muda.
 */
export function useTerminal(lang: Lang): TermLine[] {
  const [termLines, setTermLines] = useState<TermLine[]>([]);
  const tokenRef = useRef(0);

  useEffect(() => {
    tokenRef.current += 1;
    const tok = tokenRef.current;
    const defs = termDefs(lang);

    (async () => {
      while (tok === tokenRef.current) {
        let lines: TermLine[] = [];
        for (const d of defs) {
          if (tok !== tokenRef.current) return;
          const s = styleOf(d.k);
          lines = [...lines, { text: '', ...s }];
          for (let i = 1; i <= d.t.length; i++) {
            if (tok !== tokenRef.current) return;
            lines = [...lines.slice(0, -1), { ...s, text: d.t.slice(0, i) }];
            setTermLines(lines);
            await sleep(d.k === 'name' ? 60 : 22);
          }
          await sleep(d.k === 'name' ? 650 : 380);
        }
        await sleep(7000);
        while (lines.length && tok === tokenRef.current) {
          const last = lines[lines.length - 1];
          lines =
            last.text.length > 1
              ? [...lines.slice(0, -1), { ...last, text: last.text.slice(0, -1) }]
              : lines.slice(0, -1);
          setTermLines(lines);
          await sleep(7);
        }
        await sleep(800);
      }
    })();

    return () => {
      tokenRef.current += 1;
    };
  }, [lang]);

  return termLines;
}
