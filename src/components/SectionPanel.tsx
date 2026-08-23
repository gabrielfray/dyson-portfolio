import { useRef, useState } from 'react';
import {
  LuActivity,
  LuArrowLeft,
  LuArrowUpRight,
  LuBriefcase,
  LuChevronRight,
  LuLayers,
  LuMail,
  LuMapPin,
  LuOrbit,
  LuPhone,
  LuRadar,
  LuZap,
} from 'react-icons/lu';
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6';
import { CONTACT, type Content, type Lang } from '../data/content';
import * as S from './SectionPanel.styles';

const META: Record<string, { pt: string; en: string }> = {
  sobre: { pt: 'PERFIL', en: 'PROFILE' },
  projetos: { pt: 'REGISTROS', en: 'ENTRIES' },
  experiencia: { pt: 'TRAJETÓRIA', en: 'TRAJECTORY' },
  stack: { pt: 'ARSENAL', en: 'ARSENAL' },
  servicos: { pt: 'CAPACIDADES', en: 'CAPABILITIES' },
  contato: { pt: 'CANAL ABERTO', en: 'OPEN CHANNEL' },
};

// Card de serviço "secreto": arraste-o de lado para revelar uma dica a lápis
// (uma pista enigmática do easter egg da supernova).
function SecretServiceCard({ name, desc, hint, i }: { name: string; desc: string; hint: string; i: number }) {
  const MAX = 270; // arraste que revela a nota (~244px) por inteiro
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0);
  const onDown = (e: React.PointerEvent) => {
    setDragging(true);
    start.current = e.clientX - dx;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDx(Math.max(0, Math.min(MAX, e.clientX - start.current)));
  };
  const onUp = () => { setDragging(false); setDx(0); }; // solta -> volta ao lugar
  return (
    <S.SecretWrap>
      <S.SecretMask style={{ width: `${dx}px`, transition: dragging ? 'none' : 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <S.SecretNote>{hint}</S.SecretNote>
      </S.SecretMask>
      <S.DraggableCard
        $i={i}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <S.ServiceHead>
          <S.ServiceIcon><LuZap size={17} /></S.ServiceIcon>
          <S.ServiceName>{name}</S.ServiceName>
        </S.ServiceHead>
        <S.ServiceDesc>{desc}</S.ServiceDesc>
      </S.DraggableCard>
    </S.SecretWrap>
  );
}

function Meta({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <S.SectionMeta $i={0}>
      {icon}
      {label}
      {count != null && ` · ${String(count).padStart(2, '0')}`}
    </S.SectionMeta>
  );
}

// Painel lateral (dossiê HUD) com o conteúdo da seção selecionada.
export function SectionPanel({
  selId,
  content,
  lang,
  panelPath,
  backLabel,
  onClose,
}: {
  selId: string;
  content: Content;
  lang: Lang;
  panelPath: string;
  backLabel: string;
  onClose: () => void;
}) {
  const pt = lang === 'pt';
  const meta = (id: string) => (pt ? META[id].pt : META[id].en);

  return (
    <S.Aside>
      <S.Header>
        <S.Path><LuOrbit size={15} /> {panelPath}</S.Path>
        <S.CloseBtn onClick={onClose}><LuArrowLeft size={14} /> {backLabel}</S.CloseBtn>
      </S.Header>

      <S.Body>
        {/* remonta ao trocar de seção -> as animações de entrada tocam de novo */}
        <div key={selId} style={{ display: 'contents' }}>
        {selId === 'sobre' && (
          <S.Stack $gap={18}>
            <Meta icon={<LuActivity size={12} />} label={meta('sobre')} />
            <S.AboutLead $i={1}>{content.aboutText}</S.AboutLead>
            <S.AboutText $i={2}>{content.aboutText2}</S.AboutText>
            <S.Chips>
              {[`3+ ${content.yearsLabel}`, 'SaaS B2B', `São Paulo · ${content.remote}`].map((chip, i) => (
                <S.Chip key={chip} $i={3 + i}>{chip}</S.Chip>
              ))}
            </S.Chips>
          </S.Stack>
        )}

        {selId === 'projetos' && (
          <S.Stack>
            <Meta icon={<LuRadar size={12} />} label={meta('projetos')} count={content.projects.length} />
            {content.projects.map((p, i) => (
              <S.ProjectCard key={p.name} href={p.link} target="_blank" rel="noreferrer" $i={i + 1}>
                <S.CardIndex>{String(i + 1).padStart(2, '0')}</S.CardIndex>
                <S.CardTopRow>
                  <S.Tag>{p.tag}</S.Tag>
                  <S.Launch><LuArrowUpRight size={16} /></S.Launch>
                </S.CardTopRow>
                <S.CardName>{p.name}</S.CardName>
                <S.CardDesc>{p.desc}</S.CardDesc>
                <S.CardStack>{p.stack}</S.CardStack>
              </S.ProjectCard>
            ))}
          </S.Stack>
        )}

        {selId === 'experiencia' && (
          <>
            <Meta icon={<LuBriefcase size={12} />} label={meta('experiencia')} count={content.jobs.length} />
            <S.Timeline>
              {content.jobs.map((j, i) => (
                <S.TimelineItem key={j.company + j.period}>
                  <S.Node $i={i + 1} />
                  <S.JobCard $i={i + 1}>
                    <S.JobHead>
                      <S.JobRole>
                        {j.role} · <span>{j.company}</span>
                      </S.JobRole>
                      <S.JobPeriod>{j.period}</S.JobPeriod>
                    </S.JobHead>
                    <S.JobMode>{j.mode}</S.JobMode>
                    <S.JobDesc>{j.desc}</S.JobDesc>
                  </S.JobCard>
                </S.TimelineItem>
              ))}
            </S.Timeline>
          </>
        )}

        {selId === 'stack' && (
          <S.Stack $gap={18}>
            <Meta icon={<LuLayers size={12} />} label={meta('stack')} count={content.stacks.length} />
            {content.stacks.map((s, gi) => (
              <S.StackGroup key={s.group} $i={gi + 1}>
                <S.StackGroupLabel><LuChevronRight size={13} /> {s.group}</S.StackGroupLabel>
                <S.TagRow>
                  {s.items.map((it, i) => (
                    <S.StackTag key={it} $i={gi + 1 + i * 0.4}>{it}</S.StackTag>
                  ))}
                </S.TagRow>
              </S.StackGroup>
            ))}
          </S.Stack>
        )}

        {selId === 'servicos' && (
          <S.Stack>
            <Meta icon={<LuZap size={12} />} label={meta('servicos')} count={content.services.length} />
            {content.services.map((sv, i) =>
              sv.name === 'Design systems & UI' ? (
                <SecretServiceCard
                  key={sv.name}
                  name={sv.name}
                  desc={sv.desc}
                  i={i + 1}
                  hint={pt
                    ? 'psiu… cem batidas no coração da estrela e ela não aguenta ser vista. — G.'
                    : "psst… a hundred knocks on the star's heart and it can't bear to be seen. — G."}
                />
              ) : (
                <S.ServiceCard key={sv.name} $i={i + 1}>
                  <S.ServiceHead>
                    <S.ServiceIcon><LuZap size={17} /></S.ServiceIcon>
                    <S.ServiceName>{sv.name}</S.ServiceName>
                  </S.ServiceHead>
                  <S.ServiceDesc>{sv.desc}</S.ServiceDesc>
                </S.ServiceCard>
              ),
            )}
          </S.Stack>
        )}

        {selId === 'contato' && (
          <S.Stack $gap={18} $alignStart>
            <Meta icon={<LuActivity size={12} />} label={meta('contato')} />
            <S.ContactHead>{content.contactHead}</S.ContactHead>
            <S.ContactSub $i={1}>{content.contactSub}</S.ContactSub>
            <S.ContactActions $i={2}>
              <S.ContactPrimary href={`mailto:${CONTACT.email}`}>
                <LuMail size={16} /> {CONTACT.email}
              </S.ContactPrimary>
              <S.ContactRow>
                <S.ContactSecondary href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                  <FaLinkedinIn size={13} /> LinkedIn
                </S.ContactSecondary>
                <S.ContactSecondary href={CONTACT.github} target="_blank" rel="noreferrer">
                  <FaGithub size={13} /> GitHub
                </S.ContactSecondary>
              </S.ContactRow>
            </S.ContactActions>
            <S.ContactMeta $i={3}>
              <S.MetaItem><LuMapPin size={13} /> {CONTACT.location}</S.MetaItem>
              <S.MetaItem><LuActivity size={13} /> {content.remote}</S.MetaItem>
              <S.MetaItem><LuPhone size={13} /> {CONTACT.phone}</S.MetaItem>
            </S.ContactMeta>
          </S.Stack>
        )}
        </div>
      </S.Body>
    </S.Aside>
  );
}
