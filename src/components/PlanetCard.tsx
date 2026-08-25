import { useEffect, useState, type RefObject } from 'react';
import { planetLabels, type Lang, type PlanetInfo } from '../data/content';
import { buildPlanetRows, buildAfterRows, afterNote, isSurvivorMarked } from './buildPlanetRows';
import { Caret } from './Caret';
import * as S from './PlanetCard.styles';

// Card de dados do planeta, "digitado" como um terminal sci-fi. Plutão tem uma
// piada: a classificação escreve "planeta", apaga e corrige para "planeta anão".
// No rescaldo (after), os sobreviventes mostram os dados pós-supernova.
export function PlanetCard({ planet, lang, innerRef, after = false }: { planet: PlanetInfo; lang: Lang; innerRef: RefObject<HTMLDivElement | null>; after?: boolean }) {
  const L = planetLabels(lang);
  const marked = after && isSurvivorMarked(planet.key);
  const rows = marked ? buildAfterRows(planet, lang) : buildPlanetRows(planet, lang);

  const [nameShown, setNameShown] = useState('');
  const [kindShown, setKindShown] = useState('');
  const [rowsN, setRowsN] = useState(0);
  const [rowText, setRowText] = useState<string[]>(() => rows.map(() => ''));
  const [caret, setCaret] = useState<'name' | 'kind' | 'row' | 'done'>('name');

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    const pt = lang === 'pt';
    const nm = pt ? planet.name.pt : planet.name.en;
    const kindFinal = marked ? (pt ? 'pós-supernova' : 'post-supernova') : (pt ? planet.type.pt : planet.type.en);
    const vals = (marked ? buildAfterRows(planet, lang) : buildPlanetRows(planet, lang)).map((r) => r.value);
    const isPluto = planet.key === 'plutao' && !marked;
    (async () => {
      await sleep(120); // deixa o estado inicial (limpo via key) assentar antes de digitar
      for (let i = 1; i <= nm.length; i++) { if (cancelled) return; setNameShown(nm.slice(0, i)); await sleep(28); }
      await sleep(160);
      setCaret('kind');
      if (isPluto) { // piada: escreve "planeta", hesita, apaga e corrige
        const w1 = pt ? 'planeta' : 'planet';
        for (let i = 1; i <= w1.length; i++) { if (cancelled) return; setKindShown(w1.slice(0, i)); await sleep(55); }
        await sleep(800);
        for (let i = w1.length - 1; i >= 0; i--) { if (cancelled) return; setKindShown(w1.slice(0, i)); await sleep(42); }
        await sleep(260);
      }
      for (let i = 1; i <= kindFinal.length; i++) { if (cancelled) return; setKindShown(kindFinal.slice(0, i)); await sleep(52); }
      await sleep(200);
      setCaret('row');
      for (let r = 0; r < vals.length; r++) {
        if (cancelled) return;
        setRowsN(r + 1);
        const v = vals[r];
        for (let i = 1; i <= v.length; i++) { if (cancelled) return; setRowText((prev) => { const n = [...prev]; n[r] = v.slice(0, i); return n; }); await sleep(16); }
        await sleep(65);
      }
      if (!cancelled) setCaret('done');
    })();
    return () => { cancelled = true; };
  }, [planet, lang, marked]);

  return (
    <S.Card ref={innerRef}>
      <S.Title>
        {nameShown}
        {caret === 'name' && <Caret />}
      </S.Title>
      <S.Kind>
        &gt; {kindShown}
        {caret === 'kind' && <Caret $small />}
      </S.Kind>
      {rows.slice(0, rowsN).map((r, i) => {
        const done = rowText[i] === r.value;
        return (
          <S.Row key={r.label}>
            <S.RowLine>
              <S.RowLabel>{r.label}</S.RowLabel>
              <S.Leader />
              <S.RowValue $accent={r.label === L.status}>
                {rowText[i]}
                {caret === 'row' && i === rowsN - 1 && <Caret $small />}
              </S.RowValue>
            </S.RowLine>
            {r.sub && done && <S.RowSub>{r.sub}</S.RowSub>}
          </S.Row>
        );
      })}
      {marked && caret === 'done' && <S.Note>{afterNote(planet, lang)}</S.Note>}
    </S.Card>
  );
}
