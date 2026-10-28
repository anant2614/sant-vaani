import { localDayNumber } from '@sant-vaani/core';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { useNow } from '@/clock';
import { Hero } from '@/components/Hero';
import { Icon } from '@/components/Icon';
import { PathCard } from '@/components/PathCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopicChips } from '@/components/TopicChips';
import { VerseCard } from '@/components/VerseCard';
import { useVerse } from '@/gita/GitaProvider';
import { dayPartOf, useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { APP_STARTED_AT } from '@/startup';
import { useTheme } from '@/theme/useTheme';
import { noonOf, todayView } from '@/today/today';

let todayTimed = false;

export default function TodayScreen() {
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index, source } = useCatalogue();
  const now = useNow();
  // Worked out once per date, not every minute.
  const day = localDayNumber(now);
  const view = useMemo(() => todayView(index, noonOf(day), prefs.language), [index, day, prefs.language]);
  const verse = useVerse(view.verse);
  const part = dayPartOf(now);

  useEffect(() => {
    if (todayTimed) return;
    todayTimed = true;
    track('today_shown', { ms: Date.now() - APP_STARTED_AT, source });
  }, [source]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text variant="eyebrow" color="muted">
            {`${t.dayPart[part]} · ${t.clockTime(now.getHours(), now.getMinutes())}`}
          </Text>
          <Text variant="greeting" role="heading">
            {t.greeting[part]}
          </Text>
        </View>
        <Pressable
          role="button"
          accessibilityLabel={t.settings}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.profile,
            { borderColor: tokens.line, backgroundColor: pressed ? tokens.line : tokens.surface2 },
          ]}
        >
          <Icon name="person" color={tokens.ink} size={22} />
        </Pressable>
      </View>

      {view.answer ? (
        <Hero
          question={view.answer.question}
          meta={t.saintsAndMinutes(view.answer.saints, view.answer.minutes)}
          onOpen={() => {
            track('answer_opened', { answer: view.answer!.id, from: 'today' });
            router.push(`/answer/${view.answer!.id}`);
          }}
        />
      ) : (
        <Text variant="lead" color="muted">
          {t.answersOnTheirWay}
        </Text>
      )}

      {view.chips.length > 0 ? (
        <TopicChips
          title={t.whatsOnYourMind}
          chips={view.chips}
          onSelect={(slug) => {
            track('topic_opened', { topic: slug, from: 'today' });
            router.push(`/topic/${slug}`);
          }}
        />
      ) : null}

      {view.verse ? (
        <VerseCard
          label={t.todaysVerse}
          reference={t.gitaRef(view.verse.chapter, view.verse.verse)}
          verse={verse}
          language={prefs.language}
          onOpen={() => view.verse && router.push(`/gita/${view.verse.chapter}/${view.verse.verse}`)}
        />
      ) : null}

      {view.path ? (
        <PathCard
          title={view.path.title}
          detail={
            view.path.firstDayMinutes
              ? `${t.path.sevenDays} · ${t.path.minutesToday(view.path.firstDayMinutes)}`
              : t.path.sevenDays
          }
          progress={0}
          openLabel={t.path.open}
          onOpen={() => router.push(`/path/${view.path!.slug}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  greeting: { flex: 1, gap: 2 },
  profile: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
