import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initDysonScene, type DysonSceneApi, type Section } from './dysonScene';
import { CONTACT, getContent, PLANETS, planetLabels, SECTIONS, type Lang, type PlanetInfo } from './content';
import { useTerminal } from './useTerminal';

const AMBER = '#ffca70';

// Card de dados do planeta (estilo terminal sci-fi) exibido no hover.
function PlanetCard({ planet, lang, innerRef }: { planet: PlanetInfo; lang: Lang; innerRef: React.RefObject<HTMLDivElement | null> }) {
  const pt = lang === 'pt';
  const L = planetLabels(lang);
  const loc = pt ? 'pt-BR' : 'en-US';
  const nf = (n: number, max = 0, min = 0) => n.toLocaleString(loc, { maximumFractionDigits: max, minimumFractionDigits: min });
  const flux = 1361 / (planet.au * planet.au);
  const fluxStr = flux >= 100 ? nf(flux, 0) : flux >= 10 ? nf(flux, 1, 1) : nf(flux, 2, 2);
  const rows: { label: string; value: string; sub?: string }[] = [
    { label: L.distance, value: `${nf(planet.au, 2)} ${pt ? 'UA' : 'AU'}`, sub: `${nf(planet.km, planet.km < 1000 ? 1 : 0)} ${pt ? 'mi km' : 'M km'}` },
    { label: L.period, value: `${nf(planet.periodY, 2)} ${pt ? 'a' : 'yr'}` },
    { label: L.diameter, value: `${nf(planet.diameterKm, 0)} km` },
    { label: L.mass, value: `${planet.massE.toLocaleString(loc, { maximumSignificantDigits: 3 })} ⊕` },
    { label: L.temp, value: `${nf(planet.tempC, 0)} °C` },
    { label: L.moons, value: `${planet.moons}` },
    { label: L.flux, value: `${fluxStr} W/m²` },
    { label: L.status, value: pt ? planet.status.pt : planet.status.en },
  ];
  return (
    <div
      ref={innerRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: 46,
        transform: 'translateY(-50%)',
        width: 272,
        background: 'linear-gradient(105deg, rgba(6,5,10,.9), rgba(10,8,14,.97))',
        border: '1px solid rgba(255,202,112,.35)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        padding: '20px 22px',
        fontFamily: "'IBM Plex Mono', monospace",
        boxShadow: '0 10px 40px rgba(0,0,0,.5)',
      }}
    >
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {pt ? planet.name.pt : planet.name.en}
      </div>
      <div style={{ fontSize: 12, color: AMBER, marginTop: 3, marginBottom: 16 }}>&gt; {pt ? planet.type.pt : planet.type.en}</div>
      {rows.map((r) => (
        <div key={r.label} style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: '.18em', color: 'rgba(238,232,218,.5)' }}>{r.label}</span>
            <span style={{ flex: 1, borderBottom: '1px dotted rgba(255,202,112,.25)', transform: 'translateY(-3px)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: r.label === L.status ? AMBER : '#eee8da' }}>{r.value}</span>
          </div>
          {r.sub && <div style={{ textAlign: 'right', fontSize: 12, color: 'rgba(238,232,218,.5)', marginTop: 2 }}>{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// Reticula de alvo (cantos) centrada no planeta.
function Reticle() {
  const corner = (pos: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: 11,
    height: 11,
    borderColor: AMBER,
    borderStyle: 'solid',
    borderWidth: 0,
    ...pos,
  });
  return (
    <div style={{ position: 'absolute', width: 58, height: 58, transform: 'translate(-50%, -50%)' }}>
      <span style={corner({ top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 })} />
      <span style={corner({ top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 })} />
      <span style={corner({ bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 })} />
      <span style={corner({ bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 })} />
    </div>
  );
}

function LegendButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: selected ? 'rgba(255,202,112,.18)' : 'rgba(6,5,10,.6)',
        border: `1px solid ${selected || hover ? 'rgba(255,202,112,.8)' : 'rgba(238,232,218,.2)'}`,
        color: selected || hover ? AMBER : 'rgba(238,232,218,.7)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        letterSpacing: '.15em',
        textTransform: 'uppercase',
        padding: '8px 16px',
        borderRadius: 99,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all .25s',
      }}
    >
      {label}
    </button>
  );
}

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
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <div
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          transition: 'transform 1.1s cubic-bezier(.22,.61,.36,1)',
          transform: `translateX(${canvasShift})`,
        }}
      />

      <button
        className="lang-btn"
        onClick={toggleLang}
        style={{
          position: 'fixed',
          top: 24,
          left: 28,
          zIndex: 40,
          background: 'rgba(6,5,10,.6)',
          border: '1px solid rgba(255,202,112,.5)',
          color: AMBER,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          padding: '7px 16px',
          borderRadius: 99,
          cursor: 'pointer',
          letterSpacing: '.15em',
          backdropFilter: 'blur(8px)',
        }}
      >
        {content.langLabel}
      </button>

      {/* Terminal / console */}
      <div
        style={{
          position: 'fixed',
          top: 96,
          left: 40,
          zIndex: 10,
          width: 'min(440px, 86vw)',
          pointerEvents: 'none',
          fontFamily: "'IBM Plex Mono', monospace",
          animation: 'fadeIn 1.4s ease .4s both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: AMBER,
              boxShadow: '0 0 10px rgba(255,202,112,.9)',
              animation: 'blink 1.4s ease infinite',
            }}
          />
          <span
            style={{
              fontSize: 11,
              letterSpacing: '.3em',
              color: 'rgba(238,232,218,.45)',
              textShadow: '0 1px 3px rgba(0,0,0,.9)',
            }}
          >
            GF://CONSOLE
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 180 }}>
          {termLines.map((ln, i) => (
            <div
              key={i}
              style={{
                fontSize: ln.size,
                color: ln.color,
                fontWeight: ln.weight,
                letterSpacing: '.05em',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textShadow: '0 1px 4px rgba(0,0,0,.95), 0 0 14px rgba(0,0,0,.8)',
              }}
            >
              {ln.text}
            </div>
          ))}
          <span
            style={{
              display: 'inline-block',
              width: 9,
              height: 16,
              background: AMBER,
              marginTop: 4,
              boxShadow: '0 0 8px rgba(255,202,112,.6)',
              animation: 'blink 1s step-end infinite',
            }}
          />
        </div>
      </div>

      {/* Indicador de hover no anel */}
      {hasHover && (
        <div
          style={{
            position: 'fixed',
            bottom: 96,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(6,5,10,.85)',
            border: '1px solid rgba(255,202,112,.5)',
            borderRadius: 99,
            padding: '10px 22px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: AMBER,
              boxShadow: '0 0 10px rgba(255,202,112,.9)',
            }}
          />
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              letterSpacing: '.2em',
              color: AMBER,
              textTransform: 'uppercase',
            }}
          >
            {hoverLabel}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: 'rgba(238,232,218,.55)',
            }}
          >
            {content.hoverHint}
          </span>
        </div>
      )}

      {/* Legenda dos anéis */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          left: 0,
          width: legendWidth,
          zIndex: 30,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignContent: 'center',
          padding: '0 12px',
          boxSizing: 'border-box',
          animation: 'fadeIn 2s ease 4s both',
          transition: 'width 1.1s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {SECTIONS.map((s, i) => (
          <LegendButton
            key={s.id}
            label={pt ? s.pt : s.en}
            selected={sel === i}
            onClick={() => (sel === i ? close() : select(i))}
          />
        ))}
      </div>

      {/* Painel de seção */}
      {focused && (
        <aside
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 35,
            width: 'min(600px, 94vw)',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(105deg, rgba(6,5,10,.88), rgba(10,8,14,.96))',
            borderLeft: '1px solid rgba(255,202,112,.35)',
            backdropFilter: 'blur(18px)',
            animation: 'slideIn .7s cubic-bezier(.16,1,.3,1) both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '26px 34px',
              borderBottom: '1px solid rgba(255,202,112,.18)',
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                letterSpacing: '.3em',
                color: AMBER,
              }}
            >
              ◉ {panelPath}
            </div>
            <button
              className="close-btn"
              onClick={close}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,202,112,.4)',
                color: AMBER,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                letterSpacing: '.12em',
                padding: '7px 16px',
                borderRadius: 99,
                cursor: 'pointer',
              }}
            >
              ✕ {content.backLabel}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 34 }}>
            {selId === 'sobre' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ margin: 0, fontSize: 18, lineHeight: 1.75, color: 'rgba(238,232,218,.92)', textWrap: 'pretty' }}>
                  {content.aboutText}
                </p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'rgba(238,232,218,.65)', textWrap: 'pretty' }}>
                  {content.aboutText2}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {[`3+ ${content.yearsLabel}`, 'SaaS B2B', `Sumaré / SP · ${content.remote}`].map((chip) => (
                    <span
                      key={chip}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        padding: '6px 14px',
                        border: '1px solid rgba(255,202,112,.35)',
                        borderRadius: 99,
                        color: AMBER,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selId === 'projetos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {content.projects.map((p) => (
                  <a
                    key={p.name}
                    className="proj-card"
                    href={p.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      borderRadius: 12,
                      padding: '20px 22px',
                      color: '#eee8da',
                    }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '.2em', color: AMBER }}>
                      {p.tag}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(238,232,218,.65)', textWrap: 'pretty' }}>
                      {p.desc}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(238,232,218,.42)' }}>
                      {p.stack}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {selId === 'experiencia' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {content.jobs.map((j) => (
                  <div
                    key={j.company + j.period}
                    style={{
                      border: '1px solid rgba(255,202,112,.16)',
                      borderRadius: 12,
                      padding: '20px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {j.role} · <span style={{ color: AMBER }}>{j.company}</span>
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: AMBER }}>{j.period}</div>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(238,232,218,.42)' }}>
                      {j.mode}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(238,232,218,.7)', textWrap: 'pretty' }}>
                      {j.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selId === 'stack' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {content.stacks.map((s) => (
                  <div key={s.group}>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        letterSpacing: '.25em',
                        color: AMBER,
                        marginBottom: 10,
                      }}
                    >
                      {s.group}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {s.items.map((it) => (
                        <span
                          key={it}
                          style={{
                            fontSize: 13,
                            padding: '5px 13px',
                            border: '1px solid rgba(238,232,218,.18)',
                            borderRadius: 99,
                            color: 'rgba(238,232,218,.8)',
                          }}
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selId === 'servicos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {content.services.map((sv) => (
                  <div
                    key={sv.name}
                    style={{
                      border: '1px solid rgba(255,202,112,.16)',
                      borderRadius: 12,
                      padding: '20px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 17, fontWeight: 600, color: AMBER }}>{sv.name}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(238,232,218,.7)', textWrap: 'pretty' }}>
                      {sv.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selId === 'contato' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 26, fontWeight: 700, textWrap: 'pretty' }}>{content.contactHead}</div>
                <div style={{ fontSize: 14, color: 'rgba(238,232,218,.65)' }}>{content.contactSub}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                  <a
                    className="contact-primary"
                    href={`mailto:${CONTACT.email}`}
                    style={{
                      padding: '14px 24px',
                      borderRadius: 12,
                      background: AMBER,
                      color: '#12100a',
                      fontWeight: 600,
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  >
                    {CONTACT.email}
                  </a>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <a
                      href={CONTACT.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid rgba(255,202,112,.5)', fontSize: 14, textAlign: 'center' }}
                    >
                      LinkedIn
                    </a>
                    <a
                      href={CONTACT.github}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid rgba(255,202,112,.5)', fontSize: 14, textAlign: 'center' }}
                    >
                      GitHub
                    </a>
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(238,232,218,.45)' }}>
                  {CONTACT.location} · {content.remote} · {CONTACT.phone}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Painel de dados do planeta (hover) — reticula + card estilo terminal */}
      {hoverPlanet !== null && (
        <div
          ref={planetOverlayRef}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 36, pointerEvents: 'none', opacity: 0, willChange: 'transform' }}
        >
          <Reticle />
          <PlanetCard planet={PLANETS[hoverPlanet]} lang={lang} innerRef={planetCardRef} />
        </div>
      )}
    </div>
  );
}
