import { formatDuration, localize, type PathDay } from '@sant-vaani/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { useNow } from '@/clock';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { VerseCard } from '@/components/VerseCard';
import { useVerse } from '@/gita/GitaProvider';
import { useStrings } from '@/i18n/strings';
import { pathProgress } from '@/paths/progress';
import { ClipPlayer } from '@/player/ClipPlayer';
import { usePlayerAllowed } from '@/player/usePlayerAllowed';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';
import { pathCompletions } from '@/user/localStore';
import { useUserData, useUserStore } from '@/user/UserDataProvider';

/**
 * A seven-day path, one day at a time: today's clip, verse and small step,
 * then the next day opens tomorrow. Days done stay listed with a tick.
 */
export default function PathScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const store = useUserStore();
  const data = useUserData();
  const now = useNow();
  const path = index.path(slug);

  if (!path) {
    return (
      <Screen>
        <BackHeader backLabel={t.back} />
        <Text variant="title" role="heading">
          {t.notFound}
        </Text>
      </Screen>
    );
  }

  const progress = pathProgress(pathCompletions(data, path.id), now);
  const status = progress.done
    ? t.paths.finished
    : progress.completed.length > 0
      ? t.paths.daysDone(progress.completed.length)
      : `${t.path.sevenDays} · ${t.paths.notStarted}`;

  const complete = async (day: number) => {
    await store.completeDay(path.id, day);
    track('path_day_completed', { path: path.slug, day });
  };

  return (
    <Screen>
      <BackHeader label={t.path.sevenDays} backLabel={t.back} />
      <View style={styles.heading}>
        <Text variant="title" role="heading">
          {localize(path.title, prefs.language)}
        </Text>
        <Text color="muted">{localize(path.description, prefs.language)}</Text>
        <Text variant="small" color="accentText">
          {status}
        </Text>
      </View>

      {progress.done ? <Text variant="lead">{t.path.finished}</Text> : null}

      <View style={styles.list}>
        {path.days.map((day) => {
          const done = progress.completed.includes(day.day);
          const isCurrent = day.day === progress.current;
          if (isCurrent && !progress.opensTomorrow) {
            return <OpenDay key={day.day} day={day} onDone={() => complete(day.day)} />;
          }
          return (
            <View
              key={day.day}
              style={[styles.day, { borderColor: tokens.line, backgroundColor: done ? tokens.surface : 'transparent' }]}
            >
              <View style={styles.dayTitle}>
                <Text variant="eyebrow" color="muted" style={styles.flex}>
                  {t.path.day(day.day)}
                </Text>
                {done ? <Icon name="check" color={tokens.accentText} size={18} strokeWidth={2} /> : null}
              </View>
              {isCurrent ? (
                <>
                  <Text variant="strong">{t.path.opensTomorrow(day.day)}</Text>
                  {prefs.reminderTime === null ? (
                    <PillButton icon="bell" label={t.path.remindMe} onPress={() => router.push('/settings')} />
                  ) : null}
                </>
              ) : (
                <Text color={done ? 'ink' : 'muted'}>{localize(day.step, prefs.language)}</Text>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

/** Today's day of the path, opened out: the clip, the verse, the step and the button to mark it done. */
function OpenDay({ day, onDone }: { day: PathDay; onDone(): void }) {
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const playerAllowed = usePlayerAllowed();
  const verse = useVerse(day.verse);
  const clip = day.clipId ? index.clip(day.clipId) : undefined;
  const saint = clip ? localize(index.saint(clip.saintId)?.name, prefs.language) : '';

  return (
    <View style={[styles.open, { borderColor: tokens.accentText, backgroundColor: tokens.surface }]}>
      <Text variant="eyebrow" color="accentText">
        {`${t.path.today} · ${t.path.day(day.day)}`}
      </Text>
      {clip ? (
        <View style={styles.clip}>
          {playerAllowed ? (
            <ClipPlayer clip={clip} title={saint} />
          ) : (
            <View style={[styles.playerSpace, { backgroundColor: tokens.surface2 }]} />
          )}
          <Text variant="small" color="muted">
            {`${saint} · ${formatDuration(clip.end - clip.start)}`}
          </Text>
          <Text>{localize(clip.summary, prefs.language)}</Text>
        </View>
      ) : null}
      {day.verse ? (
        <VerseCard
          label={t.answer.fromTheGita}
          reference={t.gitaRef(day.verse.chapter, day.verse.verse)}
          verse={verse}
          language={prefs.language}
          onOpen={() => day.verse && router.push(`/gita/${day.verse.chapter}/${day.verse.verse}`)}
        />
      ) : null}
      {day.step ? <Text variant="lead">{localize(day.step, prefs.language)}</Text> : null}
      <Button label={t.path.markDone(day.day)} onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  list: { gap: 10 },
  day: { gap: 6, padding: 16, borderRadius: 20, borderWidth: 1 },
  dayTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  open: { gap: 14, padding: 16, borderRadius: 20, borderWidth: 1.5 },
  clip: { gap: 6 },
  playerSpace: { width: '100%', aspectRatio: 16 / 9, minHeight: 200, borderRadius: 16 },
});
