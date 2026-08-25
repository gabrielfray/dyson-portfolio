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
  onAnomalyHover?: (key: string | null) => void;
  onAnomalyClick?: (key: string) => void;
  onManual?: (manual: boolean) => void; // liga/desliga o controle manual (arraste)
  onDetonate?: () => void; // 100 cliques no núcleo -> supernova (dispara o som sincronizado)
  // Enigma "Contatos Imediatos" (após a supernova): tocar easter eggs na ordem do sinal
  onSunDead?: () => void;   // 1ª explosão (sol) terminou -> missão secreta (puzzle)
  onSupernova?: () => void; // enigma resolvido -> começa a 2ª explosão (som da supernova)
  onReborn?: () => void;    // a gigante azul terminou de se formar -> rescaldo/terminal
  onSunHover?: (over: boolean) => void; // hover na gigante azul (supernova) -> card
  onContactTone?: (toneIndex: number) => void; // tom de um egg clicado (0..4)
  onContactWrong?: () => void; // clique fora da sequência -> reinicia
  onContactSolved?: () => void; // sequência completa -> renascimento
}

export interface DysonSceneApi {
  setScroll: (p: number) => void;
  setBloom: (v: number) => void;
  setFocus: (f: number) => void;
  setLocked: (i: number) => void;
  startIntro: () => void; // dispara o fly-in cinematográfico da câmera
  stopPetrova: () => void; // stop "leve": ignorado enquanto o evento está travado (roda até o fim)
  endPetrova: () => void;  // stop "forçado": encerra de fato (fim da música ou troca de easter egg)
  dispose: () => void;
}
