import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon, type IconName } from './Icon';

/** A round 44-point button with only an icon, named for screen readers by its label. */
export function IconButton({
  icon,
  label,
  onPress,
  selected,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
  /** For toggles such as save: fills the icon when on. */
  selected?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: selected ? tokens.accentText : tokens.line },
        pressed && { backgroundColor: tokens.surface2 },
      ]}
    >
      <Icon name={icon} color={selected ? tokens.accentText : tokens.ink} size={20} strokeWidth={1.8} filled={selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
