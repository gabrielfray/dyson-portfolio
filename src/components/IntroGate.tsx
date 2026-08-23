import { useState } from 'react';
import { LuChevronsRight } from 'react-icons/lu';
import { getIntro, type Lang } from '../data/content';
import * as S from './IntroGate.styles';

// Tela de inicialização cinematográfica. Ao clicar em "iniciar", dispara o
// fly-in da câmera (onStart) e faz o warp-out; ao terminar, chama onFinished.
export function IntroGate({ lang, onStart, onFinished }: { lang: Lang; onStart: () => void; onFinished: () => void }) {
  const t = getIntro(lang);
  const [leaving, setLeaving] = useState(false);

  const begin = () => {
    if (leaving) return;
    setLeaving(true);
    onStart(); // começa o fly-in já durante o warp-out
    window.setTimeout(onFinished, 720); // casa com a duração do gateOut
  };

  return (
    <S.Overlay $leaving={leaving}>
      <S.Inner>
        <S.Protocol>
          <S.Dot /> {t.protocol}
        </S.Protocol>
        <S.Title>{t.title}</S.Title>
        <S.Subtitle>{t.subtitle}</S.Subtitle>
        <S.BootList>
          {t.boot.map((b, i) => (
            <S.BootLine key={b} $i={i}>
              {b}
              <S.BootLeader />
              <S.BootOk>{t.ok}</S.BootOk>
            </S.BootLine>
          ))}
        </S.BootList>
        <S.StartBtn onClick={begin}>
          {t.start} <LuChevronsRight size={18} />
        </S.StartBtn>
      </S.Inner>
    </S.Overlay>
  );
}
