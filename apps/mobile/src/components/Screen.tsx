import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

/** A page on the tinted ground: safe-area padding, 24-point margins and room between sections. */
export function Screen({
  children,
  scroll = true,
  gap = 18,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  gap?: number;
  contentStyle?: ViewStyle;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: insets.top + 12,
    paddingBottom: Math.max(insets.bottom, 12) + 12,
    paddingHorizontal: 24,
    gap,
  };

  if (!scroll) {
    return <View style={[styles.fill, { backgroundColor: tokens.bg }, padding, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: tokens.bg }]}
      contentContainerStyle={[padding, styles.content, contentStyle]}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
