import {
  Scissors,
  Droplets,
  Clock,
  SprayCan,
  Wand2,
  Sparkles,
  Brush,
  ShowerHead,
  Star,
  Palette,
  Lightbulb,
  Wind,
  Heart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon map for styling tips.
 * Maps AI-returned icon name strings to Lucide React components.
 *
 * Follows the pattern from src/components/consultation/question-cards/icon-resolver.ts
 * but uses Lightbulb as the fallback instead of HelpCircle (as specified in story 6.6).
 */
const iconMap: Record<string, LucideIcon> = {
  scissors: Scissors,
  droplets: Droplets,
  clock: Clock,
  'spray-can': SprayCan,
  // 'comb' is not available in lucide-react; map to Wand2 (styling tool semantic)
  comb: Wand2,
  wand2: Wand2,
  brush: Brush,
  'shower-head': ShowerHead,
  star: Star,
  palette: Palette,
  sparkles: Sparkles,
  wind: Wind,
  heart: Heart,
};

/**
 * Resolves a Lucide icon name string to the actual React component.
 * Falls back to Lightbulb for unrecognized or empty icon names.
 *
 * AC: #2 (Story 6.6) - Each tip card displays a thematic Lucide icon
 */
export function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return Lightbulb;
  return iconMap[name.toLowerCase()] ?? Lightbulb;
}
