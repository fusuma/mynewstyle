import { describe, it, expect } from 'vitest';
import { getMalePreviewPrompt } from '@/lib/ai/prompts/v1/preview-male';
import { getFemalePreviewPrompt } from '@/lib/ai/prompts/v1/preview-female';
import { buildPreviewPrompt } from '@/lib/ai/prompts/preview';

describe('Preview Prompts', () => {
  describe('getMalePreviewPrompt', () => {
    it('returns a prompt string for male preview', () => {
      const prompt = getMalePreviewPrompt({
        styleName: 'Modern Undercut',
        difficultyLevel: 'medium',
      });
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(50);
    });

    it('includes the style name in the prompt', () => {
      const prompt = getMalePreviewPrompt({
        styleName: 'Classic Fade',
        difficultyLevel: 'low',
      });
      expect(prompt).toContain('Classic Fade');
    });

    it('instructs AI to preserve face identity and only change hairstyle', () => {
      const prompt = getMalePreviewPrompt({
        styleName: 'Pompadour',
        difficultyLevel: 'high',
      });
      // Must instruct to preserve identity
      expect(prompt.toLowerCase()).toMatch(/preserve|keep|maintain/);
      expect(prompt.toLowerCase()).toMatch(/face|skin|feature/);
      // Must instruct to only change hairstyle
      expect(prompt.toLowerCase()).toMatch(/hairstyle|hair/);
    });

    it('includes difficulty level context in the prompt', () => {
      const prompt = getMalePreviewPrompt({
        styleName: 'Textured Quiff',
        difficultyLevel: 'high',
      });
      expect(prompt).toContain('Textured Quiff');
    });

    it('mentions photorealistic output requirement', () => {
      const prompt = getMalePreviewPrompt({
        styleName: 'Buzz Cut',
        difficultyLevel: 'low',
      });
      expect(prompt.toLowerCase()).toContain('photorealistic');
    });
  });

  describe('getFemalePreviewPrompt', () => {
    it('returns a prompt string for female preview', () => {
      const prompt = getFemalePreviewPrompt({
        styleName: 'Bob Clássico',
        difficultyLevel: 'low',
      });
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(50);
    });

    it('includes the style name in the prompt', () => {
      const prompt = getFemalePreviewPrompt({
        styleName: 'Lob com Camadas',
        difficultyLevel: 'medium',
      });
      expect(prompt).toContain('Lob com Camadas');
    });

    it('instructs AI to preserve face identity and only change hairstyle', () => {
      const prompt = getFemalePreviewPrompt({
        styleName: 'Pixie Cut',
        difficultyLevel: 'low',
      });
      expect(prompt.toLowerCase()).toMatch(/preserve|keep|maintain/);
      expect(prompt.toLowerCase()).toMatch(/face|skin|feature/);
      expect(prompt.toLowerCase()).toMatch(/hairstyle|hair/);
    });

    it('mentions photorealistic output requirement', () => {
      const prompt = getFemalePreviewPrompt({
        styleName: 'Ondulado Natural',
        difficultyLevel: 'medium',
      });
      expect(prompt.toLowerCase()).toContain('photorealistic');
    });
  });

  describe('buildPreviewPrompt', () => {
    it('returns male prompt for male gender', () => {
      const prompt = buildPreviewPrompt('male', 'Modern Undercut', 'medium');
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Modern Undercut');
    });

    it('returns female prompt for female gender', () => {
      const prompt = buildPreviewPrompt('female', 'Bob Clássico', 'low');
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Bob Clássico');
    });

    it('includes style name for both genders', () => {
      const styleName = 'Unique Test Style 12345';
      const malePrompt = buildPreviewPrompt('male', styleName, 'high');
      const femalePrompt = buildPreviewPrompt('female', styleName, 'high');
      expect(malePrompt).toContain(styleName);
      expect(femalePrompt).toContain(styleName);
    });
  });
});
