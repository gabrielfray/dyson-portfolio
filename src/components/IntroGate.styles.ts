import styled, { css } from 'styled-components';
import { AMBER, CREAM, INK, MONO, SANS } from '../styles/theme';

export const Overlay = styled.div<{ $leaving: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 55%, rgba(12, 8, 3, 0.5), rgba(0, 0, 0, 0.9) 75%);
  backdrop-filter: blur(2px);
  animation: fadeIn 0.8s ease both;
  ${(p) =>
    p.$leaving &&
    css`
      animation: gateOut 0.75s cubic-bezier(0.5, 0, 0.75, 0) forwards;
      pointer-events: none;
    `}
`;

export const Inner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
  padding: 0 24px;
`;

export const Protocol = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: ${MONO};
  font-size: 11px;
  letter-spacing: 0.35em;
  color: rgba(238, 232, 218, 0.5);
  animation: cardIn 0.6s ease 0.1s both;
`;

export const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: ${AMBER};
  box-shadow: 0 0 10px rgba(255, 202, 112, 0.9);
  animation: blink 1.4s ease infinite;
`;

export const Title = styled.h1`
  margin: 0;
  font-family: ${SANS};
  font-weight: 700;
  font-size: clamp(42px, 8vw, 76px);
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${CREAM};
  text-shadow: 0 0 26px rgba(255, 202, 112, 0.45), 0 0 60px rgba(255, 154, 60, 0.25);
  animation: flickerIn 1s ease both;
`;

export const Subtitle = styled.div`
  font-family: ${MONO};
  font-size: 12px;
  letter-spacing: 0.4em;
  color: rgba(255, 202, 112, 0.75);
  animation: cardIn 0.6s ease 0.35s both;
`;

export const BootList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: min(340px, 80vw);
  margin: 8px 0 4px;
`;

export const BootLine = styled.div<{ $i: number }>`
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: ${MONO};
  font-size: 12px;
  color: rgba(238, 232, 218, 0.55);
  animation: cardIn 0.5s ease both;
  animation-delay: ${(p) => 500 + p.$i * 180}ms;
`;

export const BootLeader = styled.span`
  flex: 1;
  border-bottom: 1px dotted rgba(255, 202, 112, 0.25);
  transform: translateY(-3px);
`;

export const BootOk = styled.span`
  color: ${AMBER};
  letter-spacing: 0.2em;
`;

export const StartBtn = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  font-family: ${MONO};
  font-size: 14px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${INK};
  background: ${AMBER};
  border: 1px solid ${AMBER};
  border-radius: 2px;
  padding: 16px 44px;
  cursor: pointer;
  animation:
    cardIn 0.6s ease 1.3s both,
    pulseGlow 2.6s ease-in-out 1.9s infinite;
  transition: background 0.2s, transform 0.15s;
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border: 0 solid rgba(18, 16, 10, 0.55);
  }
  &::before { top: 5px; left: 5px; border-top-width: 1px; border-left-width: 1px; }
  &::after { bottom: 5px; right: 5px; border-bottom-width: 1px; border-right-width: 1px; }
  &:hover {
    background: #ffe0a0;
    transform: translateY(-2px) scale(1.02);
  }
  &:active {
    transform: scale(0.99);
  }
  svg {
    transition: transform 0.2s;
  }
  &:hover svg {
    transform: translateX(3px);
  }
`;
