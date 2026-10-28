import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A back button, an optional small label and actions on the right, for screens that open over the tabs. */
export function BackHeader({ label, backLabel, actions }: { label?: string; backLabel: string; actions?: ReactNode }) {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        role="button"
        accessibilityLabel={backLabel}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [styles.back, { borderColor: tokens.line }, pressed && { backgroundColor: tokens.surface2 }]}
      >
        <Icon name="back" color={tokens.ink} size={20} strokeWidth={1.8} />
      </Pressable>
      {label ? (
        <Text variant="eyebrow" color="muted" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : (
        <View style={styles.label} />
      )}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
});
