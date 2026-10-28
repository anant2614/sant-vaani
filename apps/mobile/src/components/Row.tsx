import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A card-like row in a list that opens another screen. */
export function Row({
  title,
  detail,
  leading,
  label,
  onPress,
}: {
  title: string;
  detail?: string;
  leading?: ReactNode;
  /** What screen readers say, when it should differ from the title. */
  label?: string;
  onPress(): void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Text variant="strong">{title}</Text>
        {detail ? (
          <Text variant="small" color="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron" color={tokens.muted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1 },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
