import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

/** The main action on a screen: the one place, besides play and progress, that uses the warm accent. */
export function Button({ label, onPress, disabled = false }: { label: string; onPress(): void; disabled?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? tokens.surface2 : tokens.accent },
        pressed && styles.pressed,
      ]}
    >
      <Text variant="button" style={{ color: disabled ? tokens.muted : tokens.onAccent }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  pressed: { opacity: 0.85 },
});
