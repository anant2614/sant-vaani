import { localize } from '@sant-vaani/core';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { Avatar } from '@/components/Avatar';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';

/** The saints whose talks answer questions here, each opening the questions they answer. */
export default function SaintsScreen() {
  const t = useStrings();
  const router = useRouter();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const saints = index.catalogue.saints
    .map((saint) => ({ saint, answers: index.answersForSaint(saint.id).length }))
    .filter(({ answers }) => answers > 0);

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="title" role="heading">
          {t.tabs.saints}
        </Text>
        <Text color="muted">{t.saints.lead}</Text>
      </View>
      {saints.length === 0 ? <Text variant="lead">{t.saints.empty}</Text> : null}
      <View style={styles.list}>
        {saints.map(({ saint, answers }) => (
          <Row
            key={saint.id}
            leading={<Avatar initials={saint.initials} />}
            title={localize(saint.name, prefs.language)}
            detail={[saint.tradition, t.saints.answers(answers)].filter(Boolean).join(' · ')}
            onPress={() => router.push(`/saint/${saint.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  list: { gap: 10 },
});
