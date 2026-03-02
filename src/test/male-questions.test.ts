import { describe, it, expect } from 'vitest';
import { maleQuestionnaireConfig } from '@/lib/questionnaire/male-questions';

describe('Male Questionnaire Content', () => {
  it('has exactly 6 questions', () => {
    expect(maleQuestionnaireConfig.questions).toHaveLength(6);
  });

  it('has gender set to male', () => {
    expect(maleQuestionnaireConfig.gender).toBe('male');
  });

  it('has id set to male-questionnaire', () => {
    expect(maleQuestionnaireConfig.id).toBe('male-questionnaire');
  });

  it('all question ids are unique', () => {
    const ids = maleQuestionnaireConfig.questions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  describe('Q1: style-preference', () => {
    const q1 = () => maleQuestionnaireConfig.questions[0];

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
      expect(values).toEqual(['classico', 'moderno', 'ousado', 'minimalista']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q1().options.map((o) => o.label);
      expect(labels).toEqual(['Clássico', 'Moderno', 'Ousado', 'Minimalista']);
    });
  });

  describe('Q2: hair-time', () => {
    const q2 = () => maleQuestionnaireConfig.questions[1];

    it('has id hair-time', () => {
      expect(q2().id).toBe('hair-time');
    });

    it('is type slider', () => {
      expect(q2().type).toBe('slider');
    });

    it('has sliderMin of 0', () => {
      expect(q2().sliderMin).toBe(0);
    });

    it('has sliderMax of 15', () => {
      expect(q2().sliderMax).toBe(15);
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
  });

  describe('Q3: work-environment', () => {
    const q3 = () => maleQuestionnaireConfig.questions[2];

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
  });

  describe('Q4: hair-type', () => {
    const q4 = () => maleQuestionnaireConfig.questions[3];

    it('has id hair-type', () => {
      expect(q4().id).toBe('hair-type');
    });

    it('is type image-grid', () => {
      expect(q4().type).toBe('image-grid');
    });

    it('has 5 options (includes calvo)', () => {
      expect(q4().options).toHaveLength(5);
    });

    it('has correct option values', () => {
      const values = q4().options.map((o) => o.value);
      expect(values).toEqual(['liso', 'ondulado', 'cacheado', 'crespo', 'calvo']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q4().options.map((o) => o.label);
      expect(labels).toEqual(['Liso', 'Ondulado', 'Cacheado', 'Crespo', 'Pouco cabelo/Calvo']);
    });
  });

  describe('Q5: beard', () => {
    const q5 = () => maleQuestionnaireConfig.questions[4];

    it('has id beard', () => {
      expect(q5().id).toBe('beard');
    });

    it('is type image-grid', () => {
      expect(q5().type).toBe('image-grid');
    });

    it('has 4 options', () => {
      expect(q5().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q5().options.map((o) => o.value);
      expect(values).toEqual(['sem-barba', 'curta', 'media', 'longa']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q5().options.map((o) => o.label);
      expect(labels).toEqual(['Sem barba', 'Barba curta', 'Barba média', 'Barba longa']);
    });

    it('does not have a skipCondition', () => {
      expect(q5().skipCondition).toBeUndefined();
    });
  });

  describe('Q6: concerns', () => {
    const q6 = () => maleQuestionnaireConfig.questions[5];

    it('has id concerns', () => {
      expect(q6().id).toBe('concerns');
    });

    it('is type multi-select-chips', () => {
      expect(q6().type).toBe('multi-select-chips');
    });

    it('has 4 options', () => {
      expect(q6().options).toHaveLength(4);
    });

    it('has correct option values', () => {
      const values = q6().options.map((o) => o.value);
      expect(values).toEqual(['entradas', 'fios-brancos', 'cabelo-fino', 'nenhuma']);
    });

    it('has correct option labels in Portuguese', () => {
      const labels = q6().options.map((o) => o.label);
      expect(labels).toEqual(['Entradas', 'Fios brancos', 'Cabelo fino', 'Nenhuma']);
    });

    it('has skipCondition targeting hair-type with value calvo', () => {
      expect(q6().skipCondition).toBeDefined();
      expect(q6().skipCondition!.questionId).toBe('hair-type');
      expect(q6().skipCondition!.value).toBe('calvo');
    });
  });

  describe('All options have non-empty Portuguese labels', () => {
    it('every option label is a non-empty string', () => {
      for (const question of maleQuestionnaireConfig.questions) {
        for (const option of question.options) {
          expect(typeof option.label).toBe('string');
          expect(option.label.length).toBeGreaterThan(0);
        }
      }
    });

    it('every question text is a non-empty string', () => {
      for (const question of maleQuestionnaireConfig.questions) {
        expect(typeof question.question).toBe('string');
        expect(question.question.length).toBeGreaterThan(0);
      }
    });
  });

  describe('All options are visual/tap-based (zero free text)', () => {
    it('every question has required set to true', () => {
      for (const question of maleQuestionnaireConfig.questions) {
        expect(question.required).toBe(true);
      }
    });

    it('question types are all visual types (no free text)', () => {
      const visualTypes = ['image-grid', 'slider', 'icon-cards', 'multi-select-chips'];
      for (const question of maleQuestionnaireConfig.questions) {
        expect(visualTypes).toContain(question.type);
      }
    });
  });

  describe('Question type distribution', () => {
    it('has 3 image-grid questions (Q1, Q4, Q5)', () => {
      const imageGridQuestions = maleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'image-grid'
      );
      expect(imageGridQuestions).toHaveLength(3);
      expect(imageGridQuestions.map((q) => q.id)).toEqual([
        'style-preference',
        'hair-type',
        'beard',
      ]);
    });

    it('has 1 slider question (Q2)', () => {
      const sliderQuestions = maleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'slider'
      );
      expect(sliderQuestions).toHaveLength(1);
      expect(sliderQuestions[0].id).toBe('hair-time');
    });

    it('has 1 icon-cards question (Q3)', () => {
      const iconCardQuestions = maleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'icon-cards'
      );
      expect(iconCardQuestions).toHaveLength(1);
      expect(iconCardQuestions[0].id).toBe('work-environment');
    });

    it('has 1 multi-select-chips question (Q6)', () => {
      const multiSelectQuestions = maleQuestionnaireConfig.questions.filter(
        (q) => q.type === 'multi-select-chips'
      );
      expect(multiSelectQuestions).toHaveLength(1);
      expect(multiSelectQuestions[0].id).toBe('concerns');
    });
  });
});
