import { createGlobalStyle } from 'styled-components';
import { AMBER, CREAM, SANS } from './theme';

// Estilos globais + keyframes (referenciados por nome nos styled-components).
export const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0;
    height: 100%;
    background: #000;
    color: ${CREAM};
    font-family: ${SANS};
    overflow: hidden;
  }
  #root { height: 100%; }
  a { color: ${AMBER}; text-decoration: none; }
  a:hover { color: #ffe0a0; }
  ::selection { background: rgba(255, 202, 112, 0.3); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(26px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(60px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }

  /* Entrada dos itens do painel (dossiê HUD). */
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(20px); filter: blur(2px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes growX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes growY { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes nodePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 202, 112, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(255, 202, 112, 0); }
  }
  @keyframes flickerIn {
    0% { opacity: 0; }
    10% { opacity: 0.6; }
    14% { opacity: 0.2; }
    24% { opacity: 0.9; }
    30% { opacity: 0.4; }
    45%, 100% { opacity: 1; }
  }
`;
