import { describe, expect, it } from 'vitest';
import { initialQuality } from './gpuTier';

describe('starting graphics quality', () => {
  it('starts integrated, mobile and software GPUs on Low', () => {
    expect(initialQuality('ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00009BC8) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('low');
    expect(initialQuality('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('low');
    expect(initialQuality('Mali-G52 MC2')).toBe('low');
    expect(initialQuality('ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('low');
    expect(initialQuality('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe('low');
  });
  it('starts dedicated GPUs on High', () => {
    expect(initialQuality('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('high');
    expect(initialQuality('ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('high');
  });
  it('starts unknown or hidden GPUs on Balanced', () => {
    expect(initialQuality('')).toBe('balanced');
    expect(initialQuality('WebKit WebGL')).toBe('balanced');
  });
});
