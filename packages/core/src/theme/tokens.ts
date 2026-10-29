/**
 * The two colour sets chosen on the design canvas. Ganga Ghat is the day
 * look and Chandni the night look; both use the same token names so every
 * screen can switch between them without knowing which one is active.
 */
export type ThemeTokens = {
  /** Page background. */
  bg: string;
  /** Cards, chips and sheets. */
  surface: string;
  /** Quieter fills such as tracks and avatars. */
  surface2: string;
  /** Main text. */
  ink: string;
  /** Secondary text and labels. */
  muted: string;
  /** Hairlines and card borders. */
  line: string;
  /** The one warm accent: play buttons and the sun disc. */
  accent: string;
  /** Text and icons placed on the accent. */
  onAccent: string;
  /** Accent-coloured text that stays readable on bg and surface. */
  accentText: string;
  /** Soft companion colour for halos and progress tracks. */
  accent2: string;
  /** Background of the Today hero card. */
  heroBg: string;
  heroInk: string;
  heroMuted: string;
  /** Tab bar background. */
  navBg: string;
};

export const gangaGhat: ThemeTokens = {
  bg: '#E9EFF2',
  surface: '#F6F9FA',
  surface2: '#DCE5EA',
  ink: '#1D3446',
  muted: '#4F6474',
  line: '#CFDAE0',
  accent: '#E39A2E',
  onAccent: '#2A1A05',
  accentText: '#8A4F0B',
  accent2: '#9FB9C9',
  heroBg: '#1D3446',
  heroInk: '#F3F6F8',
  heroMuted: '#B9C9D4',
  navBg: '#F6F9FA',
};

export const chandni: ThemeTokens = {
  bg: '#1C2230',
  surface: '#242B3B',
  surface2: '#2D3547',
  ink: '#E6E9F0',
  muted: '#A6AEC0',
  line: '#353E52',
  accent: '#E9D9A6',
  onAccent: '#1C2230',
  accentText: '#E9D9A6',
  accent2: '#4A5672',
  heroBg: '#283149',
  heroInk: '#E6E9F0',
  heroMuted: '#A6AEC0',
  navBg: '#191E2B',
};

export type Scheme = 'light' | 'dark';

export const schemeTokens: Record<Scheme, ThemeTokens> = {
  light: gangaGhat,
  dark: chandni,
};

export const fonts = {
  /** Headings and verse references. */
  display: 'Marcellus',
  /** Body text in English and Hindi. */
  body: 'Mukta',
  /** Sanskrit verses. */
  sanskrit: 'Tiro Devanagari Sanskrit',
} as const;
