import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';

export default function AskScreen() {
  const t = useStrings();
  return (
    <Screen>
      <Text variant="title" role="heading">
        {t.tabs.ask}
      </Text>
      <Text variant="lead" color="muted">
        {t.soon.ask}
      </Text>
    </Screen>
  );
}
