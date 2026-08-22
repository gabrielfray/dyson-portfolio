# Dyson Portfolio — Gabriel Fray

Portfólio pessoal interativo em forma de **Esfera de Dyson**: um sol de plasma
procedural, sete anéis orbitais e um campo estelar renderizados em tempo real com
WebGL. Cada anel funciona como um portal de navegação para uma seção do portfólio.

Reconstrução em **React + TypeScript + Vite** do artefato original (que usava um
runtime de componentes customizado). Toda a cena 3D foi portada para um módulo
TypeScript com `three.js`.

## Stack

- **React 19** + **TypeScript**
- **Vite 8** (build/dev)
- **three.js** — cena 3D, shaders GLSL (simplex noise / fbm no sol) e
  `EffectComposer` + `UnrealBloomPass` para o bloom
- **styled-components** — estilos por componente (CSS-in-JS)
- **@fontsource** — IBM Plex Mono e Space Grotesk

## Funcionalidades

- Sol procedural animado (plasma via ruído simplex + fbm) com corona e aura
- 7 anéis orbitais em `InstancedMesh`, cada um com velocidade/inclinação própria
- Campo estelar em 3 camadas (incluindo uma "via láctea") com cintilação por shader
- Anéis interativos: hover destaca o anel e acende o emissivo; clique abre o painel
- Parallax de mouse, zoom por scroll e câmera com foco animado ao abrir uma seção
- Console datilografado (efeito de terminal) com loop
- Bilíngue **PT / EN** (alternável no botão superior esquerdo)
- Painel lateral com as seções: Sobre, Projetos, Experiência, Stack, Serviços, Contato
- `Esc` fecha o painel

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # build de produção em dist/
npm run preview  # pré-visualiza o build
npm run lint     # oxlint
```

> Requer Node.js 20.19+ ou 22.12+ (exigência do Vite 8).

## Estrutura

Organizado por responsabilidade; o CSS fica em **styled-components** (arquivos
`*.styles.ts` co-localizados com cada componente).

```
src/
  main.tsx                # entrada — importa fontes e monta o App
  App.tsx                 # composição: estado, cena 3D e layout dos componentes
  App.styles.ts           # container raiz, canvas e overlay do planeta
  styles/
    theme.ts              # tokens (cores e fontes)
    GlobalStyle.ts        # estilos globais + keyframes (createGlobalStyle)
  scene/
    dysonScene.ts         # cena three.js (sol, anéis, planetas, galáxias, bloom)
  data/
    content.ts            # conteúdo bilíngue + dados dos planetas
  hooks/
    useTerminal.ts        # efeito de console datilografado
  components/             # cada componente + seu arquivo *.styles.ts
    LangToggle · Console · RingHoverIndicator · RingLegend
    SectionPanel · PlanetCard · Reticle · Caret · buildPlanetRows
```
