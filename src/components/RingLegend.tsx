import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
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
`;

const LegendBtn = styled.button<{ $selected: boolean }>`
  background: ${(p) => (p.$selected ? 'rgba(255,202,112,.18)' : 'rgba(6,5,10,.6)')};
  border: 1px solid ${(p) => (p.$selected ? 'rgba(255,202,112,.8)' : 'rgba(238,232,218,.2)')};
  color: ${(p) => (p.$selected ? AMBER : 'rgba(238,232,218,.7)')};
  font-family: ${MONO};
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 8px 16px;
  border-radius: 99px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.25s;
  &:hover {
    border-color: rgba(255, 202, 112, 0.8);
    color: ${AMBER};
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
