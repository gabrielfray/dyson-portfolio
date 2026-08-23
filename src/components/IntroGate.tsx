import { useEffect, useState } from 'react';
import { LuChevronsRight } from 'react-icons/lu';
import { getIntro, type Lang } from '../data/content';
import * as S from './IntroGate.styles';

// Terminal de controle sci-fi: dá boot linha a linha (log técnico) e, ao final,
// libera o comando de iniciar. Clicar dispara o fly-in (onStart) + warp-out.
export function IntroGate({ lang, onStart, onFinished }: { lang: Lang; onStart: () => void; onFinished: () => void }) {
  const t = getIntro(lang);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const booted = shown >= t.lines.length;

  // revela uma linha do log por vez
  useEffect(() => {
    if (shown >= t.lines.length) return;
    const id = window.setTimeout(() => setShown((s) => s + 1), shown === 0 ? 260 : 115);
    return () => window.clearTimeout(id);
  }, [shown, t.lines.length]);

  const begin = () => {
    if (leaving) return;
    setLeaving(true);
    onStart();
    window.setTimeout(onFinished, 720);
  };

  return (
    <S.Overlay $leaving={leaving}>
      <S.Terminal>
        <S.TitleBar>
          <span>{t.titlebar}</span>
          <S.Dots><span /><span /><span /></S.Dots>
        </S.TitleBar>
        <S.LogBody>
          {t.lines.slice(0, shown).map((l) => (
            <S.Line key={l.label}>
              <S.Prompt>&gt;</S.Prompt>
              <S.Label>{l.label}</S.Label>
              <S.Leader />
              <S.Status>[ {l.status} ]</S.Status>
            </S.Line>
          ))}
          {!booted && <S.Line><S.Prompt>&gt;</S.Prompt><S.Cursor /></S.Line>}

          {booted && (
            <>
              <S.Ready>&gt; {t.ready}</S.Ready>
              <S.Awaiting>
                &gt; {t.awaiting}
                <S.Cursor />
              </S.Awaiting>
              <S.StartBtn onClick={begin}>
                {t.start} <LuChevronsRight size={16} />
              </S.StartBtn>
            </>
          )}
        </S.LogBody>
      </S.Terminal>
    </S.Overlay>
  );
}
