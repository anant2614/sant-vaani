import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';

export default function NotFoundScreen() {
  const t = useStrings();
  const router = useRouter();
  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <Text variant="title" role="heading">
        {t.notFound}
      </Text>
      <Button label={t.goToday} onPress={() => router.replace('/')} />
    </Screen>
  );
}
