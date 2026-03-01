/**
 * Typography scale configuration
 *
 * Font mapping:
 * - Space Grotesk: display, heading, subheading (via --font-display CSS variable)
 * - Inter: body, caption, badge (via --font-body CSS variable)
 */

interface TypographyRole {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  fontFamily: string;
}

export const TYPOGRAPHY: Record<string, TypographyRole> = {
  display: {
    fontSize: "32px", // 32px mobile, 48px desktop (responsive)
    lineHeight: "1.2",
    fontWeight: 700,
    fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
  },
  heading: {
    fontSize: "24px", // 24px mobile, 32px desktop (responsive)
    lineHeight: "1.25",
    fontWeight: 700,
    fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
  },
  subheading: {
    fontSize: "18px", // 18px mobile, 22px desktop (responsive)
    lineHeight: "1.35",
    fontWeight: 600,
    fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
  },
  body: {
    fontSize: "16px",
    lineHeight: "1.5",
    fontWeight: 400,
    fontFamily: "var(--font-body), 'Inter', sans-serif",
  },
  caption: {
    fontSize: "13px", // 13px mobile, 14px desktop (responsive)
    lineHeight: "1.45",
    fontWeight: 400,
    fontFamily: "var(--font-body), 'Inter', sans-serif",
  },
  badge: {
    fontSize: "12px",
    lineHeight: "1.3",
    fontWeight: 600,
    fontFamily: "var(--font-body), 'Inter', sans-serif",
  },
} as const;
