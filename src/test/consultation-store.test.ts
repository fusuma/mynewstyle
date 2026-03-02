import { describe, it, expect, beforeEach } from 'vitest';
import { useConsultationStore } from '@/stores/consultation';

describe('ConsultationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConsultationStore.getState().reset();
    sessionStorage.clear();
  });

  it('initializes with null values for all fields', () => {
    const state = useConsultationStore.getState();
    expect(state.gender).toBeNull();
    expect(state.photo).toBeNull();
    expect(state.photoPreview).toBeNull();
    expect(state.questionnaire).toBeNull();
    expect(state.consultationId).toBeNull();
    expect(state.faceAnalysis).toBeNull();
    expect(state.consultation).toBeNull();
    expect(state.paymentStatus).toBe('none');
    expect(state.isReturningUser).toBe(false);
  });

  it('setGender sets gender correctly', () => {
    useConsultationStore.getState().setGender('male');
    expect(useConsultationStore.getState().gender).toBe('male');

    useConsultationStore.getState().setGender('female');
    expect(useConsultationStore.getState().gender).toBe('female');
  });

  it('setPhoto sets photo blob', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    useConsultationStore.getState().setPhoto(blob);
    expect(useConsultationStore.getState().photo).toBe(blob);
  });

  it('setPhotoPreview sets preview string', () => {
    useConsultationStore.getState().setPhotoPreview('data:image/jpeg;base64,abc');
    expect(useConsultationStore.getState().photoPreview).toBe('data:image/jpeg;base64,abc');
  });

  it('setQuestionnaireResponse adds single response to questionnaire object', () => {
    useConsultationStore.getState().setQuestionnaireResponse('q1', 'answer1');
    const questionnaire = useConsultationStore.getState().questionnaire;
    expect(questionnaire).toEqual({ q1: 'answer1' });
  });

  it('setQuestionnaireResponse updates existing response', () => {
    useConsultationStore.getState().setQuestionnaireResponse('q1', 'answer1');
    useConsultationStore.getState().setQuestionnaireResponse('q1', 'answer2');
    const questionnaire = useConsultationStore.getState().questionnaire;
    expect(questionnaire).toEqual({ q1: 'answer2' });
  });

  it('setQuestionnaireComplete sets all responses at once', () => {
    const responses = { q1: 'a1', q2: 'a2', q3: 42 };
    useConsultationStore.getState().setQuestionnaireComplete(responses);
    expect(useConsultationStore.getState().questionnaire).toEqual(responses);
  });

  it('reset clears all store values', () => {
    useConsultationStore.getState().setGender('male');
    useConsultationStore.getState().setPhotoPreview('preview');
    useConsultationStore.getState().setQuestionnaireResponse('q1', 'a1');
    useConsultationStore.getState().reset();

    const state = useConsultationStore.getState();
    expect(state.gender).toBeNull();
    expect(state.photo).toBeNull();
    expect(state.photoPreview).toBeNull();
    expect(state.questionnaire).toBeNull();
  });

  it('store persists to sessionStorage', () => {
    useConsultationStore.getState().setGender('female');

    // Force persist to flush
    const stored = sessionStorage.getItem('mynewstyle-consultation');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.gender).toBe('female');
  });

  it('store rehydrates from sessionStorage on creation', () => {
    // Set up persisted state
    const persistedState = {
      state: {
        gender: 'male',
        photoPreview: 'test-preview',
        questionnaire: { q1: 'a1' },
        consultationId: null,
        paymentStatus: 'none',
        isReturningUser: false,
      },
      version: 0,
    };
    sessionStorage.setItem('mynewstyle-consultation', JSON.stringify(persistedState));

    // Destroy and recreate store to trigger rehydration
    useConsultationStore.persist.rehydrate();

    const state = useConsultationStore.getState();
    expect(state.gender).toBe('male');
    expect(state.photoPreview).toBe('test-preview');
    expect(state.questionnaire).toEqual({ q1: 'a1' });
  });

  it('photo blob is excluded from sessionStorage persistence (partialize)', () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    useConsultationStore.getState().setPhoto(blob);

    const stored = sessionStorage.getItem('mynewstyle-consultation');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    // photo should NOT be in the persisted state
    expect(parsed.state.photo).toBeUndefined();
  });

  it('photoPreview string IS persisted to sessionStorage', () => {
    useConsultationStore.getState().setPhotoPreview('data:image/jpeg;base64,abc');

    const stored = sessionStorage.getItem('mynewstyle-consultation');
    const parsed = JSON.parse(stored!);
    expect(parsed.state.photoPreview).toBe('data:image/jpeg;base64,abc');
  });

  it('gender IS persisted to sessionStorage', () => {
    useConsultationStore.getState().setGender('female');

    const stored = sessionStorage.getItem('mynewstyle-consultation');
    const parsed = JSON.parse(stored!);
    expect(parsed.state.gender).toBe('female');
  });

  it('questionnaire IS persisted to sessionStorage', () => {
    useConsultationStore.getState().setQuestionnaireResponse('q1', 'test');

    const stored = sessionStorage.getItem('mynewstyle-consultation');
    const parsed = JSON.parse(stored!);
    expect(parsed.state.questionnaire).toEqual({ q1: 'test' });
  });

  it('setPaymentStatus updates paymentStatus to pending', () => {
    useConsultationStore.getState().setPaymentStatus('pending');
    expect(useConsultationStore.getState().paymentStatus).toBe('pending');
  });

  it('setPaymentStatus updates paymentStatus to paid', () => {
    useConsultationStore.getState().setPaymentStatus('paid');
    expect(useConsultationStore.getState().paymentStatus).toBe('paid');
  });

  it('setPaymentStatus updates paymentStatus to failed', () => {
    useConsultationStore.getState().setPaymentStatus('failed');
    expect(useConsultationStore.getState().paymentStatus).toBe('failed');
  });

  it('setPaymentStatus resets paymentStatus to none', () => {
    useConsultationStore.getState().setPaymentStatus('pending');
    useConsultationStore.getState().setPaymentStatus('none');
    expect(useConsultationStore.getState().paymentStatus).toBe('none');
  });

  it('paymentStatus IS persisted to sessionStorage', () => {
    useConsultationStore.getState().setPaymentStatus('pending');
    const stored = sessionStorage.getItem('mynewstyle-consultation');
    const parsed = JSON.parse(stored!);
    expect(parsed.state.paymentStatus).toBe('pending');
  });
});
