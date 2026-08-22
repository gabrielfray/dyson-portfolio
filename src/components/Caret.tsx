import styled from 'styled-components';
import { AMBER } from '../styles/theme';

// Cursor piscante estilo terminal.
export const Caret = styled.span<{ $small?: boolean }>`
  display: inline-block;
  width: ${(p) => (p.$small ? 6 : 9)}px;
  height: ${(p) => (p.$small ? 12 : 16)}px;
  background: ${AMBER};
  margin-left: 3px;
  transform: translateY(2px);
  animation: blink 1s step-end infinite;
`;
