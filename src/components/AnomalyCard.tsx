import { useEffect, useState, type RefObject } from 'react';
import { getAnomaly, type Lang } from '../data/content';
import { Caret } from './Caret';
import * as PC from './PlanetCard.styles';
import * as S from './AnomalyCard.styles';

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#@%&*/\\<>[]{}=+?¤§Ø∆◇◆⬡✦☌⏣';

// Nome que embaralha continuamente (designação desconhecida).
function GlitchText({ len = 9 }: { len?: number }) {
  const [s, setS] = useState('');
  useEffect(() => {
    const id = window.setInterval(() => {
      let r = '';
      for (let i = 0; i < len; i++) r += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      setS(r);
    }, 65);
    return () => window.clearInterval(id);
  }, [len]);
  return <>{s}</>;
}

type CaretAt = 'name' | 'kind' | 'row' | 'note' | 'done';

// Card de anomalia/easter egg, "digitado" como um terminal (igual aos planetas).
// Corpos normais mostram dados; o UFO tem nome embaralhado e dados tarjados.
export function AnomalyCard({ anomKey, lang, innerRef }: { anomKey: string; lang: Lang; innerRef: RefObject<HTMLDivElement | null> }) {
  const a = getAnomaly(anomKey, lang);
  const glitch = !!a.glitch;

  // Lista unificada: linhas de dados + a linha de STATUS (nunca tarjada).
  const items = a.rows.map((r) => ({ label: r.label, value: r.value, accent: r.label === 'STATUS', redact: !!a.redacted }));
  if (a.status) items.push({ label: 'STATUS', value: a.status, accent: true, redact: false });

  const [nameShown, setNameShown] = useState('');
  const [kindShown, setKindShown] = useState('');
  const [rowsN, setRowsN] = useState(0);
  const [rowText, setRowText] = useState<string[]>(() => items.map(() => ''));
  const [noteShown, setNoteShown] = useState('');
  const [caret, setCaret] = useState<CaretAt>('name');

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    const info = getAnomaly(anomKey, lang);
    const glitchNow = !!info.glitch;
    const its = info.rows.map((r) => ({ value: r.value, redact: !!info.redacted }));
    if (info.status) its.push({ value: info.status, redact: false });
    (async () => {
      await sleep(120); // deixa o estado inicial (limpo via key) assentar
      if (glitchNow) {
        setCaret('kind'); // nome fica embaralhando, pula direto p/ o tipo
      } else {
        for (let i = 1; i <= info.name.length; i++) { if (cancelled) return; setNameShown(info.name.slice(0, i)); await sleep(28); }
        await sleep(160);
        setCaret('kind');
      }
      for (let i = 1; i <= info.kind.length; i++) { if (cancelled) return; setKindShown(info.kind.slice(0, i)); await sleep(46); }
      await sleep(180);
      setCaret('row');
      for (let r = 0; r < its.length; r++) {
        if (cancelled) return;
        setRowsN(r + 1);
        if (its[r].redact) { await sleep(95); continue; } // tarja só aparece
        const v = its[r].value;
        for (let i = 1; i <= v.length; i++) { if (cancelled) return; setRowText((prev) => { const n = [...prev]; n[r] = v.slice(0, i); return n; }); await sleep(16); }
        await sleep(65);
      }
      if (info.note && !glitchNow) {
        setCaret('note');
        await sleep(140);
        for (let i = 1; i <= info.note.length; i++) { if (cancelled) return; setNoteShown(info.note.slice(0, i)); await sleep(14); }
      }
      if (!cancelled) setCaret('done');
    })();
    return () => { cancelled = true; };
  }, [anomKey, lang]);

  const rowsDone = rowsN >= items.length;

  return (
    <S.ACard ref={innerRef}>
      <PC.Title>
        {glitch ? <GlitchText /> : nameShown}
        {!glitch && caret === 'name' && <Caret />}
      </PC.Title>
      <PC.Kind>
        &gt; {kindShown}
        {caret === 'kind' && <Caret $small />}
      </PC.Kind>
      {items.slice(0, rowsN).map((it, i) => (
        <PC.Row key={it.label}>
          <PC.RowLine>
            <PC.RowLabel>{it.label}</PC.RowLabel>
            <PC.Leader />
            {it.redact ? (
              <S.Redacted $w={54 + ((i * 43) % 66)} />
            ) : (
              <PC.RowValue $accent={it.accent}>
                {rowText[i]}
                {caret === 'row' && i === rowsN - 1 && <Caret $small />}
              </PC.RowValue>
            )}
          </PC.RowLine>
        </PC.Row>
      ))}
      {a.note && rowsDone && (
        <S.Note $warn={glitch}>
          {glitch ? a.note : noteShown}
          {!glitch && caret === 'note' && <Caret $small />}
        </S.Note>
      )}
    </S.ACard>
  );
}
