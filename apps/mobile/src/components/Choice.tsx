import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A row the person ticks: a checkbox, or one of a set of options. */
export function Choice({
  label,
  checked,
  onPress,
  kind,
  children,
}: {
  label: string;
  checked: boolean;
  onPress(): void;
  kind: 'checkbox' | 'radio';
  children?: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role={kind}
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: checked ? tokens.accentText : tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
      ]}
    >
      <View
        style={[
          kind === 'checkbox' ? styles.box : styles.dot,
          {
            borderColor: checked ? tokens.accentText : tokens.muted,
            backgroundColor: checked && kind === 'checkbox' ? tokens.accentText : 'transparent',
          },
        ]}
      >
        {checked && kind === 'checkbox' ? <Icon name="check" color={tokens.surface} size={16} strokeWidth={2.4} /> : null}
        {checked && kind === 'radio' ? <View style={[styles.dotFill, { backgroundColor: tokens.accentText }]} /> : null}
      </View>
      <View style={styles.text}>
        <Text>{label}</Text>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dotFill: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1, gap: 2 },
});
