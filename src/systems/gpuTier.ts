/**
 * Choose the starting graphics quality from the GPU's name, the first time the game runs on a computer.
 *
 * Measured on an Intel UHD 630 (typical of school PCs) at 1600x900: High 7-11 fps, Balanced 11-20 fps,
 * Low 18-34 fps. So integrated, mobile and software GPUs start on Low; dedicated GPUs start on High
 * (the frame-rate guard still lowers it if needed); anything unrecognised starts on Balanced.
 * A teacher's own choice in the teacher panel is saved and always wins over this.
 */
export type Quality = 'high' | 'balanced' | 'low';

export function initialQuality(gpu: string): Quality {
  const g = gpu.toLowerCase();
  if (!g) return 'balanced';
  // Software rendering (no GPU acceleration) and integrated or mobile graphics.
  if (/swiftshader|llvmpipe|softpipe|software|microsoft basic render/.test(g)) return 'low';
  if (/intel|mali|adreno|powervr|videocore|apple gpu/.test(g)) return 'low';
  // AMD integrated graphics in laptop APUs report as plain "Radeon Graphics" or "Vega N Graphics".
  if (/radeon\(tm\) graphics|radeon graphics|vega \d+ graphics/.test(g)) return 'low';
  if (/nvidia|geforce|quadro|rtx|gtx|radeon|apple m\d/.test(g)) return 'high';
  return 'balanced';
}

/** Read the GPU's name from a throwaway context, before the game's own canvas exists. */
export function probeGpuName(): string {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (!gl) return '';
    const name = gpuName(gl);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

/** The GPU's name as WebGL reports it ('' if the browser hides it). */
export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) ?? '');
  } catch {
    return '';
  }
}
