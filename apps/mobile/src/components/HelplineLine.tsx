import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n/strings';
import { Text } from './Text';

/**
 * A quiet way to the helplines, shown wherever Ask could not read the
 * question closely: Claude was unreachable, the question went unanswered,
 * or it never reached the server.
 */
export function HelplineLine() {
  const t = useStrings();
  const router = useRouter();
  return (
    <View style={styles.line}>
      <Text variant="small" color="muted">
        {t.helpline.line}
      </Text>
      <Text variant="small" color="accentText" role="link" onPress={() => router.push('/crisis')} style={styles.link}>
        {t.helpline.link}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { gap: 4 },
  link: { textDecorationLine: 'underline', alignSelf: 'flex-start', paddingVertical: 4 },
});
