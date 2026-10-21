import Phaser from 'phaser';
import shader from './shaders/cyberpsychosis.glsl?raw';

// Phaser 4 render node + controller, replacing the attachment's Phaser 3 PostFXPipeline.
export class CyberpsychosisController extends Phaser.Filters.Controller {
  time = 0;
  psychosis = 0;
  constructor(camera: Phaser.Cameras.Scene2D.Camera) { super(camera, 'BlackwallCRT'); }
}
export class CyberpsychosisFilter extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) { super('BlackwallCRT', manager, undefined, shader); }
  setupUniforms(controller: CyberpsychosisController, context: Phaser.Renderer.WebGL.DrawingContext) {
    this.programManager.setUniform('uTime', controller.time);
    this.programManager.setUniform('uPsychosis', controller.psychosis);
    this.programManager.setUniform('uResolution', [context.width, context.height]);
  }
}
