import styled, { css } from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import { Card } from './PlanetCard.styles';

export const ACard = styled(Card)`
  animation: cardIn 0.4s ease both;
`;

// Valor "corrompido": glyphs embaralhando (dados classificados/ininteligíveis).
export const GlitchVal = styled.span`
  font-family: ${MONO};
  font-size: 12px;
  letter-spacing: 0.06em;
  color: ${AMBER};
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(255, 202, 112, 0.35);
`;

// Caractere de ponta-cabeça (parte do efeito de scramble).
export const Flip = styled.span`
  display: inline-block;
  transform: rotate(180deg);
`;

export const Note = styled.div<{ $warn?: boolean }>`
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 202, 112, 0.14);
  font-size: 12px;
  line-height: 1.6;
  text-wrap: pretty;
  ${(p) =>
    p.$warn
      ? css`
          font-family: ${MONO};
          letter-spacing: 0.12em;
          color: ${AMBER};
          animation: blink 1.6s step-end infinite;
        `
      : css`
          font-style: italic;
          color: rgba(238, 232, 218, 0.6);
        `}
`;
