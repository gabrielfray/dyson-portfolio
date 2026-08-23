import { css } from 'styled-components';
import { AMBER, MONO } from './theme';

// Botão HUD sci-fi: retângulo com colchetes de canto (como a reticula), texto
// mono em maiúsculas e brilho âmbar no hover. Reutilizado nos botões da UI.
export const hudButton = css`
  position: relative;
  font-family: ${MONO};
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(238, 232, 218, 0.72);
  background: rgba(6, 5, 10, 0.55);
  border: 1px solid rgba(255, 202, 112, 0.3);
  border-radius: 1px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: color 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s;

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border: 0 solid ${AMBER};
    opacity: 0.55;
    transition: opacity 0.2s;
  }
  &::before {
    top: -1px;
    left: -1px;
    border-top-width: 1px;
    border-left-width: 1px;
  }
  &::after {
    bottom: -1px;
    right: -1px;
    border-bottom-width: 1px;
    border-right-width: 1px;
  }

  &:hover {
    color: ${AMBER};
    border-color: rgba(255, 202, 112, 0.75);
    background: rgba(255, 202, 112, 0.08);
    box-shadow: 0 0 14px rgba(255, 202, 112, 0.18);
  }
  &:hover::before,
  &:hover::after {
    opacity: 1;
  }
`;

// Estado ativo/selecionado (aceso, com glow).
export const hudButtonActive = css`
  color: ${AMBER};
  border-color: rgba(255, 202, 112, 0.9);
  background: rgba(255, 202, 112, 0.16);
  box-shadow: 0 0 16px rgba(255, 202, 112, 0.28), inset 0 0 10px rgba(255, 202, 112, 0.12);
  &::before,
  &::after {
    opacity: 1;
  }
`;
