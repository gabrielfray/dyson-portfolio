import styled from 'styled-components';
import { AMBER, MONO } from './styles/theme';

// Aviso de controle manual (aparece quando a rotação está travada).
export const ManualHint = styled.div`
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  font-family: ${MONO};
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${AMBER};
  background: rgba(6, 5, 10, 0.7);
  border: 1px solid rgba(255, 202, 112, 0.4);
  border-radius: 99px;
  padding: 8px 18px;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease both;
  span {
    color: rgba(238, 232, 218, 0.55);
    letter-spacing: 0.08em;
    text-transform: none;
  }
`;

export const Root = styled.div`
  position: relative;
  height: 100vh;
  overflow: hidden;
`;

export const CanvasMount = styled.div<{ $shift: string }>`
  position: fixed;
  inset: 0;
  z-index: 0;
  transition: transform 1.1s cubic-bezier(0.22, 0.61, 0.36, 1);
  transform: translateX(${(p) => p.$shift});
`;

// Posicionada imperativamente (transform/opacity via ref) enquanto segue o planeta.
export const PlanetOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 36;
  pointer-events: none;
  opacity: 0;
  will-change: transform;
`;
