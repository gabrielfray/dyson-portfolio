import styled from 'styled-components';
import { AMBER, MONO } from '../styles/theme';

const Button = styled.button`
  position: fixed;
  top: 24px;
  left: 28px;
  z-index: 40;
  background: rgba(6, 5, 10, 0.6);
  border: 1px solid rgba(255, 202, 112, 0.5);
  color: ${AMBER};
  font-family: ${MONO};
  font-size: 12px;
  padding: 7px 16px;
  border-radius: 99px;
  cursor: pointer;
  letter-spacing: 0.15em;
  backdrop-filter: blur(8px);
  &:hover {
    background: rgba(255, 202, 112, 0.15);
  }
`;

export function LangToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button onClick={onClick}>{label}</Button>;
}
