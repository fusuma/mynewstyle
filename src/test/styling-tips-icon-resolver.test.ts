import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock lucide-react icons
// Note: 'Comb' does not exist in lucide-react; the icon-resolver maps 'comb' -> Wand2
vi.mock('lucide-react', () => ({
  Scissors: 'ScissorsIcon',
  Droplets: 'DropletsIcon',
  Clock: 'ClockIcon',
  SprayCan: 'SprayCanIcon',
  Wand2: 'Wand2Icon',
  Sparkles: 'SparklesIcon',
  Brush: 'BrushIcon',
  ShowerHead: 'ShowerHeadIcon',
  Star: 'StarIcon',
  Palette: 'PaletteIcon',
  Lightbulb: 'LightbulbIcon',
  Wind: 'WindIcon',
  Heart: 'HeartIcon',
}));

describe('styling-tips icon-resolver - resolveIcon', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resolves "scissors" to Scissors component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('scissors')).toBe('ScissorsIcon');
  });

  it('resolves "droplets" to Droplets component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('droplets')).toBe('DropletsIcon');
  });

  it('resolves "clock" to Clock component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('clock')).toBe('ClockIcon');
  });

  it('resolves "spray-can" to SprayCan component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('spray-can')).toBe('SprayCanIcon');
  });

  it('resolves "brush" to Brush component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('brush')).toBe('BrushIcon');
  });

  it('resolves "star" to Star component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('star')).toBe('StarIcon');
  });

  it('resolves "palette" to Palette component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('palette')).toBe('PaletteIcon');
  });

  it('resolves "comb" to Wand2 component (comb is not in lucide-react, mapped to Wand2)', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('comb')).toBe('Wand2Icon');
  });

  it('resolves "wand2" to Wand2 component', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('wand2')).toBe('Wand2Icon');
  });

  it('falls back to Lightbulb for unrecognized icon string', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('unrecognized-icon')).toBe('LightbulbIcon');
  });

  it('falls back to Lightbulb for empty string', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('')).toBe('LightbulbIcon');
  });

  it('resolves icons case-insensitively', async () => {
    const { resolveIcon } = await import('@/components/consultation/styling-tips/icon-resolver');
    expect(resolveIcon('SCISSORS')).toBe('ScissorsIcon');
    expect(resolveIcon('Droplets')).toBe('DropletsIcon');
  });
});
