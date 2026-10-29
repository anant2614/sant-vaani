import { Marcellus_400Regular } from '@expo-google-fonts/marcellus/400Regular';
import { Mukta_400Regular } from '@expo-google-fonts/mukta/400Regular';
import { Mukta_500Medium } from '@expo-google-fonts/mukta/500Medium';
import { Mukta_600SemiBold } from '@expo-google-fonts/mukta/600SemiBold';
import { TiroDevanagariSanskrit_400Regular } from '@expo-google-fonts/tiro-devanagari-sanskrit/400Regular';

/**
 * The three typefaces from the design, bundled with the app. Each weight is
 * its own family because Android ignores fontWeight for custom fonts.
 */
export const fontFamily = {
  display: 'Marcellus',
  body: 'Mukta',
  bodyMedium: 'Mukta-Medium',
  bodySemiBold: 'Mukta-SemiBold',
  sanskrit: 'TiroDevanagariSanskrit',
} as const;

export const fontFiles = {
  [fontFamily.display]: Marcellus_400Regular,
  [fontFamily.body]: Mukta_400Regular,
  [fontFamily.bodyMedium]: Mukta_500Medium,
  [fontFamily.bodySemiBold]: Mukta_600SemiBold,
  [fontFamily.sanskrit]: TiroDevanagariSanskrit_400Regular,
};
