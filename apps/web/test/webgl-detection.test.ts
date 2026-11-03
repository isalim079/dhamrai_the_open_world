import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectWebGL2Support } from '../src/engine/WebGLCapability.js';
import { useSessionStore } from '../src/state/useSessionStore.js';

describe('WebGL 2 Capability Detection & Fallback Handling', () => {
  const originalWebGL2 = (globalThis as any).window?.WebGL2RenderingContext;

  afterEach(() => {
    if ((globalThis as any).window) {
      (globalThis as any).window.WebGL2RenderingContext = originalWebGL2;
    }
  });

  it('reports non-browser environment when window is absent', () => {
    // In pure node environment, window is undefined
    const savedWindow = (globalThis as any).window;
    delete (globalThis as any).window;
    try {
      const result = detectWebGL2Support();
      expect(result.isSupported).toBe(false);
      expect(result.errorMessage).toContain('Window is not defined');
    } finally {
      (globalThis as any).window = savedWindow;
    }
  });

  it('reports unsupported when WebGL2RenderingContext is absent on window', () => {
    (globalThis as any).window = {};
    const result = detectWebGL2Support();
    expect(result.isSupported).toBe(false);
    expect(result.errorMessage).toContain('WebGL 2 is not supported');
  });

  it('updates session store when WebGL 2 is absent', () => {
    useSessionStore.getState().setWebGLSupport(false, 'Hardware acceleration required');
    expect(useSessionStore.getState().isWebGLSupported).toBe(false);
    expect(useSessionStore.getState().webGLErrorMessage).toBe('Hardware acceleration required');
  });

  it('returns false with diagnostic instructions if context creation fails', () => {
    const mockCanvas = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement;

    // Simulate window with WebGL2 constructor
    (globalThis as any).window = { WebGL2RenderingContext: function () {} };

    const result = detectWebGL2Support(mockCanvas);
    expect(result.isSupported).toBe(false);
    expect(result.errorMessage).toContain('hardware acceleration is enabled');
  });

  it('returns true when valid WebGL 2 context is acquired', () => {
    const mockGL = {
      getExtension: () => null,
      getParameter: (param: number) => (param === 7936 ? 'Mock Vendor' : 'Mock Renderer'),
      VENDOR: 7936,
      RENDERER: 7937,
    };

    const mockCanvas = {
      getContext: (type: string) => (type === 'webgl2' ? mockGL : null),
    } as unknown as HTMLCanvasElement;

    (globalThis as any).window = { WebGL2RenderingContext: function () {} };

    const result = detectWebGL2Support(mockCanvas);
    expect(result.isSupported).toBe(true);
    expect(result.errorMessage).toBeNull();
  });
});
