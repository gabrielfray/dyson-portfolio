import { useEffect, useState, type RefObject } from 'react';
import type { Lang } from '../data/content';
import { Caret } from './Caret';
import * as S from './PlanetCard.styles';

type Card = { name: string; kind: string; rows: [string, string, boolean][]; note: string };
const buildCard = (lang: Lang): Card => (lang === 'pt'
  ? { name: 'GIGANTE AZUL', kind: 'supergigante · remanescente', rows: [
      ['CLASSE', 'O · azul-branca', false], ['TEMP.', '≈ 35.000 K', false], ['ORIGEM', 'supernova', false],
      ['MASSA', '≈ 20 M☉', false], ['DESTINO', 'colapso · milhões de anos', false], ['STATUS', 'RENASCIDA', true],
    ], note: 'Nasceu de um colapso. Vai terminar em outro.' }
  : { name: 'BLUE GIANT', kind: 'supergiant · remnant', rows: [
      ['CLASS', 'O · blue-white', false], ['TEMP.', '≈ 35,000 K', false], ['ORIGIN', 'supernova', false],
      ['MASS', '≈ 20 M☉', false], ['FATE', 'collapse · millions of yrs', false], ['STATUS', 'REBORN', true],
    ], note: 'Born of a collapse. Doomed to another.' });

// Card da gigante azul (remanescente da supernova), "digitado" como os planetas.
export function SupernovaCard({ lang, innerRef }: { lang: Lang; innerRef: RefObject<HTMLDivElement | null> }) {
  const { rows, note } = buildCard(lang); // rótulos + citação p/ render (o texto é digitado no efeito)

  const [nameShown, setNameShown] = useState('');
  const [kindShown, setKindShown] = useState('');
  const [rowsN, setRowsN] = useState(0);
  const [rowText, setRowText] = useState<string[]>(() => rows.map(() => ''));
  const [caret, setCaret] = useState<'name' | 'kind' | 'row' | 'done'>('name');

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    const { name: nm, kind: kd, rows: rw } = buildCard(lang);
    (async () => {
      await sleep(120);
      for (let i = 1; i <= nm.length; i++) { if (cancelled) return; setNameShown(nm.slice(0, i)); await sleep(28); }
      await sleep(160); setCaret('kind');
      for (let i = 1; i <= kd.length; i++) { if (cancelled) return; setKindShown(kd.slice(0, i)); await sleep(40); }
      await sleep(200); setCaret('row');
      for (let r = 0; r < rw.length; r++) {
        if (cancelled) return;
        setRowsN(r + 1);
        const v = rw[r][1];
        for (let i = 1; i <= v.length; i++) { if (cancelled) return; setRowText((prev) => { const n = [...prev]; n[r] = v.slice(0, i); return n; }); await sleep(16); }
        await sleep(65);
      }
      if (!cancelled) setCaret('done');
    })();
    return () => { cancelled = true; };
  }, [lang]);

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
      {rows.slice(0, rowsN).map(([label, , accent], i) => (
        <S.Row key={label}>
          <S.RowLine>
            <S.RowLabel>{label}</S.RowLabel>
            <S.Leader />
            <S.RowValue $accent={accent}>
              {rowText[i]}
              {caret === 'row' && i === rowsN - 1 && <Caret $small />}
            </S.RowValue>
          </S.RowLine>
        </S.Row>
      ))}
      {caret === 'done' && <S.Note>{note}</S.Note>}
    </S.Card>
  );
}
