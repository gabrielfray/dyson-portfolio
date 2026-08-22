import styled from 'styled-components';
import { AMBER, CREAM, MONO, SANS } from '../styles/theme';

export const Card = styled.div`
  position: absolute;
  top: 50%;
  left: 46px;
  transform: translateY(-50%);
  width: 272px;
  background: linear-gradient(105deg, rgba(6, 5, 10, 0.9), rgba(10, 8, 14, 0.97));
  border: 1px solid rgba(255, 202, 112, 0.35);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  padding: 20px 22px;
  font-family: ${MONO};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
`;

export const Title = styled.div`
  font-family: ${SANS};
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  min-height: 26px;
`;

export const Kind = styled.div`
  font-size: 12px;
  color: ${AMBER};
  margin-top: 3px;
  margin-bottom: 16px;
  min-height: 15px;
`;

export const Row = styled.div`
  margin-bottom: 9px;
`;

export const RowLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

export const RowLabel = styled.span`
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgba(238, 232, 218, 0.5);
`;

export const Leader = styled.span`
  flex: 1;
  border-bottom: 1px dotted rgba(255, 202, 112, 0.25);
  transform: translateY(-3px);
`;

export const RowValue = styled.span<{ $accent?: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$accent ? AMBER : CREAM)};
`;

export const RowSub = styled.div`
  text-align: right;
  font-size: 12px;
  color: rgba(238, 232, 218, 0.5);
  margin-top: 2px;
`;
