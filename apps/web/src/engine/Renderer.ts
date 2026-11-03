/**
 * Dhamrai Life — WebGL 2 Three.js Renderer Setup
 */

import * as THREE from 'three';

export interface RendererMetrics {
  drawCalls: number;
  triangles: number;
}

export class WebGLRendererManager {
  public renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  public onContextLost?: () => void;
  public onContextRestored?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
      depth: true,
    });

    if (!gl) {
      throw new Error('WebGL 2 context creation failed in WebGLRendererManager');
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost!');
      if (this.onContextLost) this.onContextLost();
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored!');
      if (this.onContextRestored) this.onContextRestored();
    });
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  public setPixelRatio(ratio: number): void {
    this.renderer.setPixelRatio(Math.min(ratio, 2.0));
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  public getMetrics(): RendererMetrics {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
