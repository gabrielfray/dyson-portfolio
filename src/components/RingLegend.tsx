import styled, { css } from 'styled-components';
import { hudButton, hudButtonActive } from '../styles/hud';
import type { Section } from '../scene/dysonScene';
import type { Lang } from '../data/content';

const Bar = styled.div<{ $width: string }>`
  position: fixed;
  bottom: 28px;
  left: 0;
  width: ${(p) => p.$width};
  z-index: 30;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  padding: 0 12px;
  box-sizing: border-box;
  animation: fadeIn 2s ease 4s both;
  transition: width 1.1s cubic-bezier(0.22, 0.61, 0.36, 1);
  @media (max-width: 640px) {
    bottom: max(12px, env(safe-area-inset-bottom));
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    justify-content: safe center;
    padding: 0 12px 4px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
`;

const LegendBtn = styled.button<{ $selected: boolean }>`
  ${hudButton}
  font-size: 11px;
  padding: 9px 17px;
  ${(p) => p.$selected && css`${hudButtonActive}`}
  @media (max-width: 640px) {
    font-size: 10px;
    padding: 8px 11px;
    flex: 0 0 auto;
    white-space: nowrap;
  }
`;

// Barra de legendas dos anéis (navegação por seção).
export function RingLegend({
  sections,
  lang,
  sel,
  width,
  onSelect,
}: {
  sections: Section[];
  lang: Lang;
  sel: number | null;
  width: string;
  onSelect: (i: number) => void;
}) {
  const pt = lang === 'pt';
  return (
    <Bar $width={width}>
      {sections.map((s, i) => (
        <LegendBtn key={s.id} $selected={sel === i} onClick={() => onSelect(i)}>
          {pt ? s.pt : s.en}
        </LegendBtn>
      ))}
    </Bar>
  );
}
