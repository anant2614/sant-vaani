import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';

export default function PathsScreen() {
  const t = useStrings();
  return (
    <Screen>
      <Text variant="title" role="heading">
        {t.tabs.paths}
      </Text>
      <Text variant="lead" color="muted">
        {t.soon.paths}
      </Text>
    </Screen>
  );
}
