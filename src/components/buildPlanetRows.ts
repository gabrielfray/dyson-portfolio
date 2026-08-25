import { planetLabels, type Lang, type PlanetInfo } from '../data/content';

export interface CardRow {
  label: string;
  value: string;
  sub?: string;
}

// Monta as linhas (rótulo/valor) do card do planeta, formatadas por idioma.
export function buildPlanetRows(planet: PlanetInfo, lang: Lang): CardRow[] {
  const pt = lang === 'pt';
  const L = planetLabels(lang);
  const loc = pt ? 'pt-BR' : 'en-US';
  const nf = (n: number, max = 0, min = 0) => n.toLocaleString(loc, { maximumFractionDigits: max, minimumFractionDigits: min });
  const flux = 1361 / (planet.au * planet.au);
  const fluxStr = flux >= 100 ? nf(flux, 0) : flux >= 10 ? nf(flux, 1, 1) : nf(flux, 2, 2);
  return [
    { label: L.distance, value: `${nf(planet.au, 2)} ${pt ? 'UA' : 'AU'}`, sub: `${nf(planet.km, planet.km < 1000 ? 1 : 0)} ${pt ? 'mi km' : 'M km'}` },
    { label: L.period, value: `${nf(planet.periodY, 2)} ${pt ? 'a' : 'yr'}` },
    { label: L.diameter, value: `${nf(planet.diameterKm, 0)} km` },
    { label: L.mass, value: `${planet.massE.toLocaleString(loc, { maximumSignificantDigits: 3 })} ⊕` },
    { label: L.temp, value: `${nf(planet.tempC, 0)} °C` },
    { label: L.moons, value: `${planet.moons}` },
    { label: L.flux, value: `${fluxStr} W/m²` },
    { label: L.status, value: pt ? planet.status.pt : planet.status.en },
  ];
}

// Sobreviventes marcados pela supernova (gigantes castigados). T de equilíbrio
// do lado dia (K), calculada em cima do evento. Rochosos foram desintegrados.
const AFTER_T: Record<string, number> = { jupiter: 30687, saturno: 22666, urano: 15978, netuno: 12765 };
export const isSurvivorMarked = (key: string) => key in AFTER_T;

// Linhas do card no rescaldo: corpo autoluminoso, atmosfera fervendo/arrancada,
// cauda cometária, anéis sublimados (Saturno). Dados pós-supernova.
export function buildAfterRows(planet: PlanetInfo, lang: Lang): CardRow[] {
  const pt = lang === 'pt';
  const L = planetLabels(lang);
  const nf = (n: number) => n.toLocaleString(pt ? 'pt-BR' : 'en-US', { maximumFractionDigits: 0 });
  const rows: CardRow[] = [
    { label: pt ? 'TEMP. DIA' : 'DAY TEMP', value: `${nf(AFTER_T[planet.key])} K` },
    { label: pt ? 'ATMOSFERA' : 'ATMOSPHERE', value: pt ? 'fervendo · arrancada' : 'boiling · stripped' },
    { label: pt ? 'CAUDA' : 'TAIL', value: pt ? 'pluma maior que o planeta' : 'plume larger than planet' },
    { label: pt ? 'BRILHO' : 'GLOW', value: pt ? 'autoluminoso' : 'self-luminous' },
  ];
  if (planet.key === 'saturno') rows.push({ label: pt ? 'ANÉIS' : 'RINGS', value: pt ? 'sublimados' : 'sublimated' });
  rows.push({ label: L.status, value: pt ? 'SOBREVIVENTE' : 'SURVIVOR' });
  return rows;
}

// Citação (rodapé) do card pós-supernova: força a comparação — Nº de vezes a
// superfície do Sol (~5772 K) E a distância, que é metade do impacto.
export function afterNote(planet: PlanetInfo, lang: Lang): string {
  const pt = lang === 'pt';
  const ratio = Math.round(AFTER_T[planet.key] / 5772);
  const au = planet.au.toLocaleString(pt ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 });
  return pt
    ? `${ratio}× a superfície do Sol — e isso a ${au} UA de distância.`
    : `${ratio}× the Sun's surface — and that at ${au} AU away.`;
}
