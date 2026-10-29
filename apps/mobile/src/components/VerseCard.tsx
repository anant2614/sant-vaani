import { Pressable, StyleSheet, View } from 'react-native';

import type { Verse } from '@/gita/types';
import type { AppLanguage } from '@/prefs/prefs';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

/**
 * A verse in Sanskrit with its meaning. Until the meanings are written, the
 * transliteration takes their place.
 */
export function VerseCard({
  label,
  reference,
  verse,
  language,
  onOpen,
}: {
  label: string;
  reference: string;
  verse: Verse | null;
  language: AppLanguage;
  /** Opens the verse in the reader. */
  onOpen?: () => void;
}) {
  const { tokens } = useTheme();
  const meaning = verse && (language === 'hi' ? verse.meaningHi ?? verse.meaningEn : verse.meaningEn ?? verse.meaningHi);
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${label}: ${reference}`}
      disabled={!onOpen}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? tokens.surface2 : tokens.surface, borderColor: tokens.line },
      ]}
    >
      <View style={styles.header}>
        <Text variant="eyebrow" color="muted">
          {label}
        </Text>
        <Text variant="reference" color="accentText">
          {reference}
        </Text>
      </View>
      <View style={styles.text}>
        {verse ? (
          <>
            <Text variant="sanskrit">{verse.sanskrit}</Text>
            <Text color="muted">{meaning ?? verse.transliteration}</Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  // Keeps the card's height while the Gita opens, so nothing jumps.
  text: { gap: 6, minHeight: 104 },
});
