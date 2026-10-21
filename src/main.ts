import Phaser from 'phaser';
import './style.css';
import { engine } from './engine';
import { audio } from './audio';
import { ui } from './ui';
import { BootScene, PreloadScene, BackgroundFXScene, MainGameScene, UIScene, ModalScene } from './scenes';

engine.load();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) engine.s.settings.motion = false;
// Audio always waits for an explicit gesture, even when a save remembers sound on.
engine.s.settings.sound = false;
engine.onSound = kind => audio.play(kind);
ui.mount();
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'phaser-stage', width: 640, height: 435, transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, PreloadScene, BackgroundFXScene, MainGameScene, UIScene, ModalScene],
  audio: { noAudio: true }, // A single Web Audio graph is owned by AudioEngine.
});
window.addEventListener('pagehide', () => engine.save());
if (import.meta.hot) import.meta.hot.dispose(() => { engine.save(); game.destroy(true); audio.destroy(); location.reload(); });
