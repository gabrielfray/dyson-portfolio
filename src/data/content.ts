import type { Section } from '../scene/dysonScene';

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

export interface BootLine {
  label: string;
  status: string;
}
export interface IntroText {
  titlebar: string;
  lines: BootLine[];
  ready: string;
  awaiting: string;
  start: string;
}

export function getIntro(lang: Lang): IntroText {
  const pt = lang === 'pt';
  return {
    titlebar: pt ? 'GF://DYSON-ARRAY · TERMINAL DE CONTROLE' : 'GF://DYSON-ARRAY · CONTROL TERMINAL',
    lines: pt
      ? [
          { label: 'inicializando GF-OS · kernel v1.0', status: 'OK' },
          { label: 'núcleo estelar · classe G · 1 L☉', status: 'ATIVO' },
          { label: 'anéis coletores · captação 3.8·10²⁶ W', status: '6/6' },
          { label: 'enxame orbital · sincronização kepleriana', status: 'OK' },
          { label: 'efemérides do sistema solar', status: 'CARREGADO' },
          { label: 'campo estelar · 17.000 pontos', status: 'INDEXADO' },
          { label: 'casca geodésica · icosaedro nível 2', status: 'OK' },
          { label: 'classificação · Kardashev II (parcial)', status: 'OK' },
          { label: 'uplink com o operador', status: 'ESTÁVEL' },
        ]
      : [
          { label: 'booting GF-OS · kernel v1.0', status: 'OK' },
          { label: 'stellar core · class G · 1 L☉', status: 'ONLINE' },
          { label: 'collector rings · 3.8·10²⁶ W intake', status: '6/6' },
          { label: 'orbital swarm · keplerian sync', status: 'OK' },
          { label: 'solar system ephemeris', status: 'LOADED' },
          { label: 'starfield · 17,000 points', status: 'INDEXED' },
          { label: 'geodesic shell · icosahedron L2', status: 'OK' },
          { label: 'classification · Kardashev II (partial)', status: 'OK' },
          { label: 'operator uplink', status: 'STABLE' },
        ],
    ready: pt ? 'SISTEMA PRONTO' : 'SYSTEM READY',
    awaiting: pt ? 'aguardando comando do operador' : 'awaiting operator command',
    start: pt ? 'INICIAR PROJETO' : 'START PROJECT',
  };
}

// ---------- Anomalias / easter eggs (objetos especiais no fundo) ----------
export interface AnomalyInfo {
  name: string;
  alias?: string; // se presente: digita name, apaga e escreve alias (trocadilho)
  kind: string;
  rows: { label: string; value: string }[];
  status?: string; // linha destacada, não tarjada (ex.: CLASSIFICADO)
  note?: string; // citação/curiosidade
  glitch?: boolean; // nome embaralha (designação desconhecida)
  redacted?: boolean; // valores tarjados
}

export function getAnomaly(key: string, lang: Lang): AnomalyInfo {
  const pt = lang === 'pt';
  const T = (a: string, b: string) => (pt ? a : b);
  switch (key) {
    case 'oumuamua':
      return {
        name: "'Oumuamua",
        kind: T('objeto interestelar', 'interstellar object'),
        rows: [
          { label: T('DESIGNAÇÃO', 'DESIGNATION'), value: '1I/2017 U1' },
          { label: T('VELOCIDADE', 'SPEED'), value: '87,3 km/s' },
          { label: T('COMPRIMENTO', 'LENGTH'), value: '~400 m' },
          { label: T('ORIGEM', 'ORIGIN'), value: T('fora do sistema', 'interstellar') },
          { label: 'STATUS', value: T('de passagem', 'transient') },
        ],
        note: T('acelerou sem cauda cometária — origem debatida', 'non-gravitational acceleration, no tail — origin debated'),
      };
    case 'tabby':
      return {
        name: "Tabby's Star",
        kind: 'KIC 8462852',
        rows: [
          { label: T('DISTÂNCIA', 'DISTANCE'), value: T('1.470 anos-luz', '1,470 light-years') },
          { label: T('TIPO', 'TYPE'), value: 'F3 V' },
          { label: T('BRILHO', 'FLUX'), value: T('quedas irregulares', 'irregular dips') },
          { label: T('HIPÓTESE', 'HYPOTHESIS'), value: T('megaestrutura?', 'megastructure?') },
          { label: 'STATUS', value: T('sob observação', 'monitored') },
        ],
        note: T('o mistério que inspirou este projeto', 'the mystery that inspired this project'),
      };
    case 'monolith':
      return {
        name: 'MONÓLITO · TMA-1',
        kind: T('artefato · origem desconhecida', 'artifact · unknown origin'),
        rows: [
          { label: T('PROPORÇÃO', 'RATIO'), value: '1 : 4 : 9' },
          { label: T('MATERIAL', 'MATERIAL'), value: '—' },
          { label: T('IDADE', 'AGE'), value: T('~4 mi anos', '~4 Myr') },
          { label: T('FUNÇÃO', 'FUNCTION'), value: T('desconhecida', 'unknown') },
          { label: 'STATUS', value: T('inerte', 'dormant') },
        ],
        note: T('"Meu Deus… está cheio de estrelas."', '"My God… it\'s full of stars."'),
      };
    case 'voyager':
      return {
        name: 'Voyager 1',
        kind: T('sonda · 1977', 'probe · 1977'),
        rows: [
          { label: T('DISTÂNCIA', 'DISTANCE'), value: '163 UA' },
          { label: T('VELOCIDADE', 'SPEED'), value: '17 km/s' },
          { label: T('CARGA', 'PAYLOAD'), value: T('Disco de Ouro', 'Golden Record') },
          { label: T('REGIÃO', 'REGION'), value: T('meio interestelar', 'interstellar medium') },
          { label: 'STATUS', value: T('ativa', 'active') },
        ],
        note: T('"Olhe de novo esse ponto. É aqui. É a nossa casa." — Sagan', '"Look again at that dot. That\'s here. That\'s home." — Sagan'),
      };
    case 'tardis':
      return {
        name: 'TARDIS',
        kind: T('cabine policial · Tipo 40', 'police box · Type 40'),
        rows: [
          { label: T('MODELO', 'MODEL'), value: 'TT Capsule, Mark I' },
          { label: T('CAMUFLAGEM', 'CHAMELEON'), value: T('travada (1963)', 'stuck (1963)') },
          { label: T('DIMENSÕES', 'DIMENSIONS'), value: T('maior por dentro', 'bigger on the inside') },
          { label: T('PROPULSÃO', 'DRIVE'), value: T('Vórtice do Tempo', 'Time Vortex') },
          { label: 'STATUS', value: T('em trânsito', 'in transit') },
        ],
        note: T('"Wibbly-wobbly… timey-wimey."', '"Wibbly-wobbly… timey-wimey."'),
      };
    case 'hailmary':
      return {
        name: 'Tau Ceti e',
        alias: 'Adrian', // apelido dado por Grace e Rocky
        kind: T('planeta · 1,4 G · 91% CO₂', 'planet · 1.4 G · 91% CO₂'),
        rows: [
          { label: T('DESIGNAÇÃO', 'DESIGNATION'), value: 'Tau Ceti e' },
          { label: T('ESTRELA', 'STAR'), value: 'Tau Ceti' },
          { label: T('AMEAÇA', 'THREAT'), value: T('astrofágico', 'astrophage') },
          { label: T('PREDADOR', 'PREDATOR'), value: 'Taumoeba' }, // nome próprio (Grace) — não traduz
          { label: 'STATUS', value: T('linha de Petrova estável', 'Petrova line stable') },
        ],
        note: '"We save worlds, friend. We save everything." — Rocky, Project Hail Mary',
      };
    case 'ufo':
    default:
      return {
        name: 'UNKNOWN',
        kind: T('// SINAL DESCONHECIDO', '// UNKNOWN SIGNAL'),
        rows: [
          { label: T('DISTÂNCIA', 'DISTANCE'), value: '' },
          { label: T('MASSA', 'MASS'), value: '' },
          { label: T('VELOCIDADE', 'VELOCITY'), value: '' },
          { label: T('ORIGEM', 'ORIGIN'), value: '' },
          { label: T('ASSINATURA', 'SIGNATURE'), value: '' },
        ],
        status: T('CLASSIFICADO', 'CLASSIFIED'),
        note: 'λ the Free Man', // ref. aos Vortigaunts (Half-Life 2); λ = símbolo da série
        glitch: true,
        redacted: true,
      };
  }
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
      { period: T('dez 2025 — atual', 'Dec 2025 — present'), mode: T('remoto · PJ', 'remote · contract'), role: 'Dev', company: 'Dextra Labs', desc: T('Atuação simultânea ao contrato principal, com gestão própria de agenda e entregas para dois clientes em paralelo — incluindo o produto Jureo.', 'Concurrent with the main contract, managing my own schedule and deliveries for two clients in parallel — including the Jureo product.') },
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
  whatsapp: 'https://wa.me/5519997072653', // (19) 99707-2653
  phone: '(19) 99707-2653',
  location: 'São Paulo',
};

// ---------- Sistema solar: dados reais dos planetas ----------
// Usados tanto pela cena (au -> raio orbital, bodyPx -> tamanho) quanto pelo
// painel de hover (estilo terminal sci-fi). Ordem: Mercúrio -> Netuno.
export interface Bi {
  pt: string;
  en: string;
}
export interface PlanetInfo {
  key: string;
  name: Bi;
  type: Bi;
  au: number; // distância média ao Sol (UA)
  km: number; // distância média (milhões de km)
  periodY: number; // período orbital (anos)
  diameterKm: number; // diâmetro equatorial (km)
  massE: number; // massa (massas terrestres, ⊕)
  tempC: number; // temperatura média (°C)
  moons: number; // luas conhecidas
  bodyPx: number; // tamanho do corpo na tabela comprimida (d/d_terra)^0.35
  ring?: boolean; // possui anéis proeminentes
  status: Bi; // rótulo temático (vibe de terminal)
  color: number; // cor base por albedo (valor/brilho carrega a diferenciação)
  rough: number; // rugosidade (quanto menor, mais nítido o reflexo do sol)
  metal: number; // metalness (realce especular)
  atmo: number; // cor da borda atmosférica (fresnel no limbo)
  atmoI: number; // intensidade da atmosfera (0 = sem ar, ex.: Mercúrio/Marte)
}

const ROCHOSO: Bi = { pt: 'planeta rochoso', en: 'rocky planet' };
const GAS: Bi = { pt: 'gigante gasoso', en: 'gas giant' };
const GELO: Bi = { pt: 'gigante de gelo', en: 'ice giant' };

// Cores por albedo geométrico real (o VALOR/brilho diferencia — Vênus ~4× Marte).
// Correções físicas: Marte é butterscotch (não vermelho); Netuno é azul-esverdeado
// PÁLIDO (o azul-marinho famoso era realce de contraste da Voyager 2).
export const PLANETS: PlanetInfo[] = [
  { key: 'mercurio', name: { pt: 'Mercúrio', en: 'Mercury' }, type: ROCHOSO, au: 0.39, km: 57.9, periodY: 0.24, diameterKm: 4879, massE: 0.055, tempC: 167, moons: 0, bodyPx: 3, status: { pt: 'TÓRRIDO · SEM AR', en: 'SCORCHED · NO AIR' }, color: 0x7d746a, rough: 0.95, metal: 0.1, atmo: 0x000000, atmoI: 0.0 },
  { key: 'venus', name: { pt: 'Vênus', en: 'Venus' }, type: ROCHOSO, au: 0.72, km: 108.2, periodY: 0.62, diameterKm: 12104, massE: 0.815, tempC: 464, moons: 0, bodyPx: 4, status: { pt: 'ESTUFA · OPACO', en: 'GREENHOUSE · OPAQUE' }, color: 0xe9ddb6, rough: 0.75, metal: 0.05, atmo: 0xfff0c4, atmoI: 1.0 },
  { key: 'terra', name: { pt: 'Terra', en: 'Earth' }, type: ROCHOSO, au: 1.0, km: 149.6, periodY: 1.0, diameterKm: 12742, massE: 1.0, tempC: 15, moons: 1, bodyPx: 4, status: { pt: 'HABITÁVEL · ATIVO', en: 'HABITABLE · ACTIVE' }, color: 0x8ba6c4, rough: 0.5, metal: 0.12, atmo: 0x6db4ff, atmoI: 0.7 },
  { key: 'marte', name: { pt: 'Marte', en: 'Mars' }, type: ROCHOSO, au: 1.52, km: 227.9, periodY: 1.88, diameterKm: 6779, massE: 0.107, tempC: -63, moons: 2, bodyPx: 3, status: { pt: 'FRIO · POEIRA', en: 'COLD · DUSTY' }, color: 0x936f45, rough: 0.9, metal: 0.06, atmo: 0xc89a6a, atmoI: 0.1 },
  { key: 'jupiter', name: { pt: 'Júpiter', en: 'Jupiter' }, type: GAS, au: 5.2, km: 778.5, periodY: 11.86, diameterKm: 139820, massE: 317.8, tempC: -108, moons: 95, bodyPx: 9, status: { pt: 'GASOSO · RADIAÇÃO', en: 'GAS · RADIATION' }, color: 0xd3c3a0, rough: 0.55, metal: 0.12, atmo: 0xe6cfa2, atmoI: 0.4 },
  { key: 'saturno', name: { pt: 'Saturno', en: 'Saturn' }, type: GAS, au: 9.54, km: 1434, periodY: 29.45, diameterKm: 116460, massE: 95.2, tempC: -139, moons: 274, bodyPx: 9, ring: true, status: { pt: 'ANELADO · IR APENAS', en: 'RINGED · IR ONLY' }, color: 0xcdbb8c, rough: 0.55, metal: 0.12, atmo: 0xefdfb0, atmoI: 0.32 },
  { key: 'urano', name: { pt: 'Urano', en: 'Uranus' }, type: GELO, au: 19.2, km: 2871, periodY: 84.0, diameterKm: 50724, massE: 14.5, tempC: -195, moons: 28, bodyPx: 6, status: { pt: 'GELADO · INCLINADO', en: 'ICY · TILTED' }, color: 0xb6d2d2, rough: 0.4, metal: 0.18, atmo: 0xc4ecec, atmoI: 0.55 },
  { key: 'netuno', name: { pt: 'Netuno', en: 'Neptune' }, type: GELO, au: 30.1, km: 4495, periodY: 164.8, diameterKm: 49244, massE: 17.1, tempC: -201, moons: 16, bodyPx: 6, status: { pt: 'REMOTO · VENTOS', en: 'REMOTE · WINDS' }, color: 0xa2c0c2, rough: 0.4, metal: 0.2, atmo: 0xadd6e2, atmoI: 0.75 },
  // easter egg: bem mais longe que todos (precisa de bastante zoom out p/ achar).
  { key: 'plutao', name: { pt: 'Plutão', en: 'Pluto' }, type: { pt: 'planeta anão', en: 'dwarf planet' }, au: 39.5, km: 5906, periodY: 248, diameterKm: 2377, massE: 0.0022, tempC: -229, moons: 5, bodyPx: 3, status: { pt: 'REBAIXADO EM 2006', en: 'DEMOTED IN 2006' }, color: 0xc9b18e, rough: 0.55, metal: 0.12, atmo: 0x9fb6d0, atmoI: 0.15 },
];

export interface PlanetLabels {
  distance: string;
  period: string;
  diameter: string;
  mass: string;
  temp: string;
  moons: string;
  flux: string;
  status: string;
}

export function planetLabels(lang: Lang): PlanetLabels {
  const pt = lang === 'pt';
  return {
    distance: pt ? 'DISTÂNCIA' : 'DISTANCE',
    period: pt ? 'PERÍODO' : 'PERIOD',
    diameter: pt ? 'DIÂMETRO' : 'DIAMETER',
    mass: pt ? 'MASSA' : 'MASS',
    temp: pt ? 'TEMP.' : 'TEMP.',
    moons: pt ? 'LUAS' : 'MOONS',
    flux: pt ? 'FLUXO' : 'FLUX',
    status: 'STATUS',
  };
}
