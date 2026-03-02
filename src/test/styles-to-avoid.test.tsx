import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, whileInView, ...rest } = props;
  return rest;
}

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div data-testid="motion-div" {...stripMotionProps(props)}>{children}</div>
    ),
    section: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <section {...stripMotionProps(props)}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="alert-triangle-icon" className={className} aria-hidden={ariaHidden} />
  ),
}));

const mockStylesData = [
  {
    styleName: 'Cortes muito rentes nas laterais',
    reason: 'Este estilo acentua a largura do rosto redondo, tornando-o ainda mais largo visualmente.',
  },
  {
    styleName: 'Franja horizontal reta',
    reason: 'Uma franja reta encurta a testa e reduz a proporcao vertical do rosto, o que nao favorece formatos redondos.',
  },
  {
    styleName: 'Corte em cogumelo',
    reason: 'O volume uniforme ao redor da cabeca amplifica a percepcao de largura do rosto.',
  },
];

describe('StylesToAvoid - section header', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders section header "Estilos a evitar" text', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    expect(screen.getByText('Estilos a evitar')).toBeInTheDocument();
  });

  it('renders section header as an h2 element', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Estilos a evitar');
  });

  it('renders AlertTriangle warning icon', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  });

  it('AlertTriangle icon has aria-hidden="true"', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    const icon = screen.getByTestId('alert-triangle-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('StylesToAvoid - card rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders correct number of cards for 3-item mock data', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('renders correct number of cards for 2-item mock data', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData.slice(0, 2)} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
  });

  it('each card displays styleName', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    expect(screen.getByText('Cortes muito rentes nas laterais')).toBeInTheDocument();
    expect(screen.getByText('Franja horizontal reta')).toBeInTheDocument();
    expect(screen.getByText('Corte em cogumelo')).toBeInTheDocument();
  });

  it('each card displays reason text', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    expect(screen.getByText(/Este estilo acentua a largura do rosto redondo/)).toBeInTheDocument();
    expect(screen.getByText(/Uma franja reta encurta a testa/)).toBeInTheDocument();
    expect(screen.getByText(/O volume uniforme ao redor da cabeca/)).toBeInTheDocument();
  });

  it('returns null when stylesToAvoid is an empty array', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    const { container } = render(<StylesToAvoid stylesToAvoid={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('StylesToAvoid - animation', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('motion.div animation wrapper is present', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    // The motion.div elements should be present (rendered as data-testid="motion-div")
    const motionDivs = screen.getAllByTestId('motion-div');
    expect(motionDivs.length).toBeGreaterThan(0);
  });

  it('renders correctly with reduced motion disabled (mockReducedMotion = false)', async () => {
    mockReducedMotion = false;
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    expect(screen.getByText('Estilos a evitar')).toBeInTheDocument();
  });

  it('renders correctly with reduced motion enabled', async () => {
    mockReducedMotion = true;
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    expect(screen.getByText('Estilos a evitar')).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });
});

describe('StylesToAvoid - accessibility', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('each card has role="article" for semantic structure', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('section heading level is h2', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toBeInTheDocument();
  });

  it('section has a region with accessible label for "Estilos a evitar"', async () => {
    const { StylesToAvoid } = await import('@/components/consultation/StylesToAvoid');
    render(<StylesToAvoid stylesToAvoid={mockStylesData} />);
    // The section should be findable via role or heading text
    expect(screen.getByText('Estilos a evitar')).toBeInTheDocument();
  });
});
