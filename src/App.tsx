import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initDysonScene, type DysonSceneApi, type Section } from './scene/dysonScene';
import { getContent, PLANETS, SECTIONS, type Lang } from './data/content';
import { useTerminal } from './hooks/useTerminal';
import { playAnomalySfx, stopAllSfx, setOnFileEnded, currentSfxKey, playContactTone, playSupernovaBirth, playCollapseRumble, playRestart, playAnomalyPreview } from './audio/sfx';
import { GlobalStyle } from './styles/GlobalStyle';
import { LangToggle } from './components/LangToggle';
import { Console } from './components/Console';
import { RingHoverIndicator } from './components/RingHoverIndicator';
import { RingLegend } from './components/RingLegend';
import { SectionPanel } from './components/SectionPanel';
import { Reticle } from './components/Reticle';
import { PlanetCard } from './components/PlanetCard';
import { AnomalyCard } from './components/AnomalyCard';
import { IntroGate } from './components/IntroGate';
import { ResetTerminal } from './components/ResetTerminal';
import { SupernovaCard } from './components/SupernovaCard';
import * as S from './App.styles';

export default function App() {
  const [lang, setLang] = useState<Lang>('pt');
  const [hoverRing, setHoverRing] = useState<Section | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hoverPlanet, setHoverPlanet] = useState<number | null>(null);
  const [hoverAnomaly, setHoverAnomaly] = useState<string | null>(null);
  const [hoverSun, setHoverSun] = useState(false); // gigante azul (supernova) sob o cursor
  const [started, setStarted] = useState(false);
  const [manual, setManual] = useState(false);
  const [mission, setMission] = useState(false);   // 1ª explosão do sol -> missão secreta (puzzle); portfólio FICA
  const [overheat, setOverheat] = useState(false); // sinal aceito -> meltdown do console durante a supernova
  const [cinematic, setCinematic] = useState(false); // cena cinematográfica (Hail Mary) -> trava HUD + letterbox
  const [entered, setEntered] = useState(0);       // acertos em sequência do sinal (0..5), mostrado no console
  const enteredRef = useRef(0);                    // leitura síncrona p/ a cascata do erro
  const cascadeRef = useRef<number | null>(null);  // timer da cascata (apaga os pontos R->L)
  const [collapsed, setCollapsed] = useState(false); // supernova (pós-puzzle) -> portfólio some + terminal de reset
  const [simKey, setSimKey] = useState(0); // remontar a cena p/ "reiniciar simulação"
  const [resetting, setResetting] = useState(false); // transição do reinício (bloqueia input)
  const [flash, setFlash] = useState(false);         // clarão branco que esconde o remount
  const pendingRestart = useRef(false);              // pede o intro de recuo na cena nova
  const restartingRef = useRef(false);               // trava reentrada durante a transição

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneApiRef = useRef<DysonSceneApi | null>(null);
  const planetOverlayRef = useRef<HTMLDivElement | null>(null);
  const planetCardRef = useRef<HTMLDivElement | null>(null);
  const sunCardRef = useRef<HTMLDivElement | null>(null); // card do gigante
  const sunCardWrapRef = useRef<HTMLDivElement | null>(null); // wrapper que segue o gigante
  const selRef = useRef<number | null>(null);
  const collapsedRef = useRef(false);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);
  useEffect(() => { collapsedRef.current = collapsed; }, [collapsed]);
  useEffect(() => { enteredRef.current = entered; }, [entered]);
  const clearCascade = useCallback(() => { if (cascadeRef.current) { window.clearInterval(cascadeRef.current); cascadeRef.current = null; } }, []);

  // reinicia a simulação: remonta a cena (estado inicial) e limpa o HUD
  const resetSim = useCallback(() => {
    stopAllSfx();
    setSel(null); setHoverPlanet(null); setHoverAnomaly(null); setHoverRing(null);
    setManual(false); setMission(false); setCollapsed(false); setHoverSun(false); setOverheat(false);
    clearCascade(); setEntered(0);
    setSimKey((k) => k + 1);
  }, [clearCascade]);

  // Transição do reinício (cinematográfica, à prova de bug): (1) clarão branco
  // entra + a câmera mergulha na estrela girando; (2) atrás do branco a cena
  // remonta; (3) a cena nova começa colada na estrela e recua girando até a
  // rotação normal, o branco some. O overlay bloqueia toda ação do usuário.
  const doRestart = useCallback(() => {
    if (restartingRef.current) return; // já em transição
    restartingRef.current = true;
    setResetting(true);
    setFlash(true);                          // branco entra (~0,85s)
    playRestart();                           // som sci-fi de reinício (casado com a transição)
    sceneApiRef.current?.approachStar();     // cena atual mergulha na estrela
    window.setTimeout(() => {
      pendingRestart.current = true;
      resetSim();                            // remonta (escondido pelo branco)
      window.setTimeout(() => setFlash(false), 450);   // revela a cena nova recuando
      window.setTimeout(() => { setResetting(false); restartingRef.current = false; }, 2600); // libera o input
    }, 1000);
  }, [resetSim]);

  const termLines = useTerminal(lang, started, (mission || overheat) && !collapsed); // congela o console na missão/meltdown
  const pt = lang === 'pt';
  const content = useMemo(() => getContent(lang), [lang]);

  const select = useCallback((idx: number) => {
    setSel(idx);
    setHoverRing(null);
    const api = sceneApiRef.current;
    if (api) {
      api.setLocked(idx);
      api.setFocus(1);
    }
  }, []);

  const close = useCallback(() => {
    setSel(null);
    const api = sceneApiRef.current;
    if (api) {
      api.setLocked(-1);
      api.setFocus(0);
    }
  }, []);

  // Monta a cena 3D uma única vez.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const api = initDysonScene(el, {
      bloom: 1.0,
      sections: SECTIONS,
      onHover: (s) => setHoverRing(selRef.current == null ? s : null),
      onSelect: (_s, idx) => { if (collapsedRef.current) return; select(idx); }, // sem navegação após a supernova
      onPlanetHover: (idx) => setHoverPlanet(idx),
      onAnomalyHover: (key) => setHoverAnomaly(key),
      onAnomalyClick: (key) => {
        // trocar p/ outro egg encerra a Petrova (forçado)
        if (key !== 'hailmary') sceneApiRef.current?.endPetrova();
        if (key !== 'hailmary') playAnomalySfx(key); // Hail Mary: a música toca no REVEAL (infravermelho), não no clique
      },
      onCinematic: (on) => { setCinematic(on); if (on) { setHoverAnomaly(null); setHoverPlanet(null); setHoverSun(false); } }, // trava o HUD + tira o card da frente
      onHailmaryReveal: () => playAnomalySfx('hailmary'),    // infravermelho revela -> música no exato momento
      onManual: (m) => setManual(m),
      onDetonate: () => playAnomalySfx('supernova'), // som da explosão, sincronizado à animação
      onSunDead: () => { setMission(true); setEntered(0); }, // 1ª explosão -> missão secreta; o sinal NÃO é tocado (o jogador tem que conhecer/pesquisar)
      onSupernova: () => { setOverheat(true); clearCascade(); setEntered(0); playCollapseRumble(); playSupernovaBirth(); }, // sinal aceito -> meltdown do console + rumble + estouro
      onReborn: () => { setCollapsed(true); setOverheat(false); setMission(false); }, // gigante azul formada -> portfólio some + terminal de reset
      onSunHover: (over) => setHoverSun(over), // card da gigante azul
      onSunTrack: (x, y) => {
        // card do gigante segue a estrela com offset lateral FIXO (sem flip -> não pula/
        // duplica). Vai p/ a direita, ou p/ a esquerda se a estrela estiver muito à direita.
        const w = sunCardWrapRef.current;
        if (!w) return;
        const left = x > innerWidth * 0.62; // gigante fica sempre no centro -> quase sempre à direita
        const ox = left ? x - 378 : x + 14; // card (272px, +46 do offset interno) ao lado do gigante
        w.style.transform = `translate(${ox}px, ${y}px)`;
        w.style.opacity = '1';
      },
      onContactTone: (i) => playContactTone(i), // nota da anomalia clicada (no CLIQUE)
      onContactProgress: (n) => { clearCascade(); setEntered(n); }, // acertos em sequência -> HUD
      onAnomalyPreview: (i) => playAnomalyPreview(i, Math.floor(Math.random() * 3)), // decoy: nota fora do sinal (no clique)
      onContactWrong: () => {
        // a nota já tocou no clique; aqui só a CASCATA (apaga a entrada da direita p/ esquerda)
        clearCascade();
        let e = enteredRef.current;
        if (e <= 0) { setEntered(0); return; }
        cascadeRef.current = window.setInterval(() => { e -= 1; setEntered(Math.max(0, e)); if (e <= 0) clearCascade(); }, 140);
      },

      onPlanetTrack: (x, y) => {
        const el2 = planetOverlayRef.current;
        if (!el2) return;
        el2.style.transform = `translate(${x}px, ${y}px)`;
        el2.style.opacity = '1';
        const card = planetCardRef.current;
        if (card) {
          if (innerWidth <= 560) {
            // mobile: card ancorado no rodapé-centro (sempre cabe; o planeta fica
            // visível acima). O overlay está em (x,y) -> compenso p/ posição de tela.
            const cw = Math.min(240, innerWidth - 24), ch = card.offsetHeight || 240;
            const cx = (innerWidth - cw) / 2;          // centralizado na horizontal
            const cy = innerHeight - 92 - ch;          // acima da barra inferior de seções
            card.style.left = `${cx - x}px`;
            card.style.right = 'auto';
            card.style.top = `${cy - y}px`;
            card.style.bottom = 'auto';
            card.style.transform = 'none';
          } else {
            const rightSide = x > innerWidth * 0.58; // vira o card p/ não sair da tela
            card.style.left = rightSide ? 'auto' : '46px';
            card.style.right = rightSide ? '46px' : 'auto';
            // abre p/ baixo se o objeto está na metade de cima; p/ cima se está embaixo
            const below = y < innerHeight * 0.5;
            card.style.top = below ? '18px' : 'auto';
            card.style.bottom = below ? 'auto' : '18px';
            card.style.transform = 'none';
          }
        }
      },
    });
    sceneApiRef.current = api;
    // após remontar por "/reiniciar": a cena nova começa colada na estrela e recua girando
    if (pendingRestart.current) { pendingRestart.current = false; api.startRestartIntro(); }
    return () => {
      api.dispose();
      sceneApiRef.current = null;
    };
  }, [select, simKey, clearCascade]); // simKey muda -> remonta a cena (reiniciar simulação)

  // Fecha o painel com Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      // Atalhos de DEV (apenas `npm run dev`; import.meta.env.DEV vira false no build
      // de produção e este bloco é eliminado). Avançam a simulação p/ testar as fases.
      if (import.meta.env.DEV) {
        const api = sceneApiRef.current as unknown as { debugReborn?: () => void; debugExplode?: () => void; debugSupernova?: () => void; debugHailmary?: () => void } | null;
        if (e.key === 'F2') { // pula direto pro terminal de reset (gigante + collapsed)
          e.preventDefault(); api?.debugReborn?.(); setMission(false); setCollapsed(true);
        }
        if (e.key === 'F3') { // dispara a EXPLOSÃO do núcleo do sol (1ª) -> missão
          e.preventDefault(); api?.debugExplode?.();
        }
        if (e.key === 'F4') { // dispara o NASCIMENTO da gigante azul (supernova) + meltdown + áudio
          e.preventDefault(); api?.debugSupernova?.(); setOverheat(true); clearCascade(); playCollapseRumble(); playSupernovaBirth();
        }
        if (e.key === 'F5') { e.preventDefault(); api?.debugHailmary?.(); } // cena do Hail Mary (linha de Petrova)
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, clearCascade]);

  // Qualquer clique interrompe o som atual (fase de captura, roda ANTES do
  // clique da cena que toca o som do easter egg). Assim: clicar no objeto toca;
  // clicar em qualquer outro lugar só para.
  useEffect(() => {
    // pointerdown (não 'click'): dispara em qualquer toque/press, mesmo que vire
    // arraste -> qualquer interação encerra música + modo IR com fade suave.
    // EXCEÇÃO: o evento do Hail Mary (Adrian) roda até a música acabar; clicar
    // fora não o interrompe (só o fim da música, via setOnFileEnded, encerra).
    const stop = () => {
      // eventos "cinemáticos" (Hail Mary, supernova) rodam até o fim do áudio
      const k = currentSfxKey();
      if (k === 'hailmary' || k === 'supernova') return;
      stopAllSfx();
      sceneApiRef.current?.stopPetrova();
    };
    window.addEventListener('pointerdown', stop, true);
    // fim da música do Hail Mary -> encerra de fato o modo IR/véus (destrava + fade)
    setOnFileEnded(() => sceneApiRef.current?.endPetrova());
    return () => { window.removeEventListener('pointerdown', stop, true); setOnFileEnded(null); };
  }, []);

  const selId = sel != null ? SECTIONS[sel].id : null;
  const focused = sel != null;
  // no mobile o painel é full-width -> não desloca o canvas (esfera fica centralizada)
  const canvasShift = focused && innerWidth > 560 ? '-17%' : '0%';
  const legendWidth = focused ? 'calc(100vw - min(600px, 94vw))' : '100vw';
  const hasHover = !!hoverRing && sel == null;
  const hoverLabel = hoverRing ? (pt ? hoverRing.pt : hoverRing.en) : '';
  const panelPath = 'GF://' + (selId || '').toUpperCase();

  const toggleLang = () => setLang((l) => (l === 'pt' ? 'en' : 'pt'));

  return (
    <S.Root>
      <GlobalStyle />
      <S.CanvasMount ref={canvasRef} $shift={canvasShift} />

      {!focused && !collapsed && <LangToggle label={content.langLabel} onClick={toggleLang} />}

      {started && manual && !focused && !collapsed && (
        <S.ManualHint>
          {pt ? 'CÂMERA LIVRE' : 'FREE CAMERA'}
          <span>{pt ? 'arraste p/ girar · toque no núcleo p/ soltar' : 'drag to rotate · tap core to release'}</span>
        </S.ManualHint>
      )}

      {/* supernova (pós-puzzle): portfólio some, aparece o terminal de reset */}
      {started && collapsed && <ResetTerminal lang={lang} onReset={doRestart} />}

      {/* HUD do portfólio: fica na 1ª explosão/missão; só some após a supernova */}
      {started && !collapsed && (
        <>
          {!cinematic && <Console lines={termLines} mission={mission} overheat={overheat} entered={entered} lang={lang} />}

          {/* nav/legenda do portfólio: fade suave na implosão (overheat) ou na cena (cinematic) */}
          <S.FadeHud $out={overheat || cinematic}>
            {hasHover && <RingHoverIndicator label={hoverLabel} hint={content.hoverHint} />}
            <RingLegend
              sections={SECTIONS}
              lang={lang}
              sel={sel}
              width={legendWidth}
              onSelect={(i) => (sel === i ? close() : select(i))}
            />
          </S.FadeHud>
        </>
      )}

      {focused && selId && !collapsed && (
        <SectionPanel selId={selId} content={content} lang={lang} panelPath={panelPath} backLabel={content.backLabel} onClose={close} />
      )}

      {(hoverPlanet !== null || hoverAnomaly !== null || hoverSun) && !cinematic && (
        <S.PlanetOverlay ref={planetOverlayRef}>
          <Reticle />
          {hoverAnomaly !== null ? (
            <AnomalyCard key={hoverAnomaly + '-' + lang} anomKey={hoverAnomaly} lang={lang} innerRef={planetCardRef} />
          ) : hoverPlanet !== null ? (
            <PlanetCard key={PLANETS[hoverPlanet!].key + '-' + lang + (collapsed ? '-x' : '')} planet={PLANETS[hoverPlanet!]} lang={lang} innerRef={planetCardRef} after={collapsed} />
          ) : null}
        </S.PlanetOverlay>
      )}

      {/* card do gigante azul: segue o gigante com offset lateral fixo (sem flip) */}
      {hoverSun && (
        <S.SunCardWrap ref={sunCardWrapRef}>
          <SupernovaCard key={'supernova-' + lang} lang={lang} innerRef={sunCardRef} />
        </S.SunCardWrap>
      )}

      {!started && (
        <IntroGate
          lang={lang}
          onStart={() => sceneApiRef.current?.startIntro()}
          onFinished={() => setStarted(true)}
        />
      )}

      {/* barras de cinema durante a cena do Hail Mary */}
      <S.Letterbox $on={cinematic} />

      {/* transição do reinício: esconde o remount e bloqueia toda interação */}
      <S.RestartFlash $on={flash} $block={resetting} />
    </S.Root>
  );
}
