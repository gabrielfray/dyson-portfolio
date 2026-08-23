import styled from 'styled-components';
import { hudButton } from '../styles/hud';

const Button = styled.button`
  ${hudButton}
  position: fixed;
  top: max(24px, env(safe-area-inset-top));
  left: max(28px, env(safe-area-inset-left));
  z-index: 60; /* acima do portão de inicialização (z 50) */
  font-size: 12px;
  padding: 8px 16px;
  @media (max-width: 560px) {
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    font-size: 11px;
    padding: 6px 12px;
  }
`;

export function LangToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button onClick={onClick}>{label}</Button>;
}
