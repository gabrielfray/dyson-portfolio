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
