import styled, { css } from 'styled-components';
import { AMBER, CREAM, INK, MONO } from '../styles/theme';

export const Overlay = styled.div<{ $leaving: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 50%, rgba(10, 7, 3, 0.55), rgba(0, 0, 0, 0.92) 80%);
  animation: fadeIn 0.5s ease both;
  /* scanlines de CRT */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(rgba(0, 0, 0, 0) 0 2px, rgba(255, 202, 112, 0.03) 2px 3px);
  }
  ${(p) =>
    p.$leaving &&
    css`
      animation: gateOut 0.75s cubic-bezier(0.5, 0, 0.75, 0) forwards;
      pointer-events: none;
    `}
`;

export const Terminal = styled.div`
  position: relative;
  width: min(660px, 92vw);
  border: 1px solid rgba(255, 202, 112, 0.3);
  border-radius: 3px;
  background: rgba(6, 5, 10, 0.85);
  box-shadow: 0 0 60px rgba(255, 154, 60, 0.12), inset 0 0 60px rgba(0, 0, 0, 0.5);
  font-family: ${MONO};
  overflow: hidden;
  animation: crtFlicker 4s steps(60) infinite;
  /* colchetes de canto (HUD) */
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border: 0 solid ${AMBER};
    opacity: 0.7;
  }
  &::before { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; }
  &::after { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; }
`;

export const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 202, 112, 0.18);
  font-size: 11px;
  letter-spacing: 0.22em;
  color: ${AMBER};
  background: rgba(255, 202, 112, 0.04);
`;

export const Dots = styled.span`
  display: inline-flex;
  gap: 6px;
  span {
    width: 7px;
    height: 7px;
    border-radius: 99px;
    border: 1px solid rgba(255, 202, 112, 0.5);
  }
  span:first-child {
    background: ${AMBER};
    border-color: ${AMBER};
    box-shadow: 0 0 8px rgba(255, 202, 112, 0.8);
    animation: blink 1.4s ease infinite;
  }
`;

export const LogBody = styled.div`
  padding: 20px 22px 22px;
  min-height: 340px;
  font-size: 12.5px;
  line-height: 1.75;
  color: ${CREAM};
`;

export const Line = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  animation: flickerIn 0.28s steps(3) both;
`;

export const Prompt = styled.span`
  color: rgba(255, 202, 112, 0.55);
`;

export const Label = styled.span`
  color: rgba(238, 232, 218, 0.85);
`;

export const Leader = styled.span`
  flex: 1;
  min-width: 16px;
  border-bottom: 1px dotted rgba(255, 202, 112, 0.22);
  transform: translateY(-3px);
`;

export const Status = styled.span`
  color: ${AMBER};
  letter-spacing: 0.12em;
  white-space: nowrap;
`;

export const Ready = styled.div`
  margin-top: 16px;
  color: ${AMBER};
  font-weight: 600;
  letter-spacing: 0.14em;
  text-shadow: 0 0 14px rgba(255, 202, 112, 0.4);
  animation: flickerIn 0.5s both;
`;

export const Awaiting = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  color: rgba(238, 232, 218, 0.6);
  animation: fadeIn 0.4s ease 0.15s both;
`;

export const Cursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 15px;
  margin-left: 4px;
  background: ${AMBER};
  transform: translateY(2px);
  box-shadow: 0 0 8px rgba(255, 202, 112, 0.6);
  animation: blink 1s step-end infinite;
`;

export const StartBtn = styled.button`
  position: relative;
  margin-top: 22px;
  font-family: ${MONO};
  font-size: 13px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${AMBER};
  background: rgba(255, 202, 112, 0.08);
  border: 1px solid ${AMBER};
  border-radius: 2px;
  padding: 12px 26px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  animation: pulseGlow 2.4s ease-in-out 0.3s infinite;
  transition: background 0.18s, color 0.18s, transform 0.15s;
  &:hover {
    background: ${AMBER};
    color: ${INK};
    transform: translateX(3px);
  }
  &:active { transform: scale(0.98); }
`;
