import { describe, it, expect } from 'vitest';
import { femaleQuestionnaireConfig } from '@/lib/questionnaire/female-questions';

describe('Female Questionnaire Content', () => {
  it('has exactly 7 questions', () => {
    expect(femaleQuestionnaireConfig.questions).toHaveLength(7);
  });

  it('has gender set to female', () => {
    expect(femaleQuestionnaireConfig.gender).toBe('female');
  });

  it('has id set to female-questionnaire', () => {
    expect(femaleQuestionnaireConfig.id).toBe('female-questionnaire');
  });

  it('all question ids are unique', () => {
    const ids = femaleQuestionnaireConfig.questions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  describe('Q1: style-preference', () => {
    const q1 = () => femaleQuestionnaireConfig.questions[0];

    it('has id style-preference', () => {
      expect(q1().id).toBe('style-preference');
    });

    it('is type image-grid', () => {
      expect(q1().type).toBe('image-grid');
    });

    it('has 4 options', () => {
      expect(q1().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q1().options.map((o) => o.value);
      expect(values).toEqual(['classico', 'moderno', 'ousado', 'natural']);
    });

    it('has correct option labels in Portuguese with diacritical marks', () => {
      const labels = q1().options.map((o) => o.label);
      expect(labels).toEqual(['Clássico', 'Moderno', 'Ousado', 'Natural']);
    });

    it('has question text with correct diacritical marks', () => {
      expect(q1().question).toBe('Qual é o seu estilo?');
    });
  });

  describe('Q2: hair-time', () => {
    const q2 = () => femaleQuestionnaireConfig.questions[1];

    it('has id hair-time', () => {
      expect(q2().id).toBe('hair-time');
    });

    it('is type slider', () => {
      expect(q2().type).toBe('slider');
    });

    it('has sliderMin of 0', () => {
      expect(q2().sliderMin).toBe(0);
    });

    it('has sliderMax of 30', () => {
      expect(q2().sliderMax).toBe(30);
    });

    it('has sliderStep of 1', () => {
      expect(q2().sliderStep).toBe(1);
    });

    it('has sliderUnit of min', () => {
      expect(q2().sliderUnit).toBe('min');
    });

    it('has empty options array', () => {
      expect(q2().options).toEqual([]);
    });

    it('has question text with correct diacritical marks', () => {
      expect(q2().question).toBe('Quanto tempo você dedica ao cabelo?');
    });
  });

  describe('Q3: work-environment', () => {
    const q3 = () => femaleQuestionnaireConfig.questions[2];

    it('has id work-environment', () => {
      expect(q3().id).toBe('work-environment');
    });

    it('is type icon-cards', () => {
      expect(q3().type).toBe('icon-cards');
    });

    it('has 4 options', () => {
      expect(q3().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q3().options.map((o) => o.value);
      expect(values).toEqual(['corporativo', 'criativo', 'casual', 'remoto']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q3().options.map((o) => o.label);
      expect(labels).toEqual(['Corporativo', 'Criativo', 'Casual', 'Remoto']);
    });

    it('has icon field on each option', () => {
      for (const option of q3().options) {
        expect(option.icon).toBeDefined();
        expect(typeof option.icon).toBe('string');
        expect(option.icon!.length).toBeGreaterThan(0);
      }
    });

    it('has correct icon names', () => {
      const icons = q3().options.map((o) => o.icon);
      expect(icons).toEqual(['Briefcase', 'Palette', 'Coffee', 'Monitor']);
    });

    it('has question text with correct diacritical marks', () => {
      expect(q3().question).toBe('Qual é o seu ambiente profissional?');
    });
  });

  describe('Q4: hair-type', () => {
    const q4 = () => femaleQuestionnaireConfig.questions[3];

    it('has id hair-type', () => {
      expect(q4().id).toBe('hair-type');
    });

    it('is type image-grid', () => {
      expect(q4().type).toBe('image-grid');
    });

    it('has 4 options', () => {
      expect(q4().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q4().options.map((o) => o.value);
      expect(values).toEqual(['liso', 'ondulado', 'cacheado', 'crespo']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q4().options.map((o) => o.label);
      expect(labels).toEqual(['Liso', 'Ondulado', 'Cacheado', 'Crespo']);
    });

    it('has question text with correct diacritical marks', () => {
      expect(q4().question).toBe('O seu cabelo é...');
    });
  });

  describe('Q5: current-length', () => {
    const q5 = () => femaleQuestionnaireConfig.questions[4];

    it('has id current-length', () => {
      expect(q5().id).toBe('current-length');
    });

    it('is type image-grid', () => {
      expect(q5().type).toBe('image-grid');
    });

    it('has 4 options', () => {
      expect(q5().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q5().options.map((o) => o.value);
      expect(values).toEqual(['muito-curto', 'curto', 'medio', 'longo']);
    });

    it('has correct option labels in Portuguese with diacritical marks', () => {
      const labels = q5().options.map((o) => o.label);
      expect(labels).toEqual(['Muito curto', 'Curto', 'Médio', 'Longo']);
    });

    it('has question text', () => {
      expect(q5().question).toBe('Qual o comprimento atual do seu cabelo?');
    });
  });

  describe('Q6: desired-length', () => {
    const q6 = () => femaleQuestionnaireConfig.questions[5];

    it('has id desired-length', () => {
      expect(q6().id).toBe('desired-length');
    });

    it('is type image-grid', () => {
      expect(q6().type).toBe('image-grid');
    });

    it('has 4 options', () => {
      expect(q6().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q6().options.map((o) => o.value);
      expect(values).toEqual(['mais-curto', 'manter', 'mais-longo', 'sem-preferencia']);
    });

    it('has correct option labels in Portuguese with diacritical marks', () => {
      const labels = q6().options.map((o) => o.label);
      expect(labels).toEqual(['Mais curto', 'Manter', 'Mais longo', 'Sem preferência']);
    });

    it('has question text with correct diacritical marks', () => {
      expect(q6().question).toBe('Qual comprimento você deseja?');
    });
  });

  describe('Q7: concerns', () => {
    const q7 = () => femaleQuestionnaireConfig.questions[6];

    it('has id concerns', () => {
      expect(q7().id).toBe('concerns');
    });

    it('is type multi-select-chips', () => {
      expect(q7().type).toBe('multi-select-chips');
    });

    it('has 5 options', () => {
      expect(q7().options).toHaveLength(5);
    });

    it('has correct option values', () => {
      const values = q7().options.map((o) => o.value);
      expect(values).toEqual(['frizz', 'pontas-duplas', 'volume', 'fios-brancos', 'nenhuma']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q7().options.map((o) => o.label);
      expect(labels).toEqual(['Frizz', 'Pontas duplas', 'Volume', 'Fios brancos', 'Nenhuma']);
    });

    it('has question text with correct diacritical marks', () => {
      expect(q7().question).toBe('Alguma preocupação com o cabelo?');
    });
  });

  describe('No skipCondition on any female question', () => {
    it('no question has a skipCondition', () => {
      for (const question of femaleQuestionnaireConfig.questions) {
        expect(question.skipCondition).toBeUndefined();
      }
    });
  });

  describe('All options have non-empty Portuguese labels', () => {
    it('every option label is a non-empty string', () => {
      for (const question of femaleQuestionnaireConfig.questions) {
        for (const option of question.options) {
          expect(typeof option.label).toBe('string');
          expect(option.label.length).toBeGreaterThan(0);
        }
      }
    });

    it('every question text is a non-empty string', () => {
      for (const question of femaleQuestionnaireConfig.questions) {
        expect(typeof question.question).toBe('string');
        expect(question.question.length).toBeGreaterThan(0);
      }
    });
  });

  describe('All options are visual/tap-based (zero free text)', () => {
    it('every question has required set to true', () => {
      for (const question of femaleQuestionnaireConfig.questions) {
        expect(question.required).toBe(true);
      }
    });

    it('question types are all visual types (no free text)', () => {
      const visualTypes = ['image-grid', 'slider', 'icon-cards', 'multi-select-chips'];
      for (const question of femaleQuestionnaireConfig.questions) {
        expect(visualTypes).toContain(question.type);
      }
    });
  });

  describe('Question type distribution', () => {
    it('has 4 image-grid questions (Q1, Q4, Q5, Q6)', () => {
      const imageGridQuestions = femaleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'image-grid'
      );
      expect(imageGridQuestions).toHaveLength(4);
      expect(imageGridQuestions.map((q) => q.id)).toEqual([
        'style-preference',
        'hair-type',
        'current-length',
        'desired-length',
      ]);
    });

    it('has 1 slider question (Q2)', () => {
      const sliderQuestions = femaleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'slider'
      );
      expect(sliderQuestions).toHaveLength(1);
      expect(sliderQuestions[0].id).toBe('hair-time');
    });

    it('has 1 icon-cards question (Q3)', () => {
      const iconCardQuestions = femaleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'icon-cards'
      );
      expect(iconCardQuestions).toHaveLength(1);
      expect(iconCardQuestions[0].id).toBe('work-environment');
    });

    it('has 1 multi-select-chips question (Q7)', () => {
      const multiSelectQuestions = femaleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'multi-select-chips'
      );
      expect(multiSelectQuestions).toHaveLength(1);
      expect(multiSelectQuestions[0].id).toBe('concerns');
    });
  });
});
