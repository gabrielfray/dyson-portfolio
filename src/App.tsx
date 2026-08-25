import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initDysonScene, type DysonSceneApi, type Section } from './scene/dysonScene';
import { getContent, PLANETS, SECTIONS, type Lang } from './data/content';
import { useTerminal } from './hooks/useTerminal';
import { playAnomalySfx, stopAllSfx, setOnFileEnded, currentSfxKey, playContactTone, playContactMotif, playContactWrong, playSupernovaBirth } from './audio/sfx';
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
import * as S from './App.styles';

export default function App() {
  const [lang, setLang] = useState<Lang>('pt');
  const [hoverRing, setHoverRing] = useState<Section | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hoverPlanet, setHoverPlanet] = useState<number | null>(null);
  const [hoverAnomaly, setHoverAnomaly] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [manual, setManual] = useState(false);
  const [sunDead, setSunDead] = useState(false); // núcleo colapsou (supernova) -> rescaldo
  const [simKey, setSimKey] = useState(0); // remontar a cena p/ "reiniciar simulação"

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneApiRef = useRef<DysonSceneApi | null>(null);
  const planetOverlayRef = useRef<HTMLDivElement | null>(null);
  const planetCardRef = useRef<HTMLDivElement | null>(null);
  const selRef = useRef<number | null>(null);
  const sunDeadRef = useRef(false);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);
  useEffect(() => { sunDeadRef.current = sunDead; }, [sunDead]);

  // reinicia a simulação: remonta a cena (estado inicial) e limpa o HUD
  const resetSim = useCallback(() => {
    stopAllSfx();
    setSel(null); setHoverPlanet(null); setHoverAnomaly(null); setHoverRing(null);
    setManual(false); setSunDead(false);
    setSimKey((k) => k + 1);
  }, []);

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
      onSelect: (_s, idx) => { if (sunDeadRef.current) return; select(idx); }, // sem navegação no rescaldo
      onPlanetHover: (idx) => setHoverPlanet(idx),
      onAnomalyHover: (key) => setHoverAnomaly(key),
      onAnomalyClick: (key) => {
        // trocar p/ outro egg encerra a Petrova (forçado); re-clicar o Adrian reinicia
        if (key !== 'hailmary') sceneApiRef.current?.endPetrova();
        playAnomalySfx(key);
      },
      onManual: (m) => setManual(m),
      onDetonate: () => playAnomalySfx('supernova'), // som da explosão, sincronizado à animação
      onSunDead: () => { setSunDead(true); window.setTimeout(() => playContactMotif(), 9000); }, // rescaldo + convite (dica do enigma) após o áudio da explosão
      onReborn: () => playSupernovaBirth(),          // gigante azul se forma -> som do renascimento
      onContactTone: (i) => playContactTone(i),
      onContactWrong: () => playContactWrong(),

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
    return () => {
      api.dispose();
      sceneApiRef.current = null;
    };
  }, [select, simKey]); // simKey muda -> remonta a cena (reiniciar simulação)

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

      {!focused && !sunDead && <LangToggle label={content.langLabel} onClick={toggleLang} />}

      {started && manual && !focused && !sunDead && (
        <S.ManualHint>
          {pt ? 'CÂMERA LIVRE' : 'FREE CAMERA'}
          <span>{pt ? 'arraste p/ girar · toque no núcleo p/ soltar' : 'drag to rotate · tap core to release'}</span>
        </S.ManualHint>
      )}

      {/* rescaldo da supernova: portfólio some, aparece o terminal de reset */}
      {started && sunDead && <ResetTerminal lang={lang} onReset={resetSim} />}

      {/* HUD do portfólio: some no rescaldo (sunDead) até reiniciar a simulação */}
      {started && !sunDead && (
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

      {focused && selId && !sunDead && (
        <SectionPanel selId={selId} content={content} lang={lang} panelPath={panelPath} backLabel={content.backLabel} onClose={close} />
      )}

      {(hoverPlanet !== null || hoverAnomaly !== null) && (
        <S.PlanetOverlay ref={planetOverlayRef}>
          <Reticle />
          {hoverAnomaly !== null ? (
            <AnomalyCard key={hoverAnomaly + '-' + lang} anomKey={hoverAnomaly} lang={lang} innerRef={planetCardRef} />
          ) : (
            <PlanetCard key={PLANETS[hoverPlanet!].key + '-' + lang + (sunDead ? '-x' : '')} planet={PLANETS[hoverPlanet!]} lang={lang} innerRef={planetCardRef} after={sunDead} />
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
