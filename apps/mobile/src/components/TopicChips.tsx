import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

export type Chip = { key: string; label: string };

/** Rounded topic buttons that wrap onto as many lines as they need. */
export function TopicChips({ title, chips, onSelect }: { title: string; chips: Chip[]; onSelect(key: string): void }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.section} accessibilityLabel={title}>
      <Text variant="eyebrow" color="muted">
        {title}
      </Text>
      <View style={styles.wrap}>
        {chips.map((chip) => (
          <Pressable
            key={chip.key}
            role="button"
            accessibilityLabel={chip.label}
            onPress={() => onSelect(chip.key)}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
            ]}
          >
            <Text>{chip.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
});
