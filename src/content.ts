import type { Section } from './dysonScene';

export type Lang = 'pt' | 'en';

export const SECTIONS: Section[] = [
  { id: 'sobre', pt: 'Sobre', en: 'About' },
  { id: 'projetos', pt: 'Projetos', en: 'Projects' },
  { id: 'experiencia', pt: 'Experiência', en: 'Experience' },
  { id: 'stack', pt: 'Stack', en: 'Stack' },
  { id: 'servicos', pt: 'Serviços', en: 'Services' },
  { id: 'contato', pt: 'Contato', en: 'Contact' },
];

export interface TermDef {
  t: string;
  k: 'dim' | 'name' | 'accent';
}

export interface Project {
  tag: string;
  name: string;
  link: string;
  stack: string;
  desc: string;
}

export interface Job {
  period: string;
  mode: string;
  role: string;
  company: string;
  desc: string;
}

export interface StackGroup {
  group: string;
  items: string[];
}

export interface Service {
  name: string;
  desc: string;
}

export interface Content {
  langLabel: string;
  yearsLabel: string;
  remote: string;
  hoverHint: string;
  backLabel: string;
  aboutText: string;
  aboutText2: string;
  projects: Project[];
  jobs: Job[];
  stacks: StackGroup[];
  services: Service[];
  contactHead: string;
  contactSub: string;
}

export function termDefs(lang: Lang): TermDef[] {
  const pt = lang === 'pt';
  return [
    { t: pt ? '> iniciando núcleo estelar… OK' : '> igniting stellar core… OK', k: 'dim' },
    { t: pt ? '> 6 anéis em órbita detectados' : '> 6 orbital rings detected', k: 'dim' },
    { t: 'GABRIEL FRAY', k: 'name' },
    { t: pt ? '> desenvolvedor full stack' : '> full stack developer', k: 'accent' },
    { t: '> react · typescript · nestjs · aws', k: 'dim' },
    { t: pt ? '> cada anel guarda uma seção da minha órbita' : '> each ring holds a section of my orbit', k: 'dim' },
    { t: pt ? '> clique num anel ou num setor abaixo_' : '> click a ring or a sector below_', k: 'accent' },
  ];
}

export function getContent(lang: Lang): Content {
  const pt = lang === 'pt';
  const T = (a: string, b: string) => (pt ? a : b);
  return {
    langLabel: pt ? 'EN' : 'PT',
    yearsLabel: T('anos de experiência', 'years of experience'),
    remote: T('remoto', 'remote'),
    hoverHint: T('clique para acessar', 'click to access'),
    backLabel: T('voltar à órbita', 'back to orbit'),
    aboutText: T(
      'Desenvolvedor full stack com mais de 3 anos de experiência em produtos SaaS B2B em produção. Construo interfaces em React e TypeScript e as integrações que as sustentam, em NestJS, AWS e Symfony — entregando funcionalidades completas, do back-end até a tela.',
      'Full stack developer with 3+ years shipping B2B SaaS products in production. I build React + TypeScript interfaces and the integrations behind them — NestJS, AWS and Symfony — delivering complete features from back end to screen.',
    ),
    aboutText2: T(
      'Força particular na camada de interface: crio e documento design systems que mantêm coerência entre módulos e aceleram a construção de novas telas. Útil para times que precisam de alguém capaz de assumir uma feature inteira sem depender de handoff.',
      'Particular strength in the interface layer: I create and document design systems that keep modules coherent and speed up new screens. Useful for teams that need someone able to own an entire feature without handoff.',
    ),
    projects: [
      { tag: 'SAAS · LEGALTECH', name: 'Jureo', link: 'https://github.com/dextrahq/jureo', stack: 'React 19 · NestJS · PostgreSQL · Azure OpenAI · Terraform', desc: T('Monitoramento de publicações judiciais e gestão de prazos para advogados. Integra a API Comunica PJe do CNJ e extrai prazos com IA.', "Legal publication monitoring and deadline management for Brazilian lawyers. Integrates CNJ's Comunica PJe API and extracts deadlines with AI.") },
      { tag: 'SAAS · RISCOS', name: T('t-Risk — Redesign da plataforma', 't-Risk — Platform redesign'), link: 'https://www.linkedin.com/in/gabrielfray/', stack: 'React · TypeScript · NestJS · AWS', desc: T('Condução do redesign completo da interface: navegação, home, módulos internos, perfis, modais e trilhas de conteúdo.', 'Led the full interface redesign: navigation, home, internal modules, profiles, modals and content tracks.') },
      { tag: 'DESIGN SYSTEM', name: 't-Risk — Design System', link: 'https://www.linkedin.com/in/gabrielfray/', stack: 'Design tokens · Figma · Componentização', desc: T('Criação e documentação do design system da plataforma — tipografia, paleta, tokens, espaçamento e biblioteca de componentes.', "Created and documented the platform's design system — typography, palette, tokens, spacing and component library.") },
      { tag: 'WEB · INSTITUCIONAL', name: T('Site institucional t-Risk', 't-Risk corporate site'), link: 'https://www.linkedin.com/in/gabrielfray/', stack: 'Symfony · Twig · PHP', desc: T('Evolução e sustentação do site institucional da plataforma de avaliação de riscos.', "Evolution and maintenance of the risk assessment platform's corporate website.") },
      { tag: 'WEBGL · 3D', name: T('Esfera de Dyson', 'Dyson Sphere'), link: 'https://github.com/GabrielFray', stack: 'three.js · GLSL · UnrealBloom', desc: T('Experimento 3D interativo: sol de plasma procedural, anéis orbitais e campo estelar — a cena viva deste portfólio.', "Interactive 3D experiment: procedural plasma sun, orbital rings and starfield — this portfolio's living scene.") },
      { tag: 'OPEN SOURCE', name: '+ GitHub', link: 'https://github.com/GabrielFray', stack: 'github.com/GabrielFray', desc: T('Mais projetos, experimentos e código aberto no meu GitHub.', 'More projects, experiments and open source on my GitHub.') },
    ],
    jobs: [
      { period: T('jan 2024 — atual', 'Jan 2024 — present'), mode: T('remoto · PJ', 'remote · contract'), role: 'Full Stack Dev', company: 't-Risk', desc: T('Plataforma SaaS B2B de avaliação de riscos: redesign completo da interface, design system documentado, integrações NestJS/AWS de ponta a ponta e sustentação do site em Symfony.', 'B2B risk assessment SaaS: full interface redesign, documented design system, end-to-end NestJS/AWS integrations and Symfony site maintenance.') },
      { period: T('2024 — atual', '2024 — present'), mode: T('remoto · PJ', 'remote · contract'), role: 'Dev', company: 'Dextra Labs', desc: T('Atuação simultânea ao contrato principal, com gestão própria de agenda e entregas para dois clientes em paralelo — incluindo o produto Jureo.', 'Concurrent with the main contract, managing my own schedule and deliveries for two clients in parallel — including the Jureo product.') },
      { period: T('abr — out 2023', 'Apr — Oct 2023'), mode: 'Campinas/SP', role: 'Front-End Dev', company: 'Performa_IT', desc: T('Aplicações web e interfaces responsivas a partir de layouts, em time ágil com Scrum: cerimônias, refinamento e code review.', 'Web apps and responsive interfaces from layouts, in an agile Scrum team: ceremonies, refinement and code review.') },
      { period: T('mai 2022 — jan 2023', 'May 2022 — Jan 2023'), mode: T('remoto', 'remote'), role: T('Monitor de Tecnologia', 'Tech Mentor'), company: 'Kenzie Academy', desc: T('Suporte técnico a turmas full stack: correção de entregas, atendimento de dúvidas, testes e simulados com relatórios individuais.', 'Technical support for full stack cohorts: grading, Q&A, tests and mock exams with individual reports.') },
    ],
    stacks: [
      { group: 'FRONT-END', items: ['React', 'Next.js', 'TypeScript', 'Angular', 'Sass'] },
      { group: 'UI & DESIGN SYSTEM', items: ['Design tokens', 'Figma', 'Material UI', 'Tailwind', T('Acessibilidade', 'Accessibility')] },
      { group: 'BACK-END & INFRA', items: ['NestJS', 'Node.js', 'Symfony', 'PostgreSQL', 'AWS', 'Docker'] },
      { group: T('PROCESSO', 'PROCESS'), items: ['Git/GitFlow', 'Code review', 'Scrum', 'Kanban', 'Jira'] },
    ],
    services: [
      { name: T('Features de ponta a ponta', 'End-to-end features'), desc: T('Do modelo de dados à tela: back-end NestJS/AWS, API e interface React — uma feature inteira, sem handoff.', 'From data model to screen: NestJS/AWS back end, API and React interface — a whole feature, no handoff.') },
      { name: 'Design systems & UI', desc: T('Criação, documentação e implantação de design systems que padronizam módulos e aceleram novas telas.', 'Creating, documenting and rolling out design systems that standardize modules and accelerate new screens.') },
      { name: T('Integrações & APIs', 'Integrations & APIs'), desc: T('Integrações entre sistemas, APIs públicas (como a Comunica PJe) e automações com IA em produção.', 'System integrations, public APIs (like Comunica PJe) and AI-powered automations in production.') },
    ],
    contactHead: T('Vamos construir algo em órbita?', "Let's build something in orbit?"),
    contactSub: T('Disponível para trabalho remoto — resposta rápida por e-mail ou LinkedIn.', 'Available for remote work — quick response via email or LinkedIn.'),
  };
}

export const CONTACT = {
  email: 'gabrielfraygarandy@gmail.com',
  linkedin: 'https://www.linkedin.com/in/gabrielfray/',
  github: 'https://github.com/GabrielFray',
  phone: '(19) 99707-2653',
  location: 'Sumaré / São Paulo',
};
