export type Gender = "male" | "female";

export interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
  muted: string;
}

export interface ThemeContextValue {
  gender: Gender | null;
  setGender: (gender: Gender) => void;
  theme: ThemeColors;
}
