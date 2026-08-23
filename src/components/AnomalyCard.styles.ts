import styled, { css } from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import { Card } from './PlanetCard.styles';

export const ACard = styled(Card)`
  animation: cardIn 0.4s ease both;
`;

// Barra de censura (tarja) para dados classificados.
export const Redacted = styled.span<{ $w: number }>`
  display: inline-block;
  width: ${(p) => p.$w}px;
  height: 12px;
  border-radius: 1px;
  background: repeating-linear-gradient(90deg, rgba(255, 202, 112, 0.3) 0 4px, rgba(255, 202, 112, 0.1) 4px 8px);
  transform: translateY(1px);
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
