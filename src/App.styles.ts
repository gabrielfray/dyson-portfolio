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
  @media (max-width: 560px) {
    top: max(10px, env(safe-area-inset-top));
    max-width: calc(100vw - 24px);
    font-size: 10px;
    padding: 6px 12px;
    gap: 6px;
    span { display: none; } /* no toque, só o rótulo (a dica de mouse não se aplica) */
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

// Card do gigante azul: segue o gigante via transform (posicionado imperativamente),
// SEM flip de âncora — o card fica sempre no mesmo offset lateral, então não pula/
// duplica como antes (o bug vinha do flip esquerda↔direita, não do seguir em si).
export const SunCardWrap = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 36;
  pointer-events: none;
  opacity: 0;
  will-change: transform;
`;

// HUD do portfólio (nav/legenda): some com FADE suave quando começa a implosão
// da supernova (overheat) — em vez de sumir de repente lá no fim.
export const FadeHud = styled.div<{ $out: boolean }>`
  opacity: ${(p) => (p.$out ? 0 : 1)};
  transition: opacity 2.2s ease;
  pointer-events: ${(p) => (p.$out ? 'none' : 'auto')};
`;

// Letterbox (barras pretas de cinema) da cena cinematográfica do Hail Mary.
export const Letterbox = styled.div<{ $on: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  &::before, &::after {
    content: '';
    position: absolute; left: 0; right: 0;
    height: ${(p) => (p.$on ? '11vh' : '0')};
    background: #000;
    transition: height 1.1s ease;
  }
  &::before { top: 0; }
  &::after { bottom: 0; }
`;

// Clarão da transição de reinício: entra por cima de tudo (esconde o remount) e
// bloqueia toda interação enquanto $block. Tom azul-branco (o núcleo da estrela).
export const RestartFlash = styled.div<{ $on: boolean; $block: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: radial-gradient(circle at 50% 46%, #f4f8ff 0%, #cfe0ff 52%, #9fbdf0 100%);
  opacity: ${(p) => (p.$on ? 1 : 0)};
  transition: opacity 0.85s ease;
  pointer-events: ${(p) => (p.$block ? 'auto' : 'none')};
`;
