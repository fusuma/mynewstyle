import { Briefcase, Palette, Coffee, Monitor, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Palette,
  Coffee,
  Monitor,
};

/**
 * Resolves a Lucide icon name string to the actual React component.
 * Returns null for undefined/empty input.
 * Falls back to HelpCircle for unrecognized icon names.
 */
export function resolveIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  return iconMap[name] ?? HelpCircle;
}
