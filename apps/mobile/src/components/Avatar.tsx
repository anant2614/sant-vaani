import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

/** A saint's initials in a soft circle. Photos wait for permission from each saint's team. */
export function Avatar({ initials, size = 44 }: { initials: string; size?: number }) {
  const { tokens } = useTheme();
  return (
    <View
      accessible={false}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: tokens.surface2 }]}
    >
      <Text variant="strong" color="accentText" style={{ fontSize: size * 0.36, lineHeight: size * 0.5 }}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
