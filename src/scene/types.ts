// Tipos públicos da cena, num módulo à parte para evitar dependências circulares
// entre o orquestrador (dysonScene) e os submódulos (rings, planets…).
export interface Section {
  id: string;
  pt: string;
  en: string;
}

export interface DysonSceneOptions {
  bloom?: number;
  sections?: Section[];
  onHover?: (section: Section | null) => void;
  onSelect?: (section: Section, index: number) => void;
  onPlanetHover?: (index: number | null) => void;
  onPlanetTrack?: (x: number, y: number) => void;
}

export interface DysonSceneApi {
  setScroll: (p: number) => void;
  setBloom: (v: number) => void;
  setFocus: (f: number) => void;
  setLocked: (i: number) => void;
  dispose: () => void;
}
