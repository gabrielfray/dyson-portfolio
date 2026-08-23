import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';
import type { TermLine } from '../hooks/useTerminal';

const Wrap = styled.div`
  position: fixed;
  top: 96px;
  left: 40px;
  z-index: 10;
  width: min(440px, 86vw);
  pointer-events: none;
  font-family: ${MONO};
  animation: fadeIn 1.4s ease 0.4s both;
  @media (max-width: 560px) {
    top: max(58px, calc(env(safe-area-inset-top) + 44px));
    left: 14px;
    width: min(300px, 74vw);
    font-size: 12px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: ${AMBER};
  box-shadow: 0 0 10px rgba(255, 202, 112, 0.9);
  animation: blink 1.4s ease infinite;
`;

const HeaderLabel = styled.span`
  font-size: 11px;
  letter-spacing: 0.3em;
  color: rgba(238, 232, 218, 0.45);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
`;

const Lines = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 180px;
`;

const Line = styled.div`
  letter-spacing: 0.05em;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 14px rgba(0, 0, 0, 0.8);
`;

const Cursor = styled.span`
  display: inline-block;
  width: 9px;
  height: 16px;
  background: ${AMBER};
  margin-top: 4px;
  box-shadow: 0 0 8px rgba(255, 202, 112, 0.6);
  animation: blink 1s step-end infinite;
`;

// Console/terminal datilografado no canto superior esquerdo.
export function Console({ lines }: { lines: TermLine[] }) {
  return (
    <Wrap>
      <Header>
        <Dot />
        <HeaderLabel>GF://CONSOLE</HeaderLabel>
      </Header>
      <Lines>
        {lines.map((ln, i) => (
          <Line key={i} style={{ fontSize: ln.size, color: ln.color, fontWeight: ln.weight }}>
            {ln.text}
          </Line>
        ))}
        <Cursor />
      </Lines>
    </Wrap>
  );
}
