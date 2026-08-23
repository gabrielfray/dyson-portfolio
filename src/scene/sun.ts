import * as THREE from 'three';
import { GLOW_FRAG, GLOW_VERT } from './shaders';

export const SUN_R = 6;

function coronaTexture() {
  // falloff acentuado: alpha zera bem antes da borda (fundo continua preto)
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,236,180,1)');
  gr.addColorStop(0.18, 'rgba(255,178,80,0.65)');
  gr.addColorStop(0.38, 'rgba(255,130,30,0.18)');
  gr.addColorStop(0.6, 'rgba(255,110,20,0)');
  gr.addColorStop(1, 'rgba(255,110,20,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Cria a estrela: núcleo de plasma (shader), disco brilhante, coronas/aura e as
// luzes da cena. Devolve um update que anima o pulso/escala por tempo.
export function createSun(scene: THREE.Scene): { update: (t: number) => void } {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
    }),
  );
  scene.add(glow);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }));
  scene.add(sun);

  const coronaMap = coronaTexture();
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.setScalar(SUN_R * 9);
  scene.add(corona);
  const corona2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona2.scale.setScalar(SUN_R * 4.5);
  scene.add(corona2);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaMap, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.scale.setScalar(SUN_R * 13);
  scene.add(aura);

  // luz do sol quase branca (leve calor): mantém o sol dourado sem tingir de
  // laranja os painéis/anéis metálicos, que devem ler como prata/azul-aço
  const sunLight = new THREE.PointLight(0xfff4ea, 2400, 0, 2);
  scene.add(sunLight);
  // fill frio para reforçar o tom prateado/azulado da estrutura
  scene.add(new THREE.AmbientLight(0x1a2836, 2.6));
  const coolFill = new THREE.DirectionalLight(0x9fc4ff, 0.5);
  coolFill.position.set(-1, 0.6, 0.8);
  scene.add(coolFill);

  return {
    update: (t) => {
      (glow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      sun.scale.setScalar(1 + Math.sin(t * 1.3) * 0.03);
      corona.scale.setScalar(SUN_R * 9 * (1 + Math.sin(t * 0.9) * 0.05));
      corona2.scale.setScalar(SUN_R * 4.5 * (1 + Math.sin(t * 1.4) * 0.06));
      aura.scale.setScalar(SUN_R * 13 * (1 + Math.sin(t * 0.5) * 0.08));
      aura.material.opacity = 0.38 + 0.08 * Math.sin(t * 0.7);
    },
  };
}
