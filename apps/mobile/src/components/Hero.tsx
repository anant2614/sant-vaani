import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useStrings } from '@/i18n/strings';
import { useTheme } from '@/theme/useTheme';
import { PlayIcon } from './Icon';
import { Text } from './Text';

/**
 * Today's guidance: the day's curated question on the dark card, with the
 * sun over the water in the corner. Opens the answer; nothing plays until
 * the person presses play there.
 */
export function Hero({ question, meta, onOpen }: { question: string; meta: string; onOpen(): void }) {
  const { tokens } = useTheme();
  const t = useStrings();
  return (
    <Pressable
      onPress={onOpen}
      role="button"
      accessibilityLabel={`${t.todaysGuidance}: ${question}. ${meta}`}
      accessibilityHint={t.playAnswer}
      style={({ pressed }) => [styles.card, { backgroundColor: tokens.heroBg }, pressed && styles.pressed]}
    >
      <Svg width={130} height={130} viewBox="0 0 130 130" style={styles.sun} accessible={false}>
        <Circle cx="65" cy="65" r="62" fill={tokens.accent2} fillOpacity={0.22} />
        <Circle cx="65" cy="65" r="44" fill={tokens.accent2} fillOpacity={0.4} />
        <Circle cx="65" cy="65" r="26" fill={tokens.accent} />
      </Svg>
      <Text variant="eyebrow" color="heroMuted">
        {t.todaysGuidance}
      </Text>
      <Text variant="question" color="heroInk" style={styles.question}>
        {question}
      </Text>
      <View style={styles.row}>
        <View style={[styles.play, { backgroundColor: tokens.accent }]}>
          <PlayIcon color={tokens.onAccent} />
        </View>
        <Text color="heroMuted">{meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 22, borderRadius: 28, overflow: 'hidden' },
  pressed: { opacity: 0.92 },
  sun: { position: 'absolute', right: -30, bottom: -40 },
  question: { maxWidth: 290 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
