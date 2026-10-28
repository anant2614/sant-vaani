import { localize } from '@sant-vaani/core';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';

/** A seven-day path: each day's small step. */
export default function PathScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useStrings();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const path = index.path(slug);

  return (
    <Screen>
      <BackHeader label={t.path.sevenDays} backLabel={t.back} />
      <Text variant="title" role="heading">
        {path ? localize(path.title, prefs.language) : t.notFound}
      </Text>
      {path ? (
        <>
          <Text variant="lead" color="muted">
            {localize(path.description, prefs.language)}
          </Text>
          <View style={styles.list}>
            {path.days.map((day) => (
              <View key={day.day} style={[styles.day, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
                <Text variant="eyebrow" color="muted">
                  {t.path.day(day.day)}
                </Text>
                <Text>{localize(day.step, prefs.language)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  day: { gap: 4, padding: 16, borderRadius: 20, borderWidth: 1 },
});
