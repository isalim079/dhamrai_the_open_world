/**
 * Dhamrai Life — WebGL 2 Capability & Diagnostics Detector
 */

export interface WebGLDiagnosticResult {
  isSupported: boolean;
  renderer: string | null;
  vendor: string | null;
  errorMessage: string | null;
}

export function detectWebGL2Support(testCanvas?: HTMLCanvasElement): WebGLDiagnosticResult {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      renderer: null,
      vendor: null,
      errorMessage: 'Window is not defined (non-browser environment)',
    };
  }

  if (!window.WebGL2RenderingContext) {
    return {
      isSupported: false,
      renderer: null,
      vendor: null,
      errorMessage:
        'WebGL 2 is not supported by your browser. Please update to a modern desktop browser (Chrome 115+, Edge 115+, Firefox 120+, Safari 17+).',
    };
  }

  try {
    const canvas = testCanvas ?? document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });

    if (!gl) {
      return {
        isSupported: false,
        renderer: null,
        vendor: null,
        errorMessage:
          'Could not initialize WebGL 2 context. Please check that hardware acceleration is enabled in your browser settings.',
      };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

    return {
      isSupported: true,
      renderer: renderer ? String(renderer) : 'Unknown WebGL2 GPU',
      vendor: vendor ? String(vendor) : 'Unknown Vendor',
      errorMessage: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isSupported: false,
      renderer: null,
      vendor: null,
      errorMessage: `WebGL 2 initialization error: ${message}`,
    };
  }
}
