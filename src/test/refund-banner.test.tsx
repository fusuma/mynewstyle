import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
  return rest;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ShieldAlert: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="shield-alert-icon" className={className} aria-hidden={ariaHidden} />
  ),
}));

// Mock consultation store
const mockReset = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: { reset: () => void }) => unknown) =>
    selector({ reset: mockReset }),
}));

describe('RefundBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders refund message text in Portuguese', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    expect(
      screen.getByText('Ocorreu um erro. O seu pagamento foi reembolsado.')
    ).toBeInTheDocument();
  });

  it('renders "Nova consultoria" CTA button', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    expect(screen.getByRole('button', { name: 'Nova consultoria' })).toBeInTheDocument();
  });

  it('renders shield/alert icon', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    expect(screen.getByTestId('shield-alert-icon')).toBeInTheDocument();
  });

  it('message element has role="alert"', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveTextContent('Ocorreu um erro. O seu pagamento foi reembolsado.');
  });

  it('CTA button click calls reset() on the store', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    const button = screen.getByRole('button', { name: 'Nova consultoria' });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('CTA button click navigates to /start', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    const button = screen.getByRole('button', { name: 'Nova consultoria' });
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/start');
  });

  it('renders refund processing timeline message', async () => {
    const { RefundBanner } = await import('@/components/consultation/RefundBanner');
    render(<RefundBanner />);
    expect(screen.getByText(/5-10 dias/)).toBeInTheDocument();
  });
});
