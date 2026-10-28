import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** A quieter outlined button, for actions beside the main one. */
export function PillButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  onPress(): void;
  disabled?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
        disabled && styles.disabled,
      ]}
    >
      {icon ? <Icon name={icon} color={tokens.accentText} size={18} /> : null}
      <Text variant="strong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  disabled: { opacity: 0.5 },
});
