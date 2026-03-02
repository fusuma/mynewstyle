import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionInput } from '@/components/consultation/QuestionInput';
import type { QuestionConfig } from '@/types/questionnaire';

const createQuestion = (overrides?: Partial<QuestionConfig>): QuestionConfig => ({
  id: 'test-q',
  question: 'Test question?',
  type: 'image-grid',
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
    { value: 'd', label: 'Option D' },
  ],
  required: true,
  ...overrides,
});

describe('QuestionInput', () => {
  it('renders image-grid type as 2x2 grid', () => {
    const question = createQuestion({ type: 'image-grid' });
    const { container } = render(
      <QuestionInput question={question} value={null} onChange={vi.fn()} />
    );

    // Should render all 4 options as radio buttons
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);

    // Should have grid layout with radiogroup role
    const grid = container.querySelector('[data-type="image-grid"]');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('role', 'radiogroup');
  });

  it('renders icon-cards type as horizontal cards', () => {
    const question = createQuestion({
      type: 'icon-cards',
      options: [
        { value: 'x', label: 'X', icon: 'star' },
        { value: 'y', label: 'Y', icon: 'heart' },
      ],
    });
    const { container } = render(
      <QuestionInput question={question} value={null} onChange={vi.fn()} />
    );

    const cards = container.querySelector('[data-type="icon-cards"]');
    expect(cards).toBeInTheDocument();
    expect(cards).toHaveAttribute('role', 'radiogroup');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('renders slider type with range input', () => {
    const question = createQuestion({
      type: 'slider',
      options: [],
      sliderMin: 0,
      sliderMax: 100,
      sliderStep: 10,
      sliderUnit: 'cm',
    });
    render(
      <QuestionInput question={question} value={50} onChange={vi.fn()} />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '10');
  });

  it('renders multi-select-chips type as chips', () => {
    const question = createQuestion({
      type: 'multi-select-chips',
      options: [
        { value: 'chip1', label: 'Chip 1' },
        { value: 'chip2', label: 'Chip 2' },
        { value: 'chip3', label: 'Chip 3' },
      ],
    });
    const { container } = render(
      <QuestionInput question={question} value={[]} onChange={vi.fn()} />
    );

    const chips = container.querySelector('[data-type="multi-select-chips"]');
    expect(chips).toBeInTheDocument();
    expect(chips).toHaveAttribute('role', 'group');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('image-grid: clicking option calls onChange with value', () => {
    const onChange = vi.fn();
    const question = createQuestion({ type: 'image-grid' });
    render(
      <QuestionInput question={question} value={null} onChange={onChange} />
    );

    fireEvent.click(screen.getByText('Option A'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('slider: changing range calls onChange with number', () => {
    const onChange = vi.fn();
    const question = createQuestion({
      type: 'slider',
      options: [],
      sliderMin: 0,
      sliderMax: 100,
      sliderStep: 10,
    });
    render(
      <QuestionInput question={question} value={50} onChange={onChange} />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '70' } });
    expect(onChange).toHaveBeenCalledWith(70);
  });

  it('multi-select-chips: toggling chip updates selection array', () => {
    const onChange = vi.fn();
    const question = createQuestion({
      type: 'multi-select-chips',
      options: [
        { value: 'chip1', label: 'Chip 1' },
        { value: 'chip2', label: 'Chip 2' },
      ],
    });

    // Start with empty selection
    render(
      <QuestionInput question={question} value={[]} onChange={onChange} />
    );

    // Click chip1 - should add it
    fireEvent.click(screen.getByText('Chip 1'));
    expect(onChange).toHaveBeenCalledWith(['chip1']);
  });

  it('selected option shows accent border styling', () => {
    const question = createQuestion({ type: 'image-grid' });
    const { container } = render(
      <QuestionInput question={question} value="a" onChange={vi.fn()} />
    );

    // The selected button should have the selected styling class
    const selectedButton = screen.getByText('Option A').closest('button');
    expect(selectedButton).toHaveAttribute('data-selected', 'true');
  });
});
