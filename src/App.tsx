import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initDysonScene, type DysonSceneApi, type Section } from './scene/dysonScene';
import { getContent, PLANETS, SECTIONS, type Lang } from './data/content';
import { useTerminal } from './hooks/useTerminal';
import { GlobalStyle } from './styles/GlobalStyle';
import { LangToggle } from './components/LangToggle';
import { Console } from './components/Console';
import { RingHoverIndicator } from './components/RingHoverIndicator';
import { RingLegend } from './components/RingLegend';
import { SectionPanel } from './components/SectionPanel';
import { Reticle } from './components/Reticle';
import { PlanetCard } from './components/PlanetCard';
import * as S from './App.styles';

export default function App() {
  const [lang, setLang] = useState<Lang>('pt');
  const [hoverRing, setHoverRing] = useState<Section | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hoverPlanet, setHoverPlanet] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneApiRef = useRef<DysonSceneApi | null>(null);
  const planetOverlayRef = useRef<HTMLDivElement | null>(null);
  const planetCardRef = useRef<HTMLDivElement | null>(null);
  const selRef = useRef<number | null>(null);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);

  const termLines = useTerminal(lang);
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

      <LangToggle label={content.langLabel} onClick={toggleLang} />

      <Console lines={termLines} />

      {hasHover && <RingHoverIndicator label={hoverLabel} hint={content.hoverHint} />}

      <RingLegend
        sections={SECTIONS}
        lang={lang}
        sel={sel}
        width={legendWidth}
        onSelect={(i) => (sel === i ? close() : select(i))}
      />

      {focused && selId && (
        <SectionPanel selId={selId} content={content} lang={lang} panelPath={panelPath} backLabel={content.backLabel} onClose={close} />
      )}

      {hoverPlanet !== null && (
        <S.PlanetOverlay ref={planetOverlayRef}>
          <Reticle />
          <PlanetCard key={PLANETS[hoverPlanet].key + '-' + lang} planet={PLANETS[hoverPlanet]} lang={lang} innerRef={planetCardRef} />
        </S.PlanetOverlay>
      )}
    </S.Root>
  );
}
