import styled, { css } from 'styled-components';
import { AMBER, CREAM, INK, MONO } from '../styles/theme';
import { hudButton } from '../styles/hud';

/* Entrada em cascata: cada item recebe um índice $i que atrasa a animação. */
const stagger = css<{ $i?: number }>`
  animation: cardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${(p) => (p.$i ?? 0) * 70}ms;
`;

/* Moldura de "dossiê": barra de acento à esquerda + scan sweep + glow no hover. */
const hudCard = css<{ $i?: number }>`
  ${stagger}
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 202, 112, 0.16);
  background: linear-gradient(135deg, rgba(255, 202, 112, 0.035), rgba(10, 8, 14, 0.25));
  border-radius: 2px;
  padding: 18px 22px 18px 24px;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
  @media (max-width: 560px) { padding: 15px 16px 15px 18px; }

  &::before { /* barra de acento */
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(${AMBER}, rgba(255, 154, 60, 0.25));
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.3s;
  }
  &::after { /* varredura de scan */
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 30%, rgba(255, 202, 112, 0.1) 50%, transparent 70%);
    transform: translateX(-130%);
    transition: transform 0.65s ease;
  }
  &:hover {
    border-color: rgba(255, 202, 112, 0.5);
    box-shadow: 0 0 24px rgba(255, 202, 112, 0.12);
    transform: translateX(4px);
  }
  &:hover::before { transform: scaleY(1); }
  &:hover::after { transform: translateX(130%); }
`;

export const Aside = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 35;
  width: min(600px, 94vw);
  display: flex;
  flex-direction: column;
  background: linear-gradient(105deg, rgba(6, 5, 10, 0.9), rgba(10, 8, 14, 0.97));
  border-left: 1px solid rgba(255, 202, 112, 0.35);
  backdrop-filter: blur(18px);
  animation: slideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  @media (max-width: 560px) { width: 100vw; border-left: none; } /* cobre a tela toda no mobile */
`;

export const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 26px 34px;
  border-bottom: 1px solid rgba(255, 202, 112, 0.18);
  @media (max-width: 560px) {
    padding: max(16px, env(safe-area-inset-top)) 16px 14px;
  }
  &::after { /* linha viva que "desenha" sob o cabeçalho */
    content: '';
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 1px;
    width: 40%;
    background: linear-gradient(90deg, ${AMBER}, transparent);
    transform-origin: left;
    animation: growX 0.8s ease 0.2s both;
  }
`;

export const Path = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: ${MONO};
  font-size: 13px;
  letter-spacing: 0.3em;
  color: ${AMBER};
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  svg {
    flex: none;
    animation: growX 0.6s ease both;
  }
  @media (max-width: 560px) { font-size: 11px; letter-spacing: 0.16em; }
`;

export const CloseBtn = styled.button`
  ${hudButton}
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  white-space: nowrap;
  @media (max-width: 560px) { font-size: 10px; padding: 7px 10px; }
  font-size: 11px;
  padding: 8px 16px;
`;

export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 30px 34px 40px;
  -webkit-overflow-scrolling: touch;
  @media (max-width: 560px) {
    padding: 20px 16px calc(28px + env(safe-area-inset-bottom));
  }
`;

export const Stack = styled.div<{ $gap?: number; $alignStart?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 14}px;
  ${(p) => p.$alignStart && 'align-items: flex-start;'}
`;

/* pequeno cabeçalho de seção: "// rótulo ···· contagem" com linha animada */
export const SectionMeta = styled.div<{ $i?: number }>`
  ${stagger}
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  font-family: ${MONO};
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(238, 232, 218, 0.4);
  svg { color: ${AMBER}; }
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(255, 202, 112, 0.35), transparent);
    transform: scaleX(1);
    transform-origin: left;
    animation: growX 0.7s ease 0.15s both;
  }
`;

/* ---- Sobre ---- */
export const AboutLead = styled.p<{ $i?: number }>`
  ${stagger}
  margin: 0;
  font-size: 18px;
  line-height: 1.75;
  color: rgba(238, 232, 218, 0.92);
  text-wrap: pretty;
`;

export const AboutText = styled.p<{ $i?: number }>`
  ${stagger}
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

export const Chip = styled.span<{ $i?: number }>`
  ${stagger}
  font-family: ${MONO};
  font-size: 11px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 202, 112, 0.35);
  border-radius: 99px;
  color: ${AMBER};
  transition: background 0.2s, box-shadow 0.2s;
  &:hover {
    background: rgba(255, 202, 112, 0.1);
    box-shadow: 0 0 12px rgba(255, 202, 112, 0.2);
  }
`;

/* ---- Projetos / Serviços ---- */
export const ProjectCard = styled.a<{ $i?: number }>`
  ${hudCard}
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: ${CREAM};
  &:hover { color: ${CREAM}; }
`;

export const CardIndex = styled.span`
  position: absolute;
  top: 8px;
  right: 14px;
  font-family: ${MONO};
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: rgba(255, 202, 112, 0.1);
  pointer-events: none;
`;

export const CardTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const Tag = styled.div`
  font-family: ${MONO};
  font-size: 10px;
  letter-spacing: 0.2em;
  color: ${AMBER};
`;

export const Launch = styled.span`
  color: ${AMBER};
  opacity: 0.55;
  display: inline-flex;
  transition: transform 0.25s, opacity 0.25s;
  ${ProjectCard}:hover & {
    opacity: 1;
    transform: translate(3px, -3px);
  }
`;

export const CardName = styled.div`
  font-size: 17px;
  font-weight: 600;
  transition: color 0.2s;
  ${ProjectCard}:hover & { color: ${AMBER}; }
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

export const ServiceCard = styled.div<{ $i?: number }>`
  ${hudCard}
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ServiceHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const ServiceIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  color: ${AMBER};
  border: 1px solid rgba(255, 202, 112, 0.3);
  border-radius: 2px;
  background: rgba(255, 202, 112, 0.06);
`;

export const ServiceName = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${AMBER};
`;

export const ServiceDesc = styled.div`
  font-size: 13px;
  line-height: 1.65;
  color: rgba(238, 232, 218, 0.7);
  text-wrap: pretty;
`;

/* ---- Experiência (timeline) ---- */
export const Timeline = styled.div`
  position: relative;
  padding-left: 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  &::before { /* trilho vertical que "cresce" */
    content: '';
    position: absolute;
    left: 5px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background: linear-gradient(rgba(255, 202, 112, 0.5), rgba(255, 202, 112, 0.05));
    transform-origin: top;
    animation: growY 0.7s ease 0.1s both;
  }
`;

export const TimelineItem = styled.div<{ $i?: number }>`
  position: relative;
`;

export const Node = styled.span<{ $i?: number }>`
  position: absolute;
  left: -29px;
  top: 22px;
  width: 9px;
  height: 9px;
  background: ${INK};
  border: 1px solid ${AMBER};
  transform: rotate(45deg);
  animation:
    flickerIn 0.6s both,
    nodePulse 2.6s ease infinite;
  animation-delay: ${(p) => (p.$i ?? 0) * 70}ms;
`;

export const JobCard = styled.div<{ $i?: number }>`
  ${hudCard}
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
  span { color: ${AMBER}; }
`;

export const JobPeriod = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${MONO};
  font-size: 11px;
  color: ${AMBER};
  padding: 3px 9px;
  border: 1px solid rgba(255, 202, 112, 0.3);
  border-radius: 2px;
  white-space: nowrap;
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

/* ---- Stack ---- */
export const StackGroup = styled.div<{ $i?: number }>`
  ${stagger}
`;

export const StackGroupLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
  font-family: ${MONO};
  font-size: 11px;
  letter-spacing: 0.25em;
  color: ${AMBER};
  svg { flex: none; }
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(255, 202, 112, 0.3), transparent);
    transform-origin: left;
    animation: growX 0.7s ease 0.15s both;
  }
`;

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const StackTag = styled.span<{ $i?: number }>`
  ${stagger}
  font-size: 13px;
  padding: 5px 13px;
  border: 1px solid rgba(238, 232, 218, 0.18);
  border-radius: 99px;
  color: rgba(238, 232, 218, 0.8);
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.2s;
  &:hover {
    color: ${AMBER};
    border-color: rgba(255, 202, 112, 0.6);
    background: rgba(255, 202, 112, 0.08);
    box-shadow: 0 0 12px rgba(255, 202, 112, 0.18);
  }
`;

/* ---- Contato ---- */
export const ContactHead = styled.div`
  font-size: 26px;
  font-weight: 700;
  text-wrap: pretty;
  animation: flickerIn 0.8s both;
`;

export const ContactSub = styled.div<{ $i?: number }>`
  ${stagger}
  font-size: 14px;
  color: rgba(238, 232, 218, 0.65);
`;

export const ContactActions = styled.div<{ $i?: number }>`
  ${stagger}
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

export const ContactPrimary = styled.a`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 2px;
  background: ${AMBER};
  color: ${INK};
  font-family: ${MONO};
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.06em;
  box-shadow: 0 0 18px rgba(255, 202, 112, 0.25);
  transition: background 0.2s, box-shadow 0.2s;
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 7px;
    border: 0 solid rgba(18, 16, 10, 0.55);
  }
  &::before { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
  &::after { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }
  &:hover {
    background: #ffe0a0;
    color: ${INK}; /* mantém o texto escuro (senão o a:hover global o iguala ao fundo) */
    box-shadow: 0 0 26px rgba(255, 202, 112, 0.45);
  }
`;

export const ContactRow = styled.div`
  display: flex;
  gap: 12px;
  @media (max-width: 560px) { gap: 8px; }
`;

export const ContactSecondary = styled.a`
  ${hudButton}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 13px;
  font-size: 12px;
  white-space: nowrap;
  @media (max-width: 560px) { padding: 11px 6px; font-size: 11px; gap: 6px; }
`;

export const ContactMeta = styled.div<{ $i?: number }>`
  ${stagger}
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-family: ${MONO};
  font-size: 12px;
  color: rgba(238, 232, 218, 0.45);
`;

export const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  svg { color: rgba(255, 202, 112, 0.6); }
`;

/* ---- Dica secreta (arraste o card de Design Systems) ---- */
export const SecretWrap = styled.div`
  position: relative;
`;

/* Máscara: só mostra a nota na faixa já desocupada pelo card (largura = arraste),
   evitando que a nota vaze por baixo do card translúcido. */
export const SecretMask = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

export const SecretNote = styled.div`
  width: 244px;
  flex: none;
  padding: 6px 20px;
  font-family: 'Caveat', cursive;
  font-weight: 600;
  font-size: 20px;
  line-height: 1.18;
  color: rgba(238, 232, 218, 0.82);
  transform: rotate(-1.6deg);
  text-wrap: pretty;
`;

export const DraggableCard = styled.div<{ $i?: number }>`
  ${hudCard}
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  will-change: transform;
  animation: none; /* sem cardIn: o fill-mode sobreporia o transform do drag */
  /* mesmo fundo dos outros cards (a nota fica escondida por opacity:0 em repouso) */
  &:hover { transform: none; } /* mantém o glow do hudCard; o drag controla o transform */
  &:active { cursor: grabbing; }
`;
