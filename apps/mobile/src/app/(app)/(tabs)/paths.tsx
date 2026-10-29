import { localize } from '@sant-vaani/core';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { useNow } from '@/clock';
import { PathCard } from '@/components/PathCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { pathProgress, PATH_DAYS } from '@/paths/progress';
import { usePrefs } from '@/prefs/PrefsProvider';
import { pathCompletions } from '@/user/localStore';
import { useUserData } from '@/user/UserDataProvider';

/** Every seven-day path, with how far the person has come in each. */
export default function PathsScreen() {
  const t = useStrings();
  const router = useRouter();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const data = useUserData();
  const now = useNow();

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="title" role="heading">
          {t.tabs.paths}
        </Text>
        <Text color="muted">{t.paths.lead}</Text>
      </View>
      {index.catalogue.paths.length === 0 ? <Text variant="lead">{t.paths.empty}</Text> : null}
      <View style={styles.list}>
        {index.catalogue.paths.map((path) => {
          const progress = pathProgress(pathCompletions(data, path.id), now);
          const detail = progress.done
            ? t.paths.finished
            : progress.completed.length > 0
              ? t.paths.daysDone(progress.completed.length)
              : `${t.path.sevenDays} · ${t.paths.notStarted}`;
          return (
            <PathCard
              key={path.id}
              title={localize(path.title, prefs.language)}
              detail={detail}
              progress={progress.completed.length / PATH_DAYS}
              openLabel={t.path.open}
              onOpen={() => router.push(`/path/${path.slug}`)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  list: { gap: 10 },
});
