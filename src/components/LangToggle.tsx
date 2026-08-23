import styled from 'styled-components';
import { hudButton } from '../styles/hud';

const Button = styled.button`
  ${hudButton}
  position: fixed;
  top: 24px;
  left: 28px;
  z-index: 40;
  font-size: 12px;
  padding: 8px 16px;
`;

export function LangToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button onClick={onClick}>{label}</Button>;
}
