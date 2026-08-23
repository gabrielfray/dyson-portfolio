import styled from 'styled-components';
import { AMBER, CREAM, INK, MONO } from '../styles/theme';
import { hudButton } from '../styles/hud';

export const Aside = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 35;
  width: min(600px, 94vw);
  display: flex;
  flex-direction: column;
  background: linear-gradient(105deg, rgba(6, 5, 10, 0.88), rgba(10, 8, 14, 0.96));
  border-left: 1px solid rgba(255, 202, 112, 0.35);
  backdrop-filter: blur(18px);
  animation: slideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 34px;
  border-bottom: 1px solid rgba(255, 202, 112, 0.18);
`;

export const Path = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: ${MONO};
  font-size: 13px;
  letter-spacing: 0.3em;
  color: ${AMBER};
`;

export const CloseBtn = styled.button`
  ${hudButton}
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  padding: 8px 16px;
`;

export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 34px;
`;

export const Stack = styled.div<{ $gap?: number; $alignStart?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 14}px;
  ${(p) => p.$alignStart && 'align-items: flex-start;'}
`;

/* ---- Sobre ---- */
export const AboutLead = styled.p`
  margin: 0;
  font-size: 18px;
  line-height: 1.75;
  color: rgba(238, 232, 218, 0.92);
  text-wrap: pretty;
`;

export const AboutText = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(238, 232, 218, 0.65);
  text-wrap: pretty;
`;

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

export const Chip = styled.span`
  font-family: ${MONO};
  font-size: 11px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 202, 112, 0.35);
  border-radius: 99px;
  color: ${AMBER};
`;

/* ---- Projetos ---- */
export const ProjectCard = styled.a`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(255, 202, 112, 0.16);
  border-radius: 12px;
  padding: 20px 22px;
  color: ${CREAM};
  transition: border-color 0.2s;
  &:hover {
    border-color: rgba(255, 202, 112, 0.6);
    color: ${CREAM};
  }
`;

export const Tag = styled.div`
  font-family: ${MONO};
  font-size: 10px;
  letter-spacing: 0.2em;
  color: ${AMBER};
`;

export const CardName = styled.div`
  font-size: 17px;
  font-weight: 600;
`;

export const CardDesc = styled.div`
  font-size: 13px;
  line-height: 1.6;
  color: rgba(238, 232, 218, 0.65);
  text-wrap: pretty;
`;

export const CardStack = styled.div`
  font-family: ${MONO};
  font-size: 10px;
  color: rgba(238, 232, 218, 0.42);
`;

/* ---- Experiência / Serviços (cartões) ---- */
export const InfoCard = styled.div`
  border: 1px solid rgba(255, 202, 112, 0.16);
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const JobHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const JobRole = styled.div`
  font-size: 16px;
  font-weight: 600;
  span {
    color: ${AMBER};
  }
`;

export const JobPeriod = styled.div`
  font-family: ${MONO};
  font-size: 11px;
  color: ${AMBER};
`;

export const JobMode = styled.div`
  font-family: ${MONO};
  font-size: 10px;
  color: rgba(238, 232, 218, 0.42);
`;

export const JobDesc = styled.div`
  font-size: 13px;
  line-height: 1.65;
  color: rgba(238, 232, 218, 0.7);
  text-wrap: pretty;
`;

export const ServiceName = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${AMBER};
`;

/* ---- Stack ---- */
export const StackGroupLabel = styled.div`
  font-family: ${MONO};
  font-size: 11px;
  letter-spacing: 0.25em;
  color: ${AMBER};
  margin-bottom: 10px;
`;

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const StackTag = styled.span`
  font-size: 13px;
  padding: 5px 13px;
  border: 1px solid rgba(238, 232, 218, 0.18);
  border-radius: 99px;
  color: rgba(238, 232, 218, 0.8);
`;

/* ---- Contato ---- */
export const ContactHead = styled.div`
  font-size: 26px;
  font-weight: 700;
  text-wrap: pretty;
`;

export const ContactSub = styled.div`
  font-size: 14px;
  color: rgba(238, 232, 218, 0.65);
`;

export const ContactActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

export const ContactPrimary = styled.a`
  position: relative;
  padding: 14px 24px;
  border-radius: 1px;
  background: ${AMBER};
  color: ${INK};
  font-family: ${MONO};
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-align: center;
  box-shadow: 0 0 18px rgba(255, 202, 112, 0.25);
  transition: background 0.2s, box-shadow 0.2s;
  /* colchetes de canto em tom escuro (contraste com o preenchimento âmbar) */
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 7px;
    border: 0 solid rgba(18, 16, 10, 0.55);
  }
  &::before {
    top: 4px;
    left: 4px;
    border-top-width: 1px;
    border-left-width: 1px;
  }
  &::after {
    bottom: 4px;
    right: 4px;
    border-bottom-width: 1px;
    border-right-width: 1px;
  }
  &:hover {
    background: #ffe0a0;
    color: ${INK};
    box-shadow: 0 0 26px rgba(255, 202, 112, 0.45);
  }
`;

export const ContactRow = styled.div`
  display: flex;
  gap: 12px;
`;

export const ContactSecondary = styled.a`
  ${hudButton}
  flex: 1;
  padding: 13px;
  font-size: 12px;
  text-align: center;
`;

export const ContactMeta = styled.div`
  font-family: ${MONO};
  font-size: 12px;
  color: rgba(238, 232, 218, 0.45);
`;
