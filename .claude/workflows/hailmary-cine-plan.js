export const meta = {
  name: 'hailmary-cine-plan',
  description: 'Plano multi-agente p/ a cena cinematográfica da linha de Petrova (Hail Mary)',
  phases: [
    { title: 'Design', detail: '4 agentes: fidelidade, nuvem de astrófago, câmera, escala/astronauta/timing' },
    { title: 'Synthesize', detail: 'consolida num plano de implementação concreto' },
  ],
}

const CONTEXT = `
PROJETO: portfólio "Dyson Sphere" em React 19 + TypeScript + Three.js (r0.185), ColorManagement OFF, LinearSRGB, ACESFilmicToneMapping, UnrealBloomPass. Código em /home/gabrielfray/dyson-portfolio/src/scene/.

TAREFA: recriar de forma FIEL a cena da "linha de Petrova" do filme Project Hail Mary como um easter egg cinematográfico ao clicar na anomalia 'hailmary'.

A CENA REAL (pesquisada): Ryland Grace (astronauta) faz uma EVA parado sobre a nave Hail Mary, no MEIO de uma linha de Petrova. O astrophage (astrófago) aparece como uma nuvem DENSA de pontos de luz ROSA/MAGENTA girando ao redor dele — ele é uma SILHUETA escura contra a nuvem. Como foi feito (não é CGI): câmera ARRI Alexa 65 com filtro de infravermelho REMOVIDO; as partículas são LEDs infravermelhos PISCANDO (gaiola de tela de galinheiro) — invisíveis a olho nu, viram bokeh rosa na câmera IR; água entre placas de vidro na frente da lente (refração/aspecto molhado/borrado); flares VERTICAIS (sensor comprimido na vertical); estrias ARCO-ÍRIS nos pontos de luz mais fortes (filtro rainbow); cor MAGENTA (#ff3d9a a #e0409f), NÃO carmim. Planeta Adrian tem um tom verde-azulado (aqua) rebatido.

ESTADO ATUAL DO CÓDIGO (já implementado, precisa de plano p/ consertar/melhorar):
- src/scene/anomalies.ts (linhas ~440-690): bloco do 'hailmary'. Tem o planeta Adrian (raio PR=15) num grupo g em (-900,560,-1000); a nave Hail Mary (modelo: spine + 3 tanques + sinos + módulo tripulação + painéis); a estrela Tau Ceti (sprite) em local (300,-150,80); uma "linha de Petrova" de fitas (ribbons) da estrela ao planeta; e AGORA um ASTRONAUTA (silhueta low-poly: capsula torso, esfera cabeça, visor, mochila, pernas, braços; material escuro 0x15161a) em cima da nave. Estado 'hmCine' (cinematic): quando ligado, a nave estaciona no MEIO da linha (starPos*0.5), orientada com +X p/ a estrela e astronauta no topo, e expõe hmCam/hmLook (Vector3) p/ a câmera.
- src/scene/dysonScene.ts (linhas ~92-135): campo GLOBAL de "astrophage" = 9000 THREE.Points (astro), espalhados por raio 200..1800 CENTRADO NA ORIGEM (0,0,0), cor rosada FIXA (sem piscar), PointsMaterial + sizeAttenuation, aditivo. Só visível no modo IR (ir>0.02). Tem também um "smoke" (skybox esfera 3000, nebulosa vermelha) que segue a câmera.
- src/scene/dysonScene.ts (linhas ~192-220): startHailmaryCine()/endHailmaryCine(), CINE_APPROACH=6s. Loop (~600-625): fase 1 APROXIMA a câmera (lerp cineFromPos->hmCam, smoothstep) sem música; fase 2 no fim liga startPetrova() (IR/astrophage) + opts.onHailmaryReveal() (música). Input travado durante a cena; clique sai.

PROBLEMAS ENCONTRADOS (validados por screenshot, headless swiftshader SEM bloom):
1. A nave/astronauta ficam a ~1457 unidades da origem, mas o campo global de astrophage é CENTRADO NA ORIGEM e MUITO ESPARSO nessa região -> no reveal quase não aparece nuvem ao redor do astronauta.
2. O astronauta é silhueta ESCURA contra espaço PRETO -> invisível até ter a nuvem brilhante atrás.
3. Escala: o usuário quer que o PLANETA passe grandiosidade (planeta é enorme, nave/astronauta pequenos). Hoje a nave parece grande demais.
4. Refinamentos pedidos no astrophage: partículas PISCANDO (sin(t*freq+fase) por partícula), MAGENTA (#ff3d9a), estrias/flares VERTICAIS, estrias arco-íris nos mais fortes.
5. Timing/áudio: aproxima SEM música -> no exato momento do infravermelho (reveal) fica rosa/magenta + toca a música (playAnomalySfx('hailmary')).

RESTRIÇÕES: manter nosso modelo da nave/astronauta (só ajustar escala/pose). Performance: evitar exageros (é um portfólio). Headless não renderiza bloom, então o plano deve prever validação por composição/posicionamento.`

phase('Design')
const dims = [
  { key: 'fidelidade', p: `Você é diretor de fotografia. Leia a cena real acima. Descreva o ENQUADRAMENTO EXATO da cena do filme (posição da câmera relativa ao astronauta e à nave, o que está no primeiro plano/fundo, como a nuvem de astrophage preenche o quadro, a silhueta, a curvatura do casco da nave embaixo). Defina 2 fases: (A) aproximação a olho nu (o que se vê antes do IR — espaço escuro? o planeta Adrian verde ao longe? a nave iluminada?) e (B) o REVEAL infravermelho (a nuvem magenta surge). Seja concreto sobre composição p/ guiar a câmera 3D.` },
  { key: 'astrofago', p: `Você é engenheiro de shaders Three.js (r0.185, ColorManagement OFF, aditivo, UnrealBloom). Leia /home/gabrielfray/dyson-portfolio/src/scene/dysonScene.ts linhas 92-135 (campo astro atual) e src/scene/anomalies.ts 440-690. Projete uma NUVEM DENSA DEDICADA de astrophage ao redor da nave (na região do Adrian, NÃO na origem) que apareça só no cinematic/IR. Especifique: geometria (nº de partículas, distribuição em casca/volume ao redor do astronauta, raio), ShaderMaterial com: PISCAR por-partícula (atributo fase+freq, uniform tempo), cor MAGENTA #ff3d9a com variação p/ #e0409f, TAMANHO por-partícula, e como fazer FLARES VERTICAIS + estrias ARCO-ÍRIS nos pontos mais fortes (ex.: textura de sprite com risco vertical + gradiente espectral, ou no shader). Dê trechos de GLSL/JS concretos e onde plugar. Considere o "aspecto molhado/borrado" (água entre vidros) — como aproximar (bokeh macio, leve blur).` },
  { key: 'camera', p: `Você é engenheiro de câmera 3D. Leia src/scene/dysonScene.ts 192-220 e 600-625 (cinematic atual) e anomalies.ts hmCine (~640-660). A câmera hoje voa p/ hmCam olhando hmLook. Projete a COREOGRAFIA completa e ROBUSTA: enquadrar o astronauta como silhueta no 1º plano (parte de baixo do quadro) com a nuvem/estrela preenchendo o resto, casco da nave curvando embaixo. Dê a MATEMÁTICA exata (base ortonormal a partir da direção nave->estrela e "cima"; offsets de câmera atrás/acima/lado; ponto de look; FOV talvez maior). Defina o easing das 2 fases, leve movimento (dolly/parallax sutil), e como garantir que o astronauta apareça bem enquadrado (validável por projeção na tela). Sugira valores numéricos iniciais.` },
  { key: 'escala', p: `Você cuida de escala e timing. Leia anomalies.ts do bloco hailmary (~440-690). Hoje: planeta PR=15, nave ~11 unidades, astronauta ~2. O usuário quer FIDELIDADE de escala (planeta ENORME, nave pequena, astronauta bem menor) p/ dar grandiosidade — mas mantendo nossos modelos. Proponha proporções concretas (fatores de escala p/ nave e astronauta; se aumentar o planeta como fundo; distâncias de estacionamento). E o TIMING/ÁUDIO: quando a nave estaciona, quanto dura a aproximação a olho nu, o instante exato do reveal infravermelho (magenta + música playAnomalySfx('hailmary')), letterbox, e a saída da cena. Proponha uma linha do tempo em segundos.` },
]
const designs = await parallel(dims.map((d) => () =>
  agent(`${CONTEXT}\n\n== SEU FOCO: ${d.key} ==\n${d.p}\n\nLeia os arquivos citados p/ aterrar o design. Entregue um DESIGN SPEC conciso e ACIONÁVEL (bullets, números, trechos de código quando fizer sentido). Sem rodeios.`,
    { label: `design:${d.key}`, phase: 'Design' })))

phase('Synthesize')
const plan = await agent(
  `${CONTEXT}\n\n== 4 DESIGN SPECS DOS ESPECIALISTAS ==\n\n### FIDELIDADE/ENQUADRAMENTO\n${designs[0]}\n\n### NUVEM DE ASTRÓFAGO\n${designs[1]}\n\n### CÂMERA\n${designs[2]}\n\n### ESCALA/TIMING\n${designs[3]}\n\n== SUA TAREFA ==\nConsolide num PLANO DE IMPLEMENTAÇÃO único, concreto e ordenado, pronto p/ eu executar no código. Estruture em ETAPAS numeradas, cada uma com: arquivo(s), o que mudar, valores numéricos iniciais, e como VALIDAR por screenshot (o headless não tem bloom, então valide por composição/posição/projeção na tela). Resolva conflitos entre os specs escolhendo a melhor opção e justifique em 1 linha. Inclua uma LINHA DO TEMPO em segundos da cena. Seja específico o suficiente p/ eu implementar sem adivinhar. Marque o que é "essencial p/ ficar fiel" vs "polish opcional".`,
  { label: 'synthesize', phase: 'Synthesize', effort: 'high' })

return { plan }
