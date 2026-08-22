import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';

const Wrap = styled.div`
  position: fixed;
  bottom: 96px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(6, 5, 10, 0.85);
  border: 1px solid rgba(255, 202, 112, 0.5);
  border-radius: 99px;
  padding: 10px 22px;
  backdrop-filter: blur(10px);
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: ${AMBER};
  box-shadow: 0 0 10px rgba(255, 202, 112, 0.9);
`;

const Label = styled.span`
  font-family: ${MONO};
  font-size: 13px;
  letter-spacing: 0.2em;
  color: ${AMBER};
  text-transform: uppercase;
`;

const Hint = styled.span`
  font-family: ${MONO};
  font-size: 11px;
  color: rgba(238, 232, 218, 0.55);
`;

// Pílula que aparece ao passar o mouse sobre um anel (seção).
export function RingHoverIndicator({ label, hint }: { label: string; hint: string }) {
  return (
    <Wrap>
      <Dot />
      <Label>{label}</Label>
      <Hint>{hint}</Hint>
    </Wrap>
  );
}
