import { LuArrowLeft, LuOrbit } from 'react-icons/lu';
import { CONTACT, type Content } from '../data/content';
import * as S from './SectionPanel.styles';

// Painel lateral com o conteúdo da seção selecionada.
export function SectionPanel({
  selId,
  content,
  panelPath,
  backLabel,
  onClose,
}: {
  selId: string;
  content: Content;
  panelPath: string;
  backLabel: string;
  onClose: () => void;
}) {
  return (
    <S.Aside>
      <S.Header>
        <S.Path><LuOrbit size={15} /> {panelPath}</S.Path>
        <S.CloseBtn onClick={onClose}><LuArrowLeft size={14} /> {backLabel}</S.CloseBtn>
      </S.Header>

      <S.Body>
        {selId === 'sobre' && (
          <S.Stack $gap={18}>
            <S.AboutLead>{content.aboutText}</S.AboutLead>
            <S.AboutText>{content.aboutText2}</S.AboutText>
            <S.Chips>
              {[`3+ ${content.yearsLabel}`, 'SaaS B2B', `Sumaré / SP · ${content.remote}`].map((chip) => (
                <S.Chip key={chip}>{chip}</S.Chip>
              ))}
            </S.Chips>
          </S.Stack>
        )}

        {selId === 'projetos' && (
          <S.Stack>
            {content.projects.map((p) => (
              <S.ProjectCard key={p.name} href={p.link} target="_blank" rel="noreferrer">
                <S.Tag>{p.tag}</S.Tag>
                <S.CardName>{p.name}</S.CardName>
                <S.CardDesc>{p.desc}</S.CardDesc>
                <S.CardStack>{p.stack}</S.CardStack>
              </S.ProjectCard>
            ))}
          </S.Stack>
        )}

        {selId === 'experiencia' && (
          <S.Stack>
            {content.jobs.map((j) => (
              <S.InfoCard key={j.company + j.period}>
                <S.JobHead>
                  <S.JobRole>
                    {j.role} · <span>{j.company}</span>
                  </S.JobRole>
                  <S.JobPeriod>{j.period}</S.JobPeriod>
                </S.JobHead>
                <S.JobMode>{j.mode}</S.JobMode>
                <S.JobDesc>{j.desc}</S.JobDesc>
              </S.InfoCard>
            ))}
          </S.Stack>
        )}

        {selId === 'stack' && (
          <S.Stack $gap={18}>
            {content.stacks.map((s) => (
              <div key={s.group}>
                <S.StackGroupLabel>{s.group}</S.StackGroupLabel>
                <S.TagRow>
                  {s.items.map((it) => (
                    <S.StackTag key={it}>{it}</S.StackTag>
                  ))}
                </S.TagRow>
              </div>
            ))}
          </S.Stack>
        )}

        {selId === 'servicos' && (
          <S.Stack>
            {content.services.map((sv) => (
              <S.InfoCard key={sv.name}>
                <S.ServiceName>{sv.name}</S.ServiceName>
                <S.JobDesc>{sv.desc}</S.JobDesc>
              </S.InfoCard>
            ))}
          </S.Stack>
        )}

        {selId === 'contato' && (
          <S.Stack $gap={18} $alignStart>
            <S.ContactHead>{content.contactHead}</S.ContactHead>
            <S.ContactSub>{content.contactSub}</S.ContactSub>
            <S.ContactActions>
              <S.ContactPrimary href={`mailto:${CONTACT.email}`}>{CONTACT.email}</S.ContactPrimary>
              <S.ContactRow>
                <S.ContactSecondary href={CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</S.ContactSecondary>
                <S.ContactSecondary href={CONTACT.github} target="_blank" rel="noreferrer">GitHub</S.ContactSecondary>
              </S.ContactRow>
            </S.ContactActions>
            <S.ContactMeta>
              {CONTACT.location} · {content.remote} · {CONTACT.phone}
            </S.ContactMeta>
          </S.Stack>
        )}
      </S.Body>
    </S.Aside>
  );
}
