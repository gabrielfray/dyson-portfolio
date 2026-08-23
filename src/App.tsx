import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initDysonScene, type DysonSceneApi, type Section } from './scene/dysonScene';
import { getContent, PLANETS, SECTIONS, type Lang } from './data/content';
import { useTerminal } from './hooks/useTerminal';
import { playAnomalySfx, stopAllSfx } from './audio/sfx';
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
import * as S from './App.styles';

export default function App() {
  const [lang, setLang] = useState<Lang>('pt');
  const [hoverRing, setHoverRing] = useState<Section | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hoverPlanet, setHoverPlanet] = useState<number | null>(null);
  const [hoverAnomaly, setHoverAnomaly] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [manual, setManual] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneApiRef = useRef<DysonSceneApi | null>(null);
  const planetOverlayRef = useRef<HTMLDivElement | null>(null);
  const planetCardRef = useRef<HTMLDivElement | null>(null);
  const selRef = useRef<number | null>(null);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);

  const termLines = useTerminal(lang, started);
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
      onSelect: (_s, idx) => select(idx),
      onPlanetHover: (idx) => setHoverPlanet(idx),
      onAnomalyHover: (key) => setHoverAnomaly(key),
      onAnomalyClick: (key) => playAnomalySfx(key),
      onManual: (m) => setManual(m),
      onPlanetTrack: (x, y) => {
        const el2 = planetOverlayRef.current;
        if (!el2) return;
        el2.style.transform = `translate(${x}px, ${y}px)`;
        el2.style.opacity = '1';
        const card = planetCardRef.current;
        if (card) {
          const rightSide = x > innerWidth * 0.58; // vira o card p/ não sair da tela
          card.style.left = rightSide ? 'auto' : '46px';
          card.style.right = rightSide ? '46px' : 'auto';
          // abre p/ baixo se o objeto está na metade de cima; p/ cima se está embaixo
          const below = y < innerHeight * 0.5;
          card.style.top = below ? '18px' : 'auto';
          card.style.bottom = below ? 'auto' : '18px';
          card.style.transform = 'none';
        }
      },
    });
    sceneApiRef.current = api;
    return () => {
      api.dispose();
      sceneApiRef.current = null;
    };
  }, [select]);

  // Fecha o painel com Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Qualquer clique interrompe o som atual (fase de captura, roda ANTES do
  // clique da cena que toca o som do easter egg). Assim: clicar no objeto toca;
  // clicar em qualquer outro lugar só para.
  useEffect(() => {
    const stop = () => stopAllSfx();
    window.addEventListener('click', stop, true);
    return () => window.removeEventListener('click', stop, true);
  }, []);

  const selId = sel != null ? SECTIONS[sel].id : null;
  const focused = sel != null;
  const canvasShift = focused ? '-17%' : '0%';
  const legendWidth = focused ? 'calc(100vw - min(600px, 94vw))' : '100vw';
  const hasHover = !!hoverRing && sel == null;
  const hoverLabel = hoverRing ? (pt ? hoverRing.pt : hoverRing.en) : '';
  const panelPath = 'GF://' + (selId || '').toUpperCase();

  const toggleLang = () => setLang((l) => (l === 'pt' ? 'en' : 'pt'));

  return (
    <S.Root>
      <GlobalStyle />
      <S.CanvasMount ref={canvasRef} $shift={canvasShift} />

      {!focused && <LangToggle label={content.langLabel} onClick={toggleLang} />}

      {started && manual && (
        <S.ManualHint>
          {pt ? 'CONTROLE MANUAL' : 'MANUAL CONTROL'}
          <span>{pt ? 'arraste p/ girar · clique no núcleo p/ soltar' : 'drag to rotate · click core to release'}</span>
        </S.ManualHint>
      )}

      {/* HUD entra em cena só depois do "iniciar" */}
      {started && (
        <>
          <Console lines={termLines} />

          {hasHover && <RingHoverIndicator label={hoverLabel} hint={content.hoverHint} />}

          <RingLegend
            sections={SECTIONS}
            lang={lang}
            sel={sel}
            width={legendWidth}
            onSelect={(i) => (sel === i ? close() : select(i))}
          />
        </>
      )}

      {focused && selId && (
        <SectionPanel selId={selId} content={content} lang={lang} panelPath={panelPath} backLabel={content.backLabel} onClose={close} />
      )}

      {(hoverPlanet !== null || hoverAnomaly !== null) && (
        <S.PlanetOverlay ref={planetOverlayRef}>
          <Reticle />
          {hoverAnomaly !== null ? (
            <AnomalyCard key={hoverAnomaly + '-' + lang} anomKey={hoverAnomaly} lang={lang} innerRef={planetCardRef} />
          ) : (
            <PlanetCard key={PLANETS[hoverPlanet!].key + '-' + lang} planet={PLANETS[hoverPlanet!]} lang={lang} innerRef={planetCardRef} />
          )}
        </S.PlanetOverlay>
      )}

      {!started && (
        <IntroGate
          lang={lang}
          onStart={() => sceneApiRef.current?.startIntro()}
          onFinished={() => setStarted(true)}
        />
      )}
    </S.Root>
  );
}
