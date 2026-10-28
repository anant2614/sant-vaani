import type { ThemeTokens } from '@sant-vaani/core';
import { Children, type ReactNode } from 'react';
import { Text as NativeText, type TextProps, type TextStyle } from 'react-native';

import { fontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';

/** The type scale from the design canvas. */
const VARIANTS = {
  /** Small uppercase labels above sections. */
  eyebrow: { fontFamily: fontFamily.bodyMedium, fontSize: 12, lineHeight: 17, letterSpacing: 1.7, textTransform: 'uppercase' },
  greeting: { fontFamily: fontFamily.display, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 33 },
  question: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 29 },
  // Marcellus draws 1 and 0 like I and O, so verse numbers use the body face.
  reference: { fontFamily: fontFamily.bodyMedium, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  lead: { fontFamily: fontFamily.body, fontSize: 17, lineHeight: 25 },
  strong: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 21 },
  button: { fontFamily: fontFamily.bodySemiBold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19 },
  tab: { fontFamily: fontFamily.bodyMedium, fontSize: 11, lineHeight: 14 },
  sanskrit: { fontFamily: fontFamily.sanskrit, fontSize: 18, lineHeight: 30 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof VARIANTS;

const DEVANAGARI = /[ऀ-ॿ]/;

export function Text({
  variant = 'body',
  color = 'ink',
  style,
  children,
  ...props
}: TextProps & { variant?: TextVariant; color?: keyof ThemeTokens; children?: ReactNode }) {
  const { tokens } = useTheme();
  let type: TextStyle = VARIANTS[variant];
  if (isDevanagari(children)) {
    // Marcellus has no Devanagari, and spacing letters apart breaks conjuncts.
    if (type.fontFamily === fontFamily.display) type = { ...type, fontFamily: fontFamily.sanskrit };
    if (type.letterSpacing) type = { ...type, letterSpacing: 0, textTransform: 'none' };
  }
  return (
    <NativeText {...props} style={[type, { color: tokens[color] }, style]}>
      {children}
    </NativeText>
  );
}

function isDevanagari(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => typeof child === 'string' && DEVANAGARI.test(child));
}
