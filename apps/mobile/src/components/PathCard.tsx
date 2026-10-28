import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A seven-day path with a ring for the days done so far. */
export function PathCard({
  title,
  detail,
  progress,
  openLabel,
  onOpen,
}: {
  title: string;
  detail: string;
  /** From 0 to 1. */
  progress: number;
  openLabel: string;
  onOpen(): void;
}) {
  const { tokens } = useTheme();
  const arc = Math.min(1, Math.max(0, progress)) * CIRCUMFERENCE;
  return (
    <Pressable
      onPress={onOpen}
      role="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityHint={openLabel}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? tokens.surface2 : tokens.surface, borderColor: tokens.line },
      ]}
    >
      <Svg width={48} height={48} viewBox="0 0 48 48" accessible={false}>
        <Circle cx="24" cy="24" r={RADIUS} fill="none" stroke={tokens.surface2} strokeWidth={4} />
        {arc > 0 ? (
          <Circle
            cx="24"
            cy="24"
            r={RADIUS}
            fill="none"
            stroke={tokens.accentText}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
            transform="rotate(-90 24 24)"
          />
        ) : null}
      </Svg>
      <View style={styles.text}>
        <Text variant="strong">{title}</Text>
        <Text variant="small" color="muted">
          {detail}
        </Text>
      </View>
      <View style={styles.chevron}>
        <Icon name="chevron" color={tokens.ink} size={20} strokeWidth={1.8} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  chevron: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
