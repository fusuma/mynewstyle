import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { QuestionConfig } from '@/types/questionnaire';

// Components under test
import { ImageGrid } from '@/components/consultation/question-cards/ImageGrid';
import { IconCards } from '@/components/consultation/question-cards/IconCards';
import { SliderInput } from '@/components/consultation/question-cards/SliderInput';
import { MultiSelectChips } from '@/components/consultation/question-cards/MultiSelectChips';
import { resolveIcon } from '@/components/consultation/question-cards/icon-resolver';

// ── Test Fixtures ──────────────────────────────────────────────

const imageGridQuestion: QuestionConfig = {
  id: 'style-preference',
  question: 'Qual e o seu estilo?',
  type: 'image-grid',
  options: [
    { value: 'classico', label: 'Classico' },
    { value: 'moderno', label: 'Moderno' },
    { value: 'ousado', label: 'Ousado' },
    { value: 'minimalista', label: 'Minimalista' },
  ],
  required: true,
};

const iconCardsQuestion: QuestionConfig = {
  id: 'work-environment',
  question: 'Qual e o seu ambiente profissional?',
  type: 'icon-cards',
  options: [
    { value: 'corporativo', label: 'Corporativo', icon: 'Briefcase' },
    { value: 'criativo', label: 'Criativo', icon: 'Palette' },
    { value: 'casual', label: 'Casual', icon: 'Coffee' },
    { value: 'remoto', label: 'Remoto', icon: 'Monitor' },
  ],
  required: true,
};

const sliderQuestion: QuestionConfig = {
  id: 'hair-time',
  question: 'Quanto tempo voce dedica ao cabelo?',
  type: 'slider',
  options: [],
  sliderMin: 0,
  sliderMax: 15,
  sliderStep: 1,
  sliderUnit: 'min',
  required: true,
};

const multiSelectQuestion: QuestionConfig = {
  id: 'concerns',
  question: 'Alguma preocupacao com o cabelo?',
  type: 'multi-select-chips',
  options: [
    { value: 'entradas', label: 'Entradas' },
    { value: 'fios-brancos', label: 'Fios brancos' },
    { value: 'cabelo-fino', label: 'Cabelo fino' },
    { value: 'nenhuma', label: 'Nenhuma' },
  ],
  required: true,
};

// ── Mock matchMedia for prefers-reduced-motion ──────────────────

function mockReducedMotion(enabled: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? enabled : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ── ImageGrid Tests ──────────────────────────────────────────

describe('ImageGrid', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  it('renders all options in a 2-column grid', () => {
    const { container } = render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={vi.fn()} />
    );

    const grid = container.querySelector('[data-type="image-grid"]');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-2');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('renders placeholder area with first letter of label', () => {
    render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={vi.fn()} />
    );

    // Each option should have a placeholder with the first letter of its label
    expect(screen.getByText('C')).toBeInTheDocument(); // Classico
    expect(screen.getAllByText('M')).toHaveLength(2); // Moderno + Minimalista
    expect(screen.getByText('O')).toBeInTheDocument(); // Ousado
  });

  it('handles selection -- calls onChange with option value', () => {
    const onChange = vi.fn();
    render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={onChange} />
    );

    fireEvent.click(screen.getByText('Classico'));
    expect(onChange).toHaveBeenCalledWith('classico');
  });

  it('shows checkmark icon on selected option', () => {
    const { container } = render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    // Selected option should have a check icon (svg element)
    const selectedButton = screen.getByText('Classico').closest('button');
    expect(selectedButton).not.toBeNull();
    const checkSvg = selectedButton!.querySelector('svg');
    expect(checkSvg).toBeInTheDocument();
  });

  it('applies scale-105 class on selected option', () => {
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Classico').closest('button');
    expect(selectedButton).toHaveClass('scale-105');
  });

  it('does not apply scale-105 on unselected options', () => {
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const unselectedButton = screen.getByText('Moderno').closest('button');
    expect(unselectedButton).not.toHaveClass('scale-105');
  });

  it('has role="radiogroup" on container and role="radio" on options', () => {
    const { container } = render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={vi.fn()} />
    );

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('has aria-checked attribute matching selection state', () => {
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const selected = screen.getByText('Classico').closest('[role="radio"]');
    expect(selected).toHaveAttribute('aria-checked', 'true');

    const unselected = screen.getByText('Moderno').closest('[role="radio"]');
    expect(unselected).toHaveAttribute('aria-checked', 'false');
  });

  it('has min 48px touch target (min-h-[48px])', () => {
    render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={vi.fn()} />
    );

    const buttons = screen.getAllByRole('radio');
    buttons.forEach((button) => {
      expect(button).toHaveClass('min-h-[48px]');
    });
  });

  it('uses accent border on selected option', () => {
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Classico').closest('button');
    expect(selectedButton).toHaveClass('border-accent');
  });

  it('uses bg-accent/10 on selected option', () => {
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Classico').closest('button');
    expect(selectedButton).toHaveClass('bg-accent/10');
  });

  it('applies transition-all, duration-200, and ease-out for animation', () => {
    render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={vi.fn()} />
    );

    const buttons = screen.getAllByRole('radio');
    buttons.forEach((button) => {
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-200');
      expect(button).toHaveClass('ease-out');
    });
  });

  it('skips scale transition when prefers-reduced-motion is enabled', () => {
    mockReducedMotion(true);
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Classico').closest('button');
    // When reduced motion is preferred, should not apply scale-105
    expect(selectedButton).not.toHaveClass('scale-105');
  });

  it('supports keyboard navigation with arrow keys', async () => {
    const onChange = vi.fn();
    render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={onChange} />
    );

    const firstRadio = screen.getAllByRole('radio')[0];
    firstRadio.focus();

    // Press ArrowRight to move to next option
    fireEvent.keyDown(firstRadio, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('moderno');
  });

  it('supports Enter/Space key selection', () => {
    const onChange = vi.fn();
    render(
      <ImageGrid question={imageGridQuestion} value={null} onChange={onChange} />
    );

    const firstRadio = screen.getAllByRole('radio')[0];
    firstRadio.focus();

    fireEvent.keyDown(firstRadio, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('classico');
  });

  it('renders image when imageUrl is provided', () => {
    const questionWithImage: QuestionConfig = {
      ...imageGridQuestion,
      options: [
        { value: 'a', label: 'With Image', imageUrl: 'https://example.com/img.jpg' },
        { value: 'b', label: 'No Image' },
      ],
    };

    render(
      <ImageGrid question={questionWithImage} value={null} onChange={vi.fn()} />
    );

    const img = screen.getByAltText('With Image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });
});

// ── IconCards Tests ──────────────────────────────────────────

describe('IconCards', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  it('renders Lucide icons from option.icon string names', () => {
    const { container } = render(
      <IconCards question={iconCardsQuestion} value={null} onChange={vi.fn()} />
    );

    // Each option should have an SVG (Lucide icon renders as SVG)
    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      const svgs = radio.querySelectorAll('svg');
      // At least one SVG for the icon (and possibly one for checkmark if selected)
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('falls back gracefully for unknown icon names', () => {
    const questionWithUnknownIcon: QuestionConfig = {
      ...iconCardsQuestion,
      options: [
        { value: 'unknown', label: 'Unknown', icon: 'NonExistentIcon' },
      ],
    };

    const { container } = render(
      <IconCards question={questionWithUnknownIcon} value={null} onChange={vi.fn()} />
    );

    // Should render fallback HelpCircle icon (still an SVG)
    const radio = screen.getByRole('radio');
    const svg = radio.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders without icon when icon field is undefined', () => {
    const questionNoIcon: QuestionConfig = {
      ...iconCardsQuestion,
      options: [
        { value: 'no-icon', label: 'No Icon' },
      ],
    };

    render(
      <IconCards question={questionNoIcon} value={null} onChange={vi.fn()} />
    );

    // Should still render the option with label
    expect(screen.getByText('No Icon')).toBeInTheDocument();
  });

  it('handles selection -- calls onChange with option value', () => {
    const onChange = vi.fn();
    render(
      <IconCards question={iconCardsQuestion} value={null} onChange={onChange} />
    );

    fireEvent.click(screen.getByText('Corporativo'));
    expect(onChange).toHaveBeenCalledWith('corporativo');
  });

  it('shows checkmark icon on selected option', () => {
    render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Corporativo').closest('button');
    // Should have at least 2 SVGs: the icon + the checkmark
    const svgs = selectedButton!.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('applies scale-105 class on selected option', () => {
    render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Corporativo').closest('button');
    expect(selectedButton).toHaveClass('scale-105');
  });

  it('has proper ARIA roles (radiogroup and radio)', () => {
    const { container } = render(
      <IconCards question={iconCardsQuestion} value={null} onChange={vi.fn()} />
    );

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('has aria-checked attribute matching selection state', () => {
    render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={vi.fn()} />
    );

    const selected = screen.getByText('Corporativo').closest('[role="radio"]');
    expect(selected).toHaveAttribute('aria-checked', 'true');

    const unselected = screen.getByText('Criativo').closest('[role="radio"]');
    expect(unselected).toHaveAttribute('aria-checked', 'false');
  });

  it('has min 48px touch target', () => {
    render(
      <IconCards question={iconCardsQuestion} value={null} onChange={vi.fn()} />
    );

    const buttons = screen.getAllByRole('radio');
    buttons.forEach((button) => {
      expect(button).toHaveClass('min-h-[48px]');
    });
  });

  it('uses accent border and bg-accent/10 on selected option', () => {
    render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Corporativo').closest('button');
    expect(selectedButton).toHaveClass('border-accent');
    expect(selectedButton).toHaveClass('bg-accent/10');
  });

  it('skips scale transition when prefers-reduced-motion is enabled', () => {
    mockReducedMotion(true);
    render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={vi.fn()} />
    );

    const selectedButton = screen.getByText('Corporativo').closest('button');
    expect(selectedButton).not.toHaveClass('scale-105');
  });

  it('supports keyboard navigation with arrow keys', () => {
    const onChange = vi.fn();
    render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={onChange} />
    );

    const firstRadio = screen.getAllByRole('radio')[0];
    firstRadio.focus();

    fireEvent.keyDown(firstRadio, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('criativo');
  });
});

// ── SliderInput Tests ──────────────────────────────────────────

describe('SliderInput', () => {
  it('renders with correct min, max, step, and unit from question config', () => {
    render(
      <SliderInput question={sliderQuestion} value={5} onChange={vi.fn()} />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '15');
    expect(slider).toHaveAttribute('step', '1');
  });

  it('displays current value with unit prominently', () => {
    render(
      <SliderInput question={sliderQuestion} value={5} onChange={vi.fn()} />
    );

    // Should display "5min" as the current value
    expect(screen.getByText('5min')).toBeInTheDocument();
  });

  it('displays min and max labels at endpoints with unit', () => {
    render(
      <SliderInput question={sliderQuestion} value={5} onChange={vi.fn()} />
    );

    expect(screen.getByText('0min')).toBeInTheDocument();
    expect(screen.getByText('15min')).toBeInTheDocument();
  });

  it('handles value changes via range input', () => {
    const onChange = vi.fn();
    render(
      <SliderInput question={sliderQuestion} value={5} onChange={onChange} />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('uses default min value when value is null', () => {
    render(
      <SliderInput question={sliderQuestion} value={null} onChange={vi.fn()} />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('0');
  });

  it('has role="slider" with correct aria attributes', () => {
    render(
      <SliderInput question={sliderQuestion} value={7} onChange={vi.fn()} />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '15');
    expect(slider).toHaveAttribute('aria-valuenow', '7');
    expect(slider).toHaveAttribute('aria-valuetext', '7min');
  });

  it('has min 48px touch target for the thumb', () => {
    render(
      <SliderInput question={sliderQuestion} value={5} onChange={vi.fn()} />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveClass('min-h-[48px]');
  });

  it('uses accent color styling', () => {
    render(
      <SliderInput question={sliderQuestion} value={5} onChange={vi.fn()} />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveClass('accent-accent');
  });
});

// ── MultiSelectChips Tests ──────────────────────────────────────

describe('MultiSelectChips', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  it('renders all options as chips', () => {
    render(
      <MultiSelectChips question={multiSelectQuestion} value={[]} onChange={vi.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
  });

  it('renders chips with rounded-full shape', () => {
    render(
      <MultiSelectChips question={multiSelectQuestion} value={[]} onChange={vi.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((chip) => {
      expect(chip).toHaveClass('rounded-full');
    });
  });

  it('handles toggle selection -- add to array', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectChips question={multiSelectQuestion} value={[]} onChange={onChange} />
    );

    fireEvent.click(screen.getByText('Entradas'));
    expect(onChange).toHaveBeenCalledWith(['entradas']);
  });

  it('handles toggle deselection -- remove from array', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas', 'fios-brancos']}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText('Entradas'));
    expect(onChange).toHaveBeenCalledWith(['fios-brancos']);
  });

  it('shows checkmark on selected chips', () => {
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const selectedButton = screen.getByText('Entradas').closest('button');
    const checkSvg = selectedButton!.querySelector('svg');
    expect(checkSvg).toBeInTheDocument();
  });

  it('does not show checkmark on unselected chips', () => {
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const unselectedButton = screen.getByText('Fios brancos').closest('button');
    const svgs = unselectedButton!.querySelectorAll('svg');
    expect(svgs).toHaveLength(0);
  });

  it('applies scale-105 on selected chips', () => {
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const selectedButton = screen.getByText('Entradas').closest('button');
    expect(selectedButton).toHaveClass('scale-105');
  });

  it('has role="group" on container and role="checkbox" on chips', () => {
    const { container } = render(
      <MultiSelectChips question={multiSelectQuestion} value={[]} onChange={vi.fn()} />
    );

    const group = container.querySelector('[role="group"]');
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('has aria-checked matching selection state', () => {
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const selected = screen.getByText('Entradas').closest('[role="checkbox"]');
    expect(selected).toHaveAttribute('aria-checked', 'true');

    const unselected = screen.getByText('Fios brancos').closest('[role="checkbox"]');
    expect(unselected).toHaveAttribute('aria-checked', 'false');
  });

  it('has min 48px touch target per chip', () => {
    render(
      <MultiSelectChips question={multiSelectQuestion} value={[]} onChange={vi.fn()} />
    );

    const chips = screen.getAllByRole('checkbox');
    chips.forEach((chip) => {
      expect(chip).toHaveClass('min-h-[48px]');
    });
  });

  it('uses accent border and bg-accent/10 on selected chips', () => {
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const selectedButton = screen.getByText('Entradas').closest('button');
    expect(selectedButton).toHaveClass('border-accent');
    expect(selectedButton).toHaveClass('bg-accent/10');
  });

  it('skips scale transition when prefers-reduced-motion is enabled', () => {
    mockReducedMotion(true);
    render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const selectedButton = screen.getByText('Entradas').closest('button');
    expect(selectedButton).not.toHaveClass('scale-105');
  });
});

// ── Icon Resolver Tests ──────────────────────────────────────────

describe('resolveIcon', () => {
  it('resolves known icon names to Lucide components', () => {
    const BriefcaseIcon = resolveIcon('Briefcase');
    expect(BriefcaseIcon).not.toBeNull();

    const PaletteIcon = resolveIcon('Palette');
    expect(PaletteIcon).not.toBeNull();

    const CoffeeIcon = resolveIcon('Coffee');
    expect(CoffeeIcon).not.toBeNull();

    const MonitorIcon = resolveIcon('Monitor');
    expect(MonitorIcon).not.toBeNull();
  });

  it('returns HelpCircle fallback for unknown icon names', () => {
    const unknownIcon = resolveIcon('NonExistent');
    expect(unknownIcon).not.toBeNull();

    // HelpCircle is the fallback -- it should be a valid component
    const FallbackIcon = unknownIcon!;
    const { container } = render(<FallbackIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns null for undefined input', () => {
    const result = resolveIcon(undefined);
    expect(result).toBeNull();
  });

  it('returns null for empty string input', () => {
    const result = resolveIcon('');
    expect(result).toBeNull();
  });
});

// ── Theme Compliance Tests ──────────────────────────────────────

describe('Theme Compliance', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  it('ImageGrid uses Tailwind theme classes -- no hardcoded colors', () => {
    const { container } = render(
      <ImageGrid question={imageGridQuestion} value="classico" onChange={vi.fn()} />
    );

    const html = container.innerHTML;
    // Should NOT contain any hardcoded hex colors
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    // Should NOT contain rgb() or rgba() values
    expect(html).not.toMatch(/rgb\(/);
    expect(html).not.toMatch(/rgba\(/);
  });

  it('IconCards uses Tailwind theme classes -- no hardcoded colors', () => {
    const { container } = render(
      <IconCards question={iconCardsQuestion} value="corporativo" onChange={vi.fn()} />
    );

    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(html).not.toMatch(/rgb\(/);
    expect(html).not.toMatch(/rgba\(/);
  });

  it('MultiSelectChips uses Tailwind theme classes -- no hardcoded colors', () => {
    const { container } = render(
      <MultiSelectChips
        question={multiSelectQuestion}
        value={['entradas']}
        onChange={vi.fn()}
      />
    );

    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(html).not.toMatch(/rgb\(/);
    expect(html).not.toMatch(/rgba\(/);
  });
});

// ── Integration Tests ──────────────────────────────────────────

describe('QuestionInput Integration', () => {
  it('delegates to ImageGrid for image-grid type', async () => {
    // Dynamically import the refactored QuestionInput
    const { QuestionInput } = await import(
      '@/components/consultation/QuestionInput'
    );

    const { container } = render(
      <QuestionInput question={imageGridQuestion} value={null} onChange={vi.fn()} />
    );

    const grid = container.querySelector('[data-type="image-grid"]');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('role', 'radiogroup');
  });

  it('delegates to IconCards for icon-cards type', async () => {
    const { QuestionInput } = await import(
      '@/components/consultation/QuestionInput'
    );

    const { container } = render(
      <QuestionInput question={iconCardsQuestion} value={null} onChange={vi.fn()} />
    );

    const cards = container.querySelector('[data-type="icon-cards"]');
    expect(cards).toBeInTheDocument();
    expect(cards).toHaveAttribute('role', 'radiogroup');
  });

  it('delegates to SliderInput for slider type', async () => {
    const { QuestionInput } = await import(
      '@/components/consultation/QuestionInput'
    );

    render(
      <QuestionInput question={sliderQuestion} value={5} onChange={vi.fn()} />
    );

    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('delegates to MultiSelectChips for multi-select-chips type', async () => {
    const { QuestionInput } = await import(
      '@/components/consultation/QuestionInput'
    );

    const { container } = render(
      <QuestionInput question={multiSelectQuestion} value={[]} onChange={vi.fn()} />
    );

    const chips = container.querySelector('[data-type="multi-select-chips"]');
    expect(chips).toBeInTheDocument();
    expect(chips).toHaveAttribute('role', 'group');
  });
});
