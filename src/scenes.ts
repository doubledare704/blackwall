import Phaser from 'phaser';
import { engine } from './engine';
import { CyberpsychosisController, CyberpsychosisFilter } from './effects';
import { ui } from './ui';
import { fmt } from './data';

function fitCamera(scene: Phaser.Scene) {
  const fit = () => { const { width, height } = scene.scale; const zoom = Math.min(width / 640, height / 300); const camera = scene.cameras.main; camera.setZoom(zoom).centerOn(320, 205); camera.scrollY += height * .06 / zoom; };
  fit(); scene.scale.on('resize', fit); scene.events.once('shutdown', () => scene.scale.off('resize', fit));
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() { this.scene.start('Preload'); }
}
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }
  preload() { for (const key of ['node-core','psychosis-warning','ram-chip','cryo-vent','hud-frame']) this.load.svg(key, `/assets/svg/${key}.svg`, { scale: 2 }); }
  create() {
    if (!this.textures.exists('node-core')) { const g = this.add.graphics(); g.lineStyle(3, 0xd7ff62); g.strokeCircle(64,64,45); g.generateTexture('node-core',128,128); g.destroy(); }
    this.scene.launch('BackgroundFX'); this.scene.launch('MainGame'); this.scene.launch('UI'); this.scene.launch('Modal'); this.scene.stop();
  }
}
export class BackgroundFXScene extends Phaser.Scene {
  private lines!: Phaser.GameObjects.Graphics;
  private filter?: CyberpsychosisController;
  constructor() { super('BackgroundFX'); }
  create() {
    fitCamera(this);
    this.lines = this.add.graphics();
    if (this.game.renderer.type === Phaser.WEBGL) {
      const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      renderer.renderNodes.addNodeConstructor('BlackwallCRT', CyberpsychosisFilter);
      this.filter = new CyberpsychosisController(this.cameras.main); this.cameras.main.filters.internal.add(this.filter);
    }
  }
  update(time: number) {
    const g = this.lines; const p = engine.runner.psychosis / 100; const motion = engine.s.settings.motion;
    g.clear();
    g.lineStyle(1, p > .75 ? 0x7e443c : 0x516c3a, .14);
    for (let x = 0; x < 660; x += 32) { g.lineBetween(x, 0, x, 435); }
    for (let y = 0; y < 440; y += 32) { g.lineBetween(0,y,640,y); }
    g.lineStyle(1, 0x7b945c, .25);
    for (let x = 16; x < 640; x += 64) for (let y = 16; y < 435; y += 64) { g.lineBetween(x-2,y,x+2,y);g.lineBetween(x,y-2,x,y+2); }
    // Perspective floor and a sparse skyline keep the visual procedural and legible.
    g.lineStyle(1,0xa0b85a,.14);
    for (let x=-400;x<1100;x+=100) g.lineBetween(320 + (x-320)*.2,280,x,435);
    for (const y of [300,325,360,410]) g.lineBetween(0,y,640,y);
    const nodes = [[82,125],[128,284],[526,122],[540,280],[200,80],[450,345]];
    for (let i=0;i<nodes.length;i++) {
      const [x,y] = nodes[i];
      g.lineStyle(1,0x9fbb5e,.26);g.beginPath();g.moveTo(x,y);g.lineTo(x,208);g.lineTo(320,208);g.strokePath();
      g.fillStyle(0x152116,1);g.fillRect(x-9,y-9,18,18);g.lineStyle(1,0x75934b,.6);g.strokeRect(x-9,y-9,18,18);
      g.fillStyle(i < engine.s.hardware.slicer + 1 ? 0xd7ff62 : 0x52643c,.8);g.fillRect(x-2,y-2,4,4);
      if(motion && engine.s.connected) { const t = (time * .00015 + i * .17) % 1;g.fillStyle(0xd7ff62,.5);g.fillCircle(x+(320-x)*t,208,1.5); }
    }
    if (this.filter) { this.filter.active = engine.s.settings.effects && motion; this.filter.time = motion ? time / 1000 : 0; this.filter.psychosis = p; }
  }
}
export class MainGameScene extends Phaser.Scene {
  private rings!: Phaser.GameObjects.Graphics;
  private node!: Phaser.GameObjects.Image;
  private flash = 0;
  private onExtract = (event: Event) => {
    const amount = (event as CustomEvent<number>).detail; this.flash = 1;
    if (!engine.s.settings.motion) return;
    const label = this.add.text(320 + Phaser.Math.Between(-45,45), 150, '+' + fmt(amount), { fontFamily: 'monospace', fontSize: '18px', color: '#d7ff62' }).setOrigin(.5);
    this.tweens.add({ targets: label, y: 95, alpha: 0, duration: 750, onComplete: () => label.destroy() });
    const ring = this.add.circle(320,205,85).setStrokeStyle(1,0xd7ff62,.8);
    this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  };
  constructor() { super('MainGame'); }
  create() {
    fitCamera(this);
    this.rings = this.add.graphics();
    this.node = this.add.image(320,205,'node-core').setDisplaySize(143,143).setTint(0xd7ffad);
    this.add.text(72,155,'SUB_01', { fontFamily: 'monospace', fontSize: '7px', color: '#819365' });
    this.add.text(516,148,'ICE_09', { fontFamily: 'monospace', fontSize: '7px', color: '#819365' });
    this.add.text(508,300,'0xF3A', { fontFamily: 'monospace', fontSize: '7px', color: '#819365' });
    window.addEventListener('extraction',this.onExtract);
    this.events.once('shutdown', () => window.removeEventListener('extraction',this.onExtract));
    const controller = new CyberpsychosisController(this.cameras.main);
    if (this.game.renderer.type === Phaser.WEBGL) this.cameras.main.filters.internal.add(controller);
    this.data.set('crt',controller);
  }
  update(time: number, delta: number) {
    const motion = engine.s.settings.motion; const t = motion ? time / 1000 : 0; const g = this.rings;
    const color = engine.runner.psychosis >= 75 ? 0xff8c66 : 0xd7ff62;
    this.flash = Math.max(0,this.flash - delta / 300);
    g.clear();
    g.lineStyle(1,color,.07 + this.flash*.15);g.strokeCircle(320,205,137);g.strokeCircle(320,205,141);
    for (let i=0;i<80;i++) { const a=i/80*Math.PI*2;const outer=i%5===0?137:132; g.lineStyle(i%5===0?1.5:1,color,i%5===0?.5:.18);g.lineBetween(320+Math.cos(a)*126,205+Math.sin(a)*126,320+Math.cos(a)*outer,205+Math.sin(a)*outer); }
    g.lineStyle(2,color,.7); g.beginPath(); g.arc(320,205,116,t*.15,t*.15+Math.PI*.7);g.strokePath();
    g.lineStyle(1,color,.35);g.beginPath();g.arc(320,205,105,-t*.12,-t*.12+Math.PI*1.4);g.strokePath();
    // Angular orbit frame, drawn independently of the supplied SVG core.
    const points = Array.from({length:6},(_,i)=> { const a=i/6*Math.PI*2-Math.PI/2;return new Phaser.Math.Vector2(320+Math.cos(a)*90,205+Math.sin(a)*90); });
    g.lineStyle(1,color,.55);g.strokePoints(points,true);
    g.lineStyle(1,color,.16);g.strokeRect(221,106,198,198);
    const scale = 143 * (1 + (motion ? Math.sin(t*1.4)*.025 : 0) + this.flash*.035);this.node.setDisplaySize(scale,scale);
    this.node.setAlpha(engine.s.connected ? 1 : .4);
    const controller = this.data.get('crt') as CyberpsychosisController;
    controller.active = engine.s.settings.effects && motion;controller.time=t;controller.psychosis=engine.runner.psychosis/100;
  }
}
// The accessible DOM is the HUD render surface. It stays outside camera distortion.
// Scene lifetimes still own HUD and modal layers; the engine is the only timer owner.
export class UIScene extends Phaser.Scene {
  constructor(){ super('UI'); }
  create(){ this.events.once('shutdown', () => ui.destroy()); }
  update(){ ui.update(performance.now()); }
}
export class ModalScene extends Phaser.Scene {
  constructor(){ super('Modal'); }
  update(){ ui.renderModal(); }
}
