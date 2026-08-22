import styled from 'styled-components';

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
