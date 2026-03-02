/**
 * Component tests for GuestSaveBanner.
 * Story 8.4, Task 6 (AC: #4)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, exit, ...htmlProps } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock next/navigation (Link uses it)
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));

describe('GuestSaveBanner component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the CTA message in Portuguese', async () => {
    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    render(<GuestSaveBanner />);
    expect(
      screen.getByText(/Crie conta para guardar este resultado/i)
    ).toBeInTheDocument();
  });

  it('renders a link pointing to /register', async () => {
    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    render(<GuestSaveBanner />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/register');
  });

  it('has a dismiss button', async () => {
    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    render(<GuestSaveBanner />);
    expect(screen.getByRole('button', { name: /fechar|dismiss/i })).toBeInTheDocument();
  });

  it('disappears after clicking the dismiss button', async () => {
    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    render(<GuestSaveBanner />);

    // Banner is visible
    expect(
      screen.getByText(/Crie conta para guardar este resultado/i)
    ).toBeInTheDocument();

    // Click dismiss
    fireEvent.click(screen.getByRole('button', { name: /fechar|dismiss/i }));

    // Banner should no longer be in the DOM
    expect(
      screen.queryByText(/Crie conta para guardar este resultado/i)
    ).not.toBeInTheDocument();
  });

  it('stores dismissed state in sessionStorage so it does not re-appear', async () => {
    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    render(<GuestSaveBanner />);
    fireEvent.click(screen.getByRole('button', { name: /fechar|dismiss/i }));

    expect(sessionStorage.getItem('mynewstyle-guest-banner-dismissed')).toBe('1');
  });

  it('does not render when sessionStorage flag is already set', async () => {
    sessionStorage.setItem('mynewstyle-guest-banner-dismissed', '1');

    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    const { container } = render(<GuestSaveBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('uses theme CSS variables (no hardcoded hex colors)', async () => {
    const { GuestSaveBanner } = await import(
      '@/components/consultation/GuestSaveBanner'
    );
    const { container } = render(<GuestSaveBanner />);
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const style = el.getAttribute('style');
      if (style) {
        expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      }
    });
  });
});
