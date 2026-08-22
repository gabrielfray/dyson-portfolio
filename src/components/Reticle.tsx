import styled, { css } from 'styled-components';
import { AMBER } from '../styles/theme';

const Wrap = styled.div`
  position: absolute;
  width: 58px;
  height: 58px;
  transform: translate(-50%, -50%);
`;

const Corner = styled.span<{ $v: 'tl' | 'tr' | 'bl' | 'br' }>`
  position: absolute;
  width: 11px;
  height: 11px;
  ${(p) => p.$v === 'tl' && css`top: 0; left: 0; border-top: 2px solid ${AMBER}; border-left: 2px solid ${AMBER};`}
  ${(p) => p.$v === 'tr' && css`top: 0; right: 0; border-top: 2px solid ${AMBER}; border-right: 2px solid ${AMBER};`}
  ${(p) => p.$v === 'bl' && css`bottom: 0; left: 0; border-bottom: 2px solid ${AMBER}; border-left: 2px solid ${AMBER};`}
  ${(p) => p.$v === 'br' && css`bottom: 0; right: 0; border-bottom: 2px solid ${AMBER}; border-right: 2px solid ${AMBER};`}
`;

// Reticula de alvo (cantos) centrada no planeta.
export function Reticle() {
  return (
    <Wrap>
      <Corner $v="tl" />
      <Corner $v="tr" />
      <Corner $v="bl" />
      <Corner $v="br" />
    </Wrap>
  );
}
